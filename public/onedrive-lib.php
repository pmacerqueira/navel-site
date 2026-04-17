<?php
/**
 * onedrive-lib.php — Cliente Microsoft Graph (OAuth Authorization Code + Refresh Token)
 *
 * Suporta multiplos "mounts" entre pastas da Area Reservada (Sharepoint NAVEL) e
 * pastas do OneDrive for Business:
 *
 * Direcoes suportadas por mount:
 *
 *   direction = pull
 *     OneDrive e a fonte de verdade. Deltas periodicos trazem alteracoes.
 *     Uploads/mkdir no portal sao espelhados no OneDrive.
 *     Deletes no portal sao bloqueados (eliminar no OneDrive).
 *
 *   direction = push
 *     Sharepoint e a fonte de verdade. Qualquer upload/mkdir/delete no portal
 *     e propagado em tempo real para OneDrive. Seed inicial via push-full.
 *
 *   direction = bidirectional  (policy: last-modified-wins)
 *     Corre pull delta + push full em cada sincronizacao.
 *     Em caso de conflito por ficheiro: vence o lado cujo mtime (local) ou
 *     lastModifiedDateTime (OneDrive) e mais recente; empates ignoram-se.
 *     Deletes locais propagam-se; deletes em OneDrive propagam-se via delta.
 *
 * Mounts configurados (defaults, overrides via `onedrive_*_direction` no config):
 *   comercial → pasta-mae "Comercial"            → bidirectional
 *   at        → pasta-mae "Assistencia Tecnica"  → bidirectional
 *
 * Ambos reutilizam o mesmo registo Entra ID / utilizador OneDrive (token unico).
 *
 * Scopes (Entra ID):
 *   offline_access openid profile User.Read Files.ReadWrite.All
 *
 * Persistencia:
 *   documentos-store/.navel-onedrive.json       tokens + estado por mount
 *   documentos-store/.navel-onedrive-items.json mapa { itemId -> {mountId, absPath, ...} }
 *   documentos-store/.navel-onedrive-sync.log   log append-only
 */
declare(strict_types=1);

if (!defined('ONDRV_LIB_LOADED')) {
    define('ONDRV_LIB_LOADED', true);
}

// ── Constantes ────────────────────────────────────────────────────────────────

const ONDRV_GRAPH_ROOT      = 'https://graph.microsoft.com/v1.0';
const ONDRV_AUTHORITY       = 'https://login.microsoftonline.com';
const ONDRV_TOKENS_FILE     = '.navel-onedrive.json';
const ONDRV_STATE_FILE      = '.navel-onedrive-state.json';
const ONDRV_ITEMS_MAP_FILE  = '.navel-onedrive-items.json';
const ONDRV_SYNC_LOG_FILE   = '.navel-onedrive-sync.log';
const ONDRV_SYNC_PROGRESS_FILE = '.navel-onedrive-sync-progress.json';
const ONDRV_TOMBSTONES_FILE = '.navel-onedrive-tombstones.json';
const ONDRV_TOMBSTONE_TTL   = 604800; // 7 dias
const ONDRV_RECONCILE_MAX_DEPTH = 4;

// Orcamento de tempo por pedido HTTP sincrono (segundos).
// O reverse proxy do cPanel fecha a ligacao ao fim de ~5 min, por isso
// paramos antes disso, gravamos progresso (deltaLink + itemsMap) e
// retornamos. O utilizador pode clicar outra vez para continuar.
const ONDRV_SYNC_TIME_BUDGET   = 120;
// Maximo de ficheiros descarregados na fase de "repesca" por pedido.
const ONDRV_REFETCH_BATCH_SIZE = 30;
// Timeout CURL por ficheiro descarregado (segundos).
const ONDRV_FILE_DOWNLOAD_TIMEOUT = 90;

// Graph API: max tentativas em 429/503/504 (Microsoft Learn — throttling).
const ONDRV_GRAPH_MAX_RETRIES = 8;
// Paginas delta menores = menos picos de memoria e timeouts por pedido (Graph suporta $top).
const ONDRV_DELTA_PAGE_TOP = 150;

// Compat: nome da pasta Comercial (legacy).
const ONDRV_COMERCIAL_ROOT  = 'Comercial';

// Scopes delegados; `offline_access` obrigatorio para receber refresh_token.
const ONDRV_SCOPES = 'offline_access openid profile User.Read https://graph.microsoft.com/Files.ReadWrite.All';

// ── Configuracao ──────────────────────────────────────────────────────────────

/**
 * @param array<string,mixed> $cfg
 * @return array{tenantId:string,clientId:string,clientSecret:string,redirectUri:string,rootPath:string,atPath:string,cronToken:string}|null
 */
function ondrv_config(array $cfg): ?array
{
    $tenantId     = trim((string)($cfg['microsoft_tenant_id']    ?? getenv('MICROSOFT_TENANT_ID')    ?: ''));
    $clientId     = trim((string)($cfg['microsoft_client_id']    ?? getenv('MICROSOFT_CLIENT_ID')    ?: ''));
    $clientSecret = trim((string)($cfg['microsoft_client_secret']?? getenv('MICROSOFT_CLIENT_SECRET')?: ''));
    $redirectUri  = trim((string)($cfg['microsoft_redirect_uri'] ?? ''));
    $rootPath     = trim((string)(
        $cfg['onedrive_comercial_path']
        ?? $cfg['onedrive_root_path']
        ?? 'Documentos/NAVEL/CATALOGOS NAVEL'
    ));
    $atPath       = trim((string)($cfg['onedrive_at_path'] ?? 'Documentos/NAVEL/ASSISTENCIA TECNICA'));
    $cronToken    = trim((string)($cfg['onedrive_cron_token'] ?? ''));

    $comercialDir = ondrv_sanitize_direction((string)($cfg['onedrive_comercial_direction'] ?? 'bidirectional'));
    $atDir        = ondrv_sanitize_direction((string)($cfg['onedrive_at_direction']        ?? 'bidirectional'));

    if ($tenantId === '' || $clientId === '' || $clientSecret === '' || $redirectUri === '') {
        return null;
    }
    return [
        'tenantId'            => $tenantId,
        'clientId'            => $clientId,
        'clientSecret'        => $clientSecret,
        'redirectUri'         => $redirectUri,
        'rootPath'            => $rootPath !== '' ? trim($rootPath, "/ \t") : '',
        'atPath'              => $atPath !== '' ? trim($atPath, "/ \t") : '',
        'comercialDirection'  => $comercialDir,
        'atDirection'         => $atDir,
        'cronToken'           => $cronToken,
    ];
}

function ondrv_sanitize_direction(string $raw): string
{
    $d = strtolower(trim($raw));
    if ($d === 'pull' || $d === 'push' || $d === 'bidirectional') return $d;
    return 'bidirectional';
}

/**
 * Lista os mounts configurados. Cada mount e um array:
 *   { id, localFolder, remotePath, direction: 'pull'|'push'|'bidirectional' }
 *
 * @return array<int,array{id:string,localFolder:string,remotePath:string,direction:string}>
 */
function ondrv_get_mounts(array $cfg): array
{
    $mounts = [];
    if (!empty($cfg['rootPath'])) {
        $mounts[] = [
            'id'          => 'comercial',
            'localFolder' => 'Comercial',
            'remotePath'  => (string)$cfg['rootPath'],
            'direction'   => ondrv_sanitize_direction((string)($cfg['comercialDirection'] ?? 'bidirectional')),
        ];
    }
    if (!empty($cfg['atPath'])) {
        $mounts[] = [
            'id'          => 'at',
            'localFolder' => 'Assistencia Tecnica',
            'remotePath'  => (string)$cfg['atPath'],
            'direction'   => ondrv_sanitize_direction((string)($cfg['atDirection'] ?? 'bidirectional')),
        ];
    }
    return $mounts;
}

/** Devolve o mount com o id dado, ou null. */
function ondrv_get_mount(array $cfg, string $mountId): ?array
{
    foreach (ondrv_get_mounts($cfg) as $m) {
        if ($m['id'] === $mountId) return $m;
    }
    return null;
}

/**
 * Dado um caminho relativo dentro da area reservada (ex.: "Assistencia Tecnica/Torno/manual.pdf"),
 * devolve { mount, relInsideMount } se existir mount correspondente, ou null.
 *
 * @return array{mount:array,rel:string}|null
 */
function ondrv_find_mount_for_rel(string $rel, array $mounts): ?array
{
    $rel = trim(str_replace('\\', '/', $rel), '/');
    if ($rel === '') return null;
    foreach ($mounts as $m) {
        $prefix = trim($m['localFolder'], '/');
        if ($rel === $prefix) return ['mount' => $m, 'rel' => ''];
        if (str_starts_with($rel, $prefix . '/')) {
            return ['mount' => $m, 'rel' => substr($rel, strlen($prefix) + 1)];
        }
    }
    return null;
}

/** Caminho local absoluto da raiz do mount (ex: "<store>/Comercial"). */
function ondrv_mount_local_abs(string $rootReal, array $mount): string
{
    return $rootReal . DIRECTORY_SEPARATOR . $mount['localFolder'];
}

// ── Persistencia (tokens, state, item map) ────────────────────────────────────

function ondrv_tokens_path(string $rootReal): string
{
    return $rootReal . DIRECTORY_SEPARATOR . ONDRV_TOKENS_FILE;
}

/** @return array<string,mixed>|null */
function ondrv_load_tokens(string $rootReal): ?array
{
    $path = ondrv_tokens_path($rootReal);
    if (!is_file($path)) return null;
    $raw = @file_get_contents($path);
    if (!is_string($raw) || $raw === '') return null;
    $json = json_decode($raw, true);
    if (!is_array($json)) return null;
    return ondrv_migrate_tokens_shape($json);
}

/**
 * Migra tokens legacy (sem `mounts`) para o novo formato, movendo campos
 * por-mount (driveId, rootItemId, rootOneDrivePath, deltaLink, lastSync*)
 * para `mounts.comercial`. Idempotente.
 *
 * @param array<string,mixed> $tokens
 * @return array<string,mixed>
 */
function ondrv_migrate_tokens_shape(array $tokens): array
{
    if (!isset($tokens['mounts']) || !is_array($tokens['mounts'])) {
        $tokens['mounts'] = [];
    }
    $legacyKeys = ['driveId','rootItemId','rootOneDrivePath','rootResolvedAt','deltaLink','lastSyncAt','lastSyncStatus','lastSyncStats'];
    $hasLegacy = false;
    foreach ($legacyKeys as $k) {
        if (array_key_exists($k, $tokens)) { $hasLegacy = true; break; }
    }
    if ($hasLegacy) {
        $c = $tokens['mounts']['comercial'] ?? [];
        foreach ($legacyKeys as $k) {
            if (array_key_exists($k, $tokens) && !array_key_exists($k, $c)) {
                $c[$k] = $tokens[$k];
            }
            unset($tokens[$k]);
        }
        $tokens['mounts']['comercial'] = $c;
    }
    return $tokens;
}

/** @param array<string,mixed> $data */
function ondrv_save_tokens(string $rootReal, array $data): void
{
    $path = ondrv_tokens_path($rootReal);
    $json = json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    if (!is_string($json)) return;
    @file_put_contents($path, $json, LOCK_EX);
    @chmod($path, 0600);
}

function ondrv_clear_tokens(string $rootReal): void
{
    @unlink(ondrv_tokens_path($rootReal));
}

/** Devolve ref a uma "slot" mount dentro de $tokens, criando-a se necessario. */
function &ondrv_mount_slot(array &$tokens, string $mountId): array
{
    if (!isset($tokens['mounts']) || !is_array($tokens['mounts'])) {
        $tokens['mounts'] = [];
    }
    if (!isset($tokens['mounts'][$mountId]) || !is_array($tokens['mounts'][$mountId])) {
        $tokens['mounts'][$mountId] = [];
    }
    return $tokens['mounts'][$mountId];
}

/** @return array<string,mixed> */
function ondrv_load_items_map(string $rootReal): array
{
    $path = $rootReal . DIRECTORY_SEPARATOR . ONDRV_ITEMS_MAP_FILE;
    if (!is_file($path)) return [];
    $raw = @file_get_contents($path);
    if (!is_string($raw) || $raw === '') return [];
    $json = json_decode($raw, true);
    return is_array($json) ? $json : [];
}

/** @param array<string,mixed> $map */
function ondrv_save_items_map(string $rootReal, array $map): void
{
    $path = $rootReal . DIRECTORY_SEPARATOR . ONDRV_ITEMS_MAP_FILE;
    $json = json_encode($map, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    if (!is_string($json)) return;
    @file_put_contents($path, $json, LOCK_EX);
    @chmod($path, 0600);
}

/** Ficheiros registados no itemsMap do mount cuja copia local ainda nao existe. */
function ondrv_count_missing_local_files(string $rootReal, string $mountId): int
{
    $itemsMap = ondrv_load_items_map($rootReal);
    $n = 0;
    foreach ($itemsMap as $rentry) {
        if (!is_array($rentry)) continue;
        if (($rentry['mountId'] ?? '') !== $mountId) continue;
        if (($rentry['kind'] ?? '') !== 'file') continue;
        $rabs = (string)($rentry['absPath'] ?? '');
        if ($rabs === '' || is_file($rabs)) continue;
        $n++;
    }
    return $n;
}

/** Pastas no itemsMap do mount cujo diretorio local ainda nao existe. */
function ondrv_count_missing_local_folders(string $rootReal, string $mountId): int
{
    $itemsMap = ondrv_load_items_map($rootReal);
    $n = 0;
    foreach ($itemsMap as $rentry) {
        if (!is_array($rentry)) continue;
        if (($rentry['mountId'] ?? '') !== $mountId) continue;
        if (($rentry['kind'] ?? '') !== 'folder') continue;
        $p = (string)($rentry['absPath'] ?? '');
        if ($p === '' || is_dir($p)) continue;
        $n++;
    }
    return $n;
}

/**
 * Estimativa leve para UI: ficheiros em falta no disco + pastas em falta +
 * total de ficheiros locais no mount (para push).
 *
 * @return array{filesMissing:int,foldersMissing:int,localFiles:int}
 */
function ondrv_estimate_mount_pending(string $rootReal, array $mount): array
{
    $mid = (string)($mount['id'] ?? '');
    $filesMissing = ondrv_count_missing_local_files($rootReal, $mid);
    $foldersMissing = ondrv_count_missing_local_folders($rootReal, $mid);
    $localAbs = ondrv_mount_local_abs($rootReal, $mount);
    $localFiles = 0;
    if (is_dir($localAbs)) {
        try {
            $it = new RecursiveIteratorIterator(
                new RecursiveDirectoryIterator($localAbs, RecursiveDirectoryIterator::SKIP_DOTS),
                RecursiveIteratorIterator::LEAVES_ONLY
            );
            foreach ($it as $entry) {
                if (!$entry->isFile()) continue;
                $base = $entry->getFilename();
                if (str_starts_with($base, '.navel-')) continue;
                $localFiles++;
            }
        } catch (Throwable $e) {
            /* noop */
        }
    }
    return [
        'filesMissing'    => $filesMissing,
        'foldersMissing'  => $foldersMissing,
        'localFiles'      => $localFiles,
    ];
}

/** @param array<string,mixed> $snapshot */
function ondrv_save_sync_progress(string $rootReal, string $mountId, array $snapshot): void
{
    $path = $rootReal . DIRECTORY_SEPARATOR . ONDRV_SYNC_PROGRESS_FILE;
    $all = [];
    if (is_file($path)) {
        $raw = @file_get_contents($path);
        if (is_string($raw) && $raw !== '') {
            $j = json_decode($raw, true);
            if (is_array($j)) {
                $all = $j;
            }
        }
    }
    $all[$mountId] = array_merge($snapshot, ['updatedAt' => time()]);
    $json = json_encode($all, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    if (!is_string($json)) return;
    @file_put_contents($path, $json, LOCK_EX);
    @chmod($path, 0600);
}

/** @return array<string,mixed>|null */
function ondrv_load_sync_progress(string $rootReal, ?string $mountId = null): ?array
{
    $path = $rootReal . DIRECTORY_SEPARATOR . ONDRV_SYNC_PROGRESS_FILE;
    if (!is_file($path)) return $mountId === null ? [] : null;
    $raw = @file_get_contents($path);
    if (!is_string($raw) || $raw === '') return $mountId === null ? [] : null;
    $j = json_decode($raw, true);
    if (!is_array($j)) return $mountId === null ? [] : null;
    if ($mountId === null) {
        return $j;
    }
    return isset($j[$mountId]) && is_array($j[$mountId]) ? $j[$mountId] : null;
}

function ondrv_log(string $rootReal, string $msg): void
{
    $path = $rootReal . DIRECTORY_SEPARATOR . ONDRV_SYNC_LOG_FILE;
    $line = '[' . gmdate('Y-m-d H:i:s') . 'Z] ' . $msg . PHP_EOL;
    @file_put_contents($path, $line, FILE_APPEND | LOCK_EX);
}

// ── Tombstones (protegem contra re-upload de items acabados de apagar) ────────

/**
 * Carrega a tabela de tombstones e remove entries expirados.
 * @return array<string,int> map absPath → deletedAt (unix ts)
 */
function ondrv_load_tombstones(string $rootReal): array
{
    $path = $rootReal . DIRECTORY_SEPARATOR . ONDRV_TOMBSTONES_FILE;
    if (!is_file($path)) return [];
    $raw = @file_get_contents($path);
    if (!is_string($raw) || $raw === '') return [];
    $json = json_decode($raw, true);
    if (!is_array($json)) return [];
    $now = time();
    $out = [];
    foreach ($json as $abs => $ts) {
        if (!is_string($abs) || $abs === '') continue;
        $ts = (int)$ts;
        if ($ts <= 0) continue;
        if ($now - $ts > ONDRV_TOMBSTONE_TTL) continue;
        $out[$abs] = $ts;
    }
    return $out;
}

/** @param array<string,int> $tombstones */
function ondrv_save_tombstones(string $rootReal, array $tombstones): void
{
    $path = $rootReal . DIRECTORY_SEPARATOR . ONDRV_TOMBSTONES_FILE;
    $json = json_encode($tombstones, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    if (!is_string($json)) return;
    @file_put_contents($path, $json, LOCK_EX);
    @chmod($path, 0600);
}

/** Marca um absPath como recentemente apagado. */
function ondrv_tombstone_add(string $rootReal, string $absPath): void
{
    if ($absPath === '') return;
    $tombs = ondrv_load_tombstones($rootReal);
    $tombs[$absPath] = time();
    ondrv_save_tombstones($rootReal, $tombs);
}

/**
 * Verifica se o absPath (ou qualquer ancestral) foi apagado recentemente.
 * Retorna o timestamp do tombstone mais proximo ou 0.
 */
function ondrv_tombstone_check(string $rootReal, string $absPath): int
{
    if ($absPath === '') return 0;
    $tombs = ondrv_load_tombstones($rootReal);
    if (empty($tombs)) return 0;
    if (isset($tombs[$absPath])) return (int)$tombs[$absPath];
    $sep = DIRECTORY_SEPARATOR;
    foreach ($tombs as $tPath => $ts) {
        $prefix = rtrim($tPath, $sep) . $sep;
        if (strpos($absPath, $prefix) === 0) return (int)$ts;
    }
    return 0;
}

// ── OAuth state (CSRF) ────────────────────────────────────────────────────────

function ondrv_create_state(string $rootReal, string $email): string
{
    $state = bin2hex(random_bytes(24));
    $payload = [
        'state'     => $state,
        'email'     => $email,
        'createdAt' => time(),
    ];
    $path = $rootReal . DIRECTORY_SEPARATOR . ONDRV_STATE_FILE;
    @file_put_contents($path, json_encode($payload, JSON_UNESCAPED_UNICODE), LOCK_EX);
    @chmod($path, 0600);
    return $state;
}

/** @return array{email:string}|null */
function ondrv_consume_state(string $rootReal, string $state): ?array
{
    $path = $rootReal . DIRECTORY_SEPARATOR . ONDRV_STATE_FILE;
    if (!is_file($path)) return null;
    $raw = @file_get_contents($path);
    @unlink($path);
    if (!is_string($raw) || $raw === '') return null;
    $json = json_decode($raw, true);
    if (!is_array($json)) return null;
    $saved = (string)($json['state'] ?? '');
    $createdAt = (int)($json['createdAt'] ?? 0);
    if ($saved === '' || !hash_equals($saved, $state)) return null;
    if (time() - $createdAt > 600) return null; // 10 min
    return ['email' => (string)($json['email'] ?? '')];
}

// ── OAuth endpoints ───────────────────────────────────────────────────────────

function ondrv_authorize_url(array $cfg, string $state): string
{
    $params = http_build_query([
        'client_id'     => $cfg['clientId'],
        'response_type' => 'code',
        'redirect_uri'  => $cfg['redirectUri'],
        'response_mode' => 'query',
        'scope'         => ONDRV_SCOPES,
        'state'         => $state,
        'prompt'        => 'select_account',
    ]);
    return ONDRV_AUTHORITY . '/' . rawurlencode($cfg['tenantId']) . '/oauth2/v2.0/authorize?' . $params;
}

/**
 * @param array<string,string> $body
 * @return array<string,mixed>
 */
function ondrv_post_token(array $cfg, array $body): array
{
    $url = ONDRV_AUTHORITY . '/' . rawurlencode($cfg['tenantId']) . '/oauth2/v2.0/token';
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_POST           => true,
        CURLOPT_POSTFIELDS     => http_build_query($body),
        CURLOPT_HTTPHEADER     => ['Content-Type: application/x-www-form-urlencoded'],
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT        => 30,
        CURLOPT_CONNECTTIMEOUT => 10,
    ]);
    $resp = curl_exec($ch);
    $status = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $err = curl_error($ch);
    curl_close($ch);
    if (!is_string($resp) || $status < 200 || $status >= 300) {
        throw new RuntimeException('token_endpoint_error ' . $status . ': ' . ($err !== '' ? $err : (string)$resp));
    }
    $json = json_decode($resp, true);
    if (!is_array($json)) throw new RuntimeException('token_endpoint_bad_json');
    return $json;
}

/** @return array<string,mixed> */
function ondrv_exchange_code(array $cfg, string $code): array
{
    return ondrv_post_token($cfg, [
        'client_id'     => $cfg['clientId'],
        'client_secret' => $cfg['clientSecret'],
        'code'          => $code,
        'redirect_uri'  => $cfg['redirectUri'],
        'grant_type'    => 'authorization_code',
        'scope'         => ONDRV_SCOPES,
    ]);
}

/** @return array<string,mixed> */
function ondrv_refresh_token(array $cfg, string $refreshToken): array
{
    return ondrv_post_token($cfg, [
        'client_id'     => $cfg['clientId'],
        'client_secret' => $cfg['clientSecret'],
        'refresh_token' => $refreshToken,
        'grant_type'    => 'refresh_token',
        'scope'         => ONDRV_SCOPES,
    ]);
}

function ondrv_get_access_token(string $rootReal, array $cfg): ?string
{
    $tokens = ondrv_load_tokens($rootReal);
    if (!is_array($tokens) || empty($tokens['refreshToken'])) return null;

    $now = time();
    $expiresAt = (int)($tokens['accessTokenExpiresAt'] ?? 0);
    $access    = (string)($tokens['accessToken'] ?? '');
    if ($access !== '' && $expiresAt > $now + 120) {
        return $access;
    }

    try {
        $resp = ondrv_refresh_token($cfg, (string)$tokens['refreshToken']);
    } catch (Throwable $e) {
        ondrv_log($rootReal, 'refresh_failed: ' . $e->getMessage());
        return null;
    }

    $newRefresh = (string)($resp['refresh_token'] ?? $tokens['refreshToken']);
    $newAccess  = (string)($resp['access_token'] ?? '');
    $expiresIn  = (int)($resp['expires_in'] ?? 3600);
    if ($newAccess === '') return null;

    $tokens['refreshToken']          = $newRefresh;
    $tokens['accessToken']           = $newAccess;
    $tokens['accessTokenExpiresAt']  = $now + $expiresIn - 30;
    $tokens['lastRefreshAt']         = $now;
    ondrv_save_tokens($rootReal, $tokens);
    return $newAccess;
}

// ── Graph helpers (baixo nivel) ───────────────────────────────────────────────

function ondrv_graph_url(string $pathOrUrl): string
{
    return str_starts_with($pathOrUrl, 'http')
        ? $pathOrUrl
        : ONDRV_GRAPH_ROOT . (str_starts_with($pathOrUrl, '/') ? '' : '/') . $pathOrUrl;
}

/**
 * Extrai segundos a aguardar do header Retry-After (numero ou HTTP-date).
 */
function ondrv_parse_retry_after(array $respHeaderLines): ?int
{
    foreach ($respHeaderLines as $line) {
        if ($line === '' || strpos($line, ':') === false) continue;
        [$k, $v] = explode(':', $line, 2);
        if (strcasecmp(trim($k), 'Retry-After') !== 0) continue;
        $v = trim($v);
        if ($v === '') continue;
        if (ctype_digit($v)) {
            return min(180, max(0, (int)$v));
        }
        $ts = strtotime($v);
        if ($ts !== false) {
            $sec = $ts - time();
            return min(180, max(0, $sec));
        }
    }
    return null;
}

/**
 * GET Microsoft Graph com retry em throttling (429) e indisponibilidade (503/504).
 * CURLOPT_ENCODING aceita gzip — menos dados na rede (boas praticas Graph).
 *
 * @return array<string,mixed>
 */
function ondrv_graph_get(string $accessToken, string $path, ?string $logRoot = null): array
{
    $url = ondrv_graph_url($path);
    $max = ONDRV_GRAPH_MAX_RETRIES;
    $lastBody = '';
    $lastStatus = 0;
    for ($attempt = 1; $attempt <= $max; $attempt++) {
        $respHeaders = [];
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_HTTPHEADER     => [
                'Authorization: Bearer ' . $accessToken,
                'Accept: application/json',
            ],
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT        => 120,
            CURLOPT_CONNECTTIMEOUT => 15,
            CURLOPT_ENCODING       => '',
            CURLOPT_HEADERFUNCTION => static function ($curl, $headerLine) use (&$respHeaders) {
                $respHeaders[] = rtrim($headerLine, "\r\n");
                return strlen($headerLine);
            },
        ]);
        $resp = curl_exec($ch);
        $status = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        $lastStatus = $status;
        $lastBody = is_string($resp) ? $resp : '';
        if (!is_string($resp)) {
            throw new RuntimeException('graph_get_network');
        }
        if ($status >= 200 && $status < 300) {
            $json = json_decode($resp, true);
            return is_array($json) ? $json : [];
        }
        if (($status === 429 || $status === 503 || $status === 504) && $attempt < $max) {
            $wait = ondrv_parse_retry_after($respHeaders);
            if ($wait === null) {
                $wait = min(180, (int)(3 * (2 ** min($attempt - 1, 6))));
            }
            $wait = max(1, min(180, $wait));
            if ($logRoot !== null && $logRoot !== '') {
                ondrv_log($logRoot, 'graph_throttle_retry method=GET status=' . $status . ' wait=' . $wait . 's attempt=' . $attempt . '/' . $max);
            }
            sleep($wait);
            continue;
        }
        throw new RuntimeException('graph_get ' . $status . ': ' . substr($resp, 0, 500));
    }
    throw new RuntimeException('graph_get ' . $lastStatus . ': ' . substr($lastBody, 0, 500));
}

/**
 * @param array<string,mixed>|null $body
 * @return array<string,mixed>
 */
function ondrv_graph_post(string $accessToken, string $path, ?array $body = null, ?string $logRoot = null): array
{
    $url = ondrv_graph_url($path);
    $payload = $body !== null ? json_encode($body, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) : '{}';
    $max = ONDRV_GRAPH_MAX_RETRIES;
    $lastBody = '';
    $lastStatus = 0;
    for ($attempt = 1; $attempt <= $max; $attempt++) {
        $respHeaders = [];
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_POST           => true,
            CURLOPT_POSTFIELDS     => $payload,
            CURLOPT_HTTPHEADER     => [
                'Authorization: Bearer ' . $accessToken,
                'Accept: application/json',
                'Content-Type: application/json',
            ],
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT        => 120,
            CURLOPT_CONNECTTIMEOUT => 15,
            CURLOPT_ENCODING       => '',
            CURLOPT_HEADERFUNCTION => static function ($curl, $headerLine) use (&$respHeaders) {
                $respHeaders[] = rtrim($headerLine, "\r\n");
                return strlen($headerLine);
            },
        ]);
        $resp = curl_exec($ch);
        $status = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        $lastStatus = $status;
        $lastBody = is_string($resp) ? $resp : '';
        if (!is_string($resp)) {
            throw new RuntimeException('graph_post_network');
        }
        if ($status >= 200 && $status < 300) {
            $json = json_decode($resp, true);
            return is_array($json) ? $json : [];
        }
        if (($status === 429 || $status === 503 || $status === 504) && $attempt < $max) {
            $wait = ondrv_parse_retry_after($respHeaders);
            if ($wait === null) {
                $wait = min(180, (int)(3 * (2 ** min($attempt - 1, 6))));
            }
            $wait = max(1, min(180, $wait));
            if ($logRoot !== null && $logRoot !== '') {
                ondrv_log($logRoot, 'graph_throttle_retry method=POST status=' . $status . ' wait=' . $wait . 's attempt=' . $attempt . '/' . $max);
            }
            sleep($wait);
            continue;
        }
        throw new RuntimeException('graph_post ' . $status . ': ' . substr($resp, 0, 500));
    }
    throw new RuntimeException('graph_post ' . $lastStatus . ': ' . substr($lastBody, 0, 500));
}

/** @return array<string,mixed> */
function ondrv_graph_put_content(string $accessToken, string $path, string $bytes, string $contentType = 'application/octet-stream'): array
{
    $ch = curl_init(ondrv_graph_url($path));
    curl_setopt_array($ch, [
        CURLOPT_CUSTOMREQUEST  => 'PUT',
        CURLOPT_POSTFIELDS     => $bytes,
        CURLOPT_HTTPHEADER     => [
            'Authorization: Bearer ' . $accessToken,
            'Content-Type: ' . $contentType,
        ],
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT        => 180,
    ]);
    $resp = curl_exec($ch);
    $status = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    if (!is_string($resp)) throw new RuntimeException('graph_put_network');
    if ($status < 200 || $status >= 300) {
        throw new RuntimeException('graph_put ' . $status . ': ' . substr($resp, 0, 500));
    }
    $json = json_decode($resp, true);
    return is_array($json) ? $json : [];
}

/** @return array<string,mixed> */
function ondrv_graph_delete(string $accessToken, string $path): array
{
    $ch = curl_init(ondrv_graph_url($path));
    curl_setopt_array($ch, [
        CURLOPT_CUSTOMREQUEST  => 'DELETE',
        CURLOPT_HTTPHEADER     => [
            'Authorization: Bearer ' . $accessToken,
            'Accept: application/json',
        ],
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT        => 60,
    ]);
    $resp = curl_exec($ch);
    $status = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    if (!is_string($resp)) throw new RuntimeException('graph_delete_network');
    if ($status === 404) return ['status' => 404];
    if ($status < 200 || $status >= 300) {
        throw new RuntimeException('graph_delete ' . $status . ': ' . substr($resp, 0, 500));
    }
    return ['status' => $status];
}

/** @return array<string,mixed> */
function ondrv_graph_upload_session(string $accessToken, string $createSessionPath, string $filePath, ?string $logRoot = null): array
{
    $session = ondrv_graph_post($accessToken, $createSessionPath, [
        'item' => [
            '@microsoft.graph.conflictBehavior' => 'replace',
        ],
    ], $logRoot);
    $uploadUrl = (string)($session['uploadUrl'] ?? '');
    if ($uploadUrl === '') throw new RuntimeException('upload_session_no_url');

    $fp = @fopen($filePath, 'rb');
    if ($fp === false) throw new RuntimeException('upload_session_cannot_open_file');

    $size = filesize($filePath) ?: 0;
    $chunkSize = 5 * 1024 * 1024; // 5 MB
    $offset = 0;
    $last = [];
    try {
        while ($offset < $size) {
            $chunk = fread($fp, $chunkSize);
            if (!is_string($chunk) || $chunk === '') throw new RuntimeException('upload_session_read_failed');
            $chunkLen = strlen($chunk);
            $rangeEnd = $offset + $chunkLen - 1;
            $ch = curl_init($uploadUrl);
            curl_setopt_array($ch, [
                CURLOPT_CUSTOMREQUEST  => 'PUT',
                CURLOPT_POSTFIELDS     => $chunk,
                CURLOPT_HTTPHEADER     => [
                    'Content-Length: ' . $chunkLen,
                    'Content-Range: bytes ' . $offset . '-' . $rangeEnd . '/' . $size,
                ],
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_TIMEOUT        => 300,
            ]);
            $resp = curl_exec($ch);
            $status = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
            curl_close($ch);
            if (!is_string($resp)) throw new RuntimeException('upload_session_network @ ' . $offset);
            if ($status < 200 || $status >= 300) {
                throw new RuntimeException('upload_session ' . $status . ': ' . substr($resp, 0, 300));
            }
            $decoded = json_decode($resp, true);
            if (is_array($decoded)) $last = $decoded;
            $offset += $chunkLen;
        }
    } finally {
        @fclose($fp);
    }
    return $last;
}

function ondrv_download_url_to_file(string $url, string $destFile): bool
{
    $dir = dirname($destFile);
    if (!is_dir($dir)) @mkdir($dir, 0755, true);
    $fp = @fopen($destFile, 'wb');
    if ($fp === false) return false;
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_FILE           => $fp,
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_TIMEOUT        => ONDRV_FILE_DOWNLOAD_TIMEOUT,
        CURLOPT_CONNECTTIMEOUT => 15,
    ]);
    $ok = curl_exec($ch);
    $status = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    @fclose($fp);
    if ($ok === false || $status < 200 || $status >= 300) {
        @unlink($destFile);
        return false;
    }
    return true;
}

/**
 * Download via endpoint /drives/{driveId}/items/{itemId}/content.
 * Usado como FALLBACK quando o item do delta nao traz
 * `@microsoft.graph.downloadUrl` (acontece em alguns casos com OneDrive for
 * Business e contas Sharepoint). Segue o 302 que o Graph devolve para a URL
 * real de download.
 */
function ondrv_download_item_content(string $accessToken, string $driveId, string $itemId, string $destFile): bool
{
    $dir = dirname($destFile);
    if (!is_dir($dir)) @mkdir($dir, 0755, true);
    $fp = @fopen($destFile, 'wb');
    if ($fp === false) return false;
    $url = 'https://graph.microsoft.com/v1.0/drives/' . rawurlencode($driveId) . '/items/' . rawurlencode($itemId) . '/content';
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_FILE           => $fp,
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_TIMEOUT        => ONDRV_FILE_DOWNLOAD_TIMEOUT,
        CURLOPT_CONNECTTIMEOUT => 15,
        CURLOPT_HTTPHEADER     => ['Authorization: Bearer ' . $accessToken],
    ]);
    $ok = curl_exec($ch);
    $status = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    @fclose($fp);
    if ($ok === false || $status < 200 || $status >= 300) {
        @unlink($destFile);
        return false;
    }
    return true;
}

function ondrv_encode_onedrive_path(string $path): string
{
    $segments = array_filter(explode('/', $path), static fn($s) => $s !== '');
    return implode('/', array_map(static fn($s) => rawurlencode($s), $segments));
}

/**
 * Converte "2024-01-15T12:34:56.789Z" em timestamp UTC.
 * Devolve 0 se parse falhar.
 */
function ondrv_iso_to_ts(string $iso): int
{
    if ($iso === '') return 0;
    try {
        $dt = new DateTimeImmutable($iso, new DateTimeZone('UTC'));
        return (int)$dt->getTimestamp();
    } catch (Throwable $e) {
        $ts = strtotime($iso);
        return $ts === false ? 0 : (int)$ts;
    }
}

/**
 * Sincroniza o mtime do ficheiro local com o lastModifiedDateTime remoto.
 * Sem efeito se `$isoRemote` for invalido ou o ficheiro nao existir.
 */
function ondrv_touch_to_remote(string $absPath, string $isoRemote): void
{
    $ts = ondrv_iso_to_ts($isoRemote);
    if ($ts <= 0) return;
    if (!is_file($absPath)) return;
    @touch($absPath, $ts);
}

// ── Resolver pasta raiz de um mount (com cache em tokens.mounts[id]) ──────────

/**
 * @return array{driveId:string,rootItemId:string,rootOneDrivePath:string}|null
 */
function ondrv_resolve_mount_root(string $rootReal, array $cfg, string $accessToken, array $mount, bool $force = false): ?array
{
    $tokens = ondrv_load_tokens($rootReal) ?: [];
    $slot = &ondrv_mount_slot($tokens, $mount['id']);
    if (!$force && !empty($slot['driveId']) && !empty($slot['rootItemId'])) {
        return [
            'driveId'          => (string)$slot['driveId'],
            'rootItemId'       => (string)$slot['rootItemId'],
            'rootOneDrivePath' => (string)($slot['rootOneDrivePath'] ?? ''),
        ];
    }
    $path = $mount['remotePath'];
    if ($path === '') return null;

    $candidates = array_unique([
        $path,
        'Documentos/' . $path,
        'Documents/' . $path,
    ]);

    foreach ($candidates as $candidate) {
        $candidate = trim($candidate, '/');
        $encoded = ondrv_encode_onedrive_path($candidate);
        try {
            $meta = ondrv_graph_get($accessToken, '/me/drive/root:/' . $encoded . '?$select=id,name,parentReference,folder');
        } catch (Throwable $e) {
            continue;
        }
        $id = (string)($meta['id'] ?? '');
        if ($id === '') continue;
        $driveId = (string)($meta['parentReference']['driveId'] ?? '');
        if ($driveId === '') {
            $driveMeta = ondrv_graph_get($accessToken, '/me/drive?$select=id');
            $driveId = (string)($driveMeta['id'] ?? '');
        }
        $slot['driveId']          = $driveId;
        $slot['rootItemId']       = $id;
        $slot['rootOneDrivePath'] = $candidate;
        $slot['rootResolvedAt']   = time();
        ondrv_save_tokens($rootReal, $tokens);
        return [
            'driveId'          => $driveId,
            'rootItemId'       => $id,
            'rootOneDrivePath' => $candidate,
        ];
    }
    // Tentativa de criar a pasta-mae no OneDrive se for mount push ou bidirectional.
    $dir = (string)($mount['direction'] ?? '');
    if ($dir === 'push' || $dir === 'bidirectional') {
        try {
            $created = ondrv_graph_create_remote_path($accessToken, $path, $rootReal);
            if ($created !== null) {
                $driveId = (string)($created['parentReference']['driveId'] ?? '');
                if ($driveId === '') {
                    $driveMeta = ondrv_graph_get($accessToken, '/me/drive?$select=id');
                    $driveId = (string)($driveMeta['id'] ?? '');
                }
                $slot['driveId']          = $driveId;
                $slot['rootItemId']       = (string)$created['id'];
                $slot['rootOneDrivePath'] = trim($path, '/');
                $slot['rootResolvedAt']   = time();
                ondrv_save_tokens($rootReal, $tokens);
                return [
                    'driveId'          => $driveId,
                    'rootItemId'       => (string)$created['id'],
                    'rootOneDrivePath' => trim($path, '/'),
                ];
            }
        } catch (Throwable $e) {
            ondrv_log($rootReal, 'mount_root_create_failed ' . $mount['id'] . ': ' . $e->getMessage());
        }
    }
    return null;
}

/**
 * Cria (idempotente) uma cadeia de pastas "a/b/c" a partir da raiz do drive do utilizador.
 * @return array<string,mixed>|null meta do ultimo item criado
 */
function ondrv_graph_create_remote_path(string $accessToken, string $path, ?string $logRoot = null): ?array
{
    $rel = trim(str_replace('\\', '/', $path), '/');
    if ($rel === '') return null;
    $segments = explode('/', $rel);
    $driveMeta = ondrv_graph_get($accessToken, '/me/drive?$select=id');
    $driveId = (string)($driveMeta['id'] ?? '');
    if ($driveId === '') return null;
    $rootMeta = ondrv_graph_get($accessToken, '/me/drive/root?$select=id');
    $parentId = (string)($rootMeta['id'] ?? '');
    if ($parentId === '') return null;
    $last = null;
    foreach ($segments as $seg) {
        if ($seg === '' || $seg === '.' || $seg === '..') continue;
        $last = ondrv_graph_post($accessToken, '/drives/' . rawurlencode($driveId) . '/items/' . rawurlencode($parentId) . '/children', [
            'name'   => $seg,
            'folder' => new stdClass(),
            '@microsoft.graph.conflictBehavior' => 'replace',
        ], $logRoot);
        $parentId = (string)($last['id'] ?? $parentId);
    }
    return $last;
}

// ── Normalizacao de items (delta) ─────────────────────────────────────────────

/**
 * @param array<string,mixed> $item
 * @return array{id:string,kind:string,name:string,size:int,relPath:string,absPath:string,parentId:string,downloadUrl:string,lastModifiedDateTime:string}
 */
function ondrv_normalize_item(array $item, string $rootOneDrivePath, string $localAbs): array
{
    $id   = (string)($item['id'] ?? '');
    $name = (string)($item['name'] ?? '');
    $isFolder = isset($item['folder']);
    $kind = $isFolder ? 'folder' : 'file';
    $size = (int)($item['size'] ?? 0);
    $parentPath = (string)($item['parentReference']['path'] ?? '');
    $parentId   = (string)($item['parentReference']['id'] ?? '');

    // parentReference.path: "/drives/{driveId}/root:/Documentos/NAVEL/..."
    $decoded = rawurldecode($parentPath);
    $marker = '/root:';
    $pos = strpos($decoded, $marker);
    $absParent = $pos !== false ? substr($decoded, $pos + strlen($marker)) : $decoded;
    $absParent = '/' . ltrim($absParent, '/');

    $rootPrefix = '/' . trim($rootOneDrivePath, '/');
    $rel = '';
    if ($rootPrefix === '/' || str_starts_with($absParent, $rootPrefix)) {
        $tail = $rootPrefix === '/' ? $absParent : substr($absParent, strlen($rootPrefix));
        $tail = trim((string)$tail, '/');
        $rel = $tail === '' ? $name : $tail . '/' . $name;
    } else {
        $rel = $name;
    }
    $rel = trim($rel, '/');
    $absPath = $localAbs . ($rel === '' ? '' : DIRECTORY_SEPARATOR . str_replace('/', DIRECTORY_SEPARATOR, $rel));
    return [
        'id'                   => $id,
        'kind'                 => $kind,
        'name'                 => $name,
        'size'                 => $size,
        'relPath'              => $rel,
        'absPath'              => $absPath,
        'parentId'             => $parentId,
        'downloadUrl'          => (string)($item['@microsoft.graph.downloadUrl'] ?? ''),
        'lastModifiedDateTime' => (string)($item['lastModifiedDateTime'] ?? ''),
    ];
}

// ── PULL delta (mount direction = pull ou bidirectional) ──────────────────────

/**
 * Corre delta sync de OneDrive → local para um mount.
 * @return array<string,mixed>
 */
function ondrv_sync_delta_for_mount(string $rootReal, array $cfg, array $mount, ?int $budgetSeconds = null): array
{
    $budget = ($budgetSeconds !== null && $budgetSeconds > 0) ? $budgetSeconds : ONDRV_SYNC_TIME_BUDGET;
    $accessToken = ondrv_get_access_token($rootReal, $cfg);
    if ($accessToken === null) return ['ok' => false, 'error' => 'not_connected', 'done' => false];

    $root = ondrv_resolve_mount_root($rootReal, $cfg, $accessToken, $mount);
    if ($root === null) return ['ok' => false, 'error' => 'root_path_not_found', 'rootPath' => $mount['remotePath'], 'done' => false];

    $tokens = ondrv_load_tokens($rootReal) ?: [];
    $slot = &ondrv_mount_slot($tokens, $mount['id']);
    $localAbs = ondrv_mount_local_abs($rootReal, $mount);
    if (!is_dir($localAbs) && !@mkdir($localAbs, 0755, true)) {
        return ['ok' => false, 'error' => 'cannot_create_local_root', 'done' => false];
    }
    $itemsMap = ondrv_load_items_map($rootReal);

    $deltaLink = (string)($slot['deltaLink'] ?? '');
    // Primeira corrida (sem deltaLink): $top limita itens por pagina — menos picos de memoria/timeout.
    // nextLink/deltaLink devolvidos pelo Graph ja trazem a paginacao correta.
    $initialUrl = $deltaLink !== ''
        ? $deltaLink
        : '/drives/' . rawurlencode($root['driveId']) . '/items/' . rawurlencode($root['rootItemId']) . '/delta?$top=' . (int)ONDRV_DELTA_PAGE_TOP;

    $stats = [
        'foldersCreated' => 0,
        'filesDownloaded' => 0,
        'renamed' => 0,
        'deleted' => 0,
        'skipped' => 0,
        'conflictsKeptLocal' => 0,
        'errors' => 0,
        'pages' => 0,
    ];
    $isBidirectional = (string)($mount['direction'] ?? '') === 'bidirectional';
    $url = $initialUrl;
    $newDeltaLink = '';
    $maxPages = 50;
    $deadline = microtime(true) + $budget;
    $timedOut = false;
    while ($url !== '' && $stats['pages'] < $maxPages) {
        if (microtime(true) >= $deadline) { $timedOut = true; break; }
        try {
            $page = ondrv_graph_get($accessToken, $url, $rootReal);
        } catch (Throwable $e) {
            ondrv_log($rootReal, 'delta_page_failed[' . $mount['id'] . ']: ' . $e->getMessage());
            $slot['lastSyncStatus'] = 'error';
            $slot['lastSyncAt']     = time();
            ondrv_save_tokens($rootReal, $tokens);
            return ['ok' => false, 'error' => 'delta_failed', 'detail' => $e->getMessage(), 'stats' => $stats, 'done' => false];
        }
        $stats['pages']++;
        $items = is_array($page['value'] ?? null) ? $page['value'] : [];
        foreach ($items as $item) {
            if (!is_array($item)) continue;
            $id = (string)($item['id'] ?? '');
            if ($id === '' || $id === $root['rootItemId']) continue;

            if (isset($item['deleted'])) {
                $prev = $itemsMap[$id] ?? null;
                if (is_array($prev) && !empty($prev['absPath'])) {
                    $abs = (string)$prev['absPath'];
                    // LWW para deletes em bidirectional: se o local foi modificado depois
                    // do `lastSeenAt` remoto conhecido, preservamos o local (o push vai
                    // recria-lo no OneDrive). Em mounts pull puro, deleta sempre.
                    $keepLocal = false;
                    if ($isBidirectional && (is_file($abs) || is_dir($abs))) {
                        $localMtime = @filemtime($abs) ?: 0;
                        $knownRemoteTs = ondrv_iso_to_ts((string)($prev['lastModifiedDateTime'] ?? ''));
                        if ($localMtime > 0 && $knownRemoteTs > 0 && $localMtime > $knownRemoteTs + 2) {
                            $keepLocal = true;
                        }
                    }
                    if ($keepLocal) {
                        $stats['conflictsKeptLocal']++;
                        ondrv_log($rootReal, 'conflict_kept_local_delete[' . $mount['id'] . '] ' . (string)($prev['relPath'] ?? $abs));
                    } else {
                        if (is_file($abs)) { @unlink($abs); $stats['deleted']++; }
                        elseif (is_dir($abs)) { ondrv_rmdir_recursive($abs); $stats['deleted']++; }
                        // Regista tombstone para travar o push full de reenviar
                        // este path nos proximos 7 dias (anti-ping-pong).
                        ondrv_tombstone_add($rootReal, $abs);
                    }
                }
                unset($itemsMap[$id]);
                continue;
            }

            $n = ondrv_normalize_item($item, $root['rootOneDrivePath'], $localAbs);
            if ($n['name'] === '') { $stats['skipped']++; continue; }

            // Rename/move detectado: mesmo id OneDrive mas path local diferente
            // do que tinhamos em itemsMap. Renomeamos o item localmente em vez
            // de criar duplicado, e actualizamos o itemsMap para todos os
            // descendentes (quando e uma pasta que foi renomeada/movida).
            $prev = $itemsMap[$id] ?? null;
            $prevAbs = is_array($prev) ? (string)($prev['absPath'] ?? '') : '';
            if ($prevAbs !== '' && $prevAbs !== $n['absPath']) {
                $parentNew = dirname($n['absPath']);
                if (!is_dir($parentNew)) @mkdir($parentNew, 0755, true);
                if (file_exists($prevAbs) && !file_exists($n['absPath'])) {
                    if (@rename($prevAbs, $n['absPath'])) {
                        $stats['renamed']++;
                        ondrv_log($rootReal, 'renamed[' . $mount['id'] . '] ' . $prevAbs . ' -> ' . $n['absPath']);
                        if ($n['kind'] === 'folder') {
                            // Actualiza itemsMap dos descendentes para novo prefix.
                            $oldPrefix = rtrim($prevAbs, DIRECTORY_SEPARATOR) . DIRECTORY_SEPARATOR;
                            $newPrefix = rtrim($n['absPath'], DIRECTORY_SEPARATOR) . DIRECTORY_SEPARATOR;
                            foreach ($itemsMap as $cid => $centry) {
                                if (!is_array($centry) || ($centry['mountId'] ?? '') !== $mount['id']) continue;
                                $cabs = (string)($centry['absPath'] ?? '');
                                if ($cabs === '' || strpos($cabs, $oldPrefix) !== 0) continue;
                                $itemsMap[$cid]['absPath'] = $newPrefix . substr($cabs, strlen($oldPrefix));
                                if (isset($centry['relPath'])) {
                                    $relOld = (string)$centry['relPath'];
                                    // relPath separador sempre '/'.
                                    $oldRelPrefix = rtrim((string)($prev['relPath'] ?? ''), '/') . '/';
                                    $newRelPrefix = rtrim($n['relPath'], '/') . '/';
                                    if ($oldRelPrefix !== '/' && strpos($relOld, $oldRelPrefix) === 0) {
                                        $itemsMap[$cid]['relPath'] = $newRelPrefix . substr($relOld, strlen($oldRelPrefix));
                                    }
                                }
                            }
                        }
                    } else {
                        $stats['errors']++;
                        ondrv_log($rootReal, 'rename_failed[' . $mount['id'] . '] ' . $prevAbs . ' -> ' . $n['absPath']);
                    }
                } elseif (file_exists($prevAbs) && file_exists($n['absPath'])) {
                    // Destino ja existe (provavelmente criado por pull anterior
                    // antes do rename-handling). Remove o velho para nao ficarem duplicados.
                    if (is_dir($prevAbs))  ondrv_rmdir_recursive($prevAbs);
                    elseif (is_file($prevAbs)) @unlink($prevAbs);
                    ondrv_log($rootReal, 'rename_dedup[' . $mount['id'] . '] removed old ' . $prevAbs);
                }
            }

            if ($n['kind'] === 'folder') {
                if (!is_dir($n['absPath'])) {
                    if (@mkdir($n['absPath'], 0755, true)) $stats['foldersCreated']++;
                    else $stats['errors']++;
                }
                $itemsMap[$id] = [
                    'mountId' => $mount['id'],
                    'kind'    => 'folder',
                    'absPath' => $n['absPath'],
                    'relPath' => $n['relPath'],
                ];
            } else {
                $parentDir = dirname($n['absPath']);
                if (!is_dir($parentDir)) @mkdir($parentDir, 0755, true);
                $needsDownload = true;
                $keptLocal = false;
                if (is_file($n['absPath'])) {
                    $localSize = filesize($n['absPath']);
                    $prev = $itemsMap[$id] ?? null;
                    if ($localSize !== false && $n['size'] > 0 && (int)$localSize === $n['size']) {
                        if (is_array($prev) && (string)($prev['lastModifiedDateTime'] ?? '') === $n['lastModifiedDateTime']) {
                            $needsDownload = false;
                        }
                    }
                    // LWW: se o local e mais recente que a versao OneDrive
                    // (margem 2s para jitter), preservamos o local — o push
                    // posterior envia-o para OneDrive.
                    if ($needsDownload && $isBidirectional) {
                        $remoteTs = ondrv_iso_to_ts($n['lastModifiedDateTime']);
                        $localMtime = @filemtime($n['absPath']) ?: 0;
                        if ($remoteTs > 0 && $localMtime > $remoteTs + 2) {
                            $needsDownload = false;
                            $keptLocal = true;
                            $stats['conflictsKeptLocal']++;
                            ondrv_log($rootReal, 'conflict_kept_local[' . $mount['id'] . '] ' . $n['relPath'] . ' local=' . gmdate('c', $localMtime) . ' remote=' . $n['lastModifiedDateTime']);
                        }
                    }
                }
                if ($needsDownload) {
                    $downloaded = false;
                    if ($n['downloadUrl'] !== '') {
                        $downloaded = ondrv_download_url_to_file($n['downloadUrl'], $n['absPath']);
                    }
                    // Fallback: /content endpoint quando o delta nao traz
                    // downloadUrl ou falha a URL pre-assinada.
                    if (!$downloaded) {
                        $downloaded = ondrv_download_item_content($accessToken, $root['driveId'], $id, $n['absPath']);
                    }
                    if ($downloaded) {
                        ondrv_touch_to_remote($n['absPath'], $n['lastModifiedDateTime']);
                        $stats['filesDownloaded']++;
                    } else {
                        $stats['errors']++;
                        ondrv_log($rootReal, 'download_failed[' . $mount['id'] . '] ' . $n['relPath']);
                    }
                } elseif (!$keptLocal) {
                    $stats['skipped']++;
                }
                $localMtimeFinal = @filemtime($n['absPath']) ?: 0;
                $itemsMap[$id] = [
                    'mountId' => $mount['id'],
                    'kind'    => 'file',
                    'absPath' => $n['absPath'],
                    'relPath' => $n['relPath'],
                    'size'    => $n['size'],
                    'lastModifiedDateTime' => $n['lastModifiedDateTime'],
                    'localMtimeUtc' => $localMtimeFinal > 0 ? gmdate('Y-m-d\TH:i:s\Z', $localMtimeFinal) : '',
                ];
            }
        }
        $next = (string)($page['@odata.nextLink'] ?? '');
        $delta = (string)($page['@odata.deltaLink'] ?? '');
        if ($delta !== '') {
            $newDeltaLink = $delta;
            $url = '';
            break;
        }
        if ($next === '') { $url = ''; break; }
        $url = $next;
    }

    // Se batemos no budget ou no limite de paginas mas ainda ha nextLink para
    // processar, gravamos esse nextLink como deltaLink para continuar no
    // proximo clique de Sincronizar. O Graph API aceita ambos.
    $pendingResumeUrl = '';
    if ($newDeltaLink === '' && $url !== '') {
        $pendingResumeUrl = $url;
    }

    // Repesca de ficheiros em falta: se um ficheiro esta no itemsMap mas o
    // seu absPath nao existe localmente (por exemplo, um sync anterior nao
    // trouxe o download porque o delta nao incluiu downloadUrl), descarrega
    // agora via endpoint /content.
    // Limitamos a um batch por pedido e respeitamos o deadline global para
    // nao exceder o timeout do reverse proxy do cPanel (~5 min).
    $refetched = 0;
    $refetchErrors = 0;
    $refetchBudget = ONDRV_REFETCH_BATCH_SIZE;
    $refetchPending = 0;
    foreach ($itemsMap as $rid => $rentry) {
        if (!is_array($rentry)) continue;
        if (($rentry['mountId'] ?? '') !== $mount['id']) continue;
        if (($rentry['kind'] ?? '') !== 'file') continue;
        $rabs = (string)($rentry['absPath'] ?? '');
        if ($rabs === '' || is_file($rabs)) continue;
        $refetchPending++;
        if ($refetchBudget <= 0) continue;
        if (microtime(true) >= $deadline) { $timedOut = true; continue; }
        $rdir = dirname($rabs);
        if (!is_dir($rdir)) @mkdir($rdir, 0755, true);
        if (ondrv_download_item_content($accessToken, $root['driveId'], (string)$rid, $rabs)) {
            ondrv_touch_to_remote($rabs, (string)($rentry['lastModifiedDateTime'] ?? ''));
            $refetched++;
        } else {
            $refetchErrors++;
            ondrv_log($rootReal, 'refetch_failed[' . $mount['id'] . '] ' . (string)($rentry['relPath'] ?? $rabs));
        }
        $refetchBudget--;
    }
    if ($refetched > 0 || $refetchErrors > 0 || $refetchPending > 0) {
        $stats['filesDownloaded'] += $refetched;
        $stats['errors']          += $refetchErrors;
        $stats['refetchPending']   = max(0, $refetchPending - $refetched - $refetchErrors);
        ondrv_log($rootReal, 'refetch_done[' . $mount['id'] . '] downloaded=' . $refetched . ' errors=' . $refetchErrors . ' pending=' . $stats['refetchPending']);
    }

    $stats['missingLocalFiles'] = ondrv_count_missing_local_files($rootReal, $mount['id']);
    $stats['deltaPending'] = ($pendingResumeUrl !== '');
    $stats['refetchPending'] = $stats['missingLocalFiles'];

    if ($timedOut) {
        $stats['timedOut'] = true;
        ondrv_log($rootReal, 'sync_time_budget_hit[' . $mount['id'] . '] budget=' . $budget . 's pages=' . $stats['pages']);
    }

    if ($newDeltaLink !== '') {
        $slot['deltaLink'] = $newDeltaLink;
    } elseif ($pendingResumeUrl !== '') {
        // Guardamos o nextLink para retomar no proximo pedido. Graph aceita
        // tanto deltaLink como nextLink como ponto de partida.
        $slot['deltaLink'] = $pendingResumeUrl;
    }
    $slot['lastSyncAt']     = time();
    $slot['lastSyncStats']  = $stats;
    $slot['lastSyncStatus'] = 'ok';
    ondrv_save_tokens($rootReal, $tokens);
    ondrv_save_items_map($rootReal, $itemsMap);
    ondrv_log($rootReal, 'sync_ok[' . $mount['id'] . '] ' . json_encode($stats));
    $pullDone = !$timedOut
        && (int)$stats['missingLocalFiles'] === 0
        && !$stats['deltaPending'];
    return [
        'ok'            => true,
        'stats'         => $stats,
        'hasDeltaLink'  => $newDeltaLink !== '',
        'done'          => $pullDone,
    ];
}

// ── PUSH (mount direction = push ou bidirectional) ────────────────────────────

/**
 * Upload recursivo de todo o conteudo local do mount para OneDrive (seed inicial
 * ou verificacao periodica).
 *
 * Cria pastas ausentes e faz upload/replace de ficheiros cujo tamanho ou mtime
 * ainda nao esta registado no items map.
 *
 * @return array<string,mixed>
 */
function ondrv_push_full_for_mount(string $rootReal, array $cfg, array $mount, ?int $budgetSeconds = null): array
{
    $budget = ($budgetSeconds !== null && $budgetSeconds > 0) ? $budgetSeconds : ONDRV_SYNC_TIME_BUDGET;
    $accessToken = ondrv_get_access_token($rootReal, $cfg);
    if ($accessToken === null) return ['ok' => false, 'error' => 'not_connected', 'done' => false];

    $root = ondrv_resolve_mount_root($rootReal, $cfg, $accessToken, $mount);
    if ($root === null) return ['ok' => false, 'error' => 'root_path_not_found', 'rootPath' => $mount['remotePath'], 'done' => false];

    $localAbs = ondrv_mount_local_abs($rootReal, $mount);
    if (!is_dir($localAbs)) {
        if (!@mkdir($localAbs, 0755, true)) {
            return ['ok' => false, 'error' => 'cannot_create_local_root', 'done' => false];
        }
    }

    $stats = ['foldersCreated' => 0, 'filesUploaded' => 0, 'skipped' => 0, 'errors' => 0];
    $deadline = microtime(true) + $budget;
    $timedOut = false;

    // Walk local, criar pastas primeiro, depois upload de ficheiros.
    $it = new RecursiveIteratorIterator(
        new RecursiveDirectoryIterator($localAbs, RecursiveDirectoryIterator::SKIP_DOTS),
        RecursiveIteratorIterator::SELF_FIRST
    );
    foreach ($it as $entry) {
        if (microtime(true) >= $deadline) { $timedOut = true; break; }
        $abs = $entry->getPathname();
        $rel = substr($abs, strlen($localAbs));
        $rel = trim(str_replace(DIRECTORY_SEPARATOR, '/', (string)$rel), '/');
        if ($rel === '') continue;
        $base = basename($rel);
        // Skip dotfiles e pastas de versionamento internas.
        if (str_starts_with($base, '.navel-')) continue;
        if ($base === '.DS_Store') continue;

        // Anti-ping-pong: se este path (ou um ancestral) foi apagado remotamente
        // recentemente (tombstone valido), nao o reenviamos.
        $tombTs = ondrv_tombstone_check($rootReal, $abs);
        if ($tombTs > 0) {
            $stats['skipped']++;
            ondrv_log($rootReal, 'skipped_tombstone[' . $mount['id'] . '] ' . $rel . ' deletedAt=' . gmdate('c', $tombTs));
            continue;
        }

        if ($entry->isDir()) {
            try {
                ondrv_create_folder_for_mount($rootReal, $cfg, $mount, $rel);
                $stats['foldersCreated']++;
            } catch (Throwable $e) {
                ondrv_log($rootReal, 'push_full_mkdir_failed[' . $mount['id'] . '] ' . $rel . ': ' . $e->getMessage());
                $stats['errors']++;
            }
            continue;
        }
        if ($entry->isFile()) {
            if (ondrv_push_file_if_stale($rootReal, $cfg, $mount, $rel, $abs)) {
                $stats['filesUploaded']++;
            } else {
                $stats['skipped']++;
            }
        }
    }

    if ($timedOut) {
        $stats['timedOut'] = true;
        ondrv_log($rootReal, 'push_full_time_budget_hit[' . $mount['id'] . '] budget=' . $budget . 's');
    }
    $tokens = ondrv_load_tokens($rootReal) ?: [];
    $slot = &ondrv_mount_slot($tokens, $mount['id']);
    $slot['lastSyncAt']     = time();
    $slot['lastSyncStats']  = $stats;
    $slot['lastSyncStatus'] = 'ok';
    ondrv_save_tokens($rootReal, $tokens);
    ondrv_log($rootReal, 'push_full_ok[' . $mount['id'] . '] ' . json_encode($stats));
    $pushDone = !$timedOut;
    return ['ok' => true, 'stats' => $stats, 'done' => $pushDone];
}

/**
 * Faz upload de um ficheiro so se nao existir ou estiver diferente no items map.
 * Implementa LWW em mounts bidirectional: nao faz upload se o remoto conhecido
 * for mais recente que o local.
 *
 * @return bool true se fez upload; false se skipou
 */
function ondrv_push_file_if_stale(string $rootReal, array $cfg, array $mount, string $rel, string $absLocal): bool
{
    $size = filesize($absLocal);
    if ($size === false) return false;
    $mtime = @filemtime($absLocal) ?: 0;
    $isBidirectional = (string)($mount['direction'] ?? '') === 'bidirectional';

    // Procura entry no items map por absPath e mountId.
    $map = ondrv_load_items_map($rootReal);
    foreach ($map as $entry) {
        if (!is_array($entry)) continue;
        if (($entry['mountId'] ?? '') !== $mount['id']) continue;
        if (($entry['absPath'] ?? '') !== $absLocal) continue;

        $remoteTs = ondrv_iso_to_ts((string)($entry['lastModifiedDateTime'] ?? ''));
        // Mesmo size + mesmo mtime conhecido → nada mudou; skip.
        if ((int)($entry['size'] ?? -1) === (int)$size) {
            $localStamp = gmdate('Y-m-d\TH:i:s\Z', $mtime);
            $known = (string)($entry['localMtimeUtc'] ?? '');
            if ($known === $localStamp) return false;
        }
        // LWW bidirectional: se o remoto conhecido e mais recente que o local,
        // nao enviamos (o pull delta trara a versao mais nova).
        if ($isBidirectional && $remoteTs > 0 && $mtime > 0 && $remoteTs > $mtime + 2) {
            ondrv_log($rootReal, 'conflict_kept_remote[' . $mount['id'] . '] ' . $rel . ' local=' . gmdate('c', $mtime) . ' remote=' . gmdate('c', $remoteTs));
            return false;
        }
        break;
    }
    try {
        $meta = ondrv_upload_file_for_mount($rootReal, $cfg, $mount, $rel, $absLocal);
        ondrv_remember_upload($rootReal, $mount, $rel, $absLocal, $meta);
        return true;
    } catch (Throwable $e) {
        ondrv_log($rootReal, 'push_file_failed[' . $mount['id'] . '] ' . $rel . ': ' . $e->getMessage());
        return false;
    }
}

/**
 * Regista no items map o upload que acabou de acontecer, para evitar re-uploads.
 *
 * @param array<string,mixed> $meta metadata devolvida pela Graph API
 */
function ondrv_remember_upload(string $rootReal, array $mount, string $rel, string $absLocal, array $meta): void
{
    $id = (string)($meta['id'] ?? '');
    if ($id === '') return;
    $map = ondrv_load_items_map($rootReal);
    $map[$id] = [
        'mountId' => $mount['id'],
        'kind'    => 'file',
        'absPath' => $absLocal,
        'relPath' => $rel,
        'size'    => (int)($meta['size'] ?? (filesize($absLocal) ?: 0)),
        'lastModifiedDateTime' => (string)($meta['lastModifiedDateTime'] ?? ''),
        'localMtimeUtc' => gmdate('Y-m-d\TH:i:s\Z', @filemtime($absLocal) ?: time()),
    ];
    ondrv_save_items_map($rootReal, $map);
}

// ── Operacoes individuais (usadas em tempo real pelo documentos-api.php) ──────

/**
 * Cria pasta no OneDrive dentro do mount (idempotente).
 * @return array<string,mixed>
 */
function ondrv_create_folder_for_mount(string $rootReal, array $cfg, array $mount, string $relPathInsideMount): array
{
    $accessToken = ondrv_get_access_token($rootReal, $cfg);
    if ($accessToken === null) throw new RuntimeException('onedrive_not_connected');
    $root = ondrv_resolve_mount_root($rootReal, $cfg, $accessToken, $mount);
    if ($root === null) throw new RuntimeException('onedrive_root_not_found');

    $rel = trim(str_replace('\\', '/', $relPathInsideMount), '/');
    if ($rel === '') throw new RuntimeException('empty_folder_path');
    $segments = explode('/', $rel);
    $parentId = $root['rootItemId'];
    $last = [];
    foreach ($segments as $seg) {
        if ($seg === '' || $seg === '.' || $seg === '..') continue;
        $last = ondrv_graph_post($accessToken, '/drives/' . rawurlencode($root['driveId']) . '/items/' . rawurlencode($parentId) . '/children', [
            'name'                              => $seg,
            'folder'                            => new stdClass(),
            '@microsoft.graph.conflictBehavior' => 'replace',
        ], $rootReal);
        $parentId = (string)($last['id'] ?? $parentId);
    }
    return $last;
}

/**
 * Upload de ficheiro para OneDrive dentro do mount. $relPathInsideMount aponta para o ficheiro
 * (com nome incluido).
 * @return array<string,mixed>
 */
function ondrv_upload_file_for_mount(string $rootReal, array $cfg, array $mount, string $relPathInsideMount, string $localFilePath, string $contentType = ''): array
{
    $accessToken = ondrv_get_access_token($rootReal, $cfg);
    if ($accessToken === null) throw new RuntimeException('onedrive_not_connected');
    $root = ondrv_resolve_mount_root($rootReal, $cfg, $accessToken, $mount);
    if ($root === null) throw new RuntimeException('onedrive_root_not_found');

    $rel = trim(str_replace('\\', '/', $relPathInsideMount), '/');
    if ($rel === '') throw new RuntimeException('empty_file_path');

    $size = filesize($localFilePath);
    if ($size === false) throw new RuntimeException('cannot_stat_local_file');

    $absOneDrivePath = trim($root['rootOneDrivePath'], '/') . '/' . $rel;
    $encoded = ondrv_encode_onedrive_path($absOneDrivePath);

    if ($size <= 4 * 1024 * 1024) {
        $bytes = @file_get_contents($localFilePath);
        if ($bytes === false) throw new RuntimeException('cannot_read_local_file');
        $ctype = $contentType !== '' ? $contentType : 'application/octet-stream';
        return ondrv_graph_put_content($accessToken, '/me/drive/root:/' . $encoded . ':/content', $bytes, $ctype);
    }
    $sessionPath = '/me/drive/root:/' . $encoded . ':/createUploadSession';
    return ondrv_graph_upload_session($accessToken, $sessionPath, $localFilePath, $rootReal);
}

/**
 * Apaga um item (ficheiro ou pasta) no OneDrive dentro do mount. Idempotente (404 = ok).
 * @return array<string,mixed>
 */
function ondrv_delete_item_for_mount(string $rootReal, array $cfg, array $mount, string $relPathInsideMount): array
{
    $accessToken = ondrv_get_access_token($rootReal, $cfg);
    if ($accessToken === null) throw new RuntimeException('onedrive_not_connected');
    $root = ondrv_resolve_mount_root($rootReal, $cfg, $accessToken, $mount);
    if ($root === null) throw new RuntimeException('onedrive_root_not_found');

    $rel = trim(str_replace('\\', '/', $relPathInsideMount), '/');
    if ($rel === '') throw new RuntimeException('empty_delete_path');

    $absOneDrivePath = trim($root['rootOneDrivePath'], '/') . '/' . $rel;
    $encoded = ondrv_encode_onedrive_path($absOneDrivePath);
    $resp = ondrv_graph_delete($accessToken, '/me/drive/root:/' . $encoded);
    // Remove entries do items map que apontem para este rel.
    $map = ondrv_load_items_map($rootReal);
    $changed = false;
    foreach ($map as $id => $entry) {
        if (!is_array($entry)) continue;
        if (($entry['mountId'] ?? '') !== $mount['id']) continue;
        $entryRel = (string)($entry['relPath'] ?? '');
        if ($entryRel === $rel || str_starts_with($entryRel, $rel . '/')) {
            unset($map[$id]);
            $changed = true;
        }
    }
    if ($changed) ondrv_save_items_map($rootReal, $map);
    return $resp;
}

function ondrv_rmdir_recursive(string $dir): void
{
    if (!is_dir($dir)) return;
    $it = new RecursiveIteratorIterator(
        new RecursiveDirectoryIterator($dir, RecursiveDirectoryIterator::SKIP_DOTS),
        RecursiveIteratorIterator::CHILD_FIRST
    );
    foreach ($it as $file) {
        if ($file->isDir()) @rmdir($file->getPathname());
        else @unlink($file->getPathname());
    }
    @rmdir($dir);
}

/**
 * Conta recursivamente o numero de ficheiros e pastas dentro de $dir (exclui
 * o proprio $dir). Usado antes de `ondrv_rmdir_recursive` para reportar stats.
 * @return array{dirs:int,files:int}
 */
function ondrv_count_tree(string $dir): array
{
    $dirs = 0; $files = 0;
    if (!is_dir($dir)) return ['dirs' => 0, 'files' => 0];
    try {
        $it = new RecursiveIteratorIterator(
            new RecursiveDirectoryIterator($dir, RecursiveDirectoryIterator::SKIP_DOTS),
            RecursiveIteratorIterator::CHILD_FIRST
        );
        foreach ($it as $file) {
            if ($file->isDir()) $dirs++; else $files++;
        }
    } catch (Throwable $e) {
        // ignore
    }
    return ['dirs' => $dirs, 'files' => $files];
}

/**
 * Ajusta permissoes recursivamente (pastas $dirMode, ficheiros $fileMode) para
 * permitir apagar em cenarios com bits restritivos. Best-effort.
 */
function ondrv_chmod_tree(string $dir, int $dirMode, int $fileMode): void
{
    if (!is_dir($dir)) return;
    @chmod($dir, $dirMode);
    try {
        $it = new RecursiveIteratorIterator(
            new RecursiveDirectoryIterator($dir, RecursiveDirectoryIterator::SKIP_DOTS),
            RecursiveIteratorIterator::SELF_FIRST
        );
        foreach ($it as $file) {
            if ($file->isDir()) @chmod($file->getPathname(), $dirMode);
            else @chmod($file->getPathname(), $fileMode);
        }
    } catch (Throwable $e) {
        // ignore
    }
}

// ── Reset local por mount ─────────────────────────────────────────────────────

/**
 * Reset local do mount: limpa mirror local + deltaLink + entries do items map.
 * Mantem refresh token.
 *
 * @return array<string,mixed>
 */
function ondrv_reset_local_for_mount(string $rootReal, array $mount): array
{
    $stats = ['filesRemoved' => 0, 'foldersRemoved' => 0, 'residuals' => []];
    $localAbs = ondrv_mount_local_abs($rootReal, $mount);

    // Conta o que la esta antes, para diagnose.
    $beforeChildren = [];
    if (is_dir($localAbs)) {
        $h = @opendir($localAbs);
        if ($h) {
            while (($e = readdir($h)) !== false) {
                if ($e === '.' || $e === '..') continue;
                $beforeChildren[] = $e;
            }
            closedir($h);
        }
    }
    ondrv_log($rootReal, 'reset_start[' . $mount['id'] . '] children_before=' . json_encode($beforeChildren, JSON_UNESCAPED_UNICODE));

    if (is_dir($localAbs)) {
        // Apaga recursivamente cada child de forma robusta (preserva $localAbs).
        $h = @opendir($localAbs);
        if ($h) {
            while (($entry = readdir($h)) !== false) {
                if ($entry === '.' || $entry === '..') continue;
                $abs = $localAbs . DIRECTORY_SEPARATOR . $entry;
                if (is_link($abs)) {
                    if (@unlink($abs)) $stats['filesRemoved']++;
                    continue;
                }
                if (is_dir($abs)) {
                    // Conta pastas/ficheiros antes de apagar (aprox.).
                    $counts = ondrv_count_tree($abs);
                    ondrv_rmdir_recursive($abs);
                    if (!is_dir($abs)) {
                        $stats['foldersRemoved'] += 1 + $counts['dirs'];
                        $stats['filesRemoved']  += $counts['files'];
                    } else {
                        // Segunda passagem tolerante: chmod 0777 recursivo e tenta de novo.
                        ondrv_chmod_tree($abs, 0777, 0777);
                        ondrv_rmdir_recursive($abs);
                    }
                    continue;
                }
                if (is_file($abs)) {
                    if (!@unlink($abs)) { @chmod($abs, 0666); @unlink($abs); }
                    if (!is_file($abs)) $stats['filesRemoved']++;
                }
            }
            closedir($h);
        }

        // Residuais (o que sobrou apos a limpeza).
        $h2 = @opendir($localAbs);
        if ($h2) {
            while (($e = readdir($h2)) !== false) {
                if ($e === '.' || $e === '..') continue;
                $abs = $localAbs . DIRECTORY_SEPARATOR . $e;
                $stats['residuals'][] = [
                    'name' => $e,
                    'kind' => is_dir($abs) ? 'dir' : (is_file($abs) ? 'file' : 'other'),
                    'perm' => is_readable($abs) ? substr(sprintf('%o', @fileperms($abs) ?: 0), -4) : 'n/a',
                ];
            }
            closedir($h2);
        }
    }
    if (!empty($stats['residuals'])) {
        ondrv_log($rootReal, 'reset_residuals[' . $mount['id'] . '] ' . json_encode($stats['residuals'], JSON_UNESCAPED_UNICODE));
    }

    // Limpa items map so do mount em causa.
    $map = ondrv_load_items_map($rootReal);
    $changed = false;
    foreach ($map as $id => $entry) {
        if (is_array($entry) && ($entry['mountId'] ?? '') === $mount['id']) {
            unset($map[$id]);
            $changed = true;
        }
    }
    if ($changed) ondrv_save_items_map($rootReal, $map);

    // Limpa tombstones cujo absPath caia dentro do mount (evita bloquear push
    // subsequente apos um reset voluntario).
    $tombs = ondrv_load_tombstones($rootReal);
    if (!empty($tombs)) {
        $prefix = rtrim($localAbs, DIRECTORY_SEPARATOR) . DIRECTORY_SEPARATOR;
        $changedT = false;
        foreach ($tombs as $abs => $ts) {
            if ($abs === $localAbs || strpos($abs, $prefix) === 0) {
                unset($tombs[$abs]);
                $changedT = true;
            }
        }
        if ($changedT) ondrv_save_tombstones($rootReal, $tombs);
    }

    $tokens = ondrv_load_tokens($rootReal) ?: [];
    $slot = &ondrv_mount_slot($tokens, $mount['id']);
    unset($slot['deltaLink'], $slot['lastSyncStats'], $slot['lastSyncStatus'], $slot['lastSyncAt']);
    ondrv_save_tokens($rootReal, $tokens);
    ondrv_log($rootReal, 'reset_local[' . $mount['id'] . '] ' . json_encode($stats));
    return ['ok' => true, 'stats' => $stats];
}

// ── Sync dispatch ─────────────────────────────────────────────────────────────

/**
 * Executa o sync apropriado a um mount consoante a sua direcao.
 *
 * @param array{budgetSeconds?:int} $opts budgetSeconds: tempo maximo por fase (pull e push em separado).
 * @return array<string,mixed>
 */
function ondrv_sync_mount(string $rootReal, array $cfg, array $mount, array $opts = []): array
{
    $budget = (int)($opts['budgetSeconds'] ?? 0);
    if ($budget <= 0) {
        $budget = ONDRV_SYNC_TIME_BUDGET;
    }
    $direction = (string)($mount['direction'] ?? 'pull');
    if ($direction === 'pull') {
        $pull = ondrv_sync_delta_for_mount($rootReal, $cfg, $mount, $budget);
        if (!empty($pull['ok'])) {
            ondrv_save_sync_progress($rootReal, $mount['id'], [
                'phase'       => 'pull',
                'done'        => !empty($pull['done']),
                'stats'       => $pull['stats'] ?? [],
            ]);
        }
        return $pull;
    }
    if ($direction === 'push') {
        $push = ondrv_push_full_for_mount($rootReal, $cfg, $mount, $budget);
        if (!empty($push['ok'])) {
            ondrv_save_sync_progress($rootReal, $mount['id'], [
                'phase' => 'push',
                'done'  => !empty($push['done']),
                'stats' => $push['stats'] ?? [],
            ]);
        }
        return $push;
    }
    if ($direction === 'bidirectional') {
        $pull = ondrv_sync_delta_for_mount($rootReal, $cfg, $mount, $budget);
        $push = ondrv_push_full_for_mount($rootReal, $cfg, $mount, $budget);
        $combined = [
            'foldersCreated'     => (int)($pull['stats']['foldersCreated']  ?? 0) + (int)($push['stats']['foldersCreated']  ?? 0),
            'filesDownloaded'    => (int)($pull['stats']['filesDownloaded'] ?? 0),
            'filesUploaded'      => (int)($push['stats']['filesUploaded']   ?? 0),
            'deleted'            => (int)($pull['stats']['deleted']         ?? 0),
            'skipped'            => (int)($pull['stats']['skipped']         ?? 0) + (int)($push['stats']['skipped']         ?? 0),
            'conflictsKeptLocal' => (int)($pull['stats']['conflictsKeptLocal'] ?? 0),
            'errors'             => (int)($pull['stats']['errors']          ?? 0) + (int)($push['stats']['errors']          ?? 0),
            'pages'              => (int)($pull['stats']['pages']           ?? 0),
            'missingLocalFiles'  => (int)($pull['stats']['missingLocalFiles'] ?? 0),
            'deltaPending'       => !empty($pull['stats']['deltaPending']),
            'refetchPending'     => (int)($pull['stats']['refetchPending'] ?? 0),
        ];
        $tokens = ondrv_load_tokens($rootReal) ?: [];
        $slot = &ondrv_mount_slot($tokens, $mount['id']);
        $slot['lastSyncStats']  = $combined;
        $slot['lastSyncStatus'] = (!empty($pull['ok']) && !empty($push['ok'])) ? 'ok' : 'partial';
        $slot['lastSyncAt']     = time();
        ondrv_save_tokens($rootReal, $tokens);
        ondrv_log($rootReal, 'bidi_ok[' . $mount['id'] . '] ' . json_encode($combined));
        $pullDone = !empty($pull['done']);
        $pushDone = !empty($push['done']);
        $allDone = $pullDone && $pushDone;
        ondrv_save_sync_progress($rootReal, $mount['id'], [
            'phase' => 'bidirectional',
            'done'  => $allDone,
            'stats' => $combined,
        ]);
        return [
            'ok'    => !empty($pull['ok']) && !empty($push['ok']),
            'stats' => $combined,
            'pull'  => $pull,
            'push'  => $push,
            'done'  => $allDone,
        ];
    }
    return ['ok' => false, 'error' => 'unknown_direction', 'done' => false];
}

/**
 * Repete sync ate `done` ou esgotar tempo (cron / servidor sem limite de 5 min do browser).
 *
 * @return array<string,mixed>
 */
function ondrv_sync_mount_run_until_done(string $rootReal, array $cfg, array $mount, int $maxWallSeconds = 900): array
{
    $deadline = time() + max(60, $maxWallSeconds);
    $iterations = 0;
    $cumulative = [
        'foldersCreated'    => 0,
        'filesDownloaded'   => 0,
        'filesUploaded'     => 0,
        'deleted'           => 0,
        'skipped'           => 0,
        'errors'            => 0,
        'missingLocalFiles' => 0,
    ];
    $last = null;
    while (time() < $deadline && $iterations < 500) {
        $iterations++;
        $last = ondrv_sync_mount($rootReal, $cfg, $mount);
        $s = is_array($last) ? ($last['stats'] ?? []) : [];
        foreach (['foldersCreated', 'filesDownloaded', 'filesUploaded', 'deleted', 'skipped', 'errors'] as $k) {
            $cumulative[$k] += (int)($s[$k] ?? 0);
        }
        $cumulative['missingLocalFiles'] = (int)($s['missingLocalFiles'] ?? $cumulative['missingLocalFiles']);
        if (empty($last['ok'])) {
            break;
        }
        if (!empty($last['done'])) {
            break;
        }
    }
    return [
        'ok'         => is_array($last) && !empty($last['ok']),
        'done'       => is_array($last) && !empty($last['done']),
        'iterations' => $iterations,
        'cumulative' => $cumulative,
        'last'       => $last,
    ];
}

// ── Status ────────────────────────────────────────────────────────────────────

/**
 * Status global + por mount.
 * @return array<string,mixed>
 */
function ondrv_status_summary_multi(string $rootReal, array $cfg): array
{
    $tokens = ondrv_load_tokens($rootReal);
    $connected = is_array($tokens) && !empty($tokens['refreshToken']);
    $mounts = ondrv_get_mounts($cfg);
    $out = [];
    foreach ($mounts as $m) {
        $slot = is_array($tokens['mounts'][$m['id']] ?? null) ? $tokens['mounts'][$m['id']] : [];
        $out[$m['id']] = [
            'id'               => $m['id'],
            'localFolder'      => $m['localFolder'],
            'remotePath'       => $m['remotePath'],
            'direction'        => $m['direction'],
            'driveId'          => (string)($slot['driveId'] ?? ''),
            'rootItemId'       => (string)($slot['rootItemId'] ?? ''),
            'rootOneDrivePath' => (string)($slot['rootOneDrivePath'] ?? $m['remotePath']),
            'lastSyncAt'       => (int)($slot['lastSyncAt'] ?? 0),
            'lastSyncStatus'   => (string)($slot['lastSyncStatus'] ?? ''),
            'lastSyncStats'    => $slot['lastSyncStats'] ?? null,
            'hasDeltaLink'     => !empty($slot['deltaLink']),
            'rootResolved'     => !empty($slot['driveId']) && !empty($slot['rootItemId']),
        ];
    }
    return [
        'configured'        => $cfg !== null,
        'connected'         => $connected,
        'userPrincipalName' => $connected ? (string)($tokens['userPrincipalName'] ?? '') : '',
        'displayName'       => $connected ? (string)($tokens['displayName'] ?? '') : '',
        'connectedAt'       => $connected ? (int)($tokens['connectedAt'] ?? 0) : 0,
        'mounts'            => $out,
    ];
}

// ── Wrappers legacy (compatibilidade com onedrive-callback.php e codigo antigo) ──

/** Devolve raiz da pasta Comercial (compat). */
function ondrv_comercial_root_abs(string $rootReal): string
{
    return $rootReal . DIRECTORY_SEPARATOR . ONDRV_COMERCIAL_ROOT;
}

/** Compat: resolve o mount Comercial. */
function ondrv_resolve_root(string $rootReal, array $cfg, string $accessToken, bool $force = false): ?array
{
    $mount = ondrv_get_mount($cfg, 'comercial');
    if ($mount === null) return null;
    return ondrv_resolve_mount_root($rootReal, $cfg, $accessToken, $mount, $force);
}

/** Compat: sync delta Comercial. */
function ondrv_sync_delta(string $rootReal, array $cfg): array
{
    $mount = ondrv_get_mount($cfg, 'comercial');
    if ($mount === null) return ['ok' => false, 'error' => 'no_comercial_mount'];
    return ondrv_sync_delta_for_mount($rootReal, $cfg, $mount);
}

/** Compat: criar pasta no mount Comercial. */
function ondrv_create_folder(string $rootReal, array $cfg, string $relPathInsideRoot): array
{
    $mount = ondrv_get_mount($cfg, 'comercial');
    if ($mount === null) throw new RuntimeException('no_comercial_mount');
    return ondrv_create_folder_for_mount($rootReal, $cfg, $mount, $relPathInsideRoot);
}

/** Compat: upload para o mount Comercial. */
function ondrv_upload_file(string $rootReal, array $cfg, string $relPathInsideRoot, string $localFilePath, string $contentType = ''): array
{
    $mount = ondrv_get_mount($cfg, 'comercial');
    if ($mount === null) throw new RuntimeException('no_comercial_mount');
    return ondrv_upload_file_for_mount($rootReal, $cfg, $mount, $relPathInsideRoot, $localFilePath, $contentType);
}

/** Compat: reset local do mount Comercial. */
function ondrv_reset_local(string $rootReal): array
{
    // Primeiro tenta identificar o mount Comercial pela config persistida. Fallback: pasta "Comercial".
    $mount = ['id' => 'comercial', 'localFolder' => ONDRV_COMERCIAL_ROOT];
    return ondrv_reset_local_for_mount($rootReal, $mount);
}

/** Compat: resumo antigo, apenas mount Comercial. */
function ondrv_status_summary(string $rootReal, array $cfg): array
{
    $multi = ondrv_status_summary_multi($rootReal, $cfg);
    $c = $multi['mounts']['comercial'] ?? null;
    return [
        'configured'        => $multi['configured'],
        'connected'         => $multi['connected'],
        'userPrincipalName' => $multi['userPrincipalName'],
        'displayName'       => $multi['displayName'],
        'rootOneDrivePath'  => $c['rootOneDrivePath'] ?? ($cfg['rootPath'] ?? ''),
        'driveId'           => $c['driveId'] ?? '',
        'rootItemId'        => $c['rootItemId'] ?? '',
        'connectedAt'       => $multi['connectedAt'],
        'lastSyncAt'        => $c['lastSyncAt'] ?? 0,
        'lastSyncStatus'    => $c['lastSyncStatus'] ?? '',
        'lastSyncStats'     => $c['lastSyncStats'] ?? null,
        'hasDeltaLink'      => $c['hasDeltaLink'] ?? false,
    ];
}

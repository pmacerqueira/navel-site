<?php
declare(strict_types=1);

header('X-Content-Type-Options: nosniff');

const N_DOC_VERSION = '2.0';
const N_DOC_MARKER = '.navel-folder';
const N_DOC_PERMISSIONS_FILE = '.navel-permissions.json';
const N_DOC_AUDIT_LOG_FILE = '.navel-audit.log';
const N_DOC_MACHINE_LINKS_FILE = '.navel-machine-links.json';
const N_DOC_TAXONOMY_CACHE_FILE = '.navel-taxonomy-cache.json';
const N_DOC_INDEX_FILE = '.navel-index.json';
const N_DOC_DOCUMENT_TYPES = ['MANUAL_UTILIZADOR', 'MANUAL_TECNICO', 'PLANO_MANUTENCAO', 'OUTROS'];
const N_DOC_ONEDRIVE_ROOT = 'Comercial';

require_once __DIR__ . DIRECTORY_SEPARATOR . 'onedrive-lib.php';

$configFile = __DIR__ . DIRECTORY_SEPARATOR . 'documentos-api-config.php';
if (!is_file($configFile)) {
    n_doc_json(503, [
        'ok' => false,
        'error' => 'missing_config',
        'hint' => 'Create documentos-api-config.php from sample.',
    ]);
}

/** @var array{supabase_url?:string,supabase_anon_key?:string,jwt_secret?:string,admin_email?:string,documentos_root?:string} $cfg */
$cfg = require $configFile;

$supabaseUrl = trim((string)($cfg['supabase_url'] ?? ''));
$supabaseAnonKey = trim((string)($cfg['supabase_anon_key'] ?? ''));
$jwtSecret = trim((string)($cfg['jwt_secret'] ?? ''));
$taxonomyNodesUrl = trim((string)($cfg['taxonomy_nodes_url'] ?? ''));
// Token partilhado com AT_Manut (servidor-cpanel/api/config.php: ATM_TAXONOMY_TOKEN).
// Se nao estiver em config, usa o valor por omissao alinhado com o AT_Manut.
$taxonomyAuthToken = trim((string)($cfg['taxonomy_auth_token'] ?? 'a8f3c19d-4b25-47e6-9f8a-3c2e1d0b7a95'));
$adminEmail = strtolower(trim((string)($cfg['admin_email'] ?? 'comercial@navel.pt')));
$root = isset($cfg['documentos_root']) && $cfg['documentos_root'] !== ''
    ? rtrim(str_replace(['/', '\\'], DIRECTORY_SEPARATOR, (string)$cfg['documentos_root']), DIRECTORY_SEPARATOR)
    : __DIR__ . DIRECTORY_SEPARATOR . 'documentos-store';

if (($supabaseUrl === '' || $supabaseAnonKey === '') && $jwtSecret === '') {
    n_doc_json(503, [
        'ok' => false,
        'error' => 'invalid_config',
        'hint' => 'Configure supabase_url and supabase_anon_key',
    ]);
}

$rootReal = realpath($root);
if ($rootReal === false) {
    if (!@mkdir($root, 0755, true)) {
        n_doc_json(500, ['ok' => false, 'error' => 'cannot_create_root']);
    }
    $rootReal = realpath($root);
}
if ($rootReal === false) {
    n_doc_json(500, ['ok' => false, 'error' => 'bad_documentos_root']);
}

$bearer = n_doc_bearer_token();
if ($bearer === null || $bearer === '') {
    n_doc_json(401, ['ok' => false, 'error' => 'missing_authorization']);
}

$email = '';
if ($supabaseUrl !== '' && $supabaseAnonKey !== '') {
    $email = n_doc_email_from_supabase_user($supabaseUrl, $supabaseAnonKey, $bearer);
}

if ($email === '' && $jwtSecret !== '') {
    $claims = n_doc_jwt_verify_hs256($bearer, $jwtSecret);
    if (is_array($claims)) {
        $email = strtolower(trim((string)($claims['email'] ?? '')));
        if ($email === '' && isset($claims['user_metadata']) && is_array($claims['user_metadata'])) {
            $email = strtolower(trim((string)($claims['user_metadata']['email'] ?? '')));
        }
    }
}

if ($email === '') {
    n_doc_json(401, ['ok' => false, 'error' => 'invalid_token']);
}

$isAdmin = ($email === $adminEmail);
$permissions = n_doc_load_permissions($rootReal);
$onedriveCfg = ondrv_config($cfg);
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

try {
    if ($method === 'GET') {
        $action = (string)($_GET['action'] ?? '');
        $rel = n_doc_normalize_rel((string)($_GET['path'] ?? ''));

        if ($action === 'list') {
            n_doc_require_folder_permission($permissions, 'list', $rel, $email, $isAdmin);
            n_doc_action_list($rootReal, $rel, $permissions, $email, $isAdmin);
        }

        if ($action === 'download') {
            n_doc_require_folder_permission($permissions, 'download', dirname($rel), $email, $isAdmin);
            n_doc_action_download($rootReal, $rel);
        }

        if ($action === 'search') {
            n_doc_action_search($rootReal, $permissions, $email, $isAdmin);
        }

        if ($action === 'taxonomy_nodes') {
            n_doc_action_taxonomy_nodes($rootReal, $taxonomyNodesUrl, $taxonomyAuthToken);
        }

        if ($action === 'sync_taxonomy_tree') {
            n_doc_require_folder_permission($permissions, 'upload', 'Assistencia Tecnica', $email, $isAdmin);
            n_doc_action_sync_taxonomy_tree($rootReal, $taxonomyNodesUrl, $taxonomyAuthToken, $email);
        }

        if ($action === 'machine_links') {
            n_doc_action_machine_links_get($rootReal, $rel);
        }

        if ($action === 'reindex') {
            if (!$isAdmin) {
                n_doc_json(403, ['ok' => false, 'error' => 'forbidden']);
            }
            n_doc_action_reindex($rootReal, $permissions, $email, $isAdmin);
        }

        if ($action === 'onedrive_status') {
            n_doc_action_onedrive_status($rootReal, $onedriveCfg, $isAdmin);
        }

        if ($action === 'onedrive_sync_preview') {
            $mountId = trim((string)($_GET['mountId'] ?? 'at'));
            n_doc_action_onedrive_sync_preview($rootReal, $onedriveCfg, $isAdmin, $mountId);
        }

        if ($action === 'onedrive_debug_mount') {
            $mountId = trim((string)($_GET['mountId'] ?? 'at'));
            $relPath = (string)($_GET['relPath'] ?? '');
            n_doc_action_onedrive_debug_mount($rootReal, $onedriveCfg, $email, $isAdmin, $mountId, $relPath);
        }

        n_doc_json(400, ['ok' => false, 'error' => 'unknown_action']);
    }

    if ($method === 'POST') {
        $contentType = $_SERVER['CONTENT_TYPE'] ?? $_SERVER['HTTP_CONTENT_TYPE'] ?? '';
        if (stripos($contentType, 'multipart/form-data') !== false) {
            n_doc_action_upload($rootReal, $permissions, $email, $isAdmin, $onedriveCfg);
        }

        $raw = file_get_contents('php://input');
        $body = json_decode($raw ?: '', true);
        if (!is_array($body)) {
            n_doc_json(400, ['ok' => false, 'error' => 'invalid_json']);
        }

        $action = (string)($body['action'] ?? '');
        $rel = n_doc_normalize_rel((string)($body['path'] ?? ''));

        if ($action === 'ensure_marker') {
            n_doc_require_folder_permission($permissions, 'upload', dirname($rel), $email, $isAdmin);
            n_doc_action_ensure_marker($rootReal, $rel);
            $newFolderRel = dirname($rel);
            n_doc_onedrive_mirror_create_folder($rootReal, $onedriveCfg, $newFolderRel, $email);
            n_doc_audit_append($rootReal, $email, 'ensure_marker', $rel);
        }

        if ($action === 'delete') {
            $mountHit = n_doc_onedrive_mount_for_rel($rel, $onedriveCfg);
            if ($mountHit !== null && ($mountHit['mount']['direction'] ?? '') === 'pull') {
                n_doc_json(403, ['ok' => false, 'error' => 'deletion_disabled_onedrive', 'message' => 'A pasta ' . $mountHit['mount']['localFolder'] . ' esta sincronizada a partir do OneDrive (fonte de verdade). Elimine o ficheiro no OneDrive e a area reservada actualiza-se automaticamente.']);
            }
            if (!$isAdmin && !n_doc_is_allowed($permissions, 'delete', dirname($rel), $email, $isAdmin)) {
                n_doc_json(403, ['ok' => false, 'error' => 'forbidden']);
            }
            n_doc_action_delete_file($rootReal, $rel);
            n_doc_onedrive_mirror_delete($rootReal, $onedriveCfg, $rel, $email, $mountHit);
            n_doc_audit_append($rootReal, $email, 'delete', $rel);
        }

        if ($action === 'delete_tree') {
            $mountHit = n_doc_onedrive_mount_for_rel($rel, $onedriveCfg);
            if ($mountHit !== null && ($mountHit['mount']['direction'] ?? '') === 'pull') {
                n_doc_json(403, ['ok' => false, 'error' => 'deletion_disabled_onedrive', 'message' => 'A pasta ' . $mountHit['mount']['localFolder'] . ' esta sincronizada a partir do OneDrive (fonte de verdade). Elimine a pasta no OneDrive.']);
            }
            if (!$isAdmin && !n_doc_is_allowed($permissions, 'delete', $rel, $email, $isAdmin)) {
                n_doc_json(403, ['ok' => false, 'error' => 'forbidden']);
            }
            n_doc_action_delete_tree($rootReal, $rel);
            n_doc_onedrive_mirror_delete($rootReal, $onedriveCfg, $rel, $email, $mountHit);
            n_doc_audit_append($rootReal, $email, 'delete_tree', $rel);
        }

        if ($action === 'onedrive_connect_url') {
            n_doc_action_onedrive_connect_url($rootReal, $onedriveCfg, $email, $isAdmin);
        }

        if ($action === 'onedrive_sync_tick') {
            $mountId = trim((string)($body['mountId'] ?? ''));
            $chunkBudget = (int)($body['chunkBudgetSeconds'] ?? 0);
            n_doc_action_onedrive_sync_tick($rootReal, $onedriveCfg, $email, $isAdmin, $mountId, $chunkBudget);
        }

        if ($action === 'onedrive_trigger_sync') {
            $mountId = trim((string)($body['mountId'] ?? ''));
            n_doc_action_onedrive_trigger_sync($rootReal, $onedriveCfg, $email, $isAdmin, $mountId);
        }

        if ($action === 'onedrive_reset_local') {
            $mountId = trim((string)($body['mountId'] ?? 'comercial'));
            n_doc_action_onedrive_reset_local($rootReal, $onedriveCfg, $email, $isAdmin, $mountId);
        }

        if ($action === 'onedrive_push_full') {
            $mountId = trim((string)($body['mountId'] ?? 'at'));
            n_doc_action_onedrive_push_full($rootReal, $onedriveCfg, $email, $isAdmin, $mountId);
        }

        if ($action === 'onedrive_purge_orphans') {
            $mountId = trim((string)($body['mountId'] ?? 'at'));
            $dryRun = !empty($body['dryRun']);
            n_doc_action_onedrive_purge_orphans($rootReal, $onedriveCfg, $email, $isAdmin, $mountId, $dryRun);
        }

        if ($action === 'onedrive_force_reconcile') {
            $mountId = trim((string)($body['mountId'] ?? 'at'));
            $dryRun = !empty($body['dryRun']);
            $relPath = (string)($body['relPath'] ?? '');
            n_doc_action_onedrive_force_reconcile($rootReal, $onedriveCfg, $email, $isAdmin, $mountId, $dryRun, $relPath);
        }

        if ($action === 'set_metadata') {
            $meta = n_doc_normalize_metadata($body['metadata'] ?? []);
            n_doc_require_folder_permission($permissions, 'upload', dirname($rel), $email, $isAdmin);
            n_doc_action_set_metadata($rootReal, $rel, $meta, $email);
            n_doc_audit_append($rootReal, $email, 'set_metadata', $rel);
        }

        if ($action === 'machine_links') {
            n_doc_require_folder_permission($permissions, 'upload', dirname($rel), $email, $isAdmin);
            n_doc_action_machine_links_set($rootReal, $rel, $body, $email);
            n_doc_audit_append($rootReal, $email, 'machine_links', $rel);
        }

        n_doc_json(400, ['ok' => false, 'error' => 'unknown_action']);
    }

    n_doc_json(405, ['ok' => false, 'error' => 'method_not_allowed']);
} catch (InvalidArgumentException $e) {
    n_doc_json(400, ['ok' => false, 'error' => 'bad_path', 'message' => $e->getMessage()]);
} catch (Throwable $e) {
    n_doc_json(500, ['ok' => false, 'error' => 'server_error', 'message' => $e->getMessage()]);
}

function n_doc_json(int $code, array $data): void
{
    http_response_code($code);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

function n_doc_bearer_token(): ?string
{
    $h = $_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '';
    if (preg_match('/Bearer\s+(\S+)/i', $h, $m)) {
        return $m[1];
    }
    return null;
}

function n_doc_email_from_supabase_user(string $supabaseUrl, string $anonKey, string $bearer): string
{
    if (!function_exists('curl_init')) {
        return '';
    }

    $url = rtrim($supabaseUrl, '/') . '/auth/v1/user';
    $ch = curl_init($url);
    if ($ch === false) {
        return '';
    }

    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 12,
        CURLOPT_CONNECTTIMEOUT => 6,
        CURLOPT_HTTPHEADER => [
            'Authorization: Bearer ' . $bearer,
            'apikey: ' . $anonKey,
            'Accept: application/json',
        ],
    ]);

    $resp = curl_exec($ch);
    $status = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if (!is_string($resp) || $resp === '' || $status < 200 || $status >= 300) {
        return '';
    }

    $json = json_decode($resp, true);
    if (!is_array($json)) {
        return '';
    }

    $email = strtolower(trim((string)($json['email'] ?? '')));
    if ($email !== '') {
        return $email;
    }

    if (isset($json['user_metadata']) && is_array($json['user_metadata'])) {
        return strtolower(trim((string)($json['user_metadata']['email'] ?? '')));
    }

    return '';
}

/** @return array<string,mixed>|null */
function n_doc_jwt_verify_hs256(string $jwt, string $secret): ?array
{
    $parts = explode('.', $jwt);
    if (count($parts) !== 3) {
        return null;
    }

    [$h64, $p64, $sig64] = $parts;
    $mac = hash_hmac('sha256', $h64 . '.' . $p64, $secret, true);
    $expected = rtrim(strtr(base64_encode($mac), '+/', '-_'), '=');
    $sig64Norm = rtrim(strtr($sig64, '+/', '-_'), '=');
    if (!hash_equals($expected, $sig64Norm)) {
        return null;
    }

    $padded = str_pad(strtr($p64, '-_', '+/'), (int)(4 * ceil(strlen($p64) / 4)), '=', STR_PAD_RIGHT);
    $payload = json_decode((string)base64_decode($padded, true), true);
    if (!is_array($payload)) {
        return null;
    }

    if (isset($payload['exp']) && (int)$payload['exp'] < time()) {
        return null;
    }

    return $payload;
}

function n_doc_normalize_rel(string $path): string
{
    $path = trim(str_replace('\\', '/', $path), '/');
    if ($path === '') {
        return '';
    }

    if (str_contains($path, '..')) {
        throw new InvalidArgumentException('path');
    }

    foreach (explode('/', $path) as $seg) {
        if ($seg === '' || $seg === '.' || $seg === '..') {
            throw new InvalidArgumentException('path');
        }
        if (isset($seg[0]) && $seg[0] === '.' && $seg !== N_DOC_MARKER) {
            throw new InvalidArgumentException('path');
        }
    }

    return $path;
}

function n_doc_join_root(string $rootReal, string $relNorm): string
{
    if ($relNorm === '') {
        return $rootReal;
    }
    return $rootReal . DIRECTORY_SEPARATOR . str_replace('/', DIRECTORY_SEPARATOR, $relNorm);
}

function n_doc_assert_under_root(string $rootReal, string $abs): void
{
    $rp = realpath($abs);
    if ($rp === false) {
        throw new InvalidArgumentException('not_found');
    }

    $rootNorm = rtrim(str_replace('\\', '/', $rootReal), '/');
    $targetNorm = rtrim(str_replace('\\', '/', $rp), '/');
    if ($targetNorm !== $rootNorm && strpos($targetNorm, $rootNorm . '/') !== 0) {
        throw new InvalidArgumentException('outside_root');
    }
}

/** @return array<string,mixed> */
function n_doc_load_permissions(string $rootReal): array
{
    $default = ['folders' => []];
    $file = $rootReal . DIRECTORY_SEPARATOR . N_DOC_PERMISSIONS_FILE;
    if (!is_file($file)) {
        return $default;
    }

    $raw = @file_get_contents($file);
    if (!is_string($raw) || $raw === '') {
        return $default;
    }

    $parsed = json_decode($raw, true);
    if (!is_array($parsed) || !isset($parsed['folders']) || !is_array($parsed['folders'])) {
        return $default;
    }

    return ['folders' => $parsed['folders']];
}

/** @return array<string,mixed>|null */
function n_doc_resolve_folder_rule(array $permissions, string $relPath): ?array
{
    $folders = $permissions['folders'] ?? [];
    if (!is_array($folders)) {
        return null;
    }

    $relPath = n_doc_normalize_rel($relPath);
    $segments = $relPath === '' ? [] : explode('/', $relPath);
    for ($i = count($segments); $i >= 0; $i--) {
        $candidate = implode('/', array_slice($segments, 0, $i));
        if (isset($folders[$candidate]) && is_array($folders[$candidate])) {
            return $folders[$candidate];
        }
    }

    return null;
}

function n_doc_value_in_list(array $values, string $email): bool
{
    foreach ($values as $entry) {
        $value = strtolower(trim((string)$entry));
        if ($value === '*' || $value === $email) {
            return true;
        }
    }
    return false;
}

function n_doc_is_allowed(array $permissions, string $action, string $relPath, string $email, bool $isAdmin): bool
{
    if ($isAdmin) {
        return true;
    }

    $rule = n_doc_resolve_folder_rule($permissions, $relPath);
    if ($rule === null) {
        if ($action === 'delete') {
            return false;
        }
        return true;
    }

    $allowed = $rule[$action] ?? null;
    if (!is_array($allowed)) {
        if ($action === 'delete') {
            return false;
        }
        return true;
    }

    return n_doc_value_in_list($allowed, $email);
}

function n_doc_require_folder_permission(array $permissions, string $action, string $relPath, string $email, bool $isAdmin): void
{
    if (!n_doc_is_allowed($permissions, $action, $relPath, $email, $isAdmin)) {
        n_doc_json(403, ['ok' => false, 'error' => 'forbidden']);
    }
}

/** @return array<string,mixed> */
function n_doc_normalize_metadata(mixed $input): array
{
    if (!is_array($input)) {
        return [
            'department' => '',
            'documentType' => '',
            'brand' => '',
            'category' => '',
            'equipment' => '',
            'taxonomyNodeId' => '',
            'versionLabel' => '',
            'validUntil' => '',
            'notes' => '',
        ];
    }

    $keys = ['department', 'documentType', 'brand', 'category', 'equipment', 'taxonomyNodeId', 'versionLabel', 'validUntil', 'notes'];
    $out = [];
    foreach ($keys as $key) {
        $out[$key] = trim((string)($input[$key] ?? ''));
    }
    if ($out['documentType'] !== '' && !in_array($out['documentType'], N_DOC_DOCUMENT_TYPES, true)) {
        $out['documentType'] = '';
    }
    return $out;
}

function n_doc_meta_path_for_file(string $fileAbs): string
{
    return dirname($fileAbs) . DIRECTORY_SEPARATOR . '.' . basename($fileAbs) . '.meta.json';
}

/** @return array<string,mixed> */
function n_doc_load_file_metadata(string $fileAbs): array
{
    $metaPath = n_doc_meta_path_for_file($fileAbs);
    $blank = n_doc_normalize_metadata([]);
    if (!is_file($metaPath)) {
        return [
            'metadata' => $blank,
            'versions' => [],
            'currentVersion' => 1,
            'createdAt' => gmdate('c'),
            'updatedAt' => gmdate('c'),
            'updatedBy' => '',
        ];
    }

    $raw = @file_get_contents($metaPath);
    if (!is_string($raw) || $raw === '') {
        return [
            'metadata' => $blank,
            'versions' => [],
            'currentVersion' => 1,
            'createdAt' => gmdate('c'),
            'updatedAt' => gmdate('c'),
            'updatedBy' => '',
        ];
    }

    $json = json_decode($raw, true);
    if (!is_array($json)) {
        return [
            'metadata' => $blank,
            'versions' => [],
            'currentVersion' => 1,
            'createdAt' => gmdate('c'),
            'updatedAt' => gmdate('c'),
            'updatedBy' => '',
        ];
    }

    return [
        'metadata' => n_doc_normalize_metadata($json['metadata'] ?? []),
        'versions' => is_array($json['versions'] ?? null) ? $json['versions'] : [],
        'currentVersion' => max(1, (int)($json['currentVersion'] ?? 1)),
        'createdAt' => (string)($json['createdAt'] ?? gmdate('c')),
        'updatedAt' => (string)($json['updatedAt'] ?? gmdate('c')),
        'updatedBy' => (string)($json['updatedBy'] ?? ''),
    ];
}

function n_doc_save_file_metadata(string $fileAbs, array $metadataState): void
{
    $metaPath = n_doc_meta_path_for_file($fileAbs);
    $encoded = json_encode($metadataState, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
    if (!is_string($encoded) || @file_put_contents($metaPath, $encoded) === false) {
        throw new RuntimeException('cannot_save_metadata');
    }
    @chmod($metaPath, 0644);
}

function n_doc_archive_existing_version(string $rootReal, string $fileAbs, array $metadataState, string $email): array
{
    if (!is_file($fileAbs)) {
        return $metadataState;
    }

    $relNorm = str_replace('\\', '/', ltrim(str_replace($rootReal, '', $fileAbs), DIRECTORY_SEPARATOR));
    $stamp = gmdate('Ymd_His');
    $versionsRoot = $rootReal . DIRECTORY_SEPARATOR . '.navel-versions';
    $versionDir = $versionsRoot . DIRECTORY_SEPARATOR . str_replace('/', DIRECTORY_SEPARATOR, dirname($relNorm));
    $versionDir = rtrim($versionDir, DIRECTORY_SEPARATOR) . DIRECTORY_SEPARATOR . basename($fileAbs);
    if (!is_dir($versionDir) && !@mkdir($versionDir, 0755, true)) {
        throw new RuntimeException('cannot_prepare_version_dir');
    }

    $currentVersion = max(1, (int)($metadataState['currentVersion'] ?? 1));
    $archiveName = sprintf('v%03d_%s_%s', $currentVersion, $stamp, basename($fileAbs));
    $archivePath = $versionDir . DIRECTORY_SEPARATOR . $archiveName;
    if (!@rename($fileAbs, $archivePath)) {
        throw new RuntimeException('cannot_archive_previous_version');
    }

    $versions = is_array($metadataState['versions'] ?? null) ? $metadataState['versions'] : [];
    $versions[] = [
        'version' => $currentVersion,
        'archivedAt' => gmdate('c'),
        'archivedBy' => $email,
        'path' => str_replace('\\', '/', ltrim(str_replace($rootReal, '', $archivePath), DIRECTORY_SEPARATOR)),
    ];
    $metadataState['versions'] = $versions;
    $metadataState['currentVersion'] = $currentVersion + 1;
    return $metadataState;
}

function n_doc_audit_append(string $rootReal, string $email, string $action, string $path): void
{
    $logPath = $rootReal . DIRECTORY_SEPARATOR . N_DOC_AUDIT_LOG_FILE;
    $entry = [
        'timestamp' => gmdate('c'),
        'userEmail' => $email,
        'action' => $action,
        'path' => $path,
    ];
    $line = json_encode($entry, JSON_UNESCAPED_UNICODE);
    if (!is_string($line)) {
        return;
    }
    @file_put_contents($logPath, $line . PHP_EOL, FILE_APPEND | LOCK_EX);
    @chmod($logPath, 0644);
}

function n_doc_action_list(string $rootReal, string $rel, array $permissions, string $email, bool $isAdmin): void
{
    $abs = n_doc_join_root($rootReal, $rel);
    if (!is_dir($abs)) {
        n_doc_json(404, ['ok' => false, 'error' => 'not_found']);
    }
    n_doc_assert_under_root($rootReal, $abs);

    $items = [];
    $dh = opendir($abs);
    if ($dh === false) {
        n_doc_json(500, ['ok' => false, 'error' => 'cannot_read_dir']);
    }

    while (($name = readdir($dh)) !== false) {
        if ($name === '.' || $name === '..') {
            continue;
        }
        if ($name[0] === '.' && $name !== N_DOC_MARKER) {
            continue;
        }

        $full = $abs . DIRECTORY_SEPARATOR . $name;
        $isFile = is_file($full);
        $isDir = is_dir($full);
        if (!$isFile && !$isDir) {
            continue;
        }

        if (!$isFile && !n_doc_is_allowed($permissions, 'list', ($rel !== '' ? $rel . '/' : '') . $name, $email, $isAdmin)) {
            continue;
        }
        if ($isFile && !n_doc_is_allowed($permissions, 'download', $rel, $email, $isAdmin)) {
            continue;
        }

        $meta = $isFile ? n_doc_load_file_metadata($full) : null;
        $items[] = [
            'name' => $name,
            'isFile' => $isFile,
            'size' => $isFile ? (int)@filesize($full) : 0,
            'metadata' => $isFile ? ($meta['metadata'] ?? n_doc_normalize_metadata([])) : null,
            'currentVersion' => $isFile ? (int)($meta['currentVersion'] ?? 1) : null,
            'updatedAt' => $isFile ? (string)($meta['updatedAt'] ?? '') : null,
        ];
    }

    closedir($dh);
    n_doc_json(200, ['ok' => true, 'version' => N_DOC_VERSION, 'items' => $items]);
}

function n_doc_action_download(string $rootReal, string $rel): void
{
    if ($rel === '') {
        n_doc_json(400, ['ok' => false, 'error' => 'path_required']);
    }

    $abs = n_doc_join_root($rootReal, $rel);
    if (!is_file($abs)) {
        n_doc_json(404, ['ok' => false, 'error' => 'not_found']);
    }
    n_doc_assert_under_root($rootReal, $abs);

    $mime = 'application/octet-stream';
    if (class_exists('finfo', false)) {
        $fi = new finfo(FILEINFO_MIME_TYPE);
        $det = @$fi->file($abs);
        if (is_string($det) && $det !== '') {
            $mime = $det;
        }
    }

    $basename = basename($abs);
    header('Content-Type: ' . $mime);
    header('Content-Disposition: attachment; filename="' . rawurlencode($basename) . '"; filename*=UTF-8\'\'' . rawurlencode($basename));
    header('Content-Length: ' . (string)filesize($abs));
    readfile($abs);
    exit;
}

function n_doc_action_upload(string $rootReal, array $permissions, string $email, bool $isAdmin, ?array $onedriveCfg = null): void
{
    if ((string)($_POST['action'] ?? '') !== 'upload') {
        n_doc_json(400, ['ok' => false, 'error' => 'bad_action']);
    }

    $relDir = n_doc_normalize_rel((string)($_POST['path'] ?? ''));
    if (!isset($_FILES['file']) || !is_array($_FILES['file'])) {
        n_doc_json(400, ['ok' => false, 'error' => 'missing_file']);
    }

    $err = (int)($_FILES['file']['error'] ?? UPLOAD_ERR_NO_FILE);
    if ($err !== UPLOAD_ERR_OK) {
        n_doc_json(400, ['ok' => false, 'error' => 'upload_error', 'code' => $err]);
    }

    $tmp = (string)($_FILES['file']['tmp_name'] ?? '');
    $name = basename(str_replace('\\', '/', trim((string)($_FILES['file']['name'] ?? ''))));
    if ($name === '' || $name === '.' || $name === '..' || str_contains($name, '..')) {
        n_doc_json(400, ['ok' => false, 'error' => 'invalid_name']);
    }

    $dirAbs = n_doc_join_root($rootReal, $relDir);
    if (!is_dir($dirAbs)) {
        n_doc_json(404, ['ok' => false, 'error' => 'folder_not_found']);
    }
    n_doc_assert_under_root($rootReal, $dirAbs);
    n_doc_require_folder_permission($permissions, 'upload', $relDir, $email, $isAdmin);

    $safeName = strlen($name) > 240 ? substr($name, 0, 240) : $name;
    $dest = $dirAbs . DIRECTORY_SEPARATOR . $safeName;
    $incomingMeta = n_doc_normalize_metadata([
        'department' => $_POST['department'] ?? '',
        'documentType' => $_POST['documentType'] ?? '',
        'brand' => $_POST['brand'] ?? '',
        'category' => $_POST['category'] ?? '',
        'equipment' => $_POST['equipment'] ?? '',
        'taxonomyNodeId' => $_POST['taxonomyNodeId'] ?? '',
        'versionLabel' => $_POST['versionLabel'] ?? '',
        'validUntil' => $_POST['validUntil'] ?? '',
        'notes' => $_POST['notes'] ?? '',
    ]);
    $metaState = n_doc_load_file_metadata($dest);

    if (is_file($dest) || is_dir($dest)) {
        if (!$isAdmin) {
            n_doc_json(409, ['ok' => false, 'error' => 'already_exists']);
        }
        if (is_dir($dest)) {
            n_doc_json(409, ['ok' => false, 'error' => 'name_is_folder']);
        }
        $metaState = n_doc_archive_existing_version($rootReal, $dest, $metaState, $email);
    }

    if (!@move_uploaded_file($tmp, $dest)) {
        n_doc_json(500, ['ok' => false, 'error' => 'cannot_save']);
    }

    $metaState['metadata'] = $incomingMeta;
    $metaState['updatedAt'] = gmdate('c');
    $metaState['updatedBy'] = $email;
    if (!isset($metaState['createdAt']) || (string)$metaState['createdAt'] === '') {
        $metaState['createdAt'] = gmdate('c');
    }
    n_doc_save_file_metadata($dest, $metaState);
    n_doc_audit_append($rootReal, $email, 'upload', ($relDir !== '' ? $relDir . '/' : '') . basename($dest));
    $relPath = ($relDir !== '' ? $relDir . '/' : '') . basename($dest);
    $machineLinks = n_doc_load_machine_links($rootReal);
    n_doc_index_upsert_document($rootReal, $relPath, $metaState, $machineLinks, $email);
    @chmod($dest, 0644);

    $onedriveMirror = null;
    $mountHit = n_doc_onedrive_mount_for_rel($relPath, $onedriveCfg);
    if ($mountHit !== null && $onedriveCfg !== null) {
        $mount = $mountHit['mount'];
        $relInsideMount = $mountHit['rel'];
        if ($relInsideMount !== '') {
            try {
                $ctype = '';
                if (function_exists('finfo_open')) {
                    $fi = @finfo_open(FILEINFO_MIME_TYPE);
                    if ($fi !== false) {
                        $ctype = (string)@finfo_file($fi, $dest);
                        @finfo_close($fi);
                    }
                }
                $uploaded = ondrv_upload_file_for_mount($rootReal, $onedriveCfg, $mount, $relInsideMount, $dest, $ctype);
                ondrv_remember_upload($rootReal, $mount, $relInsideMount, $dest, $uploaded);
                $onedriveMirror = ['ok' => true, 'mountId' => $mount['id'], 'id' => (string)($uploaded['id'] ?? '')];
                ondrv_log($rootReal, 'upload_mirrored[' . $mount['id'] . ']: ' . $relInsideMount . ' by=' . $email . ' size=' . (int)filesize($dest));
            } catch (Throwable $e) {
                $onedriveMirror = ['ok' => false, 'mountId' => $mount['id'], 'error' => $e->getMessage()];
                ondrv_log($rootReal, 'upload_mirror_failed[' . $mount['id'] . ']: ' . $relInsideMount . ' err=' . $e->getMessage());
            }
        }
    }

    n_doc_json(200, [
        'ok' => true,
        'path' => $relPath,
        'currentVersion' => (int)($metaState['currentVersion'] ?? 1),
        'metadata' => $metaState['metadata'],
        'onedriveMirror' => $onedriveMirror,
    ]);
}

function n_doc_action_ensure_marker(string $rootReal, string $rel): void
{
    if ($rel === '') {
        n_doc_json(400, ['ok' => false, 'error' => 'path_required']);
    }

    $abs = n_doc_join_root($rootReal, $rel);
    $parent = dirname($abs);
    if (!is_dir($parent) && !@mkdir($parent, 0755, true)) {
        n_doc_json(500, ['ok' => false, 'error' => 'mkdir_parent_failed']);
    }

    $parentReal = realpath($parent);
    if ($parentReal === false) {
        n_doc_json(500, ['ok' => false, 'error' => 'bad_parent']);
    }

    $rootNorm = rtrim(str_replace('\\', '/', $rootReal), '/');
    $parentNorm = rtrim(str_replace('\\', '/', $parentReal), '/');
    if ($parentNorm !== $rootNorm && strpos($parentNorm, $rootNorm . '/') !== 0) {
        n_doc_json(403, ['ok' => false, 'error' => 'outside_root']);
    }

    if (is_file($abs)) {
        n_doc_json(200, ['ok' => true, 'existed' => true]);
    }
    if (is_dir($abs)) {
        n_doc_json(409, ['ok' => false, 'error' => 'path_is_dir']);
    }

    if (@file_put_contents($abs, ' ') === false) {
        n_doc_json(500, ['ok' => false, 'error' => 'write_failed']);
    }

    @chmod($abs, 0644);
    n_doc_json(200, ['ok' => true]);
}

function n_doc_action_delete_file(string $rootReal, string $rel): void
{
    if ($rel === '') {
        n_doc_json(400, ['ok' => false, 'error' => 'path_required']);
    }

    $abs = n_doc_join_root($rootReal, $rel);
    if (!is_file($abs)) {
        n_doc_json(404, ['ok' => false, 'error' => 'not_found']);
    }

    n_doc_assert_under_root($rootReal, $abs);
    if (!@unlink($abs)) {
        n_doc_json(500, ['ok' => false, 'error' => 'unlink_failed']);
    }
    $metaPath = n_doc_meta_path_for_file($abs);
    if (is_file($metaPath)) {
        @unlink($metaPath);
    }
    n_doc_index_delete_document($rootReal, $rel);

    n_doc_json(200, ['ok' => true]);
}

function n_doc_action_delete_tree(string $rootReal, string $rel): void
{
    if ($rel === '') {
        n_doc_json(400, ['ok' => false, 'error' => 'path_required']);
    }

    $abs = n_doc_join_root($rootReal, $rel);
    if (!is_dir($abs)) {
        n_doc_json(404, ['ok' => false, 'error' => 'not_found']);
    }

    n_doc_assert_under_root($rootReal, $abs);
    $rpAbs = realpath($abs);
    $rpRoot = realpath($rootReal);
    if ($rpAbs !== false && $rpRoot !== false && $rpAbs === $rpRoot) {
        n_doc_json(403, ['ok' => false, 'error' => 'cannot_delete_root']);
    }

    n_doc_delete_directory_recursive($abs);
    n_doc_index_delete_by_prefix($rootReal, $rel);
    n_doc_json(200, ['ok' => true]);
}

function n_doc_delete_directory_recursive(string $dir): void
{
    if (!is_dir($dir)) {
        return;
    }

    $items = scandir($dir);
    if ($items === false) {
        return;
    }

    foreach ($items as $item) {
        if ($item === '.' || $item === '..') {
            continue;
        }

        $path = $dir . DIRECTORY_SEPARATOR . $item;
        if (is_dir($path)) {
            n_doc_delete_directory_recursive($path);
        } else {
            @unlink($path);
        }
    }

    @rmdir($dir);
}

function n_doc_action_set_metadata(string $rootReal, string $rel, array $metadata, string $email): void
{
    if ($rel === '') {
        n_doc_json(400, ['ok' => false, 'error' => 'path_required']);
    }

    $abs = n_doc_join_root($rootReal, $rel);
    if (!is_file($abs)) {
        n_doc_json(404, ['ok' => false, 'error' => 'not_found']);
    }
    n_doc_assert_under_root($rootReal, $abs);

    $state = n_doc_load_file_metadata($abs);
    $state['metadata'] = $metadata;
    $state['updatedAt'] = gmdate('c');
    $state['updatedBy'] = $email;
    n_doc_save_file_metadata($abs, $state);
    $machineLinks = n_doc_load_machine_links($rootReal);
    n_doc_index_upsert_document($rootReal, $rel, $state, $machineLinks, $email);

    n_doc_json(200, [
        'ok' => true,
        'path' => $rel,
        'currentVersion' => (int)($state['currentVersion'] ?? 1),
        'metadata' => $state['metadata'],
    ]);
}

function n_doc_action_search(string $rootReal, array $permissions, string $email, bool $isAdmin): void
{
    $q = strtolower(trim((string)($_GET['q'] ?? '')));
    $filters = n_doc_normalize_metadata([
        'department' => $_GET['department'] ?? '',
        'documentType' => $_GET['documentType'] ?? '',
        'brand' => $_GET['brand'] ?? '',
        'category' => $_GET['category'] ?? '',
        'equipment' => $_GET['equipment'] ?? '',
        'taxonomyNodeId' => $_GET['taxonomyNodeId'] ?? '',
        'versionLabel' => $_GET['versionLabel'] ?? '',
        'validUntil' => $_GET['validUntil'] ?? '',
        'notes' => $_GET['notes'] ?? '',
    ]);
    $machineId = trim((string)($_GET['machineId'] ?? ''));
    $results = [];
    $index = n_doc_load_index($rootReal);
    $documents = is_array($index['documents'] ?? null) ? $index['documents'] : [];
    foreach ($documents as $rel => $row) {
        $relPath = (string)$rel;
        $folderRel = dirname($relPath);
        if ($folderRel === '.') {
            $folderRel = '';
        }
        if (!n_doc_is_allowed($permissions, 'download', $folderRel, $email, $isAdmin)) {
            continue;
        }
        $name = (string)($row['fileName'] ?? basename($relPath));
        $meta = n_doc_normalize_metadata($row['metadata'] ?? []);
        if ($q !== '' && !str_contains(strtolower($name), $q)) {
            continue;
        }
        $filterOk = true;
        foreach ($filters as $k => $v) {
            if ($v === '') {
                continue;
            }
            if (!str_contains(strtolower((string)($meta[$k] ?? '')), strtolower($v))) {
                $filterOk = false;
                break;
            }
        }
        if (!$filterOk) {
            continue;
        }
        $rowMachineLinks = is_array($row['machineLinks'] ?? null)
            ? $row['machineLinks']
            : ['machineIds' => [], 'source' => '', 'confidence' => null, 'updatedAt' => '', 'updatedBy' => ''];
        if ($machineId !== '') {
            $linkedMachines = $rowMachineLinks['machineIds'] ?? [];
            if (!is_array($linkedMachines) || !in_array($machineId, array_map('strval', $linkedMachines), true)) {
                continue;
            }
        }
        $results[] = [
            'path' => $relPath,
            'name' => $name,
            'size' => (int)($row['fileSize'] ?? 0),
            'currentVersion' => (int)($row['currentVersion'] ?? 1),
            'updatedAt' => (string)($row['updatedAt'] ?? ''),
            'metadata' => $meta,
            'machineLinks' => $rowMachineLinks,
        ];
    }

    n_doc_json(200, ['ok' => true, 'version' => N_DOC_VERSION, 'documentTypes' => N_DOC_DOCUMENT_TYPES, 'items' => $results]);
}

function n_doc_action_reindex(string $rootReal, array $permissions, string $email, bool $isAdmin): void
{
    $machineLinks = n_doc_load_machine_links($rootReal);
    $count = 0;
    $it = new RecursiveIteratorIterator(
        new RecursiveDirectoryIterator($rootReal, FilesystemIterator::SKIP_DOTS)
    );
    foreach ($it as $fi) {
        if (!$fi instanceof SplFileInfo || !$fi->isFile()) {
            continue;
        }
        $name = $fi->getFilename();
        if ($name === N_DOC_MARKER || str_starts_with($name, '.') || str_ends_with($name, '.meta.json')) {
            continue;
        }
        $abs = $fi->getPathname();
        $rel = str_replace('\\', '/', ltrim(str_replace($rootReal, '', $abs), DIRECTORY_SEPARATOR));
        $folderRel = dirname($rel);
        if ($folderRel === '.') {
            $folderRel = '';
        }
        if (!n_doc_is_allowed($permissions, 'download', $folderRel, $email, $isAdmin)) {
            continue;
        }
        $state = n_doc_load_file_metadata($abs);
        n_doc_index_upsert_document($rootReal, $rel, $state, $machineLinks, $email);
        $count++;
    }
    n_doc_json(200, ['ok' => true, 'indexed' => $count]);
}

/** @return array<string,mixed> */
function n_doc_load_machine_links(string $rootReal): array
{
    $path = $rootReal . DIRECTORY_SEPARATOR . N_DOC_MACHINE_LINKS_FILE;
    if (!is_file($path)) {
        return [];
    }
    $raw = @file_get_contents($path);
    if (!is_string($raw) || $raw === '') {
        return [];
    }
    $json = json_decode($raw, true);
    return is_array($json) ? $json : [];
}

function n_doc_save_machine_links(string $rootReal, array $links): void
{
    $path = $rootReal . DIRECTORY_SEPARATOR . N_DOC_MACHINE_LINKS_FILE;
    $encoded = json_encode($links, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
    if (!is_string($encoded) || @file_put_contents($path, $encoded, LOCK_EX) === false) {
        throw new RuntimeException('cannot_save_machine_links');
    }
    @chmod($path, 0644);
}

/** @return array<string,mixed> */
function n_doc_load_index(string $rootReal): array
{
    $path = $rootReal . DIRECTORY_SEPARATOR . N_DOC_INDEX_FILE;
    if (!is_file($path)) {
        return ['documents' => []];
    }
    $raw = @file_get_contents($path);
    if (!is_string($raw) || $raw === '') {
        return ['documents' => []];
    }
    $json = json_decode($raw, true);
    if (!is_array($json)) {
        return ['documents' => []];
    }
    $documents = is_array($json['documents'] ?? null) ? $json['documents'] : [];
    return ['documents' => $documents];
}

function n_doc_save_index(string $rootReal, array $index): void
{
    $path = $rootReal . DIRECTORY_SEPARATOR . N_DOC_INDEX_FILE;
    $encoded = json_encode($index, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
    if (!is_string($encoded) || @file_put_contents($path, $encoded, LOCK_EX) === false) {
        throw new RuntimeException('cannot_save_index');
    }
    @chmod($path, 0644);
}

function n_doc_sha256_file(string $absPath): string
{
    if (!is_file($absPath)) {
        return '';
    }
    $hash = @hash_file('sha256', $absPath);
    return is_string($hash) ? $hash : '';
}

function n_doc_ensure_document_id(array &$documentsByPath, string $relPath): string
{
    $existing = $documentsByPath[$relPath]['documentId'] ?? '';
    $existing = trim((string)$existing);
    if ($existing !== '') {
        return $existing;
    }
    try {
        $id = bin2hex(random_bytes(16));
    } catch (Throwable $e) {
        $id = sha1($relPath . '|' . microtime(true));
    }
    return $id;
}

function n_doc_index_upsert_document(
    string $rootReal,
    string $relPath,
    array $metadataState,
    array $machineLinks,
    string $email
): void {
    $index = n_doc_load_index($rootReal);
    $documents = is_array($index['documents'] ?? null) ? $index['documents'] : [];
    $docId = n_doc_ensure_document_id($documents, $relPath);
    $abs = n_doc_join_root($rootReal, $relPath);
    $fileName = basename($relPath);
    $mime = 'application/octet-stream';
    if (class_exists('finfo', false) && is_file($abs)) {
        $fi = new finfo(FILEINFO_MIME_TYPE);
        $det = @$fi->file($abs);
        if (is_string($det) && $det !== '') {
            $mime = $det;
        }
    }
    $meta = n_doc_normalize_metadata($metadataState['metadata'] ?? []);
    $documents[$relPath] = [
        'documentId' => $docId,
        'path' => $relPath,
        'fileName' => $fileName,
        'fileSize' => is_file($abs) ? (int)@filesize($abs) : 0,
        'mimeType' => $mime,
        'metadata' => $meta,
        'currentVersion' => (int)($metadataState['currentVersion'] ?? 1),
        'versions' => is_array($metadataState['versions'] ?? null) ? $metadataState['versions'] : [],
        'checksumSha256' => n_doc_sha256_file($abs),
        'machineLinks' => $machineLinks[$relPath] ?? ['machineIds' => [], 'source' => '', 'confidence' => null, 'updatedAt' => '', 'updatedBy' => ''],
        'updatedAt' => (string)($metadataState['updatedAt'] ?? gmdate('c')),
        'updatedBy' => (string)($metadataState['updatedBy'] ?? $email),
    ];
    $index['documents'] = $documents;
    n_doc_save_index($rootReal, $index);
}

function n_doc_index_delete_document(string $rootReal, string $relPath): void
{
    $index = n_doc_load_index($rootReal);
    $documents = is_array($index['documents'] ?? null) ? $index['documents'] : [];
    if (isset($documents[$relPath])) {
        unset($documents[$relPath]);
        $index['documents'] = $documents;
        n_doc_save_index($rootReal, $index);
    }
}

function n_doc_index_delete_by_prefix(string $rootReal, string $prefix): void
{
    $index = n_doc_load_index($rootReal);
    $documents = is_array($index['documents'] ?? null) ? $index['documents'] : [];
    $changed = false;
    $prefixNorm = trim($prefix, '/');
    $prefixSlash = $prefixNorm !== '' ? $prefixNorm . '/' : '';
    foreach (array_keys($documents) as $path) {
        $pathStr = (string)$path;
        if ($prefixNorm === '' || $pathStr === $prefixNorm || str_starts_with($pathStr, $prefixSlash)) {
            unset($documents[$pathStr]);
            $changed = true;
        }
    }
    if ($changed) {
        $index['documents'] = $documents;
        n_doc_save_index($rootReal, $index);
    }
}

function n_doc_action_machine_links_get(string $rootReal, string $rel): void
{
    if ($rel === '') {
        n_doc_json(400, ['ok' => false, 'error' => 'path_required']);
    }
    $links = n_doc_load_machine_links($rootReal);
    $row = $links[$rel] ?? ['machineIds' => [], 'source' => '', 'confidence' => null, 'updatedAt' => '', 'updatedBy' => ''];
    n_doc_json(200, ['ok' => true, 'path' => $rel, 'machineLinks' => $row]);
}

function n_doc_action_machine_links_set(string $rootReal, string $rel, array $body, string $email): void
{
    if ($rel === '') {
        n_doc_json(400, ['ok' => false, 'error' => 'path_required']);
    }
    $machineIdsInput = $body['machineIds'] ?? [];
    if (!is_array($machineIdsInput)) {
        n_doc_json(400, ['ok' => false, 'error' => 'invalid_machine_ids']);
    }
    $machineIds = [];
    foreach ($machineIdsInput as $id) {
        $idNorm = trim((string)$id);
        if ($idNorm !== '') {
            $machineIds[] = $idNorm;
        }
    }
    $machineIds = array_values(array_unique($machineIds));
    $source = strtoupper(trim((string)($body['source'] ?? 'MANUAL')));
    if ($source !== 'MANUAL' && $source !== 'AUTO') {
        $source = 'MANUAL';
    }
    $confidenceRaw = $body['confidence'] ?? null;
    $confidence = null;
    if ($confidenceRaw !== null && $confidenceRaw !== '') {
        $confidence = max(0.0, min(1.0, (float)$confidenceRaw));
    }

    $links = n_doc_load_machine_links($rootReal);
    $links[$rel] = [
        'machineIds' => $machineIds,
        'source' => $source,
        'confidence' => $confidence,
        'updatedAt' => gmdate('c'),
        'updatedBy' => $email,
    ];
    n_doc_save_machine_links($rootReal, $links);
    $abs = n_doc_join_root($rootReal, $rel);
    if (is_file($abs)) {
        $state = n_doc_load_file_metadata($abs);
        n_doc_index_upsert_document($rootReal, $rel, $state, $links, $email);
    }
    n_doc_json(200, ['ok' => true, 'path' => $rel, 'machineLinks' => $links[$rel]]);
}

/** @return array<int,array<string,mixed>> */
function n_doc_load_taxonomy_nodes(string $rootReal, string $taxonomyNodesUrl, string $taxonomyAuthToken): array
{
    $candidateUrls = [];
    if ($taxonomyNodesUrl !== '') {
        $candidateUrls[] = $taxonomyNodesUrl;
    } else {
        $host = trim((string)($_SERVER['HTTP_HOST'] ?? ''));
        if ($host !== '') {
            // Endpoint oficial AT_Manut (reaproveita config.php + db.php).
            $candidateUrls[] = 'https://' . $host . '/api/taxonomy-nodes.php';
            // Fallbacks legacy.
            $candidateUrls[] = 'https://' . $host . '/manut/api/taxonomy/nodes';
            $candidateUrls[] = 'https://' . $host . '/api/taxonomy/nodes';
        }
    }

    if (!empty($candidateUrls) && function_exists('curl_init')) {
        foreach ($candidateUrls as $candidateUrl) {
            $ch = curl_init($candidateUrl);
            if ($ch === false) {
                continue;
            }
            $headers = ['Accept: application/json'];
            if ($taxonomyAuthToken !== '') {
                $headers[] = 'Authorization: Bearer ' . $taxonomyAuthToken;
            }
            curl_setopt_array($ch, [
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_TIMEOUT => 12,
                CURLOPT_CONNECTTIMEOUT => 6,
                CURLOPT_HTTPHEADER => $headers,
            ]);
            $resp = curl_exec($ch);
            $status = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
            curl_close($ch);
            if (!is_string($resp) || $resp === '' || $status < 200 || $status >= 300) {
                continue;
            }
            $json = json_decode($resp, true);
            $items = is_array($json['items'] ?? null) ? $json['items'] : (is_array($json) ? $json : []);
            if (is_array($items)) {
                $items = n_doc_normalize_taxonomy_nodes($items);
                $cachePath = $rootReal . DIRECTORY_SEPARATOR . N_DOC_TAXONOMY_CACHE_FILE;
                @file_put_contents($cachePath, json_encode($items, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE), LOCK_EX);
                return $items;
            }
        }
    }

    $cachePath = $rootReal . DIRECTORY_SEPARATOR . N_DOC_TAXONOMY_CACHE_FILE;
    if (!is_file($cachePath)) {
        return [];
    }
    $raw = @file_get_contents($cachePath);
    if (!is_string($raw) || $raw === '') {
        return [];
    }
    $json = json_decode($raw, true);
    return is_array($json) ? n_doc_normalize_taxonomy_nodes($json) : [];
}

function n_doc_action_taxonomy_nodes(string $rootReal, string $taxonomyNodesUrl, string $taxonomyAuthToken): void
{
    $items = n_doc_load_taxonomy_nodes($rootReal, $taxonomyNodesUrl, $taxonomyAuthToken);
    n_doc_json(200, ['ok' => true, 'items' => $items]);
}

function n_doc_action_sync_taxonomy_tree(string $rootReal, string $taxonomyNodesUrl, string $taxonomyAuthToken, string $email): void
{
    // Se houver um mount OneDrive activo sobre "Assistencia Tecnica" (direction
    // push ou bidirectional), o OneDrive passa a ser a fonte unica de verdade.
    // Nao criamos pastas a partir do AT_Manut para evitar duplicados quando o
    // utilizador corrige os nomes (acentos/variacoes) no seu OneDrive.
    global $onedriveCfg;
    if (is_array($onedriveCfg) && function_exists('ondrv_get_mounts')) {
        $mounts = ondrv_get_mounts($onedriveCfg);
        foreach ($mounts as $m) {
            $root = trim(str_replace('\\', '/', (string)($m['localFolder'] ?? '')), '/');
            if (strcasecmp($root, 'Assistencia Tecnica') === 0) {
                $dir = (string)($m['direction'] ?? '');
                if ($dir === 'push' || $dir === 'bidirectional') {
                    n_doc_json(200, [
                        'ok' => true,
                        'skipped' => true,
                        'reason' => 'onedrive_mount_active',
                        'direction' => $dir,
                    ]);
                    return;
                }
            }
        }
    }

    $items = n_doc_load_taxonomy_nodes($rootReal, $taxonomyNodesUrl, $taxonomyAuthToken);
    $baseRoot = 'Assistencia Tecnica';
    $baseAbs = n_doc_join_root($rootReal, $baseRoot);
    if (!is_dir($baseAbs) && !@mkdir($baseAbs, 0755, true)) {
        n_doc_json(500, ['ok' => false, 'error' => 'cannot_create_assistencia_root']);
    }

    $created = 0;
    $seen = [];
    foreach ($items as $node) {
        if (!is_array($node)) continue;
        $path = trim(str_replace('\\', '/', (string)($node['path'] ?? '')));
        if ($path === '') {
            $slug = trim((string)($node['slug'] ?? ''));
            $parentPath = trim(str_replace('\\', '/', (string)($node['parentPath'] ?? '')));
            $path = trim($parentPath . '/' . $slug, '/');
        }
        if ($path === '') continue;
        $safePath = n_doc_safe_rel_path($path);
        if ($safePath === '') continue;
        if (isset($seen[$safePath])) continue;
        $seen[$safePath] = true;

        $targetRel = $baseRoot . '/' . $safePath;
        $targetAbs = n_doc_join_root($rootReal, $targetRel);
        if (!is_dir($targetAbs)) {
            if (@mkdir($targetAbs, 0755, true)) {
                $created++;
            }
        }
        $marker = $targetAbs . DIRECTORY_SEPARATOR . N_DOC_MARKER;
        if (!is_file($marker)) {
            @file_put_contents($marker, ' ');
            @chmod($marker, 0644);
        }
    }

    n_doc_audit_append($rootReal, $email, 'sync_taxonomy_tree', $baseRoot);
    n_doc_json(200, ['ok' => true, 'created' => $created, 'nodes' => count($items)]);
}

/**
 * Normaliza texto UTF-8 (NFC) e unifica traços tipográficos.
 * Evita pastas duplicadas (NFD vs NFC) e divergências vs OneDrive/Windows.
 */
function n_doc_normalize_taxonomy_text(string $s): string
{
    if ($s === '') {
        return '';
    }
    if (class_exists(\Normalizer::class)) {
        $n = \Normalizer::normalize($s, \Normalizer::FORM_C);
        if (is_string($n) && $n !== '') {
            $s = $n;
        }
    } elseif (function_exists('normalizer_normalize')) {
        $n = normalizer_normalize($s, 16); // Normalizer::FORM_C
        if (is_string($n) && $n !== '') {
            $s = $n;
        }
    }
    static $dashMap = [
        "\u{2013}" => '-',
        "\u{2014}" => '-',
        "\u{2212}" => '-',
    ];

    return strtr($s, $dashMap);
}

function n_doc_safe_rel_path(string $path): string
{
    $segments = explode('/', trim($path, '/'));
    $out = [];
    foreach ($segments as $segment) {
        $s = n_doc_normalize_taxonomy_text(trim($segment));
        if ($s === '' || $s === '.' || $s === '..') continue;
        $s = str_replace(['\\', '/'], '-', $s);
        $s = preg_replace('/[<>:"|?*\x00-\x1f]/u', '-', $s);
        $s = preg_replace('/\s+/', ' ', $s);
        if (!is_string($s)) continue;
        $s = trim($s);
        if ($s === '' || str_starts_with($s, '.')) continue;
        $out[] = $s;
    }
    return implode('/', $out);
}

/** @return array<int,array<string,mixed>> */
function n_doc_normalize_taxonomy_nodes(array $items): array
{
    $out = [];
    foreach ($items as $node) {
        if (!is_array($node)) {
            continue;
        }
        $path = n_doc_normalize_taxonomy_text(str_replace('\\', '/', (string)($node['path'] ?? '')));
        $path = trim($path, '/');
        $id = n_doc_normalize_taxonomy_text(trim((string)($node['id'] ?? '')));
        $code = n_doc_normalize_taxonomy_text(trim((string)($node['code'] ?? '')));
        $name = n_doc_normalize_taxonomy_text(trim((string)($node['name'] ?? $code)));
        $parentId = n_doc_normalize_taxonomy_text(trim((string)($node['parentId'] ?? '')));
        $slug = trim((string)($node['slug'] ?? ''));
        $parentPath = n_doc_normalize_taxonomy_text(str_replace('\\', '/', (string)($node['parentPath'] ?? '')));
        $parentPath = trim($parentPath, '/');

        if ($path === '') {
            if ($slug === '') {
                $slug = $code !== '' ? $code : ($id !== '' ? $id : $name);
            }
            $slug = n_doc_normalize_taxonomy_text($slug);
            $path = trim($parentPath . '/' . $slug, '/');
        } else {
            $idx = strrpos($path, '/');
            $parentPath = ($idx !== false) ? substr($path, 0, $idx) : '';
            $leaf = ($idx !== false) ? substr($path, $idx + 1) : $path;
            $leaf = n_doc_normalize_taxonomy_text($leaf);
            if ($leaf !== '') {
                $slug = $leaf;
            } elseif ($slug === '') {
                $slug = n_doc_normalize_taxonomy_text($code !== '' ? $code : ($id !== '' ? $id : $name));
            } else {
                $slug = n_doc_normalize_taxonomy_text($slug);
            }
        }

        $out[] = [
            'id' => $id,
            'code' => $code,
            'name' => $name,
            'slug' => $slug,
            'path' => $path,
            'parentId' => $parentId,
            'parentPath' => $parentPath,
            'updatedAt' => (string)($node['updatedAt'] ?? ''),
        ];
    }
    return $out;
}

// ── OneDrive multi-mount (Comercial = pull, AT = push) ────────────────────────

/**
 * Detecta em qual mount OneDrive cai o caminho relativo $rel.
 * Retorna ['mount' => [...], 'rel' => relInsideMount] ou null.
 *
 * @return array{mount:array,rel:string}|null
 */
function n_doc_onedrive_mount_for_rel(string $rel, ?array $onedriveCfg): ?array
{
    if ($onedriveCfg === null) return null;
    $mounts = ondrv_get_mounts($onedriveCfg);
    if (empty($mounts)) return null;
    return ondrv_find_mount_for_rel($rel, $mounts);
}

/**
 * Propaga uma criacao de pasta (mkdir) para OneDrive se o caminho cair dentro
 * de um mount. Funciona para pull e push (em ambos espelhamos). Silencioso em caso
 * de falha (so escreve no log).
 */
function n_doc_onedrive_mirror_create_folder(string $rootReal, ?array $onedriveCfg, string $folderRel, string $email): void
{
    $hit = n_doc_onedrive_mount_for_rel($folderRel, $onedriveCfg);
    if ($hit === null) return;
    if (($hit['rel'] ?? '') === '') return; // raiz do mount — nao criar
    try {
        ondrv_create_folder_for_mount($rootReal, $onedriveCfg, $hit['mount'], $hit['rel']);
        ondrv_log($rootReal, 'folder_created[' . $hit['mount']['id'] . '] ' . $hit['rel'] . ' by=' . $email);
    } catch (Throwable $e) {
        ondrv_log($rootReal, 'folder_create_failed[' . $hit['mount']['id'] . '] ' . $hit['rel'] . ' err=' . $e->getMessage());
    }
}

/**
 * Propaga um delete (ficheiro/pasta) para OneDrive quando o mount e push ou
 * bidirectional. Silencioso em caso de falha (log).
 *
 * $hit e opcional (para evitar recalcular); se null recalcula.
 */
function n_doc_onedrive_mirror_delete(string $rootReal, ?array $onedriveCfg, string $rel, string $email, ?array $hit = null): void
{
    if ($hit === null) {
        $hit = n_doc_onedrive_mount_for_rel($rel, $onedriveCfg);
    }
    if ($hit === null || $onedriveCfg === null) return;
    $direction = (string)($hit['mount']['direction'] ?? '');
    if ($direction !== 'push' && $direction !== 'bidirectional') return;
    if (($hit['rel'] ?? '') === '') return;
    try {
        ondrv_delete_item_for_mount($rootReal, $onedriveCfg, $hit['mount'], $hit['rel']);
        ondrv_log($rootReal, 'delete_propagated[' . $hit['mount']['id'] . '] ' . $hit['rel'] . ' by=' . $email);
    } catch (Throwable $e) {
        ondrv_log($rootReal, 'delete_propagate_failed[' . $hit['mount']['id'] . '] ' . $hit['rel'] . ' err=' . $e->getMessage());
    }
}

function n_doc_action_onedrive_status(string $rootReal, ?array $onedriveCfg, bool $isAdmin): void
{
    if ($onedriveCfg === null) {
        n_doc_json(200, [
            'ok' => true,
            'configured' => false,
            'connected' => false,
            'mounts' => [],
            'hint' => 'Defina microsoft_tenant_id, microsoft_client_id, microsoft_client_secret e microsoft_redirect_uri em documentos-api-config.php.',
        ]);
    }
    $summary = ondrv_status_summary_multi($rootReal, $onedriveCfg);
    $summary['ok'] = true;
    $summary['canManage'] = $isAdmin;
    n_doc_json(200, $summary);
}

function n_doc_action_onedrive_connect_url(string $rootReal, ?array $onedriveCfg, string $email, bool $isAdmin): void
{
    if (!$isAdmin) n_doc_json(403, ['ok' => false, 'error' => 'forbidden']);
    if ($onedriveCfg === null) n_doc_json(503, ['ok' => false, 'error' => 'not_configured']);
    $state = ondrv_create_state($rootReal, $email);
    $url = ondrv_authorize_url($onedriveCfg, $state);
    n_doc_json(200, ['ok' => true, 'url' => $url, 'state' => $state]);
}

function n_doc_action_onedrive_sync_preview(string $rootReal, ?array $onedriveCfg, bool $isAdmin, string $mountId): void
{
    if (!$isAdmin) n_doc_json(403, ['ok' => false, 'error' => 'forbidden']);
    if ($onedriveCfg === null) n_doc_json(503, ['ok' => false, 'error' => 'not_configured']);
    $mount = ondrv_get_mount($onedriveCfg, $mountId);
    if ($mount === null) n_doc_json(400, ['ok' => false, 'error' => 'unknown_mount']);
    $estimate = ondrv_estimate_mount_pending($rootReal, $mount);
    n_doc_json(200, [
        'ok'       => true,
        'mountId'  => $mountId,
        'estimate' => $estimate,
    ]);
}

/**
 * Um "passo" de sincronizacao (para UI com barra de progresso / polling).
 */
function n_doc_action_onedrive_sync_tick(string $rootReal, ?array $onedriveCfg, string $email, bool $isAdmin, string $mountId, int $chunkBudgetSeconds): void
{
    if (!$isAdmin) n_doc_json(403, ['ok' => false, 'error' => 'forbidden']);
    if ($onedriveCfg === null) n_doc_json(503, ['ok' => false, 'error' => 'not_configured']);
    if ($mountId === '') n_doc_json(400, ['ok' => false, 'error' => 'mount_required']);
    $mount = ondrv_get_mount($onedriveCfg, $mountId);
    if ($mount === null) n_doc_json(400, ['ok' => false, 'error' => 'unknown_mount']);

    $lockFile = $rootReal . DIRECTORY_SEPARATOR . '.navel-onedrive-sync.lock';
    $fp = @fopen($lockFile, 'c');
    if ($fp === false || !flock($fp, LOCK_EX | LOCK_NB)) {
        n_doc_json(409, ['ok' => false, 'error' => 'sync_in_progress']);
    }
    try {
        @set_time_limit(0);
        @ignore_user_abort(true);
        $budget = $chunkBudgetSeconds > 0 ? $chunkBudgetSeconds : ONDRV_SYNC_TIME_BUDGET;
        $r = ondrv_sync_mount($rootReal, $onedriveCfg, $mount, ['budgetSeconds' => $budget]);
        $estimate = ondrv_estimate_mount_pending($rootReal, $mount);
        $progress = ondrv_load_sync_progress($rootReal, $mountId) ?? [];
        n_doc_audit_append($rootReal, $email, 'onedrive_sync_tick:' . $mount['id'], (string)(!empty($r['ok']) ? 'ok' : 'error'));
        n_doc_json(200, [
            'ok'        => !empty($r['ok']),
            'done'      => !empty($r['done']),
            'result'    => $r,
            'estimate'  => $estimate,
            'progress'  => $progress,
        ]);
    } finally {
        @flock($fp, LOCK_UN);
        @fclose($fp);
    }
}

/**
 * Sync completo num unico pedido: repete ate `done` ou ~14 min (servidor).
 * Se $mountId vazio, corre todos os mounts em sequencia.
 */
function n_doc_action_onedrive_trigger_sync(string $rootReal, ?array $onedriveCfg, string $email, bool $isAdmin, string $mountId = ''): void
{
    if (!$isAdmin) n_doc_json(403, ['ok' => false, 'error' => 'forbidden']);
    if ($onedriveCfg === null) n_doc_json(503, ['ok' => false, 'error' => 'not_configured']);

    $mounts = ondrv_get_mounts($onedriveCfg);
    if ($mountId !== '') {
        $mounts = array_values(array_filter($mounts, static fn($m) => $m['id'] === $mountId));
        if (empty($mounts)) n_doc_json(400, ['ok' => false, 'error' => 'unknown_mount']);
    }

    $lockFile = $rootReal . DIRECTORY_SEPARATOR . '.navel-onedrive-sync.lock';
    $fp = @fopen($lockFile, 'c');
    if ($fp === false || !flock($fp, LOCK_EX | LOCK_NB)) {
        n_doc_json(409, ['ok' => false, 'error' => 'sync_in_progress']);
    }
    try {
        @set_time_limit(0);
        @ignore_user_abort(true);
        $results = [];
        $okAll = true;
        foreach ($mounts as $m) {
            $r = ondrv_sync_mount_run_until_done($rootReal, $onedriveCfg, $m, 840);
            $results[$m['id']] = $r;
            if (empty($r['ok'])) {
                $okAll = false;
            }
            n_doc_audit_append($rootReal, $email, 'onedrive_sync:' . $m['id'], (string)(!empty($r['ok']) ? 'ok' : 'error'));
        }
        n_doc_json(200, ['ok' => $okAll, 'results' => $results]);
    } finally {
        @flock($fp, LOCK_UN);
        @fclose($fp);
    }
}

function n_doc_action_onedrive_reset_local(string $rootReal, ?array $onedriveCfg, string $email, bool $isAdmin, string $mountId = 'comercial'): void
{
    if (!$isAdmin) n_doc_json(403, ['ok' => false, 'error' => 'forbidden']);
    if ($onedriveCfg === null) n_doc_json(503, ['ok' => false, 'error' => 'not_configured']);
    $mount = ondrv_get_mount($onedriveCfg, $mountId);
    if ($mount === null) n_doc_json(400, ['ok' => false, 'error' => 'unknown_mount']);

    $lockFile = $rootReal . DIRECTORY_SEPARATOR . '.navel-onedrive-sync.lock';
    $fp = @fopen($lockFile, 'c');
    if ($fp === false || !flock($fp, LOCK_EX | LOCK_NB)) {
        n_doc_json(409, ['ok' => false, 'error' => 'sync_in_progress']);
    }
    try {
        @set_time_limit(0);
        @ignore_user_abort(true);
        $reset = ondrv_reset_local_for_mount($rootReal, $mount);
        n_doc_audit_append($rootReal, $email, 'onedrive_reset_local:' . $mount['id'], json_encode($reset['stats'] ?? []));
        $syncRun = ondrv_sync_mount_run_until_done($rootReal, $onedriveCfg, $mount, 840);
        n_doc_audit_append($rootReal, $email, 'onedrive_sync:' . $mount['id'], (string)(!empty($syncRun['ok']) ? 'ok' : 'error'));
        n_doc_json(200, [
            'ok'             => true,
            'mountId'        => $mount['id'],
            'reset'          => $reset['stats'] ?? [],
            'sync'           => is_array($syncRun['last'] ?? null) ? $syncRun['last'] : [],
            'syncIterations' => (int)($syncRun['iterations'] ?? 0),
            'syncDone'       => !empty($syncRun['done']),
        ]);
    } finally {
        @flock($fp, LOCK_UN);
        @fclose($fp);
    }
}

/**
 * Push full (seed) de um mount push/bidirectional — sobe recursivamente todo o
 * conteudo local para OneDrive, criando pastas e reenviando ficheiros alterados.
 */
function n_doc_action_onedrive_push_full(string $rootReal, ?array $onedriveCfg, string $email, bool $isAdmin, string $mountId = 'at'): void
{
    if (!$isAdmin) n_doc_json(403, ['ok' => false, 'error' => 'forbidden']);
    if ($onedriveCfg === null) n_doc_json(503, ['ok' => false, 'error' => 'not_configured']);
    $mount = ondrv_get_mount($onedriveCfg, $mountId);
    if ($mount === null) n_doc_json(400, ['ok' => false, 'error' => 'unknown_mount']);
    if (($mount['direction'] ?? '') === 'pull') {
        n_doc_json(400, ['ok' => false, 'error' => 'mount_is_pull_only']);
    }

    $lockFile = $rootReal . DIRECTORY_SEPARATOR . '.navel-onedrive-sync.lock';
    $fp = @fopen($lockFile, 'c');
    if ($fp === false || !flock($fp, LOCK_EX | LOCK_NB)) {
        n_doc_json(409, ['ok' => false, 'error' => 'sync_in_progress']);
    }
    try {
        @set_time_limit(0);
        @ignore_user_abort(true);
        $result = ondrv_push_full_for_mount($rootReal, $onedriveCfg, $mount);
        n_doc_audit_append($rootReal, $email, 'onedrive_push_full:' . $mount['id'], (string)($result['ok'] ? 'ok' : 'error'));
        n_doc_json(200, ['ok' => !empty($result['ok']), 'mountId' => $mount['id'], 'result' => $result]);
    } finally {
        @flock($fp, LOCK_UN);
        @fclose($fp);
    }
}

/**
 * Limpa pastas/ficheiros do mount que nao tem correspondencia no items map
 * OneDrive. Protege ficheiros adicionados pelo utilizador no sharepoint
 * (ficheiros recentes com mtime < 24h nao sao removidos).
 *
 * Se $dryRun === true, apenas devolve a lista de candidatos sem apagar.
 */
function n_doc_action_onedrive_purge_orphans(string $rootReal, ?array $onedriveCfg, string $email, bool $isAdmin, string $mountId, bool $dryRun): void
{
    if (!$isAdmin) n_doc_json(403, ['ok' => false, 'error' => 'forbidden']);
    if ($onedriveCfg === null) n_doc_json(503, ['ok' => false, 'error' => 'not_configured']);
    $mount = ondrv_get_mount($onedriveCfg, $mountId);
    if ($mount === null) n_doc_json(400, ['ok' => false, 'error' => 'unknown_mount']);

    $localAbs = ondrv_mount_local_abs($rootReal, $mount);
    if (!is_dir($localAbs)) {
        n_doc_json(200, ['ok' => true, 'mountId' => $mount['id'], 'orphans' => [], 'removed' => 0, 'dryRun' => $dryRun]);
    }

    $map = ondrv_load_items_map($rootReal);
    $knownPaths = [];
    foreach ($map as $entry) {
        if (!is_array($entry)) continue;
        if (($entry['mountId'] ?? '') !== $mount['id']) continue;
        $abs = (string)($entry['absPath'] ?? '');
        if ($abs !== '') $knownPaths[$abs] = true;
    }

    $now = time();
    $recentThreshold = 24 * 3600;
    $orphans = [];
    $it = new RecursiveIteratorIterator(
        new RecursiveDirectoryIterator($localAbs, RecursiveDirectoryIterator::SKIP_DOTS),
        RecursiveIteratorIterator::CHILD_FIRST
    );
    foreach ($it as $entry) {
        $abs = $entry->getPathname();
        $base = basename($abs);
        if (str_starts_with($base, '.navel-')) continue;
        if ($base === '.DS_Store') continue;
        if (isset($knownPaths[$abs])) continue;
        $mtime = @filemtime($abs) ?: 0;
        $isRecent = $mtime > 0 && ($now - $mtime) < $recentThreshold;
        if ($entry->isFile()) {
            if ($isRecent) continue; // protege uploads recentes do utilizador
        }
        $orphans[] = [
            'relPath' => trim(str_replace(DIRECTORY_SEPARATOR, '/', substr($abs, strlen($localAbs))), '/'),
            'absPath' => $abs,
            'kind'    => $entry->isDir() ? 'folder' : 'file',
            'mtime'   => $mtime,
        ];
    }

    $removed = 0;
    if (!$dryRun) {
        foreach ($orphans as $o) {
            if ($o['kind'] === 'file') {
                if (@unlink($o['absPath'])) $removed++;
            } else {
                if (@rmdir($o['absPath'])) $removed++;
            }
        }
        n_doc_audit_append($rootReal, $email, 'onedrive_purge_orphans:' . $mount['id'], (string)$removed);
    }

    n_doc_json(200, [
        'ok' => true,
        'mountId' => $mount['id'],
        'dryRun' => $dryRun,
        'candidates' => count($orphans),
        'removed' => $removed,
        'orphans' => array_slice($orphans, 0, 500),
    ]);
}

/**
 * Diagnostico do mount: lista conteudo do 1o nivel local vs o que o Graph API
 * devolve em /drives/{id}/items/{rootId}/children, alem do contador do items
 * map para o mount. Util para perceber discrepancias (pastas orfas, acentos,
 * case-sensitivity, etc.).
 */
function n_doc_action_onedrive_debug_mount(string $rootReal, ?array $onedriveCfg, string $email, bool $isAdmin, string $mountId, string $relPath = ''): void
{
    if (!$isAdmin) n_doc_json(403, ['ok' => false, 'error' => 'forbidden']);
    if ($onedriveCfg === null) n_doc_json(503, ['ok' => false, 'error' => 'not_configured']);
    $mount = ondrv_get_mount($onedriveCfg, $mountId);
    if ($mount === null) n_doc_json(400, ['ok' => false, 'error' => 'unknown_mount']);

    $relPath = n_doc_normalize_rel($relPath);
    $mountAbs = ondrv_mount_local_abs($rootReal, $mount);
    $localAbs = $relPath === ''
        ? $mountAbs
        : $mountAbs . DIRECTORY_SEPARATOR . str_replace('/', DIRECTORY_SEPARATOR, $relPath);
    $localChildren = [];
    if (is_dir($localAbs)) {
        $h = @opendir($localAbs);
        if ($h) {
            while (($e = readdir($h)) !== false) {
                if ($e === '.' || $e === '..') continue;
                if ($e === N_DOC_MARKER) continue;
                $abs = $localAbs . DIRECTORY_SEPARATOR . $e;
                $localChildren[] = [
                    'name'  => $e,
                    'kind'  => is_dir($abs) ? 'dir' : 'file',
                    'size'  => is_file($abs) ? (int)@filesize($abs) : null,
                    'mtime' => @filemtime($abs) ?: 0,
                ];
            }
            closedir($h);
            usort($localChildren, fn($a, $b) => strcmp($a['name'], $b['name']));
        }
    }

    $graphChildren = [];
    $graphError = '';
    $rootInfo = ['driveId' => '', 'rootItemId' => '', 'rootOneDrivePath' => ''];
    $accessToken = ondrv_get_access_token($rootReal, $onedriveCfg);
    if ($accessToken !== null) {
        $root = ondrv_resolve_mount_root($rootReal, $onedriveCfg, $accessToken, $mount);
        if ($root !== null) {
            $rootInfo = $root;
            try {
                // Para subpastas, resolvemos o id do item OneDrive via itemsMap
                // (caso este sync ja o conheca) ou via GET por path absoluto.
                $targetItemId = $root['rootItemId'];
                if ($relPath !== '') {
                    $found = '';
                    $itemsMap = ondrv_load_items_map($rootReal);
                    foreach ($itemsMap as $id => $entry) {
                        if (!is_array($entry)) continue;
                        if (($entry['mountId'] ?? '') !== $mount['id']) continue;
                        if (($entry['relPath'] ?? '') === $relPath) { $found = (string)$id; break; }
                    }
                    if ($found === '') {
                        $fullPath = trim($root['rootOneDrivePath'], '/') . '/' . $relPath;
                        $meta = ondrv_graph_get($accessToken, '/me/drive/root:/' . ondrv_encode_onedrive_path($fullPath) . '?$select=id,folder');
                        $found = (string)($meta['id'] ?? '');
                    }
                    if ($found === '') throw new RuntimeException('subpath_not_found_in_graph');
                    $targetItemId = $found;
                }
                $url = '/drives/' . rawurlencode($root['driveId']) . '/items/' . rawurlencode($targetItemId) . '/children?$select=id,name,folder,file,size,lastModifiedDateTime&$top=200';
                $resp = ondrv_graph_get($accessToken, $url);
                $items = is_array($resp['value'] ?? null) ? $resp['value'] : [];
                foreach ($items as $it) {
                    if (!is_array($it)) continue;
                    $graphChildren[] = [
                        'id'    => (string)($it['id'] ?? ''),
                        'name'  => (string)($it['name'] ?? ''),
                        'kind'  => isset($it['folder']) ? 'dir' : 'file',
                        'size'  => (int)($it['size'] ?? 0),
                        'mtime' => (string)($it['lastModifiedDateTime'] ?? ''),
                    ];
                }
                usort($graphChildren, fn($a, $b) => strcmp($a['name'], $b['name']));
            } catch (Throwable $e) {
                $graphError = $e->getMessage();
            }
        } else {
            $graphError = 'root_not_resolved';
        }
    } else {
        $graphError = 'not_connected';
    }

    $itemsMap = ondrv_load_items_map($rootReal);
    $mapCount = 0;
    $mapLevel1 = [];
    $prefix = $relPath === '' ? '' : rtrim($relPath, '/') . '/';
    foreach ($itemsMap as $id => $e) {
        if (!is_array($e)) continue;
        if (($e['mountId'] ?? '') !== $mount['id']) continue;
        $mapCount++;
        $rel = (string)($e['relPath'] ?? '');
        if ($rel === '') continue;
        if ($prefix !== '' && strpos($rel, $prefix) !== 0) continue;
        $tail = $prefix === '' ? $rel : substr($rel, strlen($prefix));
        if ($tail === '' || strpos($tail, '/') !== false) continue;
        $mapLevel1[] = ['id' => $id, 'name' => $tail, 'kind' => (string)($e['kind'] ?? '')];
    }
    usort($mapLevel1, fn($a, $b) => strcmp($a['name'], $b['name']));

    // Diff: locais que NAO existem no Graph (candidatos a orfao).
    $graphNames = [];
    foreach ($graphChildren as $g) $graphNames[$g['name']] = true;
    $localOnly = [];
    foreach ($localChildren as $l) {
        if (!isset($graphNames[$l['name']])) $localOnly[] = $l['name'];
    }
    $localNames = [];
    foreach ($localChildren as $l) $localNames[$l['name']] = true;
    $graphOnly = [];
    foreach ($graphChildren as $g) {
        if (!isset($localNames[$g['name']])) $graphOnly[] = $g['name'];
    }

    n_doc_json(200, [
        'ok' => true,
        'mountId' => $mount['id'],
        'relPath' => $relPath,
        'mount' => [
            'localFolder' => $mount['localFolder'],
            'remotePath'  => $mount['remotePath'],
            'direction'   => $mount['direction'],
        ],
        'rootInfo' => $rootInfo,
        'graphError' => $graphError,
        'counts' => [
            'local' => count($localChildren),
            'graph' => count($graphChildren),
            'itemsMapForMount' => $mapCount,
        ],
        'localChildren' => $localChildren,
        'graphChildren' => $graphChildren,
        'itemsMapLevel1' => $mapLevel1,
        'localOnly' => $localOnly,
        'graphOnly' => $graphOnly,
    ]);
}

/**
 * Reconcile FORCADO: apaga localmente qualquer entry (pasta ou ficheiro) cujo
 * nome nao exista no /children da pasta correspondente no OneDrive.
 *
 * - Se $relPath for vazio, faz varredura RECURSIVA de todo o mount (ate uma
 *   profundidade maxima razoavel), apanhando duplicados em qualquer nivel.
 * - Se $relPath estiver definido, opera apenas nessa subpasta.
 *
 * Ignora dotfiles (.navel-*) e o .navel-folder marker.
 */
function n_doc_action_onedrive_force_reconcile(string $rootReal, ?array $onedriveCfg, string $email, bool $isAdmin, string $mountId, bool $dryRun, string $relPath = ''): void
{
    if (!$isAdmin) n_doc_json(403, ['ok' => false, 'error' => 'forbidden']);
    if ($onedriveCfg === null) n_doc_json(503, ['ok' => false, 'error' => 'not_configured']);
    $mount = ondrv_get_mount($onedriveCfg, $mountId);
    if ($mount === null) n_doc_json(400, ['ok' => false, 'error' => 'unknown_mount']);

    $relPath = n_doc_normalize_rel($relPath);

    $lockFile = $rootReal . DIRECTORY_SEPARATOR . '.navel-onedrive-sync.lock';
    $fp = @fopen($lockFile, 'c');
    if ($fp === false || !flock($fp, LOCK_EX | LOCK_NB)) {
        n_doc_json(409, ['ok' => false, 'error' => 'sync_in_progress']);
    }
    try {
        @set_time_limit(0);
        @ignore_user_abort(true);

        $mountAbs = ondrv_mount_local_abs($rootReal, $mount);
        $rootLocal = $relPath === ''
            ? $mountAbs
            : $mountAbs . DIRECTORY_SEPARATOR . str_replace('/', DIRECTORY_SEPARATOR, $relPath);
        if (!is_dir($rootLocal)) {
            n_doc_json(200, ['ok' => true, 'mountId' => $mount['id'], 'relPath' => $relPath, 'removed' => 0, 'candidates' => [], 'dryRun' => $dryRun]);
        }

        $accessToken = ondrv_get_access_token($rootReal, $onedriveCfg);
        if ($accessToken === null) n_doc_json(503, ['ok' => false, 'error' => 'not_connected']);
        $root = ondrv_resolve_mount_root($rootReal, $onedriveCfg, $accessToken, $mount);
        if ($root === null) n_doc_json(502, ['ok' => false, 'error' => 'root_not_resolved']);

        // Resolve o item OneDrive a partir do qual vamos comecar.
        $startItemId = $root['rootItemId'];
        if ($relPath !== '') {
            $found = '';
            $itemsMapPre = ondrv_load_items_map($rootReal);
            foreach ($itemsMapPre as $id => $entry) {
                if (!is_array($entry)) continue;
                if (($entry['mountId'] ?? '') !== $mount['id']) continue;
                if (($entry['relPath'] ?? '') === $relPath) { $found = (string)$id; break; }
            }
            if ($found === '') {
                $fullPath = trim($root['rootOneDrivePath'], '/') . '/' . $relPath;
                try {
                    $meta = ondrv_graph_get($accessToken, '/me/drive/root:/' . ondrv_encode_onedrive_path($fullPath) . '?$select=id,folder');
                    $found = (string)($meta['id'] ?? '');
                } catch (Throwable $e) {
                    $found = '';
                }
            }
            if ($found === '') {
                n_doc_json(502, ['ok' => false, 'error' => 'subpath_not_in_graph', 'relPath' => $relPath]);
            }
            $startItemId = $found;
        }

        // BFS: percorre arvore OneDrive ate ONDRV_RECONCILE_MAX_DEPTH niveis.
        // Em cada no, compara os filhos locais com os filhos remotos (Graph)
        // pelo NOME exacto. Nomes locais que nao existem no Graph sao
        // candidatos a remocao.
        $maxDepth = defined('ONDRV_RECONCILE_MAX_DEPTH') ? ONDRV_RECONCILE_MAX_DEPTH : 4;
        $candidates = [];
        $graphCount = 0;
        $visitedDirs = 0;
        /** @var array<int,array{relPath:string,itemId:string,local:string,depth:int}> $queue */
        $queue = [[
            'relPath' => $relPath,
            'itemId'  => $startItemId,
            'local'   => $rootLocal,
            'depth'   => 0,
        ]];
        // Usado para apagar entries do itemsMap cujos ancestrais ja nao
        // existem no Graph.
        /** @var array<string,array<string,bool>> $graphNamesByRel */
        $graphNamesByRel = [];

        while (!empty($queue)) {
            $node = array_shift($queue);
            $visitedDirs++;
            if (!is_dir($node['local'])) continue;

            // Lista children remotos (com paginacao).
            $graphNames = [];
            /** @var array<int,array{id:string,name:string,isFolder:bool}> $graphItems */
            $graphItems = [];
            $url = '/drives/' . rawurlencode($root['driveId']) . '/items/' . rawurlencode($node['itemId']) . '/children?$select=id,name,folder&$top=200';
            $pages = 0;
            while ($url !== '' && $pages < 10) {
                try {
                    $resp = ondrv_graph_get($accessToken, $url);
                } catch (Throwable $e) {
                    n_doc_json(502, ['ok' => false, 'error' => 'graph_failed', 'detail' => $e->getMessage(), 'atRelPath' => $node['relPath']]);
                }
                $pages++;
                $items = is_array($resp['value'] ?? null) ? $resp['value'] : [];
                foreach ($items as $it) {
                    if (!is_array($it)) continue;
                    $n = (string)($it['name'] ?? '');
                    if ($n === '') continue;
                    $graphNames[$n] = true;
                    $graphItems[] = [
                        'id'       => (string)($it['id'] ?? ''),
                        'name'     => $n,
                        'isFolder' => isset($it['folder']),
                    ];
                    $graphCount++;
                }
                $url = (string)($resp['@odata.nextLink'] ?? '');
            }
            $graphNamesByRel[$node['relPath']] = $graphNames;

            // Lista children locais e diff.
            $localDirNames = [];
            $h = @opendir($node['local']);
            if ($h) {
                while (($e = readdir($h)) !== false) {
                    if ($e === '.' || $e === '..') continue;
                    if ($e === N_DOC_MARKER) continue;
                    if (str_starts_with($e, '.navel-')) continue;
                    $abs = $node['local'] . DIRECTORY_SEPARATOR . $e;
                    $childRel = $node['relPath'] === '' ? $e : $node['relPath'] . '/' . $e;
                    if (!isset($graphNames[$e])) {
                        $candidates[] = [
                            'name'    => $e,
                            'abs'     => $abs,
                            'kind'    => is_dir($abs) ? 'dir' : 'file',
                            'relPath' => $childRel,
                        ];
                    } else if (is_dir($abs)) {
                        $localDirNames[$e] = $abs;
                    }
                }
                closedir($h);
            }

            // Desce para sub-pastas que existem ao mesmo tempo local E Graph.
            if ($node['depth'] < $maxDepth) {
                foreach ($graphItems as $gi) {
                    if (!$gi['isFolder']) continue;
                    if (!isset($localDirNames[$gi['name']])) continue;
                    $queue[] = [
                        'relPath' => $node['relPath'] === '' ? $gi['name'] : $node['relPath'] . '/' . $gi['name'],
                        'itemId'  => $gi['id'],
                        'local'   => $localDirNames[$gi['name']],
                        'depth'   => $node['depth'] + 1,
                    ];
                }
            }
        }

        $removed = 0;
        if (!$dryRun && !empty($candidates)) {
            foreach ($candidates as $c) {
                if ($c['kind'] === 'dir') {
                    ondrv_rmdir_recursive($c['abs']);
                    if (!is_dir($c['abs'])) $removed++;
                } else {
                    if (@unlink($c['abs'])) $removed++;
                }
            }
            // Limpa entries do itemsMap cujos relPath comecam por um dos
            // candidatos removidos (pastas) ou que coincidem com ficheiros
            // candidatos.
            $map = ondrv_load_items_map($rootReal);
            $changed = false;
            $removedPrefixes = [];
            foreach ($candidates as $c) {
                if ($c['kind'] === 'dir') $removedPrefixes[] = $c['relPath'] . '/';
            }
            $removedRels = [];
            foreach ($candidates as $c) $removedRels[$c['relPath']] = true;
            foreach ($map as $id => $entry) {
                if (!is_array($entry)) continue;
                if (($entry['mountId'] ?? '') !== $mount['id']) continue;
                $rel = (string)($entry['relPath'] ?? '');
                if ($rel === '') continue;
                if (isset($removedRels[$rel])) { unset($map[$id]); $changed = true; continue; }
                foreach ($removedPrefixes as $pref) {
                    if (strpos($rel, $pref) === 0) { unset($map[$id]); $changed = true; break; }
                }
            }
            if ($changed) ondrv_save_items_map($rootReal, $map);
            n_doc_audit_append($rootReal, $email, 'onedrive_force_reconcile:' . $mount['id'] . ($relPath === '' ? ':recursive' : ':' . $relPath), (string)$removed);
        }

        n_doc_json(200, [
            'ok' => true,
            'mountId' => $mount['id'],
            'relPath' => $relPath,
            'dryRun' => $dryRun,
            'recursive' => ($relPath === ''),
            'visitedDirs' => $visitedDirs,
            'graphCount' => $graphCount,
            'candidates' => $candidates,
            'removed' => $removed,
        ]);
    } finally {
        @flock($fp, LOCK_UN);
        @fclose($fp);
    }
}

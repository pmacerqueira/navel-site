<?php
/**
 * onedrive-cron.php — Sincronizacao periodica dos mounts OneDrive.
 *
 * Accionado pelo cron do cPanel (ex. de 15 em 15 minutos):
 *   * /15 * * * *  curl -s "https://navel.pt/onedrive-cron.php?token=TOKEN" > /dev/null
 *   (removida a / antes do 15 para este docblock nao ser fechado pelo PHP)
 *
 * Valida o token contra 'onedrive_cron_token' em documentos-api-config.php.
 * Corre o sync de cada mount configurado (pull para Comercial, push para
 * Assistencia Tecnica) e imprime estatisticas em JSON.
 *
 * Query params opcionais:
 *   ?token=...        (obrigatorio)
 *   ?mount=at|comercial  (opcional; por omissao corre todos)
 */
declare(strict_types=1);

header('X-Content-Type-Options: nosniff');
header('Content-Type: application/json; charset=utf-8');

require_once __DIR__ . '/onedrive-lib.php';

$configFile = __DIR__ . '/documentos-api-config.php';
if (!is_file($configFile)) {
    http_response_code(503);
    echo json_encode(['ok' => false, 'error' => 'missing_config']);
    exit;
}
/** @var array<string,mixed> $cfg */
$cfg = require $configFile;

$ondCfg = ondrv_config($cfg);
if ($ondCfg === null) {
    http_response_code(503);
    echo json_encode(['ok' => false, 'error' => 'not_configured']);
    exit;
}

$expected = (string)($cfg['onedrive_cron_token'] ?? '');
$provided = (string)($_GET['token'] ?? $_SERVER['HTTP_X_CRON_TOKEN'] ?? '');
if ($expected === '' || $provided === '' || !hash_equals($expected, $provided)) {
    http_response_code(401);
    echo json_encode(['ok' => false, 'error' => 'unauthorized']);
    exit;
}

$root = isset($cfg['documentos_root']) && $cfg['documentos_root'] !== ''
    ? rtrim(str_replace(['/', '\\'], DIRECTORY_SEPARATOR, (string)$cfg['documentos_root']), DIRECTORY_SEPARATOR)
    : __DIR__ . DIRECTORY_SEPARATOR . 'documentos-store';
if (!is_dir($root)) @mkdir($root, 0755, true);
$rootReal = realpath($root);
if ($rootReal === false) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => 'bad_documentos_root']);
    exit;
}

// Evita sobreposicao de execucoes (cron lento + agendamento apertado).
$lockFile = $rootReal . DIRECTORY_SEPARATOR . '.navel-onedrive-sync.lock';
$fp = @fopen($lockFile, 'c');
if ($fp === false || !flock($fp, LOCK_EX | LOCK_NB)) {
    echo json_encode(['ok' => true, 'skipped' => 'already_running']);
    exit;
}

try {
    @set_time_limit(0);
    @ignore_user_abort(true);
    $mounts = ondrv_get_mounts($ondCfg);
    $onlyMount = trim((string)($_GET['mount'] ?? ''));
    if ($onlyMount !== '') {
        $mounts = array_values(array_filter($mounts, static fn($m) => $m['id'] === $onlyMount));
        if (empty($mounts)) {
            echo json_encode(['ok' => false, 'error' => 'unknown_mount', 'mount' => $onlyMount]);
            exit;
        }
    }
    $results = [];
    $okAll = true;
    foreach ($mounts as $m) {
        try {
            // Ate 14 min por mount: sincronizacao autonoma ate nao haver trabalho pendente.
            $r = ondrv_sync_mount_run_until_done($rootReal, $ondCfg, $m, 840);
        } catch (Throwable $e) {
            ondrv_log($rootReal, 'cron_mount_exception[' . $m['id'] . ']: ' . $e->getMessage());
            $r = ['ok' => false, 'error' => 'exception', 'detail' => $e->getMessage()];
        }
        if (empty($r['ok'])) $okAll = false;
        $results[$m['id']] = $r;
    }
    echo json_encode(['ok' => $okAll, 'results' => $results], JSON_UNESCAPED_UNICODE);
} catch (Throwable $e) {
    ondrv_log($rootReal, 'cron_exception: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => 'exception', 'detail' => $e->getMessage()]);
} finally {
    @flock($fp, LOCK_UN);
    @fclose($fp);
}

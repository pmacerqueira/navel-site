<?php
/**
 * onedrive-callback.php — Recebe redirect do Microsoft Entra ID apos login.
 *
 * URL: https://navel.pt/onedrive-callback.php
 *
 * Fluxo:
 *  1) browser redireccionado para login.microsoftonline.com pelo `action=onedrive_connect_url`
 *     do documentos-api.php (admin authenticated).
 *  2) utilizador faz login Microsoft (com 2FA).
 *  3) Microsoft redirecciona para este endpoint com ?code=...&state=...
 *  4) Este script valida o `state`, troca `code` por tokens e persiste refresh
 *     token em documentos-store/.navel-onedrive.json.
 *  5) Redirecciona de volta para /area-reservada com flag de sucesso.
 */
declare(strict_types=1);

require_once __DIR__ . '/onedrive-lib.php';

header('X-Content-Type-Options: nosniff');

$configFile = __DIR__ . '/documentos-api-config.php';
if (!is_file($configFile)) {
    http_response_code(503);
    echo 'Configuracao indisponivel.';
    exit;
}
/** @var array<string,mixed> $cfg */
$cfg = require $configFile;

$ondCfg = ondrv_config($cfg);
if ($ondCfg === null) {
    http_response_code(503);
    echo 'OneDrive nao configurado (faltam microsoft_tenant_id / client_id / client_secret / redirect_uri).';
    exit;
}

$root = isset($cfg['documentos_root']) && $cfg['documentos_root'] !== ''
    ? rtrim(str_replace(['/', '\\'], DIRECTORY_SEPARATOR, (string)$cfg['documentos_root']), DIRECTORY_SEPARATOR)
    : __DIR__ . DIRECTORY_SEPARATOR . 'documentos-store';
if (!is_dir($root)) @mkdir($root, 0755, true);
$rootReal = realpath($root);
if ($rootReal === false) {
    http_response_code(500);
    echo 'documentos_root invalido.';
    exit;
}

$error = (string)($_GET['error'] ?? '');
if ($error !== '') {
    $desc = (string)($_GET['error_description'] ?? '');
    ondrv_log($rootReal, 'oauth_error: ' . $error . ' ' . $desc);
    header('Location: /area-reservada?onedrive=error&reason=' . rawurlencode($error));
    exit;
}

$code  = (string)($_GET['code'] ?? '');
$state = (string)($_GET['state'] ?? '');
if ($code === '' || $state === '') {
    http_response_code(400);
    echo 'Parametros OAuth em falta.';
    exit;
}
$stateInfo = ondrv_consume_state($rootReal, $state);
if ($stateInfo === null) {
    http_response_code(400);
    echo 'Estado OAuth invalido ou expirado. Tente ligar novamente a partir da Area Reservada.';
    exit;
}

try {
    $resp = ondrv_exchange_code($ondCfg, $code);
} catch (Throwable $e) {
    ondrv_log($rootReal, 'oauth_exchange_failed: ' . $e->getMessage());
    http_response_code(500);
    echo 'Nao foi possivel trocar o codigo por tokens: ' . htmlspecialchars($e->getMessage());
    exit;
}

$refreshToken = (string)($resp['refresh_token'] ?? '');
$accessToken  = (string)($resp['access_token'] ?? '');
$expiresIn    = (int)($resp['expires_in'] ?? 3600);
if ($refreshToken === '' || $accessToken === '') {
    http_response_code(500);
    echo 'Resposta Microsoft sem refresh_token. Confirme que o scope offline_access esta activo.';
    exit;
}

// Obter informacao do utilizador Microsoft (para mostrar na UI).
$upn = '';
$display = '';
try {
    $me = ondrv_graph_get($accessToken, '/me?$select=userPrincipalName,mail,displayName');
    $upn     = (string)($me['userPrincipalName'] ?? $me['mail'] ?? '');
    $display = (string)($me['displayName'] ?? '');
} catch (Throwable $e) {
    // nao critico; continuamos
    ondrv_log($rootReal, 'me_fetch_failed: ' . $e->getMessage());
}

$existing = ondrv_load_tokens($rootReal) ?: [];
$now = time();
$tokens = array_merge($existing, [
    'refreshToken'          => $refreshToken,
    'accessToken'           => $accessToken,
    'accessTokenExpiresAt'  => $now + $expiresIn - 30,
    'userPrincipalName'     => $upn,
    'displayName'           => $display,
    'connectedAt'           => $now,
    'connectedByPortalUser' => $stateInfo['email'],
    'lastRefreshAt'         => $now,
]);
// Limpa state da ligacao anterior; forca re-resolver pasta raiz.
unset($tokens['deltaLink'], $tokens['driveId'], $tokens['rootItemId'], $tokens['rootOneDrivePath']);
ondrv_save_tokens($rootReal, $tokens);
ondrv_log($rootReal, 'connected upn=' . $upn . ' portalUser=' . $stateInfo['email']);

header('Location: /area-reservada?onedrive=connected');
exit;

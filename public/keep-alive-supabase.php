<?php
/**
 * Keep-alive Supabase — reduz risco de pausa automática do projeto free-tier.
 *
 * Faz duas chamadas ao projecto:
 *   1) RPC keep_alive_ping() — UPDATE real em Postgres (ver docs/supabase-keep-alive-rpc.sql)
 *   2) GET /auth/v1/health — actividade no GoTrue (Auth)
 *
 * Credenciais (obrigatório — não há chave por defeito no código):
 *   - Variáveis de ambiente: SUPABASE_URL + SUPABASE_ANON_KEY (ou VITE_* no cron se exportar)
 *   - OU ficheiro (não versionado): public/keep-alive-supabase.secret.php
 *       <?php
 *       return [
 *         'url' => 'https://xxxx.supabase.co',
 *         'anon_key' => 'eyJ...',
 *       ];
 *       OU return 'apenas-anon-key'; com URL no SUPABASE_URL
 *
 * PRÉ-REQUISITO: executar docs/supabase-keep-alive-rpc.sql no SQL Editor (uma vez ou após alterações).
 *
 * Cron cPanel (recomendado 2× por dia; mínimo 3× por semana):
 *   0 6,18 * * * curl -fsS -m 45 "https://navel.pt/keep-alive-supabase.php" >> /home/USER/logs/supabase-keepalive.log 2>&1
 *
 * CLI (se PHP tiver curl e env):
 *   0 6,18 * * * /usr/bin/php /home/USER/public_html/keep-alive-supabase.php >> ... 2>&1
 *
 * @version 1.3
 */
declare(strict_types=1);

header('Content-Type: text/plain; charset=utf-8');

const KEEPALIVE_VERSION = '1.3';
const CURL_TIMEOUT_SEC = 25;
const RPC_RETRIES = 3;
const RPC_RETRY_WAIT_SEC = 2;

$timestamp = date('Y-m-d H:i:s');
$verbose = isset($_GET['verbose']) && $_GET['verbose'] !== '0' && $_GET['verbose'] !== '';

$projectUrl = '';
$key = '';

$urlEnv = getenv('SUPABASE_URL') ?: getenv('VITE_SUPABASE_URL');
$keyEnv = getenv('SUPABASE_ANON_KEY') ?: getenv('VITE_SUPABASE_ANON_KEY');
if (is_string($urlEnv) && trim($urlEnv) !== '') {
    $projectUrl = rtrim(trim($urlEnv), '/');
}
if (is_string($keyEnv) && trim($keyEnv) !== '') {
    $key = trim($keyEnv);
}

$secretPath = __DIR__ . '/keep-alive-supabase.secret.php';
if (is_readable($secretPath)) {
    $loaded = require $secretPath;
    if (is_array($loaded)) {
        if ($key === '' && isset($loaded['anon_key']) && is_string($loaded['anon_key'])) {
            $key = trim($loaded['anon_key']);
        }
        if ($projectUrl === '' && isset($loaded['url']) && is_string($loaded['url'])) {
            $projectUrl = rtrim(trim($loaded['url']), '/');
        }
    } elseif (is_string($loaded) && trim($loaded) !== '') {
        $key = trim($loaded);
    }
}

if ($projectUrl === '') {
    $projectUrl = 'https://kgvbvgwqkqkfccraaehb.supabase.co';
}

if ($key === '') {
    echo "ERRO - $timestamp - Definir SUPABASE_ANON_KEY (ou VITE_SUPABASE_ANON_KEY) ou keep-alive-supabase.secret.php com a chave anon. Ver comentários no topo deste script.\n";
    http_response_code(500);
    exit(1);
}

/**
 * @return array{ok: bool, http: int, error: string, body: string}
 */
function keepalive_curl_request(string $method, string $url, string $key, ?string $jsonBody): array
{
    $ch = curl_init($url);
    $headers = [
        'apikey: ' . $key,
        'Authorization: Bearer ' . $key,
        'Accept: application/json',
    ];
    if ($method === 'POST') {
        $headers[] = 'Content-Type: application/json';
        $headers[] = 'Prefer: return=representation';
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, $jsonBody ?? '{}');
    } else {
        curl_setopt($ch, CURLOPT_HTTPGET, true);
    }
    curl_setopt_array($ch, [
        CURLOPT_HTTPHEADER => $headers,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => CURL_TIMEOUT_SEC,
        CURLOPT_USERAGENT => 'Navel-Supabase-KeepAlive/' . KEEPALIVE_VERSION,
    ]);
    $body = curl_exec($ch);
    $err = curl_error($ch);
    $http = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    $bodyStr = is_string($body) ? $body : '';
    if ($err !== '') {
        return ['ok' => false, 'http' => $http, 'error' => $err, 'body' => $bodyStr];
    }
    $ok = $http >= 200 && $http < 300;
    return ['ok' => $ok, 'http' => $http, 'error' => '', 'body' => $bodyStr];
}

$rpcUrl = $projectUrl . '/rest/v1/rpc/keep_alive_ping';
$lastRpc = null;
$rpcOk = false;
for ($attempt = 1; $attempt <= RPC_RETRIES; $attempt++) {
    $lastRpc = keepalive_curl_request('POST', $rpcUrl, $key, '{}');
    if ($lastRpc['ok']) {
        $rpcOk = true;
        break;
    }
    if ($attempt < RPC_RETRIES) {
        sleep(RPC_RETRY_WAIT_SEC);
    }
}

if (!$rpcOk) {
    $http = $lastRpc['http'] ?? 0;
    $snippet = isset($lastRpc['body']) ? substr(preg_replace('/\s+/', ' ', $lastRpc['body']), 0, 280) : '';
    $curlErr = $lastRpc['error'] ?? '';
    if ($curlErr !== '') {
        echo "ERRO - $timestamp - RPC keep_alive_ping: curl: $curlErr\n";
    } elseif ($http === 404 || (isset($lastRpc['body']) && is_string($lastRpc['body']) && strpos($lastRpc['body'], 'PGRST202') !== false)) {
        echo "ERRO - $timestamp - HTTP $http - Função ou RPC em falta. Executar docs/supabase-keep-alive-rpc.sql no Supabase SQL Editor.\n";
    } else {
        echo "ERRO - $timestamp - RPC keep_alive_ping falhou após " . RPC_RETRIES . " tentativas (HTTP $http). Verificar chave anon e URL do projecto.\n";
    }
    if ($snippet !== '' && $verbose) {
        echo "Resposta: $snippet\n";
    }
    http_response_code(503);
    exit(1);
}

$healthUrl = $projectUrl . '/auth/v1/health';
$health = keepalive_curl_request('GET', $healthUrl, $key, null);
$healthLine = $health['ok']
    ? "auth/health HTTP {$health['http']}"
    : "auth/health FALHOU HTTP {$health['http']}" . ($health['error'] !== '' ? " ({$health['error']})" : '');

if ($health['ok']) {
    echo "OK - $timestamp - rpc(keep_alive_ping) HTTP {$lastRpc['http']}; {$healthLine} [v" . KEEPALIVE_VERSION . "]\n";
    exit(0);
}

echo "OK_RPC - $timestamp - rpc(keep_alive_ping) HTTP {$lastRpc['http']}; AVISO {$healthLine} [v" . KEEPALIVE_VERSION . "]\n";
if ($verbose && $health['body'] !== '') {
    echo 'auth body: ' . substr(preg_replace('/\s+/', ' ', $health['body']), 0, 200) . "\n";
}
exit(0);

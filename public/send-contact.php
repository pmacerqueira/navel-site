<?php
/**
 * Envio de formulário de contacto — Navel
 * Recebe POST e envia email para comercial@navel.pt
 * Requer PHP no servidor (cPanel).
 *
 * Segurança: sanitização de inputs, rate limit por IP, sem expor erros ao utilizador.
 */
header('Content-Type: text/html; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('Referrer-Policy: strict-origin-when-cross-origin');

$baseUrl = (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? 'https' : 'http')
  . '://' . ($_SERVER['HTTP_HOST'] ?? 'navel.pt') . '/';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
  header('Location: ' . $baseUrl . '?error=method#/contacto');
  exit;
}

// ——— Rate limit: máx. 5 envios por 15 minutos por IP ———
$ip = $_SERVER['REMOTE_ADDR'] ?? '';
$rateDir = sys_get_temp_dir() . '/navel_contact_rate';
if (!is_dir($rateDir)) {
  @mkdir($rateDir, 0755, true);
}
$rateFile = $rateDir . '/' . md5($ip) . '.txt';
$now = time();
$window = 15 * 60; // 15 min
$maxRequests = 5;
$attempts = [];
if (file_exists($rateFile)) {
  $content = file_get_contents($rateFile);
  $attempts = array_filter(array_map('intval', explode("\n", trim($content))), function ($t) use ($now, $window) {
    return ($now - $t) < $window;
  });
}
if (count($attempts) >= $maxRequests) {
  header('Location: ' . $baseUrl . '?error=limit#/contacto');
  exit;
}
$attempts[] = $now;
file_put_contents($rateFile, implode("\n", array_slice($attempts, -$maxRequests)));

// ——— Sanitização e limites de tamanho ———
$maxName = 200;
$maxSubject = 300;
$maxMessage = 10000;

$name    = trim($_POST['name'] ?? '');
$email   = trim($_POST['email'] ?? '');
$subject = trim($_POST['subject'] ?? '');
$message = trim($_POST['message'] ?? '');

$name    = mb_substr(strip_tags($name), 0, $maxName);
$email   = filter_var($email, FILTER_SANITIZE_EMAIL);
$subject = mb_substr(strip_tags($subject), 0, $maxSubject);
$message = mb_substr(strip_tags($message), 0, $maxMessage);

if (empty($name) || empty($email) || empty($subject) || empty($message)) {
  header('Location: ' . $baseUrl . '?error=missing#/contacto');
  exit;
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
  header('Location: ' . $baseUrl . '?error=invalid#/contacto');
  exit;
}

// Prevenir header injection: remover caracteres de control em headers de email
$email = str_replace(["\r", "\n", "\0"], '', $email);
$name = str_replace(["\r", "\n", "\0"], '', $name);
$subject = str_replace(["\r", "\n", "\0"], '', $subject);

$to = 'comercial@navel.pt';
$subjectRaw = '[Orçamento] ' . $subject;
$subjectLine = '=?UTF-8?B?' . base64_encode($subjectRaw) . '?=';
$body = "Mensagem:\n\n" . $message . "\n\n---\nDe: " . $name . "\nEmail: " . $email;

$headers = "From: " . $email . "\r\n";
$headers .= "Reply-To: " . $email . "\r\n";
$headers .= "Content-Type: text/plain; charset=UTF-8\r\n";
$headers .= "X-Mailer: PHP/" . phpversion() . "\r\n";

$sent = false;
try {
  $sent = @mail($to, $subjectLine, $body, $headers);
} catch (Throwable $e) {
  // Não expor detalhes ao utilizador; opcional: log em ficheiro
  $sent = false;
}

if ($sent) {
  header('Location: ' . $baseUrl . '?sent=1#/contacto');
} else {
  header('Location: ' . $baseUrl . '?error=send#/contacto');
}
exit;

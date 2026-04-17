<?php
/**
 * fix-istobal.php — diagnostico + limpeza de duplicados em qualquer variante
 * de pasta "Assistencia Tecnica" dentro de documentos-store.
 *
 * Uso:
 *   1) Upload para public_html/fix-istobal.php
 *   2) https://navel.pt/fix-istobal.php?secret=NAVEL-istobal-2026  => diagnostico
 *   3) Adicionar &confirm=1 => apaga TODOS os itens cujo nome tenha caracteres
 *      nao-ASCII dentro de ISTOBAL (em qualquer variante do path).
 *   4) Apagar este ficheiro depois.
 */

$SECRET = 'NAVEL-istobal-2026';
if (($_GET['secret'] ?? '') !== $SECRET) {
    http_response_code(403);
    echo 'forbidden';
    exit;
}

header('Content-Type: text/html; charset=utf-8');
@set_time_limit(180);

$base = __DIR__ . '/documentos-store';

function html_esc(string $s): string { return htmlspecialchars($s, ENT_QUOTES, 'UTF-8'); }

function rmrf(string $p): void {
    if (is_link($p) || is_file($p)) { @unlink($p); return; }
    if (!is_dir($p)) return;
    $h = @opendir($p);
    if ($h) {
        while (($e = readdir($h)) !== false) {
            if ($e === '.' || $e === '..') continue;
            rmrf($p . DIRECTORY_SEPARATOR . $e);
        }
        closedir($h);
    }
    @rmdir($p);
}

function list_dir(string $p): array {
    $out = [];
    if (!is_dir($p)) return $out;
    $h = @opendir($p);
    if (!$h) return $out;
    while (($e = readdir($h)) !== false) {
        if ($e === '.' || $e === '..') continue;
        if ($e === '.navel-folder') continue;
        if (str_starts_with($e, '.navel-')) continue;
        $out[] = $e;
    }
    closedir($h);
    sort($out);
    return $out;
}

echo "<!doctype html><html><head><meta charset='utf-8'><title>NAVEL · diagnostico</title>";
echo "<style>body{font-family:system-ui,Segoe UI,Arial,sans-serif;max-width:960px;margin:2rem auto;padding:0 1rem;color:#1e293b}h1{color:#dc2626}h2{margin-top:2rem;color:#334155;border-bottom:2px solid #e2e8f0;padding-bottom:.3rem}h3{margin-top:1.2rem;color:#475569}ul{background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:1rem 1.5rem}li{margin:.25rem 0;font-family:monospace;font-size:.92rem}.warn{color:#dc2626;font-weight:700}.ok{color:#16a34a;font-weight:700}code{background:#f1f5f9;padding:.1rem .4rem;border-radius:4px}.btn{display:inline-block;background:#dc2626;color:white;padding:.75rem 1.5rem;border-radius:8px;text-decoration:none;font-weight:700;margin-top:1rem}.btn:hover{background:#b91c1c}.box{background:#fef3c7;border:1px solid #fbbf24;border-radius:8px;padding:1rem;margin:1rem 0}.done{background:#dcfce7;border:1px solid #16a34a;border-radius:8px;padding:1rem;margin:1rem 0}.path{background:#fff;border:1px solid #cbd5e1;border-radius:6px;padding:.5rem .8rem;font-family:monospace;font-size:.85rem;margin:.3rem 0;display:block}</style>";
echo "</head><body>";
echo "<h1>Diagnostico completo · documentos-store</h1>";
echo "<p>Base: <code>" . html_esc($base) . "</code></p>";

if (!is_dir($base)) {
    echo "<p class='warn'>ERRO: documentos-store nao existe.</p>";
    exit;
}

// Lista raiz de documentos-store
echo "<h2>1. Raiz de documentos-store</h2>";
$rootChildren = list_dir($base);
echo "<ul>";
foreach ($rootChildren as $c) {
    $isDir = is_dir($base . '/' . $c);
    $hasNonAscii = preg_match('/[^\x00-\x7F]/', $c);
    $marker = $isDir ? '[dir]' : '[file]';
    $accent = $hasNonAscii ? ' <span class="warn">&larr; nao-ASCII</span>' : '';
    echo "<li>$marker " . html_esc($c) . $accent . "</li>";
}
echo "</ul>";

// Identifica candidatas a "Assistencia Tecnica" (qualquer variante)
$atVariants = [];
foreach ($rootChildren as $c) {
    if (!is_dir($base . '/' . $c)) continue;
    $norm = strtolower(preg_replace('/[\s\-_]+/u', '', $c));
    $check = preg_replace('/[^a-z]/', '', @iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $norm) ?: $norm);
    if (strpos($check, 'assistenciatecnica') !== false || strpos($check, 'assistenciatcnica') !== false) {
        $atVariants[] = $c;
    }
}

echo "<h2>2. Variantes de &quot;Assistencia Tecnica&quot; detectadas (" . count($atVariants) . ")</h2>";
if (empty($atVariants)) {
    echo "<p class='warn'>Nao encontrei nenhuma pasta que parece ser &quot;Assistencia Tecnica&quot;.</p>";
    exit;
}
echo "<ul>";
foreach ($atVariants as $v) {
    echo "<li>" . html_esc($v) . "</li>";
}
echo "</ul>";

// Para cada variante, lista ISTOBAL se existir
$istobalPaths = [];
foreach ($atVariants as $at) {
    $atPath = $base . '/' . $at;
    $children = list_dir($atPath);
    echo "<h3>2." . array_search($at, $atVariants) . " Dentro de &quot;" . html_esc($at) . "&quot;</h3>";
    echo "<ul>";
    foreach ($children as $c) {
        $isDir = is_dir($atPath . '/' . $c);
        $hasNonAscii = preg_match('/[^\x00-\x7F]/', $c);
        $accent = $hasNonAscii ? ' <span class="warn">&larr; nao-ASCII</span>' : '';
        echo "<li>" . ($isDir ? '[dir]' : '[file]') . " " . html_esc($c) . $accent . "</li>";
        // Identifica ISTOBAL
        if ($isDir) {
            $norm = strtolower(@iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $c) ?: $c);
            if (strpos($norm, 'istobal') !== false) {
                $istobalPaths[] = $atPath . '/' . $c;
            }
        }
    }
    echo "</ul>";
}

// Para cada ISTOBAL encontrado, lista o conteudo
echo "<h2>3. Pastas &quot;ISTOBAL&quot; encontradas (" . count($istobalPaths) . ")</h2>";
$allCandidatesToDelete = []; // [path_abs, name, parent]
foreach ($istobalPaths as $iPath) {
    echo "<span class='path'>" . html_esc($iPath) . "</span>";
    $children = list_dir($iPath);
    echo "<ul>";
    foreach ($children as $c) {
        $abs = $iPath . '/' . $c;
        $isDir = is_dir($abs);
        $hasNonAscii = preg_match('/[^\x00-\x7F]/', $c);
        $accent = $hasNonAscii ? ' <span class="warn">&larr; nao-ASCII (apagar)</span>' : '';
        echo "<li>" . ($isDir ? '[dir]' : '[file]') . " " . html_esc($c) . $accent . "</li>";
        if ($hasNonAscii) {
            $allCandidatesToDelete[] = ['abs' => $abs, 'name' => $c, 'parent' => $iPath];
        }
    }
    echo "</ul>";
}

echo "<h2>4. A apagar (" . count($allCandidatesToDelete) . ")</h2>";
if (empty($allCandidatesToDelete)) {
    echo "<p class='ok'>Nada a apagar no disco. As pastas duplicadas com acentos nao estao em nenhum ISTOBAL no sistema de ficheiros.</p>";
    echo "<div class='box'>Se o portal ainda te mostra 9 pastas, o problema NAO esta no disco. Tira print desta pagina e envia-me. Vou investigar onde a listagem esta a inventar as 3 extras.</div>";
    exit;
}
echo "<ul>";
foreach ($allCandidatesToDelete as $c) echo "<li class='warn'>" . html_esc($c['abs']) . "</li>";
echo "</ul>";

$confirm = isset($_GET['confirm']) && $_GET['confirm'] === '1';
if (!$confirm) {
    echo "<div class='box'><strong>DRY-RUN.</strong> Nada foi apagado. Se os paths acima sao mesmo os que queres apagar, carrega no botao.</div>";
    echo "<a class='btn' href='?secret=" . urlencode($SECRET) . "&confirm=1'>APAGAR agora os " . count($allCandidatesToDelete) . " itens</a>";
    exit;
}

$removed = 0;
foreach ($allCandidatesToDelete as $c) {
    rmrf($c['abs']);
    if (!file_exists($c['abs'])) $removed++;
}

// Limpa items map
$itemsMapFile = $base . '/.navel-onedrive-items.json';
$mapChanged = 0;
if (is_file($itemsMapFile)) {
    $raw = @file_get_contents($itemsMapFile);
    $map = $raw !== false ? json_decode($raw, true) : null;
    if (is_array($map)) {
        $normTargets = [];
        foreach ($allCandidatesToDelete as $c) $normTargets[$c['name']] = true;
        foreach ($map as $id => $entry) {
            if (!is_array($entry)) continue;
            $rel = (string)($entry['relPath'] ?? '');
            if ($rel === '') continue;
            // Se o relPath contem algum dos nomes nao-ASCII a apagar como segmento
            foreach ($normTargets as $name => $_) {
                if (strpos($rel, '/' . $name . '/') !== false || strpos($rel, '/' . $name) === strlen($rel) - strlen('/' . $name)) {
                    unset($map[$id]);
                    $mapChanged++;
                    break;
                }
            }
        }
        if ($mapChanged > 0) {
            @file_put_contents($itemsMapFile, json_encode($map, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES), LOCK_EX);
        }
    }
}

// Limpa lock de sync se existir
@unlink($base . '/.navel-onedrive-sync.lock');

echo "<div class='done'><strong class='ok'>Concluido.</strong><br>Itens removidos: <strong>$removed</strong>/<strong>" . count($allCandidatesToDelete) . "</strong><br>Entries do items map limpas: <strong>$mapChanged</strong><br>Lock apagado.</div>";
echo "<div class='box'><strong>Passos seguintes:</strong><ol><li>Apaga este ficheiro (<code>fix-istobal.php</code>) do cPanel.</li><li>Vai ao portal numa janela privada e verifica o ISTOBAL.</li></ol></div>";
echo "</body></html>";

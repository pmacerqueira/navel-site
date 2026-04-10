@echo off
REM =============================================================================
REM  OPTIMIZAR.bat - Pipeline de otimizacao e preparacao para publicacao cPanel
REM =============================================================================
REM  Este ficheiro deve ser ATUALIZADO sempre que forem pedidas novas
REM  otimizacoes ou preparacoes para publicacao.
REM
REM  Passos atuais:
REM  1. Instalar dependencias (se necessario)
REM  2. Descarregar thumbnails Facom, Beta (Proxira), XTOOLS folhetos e XTOOLS catalogo-resumo (xtools.pt)
REM  3. Otimizar imagens (reduz tamanho, melhora carregamento)
REM  4. Limpar pasta dist (build limpo)
REM  5. Build de producao - npm run build (inclui prebuild: merge privacy + rgpd para src/locales)
REM  6. Verificar build (index.html, assets; pos-deploy: /privacidade, /rgpd, /condicoes-gerais)
REM  7. Criar navel-publicar.zip (conteudo completo de dist) para upload no cPanel
REM
REM  Actualizar cartoes Beta (Bolas) e Telwin: docs/CATALOGOS-BOLAS-BETA-TELWIN.md
REM  CGVS (condicoes gerais): texto em src/data/cgvs-pt.js, rota /condicoes-gerais — ver PUBLICAR-CHECKLIST.txt
REM
REM  Incluido no ZIP: index.html, favicon.ico, assets/, images/ (catalogos), send-contact.php, .htaccess.
REM
REM  Melhorias aplicadas no codigo (mar 2026):
REM  - SEO: BrowserRouter, .htaccess (SPA + www->canonico), sitemap sem hash, react-helmet-async (meta por rota)
REM  Melhorias aplicadas no codigo (fev 2026):
REM  - Logos marcas: Facom, Cleancraft, Aircraft, Schweisscraft, Holzkraft, Unicraft, Optimum em public/images/brands/; otimizacao inclui brands (max 400px)
REM  - Mobile: header compacto (56px), hamburger/idioma/Entrar sem sobreposicao; home CTA 1 por linha
REM  - Favicon: plugin Vite serve logo como favicon.ico em dev e no build
REM  - React Router: future flags v7_relativeSplatPath, v7_startTransition
REM  - i18n: pt.json apenas estatico, en/es lazy-load (evita aviso Vite)
REM  - AuthContext: useCallback/useMemo para menos re-renders
REM  - AuthRouteLoader: componente partilhado para rotas protegidas
REM  - Area reservada: fundo #555555 (mais legivel)
REM  - Imagens: script optimize-images.js (sharp) reduz tamanho antes do build
REM =============================================================================
title Navel - Otimizacao e preparacao para publicacao
cd /d "%~dp0"

echo.
echo ========================================
echo   Navel - Otimizacao e Publicacao
echo ========================================
echo.

where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERRO] Node.js nao encontrado.
    pause
    exit /b 1
)

if not exist "node_modules" (
    echo [1/7] A instalar dependencias...
    call npm install
    if %errorlevel% neq 0 ( pause & exit /b 1 )
    echo.
) else (
    echo [1/7] Dependencias OK.
)

echo [2/7] A descarregar thumbnails Facom, Beta, XTOOLS folhetos e XTOOLS catalogo-resumo...
node scripts\download-facom-thumbnails.js
if %errorlevel% neq 0 ( echo     [Aviso] Falha thumbnails Facom - continuando. ) else ( echo     Thumbnails Facom OK. )
node scripts\download-beta-thumbnails.js
if %errorlevel% neq 0 ( echo     [Aviso] Falha thumbnails Beta - continuando. ) else ( echo     Thumbnails Beta OK. )
node scripts\download-xtools-folhetos-thumbnails.js
if %errorlevel% neq 0 ( echo     [Aviso] Falha thumbnails XTOOLS folhetos - continuando. ) else ( echo     Thumbnails XTOOLS folhetos OK. )
node scripts\download-xtools-resumo-thumbnails.js
if %errorlevel% neq 0 ( echo     [Aviso] Falha thumbnails XTOOLS catalogo-resumo - continuando. ) else ( echo     Thumbnails XTOOLS catalogo-resumo OK. )
node scripts\verify-catalog-images.js
if %errorlevel% neq 0 ( echo [ERRO] Faltam imagens dos catalogos. Nao e possivel continuar. & pause & exit /b 1 )
echo.

echo [3/7] A otimizar imagens...
call npm run optimize-images
echo.

echo [4/7] A limpar pasta dist...
if exist "dist" (
    rmdir /s /q dist
)
echo     Pasta dist limpa.

echo.
echo [5/7] A gerar build de producao (antes: merge privacy + rgpd para src/locales)...
call npm run build
if %errorlevel% neq 0 ( pause & exit /b 1 )

echo.
echo [6/7] A verificar build...
if not exist "dist\index.html" (
    echo [ERRO] Build falhou - index.html nao encontrado.
    pause
    exit /b 1
)
if not exist "dist\assets" (
    echo [ERRO] Build falhou - pasta assets nao encontrada.
    pause
    exit /b 1
)
if not exist "dist\images\catalogos\facom" (
    echo [AVISO] dist\images\catalogos\facom nao encontrado - thumbnails Facom podem faltar no site.
)
if not exist "dist\images\catalogos\xtools" (
    echo [AVISO] dist\images\catalogos\xtools nao encontrado - logos XTOOLS podem faltar no site.
)
if not exist "dist\images\catalogos\xtools-folhetos" (
    echo [AVISO] dist\images\catalogos\xtools-folhetos nao encontrado - campanhas XTOOLS podem faltar.
)
if not exist "dist\images\catalogos\xtools-resumo" (
    echo [AVISO] dist\images\catalogos\xtools-resumo nao encontrado - cartoes XTOOLS na pagina Catalogos podem faltar.
)
echo     Build verificado OK.

echo.
echo [7/7] A criar navel-publicar.zip (sem catalogos - ja estao no cPanel)...
call npm run make-zip
if %errorlevel% neq 0 (
    echo [ERRO] Falha ao criar ZIP.
    pause
    exit /b 1
)

echo.
echo ========================================
echo   Concluido com sucesso!
echo ========================================
echo.
echo Ficheiro criado: navel-publicar.zip
echo NOTA: pasta catalogos/ excluida (ja esta no cPanel).
echo       Para incluir catalogos: node scripts/make-zip.js --with-catalogos
echo.
echo No cPanel:
echo   1. File Manager - public_html
echo   2. Upload - navel-publicar.zip
echo   3. Botao direito no ZIP - Extract
echo   4. Eliminar o ZIP apos extrair
echo.
echo Ver DEPLOY.md e PUBLICAR-CHECKLIST.txt para mais detalhes.
echo Apos o upload, testar tambem: /privacidade /rgpd /condicoes-gerais (F5 = SPA OK).
echo ========================================
echo.
pause

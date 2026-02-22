@echo off
title Navel - Servidor (localhost)
cd /d "%~dp0"

echo.
echo ========================================
echo   Navel - Site em React
echo   Pasta: C:\navel-site
echo ========================================
echo.

where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERRO] Node.js nao encontrado.
    echo Instale em: https://nodejs.org
    pause
    exit /b 1
)

if not exist "node_modules" (
    echo A instalar dependencias...
    call npm install
    if %errorlevel% neq 0 ( echo Falhou. & pause & exit /b 1 )
    echo.
)

echo Abra no browser:  http://localhost:3000
echo Para parar: feche esta janela
echo ========================================
echo.

call npm run dev
pause

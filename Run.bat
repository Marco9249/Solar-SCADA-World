@echo off
title Solar SCADA World
color 0A

:: Ensure we are in the correct directory
cd /d "%~dp0"

echo.
echo ============================================
echo   Solar SCADA World - Offline Mode
echo ============================================
echo.
echo Starting local server on port 5173...

:: Open the browser with the correct subpath
start http://localhost:5173/Solar-SCADA-World/

:: Start the Vite server
npm run dev

pause

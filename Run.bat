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
echo Starting local server... please wait...

:: Open the browser immediately (Vite will load when ready)
start http://localhost:5173/

:: Start the Vite server directly in this window
npm run dev

:: If the server crashes or stops, keep the window open to see the error
pause

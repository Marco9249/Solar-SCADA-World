@echo off
title Solar SCADA World
color 0A
echo.
echo  ============================================
echo   Solar SCADA World - Offline Mode
echo  ============================================
echo.

:: Change to the script's own directory
cd /d "%~dp0"

:: Kill any process already using port 5173
echo  [1/3] Clearing port 5173...
for /f "tokens=5" %%a in ('netstat -aon 2^>nul ^| findstr ":5173 "') do (
    taskkill /F /PID %%a >nul 2>&1
)
timeout /t 1 /nobreak >nul

:: Start the Vite server in a new persistent window
echo  [2/3] Starting local server...
start "Solar SCADA Server" /min cmd /k "cd /d "%~dp0" && npm run dev"

:: Wait until port is listening
echo  [3/3] Waiting for server to be ready...
:WAIT
timeout /t 2 /nobreak >nul
netstat -an | findstr ":5173" | findstr "LISTENING" >nul
if errorlevel 1 goto WAIT

:: Open browser
echo.
echo  [OK] Opening browser at http://localhost:5173/
start http://localhost:5173/

echo.
echo  Server is running in the background window.
echo  Close the "Solar SCADA Server" window to stop.
echo.
timeout /t 5 /nobreak >nul

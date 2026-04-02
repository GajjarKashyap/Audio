@echo off
color 0A
title NEXUS AUDIO SYSTEM [OFFLINE]
cls

echo.
echo  =======================================================
echo   N E X U S   A U D I O   S Y S T E M   v 2 . 0
echo  =======================================================
echo.
echo   [SYSTEM] Initializing Core Protocols...
timeout /t 1 >nul
echo   [SYSTEM] Loading Audio Engine...
timeout /t 1 >nul
echo   [SYSTEM] Starting Python Server...
echo.

title NEXUS AUDIO SYSTEM [LIVE]
start http://127.0.0.1:5000

python app.py
pause

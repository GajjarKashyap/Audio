@echo off
echo ========================================
echo   SoundBound - Auto Start
echo ========================================
echo.

:: Kill any existing node processes on ports 3001 and 5173
echo [1/3] Cleaning up old processes...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3001 ^| findstr LISTENING') do taskkill /PID %%a /F >nul 2>&1
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :5173 ^| findstr LISTENING') do taskkill /PID %%a /F >nul 2>&1
timeout /t 1 /nobreak >nul

:: Start backend
echo [2/3] Starting backend on port 3001...
start "SoundBound Backend" cmd /k "cd /d %~dp0backend && npm run dev"

:: Wait for backend to boot
timeout /t 3 /nobreak >nul

:: Start frontend
echo [3/3] Starting frontend on port 5173...
start "SoundBound Frontend" cmd /k "cd /d %~dp0frontend && npm run dev"

echo.
echo ========================================
echo   Both servers are running!
echo   Backend:  http://localhost:3001
echo   Frontend: http://localhost:5173
echo ========================================
echo.
echo Close this window anytime. The servers
echo will keep running in their own windows.
pause

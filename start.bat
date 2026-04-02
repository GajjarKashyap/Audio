@echo off
echo ========================================
echo   Omstream - Auto Start
echo ========================================
echo.

:: Kill any existing node processes on ports 3001 and 5173
echo [1/3] Cleaning up old processes...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3001 ^| findstr LISTENING') do taskkill /PID %%a /F >nul 2>&1
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :5173 ^| findstr LISTENING') do taskkill /PID %%a /F >nul 2>&1
timeout /t /nobreak 1 >nul 2>&1

:: Start backend
echo [2/3] Starting backend on port 3001...
start "Omstream Backend" cmd /k "cd /d %~dp0backend && npm run dev"

:: Wait for backend to boot
timeout /t /nobreak 3 >nul 2>&1

:: Start frontend
echo [3/3] Starting frontend on port 5173...
start "Omstream Frontend" cmd /k "cd /d %~dp0frontend && npm run dev"

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

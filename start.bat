@echo off
echo Starting Assemble-on-line...
echo.
echo Backend:  http://localhost:4000
echo Frontend: http://localhost:5173
echo Admin:    http://localhost:4000/admin
echo.

start "Backend" cmd /c "cd /d %~dp0 && node server\server.js"
timeout /t 3 /nobreak >nul
start "Frontend" cmd /c "cd /d %~dp0 && npx vite"

echo Both servers started. Close this window or press Ctrl+C to stop.
pause

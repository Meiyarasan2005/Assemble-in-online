@echo off
REM Self-healing watcher for the Assemble-on-line stack.
REM No admin needed. Runs an infinite loop; every 15s it checks that
REM   - portable MongoDB (27018)
REM   - backend API (4000)
REM   - storefront dev server (5173)
REM are listening, and restarts whichever died. Also restarts the backend
REM whenever mongod had to be restarted so it always reconnects.

set PROJECT=%~dp0
set MONGO_BIN=%PROJECT%..\mongo\mongodb-win32-x86_64-windows-7.0.19\bin\mongod.exe
set MONGO_DATA=%PROJECT%..\mongo\data

:loop
rem --- MongoDB on 27018 ---
netstat -an | findstr /c:":27018 " | findstr /c:"LISTENING" >nul 2>&1
if errorlevel 1 (
  echo [watch] mongod down, restarting on 27018...
  start "mongod-27018" /min "%MONGO_BIN%" --dbpath "%MONGO_DATA%" --port 27018 --bind_ip 127.0.0.1 --logpath "%MONGO_DATA%\portable.log" --logappend
  timeout /t 4 /nobreak >nul
  rem flag so the backend is restarted after mongo comes up
  set MONGO_RESTARTED=1
)

rem --- Backend on 4000 ---
netstat -an | findstr /c:":4000 " | findstr /c:"LISTENING" >nul 2>&1
if errorlevel 1 (
  echo [watch] backend down, restarting on 4000...
  start "AssembleOnLine-Server" /min cmd /k "cd /d %PROJECT% && npm run server"
  set MONGO_RESTARTED=
) else (
  if defined MONGO_RESTARTED (
    echo [watch] restarting backend to reconnect to mongo...
    for /f "tokens=5" %%P in ('netstat -ano ^| findstr /c:":4000 " ^| findstr /c:"LISTENING"') do taskkill /F /PID %%P >nul 2>&1
    timeout /t 1 /nobreak >nul
    start "AssembleOnLine-Server" /min cmd /k "cd /d %PROJECT% && npm run server"
    set MONGO_RESTARTED=
  )
)

rem --- Vite dev server on 5173 ---
netstat -an | findstr /c:":5173 " | findstr /c:"LISTENING" >nul 2>&1
if errorlevel 1 (
  echo [watch] vite down, restarting on 5173...
  start "AssembleOnLine-Web" /min cmd /k "cd /d %PROJECT% && npm run dev"
)

timeout /t 15 /nobreak >nul
goto loop
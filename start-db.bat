@echo off
REM Persistently starts local MongoDB (mongod) and the Assemble-on-line backend server.
REM Runs automatically at Windows logon via Task Scheduler task "AssembleOnLine-DB".

set PROJECT=%~dp0
set MONGO_BIN=%PROJECT%..\mongo\mongodb-win32-x86_64-windows-7.0.19\bin\mongod.exe
set MONGO_DATA=%PROJECT%..\mongo\data

if not exist "%MONGO_BIN%" (
  echo mongod not found: "%MONGO_BIN%"
  exit /b 1
)

REM Start mongod on 27018 (27017 is used by the MongoDB service if installed/Compass launched)
start "mongod" /min "%MONGO_BIN%" --dbpath "%MONGO_DATA%" --port 27018 --bind_ip 127.0.0.1 --logpath "%MONGO_DATA%\portable.log" --logappend

REM Wait for mongo to accept connections (max ~30s)
set /a tries=0
:waitloop
set /a tries+=1
if %tries% gtr 60 goto server
netstat -an | findstr /c:":27018 " | findstr /c:"LISTENING" >nul 2>&1
if errorlevel 1 (
  timeout /t 1 /nobreak >nul
  goto waitloop
)

:server
REM Start the backend API server if not already running on port 4000
netstat -an | findstr /c:":4000 " | findstr /c:"LISTENING" >nul 2>&1
if errorlevel 1 (
  start "AssembleOnLine-Server" /min cmd /k "cd /d %PROJECT% && npm run server"
)

REM Start the storefront dev server if not already running on port 5173
netstat -an | findstr /c:":5173 " | findstr /c:"LISTENING" >nul 2>&1
if errorlevel 1 (
  start "AssembleOnLine-Web" /min cmd /k "cd /d %PROJECT% && npm run dev"
)
exit /b 0
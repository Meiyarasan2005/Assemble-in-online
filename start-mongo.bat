@echo off
REM Starts portable MongoDB on port 27018 (avoids conflict with MongoDB service on 27017).
setlocal
set "MONGO_BIN=%~dp0..\mongo\mongodb-win32-x86_64-windows-7.0.19\bin\mongod.exe"
set "MONGO_DATA=%~dp0..\mongo\data"
start "mongod-27018" /min "%MONGO_BIN%" --dbpath "%MONGO_DATA%" --port 27018 --bind_ip 127.0.0.1 --logpath "%MONGO_DATA%\portable.log" --logappend
exit /b 0
@echo off
echo ===================================================
echo Starting AI Study OS Dashboard (Dual Stack)
echo ===================================================

echo [1/2] Starting Secure Node.js Backend Server...
start "AI Study OS Backend (Port 5000)" cmd /k "cd server && npm install && node server.js"

echo [2/2] Starting React Frontend...
start "AI Study OS Frontend (Port 3000)" cmd /k "npm start"

echo Both servers are starting up in separate windows!
echo Please leave BOTH windows open.
pause

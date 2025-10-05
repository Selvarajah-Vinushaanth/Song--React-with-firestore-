@echo off
REM Start Chat Server Script for Windows
echo 🚀 Starting Tamil Song Writing Assistant Chat System...

REM Check if Node.js is installed
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Node.js is not installed. Please install Node.js first.
    pause
    exit /b 1
)

REM Check if we're in the correct directory
if not exist "server\chat-server.js" (
    echo ❌ Please run this script from the project root directory
    pause
    exit /b 1
)

REM Navigate to server directory
cd server

REM Install chat server dependencies if needed
if not exist "node_modules" (
    echo 📦 Installing chat server dependencies...
    copy chat-package.json package.json >nul
    call npm install
)

REM Start the chat server in background
echo 🔥 Starting Socket.IO chat server on port 5001...
start /b node chat-server.js

REM Navigate back to root
cd ..

REM Install React app dependencies if needed
if not exist "node_modules" (
    echo 📦 Installing React app dependencies...
    call npm install
)

REM Start React development server
echo ⚛️  Starting React development server...
start /b npm start

echo.
echo ✅ Both servers are starting!
echo 📱 React App: http://localhost:3000
echo 💬 Chat Server: http://localhost:5001
echo.
echo Press any key to stop the servers and exit...
pause >nul

REM Kill all node processes (be careful with this in production)
taskkill /f /im node.exe 2>nul
echo 🛑 Servers stopped.
pause
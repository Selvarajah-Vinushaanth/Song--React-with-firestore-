#!/bin/bash

# Start Chat Server Script
echo "🚀 Starting Tamil Song Writing Assistant Chat System..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Check if we're in the correct directory
if [ ! -f "server/chat-server.js" ]; then
    echo "❌ Please run this script from the project root directory"
    exit 1
fi

# Navigate to server directory
cd server

# Install chat server dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing chat server dependencies..."
    cp chat-package.json package.json
    npm install
fi

# Start the chat server in background
echo "🔥 Starting Socket.IO chat server on port 5001..."
node chat-server.js &
CHAT_PID=$!

# Navigate back to root and start React app
cd ..

# Install React app dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing React app dependencies..."
    npm install
fi

# Start React development server
echo "⚛️  Starting React development server..."
npm start &
REACT_PID=$!

# Function to cleanup processes
cleanup() {
    echo "🛑 Shutting down servers..."
    kill $CHAT_PID 2>/dev/null
    kill $REACT_PID 2>/dev/null
    exit 0
}

# Set trap to cleanup on script exit
trap cleanup SIGINT SIGTERM

echo "✅ Both servers are running!"
echo "📱 React App: http://localhost:3000"
echo "💬 Chat Server: http://localhost:5001"
echo "Press Ctrl+C to stop both servers"

# Wait for both processes
wait
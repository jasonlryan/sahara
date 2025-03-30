#!/bin/bash

# Stop existing processes on ports 3000 and 5173
echo "Stopping existing server processes (if any)..."
lsof -ti tcp:3000 | xargs kill -9 2>/dev/null
lsof -ti tcp:5173 | xargs kill -9 2>/dev/null
echo "Existing processes stopped."

# Start backend from the root directory in the background
echo "Starting backend server from root..."
npm start &
BACKEND_PID=$!
echo "Backend started with PID: $BACKEND_PID"

# Navigate to frontend, start it in the background, and capture PID
echo "Starting frontend server..."
cd frontend
npm run dev &
FRONTEND_PID=$!
echo "Frontend started with PID: $FRONTEND_PID"
cd .. # Go back to root directory

echo "Servers restarted in background."
echo "Backend PID: $BACKEND_PID | Frontend PID: $FRONTEND_PID" 
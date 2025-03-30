#!/bin/bash

# Get the directory where the script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"

echo "Starting development servers..."

# --- Start Backend ---
echo "[Backend] Starting Node.js server..."
cd "$SCRIPT_DIR" # Ensure we are in the project root
# Start backend in the background and redirect output to a log file
node server.js > backend.log 2>&1 &
BACKEND_PID=$!
echo "[Backend] Server started with PID $BACKEND_PID. Output logged to backend.log"
sleep 2 # Give backend a moment to start

# --- Start Frontend ---
echo "[Frontend] Starting Vite dev server..."
cd "$SCRIPT_DIR/frontend" # Navigate to frontend directory
# Start frontend in the foreground (this will keep the script running)
npm run dev

# --- Cleanup (when frontend server is stopped with Ctrl+C) ---
echo "\nShutting down backend server (PID $BACKEND_PID)..."
kill $BACKEND_PID
echo "Development servers stopped." 
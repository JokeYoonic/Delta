#!/bin/bash
set -e

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "=== Delta AI Tutor - Full Stack Startup ==="

echo "[1/3] Starting backend..."
cd "$PROJECT_DIR/backend"
chmod +x start.sh
./start.sh &
BACKEND_PID=$!

echo "[2/3] Waiting for backend to be ready..."
for i in $(seq 1 30); do
    if curl -s http://localhost:8000/health > /dev/null 2>&1; then
        echo "  Backend is ready!"
        break
    fi
    if [ $i -eq 30 ]; then
        echo "  Backend startup timeout, continuing anyway..."
    fi
    sleep 1
done

echo "[3/3] Starting frontend..."
cd "$PROJECT_DIR/app"
npm run dev &
FRONTEND_PID=$!

echo ""
echo "=== Services Running ==="
echo "  Backend:  http://localhost:8000"
echo "  Frontend: http://localhost:5173"
echo "  API Docs: http://localhost:8000/docs"
echo ""
echo "Press Ctrl+C to stop all services"

cleanup() {
    echo ""
    echo "Stopping services..."
    kill $BACKEND_PID 2>/dev/null
    kill $FRONTEND_PID 2>/dev/null
    exit 0
}

trap cleanup SIGINT SIGTERM

wait

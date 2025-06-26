#!/bin/bash

# 스크립트 종료시 실행할 cleanup 함수 정의
cleanup() {
    echo "Cleaning up processes..."
    # Windows 환경에서 포트별로 프로세스 종료
    PID_3000=$(/c/Windows/System32/netstat.exe -ano | grep ":3000" | grep "LISTENING" | awk '{print $5}')
    PID_3001=$(/c/Windows/System32/netstat.exe -ano | grep ":3001" | grep "LISTENING" | awk '{print $5}')
    
    if [ ! -z "$PID_3000" ]; then
        echo "Killing process on port 3000 (PID: $PID_3000)"
        /c/Windows/System32/taskkill.exe //F //PID $PID_3000 2>/dev/null
    fi
    
    if [ ! -z "$PID_3001" ]; then
        echo "Killing process on port 3001 (PID: $PID_3001)"
        /c/Windows/System32/taskkill.exe //F //PID $PID_3001 2>/dev/null
    fi
}

# 스크립트 종료시 cleanup 함수 실행
trap cleanup EXIT

echo "Installing dependencies..."
pnpm install

echo "Starting Backend Server..."
cd apps/backend
pnpm build && pnpm start:debug &

echo "Starting Frontend Server..."
cd ../frontend
pnpm dev &

# Wait for servers to start
echo "Waiting for servers to start..."
sleep 5

# Open browser
start http://localhost:3001

echo "Servers are running. Press Ctrl+C to stop all servers and exit."
# 스크립트를 계속 실행 상태로 유지
wait
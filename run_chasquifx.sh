#!/bin/bash
# run_chasquifx_hybrid.sh
# Script to run both Python and Node.js backends in parallel

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Project root directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Check for debug mode
DEBUG=false
for arg in "$@"; do
    if [ "$arg" == "--debug" ]; then
        DEBUG=true
    fi
done

# Log file paths
LOG_DIR="${PROJECT_ROOT}/logs"
PYTHON_LOG="${LOG_DIR}/api_server.log"
NODE_LOG="${LOG_DIR}/node_server.log"

# Create logs directory if it doesn't exist
mkdir -p "$LOG_DIR"

# Function to check if a process is running
check_process() {
    local pid=$1
    if ps -p "$pid" >/dev/null; then
        return 0 # Process is running
    else
        return 1 # Process is not running
    fi
}

# Function to stop backends
stop_backends() {
    echo -e "${YELLOW}Stopping backends...${NC}"

    # Kill Python process
    if [ -n "$PYTHON_PID" ] && check_process "$PYTHON_PID"; then
        echo -e "${BLUE}Stopping Python backend (PID: $PYTHON_PID)${NC}"
        kill "$PYTHON_PID"
    fi

    # Kill Node.js process
    if [ -n "$NODE_PID" ] && check_process "$NODE_PID"; then
        echo -e "${BLUE}Stopping Node.js backend (PID: $NODE_PID)${NC}"
        kill "$NODE_PID"
    fi

    echo -e "${GREEN}ChasquiFX backends stopped.${NC}"
    exit 0
}

# Handle Ctrl+C
trap stop_backends INT TERM

# Check environment configuration
if [ ! -f "${PROJECT_ROOT}/backend/.env" ]; then
    echo -e "${RED}Error: Python backend .env file not found.${NC}"
    echo -e "${YELLOW}Create an .env file in the backend directory with the following variables:${NC}"
    echo "SERPAPI_API_KEY=your_serpapi_key"
    echo "SUPABASE_URL=your_supabase_url"
    echo "SUPABASE_KEY=your_supabase_key"
    exit 1
fi

if [ ! -f "${PROJECT_ROOT}/backend/node/.env" ]; then
    echo -e "${RED}Error: Node.js backend .env file not found.${NC}"
    echo -e "${YELLOW}Please run the setup_node_backend.sh script first.${NC}"
    exit 1
fi

# Start Python backend
echo -e "${YELLOW}Starting Python backend for data processing...${NC}"
cd "$PROJECT_ROOT" || exit 1

if [ "$DEBUG" = true ]; then
    echo -e "${BLUE}Debug mode enabled for Python backend${NC}"
    python -m uvicorn backend.api.main:app --reload --log-level debug >"$PYTHON_LOG" 2>&1 &
else
    python -m uvicorn backend.api.main:app --reload >"$PYTHON_LOG" 2>&1 &
fi

PYTHON_PID=$!
if check_process "$PYTHON_PID"; then
    echo -e "${GREEN}Python backend started with PID: $PYTHON_PID${NC}"
    echo -e "${BLUE}Python backend logs: $PYTHON_LOG${NC}"
else
    echo -e "${RED}Failed to start Python backend.${NC}"
    exit 1
fi

# Start Node.js backend
echo -e "${YELLOW}Starting Node.js backend for API handling...${NC}"
cd "${PROJECT_ROOT}/backend/node" || exit 1

if [ "$DEBUG" = true ]; then
    echo -e "${BLUE}Debug mode enabled for Node.js backend${NC}"
    NODE_ENV=development npm run dev >"$NODE_LOG" 2>&1 &
else
    npm start >"$NODE_LOG" 2>&1 &
fi

NODE_PID=$!
if check_process "$NODE_PID"; then
    echo -e "${GREEN}Node.js backend started with PID: $NODE_PID${NC}"
    echo -e "${BLUE}Node.js backend logs: $NODE_LOG${NC}"
else
    echo -e "${RED}Failed to start Node.js backend.${NC}"
    kill "$PYTHON_PID"
    exit 1
fi

echo -e "${GREEN}ChasquiFX hybrid backend is now running.${NC}"
echo -e "${YELLOW}Python backend:${NC} http://localhost:8000"
echo -e "${YELLOW}Node.js backend:${NC} http://localhost:3001"
echo -e "${BLUE}Press Ctrl+C to stop both backends${NC}"

# Keep script running until interrupted
wait

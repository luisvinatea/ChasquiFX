#!/bin/bash
# Full Integration Test Script for ChasquiFX
# This script launches both frontend and backend services and runs integration tests

# Define colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check for required tools
echo -e "${YELLOW}Checking required tools...${NC}"
MISSING_TOOLS=0

if ! command_exists node; then
    echo -e "${RED}✗ Node.js not found${NC}"
    MISSING_TOOLS=1
else
    NODE_VERSION=$(node -v)
    echo -e "${GREEN}✓ Node.js found: $NODE_VERSION${NC}"
fi

if ! command_exists npm; then
    echo -e "${RED}✗ npm not found${NC}"
    MISSING_TOOLS=1
else
    NPM_VERSION=$(npm -v)
    echo -e "${GREEN}✓ npm found: $NPM_VERSION${NC}"
fi

if ! command_exists curl; then
    echo -e "${RED}✗ curl not found${NC}"
    MISSING_TOOLS=1
else
    echo -e "${GREEN}✓ curl found${NC}"
fi

if [ $MISSING_TOOLS -eq 1 ]; then
    echo -e "${RED}Please install the missing tools and try again${NC}"
    exit 1
fi

# Define paths
REPO_ROOT=$(git rev-parse --show-toplevel 2>/dev/null || echo "$(pwd)")
BACKEND_PATH="$REPO_ROOT/backend/api"
FRONTEND_PATH="$REPO_ROOT/frontend"

# Function to start the backend server
start_backend() {
    echo -e "${YELLOW}Starting backend server...${NC}"
    cd "$BACKEND_PATH" || {
        echo -e "${RED}Failed to navigate to backend directory${NC}"
        exit 1
    }

    # Check if backend dependencies are installed
    if [ ! -d "node_modules" ]; then
        echo -e "${YELLOW}Installing backend dependencies...${NC}"
        npm install
    fi

    # Start the server in the background
    echo -e "${YELLOW}Starting Node.js server...${NC}"
    export PORT=3001
    node src/index.js >../logs/integration-test-backend.log 2>&1 &
    BACKEND_PID=$!
    echo $BACKEND_PID >/tmp/chasquifx-backend.pid

    # Give the server some time to start
    echo -e "${YELLOW}Waiting for backend to start...${NC}"
    sleep 3

    # Test if server is running
    if curl -s http://localhost:3001/health | grep -q "status"; then
        echo -e "${GREEN}✓ Backend server started successfully${NC}"
    else
        echo -e "${RED}✗ Failed to start backend server${NC}"
        kill $BACKEND_PID 2>/dev/null
        exit 1
    fi
}

# Function to start the frontend server
start_frontend() {
    echo -e "${YELLOW}Starting frontend development server...${NC}"
    cd "$FRONTEND_PATH" || {
        echo -e "${RED}Failed to navigate to frontend directory${NC}"
        exit 1
    }

    # Check if frontend dependencies are installed
    if [ ! -d "node_modules" ]; then
        echo -e "${YELLOW}Installing frontend dependencies...${NC}"
        npm install
    fi

    # Create or update the .env.local file to use localhost backend
    echo -e "${YELLOW}Configuring frontend to use local backend...${NC}"
    cat >.env.local <<EOF
# API Configuration for local development
REACT_APP_API_URL=http://localhost:3001
EOF

    # Start the React development server in the background
    echo -e "${YELLOW}Starting React development server...${NC}"
    npm start >../logs/integration-test-frontend.log 2>&1 &
    FRONTEND_PID=$!
    echo $FRONTEND_PID >/tmp/chasquifx-frontend.pid

    # Give the server some time to start
    echo -e "${YELLOW}Waiting for frontend to start...${NC}"
    sleep 10

    # Test if server is running
    if curl -s http://localhost:3000 | grep -q "React"; then
        echo -e "${GREEN}✓ Frontend server started successfully${NC}"
    else
        echo -e "${YELLOW}! Frontend status check inconclusive, but it may still be starting${NC}"
    fi
}

# Function to run the API integration tests
run_integration_tests() {
    echo -e "${YELLOW}Running integration tests...${NC}"
    cd "$BACKEND_PATH/scripts" || {
        echo -e "${RED}Failed to navigate to scripts directory${NC}"
        exit 1
    }

    # Make the test script executable
    chmod +x test-api-connection.sh

    # Run the test script
    ./test-api-connection.sh
    TEST_RESULT=$?

    if [ $TEST_RESULT -eq 0 ]; then
        echo -e "${GREEN}✓ All integration tests passed${NC}"
    else
        echo -e "${RED}✗ Some integration tests failed${NC}"
    fi
}

# Function to clean up processes on exit
cleanup() {
    echo -e "${YELLOW}Cleaning up...${NC}"

    # Stop backend server
    if [ -f /tmp/chasquifx-backend.pid ]; then
        BACKEND_PID=$(cat /tmp/chasquifx-backend.pid)
        echo -e "${YELLOW}Stopping backend server (PID: $BACKEND_PID)...${NC}"
        kill $BACKEND_PID 2>/dev/null
        rm /tmp/chasquifx-backend.pid
    fi

    # Stop frontend server
    if [ -f /tmp/chasquifx-frontend.pid ]; then
        FRONTEND_PID=$(cat /tmp/chasquifx-frontend.pid)
        echo -e "${YELLOW}Stopping frontend server (PID: $FRONTEND_PID)...${NC}"
        kill $FRONTEND_PID 2>/dev/null
        rm /tmp/chasquifx-frontend.pid
    fi

    echo -e "${GREEN}Done!${NC}"
}

# Register the cleanup function to be called on script exit
trap cleanup EXIT

# Main execution flow
echo -e "${YELLOW}==== ChasquiFX Integration Test ====${NC}"

# Create logs directory if it doesn't exist
mkdir -p "$REPO_ROOT/logs"

# Start the backend and frontend servers
start_backend
start_frontend

# Run the integration tests
run_integration_tests

# Keep the servers running until user interrupts
echo -e "${GREEN}Servers are running. Press Ctrl+C to stop.${NC}"
echo -e "${YELLOW}Frontend URL: http://localhost:3000${NC}"
echo -e "${YELLOW}Backend URL: http://localhost:3001${NC}"

# Keep script running until user interrupts
while true; do
    sleep 1
done

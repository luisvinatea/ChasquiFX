#!/bin/bash
# setup_chasquifx.sh
# Script to set up the complete ChasquiFX environment

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔══════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                                                          ║${NC}"
echo -e "${BLUE}║${YELLOW}                  ChasquiFX Setup Script                  ${BLUE}║${NC}"
echo -e "${BLUE}║                                                          ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════╝${NC}"
echo

# Project root directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Check for required commands
check_command() {
    if ! command -v "$1" &>/dev/null; then
        echo -e "${RED}Error: $1 is required but not installed.${NC}"
        exit 1
    fi
}

echo -e "${YELLOW}Checking prerequisites...${NC}"
check_command "python3"
check_command "npm"
check_command "node"
echo -e "${GREEN}Prerequisites check passed.${NC}"
echo

# Setup Python environment
setup_python() {
    echo -e "${YELLOW}Setting up Python environment...${NC}"

    # Create virtual environment if it doesn't exist
    if [ ! -d "${PROJECT_ROOT}/venv" ]; then
        echo -e "${BLUE}Creating Python virtual environment...${NC}"
        python3 -m venv "${PROJECT_ROOT}/venv"
    fi

    # Activate virtual environment
    source "${PROJECT_ROOT}/venv/bin/activate"

    # Install dependencies
    echo -e "${BLUE}Installing Python dependencies...${NC}"
    pip install --upgrade pip
    pip install -r "${PROJECT_ROOT}/requirements.txt"

    # Create environment file if it doesn't exist
    if [ ! -f "${PROJECT_ROOT}/backend/.env" ]; then
        echo -e "${BLUE}Creating Python backend .env file from template...${NC}"
        cp "${PROJECT_ROOT}/backend/.env.template" "${PROJECT_ROOT}/backend/.env"
        echo -e "${YELLOW}Please edit ${PROJECT_ROOT}/backend/.env with your API keys.${NC}"
    fi

    echo -e "${GREEN}Python environment setup complete.${NC}"
}

# Setup Node.js environment
setup_nodejs() {
    echo -e "${YELLOW}Setting up Node.js environment...${NC}"

    # Check if Node.js backend directory exists
    if [ ! -d "${PROJECT_ROOT}/backend/node" ]; then
        echo -e "${RED}Error: Node.js backend directory not found at ${PROJECT_ROOT}/backend/node${NC}"
        exit 1
    fi

    # Create environment file if it doesn't exist
    if [ ! -f "${PROJECT_ROOT}/backend/node/.env" ]; then
        echo -e "${BLUE}Creating Node.js backend .env file from template...${NC}"
        cp "${PROJECT_ROOT}/backend/node/.env.template" "${PROJECT_ROOT}/backend/node/.env"
        echo -e "${YELLOW}Please edit ${PROJECT_ROOT}/backend/node/.env with your API keys.${NC}"
    fi

    # Install dependencies
    echo -e "${BLUE}Installing Node.js dependencies...${NC}"
    cd "${PROJECT_ROOT}/backend/node" || exit 1
    npm install

    echo -e "${GREEN}Node.js environment setup complete.${NC}"
}

# Setup frontend environment
setup_frontend() {
    echo -e "${YELLOW}Setting up frontend environment...${NC}"

    # Check if frontend directory exists
    if [ ! -d "${PROJECT_ROOT}/frontend" ]; then
        echo -e "${RED}Error: Frontend directory not found at ${PROJECT_ROOT}/frontend${NC}"
        exit 1
    fi

    # Create environment file if it doesn't exist
    if [ ! -f "${PROJECT_ROOT}/frontend/.env" ]; then
        echo -e "${BLUE}Creating frontend .env file from template...${NC}"
        if [ -f "${PROJECT_ROOT}/frontend/.env.template" ]; then
            cp "${PROJECT_ROOT}/frontend/.env.template" "${PROJECT_ROOT}/frontend/.env"
        else
            # Create a basic template
            cat >"${PROJECT_ROOT}/frontend/.env" <<EOF
REACT_APP_API_URL=http://localhost:3001/api/v1
REACT_APP_SUPABASE_URL=your-supabase-url
REACT_APP_SUPABASE_ANON_KEY=your-supabase-anon-key
EOF
        fi
        echo -e "${YELLOW}Please edit ${PROJECT_ROOT}/frontend/.env with your configuration.${NC}"
    fi

    # Install dependencies
    echo -e "${BLUE}Installing frontend dependencies...${NC}"
    cd "${PROJECT_ROOT}/frontend" || exit 1
    npm install

    echo -e "${GREEN}Frontend environment setup complete.${NC}"
}

# Create logs directory
setup_logs() {
    echo -e "${YELLOW}Setting up logs directory...${NC}"
    mkdir -p "${PROJECT_ROOT}/logs"
    echo -e "${GREEN}Logs directory created.${NC}"
}

# Make scripts executable
make_scripts_executable() {
    echo -e "${YELLOW}Making scripts executable...${NC}"
    chmod +x "${PROJECT_ROOT}/run_chasquifx.sh"
    chmod +x "${PROJECT_ROOT}/run_chasquifx_hybrid.sh"
    chmod +x "${PROJECT_ROOT}/stop_chasquifx.sh"
    chmod +x "${PROJECT_ROOT}/status_chasquifx.sh"
    chmod +x "${PROJECT_ROOT}/scripts"/*.sh
    echo -e "${GREEN}Scripts are now executable.${NC}"
}

# Run setup steps
setup_python
setup_nodejs
setup_frontend
setup_logs
make_scripts_executable

echo
echo -e "${BLUE}╔══════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                                                          ║${NC}"
echo -e "${BLUE}║${GREEN}               ChasquiFX Setup Complete!                  ${BLUE}║${NC}"
echo -e "${BLUE}║                                                          ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════╝${NC}"
echo
echo -e "${YELLOW}To start the application:${NC}"
echo -e "  ${GREEN}./run_chasquifx_hybrid.sh${NC}"
echo
echo -e "${YELLOW}Remember to configure your environment variables in:${NC}"
echo -e "  ${BLUE}- backend/.env${NC}"
echo -e "  ${BLUE}- backend/node/.env${NC}"
echo -e "  ${BLUE}- frontend/.env${NC}"
echo
echo -e "${YELLOW}Thank you for using ChasquiFX!${NC}"

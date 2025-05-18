#!/bin/bash

# ChasquiFX Status Script
# This script checks the status of ChasquiFX services
# Created: May 12, 2025

# Function to display colorful messages
print_message() {
    local color=$1
    local message=$2
    case $color in
    "green") echo -e "\e[32m$message\e[0m" ;;
    "yellow") echo -e "\e[33m$message\e[0m" ;;
    "red") echo -e "\e[31m$message\e[0m" ;;
    "blue") echo -e "\e[34m$message\e[0m" ;;
    *) echo -e "$message" ;;
    esac
}

print_message "blue" "
╔══════════════════════════════════════════════════╗
║           ChasquiFX Services Status           ║
╚══════════════════════════════════════════════════╝
"

# Check API server status
API_PIDS=$(pgrep -f "python.*backend/api/main.py")
if [ -z "$API_PIDS" ]; then
    print_message "red" "✗ API Server: NOT RUNNING"
    API_STATUS="STOPPED"
else
    print_message "green" "✓ API Server: RUNNING (PID: $API_PIDS)"
    API_STATUS="RUNNING"

    # Try to check if API is responding
    if command -v curl &>/dev/null; then
        if curl -s http://localhost:8000/ &>/dev/null; then
            print_message "green" "  API is responding at http://localhost:8000/"
        else
            print_message "yellow" "  API is running but not responding at http://localhost:8000/"
        fi
    fi
fi

# Check React frontend status (check both development and production servers)
REACT_PIDS=$(pgrep -f "node.*react-scripts start")
SERVE_PIDS=$(pgrep -f "node.*serve -s build")

if [ -z "$REACT_PIDS" ] && [ -z "$SERVE_PIDS" ]; then
    print_message "red" "✗ React Frontend: NOT RUNNING"
    FRONTEND_STATUS="STOPPED"
else
    if [ ! -z "$REACT_PIDS" ]; then
        print_message "green" "✓ React Frontend (Development): RUNNING (PID: $REACT_PIDS)"
    fi
    if [ ! -z "$SERVE_PIDS" ]; then
        print_message "green" "✓ React Frontend (Production): RUNNING (PID: $SERVE_PIDS)"
    fi
    FRONTEND_STATUS="RUNNING"

    # Try to check if the app is responding on common ports
    APP_PORTS="3000 40863"
    APP_RESPONDING=false

    for PORT in $APP_PORTS; do
        if command -v curl &>/dev/null; then
            if curl -s http://localhost:$PORT/ &>/dev/null; then
                print_message "green" "  Frontend app is responding at http://localhost:$PORT/"
                APP_RESPONDING=true
                break
            fi
        fi
    done

    if [ "$APP_RESPONDING" = false ]; then
        print_message "yellow" "  Frontend appears to be running but not responding on common ports."
    fi
fi

# Summary
echo ""
if [ "$API_STATUS" = "RUNNING" ] && [ "$FRONTEND_STATUS" = "RUNNING" ]; then
    print_message "green" "All ChasquiFX services are running."
elif [ "$API_STATUS" = "STOPPED" ] && [ "$FRONTEND_STATUS" = "STOPPED" ]; then
    print_message "red" "All ChasquiFX services are stopped."
    print_message "yellow" "Run './run_ChasquiFX.sh' to start all services."
else
    print_message "yellow" "Some ChasquiFX services are not running properly."

    if [ "$API_STATUS" = "STOPPED" ]; then
        print_message "yellow" "To start the API server: 'python backend/api/main.py'"
    fi

    if [ "$FRONTEND_STATUS" = "STOPPED" ]; then
        print_message "yellow" "To start the React frontend: 'cd frontend && npm start'"
        print_message "yellow" "Or to serve the production build: 'cd frontend && npx serve -s build'"
    fi

    print_message "yellow" "Or run './run_chasquifx.sh' to start all services."
fi

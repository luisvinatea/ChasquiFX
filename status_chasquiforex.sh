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

# Check Streamlit app status
STREAMLIT_PIDS=$(pgrep -f "streamlit.*ChasquiFX.py")
if [ -z "$STREAMLIT_PIDS" ]; then
    print_message "red" "✗ Streamlit App: NOT RUNNING"
    STREAMLIT_STATUS="STOPPED"
else
    print_message "green" "✓ Streamlit App: RUNNING (PID: $STREAMLIT_PIDS)"
    STREAMLIT_STATUS="RUNNING"
    print_message "green" "  App available at http://localhost:8501/"
fi

# Summary
echo ""
if [ "$API_STATUS" = "RUNNING" ] && [ "$STREAMLIT_STATUS" = "RUNNING" ]; then
    print_message "green" "All ChasquiFX services are running."
elif [ "$API_STATUS" = "STOPPED" ] && [ "$STREAMLIT_STATUS" = "STOPPED" ]; then
    print_message "red" "All ChasquiFX services are stopped."
    print_message "yellow" "Run './run_ChasquiFX.sh' to start all services."
else
    print_message "yellow" "Some ChasquiFX services are not running properly."

    if [ "$API_STATUS" = "STOPPED" ]; then
        print_message "yellow" "To start the API server: 'python backend/api/main.py'"
    fi

    if [ "$STREAMLIT_STATUS" = "STOPPED" ]; then
        print_message "yellow" "To start the Streamlit app: 'streamlit run frontend/ChasquiFX.py'"
    fi

    print_message "yellow" "Or run './run_ChasquiFX.sh' to start all services."
fi

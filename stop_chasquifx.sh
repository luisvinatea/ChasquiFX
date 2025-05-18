#!/bin/bash

# ChasquiFX Stop Script
# This script stops both the FastAPI backend and Streamlit frontend
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
║           Stopping ChasquiFX Services            ║
╚══════════════════════════════════════════════════╝
"

# Find and stop API server (Python process running main.py)
API_PIDS=$(pgrep -f "python.*backend/api/main.py")
if [ -z "$API_PIDS" ]; then
    print_message "yellow" "No API server processes found."
else
    for PID in $API_PIDS; do
        kill "$PID" 2>/dev/null
        if [ $? -eq 0 ]; then
            print_message "green" "✓ Stopped API server process with PID: $PID"
        else
            print_message "red" "✗ Failed to stop API server process with PID: $PID"
        fi
    done
fi

# Find and stop React frontend app (both via react-scripts and serve)
REACT_PIDS=$(pgrep -f "node.*react-scripts start")
SERVE_PIDS=$(pgrep -f "node.*serve -s build")

if [ -z "$REACT_PIDS" ] && [ -z "$SERVE_PIDS" ]; then
    print_message "yellow" "No React frontend processes found."
else
    # Stop react-scripts processes
    for PID in $REACT_PIDS; do
        kill $PID 2>/dev/null
        if [ $? -eq 0 ]; then
            print_message "green" "✓ Stopped React frontend process with PID: $PID"
        else
            print_message "red" "✗ Failed to stop React frontend process with PID: $PID"
        fi
    done

    # Stop serve processes
    for PID in $SERVE_PIDS; do
        kill $PID 2>/dev/null
        if [ $? -eq 0 ]; then
            print_message "green" "✓ Stopped 'serve' frontend process with PID: $PID"
        else
            print_message "red" "✗ Failed to stop 'serve' frontend process with PID: $PID"
        fi
    done
fi

# Also kill any processes on port 3000
if lsof -i :3000 >/dev/null 2>&1; then
    print_message "yellow" "Killing processes on port 3000..."
    fuser -k 3000/tcp >/dev/null 2>&1
    if [ $? -eq 0 ]; then
        print_message "green" "✓ Killed processes on port 3000"
    else
        print_message "red" "✗ Failed to kill processes on port 3000"
    fi
fi

print_message "blue" "
╔══════════════════════════════════════════════════╗
║       ChasquiFX Services Stopped                 ║
╚══════════════════════════════════════════════════╝
"

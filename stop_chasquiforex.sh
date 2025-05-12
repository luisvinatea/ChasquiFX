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
║           Stopping ChasquiFX Services         ║
╚══════════════════════════════════════════════════╝
"

# Find and stop API server (Python process running main.py)
API_PIDS=$(pgrep -f "python.*backend/api/main.py")
if [ -z "$API_PIDS" ]; then
    print_message "yellow" "No API server processes found."
else
    for PID in $API_PIDS; do
        kill $PID 2>/dev/null
        if [ $? -eq 0 ]; then
            print_message "green" "✓ Stopped API server process with PID: $PID"
        else
            print_message "red" "✗ Failed to stop API server process with PID: $PID"
        fi
    done
fi

# Find and stop Streamlit app
STREAMLIT_PIDS=$(pgrep -f "streamlit.*ChasquiFX.py")
if [ -z "$STREAMLIT_PIDS" ]; then
    print_message "yellow" "No Streamlit processes found."
else
    for PID in $STREAMLIT_PIDS; do
        kill $PID 2>/dev/null
        if [ $? -eq 0 ]; then
            print_message "green" "✓ Stopped Streamlit process with PID: $PID"
        else
            print_message "red" "✗ Failed to stop Streamlit process with PID: $PID"
        fi
    done
fi

print_message "blue" "
╔══════════════════════════════════════════════════╗
║       ChasquiFX Services Stopped              ║
╚══════════════════════════════════════════════════╝
"

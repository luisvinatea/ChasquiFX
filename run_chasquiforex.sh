#!/bin/bash

# ChasquiFX Launcher Script
# This script launches both the FastAPI backend and Streamlit frontend
# Created: May 12, 2025

# Set the project root directory
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_ROOT" || exit

# Create log directory if it doesn't exist
mkdir -p logs

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

# Welcome message
print_message "blue" "
╔══════════════════════════════════════════════════╗
║             ChasquiFX Launcher                ║
║        Start both API server and Frontend        ║
╚══════════════════════════════════════════════════╝
"

# Define the stop function that will be called when the script is terminated
stop_services() {
    print_message "yellow" "Stopping ChasquiFX services..."
    if [ ! -z "$API_PID" ] && ps -p $API_PID >/dev/null; then
        kill $API_PID
        print_message "yellow" "API server stopped."
    fi
    if [ ! -z "$STREAMLIT_PID" ] && ps -p $STREAMLIT_PID >/dev/null; then
        kill $STREAMLIT_PID
        print_message "yellow" "Streamlit app stopped."
    fi
    print_message "green" "ChasquiFX shutdown complete."
    exit 0
}

# Set up trap to catch SIGINT (Ctrl+C) and SIGTERM
trap stop_services SIGINT SIGTERM

# Start the FastAPI server
print_message "green" "Starting API server..."
python backend/api/main.py >logs/api_server.log 2>&1 &
API_PID=$!

# Wait a moment to let the API server start
sleep 3

# Check if API server started successfully
if ps -p $API_PID >/dev/null; then
    print_message "green" "✓ API server running with PID: $API_PID"
    print_message "yellow" "API logs: tail -f logs/api_server.log"
else
    print_message "red" "✗ Failed to start API server. Check logs/api_server.log for details."
    exit 1
fi

# Start the Streamlit app
print_message "green" "Starting Streamlit app..."
streamlit run frontend/ChasquiFX.py >logs/streamlit_app.log 2>&1 &
STREAMLIT_PID=$!

# Wait a moment to let the Streamlit server start
sleep 3

# Check if Streamlit app started successfully
if ps -p $STREAMLIT_PID >/dev/null; then
    print_message "green" "✓ Streamlit app running with PID: $STREAMLIT_PID"
    print_message "green" "Access the app at: http://localhost:8501"
    print_message "yellow" "Streamlit logs: tail -f logs/streamlit_app.log"
else
    print_message "red" "✗ Failed to start Streamlit app. Check logs/streamlit_app.log for details."
    kill $API_PID
    exit 1
fi

print_message "blue" "
╔══════════════════════════════════════════════════╗
║           ChasquiFX is now running!           ║
║                                                  ║
║   API URL: http://localhost:8000                 ║
║   API Docs: http://localhost:8000/docs           ║
║   App URL: http://localhost:8501                 ║
║                                                  ║
║   Press CTRL+C to stop all services              ║
╚══════════════════════════════════════════════════╝
"

# Keep the script running to maintain control of the processes
while true; do
    # Check if API server is still running
    if ! ps -p $API_PID >/dev/null; then
        print_message "red" "API server has stopped unexpectedly!"
        stop_services
    fi

    # Check if Streamlit app is still running
    if ! ps -p $STREAMLIT_PID >/dev/null; then
        print_message "red" "Streamlit app has stopped unexpectedly!"
        stop_services
    fi

    # Wait before checking again
    sleep 5
done

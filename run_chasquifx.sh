#!/bin/bash

# ChasquiFX Launcher Script
# This script launches both the FastAPI backend and Streamlit frontend
# Created: May 12, 2025

# Set the project root directory
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_ROOT" || exit

# Create log directory if it doesn't exist
mkdir -p logs

# Check if .env file exists
ENV_FILE="$PROJECT_ROOT/backend/.env"
if [ ! -f "$ENV_FILE" ]; then
    echo "Warning: .env file not found at $ENV_FILE"

    # Check if we need to create a default .env file
    read -r -p "Would you like to create a default .env file? [y/N] " create_env
    if [[ "$create_env" =~ ^[Yy]$ ]]; then
        echo "Creating default .env file..."
        cat >"$ENV_FILE" <<EOF
# ChasquiFX Environment Variables
# Add your API keys below

# SerpAPI Key for Google Finance data (required for forex)
SERPAPI_API_KEY=your_serpapi_key_here

# Amadeus API Keys (required for flight data)
AMADEUS_API_KEY=your_amadeus_key_here
AMADEUS_API_SECRET=your_amadeus_secret_here
EOF
        echo "Default .env file created at $ENV_FILE"
        echo "Please edit the file and add your API keys before running the application."
        exit 1
    fi
fi

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

# Function to check required environment variables
check_environment() {
    local all_keys_present=true

    # Source the .env file to check variables
    # shellcheck source=backend/.env
    if [ -f "$ENV_FILE" ]; then
        # shellcheck disable=SC1091
        source "$ENV_FILE"
    fi

    # Check SerpAPI key
    if [ -z "$SERPAPI_API_KEY" ] || [ "$SERPAPI_API_KEY" = "your_serpapi_key_here" ]; then
        print_message "red" "⚠️ SERPAPI_API_KEY is missing or using default value!"
        print_message "yellow" "   Forex data will use synthetic/fallback values."
        all_keys_present=false
    else
        print_message "green" "✓ SERPAPI_API_KEY is configured."
    fi

    # Check Amadeus keys
    if [ -z "$AMADEUS_API_KEY" ] || [ "$AMADEUS_API_KEY" = "your_amadeus_key_here" ]; then
        print_message "red" "⚠️ AMADEUS_API_KEY is missing or using default value!"
        print_message "yellow" "   Flight data may be unavailable."
        all_keys_present=false
    else
        print_message "green" "✓ AMADEUS_API_KEY is configured."
    fi

    if [ -z "$AMADEUS_API_SECRET" ] || [ "$AMADEUS_API_SECRET" = "your_amadeus_secret_here" ]; then
        print_message "red" "⚠️ AMADEUS_API_SECRET is missing or using default value!"
        print_message "yellow" "   Flight data may be unavailable."
        all_keys_present=false
    else
        print_message "green" "✓ AMADEUS_API_SECRET is configured."
    fi

    # Return overall status
    if [ "$all_keys_present" = false ]; then
        print_message "yellow" "Not all API keys are properly configured."
        print_message "yellow" "You can update them in $ENV_FILE"
        sleep 2
    fi
}

# Welcome message
print_message "blue" "
╔══════════════════════════════════════════════════╗
║             ChasquiFX Launcher                   ║
║        Start both API server and Frontend        ║
╚══════════════════════════════════════════════════╝
"

# Check environment variables
check_environment

# Define the stop function that will be called when the script is terminated
stop_services() {
    print_message "yellow" "Stopping ChasquiFX services..."
    if [ -n "$API_PID" ] && ps -p $API_PID >/dev/null; then
        kill $API_PID
        print_message "yellow" "API server stopped."
    fi
    if [ -n "$STREAMLIT_PID" ] && ps -p "$STREAMLIT_PID" >/dev/null; then
        kill "$STREAMLIT_PID"
        print_message "yellow" "Streamlit app stopped."
    fi
    print_message "green" "ChasquiFX shutdown complete."
    exit 0
}

# Set up trap to catch SIGINT (Ctrl+C) and SIGTERM
trap stop_services SIGINT SIGTERM

# Start the FastAPI server
print_message "green" "Starting API server..."
"$PROJECT_ROOT/.venv/bin/python" -m uvicorn backend.api.main:app --host 0.0.0.0 --port 8000 >logs/api_server.log 2>&1 &
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

# Start the React frontend
print_message "green" "Starting React frontend..."
cd "$PROJECT_ROOT/frontend" && npm start >../logs/react_app.log 2>&1 &
REACT_PID=$!

# Wait a moment to let the React server start
sleep 5

# Check if React app started successfully
if ps -p $REACT_PID >/dev/null; then
    print_message "green" "✓ React frontend running with PID: $REACT_PID"
    print_message "green" "Access the app at: http://localhost:3000"
    print_message "yellow" "React logs: tail -f logs/react_app.log"
else
    print_message "red" "✗ Failed to start React frontend. Check logs/react_app.log for details."
    kill $API_PID
    exit 1
fi

print_message "blue" "
╔══════════════════════════════════════════════════╗
║           ChasquiFX is now running!              ║
║                                                  ║
║   API URL: http://localhost:8000                 ║
║   API Docs: http://localhost:8000/docs           ║
║   React App URL: http://localhost:3000           ║
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
    if ! ps -p "$STREAMLIT_PID" >/dev/null; then
        print_message "red" "Streamlit app has stopped unexpectedly!"
        stop_services
    fi

    # Wait before checking again
    sleep 5
done

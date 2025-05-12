#!/bin/bash

# ChasquiFX Installation Script
# This script sets up the ChasquiFX application and its dependencies
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

# Welcome message
print_message "blue" "
╔══════════════════════════════════════════════════╗
║         ChasquiFX Installation Setup          ║
╚══════════════════════════════════════════════════╝
"

# Set the project root directory
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_ROOT" || exit

print_message "yellow" "Setting up ChasquiFX in: $PROJECT_ROOT"

# Check Python version
python_version=$(python --version 2>&1)
if [[ "$python_version" == *"Python 3"* ]]; then
    print_message "green" "✓ Found Python: $python_version"
else
    print_message "red" "✗ Python 3.8+ is required but not found."
    print_message "yellow" "Please install Python 3.8 or higher and try again."
    exit 1
fi

# Create virtual environment if it doesn't exist
if [ ! -d ".ChasquiFX" ]; then
    print_message "yellow" "Creating virtual environment..."
    if ! python -m venv .ChasquiFX; then
        print_message "red" "✗ Failed to create virtual environment."
        print_message "yellow" "Try installing python3-venv package and run this script again."
        exit 1
    fi
    print_message "green" "✓ Virtual environment created."
else
    print_message "green" "✓ Virtual environment already exists."
fi

# Activate virtual environment
print_message "yellow" "Activating virtual environment..."
# shellcheck source=.ChasquiFX/bin/activate
source .chasquifx/bin/activate
if [ $? -ne 0 ]; then
    print_message "red" "✗ Failed to activate virtual environment."
    exit 1
fi
print_message "green" "✓ Virtual environment activated."

# Install dependencies
print_message "yellow" "Installing dependencies..."
if [ -f "requirements.txt" ]; then
    pip install -r requirements.txt
    if [ $? -ne 0 ]; then
        print_message "red" "✗ Failed to install dependencies."
        exit 1
    fi
    print_message "green" "✓ Dependencies installed successfully."
else
    print_message "yellow" "No requirements.txt found. Installing core dependencies..."
    pip install fastapi uvicorn pandas streamlit plotly folium streamlit-folium serpapi google-search-results python-dotenv
    if [ $? -ne 0 ]; then
        print_message "red" "✗ Failed to install core dependencies."
        exit 1
    fi
    print_message "green" "✓ Core dependencies installed successfully."
fi

# Create necessary directories
print_message "yellow" "Creating necessary directories..."
mkdir -p logs frontend/assets backend/assets/data/{forex,geo}/{json,parquet}

# Make scripts executable
print_message "yellow" "Making launcher scripts executable..."
chmod +x run_chasquifx.sh stop_chasquifx.sh status_chasquifx.sh
chmod +x ChasquiFX.desktop
# Create desktop shortcut
print_message "yellow" "Setting up desktop shortcut..."
if [ -d "$HOME/.local/share/applications" ]; then
    cp ChasquiFX.desktop "$HOME/.local/share/applications/"
    if [ $? -eq 0 ]; then
        print_message "green" "✓ Desktop shortcut installed."
    else
        print_message "yellow" "Could not install desktop shortcut automatically."
        print_message "yellow" "You can manually copy ChasquiFX.desktop to ~/.local/share/applications/"
    fi
else
    print_message "yellow" "Desktop shortcut directory not found. Skipping."
fi

print_message "blue" "
╔══════════════════════════════════════════════════╗
║          Installation Complete!                  ║
║                                                  ║
║   To start ChasquiFX, run:                    ║
║   ./run_ChasquiFX.sh                          ║
║                                                  ║
╚══════════════════════════════════════════════════╝
"

# Offer to run the application
read -p "Would you like to start ChasquiFX now? (y/n): " start_now
if [[ $start_now == "y" || $start_now == "Y" ]]; then
    ./run_ChasquiFX.sh
else
    print_message "green" "You can start ChasquiFX later using ./run_ChasquiFX.sh"
fi

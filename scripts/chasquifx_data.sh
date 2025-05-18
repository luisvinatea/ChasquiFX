#!/bin/bash
# ChasquiFX Data Processing Script
# This script serves as an entry point to the data processing utilities

# Get the script's directory (project root)
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/.."

# Add the backend directory to PYTHONPATH
export PYTHONPATH="${PROJECT_ROOT}:${PYTHONPATH}"

# Display help information
function show_help {
    echo "ChasquiFX Data Processing Utility"
    echo ""
    echo "Usage: ./chasquifx_data.sh [command] [options]"
    echo ""
    echo "Commands:"
    echo "  rename-flights   Rename flight JSON files to standardized format"
    echo "  rename-forex     Rename forex JSON files to standardized format"
    echo "  convert          Convert a single JSON file to Parquet format"
    echo "  mirror           Mirror JSON files to Parquet format"
    echo "  mirror-all       Mirror all data directories to Parquet format"
    echo "  help             Show this help message"
    echo ""
    echo "Examples:"
    echo "  ./chasquifx_data.sh rename-flights"
    echo "  ./chasquifx_data.sh rename-forex"
    echo "  ./chasquifx_data.sh convert --json-file path/to/file.json --parquet-file path/to/output.parquet"
    echo "  ./chasquifx_data.sh mirror --dir path/to/json/dir"
    echo "  ./chasquifx_data.sh mirror-all"
    echo ""
}

# Check if a command is provided
if [ $# -eq 0 ]; then
    show_help
    exit 0
fi

# Process the command
COMMAND=$1
shift

case $COMMAND in
rename-flights)
    echo "Renaming flight JSON files..."
    python -m backend.api.data_processing.cli rename-flights "$@"
    ;;
rename-forex)
    echo "Renaming forex JSON files..."
    python -m backend.api.data_processing.cli rename-forex "$@"
    ;;
convert)
    echo "Converting JSON to Parquet..."
    python -m backend.api.data_processing.cli convert "$@"
    ;;
mirror)
    echo "Mirroring JSON to Parquet..."
    python -m backend.api.data_processing.cli mirror "$@"
    ;;
mirror-all)
    echo "Mirroring all data directories..."
    python -m backend.api.data_processing.cli mirror-all "$@"
    ;;
help)
    show_help
    ;;
*)
    echo "Error: Unknown command '$COMMAND'"
    show_help
    exit 1
    ;;
esac

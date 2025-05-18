#!/bin/bash
# Legacy script wrapper
# This script redirects calls to the old scripts to the unified CLI

echo "⚠️ Warning: This script is deprecated. Please use ./scripts/chasquifx_data.sh instead."
echo "Redirecting to the new unified CLI..."
echo ""

# Get the script's directory
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/.."
SCRIPT_NAME=$(basename "$0")

case "$SCRIPT_NAME" in
rename_flight_jsons.sh)
    echo "Redirecting to: ./chasquifx_data.sh rename-flights $*"
    "$PROJECT_ROOT/scripts/chasquifx_data.sh" rename-flights "$@"
    ;;
rename_forex_jsons.sh)
    echo "Redirecting to: ./chasquifx_data.sh rename-forex $*"
    "$PROJECT_ROOT/scripts/chasquifx_data.sh" rename-forex "$@"
    ;;
mirror_json_to_parquet.sh)
    echo "Redirecting to: ./chasquifx_data.sh mirror-all $*"
    "$PROJECT_ROOT/scripts/chasquifx_data.sh" mirror-all "$@"
    ;;
*)
    echo "Error: Unknown legacy script '$SCRIPT_NAME'"
    echo "Please use the new unified CLI: ./scripts/chasquifx_data.sh"
    exit 1
    ;;
esac

# Print message about the new CLI
echo ""
echo "ℹ️ The legacy scripts are deprecated and will be removed in a future version."
echo "Please use the unified CLI instead: ./scripts/chasquifx_data.sh"
echo "For help, run: ./scripts/chasquifx_data.sh help"

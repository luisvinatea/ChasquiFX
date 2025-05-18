#!/bin/bash

# This script runs the JSON to Parquet mirroring process
# which converts all JSON files in the data directories to Parquet format

# Get the script's directory (project root)
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Set PYTHONPATH to include the script directory for imports
export PYTHONPATH="${PROJECT_ROOT}/backend/api/utils:${PYTHONPATH}"

echo "Converting all JSON files to Parquet..."

# Process each data directory directly from the shell script
echo "Processing flights data..."
python -c "
import sys
sys.path.insert(0, '${PROJECT_ROOT}/backend/api/utils')
from json_to_parquet import batch_convert_directory
batch_convert_directory('${PROJECT_ROOT}/backend/assets/data/flights/json', True)
"

echo "Processing forex data..."
python -c "
import sys
sys.path.insert(0, '${PROJECT_ROOT}/backend/api/utils')
from json_to_parquet import batch_convert_directory
batch_convert_directory('${PROJECT_ROOT}/backend/assets/data/forex/json', True)
"

echo "Processing geo data..."
python -c "
import sys
sys.path.insert(0, '${PROJECT_ROOT}/backend/api/utils')
from json_to_parquet import batch_convert_directory
batch_convert_directory('${PROJECT_ROOT}/backend/assets/data/geo/json', True)
"

echo "Conversion completed!"

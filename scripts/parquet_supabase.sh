#!/bin/bash
# Parquet file Supabase integration script
# This script uploads Parquet files to Supabase storage

# Get the script's directory (project root)
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/.."

# Add the backend directory to PYTHONPATH
export PYTHONPATH="${PROJECT_ROOT}:${PYTHONPATH}"

# Check if command is provided
if [[ $# -lt 1 ]]; then
    echo "Usage: $0 [command] [options]"
    echo ""
    echo "Commands:"
    echo "  sync         Sync all parquet files with Supabase"
    echo "  upload       Upload a specific file to Supabase"
    echo "  list         List files in Supabase storage"
    echo ""
    echo "Examples:"
    echo "  $0 sync --data-type flights"
    echo "  $0 upload path/to/file.parquet"
    echo "  $0 list --data-type forex"
    echo ""
    exit 1
fi

COMMAND=$1
shift

case $COMMAND in
sync)
    echo "Syncing Parquet files with Supabase..."
    python -m backend.api.scripts.sync_parquet_files "$@"
    ;;
upload)
    if [[ $# -lt 1 ]]; then
        echo "Error: Please provide a file path"
        echo "Usage: $0 upload path/to/file.parquet"
        exit 1
    fi
    echo "Uploading file to Supabase: $1"
    python -c "
import asyncio
import sys
sys.path.insert(0, '${PROJECT_ROOT}')
from backend.api.db.parquet_storage import upload_parquet_file

async def upload():
    result = await upload_parquet_file('$1')
    if result:
        print(f'Successfully uploaded {result.file_key}')
        return 0
    else:
        print('Upload failed')
        return 1
        
sys.exit(asyncio.run(upload()))
"
    ;;
list)
    echo "Listing files in Supabase..."
    python -c "
import asyncio
import sys
import json
sys.path.insert(0, '${PROJECT_ROOT}')
from backend.api.db.parquet_storage import list_parquet_files

async def list_files():
    data_type = None
    for i, arg in enumerate(sys.argv[1:]):
        if arg == '--data-type' and i+1 < len(sys.argv[1:]):
            data_type = sys.argv[i+2]
    
    files = await list_parquet_files(data_type)
    
    print(f'Found {len(files)} files:')
    for f in files:
        print(f' - {f.file_key} ({f.file_size} bytes)')
    
    return 0
        
sys.exit(asyncio.run(list_files()))
" "$@"
    ;;
*)
    echo "Error: Unknown command '$COMMAND'"
    echo "Usage: $0 [sync|upload|list] [options]"
    exit 1
    ;;
esac

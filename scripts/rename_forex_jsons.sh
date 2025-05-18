#!/bin/bash

# Rename forex JSON files based on search parameters and metadata
# Pattern: (q)_(created_at).json
# Example: EUR-USD_2025-05-18-02-33-10.json

# Get the script's directory (project root)
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
JSON_DIR="${PROJECT_ROOT}/backend/assets/data/forex/json"

echo "Processing forex JSON files in: $JSON_DIR"

# Counter for renamed files
renamed_count=0
skipped_count=0

# Check each JSON file in the directory
for json_file in "$JSON_DIR"/*.json; do
    filename=$(basename "$json_file")
    
    # Skip if filename already matches pattern with timestamp (q)_(created_at).json
    if [[ $filename =~ ^[A-Z]{3}-[A-Z]{3}_[0-9]{4}-[0-9]{2}-[0-9]{2}-[0-9]{2}-[0-9]{2}-[0-9]{2}\.json$ ]]; then
        echo "Skipping $filename - already follows the naming pattern"
        ((skipped_count++))
        continue
    fi
    
    # Extract search parameters and metadata using jq
    if ! command -v jq &> /dev/null; then
        echo "Error: jq is not installed. Please install it with: sudo apt install jq"
        exit 1
    fi
    
    # Get currency pair (q) from search_parameters
    currency_pair=$(jq -r '.search_parameters.q' "$json_file")
    
    # Get created_at from search_metadata and format it
    created_at=$(jq -r '.search_metadata.created_at' "$json_file")
    
    # Format created_at (2025-05-18 02:33:10 UTC -> 2025-05-18-02-33-10)
    formatted_date=$(echo "$created_at" | sed 's/ /-/g' | sed 's/:/-/g' | cut -d'-' -f1-6)
    
    # Ensure all required parameters are present
    if [[ "$currency_pair" == "null" || "$formatted_date" == "null" ]]; then
        echo "Warning: Missing parameters in $filename - skipping"
        echo "  currency_pair: $currency_pair"
        echo "  formatted_date: $formatted_date"
        ((skipped_count++))
        continue
    fi
    
    # Construct new filename
    new_filename="${currency_pair}_${formatted_date}.json"
    new_path="$JSON_DIR/$new_filename"
    
    # Rename the file
    if [ "$filename" != "$new_filename" ]; then
        mv "$json_file" "$new_path"
        echo "Renamed: $filename -> $new_filename"
        ((renamed_count++))
    else
        echo "Skipping $filename - already has the correct name"
        ((skipped_count++))
    fi
done

echo "Renaming complete!"
echo "Files renamed: $renamed_count"
echo "Files skipped: $skipped_count"

#!/bin/bash

# Rename flight JSON files based on search parameters
# Pattern: (departure_id)_(arrival_id)_(outbound_date)_(return_date).json

# Get the script's directory (project root)
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
JSON_DIR="${PROJECT_ROOT}/backend/assets/data/flights/json"

echo "Processing JSON files in: $JSON_DIR"

# Counter for renamed files
renamed_count=0
skipped_count=0

# Check each JSON file in the directory
for json_file in "$JSON_DIR"/*.json; do
    filename=$(basename "$json_file")

    # Skip if filename already matches pattern with dates
    if [[ $filename =~ ^[A-Z]{3}_[A-Z]{3}_[0-9]{4}-[0-9]{2}-[0-9]{2}_[0-9]{4}-[0-9]{2}-[0-9]{2}\.json$ ]]; then
        echo "Skipping $filename - already follows the naming pattern"
        ((skipped_count++))
        continue
    fi

    # Extract search parameters using jq
    if ! command -v jq &>/dev/null; then
        echo "Error: jq is not installed. Please install it with: sudo apt install jq"
        exit 1
    fi

    departure_id=$(jq -r '.search_parameters.departure_id' "$json_file")
    arrival_id=$(jq -r '.search_parameters.arrival_id' "$json_file")
    outbound_date=$(jq -r '.search_parameters.outbound_date' "$json_file")
    return_date=$(jq -r '.search_parameters.return_date' "$json_file")

    # Ensure all required parameters are present
    if [[ "$departure_id" == "null" || "$arrival_id" == "null" ||
        "$outbound_date" == "null" || "$return_date" == "null" ]]; then
        echo "Warning: Missing parameters in $filename - skipping"
        echo "  departure_id: $departure_id"
        echo "  arrival_id: $arrival_id"
        echo "  outbound_date: $outbound_date"
        echo "  return_date: $return_date"
        ((skipped_count++))
        continue
    fi

    # Construct new filename
    new_filename="${departure_id}_${arrival_id}_${outbound_date}_${return_date}.json"
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

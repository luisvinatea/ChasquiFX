# ChasquiFX Data Processing Utilities

This module contains utilities for processing data files used throughout the ChasquiFX system.

## Features

- Standardized file naming for flight and forex data
- Conversion of JSON files to Parquet format
- Directory structure mirroring with file format conversion
- Command-line interface for data processing operations

## Components

- `cli.py`: Command-line interface for all data processing operations
- `json_parquet_converter.py`: Utilities for converting JSON files to Parquet format
- `file_renamer.py`: Tools for standardizing and renaming data files
- `mirror_utility.py`: Utilities for mirroring directory structures

## Command Line Usage

The module provides a unified command-line interface through the `chasquifx_data.sh` script:

```bash
# Display help
./scripts/chasquifx_data.sh help

# Rename flight JSON files
./scripts/chasquifx_data.sh rename-flights

# Rename forex JSON files
./scripts/chasquifx_data.sh rename-forex

# Convert a single JSON file to Parquet
./scripts/chasquifx_data.sh convert --json-file path/to/file.json --parquet-file path/to/output.parquet

# Mirror all JSON files to Parquet format
./scripts/chasquifx_data.sh mirror-all

# Mirror a specific data directory
./scripts/chasquifx_data.sh mirror --dir path/to/json/dir
```

## Library Usage

### Simple Imports

The module is designed for easy import of commonly used functions:

```python
from backend.api.data_processing import (
    json_to_parquet,
    rename_directory_files,
    process_standard_data_directories
)

# Convert a single file
json_to_parquet('path/to/input.json', 'path/to/output.parquet')

# Rename files in a directory
rename_directory_files(
    directory="path/to/directory",
    metadata_keys=["search_parameters.q", "search_metadata.created_at"],
    filename_template="{q}_{created_at}"
)

# Mirror all standard data directories
process_standard_data_directories()
```

### File Renaming

The module provides specialized functions for renaming files based on their metadata:

```python
from backend.api.data_processing import (
    get_flight_renaming_config,
    get_forex_renaming_config,
    rename_directory_files
)

# Rename flight files
config = get_flight_renaming_config()
rename_directory_files(
    directory="path/to/flights",
    metadata_keys=config["metadata_keys"],
    filename_template=config["template"]
)

# Rename forex files
config = get_forex_renaming_config()
rename_directory_files(
    directory="path/to/forex",
    metadata_keys=config["metadata_keys"],
    filename_template=config["template"]
)
```

### Advanced JSON to Parquet Conversion

For handling complex nested JSON structures:

```python
from backend.api.data_processing import (
    json_to_parquet,
    flatten_json,
    batch_convert_directory
)

# Convert a directory of JSON files
batch_convert_directory("path/to/json/files", recursive=True)

# Manually flatten and process a nested JSON structure
with open("complex.json", "r") as f:
    data = json.load(f)

flattened = flatten_json(data)
```

## File Naming Conventions

### Flight JSON Files

Pattern: `(departure_id)_(arrival_id)_(outbound_date)_(return_date).json`
Example: `JFK_LHR_2025-06-15_2025-06-22.json`

### Forex JSON Files

Pattern: `(q)_(created_at).json`
Example: `EUR-USD_2025-05-17-02-33-10.json`

## Architecture

The module follows these design principles:

1. **Separation of concerns**: Each file handles a specific responsibility
2. **Functional approach**: Pure functions for transformation operations
3. **Modularity**: Functions can be imported and reused independently
4. **Error handling**: Comprehensive error handling and logging
5. **Configurability**: Functions accept parameters to customize behavior

### Directory Mirroring

```python
from backend.api.data_processing.mirror_utility import mirror_directory
mirror_directory('path/to/source', 'path/to/destination', converter_func)
````

## Command Line Tools

Command-line wrappers are available in the `/scripts` directory:

- `rename_flight_jsons.sh`: Standardize flight data filenames
- `rename_forex_jsons.sh`: Standardize forex data filenames
- `mirror_json_to_parquet.sh`: Mirror and convert JSON files to Parquet format

# ChasquiFX Data Processing Utilities

This module contains utilities for processing data files used throughout the ChasquiFX system.

## Components

- `json_parquet_converter.py`: Utilities for converting JSON files to Parquet format
- `file_renamer.py`: Tools for standardizing and renaming data files
- `mirror_utility.py`: Utilities for mirroring directory structures

## Usage

### JSON to Parquet Conversion

```python
from backend.api.data_processing import json_to_parquet

# Convert a single file
json_to_parquet('path/to/input.json', 'path/to/output.parquet')

# Convert an entire directory
from backend.api.data_processing import batch_convert_directory
batch_convert_directory('path/to/json/dir', recursive=True)
```

### Directory Mirroring

```python
from backend.api.data_processing.mirror_utility import mirror_directory
mirror_directory('path/to/source', 'path/to/destination', converter_func)
```

## Command Line Tools

Command-line wrappers are available in the `/scripts` directory:

- `rename_flight_jsons.sh`: Standardize flight data filenames
- `rename_forex_jsons.sh`: Standardize forex data filenames
- `mirror_json_to_parquet.sh`: Mirror and convert JSON files to Parquet format

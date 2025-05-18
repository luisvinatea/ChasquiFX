"""
ChasquiFX Data Processing Module

This module contains utilities for processing data files, including:
- JSON to Parquet conversion
- Data file renaming tools
- Data structure mirroring utilities

Import main functions directly from this module for easy access.
"""

# Import core functionality
from .json_parquet_converter import (
    json_to_parquet,
    batch_convert_directory,
    flatten_json,
    get_mirror_parquet_path,
)
from .file_renamer import (
    rename_directory_files,
    get_flight_renaming_config,
    get_forex_renaming_config,
    standardize_filename,
    extract_json_metadata,
)
from .mirror_utility import mirror_directory, process_standard_data_directories

# Define public API
__all__ = [
    # JSON to Parquet conversion
    "json_to_parquet",
    "batch_convert_directory",
    "flatten_json",
    "get_mirror_parquet_path",
    # File renaming utilities
    "rename_directory_files",
    "get_flight_renaming_config",
    "get_forex_renaming_config",
    "standardize_filename",
    "extract_json_metadata",
    # Directory mirroring
    "mirror_directory",
    "process_standard_data_directories",
]

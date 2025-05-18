#!/usr/bin/env python
"""
ChasquiFX Data Processing CLI

A command-line interface for ChasquiFX data processing operations:
- Rename JSON files to standardized formats
- Convert JSON files to Parquet format
- Mirror directory structures with file conversions

Usage examples:
  # Rename flight JSON files
  python -m backend.api.data_processing.cli rename-flights

  # Rename forex JSON files
  python -m backend.api.data_processing.cli rename-forex

  # Convert a single JSON file to Parquet
  python -m backend.api.data_processing.cli convert \
    --json-file path/to/file.json \
    --parquet-file path/to/output.parquet

  # Mirror all JSON files to Parquet format
  python -m backend.api.data_processing.cli mirror-all

  # Mirror a specific data directory
  python -m backend.api.data_processing.cli mirror --dir path/to/json/dir
"""

import os
import sys
import argparse
import logging

from .file_renamer import (
    rename_directory_files,
    get_flight_renaming_config,
    get_forex_renaming_config,
)
from .json_parquet_converter import json_to_parquet, batch_convert_directory
from .mirror_utility import process_standard_data_directories


# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)


def get_project_root() -> str:
    """
    Get the absolute path to the project root directory.

    Returns:
        str: Path to project root
    """
    # backend/api/data_processing/cli.py is 3 levels deep from project root
    current_dir = os.path.dirname(os.path.abspath(__file__))
    return os.path.abspath(os.path.join(current_dir, "..", "..", ".."))


def rename_flights_command(args) -> None:
    """
    Command handler for renaming flight JSON files.

    Args:
        args: Command line arguments
    """
    project_root = get_project_root()
    json_dir = os.path.join(
        project_root, "backend", "assets", "data", "flights", "json"
    )

    if not os.path.exists(json_dir):
        logger.error(f"Directory not found: {json_dir}")
        sys.exit(1)

    logger.info(f"Renaming flight JSON files in {json_dir}")
    config = get_flight_renaming_config()

    success, failed, skipped = rename_directory_files(
        json_dir,
        config["metadata_keys"],
        config["template"],
        dry_run=args.dry_run,
    )

    logger.info(
        f"Rename summary: {success} renamed, "
        f"{failed} failed, {skipped} skipped"
    )


def rename_forex_command(args) -> None:
    """
    Command handler for renaming forex JSON files.

    Args:
        args: Command line arguments
    """
    project_root = get_project_root()
    json_dir = os.path.join(
        project_root, "backend", "assets", "data", "forex", "json"
    )

    if not os.path.exists(json_dir):
        logger.error(f"Directory not found: {json_dir}")
        sys.exit(1)

    logger.info(f"Renaming forex JSON files in {json_dir}")
    config = get_forex_renaming_config()

    success, failed, skipped = rename_directory_files(
        json_dir,
        config["metadata_keys"],
        config["template"],
        dry_run=args.dry_run,
    )

    logger.info(
        f"Rename summary: {success} renamed, "
        f"{failed} failed, {skipped} skipped"
    )


def convert_command(args) -> None:
    """
    Command handler for converting a single JSON file to Parquet.

    Args:
        args: Command line arguments
    """
    logger.info(f"Converting {args.json_file} to {args.parquet_file}")

    if json_to_parquet(args.json_file, args.parquet_file):
        logger.info("Conversion successful")
    else:
        logger.error("Conversion failed")
        sys.exit(1)


def mirror_command(args) -> None:
    """
    Command handler for mirroring JSON files to Parquet.

    Args:
        args: Command line arguments
    """
    if args.dir:
        # Process specific directory
        logger.info(f"Processing directory: {args.dir}")
        success, failure = batch_convert_directory(args.dir, args.recursive)
    else:
        # Process all data directories
        logger.info("Processing all data directories")
        success, failure = process_standard_data_directories()

    logger.info(f"Mirror summary: {success} succeeded, {failure} failed")

    if failure > 0:
        sys.exit(1)


def mirror_all_command(args) -> None:
    """
    Command handler for mirroring all data directories.

    Args:
        args: Command line arguments
    """
    # Process all data directories
    logger.info("Processing all data directories")
    success, failure = process_standard_data_directories()

    logger.info(f"Mirror summary: {success} succeeded, {failure} failed")

    if failure > 0:
        sys.exit(1)


def setup_parser() -> argparse.ArgumentParser:
    """
    Set up the command line argument parser.

    Returns:
        argparse.ArgumentParser: Configured parser
    """
    parser = argparse.ArgumentParser(
        description="ChasquiFX Data Processing CLI",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )

    subparsers = parser.add_subparsers(
        dest="command", help="Command to execute"
    )

    # Rename flights command
    rename_flights_parser = subparsers.add_parser(
        "rename-flights", help="Rename flight JSON files"
    )
    rename_flights_parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Show what would be renamed without actually renaming",
    )
    rename_flights_parser.set_defaults(func=rename_flights_command)

    # Rename forex command
    rename_forex_parser = subparsers.add_parser(
        "rename-forex", help="Rename forex JSON files"
    )
    rename_forex_parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Show what would be renamed without actually renaming",
    )
    rename_forex_parser.set_defaults(func=rename_forex_command)

    # Convert command
    convert_parser = subparsers.add_parser(
        "convert", help="Convert a JSON file to Parquet"
    )
    convert_parser.add_argument(
        "--json-file",
        required=True,
        help="Path to the JSON file to convert",
    )
    convert_parser.add_argument(
        "--parquet-file",
        required=True,
        help="Path to save the Parquet file",
    )
    convert_parser.set_defaults(func=convert_command)

    # Mirror command
    mirror_parser = subparsers.add_parser(
        "mirror", help="Mirror JSON files to Parquet format"
    )
    mirror_parser.add_argument(
        "--dir",
        help="Process a specific directory instead of all data directories",
    )
    mirror_parser.add_argument(
        "--recursive",
        action="store_true",
        help="Process subdirectories recursively",
        default=True,
    )
    mirror_parser.set_defaults(func=mirror_command)

    # Mirror all command (shortcut)
    mirror_all_parser = subparsers.add_parser(
        "mirror-all", help="Mirror all JSON directories to Parquet format"
    )
    mirror_all_parser.set_defaults(func=mirror_all_command)

    return parser


def main() -> None:
    """
    Main entry point for the CLI.
    """
    parser = setup_parser()
    args = parser.parse_args()

    if not hasattr(args, "func"):
        parser.print_help()
        sys.exit(0)

    args.func(args)


if __name__ == "__main__":
    main()

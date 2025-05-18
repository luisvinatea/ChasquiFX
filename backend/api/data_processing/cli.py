#!/usr/bin/env python
"""
ChasquiFX Data Processing CLI

A command-line interface for ChasquiFX data processing operations:
- Rename JSON files to standardized formats
- Convert JSON files to Parquet format
- Mirror directory structures with file conversions
- Retrieve data from Supabase storage

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

  # Retrieve data from Supabase
  python -m backend.api.data_processing.cli retrieve --file-key forex/EURUSD
"""

import os
import sys
import argparse
import logging
import asyncio

import pandas as pd

from .file_renamer import (
    rename_directory_files,
    get_flight_renaming_config,
    get_forex_renaming_config,
)
from .json_parquet_converter import json_to_parquet, batch_convert_directory
from .mirror_utility import process_standard_data_directories
from . import retrieval


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

    if args.upload_to_supabase:
        try:
            # Import here to avoid circular dependencies
            from .supabase_integration import convert_and_upload_sync

            success, file_key = convert_and_upload_sync(
                args.json_file, args.parquet_file
            )

            if success:
                logger.info(f"Conversion successful, file_key: {file_key}")
            else:
                logger.error("Conversion or upload failed")
                sys.exit(1)
        except ImportError:
            logger.error("Supabase integration not available")
            sys.exit(1)
    else:
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

    # Upload files to Supabase if requested
    if args.upload_to_supabase and success > 0:
        logger.info("Syncing files with Supabase storage...")
        try:
            # Import here to avoid circular imports
            import asyncio
            import os
            from pathlib import Path
            from ..scripts.sync_parquet_files import (
                find_parquet_files,
                sync_files,
            )

            # Get project root
            current_dir = os.path.dirname(os.path.abspath(__file__))
            project_root = os.path.abspath(
                os.path.join(current_dir, "..", "..", "..")
            )

            # Run the sync process
            async def run_sync():
                # Find all parquet files
                data_type = None
                if args.dir:
                    # Try to extract data type from directory path
                    dir_path = Path(args.dir)
                    for parent in dir_path.parents:
                        if parent.name in ["flights", "forex", "geo"]:
                            data_type = parent.name
                            break

                files = await find_parquet_files(project_root, data_type)
                return await sync_files(files, args.force)

            # Run the async function
            uploaded = asyncio.run(run_sync())
            logger.info(f"Uploaded {uploaded} files to Supabase")

        except ImportError as e:
            logger.error(f"Supabase integration not available: {e}")

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

    # Upload files to Supabase if requested
    if args.upload_to_supabase and success > 0:
        logger.info("Syncing files with Supabase storage...")
        try:
            # Import here to avoid circular imports
            import asyncio
            import os
            from ..scripts.sync_parquet_files import (
                find_parquet_files,
                sync_files,
            )

            # Get project root
            current_dir = os.path.dirname(os.path.abspath(__file__))
            project_root = os.path.abspath(
                os.path.join(current_dir, "..", "..", "..")
            )

            # Run the sync process
            async def run_sync():
                files = await find_parquet_files(project_root)
                return await sync_files(files, args.force)

            # Run the async function
            uploaded = asyncio.run(run_sync())
            logger.info(f"Uploaded {uploaded} files to Supabase")

        except ImportError as e:
            logger.error(f"Supabase integration not available: {e}")

    if failure > 0:
        sys.exit(1)


async def _retrieve_data(args):
    """
    Async worker for retrieving data.

    Args:
        args: Command line arguments

    Returns:
        Tuple[bool, Optional[pd.DataFrame], Optional[dict]]:
            Success flag, data, and metadata
    """
    try:
        from .data_retriever import (
            retrieve_data_frame,
            retrieve_data_by_type,
            query_data,
            get_metadata,
        )

        # Get metadata if requested
        if args.info and args.file_key:
            metadata = await get_metadata(args.file_key)
            return True, None, metadata

        # Handle file key retrieval
        if args.file_key:
            # Process filters if specified
            filters = {}
            if args.filter:
                for f in args.filter:
                    if "=" in f:
                        key, value = f.split("=", 1)
                        # Try to convert to numeric if possible
                        try:
                            if "." in value:
                                value = float(value)
                            else:
                                value = int(value)
                        except ValueError:
                            # Keep as string if not numeric
                            pass
                        filters[key] = value

            # Process columns if specified
            columns = None
            if args.columns:
                columns = [c.strip() for c in args.columns.split(",")]

            # Query the data
            if filters or columns:
                df = await query_data(args.file_key, filters, columns)
            else:
                df = await retrieve_data_frame(args.file_key)

            if df is not None:
                return True, df, None
            else:
                logger.error(f"Failed to retrieve data for {args.file_key}")
                return False, None, None

        # Handle data type retrieval
        elif args.data_type:
            data_dict = await retrieve_data_by_type(args.data_type)
            if data_dict:
                logger.info(
                    f"Retrieved {len(data_dict)} {args.data_type} files"
                )

                # If there's only one file, return that
                if len(data_dict) == 1:
                    return (
                        True,
                        list(data_dict.values())[0],
                        {"file_key": list(data_dict.keys())[0]},
                    )

                # Otherwise, combine all dataframes if they have compatible
                # schemas
                try:
                    combined_df = pd.concat(list(data_dict.values()))
                    return True, combined_df, {"files": list(data_dict.keys())}
                except Exception as e:
                    logger.warning(f"Couldn't combine dataframes: {e}")
                    # Return the first one as a fallback
                    first_key = list(data_dict.keys())[0]
                    return (
                        True,
                        data_dict[first_key],
                        {
                            "file_key": first_key,
                            "note": "Returned first file only",
                        },
                    )
            else:
                logger.error(f"No data found for type: {args.data_type}")
                return False, None, None

        else:
            logger.error("Either --file-key or --data-type must be specified")
            return False, None, None

    except Exception as e:
        logger.error(f"Error retrieving data: {e}")
        return False, None, None


def retrieve_command(args) -> None:
    """
    Command handler for retrieving data from Supabase.

    Args:
        args: Command line arguments
    """
    import json

    # Run the async retrieval
    success, df, metadata = asyncio.run(_retrieve_data(args))

    if not success:
        sys.exit(1)

    # Handle metadata-only request
    if args.info and metadata:
        if isinstance(metadata, dict):
            print(json.dumps(metadata, indent=2))
        return

    # Handle DataFrame output
    if df is not None:
        # Print data summary
        print(f"\nDataFrame Info:\n{'-' * 40}")
        print(f"Rows: {len(df)}")
        print(f"Columns: {', '.join(df.columns)}\n")

        # Print sample data
        print(f"Sample Data:\n{'-' * 40}")
        if len(df) > 10:
            print(df.head(10))
            print(f"\n[{len(df) - 10} more rows...]")
        else:
            print(df)

        # Save to file if requested
        if args.output:
            output_path = args.output

            # Determine file format based on extension
            if output_path.endswith(".csv"):
                df.to_csv(output_path, index=False)
                logger.info(f"Data saved to CSV: {output_path}")
            elif output_path.endswith(".xlsx"):
                df.to_excel(output_path, index=False)
                logger.info(f"Data saved to Excel: {output_path}")
            elif output_path.endswith(".json"):
                df.to_json(output_path, orient="records")
                logger.info(f"Data saved to JSON: {output_path}")
            elif output_path.endswith(".parquet"):
                df.to_parquet(output_path, index=False)
                logger.info(f"Data saved to Parquet: {output_path}")
            else:
                # Default to CSV if no recognized extension
                if not output_path.endswith(".csv"):
                    output_path += ".csv"
                df.to_csv(output_path, index=False)
                logger.info(f"Data saved to CSV: {output_path}")
    else:
        logger.error("No data returned")
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
    convert_parser.add_argument(
        "--upload-to-supabase",
        action="store_true",
        help="Upload the converted file to Supabase storage",
    )
    convert_parser.set_defaults(func=convert_command)  # Mirror command
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
    mirror_parser.add_argument(
        "--upload-to-supabase",
        action="store_true",
        help="Upload the converted files to Supabase storage",
    )
    mirror_parser.add_argument(
        "--force",
        action="store_true",
        help="Force upload even if files haven't changed",
    )

    # Retrieve command for loading data from Supabase
    retrieve_parser = subparsers.add_parser(
        "retrieve", help="Retrieve Parquet data from Supabase"
    )
    retrieve_parser.add_argument(
        "--file-key",
        help="Specific file key to retrieve",
    )
    retrieve_parser.add_argument(
        "--data-type",
        choices=["flights", "forex", "geo"],
        help="Data type to retrieve",
    )
    retrieve_parser.add_argument(
        "--output",
        help="Path to save retrieved data (optional)",
    )
    retrieve_parser.add_argument(
        "--info",
        action="store_true",
        help="Show schema and metadata information only",
    )
    retrieve_parser.add_argument(
        "--columns",
        help="Comma-separated list of columns to retrieve",
    )
    retrieve_parser.add_argument(
        "--filter",
        help="Filter in format column=value (can be used multiple times)",
        action="append",
    )
    retrieve_parser.set_defaults(
        func=lambda args: retrieval.retrieve_command(args)
    )
    mirror_parser.set_defaults(func=mirror_command)

    # Mirror all command (shortcut)
    mirror_all_parser = subparsers.add_parser(
        "mirror-all", help="Mirror all JSON directories to Parquet format"
    )
    mirror_all_parser.add_argument(
        "--upload-to-supabase",
        action="store_true",
        help="Upload the converted files to Supabase storage",
    )
    mirror_all_parser.add_argument(
        "--force",
        action="store_true",
        help="Force upload even if files haven't changed",
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

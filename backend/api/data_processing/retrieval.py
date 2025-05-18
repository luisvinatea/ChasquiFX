"""
Enhanced CLI implementation for retrieving Parquet data from Supabase.
This module extends
the ChasquiFX Data Processing CLI
with retrieval capabilities.
"""

import sys
import asyncio
import logging
import pandas as pd
import json
from typing import Dict, List, Optional, Any

logger = logging.getLogger(__name__)


async def retrieve_data_frame(
    file_key: str, use_cache: bool = True
) -> Optional[pd.DataFrame]:
    """
    Load a Parquet file from Supabase Storage into a pandas DataFrame.

    This is a wrapper around the parquet_storage.load_parquet_to_dataframe
    function.

    Args:
        file_key: Unique identifier for the file
        use_cache: Whether to use cached data if available

    Returns:
        Optional[pd.DataFrame]: DataFrame or None if loading failed
    """
    try:
        from ..db.parquet_storage import load_parquet_to_dataframe

        return await load_parquet_to_dataframe(file_key, use_cache)
    except Exception as e:
        logger.error(f"Error retrieving data frame: {e}")
        return None


async def get_metadata(file_key: str) -> Dict[str, Any]:
    """
    Get metadata about a Parquet file including row count and schema.

    Args:
        file_key: Unique identifier for the file

    Returns:
        Dict[str, Any]: Dictionary with metadata information
    """
    try:
        from ..db.parquet_storage import (
            get_parquet_file_metadata,
            download_parquet_file,
        )
        import io
        import pyarrow.parquet as pq

        # Get database metadata
        db_metadata = await get_parquet_file_metadata(file_key)
        if not db_metadata:
            return {"error": "File not found", "file_key": file_key}

        # Get file content
        content = await download_parquet_file(file_key)
        if not content:
            return {
                "file_key": file_key,
                "error": "Could not download file content",
            }

        # Read file metadata
        file_like = io.BytesIO(content)
        parquet_file = pq.ParquetFile(file_like)

        # Create result dictionary
        result = {
            "file_key": file_key,
            "file_path": db_metadata.file_path,
            "original_path": db_metadata.original_path,
            "file_size": db_metadata.file_size,
            "etag": db_metadata.etag,
            "row_count": parquet_file.metadata.num_rows,
            "column_count": len(parquet_file.schema_arrow),
            "schema": {
                field.name: str(field.type)
                for field in parquet_file.schema_arrow
            },
        }

        return result

    except Exception as e:
        logger.error(f"Error getting metadata for {file_key}: {e}")
        return {"file_key": file_key, "error": str(e)}


async def retrieve_data_by_type(data_type: str) -> Dict[str, pd.DataFrame]:
    """
    Load all Parquet files of a specific data type into DataFrames.

    Args:
        data_type: Type of data to load ('flight', 'forex', 'geo')

    Returns:
        Dict[str, pd.DataFrame]: Dictionary of file keys to DataFrames
    """
    try:
        from ..db.parquet_storage import (
            list_parquet_files,
            load_parquet_to_dataframe,
        )

        result = {}

        # Normalize data type
        if data_type == "flights":
            data_type = "flight"

        # List all files of this type
        files = await list_parquet_files(data_type)

        if not files:
            logger.warning(f"No {data_type} files found in Supabase storage")
            return {}

        # Load each file
        for file in files:
            df = await load_parquet_to_dataframe(file.file_key)
            if df is not None:
                result[file.file_key] = df

        return result

    except Exception as e:
        logger.error(f"Error retrieving data by type: {e}")
        return {}


async def query_data(
    file_key: str,
    filters: Optional[Dict[str, Any]] = None,
    columns: Optional[List[str]] = None,
) -> Optional[pd.DataFrame]:
    """
    Query a Parquet file with optional filters and column selection.

    Args:
        file_key: Unique identifier for the file
        filters: Dictionary of column names to values to filter by
        columns: List of column names to select (returns all if None)

    Returns:
        Optional[pd.DataFrame]: Filtered DataFrame or None if loading failed
    """
    try:
        df = await retrieve_data_frame(file_key)

        if df is None:
            return None

        # Apply column selection if specified
        if columns:
            valid_columns = [col for col in columns if col in df.columns]
            if valid_columns:
                df = df[valid_columns]

        # Apply filters if specified
        if filters:
            for column, value in filters.items():
                if column in df.columns:
                    if isinstance(value, list):
                        df = df[df[column].isin(value)]
                    else:
                        df = df[df[column] == value]

        return df

    except Exception as e:
        logger.error(f"Error querying data: {e}")
        return None


async def _retrieve_command_async(args):
    """
    Async implementation for retrieving data.

    Args:
        args: Command line arguments

    Returns:
        Tuple[bool, Optional[pd.DataFrame], Optional[Dict]]:
            Success flag, data, and metadata
    """
    try:
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
                logger.info(f"Retrieved {len(data_dict)} files")

                # If there's only one file, return that
                if len(data_dict) == 1:
                    key = list(data_dict.keys())[0]
                    return True, data_dict[key], {"file_key": key}

                # Otherwise, combine all dataframes if they have
                # compatible schemas
                try:
                    combined = pd.concat(list(data_dict.values()))
                    return True, combined, {"files": list(data_dict.keys())}
                except Exception as e:
                    logger.warning(f"Couldn't combine dataframes: {e}")
                    # Return the first one as a fallback
                    first_key = list(data_dict.keys())[0]
                    note = "Returned first file only due to schema differences"
                    return (
                        True,
                        data_dict[first_key],
                        {"file_key": first_key, "note": note},
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


def retrieve_command(args):
    """
    Command handler for retrieving data from Supabase.

    Args:
        args: Command line arguments
    """
    # Run the async retrieval
    success, df, metadata = asyncio.run(_retrieve_command_async(args))

    if not success:
        sys.exit(1)

    # Handle metadata-only request
    if args.info and metadata:
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

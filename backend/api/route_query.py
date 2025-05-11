"""Route finding module to find direct, 1-stop, and 2-stop flights
from a given start airport to an end airport.
Uses functional programming approach with Pandas for data manipulation.
Implements ETL pipeline pattern for memory efficiency.
"""

import os
from typing import Dict, List, Set, Tuple, Optional
import pandas as pd
import pyarrow.parquet as pq

# Define data directory
DATA_DIR = "../assets/data/geo"

# Type aliases for better readability
RouteDict = Dict[Tuple[str, str], List[Dict[str, any]]]
AirportConnections = Dict[str, Set[str]]


def find_routes(
    start_airport: str,
    end_airport: str,
    data_dir: str = DATA_DIR,
    input_path: str = "json/routes.json",
    output_dir: str = "ready",
) -> Dict[str, pd.DataFrame]:
    """Main function to find routes between airports following ETL pipeline."""
    # Set up paths
    full_input_path = os.path.join(data_dir, input_path)
    full_output_dir = os.path.join(data_dir, output_dir)

    # Ensure output directory exists
    os.makedirs(full_output_dir, exist_ok=True)

    # Execute ETL pipeline
    df = extract_data(full_input_path)
    routes = transform_data(df, start_airport, end_airport)
    load_data(routes, full_output_dir)

    return routes


def extract_data(input_path: str) -> pd.DataFrame:
    """Extract data from Parquet or JSON file based on extension."""
    if not os.path.exists(input_path):
        return pd.DataFrame()

    try:
        file_ext = os.path.splitext(input_path)[1].lower()

        if file_ext == ".parquet":
            # Use PyArrow for efficient parquet reading
            df = pq.read_table(input_path).to_pandas()
        elif file_ext == ".json":
            df = pd.read_json(input_path)
        else:
            return pd.DataFrame()

        return df
    except Exception:
        return pd.DataFrame()


def build_route_index(
    df: pd.DataFrame,
) -> Tuple[RouteDict, AirportConnections, AirportConnections]:
    """Create efficient index structures for quick route lookups."""
    route_dict: RouteDict = {}
    airports_from: AirportConnections = {}
    airports_to: AirportConnections = {}

    # Filter out rows with missing data first
    valid_routes = df.dropna(subset=["Departure-IATA", "Arrival-IATA"])

    # Process in chunks for memory efficiency with larger datasets
    chunk_size = 10000
    for i in range(0, len(valid_routes), chunk_size):
        chunk = valid_routes.iloc[i : i + chunk_size]

        for _, row in chunk.iterrows():
            dep_iata = row["Departure-IATA"]
            arr_iata = row["Arrival-IATA"]
            route_key = (dep_iata, arr_iata)

            # Initialize sets/lists if needed
            if dep_iata not in airports_from:
                airports_from[dep_iata] = set()
            if arr_iata not in airports_to:
                airports_to[arr_iata] = set()
            if route_key not in route_dict:
                route_dict[route_key] = []

            # Add connections
            airports_from[dep_iata].add(arr_iata)
            airports_to[arr_iata].add(dep_iata)
            route_dict[route_key].append(row.to_dict())

    return route_dict, airports_from, airports_to


def find_direct_routes(
    df: pd.DataFrame, start: str, end: str, route_dict: RouteDict
) -> pd.DataFrame:
    """Find direct routes from start to end airport."""
    direct_key = (start, end)
    direct_rows = route_dict.get(direct_key, [])

    if direct_rows:
        return pd.DataFrame(direct_rows)
    return pd.DataFrame()


def find_one_stop_routes(
    df: pd.DataFrame,
    start: str,
    end: str,
    airports_from: AirportConnections,
    airports_to: AirportConnections,
) -> pd.DataFrame:
    """Find one-stop routes connecting start and end airports."""
    # Find potential intermediate airports
    start_connections = airports_from.get(start, set())
    end_connections = airports_to.get(end, set())
    mid_airports = start_connections.intersection(end_connections)

    if not mid_airports:
        return pd.DataFrame()

    # Filter dataframe to only include relevant legs for memory efficiency
    start_df = df[
        (df["Departure-IATA"] == start)
        & (df["Arrival-IATA"].isin(mid_airports))
    ]

    if start_df.empty:
        return pd.DataFrame()

    end_df = df[
        (df["Arrival-IATA"] == end) & (df["Departure-IATA"].isin(mid_airports))
    ]

    if end_df.empty:
        return pd.DataFrame()

    # Join the legs
    one_stop_routes = start_df.merge(
        end_df,
        left_on="Arrival-IATA",
        right_on="Departure-IATA",
        how="inner",
        suffixes=("_leg1", "_leg2"),
    )

    return one_stop_routes


def find_two_stop_routes(
    df: pd.DataFrame,
    start: str,
    end: str,
    airports_from: AirportConnections,
    airports_to: AirportConnections,
) -> pd.DataFrame:
    """Find two-stop routes connecting start and end airports."""
    # Find potential intermediate airports
    mid1_candidates = airports_from.get(start, set())
    if not mid1_candidates:
        return pd.DataFrame()

    mid2_candidates = airports_to.get(end, set())
    if not mid2_candidates:
        return pd.DataFrame()

    # Filter to potential middle legs
    mid_connections = df[
        (df["Departure-IATA"].isin(mid1_candidates))
        & (df["Arrival-IATA"].isin(mid2_candidates))
    ]

    if mid_connections.empty:
        return pd.DataFrame()

    # Get first legs (start to mid1)
    leg1_df = df[
        (df["Departure-IATA"] == start)
        & (df["Arrival-IATA"].isin(mid_connections["Departure-IATA"]))
    ]

    if leg1_df.empty:
        return pd.DataFrame()

    # Get third legs (mid2 to end)
    leg3_df = df[
        (df["Arrival-IATA"] == end)
        & (df["Departure-IATA"].isin(mid_connections["Arrival-IATA"]))
    ]

    if leg3_df.empty:
        return pd.DataFrame()

    # Join first and middle legs
    two_stop_leg1_mid = leg1_df.merge(
        mid_connections,
        left_on="Arrival-IATA",
        right_on="Departure-IATA",
        how="inner",
        suffixes=("_leg1", "_leg2"),
    )

    if two_stop_leg1_mid.empty:
        return pd.DataFrame()

    # Join with third leg
    two_stop_routes = two_stop_leg1_mid.merge(
        leg3_df,
        left_on="Arrival-IATA_leg2",
        right_on="Departure-IATA",
        how="inner",
        suffixes=("_mid", "_leg3"),
    )

    return two_stop_routes


def transform_data(
    df: pd.DataFrame, start: str, end: str
) -> Dict[str, pd.DataFrame]:
    """Transform input data to find all route options."""
    if df.empty:
        return {
            "direct": pd.DataFrame(),
            "one_stop": pd.DataFrame(),
            "two_stop": pd.DataFrame(),
        }

    # Build index structures
    route_dict, airports_from, airports_to = build_route_index(df)

    # Find routes
    direct_routes = find_direct_routes(df, start, end, route_dict)
    one_stop_routes = find_one_stop_routes(
        df, start, end, airports_from, airports_to
    )
    two_stop_routes = find_two_stop_routes(
        df, start, end, airports_from, airports_to
    )

    # Calculate stats
    total_routes = len(df)
    direct_len = len(direct_routes)
    one_stop_len = len(one_stop_routes)
    two_stop_len = len(two_stop_routes)

    found_routes = direct_len + one_stop_len + two_stop_len
    completeness = (
        (found_routes / total_routes) * 100 if total_routes > 0 else 0
    )

    if found_routes == 0:
        print(f"No flight information found for {start} to {end}.")
        print(f"Number of routes analyzed: {total_routes}")
        print(f"Database completeness score: {completeness:.2f}%")

    return {
        "direct": direct_routes,
        "one_stop": one_stop_routes,
        "two_stop": two_stop_routes,
    }


def save_route_data(
    df: pd.DataFrame,
    output_file: str,
    columns: List[str],
    rename_map: Optional[Dict[str, str]] = None,
) -> None:
    """Save route data to file with proper columns and format."""
    if df.empty:
        return

    # Check if required columns exist
    if not all(col in df.columns for col in columns):
        return

    # Select and rename columns
    output_df = df[columns]
    if rename_map:
        output_df = output_df.rename(columns=rename_map)

    # Determine format based on file extension
    file_ext = os.path.splitext(output_file)[1].lower()

    if file_ext == ".parquet":
        output_df.to_parquet(output_file, index=False)
    elif file_ext == ".json":
        output_df.to_json(output_file, orient="records")
    else:  # Default to parquet if extension not recognized
        parquet_file = os.path.splitext(output_file)[0] + ".parquet"
        output_df.to_parquet(parquet_file, index=False)


def load_data(routes: Dict[str, pd.DataFrame], output_dir: str) -> None:
    """Save route data to output files."""
    # Define columns and rename mappings
    direct_columns = ["Airline-IATA", "Airline-Name", "Route"]

    one_stop_columns = [
        "Airline-IATA_leg1",
        "Airline-Name_leg1",
        "Route_leg1",
        "Airline-IATA_leg2",
        "Airline-Name_leg2",
        "Route_leg2",
    ]
    one_stop_rename = {
        "Airline-IATA_leg1": "Airline-IATA_1",
        "Airline-Name_leg1": "Airline-Name_1",
        "Route_leg1": "Route_1",
        "Airline-IATA_leg2": "Airline-IATA_2",
        "Airline-Name_leg2": "Airline-Name_2",
        "Route_leg2": "Route_2",
    }

    two_stop_columns = [
        "Airline-IATA_leg1",
        "Airline-Name_leg1",
        "Route_leg1",
        "Airline-IATA_leg2",
        "Airline-Name_leg2",
        "Route_leg2",
        "Airline-IATA",
        "Airline-Name",
        "Route",
    ]
    two_stop_rename = {
        "Airline-IATA_leg1": "Airline-IATA_1",
        "Airline-Name_leg1": "Airline-Name_1",
        "Route_leg1": "Route_1",
        "Airline-IATA_leg2": "Airline-IATA_2",
        "Airline-Name_leg2": "Airline-Name_2",
        "Route_leg2": "Route_2",
        "Airline-IATA": "Airline-IATA_3",
        "Airline-Name": "Airline-Name_3",
        "Route": "Route_3",
    }

    # Save each route type
    save_route_data(
        routes["direct"],
        os.path.join(output_dir, "direct_flights.parquet"),
        direct_columns,
    )

    save_route_data(
        routes["one_stop"],
        os.path.join(output_dir, "one_stop_flights.parquet"),
        one_stop_columns,
        one_stop_rename,
    )

    save_route_data(
        routes["two_stop"],
        os.path.join(output_dir, "two_stop_flights.parquet"),
        two_stop_columns,
        two_stop_rename,
    )


if __name__ == "__main__":
    results = find_routes(start_airport="FLN", end_airport="LIM")
    print("Route finding process complete.")

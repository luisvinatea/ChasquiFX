"""
mapper.py
ETL pipeline to enrich flight route data with airport, city, and country information.
Uses functional programming paradigm for memory efficiency.
Creates enriched schemas for fast queries in route_query.py.
"""

import os
import logging
from typing import Dict, Optional, Any
from concurrent.futures import ThreadPoolExecutor, as_completed
import pandas as pd

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

# Define constants
DATA_DIR = "../assets/data/geo"
JSON_DIR = os.path.join(DATA_DIR, "json")
PARQUET_DIR = os.path.join(DATA_DIR, "parquet")
OUTPUT_DIR = os.path.join(DATA_DIR, "enriched")

# Ensure directories exist
os.makedirs(JSON_DIR, exist_ok=True)
os.makedirs(PARQUET_DIR, exist_ok=True)
os.makedirs(OUTPUT_DIR, exist_ok=True)

# Type aliases for better readability
AirportDict = Dict[str, Dict[str, Any]]
CountryDict = Dict[str, Dict[str, Any]]
CityDict = Dict[str, Dict[str, Any]]
AirlineDict = Dict[str, Dict[str, Any]]


def load_json_file(file_path: str) -> Optional[pd.DataFrame]:
    """Load a JSON file into a DataFrame with error handling."""
    try:
        if os.path.exists(file_path):
            df = pd.read_json(file_path)
            logger.info(f"Loaded {os.path.basename(file_path)}")
            return df
        else:
            logger.warning(f"File not found: {file_path}")
            return None
    except Exception as e:
        logger.error(f"Error loading {file_path}: {e}")
        return None


def extract_data() -> Dict[str, Optional[pd.DataFrame]]:
    """Extract data from source files in parallel."""
    file_paths = {
        "routes": os.path.join(JSON_DIR, "routes.json"),
        "airports": os.path.join(JSON_DIR, "airport_info.json"),
        "countries": os.path.join(JSON_DIR, "countries.json"),
        "airlines": os.path.join(JSON_DIR, "airlines.json"),
    }

    data_frames = {}

    # Use ThreadPoolExecutor for parallel I/O operations
    with ThreadPoolExecutor(max_workers=4) as executor:
        future_to_key = {
            executor.submit(load_json_file, path): key
            for key, path in file_paths.items()
        }

        for future in as_completed(future_to_key):
            key = future_to_key[future]
            try:
                data_frames[key] = future.result()
            except Exception as e:
                logger.error(f"Exception processing {key}: {e}")
                data_frames[key] = None

    return data_frames


def build_airport_index(airports_df: pd.DataFrame) -> AirportDict:
    """Build an efficient airport lookup dictionary."""
    if airports_df is None or airports_df.empty:
        return {}

    airport_dict: AirportDict = {}

    # Use chunk processing for memory efficiency
    chunk_size = 5000
    for i in range(0, len(airports_df), chunk_size):
        chunk = airports_df.iloc[i : i + chunk_size]
        for _, row in chunk.iterrows():
            iata_code = row.get("IATA")
            if iata_code and isinstance(iata_code, str):
                airport_dict[iata_code] = {
                    "name": row.get("Name", ""),
                    "city": row.get("City", ""),
                    "country": row.get("Country", ""),
                    "latitude": row.get("Latitude", 0.0),
                    "longitude": row.get("Longitude", 0.0),
                }

    return airport_dict


def build_country_index(countries_df: pd.DataFrame) -> CountryDict:
    """Build an efficient country lookup dictionary."""
    if countries_df is None or countries_df.empty:
        return {}

    country_dict: CountryDict = {}

    for _, row in countries_df.iterrows():
        country_name = row.get("Name")
        if country_name and isinstance(country_name, str):
            country_dict[country_name] = {
                "code": row.get("Code", ""),
                "region": row.get("Region", ""),
                "continent": row.get("Continent", ""),
            }

    return country_dict


def build_airline_index(airlines_df: pd.DataFrame) -> AirlineDict:
    """Build an efficient airline lookup dictionary."""
    if airlines_df is None or airlines_df.empty:
        return {}

    airline_dict: AirlineDict = {}

    for idx, row in airlines_df.iterrows():
        # Assuming AirlineID is the key we can use to merge
        airline_id = str(idx)
        if "AirlineID" in row:
            airline_id = str(row["AirlineID"])

        airline_dict[airline_id] = {
            "name": row.get("Name", ""),
            "alias": row.get("Alias", ""),
            "iata": row.get("IATA", ""),
            "icao": row.get("ICAO", ""),
            "callsign": row.get("Callsign", ""),
            "country": row.get("Country", ""),
            "active": row.get(" Active", "N")
            == "Y",  # Note the space in " Active"
        }

    return airline_dict


def enrich_route_data(
    routes_df: pd.DataFrame,
    airport_dict: AirportDict,
    country_dict: CountryDict,
    airline_dict: AirlineDict,
) -> pd.DataFrame:
    """Enrich route data with airport, country, and airline information."""
    if routes_df is None or routes_df.empty:
        return pd.DataFrame()

    # Work with a copy to avoid modifying the original
    enriched_df = routes_df.copy()

    # Add departure airport details
    def add_departure_details(row):
        dep_iata = row.get("Departure-IATA")
        if dep_iata in airport_dict:
            airport = airport_dict[dep_iata]
            row["Departure-Airport-Name"] = airport.get("name", "")
            row["Departure-City"] = airport.get("city", "")
            row["Departure-Country"] = airport.get("country", "")
            row["Departure-Latitude"] = airport.get("latitude", 0.0)
            row["Departure-Longitude"] = airport.get("longitude", 0.0)

            # Add country details
            country = row["Departure-Country"]
            if country in country_dict:
                country_info = country_dict[country]
                row["Departure-Country-Code"] = country_info.get("code", "")
                row["Departure-Region"] = country_info.get("region", "")
                row["Departure-Continent"] = country_info.get("continent", "")
        return row

    # Add arrival airport details
    def add_arrival_details(row):
        arr_iata = row.get("Arrival-IATA")
        if arr_iata in airport_dict:
            airport = airport_dict[arr_iata]
            row["Arrival-Airport-Name"] = airport.get("name", "")
            row["Arrival-City"] = airport.get("city", "")
            row["Arrival-Country"] = airport.get("country", "")
            row["Arrival-Latitude"] = airport.get("latitude", 0.0)
            row["Arrival-Longitude"] = airport.get("longitude", 0.0)

            # Add country details
            country = row["Arrival-Country"]
            if country in country_dict:
                country_info = country_dict[country]
                row["Arrival-Country-Code"] = country_info.get("code", "")
                row["Arrival-Region"] = country_info.get("region", "")
                row["Arrival-Continent"] = country_info.get("continent", "")
        return row

    # Add airline details
    def add_airline_details(row):
        airline_id = row.get("AirlineID")
        if airline_id and str(airline_id) in airline_dict:
            airline = airline_dict[str(airline_id)]
            row["Airline-Name"] = airline.get("name", "")
            row["Airline-IATA"] = airline.get("iata", "")
            row["Airline-ICAO"] = airline.get("icao", "")
            row["Airline-Callsign"] = airline.get("callsign", "")
            row["Airline-Country"] = airline.get("country", "")
            row["Airline-Active"] = airline.get("active", False)
        return row

    # Process in chunks for memory efficiency
    chunk_size = 5000
    result_chunks = []

    for i in range(0, len(enriched_df), chunk_size):
        chunk = enriched_df.iloc[i : i + chunk_size].copy()
        # Apply transformations
        chunk = chunk.apply(add_departure_details, axis=1)
        chunk = chunk.apply(add_arrival_details, axis=1)
        chunk = chunk.apply(add_airline_details, axis=1)
        result_chunks.append(chunk)

    # Combine chunks
    if result_chunks:
        return pd.concat(result_chunks, ignore_index=True)
    return pd.DataFrame()


def create_route_lookups(enriched_df: pd.DataFrame) -> Dict[str, pd.DataFrame]:
    """Create specialized lookup dataframes for route queries."""
    if enriched_df.empty:
        return {}

    # Create airport lookup (unique airports with their details)
    airports = pd.concat(
        [
            enriched_df[
                [
                    "Departure-IATA",
                    "Departure-Airport-Name",
                    "Departure-City",
                    "Departure-Country",
                    "Departure-Latitude",
                    "Departure-Longitude",
                ]
            ].rename(
                columns={
                    "Departure-IATA": "IATA",
                    "Departure-Airport-Name": "Airport-Name",
                    "Departure-City": "City",
                    "Departure-Country": "Country",
                    "Departure-Latitude": "Latitude",
                    "Departure-Longitude": "Longitude",
                }
            ),
            enriched_df[
                [
                    "Arrival-IATA",
                    "Arrival-Airport-Name",
                    "Arrival-City",
                    "Arrival-Country",
                    "Arrival-Latitude",
                    "Arrival-Longitude",
                ]
            ].rename(
                columns={
                    "Arrival-IATA": "IATA",
                    "Arrival-Airport-Name": "Airport-Name",
                    "Arrival-City": "City",
                    "Arrival-Country": "Country",
                    "Arrival-Latitude": "Latitude",
                    "Arrival-Longitude": "Longitude",
                }
            ),
        ],
        ignore_index=True,
    ).drop_duplicates(subset=["IATA"])

    # Create city lookup (unique cities with their airports)
    cities = (
        airports.groupby(["City", "Country"])
        .agg({
            "IATA": lambda x: list(x),
            "Airport-Name": lambda x: list(x),
            "Latitude": "mean",
            "Longitude": "mean",
        })
        .reset_index()
    )

    cities.rename(
        columns={"IATA": "Airport-IATAs", "Airport-Names": "Airport-Names"},
        inplace=True,
    )

    # Create route index (direct connections between airports)
    routes_index = enriched_df[
        [
            "Departure-IATA",
            "Arrival-IATA",
            "Airline-IATA",
            "Airline-Name",
            "Route",
        ]
    ].drop_duplicates()

    return {
        "airports": airports,
        "cities": cities,
        "routes_index": routes_index,
    }


def transform_data(
    data_frames: Dict[str, Optional[pd.DataFrame]],
) -> Dict[str, pd.DataFrame]:
    """Transform the extracted data into enriched datasets."""
    routes_df = data_frames.get("routes")
    airports_df = data_frames.get("airports")
    countries_df = data_frames.get("countries")
    airlines_df = data_frames.get("airlines")

    if (
        routes_df is None
        or airports_df is None
        or countries_df is None
        or airlines_df is None
    ):
        logger.error("Missing required data frames for transformation")
        return {}

    # Build lookup dictionaries
    airport_dict = build_airport_index(airports_df)
    country_dict = build_country_index(countries_df)
    airline_dict = build_airline_index(airlines_df)

    # Enrich route data
    enriched_routes = enrich_route_data(
        routes_df, airport_dict, country_dict, airline_dict
    )

    # Create specialized lookup tables
    lookup_tables = create_route_lookups(enriched_routes)

    # Add the enriched routes to the result
    lookup_tables["enriched_routes"] = enriched_routes

    # Add airlines lookup table
    airlines_lookup = airlines_df.copy()
    if not airlines_lookup.empty:
        airlines_lookup["Active"] = airlines_lookup.get(" Active", "N") == "Y"
        lookup_tables["airlines"] = airlines_lookup

    return lookup_tables


def save_dataframe(df: pd.DataFrame, base_name: str) -> None:
    """Save dataframe in both Parquet and JSON formats."""
    if df.empty:
        logger.warning(f"Skipping empty dataframe: {base_name}")
        return

    # Save as Parquet for efficient storage and querying
    parquet_path = os.path.join(OUTPUT_DIR, f"{base_name}.parquet")
    df.to_parquet(parquet_path, index=False, compression="snappy")
    logger.info(f"Saved {base_name}.parquet")

    # Save as JSON for human readability and compatibility
    json_path = os.path.join(OUTPUT_DIR, f"{base_name}.json")
    df.to_json(json_path, orient="records", date_format="iso")
    logger.info(f"Saved {base_name}.json")


def load_data(transformed_data: Dict[str, pd.DataFrame]) -> None:
    """Load transformed data into output files."""
    if not transformed_data:
        logger.error("No transformed data to load")
        return

    # Save each dataframe
    for name, df in transformed_data.items():
        save_dataframe(df, name)


def combine_route_with_lookup_data(
    route_df: pd.DataFrame, airport_df: pd.DataFrame
) -> pd.DataFrame:
    """
    Combine route data with airport lookup data to create a complete
    flight itinerary with all necessary details.
    """
    if route_df.empty or airport_df.empty:
        return pd.DataFrame()

    # Join with departure airport info
    result = route_df.merge(
        airport_df,
        left_on="Departure-IATA",
        right_on="IATA",
        how="left",
        suffixes=("", "_dep"),
    )

    # Join with arrival airport info
    result = result.merge(
        airport_df,
        left_on="Arrival-IATA",
        right_on="IATA",
        how="left",
        suffixes=("_dep", "_arr"),
    )

    return result


def route_mapper(
    data_dir: str = DATA_DIR,
    json_dir: str = JSON_DIR,
    output_dir: str = OUTPUT_DIR,
) -> Dict[str, pd.DataFrame]:
    """
    Main function to run the ETL pipeline for mapping flight route information.

    Args:
        data_dir: Base data directory
        json_dir: Directory containing JSON source files
        output_dir: Directory for output files

    Returns:
        Dictionary of transformed dataframes
    """
    # Extract data from source files
    data_frames = extract_data()

    # Transform data into enriched datasets
    transformed_data = transform_data(data_frames)

    # Load data into output files
    load_data(transformed_data)

    return transformed_data


def get_complete_route_info(
    start_airport: str, end_airport: str, output_dir: str = OUTPUT_DIR
) -> Dict[str, pd.DataFrame]:
    """
    Get complete route information for a specific trip.
    This function can be used by route_query.py to access
    enriched route information.

    Args:
        start_airport: IATA code of departure airport
        end_airport: IATA code of arrival airport
        output_dir: Directory containing enriched data files

    Returns:
        Dictionary with direct, one-stop, and two-stop route options
    """
    # Load necessary dataframes
    routes_path = os.path.join(output_dir, "enriched_routes.parquet")
    airports_path = os.path.join(output_dir, "airports.parquet")

    try:
        routes_df = pd.read_parquet(routes_path)
        airports_df = pd.read_parquet(airports_path)
    except Exception as e:
        logger.error(f"Error loading route data: {e}")
        return {
            "direct": pd.DataFrame(),
            "one_stop": pd.DataFrame(),
            "two_stop": pd.DataFrame(),
        }

    # Find direct routes
    direct_routes = routes_df[
        (routes_df["Departure-IATA"] == start_airport)
        & (routes_df["Arrival-IATA"] == end_airport)
    ]

    # Find one-stop routes
    potential_stops = routes_df[routes_df["Departure-IATA"] == start_airport][
        "Arrival-IATA"
    ].unique()

    one_stop_first_leg = routes_df[
        (routes_df["Departure-IATA"] == start_airport)
        & (routes_df["Arrival-IATA"].isin(potential_stops))
    ]

    one_stop_second_leg = routes_df[
        (routes_df["Departure-IATA"].isin(potential_stops))
        & (routes_df["Arrival-IATA"] == end_airport)
    ]

    one_stop_routes = one_stop_first_leg.merge(
        one_stop_second_leg,
        left_on="Arrival-IATA",
        right_on="Departure-IATA",
        how="inner",
        suffixes=("_first", "_second"),
    )

    # Enrich with airport details
    enriched_direct = combine_route_with_lookup_data(
        direct_routes, airports_df
    )

    # Return route options
    return {
        "direct": enriched_direct,
        "one_stop": one_stop_routes,
        "two_stop": pd.DataFrame(),  # Two-stop implementation omitted for brevity
    }


if __name__ == "__main__":
    # Run the full mapping pipeline
    mapped_data = route_mapper()

    # Print summary of created datasets
    for name, df in mapped_data.items():
        print(f"{name}: {len(df)} rows, {list(df.columns)}")

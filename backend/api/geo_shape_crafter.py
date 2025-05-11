"""GeoShapeCrafter module for ETL pipeline to create GeoJSON files from Parquet and JSON."""

import os
import glob
import logging
from typing import Dict, List, Optional, Tuple

import pandas as pd
import geopandas as gpd


def find_data_files(
    data_dir: str, directory: str, patterns: List[str]
) -> List[str]:
    """Find data files matching given patterns in directory."""
    files = []
    for pattern in patterns:
        full_path = os.path.join(data_dir, directory, pattern)
        matched = glob.glob(full_path)
        files.extend(matched)
        logging.info("Searching for %s: found %s", pattern, matched)

    if not files:
        logging.warning("No target files found in %s/%s", data_dir, directory)

    return files


def load_file(file_path: str) -> Optional[pd.DataFrame]:
    """Load a file into a DataFrame based on its extension."""
    file_ext = os.path.splitext(file_path)[1].lower()
    filename = os.path.basename(file_path)

    try:
        if file_ext == ".parquet":
            df = pd.read_parquet(file_path)
        elif file_ext == ".json":
            df = pd.read_json(file_path)
        else:
            logging.warning(
                f"Unsupported file format: {file_ext} for file {filename}"
            )
            return None

        logging.info(f"Loaded {filename}")
        return df
    except Exception as e:
        logging.error(f"Failed to load {filename}: {e}")
        return None


def extract(data_dir: str, directory: str) -> Dict[str, pd.DataFrame]:
    """Extract data from parquet and json files."""
    patterns = ["airports.parquet", "countries.json", "cities.parquet"]
    files = find_data_files(data_dir, directory, patterns)

    dataframes = {}
    for file in files:
        df = load_file(file)
        if df is not None:
            key = os.path.splitext(os.path.basename(file))[0]
            dataframes[key] = df

    return dataframes


def transform_airports(df: pd.DataFrame) -> gpd.GeoDataFrame:
    """Transform airports data into GeoDataFrame with point geometry."""
    gdf = gpd.GeoDataFrame(
        df[["Airport-ID", "Airport-Name", "Airport-City", "Airport-Country"]],
        geometry=gpd.points_from_xy(
            df["Airport-Longitude"], df["Airport-Latitude"]
        ),
        crs="EPSG:4326",
    )
    gdf["Type"] = "Airport"
    return gdf


def transform_cities(df: pd.DataFrame) -> gpd.GeoDataFrame:
    """Transform cities data into GeoDataFrame."""
    gdf = gpd.GeoDataFrame(
        df[["Airport-City", "City-ISO-3", "City-ISO-2"]],
        geometry=gpd.GeoSeries.from_wkt(df["City-Shape"]),
        crs="EPSG:4326",
    )
    gdf["Type"] = "City"
    return gdf


def transform_countries(df: pd.DataFrame) -> gpd.GeoDataFrame:
    """Transform countries data into GeoDataFrame."""
    gdf = gpd.GeoDataFrame(
        df[["Airport-Country", "Country-ISO-2", "Country-ISO-3"]],
        geometry=gpd.GeoSeries.from_wkt(df["Country-Shape"]),
        crs="EPSG:4326",
    )
    gdf["Type"] = "Country"
    return gdf


def transform(
    dataframes: Dict[str, pd.DataFrame],
) -> Tuple[Optional[gpd.GeoDataFrame], Optional[gpd.GeoDataFrame]]:
    """Transform data into GeoDataFrames and separate by geometry type."""
    required = ["airports", "cities", "countries"]
    missing = [name for name in required if name not in dataframes]

    if missing:
        logging.error("Missing required DataFrames: %s", missing)
        return None, None

    airports_gdf = transform_airports(dataframes["airports"])
    cities_gdf = transform_cities(dataframes["cities"])
    countries_gdf = transform_countries(dataframes["countries"])

    # Combine point features (airports and cities)
    points_gdf = gpd.GeoDataFrame(
        pd.concat([airports_gdf, cities_gdf], ignore_index=True),
        crs="EPSG:4326",
    )

    logging.info(
        "Points GeoDataFrame created with %d features", len(points_gdf)
    )
    logging.info(
        "Polygons GeoDataFrame created with %d features", len(countries_gdf)
    )

    return points_gdf, countries_gdf


def ensure_dir(file_path: str) -> None:
    """Ensure directory exists for file."""
    os.makedirs(os.path.dirname(file_path), exist_ok=True)


def load(
    points_gdf: Optional[gpd.GeoDataFrame],
    polygons_gdf: Optional[gpd.GeoDataFrame],
    output_points: str,
    output_polygons: str,
) -> None:
    """Save GeoDataFrames as GeoJSON files."""
    # Create output directories
    ensure_dir(output_points)
    ensure_dir(output_polygons)

    # Save points GeoJSON
    if points_gdf is not None and not points_gdf.empty:
        points_gdf.to_file(output_points, driver="GeoJSON")
        logging.info("Points GeoJSON saved to %s", output_points)
    else:
        logging.warning("No points GeoDataFrame to save!")

    # Save polygons GeoJSON
    if polygons_gdf is not None and not polygons_gdf.empty:
        polygons_gdf.to_file(output_polygons, driver="GeoJSON")
        logging.info("Polygons GeoJSON saved to %s", output_polygons)
    else:
        logging.warning("No polygons GeoDataFrame to save!")


def geo_shape_etl(
    data_dir: str = os.getcwd(),
    directory: str = "../assets/data/geo",
    output_points: str = "../assets/data/geo/shapefiles/geo_points.geojson",
    output_polygons: str = "../assets/data/geo/shapefiles/geo_polygons.geojson",
) -> Tuple[Optional[gpd.GeoDataFrame], Optional[gpd.GeoDataFrame]]:
    """Run the full ETL pipeline to create GeoJSON files."""
    # Make paths absolute
    output_points_path = os.path.join(data_dir, output_points)
    output_polygons_path = os.path.join(data_dir, output_polygons)

    # Extract
    dataframes = extract(data_dir, directory)

    # Transform
    points_gdf, polygons_gdf = transform(dataframes)

    # Load
    load(points_gdf, polygons_gdf, output_points_path, output_polygons_path)

    return points_gdf, polygons_gdf


if __name__ == "__main__":
    points, polygons = geo_shape_etl()

    if points is not None and not points.empty:
        print("Points GeoDataFrame columns:", points.columns.tolist())

    if polygons is not None and not polygons.empty:
        print("Polygons GeoDataFrame columns:", polygons.columns.tolist())

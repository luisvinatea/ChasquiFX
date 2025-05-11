"""GeoShapeCrafter module for ETL pipeline to create GeoJSON files with airport coordinates inside a globe."""

import os
import json
from typing import Dict, Optional

import pandas as pd
import geopandas as gpd


def load_airport_info(data_dir: str) -> Optional[pd.DataFrame]:
    """Load airport info from JSON file."""
    file_path = os.path.join(
        data_dir, "backend/assets/data/geo/json/airport_info.json"
    )

    try:
        df = pd.read_json(file_path)
        return df
    except Exception as e:
        print(f"Failed to load airport_info.json: {e}")
        return None


def load_geojson_globe() -> Optional[Dict]:
    """Load built-in geojson globe for background."""
    try:
        # Try to use GeoPandas built-in dataset directly
        import geopandas.datasets

        world = gpd.read_file(
            geopandas.datasets.get_path("naturalearth_lowres")
        )
        world_json = json.loads(world.to_json())
        return world_json
    except (ImportError, AttributeError):
        print("Failed to load geojson globe from datasets")

    # Use minimal world representation as fallback
    print("Using minimal world representation")
    return create_minimal_world()


def create_minimal_world() -> Dict:
    """Create a minimal world representation if all else fails."""
    # Simple world outline as fallback
    world_outline = {
        "type": "FeatureCollection",
        "features": [
            {
                "type": "Feature",
                "geometry": {
                    "type": "MultiPolygon",
                    "coordinates": [
                        [
                            [
                                [180, 90],
                                [-180, 90],
                                [-180, -90],
                                [180, -90],
                                [180, 90],
                            ]
                        ]
                    ],
                },
                "properties": {"name": "World", "Type": "Background"},
            }
        ],
    }
    return world_outline


def transform_airports(df: pd.DataFrame) -> gpd.GeoDataFrame:
    """Transform airports data into GeoDataFrame with point geometry."""
    # Print columns for debugging
    print(f"Available columns: {df.columns.tolist()}")

    # Map to actual column names from output
    id_col = "id" if "id" in df.columns else "ident"
    name_col = "name" if "name" in df.columns else "Airport-Name"
    city_col = (
        "municipality" if "municipality" in df.columns else "Airport-City"
    )
    country_col = (
        "iso_country" if "iso_country" in df.columns else "Airport-Country"
    )

    # Get longitude and latitude columns from actual data
    lat_col = "latitude_deg" if "latitude_deg" in df.columns else "Latitude"
    lon_col = "longitude_deg" if "longitude_deg" in df.columns else "Longitude"

    # Create GeoDataFrame with available columns
    gdf = gpd.GeoDataFrame(
        df[[id_col, name_col, city_col, country_col]],
        geometry=gpd.points_from_xy(df[lon_col], df[lat_col]),
        crs="EPSG:4326",
    )
    gdf["Type"] = "Airport"
    return gdf


def ensure_dir(file_path: str) -> None:
    """Ensure directory exists for file."""
    os.makedirs(os.path.dirname(file_path), exist_ok=True)


def save_geojson(gdf: gpd.GeoDataFrame, output_path: str) -> None:
    """Save GeoDataFrame as GeoJSON file."""
    if gdf is not None and not gdf.empty:
        ensure_dir(output_path)
        gdf.to_file(output_path, driver="GeoJSON")
        print(f"GeoJSON saved to {output_path}")
    else:
        print("No GeoDataFrame to save!")


def combine_with_globe(
    airports_gdf: gpd.GeoDataFrame, globe_json: Dict
) -> gpd.GeoDataFrame:
    """Combine airport points with globe background."""
    # Convert globe GeoJSON to GeoDataFrame
    globe_features = globe_json["features"]
    globe_gdf = gpd.GeoDataFrame.from_features(globe_features, crs="EPSG:4326")
    globe_gdf["Type"] = "Background"

    # Combine both GeoDataFrames
    combined_gdf = gpd.GeoDataFrame(
        pd.concat([globe_gdf, airports_gdf], ignore_index=True),
        crs="EPSG:4326",
    )

    return combined_gdf


def geo_shape_etl(
    data_dir: str = "",
    output_path: str = "backend/assets/data/geo/shapefiles/airports_globe.geojson",
) -> Optional[gpd.GeoDataFrame]:
    """Run the ETL pipeline to create GeoJSON with airports plotted on a globe."""
    # Extract
    airports_df = load_airport_info(data_dir)
    if airports_df is None:
        print("Failed to load airport data")
        return None

    globe_json = load_geojson_globe()
    if globe_json is None:
        print("Failed to load globe geojson")
        return None

    # Transform
    airports_gdf = transform_airports(airports_df)
    combined_gdf = combine_with_globe(airports_gdf, globe_json)

    # Load
    save_geojson(combined_gdf, os.path.join(data_dir, output_path))

    return combined_gdf


if __name__ == "__main__":
    result = geo_shape_etl()

    if result is not None and not result.empty:
        print(
            f"Created GeoJSON with {len(result[result['Type'] == 'Airport'])} airports"
        )
        print(
            f"Background features: {len(result[result['Type'] == 'Background'])}"
        )

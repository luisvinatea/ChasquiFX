import pandas as pd
import geopandas as gpd
import glob
import os
import logging
from shapely.geometry import Point  # noqa: F401
from data_handler import DataHandler


class GeoShapeCrafter(DataHandler):
    def __init__(self, directory="processed",
                 output_points="merged/geo_points.shp",
                 output_polygons="merged/geo_polygons.shp"):
        # Prepend data_dir to output paths to make them absolute
        super().__init__(input_path=directory, output_path=output_points)
        self.directory = directory
        self.output_points = os.path.join(self.data_dir, output_points)
        self.output_polygons = os.path.join(self.data_dir, output_polygons)
        self.dataframes = {}

    def load_data(self):
        """Loads airports, cities, and countries CSVs."""
        patterns = [
            "clean_airports.csv",
            "clean_cities.csv",
            "clean_countries.csv"
        ]
        files = []
        for pattern in patterns:
            full_path = os.path.join(self.data_dir, self.directory, pattern)
            matched = glob.glob(full_path)
            files.extend(matched)
            logging.info(f"Searching for {pattern}: found {matched}")

        if not files:
            logging.warning(
                f"No target files found in {self.data_dir}/{self.directory}"
                )
            self.df = None
            return

        for file in files:
            filename = os.path.splitext(os.path.basename(file))[0]
            df_name = f"df_{filename}"
            try:
                df = pd.read_csv(file)
                setattr(self, df_name, df)
                self.dataframes[df_name] = df
                logging.info(f"Loaded {file} into {df_name}")
            except Exception as e:
                logging.error(f"Failed to load {file}: {e}")
        self.df = None

    def process_data(self):
        """Convert data to GeoDataFrames and separate by geometry type."""
        required = ['df_clean_airports',
                    'df_clean_cities',
                    'df_clean_countries']
        missing = [name for name in required if name not in self.dataframes]
        if missing:
            logging.error(f"Missing required DataFrames: {missing}")
            return

        airports = self.dataframes['df_clean_airports']
        cities = self.dataframes['df_clean_cities']
        countries = self.dataframes['df_clean_countries']

        airports_gdf = gpd.GeoDataFrame(
            airports[['Airport-ID',
                      'Airport-Name',
                      'Airport-City',
                      'Airport-Country']],
            geometry=gpd.points_from_xy(
                airports['Airport-Longitude'],
                airports['Airport-Latitude']
            ),
            crs="EPSG:4326"
        )

        cities_gdf = gpd.GeoDataFrame(
            cities[['Airport-City', 'City-ISO-3', 'City-ISO-2']],
            geometry=gpd.GeoSeries.from_wkt(cities['City-Shape']),
            crs="EPSG:4326"
        )

        countries_gdf = gpd.GeoDataFrame(
            countries[['Airport-Country', 'Country-ISO-2', 'Country-ISO-3']],
            geometry=gpd.GeoSeries.from_wkt(countries['Country-Shape']),
            crs="EPSG:4326"
        )

        airports_gdf['Type'] = 'Airport'
        cities_gdf['Type'] = 'City'
        countries_gdf['Type'] = 'Country'

        self.points_gdf = gpd.GeoDataFrame(
            pd.concat([airports_gdf, cities_gdf], ignore_index=True),
            crs="EPSG:4326"
        )
        self.polygons_gdf = countries_gdf
        logging.info(
            "Points GeoDataFrame created with %d features",
            len(self.points_gdf)
            )
        logging.info(
            "Polygons GeoDataFrame created with %d features",
            len(self.polygons_gdf)
            )
        self.df = None

    def save_data(self):
        """Save as separate shapefiles for points and polygons."""
        # Use absolute paths directly, no need to recompute dirname
        os.makedirs(os.path.dirname(self.output_points), exist_ok=True)
        if hasattr(self, 'points_gdf') and not self.points_gdf.empty:
            self.points_gdf.to_file(self.output_points)
            logging.info(f"Points shapefile saved to {self.output_points}")
        else:
            logging.warning("No points GeoDataFrame to save!")

        os.makedirs(os.path.dirname(self.output_polygons), exist_ok=True)
        if hasattr(self, 'polygons_gdf') and not self.polygons_gdf.empty:
            self.polygons_gdf.to_file(self.output_polygons)
            logging.info(f"Polygons shapefile saved to {self.output_polygons}")
        else:
            logging.warning("No polygons GeoDataFrame to save!")

    def get_dataframe(self, name):
        """Helper method to access a specific DataFrame by name."""
        return getattr(self, f"df_{name}", None)


if __name__ == "__main__":
    crafter = GeoShapeCrafter()
    crafter.execute()
    if hasattr(crafter, 'points_gdf') and not crafter.points_gdf.empty:
        print("Points GeoDataFrame columns:",
              crafter.points_gdf.columns.tolist())
    if hasattr(crafter, 'polygons_gdf') and not crafter.polygons_gdf.empty:
        print("Polygons GeoDataFrame columns:",
              crafter.polygons_gdf.columns.tolist())

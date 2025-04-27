"""GeoShapeCrafter class to create GeoDataFrames from CSV files."""
import os
import glob
import logging
import pandas as pd
import geopandas as gpd
from .data_ingestor import DataIngestor


class GeoShapeCrafter(DataIngestor):
    """GeoShapeCrafter class to create GeoDataFrames from CSV files."""
    def __init__(self, directory="../data/csv",
                 output_points="../data/shapefiles/geo_points.shp",
                 output_polygons="../data/shapefiles/geo_polygons.shp"):
        # Prepend data_dir to output paths to make them absolute
        super().__init__()
        # Ensure data_dir is set, fallback to current directory if not present
        if not hasattr(self, 'data_dir'):
            self.data_dir = os.getcwd()
        self.directory = directory
        self.output_points = os.path.join(self.data_dir, output_points)
        self.output_polygons = os.path.join(self.data_dir, output_polygons)
        self.dataframes = {}
        self.df = None
        self.points_gdf = None
        self.polygons_gdf = None

    def load_data(self):
        """Loads airports, cities, and countries CSVs."""
        patterns = [
            "airports.csv",
            "countries.csv"
        ]
        files = []
        for pattern in patterns:
            full_path = os.path.join(self.data_dir, self.directory, pattern)
            matched = glob.glob(full_path)
            files.extend(matched)
            logging.info("Searching for %s: found %s", pattern, matched)

        if not files:
            logging.warning(
                "No target files found in %s/%s", self.data_dir, self.directory
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
                logging.info("Loaded %s into %s", file, df_name)
            except (pd.errors.ParserError, OSError) as e:
                logging.error("Failed to load %s: %s", file, e)

    def process_data(self, *_args, **_kwargs):
        """Convert data to GeoDataFrames and separate by geometry type."""
        required = ['df_clean_airports',
                    'df_clean_cities',
                    'df_clean_countries']
        missing = [name for name in required if name not in self.dataframes]
        if missing:
            logging.error("Missing required DataFrames: %s", missing)
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

    def save_data(self, *_args, **_kwargs):
        """Save as separate shapefiles for points and polygons."""
        # Use absolute paths directly, no need to recompute dirname
        os.makedirs(os.path.dirname(self.output_points), exist_ok=True)
        if self.points_gdf is not None and not self.points_gdf.empty:
            self.points_gdf.to_file(self.output_points)
            logging.info("Points shapefile saved to %s", self.output_points)
        else:
            logging.warning("No points GeoDataFrame to save!")

        os.makedirs(os.path.dirname(self.output_polygons), exist_ok=True)
        if self.polygons_gdf is not None and not self.polygons_gdf.empty:
            self.polygons_gdf.to_file(self.output_polygons)
            logging.info(
                "Polygons shapefile saved to %s", self.output_polygons
            )
        else:
            logging.warning("No polygons GeoDataFrame to save!")

    def get_dataframe(self, name):
        """Helper method to access a specific DataFrame by name."""
        return getattr(self, f"df_{name}", None)

    def fetch_data(self):
        """Implementation of abstract method from DataIngestor."""
        self.load_data()

    def execute(self):
        """Runs the full data crafting pipeline: load, process, save."""
        self.load_data()
        self.process_data()
        self.save_data()


if __name__ == "__main__":
    crafter = GeoShapeCrafter()
    crafter.execute()
    if (
        hasattr(crafter, 'points_gdf')
        and crafter.points_gdf is not None
        and not crafter.points_gdf.empty
    ):
        print(
            "Points GeoDataFrame columns:",
            crafter.points_gdf.columns.tolist()
        )
    if (
        hasattr(crafter, 'polygons_gdf')
        and crafter.polygons_gdf is not None
        and not crafter.polygons_gdf.empty
    ):
        print(
            "Polygons GeoDataFrame columns:",
            crafter.polygons_gdf.columns.tolist()
        )

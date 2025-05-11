import unittest
import os
import pandas as pd
import geopandas as gpd
import shutil
import tempfile
from unittest.mock import patch, MagicMock
import sys
import json

# Add parent directory to path to import geo_shape_crafter
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from api.geo_shape_crafter import (
    load_airport_info,
    load_geojson_globe,
    transform_airports,
    combine_with_globe,
    save_geojson,
    geo_shape_etl,
    create_minimal_world,
)


class TestGeoShapeCrafter(unittest.TestCase):
    def setUp(self):
        """Set up test fixtures"""
        self.temp_dir = tempfile.mkdtemp()
        self.test_data_dir = os.path.join(self.temp_dir, "test_data")
        os.makedirs(self.test_data_dir, exist_ok=True)

        # Create test airports data
        self.test_airports = [
            {
                "Airport-ID": 1,
                "Airport-Name": "Airport 1",
                "Airport-City": "City 1",
                "Airport-Country": "Country 1",
                "Airport-Latitude": -27.6700,
                "Airport-Longitude": -48.5500,
            },
            {
                "Airport-ID": 2,
                "Airport-Name": "Airport 2",
                "Airport-City": "City 2",
                "Airport-Country": "Country 2",
                "Airport-Latitude": -12.0219,
                "Airport-Longitude": -77.1140,
            },
        ]

        # Save test data
        self.airports_path = os.path.join(
            self.test_data_dir, "backend/assets/data/geo/json"
        )
        os.makedirs(self.airports_path, exist_ok=True)
        self.airport_file = os.path.join(
            self.airports_path, "airport_info.json"
        )
        with open(self.airport_file, "w") as f:
            json.dump(self.test_airports, f)

        # Output directory
        self.output_path = os.path.join(
            self.test_data_dir, "backend/assets/data/geo/shapefiles"
        )
        os.makedirs(self.output_path, exist_ok=True)

        # Create dataframe
        self.df = pd.DataFrame(self.test_airports)

    def tearDown(self):
        """Tear down test fixtures"""
        shutil.rmtree(self.temp_dir)

    def test_load_airport_info(self):
        """Test loading airport info from JSON file"""
        result = load_airport_info(self.test_data_dir)
        self.assertIsNotNone(result)
        if result is not None:  # Add null check
            self.assertEqual(len(result), 2)
            self.assertIn("Airport-Latitude", result.columns)
            self.assertIn("Airport-Longitude", result.columns)

    def test_load_airport_info_invalid_file(self):
        """Test loading airport info from non-existent file"""
        result = load_airport_info("nonexistent_dir")
        self.assertIsNone(result)

    def test_load_geojson_globe(self):
        """Test loading geojson globe"""
        with patch("geopandas.read_file") as mock_read:
            mock_world = MagicMock()
            mock_world.to_json.return_value = json.dumps({
                "type": "FeatureCollection",
                "features": [
                    {"type": "Feature", "properties": {"name": "World"}}
                ],
            })
            mock_read.return_value = mock_world

            result = load_geojson_globe()
            self.assertIsNotNone(result)
            if result is not None:  # Add null check
                self.assertEqual(result["type"], "FeatureCollection")
                self.assertEqual(len(result["features"]), 1)

    def test_create_minimal_world(self):
        """Test creating minimal world representation"""
        result = create_minimal_world()
        self.assertIsNotNone(result)
        self.assertEqual(result["type"], "FeatureCollection")
        self.assertEqual(len(result["features"]), 1)
        self.assertEqual(result["features"][0]["properties"]["name"], "World")

    def test_transform_airports(self):
        """Test transforming airports data into GeoDataFrame"""
        result = transform_airports(self.df)
        self.assertIsInstance(result, gpd.GeoDataFrame)
        self.assertEqual(len(result), 2)
        self.assertEqual(result.crs, "EPSG:4326")
        self.assertEqual(result.iloc[0]["Type"], "Airport")

    def test_combine_with_globe(self):
        """Test combining airports with globe"""
        # Create test GeoDataFrames
        airports_gdf = transform_airports(self.df)
        globe_json = create_minimal_world()

        result = combine_with_globe(airports_gdf, globe_json)
        self.assertIsInstance(result, gpd.GeoDataFrame)
        self.assertEqual(len(result), 3)  # 2 airports + 1 globe feature
        self.assertEqual(result.crs, "EPSG:4326")
        self.assertEqual(sum(result["Type"] == "Airport"), 2)
        self.assertEqual(sum(result["Type"] == "Background"), 1)

    @patch("api.geo_shape_crafter.save_geojson")
    def test_save_geojson(self, mock_save):
        """Test saving GeoDataFrame as GeoJSON"""
        # Create a real test file
        test_output = os.path.join(self.output_path, "test_output.geojson")
        gdf = transform_airports(self.df)
        save_geojson(gdf, test_output)

        # Check file was created
        self.assertTrue(os.path.exists(test_output))

        # Try loading it to confirm it's valid
        loaded = gpd.read_file(test_output)
        self.assertEqual(len(loaded), 2)

    def test_save_geojson_empty(self):
        """Test saving empty GeoDataFrame"""
        test_output = os.path.join(self.output_path, "empty_output.geojson")
        # Create empty GeoDataFrame instead of None
        empty_gdf = gpd.GeoDataFrame()
        save_geojson(empty_gdf, test_output)
        self.assertFalse(os.path.exists(test_output))

    @patch("api.geo_shape_crafter.load_airport_info")
    @patch("api.geo_shape_crafter.load_geojson_globe")
    @patch("api.geo_shape_crafter.transform_airports")
    @patch("api.geo_shape_crafter.combine_with_globe")
    @patch("api.geo_shape_crafter.save_geojson")
    def test_geo_shape_etl_pipeline(
        self, mock_save, mock_combine, mock_transform, mock_globe, mock_load
    ):
        """Test the full ETL pipeline with mocks"""
        # Set up mocks
        mock_df = pd.DataFrame(self.test_airports)
        mock_load.return_value = mock_df

        mock_globe_json = create_minimal_world()
        mock_globe.return_value = mock_globe_json

        mock_airports_gdf = gpd.GeoDataFrame(
            mock_df[
                [
                    "Airport-ID",
                    "Airport-Name",
                    "Airport-City",
                    "Airport-Country",
                ]
            ],
            geometry=gpd.points_from_xy(
                mock_df["Airport-Longitude"], mock_df["Airport-Latitude"]
            ),
            crs="EPSG:4326",
        )
        mock_transform.return_value = mock_airports_gdf

        mock_combined_gdf = gpd.GeoDataFrame(
            pd.concat([
                gpd.GeoDataFrame.from_features(
                    mock_globe_json["features"], crs="EPSG:4326"
                ),
                mock_airports_gdf,
            ]),
            crs="EPSG:4326",
        )
        mock_combine.return_value = mock_combined_gdf

        # Run ETL
        result = geo_shape_etl(self.test_data_dir)

        # Check calls
        mock_load.assert_called_once_with(self.test_data_dir)
        mock_globe.assert_called_once()
        mock_transform.assert_called_once_with(mock_df)
        mock_combine.assert_called_once_with(
            mock_airports_gdf, mock_globe_json
        )
        mock_save.assert_called_once()

        # Fix the comparison - use pd.testing.assert_frame_equal for DataFrame comparison
        # or just check that it's the same object
        self.assertIs(result, mock_combined_gdf)

    def test_geo_shape_etl_integration(self):
        """Test the full integration of geo_shape_etl"""
        output_file = os.path.join(self.output_path, "airports_globe.geojson")

        # Run the ETL pipeline
        result = geo_shape_etl(
            data_dir=self.test_data_dir,
            output_path=os.path.join(
                self.output_path, "airports_globe.geojson"
            ),
        )

        # Check output
        self.assertIsNotNone(result)
        self.assertIsInstance(result, gpd.GeoDataFrame)

        # Since we use a real file, let's check it exists
        self.assertTrue(os.path.exists(output_file))


if __name__ == "__main__":
    unittest.main()

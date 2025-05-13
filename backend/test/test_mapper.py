import unittest
import os
import pandas as pd
import tempfile
import shutil
from unittest.mock import patch
import sys
import json
from typing import Optional, Dict

# Add parent directory to path to import geo_service
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from api.geo_service import (
    load_json_file,
    extract_data,
    build_airport_index,
    build_country_index,
    build_airline_index,
    enrich_route_data,
    create_route_lookups,
    transform_data,
    save_dataframe,
    combine_route_with_lookup_data,
    route_mapper,
    get_complete_route_info,
)


class TestMapper(unittest.TestCase):
    def setUp(self):
        self.temp_dir = tempfile.mkdtemp()
        self.test_data_dir = os.path.join(self.temp_dir, "test_data")
        self.json_dir = os.path.join(self.test_data_dir, "json")
        self.output_dir = os.path.join(self.test_data_dir, "enriched")

        os.makedirs(self.json_dir, exist_ok=True)
        os.makedirs(self.output_dir, exist_ok=True)

        # Create test data
        self.routes_data = [
            {
                "Airline-IATA": "LA",
                "Airline-Name": "LATAM",
                "AirlineID": "123",
                "Departure-IATA": "FLN",
                "Arrival-IATA": "LIM",
                "Route": "FLN-LIM",
            },
            {
                "Airline-IATA": "AV",
                "Airline-Name": "Avianca",
                "AirlineID": "456",
                "Departure-IATA": "FLN",
                "Arrival-IATA": "BOG",
                "Route": "FLN-BOG",
            },
            {
                "Airline-IATA": "AV",
                "Airline-Name": "Avianca",
                "AirlineID": "456",
                "Departure-IATA": "BOG",
                "Arrival-IATA": "LIM",
                "Route": "BOG-LIM",
            },
        ]

        self.airports_data = [
            {
                "IATA": "FLN",
                "Name": "Florianopolis",
                "City": "Florianopolis",
                "Country": "Brazil",
                "Latitude": -27.67,
                "Longitude": -48.55,
            },
            {
                "IATA": "LIM",
                "Name": "Jorge Chavez",
                "City": "Lima",
                "Country": "Peru",
                "Latitude": -12.02,
                "Longitude": -77.11,
            },
            {
                "IATA": "BOG",
                "Name": "El Dorado",
                "City": "Bogota",
                "Country": "Colombia",
                "Latitude": 4.70,
                "Longitude": -74.14,
            },
        ]

        self.countries_data = [
            {
                "Name": "Brazil",
                "Code": "BR",
                "Region": "South America",
                "Continent": "South America",
            },
            {
                "Name": "Peru",
                "Code": "PE",
                "Region": "South America",
                "Continent": "South America",
            },
            {
                "Name": "Colombia",
                "Code": "CO",
                "Region": "South America",
                "Continent": "South America",
            },
        ]

        self.airlines_data = [
            {
                "AirlineID": "123",
                "Name": "LATAM Airlines",
                "IATA": "LA",
                "ICAO": "LAN",
                "Callsign": "LAN CHILE",
                "Country": "Chile",
                " Active": "Y",
            },
            {
                "AirlineID": "456",
                "Name": "Avianca",
                "IATA": "AV",
                "ICAO": "AVA",
                "Callsign": "AVIANCA",
                "Country": "Colombia",
                " Active": "Y",
            },
            {
                "AirlineID": "789",
                "Name": "Copa Airlines",
                "IATA": "CM",
                "ICAO": "CMP",
                "Callsign": "COPA",
                "Country": "Panama",
                " Active": "Y",
            },
        ]

        # Save test data to files
        self.routes_file = os.path.join(self.json_dir, "routes.json")
        self.airports_file = os.path.join(self.json_dir, "airport_info.json")
        self.countries_file = os.path.join(self.json_dir, "countries.json")
        self.airlines_file = os.path.join(self.json_dir, "airlines.json")

        with open(self.routes_file, "w") as f:
            json.dump(self.routes_data, f)

        with open(self.airports_file, "w") as f:
            json.dump(self.airports_data, f)

        with open(self.countries_file, "w") as f:
            json.dump(self.countries_data, f)

        with open(self.airlines_file, "w") as f:
            json.dump(self.airlines_data, f)

        # Create dataframes
        self.routes_df = pd.DataFrame(self.routes_data)
        self.airports_df = pd.DataFrame(self.airports_data)
        self.countries_df = pd.DataFrame(self.countries_data)
        self.airlines_df = pd.DataFrame(self.airlines_data)

    def tearDown(self):
        shutil.rmtree(self.temp_dir)

    def test_load_json_file(self):
        result = load_json_file(self.routes_file)
        self.assertIsNotNone(result)
        if result is not None:  # Add null check
            self.assertFalse(result.empty)
            self.assertEqual(len(result), 3)
            self.assertIn("Departure-IATA", result.columns)

    def test_load_json_file_invalid(self):
        result = load_json_file("nonexistent_file.json")
        self.assertIsNone(result)

    @patch("api.geo_service.load_json_file")
    def test_extract_data(self, mock_load):
        mock_load.side_effect = [
            self.routes_df,
            self.airports_df,
            self.countries_df,
            self.airlines_df,
        ]
        result = extract_data()
        self.assertEqual(mock_load.call_count, 4)
        self.assertIn("routes", result)
        self.assertIn("airports", result)
        self.assertIn("countries", result)
        self.assertIn("airlines", result)

    def test_build_airport_index(self):
        result = build_airport_index(self.airports_df)
        self.assertEqual(len(result), 3)
        self.assertIn("FLN", result)
        self.assertEqual(result["FLN"]["name"], "Florianopolis")
        self.assertEqual(result["LIM"]["city"], "Lima")
        self.assertEqual(result["BOG"]["country"], "Colombia")

    def test_build_country_index(self):
        result = build_country_index(self.countries_df)
        self.assertEqual(len(result), 3)
        self.assertIn("Brazil", result)
        self.assertEqual(result["Brazil"]["code"], "BR")
        self.assertEqual(result["Peru"]["region"], "South America")
        self.assertEqual(result["Colombia"]["continent"], "South America")

    def test_build_airline_index(self):
        result = build_airline_index(self.airlines_df)
        self.assertEqual(len(result), 3)
        self.assertIn("123", result)
        self.assertEqual(result["123"]["name"], "LATAM Airlines")
        self.assertEqual(result["456"]["iata"], "AV")
        self.assertEqual(result["789"]["country"], "Panama")
        self.assertTrue(result["123"]["active"])

    def test_enrich_route_data(self):
        airport_dict = build_airport_index(self.airports_df)
        country_dict = build_country_index(self.countries_df)
        airline_dict = build_airline_index(self.airlines_df)

        result = enrich_route_data(
            self.routes_df, airport_dict, country_dict, airline_dict
        )
        self.assertEqual(len(result), 3)

        # Check enriched fields
        self.assertIn("Departure-Airport-Name", result.columns)
        self.assertIn("Arrival-City", result.columns)
        self.assertIn("Airline-Name", result.columns)
        self.assertIn("Airline-ICAO", result.columns)
        self.assertIn("Airline-Callsign", result.columns)
        self.assertIn("Airline-Country", result.columns)
        self.assertIn("Airline-Active", result.columns)

        # Check specific values
        fln_lim_row = result[result["Route"] == "FLN-LIM"].iloc[0]
        self.assertEqual(fln_lim_row["Departure-City"], "Florianopolis")
        self.assertEqual(fln_lim_row["Arrival-Country"], "Peru")
        self.assertEqual(fln_lim_row["Airline-Name"], "LATAM Airlines")
        self.assertEqual(fln_lim_row["Airline-ICAO"], "LAN")
        self.assertEqual(fln_lim_row["Airline-Country"], "Chile")
        self.assertTrue(fln_lim_row["Airline-Active"])

    def test_create_route_lookups(self):
        airport_dict = build_airport_index(self.airports_df)
        country_dict = build_country_index(self.countries_df)
        airline_dict = build_airline_index(self.airlines_df)
        enriched_df = enrich_route_data(
            self.routes_df, airport_dict, country_dict, airline_dict
        )

        result = create_route_lookups(enriched_df)
        self.assertIn("airports", result)
        self.assertIn("cities", result)
        self.assertIn("routes_index", result)

        # Check specific values
        self.assertEqual(len(result["airports"]), 3)
        self.assertTrue(len(result["cities"]) > 0)

    @patch("api.geo_service.extract_data")
    @patch("api.geo_service.transform_data")
    @patch("api.geo_service.load_data")
    def test_route_mapper(self, mock_load, mock_transform, mock_extract):
        mock_extract.return_value = {
            "routes": self.routes_df,
            "airports": self.airports_df,
            "countries": self.countries_df,
        }

        mock_transform.return_value = {
            "enriched_routes": pd.DataFrame({"test": [1, 2]}),
            "airports": pd.DataFrame({"test": [3, 4]}),
        }

        # Use the return value to avoid unused variable warning
        transformed_data = route_mapper()

        mock_extract.assert_called_once()
        mock_transform.assert_called_once()
        mock_load.assert_called_once()

        # Assert something about the return value
        self.assertIsNotNone(transformed_data)

    def test_combine_route_with_lookup_data(self):
        route_df = pd.DataFrame(
            {
                "Departure-IATA": ["FLN", "BOG"],
                "Arrival-IATA": ["LIM", "LIM"],
                "Route": ["FLN-LIM", "BOG-LIM"],
            }
        )

        airport_df = pd.DataFrame(
            {
                "IATA": ["FLN", "LIM", "BOG"],
                "Airport-Name": ["Florianopolis", "Jorge Chavez", "El Dorado"],
                "City": ["Florianopolis", "Lima", "Bogota"],
            }
        )

        result = combine_route_with_lookup_data(route_df, airport_df)
        self.assertEqual(len(result), 2)
        self.assertIn("City_dep", result.columns)
        self.assertIn("City_arr", result.columns)

    def test_save_dataframe(self):
        df = pd.DataFrame({"test": [1, 2, 3]})
        test_file = "test_file"
        save_dataframe(df, test_file)

        # Check files were created (need to use OUTPUT_DIR from geo_service module)
        from api.geo_service import OUTPUT_DIR

        self.assertTrue(
            os.path.exists(os.path.join(OUTPUT_DIR, f"{test_file}.parquet"))
        )
        self.assertTrue(
            os.path.exists(os.path.join(OUTPUT_DIR, f"{test_file}.json"))
        )

    @patch("pandas.read_parquet")
    def test_get_complete_route_info(self, mock_read_parquet):
        # Mock read_parquet to return our test dataframes
        mock_read_parquet.side_effect = [self.routes_df, self.airports_df]

        result = get_complete_route_info("FLN", "LIM")
        self.assertIn("direct", result)
        self.assertIn("one_stop", result)
        self.assertIn("two_stop", result)

    def test_transform_data(self):
        # Use Mapping type for covariance
        from typing import cast

        # Cast to the expected type
        data_frames = cast(
            Dict[str, Optional[pd.DataFrame]],
            {
                "routes": self.routes_df,
                "airports": self.airports_df,
                "countries": self.countries_df,
                "airlines": self.airlines_df,
            },
        )

        result = transform_data(data_frames)
        self.assertIn("enriched_routes", result)
        self.assertIn("airports", result)
        self.assertIn("airlines", result)
        self.assertEqual(len(result["enriched_routes"]), 3)
        self.assertEqual(len(result["airlines"]), 3)


if __name__ == "__main__":
    unittest.main()

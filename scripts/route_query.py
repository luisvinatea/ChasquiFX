"""RouteFinder class to find direct, 1-stop, and 2-stop flights
from a given start airport to an end airport.
This class inherits from DataIngestor and uses vectorized operations
for efficiency.
It uses pandas for data manipulation and logging for tracking progress.
"""
import os
import logging
from collections import defaultdict
from typing import Optional, Dict, Set
import pandas as pd
# Import specific exceptions
from pandas.errors import EmptyDataError, ParserError
from .data_ingestor import DataIngestor

DATA_DIR = "../data"
os.makedirs(os.path.join(DATA_DIR, "log"), exist_ok=True)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
    handlers=[
        logging.FileHandler(os.path.join(
            DATA_DIR, "log/route_query.log"), encoding="utf-8"),
        logging.StreamHandler()
    ]
)


class RouteFinder(DataIngestor):
    """RouteFinder class to find direct, 1-stop, and 2-stop flights."""

    def __init__(self, input_path="merged/itinerary.csv",
                 output_dir="ready",
                 start_airport="FLN",
                 end_airport="LIM") -> None:
        self.data_dir = DATA_DIR
        self.input_path = os.path.join(self.data_dir, input_path)
        self.output_dir = os.path.join(self.data_dir, output_dir)
        self.start_airport = start_airport
        self.end_airport = end_airport
        self.route_dict: Dict[tuple, list] = defaultdict(list)
        self.airports_from: Dict[str, Set[str]] = defaultdict(set)
        self.airports_to: Dict[str, Set[str]] = defaultdict(set)
        self.df: Optional[pd.DataFrame] = None
        self.direct_routes: Optional[pd.DataFrame] = pd.DataFrame()
        self.one_stop_routes: Optional[pd.DataFrame] = pd.DataFrame()
        self.two_stop_routes: Optional[pd.DataFrame] = pd.DataFrame()

    def fetch_data(self) -> pd.DataFrame:
        """Load itineraries data from the specified input path."""
        if not os.path.exists(self.input_path):
            logging.error("Itineraries file not found at %s", self.input_path)
            return pd.DataFrame()

        try:
            df = pd.read_csv(self.input_path)
            logging.info("Loaded %d routes from %s", len(df), self.input_path)
            self.df = df
            return df
        except EmptyDataError:
            logging.error("File %s is empty.", self.input_path)
            return pd.DataFrame()
        except FileNotFoundError:
            logging.error("File not found at %s", self.input_path)
            return pd.DataFrame()
        except ParserError as pe:
            logging.error("Error parsing CSV file %s: %s", self.input_path, pe)
            return pd.DataFrame()

    def _precompute_structures(self, df: pd.DataFrame) -> None:
        """Helper to compute route_dict, airports_from, airports_to from df."""
        self.route_dict.clear()
        self.airports_from.clear()
        self.airports_to.clear()
        for _, row in df.iterrows():
            if 'Departure-IATA' in row and 'Arrival-IATA' in row:
                dep_iata = row['Departure-IATA']
                arr_iata = row['Arrival-IATA']
                if pd.notna(dep_iata) and pd.notna(arr_iata):
                    route_tuple = (dep_iata, arr_iata)
                    self.route_dict[route_tuple].append(row.to_dict())
                    self.airports_from[dep_iata].add(arr_iata)
                    self.airports_to[arr_iata].add(dep_iata)
                else:
                    logging.warning(
                        "Skipping row due to missing IATA codes: %s",
                        row.to_dict())
            else:
                logging.warning(
                    "Skipping row due to missing columns: %s", row.to_dict())

    def process_data(self, df: pd.DataFrame) -> pd.DataFrame:
        """Find direct, 1-stop, and 2-stop routes using the input DataFrame."""
        if df is None or df.empty:
            logging.warning(
                "Input DataFrame is empty or None. Cannot process data.")
            self.direct_routes = pd.DataFrame()
            self.one_stop_routes = pd.DataFrame()
            self.two_stop_routes = pd.DataFrame()
            return pd.DataFrame()

        self._precompute_structures(df)

        direct_key = (self.start_airport, self.end_airport)
        direct_rows = self.route_dict.get(direct_key, [])
        self.direct_routes = pd.DataFrame(direct_rows)

        mid_airports = (
            self.airports_from.get(self.start_airport, set()) &
            self.airports_to.get(self.end_airport, set())
        )
        if mid_airports:
            start_df = df[df['Departure-IATA'] == self.start_airport]
            end_df = df[df['Arrival-IATA'] == self.end_airport]
            if not start_df.empty and not end_df.empty:
                one_stop_routes_df = start_df[start_df['Arrival-IATA'].isin(
                    mid_airports)].merge(
                    end_df[end_df['Departure-IATA'].isin(mid_airports)],
                    left_on='Arrival-IATA',
                    right_on='Departure-IATA',
                    how='inner',
                    suffixes=('_leg1', '_leg2')
                )
                self.one_stop_routes = one_stop_routes_df
            else:
                self.one_stop_routes = pd.DataFrame()
        else:
            self.one_stop_routes = pd.DataFrame()

        mid1_candidates = self.airports_from.get(self.start_airport, set())
        mid2_candidates = self.airports_to.get(self.end_airport, set())

        mid_connections = df[
            (df['Departure-IATA'].isin(mid1_candidates)) &
            (df['Arrival-IATA'].isin(mid2_candidates))
        ]

        if not mid_connections.empty and mid1_candidates and mid2_candidates:
            leg1_df = df[df['Departure-IATA'] == self.start_airport]
            leg3_df = df[df['Arrival-IATA'] == self.end_airport]

            if not leg1_df.empty and not leg3_df.empty:
                two_stop_leg1_mid = leg1_df[
                    leg1_df['Arrival-IATA'].isin(
                        mid_connections['Departure-IATA'])
                ].merge(
                    mid_connections,
                    left_on='Arrival-IATA',
                    right_on='Departure-IATA',
                    how='inner',
                    suffixes=('_leg1', '_leg2')
                )

                if not two_stop_leg1_mid.empty:
                    two_stop_routes_df = two_stop_leg1_mid[
                        two_stop_leg1_mid['Arrival-IATA_leg2'].isin(
                            leg3_df['Departure-IATA'])
                    ].merge(
                        leg3_df,
                        left_on='Arrival-IATA_leg2',
                        right_on='Departure-IATA',
                        how='inner',
                        suffixes=('_mid', '_leg3')
                    )
                    self.two_stop_routes = two_stop_routes_df
                else:
                    self.two_stop_routes = pd.DataFrame()
            else:
                self.two_stop_routes = pd.DataFrame()
        else:
            self.two_stop_routes = pd.DataFrame()

        total_routes = len(df)
        direct_len = len(
            self.direct_routes) if self.direct_routes is not None else 0
        one_stop_len = len(
            self.one_stop_routes) if self.one_stop_routes is not None else 0
        two_stop_len = len(
            self.two_stop_routes) if self.two_stop_routes is not None else 0

        found_routes = direct_len + one_stop_len + two_stop_len
        completeness = (
            found_routes / total_routes
        ) * 100 if total_routes > 0 else 0
        logging.info(
            ("Analyzed %d routes. Found: %d direct, %d 1-stop, %d 2-stop. "
             "Completeness: %.2f%%"),
            total_routes,
            direct_len,
            one_stop_len,
            two_stop_len,
            completeness
        )

        if found_routes == 0:
            print(
                f"No flight information found for "
                f"{self.start_airport} to {self.end_airport}."
            )
            print(f"Number of routes analyzed: {total_routes}")
            print(f"Database completeness score: {completeness:.2f}%")

        return pd.DataFrame()

    def save_data(self, df: pd.DataFrame) -> None:
        """Save route combinations to separate files."""
        _ = df
        os.makedirs(self.output_dir, exist_ok=True)

        if self.direct_routes is not None and not self.direct_routes.empty:
            cols_to_save = ['Airline-IATA', 'Airline-Name', 'Route']
            if all(col in self.direct_routes.columns for col in cols_to_save):
                direct_output = self.direct_routes[cols_to_save]
                output_file = os.path.join(
                    self.output_dir, "direct_flights.csv")
                direct_output.to_csv(output_file, index=False)
                logging.info(
                    "Saved %d direct flights to %s",
                    len(direct_output),
                    output_file
                )
            else:
                logging.warning(
                    "Direct routes DataFrame missing required columns. "
                    "Skipping save.")
        else:
            logging.info("No direct flights to save")

        if self.one_stop_routes is not None and not self.one_stop_routes.empty:
            cols_to_select = [
                'Airline-IATA_leg1', 'Airline-Name_leg1', 'Route_leg1',
                'Airline-IATA_leg2', 'Airline-Name_leg2', 'Route_leg2'
            ]
            rename_map = {
                'Airline-IATA_leg1': 'Airline-IATA_1',
                'Airline-Name_leg1': 'Airline-Name_1',
                'Route_leg1': 'Route_1',
                'Airline-IATA_leg2': 'Airline-IATA_2',
                'Airline-Name_leg2': 'Airline-Name_2',
                'Route_leg2': 'Route_2'
            }
            # Check if all required columns exist before selecting/renaming
            required_cols_exist = all(
                col in self.one_stop_routes.columns for col in cols_to_select)
            if required_cols_exist:
                one_stop_output = self.one_stop_routes[cols_to_select].rename(
                    columns=rename_map)
                output_file = os.path.join(
                    self.output_dir, "one_stop_flights.csv")
                one_stop_output.to_csv(output_file, index=False)
                logging.info(
                    "Saved %d 1-stop flights to %s",
                    len(one_stop_output),
                    output_file
                )
            else:
                logging.warning(
                    "One-stop routes DataFrame missing required columns. "
                    "Skipping save.")
                logging.debug("One-stop columns: %s",
                              self.one_stop_routes.columns)

        else:
            logging.info("No 1-stop flights to save")

        if self.two_stop_routes is not None and not self.two_stop_routes.empty:
            cols_to_select = [
                'Airline-IATA_leg1', 'Airline-Name_leg1', 'Route_leg1',
                'Airline-IATA_leg2', 'Airline-Name_leg2', 'Route_leg2',
                'Airline-IATA', 'Airline-Name', 'Route'
            ]
            rename_map = {
                'Airline-IATA_leg1': 'Airline-IATA_1',
                'Airline-Name_leg1': 'Airline-Name_1',
                'Route_leg1': 'Route_1',
                'Airline-IATA_leg2': 'Airline-IATA_2',
                'Airline-Name_leg2': 'Airline-Name_2',
                'Route_leg2': 'Route_2',
                'Airline-IATA': 'Airline-IATA_3',
                'Airline-Name': 'Airline-Name_3',
                'Route': 'Route_3'
            }
            # Check if all required columns exist before selecting/renaming
            required_cols_exist = all(
                col in self.two_stop_routes.columns for col in cols_to_select)
            if required_cols_exist:
                two_stop_output = self.two_stop_routes[cols_to_select].rename(
                    columns=rename_map)
                output_file = os.path.join(
                    self.output_dir, "two_stop_flights.csv")
                two_stop_output.to_csv(output_file, index=False)
                logging.info(
                    "Saved %d 2-stop flights to %s",
                    len(two_stop_output),
                    output_file
                )
            else:
                logging.warning(
                    "Two-stop routes DataFrame missing required columns. "
                    "Skipping save.")
                logging.debug("Two-stop columns: %s",
                              self.two_stop_routes.columns)
        else:
            logging.info("No 2-stop flights to save")

    def load_data(self) -> pd.DataFrame:
        """Load processed data (not implemented for RouteFinder)."""
        logging.warning(
            "load_data is not implemented for RouteFinder. "
            "Use fetch_data to load raw itineraries."
        )
        return pd.DataFrame()


if __name__ == "__main__":
    finder = RouteFinder(start_airport="FLN", end_airport="LIM")
    processed_data = finder.get_data()
    logging.info(
        "Route finding process complete. Check files in %s", finder.output_dir)

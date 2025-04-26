import pandas as pd
import numpy as np  # noqa: F401
import os
import logging
from collections import defaultdict
from data_handler import DataHandler


class RouteFinder(DataHandler):
    def __init__(self, input_path="merged/itinerary.csv",
                 output_dir="ready",
                 start_airport="FLN",
                 end_airport="LIM"):
        super().__init__(
            input_path=input_path,
            output_path=os.path.join(output_dir, "direct_flights.csv")
        )
        self.output_dir = os.path.join(self.data_dir, output_dir)
        self.start_airport = start_airport
        self.end_airport = end_airport
        self.route_dict = defaultdict(list)
        self.airports_from = defaultdict(set)
        self.airports_to = defaultdict(set)
        self.itineraries = None

    def load_data(self):
        """Load itineraries and precompute tuple-based structures."""
        full_path = os.path.join(self.data_dir, self.input_path)
        if not os.path.exists(full_path):
            logging.error(f"Itineraries file not found at {full_path}")
            self.df = None
            return

        self.itineraries = pd.read_csv(full_path)
        for idx, row in self.itineraries.iterrows():
            route_tuple = (row['Departure-IATA'], row['Arrival-IATA'])
            self.route_dict[route_tuple].append(row)
            self.airports_from[row['Departure-IATA']].add(row['Arrival-IATA'])
            self.airports_to[row['Arrival-IATA']].add(row['Departure-IATA'])

        logging.info(f"Loaded {len(self.itineraries)} routes from {full_path}")
        self.df = self.itineraries

    def process_data(self):
        """Find direct, 1-stop, and 2-stop routes with vector operations."""
        if self.itineraries is None:
            logging.warning("No itineraries loaded!")
            return

        # Direct flights
        direct_key = (self.start_airport, self.end_airport)
        direct_rows = self.route_dict[direct_key]
        direct_routes = pd.DataFrame(
            direct_rows) if direct_rows else pd.DataFrame()

        # 1-stop flights: Vectorized merge
        mid_airports = (
            self.airports_from[self.start_airport] &
            self.airports_to[self.end_airport]
        )
        if mid_airports:
            start_df = self.itineraries[
                self.itineraries['Departure-IATA'] == self.start_airport
            ]
            end_df = self.itineraries[
                self.itineraries['Arrival-IATA'] == self.end_airport
            ]
            one_stop_routes = start_df[start_df['Arrival-IATA'].isin(
                mid_airports)].merge(
                end_df[end_df['Departure-IATA'].isin(mid_airports)],
                left_on='Arrival-IATA',
                right_on='Departure-IATA',
                how='inner',
                suffixes=('_leg1', '_leg2')
            )
        else:
            one_stop_routes = pd.DataFrame()

        # 2-stop flights: Vectorized chained merges
        mid1_candidates = self.airports_from[self.start_airport]
        mid2_candidates = self.airports_to[self.end_airport]
        mid_connections = self.itineraries[
            (self.itineraries['Departure-IATA'].isin(mid1_candidates)) &
            (self.itineraries['Arrival-IATA'].isin(mid2_candidates))
        ]
        if not mid_connections.empty:
            leg1_df = self.itineraries[
                self.itineraries['Departure-IATA'] == self.start_airport
            ]
            leg3_df = self.itineraries[
                self.itineraries['Arrival-IATA'] == self.end_airport
            ]
            two_stop_leg1_mid = leg1_df[leg1_df['Arrival-IATA'].isin(
                mid_connections['Departure-IATA'])].merge(
                mid_connections,
                left_on='Arrival-IATA',
                right_on='Departure-IATA',
                how='inner',
                suffixes=('_leg1', '_leg2')
            )
            two_stop_routes = two_stop_leg1_mid[two_stop_leg1_mid[
                'Arrival-IATA_leg2'].isin(leg3_df['Departure-IATA'])].merge(
                leg3_df,
                left_on='Arrival-IATA_leg2',
                right_on='Departure-IATA',
                how='inner',
                suffixes=('_mid', '_leg3')  # Adjusted suffixes for clarity
            )
        else:
            two_stop_routes = pd.DataFrame()

        # Store results
        self.direct_routes = direct_routes
        self.one_stop_routes = one_stop_routes
        self.two_stop_routes = two_stop_routes

        total_routes = len(self.itineraries)
        found_routes = (
            len(direct_routes) +
            len(one_stop_routes) +
            len(two_stop_routes)
        )
        completeness = (
            found_routes / total_routes
        ) * 100 if total_routes > 0 else 0
        logging.info(
            f"Analyzed {total_routes} routes. "
            f"Found: {len(direct_routes)} direct, "
            f"{len(one_stop_routes)} 1-stop, "
            f"{len(two_stop_routes)} 2-stop. "
            f"Completeness: {completeness:.2f}%"
        )

        if found_routes == 0:
            print(
                f"No flight information found for "
                f"{self.start_airport} to {self.end_airport}."
            )
            print(f"Number of routes analyzed: {total_routes}")
            print(f"Database completeness score: {completeness:.2f}%")

    def save_data(self):
        """Save route combinations to separate files."""
        os.makedirs(self.output_dir, exist_ok=True)

        # Direct flights
        if not self.direct_routes.empty:
            direct_output = self.direct_routes[
                ['Airline-IATA', 'Airline-Name', 'Route']
            ]
            direct_output.to_csv(
                os.path.join(self.output_dir, "direct_flights.csv"),
                index=False
            )
            logging.info(
                f"Saved {len(direct_output)} direct flights to "
                f"{self.output_dir}/direct_flights.csv"
            )
        else:
            logging.info("No direct flights to save")

        # 1-stop flights
        if not self.one_stop_routes.empty:
            one_stop_output = self.one_stop_routes[[
                'Airline-IATA_leg1',
                'Airline-Name_leg1',
                'Route_leg1',
                'Airline-IATA_leg2',
                'Airline-Name_leg2',
                'Route_leg2'
            ]].rename(columns={
                'Airline-IATA_leg1': 'Airline-IATA_1',
                'Airline-Name_leg1': 'Airline-Name_1',
                'Route_leg1': 'Route_1',
                'Airline-IATA_leg2': 'Airline-IATA_2',
                'Airline-Name_leg2': 'Airline-Name_2',
                'Route_leg2': 'Route_2'
            })
            one_stop_output.to_csv(
                os.path.join(self.output_dir, "one_stop_flights.csv"),
                index=False
            )
            logging.info(
                f"Saved {len(one_stop_output)} 1-stop flights to "
                f"{self.output_dir}/one_stop_flights.csv"
            )
        else:
            logging.info("No 1-stop flights to save")

        # 2-stop flights
        if not self.two_stop_routes.empty:
            two_stop_output = self.two_stop_routes[[
                'Airline-IATA_leg1',
                'Airline-Name_leg1',
                'Route_leg1',
                'Airline-IATA_leg2',
                'Airline-Name_leg2',
                'Route_leg2',
                'Airline-IATA',      # Adjusted to match actual column
                'Airline-Name',      # Adjusted to match actual column
                'Route'              # Adjusted to match actual column
            ]].rename(columns={
                'Airline-IATA_leg1': 'Airline-IATA_1',
                'Airline-Name_leg1': 'Airline-Name_1',
                'Route_leg1': 'Route_1',
                'Airline-IATA_leg2': 'Airline-IATA_2',
                'Airline-Name_leg2': 'Airline-Name_2',
                'Route_leg2': 'Route_2',
                'Airline-IATA': 'Airline-IATA_3',
                'Airline-Name': 'Airline-Name_3',
                'Route': 'Route_3'
            })
            two_stop_output.to_csv(
                os.path.join(self.output_dir, "two_stop_flights.csv"),
                index=False
            )
            logging.info(
                f"Saved {len(two_stop_output)} 2-stop flights to "
                f"{self.output_dir}/two_stop_flights.csv"
            )
        else:
            logging.info("No 2-stop flights to save")


if __name__ == "__main__":
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s - %(levelname)s - %(message)s"
    )
    finder = RouteFinder(start_airport="FLN", end_airport="LIM")
    finder.execute()

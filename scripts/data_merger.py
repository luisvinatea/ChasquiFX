import pandas as pd
import glob
import os
import logging
from data_handler import DataHandler


class FlightItineraryCrafter(DataHandler):
    def __init__(self, directory="processed",
                 file_pattern="*.csv",
                 output_path="merged/itinerary.csv"):
        """
        Call DataHandler.__init__ with a dummy input_path
        (since we load multiple files)
        Use output_path for the eventual merged output
        """
        super().__init__(input_path=directory, output_path=output_path)
        self.directory = directory  # Store directory for load_data
        self.file_pattern = file_pattern
        self.dataframes = {}  # Dictionary to store named DataFrames

    def load_data(self):
        """Load all CSV files from the specified directory
        and assign to df_variables.
        """
        # Use DataHandler's data_dir as the base
        full_path = os.path.join(self.data_dir,
                                 self.directory,
                                 self.file_pattern)
        files = glob.glob(full_path)

        if not files:
            logging.warning(f"No files found matching {full_path}")
            self.df = None
            return

        for file in files:
            """
            # Extract the base filename
            without path and extension
            """
            filename = os.path.splitext(os.path.basename(file))[0]
            """
            e.g., "clean_airlines"
            Create a variable name like "df_clean_airlines"
            """
            df_name = f"df_{filename}"
            try:
                df = pd.read_csv(file)
                # Assign to instance attribute dynamically
                setattr(self, df_name, df)
                # Also store in a dictionary for easier access
                self.dataframes[df_name] = df
                logging.info(f"Loaded {file} into {df_name}")
            except Exception as e:
                logging.error(f"Failed to load {file}: {e}")

        # Set self.df to None or a default DataFrame
        self.df = None

    def process_data(self):
        """
        Merge DataFrames to
        create an itineraries dataset
        with optimizations.
        """
        if not self.dataframes:
            logging.warning("No dataframes to process!")
            return

        required_dfs = {
            'df_clean_routes': 'routes',
            'df_clean_airlines': 'airlines',
            'df_clean_airports': 'airports',
            'df_clean_cities': 'cities',
            'df_clean_countries': 'countries',
            'df_clean_planes': 'planes'
        }
        missing = [
            name for name in required_dfs
            if name not in
            self.dataframes
            ]
        if missing:
            logging.error(f"Missing required DataFrames: {missing}")
            return

        # Get DataFrames
        routes = self.dataframes['df_clean_routes']
        airlines = self.dataframes['df_clean_airlines']
        airports = self.dataframes['df_clean_airports']
        cities = self.dataframes['df_clean_cities']
        countries = self.dataframes['df_clean_countries']
        planes = self.dataframes['df_clean_planes']

        # Merge step-by-step with minimal columns
        itineraries = routes.merge(
            airlines[['Airline-ID', 'Airline-Name']],
            on='Airline-ID',
            how='left'
        ).merge(
            airports[
                [
                    'Airport-ID',
                    'Airport-Name',
                    'Airport-City',
                    'Airport-Country'
                ]
                ],
            left_on='Departure-ID',
            right_on='Airport-ID',
            how='left',
            suffixes=('', '_departure')
        ).drop(columns=['Airport-ID']).merge(
            airports[
                [
                    'Airport-ID',
                    'Airport-Name',
                    'Airport-City',
                    'Airport-Country'
                    ]
                    ],
            left_on='Arrival-ID',
            right_on='Airport-ID',
            how='left',
            suffixes=('_departure', '_arrival')
        ).drop(columns=['Airport-ID']).merge(
            cities[['Airport-City', 'City-ISO-3']],
            left_on='Airport-City_departure',
            right_on='Airport-City',
            how='left'
        ).drop(columns=['Airport-City']).merge(
            cities[['Airport-City', 'City-ISO-3']],
            left_on='Airport-City_arrival',
            right_on='Airport-City',
            how='left',
            suffixes=('_departure', '_arrival')
        ).drop(columns=['Airport-City']).merge(
            countries[['Airport-Country', 'Country-ISO-3']],
            left_on='Airport-Country_departure',
            right_on='Airport-Country',
            how='left'
        ).drop(columns=['Airport-Country']).merge(
            countries[['Airport-Country', 'Country-ISO-3']],
            left_on='Airport-Country_arrival',
            right_on='Airport-Country',
            how='left',
            suffixes=('_departure', '_arrival')
        ).drop(columns=['Airport-Country']).merge(
            planes[['Airplane-IATA', 'Airplane-Model']],
            on='Airplane-IATA',
            how='left'
        )

        # Add derived column for route
        itineraries['Route'] = (
            itineraries['Departure-IATA'] +
            '_to_' + itineraries['Arrival-IATA']
        )

        # Handle missing values
        itineraries['Airline-Name'] = (
            itineraries['Airline-Name']
            .fillna('Unknown Airline')
        )

        self.df = itineraries
        logging.info(
            "Itineraries dataset created with columns: %s",
            list(itineraries.columns)
            )

    def get_dataframe(self, name):
        """Helper method to access a specific DataFrame by name."""
        return getattr(self, f"df_{name}", None)


# For testing
if __name__ == "__main__":
    crafter = FlightItineraryCrafter(
        directory="processed",
        file_pattern="*.csv")
    crafter.execute()

# Access DataFrames
    print("Available DataFrames:", crafter.dataframes.keys())
    if hasattr(crafter, 'df_clean_airlines'):
        print("Clean Airlines DataFrame:\n", crafter.df_clean_airlines.head())
    if hasattr(crafter, 'df_clean_airports'):
        print("Clean Airports DataFrame:\n", crafter.df_clean_airports.head())

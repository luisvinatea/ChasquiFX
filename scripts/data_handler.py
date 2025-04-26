import logging
import os
import pandas as pd
from abc import ABC, abstractmethod

# Set up logging
logging.basicConfig(level=logging.INFO,
                    format="%(asctime)s - %(levelname)s - %(message)s")


class DataHandler(ABC):
    base_dir = (
            os.path.abspath(
                os.path.join(
                    os.path.dirname(__file__), '..')
                )
        )
    data_dir = os.path.join(
        base_dir, 'data')

    def __init__(self, input_path, output_path):
        self.input_path = self.resolve_path(input_path)
        self.output_path = self.resolve_path(output_path)
        self.df = None

    def resolve_path(self, path):
        return os.path.join(self.data_dir, path)

    @abstractmethod
    def load_data(self):
        pass

    @abstractmethod
    def process_data(self):
        pass

    def save_data(self):
        """Saves processed data if a DataFrame exists."""
        if self.df is not None:
            self.df.to_csv(self.output_path, index=False)
            logging.info(f"Data saved to {self.output_path}")
        else:
            logging.warning("No data to save!")

    def execute(self):
        """Runs the full data processing pipeline."""
        self.load_data()
        self.process_data()
        self.save_data()


# Example Implementation of a Concrete DataHandler Subclass
class CityDataProcessor(DataHandler):
    def load_data(self):
        """Loads data from a CSV file into a DataFrame."""
        if self.input_path and os.path.exists(self.input_path):
            self.df = pd.read_csv(self.input_path)
            logging.info(f"Data loaded from {self.input_path}")
        else:
            logging.error(f"Input file {self.input_path} not found!")
            self.df = None  # Ensure df is set even on failure

    def process_data(self):
        """Processes the data (example: drop duplicates)."""
        if self.df is not None:
            self.df.drop_duplicates(inplace=True)
            logging.info("Data processed (duplicates removed)")
        else:
            logging.warning("No data to process!")


def main():
    processor = CityDataProcessor(input_path="raw/raw_cities.csv",
                                  output_path="processed/clean_cities.csv")
    processor.execute()


if __name__ == "__main__":
    main()

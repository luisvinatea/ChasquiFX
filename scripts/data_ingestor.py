"""data_ingestor.py
Fetches foreign exchange rates in real time from yahoo finance
and stores them in a CSV file.
"""
from abc import ABC, abstractmethod
from typing import Dict, List, Optional
import logging
import os
import json
import yfinance as yf
import pandas as pd

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
    handlers=[
        logging.FileHandler("../data/log/data_ingestor.log", encoding="utf-8"),
        logging.StreamHandler()
    ]
)

# Define constants
DATA_DIR = "../data"
os.makedirs(DATA_DIR, exist_ok=True)
# Ensure csv subdirectory exists
os.makedirs(os.path.join(DATA_DIR, "csv"), exist_ok=True)
# Ensure log subdirectory exists
os.makedirs(os.path.join(DATA_DIR, "log"), exist_ok=True)

# Import dictionary for currency codes
with open(
    os.path.join(DATA_DIR, "json/currency_codes.json"),
    "r",
    encoding="utf-8"
) as f:
    currency_codes = json.load(f)


class ForexPairs:
    """Class to create forex pairs from currency codes."""

    def __init__(self, codes: Dict[str, str]) -> None:
        # Use provided currency code dictionary
        self.currency_codes = codes

    def create_pairs(self) -> List[str]:
        """Create forex pairs from currency codes values."""
        pairs: List[str] = []
        # Iterate over currency tickers (values), not country names
        for base in self.currency_codes.values():
            for quote in self.currency_codes.values():
                if base != quote:
                    pairs.append(f"{base}{quote}=X")
        return pairs

    # From the pairs, create forward and backward pairs
    def create_forward_backward_pairs(self) -> List[str]:
        """Create forward and backward forex pairs."""
        pairs: List[str] = []
        for base in self.currency_codes.values():
            for quote in self.currency_codes.values():
                if base != quote:
                    pairs.append(f"{base}{quote}=X")
                    pairs.append(f"{quote}{base}=X")
        return pairs


# Create an instance of ForexPairs
forex_pairs = ForexPairs(currency_codes)
# Create forex pairs
forex_pairs_list = forex_pairs.create_forward_backward_pairs()

# Define the abstract base class for data ingestion


class DataIngestor(ABC):
    """Abstract base class for data ingestion."""

    @abstractmethod
    def fetch_data(self) -> pd.DataFrame:
        """Fetch data from the source."""

    @abstractmethod
    def save_data(self, df: pd.DataFrame) -> None:
        """Save data to the destination."""

    @abstractmethod
    def load_data(self) -> pd.DataFrame:
        """Load data from the destination."""

    @abstractmethod
    def process_data(self, df: pd.DataFrame) -> pd.DataFrame:
        """Process the data."""

    def get_data(self) -> pd.DataFrame:
        """
        Get data from the source, process it, and save it to the destination.
        """
        raw_df = self.fetch_data()
        processed_data = self.process_data(raw_df)
        self.save_data(processed_data)
        return processed_data


# Define the YahooFinanceDataIngestor class
class YahooFinanceDataIngestor(DataIngestor):
    """Ingestor for Yahoo Finance data."""

    def __init__(
        self,
        symbols: Optional[List[str]] = None,
        start_date: str = "2020-01-01",
        end_date: str = "2023-10-01",
    ) -> None:
        # Avoid mutable default; use provided symbols or default list
        self.symbols = symbols if symbols is not None else forex_pairs_list
        self.start_date = start_date
        self.end_date = end_date
        self.data_file = os.path.join(
            DATA_DIR, "csv/yahoo_finance_forex_data.csv"
        )

    def fetch_data(self) -> pd.DataFrame:
        """Fetch data from Yahoo Finance."""
        logging.info(
            "Fetching data for %d symbols from Yahoo Finance...",
            len(self.symbols)
        )
        data_frames = []
        for symbol in self.symbols:
            try:
                temp_df = yf.download(
                    symbol,
                    start=self.start_date,
                    end=self.end_date,
                    threads=False,
                    progress=False,
                    auto_adjust=False
                )
                if temp_df is None or temp_df.empty or temp_df.columns.empty:
                    logging.warning("No data for symbol %s, skipping.", symbol)
                else:
                    # Label columns by symbol for concatenation.
                    # Only do this if columns exist.
                    # Original line causing error:
                    # temp_df.columns = pd.MultiIndex.from_product(
                    #     [[symbol], temp_df.columns])

                    # Create a MultiIndex for the columns
                    existing_cols = temp_df.columns
                    new_cols = [(symbol, col) for col in existing_cols]
                    # Add names for clarity and potential future use
                    temp_df.columns = pd.MultiIndex.from_tuples(
                        new_cols, names=['Symbol', 'Price'])
                    data_frames.append(temp_df)
            except (ConnectionError, ValueError) as e:
                logging.error("Error fetching data for %s: %s", symbol, e)
        if not data_frames:
            raise ValueError("No data fetched for any symbol.")
        df = pd.concat(data_frames, axis=1)
        return df

    # Save data to CSV file in the data directory
    # If the file already exists, append the new data
    # If the file does not exist, create a new file
    def save_data(self, df: pd.DataFrame) -> None:
        """Save data to CSV file."""
        logging.info("Saving data to %s...", self.data_file)
        if os.path.exists(self.data_file):
            df.to_csv(self.data_file, mode='a', header=False)
            logging.info("Data appended to existing file.")
        else:
            df.to_csv(self.data_file)
            logging.info("Data saved to new file.")

    def load_data(self) -> pd.DataFrame:
        """Load data from the CSV file."""
        logging.info("Loading data from %s...", self.data_file)
        if os.path.exists(self.data_file):
            return pd.read_csv(self.data_file, index_col=0)
        else:
            logging.warning(
                "Data file does not exist. Returning empty DataFrame."
            )
            return pd.DataFrame()

    def process_data(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Process the data by filling missing values with forward fill then zero.
        """
        logging.info("Processing data...")
        # Forward fill, then fill remaining NaNs with 0
        return df.ffill().fillna(0)

    def get_data(self) -> pd.DataFrame:
        """Get, process, save, and return data."""
        raw_df = self.fetch_data()
        processed = self.process_data(raw_df)
        self.save_data(processed)
        return processed


if __name__ == "__main__":
    # Example usage
    ingestor = YahooFinanceDataIngestor()
    data = ingestor.get_data()
    print(data.head())

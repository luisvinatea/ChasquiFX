import pandas as pd
import geopandas as gpd
from data_handler import DataHandler


class AirlineDataProcessor(DataHandler):
    def __init__(self,
                 input_path="raw/raw_airlines.csv",
                 output_path="processed/clean_airlines.csv"
                 ):
        super().__init__(input_path, output_path)
        self.column_names = [
            "Airline-ID",
            "Airline-Name",
            "Airline-Alias",
            "Airline-Callsign",
            "Airline-IATA",
            "Airline-ICAO",
            "Airline-Country",
            "Active-Airline"
            ]
        self.dtype_mapping = {
            "Airline-ID": pd.Int64Dtype(),
            "Airline-Name": pd.StringDtype(),
            "Airline-Alias": pd.StringDtype(),
            "Airline-Callsign": pd.StringDtype(),
            "Airline-IATA": pd.StringDtype(),
            "Airline-ICAO": pd.StringDtype(),
            "Airline-Country": pd.StringDtype(),
            "Active-Airline": pd.StringDtype()
        }

    def load_data(self):
        self.df = pd.read_csv(self.input_path, header=None)

    def ensure_dtypes(self):
        """Ensure proper data types for each column."""
        for col, dtype in self.dtype_mapping.items():
            if dtype == pd.Int64Dtype():  # Correct dtype check
                self.df[col] = (
                    pd.to_numeric(self.df[col], errors="coerce")
                    .astype(pd.Int64Dtype())
                )
            elif dtype == pd.Float64Dtype():
                self.df[col] = (
                    pd.to_numeric(self.df[col], errors="coerce")
                    .astype(pd.Float64Dtype())
                )
            elif dtype == pd.StringDtype():
                self.df[col] = (
                    self.df[col]
                    .astype(str)
                    .str.strip()
                    .astype(pd.StringDtype())
                )
            else:
                self.df[col] = self.df[col].astype(dtype)

    def drop_na_rows(self):
        """Drop rows with any NA values."""
        self.df.dropna(inplace=True)

    def process_data(self):
        self.df.columns = self.column_names
        self.df.replace("\\N", pd.NA, inplace=True)
        self.df.replace("", pd.NA, inplace=True)
        self.ensure_dtypes()
        self.drop_na_rows()


class AirplaneModelsProcessor(DataHandler):
    def __init__(self,
                 input_path="raw/raw_planes.csv",
                 output_path="processed/clean_planes.csv"
                 ):
        super().__init__(input_path, output_path)
        self.column_names = [
            "Airplane-Model",
            "Airplane-IATA",
            "Airplane-ICAO"
            ]
        self.dtype_mapping = {
            "Airplane-Model": pd.StringDtype(),
            "Airplane-IATA": pd.StringDtype(),
            "Airplane-ICAO": pd.StringDtype()
        }

    def load_data(self):
        self.df = pd.read_csv(self.input_path, header=None)

    def ensure_dtypes(self):
        """Ensure proper data types for each column."""
        for col, dtype in self.dtype_mapping.items():
            if dtype == pd.Int64Dtype():  # Correct dtype check
                self.df[col] = (
                    pd.to_numeric(self.df[col], errors="coerce")
                    .astype(pd.Int64Dtype())
                )
            elif dtype == pd.Float64Dtype():
                self.df[col] = (
                    pd.to_numeric(self.df[col], errors="coerce")
                    .astype(pd.Float64Dtype())
                )
            elif dtype == pd.StringDtype():
                self.df[col] = (
                    self.df[col]
                    .astype(str)
                    .str.strip()
                    .astype(pd.StringDtype())
                )
            else:
                self.df[col] = self.df[col].astype(dtype)

    def drop_na_rows(self):
        """Drop rows with any NA values."""
        self.df.dropna(inplace=True)

    def process_data(self):
        self.df.columns = self.column_names
        self.df.replace("\\N", pd.NA, inplace=True)
        self.df.replace("", pd.NA, inplace=True)
        self.ensure_dtypes()
        self.drop_na_rows()


class AirportCoordinatesProcessor(DataHandler):
    def __init__(self, input_path="raw/raw_airports.csv",
                 output_path="processed/clean_airports.csv"
                 ):
        super().__init__(input_path, output_path)
        self.column_names = [
            "Airport-ID",
            "Airport-Name",
            "Airport-City",
            "Airport-Country",
            "Airport-IATA",
            "Airport-ICAO",
            "Airport-Latitude",
            "Airport-Longitude",
            "Airport-Altitude",
            "Airport-Timezone",
            "Airport-DST",
            "Airport-TZ",
            "Type",
            "Source"
        ]
        self.dtype_mapping = {
            "Airport-ID": pd.Int64Dtype(),
            "Airport-Name": pd.StringDtype(),
            "Airport-City": pd.StringDtype(),
            "Airport-Country": pd.StringDtype(),
            "Airport-IATA": pd.StringDtype(),
            "Airport-ICAO": pd.StringDtype(),
            "Airport-Latitude": pd.Float64Dtype(),
            "Airport-Longitude": pd.Float64Dtype(),
            "Airport-Altitude": pd.Int64Dtype(),
            "Airport-Timezone": pd.StringDtype(),
            "Airport-DST": pd.StringDtype(),
            "Airport-TZ": pd.StringDtype(),
            "Type": pd.StringDtype(),
            "Source": pd.StringDtype()
        }

    def load_data(self):
        self.df = pd.read_csv(self.input_path, header=None)

    def ensure_dtypes(self):
        """Ensure proper data types for each column."""
        for col, dtype in self.dtype_mapping.items():
            if dtype == pd.Int64Dtype():  # Correct dtype check
                self.df[col] = (
                    pd.to_numeric(self.df[col], errors="coerce")
                    .astype(pd.Int64Dtype())
                )
            elif dtype == pd.Float64Dtype():
                self.df[col] = (
                    pd.to_numeric(self.df[col], errors="coerce")
                    .astype(pd.Float64Dtype())
                )
            elif dtype == pd.StringDtype():
                self.df[col] = (
                    self.df[col]
                    .astype(str)
                    .str.strip()
                    .astype(pd.StringDtype())
                )
            else:
                self.df[col] = self.df[col].astype(dtype)

    def drop_na_rows(self):
        """Drop rows with any NA values."""
        self.df.dropna(inplace=True)

    def process_data(self):
        self.df.columns = self.column_names
        self.df.replace("\\N", pd.NA, inplace=True)
        self.df.replace("", pd.NA, inplace=True)
        self.ensure_dtypes()
        self.drop_na_rows()


class CountryCodesProcessor(DataHandler):
    def __init__(self,
                 input_path="raw/shapefiles/ne_110m_admin_0_countries.shp",
                 output_path="processed/clean_countries.csv"
                 ):
        super().__init__(input_path, output_path)
        self.filtered_columns = [
            "GEOUNIT",
            "ISO_A2",
            "ISO_A3",
            "geometry"
            ]
        self.column_renaming = {
            "GEOUNIT": "Airport-Country",
            "ISO_A2": "Country-ISO-2",
            "ISO_A3": "Country-ISO-3",
            "geometry": "Country-Shape"
        }
        self.dtype_mapping = {
            "Airport-Country": pd.StringDtype(),
            "Country-ISO-2": pd.StringDtype(),
            "Country-ISO-3": pd.StringDtype(),
            "Country-Shape": gpd.GeoSeries().dtype
        }

    def load_data(self):
        self.df = gpd.read_file(self.input_path)

    def strip_data(self):
        """Keep only the required columns."""
        self.df = self.df[self.filtered_columns]

    def rename_columns(self):
        """Rename columns based on mapping."""
        self.df.rename(columns=self.column_renaming, inplace=True)

    def ensure_dtypes(self):
        """Ensure proper data types for each column."""
        for col, dtype in self.dtype_mapping.items():
            if dtype == pd.Int64Dtype():  # Correct dtype check
                self.df[col] = (
                    pd.to_numeric(self.df[col], errors="coerce")
                    .astype(pd.Int64Dtype())
                )
            elif dtype == pd.StringDtype():
                self.df[col] = (
                    self.df[col]
                    .astype(str).str.strip()
                    .astype(pd.StringDtype())
                )
            else:
                self.df[col] = self.df[col].astype(dtype)

    def drop_na_rows(self):
        """Drop rows with any NA values."""
        self.df.dropna(inplace=True)

    def process_data(self):
        """Execute all processing steps."""
        self.strip_data()
        self.df.replace("", pd.NA, inplace=True)
        self.df.replace("\\N", pd.NA, inplace=True)
        self.rename_columns()
        self.ensure_dtypes()
        self.drop_na_rows()


class CityCodesProcessor(DataHandler):
    def __init__(self,
                 input_path="raw/shapefiles/ne_110m_populated_places.shp",
                 output_path="processed/clean_cities.csv"
                 ):
        super().__init__(input_path, output_path)
        self.filtered_columns = [
            "NAME",
            "ADM0_A3",
            "ISO_A2",
            "geometry"
            ]
        self.column_renaming = {
            "NAME": "Airport-City",
            "ADM0_A3": "City-ISO-3",
            "ISO_A2": "City-ISO-2",
            "geometry": "City-Shape"
        }
        self.dtype_mapping = {
            "Airport-City": pd.StringDtype(),
            "City-ISO-3": pd.StringDtype(),
            "City-ISO-2": pd.StringDtype(),
            "City-Shape": gpd.GeoSeries().dtype
        }

    def load_data(self):
        self.df = gpd.read_file(self.input_path)

    def strip_data(self):
        """Keep only the required columns."""
        self.df = self.df[self.filtered_columns]

    def rename_columns(self):
        """Rename columns based on mapping."""
        self.df.rename(columns=self.column_renaming, inplace=True)

    def ensure_dtypes(self):
        """Ensure proper data types for each column."""
        for col, dtype in self.dtype_mapping.items():
            if dtype == pd.Int64Dtype():  # Correct dtype check
                self.df[col] = (
                    pd.to_numeric(self.df[col], errors="coerce")
                    .astype(pd.Int64Dtype())
                )
            elif dtype == pd.StringDtype():
                self.df[col] = (
                    self.df[col].astype(str).str.strip()
                    .astype(pd.StringDtype())
                )
            else:
                self.df[col] = self.df[col].astype(dtype)

    def drop_na_rows(self):
        """Drop rows with any NA values."""
        self.df.dropna(inplace=True)

    def process_data(self):
        """Execute all processing steps."""
        self.strip_data()
        self.df.replace("", pd.NA, inplace=True)
        self.df.replace("\\N", pd.NA, inplace=True)
        self.rename_columns()
        self.ensure_dtypes()
        self.drop_na_rows()


class RoutesDataProcessor(DataHandler):
    def __init__(self, input_path="raw/raw_routes.csv",
                 output_path="processed/clean_routes.csv"
                 ):
        super().__init__(input_path, output_path)
        self.column_names = [
            "Airline-IATA",
            "Airline-ID",
            "Departure-IATA",
            "Departure-ID",
            "Arrival-IATA",
            "Arrival-ID",
            "Codeshare",
            "Stops",
            "Airplane-IATA"
            ]
        self.dtype_mapping = {
            "Airline-IATA": pd.StringDtype(),
            "Airline-ID": pd.Int64Dtype(),
            "Departure-IATA": pd.StringDtype(),
            "Departure-ID": pd.Int64Dtype(),
            "Arrival-IATA": pd.StringDtype(),
            "Arrival-ID": pd.Int64Dtype(),
            "Codeshare": pd.StringDtype(),
            "Stops": pd.Int64Dtype(),
            "Airplane-IATA": pd.StringDtype()
        }

    def load_data(self):
        self.df = pd.read_csv(self.input_path, header=None)

    def ensure_dtypes(self):
        """Ensure proper data types for each column."""
        for col, dtype in self.dtype_mapping.items():
            if dtype == pd.Int64Dtype():
                self.df[col] = (
                    pd.to_numeric(self.df[col], errors="coerce")
                    .astype(pd.Int64Dtype())
                )
            elif dtype == pd.StringDtype():
                self.df[col] = (
                    self.df[col].astype(str).str.strip()
                    .astype(pd.StringDtype())
                )
            else:
                self.df[col] = self.df[col].astype(dtype)

    def drop_na_rows(self):
        self.df.dropna(inplace=True)

    def process_data(self):
        self.df.columns = self.column_names
        self.df.replace("", pd.NA, inplace=True)
        self.df.replace("\\N", pd.NA, inplace=True)
        self.ensure_dtypes()
        self.drop_na_rows()


def main():
    handlers = [
        AirlineDataProcessor(),
        AirplaneModelsProcessor(),
        AirportCoordinatesProcessor(),
        CountryCodesProcessor(),
        CityCodesProcessor(),
        RoutesDataProcessor()
    ]

    for handler in handlers:
        handler.execute()


if __name__ == "__main__":
    main()

# Python-Node.js Bridge Documentation

## Overview

The Node.js-Python bridge enables the two backends to communicate efficiently, with Node.js handling API, authentication, and orchestration, while Python takes care of data processing, analysis, and specialized algorithms.

## Architecture

### Python Adapter Module

The `node_adapter.py` module serves as the bridge between Node.js and Python. It provides a set of functions that can be called from the Node.js backend through the `node_bridge.py` API endpoint.

### Node Bridge API

The `node_bridge.py` module provides an API endpoint that allows Node.js to call Python functions. It handles request deserialization, function lookup, and result serialization.

## Available Functions

### Forex Service

#### `get_exchange_rates(from_currency, to_currency, api_key=None)`

Fetches exchange rates for a currency pair.

**Arguments:**

- `from_currency` (str): Base currency code (e.g., "USD")
- `to_currency` (str): Target currency code (e.g., "EUR")
- `api_key` (str, optional): API key for the forex service

**Returns:**

- Dictionary containing exchange rate data:

  ```json
  {
    "from": "USD",
    "to": "EUR",
    "rate": 0.91,
    "timestamp": "2025-05-18T12:34:56.789Z",
    "source": "serpapi"
  }
  ```

#### `get_service_status()`

Gets the status of the forex service.

**Arguments:** None

**Returns:**

- Dictionary containing service status:

  ```json
  {
    "status": "operational",
    "api_key": "available",
    "cache_files": 10,
    "cache_freshness": "2025-05-17T10:15:30.123Z",
    "timestamp": "2025-05-18T12:34:56.789Z"
  }
  ```

#### `reset_quota_status()`

Resets the quota status for SerpAPI.

**Arguments:** None

**Returns:**

- Dictionary containing status message:

  ```json
  {
    "status": "success",
    "message": "Quota status reset successfully",
    "timestamp": "2025-05-18T12:34:56.789Z"
  }
  ```

### Recommendation Service

#### `get_recommendations(base_currency, departure_airport, outbound_date=None, return_date=None, api_key=None, limit=10, min_trend=-1.0, include_fares=False)`

Gets travel recommendations based on forex trends and available routes.

**Arguments:**

- `base_currency` (str): Base currency code (e.g., "USD")
- `departure_airport` (str): IATA code of departure airport (e.g., "JFK")
- `outbound_date` (str, optional): Departure date in YYYY-MM-DD format
- `return_date` (str, optional): Return date in YYYY-MM-DD format
- `api_key` (str, optional): API key for the recommendation service
- `limit` (int or str, optional): Maximum number of recommendations to return
- `min_trend` (float or str, optional): Minimum trend value to include (-1 to 1)
- `include_fares` (bool or str, optional): Whether to include flight fares

**Returns:**

- List of recommendation dictionaries:

  ```json
  [
    {
      "destination": "CDG",
      "country": "France",
      "trend": 0.75,
      "currency": "EUR",
      "base_currency": "USD",
      "exchange_rate": 0.91,
      "fare": 450
    }
  ]
  ```

### Data Processing

#### `retrieve_parquet_data(file_key, filters=None)`

Retrieves data from a Parquet file.

**Arguments:**

- `file_key` (str): The key of the Parquet file to retrieve
- `filters` (dict, optional): Optional filters to apply to the data

**Returns:**

- List of dictionaries containing the retrieved data:

  ```json
  [
    {
      "column1": "value1",
      "column2": 123,
      "column3": true
    }
  ]
  ```

  Or an error dictionary:

  ```json
  {
    "error": "Error message",
    "type": "ErrorType"
  }
  ```

#### `json_to_parquet(json_data, output_path)`

Converts JSON data to Parquet format.

**Arguments:**

- `json_data` (str, dict, or list): JSON data as a string, dict, or list
- `output_path` (str): Path to save the Parquet file

**Returns:**

- Dictionary containing status message:

  ```json
  {
    "success": true,
    "message": "JSON converted to Parquet",
    "path": "/path/to/output.parquet"
  }
  ```

## Error Handling

All functions wrap their implementation in try-except blocks and return a consistent error format:

```json
{
  "error": "Error message",
  "type": "ErrorType"
}
```

## Type Handling

The bridge handles type conversions between Python and JavaScript:

- Python functions that return complex objects are converted to JSON-serializable dictionaries
- String parameters that represent numbers or booleans are properly converted to their appropriate types
- Lists and dictionaries are properly converted between Python and JavaScript

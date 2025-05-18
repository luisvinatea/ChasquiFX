# Supabase Integration for Parquet Files

This section describes the enhanced Supabase integration for Parquet files, which enables:

- Uploading Parquet files to Supabase storage
- Retrieving data from Supabase storage
- Caching data in memory for improved performance

## Retrieving Data

The module provides powerful tools for retrieving data from Supabase storage:

```python
from backend.api.data_processing import (
    retrieve_data_frame,
    query_data,
    retrieve_data_by_type,
    get_metadata
)
import asyncio

# Retrieve a complete dataset by file key
df = asyncio.run(retrieve_data_frame("forex/EURUSD"))

# Query data with filters and column selection
df = asyncio.run(query_data(
    file_key="flights/JFK-LHR",
    filters={"price": 500},
    columns=["flight_number", "departure", "arrival", "price"]
))

# Get all datasets of a specific type
data_dict = asyncio.run(retrieve_data_by_type("forex"))

# Get metadata about a file
metadata = asyncio.run(get_metadata("forex/EURUSD"))
```

### Command Line Data Retrieval

The data retrieval functionality is also available through the command line:

```bash
# Retrieve data by file key
./scripts/chasquifx_data.sh retrieve --file-key forex/EURUSD

# Get metadata and schema information
./scripts/chasquifx_data.sh retrieve --file-key forex/EURUSD --info

# Retrieve all data of a specific type
./scripts/chasquifx_data.sh retrieve --data-type forex

# Query with filters and save to CSV
./scripts/chasquifx_data.sh retrieve \
  --file-key flights/JFK-LHR \
  --filter "price>500" \
  --columns "flight_number,departure,arrival,price" \
  --output flight_data.csv
```

### Data Caching

The retrieval system includes a caching mechanism to improve performance when working with the same datasets repeatedly:

```python
from backend.api.data_processing import retrieve_data_frame
import asyncio

# First call retrieves from Supabase
df1 = asyncio.run(retrieve_data_frame("forex/EURUSD"))

# Second call uses cached data
df2 = asyncio.run(retrieve_data_frame("forex/EURUSD"))

# Disable cache if needed
df3 = asyncio.run(retrieve_data_frame("forex/EURUSD", use_cache=False))

# Customize cache TTL (time-to-live) in seconds
df4 = asyncio.run(retrieve_data_frame("forex/EURUSD", cache_ttl=7200))  # 2 hours
```

# ChasquiFX

## About

ChasquiFX is a tool that integrates flight route data with foreign exchange data to provide destination recommendations based on favorable exchange rates and available flight routes.

## Features

- Find destinations with favorable exchange rates
- View flight routes and fare information (via SerpAPI integration)
- Compare destinations with interactive visualizations
- Save favorite destinations
- Export results to CSV
- Modern React frontend for improved reliability and user experience
- Locally stored API keys for secure access to external services
- Robust API error handling with retry mechanisms

## User Interface

**React Frontend**: A modern, responsive UI built with React and Material-UI

- Enhanced performance and reliability
- Better handling of API requests
- Local storage for user preferences and API keys
- Responsive design for mobile and desktop

## API Key Setup

ChasquiFX uses several external APIs:

### SerpAPI for Google Finance Data (Forex)

ChasquiFX now uses Google Finance via SerpAPI to fetch currency exchange rates, which provides more reliable data compared to the previous Yahoo Finance implementation.

1. Sign up for a SerpAPI account at [https://serpapi.com/](https://serpapi.com/)
2. Get your API key from your SerpAPI dashboard
3. Create or edit the file `backend/.env` with the following content:

   ```bash
   SERPAPI_API_KEY=your_serpapi_key_here
   ```

### Amadeus API for Flight Data

For flight data, ChasquiFX uses the Amadeus API:

1. Register for an Amadeus API key at [https://developers.amadeus.com/](https://developers.amadeus.com/)
2. Add your key and secret to the `backend/.env` file:

   ```bash
   AMADEUS_API_KEY=your_amadeus_key_here
   AMADEUS_API_SECRET=your_amadeus_secret_here
   ```

> **Note:** Without valid API keys, the application will fall back to using simulated data with a warning message.

## Recent Improvements

1. **Forex Data Provider**: Switched from Yahoo Finance to Google Finance via SerpAPI for more reliable forex data
2. **Robust API Handling**: Implemented retry mechanism with exponential backoff for handling API rate limiting
3. **Improved Error Handling**: Better error reporting and fallback mechanisms
4. **Environment Management**: Enhanced environment variable handling with validation and guided setup
5. **Automated Testing**: Added unit tests for key functionality

## Quick Start

### Using the launcher scripts

ChasquiFX comes with several convenience scripts to help you manage the application:

#### Start the application

To start both the API server and the React frontend with a single command:

```bash
./run_chasquifx.sh
```

This will:

1. Launch the FastAPI backend server on port 8000
2. Launch the React frontend on port 3000
3. Monitor both services and log their output to `logs/` directory

You can access:

- Web application: <http://localhost:3000>
- API documentation: <http://localhost:8000/docs>

#### Stop the application

To stop the application, you can either:

1. Press `CTRL+C` in the terminal where `run_ChasquiFX.sh` is running
2. Or run the stop script:

   ```bash
   ./stop_ChasquiFX.sh
   ```

#### Check status

To check if the services are running:

```bash
./status_chasquifx.sh
```

This will display the status of both the API server and Streamlit app.

#### Desktop Launcher

For convenience, you can also use the included desktop entry file to launch the application from your desktop environment:

```bash
# Copy the desktop file to your applications directory
cp ChasquiFX.desktop ~/.local/share/applications/
```

## Manual Usage

If you prefer to run the components separately:

### Start the API server

```bash
python backend/api/main.py
```

### Start the Streamlit frontend

```bash
streamlit run frontend/ChasquiFX.py
```

## Architecture

- **Backend**: FastAPI application providing the core functionality and data processing
- **Frontend**: Streamlit application providing an interactive user interface
- **Data**: Currency exchange rates and flight route information

## Development

### Project Structure

- `/backend/api/`: API implementation
- `/backend/assets/data/`: Data files including forex and geographic data
- `/frontend/`: Streamlit frontend
- `/test/`: Unit tests

### Requirements

- Python 3.8+
- Dependencies listed in requirements.txt

## Troubleshooting

### Common Issues

#### Application won't start

1. **Check the logs**: Look at the log files in the `logs/` directory for error messages:

   ```bash
   tail -n 50 logs/api_server.log
   tail -n 50 logs/streamlit_app.log
   ```

2. **Port conflicts**: If another application is using port 8000 or 8501:

   ```bash
   # Check if ports are in use
   lsof -i :8000
   lsof -i :8501
   
   # Modify the ports in the scripts if needed
   ```

3. **Python environment issues**: If you're getting import errors:

   ```bash
   # Run the setup script to create a fresh environment
   ./setup.sh
   ```

#### Data not updating

1. **Clear the cache**: Use the "Refresh Data" button in the app interface

2. **Check API status**: Use the status indicator in the app or run:

   ```bash
   ./status_chasquifx.sh
   ```

3. **Clear React cache**: For the React frontend:

   ```bash
   # Clear React browser cache
   # In Chrome, open Developer Tools (F12) > Application > Clear storage > Clear site data
   ```

4. **Forex data API issues**: If you see yfinance errors like "No timezone found, symbol may be delisted":

   ```bash
   # Check if Yahoo Finance API is accessible
   curl -s "https://query1.finance.yahoo.com/v8/finance/chart/EURUSD=X"
   
   # You may need to use an alternative data provider by updating the forex_service.py
   # The application will fall back to synthetic data if real data can't be fetched
   ```

#### Visualization issues

1. **Browser compatibility**: Try a different browser (Chrome or Firefox recommended)

2. **React rendering issues**: If the React UI has display problems:

   ```bash
   # Rebuild the React frontend
   cd frontend
   npm run build
   ```

3. **Clear browser cache**: Press Ctrl+F5 to force refresh the page

4. **Check console**: Open your browser's developer tools to check for JavaScript errors

#### Forex Data Issues

If you encounter errors with forex data retrieval:

1. **Run diagnostics** to check the Yahoo Finance API connection:

   ```bash
   python backend/api/utils/diagnose_forex_api.py
   ```

2. **Generate synthetic data** as a fallback solution:

   ```bash
   python backend/api/utils/generate_synthetic_forex.py
   ```

3. **Update settings**: Add a setting to your `backend/.env` file to use synthetic data:

   ```bash
   USE_SYNTHETIC_DATA=true
   ```

### Support

If you continue to experience issues:

1. Check the GitHub Issues page for similar problems
2. Create a new issue with detailed information about the problem
3. Include log files and your system information

### Forex Data API

ChasquiFX now uses Google Finance via SerpAPI to fetch currency exchange rates, which provides more reliable data compared to the previous Yahoo Finance implementation.

1. **API Configuration**: The system uses the same SERPAPI_API_KEY as the flight data:

   ```bash
   # Make sure your SERPAPI_API_KEY is set in backend/.env
   SERPAPI_API_KEY=your_serpapi_key_here
   ```

2. **Testing the Forex API**: You can test the forex data retrieval with:

   ```bash
   # Run the test script to verify SerpAPI forex integration
   python backend/api/utils/test_serpapi_forex.py
   ```

3. **Diagnosing Issues**: If you encounter problems with forex data:

   ```bash
   # Run the diagnostic tool
   python backend/api/utils/diagnose_forex_api.py
   ```

4. **Fallback Options**: The application can use synthetic data if API access fails:

   ```bash
   # Generate synthetic forex data
   python backend/api/utils/generate_synthetic_forex.py
   
   # Or force synthetic data mode by setting in backend/.env:
   USE_SYNTHETIC_DATA=true
   ```

## License

This project is licensed under the MIT License - see the LICENSE file for details.

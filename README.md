# ChasquiFX

## About

ChasquiFX is a tool that integrates flight route data with foreign exchange data to provide destination recommendations based on favorable exchange rates and available flight routes.

## Features

- Find destinations with favorable exchange rates
- View flight routes and fare information (via SerpAPI integration)
- Compare destinations with interactive visualizations
- User authentication with Supabase
- Secure storage of API keys in user accounts
- Database logging of recommendations and API usage
- Cached forex and flight data to reduce API calls
- Save favorite destinations
- Export results to CSV
- Modern React frontend for improved reliability and user experience
- Robust API error handling with retry mechanisms

## User Interface

**React Frontend**: A modern, responsive UI built with React and Material-UI

- Enhanced performance and reliability
- Better handling of API requests
- User authentication with Supabase
- Responsive design for mobile and desktop
- Cached API results for better performance

## Architecture

ChasquiFX consists of three main components:

1. **React Frontend**: Deployed on GitHub Pages

   - User authentication with Supabase
   - Material UI interface

2. **Python Backend**: Deployed on Vercel

   - FastAPI server for recommendations and data processing
   - SerpAPI integration for real-time forex and flight data

3. **Supabase Database**:
   - PostgreSQL database for storing user data and API logs
   - Authentication service
   - Cache layer for API responses

## Setup and Deployment

### Prerequisites

- Node.js 18+ and npm for frontend development
- Python 3.9+ for backend development
- Supabase account (free tier available)
- SerpAPI account (free trial available)

### Setup

1. **Clone the repository**

   ```bash
   git clone https://github.com/your-username/chasquifx.git
   cd chasquifx
   ```

2. **Backend setup**

   ```bash
   # Create and activate a virtual environment
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate

   # Install dependencies
   pip install -r requirements.txt

   # Create environment variables file
   cp .env.template .env
   ```

3. **Frontend setup**

   ```bash
   cd frontend
   npm install

   # Create environment variables file
   cp .env.template .env.local
   ```

4. **Supabase setup**

   - Create a new project in [Supabase](https://supabase.com)
   - Use the SQL script in `backend/api/db/supabase_schema.sql` to create the database tables
   - Copy the Supabase URL and keys to your environment files

### Running locally

1. **Start the backend**

   ```bash
   ./run_chasquifx.sh
   ```

2. **Start the frontend**

   ```bash
   cd frontend
   npm start
   ```

### Deployment

1. **Backend deployment to Vercel**

   Connect your GitHub repository to Vercel and enable automatic deployments.
   Configure the environment variables in Vercel dashboard.

2. **Frontend deployment to GitHub Pages**

   Use the included GitHub Actions workflow by configuring the necessary secrets in your repository.

## API Key Setup

ChasquiFX uses SerpAPI for retrieving real-time data:

### SerpAPI for Google Finance and Google Flights data

1. Sign up for a [SerpAPI account](https://serpapi.com/users/sign_up)
2. Get your API key from your dashboard
3. Set up your API key:
   - If you want to use the application without creating an account, enter your SerpAPI key in the API Keys section
   - If you create a ChasquiFX account, you can securely store your API key in your user profile

## Data Management

ChasquiFX now uses a sophisticated data management system:

1. **Real-time Data**: When a user requests recommendations, ChasquiFX fetches real-time forex and flight data using SerpAPI

2. **Database Cache**: Results are cached in the Supabase database to:

   - Reduce API calls (and costs)
   - Improve response times
   - Provide fallback data when API services are unavailable

3. **User History**: All recommendations are logged in the user's profile for future reference

4. **Analytics**: API usage is logged to enable future improvements and optimizations

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgements

- [FastAPI](https://fastapi.tiangolo.com/) for the backend API
- [React](https://reactjs.org/) for the frontend framework
- [Material-UI](https://mui.com/) for the UI components
- [Supabase](https://supabase.com/) for database and authentication
- [SerpAPI](https://serpapi.com/) for Google Finance and Google Flights data

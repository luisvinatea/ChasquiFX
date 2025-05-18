# ChasquiFX Hybrid Backend Deployment

This document describes the deployment of the ChasquiFX application with its hybrid backend architecture, using Node.js exclusively for API handling and Python for specialized data processing tasks.

## Architecture Overview

The ChasquiFX application now uses a hybrid backend architecture:

```ascii
┌───────────────┐       ┌───────────────┐
│               │       │               │
│  React        │       │  Supabase     │
│  Frontend     │       │  Database     │
│               │       │               │
└───────┬───────┘       └───────┬───────┘
        │                       │
        ▼                       ▼
┌───────────────┐       ┌───────────────────────┐
│               │◄─────►│                       │
│  Node.js API  │       │  Supabase Auth &      │
│  Backend      │       │  Data Storage         │
│               │       │                       │
└───────┬───────┘       └───────────────────────┘
        │
        │  Internal Bridge
        │
        ▼
┌───────────────┐       ┌───────────────┐
│               │       │               │
│  Python Data  │◄─────►│  SerpAPI      │
│  Processing   │       │  External API │
│               │       │               │
└───────────────┘       └───────────────┘
```

1. **Node.js Backend**

   - Handles all API requests from the frontend
   - Manages authentication and sessions
   - Provides RESTful endpoints
   - Handles asynchronous operations
   - Communicates with Supabase for data storage

2. **Python Backend**

   - Specialized data processing engine only (no API endpoints)
   - Performs forex data analysis and calculations
   - Manages flight data processing
   - Converts between JSON and Parquet formats
   - Generates recommendations based on forex and flight data

3. **Communication Layer**
   - Node.js calls Python functions via a bridge mechanism
   - Results are passed back to Node.js for delivery to the frontend

## Local Development Setup

### Prerequisites

- Node.js 18+ and npm
- Python 3.9+
- Supabase account
- SerpAPI account

### Setting Up the Environment

1. **Clone the repository**

   ```bash
   git clone https://github.com/yourusername/chasquifx.git
   cd chasquifx
   ```

2. **Set up Python backend**

   ```bash
   # Create and activate a virtual environment
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate

   # Install Python dependencies
   pip install -r requirements.txt

   # Create .env file
   cp backend/.env.template backend/.env
   # Edit the .env file with your API keys
   ```

3. **Set up Node.js backend**

   ```bash
   # Run the setup script
   ./scripts/setup_node_backend.sh

   # Or manually:
   cd backend/node
   npm install
   cp .env.template .env
   # Edit the .env file with your API keys
   ```

4. **Set up frontend**

   ```bash
   cd frontend
   npm install
   cp .env.template .env
   # Edit the .env file with your API endpoints
   ```

### Running the Application Locally

Use the hybrid script to run both backends simultaneously:

```bash
./run_chasquifx_hybrid.sh
```

Or run them separately:

```bash
# Terminal 1: Run Python backend
cd backend
python -m uvicorn api.main:app --reload

# Terminal 2: Run Node.js backend
cd backend/node
npm run dev

# Terminal 3: Run frontend
cd frontend
npm start
```

## Production Deployment

### Vercel Deployment

Both the Node.js and Python backends can be deployed to Vercel:

1. **Connect your GitHub repository to Vercel**

2. **Configure environment variables**

   - Add all required environment variables in the Vercel dashboard
   - Make sure to add `VERCEL_DEPLOYMENT: true`

3. **Deploy from the Vercel dashboard**
   - Vercel will automatically detect both Python and Node.js components
   - The `vercel.json` configuration handles routing between the two

### Frontend Deployment

The React frontend can be deployed to GitHub Pages or Vercel:

1. **Build the frontend**

   ```bash
   cd frontend
   npm run build
   ```

2. **Deploy to GitHub Pages**

   ```bash
   npm run deploy
   ```

   Or configure the GitHub Actions workflow for automatic deployment.

## Environment Variables

### Python Backend

```env
SERPAPI_API_KEY=your_serpapi_key
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_key
VERCEL_DEPLOYMENT=true  # Only for Vercel deployment
DATA_PROCESSING_ONLY=true  # Indicates Python runs as data processor only
```

### Node.js Backend

```env
NODE_ENV=production
PORT=3001
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_service_role_key
SUPABASE_ANON_KEY=your_supabase_anon_key
PYTHON_PATH=python
PYTHON_CHASQUIFX_ROOT=../api
```

### Frontend

```env
REACT_APP_API_URL=https://your-api-url.vercel.app/api/v1
REACT_APP_SUPABASE_URL=your_supabase_url
REACT_APP_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Testing the Deployment

After deployment, verify that both backends are working correctly:

1. **Test the Node.js API**

   - `https://your-api-url.vercel.app/health`
   - `https://your-api-url.vercel.app/api/v1/forex/status`

2. **Test the Python bridge**

   - `https://your-api-url.vercel.app/node_bridge/forex/rates`
   - Make a POST request with appropriate body parameters

3. **Test the frontend integration**
   - Navigate to your deployed frontend
   - Verify that API calls are working correctly

## Troubleshooting

### Common Issues

1. **CORS errors**

   - Check that CORS middleware is properly configured in both backends
   - Verify that frontend is using the correct API URL

2. **Environment variable issues**

   - Double-check all environment variables in Vercel dashboard
   - Make sure `.env` files are properly set up for local development

3. **Python-Node.js bridge issues**

   - Check the logs for any Python execution errors
   - Verify that the Python path is correctly configured in Node.js

4. **API Rate Limiting**
   - The application handles SerpAPI rate limiting by falling back to cached data
   - Check the logs for any rate limiting warnings

For any other issues, consult the logs in Vercel dashboard or contact the development team.

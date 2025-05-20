# ChasquiFX Frontend Integration Guide

This document describes how the ChasquiFX frontend integrates with the backend API.

## API Integration

The frontend communicates with the backend using a consolidated API service located in `src/services/chasquiApi.js`. This service handles all API calls, error handling, and authentication.

### API Base URL

The API base URL is configured in the `.env.local` file:

```
REACT_APP_API_URL=https://chasquifx-api.vercel.app
```

For local development, you can switch to:

```
REACT_APP_API_URL=http://localhost:3001
```

### API Services

The API is organized into these main service categories:

1. **System Services** - Health checks and status
2. **Forex Services** - Currency exchange rate operations
3. **Recommendation Services** - Travel recommendations based on forex data
4. **Flight Services** - Flight routes and pricing information

### Authentication & API Keys

API requests include:

- **Authorization headers** for user authentication (JWT tokens from Supabase)
- **API keys** for third-party services (SerpAPI, SearchAPI)

Example:

```javascript
// Headers are automatically added by the API client interceptors
const recommendations =
  await chasquiApi.recommendationService.getRecommendations({
    baseCurrency: "USD",
    departureAirport: "JFK",
  });
```

## Error Handling

The API client implements comprehensive error handling:

- **401 Unauthorized** - Redirects to login
- **403 Forbidden** - Likely an API key issue
- **429 Too Many Requests** - API rate limit exceeded
- **Other errors** - General error handling

Custom events are dispatched for different error types:

- `chasquifx:api-key-error`
- `chasquifx:api-limit-exceeded`
- `chasquifx:api-error`

## Connection Status

The `ApiConnectionStatus` component displays the current API connection status and allows users to refresh the connection.

## Testing API Integration

You can test the API integration using:

1. The `testApiConnection.js` utility in the browser console
2. The backend connection test script: `backend/api/scripts/test-api-connection.sh`

## Version Compatibility

The frontend is designed to work with both API v1 and API v2 endpoints, with preference for v2. If a v2 endpoint fails, the service will automatically fall back to v1.

# ChasquiFX Flight Service API Documentation

## Overview

The Flight Service API provides access to flight information, fares, routes, and emissions data. This API is part of the ChasquiFX platform and is designed to integrate with other services like forex and recommendations.

This documentation covers the v2 implementation of the Flight Service API, which features improved modularization, error handling, and caching mechanisms.

## Base URL

```
https://api.chasquifx.com/api/v2/flights
```

## Authentication

All API requests require an API key to be included in the request headers:

```
X-API-Key: your_api_key_here
```

Contact the administrator to obtain an API key for access to the flight service.

## Rate Limiting

The Flight Service API enforces rate limits to ensure fair usage and stability:

- 100 requests per minute per API key
- 1,000 requests per day per API key

Exceeding these limits will result in a 429 (Too Many Requests) response.

## Endpoints

### Service Status

```
GET /status
```

Returns the current status of the flight service, including availability and quota information.

#### Example Response:

```json
{
  "success": true,
  "status": {
    "available": true,
    "message": "Flight service operational",
    "quotaRemaining": 986,
    "quotaLimit": 1000,
    "timestamp": "2025-05-19T14:30:00Z"
  }
}
```

### Get Flight Fare

```
GET /fare
```

Retrieves the fare for a flight between two airports for specific dates.

#### Query Parameters:

| Parameter         | Type    | Required | Description                                        |
| ----------------- | ------- | -------- | -------------------------------------------------- |
| departure_airport | string  | Yes      | Departure airport IATA code (e.g., "JFK")          |
| arrival_airport   | string  | Yes      | Arrival airport IATA code (e.g., "LAX")            |
| outbound_date     | string  | Yes      | Outbound date in YYYY-MM-DD format                 |
| return_date       | string  | No       | Return date in YYYY-MM-DD format (for round trips) |
| currency          | string  | No       | Currency code (default: "USD")                     |
| simulate          | boolean | No       | Use simulated data if true (for testing)           |

#### Example Request:

```
GET /fare?departure_airport=JFK&arrival_airport=LAX&outbound_date=2025-06-20&return_date=2025-06-27&currency=USD
```

#### Example Response:

```json
{
  "success": true,
  "fare": {
    "departureAirport": "JFK",
    "arrivalAirport": "LAX",
    "outboundDate": "2025-06-20",
    "returnDate": "2025-06-27",
    "price": 399.99,
    "currency": "USD",
    "emissions": 1250,
    "emissionsUnit": "kg CO2",
    "distance": 3939,
    "distanceUnit": "km",
    "timestamp": "2025-05-19T14:30:00Z",
    "isSimulated": false,
    "provider": "flight-api"
  }
}
```

### Get Multiple Fares

```
GET /multi-fares
```

Retrieves fares for flights from one departure airport to multiple arrival airports.

#### Query Parameters:

| Parameter         | Type    | Required | Description                                        |
| ----------------- | ------- | -------- | -------------------------------------------------- |
| departure_airport | string  | Yes      | Departure airport IATA code                        |
| arrival_airports  | string  | Yes      | Comma-separated list of arrival airport IATA codes |
| outbound_date     | string  | Yes      | Outbound date in YYYY-MM-DD format                 |
| return_date       | string  | No       | Return date in YYYY-MM-DD format                   |
| currency          | string  | No       | Currency code (default: "USD")                     |
| simulate          | boolean | No       | Use simulated data if true (for testing)           |

#### Example Request:

```
GET /multi-fares?departure_airport=JFK&arrival_airports=LAX,SFO,MIA&outbound_date=2025-06-20&return_date=2025-06-27&currency=USD
```

#### Example Response:

```json
{
  "success": true,
  "fares": [
    {
      "departureAirport": "JFK",
      "arrivalAirport": "LAX",
      "price": 399.99,
      "currency": "USD",
      "emissions": 1250,
      "distance": 3939
    },
    {
      "departureAirport": "JFK",
      "arrivalAirport": "SFO",
      "price": 479.99,
      "currency": "USD",
      "emissions": 1380,
      "distance": 4154
    },
    {
      "departureAirport": "JFK",
      "arrivalAirport": "MIA",
      "price": 299.99,
      "currency": "USD",
      "emissions": 855,
      "distance": 1752
    }
  ]
}
```

### Get Routes from Airport

```
GET /routes/{departure_airport}
```

Retrieves all routes departing from a specific airport.

#### Path Parameters:

| Parameter         | Type   | Required | Description                 |
| ----------------- | ------ | -------- | --------------------------- |
| departure_airport | string | Yes      | Departure airport IATA code |

#### Example Request:

```
GET /routes/JFK
```

#### Example Response:

```json
{
  "success": true,
  "routes": [
    {
      "departureAirport": "JFK",
      "arrivalAirport": "LAX",
      "distance": 3939,
      "distanceUnit": "km",
      "popularity": 95
    },
    {
      "departureAirport": "JFK",
      "arrivalAirport": "LHR",
      "distance": 5541,
      "distanceUnit": "km",
      "popularity": 87
    },
    {
      "departureAirport": "JFK",
      "arrivalAirport": "CDG",
      "distance": 5837,
      "distanceUnit": "km",
      "popularity": 82
    }
  ],
  "count": 3
}
```

### Get Popular Routes

```
GET /routes/popular
```

Retrieves the most popular flight routes globally.

#### Query Parameters:

| Parameter | Type   | Required | Description                                      |
| --------- | ------ | -------- | ------------------------------------------------ |
| limit     | number | No       | Maximum number of routes to return (default: 10) |

#### Example Request:

```
GET /routes/popular?limit=5
```

#### Example Response:

```json
{
  "success": true,
  "routes": [
    {
      "departureAirport": "JFK",
      "arrivalAirport": "LAX",
      "distance": 3939,
      "distanceUnit": "km",
      "popularity": 95
    },
    {
      "departureAirport": "LHR",
      "arrivalAirport": "JFK",
      "distance": 5541,
      "distanceUnit": "km",
      "popularity": 93
    },
    {
      "departureAirport": "SIN",
      "arrivalAirport": "HKG",
      "distance": 2569,
      "distanceUnit": "km",
      "popularity": 90
    },
    {
      "departureAirport": "DXB",
      "arrivalAirport": "LHR",
      "distance": 5496,
      "distanceUnit": "km",
      "popularity": 89
    },
    {
      "departureAirport": "LAX",
      "arrivalAirport": "JFK",
      "distance": 3939,
      "distanceUnit": "km",
      "popularity": 87
    }
  ],
  "count": 5
}
```

### Get Cheapest Routes

```
GET /cheapest/{departure_airport}
```

Finds the cheapest routes from a departure airport for the given dates.

#### Path Parameters:

| Parameter         | Type   | Required | Description                 |
| ----------------- | ------ | -------- | --------------------------- |
| departure_airport | string | Yes      | Departure airport IATA code |

#### Query Parameters:

| Parameter     | Type    | Required | Description                                     |
| ------------- | ------- | -------- | ----------------------------------------------- |
| outbound_date | string  | Yes      | Outbound date in YYYY-MM-DD format              |
| return_date   | string  | No       | Return date in YYYY-MM-DD format                |
| currency      | string  | No       | Currency code (default: "USD")                  |
| limit         | number  | No       | Maximum number of routes to return (default: 5) |
| simulate      | boolean | No       | Use simulated data if true (for testing)        |

#### Example Request:

```
GET /cheapest/JFK?outbound_date=2025-06-20&return_date=2025-06-27&currency=USD&limit=3
```

#### Example Response:

```json
{
  "success": true,
  "routes": [
    {
      "departureAirport": "JFK",
      "arrivalAirport": "BOS",
      "price": 129.99,
      "currency": "USD",
      "distance": 306,
      "distanceUnit": "km"
    },
    {
      "departureAirport": "JFK",
      "arrivalAirport": "ORD",
      "price": 179.99,
      "currency": "USD",
      "distance": 1188,
      "distanceUnit": "km"
    },
    {
      "departureAirport": "JFK",
      "arrivalAirport": "MIA",
      "price": 199.99,
      "currency": "USD",
      "distance": 1752,
      "distanceUnit": "km"
    }
  ],
  "count": 3
}
```

### Get Eco-Friendly Routes

```
GET /eco-friendly/{departure_airport}
```

Finds the most eco-friendly routes from a departure airport based on emissions per kilometer.

#### Path Parameters:

| Parameter         | Type   | Required | Description                 |
| ----------------- | ------ | -------- | --------------------------- |
| departure_airport | string | Yes      | Departure airport IATA code |

#### Query Parameters:

| Parameter | Type   | Required | Description                                     |
| --------- | ------ | -------- | ----------------------------------------------- |
| limit     | number | No       | Maximum number of routes to return (default: 5) |

#### Example Request:

```
GET /eco-friendly/JFK?limit=3
```

#### Example Response:

```json
{
  "success": true,
  "routes": [
    {
      "departureAirport": "JFK",
      "arrivalAirport": "BOS",
      "emissions": 99.45,
      "emissionsUnit": "kg CO2",
      "distance": 306,
      "distanceUnit": "km",
      "emissionsPerKm": 0.325
    },
    {
      "departureAirport": "JFK",
      "arrivalAirport": "PHL",
      "emissions": 128.7,
      "emissionsUnit": "kg CO2",
      "distance": 151,
      "distanceUnit": "km",
      "emissionsPerKm": 0.331
    },
    {
      "departureAirport": "JFK",
      "arrivalAirport": "YYZ",
      "emissions": 237.1,
      "emissionsUnit": "kg CO2",
      "distance": 631,
      "distanceUnit": "km",
      "emissionsPerKm": 0.376
    }
  ],
  "count": 3
}
```

### Get Route Emissions

```
GET /emissions/{departure_airport}/{arrival_airport}
```

Retrieves carbon emissions data for a specific route.

#### Path Parameters:

| Parameter         | Type   | Required | Description                 |
| ----------------- | ------ | -------- | --------------------------- |
| departure_airport | string | Yes      | Departure airport IATA code |
| arrival_airport   | string | Yes      | Arrival airport IATA code   |

#### Example Request:

```
GET /emissions/JFK/LAX
```

#### Example Response:

```json
{
  "success": true,
  "emissions": {
    "departureAirport": "JFK",
    "arrivalAirport": "LAX",
    "emissions": 1250,
    "emissionsUnit": "kg CO2",
    "distance": 3939,
    "distanceUnit": "km",
    "emissionsPerKm": 0.317,
    "methodology": "ICAO carbon calculator",
    "timestamp": "2025-05-19T14:30:00Z"
  }
}
```

## Error Handling

The API uses standard HTTP status codes and returns error information in a consistent format.

### Error Response Format:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": {
      "additional": "information"
    }
  }
}
```

### Common Error Codes:

| Status Code | Error Code          | Description                             |
| ----------- | ------------------- | --------------------------------------- |
| 400         | INVALID_PARAMS      | Missing or invalid parameters           |
| 401         | UNAUTHORIZED        | Missing or invalid API key              |
| 404         | NOT_FOUND           | Resource not found                      |
| 429         | RATE_LIMITED        | Rate limit exceeded                     |
| 500         | SERVER_ERROR        | Internal server error                   |
| 503         | SERVICE_UNAVAILABLE | External flight API service unavailable |

## Data Models

### FlightFare

```json
{
  "departureAirport": "JFK",
  "arrivalAirport": "LAX",
  "outboundDate": "2025-06-20",
  "returnDate": "2025-06-27",
  "price": 399.99,
  "currency": "USD",
  "emissions": 1250,
  "emissionsUnit": "kg CO2",
  "distance": 3939,
  "distanceUnit": "km",
  "timestamp": "2025-05-19T14:30:00Z",
  "isSimulated": false,
  "provider": "flight-api"
}
```

### FlightRoute

```json
{
  "departureAirport": "JFK",
  "arrivalAirport": "LAX",
  "distance": 3939,
  "distanceUnit": "km",
  "popularity": 95,
  "lastUpdated": "2025-05-19T14:30:00Z"
}
```

### EmissionsData

```json
{
  "departureAirport": "JFK",
  "arrivalAirport": "LAX",
  "emissions": 1250,
  "emissionsUnit": "kg CO2",
  "distance": 3939,
  "distanceUnit": "km",
  "emissionsPerKm": 0.317,
  "methodology": "ICAO carbon calculator",
  "timestamp": "2025-05-19T14:30:00Z"
}
```

## Integration with Other Services

The Flight Service API integrates with the following ChasquiFX services:

- **Forex Service**: Currency conversion for flight fares
- **Geo Service**: Airport and distance information
- **Recommendation Service**: Provides flight data for travel recommendations

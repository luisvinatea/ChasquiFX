# ChasquiFX Backend API CORS Configuration Guide

This document explains how CORS is configured in the ChasquiFX API to allow cross-origin requests from the frontend.

## CORS Configuration

The backend API uses two layers of CORS configuration:

### 1. Express middleware CORS configuration

In `backend/api/src/index.js`, we use the `cors` middleware to configure CORS settings:

```javascript
app.use(
  cors({
    origin: [
      "https://chasquifx.github.io", // GitHub Pages deployment
      "http://localhost:3000", // Local React development
      "https://chasquifx-web.vercel.app", // Vercel production frontend
      /\.vercel\.app$/, // Any Vercel preview deployments
    ],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-Serpapi-Key",
      "X-Search-Api-Key",
      "X-Exchange-Api-Key",
    ],
    credentials: true,
    maxAge: 86400, // Cache preflight requests for 24 hours
  })
);
```

### 2. Vercel.json CORS headers

In `backend/api/vercel.json`, we also add CORS headers to ensure Vercel properly handles CORS:

```json
"headers": [
  {
    "source": "/(.*)",
    "headers": [
      { "key": "Access-Control-Allow-Credentials", "value": "true" },
      { "key": "Access-Control-Allow-Origin", "value": "https://chasquifx-web.vercel.app" },
      { "key": "Access-Control-Allow-Methods", "value": "GET,OPTIONS,PATCH,DELETE,POST,PUT" },
      {
        "key": "Access-Control-Allow-Headers",
        "value": "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization, X-Serpapi-Key, X-Search-Api-Key, X-Exchange-Api-Key"
      }
    ]
  }
]
```

## Troubleshooting CORS Issues

If you encounter CORS errors:

1. Check that the frontend domain is included in the `origin` array in `backend/api/src/index.js`
2. Ensure the `Access-Control-Allow-Origin` header in `vercel.json` includes the frontend domain
3. Verify that the necessary headers are allowed in both configurations
4. Redeploy the backend API after making changes

## Adding New Frontend Domains

To add a new frontend domain:

1. Add the domain to the `origin` array in `backend/api/src/index.js`
2. Update the `Access-Control-Allow-Origin` header in `vercel.json` (or make it more permissive with "\*" if appropriate)
3. Redeploy the backend API

## Mobile Web App Configuration

The frontend includes both Apple-specific and standard mobile web app meta tags:

```html
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="black" />
```

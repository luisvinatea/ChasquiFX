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
      { "key": "Access-Control-Allow-Origin", "value": "*" },
      { "key": "Access-Control-Allow-Methods", "value": "GET,OPTIONS,PATCH,DELETE,POST,PUT" },
      {
        "key": "Access-Control-Allow-Headers",
        "value": "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization, X-Serpapi-Key, X-Search-Api-Key, X-Exchange-Api-Key"
      }
    ]
  }
]
```

### 3. Serverless Function CORS Headers

In addition to the Express middleware and Vercel.json configuration, each serverless function file in the `/api` directory sets its own CORS headers. This is important for endpoints accessed directly through Vercel's serverless function routes:

```javascript
// Example from /api/health.js, /api/forex.js, and other serverless endpoints
export default async function handler(req, res) {
  // Enable CORS
  res.setHeader("Access-Control-Allow-Credentials", true);
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET,OPTIONS,PATCH,DELETE,POST,PUT"
  );
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization, X-Serpapi-Key, X-Search-Api-Key, X-Exchange-Api-Key"
  );

  // Handle OPTIONS requests
  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  // Rest of handler code...
}
```

## Troubleshooting CORS Issues

If you encounter CORS errors:

1. Check that the frontend domain is included in the `origin` array in `backend/api/src/index.js`
2. Verify that the `Access-Control-Allow-Origin` header in `vercel.json` is set to `"*"` or includes the specific frontend domain
3. Check that all serverless function files in the `/api` directory have the correct CORS headers
4. Ensure that all necessary headers (especially authorization and API key headers) are included in the `Access-Control-Allow-Headers` list
5. Test with the `test-cors-config.sh` script to diagnose specific CORS issues
6. Remember to redeploy the backend API after making changes using the `deploy-api-cors-fix.sh` script

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

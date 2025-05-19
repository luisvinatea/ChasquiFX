# MongoDB Connection Troubleshooting Guide

## Connection Issue: Authentication Failed

If you are receiving a "bad auth : authentication failed" error when connecting to MongoDB Atlas, follow these steps:

### 1. Verify MongoDB Atlas Credentials

**Problem:** The credentials in the `.env` file may be incorrect or outdated.

**Solution:**

1. Log into the [MongoDB Atlas dashboard](https://cloud.mongodb.com)
2. Go to "Database Access" under Security
3. Check if the user exists
4. Reset the password and update your `.env` file with the new credentials

### 2. Check Network Access

**Problem:** Your IP address might not be allowlisted in MongoDB Atlas.

**Solution:**

1. Go to "Network Access" under Security in MongoDB Atlas
2. Add your current IP address or use "Allow Access from Anywhere" for development
3. Wait a few minutes for the changes to take effect

### 3. Verify Cluster Status

**Problem:** The MongoDB Atlas cluster might be paused or unavailable.

**Solution:**

1. Check the cluster status in MongoDB Atlas
2. If paused, resume the cluster
3. Verify that the cluster tier supports the operations you're trying to perform

### 4. Connection String Format

**Problem:** The connection string format might be incorrect.

**Solution:**
Use one of these formats:

```javascript
# Standard format
mongodb+srv://<username>:<password>@chasquifx.2akcifh.mongodb.net/<database>?retryWrites=true&w=majority

# With auth source specified
mongodb+srv://<username>:<password>@chasquifx.2akcifh.mongodb.net/<database>?authSource=admin
```

### 5. ES Module vs CommonJS

**Problem:** Mixing ES module syntax with CommonJS can cause import/export issues.

**Solution:**

- For ES modules (with `"type": "module"` in package.json):

  ```javascript
  // Use ES import syntax
  import mongoose from "mongoose";
  import { MongoClient, ServerApiVersion } from "mongodb";

  // Use ES export syntax
  export { mongoose, connectToDatabase };
  ```

- For CommonJS:

  ```javascript
  // Use require
  const mongoose = require("mongoose");
  const { MongoClient, ServerApiVersion } = require("mongodb");

  // Use module.exports
  module.exports = { mongoose, connectToDatabase };
  ```

## Testing Connection

Use the provided test scripts to verify your connection:

```bash
# Test MongoDB Atlas connection
node tests/test-atlas-connection.js

# Verify MongoDB hostname
node tests/host-verification.js
```

## Current Status

As of May 19, 2025, the MongoDB connection module has been updated to use ES module syntax correctly, but authentication is failing with the provided credentials. The MongoDB Atlas hostname is valid and resolving correctly, but the authentication credentials need verification.

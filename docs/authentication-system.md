# User Authentication and API Key Storage System

This document explains the user authentication and API key storage system implemented for ChasquiFX.

## Overview

The authentication system allows users to:

- Register an account
- Verify their email address
- Log in securely
- Store and manage API keys securely
- Reset passwords

## Components

1. **User Model** - MongoDB schema for user accounts
2. **Authentication Service** - Handles user registration, login, and token management
3. **Email Service** - Sends verification emails, welcome emails, and password reset emails
4. **API Key Service** - Securely stores and manages user API keys
5. **Controllers & Routes** - Express routes and controllers for authentication endpoints

## Implementation Details

### User Registration Flow

1. User submits registration form with email and password
2. System creates a new user with unverified status
3. Verification email is sent with a unique token
4. User clicks the verification link in the email
5. Account is verified and a welcome email is sent
6. User can now log in

### API Key Storage

API keys are securely stored using AES-256 encryption:

1. Each API key is encrypted before storage
2. Encryption uses a unique initialization vector (IV) for each key
3. Keys are associated with user accounts in the MongoDB database
4. Actual key values are never returned in API responses except when explicitly requested

### Security Features

- Passwords are hashed using PBKDF2 with salt
- JWT tokens are used for authentication
- Email verification prevents unauthorized registrations
- Encrypted API key storage protects sensitive keys
- Token expiration for verification and password reset links

## API Endpoints

### Authentication

- `POST /api/v2/auth/register` - Register a new user
- `POST /api/v2/auth/login` - Log in a user
- `POST /api/v2/auth/verify-email` - Verify email with token
- `POST /api/v2/auth/resend-verification` - Resend verification email
- `POST /api/v2/auth/forgot-password` - Request password reset
- `POST /api/v2/auth/reset-password` - Reset password with token
- `GET /api/v2/auth/profile` - Get current user profile (requires auth)

### API Key Management

- `POST /api/v2/api-keys` - Store an API key
- `GET /api/v2/api-keys` - List all API key types
- `GET /api/v2/api-keys/:keyType/verify` - Check if an API key exists
- `GET /api/v2/api-keys/:keyType` - Get an API key
- `DELETE /api/v2/api-keys/:keyType` - Delete an API key

## Configuration

The system requires the following environment variables:

```
# JWT Authentication
JWT_SECRET=your-secret-key
JWT_EXPIRY=7d

# Email Configuration
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=username
SMTP_PASSWORD=password
EMAIL_FROM="ChasquiFX <no-reply@chasquifx.app>"
APP_URL=https://chasquifx-web.vercel.app

# API Key Encryption
ENCRYPTION_KEY=your-encryption-key
```

## Troubleshooting

If email verification fails:

1. Check SMTP configuration in .env file
2. Verify email templates in src/templates directory
3. Check server logs for email sending errors
4. For testing, the system will use ethereal.email if SMTP is not configured

If API key storage fails:

1. Ensure ENCRYPTION_KEY is set in .env
2. Check MongoDB connection
3. Verify user authentication is working properly

# ChasquiFX Authentication System

This document describes the user authentication system integrated with MongoDB for ChasquiFX.

## Overview

The authentication system provides:

- User registration and login
- JWT-based authentication
- Secure API key storage with encryption
- User profile management
- Search history tracking
- Route protection

## Features

### 🔐 Authentication

- **User Registration**: Create new accounts with email, password, and optional name
- **User Login**: Authenticate with email and password
- **JWT Tokens**: Secure, stateless authentication tokens with 7-day expiration
- **Token Verification**: Automatic token validation for protected routes
- **Logout**: Secure session termination

### 🔑 API Key Management

- **Secure Storage**: API keys are encrypted before storage in MongoDB
- **Multiple Providers**: Support for SerpAPI, SearchAPI, Amadeus, and OpenWeather
- **User-Specific**: Each user manages their own API keys
- **Easy Management**: Add, view, and remove API keys through the UI

### 👤 User Profile

- **Profile Management**: Update name and preferences
- **Password Change**: Secure password updates with current password verification
- **User Preferences**: Store currency, notifications, and theme preferences

### 📊 Search History

- **Automatic Tracking**: Save user searches automatically
- **History Retrieval**: Access past searches with pagination
- **Search Management**: Delete unwanted search history

## API Endpoints

### Authentication Routes

```
POST /api/auth/signup     - User registration
POST /api/auth/signin     - User login
POST /api/auth/logout     - User logout
GET  /api/auth/verify     - Token verification
POST /api/auth/verify     - Token validation
```

### User Management Routes

```
GET  /api/user/profile    - Get user profile
PUT  /api/user/profile    - Update user profile
POST /api/user/profile    - Change password
```

### API Key Management Routes

```
GET    /api/user/api-keys         - List user's API keys
POST   /api/user/api-keys         - Store new API key
DELETE /api/user/api-keys?keyType - Remove API key
```

### Search History Routes

```
GET    /api/user/searches                    - Get search history
POST   /api/user/searches                    - Save new search
DELETE /api/user/searches?searchId          - Delete search
```

## Setup Instructions

### 1. Install Dependencies

The following packages are required and should already be installed:

```bash
npm install bcryptjs jsonwebtoken mongodb
```

### 2. Environment Variables

Create a `.env.local` file with the following variables:

```env
# MongoDB Connection
MONGODB_URI=your_mongodb_connection_string
MONGODB_DB=chasquifx

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-at-least-32-characters-long
JWT_EXPIRES_IN=7d

# API Key Encryption
ENCRYPTION_KEY=your-32-character-encryption-key-here

# Logging
LOG_LEVEL=info

# Client API URL
NEXT_PUBLIC_API_URL=http://localhost:3000
```

### 3. MongoDB Collections

The system will automatically create the following collections:

#### Users Collection (`users`)

```javascript
{
  _id: ObjectId,
  email: String (unique, lowercase),
  password: String (bcrypt hashed),
  name: String,
  role: String (default: 'user'),
  status: String (default: 'active'),
  createdAt: Date,
  updatedAt: Date,
  lastLogin: Date,
  lastActive: Date,
  lastLogout: Date,
  preferences: {
    currency: String,
    notifications: Boolean,
    theme: String
  },
  apiKeys: {
    [keyType]: {
      key: String (encrypted),
      lastUpdated: Date,
      createdAt: Date
    }
  }
}
```

#### User Searches Collection (`user_searches`)

```javascript
{
  _id: ObjectId,
  userId: ObjectId (ref to users),
  from: String,
  to: String,
  departureDate: Date,
  returnDate: Date,
  passengers: Number,
  resultsCount: Number,
  results: Array,
  createdAt: Date,
  savedAt: Date
}
```

## Frontend Integration

### 1. AuthContext

The app uses React Context for authentication state management:

```jsx
import { useAuth } from "./contexts/AuthContext";

function MyComponent() {
  const { user, isAuthenticated, login, logout } = useAuth();

  // Use authentication state and methods
}
```

### 2. Protected Components

Use the `withAuth` HOC to protect components:

```jsx
import { withAuth } from "./contexts/AuthContext";

const ProtectedComponent = withAuth(MyComponent);
```

### 3. Authentication Components

- `Auth.jsx` - Login/Signup form
- `ApiKeysManager.jsx` - API key management
- `ProfileDialog.jsx` - User profile management

## Security Features

### Password Security

- Minimum 8 characters
- Requires uppercase and lowercase letters
- Requires at least one number
- Uses bcrypt with 12 salt rounds

### API Key Security

- AES-256-CTR encryption
- Separate encryption key
- User-specific access only

### JWT Security

- HS256 algorithm
- 7-day expiration
- User role and permissions
- Automatic token refresh

### Route Protection

- Server-side token verification
- User status validation
- Role-based access control
- Automatic session cleanup

## Usage Examples

### User Registration

```javascript
import { signUpUser } from "./services/mongoDbClient";

const result = await signUpUser("user@example.com", "password123", "John Doe");
if (!result.error) {
  console.log("User registered:", result.user);
}
```

### User Login

```javascript
import { signInUser } from "./services/mongoDbClient";

const result = await signInUser("user@example.com", "password123");
if (!result.error) {
  console.log("User logged in:", result.user);
}
```

### Store API Key

```javascript
import { storeUserApiKey } from "./services/mongoDbClient";

const result = await storeUserApiKey("serpapi", "your-api-key-here");
if (result.success) {
  console.log("API key saved");
}
```

### Using Authentication Context

```jsx
function HomePage() {
  const { user, isAuthenticated, logout } = useAuth();

  if (!isAuthenticated) {
    return <LoginForm />;
  }

  return (
    <div>
      <h1>Welcome, {user.name}!</h1>
      <button onClick={logout}>Logout</button>
    </div>
  );
}
```

## Testing

To test the authentication system:

1. **Registration**: Test user signup with various email/password combinations
2. **Login**: Test login with valid and invalid credentials
3. **Token Validation**: Test protected routes with and without valid tokens
4. **API Keys**: Test storing, retrieving, and removing API keys
5. **Profile Updates**: Test profile and password changes
6. **Search History**: Test saving and retrieving search history

## Troubleshooting

### Common Issues

1. **"No token provided"**: Ensure the Authorization header is set correctly
2. **"Invalid or expired token"**: Check JWT_SECRET and token expiration
3. **"User not found"**: Verify the user exists and is active
4. **API key encryption errors**: Check ENCRYPTION_KEY configuration
5. **MongoDB connection issues**: Verify MONGODB_URI and network access

### Debug Mode

Set `LOG_LEVEL=debug` in your environment variables to see detailed logs.

## Future Enhancements

- [ ] Email verification for new accounts
- [ ] Password reset functionality
- [ ] Two-factor authentication (2FA)
- [ ] OAuth integration (Google, GitHub)
- [ ] Account deactivation/deletion
- [ ] Admin user management interface
- [ ] Session management (active sessions)
- [ ] Rate limiting for auth endpoints
- [ ] Audit logs for security events

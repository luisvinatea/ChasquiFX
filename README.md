# ChasquiFX

A modern hybrid travel recommendation application that integrates flight data with foreign exchange rates to provide smart destination recommendations based on favorable exchange rates and flight availability.

## 🏗️ Architecture

ChasquiFX uses a unique **hybrid Next.js + Vite architecture**:

- **Frontend**: Vite-powered React SPA with React Router for client-side routing
- **Backend API**: Next.js App Router API routes for server-side functionality
- **Database**: MongoDB for data persistence and user management
- **Authentication**: JWT-based user authentication with secure API key storage
- **Development**: Unified development environment running both servers concurrently

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- MongoDB connection (local or cloud)
- API keys for flight/forex data services

### Installation & Development

```bash
# Clone the repository
git clone <repository-url>
cd chasquifx

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your MongoDB URI and API keys

# Start development environment (both frontend and API)
npm run dev
```

This will start:

- **Frontend (Vite)**: http://localhost:3000
- **API (Next.js)**: http://localhost:3001/api

### Build for Production

```bash
# Build both frontend and API
npm run build:full

# Or build individually
npm run dev:frontend  # Start only Vite frontend
npm run dev:api       # Start only Next.js API
```

## 📁 Project Structure

```
chasquifx/
├── src/
│   ├── app/                    # Next.js App Router (API routes)
│   │   ├── api/               # API endpoints
│   │   │   ├── currencies/    # Currency exchange APIs
│   │   │   ├── flights/       # Flight search APIs
│   │   │   ├── forex/         # Forex rate APIs
│   │   │   └── health/        # Health check APIs
│   │   ├── layout.tsx         # Next.js root layout
│   │   └── page.tsx          # Next.js compatibility page
│   ├── page-components/       # React page components
│   │   ├── HomePage.tsx
│   │   ├── SearchPage.tsx
│   │   ├── ResultsPage.tsx
│   │   └── AnalysisPage.tsx
│   ├── components/            # Reusable React components
│   │   ├── ui/               # UI components (shadcn/ui)
│   │   ├── search/           # Search-related components
│   │   ├── results/          # Results display components
│   │   └── analysis/         # Analysis components
│   ├── services/             # API client services
│   │   ├── chasquiApi.js     # Main API client
│   │   ├── chasquiApiNext.js # Next.js API utilities
│   │   └── mongoDbClient.js  # MongoDB client
│   ├── App.tsx               # React SPA entry point
│   └── main.tsx              # Vite entry point
├── scripts/
│   └── dev.ts                # Development orchestration script
├── public/                   # Static assets
├── server/                   # Express server utilities
└── docs/                     # Documentation
```

## 🛠️ Technology Stack

### Frontend

- **React 18** - Modern React with hooks and concurrent features
- **Vite 6** - Fast build tool and dev server
- **React Router 7** - Client-side routing
- **Material-UI (MUI) 7** - React component library
- **Radix UI** - Unstyled, accessible UI primitives
- **Tailwind CSS 3** - Utility-first CSS framework
- **TypeScript 5** - Type safety and developer experience

### Backend

- **Next.js 14** - App Router for API routes
- **Express 5** - Additional server utilities
- **MongoDB 6** - NoSQL database with Kysely query builder
- **Node.js 22** - Server runtime

### Authentication & Security

- **JWT (jsonwebtoken)** - Stateless authentication tokens
- **bcryptjs** - Password hashing and verification
- **AES-256-CTR** - API key encryption
- **MongoDB** - User accounts and secure data storage
- **Role-based access** - User permissions and route protection

### Development Tools

- **ESLint 9** - Code linting with flat config
- **TypeScript** - Static type checking
- **tsx** - TypeScript execution for scripts
- **Vercel** - Deployment platform

## 🔐 Authentication System

ChasquiFX includes a comprehensive user authentication system:

### Features

- **User Registration & Login** - Secure account creation and authentication
- **JWT-based Sessions** - Stateless, secure token-based authentication
- **API Key Management** - Encrypted storage of user API keys (SerpAPI, Amadeus, etc.)
- **User Profiles** - Manage account settings and preferences
- **Search History** - Track and manage user search history
- **Route Protection** - Secure API endpoints and user data

### Quick Setup

1. Set environment variables for JWT and encryption keys
2. Configure MongoDB connection
3. Users can register/login through the UI
4. API keys are stored securely per user account

For detailed authentication documentation, see [docs/AUTHENTICATION.md](docs/AUTHENTICATION.md).

## 🌐 API Endpoints

The Next.js API provides the following endpoints:

- `GET /api/health` - Health check and status
- `GET /api/db-status` - Database connection status
- `GET /api/currencies` - Available currencies
- `GET /api/currencies/[from]/[to]` - Exchange rate between currencies
- `GET /api/forex` - Forex rate data
- `GET /api/flights/search` - Flight search functionality
- `GET /api/flights/recent` - Recent flight searches
- `GET /api/docs` - API documentation

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the project root:

```env
# MongoDB Configuration
MONGODB_URI=your_mongodb_connection_string
MONGODB_DB_NAME=chasquifx

# API Keys
SERPAPI_KEY=your_serpapi_key
SEARCHAPI_KEY=your_searchapi_key

# Next.js Configuration
NEXT_PUBLIC_API_URL=http://localhost:3001
NODE_ENV=development
```

### Development Scripts

The project includes several npm scripts:

```json
{
  "dev": "tsx scripts/dev.ts", // Start both frontend and API
  "build": "next build", // Build Next.js API
  "build:full": "vite build && next build", // Build both frontend and API
  "start": "tsx scripts/dev.ts", // Production start (same as dev)
  "dev:frontend": "vite", // Start only Vite frontend
  "dev:api": "next dev --port 3001" // Start only Next.js API
}
```

## 🎯 Features

### Core Functionality

- **Smart Recommendations**: Combines forex rates with flight availability
- **Real-time Data**: Live flight and currency exchange rate fetching
- **Interactive Analysis**: Visual comparison of destinations and rates
- **User Profiles**: Secure user accounts with recommendation history
- **API Key Management**: Secure storage of third-party API keys
- **Caching System**: MongoDB-based caching for improved performance

### User Interface

- **Responsive Design**: Works on desktop, tablet, and mobile
- **Modern UI**: Material-UI components with Tailwind styling
- **Dark/Light Mode**: Theme switching support
- **Accessibility**: ARIA compliant with keyboard navigation
- **Progressive Web App**: PWA capabilities for mobile installation

### Data Management

- **MongoDB Integration**: NoSQL database for flexible data storage
- **Real-time Updates**: Live data fetching with fallback caching
- **User History**: Persistent storage of searches and preferences
- **Analytics**: Usage tracking and performance monitoring

## 🚀 Deployment

### Vercel Deployment (Recommended)

1. **Install Vercel CLI**:

   ```bash
   npm install -g vercel
   ```

2. **Deploy**:

   ```bash
   vercel --prod
   ```

3. **Configure Environment Variables** in Vercel dashboard

### Manual Deployment

1. **Build the application**:

   ```bash
   npm run build:full
   ```

2. **Deploy the `dist/` folder** (frontend) and the `.next/` folder (API) to your hosting provider

## 🔍 Development Workflow

### Starting Development

```bash
# Start both servers
npm run dev

# Or start individually for debugging
npm run dev:frontend  # Frontend only (port 3000)
npm run dev:api       # API only (port 3001)
```

### Code Quality

The project includes comprehensive linting and type checking:

```bash
# Type checking (automatic in VS Code)
npx tsc --noEmit

# Linting (with ESLint 9 flat config)
npx eslint src/
```

### Database Setup

1. **MongoDB Atlas** (recommended):

   - Create a free cluster at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
   - Get your connection string
   - Add it to your `.env` file

2. **Local MongoDB**:

   ```bash
   # Install MongoDB locally
   brew install mongodb/brew/mongodb-community  # macOS
   sudo apt install mongodb                     # Ubuntu

   # Start MongoDB
   mongod
   ```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make your changes and ensure tests pass
4. Commit with descriptive messages
5. Push to your fork and submit a pull request

### Code Style

- Use TypeScript for all new code
- Follow the existing ESLint configuration
- Write descriptive commit messages
- Add tests for new features

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Next.js](https://nextjs.org/) - React framework for the API
- [Vite](https://vitejs.dev/) - Build tool for the frontend
- [React](https://reactjs.org/) - UI library
- [Material-UI](https://mui.com/) - React component library
- [MongoDB](https://www.mongodb.com/) - Database
- [Vercel](https://vercel.com/) - Deployment platform

---

**ChasquiFX** - Smart travel recommendations powered by real-time data and modern web technologies.

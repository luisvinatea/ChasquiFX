#!/bin/bash

# Script to update App.jsx for Vite compatibility
# This script will create a Vite-compatible App.jsx file

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}=====================================${NC}"
echo -e "${BLUE}ChasquiFX App.jsx Vite Adaptation${NC}"
echo -e "${BLUE}=====================================${NC}"

# Check if frontend directory exists
if [ ! -d "frontend" ]; then
    echo -e "${RED}Error: frontend directory not found${NC}"
    exit 1
fi

# Create a backup of App.js
echo -e "${YELLOW}Creating backup of App.js...${NC}"
cp frontend/src/App.js frontend/src/App.js.backup
echo -e "${GREEN}✓ Backup created${NC}"

# Create the Vite-compatible App.jsx
echo -e "${YELLOW}Creating Vite-compatible App.jsx...${NC}"
cat >frontend/src/App.jsx <<'EOL'
import { useState, useEffect } from "react";
import {
  CssBaseline,
  Container,
  Box,
  Typography,
  Grid,
  AppBar,
  Toolbar,
  Alert,
  Snackbar,
  Tab,
  Tabs,
  Button,
  Chip,
  Menu,
  MenuItem,
} from "@mui/material";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import FlightIcon from "@mui/icons-material/Flight";
import ApiIcon from "@mui/icons-material/Api";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";
import LogoutIcon from "@mui/icons-material/Logout";
import "./App.css";
import Sidebar from "./components/Sidebar";
import RecommendationsList from "./components/RecommendationsList";
import StatsCards from "./components/StatsCards";
import LoadingSpinner from "./components/LoadingSpinner";
import ApiKeysManager from "./components/ApiKeysManager";
import ApiConnectionStatus from "./components/ApiConnectionStatus";
import Auth from "./components/Auth";
import chasquiApi from "./services/chasquiApi";
// DEPRECATED: Using compatibility layer for transition from Supabase to MongoDB
import {
  getSession,
  signOutUser,
  getUserRecommendations,
} from "./services/supabaseClient";

// Create a theme
const theme = createTheme({
  palette: {
    primary: {
      main: "#1976d2",
    },
    secondary: {
      main: "#dc004e",
    },
    background: {
      default: "#f5f5f5",
    },
  },
});

function App() {
  // State management
  const [apiStatus, setApiStatus] = useState(false);
  const [departureAirport, setDepartureAirport] = useState("JFK");
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [favorites, setFavorites] = useState([]);
  const [notification, setNotification] = useState({
    open: false,
    message: "",
    severity: "info",
  });
  const [openApiKeysManager, setOpenApiKeysManager] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [user, setUser] = useState(null);
  const [userMenuAnchor, setUserMenuAnchor] = useState(null);
  const [pastRecommendations, setPastRecommendations] = useState([]);
  const [pastRecommendationsLoading, setPastRecommendationsLoading] =
    useState(false);

  // Check user session on mount
  useEffect(() => {
    const checkSession = async () => {
      try {
        const { session } = await getSession();
        if (session) {
          setUser(session.user);
          loadPastRecommendations(session.user.id);
        }
      } catch (error) {
        console.error("Session check error:", error);
      }
    };

    checkSession();
  }, []);

  // Load user's past recommendations
  const loadPastRecommendations = async (userId) => {
    try {
      setPastRecommendationsLoading(true);
      const recommendations = await getUserRecommendations(userId);
      setPastRecommendations(recommendations);
    } catch (error) {
      console.error("Failed to load past recommendations:", error);
    } finally {
      setPastRecommendationsLoading(false);
    }
  };

  // Handle API key modal
  const handleOpenApiKeysManager = () => {
    if (!user) {
      setNotification({
        open: true,
        message: "Please log in to manage API keys",
        severity: "warning",
      });
      return;
    }
    setOpenApiKeysManager(true);
  };

  const handleCloseApiKeysManager = () => {
    setOpenApiKeysManager(false);
  };

  // Handle user menu
  const handleUserMenuOpen = (event) => {
    setUserMenuAnchor(event.currentTarget);
  };

  const handleUserMenuClose = () => {
    setUserMenuAnchor(null);
  };

  // Handle logout
  const handleLogout = async () => {
    try {
      await signOutUser();
      setUser(null);
      handleUserMenuClose();
      setNotification({
        open: true,
        message: "Successfully logged out",
        severity: "success",
      });
    } catch (error) {
      console.error("Logout error:", error);
      setNotification({
        open: true,
        message: "Logout failed",
        severity: "error",
      });
    }
  };

  // Handle successful authentication
  const handleAuthSuccess = (user) => {
    setUser(user);
    if (user) {
      loadPastRecommendations(user.id);
    }
  };

  // Check API status on component mount
  useEffect(() => {
    const checkApiStatus = async () => {
      try {
        const status = await chasquiApi.systemService.getStatus();
        setApiStatus(status.status === "healthy");

        // If we were previously offline but now online, show a notification
        if (!apiStatus) {
          setNotification({
            message: "API connection restored",
            severity: "success",
            open: true,
          });
        }
      } catch (error) {
        console.error("API Status Check Error:", error);
        setApiStatus(false);
      }
    };

    checkApiStatus();

    // Setup periodic status check with increased interval while API is down
    const statusInterval = setInterval(
      checkApiStatus,
      apiStatus ? 60000 : 15000 // Check more frequently if API is down
    );

    return () => {
      clearInterval(statusInterval);
    };
  }, [apiStatus]);

  // Handle notification close
  const handleCloseNotification = () => {
    setNotification({
      ...notification,
      open: false,
    });
  };

  // Handle tab change
  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  // Get forex recommendations
  const getRecommendations = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await chasquiApi.forexService.getRecommendations(departureAirport);
      setRecommendations(response.recommendations || []);
      
      setNotification({
        message: `Found ${response.recommendations?.length || 0} destinations with favorable exchange rates`,
        severity: "success",
        open: true,
      });
      
      // Store in user history if logged in
      if (user) {
        // Simulated functionality, actual implementation coming in future update
        console.log("Would store recommendations for user:", user.id);
      }
    } catch (error) {
      console.error("Get recommendations error:", error);
      setError(error.message || "Failed to get recommendations");
      setRecommendations([]);
      
      setNotification({
        message: "Failed to get recommendations. Please try again later.",
        severity: "error",
        open: true,
      });
    } finally {
      setLoading(false);
    }
  };

  // Toggle favorite status for a recommendation
  const toggleFavorite = (recommendation) => {
    const exists = favorites.some((fav) => fav.destination === recommendation.destination);
    
    if (exists) {
      // Remove from favorites
      setFavorites(favorites.filter((fav) => fav.destination !== recommendation.destination));
    } else {
      // Add to favorites
      setFavorites([...favorites, recommendation]);
    }
  };

  // Check if a recommendation is favorited
  const isFavorite = (recommendation) => {
    return favorites.some((fav) => fav.destination === recommendation.destination);
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
        <AppBar position="sticky">
          <Toolbar>
            <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
              ChasquiFX
            </Typography>
            <ApiConnectionStatus isConnected={apiStatus} />
            <Button 
              color="inherit" 
              startIcon={<ApiIcon />}
              onClick={handleOpenApiKeysManager}
              sx={{ mx: 1 }}
            >
              API Keys
            </Button>
            {user ? (
              <>
                <Button
                  color="inherit"
                  startIcon={<AccountCircleIcon />}
                  onClick={handleUserMenuOpen}
                >
                  {user.email}
                </Button>
                <Menu
                  anchorEl={userMenuAnchor}
                  open={Boolean(userMenuAnchor)}
                  onClose={handleUserMenuClose}
                >
                  <MenuItem onClick={handleLogout}>
                    <LogoutIcon sx={{ mr: 1 }} /> Logout
                  </MenuItem>
                </Menu>
              </>
            ) : (
              <Auth onAuthSuccess={handleAuthSuccess} />
            )}
          </Toolbar>
        </AppBar>

        <Container sx={{ flexGrow: 1, py: 4 }}>
          <Box mb={4}>
            <Typography variant="h4" component="h1" gutterBottom>
              The Smart Forex Travel Companion
            </Typography>
            <Typography variant="subtitle1" color="text.secondary" gutterBottom>
              Find destinations with favorable exchange rates for your travel budget
            </Typography>

            <Tabs
              value={activeTab}
              onChange={handleTabChange}
              centered
              sx={{ mb: 3 }}
            >
              <Tab 
                icon={<FlightIcon />} 
                label="Forex Recommendations" 
                id="tab-0"
                aria-controls="tabpanel-0"
              />
              <Tab 
                label="My Favorites" 
                id="tab-1"
                aria-controls="tabpanel-1"
                disabled={favorites.length === 0}
              />
              {user && (
                <Tab 
                  label="History" 
                  id="tab-2"
                  aria-controls="tabpanel-2"
                />
              )}
            </Tabs>

            <Grid container spacing={2}>
              <Grid item xs={12} md={3}>
                <Sidebar
                  departureAirport={departureAirport}
                  setDepartureAirport={setDepartureAirport}
                  getRecommendations={getRecommendations}
                />
              </Grid>
              <Grid item xs={12} md={9}>
                {error && (
                  <Alert severity="error" sx={{ mb: 2 }}>
                    {error}
                  </Alert>
                )}

                {loading ? (
                  <LoadingSpinner />
                ) : (
                  <>
                    <Box role="tabpanel" hidden={activeTab !== 0} id="tabpanel-0">
                      {activeTab === 0 && (
                        <>
                          <StatsCards recommendations={recommendations} />
                          <RecommendationsList
                            recommendations={recommendations}
                            toggleFavorite={toggleFavorite}
                            isFavorite={isFavorite}
                          />
                          {!recommendations.length && !loading && !error && (
                            <Box sx={{ textAlign: "center", py: 4 }}>
                              <Typography variant="body1" color="text.secondary">
                                Click "Get Recommendations" to search for destinations with favorable exchange rates.
                              </Typography>
                            </Box>
                          )}
                        </>
                      )}
                    </Box>

                    <Box role="tabpanel" hidden={activeTab !== 1} id="tabpanel-1">
                      {activeTab === 1 && (
                        <>
                          <Typography variant="h6" gutterBottom>
                            My Favorite Destinations <Chip label={favorites.length} color="primary" size="small" />
                          </Typography>
                          <RecommendationsList
                            recommendations={favorites}
                            toggleFavorite={toggleFavorite}
                            isFavorite={isFavorite}
                          />
                        </>
                      )}
                    </Box>

                    <Box role="tabpanel" hidden={activeTab !== 2} id="tabpanel-2">
                      {activeTab === 2 && user && (
                        <>
                          <Typography variant="h6" gutterBottom>
                            Recent Searches
                          </Typography>
                          {pastRecommendationsLoading ? (
                            <LoadingSpinner />
                          ) : pastRecommendations.length ? (
                            <RecommendationsList
                              recommendations={pastRecommendations}
                              toggleFavorite={toggleFavorite}
                              isFavorite={isFavorite}
                              showDate={true}
                            />
                          ) : (
                            <Typography variant="body1" color="text.secondary" sx={{ py: 2 }}>
                              No search history found. Your recent searches will appear here.
                            </Typography>
                          )}
                        </>
                      )}
                    </Box>
                  </>
                )}
              </Grid>
            </Grid>
          </Box>
        </Container>

        <Box
          component="footer"
          sx={{
            py: 3,
            px: 2,
            mt: "auto",
            backgroundColor: (theme) => theme.palette.grey[100],
          }}
        >
          <Container maxWidth="sm">
            <Typography variant="body2" color="text.secondary" align="center">
              © 2025 ChasquiFX. Find the best destinations for your currency.
            </Typography>
            <Typography variant="body2" color="text.secondary" align="center">
              {apiStatus ? "API Connected" : "API Disconnected"}
            </Typography>
          </Container>
        </Box>
      </Box>

      <ApiKeysManager
        open={openApiKeysManager}
        onClose={handleCloseApiKeysManager}
        userId={user?.id}
      />

      <Snackbar
        open={notification.open}
        autoHideDuration={6000}
        onClose={handleCloseNotification}
      >
        <Alert
          onClose={handleCloseNotification}
          severity={notification.severity || "info"}
          sx={{ width: "100%" }}
        >
          {notification.message}
        </Alert>
      </Snackbar>
    </ThemeProvider>
  );
}

export default App;
EOL

echo -e "${GREEN}✓ Created Vite-compatible App.jsx${NC}"

# Update environment variable references in App.jsx
echo -e "${YELLOW}Updating environment variable references...${NC}"
sed -i 's/process\.env\.REACT_APP_/import.meta.env.VITE_/g' frontend/src/App.jsx
echo -e "${GREEN}✓ Updated environment variable references${NC}"

# Create a vite config file
echo -e "${YELLOW}Creating vite.config.js...${NC}"
cat >frontend/vite.config.js <<'EOL'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    open: true,
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
  resolve: {
    alias: {
      // Add any path aliases here if needed
    },
  }
})
EOL

echo -e "${GREEN}✓ Created vite.config.js${NC}"

echo -e "${GREEN}✓ App.jsx adaptation complete!${NC}"
echo -e "${YELLOW}Next steps:${NC}"
echo -e "1. Review App.jsx for any component import paths that might need updating"
echo -e "2. Update any SVG imports to use the ?react suffix for direct component imports"
echo -e "3. Test the application to ensure all components render correctly"

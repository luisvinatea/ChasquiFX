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
import Auth from "./components/Auth";
import { apiService } from "./services/apiService";
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
        const status = await apiService.getStatus();
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

  // Handle form submission from sidebar
  const handleFormSubmit = async (formData) => {
    try {
      setLoading(true);
      setError(null);
      setRecommendations([]);

      // Add user ID to request if user is logged in
      if (user) {
        formData.userId = user.id;
      }

      const response = await apiService.getRecommendations(formData);

      if (response && response.recommendations) {
        setRecommendations(response.recommendations);

        // If user is logged in, refresh past recommendations
        if (user) {
          loadPastRecommendations(user.id);
        }
      } else {
        throw new Error("Invalid response format");
      }
    } catch (error) {
      console.error("API Error:", error);
      setError(
        `Failed to fetch recommendations: ${error.message || "Unknown error"}`
      );
    } finally {
      setLoading(false);
    }
  };

  // Handle adding/removing favorites
  const toggleFavorite = (rec) => {
    if (favorites.some((fav) => fav.id === rec.id)) {
      setFavorites(favorites.filter((fav) => fav.id !== rec.id));
    } else {
      setFavorites([...favorites, rec]);
    }
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {/* App Bar */}
      <AppBar position="static" elevation={0}>
        <Toolbar>
          <FlightIcon sx={{ mr: 2 }} />
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            ChasquiFX
          </Typography>
          <Chip
            label={apiStatus ? "API Online" : "API Offline"}
            color={apiStatus ? "success" : "error"}
            size="small"
            sx={{ mr: 2 }}
          />
          <Button
            startIcon={<ApiIcon />}
            onClick={handleOpenApiKeysManager}
            color="inherit"
            sx={{ mr: 2 }}
          >
            API Keys
          </Button>

          {user ? (
            <>
              <Button
                color="inherit"
                onClick={handleUserMenuOpen}
                startIcon={<AccountCircleIcon />}
              >
                {user.email.split("@")[0]}
              </Button>
              <Menu
                anchorEl={userMenuAnchor}
                open={Boolean(userMenuAnchor)}
                onClose={handleUserMenuClose}
              >
                <MenuItem onClick={handleOpenApiKeysManager}>
                  <ApiIcon fontSize="small" sx={{ mr: 1 }} />
                  API Keys
                </MenuItem>
                <MenuItem onClick={handleLogout}>
                  <LogoutIcon fontSize="small" sx={{ mr: 1 }} />
                  Logout
                </MenuItem>
              </Menu>
            </>
          ) : (
            <Button color="inherit" onClick={() => setActiveTab(2)}>
              Login / Sign Up
            </Button>
          )}
        </Toolbar>
      </AppBar>

      <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          centered
          sx={{ mb: 3 }}
        >
          <Tab label="Recommendations" />
          <Tab label="Favorites" />
          {!user && <Tab label="Login / Sign Up" />}
          {user && <Tab label="History" />}
        </Tabs>

        {/* Main content */}
        {activeTab === 0 && (
          <Grid container spacing={3}>
            {/* Sidebar */}
            <Grid item xs={12} md={3}>
              <Sidebar
                apiStatus={apiStatus}
                onSearch={handleFormSubmit}
                departureAirport={departureAirport}
                setDepartureAirport={setDepartureAirport}
                refreshData={() => {
                  // This function will be called when the refresh button is clicked
                  apiService
                    .refreshForexData()
                    .then(() => {
                      setNotification({
                        message: "Forex data refreshed successfully",
                        severity: "success",
                      });
                    })
                    .catch((error) => {
                      setNotification({
                        message: `Failed to refresh forex data: ${error.message}`,
                        severity: "error",
                      });
                    });
                }}
              />
            </Grid>

            {/* Main content area */}
            <Grid item xs={12} md={9}>
              {/* Stats cards */}
              {recommendations.length > 0 && (
                <StatsCards data={recommendations} />
              )}

              {/* Loading indicator */}
              {loading && <LoadingSpinner />}

              {/* Error message */}
              {error && !loading && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {error}
                </Alert>
              )}

              {/* Recommendations list */}
              {!loading && !error && (
                <RecommendationsList
                  recommendations={recommendations}
                  favorites={favorites}
                  onToggleFavorite={toggleFavorite}
                />
              )}

              {/* Empty state */}
              {!loading && !error && recommendations.length === 0 && (
                <Box
                  sx={{
                    textAlign: "center",
                    py: 8,
                    backgroundColor: "background.paper",
                    borderRadius: 1,
                  }}
                >
                  <Typography variant="h5" gutterBottom>
                    No Recommendations Yet
                  </Typography>
                  <Typography variant="body1" color="textSecondary">
                    Fill out the form to get personalized forex travel
                    recommendations.
                  </Typography>
                </Box>
              )}
            </Grid>
          </Grid>
        )}

        {/* Favorites tab */}
        {activeTab === 1 && (
          <Box>
            <Typography variant="h5" gutterBottom>
              Your Favorites
            </Typography>
            {favorites.length > 0 ? (
              <RecommendationsList
                recommendations={favorites}
                favorites={favorites}
                onToggleFavorite={toggleFavorite}
              />
            ) : (
              <Box
                sx={{
                  textAlign: "center",
                  py: 8,
                  backgroundColor: "background.paper",
                  borderRadius: 1,
                }}
              >
                <Typography variant="h5" gutterBottom>
                  No Favorites Yet
                </Typography>
                <Typography variant="body1" color="textSecondary">
                  Add recommendations to your favorites to see them here.
                </Typography>
              </Box>
            )}
          </Box>
        )}

        {/* Login/Signup tab (only visible when not logged in) */}
        {!user && activeTab === 2 && <Auth onAuthSuccess={handleAuthSuccess} />}

        {/* History tab (only visible when logged in) */}
        {user && activeTab === (user ? 2 : 3) && (
          <Box>
            <Typography variant="h5" gutterBottom>
              Your Recommendation History
            </Typography>
            {pastRecommendationsLoading ? (
              <LoadingSpinner />
            ) : pastRecommendations.length > 0 ? (
              <Box sx={{ mt: 2 }}>
                {pastRecommendations.map((rec) => (
                  <Box
                    key={rec.id}
                    sx={{
                      mb: 2,
                      p: 2,
                      border: "1px solid #e0e0e0",
                      borderRadius: 1,
                    }}
                  >
                    <Typography variant="h6">
                      {rec.origin_currency} → {rec.destination_currency}
                    </Typography>
                    <Typography>
                      Amount: {rec.amount} {rec.origin_currency}
                    </Typography>
                    <Typography>
                      Recommended Destination: {rec.recommended_destination}
                    </Typography>
                    <Typography>Exchange Rate: {rec.exchange_rate}</Typography>
                    <Typography>Savings: {rec.savings_percentage}%</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {new Date(rec.timestamp).toLocaleString()}
                    </Typography>
                  </Box>
                ))}
              </Box>
            ) : (
              <Box
                sx={{
                  textAlign: "center",
                  py: 8,
                  backgroundColor: "background.paper",
                  borderRadius: 1,
                }}
              >
                <Typography variant="h5" gutterBottom>
                  No History Yet
                </Typography>
                <Typography variant="body1" color="textSecondary">
                  Your recommendation history will appear here after you get
                  recommendations.
                </Typography>
              </Box>
            )}
          </Box>
        )}
      </Container>

      {/* API Keys Manager Modal */}
      <ApiKeysManager
        open={openApiKeysManager}
        onClose={handleCloseApiKeysManager}
        user={user}
      />

      {/* Notification snackbar */}
      <Snackbar
        open={notification.open}
        autoHideDuration={6000}
        onClose={handleCloseNotification}
      >
        <Alert
          onClose={handleCloseNotification}
          severity={notification.severity}
          sx={{ width: "100%" }}
        >
          {notification.message}
        </Alert>
      </Snackbar>
    </ThemeProvider>
  );
}

export default App;

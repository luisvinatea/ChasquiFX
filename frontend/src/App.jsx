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
  Divider,
} from "@mui/material";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import FlightIcon from "@mui/icons-material/Flight";
import ApiIcon from "@mui/icons-material/Api";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";
import LogoutIcon from "@mui/icons-material/Logout";
import "./App.css";
import Sidebar from "./components/Sidebar.jsx";
import RecommendationsList from "./components/RecommendationsList.jsx";
import StatsCards from "./components/StatsCards.jsx";
import LoadingSpinner from "./components/LoadingSpinner.jsx";
import ApiKeysManager from "./components/ApiKeysManager.jsx";
import ApiConnectionStatus from "./components/ApiConnectionStatus.jsx";
import Auth from "./components/Auth.jsx";
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
      main: "#3f51b5", // Indigo
      light: "#757de8",
      dark: "#002984",
      contrastText: "#fff",
    },
    secondary: {
      main: "#f50057", // Pink
      light: "#ff5983",
      dark: "#bb002f",
      contrastText: "#fff",
    },
    background: {
      default: "#f8f9fa",
      paper: "#ffffff",
    },
    success: {
      main: "#4caf50",
    },
    info: {
      main: "#2196f3",
    },
    warning: {
      main: "#ff9800",
    },
    error: {
      main: "#f44336",
    },
  },
  typography: {
    fontFamily: [
      "Inter",
      "-apple-system",
      "BlinkMacSystemFont",
      '"Segoe UI"',
      "Roboto",
      '"Helvetica Neue"',
      "Arial",
      "sans-serif",
    ].join(","),
    h1: {
      fontWeight: 600,
    },
    h2: {
      fontWeight: 600,
    },
    h3: {
      fontWeight: 600,
    },
    h4: {
      fontWeight: 600,
    },
    h5: {
      fontWeight: 600,
    },
    h6: {
      fontWeight: 600,
    },
    button: {
      textTransform: "none", // Avoid all-caps in buttons
      fontWeight: 500,
    },
  },
  shape: {
    borderRadius: 8,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          boxShadow: "none",
          "&:hover": {
            boxShadow: "0px 2px 4px rgba(0, 0, 0, 0.1)",
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          boxShadow: "0px 4px 12px rgba(0, 0, 0, 0.05)",
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          boxShadow: "0px 1px 3px rgba(0, 0, 0, 0.08)",
        },
      },
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
  const [, setPastRecommendationsLoading] = useState(false);

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

  // Get forex recommendations
  const handleSearch = async () => {
    try {
      setLoading(true);
      setError(null);

      // Call API to get recommendations based on departure airport
      const data = await chasquiApi.recommendationsService.getRecommendations(
        departureAirport
      );

      setRecommendations(data);

      // Save to history if logged in
      if (user) {
        await chasquiApi.userService.saveSearch(
          user.id,
          departureAirport,
          data
        );
        loadPastRecommendations(user.id);
      }
    } catch (error) {
      console.error("Search error:", error);
      setError("Failed to fetch recommendations. Please try again.");
      setNotification({
        open: true,
        message: "Search failed. Please check your inputs and try again.",
        severity: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  // Handle refresh data
  const handleRefreshData = async () => {
    if (departureAirport) {
      await handleSearch();
    } else {
      setNotification({
        open: true,
        message: "Please select a departure airport first",
        severity: "warning",
      });
    }
  };

  // Toggle favorite status for a recommendation
  const toggleFavorite = (recommendation) => {
    const exists = favorites.some(
      (fav) => fav.destination === recommendation.destination
    );

    if (exists) {
      // Remove from favorites
      setFavorites(
        favorites.filter(
          (fav) => fav.destination !== recommendation.destination
        )
      );
    } else {
      // Add to favorites
      setFavorites([...favorites, recommendation]);
    }
  };

  // Check if a recommendation is favorited
  const isFavorite = (recommendation) => {
    return favorites.some(
      (fav) => fav.destination === recommendation.destination
    );
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box className="App">
        {/* Hero background with pattern */}
        <Box className="hero-background" />

        {/* App Bar */}
        <AppBar position="sticky" color="primary">
          <Toolbar sx={{ justifyContent: "space-between" }}>
            <Box sx={{ display: "flex", alignItems: "center" }}>
              <FlightIcon sx={{ mr: 1 }} />
              <Typography
                variant="h6"
                component="div"
                sx={{ fontWeight: 600 }}
              >
                ChasquiFX
              </Typography>
              <Chip
                size="small"
                label="Beta"
                color="secondary"
                sx={{ ml: 1, height: 20, fontSize: "0.7rem" }}
              />
            </Box>

            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <ApiConnectionStatus status={apiStatus} />

              <Button
                color="inherit"
                startIcon={<ApiIcon />}
                onClick={handleOpenApiKeysManager}
                size="small"
                sx={{
                  borderRadius: "20px",
                  px: 2,
                  background: "rgba(255,255,255,0.1)",
                  "&:hover": {
                    background: "rgba(255,255,255,0.2)",
                  },
                }}
              >
                API Keys
              </Button>

              {user ? (
                <>
                  <Button
                    color="inherit"
                    startIcon={<AccountCircleIcon />}
                    onClick={handleUserMenuOpen}
                    sx={{
                      borderRadius: "20px",
                      px: 2,
                      background: "rgba(255,255,255,0.1)",
                      "&:hover": {
                        background: "rgba(255,255,255,0.2)",
                      },
                    }}
                  >
                    {user.email?.split("@")[0] || "User"}
                  </Button>
                  <Menu
                    anchorEl={userMenuAnchor}
                    open={Boolean(userMenuAnchor)}
                    onClose={handleUserMenuClose}
                    anchorOrigin={{
                      vertical: "bottom",
                      horizontal: "right",
                    }}
                    transformOrigin={{
                      vertical: "top",
                      horizontal: "right",
                    }}
                  >
                    <MenuItem onClick={handleLogout}>
                      <LogoutIcon fontSize="small" sx={{ mr: 1 }} />
                      Logout
                    </MenuItem>
                  </Menu>
                </>
              ) : (
                <Auth onAuthSuccess={handleAuthSuccess} />
              )}
            </Box>
          </Toolbar>
        </AppBar>

        {/* Main Content */}
        <Container
          maxWidth="lg"
          sx={{ mt: 4, mb: 4, position: "relative", zIndex: 1 }}
        >
          <Box sx={{ py: 2 }}>
            {/* Tabs for switching between Search and History */}
            <Tabs
              value={activeTab}
              onChange={(e, newValue) => setActiveTab(newValue)}
              variant="fullWidth"
              sx={{
                mb: 3,
                "& .MuiTab-root": {
                  fontWeight: 500,
                  py: 1.5,
                },
                "& .MuiTabs-indicator": {
                  height: 3,
                  borderRadius: "3px 3px 0 0",
                },
              }}
            >
              <Tab label="Search Destinations" />
              {user && <Tab label="Your History" />}
            </Tabs>

            <Grid container spacing={3}>
              {/* Sidebar */}
              <Grid item xs={12} md={3}>
                <Sidebar
                  apiStatus={apiStatus}
                  departureAirport={departureAirport}
                  setDepartureAirport={setDepartureAirport}
                  onSearch={handleSearch}
                  refreshData={handleRefreshData}
                />
              </Grid>

              {/* Main Content Area */}
              <Grid item xs={12} md={9}>
                <Box
                  sx={{
                    backgroundColor: "background.paper",
                    borderRadius: 2,
                    boxShadow: 1,
                    p: 3,
                    minHeight: 400,
                    overflow: "hidden",
                  }}
                >
                  {activeTab === 0 ? (
                    <>
                      {/* Stats Cards */}
                      <StatsCards recommendations={recommendations} />

                      {/* Loading State */}
                      {loading && <LoadingSpinner />}

                      {/* Error State */}
                      {error && !loading && (
                        <Alert severity="error" sx={{ my: 2 }}>
                          {error}
                        </Alert>
                      )}

                      {/* Recommendations List */}
                      {!loading && !error && (
                        <Box className="staggered-fade-in">
                          <RecommendationsList
                            recommendations={recommendations}
                            loading={loading}
                            favorites={favorites}
                            toggleFavorite={toggleFavorite}
                            isFavorite={isFavorite}
                          />
                        </Box>
                      )}
                    </>
                  ) : (
                    <>
                      {/* History Tab Content */}
                      {!user ? (
                        <Box
                          sx={{
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            justifyContent: "center",
                            height: 300,
                            textAlign: "center",
                            gap: 2,
                          }}
                        >
                          <Typography variant="h6" color="text.secondary">
                            Please log in to view your search history
                          </Typography>
                          <Auth onAuthSuccess={handleAuthSuccess} />
                        </Box>
                      ) : (
                        <>
                          <Typography variant="h6" gutterBottom>
                            Your Search History
                          </Typography>
                          <Divider sx={{ mb: 2 }} />

                          <RecommendationsList
                            recommendations={pastRecommendations}
                            toggleFavorite={toggleFavorite}
                            isFavorite={isFavorite}
                            showDate={true}
                          />
                        </>
                      )}
                    </>
                  )}
                </Box>
              </Grid>
            </Grid>
          </Box>
        </Container>

        {/* Footer */}
        <Box
          component="footer"
          sx={{
            py: 3,
            px: 2,
            mt: "auto",
            backgroundColor: "rgba(255, 255, 255, 0.9)",
            borderTop: "1px solid rgba(0, 0, 0, 0.05)",
            position: "relative",
            zIndex: 1,
          }}
        >
          <Container maxWidth="lg">
            <Grid
              container
              spacing={2}
              justifyContent="space-between"
              alignItems="center"
            >
              <Grid item xs={12} md={6}>
                <Typography variant="body2" color="text.secondary">
                  © 2025 ChasquiFX. Find the best destinations for your
                  currency.
                </Typography>
              </Grid>
              <Grid
                item
                xs={12}
                md={6}
                sx={{ textAlign: { xs: "left", md: "right" } }}
              >
                <Typography variant="body2" color="text.secondary">
                  API Status:{" "}
                  {apiStatus ? (
                    <Chip
                      size="small"
                      label="Connected"
                      color="success"
                      sx={{ ml: 1 }}
                    />
                  ) : (
                    <Chip
                      size="small"
                      label="Disconnected"
                      color="error"
                      sx={{ ml: 1 }}
                    />
                  )}
                </Typography>
              </Grid>
            </Grid>
          </Container>
        </Box>
      </Box>

      {/* The rest of the modals and notifications */}
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
          sx={{ width: "100%", boxShadow: 3 }}
        >
          {notification.message}
        </Alert>
      </Snackbar>
    </ThemeProvider>
  );
}

export default App;

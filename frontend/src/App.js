import React, { useState, useEffect } from "react";
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
} from "@mui/material";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import FlightIcon from "@mui/icons-material/Flight";
import ApiIcon from "@mui/icons-material/Api";
import "./App.css";
import Sidebar from "./components/Sidebar";
import RecommendationsList from "./components/RecommendationsList";
import StatsCards from "./components/StatsCards";
import LoadingSpinner from "./components/LoadingSpinner";
import ApiKeysManager from "./components/ApiKeysManager";
import { apiService } from "./services/apiService";

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
  const [currentTab, setCurrentTab] = useState(0);
  const [apiKeysDialogOpen, setApiKeysDialogOpen] = useState(false);

  // Check API status on component mount
  useEffect(() => {
    checkApiStatus();
    // Load favorites from localStorage
    const savedFavorites = localStorage.getItem("chasquiFxFavorites");
    if (savedFavorites) {
      setFavorites(JSON.parse(savedFavorites));
    }
  }, []);

  // Check if the API is running
  const checkApiStatus = async () => {
    try {
      const status = await apiService.checkApiStatus();
      setApiStatus(status);
    } catch (error) {
      setApiStatus(false);
      console.error("Error checking API status:", error);
    }
  };

  // Handle search submissions
  const handleSearch = async (searchParams) => {
    setLoading(true);
    setError(null);

    try {
      const params = {
        departure_airport: searchParams.departureAirport,
        limit: searchParams.maxResults,
        include_fares: searchParams.includeFares.toString(),
        base_currency: "USD",
        outbound_date: searchParams.outboundDate,
        return_date: searchParams.returnDate,
        min_trend: -1.0, // Include all trends
      };

      const data = await apiService.getRecommendations(params);

      if (data && data.recommendations) {
        setRecommendations(data.recommendations);
        setNotification({
          open: true,
          message: `Found ${data.recommendations.length} destinations with favorable exchange rates!`,
          severity: "success",
        });
      } else {
        setRecommendations([]);
        setError("No recommendations found for the selected parameters");
      }
    } catch (error) {
      setError(`Error fetching recommendations: ${error.message}`);
      setNotification({
        open: true,
        message: `Error: ${error.message}`,
        severity: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  // Toggle favorite destination
  const toggleFavorite = (destination) => {
    let newFavorites;

    if (favorites.includes(destination)) {
      newFavorites = favorites.filter((fav) => fav !== destination);
      setNotification({
        open: true,
        message: `Removed ${destination} from favorites`,
        severity: "info",
      });
    } else {
      newFavorites = [...favorites, destination];
      setNotification({
        open: true,
        message: `Added ${destination} to favorites`,
        severity: "success",
      });
    }

    setFavorites(newFavorites);
    localStorage.setItem("chasquiFxFavorites", JSON.stringify(newFavorites));
  };

  // Handle tab change
  const handleTabChange = (event, newValue) => {
    setCurrentTab(newValue);
  };

  // Handle refresh data
  const handleRefreshData = async () => {
    await checkApiStatus();
    setNotification({
      open: true,
      message: "Data refreshed",
      severity: "info",
    });
  };

  // Close notification
  const handleCloseNotification = () => {
    setNotification({ ...notification, open: false });
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AppBar position="static">
        <Toolbar>
          <FlightIcon sx={{ mr: 1 }} />
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            ChasquiFX Explorer
          </Typography>
          <Button
            color="inherit"
            startIcon={<ApiIcon />}
            onClick={() => setApiKeysDialogOpen(true)}
          >
            API Keys
          </Button>
        </Toolbar>
      </AppBar>

      <Box
        sx={{
          p: 3,
          minHeight: "calc(100vh - 64px)",
          backgroundImage: "linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)",
        }}
      >
        <Container maxWidth="xl">
          <Typography variant="h4" component="h1" gutterBottom>
            ChasquiFX Explorer
          </Typography>
          <Typography variant="subtitle1" color="text.secondary" gutterBottom>
            Find destinations with favorable exchange rates from your departure
            airport
          </Typography>

          <Grid container spacing={3} sx={{ mt: 1 }}>
            <Grid item xs={12} md={3}>
              <Sidebar
                apiStatus={apiStatus}
                departureAirport={departureAirport}
                setDepartureAirport={setDepartureAirport}
                onSearch={handleSearch}
                refreshData={handleRefreshData}
              />
            </Grid>

            <Grid item xs={12} md={9}>
              <Box sx={{ width: "100%", bgcolor: "background.paper", mb: 2 }}>
                <Tabs
                  value={currentTab}
                  onChange={handleTabChange}
                  variant="fullWidth"
                >
                  <Tab label="Recommendations" />
                  <Tab label="Favorites" />
                  <Tab label="Trends" />
                </Tabs>
              </Box>

              {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {error}
                </Alert>
              )}

              {currentTab === 0 && (
                <>
                  {loading ? (
                    <LoadingSpinner message="Finding destinations with favorable exchange rates..." />
                  ) : (
                    <>
                      {recommendations.length > 0 && (
                        <StatsCards recommendations={recommendations} />
                      )}
                      <RecommendationsList
                        recommendations={recommendations}
                        loading={false}
                        favorites={favorites}
                        toggleFavorite={toggleFavorite}
                      />
                    </>
                  )}
                </>
              )}

              {currentTab === 1 && (
                <>
                  {loading ? (
                    <LoadingSpinner message="Loading favorites..." />
                  ) : (
                    <RecommendationsList
                      recommendations={recommendations.filter((rec) =>
                        favorites.includes(rec.city)
                      )}
                      loading={false}
                      favorites={favorites}
                      toggleFavorite={toggleFavorite}
                    />
                  )}
                </>
              )}

              {currentTab === 2 && (
                <Box p={3} bgcolor="background.paper">
                  <Typography variant="h6">
                    Coming Soon: Currency Trend Analysis
                  </Typography>
                  <Typography variant="body1">
                    This feature will allow you to visualize currency trend data
                    over time.
                  </Typography>
                </Box>
              )}
            </Grid>
          </Grid>
        </Container>
      </Box>

      <Snackbar
        open={notification.open}
        autoHideDuration={6000}
        onClose={handleCloseNotification}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={handleCloseNotification}
          severity={notification.severity}
          sx={{ width: "100%" }}
        >
          {notification.message}
        </Alert>
      </Snackbar>

      {/* API Keys Manager Dialog */}
      <ApiKeysManager
        open={apiKeysDialogOpen}
        onClose={() => setApiKeysDialogOpen(false)}
      />
    </ThemeProvider>
  );
}

export default App;

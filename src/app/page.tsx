"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import {
  AppBar,
  Toolbar,
  Typography,
  Container,
  Box,
  Button,
  Card,
  CardContent,
  IconButton,
  Menu,
  MenuItem,
  TextField,
  InputAdornment,
  Chip,
  Avatar,
  Dialog,
  DialogTitle,
  DialogContent,
  Divider,
  Stack,
  Tabs,
  Tab,
  Alert,
  Snackbar,
} from "@mui/material";
import Grid from "@mui/material/Grid";
import FlightIcon from "@mui/icons-material/Flight";
import ApiIcon from "@mui/icons-material/Api";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";
import LogoutIcon from "@mui/icons-material/Logout";

import MuiThemeProvider from "../components/MuiThemeProvider";
import Sidebar from "../components/Sidebar";
import { RecommendationsList } from "../components";
import StatsCards from "../components/StatsCards";
import LoadingSpinner from "../components/LoadingSpinner";
import ApiKeysManager from "../components/ApiKeysManager";
import ApiConnectionStatus from "../components/ApiConnectionStatus";
import ProfileDialog from "../components/ProfileDialog";
import Auth from "../components/Auth";
import chasquiApi from "../services/chasquiApi";
// DEPRECATED: Using compatibility layer for transition from Supabase to MongoDB
import {
  getSession,
  signOutUser,
  getUserRecommendations,
} from "../services/supabaseClient";

interface Recommendation {
  id: string;
  destination: string;
  origin?: string;
  exchange_rate?: number;
  exchange_rate_trend?: number;
  cost_index?: number;
  savings?: number;
  tags?: string[];
  date?: string;
  [key: string]: any; // Allow other properties
}

interface User {
  id: string;
  email: string;
  status?: boolean;
  // Add other properties as needed
}

export default function Home() {
  // State management
  const [apiStatus, setApiStatus] = useState(false);
  const [departureAirport, setDepartureAirport] = useState("JFK");
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [favorites, setFavorites] = useState<Recommendation[]>([]);
  const [notification, setNotification] = useState({
    open: false,
    message: "",
    severity: "info" as "info" | "success" | "warning" | "error",
  });
  const [openApiKeysManager, setOpenApiKeysManager] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [user, setUser] = useState<User | null>(null);
  const [userMenuAnchor, setUserMenuAnchor] = useState<null | HTMLElement>(
    null
  );
  const [pastRecommendations, setPastRecommendations] = useState<
    Recommendation[]
  >([]);
  const [, setPastRecommendationsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string>("");
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);

  // Check user session on mount
  useEffect(() => {
    const checkSession = async () => {
      try {
        const sessionData = (await getSession()) as {
          data: { session: { user: User } | null };
          error: null;
        };
        if (sessionData.data.session) {
          setUser(sessionData.data.session.user);
          loadPastRecommendations(sessionData.data.session.user.id);
        }
      } catch (error) {
        console.error("Session check error:", error);
      }
    };

    checkSession();
  }, []);

  // Load user's past recommendations
  const loadPastRecommendations = async (userId: string) => {
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
  const handleUserMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
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
  const handleAuthSuccess = (user: any) => {
    setUser(user);
    if (user) {
      loadPastRecommendations(user.id);
    }
  };

  // Check API status on component mount
  useEffect(() => {
    const checkApiStatus = async () => {
      try {
        const statusResponse =
          (await chasquiApi.systemService.getStatus()) as { status: string };
        setApiStatus(statusResponse.status === "ok");

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

  // Get forex recommendations
  const handleSearch = async () => {
    try {
      setLoading(true);
      setError(null);

      // Call API to get recommendations based on departure airport
      // Use type assertion to bypass TypeScript checking for this call
      const api = chasquiApi.recommendationService as any;
      const result = await api.getRecommendations(departureAirport);

      // Ensure result is properly typed as Recommendation[]
      const data = Array.isArray(result)
        ? (result as Recommendation[])
        : ([] as Recommendation[]);

      setRecommendations(data);

      // Save to history if logged in
      if (user) {
        // This is a mock implementation since userService might not actually exist
        try {
          // Try original API first
          const userApi = (chasquiApi as any).userService;
          if (userApi && typeof userApi.saveSearch === "function") {
            await userApi.saveSearch(user.id, departureAirport, data);
          } else {
            // Log this for debugging purposes
            console.log(
              "User service not available, saving search using alternate method"
            );
            // Could implement an alternative method here if needed
          }
        } catch (e) {
          console.error("Error saving user search:", e);
        }
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
  const toggleFavorite = (recommendation: Recommendation) => {
    const exists = favorites.some(
      (fav: Recommendation) => fav.destination === recommendation.destination
    );

    if (exists) {
      // Remove from favorites
      setFavorites(
        favorites.filter(
          (fav: Recommendation) =>
            fav.destination !== recommendation.destination
        )
      );
    } else {
      // Add to favorites
      setFavorites([...favorites, recommendation]);
    }
  };

  // Check if a recommendation is favorited
  const isFavorite = (recommendation: Recommendation) => {
    return favorites.some(
      (fav: Recommendation) => fav.destination === recommendation.destination
    );
  };

  const fetchRecommendations = async () => {
    try {
      const response = await fetch("/api/recommendations");
      const data = await response.json();
      setRecommendations(data.recommendations || []);
    } catch (error) {
      console.error("Error fetching recommendations:", error);
      setError("Failed to fetch recommendations. Please try again.");
    }
  };

  return (
    <MuiThemeProvider>
      <Box className="app-container">
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
              <ApiConnectionStatus initialStatus={apiStatus} />

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
            </Tabs>{" "}
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 3 }}>
              {/* Sidebar */}
              <Box
                sx={{ flexBasis: { xs: "100%", md: "25%" }, flexShrink: 0 }}
              >
                <Sidebar
                  apiStatus={apiStatus}
                  departureAirport={departureAirport}
                  setDepartureAirport={setDepartureAirport}
                  onSearch={handleSearch}
                  refreshData={handleRefreshData}
                />
              </Box>

              {/* Main Content Area */}
              <Box sx={{ flexBasis: { xs: "100%", md: "70%" }, flexGrow: 1 }}>
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
                            favorites={favorites}
                            toggleFavorite={toggleFavorite}
                            isFavorite={isFavorite}
                            showDate={true}
                          />
                        </>
                      )}
                    </>
                  )}
                </Box>
              </Box>
            </Box>
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
            <Box
              sx={{
                display: "flex",
                flexWrap: "wrap",
                gap: 2,
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <Box sx={{ flexBasis: { xs: "100%", md: "48%" } }}>
                <Typography variant="body2" color="text.secondary">
                  © 2025 ChasquiFX. Find the best destinations for your
                  currency.
                </Typography>
              </Box>
              <Box
                sx={{
                  flexBasis: { xs: "100%", md: "48%" },
                  textAlign: { xs: "left", md: "right" },
                }}
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
              </Box>
            </Box>
          </Container>
        </Box>
      </Box>

      {/* The rest of the modals and notifications */}
      <ApiKeysManager
        open={openApiKeysManager}
        onClose={handleCloseApiKeysManager}
        user={user}
      />

      <Snackbar
        open={notification.open}
        autoHideDuration={6000}
        onClose={handleCloseNotification}
      >
        <Alert
          onClose={handleCloseNotification}
          severity={notification.severity}
          sx={{ width: "100%", boxShadow: 3 }}
        >
          {notification.message}
        </Alert>
      </Snackbar>

      <ProfileDialog
        open={profileDialogOpen}
        onClose={() => setProfileDialogOpen(false)}
        user={user}
      />

      <Snackbar
        open={!!successMessage}
        autoHideDuration={6000}
        onClose={() => setSuccessMessage("")}
      >
        <Alert
          onClose={() => setSuccessMessage("")}
          severity="success"
          sx={{ width: "100%" }}
        >
          {successMessage}
        </Alert>
      </Snackbar>

      <Snackbar
        open={!!error}
        autoHideDuration={6000}
        onClose={() => setError("")}
      >
        <Alert
          onClose={() => setError("")}
          severity="error"
          sx={{ width: "100%" }}
        >
          {error}
        </Alert>
      </Snackbar>
    </MuiThemeProvider>
  );
}

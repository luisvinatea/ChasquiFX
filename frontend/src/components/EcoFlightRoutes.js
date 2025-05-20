/**
 * EcoFlightRoutes Component
 *
 * Displays eco-friendly flight routes from a selected departure airport
 */

import React, { useState, useEffect } from "react";
import ApiService from "../services/apiService";
import LoadingSpinner from "./LoadingSpinner";
import {
  Card,
  CardContent,
  Typography,
  Button,
  Box,
  Grid,
  Chip,
  Divider,
  List,
  ListItem,
  Alert,
} from "@mui/material";
import AirplanemodeActiveIcon from "@mui/icons-material/AirplanemodeActive";
import NaturePeopleIcon from "@mui/icons-material/NaturePeople";
import TrendingDownIcon from "@mui/icons-material/TrendingDown";

const EcoFlightRoutes = ({ departureAirport, onSelectRoute }) => {
  const [loading, setLoading] = useState(false);
  const [routes, setRoutes] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (departureAirport) {
      loadEcoRoutes(departureAirport);
    }
  }, [departureAirport]);

  const loadEcoRoutes = async (airport) => {
    setLoading(true);
    setError(null);

    try {
      const apiService = new ApiService();
      const response = await apiService.getEcoFriendlyRoutes(airport);

      if (response.success && response.routes) {
        setRoutes(response.routes);
      } else {
        setError("Could not fetch eco-friendly routes");
      }
    } catch (err) {
      console.error("Error fetching eco-friendly routes:", err);
      setError(err.message || "Error loading eco-friendly routes");
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    if (departureAirport) {
      loadEcoRoutes(departureAirport);
    }
  };

  if (!departureAirport) {
    return (
      <Card elevation={3}>
        <CardContent>
          <Typography variant="h6" align="center">
            Select a departure airport to see eco-friendly routes
          </Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card elevation={3}>
      <CardContent>
        <Box
          display="flex"
          justifyContent="space-between"
          alignItems="center"
          mb={2}
        >
          <Typography
            variant="h6"
            component="h2"
            display="flex"
            alignItems="center"
          >
            <NaturePeopleIcon color="success" sx={{ mr: 1 }} />
            Eco-Friendly Routes from {departureAirport}
          </Typography>
          <Button
            variant="outlined"
            size="small"
            color="primary"
            onClick={handleRefresh}
            disabled={loading}
          >
            Refresh
          </Button>
        </Box>

        {loading ? (
          <Box display="flex" justifyContent="center" p={3}>
            <LoadingSpinner />
          </Box>
        ) : error ? (
          <Alert severity="error">{error}</Alert>
        ) : routes.length === 0 ? (
          <Typography variant="body2" color="textSecondary" align="center">
            No eco-friendly routes found
          </Typography>
        ) : (
          <>
            <Typography variant="body2" color="textSecondary" mb={2}>
              Showing the most eco-friendly routes based on emissions per
              kilometer
            </Typography>
            <List disablePadding>
              {routes.map((route, index) => (
                <React.Fragment
                  key={`${route.departureAirport}-${route.arrivalAirport}`}
                >
                  {index > 0 && <Divider component="li" />}
                  <ListItem
                    button
                    onClick={() => onSelectRoute && onSelectRoute(route)}
                    alignItems="flex-start"
                  >
                    <Grid container spacing={1}>
                      <Grid item xs={12} sm={6} md={4}>
                        <Box display="flex" alignItems="center">
                          <AirplanemodeActiveIcon
                            color="primary"
                            sx={{ mr: 1, transform: "rotate(45deg)" }}
                          />
                          <Typography variant="body1" fontWeight="bold">
                            {route.departureAirport} → {route.arrivalAirport}
                          </Typography>
                        </Box>
                      </Grid>
                      <Grid item xs={6} sm={3} md={2}>
                        <Typography variant="body2" color="textSecondary">
                          Distance:
                        </Typography>
                        <Typography variant="body1">
                          {route.distance} {route.distanceUnit || "km"}
                        </Typography>
                      </Grid>
                      <Grid item xs={6} sm={3} md={2}>
                        <Typography variant="body2" color="textSecondary">
                          Emissions:
                        </Typography>
                        <Typography variant="body1">
                          {Math.round(route.emissions)}{" "}
                          {route.emissionsUnit || "kg CO₂"}
                        </Typography>
                      </Grid>
                      <Grid item xs={12} md={4}>
                        <Box display="flex" alignItems="center">
                          <TrendingDownIcon color="success" sx={{ mr: 0.5 }} />
                          <Chip
                            label={`${
                              route.emissionsPerKm?.toFixed(3) ||
                              (route.emissions / route.distance).toFixed(3)
                            } kg CO₂/km`}
                            size="small"
                            color="success"
                            variant="outlined"
                          />
                        </Box>
                      </Grid>
                    </Grid>
                  </ListItem>
                </React.Fragment>
              ))}
            </List>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default EcoFlightRoutes;

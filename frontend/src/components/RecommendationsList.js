import React, { useState } from "react";
import {
  Card,
  CardContent,
  CardActions,
  Typography,
  Button,
  Grid,
  Box,
  Chip,
  Divider,
  Paper,
  CircularProgress,
  IconButton,
  Tooltip,
} from "@mui/material";
import FavoriteIcon from "@mui/icons-material/Favorite";
import FavoriteBorderIcon from "@mui/icons-material/FavoriteBorder";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import TrendingDownIcon from "@mui/icons-material/TrendingDown";
import TrendingFlatIcon from "@mui/icons-material/TrendingFlat";
import FlightIcon from "@mui/icons-material/Flight";
import PublicIcon from "@mui/icons-material/Public";
import DetailView from "./DetailView";

const RecommendationsList = ({
  recommendations,
  loading,
  favorites,
  toggleFavorite,
}) => {
  // State for selected destination details
  const [selectedDestination, setSelectedDestination] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  // Handle opening destination details
  const handleViewDetails = (destination) => {
    setSelectedDestination(destination);
    setDetailsOpen(true);
  };

  // Handle closing destination details
  const handleCloseDetails = () => {
    setDetailsOpen(false);
  };

  // Helper function to render the trend icon
  const renderTrendIcon = (trend) => {
    if (trend > 0.05) {
      return <TrendingUpIcon sx={{ color: "green" }} />;
    } else if (trend < -0.05) {
      return <TrendingDownIcon sx={{ color: "red" }} />;
    } else {
      return <TrendingFlatIcon sx={{ color: "grey" }} />;
    }
  };

  // Function to format currency
  const formatCurrency = (amount, currency = "USD") => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Helper function to calculate savings or better rate
  const calculateBenefit = (rec) => {
    if (rec.savings) {
      return `Save ${formatCurrency(rec.savings)}`;
    } else if (rec.exchange_rate_trend > 0.05) {
      return `Better rate: ${(rec.exchange_rate_trend * 100).toFixed(1)}%`;
    } else {
      return "Trending destination";
    }
  };

  if (loading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="400px"
      >
        <CircularProgress />
      </Box>
    );
  }

  if (!recommendations || recommendations.length === 0) {
    return (
      <Paper
        elevation={2}
        sx={{
          p: 3,
          textAlign: "center",
          backgroundColor: "rgba(255,255,255,0.8)",
        }}
      >
        <Typography variant="h6" color="textSecondary">
          No recommendations found
        </Typography>
        <Typography variant="body2" color="textSecondary">
          Try different search parameters or another departure airport
        </Typography>
      </Paper>
    );
  }

  return (
    <>
      <Grid container spacing={3}>
        {recommendations.map((rec, index) => (
          <Grid
            sx={{ gridColumn: { xs: "span 12", sm: "span 6", md: "span 4" } }}
            key={index}
          >
            <Card
              elevation={3}
              sx={{
                height: "100%",
                display: "flex",
                flexDirection: "column",
                position: "relative",
                transition: "transform 0.2s",
                "&:hover": {
                  transform: "translateY(-5px)",
                },
              }}
            >
              {/* Favorite button */}
              <IconButton
                size="small"
                color={favorites.includes(rec.city) ? "error" : "default"}
                sx={{ position: "absolute", top: 8, right: 8 }}
                onClick={() => toggleFavorite(rec.city)}
              >
                {favorites.includes(rec.city) ? (
                  <FavoriteIcon />
                ) : (
                  <FavoriteBorderIcon />
                )}
              </IconButton>

              <CardContent sx={{ flexGrow: 1 }}>
                <Box
                  display="flex"
                  justifyContent="space-between"
                  alignItems="center"
                  mb={1}
                >
                  <Typography variant="h6" component="h2">
                    {rec.city}
                  </Typography>
                  <Chip
                    size="small"
                    label={rec.country}
                    variant="outlined"
                    icon={<PublicIcon fontSize="small" />}
                  />
                </Box>

                <Box display="flex" alignItems="center" mb={2}>
                  <Chip
                    size="small"
                    icon={<FlightIcon fontSize="small" />}
                    label={rec.airport_code}
                    color="primary"
                    variant="outlined"
                    sx={{ mr: 1 }}
                  />
                  {rec.distance && (
                    <Typography variant="body2" color="textSecondary">
                      {rec.distance.toLocaleString()} km
                    </Typography>
                  )}
                </Box>

                <Divider sx={{ mb: 2 }} />

                <Box mb={2}>
                  <Typography
                    variant="body2"
                    color="textSecondary"
                    gutterBottom
                  >
                    Exchange Rate
                  </Typography>
                  <Box display="flex" alignItems="center">
                    <Typography variant="h6" component="span">
                      1 USD = {rec.exchange_rate.toFixed(2)} {rec.currency}
                    </Typography>
                    <Tooltip
                      title={`${(rec.exchange_rate_trend * 100).toFixed(
                        1
                      )}% change`}
                    >
                      <Box component="span" ml={1}>
                        {renderTrendIcon(rec.exchange_rate_trend)}
                      </Box>
                    </Tooltip>
                  </Box>
                </Box>

                {rec.fare && (
                  <Box>
                    <Typography
                      variant="body2"
                      color="textSecondary"
                      gutterBottom
                    >
                      Flight Cost
                    </Typography>
                    <Box
                      display="flex"
                      justifyContent="space-between"
                      alignItems="center"
                    >
                      <Typography variant="h6">
                        {formatCurrency(rec.fare.price, rec.fare.currency)}
                      </Typography>
                      <Chip
                        size="small"
                        label={rec.fare.duration}
                        color="primary"
                        variant="outlined"
                      />
                    </Box>
                    <Typography
                      variant="caption"
                      color="textSecondary"
                      display="block"
                    >
                      {rec.fare.airlines.join(", ")}
                    </Typography>
                  </Box>
                )}
              </CardContent>

              <CardActions
                sx={{ justifyContent: "space-between", p: 2, pt: 0 }}
              >
                <Chip
                  label={calculateBenefit(rec)}
                  color={rec.exchange_rate_trend > 0 ? "success" : "default"}
                  size="small"
                />
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => handleViewDetails(rec)}
                >
                  View Details
                </Button>
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>

      {selectedDestination && (
        <DetailView
          open={detailsOpen}
          onClose={handleCloseDetails}
          destination={selectedDestination}
        />
      )}
    </>
  );
};

export default RecommendationsList;

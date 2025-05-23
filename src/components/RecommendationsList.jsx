import { useState } from "react";
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
  loading = false,
  favorites = [],
  toggleFavorite,
  isFavorite,
  showDate = false,
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

  // Check if we're using real-time forex data
  const checkForexDataStatus = () => {
    const apiKeys = JSON.parse(
      localStorage.getItem("chasquiFxApiKeys") || "{}"
    );
    if (apiKeys.serpApi) {
      return {
        isRealTime: true,
        message: "Using real-time forex data from Google Finance",
      };
    } else {
      return {
        isRealTime: false,
        message:
          "Using synthetic forex data. Add SerpAPI key for real-time rates.",
      };
    }
  };

  const forexStatus = checkForexDataStatus();

  return (
    <>
      <Box
        sx={{
          p: 2,
          mb: 3,
          borderRadius: 2,
          backgroundColor: forexStatus.isRealTime
            ? "rgba(76, 175, 80, 0.08)"
            : "rgba(255, 152, 0, 0.08)",
          border: `1px solid ${
            forexStatus.isRealTime
              ? "rgba(76, 175, 80, 0.3)"
              : "rgba(255, 152, 0, 0.3)"
          }`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 2px 4px rgba(0,0,0,0.03)",
        }}
      >
        <Typography
          variant="body2"
          color={forexStatus.isRealTime ? "success.main" : "warning.main"}
          align="center"
          sx={{ fontWeight: 500 }}
        >
          {forexStatus.message}
        </Typography>
      </Box>

      <Grid container spacing={3} className="staggered-fade-in">
        {recommendations.map((rec, index) => (
          <Grid item xs={12} sm={6} md={4} key={index}>
            <Card
              elevation={2}
              sx={{
                height: "100%",
                display: "flex",
                flexDirection: "column",
                position: "relative",
                borderRadius: "16px",
                overflow: "hidden",
                background:
                  "linear-gradient(to bottom, rgba(255,255,255,0.9) 0%, rgba(255,255,255,1) 100%)",
              }}
              className="fade-in card-hover-rise glossy-card"
            >
              {/* Card Header with gradient */}
              <Box
                sx={{
                  height: "8px",
                  width: "100%",
                  background: "linear-gradient(90deg, #3f51b5, #f50057)",
                }}
              />

              {/* Favorite button */}
              <IconButton
                size="small"
                color={favorites.includes(rec.city) ? "error" : "default"}
                sx={{
                  position: "absolute",
                  top: 16,
                  right: 16,
                  backgroundColor: "rgba(255,255,255,0.9)",
                  boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                  "&:hover": {
                    backgroundColor: "rgba(255,255,255,1)",
                  },
                }}
                onClick={() => toggleFavorite(rec.city)}
                aria-label={
                  favorites.includes(rec.city)
                    ? "Remove from favorites"
                    : "Add to favorites"
                }
              >
                {favorites.includes(rec.city) ? (
                  <FavoriteIcon />
                ) : (
                  <FavoriteBorderIcon />
                )}
              </IconButton>

              <CardContent sx={{ flexGrow: 1, p: 3 }}>
                <Box
                  display="flex"
                  justifyContent="space-between"
                  alignItems="flex-start"
                  mb={1}
                >
                  <Typography
                    variant="h5"
                    component="h2"
                    sx={{
                      fontWeight: 600,
                      fontSize: "1.25rem",
                      color: "primary.dark",
                      lineHeight: 1.2,
                    }}
                  >
                    {rec.city}
                  </Typography>
                  <Chip
                    size="small"
                    label={calculateBenefit(rec)}
                    color={
                      rec.savings
                        ? "success"
                        : rec.exchange_rate_trend > 0.05
                        ? "primary"
                        : "default"
                    }
                    sx={{
                      fontWeight: 500,
                      fontSize: "0.7rem",
                      height: "22px",
                      borderRadius: "12px",
                    }}
                  />
                </Box>

                <Box display="flex" alignItems="center" mb={1}>
                  <Chip
                    size="small"
                    label={rec.country}
                    variant="outlined"
                    icon={<PublicIcon fontSize="small" />}
                    sx={{
                      borderRadius: "16px",
                      mr: 1,
                      "& .MuiChip-icon": {
                        color: "primary.main",
                      },
                    }}
                  />
                  <Chip
                    size="small"
                    icon={<FlightIcon fontSize="small" />}
                    label={rec.airport_code}
                    color="primary"
                    variant="outlined"
                    sx={{
                      mr: 1,
                      borderRadius: "16px",
                      "& .MuiChip-icon": {
                        color: "primary.main",
                      },
                    }}
                  />
                  {rec.distance && (
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ fontSize: "0.8rem" }}
                    >
                      {rec.distance.toLocaleString()} km
                    </Typography>
                  )}
                </Box>

                <Divider sx={{ my: 2, borderColor: "rgba(0, 0, 0, 0.06)" }} />

                <Box mb={2}>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    gutterBottom
                    sx={{ fontWeight: 500, fontSize: "0.85rem" }}
                  >
                    Exchange Rate
                  </Typography>
                  <Box display="flex" alignItems="center">
                    <Typography
                      variant="h6"
                      component="span"
                      sx={{
                        fontWeight: 600,
                        fontSize: "1.1rem",
                        color: "text.primary",
                      }}
                    >
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
                      color="text.secondary"
                      gutterBottom
                      sx={{ fontWeight: 500, fontSize: "0.85rem" }}
                    >
                      Flight Cost
                    </Typography>
                    <Box
                      display="flex"
                      justifyContent="space-between"
                      alignItems="center"
                    >
                      <Typography
                        variant="h6"
                        sx={{
                          fontWeight: 600,
                          fontSize: "1.1rem",
                          color:
                            rec.fare_trend < 0
                              ? "success.main"
                              : rec.fare_trend > 0
                              ? "error.main"
                              : "text.primary",
                        }}
                      >
                        {formatCurrency(rec.fare.price, rec.fare.currency)}
                      </Typography>
                      <Chip
                        size="small"
                        label={rec.fare.duration}
                        color="secondary"
                        variant="outlined"
                        sx={{
                          borderRadius: "12px",
                          fontSize: "0.7rem",
                          "& .MuiChip-label": {
                            px: 1,
                          },
                        }}
                      />
                    </Box>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      display="block"
                      sx={{ fontSize: "0.75rem", mt: 0.5 }}
                    >
                      {rec.fare.airlines.join(", ")}
                    </Typography>
                  </Box>
                )}
              </CardContent>

              <CardActions
                sx={{
                  justifyContent: "flex-end",
                  borderTop: "1px solid rgba(0, 0, 0, 0.06)",
                  padding: "12px 16px",
                  backgroundColor: "rgba(0, 0, 0, 0.02)",
                }}
              >
                <Button
                  size="small"
                  variant="outlined"
                  color="primary"
                  sx={{
                    borderRadius: "8px",
                    textTransform: "none",
                    fontWeight: 500,
                    px: 2,
                  }}
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

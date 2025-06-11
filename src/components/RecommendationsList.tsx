import React, { useState } from "react";
import {
  Card,
  CardContent,
  CardActions,
  Typography,
  Button,
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
import { formatDateTime } from "@/lib/dateUtils";

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

interface RecommendationsListProps {
  recommendations: Recommendation[];
  loading?: boolean;
  favorites?: Recommendation[];
  toggleFavorite: (recommendation: Recommendation) => void;
  isFavorite: (recommendation: Recommendation) => boolean;
  showDate?: boolean;
}

const RecommendationsList: React.FC<RecommendationsListProps> = ({
  recommendations,
  loading = false,
  favorites = [],
  toggleFavorite,
  isFavorite,
  showDate = false,
}) => {
  // State for selected destination details
  const [selectedDestination, setSelectedDestination] =
    useState<Recommendation | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  // Handle opening destination details
  const handleViewDetails = (destination: Recommendation) => {
    setSelectedDestination(destination);
    setDetailsOpen(true);
  };

  // Handle closing destination details
  const handleCloseDetails = () => {
    setDetailsOpen(false);
  };

  // Helper function to render the trend icon
  const renderTrendIcon = (trend: number) => {
    if (trend > 0.05) {
      return <TrendingUpIcon sx={{ color: "green" }} />;
    } else if (trend < -0.05) {
      return <TrendingDownIcon sx={{ color: "red" }} />;
    } else {
      return <TrendingFlatIcon sx={{ color: "grey" }} />;
    }
  };

  // Function to format currency
  const formatCurrency = (amount: number, currency = "USD") => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Helper function to calculate savings or better rate
  const calculateBenefit = (rec: Recommendation) => {
    if (rec.savings) {
      return `Save ${formatCurrency(rec.savings)}`;
    } else if (rec.exchange_rate_trend && rec.exchange_rate_trend > 0.05) {
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
        <Typography variant="body1" color="text.secondary">
          No recommendations found
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          Try searching with different criteria
        </Typography>
      </Paper>
    );
  }

  return (
    <Box className="recommendations-list">
      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 3 }}>
        {recommendations.map((recommendation) => (
          <Box
            key={recommendation.id || recommendation.destination}
            sx={{
              flexBasis: { xs: "100%", sm: "46%", md: "46%" },
              flexGrow: 0,
              flexShrink: 0,
            }}
          >
            <Card
              sx={{
                height: "100%",
                display: "flex",
                flexDirection: "column",
                transition: "transform 0.2s, box-shadow 0.2s",
                "&:hover": {
                  transform: "translateY(-5px)",
                  boxShadow: 6,
                },
              }}
            >
              <CardContent sx={{ flexGrow: 1, pb: 1 }}>
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    mb: 1,
                  }}
                >
                  <Typography
                    variant="h6"
                    component="div"
                    fontWeight={600}
                    sx={{ display: "flex", alignItems: "center" }}
                  >
                    <PublicIcon
                      sx={{ mr: 1, color: "primary.main", fontSize: "1rem" }}
                    />
                    {recommendation.destination}
                  </Typography>
                  <Tooltip
                    title={
                      isFavorite(recommendation)
                        ? "Remove from favorites"
                        : "Add to favorites"
                    }
                    arrow
                  >
                    <IconButton
                      size="small"
                      color="primary"
                      onClick={() => toggleFavorite(recommendation)}
                      sx={{ mt: -0.5 }}
                    >
                      {isFavorite(recommendation) ? (
                        <FavoriteIcon color="error" />
                      ) : (
                        <FavoriteBorderIcon />
                      )}
                    </IconButton>
                  </Tooltip>
                </Box>

                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    mb: 1,
                  }}
                >
                  <FlightIcon
                    sx={{ mr: 1, color: "primary.main", fontSize: "1rem" }}
                  />
                  <Typography variant="body2" color="text.secondary">
                    From: {recommendation.origin || "Various origins"}
                  </Typography>
                </Box>

                <Divider sx={{ my: 1 }} />

                <Box sx={{ mt: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    Exchange Rate:{" "}
                    <Box component="span" fontWeight="bold">
                      {recommendation.exchange_rate
                        ? recommendation.exchange_rate.toFixed(2)
                        : "N/A"}
                    </Box>
                    {recommendation.exchange_rate_trend &&
                      renderTrendIcon(recommendation.exchange_rate_trend)}
                  </Typography>

                  <Typography variant="body2" color="text.secondary">
                    Cost of Living:{" "}
                    <Box component="span" fontWeight="bold">
                      {recommendation.cost_index
                        ? `${recommendation.cost_index}%`
                        : "N/A"}
                    </Box>
                  </Typography>

                  {recommendation.savings && (
                    <Typography variant="body2" color="text.secondary">
                      Potential Savings:{" "}
                      <Box component="span" fontWeight="bold">
                        {formatCurrency(recommendation.savings)}
                      </Box>
                    </Typography>
                  )}

                  {showDate && recommendation.date && (
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ display: "block", mt: 1 }}
                    >
                      Searched on:{" "}
                      {formatDateTime(
                        recommendation.date,
                        "Date not available"
                      )}
                    </Typography>
                  )}

                  <Box sx={{ mt: 1 }}>
                    <Chip
                      size="small"
                      label={calculateBenefit(recommendation)}
                      color={
                        recommendation.savings
                          ? "success"
                          : recommendation.exchange_rate_trend &&
                            recommendation.exchange_rate_trend > 0.05
                          ? "primary"
                          : "default"
                      }
                      sx={{ mr: 1, mt: 1 }}
                    />
                    {recommendation.tags &&
                      recommendation.tags
                        .slice(0, 2)
                        .map((tag) => (
                          <Chip
                            key={tag}
                            size="small"
                            label={tag}
                            variant="outlined"
                            sx={{ mr: 1, mt: 1 }}
                          />
                        ))}
                  </Box>
                </Box>
              </CardContent>
              <CardActions>
                <Button
                  size="small"
                  onClick={() => handleViewDetails(recommendation)}
                >
                  View Details
                </Button>
              </CardActions>
            </Card>
          </Box>
        ))}
      </Box>

      {selectedDestination && (
        <DetailView
          open={detailsOpen}
          onClose={handleCloseDetails}
          destination={selectedDestination}
        />
      )}
    </Box>
  );
};

export default RecommendationsList;

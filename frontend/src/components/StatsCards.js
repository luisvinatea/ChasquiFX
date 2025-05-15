import React from "react";
import { Box, Paper, Typography, Grid } from "@mui/material";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import TrendingDownIcon from "@mui/icons-material/TrendingDown";

/**
 * Component to display forex statistics and summary info
 */
const StatsCards = ({ recommendations }) => {
  // If no recommendations, return null
  if (!recommendations || recommendations.length === 0) {
    return null;
  }

  // Calculate stats from recommendations
  const calculateStats = () => {
    // Find best and worst exchange rates
    let bestRate = { city: null, rate: 0, currency: null };
    let worstRate = { city: null, rate: Number.MAX_VALUE, currency: null };
    let totalTrend = 0;

    recommendations.forEach((rec) => {
      // For best rate, higher is better
      if (rec.exchange_rate > bestRate.rate) {
        bestRate = {
          city: rec.city,
          rate: rec.exchange_rate,
          currency: rec.currency,
          trend: rec.exchange_rate_trend,
        };
      }

      // For worst rate, lower is worse
      if (rec.exchange_rate < worstRate.rate) {
        worstRate = {
          city: rec.city,
          rate: rec.exchange_rate,
          currency: rec.currency,
          trend: rec.exchange_rate_trend,
        };
      }

      totalTrend += rec.exchange_rate_trend;
    });

    // Average trend
    const avgTrend = totalTrend / recommendations.length;

    return {
      bestRate,
      worstRate,
      avgTrend,
      totalDestinations: recommendations.length,
    };
  };

  const stats = calculateStats();

  return (
    <Box mb={4}>
      <Grid container spacing={3}>
        {/* Best Exchange Rate */}
        <Grid item xs={12} sm={6} md={3}>
          <Paper
            elevation={2}
            sx={{
              p: 2,
              height: "100%",
              bgcolor: "rgba(46, 125, 50, 0.1)",
              borderLeft: "4px solid #2e7d32",
            }}
          >
            <Typography variant="body2" color="textSecondary">
              Best Exchange Rate
            </Typography>
            <Typography variant="h5" sx={{ mb: 1 }}>
              {stats.bestRate.rate.toFixed(2)} {stats.bestRate.currency}
            </Typography>
            <Box display="flex" alignItems="center">
              <TrendingUpIcon
                fontSize="small"
                sx={{ color: "green", mr: 0.5 }}
              />
              <Typography variant="body2">{stats.bestRate.city}</Typography>
            </Box>
          </Paper>
        </Grid>

        {/* Lowest Exchange Rate */}
        <Grid item xs={12} sm={6} md={3}>
          <Paper
            elevation={2}
            sx={{
              p: 2,
              height: "100%",
              bgcolor: "rgba(211, 47, 47, 0.1)",
              borderLeft: "4px solid #d32f2f",
            }}
          >
            <Typography variant="body2" color="textSecondary">
              Lowest Exchange Rate
            </Typography>
            <Typography variant="h5" sx={{ mb: 1 }}>
              {stats.worstRate.rate.toFixed(2)} {stats.worstRate.currency}
            </Typography>
            <Box display="flex" alignItems="center">
              <TrendingDownIcon
                fontSize="small"
                sx={{ color: "red", mr: 0.5 }}
              />
              <Typography variant="body2">{stats.worstRate.city}</Typography>
            </Box>
          </Paper>
        </Grid>

        {/* Average Trend */}
        <Grid item xs={12} sm={6} md={3}>
          <Paper
            elevation={2}
            sx={{
              p: 2,
              height: "100%",
              bgcolor: "rgba(25, 118, 210, 0.1)",
              borderLeft: "4px solid #1976d2",
            }}
          >
            <Typography variant="body2" color="textSecondary">
              Average Trend
            </Typography>
            <Typography variant="h5" sx={{ mb: 1 }}>
              {(stats.avgTrend * 100).toFixed(1)}%
            </Typography>
            <Box display="flex" alignItems="center">
              {stats.avgTrend > 0 ? (
                <TrendingUpIcon
                  fontSize="small"
                  sx={{ color: "green", mr: 0.5 }}
                />
              ) : (
                <TrendingDownIcon
                  fontSize="small"
                  sx={{ color: "red", mr: 0.5 }}
                />
              )}
              <Typography variant="body2">
                {stats.avgTrend > 0.05
                  ? "Strong positive"
                  : stats.avgTrend > 0
                  ? "Slightly positive"
                  : stats.avgTrend > -0.05
                  ? "Neutral"
                  : "Negative"}
              </Typography>
            </Box>
          </Paper>
        </Grid>

        {/* Total Destinations */}
        <Grid item xs={12} sm={6} md={3}>
          <Paper
            elevation={2}
            sx={{
              p: 2,
              height: "100%",
              bgcolor: "rgba(103, 58, 183, 0.1)",
              borderLeft: "4px solid #673ab7",
            }}
          >
            <Typography variant="body2" color="textSecondary">
              Destinations Found
            </Typography>
            <Typography variant="h5" sx={{ mb: 1 }}>
              {stats.totalDestinations}
            </Typography>
            <Typography variant="body2">
              Based on your search parameters
            </Typography>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default StatsCards;

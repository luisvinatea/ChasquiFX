import React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Grid,
  Divider,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
} from "@mui/material";
import FlightIcon from "@mui/icons-material/Flight";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import TrendingDownIcon from "@mui/icons-material/TrendingDown";
import TrendingFlatIcon from "@mui/icons-material/TrendingFlat";
import PublicIcon from "@mui/icons-material/Public";
import CurrencyExchangeIcon from "@mui/icons-material/CurrencyExchange";
import AttachMoneyIcon from "@mui/icons-material/AttachMoney";
import CloseIcon from "@mui/icons-material/Close";

const DetailView = ({ open, onClose, destination }) => {
  // If no destination is provided, return null
  if (!destination) return null;

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

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderBottom: "1px solid rgba(0,0,0,0.12)",
          pb: 1,
        }}
      >
        <Box display="flex" alignItems="center">
          <Typography variant="h5" component="div">
            {destination.city}, {destination.country}
          </Typography>
          <Chip
            size="small"
            label={destination.airport_code}
            color="primary"
            icon={<FlightIcon fontSize="small" />}
            sx={{ ml: 2 }}
          />
        </Box>
        <Button
          onClick={onClose}
          startIcon={<CloseIcon />}
          color="inherit"
          size="small"
        >
          Close
        </Button>
      </DialogTitle>

      <DialogContent dividers>
        <Grid container spacing={3}>
          {/* Exchange Rate Information */}
          <Grid item xs={12} md={6}>
            <Paper elevation={2} sx={{ p: 2, height: "100%" }}>
              <Box display="flex" alignItems="center" mb={1}>
                <CurrencyExchangeIcon color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6">Exchange Rate Information</Typography>
              </Box>
              <Divider sx={{ mb: 2 }} />

              <Box mb={2}>
                <Typography variant="body2" color="textSecondary">
                  Current Exchange Rate
                </Typography>
                <Box display="flex" alignItems="center">
                  <Typography variant="h5" component="div">
                    1 USD = {destination.exchange_rate.toFixed(2)}{" "}
                    {destination.currency}
                  </Typography>
                  {renderTrendIcon(destination.exchange_rate_trend)}
                </Box>
                <Typography variant="body2" color="textSecondary" mt={1}>
                  Trend: {(destination.exchange_rate_trend * 100).toFixed(1)}%
                  {destination.exchange_rate_trend > 0
                    ? " (favorable)"
                    : destination.exchange_rate_trend < 0
                    ? " (unfavorable)"
                    : " (stable)"}
                </Typography>
              </Box>

              {/* Historical data placeholder - could be replaced with actual chart */}
              <Typography variant="body2" color="textSecondary" mt={2}>
                Historical exchange rate data would be displayed here in a
                future update.
              </Typography>
            </Paper>
          </Grid>

          {/* Flight Information */}
          <Grid item xs={12} md={6}>
            <Paper elevation={2} sx={{ p: 2, height: "100%" }}>
              <Box display="flex" alignItems="center" mb={1}>
                <FlightIcon color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6">Flight Information</Typography>
              </Box>
              <Divider sx={{ mb: 2 }} />

              {destination.fare !== undefined ? (
                <>
                  <Box mb={2}>
                    <Typography variant="body2" color="textSecondary">
                      Average Flight Cost
                    </Typography>
                    <Typography variant="h5">
                      {formatCurrency(destination.fare)}
                    </Typography>
                  </Box>

                  <Typography variant="body1" mb={1}>
                    Flight Details
                  </Typography>
                  <Box bgcolor="background.paper" p={1} borderRadius={1} mb={2}>
                    <Grid container spacing={2}>
                      <Grid item xs={6}>
                        <Typography variant="body2" color="textSecondary">
                          Distance
                        </Typography>
                        <Typography variant="body1">
                          {destination.distance?.toLocaleString() || "N/A"} km
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="body2" color="textSecondary">
                          Duration
                        </Typography>
                        <Typography variant="body1">
                          {/* Calculate estimated duration based on distance */}
                          {Math.floor(destination.distance / 800) +
                            "h " +
                            Math.floor((destination.distance % 800) / 13.3) +
                            "m"}
                        </Typography>
                      </Grid>
                    </Grid>
                  </Box>
                </>
              ) : (
                <Typography variant="body1">
                  Flight fare information is not available for this destination.
                </Typography>
              )}

              {/* Additional flight metrics */}
              {destination.flights_per_week && (
                <Box mt={2}>
                  <Typography variant="body2" color="textSecondary">
                    Flights per Week
                  </Typography>
                  <Typography variant="body1">
                    {destination.flights_per_week}
                  </Typography>
                </Box>
              )}
            </Paper>
          </Grid>

          {/* Cost Comparison */}
          <Grid item xs={12}>
            <Paper elevation={2} sx={{ p: 2 }}>
              <Box display="flex" alignItems="center" mb={1}>
                <AttachMoneyIcon color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6">Cost Comparison</Typography>
              </Box>
              <Divider sx={{ mb: 2 }} />

              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Item</TableCell>
                      <TableCell align="right">Cost in USD</TableCell>
                      <TableCell align="right">
                        Cost in {destination.currency}
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    <TableRow>
                      <TableCell>Coffee</TableCell>
                      <TableCell align="right">$4.00</TableCell>
                      <TableCell align="right">
                        {(4 * destination.exchange_rate).toFixed(2)}{" "}
                        {destination.currency}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Meal at Restaurant</TableCell>
                      <TableCell align="right">$20.00</TableCell>
                      <TableCell align="right">
                        {(20 * destination.exchange_rate).toFixed(2)}{" "}
                        {destination.currency}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Hotel (night)</TableCell>
                      <TableCell align="right">$150.00</TableCell>
                      <TableCell align="right">
                        {(150 * destination.exchange_rate).toFixed(2)}{" "}
                        {destination.currency}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Transportation (day)</TableCell>
                      <TableCell align="right">$30.00</TableCell>
                      <TableCell align="right">
                        {(30 * destination.exchange_rate).toFixed(2)}{" "}
                        {destination.currency}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>

              <Typography
                variant="caption"
                color="textSecondary"
                mt={1}
                display="block"
              >
                Note: These are estimated costs based on average prices. Actual
                prices may vary.
              </Typography>
            </Paper>
          </Grid>
        </Grid>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} color="primary">
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default DetailView;

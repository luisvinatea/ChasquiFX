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
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: "16px",
          overflow: "hidden",
        },
      }}
    >
      <DialogTitle
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderBottom: "1px solid rgba(0,0,0,0.08)",
          pb: 2,
          pt: 2,
          px: 3,
          background:
            "linear-gradient(to right, rgba(63, 81, 181, 0.05) 0%, rgba(255, 255, 255, 0) 100%)",
        }}
      >
        <Box display="flex" alignItems="center">
          <Typography
            variant="h5"
            component="div"
            sx={{ fontWeight: 600, color: "primary.dark" }}
          >
            {destination.city}, {destination.country}
          </Typography>
          <Chip
            size="small"
            label={destination.airport_code}
            color="primary"
            icon={<FlightIcon fontSize="small" />}
            sx={{
              ml: 2,
              borderRadius: "16px",
              backgroundColor: "rgba(63, 81, 181, 0.1)",
              color: "primary.dark",
              fontWeight: 500,
              border: "none",
              "& .MuiChip-icon": {
                color: "primary.main",
              },
            }}
          />
        </Box>
        <Button
          onClick={onClose}
          startIcon={<CloseIcon />}
          color="inherit"
          size="small"
          sx={{
            borderRadius: "20px",
            px: 2,
            textTransform: "none",
          }}
        >
          Close
        </Button>
      </DialogTitle>

      <DialogContent dividers sx={{ p: 3 }}>
        <Grid container spacing={3}>
          {/* Exchange Rate Information */}
          <Grid item xs={12} md={6}>
            <Paper
              elevation={1}
              sx={{
                p: 3,
                height: "100%",
                borderRadius: "12px",
                boxShadow: "0 4px 12px rgba(0, 0, 0, 0.05)",
                border: "1px solid rgba(0, 0, 0, 0.04)",
              }}
            >
              <Box display="flex" alignItems="center" mb={2}>
                <CurrencyExchangeIcon color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Exchange Rate Information
                </Typography>
              </Box>
              <Divider sx={{ mb: 3 }} />

              <Box mb={3}>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ fontWeight: 500, mb: 1 }}
                >
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
          <Grid sx={{ gridColumn: { xs: "span 12", md: "span 6" } }}>
            <Paper elevation={2} sx={{ p: 2, height: "100%" }}>
              <Box display="flex" alignItems="center" mb={1}>
                <FlightIcon color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6">Flight Information</Typography>
              </Box>
              <Divider sx={{ mb: 2 }} />

              {destination.fare ? (
                <>
                  <Box mb={2}>
                    <Typography variant="body2" color="textSecondary">
                      Flight Cost
                    </Typography>
                    <Typography variant="h5">
                      {formatCurrency(
                        destination.fare.price,
                        destination.fare.currency
                      )}
                    </Typography>
                  </Box>

                  <Typography variant="body1" mb={1}>
                    Flight Details
                  </Typography>
                  <Box
                    bgcolor="background.paper"
                    p={1}
                    borderRadius={1}
                    mb={2}
                  >
                    <Grid container spacing={2}>
                      <Grid sx={{ gridColumn: "span 6" }}>
                        <Typography variant="body2" color="textSecondary">
                          Route
                        </Typography>
                        <Typography variant="body1">
                          {destination.departure_airport} →{" "}
                          {destination.arrival_airport}
                        </Typography>
                      </Grid>
                      <Grid sx={{ gridColumn: "span 6" }}>
                        <Typography variant="body2" color="textSecondary">
                          Distance
                        </Typography>
                        <Typography variant="body1">
                          {destination.flight_route?.distance?.toLocaleString() ||
                            "N/A"}{" "}
                          km
                        </Typography>
                      </Grid>
                      <Grid sx={{ gridColumn: "span 6" }}>
                        <Typography variant="body2" color="textSecondary">
                          Duration
                        </Typography>
                        <Typography variant="body1">
                          {destination.fare.duration || "N/A"}
                        </Typography>
                      </Grid>
                      <Grid sx={{ gridColumn: "span 6" }}>
                        <Typography variant="body2" color="textSecondary">
                          Airlines
                        </Typography>
                        <Typography variant="body1">
                          {destination.fare.airlines?.join(", ") ||
                            "Multiple Airlines"}
                        </Typography>
                      </Grid>
                      <Grid sx={{ gridColumn: "span 12" }}>
                        <Typography variant="body2" color="textSecondary">
                          Dates
                        </Typography>
                        <Typography variant="body1">
                          {destination.fare.outbound_date} to{" "}
                          {destination.fare.return_date}
                        </Typography>
                      </Grid>
                    </Grid>
                  </Box>
                </>
              ) : (
                <Typography variant="body1">
                  Flight fare information is not available for this
                  destination.
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
          <Grid sx={{ gridColumn: "span 12" }}>
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

import React, { useState } from "react";
import {
  Box,
  Typography,
  TextField,
  Button,
  Slider,
  FormControlLabel,
  Checkbox,
  Alert,
  Paper,
  Divider,
  Grid,
} from "@mui/material";
import { LocalizationProvider, DatePicker } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import dayjs from "dayjs";
import RefreshIcon from "@mui/icons-material/Refresh";
import SearchIcon from "@mui/icons-material/Search";

const Sidebar = ({
  apiStatus,
  departureAirport,
  setDepartureAirport,
  onSearch,
  refreshData,
}) => {
  // Default dates - 3 months from now and a week later
  const today = dayjs();
  const defaultOutbound = today.add(90, "day");
  const defaultReturn = defaultOutbound.add(7, "day");

  // State management
  const [outboundDate, setOutboundDate] = useState(defaultOutbound);
  const [returnDate, setReturnDate] = useState(defaultReturn);
  const [maxResults, setMaxResults] = useState(5);
  const [directOnly, setDirectOnly] = useState(false);
  const [useRealtimeData, setUseRealtimeData] = useState(true);
  const [includeFares, setIncludeFares] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(dayjs());

  // Airport selection handler
  const handleAirportSelection = (airport) => {
    setDepartureAirport(airport);
  };

  // Handle search button click
  const handleSearch = () => {
    if (!departureAirport || departureAirport.length !== 3) {
      alert("Please enter a valid 3-letter IATA airport code");
      return;
    }

    if (!apiStatus) {
      alert("API server is not running. Please start the API server first.");
      return;
    }

    onSearch({
      departureAirport: departureAirport.toUpperCase(),
      maxResults,
      directOnly,
      includeFares,
      useRealtimeData,
      outboundDate: outboundDate.format("YYYY-MM-DD"),
      returnDate: returnDate.format("YYYY-MM-DD"),
    });
  };

  // Handle refresh button click
  const handleRefresh = () => {
    if (typeof refreshData === "function") {
      refreshData();
      setLastRefresh(dayjs());
    } else {
      console.warn("refreshData function is not properly initialized");
      // Provide user feedback
      alert(
        "Refresh function is not available. Please check your API configuration."
      );
    }
  };

  return (
    <Paper
      elevation={3}
      sx={{
        p: 2,
        height: "100%",
        maxWidth: 300,
        backgroundColor: "rgba(255, 255, 255, 0.9)",
      }}
    >
      <Typography variant="h6" gutterBottom>
        Search Parameters
      </Typography>

      {/* API status indicator */}
      {apiStatus ? (
        <Alert severity="success" sx={{ mb: 2 }}>
          API Server Connected
        </Alert>
      ) : (
        <Alert severity="error" sx={{ mb: 2 }}>
          API Server Offline
          <Typography variant="caption" display="block">
            Run: python backend/api/main.py
          </Typography>
        </Alert>
      )}

      {/* Refresh data */}
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        mb={2}
      >
        <Typography variant="caption">
          Last updated: {lastRefresh.format("HH:mm:ss")}
        </Typography>
        <Button
          size="small"
          onClick={handleRefresh}
          startIcon={<RefreshIcon />}
          title="Refresh data and clear cache"
        >
          Refresh
        </Button>
      </Box>

      <Divider sx={{ my: 2 }} />

      {/* Airport selection */}
      <Typography variant="subtitle2" gutterBottom>
        Departure Airport (IATA code)
      </Typography>
      <TextField
        fullWidth
        size="small"
        value={departureAirport}
        onChange={(e) => setDepartureAirport(e.target.value.toUpperCase())}
        inputProps={{ maxLength: 3 }}
        sx={{ mb: 2 }}
      />

      {/* Popular airports */}
      <Typography variant="subtitle2" gutterBottom>
        Popular Airports
      </Typography>
      <Grid container spacing={1} sx={{ mb: 2 }}>
        <Grid sx={{ gridColumn: "span 4" }}>
          <Button
            fullWidth
            size="small"
            variant="outlined"
            onClick={() => handleAirportSelection("JFK")}
          >
            🇺🇸 JFK
          </Button>
        </Grid>
        <Grid sx={{ gridColumn: "span 4" }}>
          <Button
            fullWidth
            size="small"
            variant="outlined"
            onClick={() => handleAirportSelection("LHR")}
          >
            🇬🇧 LHR
          </Button>
        </Grid>
        <Grid sx={{ gridColumn: "span 4" }}>
          <Button
            fullWidth
            size="small"
            variant="outlined"
            onClick={() => handleAirportSelection("CDG")}
          >
            🇫🇷 CDG
          </Button>
        </Grid>
        <Grid sx={{ gridColumn: "span 4" }}>
          <Button
            fullWidth
            size="small"
            variant="outlined"
            onClick={() => handleAirportSelection("SFO")}
          >
            🇺🇸 SFO
          </Button>
        </Grid>
        <Grid sx={{ gridColumn: "span 4" }}>
          <Button
            fullWidth
            size="small"
            variant="outlined"
            onClick={() => handleAirportSelection("NRT")}
          >
            🇯🇵 NRT
          </Button>
        </Grid>
        <Grid sx={{ gridColumn: "span 4" }}>
          <Button
            fullWidth
            size="small"
            variant="outlined"
            onClick={() => handleAirportSelection("MEX")}
          >
            🇲🇽 MEX
          </Button>
        </Grid>
      </Grid>

      <Divider sx={{ my: 2 }} />

      {/* Travel dates */}
      <Typography variant="subtitle2" gutterBottom>
        Travel Dates
      </Typography>
      <LocalizationProvider dateAdapter={AdapterDayjs}>
        <DatePicker
          label="Outbound Date"
          value={outboundDate}
          onChange={(newValue) => setOutboundDate(newValue)}
          minDate={today}
          format="YYYY-MM-DD"
          slotProps={{
            textField: { size: "small", fullWidth: true, margin: "dense" },
          }}
        />
        <DatePicker
          label="Return Date"
          value={returnDate}
          onChange={(newValue) => setReturnDate(newValue)}
          minDate={outboundDate}
          format="YYYY-MM-DD"
          slotProps={{
            textField: { size: "small", fullWidth: true, margin: "dense" },
          }}
        />
      </LocalizationProvider>

      <Divider sx={{ my: 2 }} />

      {/* Options */}
      <Typography variant="subtitle2" gutterBottom>
        Options
      </Typography>
      <Typography variant="caption" gutterBottom>
        Maximum Results
      </Typography>
      <Slider
        value={maxResults}
        onChange={(_, newValue) => setMaxResults(newValue)}
        min={1}
        max={10}
        step={1}
        marks
        valueLabelDisplay="auto"
        sx={{ mb: 2 }}
      />

      <FormControlLabel
        control={
          <Checkbox
            checked={directOnly}
            onChange={(e) => setDirectOnly(e.target.checked)}
            size="small"
          />
        }
        label="Direct Flights Only"
      />
      <FormControlLabel
        control={
          <Checkbox
            checked={useRealtimeData}
            onChange={(e) => setUseRealtimeData(e.target.checked)}
            size="small"
          />
        }
        label="Use Real-time Forex Data"
      />
      <FormControlLabel
        control={
          <Checkbox
            checked={includeFares}
            onChange={(e) => setIncludeFares(e.target.checked)}
            size="small"
          />
        }
        label="Include Flight Fares"
      />

      <Button
        fullWidth
        variant="contained"
        color="primary"
        startIcon={<SearchIcon />}
        sx={{ mt: 2 }}
        onClick={handleSearch}
      >
        Find Destinations
      </Button>
    </Paper>
  );
};

export default Sidebar;

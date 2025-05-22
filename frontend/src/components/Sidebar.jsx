import { useState } from "react";
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
        p: 3,
        height: "100%",
        maxWidth: 300,
        backgroundColor: "rgba(255, 255, 255, 0.95)",
        borderRadius: "16px",
        boxShadow: "0 8px 24px rgba(0, 0, 0, 0.08)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <Box
        sx={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: "4px",
          background: "linear-gradient(90deg, #3f51b5, #f50057)",
        }}
      />

      <Typography
        variant="h6"
        gutterBottom
        sx={{
          fontWeight: 600,
          fontSize: "1.25rem",
          pb: 1,
          borderBottom: "1px solid rgba(0, 0, 0, 0.06)",
          mb: 3,
        }}
      >
        Search Parameters
      </Typography>

      {/* API status indicator */}
      {apiStatus ? (
        <Alert severity="success" sx={{ mb: 3, borderRadius: "8px" }}>
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
        mb={3}
      >
        <Typography variant="caption" color="text.secondary">
          Last updated: {lastRefresh.format("HH:mm:ss")}
        </Typography>
        <Button
          size="small"
          onClick={handleRefresh}
          startIcon={<RefreshIcon />}
          title="Refresh data and clear cache"
          sx={{
            borderRadius: "20px",
            textTransform: "none",
            boxShadow: "none",
            "&:hover": {
              boxShadow: "0 2px 5px rgba(0,0,0,0.1)",
            },
          }}
        >
          Refresh
        </Button>
      </Box>

      <Divider sx={{ my: 2 }} />

      {/* Airport selection */}
      <Typography variant="subtitle2" gutterBottom fontWeight={600}>
        Departure Airport (IATA code)
      </Typography>
      <TextField
        fullWidth
        size="small"
        value={departureAirport}
        onChange={(e) => setDepartureAirport(e.target.value.toUpperCase())}
        inputProps={{ maxLength: 3 }}
        sx={{
          mb: 3,
          "& .MuiOutlinedInput-root": {
            borderRadius: "8px",
            "&:hover fieldset": {
              borderColor: "primary.light",
            },
          },
        }}
        placeholder="Enter 3-letter code"
      />

      {/* Popular airports */}
      <Typography variant="subtitle2" gutterBottom fontWeight={600}>
        Popular Airports
      </Typography>
      <Grid container spacing={1} sx={{ mb: 3 }}>
        <Grid item xs={4}>
          <Button
            fullWidth
            size="small"
            variant="outlined"
            onClick={() => handleAirportSelection("JFK")}
            sx={{
              borderRadius: "8px",
              textTransform: "none",
              fontSize: "0.8rem",
              py: 0.75,
            }}
          >
            🇺🇸 JFK
          </Button>
        </Grid>
        <Grid item xs={4}>
          <Button
            fullWidth
            size="small"
            variant="outlined"
            onClick={() => handleAirportSelection("LHR")}
            sx={{
              borderRadius: "8px",
              textTransform: "none",
              fontSize: "0.8rem",
              py: 0.75,
            }}
          >
            🇬🇧 LHR
          </Button>
        </Grid>
        <Grid item xs={4}>
          <Button
            fullWidth
            size="small"
            variant="outlined"
            onClick={() => handleAirportSelection("CDG")}
            sx={{
              borderRadius: "8px",
              textTransform: "none",
              fontSize: "0.8rem",
              py: 0.75,
            }}
          >
            🇫🇷 CDG
          </Button>
        </Grid>
        <Grid item xs={4}>
          <Button
            fullWidth
            size="small"
            variant="outlined"
            onClick={() => handleAirportSelection("SFO")}
            sx={{
              borderRadius: "8px",
              textTransform: "none",
              fontSize: "0.8rem",
              py: 0.75,
            }}
          >
            🇺🇸 SFO
          </Button>
        </Grid>
        <Grid item xs={4}>
          <Button
            fullWidth
            size="small"
            variant="outlined"
            onClick={() => handleAirportSelection("NRT")}
            sx={{
              borderRadius: "8px",
              textTransform: "none",
              fontSize: "0.8rem",
              py: 0.75,
            }}
          >
            🇯🇵 NRT
          </Button>
        </Grid>
        <Grid item xs={4}>
          <Button
            fullWidth
            size="small"
            variant="outlined"
            onClick={() => handleAirportSelection("MEX")}
            sx={{
              borderRadius: "8px",
              textTransform: "none",
              fontSize: "0.8rem",
              py: 0.75,
            }}
          >
            🇲🇽 MEX
          </Button>
        </Grid>
      </Grid>

      <Divider sx={{ my: 3 }} />

      {/* Travel dates */}
      <Typography variant="subtitle2" gutterBottom fontWeight={600}>
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
            textField: {
              size: "small",
              fullWidth: true,
              margin: "dense",
              sx: {
                "& .MuiOutlinedInput-root": {
                  borderRadius: "8px",
                  "&:hover fieldset": {
                    borderColor: "primary.light",
                  },
                },
              },
            },
          }}
        />
        <DatePicker
          label="Return Date"
          value={returnDate}
          onChange={(newValue) => setReturnDate(newValue)}
          minDate={outboundDate}
          format="YYYY-MM-DD"
          slotProps={{
            textField: {
              size: "small",
              fullWidth: true,
              margin: "dense",
              sx: {
                "& .MuiOutlinedInput-root": {
                  borderRadius: "8px",
                  "&:hover fieldset": {
                    borderColor: "primary.light",
                  },
                },
              },
            },
          }}
        />
      </LocalizationProvider>

      <Divider sx={{ my: 3 }} />

      {/* Options */}
      <Typography variant="subtitle2" gutterBottom fontWeight={600}>
        Options
      </Typography>
      <Typography variant="caption" gutterBottom color="text.secondary">
        Maximum Results: {maxResults}
      </Typography>
      <Slider
        value={maxResults}
        onChange={(_, newValue) => setMaxResults(newValue)}
        min={1}
        max={10}
        step={1}
        marks
        valueLabelDisplay="auto"
        sx={{ mb: 3 }}
        color="secondary"
      />

      <FormControlLabel
        control={
          <Checkbox
            checked={directOnly}
            onChange={(e) => setDirectOnly(e.target.checked)}
            size="small"
            color="primary"
          />
        }
        label={<Typography variant="body2">Direct Flights Only</Typography>}
        sx={{ mb: 1 }}
      />
      <FormControlLabel
        control={
          <Checkbox
            checked={useRealtimeData}
            onChange={(e) => setUseRealtimeData(e.target.checked)}
            size="small"
            color="primary"
          />
        }
        label={
          <Typography variant="body2">Use Real-time Forex Data</Typography>
        }
        sx={{ mb: 1 }}
      />
      <FormControlLabel
        control={
          <Checkbox
            checked={includeFares}
            onChange={(e) => setIncludeFares(e.target.checked)}
            size="small"
            color="primary"
          />
        }
        label={<Typography variant="body2">Include Flight Fares</Typography>}
        sx={{ mb: 2 }}
      />

      <Button
        fullWidth
        variant="contained"
        color="primary"
        startIcon={<SearchIcon />}
        sx={{
          mt: 2,
          py: 1.2,
          textTransform: "none",
          fontWeight: 500,
          fontSize: "1rem",
          borderRadius: "8px",
          boxShadow: "0 4px 8px rgba(63, 81, 181, 0.2)",
          background: "linear-gradient(45deg, #3f51b5 30%, #5c6bc0 90%)",
          "&:hover": {
            boxShadow: "0 6px 12px rgba(63, 81, 181, 0.3)",
            background: "linear-gradient(45deg, #303f9f 30%, #3f51b5 90%)",
          },
        }}
        onClick={handleSearch}
      >
        Find Destinations
      </Button>
    </Paper>
  );
};

export default Sidebar;

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Typography,
  Box,
  Alert,
  IconButton,
  InputAdornment,
  Divider,
  CircularProgress,
} from "@mui/material";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import ApiIcon from "@mui/icons-material/Api";
import RefreshIcon from "@mui/icons-material/Refresh";
import { apiService } from "../services/apiService";

/**
 * Component to manage API keys for external services
 * Stores keys in localStorage for persistence between sessions
 */
const ApiKeysManager = ({ open, onClose }) => {
  const [apiKeys, setApiKeys] = useState({
    serpApi: "",
    exchangeApi: "",
  });

  const [showKeys, setShowKeys] = useState({
    serpApi: false,
    exchangeApi: false,
  });

  const [saveSuccess, setSaveSuccess] = useState(false);
  const [refreshMessage, setRefreshMessage] = useState({
    show: false,
    success: false,
    message: "",
  });
  const [refreshing, setRefreshing] = useState(false);

  // Load saved API keys on component mount
  useEffect(() => {
    if (open) {
      const savedKeys = localStorage.getItem("chasquiFxApiKeys");
      if (savedKeys) {
        try {
          setApiKeys(JSON.parse(savedKeys));
        } catch (error) {
          console.error("Failed to parse saved API keys", error);
        }
      }
    }
  }, [open]);

  // Handle input change
  const handleChange = (key) => (e) => {
    setApiKeys({
      ...apiKeys,
      [key]: e.target.value,
    });
    // Reset success message when editing
    setSaveSuccess(false);
  };

  // Handle toggle visibility
  const toggleVisibility = (key) => {
    setShowKeys({
      ...showKeys,
      [key]: !showKeys[key],
    });
  };

  // Handle save
  const handleSave = () => {
    // Save to localStorage
    localStorage.setItem("chasquiFxApiKeys", JSON.stringify(apiKeys));
    setSaveSuccess(true);

    // Hide success message after 3 seconds
    setTimeout(() => {
      setSaveSuccess(false);
    }, 3000);
  };

  // Handle refreshing forex data
  const handleRefreshForex = async () => {
    if (!apiKeys.serpApi) {
      setRefreshMessage({
        show: true,
        success: false,
        message: "SerpAPI key is required to refresh forex data",
      });
      return;
    }

    setRefreshing(true);
    setRefreshMessage({ show: false, success: false, message: "" });

    try {
      await apiService.refreshForexData();
      setRefreshMessage({
        show: true,
        success: true,
        message: "Forex data refreshed successfully with real-time rates!",
      });
    } catch (error) {
      setRefreshMessage({
        show: true,
        success: false,
        message: `Failed to refresh forex data: ${error.message}`,
      });
    } finally {
      setRefreshing(false);
      // Hide message after 5 seconds
      setTimeout(() => {
        setRefreshMessage({ show: false, success: false, message: "" });
      }, 5000);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle
        sx={{
          display: "flex",
          alignItems: "center",
          borderBottom: "1px solid rgba(0, 0, 0, 0.12)",
        }}
      >
        <ApiIcon sx={{ mr: 1 }} />
        API Keys Manager
      </DialogTitle>

      <DialogContent sx={{ pt: 3 }}>
        {saveSuccess && (
          <Alert severity="success" sx={{ mb: 2 }}>
            API keys saved successfully!
          </Alert>
        )}

        <Typography variant="body2" color="textSecondary" paragraph>
          Enter your API keys for external services. These keys will be stored
          locally in your browser and used for API requests.
        </Typography>

        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle1" gutterBottom>
            SerpAPI Key
          </Typography>
          <Typography variant="body2" color="textSecondary" paragraph>
            Used for fetching forex data from Google Finance and flight
            information. Get a key at{" "}
            <a
              href="https://serpapi.com/"
              target="_blank"
              rel="noopener noreferrer"
            >
              serpapi.com
            </a>
          </Typography>
          <Typography variant="body2" color="info.main" paragraph>
            <strong>Important:</strong> This key is required for real-time
            exchange rates and flight costs.
          </Typography>

          {apiKeys.serpApi && (
            <Box sx={{ display: "flex", alignItems: "center", mt: 1, mb: 2 }}>
              <Button
                variant="outlined"
                color="primary"
                startIcon={
                  refreshing ? <CircularProgress size={20} /> : <RefreshIcon />
                }
                onClick={handleRefreshForex}
                disabled={refreshing}
                size="small"
              >
                {refreshing ? "Refreshing..." : "Refresh Forex Data"}
              </Button>
            </Box>
          )}

          {refreshMessage.show && (
            <Alert
              severity={refreshMessage.success ? "success" : "error"}
              sx={{ mb: 2 }}
            >
              {refreshMessage.message}
            </Alert>
          )}
          <TextField
            fullWidth
            variant="outlined"
            size="small"
            value={apiKeys.serpApi}
            onChange={handleChange("serpApi")}
            type={showKeys.serpApi ? "text" : "password"}
            placeholder="Enter your SerpAPI key"
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={() => toggleVisibility("serpApi")}
                    edge="end"
                  >
                    {showKeys.serpApi ? (
                      <VisibilityOffIcon />
                    ) : (
                      <VisibilityIcon />
                    )}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
        </Box>

        <Divider sx={{ my: 2 }} />

        <Box>
          <Typography variant="subtitle1" gutterBottom>
            Exchange Rate API Key (Legacy/Optional)
          </Typography>
          <Typography variant="body2" color="textSecondary" paragraph>
            Deprecated - Keep empty as the app now uses SerpAPI (Google Finance)
            for forex data.
          </Typography>
          <Typography variant="body2" color="info.main">
            Note: This field is maintained for backward compatibility only.
          </Typography>
          <TextField
            fullWidth
            variant="outlined"
            size="small"
            value={apiKeys.exchangeApi}
            onChange={handleChange("exchangeApi")}
            type={showKeys.exchangeApi ? "text" : "password"}
            placeholder="Enter your Exchange Rate API key (optional)"
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={() => toggleVisibility("exchangeApi")}
                    edge="end"
                  >
                    {showKeys.exchangeApi ? (
                      <VisibilityOffIcon />
                    ) : (
                      <VisibilityIcon />
                    )}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
        </Box>

        <Box sx={{ mt: 3 }}>
          <Alert severity="info" variant="outlined">
            Your API keys are stored locally in your browser and are not
            transmitted to any server other than the respective API providers.
          </Alert>
        </Box>

        {refreshMessage.show && (
          <Alert
            severity={refreshMessage.success ? "success" : "error"}
            sx={{ mt: 2 }}
          >
            {refreshMessage.message}
          </Alert>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button
          onClick={handleRefreshForex}
          disabled={refreshing}
          color="secondary"
        >
          {refreshing ? "Refreshing..." : "Refresh Forex Data"}
        </Button>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" color="primary" onClick={handleSave}>
          Save Keys
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ApiKeysManager;

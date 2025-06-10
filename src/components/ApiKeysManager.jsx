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
  Tabs,
  Tab,
  Chip,
} from "@mui/material";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import ApiIcon from "@mui/icons-material/Api";
import DeleteIcon from "@mui/icons-material/Delete";
import {
  storeUserApiKey,
  getUserApiKeys,
  removeUserApiKey,
} from "../services/mongoDbClient";

/**
 * Component to manage API keys for external services
 * Stores keys securely in MongoDB database with user account
 */
const ApiKeysManager = ({ open, onClose }) => {
  const [apiKeys, setApiKeys] = useState({
    serpapi: "",
    searchapi: "",
    amadeus: "",
    openweather: "",
  });
  const [showApiKeys, setShowApiKeys] = useState({
    serpapi: false,
    searchapi: false,
    amadeus: false,
    openweather: false,
  });
  const [activeTab, setActiveTab] = useState(0);
  const [saveSuccess, setSaveSuccess] = useState("");
  const [saveError, setSaveError] = useState("");
  const [loading, setLoading] = useState(false);
  const [existingKeys, setExistingKeys] = useState({});

  const keyTypes = [
    {
      id: "serpapi",
      name: "SerpAPI",
      description: "Google Search & Flights data",
      signupUrl: "https://serpapi.com/register",
    },
    {
      id: "searchapi",
      name: "SearchAPI",
      description: "Alternative search data provider",
      signupUrl: "https://www.searchapi.io/pricing",
    },
    {
      id: "amadeus",
      name: "Amadeus",
      description: "Flight booking and travel data",
      signupUrl: "https://developers.amadeus.com/register",
    },
    {
      id: "openweather",
      name: "OpenWeather",
      description: "Weather data for destinations",
      signupUrl: "https://openweathermap.org/api",
    },
  ];

  // Load saved API keys on component mount
  useEffect(() => {
    if (open) {
      loadExistingKeys();
    }
  }, [open]);

  const loadExistingKeys = async () => {
    setLoading(true);
    setSaveError("");

    try {
      const result = await getUserApiKeys();

      if (result.error) {
        setSaveError(result.error);
      } else {
        setExistingKeys(result.apiKeys || {});
      }
    } catch (error) {
      console.error("Failed to load API keys:", error);
      setSaveError("Failed to load API keys. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Handle save API key
  const handleSave = async (keyType) => {
    const apiKey = apiKeys[keyType];

    if (!apiKey.trim()) {
      setSaveError(
        `Please enter a ${
          keyTypes.find((k) => k.id === keyType)?.name
        } API key`
      );
      return;
    }

    try {
      setLoading(true);
      setSaveSuccess("");
      setSaveError("");

      const result = await storeUserApiKey(keyType, apiKey);

      if (result.error) {
        setSaveError(result.error);
      } else {
        setSaveSuccess(
          `${
            keyTypes.find((k) => k.id === keyType)?.name
          } API key saved successfully!`
        );
        // Reload existing keys to update UI
        await loadExistingKeys();
        // Clear the input field
        setApiKeys((prev) => ({ ...prev, [keyType]: "" }));

        setTimeout(() => {
          setSaveSuccess("");
        }, 3000);
      }
    } catch (error) {
      console.error("Failed to save API key:", error);
      setSaveError("Failed to save API key. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Handle remove API key
  const handleRemove = async (keyType) => {
    try {
      setLoading(true);
      setSaveSuccess("");
      setSaveError("");

      const result = await removeUserApiKey(keyType);

      if (result.error) {
        setSaveError(result.error);
      } else {
        setSaveSuccess(
          `${
            keyTypes.find((k) => k.id === keyType)?.name
          } API key removed successfully!`
        );
        // Reload existing keys to update UI
        await loadExistingKeys();

        setTimeout(() => {
          setSaveSuccess("");
        }, 3000);
      }
    } catch (error) {
      console.error("Failed to remove API key:", error);
      setSaveError("Failed to remove API key. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Handle close modal
  const handleClose = () => {
    setSaveSuccess("");
    setSaveError("");
    // Clear form data
    setApiKeys({
      serpapi: "",
      searchapi: "",
      amadeus: "",
      openweather: "",
    });
    setShowApiKeys({
      serpapi: false,
      searchapi: false,
      amadeus: false,
      openweather: false,
    });
    onClose();
  };

  const toggleVisibility = (keyType) => {
    setShowApiKeys((prev) => ({
      ...prev,
      [keyType]: !prev[keyType],
    }));
  };

  const currentKeyType = keyTypes[activeTab];

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center">
          <ApiIcon sx={{ mr: 1 }} />
          API Key Management
        </Box>
      </DialogTitle>

      <DialogContent>
        {loading && (
          <Box display="flex" justifyContent="center" my={3}>
            <CircularProgress />
          </Box>
        )}

        {!loading && (
          <>
            {saveSuccess && (
              <Alert severity="success" sx={{ mb: 2 }}>
                {saveSuccess}
              </Alert>
            )}

            {saveError && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {saveError}
              </Alert>
            )}

            <Tabs
              value={activeTab}
              onChange={(e, newValue) => setActiveTab(newValue)}
              variant="scrollable"
              scrollButtons="auto"
              sx={{ mb: 3 }}
            >
              {keyTypes.map((keyType, index) => (
                <Tab
                  key={keyType.id}
                  label={
                    <Box display="flex" alignItems="center" gap={1}>
                      {keyType.name}
                      {existingKeys[keyType.id]?.exists && (
                        <Chip label="Saved" size="small" color="success" />
                      )}
                    </Box>
                  }
                />
              ))}
            </Tabs>

            <Box>
              <Typography variant="h6" gutterBottom>
                {currentKeyType.name} API Key
              </Typography>

              <Typography variant="body2" color="text.secondary" paragraph>
                {currentKeyType.description}
              </Typography>

              {existingKeys[currentKeyType.id]?.exists && (
                <Box sx={{ mb: 2 }}>
                  <Alert
                    severity="info"
                    action={
                      <Button
                        color="inherit"
                        size="small"
                        startIcon={<DeleteIcon />}
                        onClick={() => handleRemove(currentKeyType.id)}
                      >
                        Remove
                      </Button>
                    }
                  >
                    You have a saved {currentKeyType.name} API key.
                    {existingKeys[currentKeyType.id].lastUpdated && (
                      <Typography variant="caption" display="block">
                        Last updated:{" "}
                        {new Date(
                          existingKeys[currentKeyType.id].lastUpdated
                        ).toLocaleDateString()}
                      </Typography>
                    )}
                  </Alert>
                </Box>
              )}

              <TextField
                label={`${currentKeyType.name} API Key`}
                variant="outlined"
                fullWidth
                value={apiKeys[currentKeyType.id]}
                onChange={(e) =>
                  setApiKeys((prev) => ({
                    ...prev,
                    [currentKeyType.id]: e.target.value,
                  }))
                }
                margin="normal"
                type={showApiKeys[currentKeyType.id] ? "text" : "password"}
                placeholder={`Enter your ${currentKeyType.name} API key`}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => toggleVisibility(currentKeyType.id)}
                        edge="end"
                      >
                        {showApiKeys[currentKeyType.id] ? (
                          <VisibilityOffIcon />
                        ) : (
                          <VisibilityIcon />
                        )}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />

              <Box sx={{ mt: 2, mb: 2 }}>
                <Button
                  onClick={() => handleSave(currentKeyType.id)}
                  variant="contained"
                  color="primary"
                  disabled={loading || !apiKeys[currentKeyType.id].trim()}
                  sx={{ mr: 1 }}
                >
                  {loading ? <CircularProgress size={24} /> : "Save API Key"}
                </Button>
              </Box>

              <Divider sx={{ my: 2 }} />

              <Typography variant="body2" color="text.secondary" paragraph>
                Don&apos;t have a {currentKeyType.name} key?{" "}
                <a
                  href={currentKeyType.signupUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Sign up here
                </a>
              </Typography>

              <Typography variant="body2" color="info.main">
                Your API keys are stored securely and encrypted. They are never
                shared with other users.
              </Typography>
            </Box>
          </>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};

export default ApiKeysManager;

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
import { storeUserApiKey, getUserApiKey } from "../services/mongoDbClient";

/**
 * Component to manage API keys for external services
 * Stores keys securely in MongoDB database with user account
 */
const ApiKeysManager = ({ open, onClose, user }) => {
  const [apiKey, setApiKey] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [loading, setLoading] = useState(false);

  // Load saved API keys on component mount
  useEffect(() => {
    if (open && user) {
      setLoading(true);

      // Fetch API key from Supabase
      getUserApiKey(user.id)
        .then((apiKey) => {
          if (apiKey) {
            setApiKey(apiKey);
          }
          setLoading(false);
        })
        .catch((error) => {
          console.error("Failed to load API key:", error);
          setSaveError("Failed to load API key. Please try again.");
          setLoading(false);
        });
    }
  }, [open, user]);

  // Handle save
  const handleSave = async () => {
    if (!user) {
      setSaveError("You must be logged in to save API keys");
      return;
    }

    try {
      setLoading(true);
      setSaveSuccess(false);
      setSaveError("");

      await storeUserApiKey(user.id, apiKey);

      setSaveSuccess(true);
      setTimeout(() => {
        setSaveSuccess(false);
      }, 3000);
    } catch (error) {
      console.error("Failed to save API key:", error);
      setSaveError("Failed to save API key. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Handle close modal
  const handleClose = () => {
    setSaveSuccess(false);
    setSaveError("");
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
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
                API key saved successfully!
              </Alert>
            )}

            {saveError && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {saveError}
              </Alert>
            )}

            <Typography variant="subtitle1" gutterBottom>
              Your SerpAPI Key
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              Enter your SerpAPI key to enable real-time forex and flight data.
              Your key is stored securely in your account.
            </Typography>

            <TextField
              label="SerpAPI Key"
              variant="outlined"
              fullWidth
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              margin="normal"
              type={showApiKey ? "text" : "password"}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowApiKey(!showApiKey)}
                      edge="end"
                    >
                      {showApiKey ? <VisibilityOffIcon /> : <VisibilityIcon />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />

            <Typography
              variant="body2"
              color="text.secondary"
              paragraph
              sx={{ mt: 1 }}
            >
              Don't have a SerpAPI key?{" "}
              <a
                href="https://serpapi.com/register"
                target="_blank"
                rel="noopener noreferrer"
              >
                Sign up here
              </a>
              . SerpAPI provides access to Google Finance and Google Flights
              data.
            </Typography>

            <Divider sx={{ my: 2 }} />

            <Typography variant="body2" color="info.main">
              Your API key is stored securely and never shared with other
              users.
            </Typography>
          </>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose}>Close</Button>
        <Button
          onClick={handleSave}
          variant="contained"
          color="primary"
          disabled={loading}
        >
          {loading ? <CircularProgress size={24} /> : "Save"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ApiKeysManager;

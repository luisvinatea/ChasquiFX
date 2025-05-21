import React, { useState, useEffect } from "react";
import {
  Box,
  Alert,
  AlertTitle,
  IconButton,
  Collapse,
  CircularProgress,
  Tooltip,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import RefreshIcon from "@mui/icons-material/Refresh";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import WarningIcon from "@mui/icons-material/Warning";
import ErrorIcon from "@mui/icons-material/Error";
import chasquiApi from "../services/chasquiApi";

/**
 * ApiConnectionStatus Component
 *
 * Displays the current connection status to the backend API
 * and allows users to refresh the status
 */
const ApiConnectionStatus = ({ onStatusChange = () => {} }) => {
  const [open, setOpen] = useState(true);
  const [status, setStatus] = useState("checking");
  const [details, setDetails] = useState({});
  const [loading, setLoading] = useState(true);

  // Check API connection on component mount
  useEffect(() => {
    checkApiConnection();
    // Check connection every 5 minutes
    const interval = setInterval(checkApiConnection, 300000);
    return () => clearInterval(interval);
  }, []);

  // Function to check API connection status
  const checkApiConnection = async () => {
    setLoading(true);
    try {
      const apiStatus = await chasquiApi.systemService.getStatus();

      if (apiStatus.status === "healthy") {
        setStatus("connected");
      } else if (apiStatus.status === "limited" || apiStatus.quotaExceeded) {
        setStatus("limited");
      } else {
        setStatus("error");
      }

      setDetails(apiStatus);
      onStatusChange(apiStatus);
    } catch (error) {
      console.error("API connection error:", error);
      setStatus("error");
      setDetails({ message: "Failed to connect to the API" });
      onStatusChange({ status: "error" });
    } finally {
      setLoading(false);
    }
  };

  // Get alert properties based on status
  const getAlertProps = () => {
    switch (status) {
      case "connected":
        return {
          severity: "success",
          icon: <CheckCircleIcon />,
          title: "API Connected",
          message:
            details.message || "Successfully connected to the ChasquiFX API",
        };
      case "limited":
        return {
          severity: "warning",
          icon: <WarningIcon />,
          title: "API Limited",
          message:
            details.message ||
            "API connected with limited functionality (quota limits)",
        };
      case "error":
        return {
          severity: "error",
          icon: <ErrorIcon />,
          title: "API Connection Error",
          message: details.message || "Unable to connect to the ChasquiFX API",
        };
      case "checking":
      default:
        return {
          severity: "info",
          icon: <CircularProgress size={20} />,
          title: "Checking API Connection",
          message: "Verifying connection to the ChasquiFX API...",
        };
    }
  };

  const alertProps = getAlertProps();

  if (!open) {
    return (
      <Tooltip title="Show API status">
        <IconButton
          size="small"
          onClick={() => setOpen(true)}
          sx={{
            position: "fixed",
            bottom: 20,
            right: 20,
            backgroundColor:
              status === "connected"
                ? "success.main"
                : status === "limited"
                ? "warning.main"
                : "error.main",
            color: "white",
            "&:hover": {
              backgroundColor:
                status === "connected"
                  ? "success.dark"
                  : status === "limited"
                  ? "warning.dark"
                  : "error.dark",
            },
          }}
        >
          {alertProps.icon}
        </IconButton>
      </Tooltip>
    );
  }

  return (
    <Box sx={{ width: "100%", mb: 2 }}>
      <Collapse in={open}>
        <Alert
          severity={alertProps.severity}
          icon={alertProps.icon}
          action={
            <Box>
              <Tooltip title="Refresh status">
                <IconButton
                  aria-label="refresh"
                  color="inherit"
                  size="small"
                  onClick={checkApiConnection}
                  disabled={loading}
                >
                  <RefreshIcon fontSize="inherit" />
                </IconButton>
              </Tooltip>
              <IconButton
                aria-label="close"
                color="inherit"
                size="small"
                onClick={() => setOpen(false)}
              >
                <CloseIcon fontSize="inherit" />
              </IconButton>
            </Box>
          }
        >
          <AlertTitle>{alertProps.title}</AlertTitle>
          {alertProps.message}
          {details.quotaRemaining !== undefined && (
            <Box mt={1}>
              API quota remaining: {details.quotaRemaining} requests
            </Box>
          )}
        </Alert>
      </Collapse>
    </Box>
  );
};

export default ApiConnectionStatus;

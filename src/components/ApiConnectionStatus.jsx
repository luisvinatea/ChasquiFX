import React, { useState, useEffect, useCallback } from "react";
import {
  Box,
  Chip,
  CircularProgress,
  Tooltip,
  IconButton,
  Collapse,
  Alert,
  AlertTitle,
} from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import WarningIcon from "@mui/icons-material/Warning";
import ErrorIcon from "@mui/icons-material/Error";
import RefreshIcon from "@mui/icons-material/Refresh";
import CloseIcon from "@mui/icons-material/Close";
import chasquiApi from "../services/chasquiApi";

/**
 * ApiConnectionStatus Component
 *
 * Displays the current connection status to the backend API in a compact badge format
 * or detailed view depending on configuration
 */
const ApiConnectionStatus = ({
  initialStatus,
  onStatusChange = () => {},
  compactMode = true,
}) => {
  const [status, setStatus] = useState(initialStatus || "checking");
  const [details, setDetails] = useState({});
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(true);

  const checkApiConnection = useCallback(async () => {
    setLoading(true);
    try {
      const apiStatus = await chasquiApi.systemService.getStatus();
      setStatus(
        apiStatus.status === "ok" ? "connected" : apiStatus.status || "error"
      );
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
  }, [onStatusChange]);

  useEffect(() => {
    if (!initialStatus) {
      checkApiConnection();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialStatus]);

  // Get status properties for compact mode
  const getStatusProps = () => {
    if (status === true || status === "connected") {
      return {
        color: "success",
        icon: <CheckCircleIcon sx={{ fontSize: "14px" }} />,
        label: "API Online",
      };
    } else if (status === "limited") {
      return {
        color: "warning",
        icon: <WarningIcon sx={{ fontSize: "14px" }} />,
        label: "API Limited",
      };
    } else if (status === "checking") {
      return {
        color: "info",
        icon: <CircularProgress size={14} />,
        label: "Checking API",
      };
    } else {
      return {
        color: "error",
        icon: <ErrorIcon sx={{ fontSize: "14px" }} />,
        label: "API Offline",
      };
    }
  };

  // Get alert properties based on status for detailed mode
  const getAlertProps = () => {
    switch (status) {
      case "connected":
      case true:
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
      case false:
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

  const statusProps = getStatusProps();
  const alertProps = getAlertProps();

  // Render compact mode (chip)
  if (compactMode) {
    return (
      <Tooltip title={statusProps.label} arrow>
        <Chip
          icon={statusProps.icon}
          label="API"
          color={statusProps.color}
          variant="outlined"
          size="small"
          sx={{
            borderRadius: "16px",
            mr: 1,
            height: "28px",
            "& .MuiChip-label": {
              px: 1,
              fontWeight: 500,
              fontSize: "0.75rem",
            },
          }}
          onClick={checkApiConnection}
        />
      </Tooltip>
    );
  }

  // Render detailed mode (collapsed alert)
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
              status === "connected" || status === true
                ? "success.main"
                : status === "limited"
                ? "warning.main"
                : "error.main",
            color: "white",
            "&:hover": {
              backgroundColor:
                status === "connected" || status === true
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

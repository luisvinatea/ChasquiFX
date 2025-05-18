import React, { useState, useEffect } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Divider,
  Chip,
  CircularProgress,
} from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ErrorIcon from "@mui/icons-material/Error";
import MemoryIcon from "@mui/icons-material/Memory";
import StorageIcon from "@mui/icons-material/Storage";
import { forexService } from "../services/api";

/**
 * SystemStatus component displays the status of both Node.js API and Python Data Processing backends
 */
const SystemStatus = () => {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        setLoading(true);
        const result = await forexService.getStatus();
        setStatus(result);
        setError(null);
      } catch (err) {
        console.error("Error fetching system status:", err);
        setError("Failed to fetch system status. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    fetchStatus();
    // Refresh status every 60 seconds
    const interval = setInterval(fetchStatus, 60000);

    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="200px"
      >
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 2, bgcolor: "error.light", borderRadius: 1 }}>
        <Typography color="error" variant="body1">
          <ErrorIcon sx={{ mr: 1, verticalAlign: "middle" }} />
          {error}
        </Typography>
      </Box>
    );
  }

  return (
    <Card variant="outlined">
      <CardContent>
        <Typography variant="h6" gutterBottom>
          System Status
        </Typography>

        <Grid container spacing={2}>
          {/* Node.js API Backend Status */}
          <Grid item xs={12} md={6}>
            <Card variant="outlined" sx={{ bgcolor: "background.paper" }}>
              <CardContent>
                <Box display="flex" alignItems="center" mb={1}>
                  <MemoryIcon sx={{ mr: 1, color: "primary.main" }} />
                  <Typography variant="subtitle1">
                    Node.js API Backend
                  </Typography>
                </Box>
                <Divider sx={{ mb: 2 }} />

                <Box mb={1}>
                  <Typography
                    variant="body2"
                    component="span"
                    color="text.secondary"
                  >
                    Status:
                  </Typography>{" "}
                  <Chip
                    size="small"
                    icon={<CheckCircleIcon />}
                    label="Online"
                    color="success"
                    variant="outlined"
                  />
                </Box>

                <Box mb={1}>
                  <Typography
                    variant="body2"
                    component="span"
                    color="text.secondary"
                  >
                    Version:
                  </Typography>{" "}
                  <Typography variant="body2" component="span">
                    {status?.api_version || "1.0.0"}
                  </Typography>
                </Box>

                <Box mb={1}>
                  <Typography
                    variant="body2"
                    component="span"
                    color="text.secondary"
                  >
                    Response Time:
                  </Typography>{" "}
                  <Typography variant="body2" component="span">
                    {status?.response_time_ms || "0"} ms
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Python Data Processing Status */}
          <Grid item xs={12} md={6}>
            <Card variant="outlined" sx={{ bgcolor: "background.paper" }}>
              <CardContent>
                <Box display="flex" alignItems="center" mb={1}>
                  <StorageIcon sx={{ mr: 1, color: "secondary.main" }} />
                  <Typography variant="subtitle1">
                    Python Data Processing
                  </Typography>
                </Box>
                <Divider sx={{ mb: 2 }} />

                <Box mb={1}>
                  <Typography
                    variant="body2"
                    component="span"
                    color="text.secondary"
                  >
                    Status:
                  </Typography>{" "}
                  <Chip
                    size="small"
                    icon={
                      status?.python_service?.status === "available" ? (
                        <CheckCircleIcon />
                      ) : (
                        <ErrorIcon />
                      )
                    }
                    label={
                      status?.python_service?.status === "available"
                        ? "Online"
                        : "Unavailable"
                    }
                    color={
                      status?.python_service?.status === "available"
                        ? "success"
                        : "error"
                    }
                    variant="outlined"
                  />
                </Box>

                <Box mb={1}>
                  <Typography
                    variant="body2"
                    component="span"
                    color="text.secondary"
                  >
                    Python Version:
                  </Typography>{" "}
                  <Typography variant="body2" component="span">
                    {status?.python_service?.python_version || "Unknown"}
                  </Typography>
                </Box>

                <Box mb={1}>
                  <Typography
                    variant="body2"
                    component="span"
                    color="text.secondary"
                  >
                    SerpAPI Quota:
                  </Typography>{" "}
                  <Chip
                    size="small"
                    label={
                      status?.python_service?.serpapi_quota?.exceeded
                        ? "Exceeded"
                        : "Available"
                    }
                    color={
                      status?.python_service?.serpapi_quota?.exceeded
                        ? "warning"
                        : "success"
                    }
                    variant="outlined"
                  />
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        <Box mt={2} textAlign="right">
          <Typography variant="caption" color="text.secondary">
            Last updated: {new Date().toLocaleTimeString()}
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
};

export default SystemStatus;

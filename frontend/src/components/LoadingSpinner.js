import React from "react";
import { CircularProgress, Typography, Paper } from "@mui/material";

/**
 * Loading component to display during API calls and data fetching
 */
const LoadingSpinner = ({ message = "Loading data..." }) => {
  return (
    <Paper
      elevation={2}
      sx={{
        p: 3,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "200px",
        backgroundColor: "rgba(255, 255, 255, 0.9)",
      }}
    >
      <CircularProgress size={60} thickness={4} sx={{ mb: 2 }} />
      <Typography variant="h6" color="textSecondary">
        {message}
      </Typography>
      <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
        Please wait while we fetch the latest data...
      </Typography>
    </Paper>
  );
};

export default LoadingSpinner;

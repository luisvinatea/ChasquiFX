import { CircularProgress, Typography, Paper, Box } from "@mui/material";
import { keyframes } from "@mui/system";

const pulse = keyframes`
  0% {
    opacity: 0.6;
  }
  50% {
    opacity: 0.8;
  }
  100% {
    opacity: 0.6;
  }
`;

/**
 * Loading component to display during API calls and data fetching
 */
const LoadingSpinner = ({ message = "Loading data..." }) => {
  return (
    <Paper
      elevation={1}
      sx={{
        p: 4,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "240px",
        backgroundColor: "rgba(255, 255, 255, 0.95)",
        borderRadius: "16px",
        boxShadow: "0 4px 20px rgba(0, 0, 0, 0.06)",
        animation: `${pulse} 2s infinite ease-in-out`,
        border: "1px solid rgba(0, 0, 0, 0.03)",
      }}
    >
      <Box
        sx={{
          position: "relative",
          mb: 3,
        }}
      >
        <CircularProgress
          size={70}
          thickness={3.5}
          sx={{
            color: "primary.main",
            position: "relative",
            zIndex: 2,
          }}
        />
        <CircularProgress
          size={70}
          thickness={3.5}
          sx={{
            color: "secondary.main",
            position: "absolute",
            top: 0,
            left: 0,
            opacity: 0.2,
            zIndex: 1,
          }}
        />
      </Box>
      <Typography
        variant="h6"
        color="text.primary"
        sx={{
          fontWeight: 600,
          mb: 1,
        }}
      >
        {message}
      </Typography>
      <Typography
        variant="body2"
        color="text.secondary"
        sx={{
          textAlign: "center",
          maxWidth: "80%",
        }}
      >
        Please wait while we fetch the latest data and exchange rates...
      </Typography>
    </Paper>
  );
};

export default LoadingSpinner;

import React, { useState } from "react";
import {
  Box,
  Typography,
  TextField,
  Button,
  Paper,
  Tab,
  Tabs,
  Alert,
  CircularProgress,
} from "@mui/material";
import { useAuth } from "../contexts/AuthContext";

/**
 * Authentication component for login and signup
 * @param {Object} props - Component props
 * @param {Function} props.onAuthSuccess - Callback function when authentication is successful
 */
function AuthComponent({ onAuthSuccess }) {
  const { login, signup, error, isLoading, clearError } = useAuth();
  const [activeTab, setActiveTab] = useState(0);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [localError, setLocalError] = useState("");
  const [success, setSuccess] = useState("");

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
    setLocalError("");
    setSuccess("");
    clearError();
    // Clear form fields when switching tabs
    setEmail("");
    setPassword("");
    setName("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError("");
    setSuccess("");
    clearError();

    // Basic validation
    if (!email || !password) {
      setLocalError("Please fill in all required fields");
      return;
    }

    if (password.length < 8) {
      setLocalError("Password must be at least 8 characters long");
      return;
    }

    try {
      let result;
      if (activeTab === 0) {
        // Login
        result = await login(email, password);
      } else {
        // Sign up
        result = await signup(email, password, name);
      }

      if (result.success) {
        setSuccess(
          activeTab === 0
            ? "Successfully logged in!"
            : "Account created successfully! You are now logged in."
        );
        // Call onAuthSuccess callback
        if (onAuthSuccess) {
          onAuthSuccess(result.user);
        }
      } else {
        setLocalError(result.error || "Authentication failed");
      }
    } catch (error) {
      setLocalError(
        error.message || "An error occurred during authentication"
      );
    }
  };

  return (
    <Paper sx={{ p: 4, maxWidth: 500, mx: "auto", mt: 8 }}>
      <Typography variant="h4" align="center" gutterBottom>
        ChasquiFX
      </Typography>
      <Typography
        variant="subtitle1"
        align="center"
        color="text.secondary"
        gutterBottom
      >
        The smart forex travel companion
      </Typography>

      <Tabs
        value={activeTab}
        onChange={handleTabChange}
        centered
        sx={{ mb: 3 }}
      >
        <Tab label="Login" />
        <Tab label="Sign Up" />
      </Tabs>

      {(error || localError) && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error || localError}
        </Alert>
      )}
      {success && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {success}
        </Alert>
      )}

      <Box component="form" onSubmit={handleSubmit}>
        {activeTab === 1 && (
          <TextField
            label="Name (Optional)"
            type="text"
            fullWidth
            margin="normal"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter your full name"
          />
        )}
        <TextField
          label="Email"
          type="email"
          fullWidth
          margin="normal"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <TextField
          label="Password"
          type="password"
          fullWidth
          margin="normal"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          helperText={
            activeTab === 1
              ? "Password must be at least 8 characters with upper and lowercase letters and numbers"
              : ""
          }
        />
        <Button
          type="submit"
          variant="contained"
          fullWidth
          sx={{ mt: 3 }}
          disabled={isLoading}
        >
          {isLoading ? (
            <CircularProgress size={24} />
          ) : activeTab === 0 ? (
            "Login"
          ) : (
            "Sign Up"
          )}
        </Button>
      </Box>
    </Paper>
  );
}

export default AuthComponent;

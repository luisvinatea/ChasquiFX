import React from "react";
import { Dialog, DialogContent } from "@mui/material";
import AuthComponent from "./Auth";

/**
 * Modal wrapper for the AuthComponent
 */
function AuthModal({ open, onClose, onAuthSuccess }) {
  const handleAuthSuccess = (user) => {
    if (onAuthSuccess) {
      onAuthSuccess(user);
    }
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          p: 0,
          overflow: "hidden",
        },
      }}
    >
      <DialogContent sx={{ p: 0 }}>
        <AuthComponent onAuthSuccess={handleAuthSuccess} />
      </DialogContent>
    </Dialog>
  );
}

export default AuthModal;

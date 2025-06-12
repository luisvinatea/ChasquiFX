import { FC } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  TextField,
  Divider,
} from "@mui/material";

interface User {
  id: string;
  email: string;
  status?: boolean;
  // Add other properties as needed
}

interface ProfileDialogProps {
  open: boolean;
  onClose: () => void;
  user: User | null;
}

const ProfileDialog: FC<ProfileDialogProps> = ({ open, onClose, user }) => {
  if (!user) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>User Profile</DialogTitle>
      <DialogContent>
        <Box sx={{ py: 2 }}>
          <Typography variant="subtitle1" fontWeight="bold">
            User ID
          </Typography>
          <Typography variant="body2" sx={{ mb: 2 }}>
            {user.id}
          </Typography>

          <Typography variant="subtitle1" fontWeight="bold">
            Email
          </Typography>
          <Typography variant="body2" sx={{ mb: 2 }}>
            {user.email}
          </Typography>

          <Divider sx={{ my: 2 }} />

          <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 1 }}>
            Profile Settings
          </Typography>

          <TextField
            label="Display Name"
            defaultValue={user.email?.split("@")[0]}
            fullWidth
            margin="normal"
            size="small"
            disabled
            helperText="Feature coming soon"
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};

export default ProfileDialog;

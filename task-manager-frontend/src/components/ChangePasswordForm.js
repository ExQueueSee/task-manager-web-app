import React, { useState } from 'react';
import { Box, Button, TextField, Typography, Paper } from '@mui/material';
import { useAuth } from '../context/AuthContext';
import { updatePassword } from '../api';
import { useSnackbar } from 'notistack';

const ChangePasswordForm = () => {
  // Get authentication context and snackbar for notifications
  const { token, setToken, setUser } = useAuth();
  const { enqueueSnackbar } = useSnackbar();

  // State variables for form inputs and loading state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validation: Check if new passwords match
    if (newPassword !== confirmPassword) {
      enqueueSnackbar('New passwords do not match', { variant: 'error' });
      return;
    }
    
    // Validation: Check if new password is at least 7 characters long
    if (newPassword.length < 7) {
      enqueueSnackbar('Password must be at least 7 characters long', { variant: 'error' });
      return;
    }
    
    setLoading(true);
    try {
      // Call API to update password
      const response = await updatePassword(currentPassword, newPassword, token);
      
      // Update token in localStorage and context if returned
      if (response.data.token) {
        localStorage.setItem('token', response.data.token);
        setToken(response.data.token);
        setUser(response.data.user);
      }
      
      // Show success notification
      enqueueSnackbar('Password updated successfully', { variant: 'success' });
      
      // Clear form inputs
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      // Show error notification
      enqueueSnackbar(
        error.response?.data?.error || 'Failed to update password', 
        { variant: 'error' }
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Paper sx={{ p: 3, maxWidth: 500, mx: 'auto', mt: 4 }}>
      <Typography variant="h5" component="h2" gutterBottom>
        Change Password
      </Typography>
      
      <Box component="form" onSubmit={handleSubmit} noValidate sx={{ mt: 2 }}>
        {/* Current Password Input */}
        <TextField
          margin="normal"
          required
          fullWidth
          name="currentPassword"
          label="Current Password"
          type="password"
          id="currentPassword"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
        />
        {/* New Password Input */}
        <TextField
          margin="normal"
          required
          fullWidth
          name="newPassword"
          label="New Password"
          type="password"
          id="newPassword"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
        />
        {/* Confirm New Password Input */}
        <TextField
          margin="normal"
          required
          fullWidth
          name="confirmPassword"
          label="Confirm New Password"
          type="password"
          id="confirmPassword"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
        />
        {/* Submit Button */}
        <Button
          type="submit"
          fullWidth
          variant="contained"
          sx={{ mt: 3, mb: 2 }}
          disabled={loading}
        >
          {loading ? 'Updating...' : 'Change Password'}
        </Button>
      </Box>
    </Paper>
  );
};

export default ChangePasswordForm;
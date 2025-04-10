import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  Grid,
  Avatar,
  Divider,
  Alert,
  CircularProgress,
  Chip
} from '@mui/material';
import { styled } from '@mui/material/styles';
import { useAuth } from '../context/AuthContext';
import { useSnackbar } from 'notistack';
import { updateProfile, updatePassword, getUserRank } from '../api';
import useDocumentTitle from '../hooks/useDocumentTitle';
import StarIcon from '@mui/icons-material/Star';

const StyledPaper = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(4),
  maxWidth: 700,
  margin: '0 auto',
}));

const ProfileAvatar = styled(Avatar)(({ theme }) => ({
  width: theme.spacing(12),
  height: theme.spacing(12),
  fontSize: '2.5rem',
  backgroundColor: theme.palette.primary.main,
  margin: '0 auto',
  marginBottom: theme.spacing(2),
}));

const ProfilePage = () => {
  useDocumentTitle('Profile');
  
  const { user, token, setToken, setUser } = useAuth();
  const { enqueueSnackbar } = useSnackbar();
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [creditsData, setCreditsData] = useState({ credits: 0, rank: 0 });

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  useEffect(() => {
    const fetchCreditsData = async () => {
      try {
        const response = await getUserRank();
        setCreditsData(response.data);
      } catch (error) {
        console.error('Failed to fetch credits data:', error);
      }
    };
    
    fetchCreditsData();
  }, []);

  // Handle profile info update
  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    
    console.log("Sending update...");
    //console.log("Sending update:", { name: formData.name });
    
    try {
      const response = await updateProfile({ name: formData.name }, token);
      
      // Update token and user info
      if (response.data.token) {
        localStorage.setItem('token', response.data.token);
        setToken(response.data.token);
      }
      
      if (response.data.user) {
        setUser(response.data.user);
      }
      
      setSuccess('Profile updated successfully!');
      enqueueSnackbar('Profile updated successfully!', { variant: 'success' });
    } catch (error) {
      setError(error.response?.data?.error || 'Failed to update profile');
      enqueueSnackbar(error.response?.data?.error || 'Failed to update profile', { variant: 'error' });
      console.error('Profile update error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordUpdate = async (e) => {
    e.preventDefault();
    
    if (formData.newPassword !== formData.confirmPassword) {
      setError('New passwords do not match');
      return;
    }
    
    if (formData.newPassword.length < 7) {
      setError('Password must be at least 7 characters long');
      return;
    }
    
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const response = await updatePassword(
        formData.currentPassword, 
        formData.newPassword, 
        token
      );
      
      // Update token in localStorage and context if returned
      if (response.data.token) {
        localStorage.setItem('token', response.data.token);
        setToken(response.data.token);
        
        if (response.data.user) {
          setUser(response.data.user);
        }
      }
      
      setSuccess('Password updated successfully!');
      enqueueSnackbar('Password updated successfully!', { variant: 'success' });
      
      // Clear password fields
      setFormData({
        ...formData,
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Failed to update password';
      setError(errorMessage);
      enqueueSnackbar(errorMessage, { variant: 'error' });
      console.error('Password update error:', error);
    } finally {
      setLoading(false);
    }
  };

  // Get user initials for avatar
  const getInitials = () => {
    if (!user?.name) return '';
    return user.name
      .split(' ')
      .map((name) => name[0])
      .join('')
      .toUpperCase();
  };

  return (
    <StyledPaper elevation={2}>
      <ProfileAvatar>{getInitials()}</ProfileAvatar>
      
      <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, mb: 3 }}>
        <Chip
          icon={<StarIcon />}
          label={`${creditsData.credits} Credits`}
          color={creditsData.credits > 0 ? "primary" : "default"}
          variant="outlined"
        />
        <Chip
          label={`Rank #${creditsData.rank}`}
          color="secondary"
          variant="outlined"
        />
      </Box>

      <Typography variant="h4" align="center" gutterBottom>
        My Profile
      </Typography>
      
      <Typography 
        variant="subtitle1" 
        align="center" 
        
        color="text.secondary"
        gutterBottom
      >
        {user?.role === 'admin' ? 'Administrator' : 'User'}
      </Typography>

      {success && (
        <Alert severity="success" sx={{ my: 2 }} onClose={() => setSuccess('')}>
          {success}
        </Alert>
      )}

      {error && (
        <Alert severity="error" sx={{ my: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <Box component="form" onSubmit={handleProfileUpdate} sx={{ mt: 4 }}>
        <Typography variant="h6" gutterBottom>
          Personal Information
        </Typography>
        
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Full Name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              variant="outlined"
              autoComplete='off'
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Email Address"
              name="email"
              value={formData.email}
              onChange={handleChange}
              variant="outlined"
              disabled
              helperText="Email cannot be changed"
            />
          </Grid>
        </Grid>

        <Button
          type="submit"
          variant="contained"
          color="primary"
          sx={{ mt: 2 }}
          disabled={loading}
        >
          {loading ? <CircularProgress size={24} /> : 'Update Profile'}
        </Button>
      </Box>

      <Divider sx={{ my: 4 }} />

      <Box component="form" onSubmit={handlePasswordUpdate}>
        <Typography variant="h6" gutterBottom>
          Change Password
        </Typography>
        
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Current Password"
              name="currentPassword"
              type="password"
              value={formData.currentPassword}
              onChange={handleChange}
              variant="outlined"
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="New Password"
              name="newPassword"
              type="password"
              value={formData.newPassword}
              onChange={handleChange}
              variant="outlined"
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Confirm New Password"
              name="confirmPassword"
              type="password"
              value={formData.confirmPassword}
              onChange={handleChange}
              variant="outlined"
            />
          </Grid>
        </Grid>

        <Button
          type="submit"
          variant="contained"
          color="secondary"
          sx={{ mt: 2 }}
          disabled={loading}
        >
          {loading ? <CircularProgress size={24} /> : 'Change Password'}
        </Button>
      </Box>
    </StyledPaper>
  );
};

export default ProfilePage;
import React from 'react';
import { Box, Typography, Paper, Button } from '@mui/material';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import { useAuth } from '../context/AuthContext';
import useDocumentTitle from '../hooks/useDocumentTitle';

const PendingApprovalPage = () => {
  useDocumentTitle('Approval Pending');
  const { clearApprovalStatus } = useAuth();

  const handleBackToLogin = () => {
    // Completely reset approval status first
    clearApprovalStatus();
    
    // Force a page reload to clear any React Router state
    setTimeout(() => {
      window.location.replace('/login');
    }, 100);
  };

  return (
    <Box sx={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      minHeight: '100vh' 
    }}>
      <Paper 
        elevation={3} 
        sx={{ 
          p: 5, 
          textAlign: 'center', 
          maxWidth: 500 
        }}
      >
        <HourglassEmptyIcon sx={{ fontSize: 60, color: 'warning.main', mb: 2 }} />
        <Typography variant="h4" gutterBottom>
          Account Pending Approval
        </Typography>
        <Typography variant="body1" paragraph>
          Your account is currently pending approval by an administrator. You'll be able to login once your account has been approved.
        </Typography>
        <Typography variant="body2" color="text.secondary" paragraph>
          This typically takes at most 1-2 business days. Check back in regularly to see if your account has been approved.
        </Typography>
        <Button 
          onClick={handleBackToLogin} 
          variant="contained"
        >
          Back to Login
        </Button>
      </Paper>
    </Box>
  );
};

export default PendingApprovalPage;
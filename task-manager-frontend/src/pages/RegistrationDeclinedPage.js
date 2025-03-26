import React from 'react';
import { Box, Typography, Paper, Button } from '@mui/material';
import BlockIcon from '@mui/icons-material/Block';
import { useAuth } from '../context/AuthContext';
import useDocumentTitle from '../hooks/useDocumentTitle';

const RegistrationDeclinedPage = () => {
  useDocumentTitle('403 Forbidden');
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
        <BlockIcon sx={{ fontSize: 60, color: 'error.main', mb: 2 }} />
        <Typography variant="h4" gutterBottom>
          Registration Declined
        </Typography>
        <Typography variant="body1" paragraph>
          Your registration request has been declined by an administrator.
        </Typography>
        <Typography variant="body2" color="text.secondary" paragraph>
          If you believe this is an error, please contact the system administrator.
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

export default RegistrationDeclinedPage;
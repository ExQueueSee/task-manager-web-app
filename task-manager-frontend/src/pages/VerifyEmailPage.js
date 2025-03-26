import React, { useState, useEffect } from 'react';
import { 
  Box, Typography, Container, Paper, Avatar, CssBaseline, 
  CircularProgress, Alert, Button 
} from '@mui/material';
import MarkEmailReadIcon from '@mui/icons-material/MarkEmailRead';
import { useParams, useNavigate, Link as RouterLink } from 'react-router-dom';
import { verifyEmail } from '../api';
import useDocumentTitle from '../hooks/useDocumentTitle';

const VerifyEmailPage = () => {
  useDocumentTitle('Verify Email');
  const [verifying, setVerifying] = useState(true);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const { token } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    const verifyUserEmail = async () => {
      if (!token) {
        setError('No verification token provided.');
        setVerifying(false);
        return;
      }

      // Add a flag to prevent duplicate requests
      const hasAttemptedVerification = sessionStorage.getItem(`attempted_verification_${token}`);
      if (hasAttemptedVerification) {
        // Skip verification if already attempted
        setVerifying(false);
        return;
      }

      try {
        sessionStorage.setItem(`attempted_verification_${token}`, 'true');
        await verifyEmail(token);
        setSuccess(true);
        setError('');
      } catch (error) {
        setError(
          error.response?.data?.error || 
          'This verification link is invalid or has expired.'
        );
        setSuccess(false);
      } finally {
        setVerifying(false);
      }
    };

    verifyUserEmail();
  }, [token]);

  const handleContinue = () => {
    navigate('/login');
  };

  if (verifying) {
    return (
      <Container component="main" maxWidth="xs">
        <Box
          sx={{
            marginTop: 8,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          <CircularProgress />
          <Typography variant="body1" sx={{ mt: 2 }}>
            Verifying your email...
          </Typography>
        </Box>
      </Container>
    );
  }

  return (
    <Container component="main" maxWidth="xs">
      <CssBaseline />
      <Paper
        elevation={3}
        sx={{
          marginTop: 8,
          p: 4,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <Avatar sx={{ m: 1, bgcolor: success ? 'success.main' : 'error.main' }}>
          {success ? <MarkEmailReadIcon /> : <MarkEmailReadIcon />}
        </Avatar>
        <Typography component="h1" variant="h5">
          {success ? 'Email Verified' : 'Verification Failed'}
        </Typography>
        
        {error && (
          <Alert severity="error" sx={{ mt: 2, width: '100%' }}>
            {error}
          </Alert>
        )}
        
        {success && (
          <Alert severity="success" sx={{ mt: 2, width: '100%' }}>
            Your email has been verified successfully! Your account is now pending admin approval.
          </Alert>
        )}

        <Box sx={{ mt: 3, width: '100%', textAlign: 'center' }}>
          {success ? (
            <Button
              onClick={handleContinue}
              variant="contained"
              sx={{ mt: 2 }}
            >
              Continue to Login
            </Button>
          ) : (
            <Button
              component={RouterLink}
              to="/register"
              variant="contained"
              sx={{ mt: 2 }}
            >
              Back to Registration
            </Button>
          )}
        </Box>
      </Paper>
    </Container>
  );
};

export default VerifyEmailPage;
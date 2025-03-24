import React, { useEffect, useState } from 'react';
import { Box, Button, Typography, Container, Paper } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import useDocumentTitle from '../hooks/useDocumentTitle';
import { keyframes } from '@mui/system';

// Create floating animation
const float = keyframes`
  0% { transform: translateY(0px); }
  50% { transform: translateY(-15px); }
  100% { transform: translateY(0px); }
`;

const NotFoundPage = () => {
  useDocumentTitle('404 Not Found');
  const [randomFact, setRandomFact] = useState('');

  const facts = React.useMemo(() => [
    "The first computer bug was an actual bug - a moth trapped in a Harvard Mark II computer in 1947.",
    "The average person spends 6 months of their lifetime waiting at red lights.",
    "A jiffy is an actual unit of time: 1/100th of a second.",
    "The first message sent over the internet was 'LO'. The intended message was 'LOGIN' but the system crashed.",
    "The inventors of Google originally called their search engine 'BackRub'."
  ], []);

  useEffect(() => {
    const randomIndex = Math.floor(Math.random() * facts.length);
    setRandomFact(facts[randomIndex]);
  }, [facts]);

  return (
    <Container maxWidth="md">
      <Paper 
        elevation={3}
        sx={{
          mt: 10,
          p: 4,
          textAlign: 'center',
          borderRadius: 2,
          backgroundColor: 'rgba(255,255,255,0.9)',
          backdropFilter: 'blur(10px)',
        }}
      >
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
          }}
        >
          <Box
            sx={{
              animation: `${float} 3s ease-in-out infinite`,
              mb: 4,
            }}
          >
            <ErrorOutlineIcon sx={{ fontSize: 150, color: 'error.main' }} />
          </Box>
          
          <Typography variant="h1" component="h1" sx={{ fontWeight: 700, mb: 2 }}>
            404
          </Typography>
          
          <Typography variant="h4" component="h2" sx={{ mb: 4, fontWeight: 500 }}>
            Oops! Page not found
          </Typography>
          
          <Typography variant="body1" sx={{ mb: 4, maxWidth: '80%', mx: 'auto' }}>
            The page you're looking for doesn't exist or has been moved.
          </Typography>
          
          <Paper
            elevation={1}
            sx={{
              p: 2,
              mb: 4,
              maxWidth: '90%',
              backgroundColor: 'primary.light',
              color: 'primary.contrastText',
            }}
          >
            <Typography variant="body2">
              <strong>Random Fact:</strong> {randomFact}
            </Typography>
          </Paper>
          
          <Button
            component={RouterLink}
            to="/"
            variant="contained"
            size="large"
            sx={{ mb: 2 }}
          >
            Go Back Home
          </Button>
        </Box>
      </Paper>
    </Container>
  );
};

export default NotFoundPage;
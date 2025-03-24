import React from 'react';
import { Box } from '@mui/material';

const GlobalBackground = () => {
  return (
    <Box
      sx={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundImage: 'url(/images/globe_background.jpg)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        opacity: 1, // A bit more visible but still subtle
        zIndex: -999,
        pointerEvents: 'none',
        // Add a dark overlay to enhance readability
        '&::after': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(243, 226, 226, 0.07)', // Dark overlay
          zIndex: -998,
        }
      }}
    />
  );
};

export default GlobalBackground;
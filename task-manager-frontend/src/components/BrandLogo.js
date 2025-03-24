import React from 'react';
import { Box } from '@mui/material';

const BrandLogo = () => {
  return (
    <Box
      component="a"
      href="https://www.icterra.com"
      target="_blank"
      rel="noopener noreferrer"
      sx={{
        position: 'fixed',
        bottom: '20px',
        left: '20px',
        zIndex: 10,
        textDecoration: 'none',
      }}
    >
      <Box
        component="img"
        src="/images/ICTERRA_logo_04.svg"
        alt="ICTerra Logo"
        sx={{
          width: '120px',
          opacity: 0.8,
          filter: 'drop-shadow(0px 0px 5px rgba(0,0,0,0.2))',
          transition: 'all 0.3s ease',
          '&:hover': {
            opacity: 1,
            transform: 'scale(1.05)',
          }
        }}
      />
    </Box>
  );
};

export default BrandLogo;
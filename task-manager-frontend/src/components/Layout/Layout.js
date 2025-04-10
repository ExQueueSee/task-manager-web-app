import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { Box, Drawer, AppBar, Toolbar, IconButton, Typography, Divider, List, useMediaQuery, useTheme } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import DashboardIcon from '@mui/icons-material/Dashboard';
import TaskIcon from '@mui/icons-material/Task';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import LogoutIcon from '@mui/icons-material/Logout';
import PeopleIcon from '@mui/icons-material/People';
import AssignmentIcon from '@mui/icons-material/Assignment';
import LeaderboardIcon from '@mui/icons-material/Leaderboard';
import { styled } from '@mui/material/styles';

import NavItem from './NavItem';
import { useAuth } from '../../context/AuthContext';

// Width of the drawer - make it responsive with medium screen consideration
const getDrawerWidth = (screenWidth, isMedium) => {
  if (screenWidth < 400) return 200; // For very small screens
  if (isMedium) return 220; // For medium screens
  return 240; // Default width for large screens
};

// Custom styled AppBar component
const AppBarStyled = styled(AppBar, {
  shouldForwardProp: (prop) => prop !== 'open' && prop !== 'screenwidth' && prop !== 'ismedium',
})(({ theme, open, screenwidth, ismedium }) => ({
  zIndex: theme.zIndex.drawer + 1,
  transition: theme.transitions.create(['width', 'margin'], {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.leavingScreen,
  }),
  backdropFilter: 'blur(10px)',
  backgroundColor: theme.palette.mode === 'dark' 
    ? 'rgba(18, 18, 18, 0.8)' 
    : 'rgba(255, 255, 255, 0.8)',
  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05)',
  ...(open && {
    marginLeft: getDrawerWidth(screenwidth, ismedium),
    width: `calc(100% - ${getDrawerWidth(screenwidth, ismedium)}px)`,
    transition: theme.transitions.create(['width', 'margin'], {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.enteringScreen,
    }),
  }),
}));

// Custom styled Drawer component
const DrawerStyled = styled(Drawer, { 
  shouldForwardProp: (prop) => prop !== 'open' && prop !== 'screenwidth' && prop !== 'ismedium'
})(
  ({ theme, open, screenwidth, ismedium }) => ({
    '& .MuiDrawer-paper': {
      position: 'relative',
      whiteSpace: 'nowrap',
      width: getDrawerWidth(screenwidth, ismedium),
      backgroundColor: theme.palette.mode === 'dark' 
        ? 'rgba(30, 30, 30, 0.9)' 
        : 'rgba(255, 255, 255, 0.9)',
      backdropFilter: 'blur(10px)',
      boxShadow: '2px 0 20px rgba(0, 0, 0, 0.05)',
      transition: theme.transitions.create('width', {
        easing: theme.transitions.easing.sharp,
        duration: theme.transitions.duration.enteringScreen,
      }),
      boxSizing: 'border-box',
      ...(!open && {
        overflowX: 'hidden',
        transition: theme.transitions.create('width', {
          easing: theme.transitions.easing.sharp,
          duration: theme.transitions.duration.leavingScreen,
        }),
        width: theme.spacing(7),
        [theme.breakpoints.down('sm')]: {
          width: theme.spacing(0),
          padding: 0,
        },
        [theme.breakpoints.down('md')]: {
          width: theme.spacing(5),
        },
      }),
    },
  }),
);

// Custom styled Typography component for the logo text
const LogoText = styled(Typography)(({ theme }) => ({
  fontFamily: '"Montserrat", sans-serif',
  fontWeight: 700,
  background: 'linear-gradient(90deg, #2196f3 0%, #3f51b5 100%)',
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
  letterSpacing: '0.5px',
}));

const Layout = () => {
  // State to manage the drawer open/close status
  const [open, setOpen] = useState(true);
  const { user, logout } = useAuth();
  const theme = useTheme();
  const [screenWidth, setScreenWidth] = useState(window.innerWidth);
  
  // Use Material-UI's useMediaQuery for responsive behavior
  const isSmallScreen = useMediaQuery(theme.breakpoints.down('sm'));
  const isMediumScreen = useMediaQuery(theme.breakpoints.down('md'));
  const isExtraSmallScreen = useMediaQuery('(max-width:400px)');

  // Automatically collapse drawer on small screens
  useEffect(() => {
    const handleResize = () => {
      setScreenWidth(window.innerWidth);
      if (window.innerWidth < 960) {
        setOpen(false);
      } else if (window.innerWidth >= 1280) {
        setOpen(true);
      } else if (window.innerWidth >= 960 && window.innerWidth < 1280) {
        // For medium screens between 960-1280px, set partially open based on preference
        // This can be adjusted or connected to user preference
        setOpen(true);
      }
    };
    
    window.addEventListener('resize', handleResize);
    handleResize(); // Set initial state
    
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Function to toggle the drawer open/close status
  const toggleDrawer = () => {
    setOpen(!open);
  };

  return (
    <Box sx={{ display: 'flex' }}>
      {/* AppBar with custom styles - now passing isMediumScreen */}
      <AppBarStyled 
        position="absolute" 
        open={open} 
        screenwidth={screenWidth}
        ismedium={isMediumScreen}
      >
        <Toolbar
          sx={{
            pr: isSmallScreen ? '8px' : isMediumScreen ? '16px' : '24px',
            pl: isSmallScreen ? '16px' : isMediumScreen ? '16px' : undefined,
            height: isExtraSmallScreen ? '56px' : isMediumScreen ? '60px' : '64px',
          }}
        >
          {/* Menu button to toggle the drawer */}
          <IconButton
            edge="start"
            color="inherit"
            aria-label="open drawer"
            onClick={toggleDrawer}
            sx={{
              marginRight: isSmallScreen ? '16px' : isMediumScreen ? '24px' : '36px',
              ...(open && { display: 'none' }),
            }}
          >
            <MenuIcon />
          </IconButton>
          
          {/* Add the logo here */}
          <Box
            component="a"
            href="https://www.icterra.com"
            target="_blank"
            rel="noopener noreferrer"
            sx={{
              display: 'flex',
              alignItems: 'center',
              textDecoration: 'none',
            }}
          >
            <Box
              component="img"
              src="/images/ICTERRA_logo_04.svg"
              alt="ICTerra Logo"
              sx={{
                height: isSmallScreen ? 24 : isMediumScreen ? 27 : 30,
                mr: isSmallScreen ? 1 : isMediumScreen ? 1.5 : 2,
                transition: 'all 0.3s ease',
                '&:hover': {
                  transform: 'scale(1.05)',
                }
              }}
            />
          </Box>
          
          {/* Logo text - adaptive sizing for medium screens */}
          <LogoText
            component="h1"
            variant={isSmallScreen ? "h6" : isMediumScreen ? "h6" : "h5"}
            color="inherit"
            noWrap
            sx={{ 
              flexGrow: 1,
              display: isExtraSmallScreen ? 'none' : 'block',
              fontSize: isMediumScreen ? '1.15rem' : undefined
            }}
          >
            Task Manager
          </LogoText>
          
          {/* Logout button - adapt size for medium screens */}
          <IconButton 
            color="inherit" 
            onClick={logout}
            size={isSmallScreen ? "small" : isMediumScreen ? "medium" : "large"}
          >
            <LogoutIcon />
          </IconButton>
        </Toolbar>
      </AppBarStyled>
      
      {/* Drawer with custom styles - now passing isMediumScreen */}
      <DrawerStyled 
        variant="permanent" 
        open={open} 
        screenwidth={screenWidth}
        ismedium={isMediumScreen}
      >
        <Toolbar
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            px: [1],
            height: isExtraSmallScreen ? '56px' : isMediumScreen ? '60px' : '64px',
          }}
        >
          {/* Button to close the drawer - adapt size for medium screens */}
          <IconButton 
            onClick={toggleDrawer}
            size={isMediumScreen ? "small" : "medium"}
          >
            <ChevronLeftIcon />
          </IconButton>
        </Toolbar>
        <Divider />
        {/* Navigation items - adjust spacing and typography for medium screens */}
        <List component="nav" sx={{ 
          px: isSmallScreen ? 0 : isMediumScreen ? 0.5 : undefined,
          '& .MuiTypography-root': {
            fontSize: isMediumScreen ? '0.9rem' : undefined
          },
          '& .MuiListItemIcon-root': {
            minWidth: isMediumScreen ? '40px' : undefined
          }
        }}>
          <NavItem to="/" icon={<DashboardIcon />} text="Dashboard" />
          {/* Only show Tasks link for non-admin users */}
          {user && user.role !== 'admin' && (
            <NavItem to="/tasks" icon={<TaskIcon />} text="Tasks" />
          )}
          <NavItem to="/profile" icon={<AccountCircleIcon />} text="Profile" />
          
          <Divider sx={{ my: 1 }} />
          
          {user && (
            <Box sx={{ 
              px: isMediumScreen ? 1.5 : 2, 
              py: isMediumScreen ? 0.75 : 1 
            }}>
              <Typography 
                variant="subtitle2" 
                color="text.secondary"
                sx={{ fontSize: isMediumScreen ? '0.7rem' : undefined }}
              >
                Signed in as:
              </Typography>
              <Typography 
                variant="body2" 
                fontWeight="bold"
                sx={{ fontSize: isMediumScreen ? '0.8rem' : undefined }}
              >
                {user.name} ({user.role})
              </Typography>
            </Box>
          )}
          
          {user?.role === 'admin' && (
            <>
              <Divider sx={{ mt: 2, mb: 1 }} />
              <Typography 
                variant="overline" 
                sx={{ 
                  px: isMediumScreen ? 1.5 : 2, 
                  color: 'text.secondary',
                  fontSize: isMediumScreen ? '0.65rem' : undefined 
                }}
              >
                Admin
              </Typography>
              <NavItem to="/admin/users" icon={<PeopleIcon />} text="User Management" />
              <NavItem to="/admin/tasks" icon={<AssignmentIcon />} text="Task Management" />
              <NavItem to="/admin/leaderboard" icon={<LeaderboardIcon />} text="Leaderboard" />
            </>
          )}
        </List>
      </DrawerStyled>
      
      {/* Main content area with responsive padding for medium screens */}
      <Box
        component="main"
        sx={{
          backgroundColor: (theme) =>
            theme.palette.mode === 'light'
              ? 'rgba(245, 247, 250, 0.7)' 
              : 'rgba(18, 18, 18, 0.7)',
          flexGrow: 1,
          height: '100vh',
          overflow: 'auto',
          position: 'relative',
          zIndex: 1,
        }}
      >
        <Toolbar />
        <Box sx={{ 
          p: isExtraSmallScreen ? 1 : isSmallScreen ? 2 : isMediumScreen ? 2.5 : 3,
          mt: isExtraSmallScreen ? 1 : isMediumScreen ? 0.5 : 0 
        }}>
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
};

export default Layout;
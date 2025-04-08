import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Box, Drawer, AppBar, Toolbar, IconButton, Typography, Divider, List } from '@mui/material';
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

// Width of the drawer
const drawerWidth = 240;

// Custom styled AppBar component
const AppBarStyled = styled(AppBar, {
  shouldForwardProp: (prop) => prop !== 'open',
})(({ theme, open }) => ({
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
    marginLeft: drawerWidth,
    width: `calc(100% - ${drawerWidth}px)`,
    transition: theme.transitions.create(['width', 'margin'], {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.enteringScreen,
    }),
  }),
}));

// Custom styled Drawer component
const DrawerStyled = styled(Drawer, { shouldForwardProp: (prop) => prop !== 'open' })(
  ({ theme, open }) => ({
    '& .MuiDrawer-paper': {
      position: 'relative',
      whiteSpace: 'nowrap',
      width: drawerWidth,
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
        [theme.breakpoints.up('sm')]: {
          width: theme.spacing(9),
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

  // Function to toggle the drawer open/close status
  const toggleDrawer = () => {
    setOpen(!open);
  };

  return (
    <Box sx={{ display: 'flex' }}>
      {/* AppBar with custom styles */}
      <AppBarStyled position="absolute" open={open}>
        <Toolbar
          sx={{
            pr: '24px',
          }}
        >
          {/* Menu button to toggle the drawer */}
          <IconButton
            edge="start"
            color="inherit"
            aria-label="open drawer"
            onClick={toggleDrawer}
            sx={{
              marginRight: '36px',
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
                height: 30,
                mr: 2,
                transition: 'all 0.3s ease',
                '&:hover': {
                  transform: 'scale(1.05)',
                }
              }}
            />
          </Box>
          
          {/* Logo text */}
          <LogoText
            component="h1"
            variant="h5"
            color="inherit"
            noWrap
            sx={{ flexGrow: 1 }}
          >
            Task Manager
          </LogoText>
          {/* Logout button */}
          <IconButton color="inherit" onClick={logout}>
            <LogoutIcon />
          </IconButton>
        </Toolbar>
      </AppBarStyled>
      {/* Drawer with custom styles */}
      <DrawerStyled variant="permanent" open={open}>
        <Toolbar
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            px: [1],
          }}
        >
          {/* Button to close the drawer */}
          <IconButton onClick={toggleDrawer}>
            <ChevronLeftIcon />
          </IconButton>
        </Toolbar>
        <Divider />
        {/* Navigation items */}
        <List component="nav">
          <NavItem to="/" icon={<DashboardIcon />} text="Dashboard" />
          {/* Only show Tasks link for non-admin users */}
          {user && user.role !== 'admin' && (
            <NavItem to="/tasks" icon={<TaskIcon />} text="Tasks" />
          )}
          <NavItem to="/profile" icon={<AccountCircleIcon />} text="Profile" />
          
          <Divider sx={{ my: 1 }} />
          
          {user && (
            <Box sx={{ px: 2, py: 1 }}>
              <Typography variant="subtitle2" color="text.secondary">
                Signed in as:
              </Typography>
              <Typography variant="body2" fontWeight="bold">
                {user.name} ({user.role})
              </Typography>
            </Box>
          )}
          {user?.role === 'admin' && (
            <>
              <Divider sx={{ mt: 2, mb: 1 }} />
              <Typography variant="overline" sx={{ px: 2, color: 'text.secondary' }}>
                Admin
              </Typography>
              <NavItem to="/admin/users" icon={<PeopleIcon />} text="User Management" />
              <NavItem to="/admin/tasks" icon={<AssignmentIcon />} text="Task Management" />
              <NavItem to="/admin/leaderboard" icon={<LeaderboardIcon />} text="Leaderboard" />
            </>
          )}
        </List>
      </DrawerStyled>
      {/* Main content area */}
      <Box
        component="main"
        sx={{
          backgroundColor: (theme) =>
            theme.palette.mode === 'light'
              ? 'rgba(245, 247, 250, 0.7)' // Semi-transparent background
              : 'rgba(18, 18, 18, 0.7)',    // Semi-transparent dark background
          flexGrow: 1,
          height: '100vh',
          overflow: 'auto',
          position: 'relative', // Create a new stacking context
          zIndex: 1,            // Ensure it's above the background but below fixed elements
        }}
      >
        <Toolbar />
        <Box sx={{ p: 3 }}>
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
};

export default Layout;
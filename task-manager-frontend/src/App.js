import React, { useMemo, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme, CssBaseline } from '@mui/material';
import { SnackbarProvider } from 'notistack';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';

// Pages
import Dashboard from './pages/Dashboard';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import TasksPage from './pages/TasksPage';
import ProfilePage from './pages/ProfilePage';
import NotFoundPage from './pages/NotFoundPage';
import AdminUsersPage from './pages/AdminUsersPage';
import AdminTasksPage from './pages/AdminTasksPage';
import PendingApprovalPage from './pages/PendingApprovalPage';
import RegistrationDeclinedPage from './pages/RegistrationDeclinedPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import VerifyEmailPage from './pages/VerifyEmailPage';
import GlobalBackground from './components/GlobalBackground';
import BrandLogo from './components/BrandLogo';
import AdminLeaderboardPage from './pages/AdminLeaderboardPage';

// Context
import { AuthProvider, useAuth } from './context/AuthContext';
import { ColorModeProvider } from './context/ColorModeContext';

// Components
import Layout from './components/Layout/Layout';
import ProtectedRoute from './components/ProtectedRoute';

const AppContent = () => {
  const { token, user, approvalStatus, clearApprovalStatus } = useAuth();

  const theme = useMemo(() => createTheme({
    palette: {
      mode: 'dark', // Always dark instead of using the mode variable
      primary: {
        main: '#2196f3',
      },
      secondary: {
        main: '#ff9800',
      },
      background: {
        default: '#121212', // Dark background
        paper: '#1e1e1e', // Dark paper
      },
    },
    // Custom breakpoints for better device support
    breakpoints: {
      values: {
        xs: 0,      // Extra small devices
        sm: 600,    // Small devices
        md: 960,    // Medium devices
        lg: 1280,   // Large devices
        xl: 1920,   // Extra large devices
        // Custom breakpoints for specific device types
        fold: 350,  // For foldable devices in folded state (Galaxy Z Fold)
        mobile: 414, // Common mobile width (covers iPhone models)
        tablet: 768, // iPad mini and similar tablets
        laptop: 1024 // iPad Pro, Surface Pro and similar
      },
    },
    typography: {
      fontFamily: '"Poppins", "Roboto", "Helvetica", "Arial", sans-serif',
      h4: {
        fontWeight: 600,
      },
      h6: {
        fontWeight: 500,
      },
    },
    shape: {
      borderRadius: 8,
    },
    components: {
      MuiDialog: {
        styleOverrides: {
          paper: {
            margin: '16px',
            width: 'calc(100% - 32px)',
            maxWidth: '600px',
            // Ensure dialogs are accessible on small screens
            '@media (max-width:400px)': {
              margin: '8px',
              width: 'calc(100% - 16px)',
            },
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: 6,
            textTransform: 'none',
            fontWeight: 500,
            boxShadow: 'none',
            ':hover': {
              boxShadow: '0 4px 10px rgba(0, 0, 0, 0.1)',
            },
          },
          contained: {
            ':hover': {
              boxShadow: '0 6px 15px rgba(33, 150, 243, 0.2)',
            },
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          elevation1: {
            boxShadow: '0 2px 12px rgba(0, 0, 0, 0.07)',
          },
          elevation2: {
            boxShadow: '0 2px 14px rgba(0, 0, 0, 0.1)',
          },
          elevation3: {
            boxShadow: '0 3px 16px rgba(0, 0, 0, 0.1)',
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            transition: 'transform 0.2s, box-shadow 0.2s',
            ':hover': {
              transform: 'translateY(-4px)',
              boxShadow: '0 8px 20px rgba(0, 0, 0, 0.1)',
            },
          },
        },
      },
      MuiTableCell: {
        styleOverrides: {
          root: {
            // Make table cells more responsive
            '@media (max-width:600px)': {
              padding: '8px 6px',
            },
            '@media (max-width:400px)': {
              padding: '6px 4px',
              fontSize: '0.75rem',
            },
          },
        },
      },
    },
  }), []); // No dependencies since we don't change the mode anymore

  // Handle direct navigation to paths other than approval pages
  useEffect(() => {
    // If directly navigating to a route that's not an approval page
    // while we have an approval status set, we should clear it
    if (approvalStatus && 
        window.location.pathname !== '/pending-approval' && 
        window.location.pathname !== '/registration-declined') {
      clearApprovalStatus();
    }
  }, [approvalStatus, clearApprovalStatus]);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <GlobalBackground />
      {/* Only show the bottom logo on auth pages */}
      {!token && <BrandLogo />}
      <BrowserRouter>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/pending-approval" element={<PendingApprovalPage />} />
          <Route path="/registration-declined" element={<RegistrationDeclinedPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password/:token" element={<ResetPasswordPage />} />
          <Route path="/verify-email/:token" element={<VerifyEmailPage />} />
          
          {/* Protected routes */}
          <Route 
            path="/" 
            element={
              approvalStatus === 'pending' ? <Navigate to="/pending-approval" /> :
              approvalStatus === 'declined' ? <Navigate to="/registration-declined" /> :
              token ? <Layout /> : <Navigate to="/login" />
            }
          >
            <Route index element={<Dashboard />} />
            <Route 
              path="tasks" 
              element={
                <ProtectedRoute adminForbidden>
                  <TasksPage />
                </ProtectedRoute>
              } 
            />
            <Route path="profile" element={<ProfilePage />} />
            <Route path="admin">
              <Route 
                path="users" 
                element={user?.role === 'admin' ? <AdminUsersPage /> : <Navigate to="/" />} 
              />
              <Route 
                path="tasks" 
                element={
                  <ProtectedRoute isAdmin>
                    <AdminTasksPage />
                  </ProtectedRoute>
                } 
              />
              <Route path="/admin/leaderboard" element={<AdminLeaderboardPage />} />
            </Route>
          </Route>
          
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
};

const App = () => {
  return (
    <SnackbarProvider maxSnack={3}>
      <LocalizationProvider dateAdapter={AdapterDateFns}>
        <ColorModeProvider>
          <AuthProvider>
            <AppContent />
          </AuthProvider>
        </ColorModeProvider>
      </LocalizationProvider>
    </SnackbarProvider>
  );
};

export default App;
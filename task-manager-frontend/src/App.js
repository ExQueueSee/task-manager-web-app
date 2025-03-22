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

// Context
import { AuthProvider, useAuth } from './context/AuthContext';
import { ColorModeProvider, useColorMode } from './context/ColorModeContext';

// Components
import Layout from './components/Layout/Layout';
import ProtectedRoute from './components/ProtectedRoute';

const AppContent = () => {
  const { token, user, approvalStatus, clearApprovalStatus } = useAuth();
  const { mode } = useColorMode();
  
  const theme = useMemo(() => createTheme({
    palette: {
      mode,
      primary: {
        main: '#2196f3',
      },
      secondary: {
        main: '#ff9800',
      },
    },
  }), [mode]);

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
      <BrowserRouter>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/pending-approval" element={<PendingApprovalPage />} />
          <Route path="/registration-declined" element={<RegistrationDeclinedPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password/:token" element={<ResetPasswordPage />} />
          
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
            <Route path="tasks" element={<TasksPage />} />
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
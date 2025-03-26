import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ children, isAdmin = false, adminForbidden = false }) => {
  const { token, user, loading } = useAuth();
  
  // Wait for authentication to complete
  if (loading) {
    return <div>Loading...</div>;
  }
  
  // Not authenticated - redirect to login
  if (!token) {
    return <Navigate to="/login" />;
  }
  
  // Admin route but user is not admin - redirect to home
  if (isAdmin && user?.role !== 'admin') {
    return <Navigate to="/" />;
  }
  
  // Non-admin route that admins shouldn't access - redirect to admin area
  if (adminForbidden && user?.role === 'admin') {
    return <Navigate to="/admin/tasks" replace />;
  }
  
  // User is authenticated (and passes all role checks)
  return children;
};

export default ProtectedRoute;
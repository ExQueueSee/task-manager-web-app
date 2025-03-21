import React, { createContext, useState, useContext, useEffect } from 'react';
import { getUserProfile } from '../api';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  // Initialize state from localStorage
  const [token, setToken] = useState(localStorage.getItem('token') || null);
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('user')) || null);
  const [loading, setLoading] = useState(true);
  const [approvalStatus, setApprovalStatus] = useState(localStorage.getItem('approvalStatus') || null);

  const logout = () => {
    setToken('');
    setUser(null);
    localStorage.removeItem('token');
  };

  // Update login to reset approval status
  const login = (token, user) => {
    setToken(token);
    setUser(user);
    setApprovalStatus(null); // Reset approval status
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    localStorage.removeItem('approvalStatus'); // Clear approval status
  };

  // Clear approval status function
  const clearApprovalStatus = () => {
    // Remove from localStorage first
    localStorage.removeItem('approvalStatus');
    // Then update state
    setApprovalStatus(null);
  };

  // Update approval status functions to persist to localStorage
  const setPendingApproval = (value = 'pending') => {
    if (value === null) {
      clearApprovalStatus();
      return;
    }
    
    localStorage.setItem('approvalStatus', 'pending');
    setApprovalStatus('pending');
    // Clear auth data
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  };

  const setDeclinedApproval = () => {
    localStorage.setItem('approvalStatus', 'declined');
    setApprovalStatus('declined');
    // Clear auth data
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  };

  useEffect(() => {
    if (token) {
      localStorage.setItem('token', token);
      getUserProfile(token)
        .then(response => {
          setUser(response.data);
        })
        .catch(error => {
          console.error('Error getting user profile:', error);
          logout();
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, [token]);

  return (
    <AuthContext.Provider value={{ 
      token, 
      user, 
      login, 
      logout, 
      loading,
      isAuthenticated: !!token,
      isAdmin: user?.role === 'admin',
      setToken,  // Make sure these are exposed
      setUser,    // Make sure these are exposed
      approvalStatus,
      setPendingApproval,
      setDeclinedApproval,
      clearApprovalStatus
    }}>
      {children}
    </AuthContext.Provider>
  );
};
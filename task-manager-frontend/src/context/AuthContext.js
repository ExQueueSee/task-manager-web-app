import React, { createContext, useState, useContext, useEffect } from 'react';
import { getUserProfile } from '../api';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  // Check both localStorage and sessionStorage on initial load
  const getStoredToken = () => {
    return localStorage.getItem('token') || sessionStorage.getItem('token') || null;
  };
  
  const getStoredUser = () => {
    const userFromLocal = localStorage.getItem('user');
    const userFromSession = sessionStorage.getItem('user');
    return userFromLocal ? JSON.parse(userFromLocal) : 
           userFromSession ? JSON.parse(userFromSession) : null;
  };
  
  const [token, setToken] = useState(getStoredToken());
  const [user, setUser] = useState(getStoredUser());
  const [loading, setLoading] = useState(true);
  const [approvalStatus, setApprovalStatus] = useState(
    localStorage.getItem('approvalStatus') || sessionStorage.getItem('approvalStatus') || null
  );

  // Login with remember me option
  const login = (token, user, rememberMe = false) => {
    setToken(token);
    setUser(user);
    
    console.log('Login with remember me:', rememberMe); // Add logging
    
    // Clear both storages first to avoid any issues
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('user');
    
    // Then store in the appropriate storage
    if (rememberMe) {
      console.log('Storing in localStorage'); // Add logging
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
    } else {
      console.log('Storing in sessionStorage'); // Add logging
      sessionStorage.setItem('token', token);
      sessionStorage.setItem('user', JSON.stringify(user));
    }
    setApprovalStatus(null); // Reset approval status
    localStorage.removeItem('approvalStatus'); // Clear approval status
    sessionStorage.removeItem('approvalStatus'); // Clear approval status
  };

  // Logout function - clear both storages
  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('user');
  };

  // Approval status functions
  const setPendingApproval = () => {
    setApprovalStatus('pending');
    sessionStorage.setItem('approvalStatus', 'pending');
    localStorage.setItem('approvalStatus', 'pending');
    // Clear auth data
    logout();
  };

  const setDeclinedApproval = () => {
    setApprovalStatus('declined');
    sessionStorage.setItem('approvalStatus', 'declined');
    localStorage.setItem('approvalStatus', 'declined');
    // Clear auth data
    logout();
  };

  const clearApprovalStatus = () => {
    setApprovalStatus(null);
    localStorage.removeItem('approvalStatus');
    sessionStorage.removeItem('approvalStatus');
  };

  useEffect(() => {
    if (token) {
      getUserProfile()  // Don't pass token, let interceptor handle it
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

  // Add this useEffect to validate token on page load
  useEffect(() => {
    const validateToken = async () => {
      // If we're in a new browser session, only check localStorage
      // (sessionStorage would be empty in a new session)
      const isNewSession = !sessionStorage.getItem('token');
      
      // If this is a new session and remember me wasn't checked (no localStorage token)
      // then we shouldn't try to auto login
      if (isNewSession && !localStorage.getItem('token')) {
        return;
      }
      
      try {
        // Try to fetch the user profile to verify token validity
        const response = await getUserProfile();
        setUser(response.data);
        console.log('Token is valid');
      } catch (error) {
        console.log('Invalid token, clearing storage');
        // If token is invalid, clear storage
        logout();
      }
    };
    
    validateToken();
  }, []); // Run only on component mount

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
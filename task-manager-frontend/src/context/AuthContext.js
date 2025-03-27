import React, { createContext, useState, useContext, useEffect } from 'react';
import { getUserProfile } from '../api';

// Create a context for authentication
const AuthContext = createContext();

// Custom hook to use the AuthContext
export const useAuth = () => useContext(AuthContext);

// AuthProvider component to provide auth context to its children
export const AuthProvider = ({ children }) => {
  // Function to get token from localStorage or sessionStorage
  const getStoredToken = () => {
    return localStorage.getItem('token') || sessionStorage.getItem('token') || null;
  };
  
  // Function to get user from localStorage or sessionStorage
  const getStoredUser = () => {
    const userFromLocal = localStorage.getItem('user');
    const userFromSession = sessionStorage.getItem('user');
    return userFromLocal ? JSON.parse(userFromLocal) : 
           userFromSession ? JSON.parse(userFromSession) : null;
  };
  
  // State to store token
  const [token, setToken] = useState(getStoredToken());
  // State to store user
  const [user, setUser] = useState(getStoredUser());
  // State to manage loading state
  const [loading, setLoading] = useState(true);
  // State to store approval status
  const [approvalStatus, setApprovalStatus] = useState(
    localStorage.getItem('approvalStatus') || sessionStorage.getItem('approvalStatus') || null
  );

  // Function to handle login with remember me option
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
      //console.log('Storing in localStorage'); // Add logging
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
    } else {
      //console.log('Storing in sessionStorage'); // Add logging
      sessionStorage.setItem('token', token);
      sessionStorage.setItem('user', JSON.stringify(user));
    }
    setApprovalStatus(null); // Reset approval status
    localStorage.removeItem('approvalStatus'); // Clear approval status
    sessionStorage.removeItem('approvalStatus'); // Clear approval status
  };

  // Function to handle logout - clear both storages
  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('user');
  };

  // Function to set approval status to pending
  const setPendingApproval = () => {
    setApprovalStatus('pending');
    sessionStorage.setItem('approvalStatus', 'pending');
    localStorage.setItem('approvalStatus', 'pending');
    // Clear auth data
    logout();
  };

  // Function to set approval status to declined
  const setDeclinedApproval = () => {
    setApprovalStatus('declined');
    sessionStorage.setItem('approvalStatus', 'declined');
    localStorage.setItem('approvalStatus', 'declined');
    // Clear auth data
    logout();
  };

  // Function to clear approval status
  const clearApprovalStatus = () => {
    setApprovalStatus(null);
    localStorage.removeItem('approvalStatus');
    sessionStorage.removeItem('approvalStatus');
  };

  // Effect to fetch user profile if token is present
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

  // Effect to validate token on page load
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
import axios from 'axios';

const API_URL = 'http://localhost:3000';  // Corrected backend port

const api = axios.create({
  baseURL: API_URL,
});

// New axios instance for email verification
const VERIFY_API_URL = 'http://localhost:3000';
const verifyApi = axios.create({ baseURL: VERIFY_API_URL });

// In api.js
api.interceptors.request.use(
  config => {
    // Check both localStorage and sessionStorage
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      
      // uncomment for debug purposes
      //console.log('Sending request with token:', token.substring(0, 10) + '...');
    }
    return config;
  },
  error => Promise.reject(error)
);

api.interceptors.response.use(
  response => response,
  error => {
    // Handle token expiration
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('token');
      sessionStorage.removeItem('token');
      localStorage.removeItem('user');
      sessionStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Authentication endpoints
export const registerUser = (userData) => api.post('/users', userData);
export const loginUser = (email, password) => {
  // Make sure you're sending the correct data structure
  return api.post('/users/login', { email, password });
};
export const getUserProfile = () => {
  // Don't add authorization headers here - let the interceptor handle it
  return api.get('/users/me');
};

// Task endpoints
export const getTasks = () => api.get('/tasks');

export const getTaskById = (taskId) => api.get(`/tasks/${taskId}`);

export const createTask = (taskData) => api.post('/tasks', taskData);

export const updateTask = (taskId, taskData) => api.patch(`/tasks/${taskId}`, taskData);

export const deleteTask = (taskId) => api.delete(`/tasks/${taskId}`);

// Remove the token parameters from these functions and let the interceptor handle authentication

// Admin endpoints
export const getAllUsers = () => api.get('/users');

export const getAllTasks = () => api.get('/tasks/all');

export const updateUser = (userId, userData) => api.patch(`/users/${userId}`, userData);

export const deleteUser = (userId) => api.delete(`/users/${userId}`);

export const assignTask = (taskId, userId) => api.patch(`/tasks/${taskId}/assign`, { userId });

export const changeTaskVisibility = (taskId, visibility) => api.patch(`/tasks/${taskId}/visibility`, { visibility });

// Update user approval status
export const updateUserApproval = (userId, approvalStatus) => api.patch(
    `/users/${userId}/approval`,
    { approvalStatus }
);

// Also update these functions
export const updatePassword = async (currentPassword, newPassword) => {
  return api.patch('/users/me/password', { currentPassword, newPassword });
};

// Update user profile
export const updateProfile = (userData) => api.patch('/users/me', userData);

// Request password reset
export const requestPasswordReset = (email) => {
  return api.post('/users/reset-password-request', { email });
};

// Verify reset token
export const verifyResetToken = (token) => {
  return api.get(`/users/verify-reset-token/${token}`);
};

// Reset password with token
export const resetPassword = (token, password) => {
  return api.post('/users/reset-password', { token, password });
};

// Add this new function to your API file

// Verify email with token
export const verifyEmail = async (token) => {
  console.log('Sending verification request...');
  //console.log('Sending verification request with token:', token);
  return verifyApi.get(`/users/verify-email/${token}`);
};

export default api;
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
  // send login request to the backend
  return api.post('/users/login', { email, password });
};
export const getUserProfile = () => {
    // Let the interceptor handle the token
  return api.get('/users/me');
};

// Task endpoints
export const getTasks = async (token) => {
  try {
    const response = await fetch('http://localhost:3000/tasks', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch tasks');
    }
    
    const data = await response.json();
    
    // Return a consistent format
    return {
      data: Array.isArray(data) ? data : (data.tasks || data.results || [])
    };
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
};

export const getTaskById = (taskId) => api.get(`/tasks/${taskId}`);

/**
 * Creates a new task with optional file attachment
 * @param {Object} taskData - Task data object
 * @param {File} attachment - Optional file attachment
 * @param {string} token - Authentication token
 * @returns {Promise} - API response
 */
export const createTask = async (taskData, attachment, token) => {
  if (attachment) {
    // Use FormData for file upload
    const formData = new FormData();
    
    // Add task data
    Object.keys(taskData).forEach(key => {
      if (key === 'visibleTo' && Array.isArray(taskData[key])) {
        taskData[key].forEach(id => formData.append('visibleTo[]', id));
      } else {
        formData.append(key, taskData[key]);
      }
    });
    
    // Add file attachment
    formData.append('attachment', attachment);
    
    // Send request with token
    return api.post('/tasks', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
        Authorization: `Bearer ${token}`
      }
    });
  } else {
    // Send request without file attachment
    return api.post('/tasks', taskData, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
  }
};

export const updateTask = (taskId, taskData) => api.patch(`/tasks/${taskId}`, taskData);

export const deleteTask = (taskId) => api.delete(`/tasks/${taskId}`);

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

// Update user password
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


// Verify email with token
export const verifyEmail = async (token) => {
  console.log('Sending verification request...');
  //console.log('Sending verification request with token:', token);
  return verifyApi.get(`/users/verify-email/${token}`);
};

// Get current user's rank and credits
export const getUserRank = () => api.get('/users/me/rank');

// Get the full leaderboard
export const getLeaderboard = () => {
  return api.get('/users/leaderboard');
};

export const exportTasks = async (filterType) => {
  try {
    // Axios with responseType: 'blob' for binary data
    const response = await api.get(`/tasks/export?filter=${filterType}`, {
      responseType: 'blob'
    });
    
    // Create a filename
    const filename = `tasks_${filterType}_${Date.now()}.xlsx`;
    
    // Create a blob from the response data
    const blob = new Blob([response.data], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });
    
    // Create a download link
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    
    // Trigger download
    document.body.appendChild(a);
    a.click();
    
    // Clean up
    setTimeout(() => {
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    }, 100);
    
    return true;
  } catch (error) {
    console.error('Export error:', error);
    throw error;
  }
};

export default api;
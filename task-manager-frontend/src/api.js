import axios from 'axios';

const API_URL = 'http://localhost:3000';  // Backend port

const api = axios.create({
  baseURL: API_URL,
});

// In api.js
api.interceptors.request.use(
  config => {
    // Check both localStorage and sessionStorage
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
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

// Add these admin-specific functions

// Admin endpoints
export const getAllUsers = () => api.get('/users');

export const getAllTasks = () => api.get('/tasks/all');

export const updateUser = (userId, userData, token) => api.patch(`/users/${userId}`, userData, {
  headers: {
    Authorization: `Bearer ${token}`
  }
});

export const deleteUser = (userId, token) => api.delete(`/users/${userId}`, {
  headers: {
    Authorization: `Bearer ${token}`
  }
});

export const assignTask = (taskId, userId, token) => api.patch(`/tasks/${taskId}/assign`, { userId }, {
  headers: {
    Authorization: `Bearer ${token}`
  }
});

export const changeTaskVisibility = (taskId, visibility, token) => api.patch(`/tasks/${taskId}/visibility`, { visibility }, {
  headers: {
    Authorization: `Bearer ${token}`
  }
});

// Update user approval status
export const updateUserApproval = (userId, approvalStatus, token) => api.patch(
    `/users/${userId}/approval`,
    { approvalStatus },
    {
        headers: {
            Authorization: `Bearer ${token}`
        }
    }
);

// In your API client
export const updatePassword = async (currentPassword, newPassword, token) => {
  return api.patch('/users/me/password', 
    { currentPassword, newPassword }, 
    {
      headers: {
        Authorization: `Bearer ${token}`
      }
    }
  );
};

// Update user profile
export const updateProfile = (userData, token) => api.patch('/users/me', 
  userData, 
  {
    headers: {
      Authorization: `Bearer ${token}`
    }
  }
);

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



export default api;
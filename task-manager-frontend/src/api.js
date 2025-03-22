import axios from 'axios';

const API_URL = 'http://localhost:3000';  // Backend port

const api = axios.create({
  baseURL: API_URL,
});

// Authentication endpoints
export const registerUser = (userData) => api.post('/users', userData);
export const loginUser = (email, password) => {
  // Make sure you're sending the correct data structure
  return api.post('/users/login', { email, password });
};
export const getUserProfile = (token) => api.get('/users/me', {
  headers: {
    Authorization: `Bearer ${token}`
  }
});

// Task endpoints
export const getTasks = (token) => api.get('/tasks', {
  headers: {
    Authorization: `Bearer ${token}`
  }
});

export const getTaskById = (taskId, token) => api.get(`/tasks/${taskId}`, {
  headers: {
    Authorization: `Bearer ${token}`
  }
});

export const createTask = (taskData, token) => api.post('/tasks', taskData, {
  headers: {
    Authorization: `Bearer ${token}`
  }
});

export const updateTask = (taskId, taskData, token) => api.patch(`/tasks/${taskId}`, taskData, {
  headers: {
    Authorization: `Bearer ${token}`
  }
});

export const deleteTask = (taskId, token) => api.delete(`/tasks/${taskId}`, {
  headers: {
    Authorization: `Bearer ${token}`
  }
});

// Add these admin-specific functions

// Admin endpoints
export const getAllUsers = (token) => api.get('/users', {
  headers: {
    Authorization: `Bearer ${token}`
  }
});

export const getAllTasks = (token) => api.get('/tasks/all', {
  headers: {
    Authorization: `Bearer ${token}`
  }
});

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

// Error interceptor
api.interceptors.response.use(
  response => response,
  error => {
    // Handle token expiration
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
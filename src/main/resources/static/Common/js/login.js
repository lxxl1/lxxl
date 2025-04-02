import axios from "https://cdn.jsdelivr.net/npm/axios/+esm";
import { API_URL } from './config.js';

/**
 * User login function
 * @param {string} username - username
 * @param {string} password - password
 * @param {string} role - user role (ADMIN or USER)
 * @returns {Promise} - axios response promise
 */
export const login = async (username, password, role) => {
  // Validate parameters
  if (!username || !password || !role) {
    return {
      code: '0',
      msg: 'Please fill in all login information'
    };
  }

  console.log('Login attempt with:', { username, role }); // Log login attempt
  
  try {
    // Build request body matching the Account object
    const requestData = {
      username: username,
      password: password,
      role: role
    };
    
    console.log('Sending request to:', `${API_URL}/login`);
    console.log('Request data:', requestData);
    
    const response = await axios.post(`${API_URL}/login`, requestData);
    
    console.log('Raw backend response:', response);
    console.log('Backend response data:', response.data);
    
    // Store user data if login successful
    if (response.data && response.data.code === '200') {
      console.log('Login successful, storing user data');
      const userData = response.data.data;
      
      // Log what we're storing
      console.log('User data to store:', userData);
      
      try {
        localStorage.setItem('user', JSON.stringify(userData));
        localStorage.setItem('token', userData.token);
        localStorage.setItem('role', userData.role || role);
        console.log('User data stored successfully');
      } catch (storageError) {
        console.error('Error storing user data:', storageError);
      }
    } else {
      console.log('Login failed, server returned:', response.data);
    }
    
    // Return consistent response format to the caller
    return response.data;
  } catch (error) {
    console.error('Login request error:', error);
    if (error.response) {
      console.error('Error response data:', error.response.data);
      console.error('Error response status:', error.response.status);
      return error.response.data;
    }
    return {
      code: '0',
      msg: 'Login failed, please try again later'
    };
  }
};

/**
 * User registration function
 * @param {string} username - username (at least 4 characters)
 * @param {string} password - password (at least 8 characters)
 * @param {string} name - user's name
 * @param {string} role - user role (ADMIN or USER)
 * @returns {Promise} - axios response promise
 */
export const register = async (username, password, name, role) => {
  try {
    const response = await axios.post(`${API_URL}/register`, {
      username,
      password,
      name,
      role
    });
    
    return response.data;
  } catch (error) {
    console.error('Registration error:', error);
    if (error.response && error.response.data) {
      return error.response.data;
    }
    return {
      code: '0',
      msg: 'Registration failed, please try again later'
    };
  }
};

/**
 * Update password function
 * @param {string} username - username
 * @param {string} password - current password
 * @param {string} newPassword - new password
 * @param {string} role - user role (ADMIN or USER)
 * @returns {Promise} - axios response promise
 */
export const updatePassword = async (username, password, newPassword, role) => {
  try {
    const response = await axios.put(`${API_URL}/updatePassword`, {
      username,
      password,
      newPassword,
      role
    });
    
    return response.data;
  } catch (error) {
    console.error('Password update error:', error);
    if (error.response && error.response.data) {
      return error.response.data;
    }
    return {
      code: '0',
      msg: 'Password update failed, please try again later'
    };
  }
};

/**
 * Check if user is logged in
 * @returns {boolean} - true if user is logged in
 */
export const isLoggedIn = () => {
  const token = localStorage.getItem('token');
  return !!token;
};

/**
 * Get current logged in user
 * @returns {Object|null} - user object or null if not logged in
 */
export const getCurrentUser = () => {
  const user = localStorage.getItem('user');
  return user ? JSON.parse(user) : null;
};

/**
 * Logout function - removes user from local storage
 */
export const logout = () => {
  localStorage.removeItem('user');
  localStorage.removeItem('token');
  localStorage.removeItem('role');
};

import axios from "https://cdn.jsdelivr.net/npm/axios/+esm";
import { API_URL } from './config.js';
import api, { apiService } from './api.js';

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

  // console.log('Login attempt with:', { username, role }); // Log login attempt
  
  try {
    // Use apiService for login
    const response = await apiService.login(username, password, role);
    
    // console.log('Backend response data:', response);
    
    // Store user data if login successful
    if (response && response.code === '200') {
      // console.log('Login successful, storing user data');
      const userData = response.data;
      
      // Ensure role is set in the user object
      userData.role = role; // Explicitly set role from the login form
      
      // Log what we're storing
      // console.log('User data to store with added role:', userData);
      
      try {
        localStorage.setItem('user', JSON.stringify(userData));
        localStorage.setItem('token', userData.token);
        localStorage.setItem('role', role); // Store role separately too
        // console.log('User data stored successfully');
      } catch (storageError) {
        // console.error('Error storing user data:', storageError);
      }
    } else {
      // console.log('Login failed, server returned:', response);
    }
    
    // Return consistent response format to the caller
    return response;
  } catch (error) {
    // console.error('Login request error:', error);
    if (error.response && error.response.data) {
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
    // Use apiService for registration
    return await apiService.register({
      username,
      password,
      name,
      role
    });
  } catch (error) {
    // console.error('Registration error:', error);
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
    // Use apiService to update password
    return await apiService.updatePassword({
      username,
      password,
      newPassword,
      role
    });
  } catch (error) {
    // console.error('Password update error:', error);
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

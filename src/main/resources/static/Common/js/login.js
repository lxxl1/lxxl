import * as axios from 'https://cdn.jsdelivr.net/npm/axios/dist/axios.min.js';
import { API_URL } from './config.js';

/**
 * User login function
 * @param {string} username - username
 * @param {string} password - password
 * @param {string} role - user role (ADMIN or USER)
 * @returns {Promise} - axios response promise
 */
export const login = async (username, password, role) => {
  try {
    const response = await axios.post(`${API_URL}/login`, {
      username,
      password,
      role
    });
    
    // Store token or user data if needed
    if (response.data.code === '1') {
      localStorage.setItem('user', JSON.stringify(response.data.data));
    }
    
    return response.data;
  } catch (error) {
    console.error('Login error:', error);
    throw error;
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
    throw error;
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
    throw error;
  }
};

/**
 * Check if user is logged in
 * @returns {boolean} - true if user is logged in
 */
export const isLoggedIn = () => {
  const user = localStorage.getItem('user');
  return !!user;
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
};

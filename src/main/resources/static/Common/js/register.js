// 正确方式：使用默认导入（需确认CDN支持）

import axios from "https://cdn.jsdelivr.net/npm/axios/+esm";
import { API_URL } from './config.js';



/**
 * Validates a username
 * @param {string} username - username to validate
 * @returns {Object} - validation result with isValid and message
 */
export const validateUsername = (username) => {
  if (!username) {
    return { isValid: false, message: 'Username is required' };
  }

  if (username.length < 4) {
    return { 
      isValid: false, 
      message: 'User account is too short, account length needs to be at least 4 characters' 
    };
  }

  // Check for special characters
  const validPattern = /[`~!@#$%^&*()+=|{}':;',\[\].<>/?~！@#￥%……&*（）——+|{}【】'；：""'。，、？]/;
  if (validPattern.test(username)) {
    return { 
      isValid: false, 
      message: 'The username contains illegal characters. Please avoid using special characters in the username' 
    };
  }

  return { isValid: true, message: '' };
};

/**
 * Validates a password
 * @param {string} password - password to validate
 * @returns {Object} - validation result with isValid and message
 */
export const validatePassword = (password) => {
  if (!password) {
    return { isValid: false, message: 'Password is required' };
  }

  if (password.length < 8) {
    return { 
      isValid: false, 
      message: 'The user password is too short. Password length must be at least 8 characters' 
    };
  }

  return { isValid: true, message: '' };
};

/**
 * Validates an email
 * @param {string} email - email to validate
 * @returns {Object} - validation result with isValid and message
 */
export const validateEmail = (email) => {
  if (!email) {
    return { isValid: false, message: 'Email is required' };
  }

  const emailRegex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
  if (!emailRegex.test(email)) {
    return { 
      isValid: false, 
      message: 'Please enter a valid email address' 
    };
  }

  return { isValid: true, message: '' };
};

/**
 * Register a new user
 * @param {string} username - username (at least 4 characters, no special characters)
 * @param {string} password - password (at least 8 characters)
 * @param {string} name - user's display name
 * @param {string} role - user role (ADMIN or USER)
 * @param {string} email - user's email address
 * @param {string} verificationCode - email verification code
 * @returns {Promise} - axios response promise
 */
export const register = async (username, password, name, role, email, verificationCode) => {
  // Client-side validation
  const usernameValidation = validateUsername(username);
  if (!usernameValidation.isValid) {
    return { 
      code: '0', 
      msg: usernameValidation.message 
    };
  }

  const passwordValidation = validatePassword(password);
  if (!passwordValidation.isValid) {
    return { 
      code: '0', 
      msg: passwordValidation.message 
    };
  }

  const emailValidation = validateEmail(email);
  if (!emailValidation.isValid) {
    return { 
      code: '0', 
      msg: emailValidation.message 
    };
  }

  if (!name) {
    return { 
      code: '0', 
      msg: 'Name is required' 
    };
  }

  if (!role) {
    return { 
      code: '0', 
      msg: 'Role is required' 
    };
  }

  if (!verificationCode) {
    return { 
      code: '0', 
      msg: 'Verification code is required' 
    };
  }

  try {
    // Create request body matching the Account class structure exactly
    const requestData = {
      username: username,
      password: password,
      name: name,
      email: email,
      code: verificationCode, // Changed to 'code' to match the backend expectation
      role: role,
      // Include empty values for optional fields to ensure they're included
      phone: '',  
      gender: '', 
      avatar: ''  
    };

    const response = await axios.post(`${API_URL}/register`, requestData, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    console.log('Registration Response:', {
      status: response.status,
      statusText: response.statusText,
      data: response.data,
      headers: response.headers
    });
    return response.data;
  } catch (error) {
    console.error('Registration Error:', {
      message: error.message,
      response: error.response ? {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data
      } : 'No response',
      request: error.request ? 'Request was made but no response received' : 'Request setup failed'
    });
    if (error.response && error.response.data) {
      return error.response.data;
    }
    return {
      code: '0',
      msg: 'Registration failed. Please try again later.'
    };
  }
};

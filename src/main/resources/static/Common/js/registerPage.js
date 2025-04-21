// Import axios from CDN with corrected path
import { register } from './register.js';
import { API_URL } from './config.js';
import axios from "https://cdn.jsdelivr.net/npm/axios/+esm";

// Show alert message in the messageDiv
function showAlert(type, message) {
    const messageDiv = document.getElementById('registerMessage');
    
    // Clear existing content
    messageDiv.textContent = '';
    
    // Set new message with icon
    messageDiv.className = `alert alert-${type === 'success' ? 'success' : 'danger'} mt-3`;
    if (type === 'success') {
        messageDiv.innerHTML = `
            <i data-feather="check-circle" class="mr-2" style="width: 18px; height: 18px; vertical-align: middle;"></i>
            ${message}
        `;
    } else {
        messageDiv.innerHTML = `
            <i data-feather="alert-circle" class="mr-2" style="width: 18px; height: 18px; vertical-align: middle;"></i>
            ${message}
        `;
    }
    messageDiv.style.display = 'block';
    
    // Re-initialize feather icons
    if (typeof feather !== 'undefined') {
        feather.replace();
    }
}

// Validation functions to match backend validation
function validateUsername(username) {
    if (!username) {
        return { isValid: false, message: 'Username is required' };
    }
    
    if (username.length < 4) {
        return { 
            isValid: false, 
            message: 'User account is too short, account length needs to be at least 4 characters' 
        };
    }
    
    // Exactly match the backend regex pattern for special characters
    const validPattern = /[`~!@#$%^&*()+=|{}':;',\[\].<>/?~！@#￥%……&*（）——+|{}【】'；：""'。，、？]/;
    if (validPattern.test(username)) {
        return { 
            isValid: false, 
            message: 'The username contains illegal characters. Please avoid using special characters in the username' 
        };
    }
    
    return { isValid: true, message: '' };
}

function validatePassword(password) {
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
}

function validateEmail(email) {
    if (!email) {
        return { isValid: false, message: 'Email is required' };
    }
    
    const emailRegex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
    if (!emailRegex.test(email)) {
        return { isValid: false, message: 'Please enter a valid email address' };
    }
    
    return { isValid: true, message: '' };
}

// Display validation error message
function showValidationError(input, message) {
    // First, remove any existing validation messages for this input
    const parentElement = input.parentNode;
    const existingFeedback = parentElement.querySelectorAll('.invalid-feedback');
    existingFeedback.forEach(element => element.remove());
    
    // Create and append a new feedback element
    const feedback = document.createElement('div');
    feedback.className = 'invalid-feedback';
    feedback.style.display = 'block'; // Ensure it's visible
    feedback.textContent = message;
    parentElement.appendChild(feedback);
    
    input.classList.add('is-invalid');
    input.classList.remove('is-valid');
}

// Clear validation error
function clearValidationError(input) {
    input.classList.remove('is-invalid');
    input.classList.add('is-valid');
    
    // Remove all feedback elements for this input
    const parentElement = input.parentNode;
    const existingFeedback = parentElement.querySelectorAll('.invalid-feedback');
    existingFeedback.forEach(element => element.remove());
}

// Send verification code to email
async function sendVerificationCode(email) {
    try {
        // Send a request matching the Mail class structure exactly
        const response = await axios.post(`${API_URL}/sendEmail`, {
            email: email
            // No need for 'type' parameter - not part of the Mail class
        });
        return response.data;
    } catch (error) {
        // console.error('Send verification code error:', error);
        if (error.response && error.response.data) {
            return error.response.data;
        }
        return {
            code: '0',
            msg: 'Failed to send verification code. Please try again later.'
        };
    }
}

// Handle form submission
async function handleRegister(event) {
    event.preventDefault();
    
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    const name = document.getElementById('name').value.trim();
    const email = document.getElementById('email').value.trim();
    const verificationCode = document.getElementById('verificationCode').value.trim();
    const role = document.getElementById('role').value;
    
    // Reset previous error messages
    document.querySelectorAll('.invalid-feedback').forEach(el => el.remove());
    document.querySelectorAll('.is-invalid').forEach(el => el.classList.remove('is-invalid'));
    
    // Client-side validation before submission
    let isValid = true;
    
    // Validate username
    const usernameValidation = validateUsername(username);
    if (!usernameValidation.isValid) {
        showValidationError(document.getElementById('username'), usernameValidation.message);
        isValid = false;
    }
    
    // Validate password
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
        showValidationError(document.getElementById('password'), passwordValidation.message);
        isValid = false;
    }
    
    // Validate email
    const emailValidation = validateEmail(email);
    if (!emailValidation.isValid) {
        showValidationError(document.getElementById('email'), emailValidation.message);
        isValid = false;
    }
    
    // Validate name
    if (!name) {
        showValidationError(document.getElementById('name'), 'Name is required');
        isValid = false;
    }
    
    // Validate role - ensure only USER role is allowed
    if (!role) {
        showValidationError(document.getElementById('role'), 'Please select a role');
        isValid = false;
    } else if (role !== 'USER') {
        showValidationError(document.getElementById('role'), 'Invalid role selected');
        isValid = false;
    }
    
    // Validate verification code
    if (!verificationCode) {
        showValidationError(document.getElementById('verificationCode'), 'Please enter the verification code');
        isValid = false;
    }
    
    if (!isValid) {
        return false;
    }

    try {
        // Always set role to USER for security, regardless of what was selected
        const result = await register(username, password, name, 'USER', email, verificationCode);
        
        if (result.code === '200') {
            // Registration successful
            showAlert('success', 'Registration completed successfully! You will be redirected to the login page.');
            
            // Redirect to login page after 2 seconds
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 2000);
        } else {
            // Registration failed
            showAlert('error', result.msg || 'Registration failed. Please try again.');
        }
    } catch (error) {
        showAlert('error', 'An error occurred during registration. Please try again.');
    }

    return false;
}

// Add real-time validation and event listeners
document.addEventListener('DOMContentLoaded', function() {
    const registerForm = document.getElementById('registerForm');
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    const nameInput = document.getElementById('name');
    const emailInput = document.getElementById('email');
    const roleSelect = document.getElementById('role');
    const sendCodeBtn = document.getElementById('sendCodeBtn');

    // Attach form submit handler
    registerForm.addEventListener('submit', handleRegister);

    // Send verification code with 60s cooldown
    let cooldown = 0;
    let cooldownInterval;

    sendCodeBtn.addEventListener('click', async function() {
        const email = emailInput.value.trim();
        
        // Validate email
        const emailValidation = validateEmail(email);
        if (!emailValidation.isValid) {
            showAlert('error', emailValidation.message);
            return;
        }

        if (cooldown > 0) {
            return;
        }

        // Send verification code
        sendCodeBtn.disabled = true;
        
        try {
            const result = await sendVerificationCode(email);
            
            if (result.code === '200') {
                // Start cooldown
                cooldown = 60;
                sendCodeBtn.textContent = `Resend (${cooldown}s)`;
                
                showAlert('success', 'Verification code sent successfully! Please check your email.');
                
                cooldownInterval = setInterval(() => {
                    cooldown--;
                    sendCodeBtn.textContent = `Resend (${cooldown}s)`;
                    
                    if (cooldown <= 0) {
                        clearInterval(cooldownInterval);
                        sendCodeBtn.textContent = 'Send Code';
                        sendCodeBtn.disabled = false;
                    }
                }, 1000);
            } else {
                showAlert('error', result.msg || 'Failed to send verification code');
                sendCodeBtn.disabled = false;
            }
        } catch (error) {
            showAlert('error', 'An error occurred. Please try again.');
            sendCodeBtn.disabled = false;
        }
    });

    // Username validation - real-time feedback
    usernameInput.addEventListener('input', function() {
        // Remove all previous error messages first
        document.querySelectorAll('.invalid-feedback').forEach(element => {
            if (element.parentNode === this.parentNode) {
                element.remove();
            }
        });
        
        const validation = validateUsername(this.value.trim());
        if (!validation.isValid) {
            this.setCustomValidity(validation.message);
            showValidationError(this, validation.message);
        } else {
            this.setCustomValidity('');
            clearValidationError(this);
        }
    });

    // Password validation - real-time feedback
    passwordInput.addEventListener('input', function() {
        // Remove all previous error messages first
        document.querySelectorAll('.invalid-feedback').forEach(element => {
            if (element.parentNode === this.parentNode) {
                element.remove();
            }
        });
        
        const validation = validatePassword(this.value);
        if (!validation.isValid) {
            this.setCustomValidity(validation.message);
            showValidationError(this, validation.message);
        } else {
            this.setCustomValidity('');
            clearValidationError(this);
        }
    });

    // Name validation - real-time feedback
    nameInput.addEventListener('input', function() {
        // Remove all previous error messages first
        document.querySelectorAll('.invalid-feedback').forEach(element => {
            if (element.parentNode === this.parentNode) {
                element.remove();
            }
        });
        
        if (!this.value.trim()) {
            this.setCustomValidity('Name is required');
            showValidationError(this, 'Name is required');
        } else {
            this.setCustomValidity('');
            clearValidationError(this);
        }
    });

    // Email validation - real-time feedback
    emailInput.addEventListener('input', function() {
        // Remove all previous error messages first
        document.querySelectorAll('.invalid-feedback').forEach(element => {
            if (element.parentNode === this.parentNode) {
                element.remove();
            }
        });
        
        const validation = validateEmail(this.value.trim());
        if (!validation.isValid) {
            this.setCustomValidity(validation.message);
            showValidationError(this, validation.message);
        } else {
            this.setCustomValidity('');
            clearValidationError(this);
        }
    });

    // Role validation - real-time feedback
    roleSelect.addEventListener('change', function() {
        // Remove all previous error messages first
        document.querySelectorAll('.invalid-feedback').forEach(element => {
            if (element.parentNode === this.parentNode) {
                element.remove();
            }
        });
        
        if (!this.value) {
            this.setCustomValidity('Please select a role');
            showValidationError(this, 'Please select a role');
        } else {
            this.setCustomValidity('');
            clearValidationError(this);
        }
    });
});

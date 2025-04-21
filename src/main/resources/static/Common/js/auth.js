import { API_URL } from './config.js';
import api, { apiService } from './api.js';

/**
 * Authentication check function - Checks if user is logged in, redirects to login page if not
 */
export function checkAuthentication() {
    // Get user info and token from localStorage
    const user = JSON.parse(localStorage.getItem('user'));
    const token = localStorage.getItem('token');
    
    // If no user info or token, redirect to login page
    if (!user || !token) {
        // console.log('Authentication failed: No user or token found');
        redirectToLogin();
        return false;
    }
    
    return true;
}

/**
 * Authentication check function without redirects (for admin interface)
 */
export function checkAuthenticationNoRedirect() {
    // Get user info and token from localStorage
    const user = JSON.parse(localStorage.getItem('user'));
    const token = localStorage.getItem('token');
    
    // If no user info or token, just return false without redirect
    if (!user || !token) {
        // console.log('Authentication failed: No user or token found (no redirect)');
        return false;
    }
    
    return true;
}

/**
 * Check if user has admin role - SIMPLIFIED (no validation)
 */
export function checkAdminRole() {
    // Simplified, removed all permission validation, always returns true
    // console.log('Admin role check bypassed');
    return true;
}

/**
 * Check if user has admin role without redirects - SIMPLIFIED (no validation)
 */
export function checkAdminRoleNoRedirect() {
    // Simplified, removed all permission validation, always returns true
    // console.log('Admin role check bypassed (no redirect)');
    return true;
}

/**
 * Check if user has regular user role
 */
export function checkUserRole() {
    const user = JSON.parse(localStorage.getItem('user'));
    
    // Simplified user role check logic
    if (!user) {
        // console.log('No user found, redirecting to login');
        redirectToLogin();
        return false;
    }
    
    return true;
}

/**
 * Verify token with server
 */
async function verifyToken() {
    try {
        // console.log('Verifying token...');
        // Use apiService to verify token
        const response = await apiService.verifyToken();
        // console.log('Token verification response:', response);
        
        if (response.code !== '200') {
            throw new Error('Token verification failed');
        }
        
        return true;
    } catch (error) {
        // console.error('Token verification error:', error);
        throw error;
    }
}

/**
 * Redirect to login page
 */
function redirectToLogin() {
    // Save current URL to return after login
    const currentPath = window.location.pathname;
    if (currentPath !== '/login.html' && currentPath !== '/register.html') {
        localStorage.setItem('redirectAfterLogin', currentPath);
    }
    
    // Redirect to login page
    window.location.href = '/login.html';
}

/**
 * Clear authentication data
 */
export function clearAuthData() {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    localStorage.removeItem('role');
}

/**
 * User logout
 */
export function logout() {
    clearAuthData();
    redirectToLogin();
}

/**
 * User logout without redirect (for admin interface)
 */
export function logoutNoRedirect() {
    clearAuthData();
} 
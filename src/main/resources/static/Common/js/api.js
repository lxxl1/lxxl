// API module - Centralized handling of all API requests and authentication tokens
// 注意：axios应该通过<script>标签在HTML中导入，如：
// <script src="https://cdn.jsdelivr.net/npm/axios/dist/axios.min.js"></script>
import { API_URL } from './config.js';

// 简化判断是否为管理员页面的辅助函数
function isAdminPage() {
    return window.location.pathname.includes('/Admin/');
}

// 确保axios已经定义
if (typeof axios === 'undefined') {
    console.error('axios is not defined! Please ensure you have imported the axios library via <script> tag before using this module');
    // 创建一个最小化的axios模拟对象，防止代码崩溃
    window.axios = {
        create: () => ({
            get: () => Promise.reject(new Error('axios not loaded')),
            post: () => Promise.reject(new Error('axios not loaded')),
            put: () => Promise.reject(new Error('axios not loaded')),
            delete: () => Promise.reject(new Error('axios not loaded')),
            interceptors: {
                request: { use: () => {} },
                response: { use: () => {} }
            }
        })
    };
}

// Create axios instance
const api = axios.create({
    baseURL: API_URL,
    timeout: 30000, // 30 seconds timeout
});

// Request interceptor - Automatically add token to request headers
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        // Use lowercase 'authorization' to match backend Constants.AUTHORIZATION
        config.headers['authorization'] = token;
    }
    
    // Add X-Requested-With header to identify this as an API request
    config.headers['X-Requested-With'] = 'XMLHttpRequest';
    
    // Ensure Accept header includes application/json
    config.headers['Accept'] = 'application/json';
    
    // 添加额外的安全头信息，避免浏览器安全限制
    config.headers['X-Content-Type-Options'] = 'nosniff';
    config.headers['X-Frame-Options'] = 'SAMEORIGIN';
    config.headers['Cross-Origin-Opener-Policy'] = 'same-origin';
    
    // 为管理员页面的API请求添加特殊标记
    if (isAdminPage()) {
        config.headers['X-Admin-Request'] = 'true';
    }
    
    return config;
}, (error) => {
    return Promise.reject(error);
});

// Response interceptor - Handle common errors
api.interceptors.response.use((response) => {
    return response;
}, (error) => {
    let isUnauthorized = false;
    let errorMessage = 'Session expired or invalid. Please log in again.';

    if (error.response) {
        // Check for 401 status code
        if (error.response.status === 401) {
            isUnauthorized = true;
        }
        // Check for specific backend message indicating token issues (adjust if needed)
        else if (error.response.data) {
            const msg = error.response.data.message || error.response.data.msg || '';
            if (typeof msg === 'string' && (msg.toLowerCase().includes('token') || msg.toLowerCase().includes('unauthorized') || msg.toLowerCase().includes('未授权'))) {
                isUnauthorized = true;
                errorMessage = msg; // Use backend message if available
            }
        }
    }

    // Handle unauthorized/token expired error for BOTH user and admin pages
    if (isUnauthorized) {
        // console.warn(`Unauthorized (401) or token error detected. Redirecting to login. Error: ${error.message}`);
        // Clear stored credentials
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        localStorage.removeItem('role'); // Also remove role if stored
        localStorage.removeItem('adminName'); // Clear admin specific data

        // Show a message
        showTokenExpiredMessage(errorMessage);

        // Redirect to login page - determine path based on current location
        const loginPath = isAdminPage() ? '../login.html' : '/login.html'; // Adjust base path if needed

        // Use a short delay to allow the message to be seen
        setTimeout(() => {
            window.location.href = loginPath;
        }, 2000); // 2 seconds delay

        // Reject the promise to stop further processing in the original call chain
        return Promise.reject(new Error(errorMessage));
    }

    // For non-401 errors on admin pages, log them but don't redirect
    if (isAdminPage()) {
        // console.error('Admin page API error captured (non-401), continuing execution:', error);
    }

    // For other errors, just reject the promise
    return Promise.reject(error);
});

// 显示令牌过期的友好提示
// Modified to accept a custom message
function showTokenExpiredMessage(message = 'Your session has expired. Please log in again.') {
    // Remove any existing message first
    const existingMessage = document.getElementById('token-expired-message');
    if (existingMessage) {
        document.body.removeChild(existingMessage);
    }

    // Create提示元素
    const messageContainer = document.createElement('div');
    messageContainer.id = 'token-expired-message'; // Add ID for easy removal
    messageContainer.style.position = 'fixed';
    messageContainer.style.top = '20px';
    messageContainer.style.left = '50%';
    messageContainer.style.transform = 'translateX(-50%)';
    messageContainer.style.zIndex = '9999';
    messageContainer.style.backgroundColor = '#f8d7da'; // Bootstrap danger background
    messageContainer.style.color = '#721c24'; // Bootstrap danger text
    messageContainer.style.padding = '15px 30px';
    messageContainer.style.borderRadius = '5px';
    messageContainer.style.boxShadow = '0 4px 8px rgba(0,0,0,0.1)';
    messageContainer.style.textAlign = 'center';
    messageContainer.style.fontSize = '16px';
    messageContainer.style.fontWeight = 'bold';
    messageContainer.style.border = '1px solid #f5c6cb'; // Bootstrap danger border

    // 设置提示文本
    messageContainer.innerText = message;

    // 添加到页面
    document.body.appendChild(messageContainer);

    // Longer duration before auto-removal, as redirect happens
    setTimeout(() => {
        if (document.body.contains(messageContainer)) {
            document.body.removeChild(messageContainer);
        }
    }, 5000); // 5 seconds
}

// 立即加载时关闭任何打开的权限对话框
document.addEventListener('DOMContentLoaded', function() {
    // 针对管理员页面添加特殊处理
    if (isAdminPage()) {
        // 针对Chrome的特殊权限对话框处理
        setTimeout(function() {
            // 尝试关闭任何开着的权限对话框
            const dialogs = document.querySelectorAll('dialog, [role="dialog"], .modal, div[role="alertdialog"]');
            dialogs.forEach(dialog => {
                if (dialog.textContent && (
                    dialog.textContent.includes('permission') || 
                    dialog.textContent.includes('access') || 
                    dialog.textContent.includes('权限') ||
                    dialog.textContent.includes('localhost:8080'))) {
                    
                    // 寻找确认按钮并点击
                    const buttons = dialog.querySelectorAll('button');
                    buttons.forEach(btn => {
                        if (btn.textContent === '确定' || 
                            btn.textContent === 'OK' || 
                            btn.textContent === '确认') {
                            btn.click();
                        }
                    });
                    
                    // 如果没有找到按钮，尝试直接隐藏对话框
                    if (dialog.style) {
                        dialog.style.display = 'none';
                    }
                }
            });
        }, 1000);
    }
});

// Export api instance for global use
export default api;

// Common API request methods
export const apiService = {
    // User login
    login: async (username, password, role) => {
        try {
            const response = await api.post('/login', {
                username,
                password,
                role
            });
            return response.data;
        } catch (error) {
            // console.error('Login error:', error);
            throw error;
        }
    },
    
    // User registration
    register: async (userData) => {
        try {
            const response = await api.post('/register', userData);
            return response.data;
        } catch (error) {
            // console.error('Registration error:', error);
            throw error;
        }
    },
    
    // Update password
    updatePassword: async (userData) => {
        try {
            const response = await api.put('/updatePassword', userData);
            return response.data;
        } catch (error) {
            // console.error('Update password error:', error);
            throw error;
        }
    },
    
    // Verify token
    verifyToken: async () => {
        // 管理员页面不验证令牌，直接返回成功
        if (isAdminPage()) {
            // console.log('Admin page skipping token verification');
            return { code: '200', message: 'Token verification bypassed for admin', data: true };
        }
        
        // 普通用户页面正常验证
        try {
            const response = await api.get('/verifyToken');
            return response.data;
        } catch (error) {
            // console.error('Token verification error:', error);
            throw error;
        }
    },
    
    // 测试管理员API是否可以无权限访问
    testAdminAccess: async () => {
        try {
            const response = await api.get('/admin/public/status');
            console.log('Admin API test result:', response.data);
            return response.data;
        } catch (error) {
            console.error('Admin API test failed:', error);
            return { code: 'error', message: 'Unable to access admin API' };
        }
    }
}; 
// 权限检查模块 - 在所有用户界面页面自动执行
import { checkAuthentication, checkUserRole, logout } from '../../../Common/js/auth.js';
import { API_URL } from '../../../Common/js/config.js';
import api from '../../../Common/js/api.js';
// 导入 updateUserHeader
import { updateUserHeader } from '../../../Common/js/utils.js'; 

// 立即执行函数 - 页面加载时自动执行权限检查
(function() {
    // console.log('Performing authentication check...');
    
    // 验证用户是否已登录，未登录则跳转到登录页面
    if (!checkAuthentication()) {
        // console.log('User not authenticated, redirecting to login page...');
        return; // checkAuthentication内部会自动重定向到登录页面
    }
    
    // 检查用户是否具有正确的角色
    if (!checkUserRole()) {
        // console.log('User does not have the correct role, redirecting...');
        return; // checkUserRole内部会处理重定向
    }
    
    // console.log('Authentication check passed.');
    
    // 页面加载完成后执行
    document.addEventListener('DOMContentLoaded', function() {
        // 将更新逻辑放入 setTimeout 以确保 DOM 完全准备好
        setTimeout(() => {
            // console.log('[AuthCheck] Running delayed header update...');
            // 从 localStorage 获取用户信息
            const userString = localStorage.getItem('user');
            // console.log('[AuthCheck] Raw user string from localStorage (delayed):', userString);
            let user = null;
            try {
                user = JSON.parse(userString);
                // console.log('[AuthCheck] Parsed user object (delayed):', user);
            } catch (e) {
                // console.error('[AuthCheck] Error parsing user data from localStorage (delayed):', e);
            }
            
            if (user) {
                // 在调用前检查元素是否存在
                const usernameEl = document.getElementById('header-username');
                const avatarEl = document.getElementById('header-avatar');
                // console.log('[AuthCheck] Checking for header elements before update (delayed):');
                // console.log('[AuthCheck] Found #header-username (delayed):', usernameEl ? 'Yes' : 'No');
                // console.log('[AuthCheck] Found #header-avatar (delayed):', avatarEl ? 'Yes' : 'No');
                
                // 调用导入的 updateUserHeader 函数来更新 Header
                // console.log('[AuthCheck] Calling updateUserHeader with user (delayed):', user);
                updateUserHeader(user);
            } else {
                // console.warn('[AuthCheck] User data is null or parsing failed after authentication passed (delayed).');
                // 可选：如果严格要求，可以在这里重定向到登录
                // redirectToLogin();
            }
        }, 0); // 0ms delay is usually sufficient
        
        // 设置登出按钮事件 (保留在 DOMContentLoaded 外部)
        setupLogoutButton();
    });
})();

// 设置登出按钮事件
function setupLogoutButton() {
    const logoutButtons = document.querySelectorAll('a[href*="../login.html"]'); // More specific selector
    logoutButtons.forEach(button => {
        // Check if the button is inside a dropdown menu related to user
        const dropdownItem = button.closest('.dropdown-menu .dropdown-item');
        if (dropdownItem) { 
             button.addEventListener('click', function(e) {
                e.preventDefault();
                // console.log('[Logout Button Clicked]');
                logout(); // Call logout function from auth.js
            });
        }
    });
}

// Check if user is authenticated (验证token的部分可以保留或根据需要调整)
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Check if token exists
        const token = localStorage.getItem('token');
        if (!token) {
            // console.log('[AuthCheck Token] No token found, redirecting.');
            redirectToLogin();
            return;
        }
        
        // Verify token with backend (可选，如果auth.js里的checkAuthentication已包含验证)
        // console.log('[AuthCheck Token] Verifying token with backend...');
        // const response = await api.get('/verifyToken'); // Assuming /verifyToken endpoint exists
        // if (!response.data || response.data.code !== '200') { // Check for success code
        //     console.log('[AuthCheck Token] Token verification failed, redirecting.', response.data);
        //     redirectToLogin();
        // } else {
        //     console.log('[AuthCheck Token] Token verified successfully.');
        // }
    } catch (error) {
        // console.error('Token verification check failed:', error);
        // redirectToLogin(); // Decide if token verification failure should force logout
    }
});

// Redirect to login page
function redirectToLogin() {
    // Clear any stored authentication data
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    
    // Redirect to login page
    // console.log('[Redirecting] To login page...');
    window.location.href = '../login.html';
} 
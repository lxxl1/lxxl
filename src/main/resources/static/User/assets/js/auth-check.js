// 权限检查模块 - 在所有用户界面页面自动执行
import { checkAuthentication, checkUserRole, logout } from '../../../Common/js/auth.js';
import { API_URL } from '../../../Common/js/config.js';
import api from '../../../Common/js/api.js';

// 立即执行函数 - 页面加载时自动执行权限检查
(function() {
    console.log('Performing authentication check...');
    
    // 验证用户是否已登录，未登录则跳转到登录页面
    if (!checkAuthentication()) {
        console.log('User not authenticated, redirecting to login page...');
        return; // checkAuthentication内部会自动重定向到登录页面
    }
    
    // 检查用户是否具有正确的角色
    if (!checkUserRole()) {
        console.log('User does not have the correct role, redirecting...');
        return; // checkUserRole内部会处理重定向
    }
    
    console.log('Authentication check passed.');
    
    // 页面加载完成后执行
    document.addEventListener('DOMContentLoaded', function() {
        // 更新页面上的用户信息
        updateUserInfo();
        
        // 设置登出按钮事件
        setupLogoutButton();
    });
})();

// 更新页面上的用户信息
function updateUserInfo() {
    const user = JSON.parse(localStorage.getItem('user'));
    if (user) {
        // 更新用户名
        const userNameElements = document.querySelectorAll('.nav-item.dropdown .mr-2');
        userNameElements.forEach(element => {
            element.textContent = user.name || user.username;
        });
        
        // 如果有头像URL，更新头像
        if (user.avatar) {
            const avatarElements = document.querySelectorAll('.avatar.avatar-sm img');
            avatarElements.forEach(element => {
                element.src = user.avatar;
            });
        }
    }
}

// 设置登出按钮事件
function setupLogoutButton() {
    const logoutButtons = document.querySelectorAll('a[href*="logout.html"]');
    logoutButtons.forEach(button => {
        button.addEventListener('click', function(e) {
            e.preventDefault();
            logout();
        });
    });
}

// Check if user is authenticated
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Check if token exists
        const token = localStorage.getItem('token');
        if (!token) {
            redirectToLogin();
            return;
        }
        
        // Verify token with backend
        const response = await api.get('/verifyToken');
        if (!response.data || !response.data.data) {
            redirectToLogin();
        }
    } catch (error) {
        console.error('Authentication check failed:', error);
        redirectToLogin();
    }
});

// Redirect to login page
function redirectToLogin() {
    // Clear any stored authentication data
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    
    // Redirect to login page
    window.location.href = '../login.html';
} 
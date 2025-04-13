// 管理员界面权限检查模块
import { checkAuthentication, checkAdminRole, logout } from '../../../Common/js/auth.js';

// 立即执行函数 - 页面加载时自动执行权限检查
(function() {
    console.log('Performing admin authentication check...');
    
    // 验证用户是否已登录，未登录则跳转到登录页面
    if (!checkAuthentication()) {
        console.log('Admin not authenticated, redirecting to login page...');
        return; // checkAuthentication内部会自动重定向到登录页面
    }
    
    // 检查用户是否具有管理员角色
    if (!checkAdminRole()) {
        console.log('User does not have admin role, redirecting...');
        return; // checkAdminRole内部会处理重定向
    }
    
    console.log('Admin authentication check passed.');
    
    // 页面加载完成后执行
    document.addEventListener('DOMContentLoaded', function() {
        // 更新页面上的管理员信息
        updateAdminInfo();
        
        // 设置登出按钮事件
        setupLogoutButton();
    });
})();

// 更新页面上的管理员信息
function updateAdminInfo() {
    const user = JSON.parse(localStorage.getItem('user'));
    if (user) {
        // 更新管理员名称
        const adminNameElement = document.getElementById('adminName');
        if (adminNameElement) {
            adminNameElement.textContent = user.name || user.username;
        }
        
        // 更新欢迎信息
        const welcomeMessage = document.querySelector('.card-title');
        if (welcomeMessage && welcomeMessage.textContent.includes('Welcome back')) {
            welcomeMessage.textContent = `Welcome back, ${user.name || user.username}!`;
        }
    }
}

// 设置登出按钮事件
function setupLogoutButton() {
    const logoutButton = document.querySelector('.btn.btn-outline-danger');
    if (logoutButton) {
        logoutButton.addEventListener('click', function(e) {
            e.preventDefault();
            logout();
        });
    }
} 
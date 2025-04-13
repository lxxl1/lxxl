// 管理员界面简化权限检查模块
import { checkAuthenticationNoRedirect, logoutNoRedirect } from '../../../Common/js/auth.js';

// 立即执行函数 - 页面加载时自动执行简化的权限检查
(function() {
    console.log('Performing simplified admin authentication check...');
    
    // 只检查是否有token，不检查角色
    const authResult = checkAuthenticationNoRedirect();
    if (!authResult) {
        console.log('No authentication token found, but continuing anyway...');
    } else {
        console.log('Authentication token found.');
    }
    
    // 页面加载完成后执行
    document.addEventListener('DOMContentLoaded', function() {
        // 更新页面上的管理员信息
        updateAdminInfo();
        
        // 设置不重定向的登出按钮事件
        setupLogoutButtonNoRedirect();
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

// 设置不重定向的登出按钮事件
function setupLogoutButtonNoRedirect() {
    const logoutButton = document.querySelector('.btn.btn-outline-danger');
    if (logoutButton) {
        logoutButton.addEventListener('click', function(e) {
            e.preventDefault();
            // 使用无重定向版本的登出函数
            logoutNoRedirect();
            // 显示已登出消息
            alert('您已成功退出登录，但页面不会重定向。');
        });
    }
} 
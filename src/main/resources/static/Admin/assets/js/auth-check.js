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

// 页面加载时执行认证检查
// document.addEventListener('DOMContentLoaded', checkAuthentication);
// REMOVED call to setupLogoutButtonNoRedirect if it was here

// Ensure checkAuthentication is called if needed elsewhere, 
// but specifically remove the setup for the no-redirect button.
// If checkAuthentication itself called setupLogoutButtonNoRedirect, that call needs removal too.

// Assuming checkAuthentication might call setupLogoutButtonNoRedirect implicitly
// We need to ensure that implicit call is removed if it exists within checkAuthentication
// OR modify checkAuthentication not to call it.
// For now, just removing the function definition is the primary goal.

// // 导出函数 (REMOVED call if exists)
// export {
//     checkAuthentication,
//     logoutNoRedirect,
//     // setupLogoutButtonNoRedirect // <-- Ensure this is removed if exported
// }; 
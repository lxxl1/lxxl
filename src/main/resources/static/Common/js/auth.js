import { API_URL } from './config.js';
import api, { apiService } from './api.js';

/**
 * 权限检查函数 - 检查用户是否已登录，未登录则重定向到登录页面
 */
export function checkAuthentication() {
    // 从localStorage获取用户信息和token
    const user = JSON.parse(localStorage.getItem('user'));
    const token = localStorage.getItem('token');
    
    // 如果没有用户信息或token，重定向到登录页面
    if (!user || !token) {
        redirectToLogin();
        return false;
    }
    
    // 验证token是否有效
    verifyToken().catch(() => {
        // Token无效时，清除本地存储并重定向到登录页面
        clearAuthData();
        redirectToLogin();
    });
    
    return true;
}

/**
 * 检查用户是否为管理员
 */
export function checkAdminRole() {
    const user = JSON.parse(localStorage.getItem('user'));
    
    // 检查用户角色是否为管理员
    if (!user || user.role !== 'ADMIN') {
        // 不是管理员时，显示无权限提示并重定向到用户首页
        alert('You do not have permission to access this page');
        window.location.href = '/User/index.html';
        return false;
    }
    
    return true;
}

/**
 * 检查用户是否为普通用户
 */
export function checkUserRole() {
    const user = JSON.parse(localStorage.getItem('user'));
    
    // 检查用户角色是否为普通用户
    if (!user || user.role !== 'USER') {
        // 如果是管理员，重定向到管理员首页
        if (user && user.role === 'ADMIN') {
            window.location.href = '/Admin/index.html';
        } else {
            // 如果不是任何有效角色，重定向到登录页面
            redirectToLogin();
        }
        return false;
    }
    
    return true;
}

/**
 * 向服务器验证token
 */
async function verifyToken() {
    try {
        // 使用apiService验证token
        const response = await apiService.verifyToken();
        
        if (response.code !== '200') {
            throw new Error('Token verification failed');
        }
        
        return true;
    } catch (error) {
        console.error('Token verification error:', error);
        throw error;
    }
}

/**
 * 重定向到登录页面
 */
function redirectToLogin() {
    // 保存当前URL以便登录后返回
    const currentPath = window.location.pathname;
    if (currentPath !== '/login.html' && currentPath !== '/register.html') {
        localStorage.setItem('redirectAfterLogin', currentPath);
    }
    
    // 重定向到登录页面
    window.location.href = '/login.html';
}

/**
 * 清除身份验证数据
 */
export function clearAuthData() {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
}

/**
 * 用户登出
 */
export function logout() {
    clearAuthData();
    redirectToLogin();
} 
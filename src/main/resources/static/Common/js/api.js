// API封装模块 - 集中处理所有API请求并统一处理认证令牌
import axios from "https://cdn.jsdelivr.net/npm/axios/+esm";
import { API_URL } from './config.js';

// 创建axios实例
const api = axios.create({
    baseURL: API_URL,
    timeout: 30000, // 30秒超时
});

// 请求拦截器 - 自动添加token到请求头
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        // 使用小写的'authorization'与后端Constants.AUTHORIZATION匹配
        config.headers['authorization'] = token;
    }
    
    // 添加X-Requested-With头，标识这是一个API请求
    config.headers['X-Requested-With'] = 'XMLHttpRequest';
    
    // 确保Accept头包含application/json
    config.headers['Accept'] = 'application/json';
    
    return config;
}, (error) => {
    return Promise.reject(error);
});

// 响应拦截器 - 处理常见错误
api.interceptors.response.use((response) => {
    return response;
}, (error) => {
    // 处理401未授权错误
    if (error.response && error.response.status === 401) {
        // 清除本地存储并重定向到登录页面
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        localStorage.removeItem('role');
        window.location.href = '/login.html';
    }
    return Promise.reject(error);
});

// 导出api实例供全局使用
export default api;

// 常用API请求方法
export const apiService = {
    // 用户登录
    login: async (username, password, role) => {
        try {
            const response = await api.post('/login', {
                username,
                password,
                role
            });
            return response.data;
        } catch (error) {
            console.error('Login error:', error);
            throw error;
        }
    },
    
    // 用户注册
    register: async (userData) => {
        try {
            const response = await api.post('/register', userData);
            return response.data;
        } catch (error) {
            console.error('Registration error:', error);
            throw error;
        }
    },
    
    // 更新密码
    updatePassword: async (userData) => {
        try {
            const response = await api.put('/updatePassword', userData);
            return response.data;
        } catch (error) {
            console.error('Update password error:', error);
            throw error;
        }
    },
    
    // 验证token
    verifyToken: async () => {
        try {
            const response = await api.get('/verifyToken');
            return response.data;
        } catch (error) {
            console.error('Token verification error:', error);
            throw error;
        }
    }
}; 
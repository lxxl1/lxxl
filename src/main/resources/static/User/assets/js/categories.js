import { API_URL } from '../../../Common/js/config.js';
import api from '../../../Common/js/api.js';

// 全局变量
let currentUser = null;
let allCategories = [];
let userSongs = [];
let filteredSongs = [];

// 处理API响应
async function handleResponse(response) {
    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API request failed: ${response.status} ${response.statusText} ${errorText}`);
    }
    return await response.json();
}

// 定义通用消息显示函数
function showMessage(message, type = 'info') {
    // 检查是否已存在消息容器
    let messageContainer = document.getElementById('message-container');
    
    if (!messageContainer) {
        // 创建消息容器
        messageContainer = document.createElement('div');
        messageContainer.id = 'message-container';
        messageContainer.style.position = 'fixed';
        messageContainer.style.top = '20px';
        messageContainer.style.right = '20px';
        messageContainer.style.zIndex = '9999';
        document.body.appendChild(messageContainer);
    }
    
    // 创建消息元素
    const messageElement = document.createElement('div');
    messageElement.className = `alert alert-${type} alert-dismissible fade show`;
    messageElement.innerHTML = `
        ${message}
        <button type="button" class="close" data-dismiss="alert" aria-label="Close">
            <span aria-hidden="true">&times;</span>
        </button>
    `;
    
    // 添加到容器
    messageContainer.appendChild(messageElement);
    
    // 3秒后自动关闭
    setTimeout(() => {
        messageElement.classList.remove('show');
        setTimeout(() => {
            messageContainer.removeChild(messageElement);
        }, 150);
    }, 3000);
}

// 页面加载时初始化
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // 从localStorage获取用户信息，而不是调用API
        const userDataString = localStorage.getItem('currentUser');
        if (userDataString) {
            try {
                currentUser = JSON.parse(userDataString);
                
                // 初始化Select2插件
                $('#edit-categories').select2({
                    placeholder: 'Select categories',
                    allowClear: true,
                    width: '100%'
                });
                
                // 加载分类和用户歌曲
                await loadAllCategories();
                await loadUserSongs();
                
                // 计算统计数据
                updateStatistics();
                
                // 设置事件监听
                setupEventListeners();
            } catch (error) {
                console.error('解析用户数据失败:', error);
                window.location.href = '../login.html';
            }
        } else {
            // 如果localStorage中没有用户信息，则重定向到登录页面
            window.location.href = '../login.html';
        }
    } catch (error) {
        console.error('初始化失败:', error);
        showMessage('初始化失败，请刷新页面重试', 'error');
    }
});

/**
 * 加载所有分类
 */
async function loadAllCategories() {
    try {
        const response = await fetch(`${API_URL}/getAllCategories`, {
            method: 'GET',
            headers: {
                'X-Requested-With': 'XMLHttpRequest',
                'Accept': 'application/json',
                'Authorization': localStorage.getItem('token')
            }
        });
        
        const data = await handleResponse(response);
        if (data) {
            allCategories = data;
            
            // 更新类别计数
            document.getElementById('total-categories').textContent = allCategories.length;
            
            // 填充类别过滤下拉框
            const categoryFilter = document.getElementById('category-filter');
            categoryFilter.innerHTML = '<option value="">All Categories</option>';
            
            // 填充编辑模态框的类别选择
            const editCategories = document.getElementById('edit-categories');
            editCategories.innerHTML = '';
            
            allCategories.forEach(category => {
                // 添加到过滤下拉框
                const filterOption = document.createElement('option');
                filterOption.value = category.id;
                filterOption.textContent = category.name;
                categoryFilter.appendChild(filterOption);
                
                // 添加到编辑模态框
                const editOption = document.createElement('option');
                editOption.value = category.id;
                editOption.textContent = category.name;
                editCategories.appendChild(editOption);
            });
        }
    } catch (error) {
        console.error('加载分类失败:', error);
        showMessage('加载分类失败，请刷新页面重试', 'error');
    }
}

/**
 * 加载用户歌曲
 */
async function loadUserSongs() {
    try {
        const response = await fetch(`${API_URL}/getUserSongs?userId=${currentUser.id}`, {
            method: 'GET',
            headers: {
                'X-Requested-With': 'XMLHttpRequest',
                'Accept': 'application/json',
                'Authorization': localStorage.getItem('token')
            }
        });
        
        const data = await handleResponse(response);
        if (data) {
            userSongs = data;
            filteredSongs = [...userSongs];
            
            // 更新歌曲计数
            document.getElementById('total-songs').textContent = userSongs.length;
            
            // 渲染歌曲列表
            renderSongsList(filteredSongs);
        }
    } catch (error) {
        console.error('加载歌曲失败:', error);
        showMessage('加载歌曲失败，请刷新页面重试', 'error');
    }
}

/**
 * 渲染歌曲列表
 * @param {Array} songs - 要渲染的歌曲列表
 */
function renderSongsList(songs) {
    const tableBody = document.getElementById('song-categories-table');
    
    if (!songs || songs.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="5" class="text-center">No songs found</td>
            </tr>
        `;
        return;
    }
    
    let html = '';
    
    songs.forEach(song => {
        // 获取歌曲的类别
        const songCategories = song.categories || [];
        let categoriesHtml = '';
        
        if (songCategories.length > 0) {
            songCategories.forEach(categoryId => {
                const category = allCategories.find(c => c.id === categoryId);
                if (category) {
                    categoriesHtml += `<span class="badge badge-primary mr-1">${category.name}</span>`;
                }
            });
        } else {
            categoriesHtml = '<span class="text-muted">No categories</span>';
        }
        
        // 格式化创建日期
        const createdDate = new Date(song.createdAt).toLocaleDateString();
        
        // 状态标签
        const statusHtml = song.status === 'ACTIVE' 
            ? '<span class="badge badge-success">Active</span>'
            : '<span class="badge badge-warning">Inactive</span>';
        
        html += `
            <tr>
                <td>
                    <div class="d-flex align-items-center">
                        <div class="song-img-container mr-3">
                            <img src="${song.coverImage || 'assets/media/image/default-album.png'}" alt="${song.name}" width="40" height="40" class="rounded">
                        </div>
                        <div>
                            <h6 class="mb-0">${song.name}</h6>
                            <small class="text-muted">${song.artist || 'Unknown Artist'}</small>
                        </div>
                    </div>
                </td>
                <td>${categoriesHtml}</td>
                <td>${createdDate}</td>
                <td>${statusHtml}</td>
                <td>
                    <button class="btn btn-sm btn-primary edit-categories-btn" data-song-id="${song.id}" data-song-name="${song.name}">
                        <i data-feather="edit-2"></i> Edit Categories
                    </button>
                </td>
            </tr>
        `;
    });
    
    tableBody.innerHTML = html;
    
    // 重新初始化 Feather 图标
    if (typeof feather !== 'undefined') {
        feather.replace();
    }
    
    // 添加编辑按钮的点击事件
    document.querySelectorAll('.edit-categories-btn').forEach(button => {
        button.addEventListener('click', openEditCategoriesModal);
    });
}

/**
 * 打开编辑类别模态框
 * @param {Event} event - 点击事件
 */
function openEditCategoriesModal(event) {
    const button = event.currentTarget;
    const songId = button.dataset.songId;
    const songName = button.dataset.songName;
    
    // 设置模态框数据
    document.getElementById('edit-song-id').value = songId;
    document.getElementById('edit-song-name').value = songName;
    
    // 查找歌曲对象
    const song = userSongs.find(s => s.id === songId);
    
    if (song) {
        // 清除并重新设置选中的类别
        $('#edit-categories').val(song.categories || []).trigger('change');
    }
    
    // 显示模态框
    $('#editCategoriesModal').modal('show');
}

/**
 * 更新歌曲分类
 * @param {string} songId - 歌曲ID
 * @param {Array} categoryIds - 分类ID数组
 */
async function updateSongCategories(songId, categoryIds) {
    try {
        const response = await fetch(`${API_URL}/updateSongCategories`, {
            method: 'POST',
            headers: {
                'X-Requested-With': 'XMLHttpRequest',
                'Accept': 'application/json',
                'Authorization': localStorage.getItem('token'),
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                songId: songId,
                categoryIds: categoryIds
            })
        });
        
        const data = await handleResponse(response);
        if (data) {
            // 更新本地数据
            const songIndex = userSongs.findIndex(song => song.id === songId);
            if (songIndex !== -1) {
                userSongs[songIndex].categories = categoryIds;
                
                // 如果是筛选后的结果中也有这首歌，也要更新
                const filteredIndex = filteredSongs.findIndex(song => song.id === songId);
                if (filteredIndex !== -1) {
                    filteredSongs[filteredIndex].categories = categoryIds;
                }
                
                // 重新渲染歌曲列表
                renderSongsList(filteredSongs);
                
                // 更新统计信息
                updateStatistics();
                
                // 显示成功消息
                showMessage('Categories updated successfully', 'success');
            }
        }
    } catch (error) {
        console.error('更新类别失败:', error);
        showMessage('Failed to update categories. Please try again.', 'error');
    }
}

/**
 * 更新统计数据
 */
function updateStatistics() {
    document.getElementById('total-songs').textContent = userSongs.length;
    document.getElementById('total-categories').textContent = allCategories.length;
    
    // 计算平均每首歌曲的类别数
    if (userSongs.length > 0) {
        const totalCategories = userSongs.reduce((sum, song) => {
            return sum + (song.categories ? song.categories.length : 0);
        }, 0);
        const avgCategories = (totalCategories / userSongs.length).toFixed(1);
        document.getElementById('avg-categories').textContent = avgCategories;
    } else {
        document.getElementById('avg-categories').textContent = '0';
    }
}

/**
 * 过滤歌曲
 * @param {string} searchTerm - 搜索关键字
 * @param {string} categoryId - 分类ID
 */
function filterSongs(searchTerm, categoryId) {
    searchTerm = searchTerm ? searchTerm.toLowerCase() : '';
    
    filteredSongs = userSongs.filter(song => {
        // 按名称和艺术家搜索
        const matchesSearch = !searchTerm || 
            song.name.toLowerCase().includes(searchTerm) || 
            (song.artist && song.artist.toLowerCase().includes(searchTerm));
        
        // 按类别筛选
        const matchesCategory = !categoryId || (song.categories && song.categories.includes(categoryId));
        
        return matchesSearch && matchesCategory;
    });
    
    renderSongsList(filteredSongs);
}

/**
 * 设置事件监听器
 */
function setupEventListeners() {
    // 保存类别按钮
    document.getElementById('save-categories').addEventListener('click', async () => {
        const songId = document.getElementById('edit-song-id').value;
        const selectedCategories = Array.from($('#edit-categories').val() || []);
        
        await updateSongCategories(songId, selectedCategories);
        $('#editCategoriesModal').modal('hide');
    });
    
    // 搜索框
    document.getElementById('song-search').addEventListener('input', event => {
        const searchTerm = event.target.value;
        const categoryId = document.getElementById('category-filter').value;
        filterSongs(searchTerm, categoryId);
    });
    
    // 搜索按钮
    document.getElementById('search-btn').addEventListener('click', () => {
        const searchTerm = document.getElementById('song-search').value;
        const categoryId = document.getElementById('category-filter').value;
        filterSongs(searchTerm, categoryId);
    });
    
    // 类别过滤器
    document.getElementById('category-filter').addEventListener('change', event => {
        const categoryId = event.target.value;
        const searchTerm = document.getElementById('song-search').value;
        filterSongs(searchTerm, categoryId);
    });
} 
import { API_URL } from '../../../Common/js/config.js';
import api from '../../../Common/js/api.js';

document.addEventListener('DOMContentLoaded', function() {
    // 初始化页面
    initPage();
});

/**
 * 初始化页面
 */
async function initPage() {
    // 获取当前登录用户信息
    const currentUser = JSON.parse(localStorage.getItem('user'));
    if (!currentUser || !currentUser.id) {
        showMessage('Please log in first', 'danger');
        setTimeout(() => {
            window.location.href = '../login.html';
        }, 2000);
        return;
    }

    try {
        // 加载用户歌曲数据
        await loadUserSongs(currentUser.id);
        
        // 设置事件监听
        setupEventListeners();
        
        // 初始化统计数据
        updateStatistics();
    } catch (error) {
        console.error('Failed to initialize page:', error);
        showMessage('Failed to load data, please try again later', 'danger');
    }
}

/**
 * 加载用户上传的歌曲列表
 */
async function loadUserSongs(userId) {
    try {
        // 显示加载中提示
        const tableBody = document.querySelector('table tbody');
        tableBody.innerHTML = '<tr><td colspan="7" class="text-center">Loading...</td></tr>';
        
        // 调用API获取用户上传的歌曲 - Using the correct endpoint
        const response = await api.get('/song/selectbyuser', {
            params: {
                userId: userId
            }
        });
        
        // 检查响应状态 (Assuming backend returns Result.success(list))
        if (response.data.code === '200') {
            const songs = response.data.data || [];
            renderSongsList(songs);
            return songs;
        } else {
            throw new Error(response.data.msg || 'Failed to fetch song list');
        }
    } catch (error) {
        console.error('Failed to load user songs:', error);
        
        // 显示错误信息
        const tableBody = document.querySelector('table tbody');
        tableBody.innerHTML = '<tr><td colspan="7" class="text-center text-danger">Failed to load, please refresh the page and try again</td></tr>';
        
        throw error;
    }
}

/**
 * 渲染歌曲列表到表格
 */
function renderSongsList(songs) {
    const tableBody = document.querySelector('table tbody');
    
    // 如果没有歌曲，显示提示信息
    if (!songs || songs.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="7" class="text-center">You haven\'t uploaded any songs yet</td></tr>';
        return;
    }
    
    // 清空表格内容
    tableBody.innerHTML = '';
    
    // 遍历歌曲数据，创建表格行
    songs.forEach((song, index) => {
        // 创建新行
        const row = document.createElement('tr');
        
        // 设置状态文本和样式
        let statusText = 'Unknown';
        let statusClass = 'secondary';
        
        switch(song.status) {
            case 0:
                statusText = 'Pending';
                statusClass = 'warning';
                break;
            case 1:
                statusText = 'Approved';
                statusClass = 'success';
                break;
            case 2:
                statusText = 'Rejected';
                statusClass = 'danger';
                break;
        }
        
        // 生成行HTML
        row.innerHTML = `
            <td>
                <div class="custom-control custom-checkbox">
                    <input type="checkbox" class="custom-control-input" id="song${song.id}">
                    <label class="custom-control-label" for="song${song.id}"></label>
                </div>
            </td>
            <td>
                <div class="d-flex align-items-center">
                    <img src="${song.pic || 'assets/media/image/music-thumbnail.jpg'}" alt="" class="mr-3" 
                        style="width: 40px; height: 40px; object-fit: cover;">
                    <div>
                        <h6 class="mb-0">${song.name}</h6>
                        <small class="text-muted">${song.singerId ? 'Singer ID: ' + song.singerId : ''}</small>
                    </div>
                </div>
            </td>
            <td>${song.categoryNames || 'N/A'}</td>
            <td>${formatDate(song.createTime)}</td>
            <td><span class="badge badge-${statusClass}">${statusText}</span></td>
            <td>${song.nums || 0}</td>
            <td>
                <div class="dropdown">
                    <button class="btn btn-light btn-sm" type="button" data-toggle="dropdown">
                        <i data-feather="more-horizontal"></i>
                    </button>
                    <div class="dropdown-menu dropdown-menu-right">
                        <a class="dropdown-item play-song" href="#" data-id="${song.id}" data-url="${song.url}">
                            <i class="mr-2" data-feather="play"></i>Play
                        </a>
                        <a class="dropdown-item edit-song" href="#" data-id="${song.id}">
                            <i class="mr-2" data-feather="edit-2"></i>Edit
                        </a>
                        <a class="dropdown-item" href="song-details.html?songId=${song.id}">
                            <i class="mr-2" data-feather="info"></i>Details
                        </a>
                        <div class="dropdown-divider"></div>
                        <a class="dropdown-item text-danger delete-song" href="#" data-id="${song.id}">
                            <i class="mr-2" data-feather="trash"></i>Delete
                        </a>
                    </div>
                </div>
            </td>
        `;
        
        // 添加到表格
        tableBody.appendChild(row);
    });
    
    // 重新初始化Feather图标
    if (window.feather) {
        feather.replace();
    }
}

/**
 * 更新统计数据
 */
async function updateStatistics() {
    const currentUser = JSON.parse(localStorage.getItem('user'));
    if (!currentUser || !currentUser.id) return;
    
    try {
        // 获取用户歌曲列表 - Also use the correct endpoint here
        const response = await api.get(`/song/selectbyuser`, { 
            params: {
                userId: currentUser.id
            }
        });
        
        if (response.data.code === '200') {
            const songs = response.data.data || [];
            
            // 计算统计数据
            const totalSongs = songs.length;
            const approvedSongs = songs.filter(song => song.status === 1).length;
            const pendingSongs = songs.filter(song => song.status === 0).length;
            const totalPlays = songs.reduce((sum, song) => sum + (song.nums || 0), 0);
            
            // 更新UI
            document.querySelector('.col-lg-3:nth-child(1) h2').textContent = totalSongs;
            document.querySelector('.col-lg-3:nth-child(2) h2').textContent = approvedSongs;
            document.querySelector('.col-lg-3:nth-child(3) h2').textContent = pendingSongs;
            document.querySelector('.col-lg-3:nth-child(4) h2').textContent = formatNumber(totalPlays);
        }
    } catch (error) {
        console.error('Failed to update statistics:', error);
    }
}

/**
 * 设置事件监听
 */
function setupEventListeners() {
    // 上传按钮跳转
    document.querySelector('button[data-toggle="modal"]').addEventListener('click', function(e) {
        e.preventDefault();
        window.location.href = 'upload-music.html';
    });
    
    // 删除歌曲
    document.addEventListener('click', function(e) {
        if (e.target.closest('.delete-song')) {
            e.preventDefault();
            const songId = e.target.closest('.delete-song').getAttribute('data-id');
            confirmDeleteSong(songId);
        }
    });
    
    // 播放歌曲
    document.addEventListener('click', function(e) {
        if (e.target.closest('.play-song')) {
            e.preventDefault();
            const songId = e.target.closest('.play-song').getAttribute('data-id');
            const songUrl = e.target.closest('.play-song').getAttribute('data-url');
            playSong(songId, songUrl);
        }
    });
    
    // 编辑歌曲
    document.addEventListener('click', function(e) {
        if (e.target.closest('.edit-song')) {
            e.preventDefault();
            const songId = e.target.closest('.edit-song').getAttribute('data-id');
            window.location.href = `edit-song.html?songId=${songId}`;
        }
    });
    
    // 全选/取消全选
    const selectAllCheckbox = document.getElementById('selectAll');
    if (selectAllCheckbox) {
        selectAllCheckbox.addEventListener('change', function() {
            const checkboxes = document.querySelectorAll('tbody .custom-control-input');
            checkboxes.forEach(checkbox => {
                checkbox.checked = this.checked;
            });
        });
    }
    
    // 搜索功能
    const searchInput = document.querySelector('input[placeholder="Search music..."]');
    if (searchInput) {
        searchInput.addEventListener('keyup', function(e) {
            if (e.key === 'Enter') {
                const searchTerm = this.value.trim().toLowerCase();
                filterSongs(searchTerm);
            }
        });
        
        // 搜索按钮
        const searchButton = document.querySelector('.input-group-append button');
        if (searchButton) {
            searchButton.addEventListener('click', function() {
                const searchTerm = searchInput.value.trim().toLowerCase();
                filterSongs(searchTerm);
            });
        }
    }
}

/**
 * 根据关键词过滤歌曲
 */
function filterSongs(searchTerm) {
    const rows = document.querySelectorAll('tbody tr');
    
    rows.forEach(row => {
        const songName = row.querySelector('h6')?.textContent.toLowerCase() || '';
        const introduction = row.querySelector('td:nth-child(3)')?.textContent.toLowerCase() || '';
        
        if (songName.includes(searchTerm) || introduction.includes(searchTerm)) {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
    });
}

/**
 * 确认删除歌曲
 */
function confirmDeleteSong(songId) {
    if (confirm('Are you sure you want to delete this song? This action cannot be undone.')) {
        deleteSong(songId);
    }
}

/**
 * 删除歌曲
 */
async function deleteSong(songId) {
    try {
        const response = await api.get(`/song/delete?id=${songId}`);
        
        if (response.data.code === '200') {
            showMessage('Song deleted successfully', 'success');
            
            // 刷新歌曲列表
            const currentUser = JSON.parse(localStorage.getItem('user'));
            await loadUserSongs(currentUser.id);
            
            // 更新统计数据
            updateStatistics();
        } else {
            throw new Error(response.data.msg || 'Deletion failed');
        }
    } catch (error) {
        console.error('Failed to delete song:', error);
        showMessage(`Deletion failed: ${error.message}`, 'danger');
    }
}

/**
 * 播放歌曲
 */
function playSong(songId, songUrl) {
    // 增加播放次数
    api.get(`/song/addNums?songId=${songId}`).catch(console.error);
    
    // 如果有音乐播放器组件，这里可以调用它
    // 临时解决方案：在新窗口打开音频链接
    if (songUrl) {
        window.open(songUrl, '_blank');
    } else {
        showMessage('Cannot play: Song URL is not available', 'warning');
    }
}

/**
 * 格式化日期
 */
function formatDate(dateString) {
    if (!dateString) return 'N/A';
    
    try {
        const date = new Date(dateString);
        return date.toISOString().split('T')[0];
    } catch (e) {
        return dateString;
    }
}

/**
 * 格式化数字
 */
function formatNumber(num) {
    if (num >= 1000) {
        return (num / 1000).toFixed(1) + 'k';
    }
    return num;
}

/**
 * 显示消息提示
 */
function showMessage(message, type) {
    // 检查是否已存在消息容器
    let messageContainer = document.querySelector('.message-container');
    if (!messageContainer) {
        messageContainer = document.createElement('div');
        messageContainer.className = 'message-container position-fixed top-0 end-0 p-3';
        messageContainer.style.zIndex = '9999';
        messageContainer.style.top = '10px';
        messageContainer.style.right = '10px';
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
    
    // 自动关闭
    setTimeout(() => {
        messageElement.classList.remove('show');
        setTimeout(() => {
            messageElement.remove();
        }, 300);
    }, 5000);
    
    // 关闭按钮功能
    messageElement.querySelector('.close').addEventListener('click', function() {
        messageElement.classList.remove('show');
        setTimeout(() => {
            messageElement.remove();
        }, 300);
    });
} 
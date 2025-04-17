import { API_URL } from '../../../Common/js/config.js';
import api from '../../../Common/js/api.js';
import { playSongAudioPlayer } from './audio-player.js';

// Global variable to store the current user ID
let currentUserId = null;

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
        tableBody.innerHTML = '<tr><td colspan="8" class="text-center">Loading...</td></tr>';
        
        // 调用API获取用户上传的歌曲 - Using the correct endpoint returning SongDTO
        const response = await api.get('/song/selectbyuser', {
            params: {
                userId: userId
            }
        });
        
        // 检查响应状态
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
        tableBody.innerHTML = '<tr><td colspan="8" class="text-center text-danger">Failed to load, please refresh the page and try again</td></tr>';
        
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
        tableBody.innerHTML = '<tr><td colspan="8" class="text-center">You haven\'t uploaded any songs yet</td></tr>';
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
                        <h6 class="mb-0">
                            <a href="song-details.html?songId=${song.id}&from=my-music" class="text-dark">${escapeHTML(song.name)}</a>
                        </h6>
                        <small class="text-muted">${song.singerNames || ''}</small>
                    </div>
                </div>
            </td>
            <td>${escapeHTML(song.categoryNames || 'N/A')}</td>
            <td>${escapeHTML(song.tagNames || 'N/A')}</td>
            <td>${formatDate(song.createTime)}</td>
            <td><span class="badge badge-${statusClass}">${statusText}</span></td>
            <td>${song.nums || 0}</td>
            <td class="text-right">
                <div class="dropdown">
                    <button class="btn btn-light btn-sm" type="button" data-toggle="dropdown">
                        <i data-feather="more-horizontal"></i>
                    </button>
                    <div class="dropdown-menu dropdown-menu-right">
                        <a class="dropdown-item play-song" href="#" data-id="${song.id}" data-url="${song.url}">
                            <i class="mr-2" data-feather="play"></i>Play
                        </a>
                        <a class="dropdown-item" href="edit-song.html?songId=${song.id}">
                            <i class="mr-2" data-feather="edit-2"></i>Edit Details
                        </a>
                        <a class="dropdown-item" href="song-details.html?songId=${song.id}&from=my-music">
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
            // Extract necessary info directly from attributes
            const button = e.target.closest('.play-song');
            const songId = button.getAttribute('data-id');
            const songUrl = button.getAttribute('data-url');
            
            // Try to get name/pic from the table row for the player UI
            const row = button.closest('tr');
            const name = row?.querySelector('h6')?.textContent || 'Unknown Song';
            const pic = row?.querySelector('img')?.src || 'assets/media/image/music-thumbnail.jpg';
            const singer = row?.querySelector('small')?.textContent || '';

            // Call the correctly named function with appropriate arguments
            playSongAudioPlayer(songUrl, name, singer, pic);
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
        // Search in song name, category, and tags
        const songName = row.querySelector('td:nth-child(2) h6')?.textContent.toLowerCase() || '';
        const categoryNames = row.querySelector('td:nth-child(3)')?.textContent.toLowerCase() || '';
        const tagNames = row.querySelector('td:nth-child(4)')?.textContent.toLowerCase() || '';
        
        if (songName.includes(searchTerm) || categoryNames.includes(searchTerm) || tagNames.includes(searchTerm)) {
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
    if (!num) return 0;
    if (num >= 1000) {
        return (num / 1000).toFixed(1) + 'k';
    }
    return num;
}

/**
 * HTML转义函数
 */
function escapeHTML(str) {
    if (!str) return '';
    return str.replace(/[&<>"']/g, 
        tag => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        }[tag] || tag)
    );
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
        // Use Bootstrap's alert method if available, otherwise remove directly
        if (typeof $(messageElement).alert === 'function') {
             $(messageElement).alert('close');
        } else {
             messageElement.classList.remove('show');
             setTimeout(() => messageElement.remove(), 150); // Delay removal for fade effect
        }
    }, 5000);
    
    // 关闭按钮功能 (ensure compatibility even if jQuery isn't fully loaded)
    const closeButton = messageElement.querySelector('.close');
    if (closeButton) {
        closeButton.addEventListener('click', function() {
             if (typeof $(messageElement).alert === 'function') {
                 $(messageElement).alert('close');
             } else {
                 messageElement.classList.remove('show');
                 setTimeout(() => messageElement.remove(), 150);
             }
        });
    }
}

// Function to fetch and display user songs
async function fetchUserSongs() {
    // Check if currentUserId is already set (it should be after DOMContentLoaded runs)
    if (!currentUserId) {
        console.error('User ID not found when trying to fetch songs');
        // Potentially show error in table
        const tableBody = document.querySelector('#my-music-table tbody');
        if(tableBody) tableBody.innerHTML = '<tr><td colspan="9" class="text-center">Error: User not identified.</td></tr>';
        return;
    }

    const tableBody = document.querySelector('#my-music-table tbody'); // Assuming table has id="my-music-table"
    if (!tableBody) {
        console.error('Table body not found for my music');
        return;
    }
    tableBody.innerHTML = '<tr><td colspan="9" class="text-center">Loading songs...</td></tr>'; // Updated colspan

    try {
        // Use the /song/selectbyuser endpoint which returns SongDTO
        const response = await api.get(`/song/selectbyuser?userId=${currentUserId}`);
        if (response.data && response.data.code === '1') {
            displaySongs(response.data.data); // Pass the song data array
        } else {
            console.error('Failed to fetch songs:', response.data.msg);
            tableBody.innerHTML = '<tr><td colspan="9" class="text-center">Failed to load songs.</td></tr>'; // Updated colspan
        }
    } catch (error) {
        console.error('Error fetching songs:', error);
        tableBody.innerHTML = '<tr><td colspan="9" class="text-center">Error loading songs. Please try again later.</td></tr>'; // Updated colspan
    }
}

// Function to display songs in the table
function displaySongs(songs) {
    const tableBody = document.querySelector('#my-music-table tbody'); // Re-select or pass as argument
    if (!tableBody) return;

    if (!songs || songs.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="9" class="text-center">No songs found in your library.</td></tr>'; // Updated colspan
        return;
    }

    tableBody.innerHTML = ''; // Clear loading/empty message

    songs.forEach(song => {
        const row = tableBody.insertRow();
        
        // Format categories and tags
        const categoryNames = song.categories ? song.categories.map(c => c.name).join(', ') : 'N/A';
        const tagNames = song.tags ? song.tags.map(t => t.name).join(', ') : '-';
        const uploadDate = song.createTime ? new Date(song.createTime).toLocaleDateString() : 'N/A';
        
        // Determine status text and badge class
        let statusText = 'Pending';
        let statusBadgeClass = 'badge-warning';
        if (song.status === 1) {
            statusText = 'Approved';
            statusBadgeClass = 'badge-success';
        } else if (song.status === 2) {
            statusText = 'Rejected';
            statusBadgeClass = 'badge-danger';
        } // Assuming 0 or other is Pending
        
        row.innerHTML = `
            <td>
                <div class="custom-control custom-checkbox">
                    <input type="checkbox" class="custom-control-input song-checkbox" id="song_${song.id}" data-song-id="${song.id}">
                    <label class="custom-control-label" for="song_${song.id}"></label>
                </div>
            </td>
            <td>${song.name || 'Untitled'}</td>
            <td>${categoryNames}</td>
            <td>${tagNames}</td>
            <td>${uploadDate}</td>
            <td><span class="badge ${statusBadgeClass}">${statusText}</span></td>
            <td>${song.playCount || 0}</td>
            <td class="text-right">
                <button class="btn btn-sm btn-outline-primary play-song-btn" data-song-id="${song.id}">
                    <i data-feather="play" class="width-15 height-15"></i>
                </button>
                <button class="btn btn-sm btn-outline-danger delete-song-btn" data-song-id="${song.id}">
                    <i data-feather="trash-2" class="width-15 height-15"></i>
                </button>
                <!-- Add other action buttons like add to playlist if needed -->
            </td>
            <td> <!-- New Cell for Edit Button -->
                <button class="btn btn-sm btn-info edit-song-btn" data-song-id="${song.id}" data-toggle="modal" data-target="#editSongModal">
                    <i data-feather="edit-2" class="width-15 height-15"></i> Edit
                </button>
            </td>
        `;
    });

    // Re-initialize Feather Icons for the new buttons
    if (typeof feather !== 'undefined') {
        feather.replace();
    }
}

// --- Edit Song Modal Logic ---

// Store selected category and tag IDs for the currently editing song
let selectedEditCategoryIds = new Set();
let selectedEditTagIds = new Set();

async function openEditSongModal(songId) {
    console.log(`Opening edit modal for song ID: ${songId}`);
    const modal = $('#editSongModal'); // Requires jQuery
    const messageArea = document.getElementById('editSongMessage');
    const categoryContainer = document.getElementById('editCategoryPillsContainer');
    const tagContainer = document.getElementById('editTagPillsContainer');
    const songNameInput = document.getElementById('editSongName');
    const singerIdInput = document.getElementById('editSingerId');
    const introductionTextarea = document.getElementById('editIntroduction');
    const lyricTextarea = document.getElementById('editLyric');

    messageArea.style.display = 'none';
    messageArea.textContent = '';
    categoryContainer.innerHTML = '<span class="text-muted">Loading categories...</span>';
    tagContainer.innerHTML = '<span class="text-muted">Loading tags...</span>';
    document.getElementById('editSongForm').reset(); // Reset form fields
    document.getElementById('editSongId').value = songId;

    // Show the modal (Bootstrap 4 requires jQuery)
    modal.modal('show');

    // --- Fetch data (Separated requests) ---
    try {
        // Fetch song details, current categories, current tags, all categories, and all user tags concurrently
        const [songDetailResponse, currentCategoriesResponse, currentTagsResponse, allCategoriesResponse, allUserTagsResponse] = await Promise.all([
            api.get(`/song/detail?songId=${songId}`),       // Get basic song info (using request param)
            api.get(`/song/categories?songId=${songId}`), // Get current categories for this song
            api.get(`/tag/song?songId=${songId}`),         // Get current tags for this song
            api.get('/category/selectAll'),               // Get all available categories
            api.get(`/tag/user?userId=${currentUserId}`)  // Get all tags available to the user
        ]);

        // --- Process Song Details --- //
        if (songDetailResponse.data && songDetailResponse.data.code === '1' && songDetailResponse.data.data) {
            const songData = songDetailResponse.data.data;
            songNameInput.value = songData.name || '';
            // Assuming singerId is directly available or needs to be handled if it's an object
            singerIdInput.value = songData.singerId || ''; 
            introductionTextarea.value = songData.introduction || '';
            lyricTextarea.value = songData.lyric || '';
        } else {
            throw new Error(`Failed to load song details: ${songDetailResponse.data.msg || 'Unknown error'}`);
        }

        // --- Process Current Categories & Tags --- //
        if (currentCategoriesResponse.data && currentCategoriesResponse.data.code === '1') {
            const currentCategories = currentCategoriesResponse.data.data || [];
            selectedEditCategoryIds = new Set(currentCategories.map(cat => cat.id));
            console.log('Initial Category IDs:', selectedEditCategoryIds);
        } else {
             console.warn('Could not load current categories for song:', currentCategoriesResponse.data.msg);
             selectedEditCategoryIds = new Set(); // Start empty if failed
        }

        if (currentTagsResponse.data && currentTagsResponse.data.code === '1') {
            const currentTags = currentTagsResponse.data.data || [];
            selectedEditTagIds = new Set(currentTags.map(tag => tag.id));
            console.log('Initial Tag IDs:', selectedEditTagIds);
        } else {
            console.warn('Could not load current tags for song:', currentTagsResponse.data.msg);
            selectedEditTagIds = new Set(); // Start empty if failed
        }


        // --- Populate All Categories --- //
        categoryContainer.innerHTML = ''; // Clear loading
        if (allCategoriesResponse.data && allCategoriesResponse.data.code === '1' && allCategoriesResponse.data.data) {
            const allCategories = allCategoriesResponse.data.data;
            if (allCategories.length === 0) {
                 categoryContainer.innerHTML = '<span class="text-muted">No categories available.</span>';
            } else {
                allCategories.forEach(category => {
                    const button = document.createElement('button');
                    button.type = 'button';
                    button.className = 'btn btn-sm btn-outline-secondary category-pill';
                    button.textContent = category.name;
                    button.dataset.categoryId = category.id;

                    if (selectedEditCategoryIds.has(category.id)) {
                        button.classList.add('active'); // Mark as selected
                        button.classList.replace('btn-outline-secondary', 'btn-primary');
                    }

                    button.addEventListener('click', () => {
                        const categoryId = parseInt(button.dataset.categoryId);
                        if (selectedEditCategoryIds.has(categoryId)) {
                            selectedEditCategoryIds.delete(categoryId);
                            button.classList.remove('active');
                            button.classList.replace('btn-primary', 'btn-outline-secondary');
                        } else {
                            selectedEditCategoryIds.add(categoryId);
                            button.classList.add('active');
                            button.classList.replace('btn-outline-secondary', 'btn-primary');
                        }
                        console.log('Selected Category IDs:', selectedEditCategoryIds);
                    });
                    categoryContainer.appendChild(button);
                });
            }
        } else {
            categoryContainer.innerHTML = '<span class="text-danger">Failed to load categories.</span>';
            console.error('Failed to load all categories:', allCategoriesResponse.data.msg);
        }

        // --- Populate User Tags --- //
        tagContainer.innerHTML = ''; // Clear loading
        if (allUserTagsResponse.data && allUserTagsResponse.data.code === '1' && allUserTagsResponse.data.data) {
            const userTags = allUserTagsResponse.data.data;
             if (userTags.length === 0) {
                 tagContainer.innerHTML = '<span class="text-muted">You have no tags. <a href="tag-management.html">Manage Tags</a></span>';
            } else {
                userTags.forEach(tag => {
                    const button = document.createElement('button');
                    button.type = 'button';
                    button.className = 'btn btn-sm btn-outline-secondary tag-pill';
                    button.textContent = tag.name;
                    button.dataset.tagId = tag.id;

                    if (selectedEditTagIds.has(tag.id)) {
                        button.classList.add('active'); // Mark as selected
                         button.classList.replace('btn-outline-secondary', 'btn-primary');
                    }

                    button.addEventListener('click', () => {
                        const tagId = parseInt(button.dataset.tagId);
                        if (selectedEditTagIds.has(tagId)) {
                            selectedEditTagIds.delete(tagId);
                            button.classList.remove('active');
                            button.classList.replace('btn-primary', 'btn-outline-secondary');
                        } else {
                            selectedEditTagIds.add(tagId);
                            button.classList.add('active');
                            button.classList.replace('btn-outline-secondary', 'btn-primary');
                        }
                         console.log('Selected Tag IDs:', selectedEditTagIds);
                    });
                    tagContainer.appendChild(button);
                });
            }
        } else {
            tagContainer.innerHTML = '<span class="text-danger">Failed to load tags.</span>';
            console.error('Failed to load user tags:', allUserTagsResponse.data.msg);
        }

    } catch (error) {
        console.error('Error opening or populating edit modal:', error);
        showModalMessage(messageArea, `Error loading details: ${error.message}. Please close and try again.`, true);
        // Optionally disable save button or provide more guidance
    }
}

async function saveSongChanges() {
    console.log('Save changes button clicked');
    const songId = document.getElementById('editSongId').value;
    const messageArea = document.getElementById('editSongMessage');
    messageArea.style.display = 'none';
    messageArea.textContent = '';

    // TODO: Get updated data from form (basic info, category IDs, tag IDs)
    // TODO: Call backend API(s) to save changes (e.g., /song/update, /song/categories/{id}, /song/tags/{id})
    // TODO: Handle success/error responses, show messages, close modal, refresh list
    console.log(`Save logic for song ID: ${songId} needs to be implemented here.`);
    
    // Example of showing a temporary message
    // showModalMessage(messageArea, 'Saving... Please wait.'); 
}

// Function to display messages inside the modal
function showModalMessage(element, message, isError = false) {
    element.textContent = message;
    element.className = isError ? 'alert alert-danger mt-3' : 'alert alert-success mt-3';
    element.style.display = 'block';
}

// --- Event Listeners ---
document.addEventListener('DOMContentLoaded', () => {
    // Get user info from localStorage
    const userString = localStorage.getItem('user');
    const currentUser = userString ? JSON.parse(userString) : null;
    const token = localStorage.getItem('token');
    
    // Set the global currentUserId
    currentUserId = currentUser ? currentUser.id : null;

    if (!currentUserId || !token) { // Check for both ID and token
        console.error('User ID or Token not found in localStorage. Redirecting...');
        alert('Please log in to view your music.');
        window.location.href = '../login.html';
        return;
    }

    console.log('User identified, ID:', currentUserId);

    // Initial fetch of songs
    fetchUserSongs();

    // Event delegation for dynamically added buttons within the table body
    const tableBody = document.querySelector('#my-music-table tbody');
    if (tableBody) {
        tableBody.addEventListener('click', (event) => {
            const targetButton = event.target.closest('button'); // Find the closest button ancestor
            if (!targetButton) return; // Exit if the click wasn't on or inside a button

            const songId = targetButton.dataset.songId;
            if (!songId) return; // Exit if button doesn't have songId

            if (targetButton.classList.contains('edit-song-btn')) {
                event.preventDefault(); // Prevent default if it's inside a link/form
                openEditSongModal(songId);
            } else if (targetButton.classList.contains('play-song-btn')) {
                // Handle play button click (existing logic might be elsewhere or needs adding)
                console.log(`Play button clicked for song ID: ${songId}`);
                // Example: playSong(songId);
            } else if (targetButton.classList.contains('delete-song-btn')) {
                // Handle delete button click (existing logic might be elsewhere or needs adding)
                console.log(`Delete button clicked for song ID: ${songId}`);
                // Example: confirmAndDeleteSong(songId);
            }
            // Add more conditions for other action buttons if needed
        });
    }
    
    // Add listener for the modal save button
    const saveButton = document.getElementById('saveSongChangesButton');
    if (saveButton) {
        saveButton.addEventListener('click', saveSongChanges);
    }

    // Add listener for select all checkbox (if needed)
    // ...

});

// Assume table in my-music.html has id="my-music-table"
// Remember to include jQuery if using Bootstrap modal functions like $('#editSongModal').modal('show');
// Ensure Feather Icons are initialized after dynamic content generation. 
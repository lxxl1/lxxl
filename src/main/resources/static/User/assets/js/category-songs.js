import { API_URL } from '../../../Common/js/config.js';
import api from '../../../Common/js/api.js';

// Global variables
let allCategories = []; // Store all available categories
let currentCategoryId = null; // Current displayed category ID
let currentCategoryName = null; // Current displayed category name
let currentUserId = null; // Current user ID
let songs = []; // Store loaded song list

document.addEventListener('DOMContentLoaded', () => {
    console.log('页面加载完成，正在初始化...');
    
    // Check if user is logged in
    try {
        checkUserLoggedIn();
        
        // Get category ID and name from URL parameters
        const urlParams = new URLSearchParams(window.location.search);
        const categoryId = urlParams.get('id');
        const categoryName = urlParams.get('name');
        
        if (!categoryId) {
            showAlert('缺少类别ID参数', 'error');
            setTimeout(() => {
                window.location.href = 'categories.html';
            }, 2000);
            return;
        }
        
        currentCategoryId = categoryId;
        currentCategoryName = categoryName;
        
        // Set category name in title and breadcrumb
        document.getElementById('categoryPageTitle').textContent = categoryName || 'Category Songs';
        document.getElementById('categoryNameBreadcrumb').textContent = categoryName || 'Category Songs';
        
        // Set category name in stats card
        document.getElementById('categoryNameStat').textContent = categoryName || '-';
        
        console.log('正在加载类别歌曲数据...');
        
        // Load songs for this category
        loadCategorySongs(categoryId);
        
        // Load tag count stats
        loadTagCount();
        
        // Set up search functionality
        const searchInput = document.getElementById('searchInput');
        const searchButton = document.getElementById('searchButton');
        
        if (searchInput && searchButton) {
            searchInput.addEventListener('keyup', (e) => {
                if (e.key === 'Enter') {
                    filterSongs(searchInput.value);
                }
            });
            
            searchButton.addEventListener('click', () => {
                filterSongs(searchInput.value);
            });
        }
        
        // Initialize feather icons
        if (window.feather) {
            console.log('初始化Feather图标');
            feather.replace();
        } else {
            console.warn('Feather图标库未加载');
        }
    } catch (error) {
        console.error('页面初始化错误:', error);
        showAlert('页面初始化失败: ' + (error.message || '未知错误'), 'error');
    }
});

// Function to check if user is logged in
function checkUserLoggedIn() {
    try {
        const userStr = localStorage.getItem('user');
        if (!userStr) {
            console.error('未找到用户信息');
            window.location.href = '../login.html';
            return;
        }
        
        const user = JSON.parse(userStr);
        
        if (!user || !user.id) {
            console.error('用户信息不完整');
            window.location.href = '../login.html';
            return;
        }
        
        console.log('用户已登录:', user.id);
        currentUserId = user.id;
    } catch (error) {
        console.error('检查用户登录状态出错:', error);
        showAlert('请先登录', 'error');
        setTimeout(() => {
            window.location.href = '../login.html';
        }, 2000);
        throw error;
    }
}

// Function to safely get API endpoint
function getApiEndpoint() {
    try {
        // Check if API_URL is defined in config
        if (typeof API_URL !== 'undefined' && API_URL) {
            return API_URL;
        } else {
            // Default fallback
            console.warn('API_URL未定义，使用默认地址');
            return 'http://localhost:8080';
        }
    } catch (error) {
        console.error('获取API地址出错:', error);
        return 'http://localhost:8080'; // Default fallback
    }
}

// Function to load tag count for stats
async function loadTagCount() {
    try {
        console.log('正在加载标签统计...');
        
        // If API module is not available, use fetch
        if (typeof api === 'undefined' || !api) {
            console.warn('API模块未加载，使用原生fetch');
            const response = await fetch(`${getApiEndpoint()}/tag/selectbyuser?userId=${currentUserId}`);
            const data = await response.json();
            
            if (data.code === '200') {
                const tags = data.data || [];
                document.getElementById('tagCountStat').textContent = tags.length;
            } else {
                document.getElementById('tagCountStat').textContent = '?';
            }
            return;
        }
        
        const response = await api.get('/tag/selectbyuser', {
            params: { userId: currentUserId }
        });
        
        if (response.data.code === '200') {
            const tags = response.data.data || [];
            document.getElementById('tagCountStat').textContent = tags.length;
        } else {
            document.getElementById('tagCountStat').textContent = '?';
        }
    } catch (error) {
        console.error('加载标签统计出错:', error);
        document.getElementById('tagCountStat').textContent = '?';
    }
}

// Function to load songs for a specific category
async function loadCategorySongs(categoryId) {
    try {
        console.log('正在加载类别歌曲:', categoryId);
        
        // If API module is not available, use fetch
        if (typeof api === 'undefined' || !api) {
            console.warn('API模块未加载，使用原生fetch');
            const response = await fetch(`${getApiEndpoint()}/song/selectbyuser?userId=${currentUserId}`);
            const data = await response.json();
            
            if (data.code !== '200') {
                throw new Error(data.msg || '获取歌曲失败');
            }
            
            const allSongs = data.data || [];
            
            // Filter songs by category ID
            songs = allSongs.filter(song => 
                song.categoryIds && Array.isArray(song.categoryIds) && 
                song.categoryIds.includes(parseInt(categoryId))
            );
            
            // Update song count badge and stat card
            document.getElementById('songCountBadge').textContent = `${songs.length} songs`;
            document.getElementById('songCountStat').textContent = songs.length;
            
            // Display songs
            displaySongs(songs);
            return;
        }
        
        const response = await api.get('/song/selectbyuser', {
            params: { userId: currentUserId }
        });
        
        if (response.data.code !== '200') {
            throw new Error(response.data.msg || '获取歌曲失败');
        }
        
        const allSongs = response.data.data || [];
        
        // Filter songs by category ID
        songs = allSongs.filter(song => 
            song.categoryIds && Array.isArray(song.categoryIds) && 
            song.categoryIds.includes(parseInt(categoryId))
        );
        
        console.log(`找到 ${songs.length} 首歌曲属于类别 ${categoryId}`);
        
        // Update song count badge and stat card
        document.getElementById('songCountBadge').textContent = `${songs.length} songs`;
        document.getElementById('songCountStat').textContent = songs.length;
        
        // Display songs
        displaySongs(songs);
    } catch (error) {
        console.error('加载歌曲失败:', error);
        showAlert('加载歌曲失败，请稍后重试: ' + (error.message || '未知错误'), 'error');
        
        // Show empty state
        const songsContainer = document.getElementById('songsContainer');
        const noSongsMessage = document.getElementById('noSongsMessage');
        
        if (songsContainer) songsContainer.style.display = 'none';
        if (noSongsMessage) noSongsMessage.style.display = 'block';
    }
}

// Function to display songs in UI
function displaySongs(songs) {
    try {
        const songsContainer = document.getElementById('songsContainer');
        const noSongsMessage = document.getElementById('noSongsMessage');
        
        if (!songsContainer || !noSongsMessage) {
            console.error('找不到歌曲容器元素');
            return;
        }
        
        // Clear loading state
        songsContainer.innerHTML = '';
        
        if (!songs || songs.length === 0) {
            songsContainer.style.display = 'none';
            noSongsMessage.style.display = 'block';
            return;
        }
        
        noSongsMessage.style.display = 'none';
        songsContainer.style.display = 'flex';
        
        console.log('正在渲染歌曲列表...');
        
        // Create song cards
        songs.forEach(song => {
            if (!song) return; // Skip null entries
            
            const songCard = document.createElement('div');
            songCard.className = 'col-md-4 col-lg-3 mb-4';
            
            // Get tags as comma-separated string - Handle null or non-array tagNames
            let tagNamesString = 'No tags';
            if (song.tagNames) {
                if (Array.isArray(song.tagNames)) {
                    if (song.tagNames.length > 0) {
                        tagNamesString = song.tagNames.join(', ');
                    }
                } else if (typeof song.tagNames === 'string') {
                    tagNamesString = song.tagNames;
                } else {
                    // Handle case where tagNames is not an array or string
                    console.warn('Unexpected tagNames format:', song.tagNames);
                    tagNamesString = String(song.tagNames);
                }
            }
            
            songCard.innerHTML = `
                <div class="song-card card h-100 position-relative">
                    <div class="song-controls">
                        <button class="btn btn-sm btn-danger remove-song" data-song-id="${song.id}" title="Remove from category">
                            <i data-feather="x"></i>
                        </button>
                    </div>
                    <img src="${song.coverUrl || 'assets/media/image/default-cover.jpg'}" class="song-image card-img-top" alt="${escapeHTML(song.name || 'Unnamed Song')}">
                    <div class="card-body">
                        <h5 class="card-title">${escapeHTML(song.name || 'Unnamed Song')}</h5>
                        <p class="card-text text-muted">${escapeHTML(song.artist || 'Unknown artist')}</p>
                        <div class="mb-2">
                            <small class="text-muted d-block">Tags: ${escapeHTML(tagNamesString)}</small>
                        </div>
                        <button class="btn btn-sm btn-primary play-song" data-song-url="${song.url || '#'}" 
                                data-song-name="${escapeHTML(song.name || 'Unnamed Song')}" 
                                data-song-artist="${escapeHTML(song.artist || 'Unknown artist')}" 
                                data-song-cover="${song.coverUrl || 'assets/media/image/default-cover.jpg'}">
                            <i data-feather="play"></i> Play
                        </button>
                    </div>
                </div>
            `;
            
            songsContainer.appendChild(songCard);
        });
        
        console.log('歌曲列表渲染完成，初始化事件监听...');
        
        // Re-initialize feather icons
        if (window.feather) {
            feather.replace();
        }
        
        // Set up play song event listeners
        setupPlaySongListeners();
        
        // Set up remove song event listeners
        setupRemoveSongListeners();
    } catch (error) {
        console.error('显示歌曲列表出错:', error);
        showAlert('显示歌曲列表失败: ' + (error.message || '未知错误'), 'error');
    }
}

// Function to set up play song listeners
function setupPlaySongListeners() {
    try {
        const playButtons = document.querySelectorAll('.play-song');
        
        playButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                const songUrl = button.getAttribute('data-song-url');
                const songName = button.getAttribute('data-song-name');
                const songArtist = button.getAttribute('data-song-artist');
                const songCover = button.getAttribute('data-song-cover');
                
                // Set the audio player source
                const audioPlayer = document.getElementById('audioPlayer');
                if (!audioPlayer) {
                    console.error('找不到音频播放器元素');
                    return;
                }
                
                audioPlayer.src = songUrl;
                
                // Update the player UI
                document.getElementById('currentSongTitle').textContent = songName;
                document.getElementById('currentSongArtist').textContent = songArtist;
                document.getElementById('currentSongCover').src = songCover;
                
                // Change play/pause button icon to pause
                const playPauseButton = document.getElementById('playPauseButton');
                if (playPauseButton) {
                    playPauseButton.innerHTML = '<i class="fas fa-pause"></i>';
                }
                
                // Play the song
                audioPlayer.play().catch(error => {
                    console.error('播放歌曲失败:', error);
                    showAlert('播放歌曲失败: ' + (error.message || '未知错误'), 'error');
                });
            });
        });
    } catch (error) {
        console.error('设置播放按钮事件出错:', error);
    }
}

// Function to set up remove song listeners
function setupRemoveSongListeners() {
    try {
        const removeButtons = document.querySelectorAll('.remove-song');
        
        removeButtons.forEach(button => {
            button.addEventListener('click', async (e) => {
                const songId = button.getAttribute('data-song-id');
                
                // Define confirmation function
                const confirmRemoval = async () => {
                    try {
                        await removeSongFromCategory(songId, currentCategoryId);
                        
                        // Refresh songs list
                        loadCategorySongs(currentCategoryId);
                        
                        showAlert('歌曲已从类别中移除', 'success');
                    } catch (error) {
                        console.error('移除歌曲出错:', error);
                        showAlert('移除失败: ' + (error.message || '未知错误'), 'error');
                    }
                };
                
                // Use SweetAlert2 for confirmation if available
                if (typeof Swal !== 'undefined') {
                    Swal.fire({
                        title: '确认移除',
                        text: '您确定要将这首歌从该类别中移除吗？',
                        icon: 'warning',
                        showCancelButton: true,
                        confirmButtonColor: '#3085d6',
                        cancelButtonColor: '#d33',
                        confirmButtonText: '是的，移除它',
                        cancelButtonText: '取消'
                    }).then(async (result) => {
                        if (result.isConfirmed) {
                            await confirmRemoval();
                        }
                    });
                } else {
                    // Fallback to browser confirm if SweetAlert is not loaded
                    if (confirm('确定要将这首歌从该类别中移除吗？')) {
                        await confirmRemoval();
                    }
                }
            });
        });
    } catch (error) {
        console.error('设置移除按钮事件出错:', error);
    }
}

// Function to remove a song from a category
async function removeSongFromCategory(songId, categoryId) {
    try {
        console.log(`正在移除歌曲 ${songId} 从类别 ${categoryId}`);
        
        // If API module is not available, use fetch
        if (typeof api === 'undefined' || !api) {
            console.warn('API模块未加载，使用原生fetch');
            
            // Get current song
            const songResponse = await fetch(`${getApiEndpoint()}/song/select/${songId}`);
            const songData = await songResponse.json();
            
            if (songData.code !== '200') {
                throw new Error('获取歌曲详情失败');
            }
            
            const song = songData.data;
            if (!song || !song.categoryIds || !Array.isArray(song.categoryIds)) {
                throw new Error('歌曲没有类别数据');
            }
            
            // Filter out the current category ID
            const updatedCategoryIds = song.categoryIds.filter(id => id !== parseInt(categoryId));
            
            // Update song
            const updateResponse = await fetch(`${getApiEndpoint()}/song/updateCategories`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ 
                    songId: parseInt(songId), 
                    categoryIds: updatedCategoryIds 
                })
            });
            
            const updateData = await updateResponse.json();
            
            if (updateData.code !== '200') {
                throw new Error(updateData.msg || '更新歌曲类别失败');
            }
            
            return true;
        }
        
        // Get current song categories
        const songResponse = await api.get(`/song/select/${songId}`);
        if (songResponse.data.code !== '200') {
            throw new Error('获取歌曲详情失败');
        }
        
        const song = songResponse.data.data;
        if (!song || !song.categoryIds || !Array.isArray(song.categoryIds)) {
            throw new Error('歌曲没有类别数据');
        }
        
        // Filter out the current category ID
        const updatedCategoryIds = song.categoryIds.filter(id => id !== parseInt(categoryId));
        
        // Update song with new categories list
        const updateResponse = await api.put('/song/updateCategories', { 
            songId: parseInt(songId),
            categoryIds: updatedCategoryIds
        });
        
        if (updateResponse.data.code !== '200') {
            throw new Error(updateResponse.data.msg || '更新歌曲类别失败');
        }
        
        return true;
    } catch (error) {
        console.error('移除歌曲从类别出错:', error);
        throw error;
    }
}

// Function to filter songs by search term
function filterSongs(searchTerm) {
    try {
        if (!searchTerm || searchTerm.trim() === '') {
            // If search term is empty, show all songs
            displaySongs(songs);
            return;
        }
        
        const term = searchTerm.toLowerCase().trim();
        const filteredSongs = songs.filter(song => {
            if (!song) return false;
            
            const songName = (song.name || '').toLowerCase();
            const songArtist = (song.artist || '').toLowerCase();
            
            // Handle tagNames carefully
            let tagNamesText = '';
            if (song.tagNames) {
                if (Array.isArray(song.tagNames)) {
                    tagNamesText = song.tagNames.join(' ').toLowerCase();
                } else if (typeof song.tagNames === 'string') {
                    tagNamesText = song.tagNames.toLowerCase();
                }
            }
            
            return songName.includes(term) || 
                   songArtist.includes(term) || 
                   tagNamesText.includes(term);
        });
        
        // Display filtered songs
        displaySongs(filteredSongs);
    } catch (error) {
        console.error('过滤歌曲出错:', error);
        showAlert('搜索功能出错: ' + (error.message || '未知错误'), 'error');
    }
}

// Function to show alert messages
function showAlert(message, type = 'info') {
    try {
        const alertsContainer = document.getElementById('alerts');
        if (!alertsContainer) {
            console.error('找不到提示容器元素');
            return;
        }
        
        const alertId = 'alert-' + Date.now();
        
        const alertHTML = `
            <div id="${alertId}" class="alert alert-${type} alert-dismissible fade show" role="alert">
                ${message}
                <button type="button" class="close" data-dismiss="alert" aria-label="Close">
                    <span aria-hidden="true">&times;</span>
                </button>
            </div>
        `;
        
        alertsContainer.innerHTML += alertHTML;
        
        // Auto-dismiss after 5 seconds
        setTimeout(() => {
            const alertElement = document.getElementById(alertId);
            if (alertElement) {
                if (typeof $ !== 'undefined') {
                    $(alertElement).alert('close');
                } else {
                    // Fallback if jQuery is not available
                    alertElement.style.display = 'none';
                    setTimeout(() => {
                        try {
                            alertElement.remove();
                        } catch (e) {
                            // Element might be already removed
                        }
                    }, 500);
                }
            }
        }, 5000);
    } catch (error) {
        console.error('显示提示消息出错:', error);
    }
}

/**
 * HTML escape function
 */
function escapeHTML(str) {
    if (!str) return '';
    return String(str).replace(/[&<>"']/g, 
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
 * Show message notification
 */
function showMessage(message, type) {
    // For backwards compatibility, just call showAlert
    showAlert(message, type);
} 
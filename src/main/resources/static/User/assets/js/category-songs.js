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
        
        songs.forEach(song => {
            if (song) {
                const songCard = createSongCard(song);
                songsContainer.appendChild(songCard);
            } else {
                console.warn('遇到无效的歌曲数据:', song);
            }
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
        
        // Set up edit categories event listeners
        setupEditCategoriesListeners();
    } catch (error) {
        console.error('渲染歌曲时出错:', error);
        showAlert('渲染歌曲列表时出错。', 'error');
        // Show empty state
        const songsContainer = document.getElementById('songsContainer');
        const noSongsMessage = document.getElementById('noSongsMessage');
        if (songsContainer) songsContainer.style.display = 'none';
        if (noSongsMessage) noSongsMessage.style.display = 'block';
    }
}

// Function to create a song card HTML element
function createSongCard(song) {
    const songId = song.id;
    const songName = escapeHTML(song.name || '未知歌曲');
    const singerName = escapeHTML(song.singerName || '未知艺术家');
    const coverUrl = song.pic ? `${getApiEndpoint()}${song.pic}` : 'assets/media/image/default-cover.jpg';

    const cardCol = document.createElement('div');
    cardCol.className = 'col-lg-3 col-md-4 col-sm-6 mb-4';

    cardCol.innerHTML = `
        <div class="card song-card shadow-sm h-100">
            <img src="${coverUrl}" class="card-img-top song-image" alt="${songName} Cover">
            <div class="card-body d-flex flex-column">
                <h6 class="card-title flex-grow-1">${songName}</h6>
                <p class="card-text text-muted small mb-2">${singerName}</p>
                <div class="mt-auto d-flex justify-content-between align-items-center">
                     <button class="btn btn-sm btn-outline-primary play-song-btn" data-song-id="${songId}">
                        <i data-feather="play-circle" class="mr-1" style="width: 16px; height: 16px;"></i> Play
                    </button>
                    <div class="song-controls">
                        <button class="btn btn-sm btn-light text-info edit-categories-btn" data-song-id="${songId}" data-song-name="${songName}" title="Edit Categories">
                            <i data-feather="tag"></i>
                        </button>
                        <button class="btn btn-sm btn-light text-danger remove-song-btn" data-song-id="${songId}" data-song-name="${songName}" title="Remove from Category">
                            <i data-feather="trash-2"></i>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    return cardCol;
}

// Function to set up play song listeners
function setupPlaySongListeners() {
    try {
        const playButtons = document.querySelectorAll('.play-song-btn');
        
        playButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                const songId = button.getAttribute('data-song-id');
                
                // Find the corresponding song card
                const songCard = document.querySelector(`.play-song-btn[data-song-id="${songId}"]`).closest('.col-lg-3');
                if (!songCard) {
                    console.error('找不到对应的歌曲卡片');
                    return;
                }
                
                // Extract song details from the song card
                const songName = songCard.querySelector('.card-title').textContent;
                const songArtist = songCard.querySelector('.card-text').textContent.split('\n')[0];
                const songCover = songCard.querySelector('.song-image').src;
                const songUrl = songCard.querySelector('.play-song-btn').getAttribute('data-song-url');
                
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
        const removeButtons = document.querySelectorAll('.remove-song-btn');
        
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
function showAlert(message, type = 'info', containerId = 'alerts') {
    const alertContainer = document.getElementById(containerId);
    if (!alertContainer) {
        console.error(`Alert container with ID '${containerId}' not found.`);
        // Fallback to default container if modal alert container not found
        if (containerId !== 'alerts') {
             showAlert(message, type, 'alerts');
        } else {
            // If default also fails, log to console
            console.error(`Alert: [${type}] ${message}`);
        }
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
    
    alertContainer.innerHTML += alertHTML;
    
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

// Function to set up listeners for Edit Categories buttons
function setupEditCategoriesListeners() {
    const editButtons = document.querySelectorAll('.edit-categories-btn');
    editButtons.forEach(button => {
        button.addEventListener('click', handleEditCategoriesClick);
    });
    
    // Also setup listener for the modal save button ONCE
    const saveButton = document.getElementById('saveCategoriesButton');
    if (saveButton) {
        // Remove previous listener to avoid duplicates if called multiple times
        saveButton.removeEventListener('click', handleSaveChangesClick); 
        saveButton.addEventListener('click', handleSaveChangesClick);
    } else {
        console.error('找不到保存类别按钮');
    }
}

// Handler for Edit Categories button click
async function handleEditCategoriesClick(event) {
    const button = event.currentTarget;
    const songId = button.dataset.songId;
    const songName = button.dataset.songName;

    if (!songId) {
        console.error('无法获取歌曲ID');
        showAlert('无法编辑类别，缺少歌曲信息。', 'error');
        return;
    }

    console.log(`编辑歌曲 "${songName}" (ID: ${songId}) 的类别`);

    // --- MODIFICATION START --- Find song data locally
    const songData = songs.find(s => s && s.id === parseInt(songId));
    if (!songData) {
        console.error(`无法在本地数据中找到歌曲 ID: ${songId}`);
        showAlert('无法加载歌曲的类别信息。请尝试刷新页面。', 'error');
        return;
    }
    const songCategoryIds = new Set(songData.categoryIds || []); // Get category IDs from local data
    console.log('从本地获取的歌曲当前类别ID:', Array.from(songCategoryIds));
    // --- MODIFICATION END ---

    // Set modal title and song ID
    document.getElementById('modalSongTitle').textContent = songName;
    document.getElementById('modalSongId').value = songId;
    
    // Clear previous modal content and show loading indicator
    const categoryListContainer = document.getElementById('modalCategoryList');
    categoryListContainer.innerHTML = `<div class="text-center"><div class="spinner-border spinner-border-sm" role="status"><span class="visually-hidden">加载类别...</span></div></div>`;
    document.getElementById('modalAlerts').innerHTML = ''; // Clear previous alerts

    // Show the modal
    $('#editCategoriesModal').modal('show');

    try {
        // Fetch only all categories (song categories are already available locally)
        const allCategoriesRes = await fetchAllCategories();

        if (!allCategoriesRes) {
            // Error handled within fetch function
            $('#editCategoriesModal').modal('hide'); // Hide modal on critical fetch error
            return;
        }

        const allCategories = allCategoriesRes;
        // Use locally fetched songCategoryIds
        console.log('所有类别:', allCategories);

        // Populate the modal with categories
        populateCategoryModal(allCategories, songCategoryIds); // Pass local songCategoryIds

    } catch (error) {
        console.error('加载所有类别时出错:', error);
        showAlert('加载类别列表失败，请稍后重试。', 'error', 'modalAlerts');
        categoryListContainer.innerHTML = '<p class="text-danger text-center">无法加载类别列表。</p>';
    }
}

// Helper function to fetch all categories
async function fetchAllCategories() {
    try {
        console.log('正在获取所有类别...');
        // MODIFIED: Corrected URL case
        const response = await api.get('/category/selectAll'); 
        if (response.data.code === '200') {
            console.log('成功获取所有类别:', response.data.data);
            return response.data.data || [];
        } else {
            console.error('获取类别失败:', response.data.msg);
            showAlert('无法获取所有类别: ' + response.data.msg, 'error', 'modalAlerts');
            return null;
        }
    } catch (error) {
        console.error('获取所有类别时网络错误:', error);
        showAlert('网络错误，无法获取所有类别。', 'error', 'modalAlerts');
        return null;
    }
}

// Helper function to fetch categories for a specific song - REMOVED as we get data locally now
// async function fetchSongCategories(songId) { ... }

// Function to populate the category modal with pills/badges
function populateCategoryModal(allCategories, songCategoryIds) {
    const categoryListContainer = document.getElementById('modalCategoryList');
    categoryListContainer.innerHTML = ''; // Clear loading indicator

    if (!allCategories || allCategories.length === 0) {
        categoryListContainer.innerHTML = '<p class="text-muted text-center w-100">没有可用的类别。</p>';
        return;
    }

    allCategories.forEach(category => {
        const categoryId = typeof category.id === 'string' ? parseInt(category.id) : category.id;
        const isSelected = songCategoryIds.has(categoryId);
        
        // Create a pill element (using button for better accessibility)
        const pill = document.createElement('button');
        pill.type = 'button'; // Prevent form submission if inside a form
        pill.className = `btn btn-sm badge badge-pill ${isSelected ? 'btn-primary' : 'btn-outline-secondary'}`;
        pill.textContent = escapeHTML(category.name);
        pill.dataset.categoryId = category.id; // Store ID in data attribute
        
        // Add click listener to toggle selection
        pill.addEventListener('click', () => {
            const currentId = parseInt(pill.dataset.categoryId);
            if (pill.classList.contains('btn-primary')) {
                // Deselect
                pill.classList.remove('btn-primary');
                pill.classList.add('btn-outline-secondary');
                songCategoryIds.delete(currentId); // Update the set locally
            } else {
                // Select
                pill.classList.remove('btn-outline-secondary');
                pill.classList.add('btn-primary');
                songCategoryIds.add(currentId); // Update the set locally
            }
            console.log('Updated songCategoryIds:', songCategoryIds); // Log changes
        });
        
        categoryListContainer.appendChild(pill);
    });
}

// Handler for Save Changes button click in modal
async function handleSaveChangesClick() {
    const saveButton = document.getElementById('saveCategoriesButton');
    const songId = document.getElementById('modalSongId').value;
    
    // --- MODIFICATION START --- Get selected IDs from pills
    const selectedPills = document.querySelectorAll('#modalCategoryList .btn-primary');
    const selectedCategoryIds = Array.from(selectedPills).map(pill => pill.dataset.categoryId);
    // --- MODIFICATION END ---

    if (!songId) {
        console.error('无法获取模态框中的歌曲ID');
        showAlert('无法保存类别，缺少歌曲信息。', 'error', 'modalAlerts');
        return;
    }

    console.log(`保存歌曲 ${songId} 的类别:`, selectedCategoryIds);

    // Disable button to prevent multiple clicks
    saveButton.disabled = true;
    saveButton.innerHTML = `<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Saving...`;

    try {
        // --- REVERTED to PUT and JSON --- 
        // Backend controller needs to be fixed/created to handle this PUT request with JSON body
        const response = await api.put('/song/updateCategory', { // Use PUT and potentially a new endpoint
            songId: parseInt(songId), 
            categoryIds: selectedCategoryIds.map(id => parseInt(id)) // Send as array of integers
        });
        // --- REVERT END ---

        if (response.data.code === '200') {
            showAlert('歌曲类别已成功更新！', 'success', 'modalAlerts');
            console.log('类别更新成功');
            
            // --- MODIFICATION START --- Update local song data
            const songIndex = songs.findIndex(s => s && s.id === parseInt(songId));
            if (songIndex !== -1) {
                songs[songIndex].categoryIds = selectedCategoryIds.map(id => parseInt(id));
                console.log(`本地歌曲 ${songId} 的类别已更新:`, songs[songIndex].categoryIds);
            }
             // --- MODIFICATION END ---

            // Check if the song should be removed from the current view
            const currentCategorySelected = selectedCategoryIds.includes(currentCategoryId.toString());
             if (!currentCategorySelected) {
                console.log(`歌曲已从此类别 (${currentCategoryId}) 移除，将从列表中删除。`);
                 // Find the card and remove it
                 const cardToRemove = document.querySelector(`.edit-categories-btn[data-song-id="${songId}"]`).closest('.col-lg-3');
                 if (cardToRemove) {
                     cardToRemove.remove();
                     // Update counts by filtering the main songs array
                     songs = songs.filter(s => s.id !== parseInt(songId)); // Remove from global array
                     document.getElementById('songCountBadge').textContent = `${songs.length} songs`;
                     document.getElementById('songCountStat').textContent = songs.length;
                     if (songs.length === 0) {
                         displaySongs([]); // Show empty message if no songs left in this category view
                     }
                 }
            }

            // Close the modal after a short delay
            setTimeout(() => {
                $('#editCategoriesModal').modal('hide');
            }, 1500);

        } else {
            console.error('保存类别失败:', response.data.msg);
            showAlert(`保存类别失败: ${response.data.msg || '未知错误'}`, 'error', 'modalAlerts');
        }

    } catch (error) {
        console.error('保存类别时网络错误:', error);
        showAlert(`网络错误，无法保存类别: ${error.message || '请检查网络连接'}`, 'error', 'modalAlerts');
    } finally {
        // Re-enable button
        saveButton.disabled = false;
        saveButton.innerHTML = 'Save Changes';
    }
} 
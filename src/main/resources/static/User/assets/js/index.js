import { API_URL } from '../../../Common/js/config.js';
import api from '../../../Common/js/api.js';

// Global variables
let allSongs = [];
let approvedSongs = []; // Only songs with status=1
let allCategories = [];
let allSingers = [];

// Page initialization
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Initialize all data
        await Promise.all([
            loadAllSongs(),
            loadAllCategories(),
            loadAllSingers()
        ]);
        
        // Update UI components
        updateStatistics();
        renderTopSongs();
        renderLatestSongs();
        
        // Setup event listeners
        setupEventListeners();
        
    } catch (error) {
        console.error('Initialization error:', error);
        showMessage('Failed to load dashboard data. Please refresh the page.', 'error');
    }
});

/**
 * Load all songs from API and filter approved ones
 */
async function loadAllSongs() {
    try {
        const response = await api.get('/song/allSong');
        if (response.data && response.data.code === '200' && response.data.data) {
            allSongs = response.data.data;
            // Filter only approved songs (status=1)
            approvedSongs = allSongs.filter(song => song.status === 1);
            return true;
        }
        return false;
    } catch (error) {
        console.error('Error loading songs:', error);
        return false;
    }
}

/**
 * Load all categories from API
 */
async function loadAllCategories() {
    try {
        const response = await api.get('/category/selectAll');
        if (response.data && response.data.code === '200' && response.data.data) {
            allCategories = response.data.data;
            return true;
        }
        return false;
    } catch (error) {
        console.error('Error loading categories:', error);
        return false;
    }
}

/**
 * Load all singers from API
 */
async function loadAllSingers() {
    try {
        const response = await api.get('/singer/allSinger');
        if (response.data && response.data.code === '200' && response.data.data) {
            allSingers = response.data.data;
            return true;
        }
        return false;
    } catch (error) {
        console.error('Error loading singers:', error);
        return false;
    }
}

/**
 * Update statistics section with counts
 */
function updateStatistics() {
    // Update total songs count (only approved songs)
    document.getElementById('total-songs-count').textContent = approvedSongs.length;
    
    // Update categories count
    const categoriesElement = document.querySelector('.card.bg-success-gradient h2');
    if (categoriesElement) {
        categoriesElement.textContent = allCategories.length;
    }
    
    // Update artists count
    const artistsElement = document.querySelector('.card.bg-info-gradient h2');
    if (artistsElement) {
        artistsElement.textContent = allSingers.length;
    }
    
    // Update top songs count
    document.getElementById('top-songs-count').textContent = 
        Math.min(5, approvedSongs.length); // We display top 5 songs
}

/**
 * Render top songs table
 */
function renderTopSongs() {
    const tableBody = document.querySelector('#top-songs-table tbody');
    if (!tableBody) return;
    
    // Sort songs by play count (descending)
    const topSongs = [...approvedSongs]
        .sort((a, b) => (b.playCount || 0) - (a.playCount || 0))
        .slice(0, 5); // Get top 5
    
    if (topSongs.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="5" class="text-center">No songs available</td></tr>';
        return;
    }
    
    let html = '';
    topSongs.forEach((song, index) => {
        const singerName = allSingers.find(singer => singer.id === song.singerId)?.name || 'Unknown Artist';
        
        html += `
            <tr>
                <td>${index + 1}</td>
                <td>
                    <div class="d-flex align-items-center">
                        <img src="${song.pic || 'assets/media/image/default-album.png'}" class="mr-3" width="40" height="40" alt="${song.name}">
                        <span>${song.name}</span>
                    </div>
                </td>
                <td>${singerName}</td>
                <td>${song.playCount || 0}</td>
                <td>
                    <button class="btn btn-sm btn-primary play-song-btn" data-song-id="${song.id}">
                        <i data-feather="play"></i> Play
                    </button>
                </td>
            </tr>
        `;
    });
    
    tableBody.innerHTML = html;
    
    // Initialize feather icons
    if (typeof feather !== 'undefined') {
        feather.replace();
    }
    
    // Add event listeners to play buttons
    document.querySelectorAll('.play-song-btn').forEach(button => {
        button.addEventListener('click', (event) => {
            const songId = event.currentTarget.dataset.songId;
            playSong(songId);
        });
    });
}

/**
 * Render latest songs section
 */
function renderLatestSongs() {
    const container = document.getElementById('latest-songs-container');
    if (!container) return;
    
    // Sort songs by creation date (newest first)
    const latestSongs = [...approvedSongs]
        .sort((a, b) => new Date(b.createTime || 0) - new Date(a.createTime || 0))
        .slice(0, 8); // Get latest 8
    
    if (latestSongs.length === 0) {
        container.innerHTML = '<div class="col-12 text-center">No songs available</div>';
        return;
    }
    
    let html = '';
    latestSongs.forEach(song => {
        const singerName = allSingers.find(singer => singer.id === song.singerId)?.name || 'Unknown Artist';
        
        html += `
            <div class="col-md-3 col-sm-6 mb-4">
                <div class="card">
                    <img src="${song.pic || 'assets/media/image/default-album.png'}" class="card-img-top" alt="${song.name}">
                    <div class="card-body">
                        <h6 class="card-title mb-1">${song.name}</h6>
                        <p class="small text-muted mb-2">${singerName}</p>
                        <button class="btn btn-primary btn-sm btn-block play-song-btn" data-song-id="${song.id}">
                            <i data-feather="play"></i> Play
                        </button>
                    </div>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
    
    // Initialize feather icons
    if (typeof feather !== 'undefined') {
        feather.replace();
    }
    
    // Add event listeners to play buttons
    document.querySelectorAll('.play-song-btn').forEach(button => {
        button.addEventListener('click', (event) => {
            const songId = event.currentTarget.dataset.songId;
            playSong(songId);
        });
    });
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
    // Main search form
    const mainSearchForm = document.getElementById('main-search-form');
    if (mainSearchForm) {
        mainSearchForm.addEventListener('submit', (event) => {
            event.preventDefault();
            const searchInput = document.getElementById('main-search-input');
            if (searchInput && searchInput.value.trim()) {
                window.location.href = `search-results.html?q=${encodeURIComponent(searchInput.value.trim())}`;
            }
        });
    }
    
    // Header search form
    const headerSearchForm = document.getElementById('song-search-form');
    if (headerSearchForm) {
        headerSearchForm.addEventListener('submit', (event) => {
            event.preventDefault();
            const searchInput = document.getElementById('song-search-input');
            if (searchInput && searchInput.value.trim()) {
                window.location.href = `search-results.html?q=${encodeURIComponent(searchInput.value.trim())}`;
            }
        });
    }
}

/**
 * Play a song
 * @param {string} songId - ID of the song to play
 */
function playSong(songId) {
    const song = approvedSongs.find(s => s.id == songId);
    if (!song) return;
    
    const singerName = allSingers.find(singer => singer.id === song.singerId)?.name || 'Unknown Artist';
    
    // Update the modal content
    document.getElementById('playing-song-name').textContent = song.name;
    document.getElementById('playing-song-artist').textContent = singerName;
    document.getElementById('playing-song-cover').src = song.pic || 'assets/media/image/default-cover.jpg';
    document.getElementById('playing-song-lyrics').innerHTML = song.lyric || 'No lyrics available';
    
    // Set the audio source
    const audioSource = document.getElementById('audio-source');
    const audioPlayer = document.getElementById('audio-player');
    
    if (audioSource && audioPlayer) {
        audioSource.src = song.url;
        audioPlayer.load();
        audioPlayer.play();
    }
    
    // Show the modal
    $('#songPlayerModal').modal('show');
    
    // Increment play count
    incrementPlayCount(songId);
}

/**
 * Increment the play count for a song
 * @param {string} songId - ID of the song
 */
async function incrementPlayCount(songId) {
    try {
        await api.get(`/song/addNums?songId=${songId}`);
        console.log('Play count incremented for song ID:', songId);
    } catch (error) {
        console.error('Error incrementing play count:', error);
    }
}

/**
 * Show a message to the user
 * @param {string} message - Message to display
 * @param {string} type - Message type (success, error, warning, info)
 */
function showMessage(message, type = 'info') {
    // Check if toastr library is available
    if (typeof toastr !== 'undefined') {
        toastr[type](message);
        return;
    }
    
    // If toastr is not available, use alert
    alert(message);
} 
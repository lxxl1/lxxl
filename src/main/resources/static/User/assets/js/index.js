import { API_URL } from '../../../Common/js/config.js';
import api from '../../../Common/js/api.js';
import { playSongAudioPlayer } from './audio-player.js'; // Ensure this import exists

// Global variables
let allSongs = [];
let approvedSongs = []; // Only songs with status=1
let allCategories = [];
let allSingers = [];

// Utility function to escape HTML (add this if not already present)
function escapeHTML(str) {
    if (!str) return '';
    return str.replace(/[&<>'"/]/g, 
        tag => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            "'": '&#39;',
            '"': '&quot;',
            '/': '&#x2F;' // Escape forward slash for safety
        }[tag] || tag)
    );
}

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
        renderTop3SongsList();
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
            // Update statistics based on DTOs
            updateStatistics();
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
        .sort((a, b) => (b.nums || 0) - (a.nums || 0))
        .slice(0, 5); // Get top 5
    
    if (topSongs.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="5" class="text-center">No songs available</td></tr>';
        return;
    }
    
    let html = '';
    topSongs.forEach((song, index) => {
        const displaySingers = song.singerNames || 'Unknown Artist';
        
        html += `
            <tr>
                <td>${index + 1}</td>
                <td>
                    <div class="d-flex align-items-center">
                        <img src="${escapeHTML(song.pic || 'assets/media/image/default-album.png')}" class="mr-3 rounded" width="40" height="40" alt="${escapeHTML(song.name)}">
                         <a href="song-details.html?songId=${song.id}&from=index" class="text-dark">${escapeHTML(song.name)}</a>
                    </div>
                </td>
                <td>${escapeHTML(displaySingers)}</td>
                <td>${song.nums || 0}</td>
                <td>
                     <button class="btn btn-sm btn-primary play-song-btn" 
                             data-song-id="${song.id}" 
                             data-song-url="${escapeHTML(song.url)}" 
                             data-song-name="${escapeHTML(song.name)}" 
                             data-artist-name="${escapeHTML(displaySingers)}" 
                             data-cover-url="${escapeHTML(song.pic || 'assets/media/image/default-album.png')}">
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
    
    // Add event listeners to play buttons within the table
    tableBody.querySelectorAll('.play-song-btn').forEach(button => {
        button.addEventListener('click', handlePlayButtonClick);
    });
}

/**
 * NEW FUNCTION: Render top 3 songs list
 */
function renderTop3SongsList() {
    const listContainer = document.getElementById('top-3-songs-list');
    if (!listContainer) {
        console.error('Element with ID top-3-songs-list not found.');
        return;
    }

    // Sort approved songs by play count (descending) and take top 3
    const top3Songs = [...approvedSongs]
        .sort((a, b) => (b.nums || 0) - (a.nums || 0))
        .slice(0, 3);

    if (top3Songs.length === 0) {
        listContainer.innerHTML = '<div class="list-group-item text-center text-muted">No top songs available yet.</div>';
        return;
    }

    let html = '';
    top3Songs.forEach(song => {
        const displaySingers = song.singerNames || 'Unknown Artist';
        const coverUrl = song.pic || 'assets/media/image/default-cover.jpg';
        html += `
            <div class="list-group-item d-flex align-items-center">
                <div class="mr-3">
                    <img src="${escapeHTML(coverUrl)}" alt="${escapeHTML(song.name)}" class="rounded" width="50" height="50" style="object-fit: cover;">
                </div>
                <div class="flex-grow-1">
                    <h6 class="mb-1 text-truncate">
                        <a href="song-details.html?songId=${song.id}&from=index" class="text-dark">${escapeHTML(song.name)}</a>
                    </h6>
                    <small class="text-muted">${escapeHTML(displaySingers)}</small>
                </div>
                <div class="ml-3 text-right" style="min-width: 80px;">
                     <span class="badge badge-light mb-1">${song.nums || 0} plays</span>
                     <button class="btn btn-sm btn-outline-primary play-song-btn" 
                             data-song-id="${song.id}" 
                             data-song-url="${escapeHTML(song.url)}" 
                             data-song-name="${escapeHTML(song.name)}" 
                             data-artist-name="${escapeHTML(displaySingers)}" 
                             data-cover-url="${escapeHTML(coverUrl)}">
                        <i data-feather="play" class="width-15 height-15"></i>
                    </button>
                </div>
            </div>
        `;
    });

    listContainer.innerHTML = html;

    // Re-initialize feather icons for the new buttons
    if (typeof feather !== 'undefined') {
        feather.replace();
    }

    // Add event listeners for the play buttons in the list
    listContainer.querySelectorAll('.play-song-btn').forEach(button => {
        button.addEventListener('click', handlePlayButtonClick);
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
        const displaySingers = song.singerNames || 'Unknown Artist';
        
        html += `
            <div class="col-md-3 col-sm-6 mb-4">
                <div class="card">
                    <img src="${song.pic || 'assets/media/image/default-album.png'}" class="card-img-top" alt="${song.name}">
                    <div class="card-body">
                        <h6 class="card-title mb-1">${song.name}</h6>
                        <p class="small text-muted mb-2">${displaySingers}</p>
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
 * Shared event handler for play buttons
 */
function handlePlayButtonClick(event) {
    const button = event.currentTarget;
    const songUrl = button.dataset.songUrl;
    const songName = button.dataset.songName;
    const artistName = button.dataset.artistName;
    const coverUrl = button.dataset.coverUrl;
    const songId = button.dataset.songId; // Get song ID for incrementing count

    if (!songUrl || !songName || !artistName || !coverUrl || !songId) {
        console.error('Missing data attributes on play button:', button.dataset);
        showMessage('Could not play song, data missing.', 'error');
        return;
    }

    // Call the global player function
    playSongAudioPlayer(songUrl, songName, artistName, coverUrl);

    // Increment play count (fire and forget)
    incrementPlayCount(songId);
}

/**
 * Increment the play count for a song and refresh relevant UI parts
 * @param {string} songId - ID of the song
 */
async function incrementPlayCount(songId) {
    try {
        await api.get(`/song/addNums?songId=${songId}`);
        console.log('Play count incremented for song ID:', songId);

        // Reload song data (ensure this loads DTOs with singerNames)
        const songsLoaded = await loadAllSongs(); 
        if (songsLoaded) {
            // Re-render the top songs table with updated data
            renderTopSongs(); 
            // Optionally re-render latest songs too if needed
            // renderLatestSongs(); 
        } else {
             console.warn('Could not reload songs after incrementing count.');
        }

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
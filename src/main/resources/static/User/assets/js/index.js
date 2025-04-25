import { API_URL } from '../../../Common/js/config.js';
import api from '../../../Common/js/api.js';
import { playSongAudioPlayer } from './audio-player.js'; // Ensure this import exists

// Global variables
let allSongs = []; // All songs globally (for total count)
let approvedSongs = []; // All approved songs globally (for total count)
let currentUserSongsData = []; // All songs for the current user (from /selectbyuser)
let allCategories = [];
let allSingers = [];

// Utility function to get current user ID from localStorage
function getCurrentUserId() {
    const userStr = localStorage.getItem('user'); // Assuming user info is stored here
    if (userStr) {
        try {
            const user = JSON.parse(userStr);
            return user.id; // Assuming user object has an 'id' property
        } catch (e) {
            console.error('Error parsing user data from localStorage:', e);
            return null;
        }
    }
    return null;
}

// Utility function to escape HTML (add this if not already present)
function escapeHTML(str) {
    if (!str) return '';
    return str.replace(/[&<>"'/]/g, 
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
        // Initialize all data - Added loadCurrentUserSongs
        await Promise.all([
            loadAllSongs(),      
            loadCurrentUserSongs(), // <-- Re-enabled loading user songs
            loadAllCategories(),
            loadAllSingers()
        ]);
        
        // Update UI components
        updateStatistics(); // Will now use currentUserSongsData for one stat
        renderFeaturedArtists(); 
        // Note: renderMyMusic is called inside loadCurrentUserSongs after data is fetched
        
        // Setup event listeners
        setupEventListeners();
        
    } catch (error) {
        console.error('Initialization error:', error);
        showMessage('Failed to load dashboard data. Please refresh the page.', 'error');
    }
});

/**
 * Load ALL songs from API (globally) and filter approved ones for total count
 */
async function loadAllSongs() {
    try {
        const response = await api.get('/song/allSong');
        if (response.data && response.data.code === '200' && response.data.data) {
            allSongs = response.data.data;
            approvedSongs = allSongs.filter(song => song.status === 1);
            console.log('Loaded all approved songs (global): ', approvedSongs);
            // Update statistics after loading these global songs
            updateStatistics(); 
            return true;
        } else {
             console.warn('Could not load all global songs or no songs found:', response.data);
             allSongs = [];
             approvedSongs = [];
             updateStatistics();
             return false;
        }
    } catch (error) {
        console.error('Error loading all global songs:', error);
        allSongs = [];
        approvedSongs = [];
        updateStatistics();
        return false;
    }
}

/**
 * NEW: Load songs specifically for the current logged-in user
 */
// <-- Re-enabled entire function -->
async function loadCurrentUserSongs() {
    const currentUserId = getCurrentUserId();
    if (currentUserId === null) {
        console.warn('Cannot load current user songs: User ID not found.');
        currentUserSongsData = [];
        updateStatistics(); // Update stats even if user load fails
        renderMyMusic(); // Render empty state for user music
        return false;
    }

    try {
        // Use the /selectbyuser endpoint, requesting a large page size
        console.log(`Fetching songs for user ID: ${currentUserId}`);
        const response = await api.get('/song/selectbyuser', { 
            params: { 
                userId: currentUserId,
                pageNum: 1,       // Explicitly set page 1
                pageSize: 999     // Request a large number to get all songs
            }
        });
        console.log("Response from /song/selectbyuser:", response);

        if (response.data && response.data.code === '200' && response.data.data) {
            // Correctly extract the list from the paginated response
            currentUserSongsData = response.data.data && response.data.data.list ? response.data.data.list : [];
            console.log(`Loaded ${currentUserSongsData.length} songs for current user ID: ${currentUserId}`, currentUserSongsData);
            // Update stats and render user music section *after* user songs are loaded
            updateStatistics(); 
            renderMyMusic(); // <-- Call the rendering function here
            return true;
        } else {
             console.warn('Could not load current user songs or no songs found:', response.data);
             currentUserSongsData = [];
             updateStatistics();
             renderMyMusic();
             return false;
        }
    } catch (error) {
        console.error('Error loading current user songs:', error);
        currentUserSongsData = [];
        updateStatistics();
        renderMyMusic();
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
    // Update total songs count (use global approvedSongs)
    const totalSongsElement = document.getElementById('total-songs-count');
    if (totalSongsElement) {
        totalSongsElement.textContent = approvedSongs.length; // Count of all approved songs on platform
    } else {
        console.error("Element with ID 'total-songs-count' not found.");
    }
    
    // Update categories count
    const categoriesElement = document.getElementById('total-categories-count');
    if (categoriesElement) {
        categoriesElement.textContent = allCategories.length;
    } else {
        console.error("Element with ID 'total-categories-count' not found.");
    }
    
    // Update artists count
    const artistsElement = document.getElementById('total-artists-count');
    if (artistsElement) {
        artistsElement.textContent = allSingers.length;
    } else {
        console.error("Element with ID 'total-artists-count' not found.");
    }
    
    // Update My Approved Songs count using currentUserSongsData, filtered for approved
    // <-- Re-enabled this section -->
    const myApprovedSongsElement = document.getElementById('my-approved-songs-count');
    if (myApprovedSongsElement) {
        // Filter the user-specific data for approved songs
        const userApprovedSongs = currentUserSongsData.filter(song => song.status === 1);
        myApprovedSongsElement.textContent = userApprovedSongs.length; 
        // Update card title to clarify it's user's songs
        const mySongsTitleElement = myApprovedSongsElement.closest('.card-body').querySelector('h5'); // Find h5 within card body
        if (mySongsTitleElement) {
            mySongsTitleElement.textContent = "My Approved Songs"; 
        }
    } else {
        console.error("Element with ID 'my-approved-songs-count' not found.");
    }
}

/**
 * NEW: Render Featured Artists section (3 random artists)
 */
function renderFeaturedArtists() {
    const container = document.getElementById('random-artists-container');
    if (!container) {
        console.error('Element with ID random-artists-container not found.');
        return;
    }

    if (!allSingers || allSingers.length === 0) {
        container.innerHTML = '<p class="text-center text-muted">No artists available.</p>';
        return;
    }

    // Shuffle singers and take the first 3
    const shuffledSingers = [...allSingers].sort(() => 0.5 - Math.random());
    const featuredSingers = shuffledSingers.slice(0, 3);

    let html = '<div class="row">'; // Use a row for layout
    if (featuredSingers.length > 0) {
        featuredSingers.forEach(singer => {
            // Use a more likely default image path
            const imageUrl = singer.pic || 'assets/media/image/user/default.png'; 
            // Mimic structure from artists.html card (adjust col size)
            html += `
                <div class="col-md-4 mb-3">
                    <div class="card h-100 text-center">
                        <a href="artist-detail.html?singerId=${singer.id}">
                            <img src="${escapeHTML(imageUrl)}" class="card-img-top p-3 rounded-circle" alt="${escapeHTML(singer.name)}" style="width: 100px; height: 100px; object-fit: cover; margin: auto;">
                        </a>
                        <div class="card-body p-2">
                            <h6 class="card-title mb-0">
                                <a href="artist-detail.html?singerId=${singer.id}" class="text-dark">${escapeHTML(singer.name)}</a>
                            </h6>
                        </div>
                    </div>
                </div>
            `;
        });
    } else {
         html += '<div class="col-12"><p class="text-center text-muted">No artists to feature.</p></div>';
    }
    html += '</div>'; // Close row

    container.innerHTML = html;
}

/**
 * MODIFIED: Render My Music section (3 random user songs)
 * Uses the global currentUserSongsData list.
 */
// <-- Re-enabled entire function, renamed, and logic modified -->
function renderMyMusic() {
    const container = document.getElementById('my-approved-music-container');
    if (!container) {
        console.error('Element with ID my-approved-music-container not found.');
        return;
    }

    // Filter the fetched user songs for approved ones (status === 1)
    const userApprovedSongs = currentUserSongsData.filter(song => song.status === 1);
    console.log('User approved songs for rendering:', userApprovedSongs);

    if (!userApprovedSongs || userApprovedSongs.length === 0) {
        container.innerHTML = '<p class="text-center text-muted">You have no approved music yet.</p>';
        return;
    }

    // Shuffle the approved songs and take the first 3
    const shuffledApprovedSongs = [...userApprovedSongs].sort(() => 0.5 - Math.random());
    const randomMySongs = shuffledApprovedSongs.slice(0, 3);
    console.log('Random 3 user songs:', randomMySongs);

    // Use list group structure 
    let html = '<div class="list-group list-group-flush">'; 
    if (randomMySongs.length > 0) {
        randomMySongs.forEach(song => {
            // Use DTO fields directly (assuming /selectbyuser returns DTO with names)
            const displaySingers = song.singerNames || 'Unknown Artist'; 
            const coverUrl = song.pic || 'assets/media/image/default-cover.jpg'; // Use default cover
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
                    <div class="ml-3">
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
    } else {
        // This case should technically not be reached if userApprovedSongs was not empty
        html += '<div class="list-group-item text-center text-muted">No approved music to display.</div>';
    }
     html += '</div>'; // Close list-group

    container.innerHTML = html;

    // Re-initialize feather icons for the new buttons
    if (typeof feather !== 'undefined') {
        feather.replace();
    }

    // Add event listeners for the play buttons in the list
    container.querySelectorAll('.play-song-btn').forEach(button => {
        button.addEventListener('click', handlePlayButtonClick);
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

    if (songId) {
        console.log('Attempting to play song ID:', songId);
        // Call the global audio player function
        playSongAudioPlayer(songUrl, songName, artistName, coverUrl);
        // Note: Play count increment logic should be handled elsewhere, possibly via an API call
        // Example: incrementPlayCount(songId);
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
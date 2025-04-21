/**
 * All Songs Page JavaScript
 * This file handles functionality for the all-songs.html page including
 * loading songs, pagination, searching, and filtering.
 */

import { API_URL } from '../../../Common/js/config.js';
import api from '../../../Common/js/api.js';
import { playSongAudioPlayer } from './audio-player.js'; // Import the player function

// Global variables
let allSongs = [];
let approvedSongs = []; // Only songs with status=1
let allCategories = [];
let allSingers = [];
let filteredSongs = [];

// Pagination variables
let currentPage = 1;
const songsPerPage = 12;

// Page initialization
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Add axios and module support
        await addScriptDependencies();
        
        // Initialize all data
        await Promise.all([
            loadAllSongs(),
            loadAllCategories(),
            loadAllSingers()
        ]);
        
        // Setup initial view
        filteredSongs = [...approvedSongs];
        setupCategoryFilter();
        renderSongs();
        setupPagination();
        
        // Setup event listeners
        setupEventListeners();
        
    } catch (error) {
        console.error('Initialization error:', error);
        showMessage('Failed to load songs. Please refresh the page.', 'error');
    }
});

// Add necessary script dependencies
async function addScriptDependencies() {
    return new Promise((resolve) => {
        // Check if axios is already loaded
        if (typeof axios === 'undefined') {
            const axiosScript = document.createElement('script');
            axiosScript.src = 'https://cdn.jsdelivr.net/npm/axios/dist/axios.min.js';
            axiosScript.onload = resolve;
            document.head.appendChild(axiosScript);
        } else {
            resolve();
        }
    });
}

/**
 * Load all songs from API and filter approved ones
 */
async function loadAllSongs() {
    try {
        const response = await api.get('/song/allSong');
        if (response.data && response.data.code === '200' && response.data.data) {
            allSongs = response.data.data;
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
 * Setup category filter dropdown
 */
function setupCategoryFilter() {
    const categoryFilter = document.getElementById('category-filter');
    if (!categoryFilter) return;
    
    let options = '<option value="">All Categories</option>';
    
    allCategories.forEach(category => {
        options += `<option value="${category.id}">${category.name}</option>`;
    });
    
    categoryFilter.innerHTML = options;
}

/**
 * Render songs with pagination
 */
function renderSongs() {
    const songsGrid = document.getElementById('all-songs-grid');
    if (!songsGrid) return;
    
    // Calculate pagination
    const startIndex = (currentPage - 1) * songsPerPage;
    const endIndex = startIndex + songsPerPage;
    const paginatedSongs = filteredSongs.slice(startIndex, endIndex);
    
    if (paginatedSongs.length === 0) {
        songsGrid.innerHTML = '<div class="col-12 text-center py-5"><p>No songs found matching your criteria.</p></div>';
        return;
    }
    
    let html = '';
    paginatedSongs.forEach(song => {
        const displaySingers = song.singerNames || 'Unknown Artist';
        
        html += `
            <div class="col-md-3 col-sm-6 mb-4">
                <div class="card h-100">
                    <div class="song-card-image-container">
                         <img src="${song.pic || 'assets/media/image/default-album.png'}" 
                              class="song-card-image" 
                              alt="${song.name}">
                    </div>
                    <div class="card-body d-flex flex-column">
                        <div>
                            <h6 class="card-title mb-1 text-truncate">${song.name}</h6>
                            <p class="small text-muted mb-2 text-truncate">${displaySingers}</p>
                            <div class="d-flex justify-content-between mb-2">
                                <small class="text-muted">
                                    <i data-feather="play" class="width-15 height-15"></i> ${song.nums || 0}
                                </small>
                            </div>
                        </div>
                        <button class="btn btn-primary btn-sm btn-block mt-auto play-song-btn" 
                                data-song-id="${song.id}" 
                                data-song-url="${song.url || ''}" 
                                data-song-name="${song.name || ''}" 
                                data-artist-name="${displaySingers || ''}" 
                                data-cover-url="${song.pic || 'assets/media/image/default-album.png'}">
                            <i data-feather="play" class="width-15 height-15"></i> Play
                        </button>
                    </div>
                </div>
            </div>
        `;
    });
    
    songsGrid.innerHTML = html;
    
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
 * Setup pagination
 */
function setupPagination() {
    const pagination = document.getElementById('songs-pagination');
    if (!pagination) return;
    
    const totalPages = Math.ceil(filteredSongs.length / songsPerPage);
    
    if (totalPages <= 1) {
        pagination.innerHTML = '';
        return;
    }
    
    let html = '';
    
    // Previous button
    html += `
        <li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
            <a class="page-link" href="#" data-page="${currentPage - 1}" aria-label="Previous">
                <span aria-hidden="true">&laquo;</span>
            </a>
        </li>
    `;
    
    // Page numbers
    for (let i = 1; i <= totalPages; i++) {
        html += `
            <li class="page-item ${i === currentPage ? 'active' : ''}">
                <a class="page-link" href="#" data-page="${i}">${i}</a>
            </li>
        `;
    }
    
    // Next button
    html += `
        <li class="page-item ${currentPage === totalPages ? 'disabled' : ''}">
            <a class="page-link" href="#" data-page="${currentPage + 1}" aria-label="Next">
                <span aria-hidden="true">&raquo;</span>
            </a>
        </li>
    `;
    
    pagination.innerHTML = html;
    
    // Add event listeners to pagination links
    pagination.querySelectorAll('.page-link').forEach(link => {
        link.addEventListener('click', (event) => {
            event.preventDefault();
            const page = parseInt(event.target.closest('.page-link').dataset.page);
            if (page >= 1 && page <= totalPages) {
                currentPage = page;
                renderSongs();
                setupPagination();
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        });
    });
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
    // Category filter
    const categoryFilter = document.getElementById('category-filter');
    if (categoryFilter) {
        categoryFilter.addEventListener('change', filterSongs);
    }
    
    // Search input
    const searchInput = document.getElementById('song-list-search');
    const searchButton = document.getElementById('song-list-search-btn');
    
    if (searchInput && searchButton) {
        searchButton.addEventListener('click', filterSongs);
        searchInput.addEventListener('keyup', event => {
            if (event.key === 'Enter') {
                filterSongs();
            }
        });
    }
}

/**
 * Filter songs based on search and category
 */
async function filterSongs() {
    const searchInput = document.getElementById('song-list-search');
    const categoryFilter = document.getElementById('category-filter');
    
    const searchTerm = searchInput ? searchInput.value.trim().toLowerCase() : '';
    const categoryId = categoryFilter ? categoryFilter.value : '';
    
    // Filter by search term
    let searchResults = [...approvedSongs];
    
    if (searchTerm) {
        searchResults = searchResults.filter(song => {
            const songName = song.name ? song.name.toLowerCase() : '';
            const singerNames = song.singerNames ? song.singerNames.map(name => name.toLowerCase()) : [];
            
            return songName.includes(searchTerm) || singerNames.some(name => name.includes(searchTerm));
        });
    }
    
    // Filter by category
    if (categoryId) {
        try {
            const response = await api.get(`/song/categories?songId=${categoryId}`);
            if (response.data && response.data.code === '200' && response.data.data) {
                const songIds = response.data.data;
                searchResults = searchResults.filter(song => songIds.includes(song.id));
            }
        } catch (error) {
            console.error('Error fetching songs by category:', error);
        }
    }
    
    // Update filtered songs
    filteredSongs = searchResults;
    
    // Reset to first page
    currentPage = 1;
    
    // Render with new filters
    renderSongs();
    setupPagination();
}

/**
 * Play a song
 * @param {string} songId - ID of the song to play
 */
function playSong(songId) {
    const song = approvedSongs.find(s => s.id == songId);
    if (!song) {
        console.error(`Song with ID ${songId} not found in approved list.`);
        showMessage('Could not find the song to play.', 'error');
        return;
    }
    
    const displaySingers = song.singerNames || 'Unknown Artist';
    const coverUrl = song.pic || 'assets/media/image/default-cover.jpg';
    const audioUrl = song.url;
    const songName = song.name || 'Unknown Song';

    if (!audioUrl) {
        console.error(`Audio URL is missing for song ID ${songId}`);
        showMessage('Audio source not found for this song.', 'error');
        return;
    }

    // Call the unified audio player function
    playSongAudioPlayer(audioUrl, songName, displaySingers, coverUrl);
    
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
        // Reload data and re-render after incrementing
        await loadAllSongs(); // Ensure this fetches DTOs
        filteredSongs = [...approvedSongs]; // Update filtered list based on reloaded data
        renderSongs(); // Re-render current page
        setupPagination(); // Re-setup pagination based on potentially changed filtered list
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

/**
 * View song details page
 */
function viewSongDetails(songId) {
    window.location.href = `song-details.html?id=${songId}`;
} 
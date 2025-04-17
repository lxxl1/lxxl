/**
 * Search Results Page JavaScript
 * This file handles the search functionality and displaying results
 */

import { API_URL } from '../../../Common/js/config.js';
import api from '../../../Common/js/api.js';

// Global variables
let allSongs = [];
let approvedSongs = []; // Only songs with status=1
let allSingers = [];
let searchResults = [];
let searchQuery = '';

// Page initialization
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Add axios and module support
        await addScriptDependencies();
        
        // Get search query from URL if present
        searchQuery = new URLSearchParams(window.location.search).get('q') || '';
        
        // Initialize all data
        await Promise.all([
            loadAllSongs(),
            loadAllSingers()
        ]);
        
        // Update UI with search query
        document.getElementById('search-query-display').textContent = 
            searchQuery ? `Search Results for "${searchQuery}"` : 'Search Results';
        
        if (searchQuery) {
            document.getElementById('search-input').value = searchQuery;
            performSearch(searchQuery);
        } else {
            // Hide spinner if no initial search
            document.getElementById('loading-spinner').classList.add('d-none');
            document.getElementById('search-results-container').classList.remove('d-none');
        }
        
        // Setup event listeners
        setupEventListeners();
        
    } catch (error) {
        console.error('Initialization error:', error);
        showMessage('Failed to load search results. Please try again.', 'error');
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
 * Perform a search based on the query
 */
function performSearch(query) {
    // Show loading spinner
    document.getElementById('loading-spinner').classList.remove('d-none');
    document.getElementById('search-results-container').classList.add('d-none');
    
    // Normalize query
    const normalizedQuery = query.trim().toLowerCase();
    
    if (!normalizedQuery) {
        searchResults = [];
        updateSearchResults();
        return;
    }
    
    // Search in song names and singer names
    searchResults = approvedSongs.filter(song => {
        const songName = song.name ? song.name.toLowerCase() : '';
        const singerNamesString = song.singerNames ? song.singerNames.toLowerCase() : '';
        
        return songName.includes(normalizedQuery) || singerNamesString.includes(normalizedQuery);
    });
    
    // Allow some time for the spinner to show
    setTimeout(() => {
        updateSearchResults();
    }, 500);
}

/**
 * Update the UI with search results
 */
function updateSearchResults() {
    // Hide spinner
    document.getElementById('loading-spinner').classList.add('d-none');
    document.getElementById('search-results-container').classList.remove('d-none');
    
    // Update song count badge
    document.getElementById('song-count-badge').textContent = searchResults.length;
    
    // Show or hide no results message
    const noResultsMessage = document.getElementById('no-results-message');
    if (searchResults.length === 0) {
        noResultsMessage.classList.remove('d-none');
    } else {
        noResultsMessage.classList.add('d-none');
    }
    
    // Render song results
    renderSongResults();
}

/**
 * Render song search results
 */
function renderSongResults() {
    const resultsContainer = document.getElementById('song-results');
    if (!resultsContainer) return;
    
    if (searchResults.length === 0) {
        resultsContainer.innerHTML = '';
        return;
    }
    
    let html = '';
    searchResults.forEach(song => {
        const displaySingers = song.singerNames || 'Unknown Artist';
        
        html += `
            <div class="col-md-3 col-sm-6 mb-4">
                <div class="card">
                    <img src="${song.pic || 'assets/media/image/default-album.png'}" class="card-img-top" alt="${song.name}">
                    <div class="card-body">
                        <h6 class="card-title mb-1">${song.name}</h6>
                        <p class="small text-muted mb-2">${displaySingers}</p>
                        <div class="d-flex justify-content-between">
                            <small class="text-muted">
                                <i data-feather="play"></i> ${song.nums || 0}
                            </small>
                            <small class="text-muted">
                                <i data-feather="heart"></i> ${song.likeCount || 0}
                            </small>
                        </div>
                        <button class="btn btn-primary btn-sm btn-block mt-2 play-song-btn" data-song-id="${song.id}">
                            <i data-feather="play"></i> Play
                        </button>
                    </div>
                </div>
            </div>
        `;
    });
    
    resultsContainer.innerHTML = html;
    
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
    // Search form
    const searchForm = document.getElementById('search-form');
    if (searchForm) {
        searchForm.addEventListener('submit', (event) => {
            event.preventDefault();
            const searchInput = document.getElementById('search-input');
            const query = searchInput.value.trim();
            
            // Update URL with search query
            const url = new URL(window.location);
            if (query) {
                url.searchParams.set('q', query);
            } else {
                url.searchParams.delete('q');
            }
            window.history.pushState({}, '', url);
            
            // Update heading
            document.getElementById('search-query-display').textContent = 
                query ? `Search Results for "${query}"` : 'Search Results';
            
            // Perform search
            performSearch(query);
        });
    }
    
    // Header search form
    const headerSearchForm = document.getElementById('song-search-form');
    if (headerSearchForm) {
        headerSearchForm.addEventListener('submit', (event) => {
            event.preventDefault();
            const searchInput = document.getElementById('song-search-input');
            const query = searchInput.value.trim();
            
            if (query) {
                // Update main search input
                document.getElementById('search-input').value = query;
                
                // Update URL
                const url = new URL(window.location);
                url.searchParams.set('q', query);
                window.history.pushState({}, '', url);
                
                // Update heading
                document.getElementById('search-query-display').textContent = `Search Results for "${query}"`;
                
                // Perform search
                performSearch(query);
            }
        });
    }
}

/**
 * Play a song
 * @param {string} songId - ID of the song to play
 */
function playSong(songId) {
    let song = searchResults.find(s => s.id == songId);
    if (!song) {
        song = approvedSongs.find(s => s.id == songId);
    }
    
    if (!song) {
        console.error(`Song with ID ${songId} not found.`);
        showMessage('Could not find the song to play.', 'error');
        return;
    }
    
    const displaySingers = song.singerNames || 'Unknown Artist';
    
    const modalPlayerName = document.getElementById('playing-song-name');
    const modalPlayerArtist = document.getElementById('playing-song-artist');
    const modalPlayerCover = document.getElementById('playing-song-cover');
    const modalPlayerLyrics = document.getElementById('playing-song-lyrics');
    const modalAudioSource = document.getElementById('audio-source');
    const modalAudioPlayer = document.getElementById('audio-player');

    if (modalPlayerName) modalPlayerName.textContent = song.name;
    if (modalPlayerArtist) modalPlayerArtist.textContent = displaySingers;
    if (modalPlayerCover) modalPlayerCover.src = song.pic || 'assets/media/image/default-cover.jpg';
    if (modalPlayerLyrics) modalPlayerLyrics.innerHTML = song.lyric || 'No lyrics available';
    
    if (modalAudioSource && modalAudioPlayer) {
        modalAudioSource.src = song.url;
        modalAudioPlayer.load();
        modalAudioPlayer.play();
        if (typeof $ !== 'undefined' && $('#songPlayerModal').length) {
            $('#songPlayerModal').modal('show');
        }
    } else {
        console.warn('Modal player elements not found. Playing might rely on a different player.');
    }
    
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
        await loadAllSongs();
        performSearch(searchQuery);
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
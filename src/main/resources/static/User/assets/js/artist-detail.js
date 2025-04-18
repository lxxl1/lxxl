import api from '../../../Common/js/api.js';
import { API_URL } from '../../../Common/js/config.js';

document.addEventListener('DOMContentLoaded', function() {
    loadArtistDetails();
});

/**
 * Safely escape HTML to prevent XSS
 */
function escapeHTML(str) {
    if (!str) return '';
    return str.replace(/[&<>'"]/g, 
        tag => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '\'': '&#39;',
            '"': '&quot;'
        }[tag] || tag)
    );
}

/**
 * Format date string to a readable format
 */
function formatDate(dateString) {
    if (!dateString) return 'N/A';
    
    try {
        const options = { year: 'numeric', month: 'long', day: 'numeric' };
        return new Date(dateString).toLocaleDateString(undefined, options);
    } catch (e) {
        console.error('Error formatting date:', e);
        return dateString;
    }
}

/**
 * Format gender code to readable text
 */
function formatSex(sexValue) {
    if (sexValue === 1) return 'Male';
    if (sexValue === 0) return 'Female';
    if (sexValue === 2) return 'Group';
    return 'Unknown';
}

/**
 * Get URL parameters
 */
function getUrlParams() {
    const params = {};
    const queryString = window.location.search;
    
    if (!queryString) return params;
    
    const urlParams = new URLSearchParams(queryString);
    urlParams.forEach((value, key) => {
        params[key] = value;
    });
    
    return params;
}

/**
 * Main function to load artist details and songs
 */
async function loadArtistDetails() {
    const params = getUrlParams();
    const singerId = params.singerId;
    
    if (!singerId) {
        showError("No artist ID provided. Please go back to the artists page and select an artist.");
        return;
    }
    
    try {
        // 1. Load artist details
        await loadArtistInfo(singerId);
        
        // 2. Load artist songs
        await loadArtistSongs(singerId);
    } catch (error) {
        console.error('Error loading artist page:', error);
        showError("An error occurred while loading artist information. Please try again later.");
    }
}

/**
 * Load artist information
 */
async function loadArtistInfo(singerId) {
    const artistLoading = document.getElementById('artist-loading');
    const artistDetailContainer = document.getElementById('artist-detail-container');
    
    try {
        // Get artist by ID
        const response = await api.get(`/singer/selectByPrimaryKey?id=${singerId}`);
        
        if (response.data && response.data.code === '200' && response.data.data) {
            const artist = response.data.data;
            
            // Update DOM elements with artist details
            document.getElementById('artist-name').textContent = artist.name || 'Unknown Artist';
            document.getElementById('artist-name-breadcrumb').textContent = artist.name || 'Artist Detail';
            
            if (artist.pic) {
                document.getElementById('artist-image').src = artist.pic;
            }
            
            // Update gender information
            const genderSpan = document.querySelector('#artist-gender span');
            if (genderSpan) {
                genderSpan.textContent = formatSex(artist.sex);
            }
            
            // Update location information
            const locationSpan = document.querySelector('#artist-location span');
            if (locationSpan) {
                locationSpan.textContent = artist.location || 'Unknown';
            }
            
            // Update birth date information
            const birthSpan = document.querySelector('#artist-birth span');
            if (birthSpan) {
                birthSpan.textContent = formatDate(artist.birth);
            }
            
            // Update introduction
            document.getElementById('artist-introduction').textContent = artist.introduction || 'No information available for this artist.';
            
            // Update page title
            document.title = `${artist.name || 'Artist'} - TuneIn`;
            
            // Show artist details container
            artistDetailContainer.style.display = 'block';
        } else {
            throw new Error('Invalid response format or artist not found');
        }
    } catch (error) {
        console.error('Error loading artist info:', error);
        showError("Could not load artist information. The artist may not exist.");
    } finally {
        // Hide loading indicator 
        artistLoading.style.display = 'none';
    }
}

/**
 * Load songs by the artist
 */
async function loadArtistSongs(singerId) {
    const songsLoading = document.getElementById('songs-loading');
    const songsContainer = document.getElementById('songs-container');
    const noSongsMessage = document.getElementById('no-songs-message');
    const songCountBadge = document.getElementById('song-count');
    
    try {
        // Get songs by singer ID
        const response = await api.get(`/song/singer/detail?singerId=${singerId}`);
        
        if (response.data && response.data.code === '200' && Array.isArray(response.data.data)) {
            const songs = response.data.data;
            
            // Update song count
            songCountBadge.textContent = songs.length;
            
            if (songs.length === 0) {
                noSongsMessage.style.display = 'block';
            } else {
                // Clear existing content
                songsContainer.innerHTML = '';
                
                // Add each song as a card
                songs.forEach(song => {
                    const songCardCol = document.createElement('div');
                    songCardCol.className = 'col-xl-3 col-lg-4 col-md-6 col-sm-12 mb-4';
                    
                    // Default image if none exists
                    const songImage = song.pic || 'assets/media/image/default-cover.jpg';
                    
                    // Create song card HTML
                    songCardCol.innerHTML = `
                        <div class="card song-card">
                            <div class="position-relative">
                                <img src="${escapeHTML(songImage)}" class="card-img-top" alt="${escapeHTML(song.name || 'Song')}" 
                                     style="height: 160px; object-fit: cover;">
                                <div class="position-absolute bottom-0 start-0 end-0 p-2 bg-dark bg-opacity-75 song-actions">
                                    <div class="d-flex justify-content-center">
                                        <button class="btn btn-sm btn-outline-light mx-1 play-song-btn" data-song-id="${song.id}" data-song-url="${song.url}" data-song-name="${escapeHTML(song.name)}" data-song-pic="${escapeHTML(songImage)}">
                                            <i class="fas fa-play"></i> Play
                                        </button>
                                    </div>
                                </div>
                            </div>
                            <div class="card-body">
                                <h6 class="card-title mb-0 text-truncate">${escapeHTML(song.name || 'Unknown Song')}</h6>
                                <p class="card-text small text-muted">Plays: ${song.playCount || 0}</p>
                            </div>
                        </div>
                    `;
                    
                    songsContainer.appendChild(songCardCol);
                });
                
                // Add event listeners to play buttons
                setupPlayButtons();
                
                // Show songs container
                songsContainer.style.display = 'flex';
            }
        } else {
            throw new Error('Invalid response format or songs not found');
        }
    } catch (error) {
        console.error('Error loading artist songs:', error);
        showError("Could not load songs for this artist.", "songs-container");
    } finally {
        // Hide loading indicator
        songsLoading.style.display = 'none';
    }
}

/**
 * Set up event listeners for song play buttons
 */
function setupPlayButtons() {
    const playButtons = document.querySelectorAll('.play-song-btn');
    
    playButtons.forEach(button => {
        button.addEventListener('click', function(e) {
            e.preventDefault();
            
            const songUrl = this.getAttribute('data-song-url');
            const songName = this.getAttribute('data-song-name');
            const songPic = this.getAttribute('data-song-pic');
            const artistName = document.getElementById('artist-name').textContent;
            
            // Check if the global audio player interface exists
            if (window.audioPlayer && typeof window.audioPlayer.playSong === 'function') {
                window.audioPlayer.playSong({
                    url: songUrl,
                    title: songName,
                    artist: artistName,
                    cover: songPic
                });
            } else {
                // Fallback if the global audio player is not available
                const audioPlayer = document.getElementById('audioPlayer');
                if (audioPlayer) {
                    audioPlayer.src = songUrl;
                    audioPlayer.play()
                        .catch(error => console.error('Error playing song:', error));
                    
                    // Update the player UI
                    document.getElementById('currentSongTitle').textContent = songName;
                    document.getElementById('currentSongArtist').textContent = artistName;
                    document.getElementById('currentSongCover').src = songPic;
                    
                    // Update play button icon
                    const playPauseBtn = document.getElementById('playPauseButton');
                    if (playPauseBtn) {
                        playPauseBtn.innerHTML = '<i class="fas fa-pause"></i>';
                    }
                }
            }
        });
    });
}

/**
 * Show error message
 */
function showError(message, containerId) {
    const container = document.getElementById(containerId || 'artist-detail-container');
    if (container) {
        container.innerHTML = `<div class="alert alert-danger">${escapeHTML(message)}</div>`;
        container.style.display = 'block';
    }
    
    // Hide loading indicators
    const loadingElements = document.querySelectorAll('[id$="loading"]');
    loadingElements.forEach(el => {
        el.style.display = 'none';
    });
} 
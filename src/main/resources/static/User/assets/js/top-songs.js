import { api } from '../Common/js/api.js';
import { checkAuthentication } from './auth-check.js';

// Utility function to escape HTML (important for security)
function escapeHTML(str) {
    return str.replace(/[&<>'"/]/g, function (tag) {
        const chars = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            "'": '&#39;',
            '"': '&quot;',
            '/': '&#x2F;',
        };
        return chars[tag] || tag;
    });
}

// Function to fetch and display ranked songs
async function loadAndDisplayTopSongs() {
    const loadingIndicator = document.getElementById('loading-top-songs');
    const songsTableBody = document.getElementById('ranked-songs-tbody');
    const songsCard = document.getElementById('ranked-songs-card');
    const noSongsMessage = document.getElementById('no-top-songs-message');

    // Show loading indicator
    loadingIndicator.style.display = 'block';
    songsTableBody.innerHTML = ''; // Clear previous results
    songsCard.style.display = 'none';
    noSongsMessage.style.display = 'none';

    try {
        // TODO: Create this backend endpoint: GET /song/ranked
        const response = await api.get('/song/ranked'); 

        if (response && response.data && response.data.code === 200 && response.data.data) {
            const songs = response.data.data; // Assuming backend returns sorted songs

            if (songs.length === 0) {
                // Show 'no songs' message
                noSongsMessage.style.display = 'block';
            } else {
                songs.forEach((song, index) => {
                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td><span class="badge bg-primary rank-badge">${index + 1}</span></td>
                        <td>
                            <div class="d-flex align-items-center">
                                <img src="${escapeHTML(song.coverUrl || 'assets/media/image/default-cover.jpg')}" class="rounded mr-3" alt="${escapeHTML(song.songName)}" width="40" height="40" style="object-fit: cover;">
                                <div>
                                    <h6 class="mb-0 text-truncate" style="max-width: 300px;">${escapeHTML(song.songName)}</h6>
                                    <small class="text-muted">${escapeHTML(song.album || 'Single')}</small>
                                </div>
                            </div>
                        </td>
                        <td>${escapeHTML(song.artistName || 'Unknown Artist')}</td>
                        <td><span class="badge bg-light text-dark">${song.playCount || 0}</span></td>
                        <td>
                            <button class="btn btn-sm btn-primary btn-play" data-song-id="${song.id}" title="Play">
                                <i class="fas fa-play"></i>
                            </button>
                            <button class="btn btn-sm btn-secondary btn-add-to-playlist" data-song-id="${song.id}" title="Add to Playlist">
                                <i class="fas fa-plus"></i>
                            </button>
                            <!-- Add more actions if needed -->
                        </td>
                    `;
                    songsTableBody.appendChild(row);
                });
                // Show the table card
                songsCard.style.display = 'block';
            }
        } else {
            console.error('Failed to load top songs:', response.data ? response.data.message : 'No response data');
            noSongsMessage.innerHTML = `<p class="text-danger">Error loading songs. Please try again later.</p>`;
            noSongsMessage.style.display = 'block';
        }
    } catch (error) {
        console.error('Error fetching top songs:', error);
        noSongsMessage.innerHTML = `<p class="text-danger">An error occurred while fetching songs. Check the console for details.</p>`;
        noSongsMessage.style.display = 'block';
    } finally {
        // Hide loading indicator
        loadingIndicator.style.display = 'none';
    }
}

// Initialize the page
document.addEventListener('DOMContentLoaded', () => {
    checkAuthentication(); // Ensure user is logged in
    loadAndDisplayTopSongs();

    // TODO: Add event listeners for play buttons, add-to-playlist buttons etc.
    // Example for play buttons (needs integration with audio-player.js)
    document.getElementById('ranked-songs-tbody').addEventListener('click', (event) => {
        const playButton = event.target.closest('.btn-play');
        if (playButton) {
            const songId = playButton.getAttribute('data-song-id');
            console.log(`Play button clicked for song ID: ${songId}`);
            // Add logic to play the song using audio-player.js
            // window.audioPlayer.playSong(songId);
        }
    });
}); 
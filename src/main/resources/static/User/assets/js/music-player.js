/**
 * Music Player and Song Management for User Interface
 * This file handles the display and interaction with songs on the user side.
 */

import api from '../../../Common/js/api.js';

$(document).ready(function() {
    // Load initial data
    loadTotalSongsCount();
    loadTopSongs();
    loadLatestSongs();

    // Setup event listeners
    setupSearchListeners();
    setupPlayerEvents();
});

/**
 * Load the total songs count (approved songs) 
 */
function loadTotalSongsCount() {
    api.get('/song/allSong') // Endpoint returns DTOs
        .then(response => {
            if (response.data && response.data.code === '200' && response.data.data) {
                // Filter approved songs (status=1) to count
                const approvedCount = response.data.data.filter(song => song.status === 1).length;
                $('#total-songs-count').text(approvedCount || 0);
            }
        })
        .catch(error => {
            console.error('Error fetching total songs count', error);
        });
}

/**
 * Load top songs (DTOs) for the dashboard
 */
function loadTopSongs() {
    api.get('/song/topSong') // Endpoint returns DTOs
        .then(response => {
             if (response.data && response.data.code === '200' && response.data.data && response.data.data.length > 0) {
                 // Assuming the service returns DTOs directly
                populateTopSongsTable(response.data.data.slice(0, 5));
            }
        })
        .catch(error => {
            console.error('Error fetching top songs', error);
        });
}

/**
 * Populate the top songs table with data (DTOs)
 */
function populateTopSongsTable(songs) { // Expects SongDTO[]
    const $topSongsTable = $('#top-songs-table tbody');
    $topSongsTable.empty();
    
    songs.forEach((song, index) => {
        const displaySingers = song.singerNames || 'Unknown Artist';
        const row = `
            <tr>
                <td>${index + 1}</td>
                <td>${song.name}</td>
                <td>${displaySingers}</td> // Use DTO field
                <td>${song.nums || 0}</td> // Use DTO field
                <td>
                    <button class="btn btn-sm btn-primary play-song-btn" data-song-id="${song.id}">
                        <i data-feather="play"></i>
                    </button>
                    <button class="btn btn-sm btn-info view-details-btn" data-song-id="${song.id}">
                        <i data-feather="info"></i>
                    </button>
                </td>
            </tr>
        `;
        $topSongsTable.append(row);
    });
    
    if (typeof feather !== 'undefined') feather.replace();
    
    // Re-attach event handlers
    $('.play-song-btn').off('click').on('click', function() { // Use .off().on() to prevent duplicates
        const songId = $(this).data('song-id');
        playSong(songId);
    });
    $('.view-details-btn').off('click').on('click', function() {
        const songId = $(this).data('song-id');
        viewSongDetails(songId);
    });
}

/**
 * Load the latest songs (DTOs) for the dashboard
 */
function loadLatestSongs() {
    api.get('/song/allSong') // Endpoint returns DTOs
        .then(response => {
            if (response.data && response.data.code === '200' && response.data.data && response.data.data.length > 0) {
                // Filter approved and sort by createTime (desc)
                 const latestApproved = response.data.data
                     .filter(song => song.status === 1)
                     .sort((a, b) => new Date(b.createTime || 0) - new Date(a.createTime || 0));
                populateLatestSongsGrid(latestApproved.slice(0, 6)); 
            }
        })
        .catch(error => {
            console.error('Error fetching latest songs', error);
        });
}

/**
 * Populate the latest songs grid with data (DTOs)
 */
function populateLatestSongsGrid(songs) { // Expects SongDTO[]
    const $container = $('#latest-songs-container');
    $container.empty();
    
    songs.forEach(song => {
        const displaySingers = song.singerNames || 'Unknown Artist';
        const card = `
            <div class="col-md-4 col-lg-2 mb-4">
                <div class="card">
                    <img src="${song.pic || 'assets/media/image/default-cover.jpg'}" 
                         class="card-img-top" alt="${song.name}" 
                         style="height: 150px; object-fit: cover;">
                    <div class="card-body">
                        <h6 class="card-title text-truncate">${song.name}</h6>
                        <p class="card-text singer-name">${displaySingers}</p> // Use DTO field
                        <div class="d-flex justify-content-between">
                            <button class="btn btn-sm btn-primary play-song-btn" data-song-id="${song.id}">
                                <i data-feather="play"></i> Play
                            </button>
                            <button class="btn btn-sm btn-outline-info view-details-btn" data-song-id="${song.id}">
                                <i data-feather="info"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        $container.append(card);
    });
    
    if (typeof feather !== 'undefined') feather.replace();
    
     // Re-attach event handlers
    $('.play-song-btn').off('click').on('click', function() {
        const songId = $(this).data('song-id');
        playSong(songId);
    });
    $('.view-details-btn').off('click').on('click', function() {
        const songId = $(this).data('song-id');
        viewSongDetails(songId);
    });
}

/**
 * Set up search functionality
 */
function setupSearchListeners() {
    // Header search
    $('#song-search-form').on('submit', function(e) {
        e.preventDefault();
        const searchTerm = $('#song-search-input').val();
        if (searchTerm.trim()) {
            window.location.href = `search-results.html?q=${encodeURIComponent(searchTerm)}`;
        }
    });
    
    // Main search
    $('#main-search-form').on('submit', function(e) {
        e.preventDefault();
        const searchTerm = $('#main-search-input').val();
        if (searchTerm.trim()) {
            window.location.href = `search-results.html?q=${encodeURIComponent(searchTerm)}`;
        }
    });
}

/**
 * Play a song by its ID (Uses SongDetailDTO)
 */
function playSong(songId) {
    // Get the SongDetailDTO
    api.get('/song/detail', { params: { songId: songId } })
        .then(response => {
            const songDetailDTO = response.data && response.data.code === '200' ? response.data.data : null;
            
            if (songDetailDTO) {
                // Update play count first
                 api.get('/song/addNums', { params: { songId: songId } })
                    .then(() => console.log('Triggered play count increment for', songId))
                    .catch(err => console.warn('Failed to trigger play count increment:', err));
                
                // Use DTO data
                const displaySingers = songDetailDTO.singerNames || 'Unknown Artist';
                openPlayerModal(songDetailDTO, displaySingers);
                
            } else {
                 alert('Could not load song details.');
            }
        })
        .catch(error => {
            console.error('Error fetching song details for playback', error);
            alert('Could not load song. Please try again later.');
        });
}

/**
 * Open the player modal with song details (Expects DTO)
 */
function openPlayerModal(songData, singerName) { // singerName param is actually singerNames string
    // Update modal content
    $('#playing-song-cover').attr('src', songData.pic || 'assets/media/image/default-cover.jpg');
    $('#playing-song-name').text(songData.name);
    $('#playing-song-artist').text(singerName); 
    $('#audio-source').attr('src', songData.url);
    
    // Update lyrics
    if (songData.lyric && songData.lyric.trim()) {
        $('#playing-song-lyrics').html(formatLyrics(songData.lyric)); // Assumes formatLyrics exists
    } else {
        $('#playing-song-lyrics').text('No lyrics available');
    }
    
    // Load and play the audio
    const audioPlayer = document.getElementById('audio-player');
    if (audioPlayer) {
        audioPlayer.load();
        audioPlayer.play();
    } else {
        console.error('Audio player element not found!');
    }
    
    // Show the modal
    if (typeof $ !== 'undefined' && $('#songPlayerModal').length) {
         $('#songPlayerModal').modal('show');
    }
}

/**
 * Format lyrics text with line breaks
 */
function formatLyrics(lyrics) {
    return lyrics.replace(/\n/g, '<br>');
}

/**
 * View song details page
 */
function viewSongDetails(songId) {
    window.location.href = `song-details.html?id=${songId}`;
}

/**
 * Set up player events
 */
function setupPlayerEvents() {
    // Close modal and pause when hidden
    $('#songPlayerModal').on('hidden.bs.modal', function() {
        const audioPlayer = document.getElementById('audio-player');
        audioPlayer.pause();
    });
} 
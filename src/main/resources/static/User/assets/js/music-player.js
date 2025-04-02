/**
 * Music Player and Song Management for User Interface
 * This file handles the display and interaction with songs on the user side.
 */

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
 * Load the total songs count for the dashboard
 */
function loadTotalSongsCount() {
    $.ajax({
        url: '/song/allSong',
        type: 'GET',
        success: function(response) {
            if (response) {
                $('#total-songs-count').text(response.length || 0);
            }
        },
        error: function(error) {
            console.error('Error fetching total songs count', error);
        }
    });
}

/**
 * Load top songs for the dashboard
 */
function loadTopSongs() {
    $.ajax({
        url: '/song/topSong',
        type: 'GET',
        success: function(response) {
            if (response && response.length > 0) {
                populateTopSongsTable(response.slice(0, 5)); // Display top 5 songs
            }
        },
        error: function(error) {
            console.error('Error fetching top songs', error);
        }
    });
}

/**
 * Populate the top songs table with data
 */
function populateTopSongsTable(songs) {
    const $topSongsTable = $('#top-songs-table tbody');
    $topSongsTable.empty();
    
    songs.forEach((song, index) => {
        const row = `
            <tr>
                <td>${index + 1}</td>
                <td>${song.name}</td>
                <td data-singer-id="${song.singerId}">Loading...</td>
                <td>${song.playCount || 0}</td>
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
        
        // Load singer name
        loadSingerName(song.singerId);
    });
    
    // Re-initialize feather icons
    if (typeof feather !== 'undefined') {
        feather.replace();
    }
    
    // Attach event handlers
    $('.play-song-btn').on('click', function() {
        const songId = $(this).data('song-id');
        playSong(songId);
    });
    
    $('.view-details-btn').on('click', function() {
        const songId = $(this).data('song-id');
        viewSongDetails(songId);
    });
}

/**
 * Load the latest songs for the dashboard
 */
function loadLatestSongs() {
    $.ajax({
        url: '/song/allSong',
        type: 'GET',
        success: function(response) {
            if (response && response.length > 0) {
                // Sort by ID (assuming higher IDs are newer songs)
                const sortedSongs = response.sort((a, b) => b.id - a.id);
                populateLatestSongsGrid(sortedSongs.slice(0, 6)); // Display latest 6 songs
            }
        },
        error: function(error) {
            console.error('Error fetching latest songs', error);
        }
    });
}

/**
 * Populate the latest songs grid with data
 */
function populateLatestSongsGrid(songs) {
    const $container = $('#latest-songs-container');
    $container.empty();
    
    songs.forEach(song => {
        const card = `
            <div class="col-md-4 col-lg-2 mb-4">
                <div class="card">
                    <img src="${song.pic || 'assets/media/image/default-cover.jpg'}" 
                         class="card-img-top" alt="${song.name}" 
                         style="height: 150px; object-fit: cover;">
                    <div class="card-body">
                        <h6 class="card-title text-truncate">${song.name}</h6>
                        <p class="card-text singer-name" data-singer-id="${song.singerId}">Loading...</p>
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
        
        // Load singer name
        loadSingerName(song.singerId);
    });
    
    // Re-initialize feather icons
    if (typeof feather !== 'undefined') {
        feather.replace();
    }
    
    // Attach event handlers
    $('.play-song-btn').on('click', function() {
        const songId = $(this).data('song-id');
        playSong(songId);
    });
    
    $('.view-details-btn').on('click', function() {
        const songId = $(this).data('song-id');
        viewSongDetails(songId);
    });
}

/**
 * Load singer name by ID and update relevant elements
 */
function loadSingerName(singerId) {
    $.ajax({
        url: '/singer/detail',
        type: 'GET',
        data: { id: singerId },
        success: function(response) {
            if (response) {
                // Update all elements with this singer ID
                $(`[data-singer-id="${singerId}"]`).text(response.name);
            }
        },
        error: function(error) {
            console.error(`Error fetching singer name for ID ${singerId}`, error);
        }
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
 * Play a song by its ID
 */
function playSong(songId) {
    // First, get the song details
    $.ajax({
        url: '/song/detail',
        type: 'GET',
        data: { songId: songId },
        success: function(song) {
            if (song) {
                // Update play count
                $.ajax({
                    url: '/song/addNums',
                    type: 'GET',
                    data: { songId: songId }
                });
                
                // Get singer info
                $.ajax({
                    url: '/singer/detail',
                    type: 'GET',
                    data: { id: song.singerId },
                    success: function(singer) {
                        openPlayerModal(song, singer ? singer.name : 'Unknown Artist');
                    },
                    error: function() {
                        openPlayerModal(song, 'Unknown Artist');
                    }
                });
            }
        },
        error: function(error) {
            console.error('Error fetching song details', error);
            alert('Could not load song. Please try again later.');
        }
    });
}

/**
 * Open the player modal with song details
 */
function openPlayerModal(song, singerName) {
    // Update modal content
    $('#playing-song-cover').attr('src', song.pic || 'assets/media/image/default-cover.jpg');
    $('#playing-song-name').text(song.name);
    $('#playing-song-artist').text(singerName);
    $('#audio-source').attr('src', song.url);
    
    // Update lyrics
    if (song.lyric && song.lyric.trim()) {
        $('#playing-song-lyrics').html(formatLyrics(song.lyric));
    } else {
        $('#playing-song-lyrics').text('No lyrics available');
    }
    
    // Load and play the audio
    const audioPlayer = document.getElementById('audio-player');
    audioPlayer.load();
    audioPlayer.play();
    
    // Show the modal
    $('#songPlayerModal').modal('show');
}

/**
 * Format lyrics text with line breaks
 */
function formatLyrics(lyrics) {
    return lyrics.replace(/\n/g, '<br>');
}

/**
 * View detailed song information
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
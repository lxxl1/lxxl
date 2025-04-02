/**
 * Song Details Page JavaScript
 * This file handles loading and displaying detailed information about a specific song
 */

$(document).ready(function() {
    // Get song ID from URL parameter
    const urlParams = new URLSearchParams(window.location.search);
    const songId = urlParams.get('id');
    
    if (!songId) {
        // No song ID provided, show error
        showError('No song ID provided. Please return to the song list and try again.');
        return;
    }
    
    // Load song details
    loadSongDetails(songId);
    
    // Setup event listeners
    setupEventListeners(songId);
});

/**
 * Load detailed information about a song
 */
function loadSongDetails(songId) {
    $.ajax({
        url: '/song/detail',
        type: 'GET',
        data: { songId: songId },
        success: function(song) {
            if (song) {
                displaySongDetails(song);
                loadArtistDetails(song.singerId);
                loadRelatedSongs(song.singerId, song.id);
            } else {
                showError('Song not found. It may have been removed or is unavailable.');
            }
        },
        error: function(error) {
            console.error('Error fetching song details', error);
            showError('Error loading song details. Please try again later.');
        }
    });
}

/**
 * Display song details on the page
 */
function displaySongDetails(song) {
    // Update page title
    document.title = `${song.name} - Music Resource Management`;
    
    // Update breadcrumb
    $('#song-title-breadcrumb').text(song.name);
    
    // Update song details
    $('#song-name').text(song.name);
    $('#song-cover').attr('src', song.pic || 'assets/media/image/default-cover.jpg');
    $('#song-description').text(song.introduction || 'No description available');
    $('#play-count').text(song.playCount || 0);
    
    // Update lyrics
    if (song.lyric && song.lyric.trim()) {
        $('#song-lyrics').text(song.lyric);
    } else {
        $('#song-lyrics').text('No lyrics available for this song.');
    }
    
    // Check if music video is available
    if (song.mvurl) {
        $('#music-video-source').attr('src', song.mvurl);
        $('#music-video-section').removeClass('d-none');
        
        // Load the video
        const video = document.getElementById('music-video');
        if (video) {
            video.load();
        }
    }
    
    // Store song data in a data attribute for the play button
    $('#play-song-btn').data('song', song);
    
    // Hide loading spinner and show content
    $('#loading-spinner').addClass('d-none');
    $('#song-details-container').removeClass('d-none');
    
    // Re-initialize feather icons
    if (typeof feather !== 'undefined') {
        feather.replace();
    }
}

/**
 * Load artist details
 */
function loadArtistDetails(singerId) {
    $.ajax({
        url: '/singer/detail',
        type: 'GET',
        data: { id: singerId },
        success: function(singer) {
            if (singer) {
                $('#artist-name').text(singer.name);
                $('#artist-name').attr('href', `singer-details.html?id=${singer.id}`);
            } else {
                $('#artist-name').text('Unknown Artist');
            }
        },
        error: function(error) {
            console.error('Error fetching artist details', error);
            $('#artist-name').text('Unknown Artist');
        }
    });
}

/**
 * Load related songs by the same artist
 */
function loadRelatedSongs(singerId, currentSongId) {
    $.ajax({
        url: '/song/singer/detail',
        type: 'GET',
        data: { singerId: singerId },
        success: function(songs) {
            if (songs && songs.length > 0) {
                // Filter out the current song
                const relatedSongs = songs.filter(song => song.id !== parseInt(currentSongId));
                
                if (relatedSongs.length > 0) {
                    displayRelatedSongs(relatedSongs.slice(0, 4)); // Display up to 4 related songs
                } else {
                    $('#related-songs-container').html('<div class="col-12 text-center">No other songs available from this artist</div>');
                }
            } else {
                $('#related-songs-container').html('<div class="col-12 text-center">No other songs available from this artist</div>');
            }
        },
        error: function(error) {
            console.error('Error fetching related songs', error);
            $('#related-songs-container').html('<div class="col-12 text-center">Error loading related songs</div>');
        }
    });
}

/**
 * Display related songs in the grid
 */
function displayRelatedSongs(songs) {
    const $container = $('#related-songs-container');
    $container.empty();
    
    songs.forEach(song => {
        const card = `
            <div class="col-sm-6 col-md-3 mb-3">
                <div class="card h-100">
                    <img src="${song.pic || 'assets/media/image/default-cover.jpg'}" 
                         class="card-img-top" alt="${song.name}" 
                         style="height: 140px; object-fit: cover;">
                    <div class="card-body">
                        <h6 class="card-title text-truncate">${song.name}</h6>
                        <p class="card-text small text-truncate">${song.introduction || 'No description available'}</p>
                        <div class="d-flex justify-content-between mt-3">
                            <button class="btn btn-sm btn-primary play-related-song-btn" data-song-id="${song.id}">
                                <i data-feather="play"></i> Play
                            </button>
                            <a href="song-details.html?id=${song.id}" class="btn btn-sm btn-outline-info">
                                <i data-feather="info"></i>
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        `;
        $container.append(card);
    });
    
    // Re-initialize feather icons
    if (typeof feather !== 'undefined') {
        feather.replace();
    }
    
    // Attach event handlers
    $('.play-related-song-btn').on('click', function() {
        const songId = $(this).data('song-id');
        playSong(songId);
    });
}

/**
 * Set up event listeners for the page
 */
function setupEventListeners(songId) {
    // Play button click
    $('#play-song-btn').on('click', function() {
        // Increment play count
        $.ajax({
            url: '/song/addNums',
            type: 'GET',
            data: { songId: songId }
        });
        
        // Get song data from button data attribute
        const song = $(this).data('song');
        const artistName = $('#artist-name').text();
        
        // Open player modal
        openPlayerModal(song, artistName);
    });
}

/**
 * Show error message and hide loading spinner
 */
function showError(message) {
    $('#loading-spinner').html(`
        <div class="alert alert-danger" role="alert">
            <i data-feather="alert-circle" class="mr-2"></i>
            ${message}
        </div>
        <div class="text-center mt-3">
            <a href="index.html" class="btn btn-primary">Back to Homepage</a>
        </div>
    `);
    
    // Re-initialize feather icons
    if (typeof feather !== 'undefined') {
        feather.replace();
    }
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
        $('#playing-song-lyrics').html(song.lyric.replace(/\n/g, '<br>'));
    } else {
        $('#playing-song-lyrics').text('No lyrics available');
    }
    
    // Load and play the audio
    const audioPlayer = document.getElementById('audio-player');
    audioPlayer.load();
    audioPlayer.play();
    
    // Show the modal
    $('#songPlayerModal').modal('show');
    
    // Update play count in UI without refreshing the page
    const currentPlayCount = parseInt($('#play-count').text()) || 0;
    $('#play-count').text(currentPlayCount + 1);
} 
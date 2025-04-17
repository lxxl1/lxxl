/**
 * Song Details Page JavaScript
 * This file handles loading and displaying detailed information about a specific song
 */
import { playSongAudioPlayer } from './audio-player.js'; // Import the function

// Global variable to store the return path
let returnPath = 'index.html'; // Default return path

$(document).ready(function() {
    // Get song ID and source page from URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const songId = urlParams.get('songId'); 
    const fromPage = urlParams.get('from');

    // Determine the return path based on the 'from' parameter
    if (fromPage === 'my-music') {
        returnPath = 'my-music.html';
    } else if (fromPage === 'index') {
        returnPath = 'index.html';
    } // Add more sources if needed, otherwise defaults to index.html

    // Set the href for the back button (assuming it has id="back-button")
    const backButton = document.getElementById('back-button');
    if (backButton) {
        backButton.href = returnPath;
    }
    
    if (!songId) {
        // No song ID provided, show error
        showError('No song ID provided. Please return to the song list and try again.');
        // Hide the back button if there's an error
        if(backButton) backButton.style.display = 'none'; 
        return;
    }
    
    // Load song details
    loadSongDetails(songId);
    
    // Setup event listeners
    // setupEventListeners(songId); // This is now called within loadSongDetails success
});

// Store the loaded song detail DTO globally or pass it around
let currentSongDetail = null;

/**
 * Load detailed information about a song (now expects SongDetailDTO)
 */
function loadSongDetails(songId) {
    $.ajax({
        url: '/song/detail', // This endpoint now returns SongDetailDTO
        type: 'GET',
        data: { songId: songId },
        success: function(songDetailDTO) { // Renamed parameter
            if (songDetailDTO) {
                currentSongDetail = songDetailDTO; // Store the DTO
                displaySongDetails(songDetailDTO);
                // No longer need separate artist loading
                // loadArtistDetails(songDetailDTO.singerId); 
                
                // Load related songs based on the first singer if available
                if (songDetailDTO.singers && songDetailDTO.singers.length > 0) {
                    loadRelatedSongs(songDetailDTO.singers[0].id, songDetailDTO.id);
                } else {
                    // Handle case with no singers if needed
                     $('#related-songs-container').html('<div class="col-12 text-center">No artist information available for related songs.</div>');
                }
                
                // Setup listeners AFTER data is available
                setupEventListeners(songDetailDTO.id); 
                
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
 * Display song details on the page (uses SongDetailDTO)
 */
function displaySongDetails(songDetailDTO) {
    // Update page title
    document.title = `${songDetailDTO.name} - Music Resource Management`;
    
    // Update breadcrumb
    $('#song-title-breadcrumb').text(songDetailDTO.name);
    
    // Update song details
    $('#song-name').text(songDetailDTO.name);
    $('#song-cover').attr('src', songDetailDTO.pic || 'assets/media/image/default-cover.jpg');
    $('#song-description').text(songDetailDTO.introduction || 'No description available');
    $('#play-count').text(songDetailDTO.nums || 0); // Use nums field
    
    // Update Artist Name(s)
    const displaySingers = songDetailDTO.singerNames || 'Unknown Artist';
    // If you want links, you need to iterate through songDetailDTO.singers
    // For simplicity, just display names for now:
    $('#artist-name').text(displaySingers);
    // Example with links (requires modification of the HTML element maybe):
    /*
    let artistHtml = 'Unknown Artist';
    if (songDetailDTO.singers && songDetailDTO.singers.length > 0) {
        artistHtml = songDetailDTO.singers.map(singer => 
            `<a href="singer-details.html?id=${singer.id}">${singer.name}</a>`
        ).join(', ');
    }
    $('#artist-name').html(artistHtml); // Use .html() if generating links
    */
    
    // Update lyrics
    if (songDetailDTO.lyric && songDetailDTO.lyric.trim()) {
        // Consider formatting lyrics better if needed (e.g., replace \n with <br>)
        $('#song-lyrics').html(songDetailDTO.lyric.replace(/\n/g, '<br>')); 
    } else {
        $('#song-lyrics').text('No lyrics available for this song.');
    }
    
    // Check if music video is available
    if (songDetailDTO.mvurl) {
        $('#music-video-source').attr('src', songDetailDTO.mvurl);
        $('#music-video-section').removeClass('d-none');
        const video = document.getElementById('music-video');
        if (video) video.load();
    } else {
        $('#music-video-section').addClass('d-none');
    }
    
    // Store the DTO in the data attribute
    $('#play-song-btn').data('song', songDetailDTO);
    
    // Hide loading spinner and show content
    $('#loading-spinner').addClass('d-none');
    $('#song-details-container').removeClass('d-none');
    
    // Re-initialize feather icons
    if (typeof feather !== 'undefined') {
        feather.replace();
    }
}

/**
 * Load related songs by the same artist (Now using only the first singerId)
 */
function loadRelatedSongs(singerId, currentSongId) { // Keep signature for now
    if (!singerId) { // Don't load if no singer ID
         $('#related-songs-container').html('<div class="col-12 text-center">Cannot load related songs without artist information.</div>');
         return;
    }
    
    $.ajax({
        url: '/song/singer/detail', // This endpoint gets songs by ONE singerId
        type: 'GET',
        data: { singerId: singerId },
        success: function(response) { // Changed parameter name to 'response'
            // Check if response is successful and data exists
            if (response && response.code === '200' && response.data) { 
                const songs = response.data; // Get the list from response.data
                if (songs && songs.length > 0) {
                    // Filter out the current song
                    const relatedSongs = songs.filter(song => song.id !== parseInt(currentSongId));
                    if (relatedSongs.length > 0) {
                        // Display the first 4 related songs
                        displayRelatedSongs(relatedSongs.slice(0, 4)); 
                    } else {
                        $('#related-songs-container').html('<div class="col-12 text-center">No other songs available from this artist</div>');
                    }
                } else {
                    $('#related-songs-container').html('<div class="col-12 text-center">No other songs available from this artist</div>');
                }
            } else {
                 // Handle backend error or no data case
                 console.error('Failed to load related songs:', response ? response.msg : 'Invalid response format');
                 $('#related-songs-container').html('<div class="col-12 text-center">Could not load related songs.</div>');
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
     // ... (Implementation likely remains the same, but ensure it doesn't rely on singerId)
    const $container = $('#related-songs-container');
    $container.empty();
    
    songs.forEach(song => {
        // We might need singer names for related songs too. 
        // Currently, the /song/singer/detail likely returns List<Song>, not DTOs.
        // For now, we won't display singer name here, or make another call (inefficient).
        const card = `
            <div class="col-sm-6 col-md-3 mb-3">
                <div class="card h-100">
                    <img src="${song.pic || 'assets/media/image/default-cover.jpg'}" 
                         class="card-img-top" alt="${song.name}" 
                         style="height: 140px; object-fit: cover;">
                    <div class="card-body d-flex flex-column">
                        <h6 class="card-title text-truncate">${song.name}</h6>
                        <p class="card-text small text-truncate mb-auto">${song.introduction || ''}</p>
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
    
    if (typeof feather !== 'undefined') feather.replace();
    
    // Re-attach play button listeners for related songs
    $('.play-related-song-btn').on('click', function() {
        const relatedSongId = $(this).data('song-id');
        // Option 1: Reload the page for the new song
        window.location.href = `song-details.html?id=${relatedSongId}`;
        // Option 2: Try to play directly (might need more complex logic)
        // playSong(relatedSongId); // This might need the full DTO
    });
}

/**
 * Set up event listeners for the page (called after data is loaded)
 */
function setupEventListeners(songId) {
    // Play button click
    $('#play-song-btn').on('click', function() {
        // Get the stored DTO
        const songDetailDTO = $(this).data('song'); 
        
        if (!songDetailDTO) {
            console.error('SongDTO not found on play button');
            showError('Error preparing song for playback.'); 
            return;
        }
        
        // Increment play count API call
        $.ajax({
            url: '/song/addNums',
            type: 'GET',
            data: { songId: songId },
            success: function() {
                console.log('Play count increment triggered for song ID:', songId);
                // Update UI count immediately
                const currentPlayCount = parseInt($('#play-count').text()) || 0;
                $('#play-count').text(currentPlayCount + 1);
                // Update the DTO's count as well if needed
                // songDetailDTO.nums = currentPlayCount + 1;
                // $(this).data('song', songDetailDTO); // Re-setting data might not be necessary here
            },
            error: function() {
                 console.warn('Failed to trigger play count increment for song ID:', songId);
            }
        });
        
        // Get singer names from DTO
        const displaySingers = songDetailDTO.singerNames || 'Unknown Artist';
        
        // Call the global audio player function
        playSongAudioPlayer(songDetailDTO.url, songDetailDTO.name, displaySingers, songDetailDTO.pic);
        
        // Remove the call to open the modal
        // openPlayerModal(songDetailDTO, displaySingers); 
    });
    
    // Add listeners for related song play buttons (handled within displayRelatedSongs now)
    // The current implementation reloads the page, which is acceptable for now.
}

/**
 * Show error message and hide loading spinner
 */
function showError(message) {
    // Ensure the loading spinner exists before manipulating it
    const $loadingSpinner = $('#loading-spinner');
    if ($loadingSpinner.length) {
        $loadingSpinner.html(`
            <div class="alert alert-danger" role="alert">
                <i data-feather="alert-circle" class="mr-2"></i>
                ${message}
            </div>
            <div class="text-center mt-3">
                <a href="index.html" class="btn btn-primary">Back to Homepage</a>
            </div>
        `);
        // Replace feather icons after updating HTML
        if (typeof feather !== 'undefined') {
            feather.replace();
        }
    } else {
        // Fallback if spinner element is missing (e.g., display in another container)
        console.error("Loading spinner element not found for error message.");
        // Optionally, append the error to the main content area or show an alert
        // Example: $('#song-details-container').prepend(`<div class="alert alert-danger">${message}</div>`);
    }
    // Also hide the main container if it was visible
    $('#song-details-container').addClass('d-none');
}

// Remove the openPlayerModal function as it's no longer needed
/*
function openPlayerModal(songData, singerNames) { 
    // ... old modal code ...
}
*/ 
/**
 * Search Results Page JavaScript
 * This file handles the search functionality and displaying results
 */

$(document).ready(function() {
    // Get search query from URL parameter
    const urlParams = new URLSearchParams(window.location.search);
    const searchQuery = urlParams.get('q');
    
    // Setup search form
    setupSearchForm();
    
    // If search query is present, perform search
    if (searchQuery && searchQuery.trim()) {
        $('#search-input').val(searchQuery);
        $('#search-query-display').text(`Search Results for "${searchQuery}"`);
        performSearch(searchQuery);
    } else {
        // No search query, show the form
        $('#loading-spinner').addClass('d-none');
        $('#search-results-container').removeClass('d-none');
        $('#no-results-message').removeClass('d-none');
    }
    
    /**
     * Set up search form functionality
     */
    function setupSearchForm() {
        $('#search-form').on('submit', function(e) {
            e.preventDefault();
            const query = $('#search-input').val().trim();
            if (query) {
                // Update URL to include search query
                const newUrl = `search-results.html?q=${encodeURIComponent(query)}`;
                window.history.pushState({ path: newUrl }, '', newUrl);
                
                // Update display and perform search
                $('#search-query-display').text(`Search Results for "${query}"`);
                performSearch(query);
            }
        });
        
        // Handle search in header
        $('#song-search-form').on('submit', function(e) {
            e.preventDefault();
            const query = $('#song-search-input').val().trim();
            if (query) {
                window.location.href = `search-results.html?q=${encodeURIComponent(query)}`;
            }
        });
    }
    
    /**
     * Perform search with the given query
     */
    function performSearch(query) {
        // Show loading spinner
        $('#loading-spinner').removeClass('d-none');
        $('#search-results-container').addClass('d-none');
        
        // First try exact match
        $.ajax({
            url: '/song/songOfSongName',
            type: 'GET',
            data: { songName: query },
            success: function(exactResults) {
                // Now try like match
                $.ajax({
                    url: '/song/likeSongOfName',
                    type: 'GET',
                    data: { songName: query },
                    success: function(likeResults) {
                        // Combine results, removing duplicates
                        const combinedResults = combineAndDeduplicateResults(exactResults, likeResults);
                        
                        // Hide loading spinner
                        $('#loading-spinner').addClass('d-none');
                        $('#search-results-container').removeClass('d-none');
                        
                        // Display results
                        displaySearchResults(combinedResults);
                    },
                    error: function(error) {
                        handleSearchError(error);
                    }
                });
            },
            error: function(error) {
                handleSearchError(error);
            }
        });
    }
    
    /**
     * Combine and deduplicate search results
     */
    function combineAndDeduplicateResults(exactResults, likeResults) {
        if (!exactResults) exactResults = [];
        if (!likeResults) likeResults = [];
        
        // Create a map to deduplicate by song ID
        const resultsMap = new Map();
        
        // Add exact results first (higher priority)
        exactResults.forEach(song => {
            resultsMap.set(song.id, song);
        });
        
        // Add like results that aren't already included
        likeResults.forEach(song => {
            if (!resultsMap.has(song.id)) {
                resultsMap.set(song.id, song);
            }
        });
        
        // Convert back to array
        return Array.from(resultsMap.values());
    }
    
    /**
     * Display search results
     */
    function displaySearchResults(songs) {
        const $songResults = $('#song-results');
        $songResults.empty();
        
        // Update song count badge
        $('#song-count-badge').text(songs.length);
        
        if (songs.length === 0) {
            // Show no results message
            $('#no-results-message').removeClass('d-none');
            return;
        }
        
        // Hide no results message
        $('#no-results-message').addClass('d-none');
        
        // Display each song
        songs.forEach(song => {
            const songCard = createSongCard(song);
            $songResults.append(songCard);
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
     * Create HTML for a song card
     */
    function createSongCard(song) {
        return `
            <div class="col-sm-6 col-md-4 col-lg-3 mb-4">
                <div class="card h-100">
                    <div class="position-relative">
                        <img src="${song.pic || 'assets/media/image/default-cover.jpg'}" 
                             class="card-img-top" alt="${song.name}" 
                             style="height: 180px; object-fit: cover;">
                        <button class="btn btn-primary rounded-circle position-absolute play-song-btn" 
                                style="bottom: -20px; right: 20px; width: 40px; height: 40px; padding: 0;"
                                data-song-id="${song.id}">
                            <i data-feather="play" style="width: 18px; height: 18px;"></i>
                        </button>
                    </div>
                    <div class="card-body pt-4">
                        <h6 class="card-title text-truncate mb-1">${song.name}</h6>
                        <p class="card-text text-muted small mb-2 singer-name" data-singer-id="${song.singerId}">Loading...</p>
                        <p class="card-text small text-truncate">${song.introduction || 'No description available'}</p>
                        <div class="d-flex justify-content-between align-items-center mt-3">
                            <span class="badge badge-light">
                                <i data-feather="headphones" class="mr-1" style="width: 14px; height: 14px;"></i>
                                ${song.playCount || 0}
                            </span>
                            <button class="btn btn-sm btn-outline-info view-details-btn" data-song-id="${song.id}">
                                Details
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
    
    /**
     * Handle search error
     */
    function handleSearchError(error) {
        console.error('Error searching songs', error);
        
        // Hide loading spinner
        $('#loading-spinner').addClass('d-none');
        $('#search-results-container').removeClass('d-none');
        
        // Show error message
        $('#song-results').html(`
            <div class="col-12">
                <div class="alert alert-danger">
                    <i data-feather="alert-circle" class="mr-2"></i>
                    Error searching songs. Please try again later.
                </div>
            </div>
        `);
        
        // Re-initialize feather icons
        if (typeof feather !== 'undefined') {
            feather.replace();
        }
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
});

/**
 * View song details page
 */
function viewSongDetails(songId) {
    window.location.href = `song-details.html?id=${songId}`;
}

/**
 * Play a song by ID - leverages the music-player.js functionality
 */
function playSong(songId) {
    // Get the song details and play it
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
} 
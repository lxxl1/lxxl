/**
 * All Songs Page JavaScript
 * This file handles functionality for the all-songs.html page including
 * loading songs, pagination, searching, and filtering.
 */

$(document).ready(function() {
    // Initialize variables
    let allSongs = [];
    let currentPage = 1;
    const songsPerPage = 12;
    let filteredSongs = [];
    let currentSearchTerm = '';
    let currentCategoryFilter = '';
    
    // Initial data loading
    loadAllSongs();
    loadCategories();
    
    // Set up event listeners
    setupEventListeners();
    
    /**
     * Load all songs from the API
     */
    function loadAllSongs() {
        $.ajax({
            url: '/song/allSong',
            type: 'GET',
            success: function(response) {
                if (response && response.length > 0) {
                    allSongs = response;
                    filteredSongs = allSongs; // Initial filtered songs is all songs
                    displaySongs(currentPage);
                    setupPagination();
                } else {
                    // Show no songs message
                    $('#all-songs-grid').html('<div class="col-12 text-center py-5"><p>No songs available</p></div>');
                }
            },
            error: function(error) {
                console.error('Error fetching songs', error);
                $('#all-songs-grid').html('<div class="col-12 text-center py-5"><p>Error loading songs. Please try again later.</p></div>');
            }
        });
    }
    
    /**
     * Load all categories for the filter dropdown
     */
    function loadCategories() {
        // This would typically call an API endpoint for categories
        // For now, we'll use a placeholder until that endpoint is available
        
        const dummyCategories = [
            { id: 1, name: 'Pop' },
            { id: 2, name: 'Rock' },
            { id: 3, name: 'Classical' },
            { id: 4, name: 'Jazz' },
            { id: 5, name: 'Electronic' }
        ];
        
        const $categoryFilter = $('#category-filter');
        dummyCategories.forEach(category => {
            $categoryFilter.append(`<option value="${category.id}">${category.name}</option>`);
        });
    }
    
    /**
     * Set up event listeners for the page
     */
    function setupEventListeners() {
        // Category filter change
        $('#category-filter').on('change', function() {
            currentCategoryFilter = $(this).val();
            filterSongs();
        });
        
        // Search button click
        $('#song-list-search-btn').on('click', function() {
            currentSearchTerm = $('#song-list-search').val().trim().toLowerCase();
            filterSongs();
        });
        
        // Search input enter key
        $('#song-list-search').on('keyup', function(e) {
            if (e.key === 'Enter') {
                currentSearchTerm = $(this).val().trim().toLowerCase();
                filterSongs();
            }
        });
    }
    
    /**
     * Filter songs based on current search term and category filter
     */
    function filterSongs() {
        filteredSongs = allSongs.filter(song => {
            const matchesSearch = !currentSearchTerm || 
                                 song.name.toLowerCase().includes(currentSearchTerm);
            
            const matchesCategory = !currentCategoryFilter || 
                                   (song.categoryId && song.categoryId.toString() === currentCategoryFilter);
            
            return matchesSearch && matchesCategory;
        });
        
        // Reset to first page when filtering
        currentPage = 1;
        
        // Re-display and re-paginate
        displaySongs(currentPage);
        setupPagination();
    }
    
    /**
     * Display songs for the current page
     */
    function displaySongs(page) {
        const startIndex = (page - 1) * songsPerPage;
        const endIndex = startIndex + songsPerPage;
        const songsToDisplay = filteredSongs.slice(startIndex, endIndex);
        
        const $grid = $('#all-songs-grid');
        $grid.empty();
        
        if (songsToDisplay.length === 0) {
            $grid.html('<div class="col-12 text-center py-5"><p>No songs match your criteria</p></div>');
            return;
        }
        
        songsToDisplay.forEach(song => {
            const songCard = createSongCard(song);
            $grid.append(songCard);
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
     * Set up pagination based on filtered songs
     */
    function setupPagination() {
        const totalPages = Math.ceil(filteredSongs.length / songsPerPage);
        const $pagination = $('#songs-pagination');
        $pagination.empty();
        
        if (totalPages <= 1) {
            return; // No pagination needed
        }
        
        // Previous button
        $pagination.append(`
            <li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
                <a class="page-link" href="#" data-page="${currentPage - 1}" aria-label="Previous">
                    <span aria-hidden="true">&laquo;</span>
                </a>
            </li>
        `);
        
        // Page numbers
        for (let i = 1; i <= totalPages; i++) {
            $pagination.append(`
                <li class="page-item ${i === currentPage ? 'active' : ''}">
                    <a class="page-link" href="#" data-page="${i}">${i}</a>
                </li>
            `);
        }
        
        // Next button
        $pagination.append(`
            <li class="page-item ${currentPage === totalPages ? 'disabled' : ''}">
                <a class="page-link" href="#" data-page="${currentPage + 1}" aria-label="Next">
                    <span aria-hidden="true">&raquo;</span>
                </a>
            </li>
        `);
        
        // Add click event to pagination links
        $pagination.find('.page-link').on('click', function(e) {
            e.preventDefault();
            if ($(this).parent().hasClass('disabled')) {
                return;
            }
            
            const page = parseInt($(this).data('page'));
            currentPage = page;
            displaySongs(currentPage);
            
            // Scroll to top of grid
            $('html, body').animate({
                scrollTop: $('#all-songs-grid').offset().top - 100
            }, 200);
            
            // Update active state
            $pagination.find('.page-item').removeClass('active');
            $pagination.find(`.page-item:has(a[data-page="${currentPage}"])`).addClass('active');
            
            // Update disabled state for prev/next
            $pagination.find('.page-item:first-child').toggleClass('disabled', currentPage === 1);
            $pagination.find('.page-item:last-child').toggleClass('disabled', currentPage === totalPages);
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
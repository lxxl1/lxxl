import { API_URL } from '../../../Common/js/config.js';
import api from '../../../Common/js/api.js';
import { playSongAudioPlayer } from './audio-player.js'; // Import the function

// Global variables
let allCategories = []; // Store all available categories
let currentCategoryId = null; // Current displayed category ID
let currentCategoryName = null; // Current displayed category name
let currentUserId = null; // Current user ID
let songs = []; // Store loaded song list

document.addEventListener('DOMContentLoaded', async () => {
    console.log('Page loaded, initializing...');
    
    // Check if user is logged in
    try {
        checkUserLoggedIn();
        
        // Get category ID and name from URL parameters
        const urlParams = new URLSearchParams(window.location.search);
        const categoryId = urlParams.get('id');
        const categoryName = urlParams.get('name');
        
        if (!categoryId) {
            showAlert('Missing category ID parameter', 'error');
            setTimeout(() => {
                window.location.href = 'categories.html';
            }, 2000);
            return;
        }
        
        currentCategoryId = categoryId;
        currentCategoryName = categoryName;
        
        // Set category name in title and breadcrumb
        document.getElementById('categoryPageTitle').textContent = categoryName || 'Category Songs';
        document.getElementById('categoryNameBreadcrumb').textContent = categoryName || 'Category Songs';
        
        // Set category name in stats card
        document.getElementById('categoryNameStat').textContent = categoryName || '-';
        
        console.log('Loading category song data...');
        
        // Load songs for this category
        await loadCategorySongs(categoryId);
        
        // Set up search functionality
        const searchInput = document.getElementById('searchInput');
        const searchButton = document.getElementById('searchButton');
        
        if (searchInput && searchButton) {
            searchInput.addEventListener('keyup', (e) => {
                if (e.key === 'Enter') {
                    filterSongs(searchInput.value);
                }
            });
            
            searchButton.addEventListener('click', () => {
                filterSongs(searchInput.value);
            });
        }
        
        // Initialize feather icons
        if (window.feather) {
            console.log('Initializing Feather icons');
            feather.replace();
        } else {
            console.warn('Feather icon library not loaded');
        }
    } catch (error) {
        console.error('Page initialization error:', error);
        showAlert('Page initialization failed: ' + (error.message || 'Unknown error'), 'error');
    }
});

// Function to check if user is logged in
function checkUserLoggedIn() {
    try {
        const userStr = localStorage.getItem('user');
        if (!userStr) {
            console.error('User information not found');
            window.location.href = '../login.html';
            return;
        }
        
        const user = JSON.parse(userStr);
        
        if (!user || !user.id) {
            console.error('Incomplete user information');
            window.location.href = '../login.html';
            return;
        }
        
        console.log('User logged in:', user.id);
        currentUserId = user.id;
    } catch (error) {
        console.error('Error checking user login status:', error);
        showAlert('Please log in first', 'error');
        setTimeout(() => {
            window.location.href = '../login.html';
        }, 2000);
        throw error;
    }
}

// Function to safely get API endpoint
function getApiEndpoint() {
    try {
        // Check if API_URL is defined in config
        if (typeof API_URL !== 'undefined' && API_URL) {
            return API_URL;
        } else {
            // Default fallback
            console.warn('API_URL not defined, using default address');
            return 'http://localhost:8080';
        }
    } catch (error) {
        console.error('Error getting API endpoint:', error);
        return 'http://localhost:8080'; // Default fallback
    }
}

// Function to load songs for a specific category
async function loadCategorySongs(categoryId) {
    try {
        console.log('Loading songs for category:', categoryId);
        
        // If API module is not available, use fetch
        if (typeof api === 'undefined' || !api) {
            console.warn('API module not loaded, using native fetch');
            const response = await fetch(`${getApiEndpoint()}/song/selectbyuser?userId=${currentUserId}`);
            const data = await response.json();
            
            if (data.code !== '200') {
                throw new Error(data.msg || 'Failed to get songs');
            }
            
            const allSongsData = data.data; // Assign to a new variable first

            // Check if allSongsData is an array before filtering
            if (!Array.isArray(allSongsData)) {
                 console.error('Received non-array data for songs:', allSongsData);
                 songs = []; // Set songs to empty array
            } else {
                // Filter songs by category ID only if it's an array
                songs = allSongsData.filter(song => 
                    song && song.categoryIds && Array.isArray(song.categoryIds) && 
                    song.categoryIds.includes(parseInt(categoryId))
                );
            }
            
            // Update song count badge and stat card
            document.getElementById('songCountBadge').textContent = `${songs.length} songs`;
            document.getElementById('songCountStat').textContent = songs.length;
            
            // Display songs
            displaySongs(songs);
            return; // Exit after fetch logic
        }
        
        // Use API module if available
        const response = await api.get('/song/selectbyuser', {
            params: { userId: currentUserId }
        });
        
        if (response.data.code !== '200') {
            throw new Error(response.data.msg || 'Failed to get songs');
        }
        
        // Adjust logic to handle paginated response structure { list: [], total: ... }
        const responseData = response.data.data; 
        let allSongsArray = []; // Initialize as empty array

        if (responseData && Array.isArray(responseData.list)) {
            allSongsArray = responseData.list;
            console.log('Received paginated song data, using list property.');
        } else if (Array.isArray(responseData)) {
             // Fallback if the API sometimes returns a direct array (less likely now)
             allSongsArray = responseData;
             console.log('Received direct song array data.');
        } else {
             console.error('Received unexpected data format for songs:', responseData);
             // Keep allSongsArray as empty
        }
        
        // Filter songs by category ID from the extracted array
        songs = allSongsArray.filter(song => 
            song && song.categoryIds && Array.isArray(song.categoryIds) && 
            song.categoryIds.includes(parseInt(categoryId))
        );
        
        console.log(`Found ${songs.length} songs in category ${categoryId}`);
        
        // Update song count badge and stat card
        document.getElementById('songCountBadge').textContent = `${songs.length} songs`;
        document.getElementById('songCountStat').textContent = songs.length;
        
        // Display songs
        displaySongs(songs);
    } catch (error) {
        console.error('Failed to load songs:', error);
        showAlert('Failed to load songs, please try again later: ' + (error.message || 'Unknown error'), 'error');
        
        // Show empty state
        const songsContainer = document.getElementById('songsContainer');
        const noSongsMessage = document.getElementById('noSongsMessage');
        
        if (songsContainer) songsContainer.style.display = 'none';
        if (noSongsMessage) noSongsMessage.style.display = 'block';
    }
}

// Function to display songs in UI
function displaySongs(songsToDisplay) {
    try {
        const songsContainer = document.getElementById('songsContainer');
        const noSongsMessage = document.getElementById('noSongsMessage');
        
        if (!songsContainer || !noSongsMessage) {
            console.error('Song container elements not found');
            return;
        }
        
        // Clear loading state
        songsContainer.innerHTML = '';
        
        if (!songsToDisplay || songsToDisplay.length === 0) {
            songsContainer.style.display = 'none';
            noSongsMessage.style.display = 'block';
            return;
        }
        
        noSongsMessage.style.display = 'none';
        songsContainer.style.display = 'flex'; // Use flex for row behavior
        
        console.log('Rendering song list...');
        
        songsToDisplay.forEach(song => {
            if (song) {
                const songCard = createSongCard(song);
                songsContainer.appendChild(songCard);
            } else {
                console.warn('Encountered invalid song data:', song);
            }
        });
        
        console.log('Song list rendered, initializing event listeners...');
        
        // Re-initialize feather icons
        if (window.feather) {
            feather.replace();
        }
        
        // Set up play song event listeners
        setupPlaySongListeners();
        
        // Set up edit categories event listeners
        setupEditCategoriesListeners();
    } catch (error) {
        console.error('Error rendering songs:', error);
        showAlert('Error rendering song list.', 'error');
        // Show empty state
        const songsContainer = document.getElementById('songsContainer');
        const noSongsMessage = document.getElementById('noSongsMessage');
        if (songsContainer) songsContainer.style.display = 'none';
        if (noSongsMessage) noSongsMessage.style.display = 'block';
    }
}

// Function to check if a URL is absolute
function isAbsoluteURL(url) {
  // Simple check for common protocols or protocol-relative URLs
  // Also checks for data URIs
  return /^(?:[a-z]+:)?\/\/|data:/i.test(url);
}

// Function to create a song card HTML element
function createSongCard(song) {
    const songId = song.id;
    const songName = escapeHTML(song.name || 'Unknown Song');
    const singerName = escapeHTML(song.singerName || 'Unknown Artist');

    // Determine the correct song URL
    const songUrlRaw = song.url || '#';
    const songUrl = isAbsoluteURL(songUrlRaw) ? songUrlRaw : (songUrlRaw !== '#' ? `${getApiEndpoint()}${songUrlRaw}` : '#');

    // Determine the correct cover URL
    const coverUrlRaw = song.pic || 'assets/media/image/default-cover.jpg';
    const coverUrl = isAbsoluteURL(coverUrlRaw) ? coverUrlRaw : (coverUrlRaw !== 'assets/media/image/default-cover.jpg' ? `${getApiEndpoint()}${coverUrlRaw}` : 'assets/media/image/default-cover.jpg');

    const cardCol = document.createElement('div');
    cardCol.className = 'col-lg-3 col-md-4 col-sm-6 mb-4';

    // Use the processed URLs in the innerHTML
    cardCol.innerHTML = `
        <div class="card song-card shadow-sm h-100">
            <img src="${coverUrl}" class="card-img-top song-image" alt="${songName} Cover">
            <div class="card-body d-flex flex-column">
                <h6 class="card-title flex-grow-1">${songName}</h6>
                <p class="card-text text-muted small mb-2">${singerName}</p>
                <div class="mt-auto d-flex justify-content-between align-items-center">
                     <button class="btn btn-sm btn-outline-primary play-song-btn" 
                             data-song-id="${songId}" 
                             data-song-url="${songUrl}" 
                             data-song-name="${songName}" 
                             data-song-artist="${singerName}" 
                             data-song-cover="${coverUrl}">
                        <i data-feather="play-circle" class="mr-1" style="width: 16px; height: 16px;"></i> Play
                    </button>
                    <div class="song-controls">
                        <button class="btn btn-sm btn-light text-info edit-categories-btn" data-song-id="${songId}" data-song-name="${songName}" title="Edit Categories">
                            <i data-feather="tag"></i>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    return cardCol;
}

// Function to set up play song listeners
function setupPlaySongListeners() {
    try {
        const playButtons = document.querySelectorAll('.play-song-btn');
        
        playButtons.forEach(button => {
            // Remove existing listener before adding a new one to prevent duplicates
            button.removeEventListener('click', handlePlayButtonClick);
            button.addEventListener('click', handlePlayButtonClick);
        });
    } catch (error) {
        console.error('Error setting up play button listeners:', error);
    }
}

// Define the handler function separately for clarity and easier removal
function handlePlayButtonClick(e) {
    const button = e.currentTarget; // Use currentTarget
    const songId = button.getAttribute('data-song-id');
    const songUrl = button.getAttribute('data-song-url');
    const songName = button.getAttribute('data-song-name');
    const songArtist = button.getAttribute('data-song-artist');
    const songCover = button.getAttribute('data-song-cover');

    if (!songUrl || songUrl === '#') {
        console.error('Song URL not available for song:', songName);
        showAlert('Audio file not found for this song.', 'error');
        return;
    }
    
    // Call the imported function from audio-player.js
    playSongAudioPlayer(songUrl, songName, songArtist, songCover);
}

// Function to filter songs by search term
function filterSongs(searchTerm) {
    try {
        const term = (searchTerm || '').toLowerCase().trim();
        const filteredSongs = songs.filter(song => {
            if (!song) return false;
            
            const songName = (song.name || '').toLowerCase();
            const singerName = (song.singerName || '').toLowerCase();
            
            return songName.includes(term) || singerName.includes(term);
        });
        
        // Display filtered songs
        displaySongs(filteredSongs);
    } catch (error) {
        console.error('Error filtering songs:', error);
        showAlert('Search error: ' + (error.message || 'Unknown error'), 'error');
    }
}

// Function to show alert messages
function showAlert(message, type = 'info', containerId = 'alerts') {
    const alertContainer = document.getElementById(containerId);
    if (!alertContainer) {
        console.error(`Alert container with ID '${containerId}' not found.`);
        // Fallback to default container if modal alert container not found
        if (containerId !== 'alerts') {
             showAlert(message, type, 'alerts');
        } else {
            // If default also fails, log to console
            console.error(`Alert: [${type}] ${message}`);
        }
        return;
    }
    
    const alertId = 'alert-' + Date.now();
    
    const alertHTML = `
        <div id="${alertId}" class="alert alert-${type} alert-dismissible fade show" role="alert">
            ${escapeHTML(message)} <!-- Escape message -->
            <button type="button" class="close" data-dismiss="alert" aria-label="Close">
                <span aria-hidden="true">&times;</span>
            </button>
        </div>
    `;
    
    alertContainer.insertAdjacentHTML('beforeend', alertHTML); // Use insertAdjacentHTML for safer appending
    
    // Auto-dismiss after 5 seconds
    setTimeout(() => {
        const alertElement = document.getElementById(alertId);
        if (alertElement) {
            if (typeof $ !== 'undefined' && $.fn.alert) { // Check jQuery and Bootstrap alert
                $(alertElement).alert('close');
            } else {
                // Fallback if jQuery/Bootstrap JS is not available
                 try {
                    alertElement.style.opacity = '0';
                    setTimeout(() => alertElement.remove(), 600); // Remove after fade out
                 } catch(e) { /* ignore errors if already removed */ }
            }
        }
    }, 5000);
}

/**
 * HTML escape function
 */
function escapeHTML(str) {
    if (str === null || str === undefined) return '';
    return String(str).replace(/[&<>'"/]/g, 
        tag => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;',
            '/': '&#x2F;' // Escape forward slash too
        }[tag] || tag)
    );
}

/**
 * Show message notification (Alias for showAlert)
 */
function showMessage(message, type) {
    showAlert(message, type);
}

// Function to set up listeners for Edit Categories buttons
function setupEditCategoriesListeners() {
    const editButtons = document.querySelectorAll('.edit-categories-btn');
    editButtons.forEach(button => {
        button.removeEventListener('click', handleEditCategoriesClick); // Remove previous before adding
        button.addEventListener('click', handleEditCategoriesClick);
    });
    
    // Also setup listener for the modal save button ONCE
    const saveButton = document.getElementById('saveCategoriesButton');
    if (saveButton) {
        // Remove previous listener to avoid duplicates if called multiple times
        saveButton.removeEventListener('click', handleSaveChangesClick); 
        saveButton.addEventListener('click', handleSaveChangesClick);
    } else {
        console.error('Save Categories button not found');
    }
}

// Handler for Edit Categories button click
async function handleEditCategoriesClick(event) {
    const button = event.currentTarget;
    const songId = button.dataset.songId;
    const songName = button.dataset.songName || 'this song';

    if (!songId) {
        console.error('Could not get song ID');
        showAlert('Cannot edit categories, missing song information.', 'error');
        return;
    }

    console.log(`Editing categories for song "${songName}" (ID: ${songId})`);

    // Find song data locally
    const songData = songs.find(s => s && s.id === parseInt(songId));
    if (!songData) {
        console.error(`Could not find song ID ${songId} in local data.`);
        showAlert('Could not load category information for this song. Please refresh the page.', 'error');
        return;
    }
    // Ensure categoryIds is always an array, convert IDs to numbers
    const songCategoryIds = new Set((songData.categoryIds || []).map(id => parseInt(id)).filter(id => !isNaN(id))); 
    console.log('Current category IDs for song (from local data):', Array.from(songCategoryIds));

    // Set modal title and song ID
    document.getElementById('modalSongTitle').textContent = songName;
    document.getElementById('modalSongId').value = songId;
    
    // Clear previous modal content and show loading indicator
    const categoryListContainer = document.getElementById('modalCategoryList');
    categoryListContainer.innerHTML = `<div class="text-center w-100"><div class="spinner-border spinner-border-sm" role="status"><span class="visually-hidden">Loading categories...</span></div></div>`;
    document.getElementById('modalAlerts').innerHTML = ''; // Clear previous alerts

    // Show the modal using Bootstrap 4 jQuery method
    if (typeof $ !== 'undefined' && $.fn.modal) {
        $('#editCategoriesModal').modal('show');
    } else {
        console.error('Bootstrap Modal jQuery plugin not loaded.');
        showAlert('Error opening category editor.', 'error');
        return;
    }

    try {
        // Fetch only all categories (song categories are already available locally)
        const allCategories = await fetchAllCategories();

        if (allCategories === null) { // Check for null explicitly
            // Error handled within fetch function, it shows an alert
            console.log('Failed to fetch all categories, hiding modal.');
             if (typeof $ !== 'undefined' && $.fn.modal) {
                 $('#editCategoriesModal').modal('hide'); // Hide modal on critical fetch error
             }
            return;
        }
        
        console.log('All available categories:', allCategories);

        // Populate the modal with categories
        populateCategoryModal(allCategories, songCategoryIds); // Pass local songCategoryIds

    } catch (error) {
        console.error('Error loading all categories:', error);
        showAlert('Failed to load category list, please try again later.', 'error', 'modalAlerts');
        categoryListContainer.innerHTML = '<p class="text-danger text-center w-100">Could not load category list.</p>';
    }
}

// Helper function to fetch all categories
async function fetchAllCategories() {
    try {
        console.log('Fetching all categories...');
        const response = await api.get('/category/selectAll'); 
        if (response.data.code === '200') {
            console.log('Successfully fetched all categories:', response.data.data);
            return response.data.data || [];
        } else {
            console.error('Failed to fetch categories:', response.data.msg);
            showAlert('Could not fetch all categories: ' + (response.data.msg || 'Server error'), 'error', 'modalAlerts');
            return null; // Return null on failure
        }
    } catch (error) {
        console.error('Network error fetching all categories:', error);
        showAlert('Network error, could not fetch all categories.', 'error', 'modalAlerts');
        return null; // Return null on network error
    }
}

// Function to populate the category modal with pills/badges
function populateCategoryModal(allCategories, songCategoryIdsSet) { // Expect a Set
    const categoryListContainer = document.getElementById('modalCategoryList');
    categoryListContainer.innerHTML = ''; // Clear loading indicator

    if (!allCategories || allCategories.length === 0) {
        categoryListContainer.innerHTML = '<p class="text-muted text-center w-100">No categories available.</p>';
        return;
    }

    allCategories.forEach(category => {
        // Ensure category.id is treated as a number for comparison
        const categoryId = parseInt(category.id);
        if (isNaN(categoryId)) return; // Skip if ID is invalid
        
        const isSelected = songCategoryIdsSet.has(categoryId); // Check against the Set
        
        // Create a pill element (using button for better accessibility)
        const pill = document.createElement('button');
        pill.type = 'button'; // Prevent form submission if inside a form
        pill.className = `btn btn-sm badge badge-pill ${isSelected ? 'btn-primary' : 'btn-outline-secondary'}`;
        pill.textContent = escapeHTML(category.name);
        pill.dataset.categoryId = category.id; // Store ID in data attribute
        
        // Add click listener to toggle selection
        pill.addEventListener('click', () => {
            const currentId = parseInt(pill.dataset.categoryId);
             if (isNaN(currentId)) return;

            if (pill.classList.contains('btn-primary')) {
                // Deselect
                pill.classList.remove('btn-primary');
                pill.classList.add('btn-outline-secondary');
                songCategoryIdsSet.delete(currentId); // Update the set locally
            } else {
                // Select
                pill.classList.remove('btn-outline-secondary');
                pill.classList.add('btn-primary');
                songCategoryIdsSet.add(currentId); // Update the set locally
            }
            // No need to log here, changes are local until save
        });
        
        categoryListContainer.appendChild(pill);
    });
}

// Handler for Save Changes button click in modal
async function handleSaveChangesClick() {
    const saveButton = document.getElementById('saveCategoriesButton');
    const songId = document.getElementById('modalSongId').value;
    
    // Get selected IDs from pills dataset
    const selectedPills = document.querySelectorAll('#modalCategoryList .btn-primary');
    // Ensure IDs are numbers
    const selectedCategoryIds = Array.from(selectedPills)
                                     .map(pill => parseInt(pill.dataset.categoryId))
                                     .filter(id => !isNaN(id)); 

    if (!songId) {
        console.error('Could not get song ID from modal');
        showAlert('Cannot save categories, missing song information.', 'error', 'modalAlerts');
        return;
    }

    console.log(`Saving categories for song ${songId}:`, selectedCategoryIds);

    // Disable button to prevent multiple clicks
    saveButton.disabled = true;
    saveButton.innerHTML = `<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Saving...`;

    try {
        // Use PUT with JSON body for updating categories
        const response = await api.put('/song/updateCategory', { 
            songId: parseInt(songId), 
            categoryIds: selectedCategoryIds // Send as array of integers
        });

        if (response.data.code === '200') {
            showAlert('Song categories updated successfully!', 'success', 'modalAlerts');
            console.log('Category update successful');
            
            // Update local song data
            const songIndex = songs.findIndex(s => s && s.id === parseInt(songId));
            if (songIndex !== -1) {
                songs[songIndex].categoryIds = selectedCategoryIds;
                console.log(`Local categories for song ${songId} updated:`, songs[songIndex].categoryIds);
            }

            // Check if the song should be removed from the current view
            const currentCategoryIdNum = parseInt(currentCategoryId);
            if (!selectedCategoryIds.includes(currentCategoryIdNum)) {
                console.log(`Song removed from current category (${currentCategoryId}), removing from list.`);
                 // Find the card and remove it
                 const cardToRemove = document.querySelector(`.edit-categories-btn[data-song-id="${songId}"]`)?.closest('.col-lg-3');
                 if (cardToRemove) {
                     cardToRemove.remove();
                     // Update counts by filtering the main songs array again
                     songs = songs.filter(s => s.id !== parseInt(songId)); // Remove from global array
                     document.getElementById('songCountBadge').textContent = `${songs.length} songs`;
                     document.getElementById('songCountStat').textContent = songs.length;
                     if (songs.length === 0) {
                         displaySongs([]); // Show empty message if no songs left in this category view
                     }
                 }
            }

            // Close the modal after a short delay using Bootstrap 4 jQuery method
            setTimeout(() => {
                 if (typeof $ !== 'undefined' && $.fn.modal) {
                     $('#editCategoriesModal').modal('hide');
                 }
            }, 1500);

        } else {
            console.error('Failed to save categories:', response.data.msg);
            showAlert(`Failed to save categories: ${response.data.msg || 'Unknown server error'}`, 'error', 'modalAlerts');
        }

    } catch (error) {
        console.error('Network error saving categories:', error);
        showAlert(`Network error, could not save categories: ${error.message || 'Check network connection'}`, 'error', 'modalAlerts');
    } finally {
        // Re-enable button
        saveButton.disabled = false;
        saveButton.innerHTML = 'Save Changes';
    }
} 
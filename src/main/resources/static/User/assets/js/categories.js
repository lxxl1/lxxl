import { API_URL } from '../../../Common/js/config.js';
import api from '../../../Common/js/api.js';

// Global variable to store all categories
let allAvailableCategories = [];
let currentUserId = null; // Store current user ID

document.addEventListener('DOMContentLoaded', function() {
    initPage();
});

/**
 * Initialize page
 */
async function initPage() {
    try {
        // Get current logged-in user
        const currentUser = JSON.parse(localStorage.getItem('user'));
        if (!currentUser || !currentUser.id) {
            showMessage('Please log in first', 'danger');
            setTimeout(() => window.location.href = '../login.html', 2000);
            return;
        }
        currentUserId = currentUser.id; // Store user ID globally
        
        // Load all available categories and render to main table
        allAvailableCategories = await loadAllCategories();
        renderAvailableCategoriesList(allAvailableCategories); // New render function for the main table
        
        // Update statistics data
        await updateCategoryStatistics(currentUserId);
        await loadTopCategoryStat(); // Call the new function to load top category stat
        
        // Set up event listeners
        setupEventListeners();
    } catch (error) {
        console.error('Failed to initialize page:', error);
        showMessage('Failed to load data, please try again later', 'danger');
    }
}

/**
 * Load all categories
 */
async function loadAllCategories() {
    try {
        const response = await api.get('/category/selectAll');
        if (response.data.code === '200') {
            return response.data.data || [];
        } else {
            throw new Error(response.data.msg || 'Failed to fetch categories');
        }
    } catch (error) {
        console.error('Failed to load all categories:', error);
        // Update main table with error
        const tableBody = document.querySelector('#category-table tbody');
        if(tableBody) tableBody.innerHTML = '<tr><td colspan="3" class="text-center text-danger">Failed to load categories.</td></tr>';
        throw error; // Re-throw error to be caught by initPage
    }
}

/**
 * Render *all available* categories list to main table
 */
function renderAvailableCategoriesList(categories) {
    const tableBody = document.querySelector('#category-table tbody'); // Target main table
    
    if (!categories || categories.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="3" class="text-center">No categories available.</td></tr>';
        return;
    }
    
    tableBody.innerHTML = ''; // Clear loading/error message
    
    categories.forEach(category => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${escapeHTML(category.name)}</td>
            <td>${category.description ? escapeHTML(category.description) : 'N/A'}</td>
            <td class="text-right">
                <button class="btn btn-sm btn-outline-primary manage-category-songs" 
                        data-id="${category.id}" 
                        data-name="${escapeHTML(category.name)}">
                    <i data-feather="settings" class="mr-1" style="width: 1em; height: 1em;"></i>Manage Songs
                </button>
            </td>
        `;
        tableBody.appendChild(row);
    });
    
    if (window.feather) {
        feather.replace();
    }
}

/**
 * Update statistics data (only update available categories and user songs count)
 */
async function updateCategoryStatistics(userId) {
    try {
        // Available Categories count (already loaded)
        document.querySelector('.col-md-4:nth-child(1) h2').textContent = allAvailableCategories.length; // First card is Available Categories now
        
        // Your Songs count
        const songsResponse = await api.get('/song/selectbyuser', { params: { userId: userId } });
        if (songsResponse.data.code === '200') {
            const songs = songsResponse.data.data || [];
            document.querySelector('.col-md-4:nth-child(2) h2').textContent = songs.length; // Second card is Your Songs
        } else {
             document.querySelector('.col-md-4:nth-child(2) h2').textContent = '?';
        }
        // Third card is unused for now
         document.querySelector('.col-md-4:nth-child(3) h2').textContent = '-';

    } catch (error) {
        console.error('Failed to update statistics:', error);
         document.querySelector('.col-md-4:nth-child(1) h2').textContent = '?';
         document.querySelector('.col-md-4:nth-child(2) h2').textContent = '?';
         document.querySelector('.col-md-4:nth-child(3) h2').textContent = '?';
    }
}

/**
 * Load and update the Top Category statistic card.
 */
async function loadTopCategoryStat() {
    const countElement = document.getElementById('topCategoryCount');
    const nameElement = document.getElementById('topCategoryName');

    if (!countElement || !nameElement) {
        console.error('Top category stat elements not found in HTML.');
        return;
    }

    try {
        console.log('Fetching top category data...');
        const response = await api.get('/category/top');
        console.log('Top category response:', response.data);

        if (response.data.code === '200' && response.data.data) {
            const topCategory = response.data.data;
            if (topCategory.categoryName && typeof topCategory.songCount !== 'undefined') {
                 // Check if the data is the "not found" message from the controller
                 if (typeof topCategory === 'string' && topCategory === "No category data found.") {
                    console.log('No top category data returned from API.');
                    countElement.textContent = 'N/A';
                    nameElement.textContent = 'No data';
                 } else {
                    countElement.textContent = topCategory.songCount;
                    nameElement.textContent = `Top: ${escapeHTML(topCategory.categoryName)}`;
                 }
            } else {
                 // Handle cases where data object is present but lacks expected fields
                console.warn('Top category data received but incomplete:', topCategory);
                countElement.textContent = 'N/A';
                nameElement.textContent = 'No data';
            }
        } else if (response.data.code === '200' && response.data.msg === "No category data found.") {
             // Handle specific success message indicating no data
             console.log('No top category data found (via message).');
             countElement.textContent = 'N/A';
             nameElement.textContent = 'No data';
        } else {
            // Handle other non-200 codes or errors messages
            console.error('Failed to fetch top category:', response.data.msg || 'Unknown error');
            countElement.textContent = 'Error';
            nameElement.textContent = 'Load Failed';
        }
    } catch (error) {
        console.error('Error fetching top category statistics:', error);
        countElement.textContent = 'Error';
        nameElement.textContent = 'Load Failed';
    }
}

/**
 * Set up event listeners
 */
function setupEventListeners() {
    // Manage category songs event - redirect to dedicated management page
    document.addEventListener('click', function(e) {
        if (e.target.closest('.manage-category-songs')) {
            e.preventDefault();
            const button = e.target.closest('.manage-category-songs');
            const categoryId = button.getAttribute('data-id');
            const categoryName = button.getAttribute('data-name');
            
            if (categoryId && categoryName) {
                // Redirect to new category-songs.html page, passing category ID and name as parameters
                window.location.href = `category-songs.html?id=${categoryId}&name=${encodeURIComponent(categoryName)}`;
            } else {
                showMessage('Error getting category details.', 'danger');
            }
        }
    });
    
    // Search categories (targets main category table)
    const searchInput = document.querySelector('input[placeholder="Search available categories..."]');
    if (searchInput) {
        searchInput.addEventListener('keyup', function(e) {
            if (e.key === 'Enter') {
                filterCategories(this.value.trim().toLowerCase());
            }
        });
        const searchButton = searchInput.parentElement.querySelector('button'); // Adjusted selector
        if (searchButton) {
            searchButton.addEventListener('click', function() {
                filterCategories(searchInput.value.trim().toLowerCase());
            });
        }
    }
    
    // Event delegation: handle click on save button in song list below
    document.addEventListener('click', async function(e) {
        if (e.target.classList.contains('save-song-categories-btn')) {
            e.preventDefault();
            const songId = e.target.getAttribute('data-song-id');
            const selectElement = document.getElementById(`song-category-select-${songId}`);
            
            if (songId && selectElement) {
                const selectedCategoryIds = $(selectElement).val() || []; 
                await updateSongCategories(songId, selectedCategoryIds);
            }
        }
    });
}

/**
 * Load and display user songs in specified category
 * Note: This function is now deprecated as we redirect to a dedicated page for management
 * Kept for backward compatibility
 */
async function loadAndDisplaySongsForCategory(userId, categoryId, categoryName) {
    // Redirect to new page
    window.location.href = `category-songs.html?id=${categoryId}&name=${encodeURIComponent(categoryName)}`;
}

/**
 * Render songs list in bottom area for editing
 */
function renderSongsForEditing(songs, containerElement) {
    if (!songs || songs.length === 0) {
        containerElement.innerHTML = '<p class="text-center text-muted">You have no songs in this category.</p>';
        return;
    }
    
    let html = ''; 
    songs.forEach(song => {
        // Note: categoryIds must be returned by the backend API for this song
        const currentCategoryIds = song.categoryIds || []; 
        
        html += `
            <div class="song-edit-item d-flex justify-content-between align-items-center">
                <div class="flex-grow-1 mr-3">
                    <h6 class="mb-1">${escapeHTML(song.name)}</h6>
                    <small class="text-muted">Singer ID: ${song.singerId || 'N/A'}</small>
                </div>
                <div class="w-50 d-flex align-items-center">
                    <select class="form-control select2-edit-categories mr-2" 
                            id="song-category-select-${song.id}" 
                            multiple="multiple" 
                            style="width: 100%;">
                        <!-- Options populated by populateCategoryOptions -->
                    </select>
                    <button class="btn btn-sm btn-primary save-song-categories-btn" data-song-id="${song.id}">
                       <i data-feather="save" style="width: 1em; height: 1em;"></i>
                    </button>
                </div>
            </div>
        `;
    });
    
    containerElement.innerHTML = html;

    // Initialize Select2 for each song's dropdown
    songs.forEach(song => {
        const selectElement = document.getElementById(`song-category-select-${song.id}`);
        if (selectElement) {
            populateCategoryOptions(selectElement, song.categoryIds || []); 
            
             if (typeof $.fn.select2 !== 'undefined') {
                $(selectElement).select2({
                    placeholder: "Select categories",
                    width: '100%', 
                    theme: 'bootstrap-5', // Apply Bootstrap theme
                    dropdownParent: $(containerElement) // Attach dropdown relative to container
                });
            } else {
                 console.warn("Select2 is not loaded");
            }
        }
    });

    // Re-initialize Feather Icons for the save buttons
     if (window.feather) {
        feather.replace();
    }
}


/**
 * Populate category options for dropdown (Used by renderSongsForEditing)
 */
function populateCategoryOptions(selectElement, selectedIds = []) {
    selectElement.innerHTML = ''; // Clear existing options
    
    allAvailableCategories.forEach(category => {
        const option = document.createElement('option');
        option.value = category.id;
        option.textContent = escapeHTML(category.name);
        if (selectedIds.includes(parseInt(category.id))) { // Ensure comparison is correct type
            option.selected = true;
        }
        selectElement.appendChild(option);
    });
}

/**
 * Update song categories (Remains the same)
 */
async function updateSongCategories(songId, categoryIds) {
    // Convert IDs to numbers just in case they came from Select2 as strings
    const numericCategoryIds = categoryIds.map(id => parseInt(id)).filter(id => !isNaN(id));
    
    try {
        const response = await api.put('/song/updateCategories', { 
            songId: parseInt(songId), // Ensure songId is a number
            categoryIds: numericCategoryIds 
        });
        
        if (response.data.code === '200') {
            showMessage('Song categories updated successfully!', 'success');
            // Optional: Maybe add a visual cue like a checkmark next to the save button briefly
        } else {
            throw new Error(response.data.msg || 'Failed to update categories');
        }
    } catch (error) {
        console.error('Error updating song categories:', error);
        showMessage(`Error updating categories: ${error.message}`, 'danger');
    }
}

/**
 * Filter main category list
 */
function filterCategories(searchTerm) {
    const rows = document.querySelectorAll('#category-table tbody tr'); // Target main table
    
    rows.forEach(row => {
        // Check if it's the 'loading' or 'no results' row
        if (row.querySelector('td[colspan]')) {
             row.style.display = 'none'; // Hide placeholder rows during search
             return; 
        }
        
        const categoryName = row.querySelector('td:first-child')?.textContent.toLowerCase() || '';
        const description = row.querySelector('td:nth-child(2)')?.textContent.toLowerCase() || '';
        
        if (categoryName.includes(searchTerm) || description.includes(searchTerm)) {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
    });
}

/**
 * HTML escape function
 */
function escapeHTML(str) {
    if (!str) return '';
    return str.replace(/[&<>"']/g, 
        tag => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        }[tag] || tag)
    );
}

/**
 * Show message notification
 */
function showMessage(message, type) {
    // Check if message container already exists
    let messageContainer = document.querySelector('.message-container');
    if (!messageContainer) {
        messageContainer = document.createElement('div');
        messageContainer.className = 'message-container position-fixed top-0 end-0 p-3';
        messageContainer.style.zIndex = '9999';
        messageContainer.style.top = '1rem';
        messageContainer.style.right = '1rem';
        document.body.appendChild(messageContainer);
    }
    
    // Create message element
    const messageElement = document.createElement('div');
    messageElement.className = `alert alert-${type} alert-dismissible fade show`;
    messageElement.setAttribute('role', 'alert');
    messageElement.innerHTML = `
        ${message}
        <button type="button" class="close" data-dismiss="alert" aria-label="Close">
            <span aria-hidden="true">&times;</span>
        </button>
    `;
    
    // Add to container
    messageContainer.appendChild(messageElement);
    
    // Auto close
    setTimeout(() => {
        $(messageElement).alert('close');
    }, 5000);
} 
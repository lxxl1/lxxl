/**
 * Songs Management JavaScript
 * Handles all the song-related functionality including:
 * - Displaying all songs in a data table
 * - Adding new songs
 * - Editing song details
 * - Updating song files (audio, MV, cover image)
 * - Deleting songs
 * - Previewing songs
 * - Filtering and searching
 */

// Import config and API
import { API_URL } from '../../../Common/js/config.js';
import api from '../../../Common/js/api.js';

// Utility function to escape HTML
function escapeHTML(str) {
    if (!str) return '';
    return str.replace(/[&<>"'/]/g, function (s) {
        const entityMap = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;',
            '/': '&#x2F;'
        };
        return entityMap[s];
    });
}

// Global variables
let songsTable;
let currentSongId = null;
const API_BASE_URL = '/song';  // Base URL for all song APIs
let allSongsData = []; // Store all fetched songs for filtering
let allSingersData = []; // Store all singers for selection modals
let selectedAddSingers = new Map(); // Map to store selected singers for Add modal {id: name}
let allCategoriesData = []; // Store all categories for selection modal
let selectedAddCategories = new Map(); // Map to store selected categories for Add modal {id: name}

// Initialize after document is loaded
document.addEventListener('DOMContentLoaded', async () => {
    // Set current user ID (if needed for uploads)
    setCurrentUserId();
    
    // Initialize data table
    initializeDataTable();
    
    // Use Promise.all to wait for all essential data loading
    try {
        console.log("Starting initial data load...");
        const [songsLoaded, singersLoaded, categoriesLoaded] = await Promise.all([
            fetchAndDisplaySongs(true), // Fetch initial songs (pending)
            loadSingers(),              // Load all singers
            loadCategories()            // Load all categories
        ]);
        console.log(`Initial data load status: Songs=${songsLoaded}, Singers=${singersLoaded}, Categories=${categoriesLoaded}`);

        if (!singersLoaded) {
            showToast('Failed to load artists list. Singer selection might not work.', 'error');
        }
        if (!categoriesLoaded) {
            showToast('Failed to load categories list. Category selection might not work.', 'error');
        }

        // Setup event listeners AFTER data attempts loading
        setupEventListeners();

        // Initial UI updates based on fetched data
        fetchAllSongsDataForStats(); // Update stats card

    } catch (error) {
        console.error('Critical initialization error:', error);
        showToast('Error loading essential page data. Please refresh.', 'error');
    }
    
    // Initialize image preview for Add modal
    initAddImageUploadPreview();

    // Trigger count update on load (for localStorage and initial stats)
    fetchAllSongsDataForStats(); // Fetch all songs data just for stats update
});

/**
 * Get user ID from localStorage and set it (if needed for uploads or other logic).
 * Note: Original function name had Chinese comment.
 */
function setCurrentUserId() {
    try {
        const userData = JSON.parse(localStorage.getItem('user')) || {};
        if (userData.id) {
            // Example: Set a hidden input field if it exists
            const userIdField = document.getElementById('userId'); // Assuming an element with id="userId"
            if (userIdField) {
                userIdField.value = userData.id;
                console.log('User ID set:', userData.id);
            }
        } else {
            console.warn('Could not get user ID from localStorage');
        }
    } catch (error) {
        console.error('Error setting user ID:', error);
    }
}

/**
 * Fetch all songs data specifically for updating statistics.
 * This avoids updating the table if only stats are needed.
 */
async function fetchAllSongsDataForStats() {
    console.log("Fetching all songs data for statistics update...");
    try {
        const response = await api.get(`${API_BASE_URL}/allSong`);
        if (response && response.data && (response.data.code === '200' || response.data.code === 200) && Array.isArray(response.data.data)) {
            allSongsData = response.data.data || []; // Store all data
            updateSongStatsUI(allSongsData); // Update stats UI
            // Also update localStorage for the main dashboard
            if (window.musicAdminApp && typeof window.musicAdminApp.fetchAndCountSongs === 'function') {
                // Call the global function which handles localStorage update
                window.musicAdminApp.fetchAndCountSongs(); 
            }
        } else {
            console.error('Failed to fetch songs for stats or unexpected data format:', response?.data);
            allSongsData = []; // Reset stored data on failure
            updateSongStatsUI([]); // Update UI with zeros
        }
    } catch (error) {
        console.error('Error fetching all songs data for stats:', error);
        allSongsData = []; // Reset stored data on failure
        updateSongStatsUI([]); // Update UI with zeros
        // musicAdminApp.handleApiError(error, 'fetchAllSongsDataForStats'); // Optionally show error
    }
}

/**
 * Fetch and display songs in the table based on filters or initial load.
 * @param {boolean} initialLoad - If true, fetches only pending songs by default.
 */
async function fetchAndDisplaySongs(initialLoad = false) {
    let url = `${API_BASE_URL}/allSong`; // Default to fetching all for filtering
    let fetchPendingDirectly = initialLoad; // Flag to fetch only pending initially
    
    const filters = getAppliedFilters();
    
    // If it's not initial load, and filters are applied, we still fetch all and filter client-side.
    // If it IS initial load, we fetch only pending directly for faster initial view.
    if (fetchPendingDirectly) {
        // This endpoint needs to exist in AdminController or be adapted.
        // Let's assume we filter client-side even on initial load for consistency for now.
        // url = '/admin/song/pending'; // Or fetch all and filter client-side
        console.log("Initial load, fetching all and filtering for pending...");
    } else {
        console.log("Fetching all songs to apply filters...");
    }

    try {
        $('#songsTable').addClass('loading');
        showToast('Loading songs...', 'info');
        const response = await api.get(url); // Fetch all songs
        
        let songs = [];
        if (response && response.data && (response.data.code === '200' || response.data.code === 200) && Array.isArray(response.data.data)) {
            allSongsData = response.data.data || []; // Update the global store of all songs
            songs = filterSongs(allSongsData, initialLoad ? { status: '0' } : filters); // Apply filters
            console.log(`Fetched ${allSongsData.length} total songs, displaying ${songs.length} after filtering.`);
        } else {
            console.error('Failed to load songs or unexpected data format:', response?.data);
            showToast('Failed to load songs data. Unexpected response format.', 'error');
            allSongsData = []; // Reset stored data
            songs = [];
        }

        updateSongsTable(songs); // Update table with filtered data
        updateSongStatsUI(allSongsData); // Update stats with ALL songs data

    } catch (error) {
        console.error('Error loading songs data:', error);
        showToast('Failed to connect to the server. Please check your network connection.', 'error');
        allSongsData = []; // Reset stored data
        updateSongsTable([]); // Clear table on error
        updateSongStatsUI([]); // Update stats with zeros
    } finally {
        $('#songsTable').removeClass('loading');
    }
}

/**
 * Gets the currently applied filter values.
 */
function getAppliedFilters() {
    const singerId = $('#singerFilter').val()?.trim();
    const userId = $('#userIdFilter').val()?.trim(); // Get User ID filter
    const songName = $('#nameFilter').val()?.trim();
    const status = $('#statusFilter').val(); // Status is number as string or empty
    // const sortBy = $('#sortByPlays').val(); // Add back if needed

    return { singerId, userId, songName, status };
}

/**
 * Filters the song list based on the provided criteria.
 * @param {Array} songs - The array of all songs.
 * @param {object} filters - The filter criteria.
 * @returns {Array} - The filtered array of songs.
 */
function filterSongs(songs, filters) {
    if (!songs || songs.length === 0) return [];

    const { singerId, userId, songName, status } = filters;

    return songs.filter(song => {
        let match = true;
        
        // Filter by ONE selected singer ID (if singerId filter exists and is used)
        // Assumes DTO has singerIds list. Modify if filter should check multiple singers.
        if (singerId && (!song.singerIds || !song.singerIds.includes(parseInt(singerId)))) { 
            match = false;
        }
        
        if (userId && (!song.userId || song.userId.toString() !== userId)) { 
            match = false;
        }
        if (songName && !song.name?.toLowerCase().includes(songName.toLowerCase())) {
            match = false;
        }
        if (status !== '' && song.status?.toString() !== status) { 
            match = false;
        }
        return match;
    });
}

/**
 * Update the song statistics cards UI
 */
function updateSongStatsUI(songs) {
    // Ensure songs is an array
    if (!Array.isArray(songs)) {
        console.error("Cannot update stats UI, invalid songs data provided.");
        songs = []; // Default to empty array to avoid errors
    }

    const totalSongs = songs.length;
    const pendingSongs = songs.filter(song => song.status === 0).length;
    const approvedSongs = songs.filter(song => song.status === 1).length;
    const rejectedSongs = songs.filter(song => song.status === 2).length;
    
    // Find the elements for the stats cards
    const totalElement = document.getElementById('songsTotalCount');
    const pendingElement = document.getElementById('songsPendingCount');
    const approvedElement = document.getElementById('songsApprovedCount'); // Get new element
    const rejectedElement = document.getElementById('songsRejectedCount'); // Get new element
    
    if (totalElement) totalElement.textContent = totalSongs;
    if (pendingElement) pendingElement.textContent = pendingSongs;
    if (approvedElement) approvedElement.textContent = approvedSongs;
    if (rejectedElement) rejectedElement.textContent = rejectedSongs;
    
    console.log(`Updated song stats UI: Total=${totalSongs}, Pending=${pendingSongs}, Approved=${approvedSongs}, Rejected=${rejectedSongs}`);
}

/**
 * Update the DataTable with song data
 */
function updateSongsTable(songs) {
    if (songsTable) {
        songsTable.clear();
        if (Array.isArray(songs)) {
            songsTable.rows.add(songs);
        } else {
            console.error('Songs data is not an array:', songs);
            showToast('Invalid song data format received from server', 'error');
        }
        songsTable.draw();
    } else {
        console.error('Songs table is not initialized.');
    }
}

/**
 * Initialize DataTable to display song data
 */
function initializeDataTable() {
    // Check if jQuery and DataTable are loaded before initializing
    if (typeof jQuery === 'undefined') {
        console.error('jQuery is not loaded, cannot initialize DataTable');
        return;
    }

    if (typeof jQuery.fn.DataTable === 'undefined') {
        console.error('DataTable plugin is not loaded, cannot initialize table');
        return;
    }

    const $ = jQuery;

    songsTable = $('#songsTable').DataTable({
        processing: true,
        serverSide: false,
        data: [], // Initialize with empty data, we'll load it separately
        columns: [
            { data: 'id' },
            { data: 'name' },
            {
                title: "Singer(s)",
                data: "singerNames", // Use singerNames from DTO
                render: function(data, type, row) {
                    // Data is now the comma-separated string or null
                    const names = data || 'Unknown Artist';
                    // If you want links, you'd need singerIds and make separate calls or adjust DTO further
                    return `<span title="${names}">${names}</span>`; // Simple display for now
                }
             },
            {
                title: "Plays", // Changed from "Play Count"
                data: "nums", // Use nums field
                render: function(data, type, row) {
                    return data || 0;
                }
            },
            { 
                data: 'pic',
                render: function(data) {
                    // Use a default image if pic is missing
                    const defaultPic = 'assets/images/default-song-cover.png'; // Ensure this default exists
                    return `<img src="${data || defaultPic}" alt="Cover" class="img-thumbnail" style="width: 50px;">`;
                }
            },
            { 
                data: 'introduction',
                render: function(data) {
                    return data && data.length > 30 ? data.substring(0, 30) + '...' : (data || '-');
                }
            },
            { 
                data: 'status', // Add rendering for Status column
                render: function(data) {
                    let statusText, badgeClass, icon;
                    switch (parseInt(data)) {
                        case 0:
                            statusText = 'Pending';
                            badgeClass = 'bg-warning text-dark';
                            icon = 'hourglass-half';
                            break;
                        case 1:
                            statusText = 'Approved';
                            badgeClass = 'bg-success';
                            icon = 'check-circle';
                            break;
                        case 2:
                            statusText = 'Rejected';
                            badgeClass = 'bg-danger';
                            icon = 'times-circle';
                            break;
                        default:
                            statusText = 'Unknown';
                            badgeClass = 'bg-secondary';
                            icon = 'question-circle';
                    }
                    return `<span class="badge ${badgeClass}"><i class="fas fa-${icon} me-1"></i>${statusText}</span>`;
                },
                className: 'text-center'
            },
            {
                data: null,
                orderable: false,
                render: function(data, type, row) {
                    // Pass necessary data directly to the preview button
                    const songUrl = row.url || '';
                    const songName = row.name || 'Unknown Song';
                    const singerId = row.singerId || 'N/A'; // Or fetch singer name if needed elsewhere
                    const coverPic = row.pic || '';
                    const intro = row.introduction || '';
                    const mvUrl = row.mvurl || '';
                    const lyric = row.lyric || '';

                    // Disable preview if URL is missing
                    const disabled = songUrl ? '' : 'disabled';
                    const title = songUrl ? 'Preview Song' : 'Preview unavailable (No URL)';
                    
                    return `<button class="btn btn-sm btn-info preview-btn" 
                                data-id="${row.id}" 
                                data-url="${songUrl}" 
                                data-name="${songName}"
                                data-singerid="${singerId}"
                                data-pic="${coverPic}"
                                data-introduction="${intro}"
                                data-mvurl="${mvUrl}"
                                data-lyric="${lyric}"
                                title="${title}" ${disabled}>
                                <i class="fas fa-play me-1"></i>Preview
                            </button>`;
                }
            },
            {
                data: null,
                 orderable: false,
                render: function(data, type, row) {
                    // Conditional Action Buttons based on status
                    if (row.status === 0) { // Pending Review
                        return `
                            <div class="btn-group" role="group">
                                <button class="btn btn-sm btn-success approve-btn" data-id="${row.id}" title="Approve Song">
                                    <i class="fas fa-check me-1"></i> Approve
                                </button>
                                <button class="btn btn-sm btn-danger reject-btn" data-id="${row.id}" title="Reject Song">
                                    <i class="fas fa-times me-1"></i> Reject
                                </button>
                            </div>
                        `;
                    } else { // Approved or Rejected - Show standard buttons
                        return `
                            <div class="btn-group" role="group">
                                <button class="btn btn-sm btn-primary edit-btn" data-id="${row.id}" title="Edit Song"><i class="fas fa-edit me-1"></i></button>
                                <button class="btn btn-sm btn-warning update-files-btn" data-id="${row.id}" title="Update Files"><i class="fas fa-file-upload me-1"></i></button>
                                <button class="btn btn-sm btn-danger delete-btn" data-id="${row.id}" data-name="${row.name}" title="Delete Song"><i class="fas fa-trash me-1"></i></button>
                            </div>
                        `;
                    }
                }
            }
        ],
        responsive: true,
        order: [[0, 'desc']],
        language: {
            search: "Search:",
            lengthMenu: "Show _MENU_ entries",
            zeroRecords: "No matching records found",
            info: "Showing _START_ to _END_ of _TOTAL_ entries",
            infoEmpty: "Showing 0 to 0 of 0 entries",
            infoFiltered: "(filtered from _MAX_ total entries)",
            paginate: {
                first: "First",
                last: "Last",
                next: "Next",
                previous: "Previous"
            },
            processing: "Processing..." // Added processing message
        }
    });
}

/**
 * Set up all event listeners for the page
 */
function setupEventListeners() {
    // Add Song form submission
    const submitAddSongBtn = document.getElementById('submitAddSong');
    if(submitAddSongBtn) submitAddSongBtn.addEventListener('click', handleAddSong);
    
    // Edit Song form submission
    const submitEditSongBtn = document.getElementById('submitEditSong');
     if(submitEditSongBtn) submitEditSongBtn.addEventListener('click', handleEditSong);
    
    // Update Song file
    const submitUpdateSongBtn = document.getElementById('submitUpdateSong');
    if(submitUpdateSongBtn) submitUpdateSongBtn.addEventListener('click', () => handleUpdateFile('song'));
    
    // Update MV file
    const submitUpdateMvBtn = document.getElementById('submitUpdateMV');
    if(submitUpdateMvBtn) submitUpdateMvBtn.addEventListener('click', () => handleUpdateFile('mv'));
    
    // Update Cover Image
    const submitUpdatePicBtn = document.getElementById('submitUpdatePic');
    if(submitUpdatePicBtn) submitUpdatePicBtn.addEventListener('click', () => handleUpdateFile('pic'));

    // Delete song confirmation
    const confirmDeleteBtn = document.getElementById('confirmDelete');
    if(confirmDeleteBtn) confirmDeleteBtn.addEventListener('click', handleDeleteSong);

    // DataTable event delegation for buttons
    const songsTableBody = document.querySelector('#songsTable tbody');
    if(songsTableBody) {
        songsTableBody.addEventListener('click', function(event) {
            const target = event.target.closest('button');
            if (!target) return;

            const row = target.closest('tr');
            if (!row || !songsTable) return; // Check if songsTable is initialized

            const data = songsTable.row(row).data();
            if (!data) return;

            if (target.classList.contains('edit-btn')) {
                editSong(data.id);
            } else if (target.classList.contains('update-files-btn')) {
                showUpdateFilesModal(data.id);
            } else if (target.classList.contains('preview-btn')) {
                 if (data.url) {
                     previewSong(data); // Pass the whole data object
        } else {
            showToast("Preview is unavailable because the song URL is missing.", "warning");
        }
            } else if (target.classList.contains('delete-btn')) {
        showDeleteModal(data.id, data.name);
            } else if (target.classList.contains('approve-btn')) {
                handleAuditSong(data.id, 1); // 1 for Approved
            } else if (target.classList.contains('reject-btn')) {
                handleAuditSong(data.id, 2); // 2 for Rejected
            }
    });
    }
    
    // Apply filters button
    const applyFiltersBtn = document.getElementById('applyFilters');
    if(applyFiltersBtn) applyFiltersBtn.addEventListener('click', () => fetchAndDisplaySongs(false));
    
    // Clear filters button
    const clearFiltersBtn = document.getElementById('clearFilters');
    if(clearFiltersBtn) clearFiltersBtn.addEventListener('click', function() {
        const singerFilter = document.getElementById('singerFilter');
        const userIdFilter = document.getElementById('userIdFilter');
        const nameFilter = document.getElementById('nameFilter');
        const statusFilter = document.getElementById('statusFilter');
        if(singerFilter) singerFilter.value = '';
        if(userIdFilter) userIdFilter.value = '';
        if(nameFilter) nameFilter.value = '';
        if(statusFilter) statusFilter.value = '';
        fetchAndDisplaySongs(true);
    });
    
    // Global search button
    const globalSearchBtn = document.getElementById('globalSearchBtn');
    if(globalSearchBtn) globalSearchBtn.addEventListener('click', function() {
        const searchTerm = document.getElementById('globalSearch')?.value.trim();
        const nameFilter = document.getElementById('nameFilter');
        const singerFilter = document.getElementById('singerFilter');
        const userIdFilter = document.getElementById('userIdFilter');
        const statusFilter = document.getElementById('statusFilter');
        if(nameFilter) nameFilter.value = searchTerm || '';
        if(singerFilter) singerFilter.value = '';
        if(userIdFilter) userIdFilter.value = '';
        if(statusFilter) statusFilter.value = '';
        fetchAndDisplaySongs(false);
    });
    
    // Keyboard event for global search
    const globalSearchInput = document.getElementById('globalSearch');
    if(globalSearchInput) globalSearchInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') { // Use e.key for modern browsers
            if(globalSearchBtn) globalSearchBtn.click();
        }
    });

    // --- Add Song Modal Specific Listeners ---

    // --- Category Selection Listeners ---
    const addSelectCategoriesBtn = document.getElementById('addSelectCategoriesBtn');
    if (addSelectCategoriesBtn) {
        addSelectCategoriesBtn.addEventListener('click', function() {
            console.log("[Add Song] Select Categories button clicked (manual trigger)");
            // Populate the list first
            if (!allCategoriesData || allCategoriesData.length === 0) {
                console.warn("Category data not ready or empty.");
                const container = document.getElementById('addCategoryListContainer');
                if(container) container.innerHTML = '<p class="text-center text-danger">Category list is not loaded yet.</p>';
                // Do not show modal if data isn't ready
            } else {
                 populateAddCategoryModalList(allCategoriesData);
            }

            // Manually get the modal instance and show it
            const categoryModalElement = document.getElementById('addCategoryModal');
            if (categoryModalElement) {
                 const categoryModal = bootstrap.Modal.getOrCreateInstance(categoryModalElement);
                 categoryModal.show();
                 console.log("[Add Song] Manually showing category modal.");
            } else {
                console.error("Category modal element #addCategoryModal not found!");
            }
        });
    } else { console.error("Button #addSelectCategoriesBtn not found"); }

    const addCategorySearchInput = document.getElementById('addCategorySearchInput');
    if (addCategorySearchInput) {
        addCategorySearchInput.addEventListener('input', function() {
            const searchText = this.value.toLowerCase();
            const filteredCategories = allCategoriesData.filter(cat => cat && cat.name && cat.name.toLowerCase().includes(searchText));
            populateAddCategoryModalList(filteredCategories);
        });
    } else { console.error("Input #addCategorySearchInput not found"); }

    const confirmAddCategoryBtn = document.getElementById('confirmAddCategorySelection');
    if (confirmAddCategoryBtn) {
        confirmAddCategoryBtn.addEventListener('click', function(event) {
            event.stopPropagation();
            console.log("[Add Song] Confirm category selection button clicked");
            const checkedBoxes = document.querySelectorAll('#addCategoryListContainer input.add-category-checkbox:checked');
            selectedAddCategories.clear();

            checkedBoxes.forEach(checkbox => {
                const id = checkbox.value;
                const category = allCategoriesData.find(c => String(c.id) === id);
                selectedAddCategories.set(id, category ? category.name : `ID ${id}`);
            });
            console.log("[Add Song] Selected categories Map:", selectedAddCategories);

            updateAddSelectedCategoriesDisplay();

            const addCategoryModalEl = document.getElementById('addCategoryModal');
            const modalInstance = bootstrap.Modal.getInstance(addCategoryModalEl);
            modalInstance?.hide();
        });
    } else { console.error("Button #confirmAddCategorySelection not found"); }
    // --- End Category Selection Listeners ---

    // --- Singer Selection Listeners ---
    const addSelectSingersBtn = document.getElementById('addSelectSingersBtn');
    if (addSelectSingersBtn) {
        addSelectSingersBtn.addEventListener('click', function() {
            console.log("[Add Song] Select Singers button clicked");
            // Populate the list first
            if (!allSingersData || allSingersData.length === 0) {
                console.warn("Singer data not ready or empty.");
                const container = document.getElementById('addSingerListContainer');
                if(container) container.innerHTML = '<p class="text-center text-danger">Artist list is not loaded yet.</p>';
                // Do not show modal if data isn't ready
            } else {
                populateAddSingerModalList(allSingersData);
            }

            // Manually get the modal instance and show it
            const singerModalElement = document.getElementById('addSingerModal');
            if (singerModalElement) {
                const singerModal = bootstrap.Modal.getOrCreateInstance(singerModalElement);
                singerModal.show();
                console.log("[Add Song] Manually showing singer modal.");
            } else {
                console.error("Singer modal element #addSingerModal not found!");
            }
        });
    } else { console.error("Button #addSelectSingersBtn not found"); }

    const addSingerSearchInput = document.getElementById('addSingerSearchInput');
    if (addSingerSearchInput) {
        addSingerSearchInput.addEventListener('input', function() {
            const searchText = this.value.toLowerCase();
            const filteredSingers = allSingersData.filter(singer => singer && singer.name && singer.name.toLowerCase().includes(searchText));
            populateAddSingerModalList(filteredSingers);
        });
    } else { console.error("Input #addSingerSearchInput not found"); }

    const confirmAddSingerBtn = document.getElementById('confirmAddSingerSelection');
    if (confirmAddSingerBtn) {
        confirmAddSingerBtn.addEventListener('click', function(event) {
            event.stopPropagation();
            console.log("[Add Song] Confirm singer selection");
            const checkedBoxes = document.querySelectorAll('#addSingerListContainer input.add-singer-checkbox:checked');
            selectedAddSingers.clear();
            checkedBoxes.forEach(checkbox => {
                const id = checkbox.value;
                const singer = allSingersData.find(s => String(s.id) === id);
                selectedAddSingers.set(id, singer ? singer.name : `ID ${id}`);
            });
            console.log("[Add Song] Selected singers Map:", selectedAddSingers);

            updateAddSelectedSingersDisplay();

            const addSingerModalEl = document.getElementById('addSingerModal');
            const modalInstance = bootstrap.Modal.getInstance(addSingerModalEl);
            modalInstance?.hide();
        });
    } else { console.error("Button #confirmAddSingerSelection not found"); }
    // --- End Singer Selection Listeners ---

    // Reset Add Song selections when the main Add Song modal is hidden
    // This listener should only be defined ONCE
    const addSongModalElement = document.getElementById('addSongModal');
    if (addSongModalElement && !addSongModalElement.dataset.listenerAttached) {
        addSongModalElement.addEventListener('hidden.bs.modal', function () {
            console.log("Add Song modal hidden, resetting form and selections.");
            resetAddImagePreview();
            const addForm = document.getElementById('addSongForm');
            if (addForm) {
                 addForm.reset();
                 addForm.classList.remove('was-validated');
            }
            selectedAddSingers.clear();
            updateAddSelectedSingersDisplay();
            selectedAddCategories.clear();
            updateAddSelectedCategoriesDisplay();
        });
        addSongModalElement.dataset.listenerAttached = 'true'; // Mark as attached
    }
    // --- End Add Song Modal Specific Listeners ---

}

/**
 * Handle Add Song form submission
 */
async function handleAddSong() {
    const form = document.getElementById('addSongForm');
    const submitButton = document.getElementById('submitAddSong');
    const progressBar = document.getElementById('uploadProgress');
    const progressDiv = progressBar ? progressBar.querySelector('.progress-bar') : null;

    // --- Validation ---
    const name = document.getElementById('name').value.trim();
    const introduction = document.getElementById('introduction').value.trim();
    const fileInput = document.getElementById('file');
    const selectedCategoryIdsValue = document.getElementById('addSelectedCategoryIds').value;
    const selectedSingerIdsValue = document.getElementById('addSelectedSingerIds').value;

    if (!name) {
        showToast('Please enter a Song Name.', 'warning'); return;
    }
    if (!selectedCategoryIdsValue) {
        showToast('Please select at least one Category.', 'warning'); return;
    }
    if (!selectedSingerIdsValue) {
        showToast('Please select at least one Artist.', 'warning'); return;
    }
    if (!introduction) {
        showToast('Please enter an Introduction.', 'warning'); return;
    }
    if (!fileInput || !fileInput.files[0]) {
        showToast('Please select a Song File.', 'warning'); return;
    }
    const imageInput = document.getElementById('addImageFileInput');
    if (imageInput && imageInput.files[0] && imageInput.files[0].size > 5 * 1024 * 1024) {
         showToast('Image file is too large (Max 5MB).', 'danger'); return;
    }
    // --- End Validation ---

    const formData = new FormData();

    formData.append('name', name);
    formData.append('introduction', introduction);
    formData.append('userId', '0');
    formData.append('file', fileInput.files[0]);
    formData.append('singerIds', selectedSingerIdsValue);
    formData.append('categoryIds', selectedCategoryIdsValue);

    const lyric = document.getElementById('lyric').value.trim();
    if (lyric) {
        formData.append('lyric', lyric);
    }
    if (imageInput && imageInput.files[0]) {
        formData.append('imageFile', imageInput.files[0]);
    }

    submitButton.disabled = true;
    submitButton.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Uploading...';
    if(progressBar) progressBar.style.display = 'block';
    if(progressDiv) {
    progressDiv.style.width = '0%';
    progressDiv.textContent = '0%';
    }

    console.log("Submitting add song request...");

    try {
        const response = await api.post(`${API_BASE_URL}/add`, formData, {
            headers: { /* Axios handles FormData header */ },
            onUploadProgress: (progressEvent) => {
                if (progressDiv && progressEvent.total) {
                const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                progressDiv.style.width = percentCompleted + '%';
                progressDiv.textContent = percentCompleted + '%';
                }
            }
        });

        if (response.data && (response.data.code === '200' || response.data.code === 200)) {
            showToast('Song added successfully!', 'success');
            const addModalEl = document.getElementById('addSongModal');
            if (addModalEl) {
                const addModal = bootstrap.Modal.getInstance(addModalEl);
                if (addModal) addModal.hide();
            }
            fetchAndDisplaySongs(true);
            fetchAllSongsDataForStats();
        } else {
            console.error('Add song failed:', response.data);
            showToast(`Failed to add song: ${response.data?.msg || 'Server error'}`, 'error');
        }
    } catch (error) {
        console.error('Error adding song:', error);
        const errorMsg = error.response?.data?.msg || error.message || 'An unknown network error occurred.';
        showToast(`Error adding song: ${errorMsg}`, 'error');
    } finally {
        submitButton.disabled = false;
        submitButton.innerHTML = 'Upload';
       if(progressBar) progressBar.style.display = 'none';
    }
}

/**
 * Load song data for editing
 */
async function loadSongForEdit(songId) {
    currentSongId = songId;
    try {
        // Fetch SongDetailDTO
        const response = await api.get(`${API_BASE_URL}/detail`, { params: { songId } });
        if (response.data && (response.data.code === '200' || response.data.code === 200) && response.data.data) {
            const song = response.data.data; // This is SongDetailDTO
            
            // Populate basic fields
            $('#editSongId').val(song.id);
            $('#editName').val(song.name);
            $('#editIntroduction').val(song.introduction);
            $('#editLyric').val(song.lyric);
            
            // Set MULTIPLE selected singers
            const editSingersSelect = $('#editSingers');
            if (song.singerIds && song.singerIds.length > 0) {
                editSingersSelect.val(song.singerIds);
            } else {
                editSingersSelect.val([]);
            }
            // Refresh multi-select plugin if used (e.g., Select2)
            // editSingersSelect.trigger('change'); 
            
            // Set MULTIPLE selected categories
            const editCategorySelect = $('#editCategory');
             if (song.categoryIds && song.categoryIds.length > 0) {
                 editCategorySelect.val(song.categoryIds);
             } else {
                  editCategorySelect.val([]);
             }
             // Refresh multi-select plugin if needed
             // editCategorySelect.trigger('change');

            $('#editSongModal').modal('show');
        } else {
            showToast(response.data?.message || 'Could not load song details for editing.', 'error');
        }
    } catch (error) {
        console.error(`Error loading song ${songId} for edit:`, error);
        showToast('Error loading song details. ' + (error.response?.data?.message || error.message), 'error');
    }
}

/**
 * Handle edit song form submission
 */
function handleEditSong() {
    const form = $('#editSongForm')[0];
    if (!validateSongForm(form)) { return; } 
    
    const songId = $('#editSongId').val();
    if (!songId) {
        showToast('Cannot save changes, song ID is missing.', 'error');
        return;
    }

    // Construct data object directly from form values
    const songData = {
        id: songId,
        name: $('#editName').val(),
        introduction: $('#editIntroduction').val(),
        lyric: $('#editLyric').val(),
        singerIds: $('#editSingers').val()?.join(',') || '', // Matches HTML name='singerIds'
        categoryIds: $('#editCategory').val()?.join(',') || '' // Matches HTML name='categoryIds'
    };
    
    // Include tag IDs if tag input exists
    const tagInput = document.getElementById('editTags'); // Assuming ID is editTags
    if (tagInput && tagInput.value) {
        songData.tagIds = tagInput.value; // Assuming tag input handles comma-separated IDs
    }
    
    console.log("Data being sent for update:", songData);

    showToast('Saving changes...', 'info');
    // Use the correct update endpoint and method (POST)
    api.post(`${API_BASE_URL}/update`, new URLSearchParams(songData).toString(), { // Send as form data
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    })
    .then(response => {
        if (response.data && (response.data.code === '200' || response.data.code === 200)) {
            showToast('Song updated successfully!', 'success');
            $('#editSongModal').modal('hide');
            fetchAndDisplaySongs(); // Refresh table
        } else {
            showToast(response.data?.message || 'Failed to update song.', 'error');
        }
    })
    .catch(error => {
        console.error('Error updating song:', error);
        showToast('Error updating song. ' + (error.response?.data?.message || error.message), 'error');
    });
}

/**
 * Handle file updates (song, MV, cover)
 */
function handleUpdateFile(fileType) {
    const songId = $('#updateSongId').val();
    
    if (!songId) {
        showToast("Invalid song ID", "error");
        return;
    }
    
    let fileInput, url;
    
    switch (fileType) {
        case 'song':
            fileInput = document.getElementById('updateSongFile');
            url = `${API_BASE_URL}/updateSongUrl`;
            break;
        case 'mv':
            fileInput = document.getElementById('updateMVFile');
            url = `${API_BASE_URL}/updateMVUrl`;
            break;
        case 'pic':
            fileInput = document.getElementById('updatePicFile');
            url = `${API_BASE_URL}/updateSongPic`;
            break;
        default:
            return;
    }
    
    if (!fileInput.files || fileInput.files.length === 0) {
        showToast("Please select a file to upload", "warning");
        return;
    }
    
    const formData = new FormData();
    formData.append('id', songId);
    formData.append('file', fileInput.files[0]);
    
    // Show progress bar
    const progressBar = $('#updateProgress');
    const progressIndicator = progressBar.find('.progress-bar');
    progressBar.show();
    progressIndicator.width('0%');
    
    // Disable submit button
    const buttonId = `#submitUpdate${fileType.charAt(0).toUpperCase() + fileType.slice(1)}`;
    $(buttonId).prop('disabled', true);
    
    // Use fetch API for upload to display upload progress
    const xhr = new XMLHttpRequest();
    xhr.open('POST', url, true);
    
    // Add progress event listener
    xhr.upload.onprogress = function(event) {
        if (event.lengthComputable) {
            const percentCompleted = Math.round((event.loaded * 100) / event.total);
            progressIndicator.width(percentCompleted + '%');
            progressIndicator.text(percentCompleted + '%');
        }
    };
    
    xhr.onload = function() {
        $(buttonId).prop('disabled', false);
        progressBar.hide();
        
        if (xhr.status === 200) {
            try {
                const response = JSON.parse(xhr.responseText);
                if (response.code === '200' || response.code === 200) {
                    showToast("File updated successfully!", "success");
                    
                    // Clear file input
                    fileInput.value = '';
                    
                    // Reload song list
                    fetchAndDisplaySongs(true);
                } else if (response.code === 1) {
                    showToast("File updated successfully! (Legacy code)", "success");
                    
                    // Clear file input
                    fileInput.value = '';
                    
                    // Reload song list
                    fetchAndDisplaySongs(true);
                } else {
                    showToast(response.msg || "Failed to update file", "error");
                }
            } catch (e) {
                console.error('Failed to parse file update response:', e);
                showToast("File update failed, server returned an invalid response", "error");
            }
        } else {
            console.error('File update failed:', xhr.status, xhr.statusText);
            showToast("File update failed, server returned an error status", "error");
        }
    };
    
    xhr.onerror = function() {
        console.error('File update request failed');
        $(buttonId).prop('disabled', false);
        progressBar.hide();
        
        showToast("File update request failed, please check your network connection", "error");
    };
    
    // Send request
    xhr.send(formData);
}

/**
 * Preview song using data passed from the button
 */
function previewSong(songData) {
    // Assume songData is now a SongDTO
    // Increment play count (optional)
    api.get(`${API_BASE_URL}/addNums?songId=${songData.id}`)
       .catch(error => console.error("Failed to increment play count:", error));

    // Populate the preview modal
    $('#previewTitle').text(songData.name || 'Song Preview');
    // Display singer names
    $('#previewSinger').text(`Artist(s): ${songData.singerNames || 'N/A'}`); 
    $('#previewIntro').text(songData.introduction || 'No introduction available.');
    
    // Set cover image (use a default if pic is missing)
    const coverUrl = songData.pic ? songData.pic : 'assets/images/default-song-cover.png'; // Ensure this default exists
    $('#previewCover').attr('src', coverUrl).show();
    
    // Set audio source directly
    const audioPlayer = $('#previewAudio');
    if (songData.url) {
        audioPlayer.attr('src', songData.url);
        audioPlayer.show();
        // Optional: Auto-play or reset player state
        // audioPlayer[0].load(); 
        // audioPlayer[0].play(); 
    } else {
        audioPlayer.hide();
        audioPlayer.attr('src', ''); // Clear src if no URL
    }
    
    // Set MV source
    const videoPlayer = $('#previewVideo');
    const mvContainer = $('#previewMVContainer');
    if (songData.mvurl) {
        // Assuming direct URL, update if different structure needed
        videoPlayer.attr('src', songData.mvurl); 
        videoPlayer[0].load(); // Important to load new source
        mvContainer.show();
    } else {
        mvContainer.hide();
        videoPlayer.attr('src', ''); // Clear src
    }
    
    // Set lyrics
    const lyricsContainer = $('#previewLyricsContainer');
    if (songData.lyric) {
        $('#previewLyrics').text(songData.lyric); 
        lyricsContainer.show();
    } else {
        lyricsContainer.hide();
    }
    
    // Show the modal
    const previewModal = new bootstrap.Modal(document.getElementById('previewModal'));
    previewModal.show();

    // Stop audio/video when modal is closed to prevent background playback
    $('#previewModal').off('hidden.bs.modal').on('hidden.bs.modal', function () {
        audioPlayer[0]?.pause();
        videoPlayer[0]?.pause();
        // Optional: Reset player source or time
        // audioPlayer.attr('src', ''); 
        // videoPlayer.attr('src', '');
    });
}

/**
 * Handle song deletion
 */
function handleDeleteSong() {
    // Disable delete button
    $('#confirmDelete').prop('disabled', true);
    
    api.get(`${API_BASE_URL}/delete?id=${currentSongId}`)
        .then(response => {
            if (response.status === 200 && response.data && (response.data.code === '200' || response.data.code === 200)) {
                showToast('Song deleted successfully!', 'success');
                $('#deleteModal').modal('hide');
                fetchAndDisplaySongs(true);
            } else if (response.status === 200 && response.data === true) {
                showToast('Song deleted successfully! (Legacy response)', 'success');
                $('#deleteModal').modal('hide');
                fetchAndDisplaySongs(true);
            } else {
                showToast('Failed to delete song: ' + (response.data.msg || response.message || 'Unknown error'), 'error');
            }
        })
        .catch(error => {
            console.error('Error deleting song:', error);
            showToast('Error deleting song: ' + (error.message || 'Unknown error'), 'error');
        })
        .finally(() => {
            $('#confirmDelete').prop('disabled', false);
        });
}

/**
 * Handle song audit (Approve/Reject)
 */
async function handleAuditSong(songId, status) {
    const action = status === 1 ? 'Approve' : 'Reject';
    // Translate the confirmation message
    const confirmMessage = `Are you sure you want to ${action.toLowerCase()} this song (ID: ${songId})?`;
    
    if (!confirm(confirmMessage)) {
        return;
    }
    
    // Construct form data for POST request parameters
    const formData = new URLSearchParams();
    formData.append('songId', songId);
    formData.append('status', status);

    try {
        // CORRECTED: Use POST method and correct endpoint /song/audit
        // Send data as x-www-form-urlencoded
        const response = await api.post(`${API_BASE_URL}/audit`, formData.toString(), {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });

        // Check response code directly from backend Result object
        if (response.data && (response.data.code === '200' || response.data.code === 200)) {
            showToast(`Song ${action.toLowerCase()}d successfully!`, 'success');
            fetchAndDisplaySongs(true); // Reload the table to show updated status
        } else {
             const errorMsg = response.data?.msg || response.data?.message || `Server responded with code: ${response.data?.code}`;
             showToast(`Failed to ${action.toLowerCase()} song. ${errorMsg}`, 'error');
        }
    } catch (error) {
        console.error(`Error ${action.toLowerCase()}ing song:`, error);
        const errorMsg = error.response?.data?.msg || error.response?.data?.message || error.message || 'Unknown error';
        showToast(`Error ${action.toLowerCase()}ing song: ${errorMsg}`, 'error');
    }
}

/**
 * Show toast notification
 */
function showToast(message, type = 'info') {
    // Check if Toastify is available
    if (typeof Toastify === 'function') {
        let backgroundColor;
        let icon = 'info-circle';
        
        switch(type) {
            case 'success':
                backgroundColor = '#4caf50';
                icon = 'check-circle';
                break;
            case 'error':
                backgroundColor = '#f44336';
                icon = 'exclamation-circle';
                break;
            case 'warning':
                backgroundColor = '#ff9800';
                icon = 'exclamation-triangle';
                break;
            default:
                backgroundColor = '#2196f3';
        }
        
        Toastify({
            text: message,
            duration: 3000,
            close: true,
            gravity: 'top',
            position: 'right',
            backgroundColor: backgroundColor,
            stopOnFocus: true,
            onClick: function(){}
        }).showToast();
    } 
    // Fallback to alert if Toastify is not available
    else {
        console.log(`${type.toUpperCase()}: ${message}`);
        // Only show alert for errors to avoid too many popups
        if (type === 'error') {
            alert(message);
        }
    }
}

/**
 * Form validation (checks multi-selects)
 */
function validateSongForm(form) {
    const isAddForm = form.id === 'addSongForm';
    const songName = form.elements.name.value.trim();
    
    if (!songName) {
        showToast('Please enter a song name', 'warning');
        return false;
    }
    
    // Validate Singers (multi-select)
    const singerSelectId = isAddForm ? '#addSingers' : '#editSingers';
    const selectedSingers = $(singerSelectId).val();
    if (!selectedSingers || selectedSingers.length === 0) {
        showToast('Please select at least one artist', 'warning');
        return false;
    }
    
    // Validate Category
    if (isAddForm) {
        // Add Form: Single Category Select
        const categorySelect = document.getElementById('addCategory');
        if (!categorySelect || !categorySelect.value) {
            showToast('Please select a category', 'warning');
            return false;
        }
    } else {
        // Edit Form: Multiple Category Select
        const categorySelect = $('#editCategory');
        const selectedCategories = categorySelect.val();
        if (!selectedCategories || selectedCategories.length === 0) {
            showToast('Please select at least one category', 'warning');
            return false;
        }
    }
    
    // Validate file inputs only for the add form
    if (isAddForm) {
        const songFile = form.elements.file;
        
        if (!songFile || !songFile.files || songFile.files.length === 0) {
            showToast('Please select a song file', 'warning');
            return false;
        }
        
        // Optional: File size check
        if (songFile.files[0].size > 50 * 1024 * 1024) { // 50MB
            showToast('Song file size exceeds the 50MB limit.', 'warning');
            return false;
        }
        
        // Optional MV file check
        const mvFile = form.elements.files; // Assuming name is 'files' for MV
        if (mvFile && mvFile.files && mvFile.files.length > 0 && mvFile.files[0].size > 500 * 1024 * 1024) { // 500MB
            showToast('MV file size exceeds the 500MB limit.', 'warning');
            return false;
        }
    }
    
    return true;
}

// Edit song - Open edit modal and load data
function editSong(songId) {
    currentSongId = songId;
    
    // Clear form
    $('#editSongForm')[0].reset();
    
    // Load song data
    loadSongForEdit(songId);
}

// Show update files modal
function showUpdateFilesModal(songId) {
    currentSongId = songId;
    // Set hidden field value
    $('#updateSongId').val(songId);
    // Reset file input fields
    $('#updateSongFile').val('');
    $('#updateMVFile').val('');
    $('#updatePicFile').val('');
    // Hide progress bar
    $('#updateProgress').hide();
    // Show modal
    $('#updateFilesModal').modal('show');
}

// Show delete confirmation modal
function showDeleteModal(songId, songName) {
    currentSongId = songName;
    $('#deleteSongName').text(songName);
    $('#deleteModal').modal('show');
}

/**
 * Load all singers from API using async/await
 * @returns {Promise<boolean>} True if successful, false otherwise.
 */
async function loadSingers() {
    console.log("Attempting to load singers...");
    try {
        const response = await api.get('/singer/allSinger');
        if (response.data && (response.data.code === '200' || response.data.code === 200) && Array.isArray(response.data.data)) {
            allSingersData = response.data.data || [];
            console.log(`Successfully loaded ${allSingersData.length} singers globally.`);
            // Populate Edit modal and Filter dropdowns here if needed, AFTER data is confirmed
            populateSingerDropdowns(); // Call helper to populate relevant selects
            return true; // Indicate success
        } else {
            console.error("Failed to load singers or unexpected format:", response.data);
            showToast("Error loading artists list (server response).", "error");
            allSingersData = []; // Clear data on failure
            populateSingerDropdowns(); // Populate with empty/error state
            return false; // Indicate failure
        }
    } catch (error) {
        console.error('Network or other error fetching singers:', error);
        showToast("Could not fetch artists list (network error).", "error");
        allSingersData = []; // Clear data on failure
        populateSingerDropdowns(); // Populate with empty/error state
        return false; // Indicate failure
    }
}

/**
 * Helper function to populate singer dropdowns (Edit modal, Filter)
 */
function populateSingerDropdowns() {
    // Populate Edit modal dropdown
    const editSelect = document.getElementById('editSingers');
    if (editSelect) {
        editSelect.innerHTML = ''; // Clear existing
        if (allSingersData.length > 0) {
            allSingersData.forEach(singer => {
                const option = document.createElement('option');
                option.value = singer.id;
                option.textContent = escapeHTML(singer.name);
                editSelect.appendChild(option);
                    });
                } else {
            editSelect.innerHTML = '<option value="" disabled>No artists available</option>';
                }
            } else {
        console.warn("Edit singers dropdown (#editSingers) not found.");
    }

    // Populate filter dropdown (assuming single select)
    const filterSelect = document.getElementById('singerFilter');
    if (filterSelect) {
        filterSelect.innerHTML = '<option value="">All Artists</option>'; // Add default
        if (allSingersData.length > 0) {
            allSingersData.forEach(singer => {
                const option = document.createElement('option');
                option.value = singer.id;
                option.textContent = escapeHTML(singer.name);
                filterSelect.appendChild(option);
            });
        } else {
            // Optionally add disabled option
             filterSelect.innerHTML += '<option value="" disabled>No artists loaded</option>';
        }
    } else {
        console.warn("Singer filter dropdown (#singerFilter) not found.");
    }
    console.log("Finished populating singer dropdowns.");
}

/**
 * Load categories, store globally, and populate filter dropdown using async/await.
 * @returns {Promise<boolean>} True if successful, false otherwise.
 */
async function loadCategories() {
    console.log("Attempting to load categories...");
    const filterSelect = document.getElementById('categoryFilter');

    try {
        const response = await api.get('/category/selectAll');
        if (response.data.code === '200' || response.data.code === 200) {
            allCategoriesData = response.data.data || [];
            console.log(`Successfully loaded ${allCategoriesData.length} categories globally.`);

            // Populate filter dropdown (if it exists)
            if (filterSelect) {
                filterSelect.innerHTML = '<option value="">All Categories</option>';
                if (allCategoriesData.length > 0) {
                    allCategoriesData.forEach(category => {
                    const option = document.createElement('option');
                        option.value = category.id;
                        option.textContent = escapeHTML(category.name);
                        filterSelect.appendChild(option);
                    });
                    console.log("Populated category filter dropdown.");
            } else {
                    filterSelect.innerHTML = '<option value="" disabled>No categories found</option>';
            }
        } else {
                console.log("Category filter dropdown not found, skipping population.");
            }
            return true; // Indicate success
        } else {
            console.error('Failed to load categories:', response.data?.msg);
            allCategoriesData = [];
            if (filterSelect) filterSelect.innerHTML = '<option value="" disabled>Error loading</option>';
            showToast('Failed to load categories (server response).', 'error');
            return false; // Indicate failure
        }
    } catch (error) {
        console.error('Network or other error fetching categories:', error);
        allCategoriesData = [];
         if (filterSelect) filterSelect.innerHTML = '<option value="" disabled>Error loading</option>';
        showToast('Failed to load categories (network error).', 'error');
        return false; // Indicate failure
    }
}

/**
 * Populate the category list in the Add Category Modal
 */
function populateAddCategoryModalList(filteredCategories) {
    const container = document.getElementById('addCategoryListContainer');
    if (!container) {
        console.error('[populateAddCategoryModalList] Add category list container not found');
        return;
    }
    console.log('[populateAddCategoryModalList] Attempting to populate with:', filteredCategories);
    container.innerHTML = ''; // Clear previous content

    if (!filteredCategories || !Array.isArray(filteredCategories)) {
        console.warn('[populateAddCategoryModalList] Invalid or null filteredCategories data provided.');
        container.innerHTML = '<p class="text-center text-danger">Error: Could not load categories data.</p>';
        return;
    }
    if (filteredCategories.length === 0) {
        console.warn('[populateAddCategoryModalList] No categories found to display.');
        container.innerHTML = '<p class="text-center text-muted">No categories found.</p>';
        return;
    }

    const listGroup = document.createElement('ul');
    listGroup.className = 'list-group list-group-flush';

    filteredCategories.forEach((category) => {
        if (!category || typeof category.id === 'undefined' || typeof category.name === 'undefined') {
            console.warn(`[populateAddCategoryModalList] Skipping invalid category object:`, category);
            return;
        }
        const categoryIdStr = String(category.id);
        const isChecked = selectedAddCategories.has(categoryIdStr);
        const listItem = document.createElement('li');
        listItem.className = 'list-group-item';
        listItem.innerHTML = `
            <div class="form-check">
                <input class="form-check-input add-category-checkbox" type="checkbox" value="${categoryIdStr}" id="add-category-${categoryIdStr}" ${isChecked ? 'checked' : ''}>
                <label class="form-check-label w-100" for="add-category-${categoryIdStr}">
                    ${escapeHTML(category.name)}
                </label>
            </div>
        `;
        listGroup.appendChild(listItem);
    });
    container.appendChild(listGroup);
    console.log('[populateAddCategoryModalList] Finished populating add category list.');
}

/**
 * Update the display of selected categories in the Add Song Modal
 */
function updateAddSelectedCategoriesDisplay() {
    console.log('Updating add selected categories display');
    const container = document.getElementById('addSelectedCategoriesContainer');
    const hiddenInput = document.getElementById('addSelectedCategoryIds');

    if (!container || !hiddenInput) {
        console.error('Add selected categories container or hidden input not found');
        return;
    }

    container.innerHTML = '';
    if (selectedAddCategories.size === 0) {
        container.innerHTML = '<span class="text-muted small">No categories selected</span>';
    } else {
        selectedAddCategories.forEach((name, id) => {
            const pill = document.createElement('span');
            pill.className = 'badge bg-info text-dark me-1 mb-1';
            pill.textContent = escapeHTML(name);
            container.appendChild(pill);
        });
    }
    const ids = Array.from(selectedAddCategories.keys());
    hiddenInput.value = ids.join(',');
    console.log('Updated hidden #addSelectedCategoryIds:', hiddenInput.value);
}

/**
 * Populate the singer list in the Add Singer Modal
 */
function populateAddSingerModalList(filteredSingers) {
    const container = document.getElementById('addSingerListContainer');
    if (!container) {
        console.error('[populateAddSingerModalList] Add singer list container not found');
        return;
    }
    console.log('[populateAddSingerModalList] Attempting to populate with:', filteredSingers);
    container.innerHTML = '';

    if (!filteredSingers || !Array.isArray(filteredSingers)) {
        console.warn('[populateAddSingerModalList] Invalid or null filteredSingers data provided.');
        container.innerHTML = '<p class="text-center text-danger">Error: Could not load artists data.</p>';
        return;
    }
    if (filteredSingers.length === 0) {
        console.warn('[populateAddSingerModalList] No singers found to display.');
        container.innerHTML = '<p class="text-center text-muted">No artists found.</p>';
        return;
    }

    const listGroup = document.createElement('ul');
    listGroup.className = 'list-group list-group-flush';

    filteredSingers.forEach((singer) => {
        if (!singer || typeof singer.id === 'undefined' || typeof singer.name === 'undefined') {
            console.warn(`[populateAddSingerModalList] Skipping invalid singer object:`, singer);
            return;
        }
        const singerIdStr = String(singer.id);
        const isChecked = selectedAddSingers.has(singerIdStr);
        const listItem = document.createElement('li');
        listItem.className = 'list-group-item';
        listItem.innerHTML = `
            <div class="form-check">
                <input class="form-check-input add-singer-checkbox" type="checkbox" value="${singerIdStr}" id="add-singer-${singerIdStr}" ${isChecked ? 'checked' : ''}>
                <label class="form-check-label w-100" for="add-singer-${singerIdStr}">
                    ${escapeHTML(singer.name)}
                </label>
            </div>
        `;
        listGroup.appendChild(listItem);
    });
    container.appendChild(listGroup);
    console.log('[populateAddSingerModalList] Finished populating add singer list.');
}

/**
 * Update the display of selected singers in the Add Song Modal
 */
function updateAddSelectedSingersDisplay() {
    console.log('Updating add selected singers display');
    const container = document.getElementById('addSelectedSingersContainer');
    const hiddenInput = document.getElementById('addSelectedSingerIds');

    if (!container || !hiddenInput) {
        console.error('Add selected singers container or hidden input not found');
        return;
    }
    container.innerHTML = '';
    if (selectedAddSingers.size === 0) {
        container.innerHTML = '<span class="text-muted small">No artists selected</span>';
    } else {
        selectedAddSingers.forEach((name, id) => {
            const pill = document.createElement('span');
            pill.className = 'badge bg-secondary me-1 mb-1';
            pill.textContent = escapeHTML(name);
            container.appendChild(pill);
        });
    }
    const ids = Array.from(selectedAddSingers.keys());
    hiddenInput.value = ids.join(',');
    console.log('Updated hidden #addSelectedSingerIds:', hiddenInput.value);
}

/**
 * Initialize image upload and preview functionality for the Add Song modal
 */
function initAddImageUploadPreview() {
    const imageInput = document.getElementById('addImageFileInput');
    const browseImageBtn = document.getElementById('browseAddImageBtn');
    const imagePreview = document.getElementById('addImagePreview');
    const imagePreviewText = document.getElementById('addImagePreviewText');

    if (!imageInput || !browseImageBtn || !imagePreview || !imagePreviewText) {
        console.warn("Add Song modal image upload elements not found.");
        return;
    }

    browseImageBtn.addEventListener('click', () => {
        imageInput.click();
    });

    imageInput.addEventListener('change', function(event) {
        const file = event.target.files[0];
        if (file) {
            if (!file.type.startsWith('image/')) {
                showToast('Please select an image file (JPEG, PNG, GIF)', 'warning');
                this.value = '';
                resetAddImagePreview();
                return;
            }
            if (file.size > 5 * 1024 * 1024) { // 5MB limit
                showToast('Image file is too large (Max 5MB)', 'danger');
                this.value = '';
                resetAddImagePreview();
                return;
            }
            const reader = new FileReader();
            reader.onload = function(e) {
                imagePreview.src = e.target.result;
                imagePreview.style.display = 'block';
                imagePreviewText.style.display = 'none';
            }
            reader.readAsDataURL(file);
        } else {
            resetAddImagePreview();
        }
    });
}

/**
 * Reset image preview for the Add Song modal to its initial state
 */
function resetAddImagePreview() {
    const imageInput = document.getElementById('addImageFileInput');
    const imagePreview = document.getElementById('addImagePreview');
    const imagePreviewText = document.getElementById('addImagePreviewText');

    if (imageInput) imageInput.value = '';
    if (imagePreview) {
        imagePreview.src = '#';
        imagePreview.style.display = 'none';
    }
    if (imagePreviewText) {
        imagePreviewText.style.display = 'block';
    }
} 
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
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
        try {
            const user = JSON.parse(storedUser);
            currentUserId = user.id;
            // console.log("Current Admin User ID set to:", currentUserId);
        } catch (error) {
            // console.error("Error parsing user data from localStorage:", error);
            showToast("Failed to load user session.", "error");
            }
        } else {
        // console.warn("User data not found in localStorage.");
        showToast("User session not found. Please log in.", "warning");
        // Potentially redirect to login page
        // window.location.href = 'login.html'; 
    }
}

/**
 * Fetch all songs data (no pagination) to calculate stats.
 * @returns {Promise<Array>} A promise that resolves with the list of all songs, or empty array on failure.
 */
async function fetchAllSongsDataForStats() {
    // console.log("Fetching all songs data for statistics...");
    try {
        const response = await api.get(`${API_BASE_URL}/selectAll`);
        if (response.data && (response.data.code === '200' || response.data.code === 200) && Array.isArray(response.data.data)) {
            // console.log(`Fetched ${response.data.data.length} total songs for stats.`);
            return response.data.data || [];
        } else {
            // console.error('Failed to fetch all songs for stats:', response.data?.msg);
            showToast('Error fetching song statistics data (server response).', 'error');
            return [];
        }
    } catch (error) {
        // console.error('Network or other error fetching all songs for stats:', error);
        showToast('Error fetching song statistics data (network error).', 'error');
        return [];
    }
}

/**
 * Fetch and display songs based on current filters and status.
 * Also updates statistics.
 * @param {boolean} initialLoad - Flag indicating if it's the initial page load.
 */
async function fetchAndDisplaySongs(initialLoad = false) {
    showLoadingIndicator(true);
    if (initialLoad) {
        // console.log("Initial load: Fetching singers and categories first.");
        // Fetch supporting data only on initial load or when necessary
        const singersLoaded = await loadSingers();
        const categoriesLoaded = await loadCategories();
        if (!singersLoaded || !categoriesLoaded) {
            showToast("Failed to load necessary filters data. Song list may be incomplete.", "warning");
            // Decide if you want to proceed without filters or stop
        }
        // console.log("Singers and Categories loaded for initial display.");
    }

    // 1. Fetch All Songs Data for Stats (always fetch all for accurate stats)
    allSongs = await fetchAllSongsDataForStats();
    // console.log("Total songs fetched for stats:", allSongs.length);

    // 2. Update Statistics UI based on *all* songs
    updateSongStatsUI(allSongs);

    // 3. Get Applied Filters
    const filters = getAppliedFilters();
    // console.log("Applied Filters:", filters);

    // 4. Filter the songs based on the current view (All, Pending, Approved, Rejected) and filters
    let filteredSongs = filterSongs(allSongs, filters);
    // console.log(`Filtered songs for current view '${currentFilterStatus || 'All'}':`, filteredSongs.length);


    // 5. Update the DataTable with the filtered songs
    updateSongsTable(filteredSongs);

    // 6. Update UI elements like filter counts (optional)
    // updateFilterCounts(allSongs); // Example: update counts next to filter buttons

    showLoadingIndicator(false);
}

/**
 * Get the currently applied filters from the UI elements.
 * @returns {object} An object containing the applied filters.
 */
function getAppliedFilters() {
    const filters = {
        status: currentFilterStatus || 'All', // 'All', 'Pending', 'Approved', 'Rejected'
        search: document.getElementById('searchInput')?.value.trim().toLowerCase() || '',
        singerId: document.getElementById('singerFilter')?.value || '',
        categoryId: document.getElementById('categoryFilter')?.value || ''
    };
    // console.log("Retrieving filters from UI:", filters);
    return filters;
}

/**
 * Filter songs based on the applied filters.
 * @param {Array} songs - The array of all songs.
 * @param {object} filters - The filters object from getAppliedFilters.
 * @returns {Array} The filtered array of songs.
 */
function filterSongs(songs, filters) {
    // console.log("Filtering songs with filters:", filters);
    return songs.filter(song => {
        let match = true;
        
        // Filter by Status (0=Pending, 1=Approved, 2=Rejected)
        if (filters.status !== 'All') {
            const statusMap = { 'Pending': 0, 'Approved': 1, 'Rejected': 2 };
            match = match && (song.status === statusMap[filters.status]);
        }

        // Filter by Search Term (name or introduction)
        if (filters.search) {
            const searchTerm = filters.search;
            match = match && (
                (song.name && song.name.toLowerCase().includes(searchTerm)) ||
                (song.introduction && song.introduction.toLowerCase().includes(searchTerm)) ||
                // Optional: Search by singer names as well
                 (song.singerNames && song.singerNames.toLowerCase().includes(searchTerm))
            );
        }

        // Filter by Singer ID
        if (filters.singerId) {
            // Check if the song's singerIds array contains the filtered singerId
            match = match && song.singerIds && song.singerIds.includes(parseInt(filters.singerId, 10));
        }

        // Filter by Category ID
        if (filters.categoryId) {
             match = match && song.categoryId && (song.categoryId === parseInt(filters.categoryId, 10));
        }

        return match;
    });
}

/**
 * Update the statistics UI elements (counts and progress bars).
 * @param {Array} songs - Array of all songs.
 */
function updateSongStatsUI(songs) {
    const total = songs.length;
    const pending = songs.filter(s => s.status === 0).length;
    const approved = songs.filter(s => s.status === 1).length;
    const rejected = songs.filter(s => s.status === 2).length;

    // console.log(`Updating stats: Total=${total}, Pending=${pending}, Approved=${approved}, Rejected=${rejected}`);

    $('#totalSongsCount').text(total);
    $('#pendingSongsCount').text(pending);
    $('#approvedSongsCount').text(approved);
    $('#rejectedSongsCount').text(rejected);

    // Update progress bars
    const safeTotal = total || 1; // Avoid division by zero
    $('#pendingProgress').css('width', `${(pending / safeTotal) * 100}%`);
    $('#approvedProgress').css('width', `${(approved / safeTotal) * 100}%`);
    $('#rejectedProgress').css('width', `${(rejected / safeTotal) * 100}%`);

    // Update filter button counts (optional, if you have elements like #pendingFilterCount)
    $('#allFilterCount').text(total);
    $('#pendingFilterCount').text(pending);
    $('#approvedFilterCount').text(approved);
    $('#rejectedFilterCount').text(rejected);
}


/**
 * Update the DataTable with the provided songs data.
 * @param {Array} songs - The array of songs to display.
 */
function updateSongsTable(songs) {
    if (!songsTable) {
        // console.error("DataTable is not initialized!");
        return;
    }
    // console.log(`Updating DataTable with ${songs.length} songs.`);
        songsTable.clear();
            songsTable.rows.add(songs);
        songsTable.draw();
    // console.log("DataTable redraw complete.");
}


/**
 * Initialize the DataTable instance.
 */
function initializeDataTable() {
    // console.log("Initializing DataTable...");
    if (!$.fn.DataTable) {
        // console.error("DataTable plugin is not loaded.");
        showToast("Error initializing table: DataTable plugin not found.", "error");
        return;
    }

    songsTable = $('#songsTable').DataTable({
        processing: true,
        serverSide: false,
        searching: false,
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
                    // console.log(`Song ID: ${row.id}, Status: ${data} => ${statusText}`);
                    return `<span class="badge ${badgeClass}"><i class="fas fa-${icon} me-1"></i>${statusText}</span>`;
                },
                className: 'text-center'
            },
            {
                data: null,
                orderable: false,
                render: function(data, type, row) {
                    // Store full row data in the button for easy access later
                    const safeRowData = escapeHTML(JSON.stringify(row));
                    // Escape name for data-name attribute in delete button
                    const safeSongName = escapeHTML(row.name);
                    // console.log(`Rendering buttons for Song ID: ${row.id}, Status: ${row.status}`);

                    let actionButtons = `
                        <button class="btn btn-sm btn-info preview-btn" data-song='${safeRowData}' title="Preview Song"><i class="fas fa-play"></i></button>
                    `;

                    if (row.status === 0) {
                        actionButtons += `
                                <button class="btn btn-sm btn-success approve-btn" data-id="${row.id}" title="Approve Song">
                                    <i class="fas fa-check me-1"></i> Approve
                                </button>
                                <button class="btn btn-sm btn-danger reject-btn" data-id="${row.id}" title="Reject Song">
                                    <i class="fas fa-times me-1"></i> Reject
                                </button>
                        `;
                    } else {
                        actionButtons += `
                                <button class="btn btn-sm btn-primary edit-btn" data-id="${row.id}" title="Edit Song"><i class="fas fa-edit me-1"></i></button>
                                <button class="btn btn-sm btn-warning update-files-btn" data-id="${row.id}" title="Update Files"><i class="fas fa-file-upload me-1"></i></button>
                            <button class="btn btn-sm btn-danger delete-btn" data-id="${row.id}" data-name="${safeSongName}" title="Delete Song"><i class="fas fa-trash me-1"></i></button>
                        `;
                    }

                    return actionButtons;
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
        },
        drawCallback: function(settings) {
            // Re-initialize Bootstrap tooltips on each draw
            const tooltipTriggerList = [].slice.call(document.querySelectorAll('#songsTable [title]'));
            tooltipTriggerList.forEach(function (tooltipTriggerEl) {
                // Dispose existing tooltips to prevent duplicates
                const existingTooltip = bootstrap.Tooltip.getInstance(tooltipTriggerEl);
                if (existingTooltip) {
                    existingTooltip.dispose();
                }
                new bootstrap.Tooltip(tooltipTriggerEl);
            });
            // console.log("DataTable draw callback finished, tooltips reinitialized.");
        }
    });
    // console.log("DataTable initialized successfully.");
}

/**
 * Setup event listeners for buttons, filters, and modals.
 */
function setupEventListeners() {
    // console.log("Setting up event listeners...");

    // Filter buttons (All, Pending, Approved, Rejected)
    $('#allFilterBtn, #pendingFilterBtn, #approvedFilterBtn, #rejectedFilterBtn').on('click', function() {
        const newStatus = $(this).data('status');
        currentFilterStatus = newStatus;

        // Highlight active button
        $('.filter-btn').removeClass('active btn-primary').addClass('btn-outline-primary');
        $(this).removeClass('btn-outline-primary').addClass('active btn-primary');

        // console.log(`Filter status changed to: ${currentFilterStatus}`);
        fetchAndDisplaySongs(); // Refetch and filter data based on the new status
    });

    // Search Input & Button
    $('#searchButton').on('click', function() {
        // console.log("Search button clicked.");
        fetchAndDisplaySongs();
    });
    $('#searchInput').on('keypress', function(e) {
        if (e.key === 'Enter') {
            // console.log("Search input Enter key pressed.");
            fetchAndDisplaySongs();
        }
    });

    // Filter Dropdowns (Singer, Category)
    $('#singerFilter, #categoryFilter').on('change', function() {
        // console.log("Filter dropdown changed.");
        fetchAndDisplaySongs();
    });

    // Reset Filters Button
    $('#resetFiltersBtn').on('click', function() {
        // console.log("Reset filters button clicked.");
        $('#searchInput').val('');
        $('#singerFilter').val('');
        $('#categoryFilter').val('');
        // Optionally reset status filter to 'All' or keep current status filter?
        // Let's keep the status filter active unless explicitly changed
        // currentFilterStatus = 'All'; // Uncomment to reset status filter too
        // $('.filter-btn').removeClass('active btn-primary').addClass('btn-outline-primary');
        // $('#allFilterBtn').addClass('active btn-primary'); // Highlight 'All'
        fetchAndDisplaySongs();
    });

    // Add Song Button -> Opens Modal
    $('#addSongBtn').on('click', function() {
        // console.log("Add Song button clicked.");
        // Reset the add form completely
        $('#addSongForm')[0].reset();
        // Reset custom multi-selects for categories and singers
        selectedAddCategories.clear();
        selectedAddSingers.clear();
        updateAddSelectedCategoriesDisplay();
        updateAddSelectedSingersDisplay();
        // Reset image preview
        resetAddImagePreview();
        // Ensure the correct modal title is set
        $('#addSongModalLabel').text('Add New Song');
        // Clear any previous validation states
        $('#addSongForm').removeClass('was-validated');
        // Clear progress bar if it exists in add modal
        $('#addProgressContainer').hide();
        $('#addProgressBar').css('width', '0%').attr('aria-valuenow', 0);
        $('#addProgressText').text('');

        // Pre-populate modals if data is available
        populateAddCategoryModalList(allCategoriesData); // Use globally stored data
        populateAddSingerModalList(allSingersData); // Use globally stored data

        // Show the modal
        var addModal = new bootstrap.Modal(document.getElementById('addSongModal'));
        addModal.show();
    });

    // --- DataTable Button Event Delegation ---
    $('#songsTable tbody').on('click', 'button', function() {
        const action = $(this).attr('class'); // Get all classes to check substrings
        const songDataString = $(this).data('song');
        let songData = null;
        let songId = $(this).data('id'); // Fallback if song data isn't attached directly

        try {
            if (songDataString) {
                // Need to decode the HTML entities first before parsing JSON
                 const decodedString = $('<div>').html(songDataString).text();
                songData = JSON.parse(decodedString);
                songId = songData.id; // Get ID from the parsed data
                // console.log(`Action '${action}' triggered for song ID: ${songId}`, songData);
            } else if (songId) {
                 // console.log(`Action '${action}' triggered for song ID: ${songId} (data might be missing)`);
                 // Attempt to find song data from the global list if needed, though risky
                 // songData = allSongs.find(s => s.id === songId);
            } else {
                // console.warn("Action triggered but no song ID or data found on button:", this);
                showToast("Could not identify the song for this action.", "error");
                return;
            }
        } catch (e) {
            // console.error("Error parsing song data from button:", e, "Raw data:", songDataString);
            showToast("Error processing song data for action.", "error");
            return;
        }

        if (action.includes('preview-btn')) {
            // console.log("Preview button clicked");
            if (songData) {
                previewSong(songData);
            } else {
                showToast("Cannot preview: Song data missing.", "error");
            }
        } else if (action.includes('edit-btn')) {
             // console.log("Edit button clicked");
            if (songId) {
                editSong(songId); // Function to open edit modal and load data
            }
        } else if (action.includes('files-btn')) {
            // console.log("Update Files button clicked");
            if (songId) {
                showUpdateFilesModal(songId); // Function to open the file update modal
            }
        } else if (action.includes('delete-btn')) {
             // console.log("Delete button clicked");
            const songName = $(this).data('name') || (songData ? songData.name : `ID ${songId}`);
            if (songId) {
                showDeleteModal(songId, songName);
            }
        } else if (action.includes('approve-btn')) {
            // console.log("Approve button clicked");
             if (songId) {
                handleAuditSong(songId, 1); // 1 for Approve
            }
        } else if (action.includes('reject-btn')) {
            // console.log("Reject button clicked");
            if (songId) {
                handleAuditSong(songId, 2); // 2 for Reject
            }
        } else {
            // console.log("Unhandled button action:", action);
        }
    });
    // --- End DataTable Button Event Delegation ---

    // Add Song Modal - Category Selection
    $('#addSelectCategoryBtn').on('click', function() {
        // console.log("Select Category button clicked (Add Modal)");
        // Populate the modal list just before showing, ensure latest data
        populateAddCategoryModalList(allCategoriesData);
        const categoryModal = new bootstrap.Modal(document.getElementById('addCategorySelectModal'));
        categoryModal.show();
    });

    // Add Song Modal - Singer Selection
    $('#addSelectSingerBtn').on('click', function() {
        // console.log("Select Singer button clicked (Add Modal)");
        // Populate the modal list just before showing
        populateAddSingerModalList(allSingersData);
        const singerModal = new bootstrap.Modal(document.getElementById('addSingerSelectModal'));
        singerModal.show();
    });

    // Add Song Modal - Category Modal - Search Input
    $('#addCategorySearchInput').on('input', function() {
        const searchTerm = $(this).val().toLowerCase();
        // console.log("Searching categories (Add Modal):", searchTerm);
        const filtered = allCategoriesData.filter(cat => cat.name.toLowerCase().includes(searchTerm));
        populateAddCategoryModalList(filtered);
    });

    // Add Song Modal - Singer Modal - Search Input
    $('#addSingerSearchInput').on('input', function() {
        const searchTerm = $(this).val().toLowerCase();
        // console.log("Searching singers (Add Modal):", searchTerm);
        const filtered = allSingersData.filter(singer => singer.name.toLowerCase().includes(searchTerm));
        populateAddSingerModalList(filtered);
    });

     // Add Song Modal - Category Modal - Checkbox Change (Event Delegation)
     $('#addCategoryListContainer').on('change', '.add-category-checkbox', function() {
        const categoryId = $(this).val();
        const categoryName = $(this).closest('.form-check').find('label').text().trim();
        // console.log(`Category checkbox changed: ID=${categoryId}, Name=${categoryName}, Checked=${this.checked}`);
        if (this.checked) {
            selectedAddCategories.set(categoryId, categoryName);
            } else {
            selectedAddCategories.delete(categoryId);
        }
        // console.log("Current selected categories (Add Modal):", selectedAddCategories);
    });

    // Add Song Modal - Singer Modal - Checkbox Change (Event Delegation)
    $('#addSingerListContainer').on('change', '.add-singer-checkbox', function() {
        const singerId = $(this).val();
        const singerName = $(this).closest('.form-check').find('label').text().trim();
        // console.log(`Singer checkbox changed: ID=${singerId}, Name=${singerName}, Checked=${this.checked}`);
        if (this.checked) {
            selectedAddSingers.set(singerId, singerName);
            } else {
            selectedAddSingers.delete(singerId);
        }
         // console.log("Current selected singers (Add Modal):", selectedAddSingers);
    });


    // Add Song Modal - Category Modal - Confirm Button
    $('#confirmAddCategorySelection').on('click', function() {
        // console.log("Confirming category selection (Add Modal)");
        updateAddSelectedCategoriesDisplay();
        const categoryModal = bootstrap.Modal.getInstance(document.getElementById('addCategorySelectModal'));
        categoryModal?.hide();
    });

    // Add Song Modal - Singer Modal - Confirm Button
    $('#confirmAddSingerSelection').on('click', function() {
        // console.log("Confirming singer selection (Add Modal)");
            updateAddSelectedSingersDisplay();
        const singerModal = bootstrap.Modal.getInstance(document.getElementById('addSingerSelectModal'));
        singerModal?.hide();
    });


    // Add Song Form Submission
    $('#addSongForm').on('submit', function(e) {
        e.preventDefault(); // Prevent default form submission
        // console.log("Add Song form submitted.");
        handleAddSong();
    });

    // Edit Song Form Submission
    $('#editSongForm').on('submit', function(e) {
        e.preventDefault();
        // console.log("Edit Song form submitted.");
        handleEditSong();
    });

    // Update Files Form Submission (handles individual file updates)
    // We don't submit the whole form, but trigger uploads via buttons
    $('#updateSongFileBtn').on('click', () => handleUpdateFile('song'));
    $('#updateMVFileBtn').on('click', () => handleUpdateFile('mv'));
    $('#updatePicFileBtn').on('click', () => handleUpdateFile('pic'));


    // Delete Modal - Confirm Button
    $('#confirmDelete').on('click', function() {
        // console.log("Confirm Delete button clicked.");
        handleDeleteSong();
    });

    // Initialize image preview for Add Song modal
    initAddImageUploadPreview();

    // console.log("Event listeners setup complete.");
}

/**
 * Handle the Add Song form submission.
 */
async function handleAddSong() {
    // console.log("Handling Add Song submission...");
    const form = document.getElementById('addSongForm');
    const submitButton = document.getElementById('submitAddSong'); // Assuming button ID
    const progressBar = $('#addProgressBar');
    const progressContainer = $('#addProgressContainer');
    const progressText = $('#addProgressText');

    // Basic validation
    if (!validateSongForm(form)) {
        // console.log("Add Song form validation failed.");
        return; // Validation messages shown by validateSongForm
    }
    // console.log("Add Song form validation passed.");

    // Disable button, show progress
    submitButton.disabled = true;
    submitButton.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Adding...';
    progressContainer.show();
    progressBar.css('width', '0%').attr('aria-valuenow', 0).removeClass('bg-danger bg-success').addClass('bg-primary progress-bar-striped progress-bar-animated');
    progressText.text('Preparing...');

    // Gather form data
    const formData = new FormData(form);

    // Append manually managed fields (multi-select singers/categories)
    const singerIds = Array.from(selectedAddSingers.keys());
    // formData.append('singerIds', singerIds.join(',')); // Send as CSV
    // OR append multiple times if backend expects array parameter
     singerIds.forEach(id => formData.append('singerIds', id));
    // console.log("Appended singerIds:", singerIds);

    const categoryIds = Array.from(selectedAddCategories.keys());
    // formData.append('categoryIds', categoryIds.join(',')); // Send as CSV
    // OR append multiple times
    categoryIds.forEach(id => formData.append('categoryIds', id));
    // console.log("Appended categoryIds:", categoryIds);

    // Add current user ID (assuming admin adds songs)
    if (currentUserId) {
        formData.append('userId', currentUserId);
        // console.log("Appended userId:", currentUserId);
    } else {
        // console.warn("Cannot append userId, it's not set.");
        showToast("User session error. Cannot add song.", "error");
        submitButton.disabled = false;
        submitButton.innerHTML = 'Add Song';
        progressContainer.hide();
        return;
    }

    // Log FormData contents (for debugging)
    // console.log("FormData prepared for add:");
    // for (let [key, value] of formData.entries()) {
    //     console.log(`${key}: ${value}`);
    // }

    try {
        // Use api utility with progress tracking
        const response = await api.post(`${API_BASE_URL}/add`, formData, {
            headers: {
                'Content-Type': 'multipart/form-data' // Important for file uploads
            },
            onUploadProgress: function(progressEvent) {
                const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                progressBar.css('width', percentCompleted + '%').attr('aria-valuenow', percentCompleted);
                progressText.text(`${percentCompleted}% Uploaded`);
                // console.log(`Upload Progress: ${percentCompleted}%`);
            }
        });

        // console.log("Add song API response:", response);

        if (response.data && (response.data.code === '200' || response.data.code === 200)) {
            // Success
            showToast('Song added successfully!', 'success');
            progressBar.removeClass('bg-primary progress-bar-animated').addClass('bg-success');
            progressText.text('Upload Complete!');
            $('#addSongModal').modal('hide');
            fetchAndDisplaySongs(true); // Refresh table and stats (true might reload filters)
        } else {
            // Failure from backend
            const errorMsg = response.data?.msg || response.data?.message || 'Unknown server error';
            // console.error("Failed to add song:", errorMsg);
            showToast(`Failed to add song: ${errorMsg}`, 'error');
            progressBar.removeClass('bg-primary progress-bar-animated').addClass('bg-danger');
            progressText.text('Upload Failed!');
        }
    } catch (error) {
        // Network or other errors
        // console.error('Error adding song:', error);
        const errorMsg = error.response?.data?.msg || error.response?.data?.message || error.message || 'Network error';
        showToast(`Error adding song: ${errorMsg}`, 'error');
        progressBar.removeClass('bg-primary progress-bar-animated').addClass('bg-danger');
        progressText.text('Upload Error!');
    } finally {
        // Re-enable button
        submitButton.disabled = false;
        submitButton.innerHTML = 'Add Song';
        // Keep progress bar visible shortly for feedback, then hide? Or hide immediately?
         setTimeout(() => { progressContainer.hide(); }, 3000); // Hide after 3 seconds
    }
}


/**
 * Load song data for editing and populate the modal.
 */
async function loadSongForEdit(songId) {
    // console.log(`Loading song data for edit, ID: ${songId}`);
    showToast('Loading song details...', 'info');
    try {
        const response = await api.get(`${API_BASE_URL}/detail?songId=${songId}`);
        // console.log("Load for edit response:", response);

        if (response.data && (response.data.code === '200' || response.data.code === 200) && response.data.data) {
            const song = response.data.data;
            
            // --- Populate Basic Info ---
            $('#editSongId').val(song.id);
            $('#editName').val(song.name);
            $('#editIntroduction').val(song.introduction);
            $('#editLyric').val(song.lyric);
            
            // --- Populate Singers ---
            // Ensure the singer dropdown exists and is populated
            if (allSingersData.length === 0) {
                // console.warn("Singers not loaded yet, attempting to load now for edit modal.");
                await loadSingers(); // Ensure singers are loaded before populating
            }
            const editSingerSelect = $('#editSingers');
            if (editSingerSelect.length > 0) {
                 editSingerSelect.val(song.singerIds || []); // Set selected singers
                 editSingerSelect.trigger('change'); // Trigger update for select2 if used
                 // console.log("Set selected singers:", song.singerIds);
            } else {
                 // console.warn("Edit singers dropdown (#editSingers) not found during population.");
            }

            // --- Populate Categories ---
            // Similar check for categories
            if (allCategoriesData.length === 0) {
                 // console.warn("Categories not loaded yet, attempting to load now for edit modal.");
                await loadCategories();
            }
            const editCategorySelect = $('#editCategory'); // Assuming single select for category in edit modal based on HTML structure?
            if (editCategorySelect.length > 0) {
                 editCategorySelect.val(song.categoryId || ''); // Set selected category
                 // console.log("Set selected category:", song.categoryId);
             } else {
                 // console.warn("Edit category dropdown (#editCategory) not found during population.");
            }

            // Clear previous validation
            $('#editSongForm').removeClass('was-validated');

            // Show the modal
            const editModal = new bootstrap.Modal(document.getElementById('editSongModal'));
            editModal.show();
            showToast('Song details loaded.', 'success');

        } else {
            // console.error('Failed to load song details for edit:', response.data?.msg);
            showToast(`Failed to load song details: ${response.data?.msg || 'Not found'}`, 'error');
        }
    } catch (error) {
        // console.error('Error fetching song details for edit:', error);
        showToast('Error fetching song details. Please try again.', 'error');
    }
}

/**
 * Handle the Edit Song form submission (updates text details only).
 */
async function handleEditSong() {
    // console.log("Handling Edit Song submission...");
    const form = document.getElementById('editSongForm');
    const submitButton = document.getElementById('submitEditSong'); // Assuming button ID
    const songId = $('#editSongId').val();

    if (!songId) {
        // console.error("Cannot edit song: ID missing.");
        showToast("Error: Song ID is missing. Cannot save.", "error");
        return;
    }

    // Basic validation (similar to add form, but maybe simpler as files aren't handled here)
    if (!validateSongForm(form)) { // Reuse validation, it skips file checks for edit form
        // console.log("Edit Song form validation failed.");
        return;
    }
     // console.log("Edit Song form validation passed.");

    submitButton.disabled = true;
    submitButton.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Saving...';

    // Prepare data object for update (only text fields)
    const songData = {
        id: songId,
        name: $('#editName').val().trim(),
        introduction: $('#editIntroduction').val().trim(),
        lyric: $('#editLyric').val().trim(),
        // Get selected singers (assuming multi-select)
        singerIds: $('#editSingers').val() || [],
        // Get selected category (assuming single select)
        categoryId: $('#editCategory').val() || null,
         // IMPORTANT: Include userId to link the update action to the admin if required by backend
         userId: currentUserId // Assuming currentUserId holds the logged-in admin's ID
    };

     if (!songData.userId) {
         // console.warn("Admin User ID not set. Update might fail if required by backend.");
         // Decide if this is critical - maybe show warning or block?
         // showToast("Session error: Cannot determine user performing the update.", "warning");
         // submitButton.disabled = false;
         // submitButton.innerHTML = 'Save Changes';
         // return; // Uncomment to block if userId is mandatory
     }

    // Convert to x-www-form-urlencoded or send as JSON, depending on backend expectation
    // Assuming backend expects JSON for update:
    // console.log("Prepared data for update (JSON):", songData);

    try {
        // Using POST with JSON payload as per typical REST update patterns
        // Adjust method (PUT) and Content-Type if backend differs
        const response = await api.post(`${API_BASE_URL}/update`, songData, {
             headers: {
                 'Content-Type': 'application/json'
            }
        });

        // console.log("Update song API response:", response);

        if (response.data && (response.data.code === '200' || response.data.code === 200)) {
            showToast('Song details updated successfully!', 'success');
            $('#editSongModal').modal('hide');
            fetchAndDisplaySongs(); // Refresh table
        } else {
            const errorMsg = response.data?.msg || response.data?.message || 'Unknown server error';
            // console.error("Failed to update song:", errorMsg);
            showToast(`Failed to update song: ${errorMsg}`, 'error');
        }
    } catch (error) {
        // console.error('Error updating song:', error);
        const errorMsg = error.response?.data?.msg || error.response?.data?.message || error.message || 'Network error';
        showToast(`Error updating song: ${errorMsg}`, 'error');
    } finally {
        submitButton.disabled = false;
        submitButton.innerHTML = 'Save Changes';
    }
}


/**
 * Handle updating a specific file (Song, MV, Picture) for a song.
 * @param {string} fileType - 'song', 'mv', or 'pic'.
 */
async function handleUpdateFile(fileType) {
    const songId = $('#updateSongId').val();
    let fileInputId, buttonId, endpointSuffix, progressBarId, progressTextId, progressContainerId;
    
    switch (fileType) {
        case 'song':
            fileInputId = '#updateSongFile';
            buttonId = '#updateSongFileBtn';
            endpointSuffix = 'updateSongUrl'; // API endpoint suffix for song file
            progressBarId = '#updateSongProgress';
            progressTextId = '#updateSongProgressText';
             progressContainerId = '#updateSongProgressContainer';
            break;
        case 'mv':
            fileInputId = '#updateMVFile';
            buttonId = '#updateMVFileBtn';
            endpointSuffix = 'updateSongMV'; // API endpoint suffix for MV file
            progressBarId = '#updateMVProgress';
            progressTextId = '#updateMVProgressText';
            progressContainerId = '#updateMVProgressContainer';
            break;
        case 'pic':
            fileInputId = '#updatePicFile';
            buttonId = '#updatePicFileBtn';
            endpointSuffix = 'updateSongPic'; // API endpoint suffix for picture file
             progressBarId = '#updatePicProgress';
             progressTextId = '#updatePicProgressText';
            progressContainerId = '#updatePicProgressContainer';
            break;
        default:
            // console.error("Invalid file type for update:", fileType);
            showToast("Invalid file type specified for update.", "error");
            return;
    }
    
    const fileInput = $(fileInputId)[0];
    const submitButton = $(buttonId);
    const progressBar = $(progressBarId);
    const progressText = $(progressTextId);
    const progressContainer = $(progressContainerId);


    if (!songId) {
        // console.error(`Cannot update ${fileType}: Song ID missing.`);
        showToast(`Error: Song ID missing. Cannot update ${fileType}.`, "error");
        return;
    }
    
    if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
        // console.log(`No file selected for ${fileType}.`);
        showToast(`Please select a file to update the ${fileType}.`, 'warning');
        return;
    }

    const file = fileInput.files[0];
    // Optional: Add file size validation specific to type
    // if (fileType === 'song' && file.size > MAX_SONG_SIZE) ...

    // console.log(`Updating ${fileType} for song ID: ${songId} with file: ${file.name}`);

    submitButton.prop('disabled', true).html('<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Uploading...');
    progressContainer.show();
    progressBar.css('width', '0%').attr('aria-valuenow', 0).removeClass('bg-danger bg-success').addClass('bg-primary progress-bar-striped progress-bar-animated');
    progressText.text('Preparing...');


    const formData = new FormData();
    formData.append('file', file); // Backend likely expects 'file'
    formData.append('id', songId); // Send song ID

    try {
        const response = await api.post(`${API_BASE_URL}/${endpointSuffix}`, formData, {
            headers: {
                'Content-Type': 'multipart/form-urlencoded'
            },
            onUploadProgress: function(progressEvent) {
                const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                 progressBar.css('width', percentCompleted + '%').attr('aria-valuenow', percentCompleted);
                 progressText.text(`${percentCompleted}% Uploaded`);
                // console.log(`Upload Progress (${fileType}): ${percentCompleted}%`);
            }
        });

        // console.log(`Update ${fileType} API response:`, response);

        if (response.data && (response.data.code === '200' || response.data.code === 200)) {
            showToast(`${capitalizeFirstLetter(fileType)} updated successfully!`, 'success');
             progressBar.removeClass('bg-primary progress-bar-animated').addClass('bg-success');
             progressText.text('Upload Complete!');
            // Optionally close the modal after successful upload? Or allow more uploads?
            // $('#updateFilesModal').modal('hide');
            fetchAndDisplaySongs(); // Refresh table to potentially show new pic/data
                } else {
            const errorMsg = response.data?.msg || response.data?.message || `Failed to update ${fileType}`;
            // console.error(`Failed to update ${fileType}:`, errorMsg);
            showToast(`Failed to update ${fileType}: ${errorMsg}`, 'error');
            progressBar.removeClass('bg-primary progress-bar-animated').addClass('bg-danger');
            progressText.text('Upload Failed!');
        }
    } catch (error) {
        // console.error(`Error updating ${fileType}:`, error);
        const errorMsg = error.response?.data?.msg || error.response?.data?.message || error.message || 'Network error';
        showToast(`Error updating ${fileType}: ${errorMsg}`, 'error');
        progressBar.removeClass('bg-primary progress-bar-animated').addClass('bg-danger');
        progressText.text('Upload Error!');
    } finally {
        submitButton.prop('disabled', false).html(`Update ${capitalizeFirstLetter(fileType)}`);
        fileInput.value = ''; // Clear the file input
        // Hide progress bar after a delay
        setTimeout(() => { progressContainer.hide(); }, 3000);
    }
}

// Helper to capitalize first letter
function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}
/**
 * Preview song using data passed from the button
 */
function previewSong(songData) {
    // Assume songData is now a SongDTO
    // Increment play count (optional)
    api.get(`${API_BASE_URL}/addNums?songId=${songData.id}`)
       .catch(error => {}/*console.error("Failed to increment play count:", error)*/);

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
            // console.error('Error deleting song:', error);
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
        // console.error(`Error ${action.toLowerCase()}ing song:`, error);
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
        // console.log(`${type.toUpperCase()}: ${message}`);
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
    // console.log("Attempting to load singers...");
    try {
        const response = await api.get('/singer/allSinger');
        if (response.data && (response.data.code === '200' || response.data.code === 200) && Array.isArray(response.data.data)) {
            allSingersData = response.data.data || [];
            // console.log(`Successfully loaded ${allSingersData.length} singers globally.`);
            // Populate Edit modal and Filter dropdowns here if needed, AFTER data is confirmed
            populateSingerDropdowns(); // Call helper to populate relevant selects
            return true; // Indicate success
        } else {
            // console.error("Failed to load singers or unexpected format:", response.data);
            showToast("Error loading artists list (server response).", "error");
            allSingersData = []; // Clear data on failure
            populateSingerDropdowns(); // Populate with empty/error state
            return false; // Indicate failure
        }
    } catch (error) {
        // console.error('Network or other error fetching singers:', error);
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
        // console.warn("Edit singers dropdown (#editSingers) not found.");
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
        // console.warn("Singer filter dropdown (#singerFilter) not found.");
    }
    // console.log("Finished populating singer dropdowns.");
}

/**
 * Load categories, store globally, and populate filter dropdown using async/await.
 * @returns {Promise<boolean>} True if successful, false otherwise.
 */
async function loadCategories() {
    // console.log("Attempting to load categories...");
    const filterSelect = document.getElementById('categoryFilter');

    try {
        const response = await api.get('/category/selectAll');
        if (response.data.code === '200' || response.data.code === 200) {
            allCategoriesData = response.data.data || [];
            // console.log(`Successfully loaded ${allCategoriesData.length} categories globally.`);

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
                    // console.log("Populated category filter dropdown.");
            } else {
                    filterSelect.innerHTML = '<option value="" disabled>No categories found</option>';
            }
        } else {
                    filterSelect.innerHTML = '<option value="" disabled>No categories found</option>';
            }
        } else {
                // console.log("Category filter dropdown not found, skipping population.");
            }
            return true; // Indicate success
        } else {
            // console.error('Failed to load categories:', response.data?.msg);
            allCategoriesData = [];
            if (filterSelect) filterSelect.innerHTML = '<option value="" disabled>Error loading</option>';
            showToast('Failed to load categories (server response).', 'error');
            return false; // Indicate failure
        }
    } catch (error) {
        // console.error('Network or other error fetching categories:', error);
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
        // console.error('[populateAddCategoryModalList] Add category list container not found');
        return;
    }
    // console.log('[populateAddCategoryModalList] Attempting to populate with:', filteredCategories);
    container.innerHTML = ''; // Clear previous content

    if (!filteredCategories || !Array.isArray(filteredCategories)) {
        // console.warn('[populateAddCategoryModalList] Invalid or null filteredCategories data provided.');
        container.innerHTML = '<p class="text-center text-danger">Error: Could not load categories data.</p>';
        return;
    }
    if (filteredCategories.length === 0) {
        // console.warn('[populateAddCategoryModalList] No categories found to display.');
        container.innerHTML = '<p class="text-center text-muted">No categories found.</p>';
        return;
    }

    const listGroup = document.createElement('ul');
    listGroup.className = 'list-group list-group-flush';

    filteredCategories.forEach((category) => {
        if (!category || typeof category.id === 'undefined' || typeof category.name === 'undefined') {
            // console.warn(`[populateAddCategoryModalList] Skipping invalid category object:`, category);
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
    // console.log('[populateAddCategoryModalList] Finished populating add category list.');
}

/**
 * Update the display of selected categories in the Add Song Modal
 */
function updateAddSelectedCategoriesDisplay() {
    // console.log('Updating add selected categories display');
    const container = document.getElementById('addSelectedCategoriesContainer');
    const hiddenInput = document.getElementById('addSelectedCategoryIds');

    if (!container || !hiddenInput) {
        // console.error('Add selected categories container or hidden input not found');
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
    // console.log('Updated hidden #addSelectedCategoryIds:', hiddenInput.value);
}

/**
 * Populate the singer list in the Add Singer Modal
 */
function populateAddSingerModalList(filteredSingers) {
    const container = document.getElementById('addSingerListContainer');
    if (!container) {
        // console.error('[populateAddSingerModalList] Add singer list container not found');
        return;
    }
    // console.log('[populateAddSingerModalList] Attempting to populate with:', filteredSingers);
    container.innerHTML = '';

    if (!filteredSingers || !Array.isArray(filteredSingers)) {
        // console.warn('[populateAddSingerModalList] Invalid or null filteredSingers data provided.');
        container.innerHTML = '<p class="text-center text-danger">Error: Could not load artists data.</p>';
        return;
    }
    if (filteredSingers.length === 0) {
        // console.warn('[populateAddSingerModalList] No singers found to display.');
        container.innerHTML = '<p class="text-center text-muted">No artists found.</p>';
        return;
    }

    const listGroup = document.createElement('ul');
    listGroup.className = 'list-group list-group-flush';

    filteredSingers.forEach((singer) => {
        if (!singer || typeof singer.id === 'undefined' || typeof singer.name === 'undefined') {
            // console.warn(`[populateAddSingerModalList] Skipping invalid singer object:`, singer);
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
    // console.log('[populateAddSingerModalList] Finished populating add singer list.');
}

/**
 * Update the display of selected singers in the Add Song Modal
 */
function updateAddSelectedSingersDisplay() {
    // console.log('Updating add selected singers display');
    const container = document.getElementById('addSelectedSingersContainer');
    const hiddenInput = document.getElementById('addSelectedSingerIds');

    if (!container || !hiddenInput) {
        // console.error('Add selected singers container or hidden input not found');
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
    // console.log('Updated hidden #addSelectedSingerIds:', hiddenInput.value);
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
        // console.warn("Add Song modal image upload elements not found.");
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
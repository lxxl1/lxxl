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

// Global variables
let songsTable;
let currentSongId = null;
const API_BASE_URL = '/song';  // Base URL for all song APIs
let allSongsData = []; // Store all fetched songs for filtering

// Initialize after document is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Set current user ID (if needed for uploads)
    setCurrentUserId();
    
    // Initialize data table
    initializeDataTable();
    
    // Set up event listeners
    setupEventListeners();
    
    // Initialize form submit events (if any custom needed)
    // initFormSubmits(); // Assuming this is not strictly needed based on current code
    
    // Load initial data (default to pending songs)
    fetchAndDisplaySongs(true); // Pass true to indicate initial load (fetch pending)
    
    // Load singers for dropdowns
    loadSingers();

    // Load categories for dropdown
    console.log("Attempting to call loadCategories..."); // DEBUG LOGGING
    loadCategories();
    console.log("Finished calling loadCategories."); // DEBUG LOGGING

    // Trigger count update on load (for localStorage and initial stats)
    fetchAllSongsDataForStats(); // Fetch all songs data just for stats update
});

/**
 * 从localStorage获取并设置当前登录用户的ID
 */
function setCurrentUserId() {
    try {
        const userData = JSON.parse(localStorage.getItem('user')) || {};
        if (userData.id) {
            // 设置隐藏字段的值
            const userIdField = document.getElementById('userId');
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
            }
        }
    });
}

/**
 * Set up all event listeners for the page
 */
function setupEventListeners() {
    // Add Song form submission
    $('#submitAddSong').on('click', handleAddSong);
    
    // Edit Song form submission
    $('#submitEditSong').on('click', handleEditSong);
    
    // Update Song file
    $('#submitUpdateSong').on('click', () => handleUpdateFile('song'));
    
    // Update MV file
    $('#submitUpdateMV').on('click', () => handleUpdateFile('mv'));
    
    // Update Cover Image
    $('#submitUpdatePic').on('click', () => handleUpdateFile('pic'));
    
    // Delete song
    $('#confirmDelete').on('click', handleDeleteSong);
    
    // Edit button click
    $('#songsTable').on('click', '.edit-btn', function() {
        const data = songsTable.row($(this).closest('tr')).data();
        editSong(data.id);
    });
    
    // Update files button click
    $('#songsTable').on('click', '.update-files-btn', function() {
        const data = songsTable.row($(this).closest('tr')).data();
        showUpdateFilesModal(data.id);
    });
    
    // Preview button click
    $('#songsTable').on('click', '.preview-btn', function() {
        const button = $(this);
        const songData = {
            id: button.data('id'),
            url: button.data('url'),
            name: button.data('name'),
            singerId: button.data('singerid'),
            pic: button.data('pic'),
            introduction: button.data('introduction'),
            mvurl: button.data('mvurl'),
            lyric: button.data('lyric')
        };
        
        if (songData.url) { // Only proceed if URL exists
            previewSong(songData);
        } else {
            showToast("Preview is unavailable because the song URL is missing.", "warning");
        }
    });
    
    // Delete button click
    $('#songsTable').on('click', '.delete-btn', function() {
        const data = songsTable.row($(this).closest('tr')).data();
        showDeleteModal(data.id, data.name);
    });
    
    // Apply filters button
    $('#applyFilters').on('click', () => fetchAndDisplaySongs(false)); // Pass false to indicate filter application
    
    // Clear filters button
    $('#clearFilters').on('click', function() {
        $('#singerFilter').val('');
        $('#userIdFilter').val(''); // Clear User ID filter
        $('#nameFilter').val('');
        $('#statusFilter').val(''); // Reset status to All
        // $('#sortByPlays').val(''); // Reset sort if added back
        fetchAndDisplaySongs(true); // Reload default view (pending)
    });
    
    // Global search button
    $('#globalSearchBtn').on('click', function() {
        const searchTerm = $('#globalSearch').val()?.trim();
        // Global search likely needs backend support or complex client-side logic
        // For now, let's just filter by name using the existing mechanism
        $('#nameFilter').val(searchTerm || '');
        $('#singerFilter').val('');
        $('#userIdFilter').val('');
        $('#statusFilter').val('');
        fetchAndDisplaySongs(false);
    });
    
    // Keyboard event for global search
    $('#globalSearch').on('keypress', function(e) {
        if (e.which === 13) { // Enter key
            $('#globalSearchBtn').click();
        }
    });

    // Approve button click
    $('#songsTable').on('click', '.approve-btn', function() {
        const songId = $(this).data('id');
        handleAuditSong(songId, 1); // 1 for Approved
    });

    // Reject button click
    $('#songsTable').on('click', '.reject-btn', function() {
        const songId = $(this).data('id');
        handleAuditSong(songId, 2); // 2 for Rejected
    });
}

/**
 * Handle add song form submission
 */
function handleAddSong() {
    const form = $('#addSongForm')[0];
    if (!validateSongForm(form)) { return; }
    const formData = new FormData(form);

    // Get MULTIPLE singer IDs (Name matches HTML: singerIds)
    const selectedSingerIds = $('#addSingers').val();
    // Validation for singers already handled in validateSongForm
    // FormData(form) already includes 'singerIds' if name attribute is correct.
    // Ensure it's sent correctly even if no selection (though validation prevents this)
    if (!formData.has('singerIds')) {
        formData.append('singerIds', selectedSingerIds ? selectedSingerIds.join(',') : '');
    }
    
    // Get SINGLE category ID (Name matches HTML: categoryId)
    const categorySelect = document.getElementById('addCategory');
    const categoryId = categorySelect.value;
    // Validation for category already handled in validateSongForm
    // FormData(form) includes 'categoryId'. Ensure it's correct.
    if (!formData.has('categoryId')) {
         formData.append('categoryId', categoryId || '');
    }

    // Check music file again
    if (!formData.has('file') || !form.elements.file.files[0]) {
        showToast('Please select a song file.', 'warning');
        return;
    }
    
    // Add MV file (if any, otherwise add empty)
    if (!formData.has('files')) { // Only add empty if 'files' field is totally missing
        const mvFile = form.elements.files ? form.elements.files.files[0] : null;
        if (!mvFile) { 
            formData.append('files', new File([], 'empty.mp4', { type: 'video/mp4' }));
        }
        // If mvFile exists, FormData(form) should have already included it.
    }
    
    // --- SOLUTION: Always send userId as 0 from Admin interface ---
    formData.append('userId', '0');

    // Show progress bar
    const progressBar = $('#uploadProgress'); // Ensure this ID exists in the add modal
    const progressIndicator = progressBar.find('.progress-bar');
    progressBar.show();
    progressIndicator.width('0%');
    progressIndicator.text('0%');
    
    // Disable submit button
    $('#submitAddSong').prop('disabled', true);
    
    // Log form data for debugging
    console.log('Admin Add Song - Form data being sent:');
    for (let pair of formData.entries()) {
        console.log(pair[0] + ': ', pair[1]);
    }
    
    showToast('Adding song...', 'info');
    api.post(`${API_BASE_URL}/add`, formData, { headers: { 'Content-Type': 'multipart/form-data' } })
        .then(response => {
            if (response.data && (response.data.code === '200' || response.data.code === 200)) {
                showToast('Song added successfully!', 'success');
                $('#addSongModal').modal('hide');
                fetchAndDisplaySongs(); // Refresh the table
                fetchAllSongsDataForStats(); // Refresh stats
            } else {
                showToast(response.data?.message || 'Failed to add song.', 'error');
            }
        })
        .catch(error => {
            console.error('Error adding song:', error);
            showToast('Error adding song. ' + (error.response?.data?.message || error.message), 'error');
        })
        .finally(() => {
            progressBar.hide();
            $('#submitAddSong').prop('disabled', false);
        });
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
    const confirmMessage = `Are you sure you want to ${action.toLowerCase()} this song (ID: ${songId})?`;
    
    if (!confirm(confirmMessage)) {
        return;
    }
    
    // Reason is not used in the simplified update, but keep variable for potential future use
    const reason = status === 2 ? 'Rejected by admin' : null; 
    
    try {
        // Use the correct imported api object
        // The backend PUT mapping takes parameters in the request params, not body
        const response = await api.put(`/admin/song/audit/${songId}`, null, {
            params: {
                status: status,
                // reason: reason // Reason parameter removed as the target DB column doesn't exist
            }
        });
        
        // Check response status directly
        if (response.status === 200) { 
            // Optionally check response.data.code if backend sends it on success
            // if (response.data && (response.data.code === '200' || response.data.code === 200)) { ... }
            showToast(`Song ${action.toLowerCase()}ed successfully!`, 'success');
            fetchAndDisplaySongs(true); // Reload the table to show updated status
        } else {
             const errorMsg = response.data?.msg || response.data?.message || `Server responded with status ${response.status}`;
             showToast(`Failed to ${action.toLowerCase()} song. ${errorMsg}`, 'error');
        }
    } catch (error) {
        console.error(`Error ${action.toLowerCase()}ing song:`, error);
        showToast(`Error ${action.toLowerCase()}ing song. Check console.`, 'error'); 
        // handleApiError(error, `Song Audit (${action})`); // Call local error handler if defined and needed
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
 * Load artist data into dropdown
 */
function loadSingers() {
    api.get('/singer/allSinger')
        .then(response => {
            if (response.data && (response.data.code === '200' || response.data.code === 200)) {
                const singers = response.data.data || [];
                const addSelect = $('#addSingers'); // ** ID of the ADD form's MULTI-SELECT **
                const editSelect = $('#editSingers'); // ** ID of the EDIT form's MULTI-SELECT **
                const filterSelect = $('#singerFilter'); // Filter dropdown (likely single select)

                addSelect.empty(); // Clear existing options
                editSelect.empty();
                filterSelect.empty().append('<option value="">All Artists</option>'); // Add default for filter

                if (singers.length > 0) {
                    singers.forEach(singer => {
                        const option = `<option value="${singer.id}">${singer.name}</option>`;
                        addSelect.append(option);
                        editSelect.append(option);
                        filterSelect.append(option);
                    });
                } else {
                    // Optionally add a disabled option if no singers
                    addSelect.append('<option value="" disabled>No artists available</option>');
                    editSelect.append('<option value="" disabled>No artists available</option>');
                }
                 // Initialize/refresh multi-select plugin if used (e.g., Select2)
                 // addSelect.select2(); 
                 // editSelect.select2();
            } else {
                console.error("Failed to load singers or unexpected format:", response.data);
                showToast("Error loading artists list.", "error");
            }
        })
        .catch(error => {
            console.error('Error fetching singers:', error);
            showToast("Could not fetch artists list.", "error");
        });
}

/**
 * Load categories and populate the dropdown in the Add Song modal.
 */
async function loadCategories() {
    console.log("loadCategories function has started executing."); // DEBUG LOGGING
    const categorySelect = document.getElementById('addCategory');
    if (!categorySelect) return; // Exit if select element not found

    try {
        const response = await api.get('/category/selectAll'); // Use CategoryController endpoint
        if (response.data.code === '200') {
            const categories = response.data.data;
            if (categories && categories.length > 0) {
                categorySelect.innerHTML = '<option value="" disabled selected>Select a category</option>'; // Reset options
                categories.forEach(category => {
                    const option = document.createElement('option');
                    option.value = category.id; // Use category ID as value
                    option.textContent = category.name;
                    categorySelect.appendChild(option);
                });
            } else {
                categorySelect.innerHTML = '<option value="" disabled>No categories found</option>';
            }
        } else {
            console.error('Failed to load categories:', response.data.msg);
            categorySelect.innerHTML = '<option value="" disabled>Error loading categories</option>';
            showToast('Failed to load categories.', 'error');
        }
    } catch (error) {
        console.error('Error fetching categories:', error);
        categorySelect.innerHTML = '<option value="" disabled>Error loading categories</option>';
        showToast('Failed to load categories.', 'error');
    }
}

// Load song list data
function loadSongs() {
    fetchAndDisplaySongs(true);
} 
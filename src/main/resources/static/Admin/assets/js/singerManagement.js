/**
 * Artist (Singer) Management JavaScript
 * Handles CRUD operations for artists.
 */

// Import config and API utility
import { API_URL } from '../../../Common/js/config.js';
import api from '../../../Common/js/api.js';

// Global variables
let singersTable;
let currentSingerId = null;
const API_BASE_URL = '/singer'; // Base URL for artist APIs
const DEFAULT_ARTIST_PIC = 'assets/images/default-artist.png'; // Define default picture path

document.addEventListener('DOMContentLoaded', function() {
    initializeDataTable();
    setupEventListeners();
    loadSingers();
});

/**
 * Initialize DataTable for singers
 */
function initializeDataTable() {
    if (typeof jQuery === 'undefined' || typeof jQuery.fn.DataTable === 'undefined') {
        console.error('jQuery or DataTable not loaded');
        return;
    }

    singersTable = $('#singersTable').DataTable({
        processing: true,
        serverSide: false, // Data loaded client-side after initial fetch
        data: [], // Initialize with empty data
        columns: [
            { data: 'id' },
            { 
                data: 'pic',
                render: function(data) {
                    const picUrl = data ? data : DEFAULT_ARTIST_PIC;
                    return `<img src="${picUrl}" alt="Artist" class="img-thumbnail" style="width: 50px; height: 50px; object-fit: cover;">`;
                },
                 orderable: false
            },
            { data: 'name' },
            { 
                data: 'sex',
                render: function(data) {
                    switch(parseInt(data)) {
                        case 0: return '<span class="badge bg-info">Female</span>';
                        case 1: return '<span class="badge bg-primary">Male</span>';
                        case 2: return '<span class="badge bg-secondary">Group</span>';
                        default: return '<span class="badge bg-light text-dark">Other</span>';
                    }
                }
            },
            { 
                data: 'birth',
                render: function(data) {
                    try {
                        if (!data) return '-';
                        const date = new Date(data);
                        // Format date as YYYY-MM-DD
                        return date.toISOString().split('T')[0];
                    } catch (e) {
                        return 'Invalid Date';
                    }
                }
            },
            { data: 'location' },
            { 
                data: 'introduction',
                render: function(data) {
                    return data && data.length > 50 ? data.substring(0, 50) + '...' : (data || '-');
                }
            },
            {
                data: null,
                orderable: false,
                render: function(data, type, row) {
                    return `
                        <div class="btn-group" role="group">
                            <button class="btn btn-sm btn-primary edit-btn" data-id="${row.id}" title="Edit Artist Info"><i class="fas fa-edit"></i></button>
                            <button class="btn btn-sm btn-info update-pic-btn" data-id="${row.id}" data-current-pic="${row.pic || ''}" title="Update Picture"><i class="fas fa-image"></i></button> 
                            <button class="btn btn-sm btn-danger delete-btn" data-id="${row.id}" data-name="${row.name}" title="Delete Artist"><i class="fas fa-trash"></i></button>
                        </div>
                    `;
                }
            }
        ],
        responsive: true,
        order: [[2, 'asc']], // Default sort by name
        language: {
            search: "Search:",
            lengthMenu: "Show _MENU_ entries",
            zeroRecords: "No matching artists found",
            info: "Showing _START_ to _END_ of _TOTAL_ artists",
            infoEmpty: "Showing 0 artists",
            infoFiltered: "(filtered from _MAX_ total artists)",
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
 * Set up event listeners for the page
 */
function setupEventListeners() {
    // Add Artist form submission
    $('#submitAddSinger').on('click', handleAddSinger);
    
    // Edit Artist form submission
    $('#submitEditSinger').on('click', handleEditSinger);
    
    // Delete artist confirmation
    $('#confirmDeleteSinger').on('click', handleDeleteSinger);
    
    // Edit button click in table
    $('#singersTable').on('click', '.edit-btn', function() {
        currentSingerId = $(this).data('id');
        loadSingerForEdit(currentSingerId);
    });
    
    // Update Picture button click in table
    $('#singersTable').on('click', '.update-pic-btn', function() {
        currentSingerId = $(this).data('id');
        const currentPic = $(this).data('current-pic');
        openUpdatePicModal(currentSingerId, currentPic);
    });
    
    // Submit picture update
    $('#submitUpdatePic').on('click', handleUpdatePicture);
    
    // Delete button click in table
    $('#singersTable').on('click', '.delete-btn', function() {
        currentSingerId = $(this).data('id');
        const singerName = $(this).data('name');
        showDeleteModal(currentSingerId, singerName);
    });
    
    // Apply Filters button
    $('#applyFilters').on('click', handleApplyFilters);
    
    // Clear Filters button
    $('#clearFilters').on('click', () => {
        $('#nameFilter').val('');
        $('#sexFilter').val('');
        loadSingers(); // Reload all singers
    });

    // Global search button
    $('#globalSearchBtn').on('click', () => {
        const searchTerm = $('#globalSearch').val().trim();
        handleSearch(searchTerm);
    });

    // Global search input enter key
    $('#globalSearch').on('keypress', (e) => {
        if (e.key === 'Enter') {
            const searchTerm = $('#globalSearch').val().trim();
            handleSearch(searchTerm);
        }
    });
}

/**
 * Load all singers from the API
 */
async function loadSingers() {
    showLoading(true);
    try {
        const response = await api.get(`${API_BASE_URL}/allSinger`);
        console.log("Singer API response:", response);
        if (response && response.data && (response.data.code === '200' || response.data.code === 200)) {
             const singers = response.data.data || [];
            updateSingersTable(singers);
        } else {
            showToast('Failed to load artists: ' + (response?.data?.msg || 'Invalid response'), 'error');
            updateSingersTable([]); // Clear table on error
        }
    } catch (error) {
        console.error('Error loading singers:', error);
        showToast('Error connecting to the server. Please check your connection.', 'error');
        updateSingersTable([]); // Clear table on error
    } finally {
        showLoading(false);
    }
}

/**
 * Update the DataTable with singer data
 */
function updateSingersTable(singers) {
    if (!singersTable) return;
    singersTable.clear();
    if (Array.isArray(singers)) {
        singersTable.rows.add(singers);
    } else {
         console.error('Invalid singer data received:', singers);
         showToast('Received invalid artist data format.', 'error');
    }
    singersTable.draw();
}

/**
 * Show/Hide loading indicator on the table
 */
function showLoading(isLoading) {
    if (isLoading) {
        $('#singersTable').addClass('loading');
    } else {
        $('#singersTable').removeClass('loading');
    }
}

/**
 * Handle add singer form submission
 */
async function handleAddSinger() {
    const form = $('#addSingerForm')[0];
    const formData = new FormData(form);
    // No file input needed for this step

    // Basic form validation (check required fields)
    if (!form.checkValidity()) {
        showToast('Please fill all required fields.', 'warning');
        form.reportValidity(); 
        return;
    }
    
    // Prepare data object (excluding the file input)
    const singerData = {};
    formData.forEach((value, key) => {
        if (key !== 'file') { // Exclude the file input field name if present
             singerData[key] = value;
        }
    });

    // Ensure 'pic' exists, set to empty string if not (backend expects this parameter)
    if (!singerData.hasOwnProperty('pic') || !singerData.pic) {
        singerData.pic = ''; // Backend expects 'pic', send empty if no picture yet
    }

    $('#submitAddSinger').prop('disabled', true);
    showToast('Adding artist details (picture needs to be added separately)...', 'info');

    // Convert data to x-www-form-urlencoded format
    const params = new URLSearchParams();
    for (const key in singerData) {
        if (Object.hasOwnProperty.call(singerData, key)) {
            params.append(key, singerData[key]);
        }
    }
    console.log("Sending data (form-urlencoded):", params.toString()); // Log data being sent

    try {
        // Send data as application/x-www-form-urlencoded
        const addResponse = await api.post(
            `${API_BASE_URL}/add`,
            params, // Send URLSearchParams object
            {
                headers: {
                    // Explicitly set Content-Type
                    'Content-Type': 'application/x-www-form-urlencoded' 
                }
            }
        );

        console.log("Add artist response:", addResponse); // Log the response

        if (addResponse && addResponse.data && (addResponse.data.code === '200' || addResponse.data.code === 200)) {
            showToast('Artist added successfully! You can now upload a picture.', 'success');
            $('#addSingerModal').modal('hide');
            form.reset();
            $('#addPicPreview').hide();
            loadSingers(); // Reload table
        } else {
            // Try to get a more specific error message
            const errorMsg = addResponse?.data?.msg || addResponse?.data?.message || 'Unknown error during add';
            showToast('Failed to add artist: ' + errorMsg, 'error');
        }
    } catch (error) {
        console.error('Error adding artist:', error);
        // Log detailed error information if available
        console.error('Axios error details:', error.response?.data, error.response?.status, error.message);
        const errorMsg = error.response?.data?.msg || error.response?.data?.message || error.message || 'Please try again.';
        showToast('Error adding artist. ' + errorMsg, 'error');
    } finally {
        $('#submitAddSinger').prop('disabled', false);
    }
}

/**
 * Load singer data into the edit modal
 */
async function loadSingerForEdit(singerId) {
    showToast('Loading artist details...', 'info');
    try {
        const response = await api.get(`${API_BASE_URL}/selectByPrimaryKey?id=${singerId}`);
        if (response && response.data && (response.data.code === '200' || response.data.code === 200)) {
            const singer = response.data.data;
            $('#editId').val(singer.id);
            $('#editName').val(singer.name);
            $('#editSex').val(singer.sex);
            try {
                 const birthDate = singer.birth ? new Date(singer.birth).toISOString().split('T')[0] : '';
                 $('#editBirth').val(birthDate);
            } catch (e) {
                 console.error('Invalid birth date format:', singer.birth);
                 $('#editBirth').val(''); 
            }
            $('#editLocation').val(singer.location);
            $('#editIntroduction').val(singer.introduction);
            $('#editPic').val(singer.pic || ''); // Store current pic URL or empty string
            // Use the defined default picture path when setting the current image source
            const currentPicUrl = singer.pic ? singer.pic : DEFAULT_ARTIST_PIC; 
            $('#editCurrentPic').attr('src', currentPicUrl).show();
            $('#editPicPreview').hide().attr('src', '#'); // Hide and clear new preview initially
            $('#editPicFile').val(''); // Clear file input
            
            $('#editSingerModal').modal('show');
        } else {
             showToast('Failed to load artist details: ' + (response?.data?.msg || 'Error'), 'error');
        }
    } catch (error) {
        console.error('Error fetching singer details:', error);
        showToast('Error fetching artist details. Please try again.', 'error');
    }
}

/**
 * Handle edit singer form submission
 */
async function handleEditSinger() {
    const form = $('#editSingerForm')[0];
    const formData = new FormData(form);
    const fileInput = document.getElementById('editPicFile');
    const singerId = formData.get('id');

    if (!form.checkValidity()) {
        showToast('Please fill all required fields.', 'warning');
        form.reportValidity();
        return;
    }

    $('#submitEditSinger').prop('disabled', true);

    try {
        let picUrl = formData.get('pic'); // Get existing URL

        // If a new picture is selected, upload it first
        if (fileInput.files && fileInput.files[0]) {
            showToast('Uploading new picture...', 'info');
            const picFormData = new FormData();
            picFormData.append('file', fileInput.files[0]);
            picFormData.append('id', singerId); // Pass singer ID for potential replacement logic
            
            // Use the specific endpoint for updating singer picture
            const picResponse = await api.post(`${API_BASE_URL}/updateSingerPic`, picFormData); 

            if (picResponse && picResponse.data && (picResponse.data.code === '200' || picResponse.data.code === 200)) {
                picUrl = picResponse.data.data; // Get the new URL from the response
                showToast('Picture updated successfully.', 'success');
            } else {
                showToast('Failed to update picture: ' + (picResponse?.data?.msg || 'Upload error'), 'error');
                $('#submitEditSinger').prop('disabled', false);
                return; // Stop if picture update failed
            }
        }
        
        // Update singer details
        formData.set('pic', picUrl); // Set final pic URL (either old or new)
        formData.delete('file'); // Remove file input from main form data
        
        const singerData = {};
        formData.forEach((value, key) => { singerData[key] = value; });

        showToast('Saving artist details...', 'info');
        const updateResponse = await api.post(`${API_BASE_URL}/update`, singerData);

        if (updateResponse && updateResponse.data && (updateResponse.data.code === '200' || updateResponse.data.code === 200)) {
            showToast('Artist updated successfully!', 'success');
            $('#editSingerModal').modal('hide');
            loadSingers(); // Reload table
        } else {
            showToast('Failed to update artist: ' + (updateResponse?.data?.msg || 'Unknown error'), 'error');
        }

    } catch (error) {
        console.error('Error updating artist:', error);
        showToast('Error updating artist. ' + (error.response?.data?.msg || error.message || 'Please try again.'), 'error');
    } finally {
        $('#submitEditSinger').prop('disabled', false);
    }
}

/**
 * Show delete confirmation modal
 */
function showDeleteModal(singerId, singerName) {
    currentSingerId = singerId;
    $('#deleteSingerName').text(singerName || 'this artist');
    $('#deleteSingerModal').modal('show');
}

/**
 * Handle singer deletion
 */
async function handleDeleteSinger() {
    if (!currentSingerId) return;

    $('#confirmDeleteSinger').prop('disabled', true);
    showToast('Deleting artist...', 'info');

    try {
        const response = await api.get(`${API_BASE_URL}/delete?id=${currentSingerId}`); 
        if (response && response.data && (response.data.code === '200' || response.data.code === 200)) {
             showToast('Artist deleted successfully!', 'success');
             $('#deleteSingerModal').modal('hide');
             loadSingers(); // Reload table
        } else {
            showToast('Failed to delete artist: ' + (response?.data?.msg || 'Unknown error'), 'error');
        }
    } catch (error) {
        console.error('Error deleting artist:', error);
         showToast('Error deleting artist. ' + (error.response?.data?.msg || error.message || 'Please try again.'), 'error');
    } finally {
        $('#confirmDeleteSinger').prop('disabled', false);
        currentSingerId = null;
    }
}

/**
 * Handle applying filters
 */
async function handleApplyFilters() {
    const nameFilter = $('#nameFilter').val().trim();
    const sexFilter = $('#sexFilter').val();
    let url = `${API_BASE_URL}/allSinger`; // Default

    if (nameFilter) {
        url = `${API_BASE_URL}/singerOfName?name=${encodeURIComponent(nameFilter)}`;
    } else if (sexFilter !== "") {
        url = `${API_BASE_URL}/singerOfSex?sex=${encodeURIComponent(sexFilter)}`;
    }
    // Note: Backend doesn't seem to support combined filters easily based on controller
    // If both are selected, name takes precedence here.

    showLoading(true);
    try {
        const response = await api.get(url);
         if (response && response.data && (response.data.code === '200' || response.data.code === 200)) {
             const singers = response.data.data || [];
            updateSingersTable(singers);
        } else {
            showToast('Failed to apply filters: ' + (response?.data?.msg || 'Error'), 'error');
            updateSingersTable([]);
        }
    } catch (error) {
        console.error('Error applying filters:', error);
        showToast('Error applying filters. Please try again.', 'error');
        updateSingersTable([]);
    } finally {
        showLoading(false);
    }
}

/**
 * Handle global search
 */
async function handleSearch(searchTerm) {
    let url = `${API_BASE_URL}/allSinger`; // Default
    if (searchTerm) {
        url = `${API_BASE_URL}/singerOfName?name=${encodeURIComponent(searchTerm)}`;
    }

    showLoading(true);
    try {
        const response = await api.get(url);
        if (response && response.data && (response.data.code === '200' || response.data.code === 200)) {
            const singers = response.data.data || [];
            updateSingersTable(singers);
             showToast(singers.length > 0 ? `${singers.length} artists found.` : 'No artists found for your search.', 'info');
        } else {
            showToast('Search failed: ' + (response?.data?.msg || 'Error'), 'error');
            updateSingersTable([]);
        }
    } catch (error) {
        console.error('Error during search:', error);
        showToast('Search failed. Please try again.', 'error');
        updateSingersTable([]);
    } finally {
        showLoading(false);
    }
}

/**
 * Open the update picture modal
 */
function openUpdatePicModal(singerId, currentPicUrl) {
    currentSingerId = singerId; // Store ID for submission
    $('#updatePicSingerId').val(singerId);
    // Display current picture (or default)
    const displayPic = currentPicUrl ? currentPicUrl : DEFAULT_ARTIST_PIC;
    $('#updatePicCurrentPreview').attr('src', displayPic).show();
    // Reset file input and new preview
    $('#updatePicFile').val('');
    $('#updatePicNewPreview').hide().attr('src', '#');
    
    $('#updatePicModal').modal('show');
}

/**
 * Handle picture update submission
 */
async function handleUpdatePicture() {
    const form = $('#updatePicForm')[0];
    const fileInput = document.getElementById('updatePicFile');
    const singerId = $('#updatePicSingerId').val();

    if (!fileInput.files || fileInput.files.length === 0) {
        showToast('Please select a picture to upload.', 'warning');
        return;
    }
    
     if (!singerId) {
        showToast('Invalid Artist ID.', 'error');
        return;
    }

    const picFormData = new FormData();
    picFormData.append('file', fileInput.files[0]);
    picFormData.append('id', singerId); 

    $('#submitUpdatePic').prop('disabled', true);
    showToast('Uploading picture...', 'info');

    try {
        // Use the specific endpoint for updating singer picture
        const picResponse = await api.post(`${API_BASE_URL}/updateSingerPic`, picFormData);

        if (picResponse?.data?.code === '200' || picResponse?.data?.code === 200) {
            showToast('Picture updated successfully!', 'success');
            $('#updatePicModal').modal('hide');
            loadSingers(); // Reload table to show the new picture
        } else {
            showToast('Failed to update picture: ' + (picResponse?.data?.msg || 'Upload error'), 'error');
        }
    } catch (error) {
        console.error('Error updating picture:', error);
        showToast('Error updating picture. ' + (error.response?.data?.msg || error.message), 'error');
    } finally {
        $('#submitUpdatePic').prop('disabled', false);
    }
}

/**
 * Show toast notification using Toastify
 */
function showToast(message, type = 'info') {
    if (typeof Toastify !== 'function') {
        console.warn('Toastify not loaded. Using console log.');
        const logType = type === 'error' ? 'error' : (type === 'warning' ? 'warn' : 'log');
        console[logType](message);
        if (type === 'error') alert('Error: ' + message); // Alert only for errors
        return;
    }

    let backgroundColor;
    switch(type) {
        case 'success': backgroundColor = '#4caf50'; break;
        case 'error':   backgroundColor = '#f44336'; break;
        case 'warning': backgroundColor = '#ff9800'; break;
        default:        backgroundColor = '#2196f3'; break;
    }

    Toastify({
        text: message,
        duration: 3000,
        close: true,
        gravity: "top", 
        position: "right", 
        backgroundColor: backgroundColor,
        stopOnFocus: true, 
    }).showToast();
} 
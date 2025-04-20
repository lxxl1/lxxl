/**
 * Artist (Singer) Management JavaScript
 * Handles CRUD operations for artists.
 */

// Import config and API utility
import { API_URL } from '../../../Common/js/config.js';
import api from '../../../Common/js/api.js';

// Global variables
let singerTable;
let currentSingerId = null;
const API_BASE_URL = '/singer'; // Base URL for artist APIs
const DEFAULT_ARTIST_PIC = 'assets/images/default-artist.png'; // Define default picture path

document.addEventListener('DOMContentLoaded', function() {
    initializeDataTable();
    setupEventListeners();
    loadSingers(); // Load singers on page load
});

/**
 * Initialize DataTable for singers
 */
function initializeDataTable() {
    if (typeof jQuery === 'undefined' || typeof jQuery.fn.DataTable === 'undefined') {
        console.error('jQuery or DataTable not loaded');
        return;
    }

    singerTable = $('#singerTable').DataTable({ // Target #singerTable
        processing: true,
        serverSide: false, // Data loaded client-side after initial fetch
        data: [], // Initialize with empty data
        columns: [
            { data: 'id' },
            {
                data: 'pic',
                render: function(data) {
                    const picUrl = data ? data : DEFAULT_ARTIST_PIC;
                    // Ensure picUrl is treated as a relative path if it starts with /
                    // If your setup requires absolute URLs, adjust logic here or in api.js
                    const finalUrl = (picUrl && picUrl.startsWith('/')) ? `..${picUrl}` : picUrl;
                    return `<img src="${finalUrl}" alt="Artist" class="img-thumbnail" style="width: 50px; height: 50px; object-fit: cover;" onerror="this.onerror=null; this.src='${DEFAULT_ARTIST_PIC}';">`; // Added onerror fallback
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
                        // Assuming backend returns a standard date format parsable by new Date()
                        const date = new Date(data);
                        // Format date as YYYY-MM-DD
                        if (isNaN(date.getTime())) { // Check if date is valid
                           return 'Invalid Date';
                        }
                        return date.toISOString().split('T')[0];
                    } catch (e) {
                        console.error("Error parsing birth date:", data, e);
                        return 'Invalid Date';
                    }
                }
            },
            { data: 'location' },
            {
                data: 'introduction',
                render: function(data) {
                    const intro = escapeHTML(data || '-'); // Escape HTML
                    return intro.length > 50 ? intro.substring(0, 50) + '...' : intro;
                }
            },
            {
                data: null,
                orderable: false,
                render: function(data, type, row) {
                    // Escape name for data-name attribute
                    const safeName = escapeHTML(row.name);
                    return `
                        <div class="btn-group" role="group">
                            <button class="btn btn-sm btn-primary edit-btn" data-id="${row.id}" title="Edit Artist Info"><i class="fas fa-edit"></i></button>
                            <button class="btn btn-sm btn-info update-pic-btn" data-id="${row.id}" data-current-pic="${row.pic || ''}" title="Update Picture"><i class="fas fa-image"></i></button>
                            <button class="btn btn-sm btn-danger delete-btn" data-id="${row.id}" data-name="${safeName}" title="Delete Artist"><i class="fas fa-trash"></i></button>
                        </div>
                    `;
                }
            }
        ],
        responsive: true,
        order: [[2, 'asc']], // Default sort by name (index 2)
        language: {
            search: "", // Use placeholder if needed via other means or keep empty
            searchPlaceholder: "Search Artists...",
            lengthMenu: "Show _MENU_ entries",
            zeroRecords: "No matching artists found",
            info: "Showing _START_ to _END_ of _TOTAL_ artists",
            infoEmpty: "Showing 0 artists",
            infoFiltered: "(filtered from _MAX_ total artists)",
            processing: "<span class='fa-stack fa-lg'><i class='fas fa-spinner fa-spin fa-stack-2x'></i></span> Processing...", // Example processing indicator
            paginate: {
                first: "<i class='fas fa-angle-double-left'></i>",
                last: "<i class='fas fa-angle-double-right'></i>",
                next: "<i class='fas fa-angle-right'></i>",
                previous: "<i class='fas fa-angle-left'></i>"
            }
        },
        // Add standard Bootstrap styling integration
        dom: '<"row"<"col-sm-12 col-md-6"l><"col-sm-12 col-md-6"f>>' + // Length and Filter
             '<"row"<"col-sm-12"tr>>' + // Table
             '<"row"<"col-sm-12 col-md-5"i><"col-sm-12 col-md-7"p>>', // Info and Pagination
        drawCallback: function() {
            // Re-initialize tooltips after table draw if using Bootstrap tooltips
            const tooltipTriggerList = [].slice.call(document.querySelectorAll('#singerTable [title]'));
            tooltipTriggerList.map(function (tooltipTriggerEl) {
                 const existingTooltip = bootstrap.Tooltip.getInstance(tooltipTriggerEl);
                 if (existingTooltip) {
                     existingTooltip.dispose();
                 }
                 return new bootstrap.Tooltip(tooltipTriggerEl);
            });
        }
    });
}

/**
 * Set up event listeners for the page
 */
function setupEventListeners() {
    // Add Artist button (assuming it uses the standard modal trigger)
    // We handle the form submission, not the modal opening itself if using data-bs-toggle
    const addSingerBtn = document.querySelector('[data-bs-target="#addSingerModal"]');
    if (addSingerBtn) {
        addSingerBtn.addEventListener('click', () => {
            // Reset form and preview when Add modal is triggered to open
            $('#addSingerForm')[0].reset();
            $('#addSingerModalLabel').text('Add New Artist');
            // Reset image preview specifically if needed
            resetImagePreview('addPicPreview', 'addPicPreviewText', 'Add');
        });
    }

    // Add Artist form submission in Modal
    $('#submitAddSinger').on('click', handleAddSinger);

    // Edit Artist form submission in Modal
    $('#submitEditSinger').on('click', handleEditSinger);

    // Delete artist confirmation in Modal
    $('#confirmDeleteSinger').on('click', handleDeleteSinger);

    // Submit picture update in Modal
    $('#submitUpdatePic').on('click', handleUpdatePicture);

    // --- Table Button Event Delegation ---
    $('#singerTable tbody').on('click', 'button', function() {
        const action = $(this).attr('class'); // Get all classes
        const singerId = $(this).data('id');

        if (action.includes('edit-btn')) {
            console.log('Edit button clicked for ID:', singerId);
            loadSingerForEdit(singerId);
        } else if (action.includes('update-pic-btn')) {
            console.log('Update pic button clicked for ID:', singerId);
            const currentPic = $(this).data('current-pic');
            openUpdatePicModal(singerId, currentPic);
        } else if (action.includes('delete-btn')) {
            console.log('Delete button clicked for ID:', singerId);
            const singerName = $(this).data('name');
            showDeleteModal(singerId, singerName);
        }
    });

    // --- Filter Controls Event Listeners ---
    const applyFilterBtn = document.getElementById('applyFilterBtn');
    const resetFilterBtn = document.getElementById('resetFilterBtn');

    if (applyFilterBtn) {
        applyFilterBtn.addEventListener('click', handleApplyFilters);
    }
    if (resetFilterBtn) {
        resetFilterBtn.addEventListener('click', () => {
            $('#nameFilter').val('');
            $('#genderFilter').val(''); // Changed from sexFilter
            $('#locationFilter').val('');
            loadSingers(); // Reload all singers
            // Optionally clear any filter indicator UI
        });
    }

    // Add Enter key listener to filter inputs for convenience
    $('#nameFilter, #locationFilter').on('keypress', function(e) {
        if (e.key === 'Enter') {
            handleApplyFilters();
        }
    });
    $('#genderFilter').on('change', handleApplyFilters); // Apply immediately on gender change

    // --- Modal Image Previews ---
    // Image preview for Add Modal (assuming input ID is addPicFile)
    const addPicInput = document.getElementById('addPicFile'); // Assuming this is the input ID
    if (addPicInput) {
        addPicInput.addEventListener('change', function(event) {
            setImagePreview('addPicPreview', 'addPicPreviewText', event, 'Add');
        });
    }

     // Image preview for Update Picture Modal
     document.getElementById('updatePicFile')?.addEventListener('change', function(event) {
        setImagePreview('updatePicNewPreview', null, event, 'Update'); // No text element to hide/show
    });

    // Optional: Reset edit form when edit modal is hidden
    $('#editSingerModal').on('hidden.bs.modal', function () {
        // Could reset parts of the edit form if needed
        // console.log('Edit modal hidden');
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
             console.log(`Found ${singers.length} singers.`);
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
    console.log('Attempting to update table with singers:', singers); // 确认数据
    if (!singerTable) {
        console.error('singerTable is not initialized!');
        return;
    }
    try {
        singerTable.clear();
        console.log('Table cleared.');
        if (Array.isArray(singers)) {
            singerTable.rows.add(singers);
            console.log('Rows added:', singers.length);
        } else {
             console.error('Invalid singer data received:', singers);
             showToast('Received invalid artist data format.', 'error');
        }
        singerTable.draw();
        console.log('Table drawn.');
    } catch (e) {
        console.error('Error during DataTables update:', e);
        showToast('An error occurred while updating the table.', 'error');
    }
}

/**
 * Show/Hide loading indicator on the table
 */
function showLoading(isLoading) {
    const tableElement = $('#singerTable');
    if (!tableElement.length) return;

    if (isLoading) {
        tableElement.addClass('loading');
        // Optionally add a visual overlay/spinner if the CSS class isn't sufficient
    } else {
        tableElement.removeClass('loading');
        // Remove any added overlay/spinner
    }
}

/**
 * Handle add singer form submission
 */
async function handleAddSinger() {
    const form = $('#addSingerForm')[0];

    // Basic form validation (HTML5)
    if (!form.checkValidity()) {
        showToast('Please fill all required fields correctly.', 'warning');
        // Optionally trigger Bootstrap validation styles
        form.classList.add('was-validated');
        return;
    }
    form.classList.remove('was-validated'); // Remove validation class if valid

    // Prepare data object
    const singerData = {
        name: $('#addName').val().trim(),
        sex: $('#addSex').val(),
        birth: $('#addBirth').val(), // Expects yyyy-MM-dd
        location: $('#addLocation').val().trim(),
        introduction: $('#addIntroduction').val().trim(),
        pic: '' // Backend expects 'pic', send empty initially
    };

    $('#submitAddSinger').prop('disabled', true);
    showToast('Adding artist... Picture can be updated separately.', 'info');

    // Convert data to x-www-form-urlencoded format
    const params = new URLSearchParams();
    for (const key in singerData) {
        if (Object.hasOwnProperty.call(singerData, key)) {
            params.append(key, singerData[key]);
        }
    }
    console.log("Sending Add data (form-urlencoded):", params.toString());

    try {
        const addResponse = await api.post(
            `${API_BASE_URL}/add`,
            params,
            { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
        );

        console.log("Add artist response:", addResponse);

        if (addResponse?.data?.code === '200' || addResponse?.data?.code === 200) {
            showToast('Artist added successfully! Use the Update Picture button if needed.', 'success');
            $('#addSingerModal').modal('hide');
            loadSingers(); // Reload table
        } else {
            const errorMsg = addResponse?.data?.msg || addResponse?.data?.message || 'Unknown error during add';
            showToast('Failed to add artist: ' + errorMsg, 'error');
        }
    } catch (error) {
        console.error('Error adding artist:', error);
        console.error('Axios error details:', error.response?.data, error.response?.status, error.message);
        const errorMsg = error.response?.data?.msg || error.response?.data?.message || error.message || 'Please try again.';
        showToast('Error adding artist. ' + errorMsg, 'error');
    } finally {
        $('#submitAddSinger').prop('disabled', false);
        form.classList.remove('was-validated');
    }
}

/**
 * Load singer data into the edit modal
 */
async function loadSingerForEdit(singerId) {
    showToast('Loading artist details...', 'info');
    try {
        const response = await api.get(`${API_BASE_URL}/selectByPrimaryKey?id=${singerId}`);
        console.log("Load for edit response:", response);
        if (response?.data?.code === '200' || response?.data?.code === 200) {
            const singer = response.data.data;
            if (!singer) {
                 showToast('Artist data not found in response.', 'error');
                 return;
            }

            $('#editSingerModalLabel').text('Edit Artist Information');
            $('#editId').val(singer.id);
            $('#editName').val(singer.name);
            $('#editSex').val(singer.sex);

            // Format birth date carefully
            try {
                 const birthDate = singer.birth ? new Date(singer.birth).toISOString().split('T')[0] : '';
                 if (birthDate && birthDate !== 'Invalid Date') {
                    $('#editBirth').val(birthDate);
                 } else {
                     $('#editBirth').val(''); // Clear if invalid
                 }
            } catch (e) {
                 console.error('Invalid birth date format received:', singer.birth);
                 $('#editBirth').val('');
            }

            $('#editLocation').val(singer.location);
            $('#editIntroduction').val(singer.introduction);
            // Note: The hidden editPic field is not strictly needed anymore
            // as picture is updated separately, but keep it for now if other code relies on it.
            $('#editPic').val(singer.pic || '');

            // Clear validation state
            $('#editSingerForm').removeClass('was-validated');

            $('#editSingerModal').modal('show');
        } else {
             showToast('Failed to load artist details: ' + (response?.data?.msg || 'Error'), 'error');
        }
    } catch (error) {
        console.error('Error fetching singer details for edit:', error);
        showToast('Error fetching artist details. Please try again.', 'error');
    }
}

/**
 * Handle edit singer form submission (Text details only)
 */
async function handleEditSinger() {
    const form = $('#editSingerForm')[0];
    const singerId = $('#editId').val(); // Get ID directly

    // Basic form validation
    if (!form.checkValidity()) {
        showToast('Please fill all required fields correctly.', 'warning');
        form.classList.add('was-validated');
        return;
    }
    form.classList.remove('was-validated');

    if (!singerId) {
        showToast('Error: Missing Artist ID for update.', 'error');
        return;
    }

    // Prepare data object ONLY with text fields for update
    const singerData = {
        id: singerId,
        name: $('#editName').val().trim(),
        sex: $('#editSex').val(),
        birth: $('#editBirth').val(), // Expects yyyy-MM-dd format from input type="date"
        location: $('#editLocation').val().trim(),
        introduction: $('#editIntroduction').val().trim()
    };

    // Convert data to x-www-form-urlencoded format
    const params = new URLSearchParams();
    for (const key in singerData) {
        if (Object.hasOwnProperty.call(singerData, key) && singerData[key] !== null && singerData[key] !== undefined) {
            params.append(key, singerData[key]);
        }
    }

    console.log("Sending data to /singer/update (form-urlencoded):", params.toString());

    $('#submitEditSinger').prop('disabled', true);
    showToast('Saving artist details...', 'info');

    try {
        const updateResponse = await api.post(
            `${API_BASE_URL}/update`,
            params,
            { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
        );

        console.log("Update artist response:", updateResponse);

        if (updateResponse?.data?.code === '200' || updateResponse?.data?.code === 200) {
            showToast('Artist details updated successfully! Use the "Update Picture" button to change the image.', 'success');
            $('#editSingerModal').modal('hide');
            loadSingers(); // Reload table
        } else {
            const errorMsg = updateResponse?.data?.msg || updateResponse?.data?.message || 'Unknown error during update';
            showToast('Failed to update artist: ' + errorMsg, 'error');
        }

    } catch (error) {
        console.error('Error updating artist details:', error);
        const errorMsg = error.response?.data?.msg || error.response?.data?.message || error.message || 'Please try again.';
        showToast('Error updating artist details. ' + errorMsg, 'error');
    } finally {
        $('#submitEditSinger').prop('disabled', false);
        form.classList.remove('was-validated');
    }
}

/**
 * Show delete confirmation modal
 */
function showDeleteModal(singerId, singerName) {
    currentSingerId = singerId;
    // Escape name for display in modal
    $('#deleteSingerName').text(escapeHTML(singerName) || 'this artist');
    // Use Bootstrap 5 modal instance
    const deleteModal = new bootstrap.Modal(document.getElementById('deleteSingerModal'));
    deleteModal.show();
}

/**
 * Handle singer deletion
 */
async function handleDeleteSinger() {
    if (!currentSingerId) return;

    const deleteButton = $('#confirmDeleteSinger');
    deleteButton.prop('disabled', true);
    showToast('Deleting artist...', 'info');

    try {
        const response = await api.get(`${API_BASE_URL}/delete?id=${currentSingerId}`);
        if (response?.data?.code === '200' || response?.data?.code === 200) {
             showToast('Artist deleted successfully!', 'success');
             // Hide modal using Bootstrap 5 instance
             const deleteModalEl = document.getElementById('deleteSingerModal');
             const modalInstance = bootstrap.Modal.getInstance(deleteModalEl);
             modalInstance?.hide();
             loadSingers(); // Reload table
        } else {
            showToast('Failed to delete artist: ' + (response?.data?.msg || 'Unknown error'), 'error');
        }
    } catch (error) {
        console.error('Error deleting artist:', error);
         showToast('Error deleting artist. ' + (error.response?.data?.msg || error.message || 'Please try again.'), 'error');
    } finally {
        deleteButton.prop('disabled', false);
        currentSingerId = null; // Reset current ID
    }
}

/**
 * Handle applying filters
 */
async function handleApplyFilters() {
    const nameFilter = $('#nameFilter').val().trim();
    const genderFilter = $('#genderFilter').val(); // Use genderFilter ID
    const locationFilter = $('#locationFilter').val().trim();

    console.log(`Applying filters: Name='${nameFilter}', Gender='${genderFilter}', Location='${locationFilter}'`);

    // --- Filtering Logic --- 
    // Option 1: Backend filtering (Preferred if backend supports it well)
    // Construct URL based on which filters are active.
    // This example assumes separate endpoints. If backend supports combined params, adjust.
    let url = `${API_BASE_URL}/allSinger`; // Default fetch all
    const params = new URLSearchParams();

    if (nameFilter) {
        params.append('name', nameFilter); // Assuming backend endpoint /singerOfName takes 'name'
        url = `${API_BASE_URL}/singerOfName`;
        if (genderFilter) params.append('sex', genderFilter); // Example: If combined search supported
        if (locationFilter) params.append('location', locationFilter);

    } else if (genderFilter) {
        params.append('sex', genderFilter); // Assuming backend endpoint /singerOfSex takes 'sex'
        url = `${API_BASE_URL}/singerOfSex`;
        if (locationFilter) params.append('location', locationFilter); // If combined

    } else if (locationFilter) {
        // Assuming no dedicated location endpoint, fetch all and filter client-side (or ask backend for it)
         params.append('location', locationFilter); // Add for client-side filtering
        // url = `${API_BASE_URL}/singerOfLocation`; // If endpoint existed
        console.warn("Location filter applied, but no dedicated backend endpoint assumed. Fetching all and filtering client-side (or implement backend endpoint).");
        // Keep url as allSinger, filter later
    }
    // If multiple filters active but no combined backend endpoint, prioritize or fetch all.
    // For simplicity, let's fetch based on the *first* active filter found in the order Name > Gender > Location,
    // or fetch all if only Location is set (and filter client side).

    let queryString = params.toString();
    if (queryString) {
        url += `?${queryString}`;
    }

    showLoading(true);
    showToast('Applying filters...', 'info');
    try {
        console.log("Fetching filtered data from:", url);
        const response = await api.get(url);
         if (response?.data?.code === '200' || response?.data?.code === 200) {
             let singers = response.data.data || [];
             console.log(`Received ${singers.length} singers from API.`);

             // Client-side filtering (if needed, e.g., for location or combined filters)
             if (locationFilter && !(nameFilter || genderFilter)) { // Only filter location client-side if it was the primary filter
                 console.log("Filtering by location client-side...");
                 singers = singers.filter(s => s.location && s.location.toLowerCase().includes(locationFilter.toLowerCase()));
             }
             // Add more client-side filtering here if backend doesn't support combined filters

            updateSingersTable(singers);
            showToast(`${singers.length} artists found matching filters.`, 'success');
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
 * Handle global search (Adapt if using a single search input)
 * This function might be redundant if handleApplyFilters covers the name filter.
 */
// async function handleSearch(searchTerm) { ... }

/**
 * Open the update picture modal
 */
function openUpdatePicModal(singerId, currentPicUrl) {
    currentSingerId = singerId; // Store ID for submission
    $('#updatePicSingerId').val(singerId);
    // Display current picture (or default)
    const displayPic = currentPicUrl ? currentPicUrl : DEFAULT_ARTIST_PIC;
    // Correctly set image source, potentially prefixing relative paths
    const finalUrl = (displayPic && displayPic.startsWith('/')) ? `..${displayPic}` : displayPic;
    $('#updatePicCurrentPreview').attr('src', finalUrl).show().attr('onerror', `this.onerror=null; this.src='${DEFAULT_ARTIST_PIC}';`);
    // Reset file input and new preview
    $('#updatePicFile').val('');
    $('#updatePicNewPreview').hide().attr('src', '#');

    const updateModal = new bootstrap.Modal(document.getElementById('updatePicModal'));
    updateModal.show();
}

/**
 * Handle picture update submission
 */
async function handleUpdatePicture() {
    const form = $('#updatePicForm')[0]; // Ensure correct form ID
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

    const submitButton = $('#submitUpdatePic');
    submitButton.prop('disabled', true);
    showToast('Uploading picture...', 'info');

    try {
        const picResponse = await api.post(`${API_BASE_URL}/updateSingerPic`, picFormData, {
            // Ensure Content-Type is set correctly for FormData by Axios
            // headers: { 'Content-Type': 'multipart/form-data' } // Usually not needed for Axios with FormData
        });
        console.log("Update picture response:", picResponse);

        if (picResponse?.data?.code === '200' || picResponse?.data?.code === 200) {
            showToast('Picture updated successfully!', 'success');
            const updateModalEl = document.getElementById('updatePicModal');
            const modalInstance = bootstrap.Modal.getInstance(updateModalEl);
            modalInstance?.hide();
            loadSingers(); // Reload table to show the new picture
        } else {
            showToast('Failed to update picture: ' + (picResponse?.data?.msg || 'Upload error'), 'error');
        }
    } catch (error) {
        console.error('Error updating picture:', error);
        showToast('Error updating picture. ' + (error.response?.data?.msg || error.message), 'error');
    } finally {
        submitButton.prop('disabled', false);
    }
}

/**
 * Set image preview logic (used by Add and Update modals)
 */
function setImagePreview(previewElementId, textElementId, eventOrUrl, context = 'Image') {
    const imagePreview = document.getElementById(previewElementId);
    const textElement = textElementId ? document.getElementById(textElementId) : null;

    if (!imagePreview) {
        console.warn(`[${context} Preview] Preview element #${previewElementId} not found.`);
        return;
    }

    let file = null;
    let imageUrl = null;

    if (typeof eventOrUrl === 'string') {
        imageUrl = eventOrUrl;
    } else if (eventOrUrl && eventOrUrl.target && eventOrUrl.target.files && eventOrUrl.target.files[0]) {
        file = eventOrUrl.target.files[0];
    }

    if (file) {
        // Validate file type and size (optional but recommended)
        if (!file.type.startsWith('image/')) {
            showToast('Please select a valid image file (JPEG, PNG, GIF).', 'warning');
            resetImagePreview(previewElementId, textElementId, context);
            // Clear the input
            if (eventOrUrl.target) eventOrUrl.target.value = '';
            return;
        }
        if (file.size > 5 * 1024 * 1024) { // Example 5MB limit
            showToast('Image file is too large (Max 5MB).', 'warning');
            resetImagePreview(previewElementId, textElementId, context);
             if (eventOrUrl.target) eventOrUrl.target.value = '';
            return;
        }

        const reader = new FileReader();
        reader.onload = function(e) {
            imagePreview.src = e.target.result;
            imagePreview.style.display = 'block';
            if (textElement) textElement.style.display = 'none';
        }
        reader.readAsDataURL(file);
    } else if (imageUrl) {
        // Handle setting preview from a URL (e.g., when loading for edit)
         const finalUrl = (imageUrl && imageUrl.startsWith('/')) ? `..${imageUrl}` : imageUrl;
         imagePreview.src = finalUrl;
         imagePreview.style.display = 'block';
         imagePreview.onerror = function() { this.onerror=null; this.src='${DEFAULT_ARTIST_PIC}'; }; // Fallback on error
         if (textElement) textElement.style.display = 'none';
    } else {
        // If neither file nor URL, reset
        resetImagePreview(previewElementId, textElementId, context);
        // If triggered by event (e.g., clearing selection), clear input
        if (eventOrUrl && eventOrUrl.target) eventOrUrl.target.value = '';
    }
}

/**
 * Reset image preview (Helper for setImagePreview)
 */
function resetImagePreview(previewElementId, textElementId, context = 'Image') {
    const imagePreview = document.getElementById(previewElementId);
    const textElement = textElementId ? document.getElementById(textElementId) : null;

    if (imagePreview) {
        imagePreview.src = '#';
        imagePreview.style.display = 'none';
    }
    if (textElement) {
        textElement.textContent = 'No image'; // Or appropriate default text
        textElement.style.display = 'block';
    }
    // Note: Does not clear the file input itself, caller might need to do that.
}

/**
 * Utility function to escape HTML characters
 */
function escapeHTML(str) {
    if (!str) return '';
    return String(str).replace(/[&<>"'/]/g, function (s) {
        const entityMap = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;', // &apos; is not XML safe
            '/': '&#x2F;' // Forward slash
        };
        return entityMap[s];
    });
}

/**
 * Show toast notification using Toastify
 */
function showToast(message, type = 'info') {
    if (typeof Toastify !== 'function') {
        console.warn('Toastify not loaded. Using console log.');
        const logType = type === 'error' ? 'error' : (type === 'warning' ? 'warn' : 'log');
        console[logType](message);
        if (type === 'error' || type === 'danger') alert('Error: ' + message);
        return;
    }

    let backgroundColor;
    switch(type) {
        case 'success': backgroundColor = '#4caf50'; break;
        case 'error':
        case 'danger':  backgroundColor = '#f44336'; break;
        case 'warning': backgroundColor = '#ff9800'; break;
        default:        backgroundColor = '#2196f3'; break; // info
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
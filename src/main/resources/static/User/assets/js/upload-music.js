import { API_URL } from '../../../Common/js/config.js';
import api from '../../../Common/js/api.js';

let currentUserId = null;
let selectedUploadCategoryIds = new Set(); // To store selected category IDs for upload
let selectedUploadTagIds = new Set(); // To store selected tag IDs for upload
let allSingers = []; // Store all singers for filtering
let allCategories = []; // Store all categories
let allTags = []; // Store all tags
let selectedSingers = new Map(); // Store selected singers {id: name}

// These constants are no longer needed here as token is handled by api.js interceptor
// and userId is handled by getCurrentUserId()
// const token = getAccessToken(); 
// const userId = getUserId(); 

let categoryId = '';
let categories = [];
let tags = [];
let selectedTags = [];

// Initialize everything when the document is loaded
document.addEventListener('DOMContentLoaded', function() {
    // console.log("DOMContentLoaded event fired");
    
    // Get User ID first, as it's needed for loading tags/categories
    currentUserId = getCurrentUserId();
    if (!currentUserId) {
        console.error("User ID not available. Redirecting to login might be needed.");
        // Optionally show an error message to the user
        showMessage('Could not identify user. Please log in again.', 'danger');
        // Potentially redirect here if user ID is absolutely essential for page load
        // window.location.href = '/login.html'; 
        // return; // Stop further execution if redirecting
    }
    // console.log("Current User ID obtained:", currentUserId);

    // Initialize form elements
    initializeFormElements();
    
    // Setup event listeners for modal and singer selection
    setupEventListeners();
    
    // Load existing singers list via API
    loadSingers(); 
    
    // Load categories and tags (now we are sure currentUserId is attempted to be set)
    if (currentUserId) {
        loadCategories();
        loadUserTags();
    } else {
        // This case might be redundant if we redirect above, but kept for safety
        console.error("User ID not available for loading categories/tags after initial check.");
        // Display placeholders or error messages in the category/tag sections
        const categoryContainer = document.getElementById('categoryPillsContainer');
        if(categoryContainer) categoryContainer.innerHTML = '<span class="text-danger">Could not load categories (User ID missing).</span>';
        const tagContainer = document.getElementById('tagPillsContainer');
        if(tagContainer) tagContainer.innerHTML = '<span class="text-danger">Could not load tags (User ID missing).</span>';
    }

    // Initialize file upload drag/drop and form submission
    initUploadFunctionality();
    initDragAndDrop();
    initFormSubmit();
    initImageUploadPreview();
});

/**
 * Get current user ID from localStorage
 */
function getCurrentUserId() {
    if (currentUserId) return currentUserId;
    try {
        const user = JSON.parse(localStorage.getItem('user'));
        if (user && user.id) {
            currentUserId = user.id;
            // console.log("Current User ID:", currentUserId);
            return currentUserId;
        } else {
            console.error('User not logged in or ID missing.');
            return null;
        }
    } catch (e) {
        console.error('Error parsing user data:', e);
        return null;
    }
}

/**
 * Load categories from the API and populate the pills container
 */
async function loadCategories() {
    const categoryPillsContainer = document.getElementById('categoryPillsContainer');
    if (!categoryPillsContainer) return; 

    categoryPillsContainer.innerHTML = '<span class="text-muted">Loading categories...</span>'; 

    try {
        const response = await api.get('/category/selectAll');
        categoryPillsContainer.innerHTML = ''; // Clear loading state regardless of success/fail after API call

        if (response.data.code === '200') {
            allCategories = response.data.data;

            if (allCategories && allCategories.length > 0) {
                allCategories.forEach(category => {
                    const categoryId = category.id;
                    const pill = document.createElement('button');
                    pill.type = 'button';
                    pill.className = 'btn btn-sm badge badge-pill btn-outline-secondary'; 
                    pill.textContent = escapeHTML(category.name);
                    pill.dataset.categoryId = categoryId;

                    pill.addEventListener('click', () => {
                        if (pill.classList.contains('btn-primary')) {
                            pill.classList.remove('btn-primary');
                            pill.classList.add('btn-outline-secondary');
                            selectedUploadCategoryIds.delete(categoryId);
                        } else {
                            pill.classList.remove('btn-outline-secondary');
                            pill.classList.add('btn-primary');
                            selectedUploadCategoryIds.add(categoryId);
                        }
                        // console.log('Selected category IDs (Upload):', selectedUploadCategoryIds);
                    });

                    categoryPillsContainer.appendChild(pill);
                });
            } else {
                categoryPillsContainer.innerHTML = '<span class="text-muted">No categories found</span>';
            }
        } else {
            console.error('Failed to load categories:', response.data.msg);
            categoryPillsContainer.innerHTML = '<span class="text-danger">Error loading categories</span>';
        }
    } catch (error) {
        console.error('Error fetching categories:', error);
        categoryPillsContainer.innerHTML = '<span class="text-danger">Error loading categories</span>';
        showMessage('Failed to load categories. Please try refreshing.', 'danger');
    }
}

/**
 * Load user tags and populate the tags pills container
 */
async function loadUserTags() {
    if (!currentUserId) {
        console.warn("User ID not available when trying to load tags.");
        return;
    }
    
    const tagPillsContainer = document.getElementById('tagPillsContainer'); 
    if (!tagPillsContainer) {
        console.error("Tag pills container not found.");
        return;
    }
    
    tagPillsContainer.innerHTML = '<span class="text-muted">Loading tags...</span>'; 

    try {
        // Use the correct endpoint identified earlier
        const response = await api.get('/tag/user', { params: { userId: currentUserId } }); 
        tagPillsContainer.innerHTML = ''; // Clear loading state

        if (response.data.code === '200') {
            const tags = response.data.data;
            
            if (tags && tags.length > 0) {
                tags.forEach(tag => {
                    const tagId = tag.id;
                    const pill = document.createElement('button');
                    pill.type = 'button';
                    pill.className = 'btn btn-sm badge badge-pill btn-outline-secondary'; 
                    pill.textContent = escapeHTML(tag.name);
                    pill.dataset.tagId = tagId; // Store ID in data attribute

                    pill.addEventListener('click', () => {
                        if (pill.classList.contains('btn-primary')) {
                            pill.classList.remove('btn-primary');
                            pill.classList.add('btn-outline-secondary');
                            selectedUploadTagIds.delete(tagId);
                        } else {
                            pill.classList.remove('btn-outline-secondary');
                            pill.classList.add('btn-primary');
                            selectedUploadTagIds.add(tagId);
                        }
                        // console.log('Selected tag IDs (Upload):', selectedUploadTagIds);
                    });

                    tagPillsContainer.appendChild(pill);
                });
            } else {
                tagPillsContainer.innerHTML = "<span class=\"text-muted\">No tags found. Use 'Manage Tags' to add some!</span>";
            }
        } else {
            console.error('Failed to load tags:', response.data.msg);
            tagPillsContainer.innerHTML = '<span class="text-danger">Error loading tags</span>';
        }
    } catch (error) {
        console.error('Error fetching tags:', error);
        tagPillsContainer.innerHTML = '<span class="text-danger">Error loading tags</span>';
        showMessage('Failed to load tags. Please try refreshing.', 'danger');
    }
}

/**
 * Load singers and populate the singer list container
 */
async function loadSingers() {
    try {
        const response = await api.get('/singer/allSinger');
        if (response.data && (response.data.code === '200' || response.data.code === 200)) {
            allSingers = response.data.data || [];
            // Don't populate modal immediately, wait for button click
            // console.log("Singers loaded:", allSingers.length);
             $('#singerListContainer').html(''); // Clear loading message once loaded
        } else {
            console.error("Failed to load singers or unexpected format:", response.data);
            $('#singerListContainer').html('<p class="text-center text-danger">Error loading artists.</p>');
        }
    } catch (error) {
        console.error('Error fetching singers:', error);
        $('#singerListContainer').html('<p class="text-center text-danger">Could not fetch artists list.</p>');
    }
}

/**
 * Validate the form before submission
 * @returns {boolean} Whether the form is valid
 */
function validateForm() {
    if (!currentUserId) {
        showMessage('Cannot upload: User ID not found. Please log in again.', 'danger');
        return false;
    }
    
    const musicFile = document.getElementById('musicFileInput').files[0];
    if (!musicFile) {
        showMessage('Please select a music file to upload', 'danger');
        return false;
    }
    
    // Image File Validation (Optional)
    const imageFile = document.getElementById('imageFileInput').files[0];
    if (imageFile && imageFile.size > 5 * 1024 * 1024) { // 5MB limit
        showMessage('Image file is too large. Please select an image under 5MB', 'danger');
        document.getElementById('imageFileInput').value = ''; // Clear the input
        resetImagePreview(); // Reset preview if invalid
        return false;
    }
    
    const termsCheck = document.getElementById('termsCheck');
    if (!termsCheck.checked) {
        showMessage('Please confirm that you have the right to share this music', 'danger');
        return false;
    }
    
    // Validate category selection (using the Set)
    if (selectedUploadCategoryIds.size === 0) { 
        showMessage('Please select at least one category for the song', 'danger');
        return false;
    }
    
    // Validate song name
    const songName = document.getElementById('songName').value.trim();
    if (!songName) {
        showMessage('Please enter a song name', 'danger');
        return false;
    }
    
    // Validate singer ID
    const singerId = document.getElementById('singerId').value.trim();
    if (!singerId) {
        showMessage('Please enter a singer ID', 'danger');
        return false;
    }
    
    return true;
}

/**
 * Initialize upload functionality
 */
function initUploadFunctionality() {
    const browseButton = document.getElementById('browseFilesBtn');
    const fileInput = document.getElementById('musicFileInput');
    
    if (browseButton && fileInput) {
        browseButton.addEventListener('click', function() {
            fileInput.click();
        });
    
        fileInput.addEventListener('change', function() {
            if (this.files.length > 0) {
                const file = this.files[0];
                const fileName = file.name;
                const fileSize = (file.size / (1024 * 1024)).toFixed(2); // Convert to MB
                
                browseButton.textContent = `Selected: ${escapeHTML(fileName)} (${fileSize}MB)`;
                
                // Check file size
                if (file.size > 50 * 1024 * 1024) { // 50MB limit
                    showMessage('File is too large. Please select a music file under 50MB', 'danger');
                    this.value = ''; // Clear the input
                    browseButton.textContent = 'Browse Files';
                    return;
                }
                
                // New code: Process MP3 metadata
                if (file.name.toLowerCase().endsWith('.mp3')) {
                    processMP3Metadata(file);
                } else {
                    showMessage('Selected file is not an MP3. Metadata extraction is only available for MP3 files.', 'warning');
                }
            } else {
                browseButton.textContent = 'Browse Files';
            }
        });
    } else {
        console.error("Browse button or file input not found.");
    }
}

/**
 * Initialize drag and drop
 */
function initDragAndDrop() {
    const dropArea = document.querySelector('.upload-area-inner');
    const fileInput = document.getElementById('musicFileInput');
    const browseButton = document.getElementById('browseFilesBtn');

    if (!dropArea || !fileInput || !browseButton) {
        console.error("Drag and drop area elements not found.");
        return;
    }
    
    // Prevent default drag behaviors
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropArea.addEventListener(eventName, preventDefaults, false);
    });
    
    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }
    
    // Highlight drop area
    ['dragenter', 'dragover'].forEach(eventName => {
        dropArea.addEventListener(eventName, highlight, false);
    });
    
    ['dragleave', 'drop'].forEach(eventName => {
        dropArea.addEventListener(eventName, unhighlight, false);
    });
    
    function highlight() {
        dropArea.classList.add('border-primary');
    }
    
    function unhighlight() {
        dropArea.classList.remove('border-primary');
    }
    
    // Handle dropped files
    dropArea.addEventListener('drop', handleDrop, false);
    
    function handleDrop(e) {
        const dt = e.dataTransfer;
        const files = dt.files;
        
        if (files.length > 0) {
            const file = files[0]; 
            
            if (!file.type.match('audio.*')) {
                showMessage('Please upload an audio file', 'danger');
                return;
            }
            
            if (file.size > 50 * 1024 * 1024) { // 50MB limit
                showMessage('File is too large. Please select a music file under 50MB', 'danger');
                return;
            }
            
            // Set file input files
            const dataTransfer = new DataTransfer();
            dataTransfer.items.add(file);
            fileInput.files = dataTransfer.files;
            
            // Manually trigger the change event on fileInput so initUploadFunctionality's listener runs
            const event = new Event('change');
            fileInput.dispatchEvent(event);
            
            // New code: Process MP3 metadata - Not needed here as we're triggering the change event above
            // which will run the metadata processing in the change event listener
            
            showMessage('File is ready to upload', 'success');
        }
    }
}

/**
 * Initialize image upload and preview functionality
 */
function initImageUploadPreview() {
    const imageInput = document.getElementById('imageFileInput');
    const browseImageBtn = document.getElementById('browseImageBtn');
    const imagePreview = document.getElementById('imagePreview');
    const imagePreviewText = document.getElementById('imagePreviewText');

    if (!imageInput || !browseImageBtn || !imagePreview || !imagePreviewText) {
        console.error("Image upload elements not found.");
        return;
    }

    browseImageBtn.addEventListener('click', () => {
        imageInput.click();
    });

    imageInput.addEventListener('change', function(event) {
        const file = event.target.files[0];
        if (file) {
            // Basic validation (type)
            if (!file.type.startsWith('image/')) {
                showMessage('Please select an image file (JPEG, PNG, GIF)', 'warning');
                this.value = ''; // Clear the input
                resetImagePreview();
                return;
            }

            // Size validation
            if (file.size > 5 * 1024 * 1024) { // 5MB limit
                showMessage('Image file is too large (Max 5MB)', 'danger');
                this.value = ''; // Clear the input
                resetImagePreview();
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
            resetImagePreview();
        }
    });
}

/**
 * Reset image preview to its initial state
 */
function resetImagePreview() {
    const imageInput = document.getElementById('imageFileInput');
    const imagePreview = document.getElementById('imagePreview');
    const imagePreviewText = document.getElementById('imagePreviewText');

    if (imageInput) imageInput.value = ''; // Clear the file input
    if (imagePreview) {
        imagePreview.src = '#';
        imagePreview.style.display = 'none';
    }
    if (imagePreviewText) {
        imagePreviewText.style.display = 'block';
    }
}

/**
 * Simple HTML escaping function
 */
function escapeHTML(str) {
    if (!str) return '';
    return str.replace(/[&<>'"/]/g, function (s) {
        const entityMap = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;',
            '/': '&#x2F;' // Forward slash, optional but good practice
        };
        return entityMap[s];
    });
}

/**
 * Show message notification
 */
function showMessage(message, type) {
    let messageContainer = document.querySelector('.message-container');
    if (!messageContainer) {
        messageContainer = document.createElement('div');
        messageContainer.className = 'message-container position-fixed top-0 end-0 p-3';
        messageContainer.style.zIndex = '1056'; // Ensure it's above modals etc.
        messageContainer.style.top = '1rem'; 
        messageContainer.style.right = '1rem';
        document.body.appendChild(messageContainer);
    }
    
    const messageElement = document.createElement('div');
    messageElement.className = `alert alert-${type} alert-dismissible fade show d-flex align-items-center shadow-sm`; // Added shadow
    messageElement.setAttribute('role', 'alert');
    
    let iconClass = 'bi-info-circle-fill'; 
    if (type === 'success') iconClass = 'bi-check-circle-fill';
    if (type === 'danger') iconClass = 'bi-exclamation-triangle-fill';
    if (type === 'warning') iconClass = 'bi-exclamation-triangle-fill';

    // Basic SVG setup (consider using a library or loading SVGs properly)
    messageElement.innerHTML = `
        <svg class="bi flex-shrink-0 me-2" width="20" height="20" role="img" aria-label="${type}:"><use href="#${iconClass}"/></svg>
        <div>
            ${escapeHTML(message)}
        </div>
        <button type="button" class="btn-close ms-auto" data-bs-dismiss="alert" aria-label="Close"></button>
    `;
    
    // Ensure SVG symbols are defined (basic example)
     if (!document.getElementById('bootstrap-icon-symbols-toast')) {
        const svgSymbols = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svgSymbols.setAttribute('id', 'bootstrap-icon-symbols-toast');
        svgSymbols.style.display = 'none';
        // Add the SVG symbol definitions here if needed, similar to previous example
        svgSymbols.innerHTML = `
            <symbol id="bi-info-circle-fill" viewBox="0 0 16 16">...</symbol> 
            <symbol id="bi-check-circle-fill" viewBox="0 0 16 16">...</symbol>
            <symbol id="bi-exclamation-triangle-fill" viewBox="0 0 16 16">...</symbol>
        `; // Make sure to include the actual path data
        document.body.appendChild(svgSymbols);
    }
    
    messageContainer.appendChild(messageElement);
    
    // Auto dismiss using Bootstrap 5 (assuming Bootstrap 5 JS is loaded)
    try {
         const alert = new bootstrap.Alert(messageElement);
         setTimeout(() => {
             alert.close();
         }, 5000);
    } catch(e) {
        console.warn("Bootstrap 5 Alert component not found for auto-dismiss.");
         // Fallback dismiss
         setTimeout(() => {
              messageElement.remove();
         }, 5000);
    }
}

// Ensure necessary SVG definitions are present somewhere in your HTML or loaded script
// Example for the path data (replace ... with actual path data):
/*
<svg xmlns="http://www.w3.org/2000/svg" style="display: none;" id="bootstrap-icon-symbols-toast">
  <symbol id="bi-info-circle-fill" viewBox="0 0 16 16">
    <path d="M8 16A8 8 0 1 0 8 0a8 8 0 0 0 0 16zm.93-9.412l.223.147c.29.19.496.468.597.8.102.333.088.69-.038.997-.126.308-.368.56-.67.736-.302.176-.66.245-1.008.245-.37 0-.72-.074-1.007-.23-1.118-.568-.997-1.64-.82-2.196.153-.51.68-1.02 1.484-1.02.71 0 1.156.406 1.31.67l.223.383zM8 5.5a1 1 0 1 1 0-2 1 1 0 0 1 0 2z"/>
  </symbol>
  <symbol id="bi-check-circle-fill" viewBox="0 0 16 16">
    <path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zm-3.97-3.03a.75.75 0 0 0-1.08.022L7.477 9.417 5.384 7.323a.75.75 0 0 0-1.06 1.06L6.97 11.03a.75.75 0 0 0 1.079-.02l3.992-4.99a.75.75 0 0 0-.01-1.05z"/>
  </symbol>
  <symbol id="bi-exclamation-triangle-fill" viewBox="0 0 16 16">
    <path d="M8.982 1.566a1.13 1.13 0 0 0-1.96 0L.165 13.233c-.457.778.091 1.767.98 1.767h13.713c.889 0 1.438-.99.98-1.767L8.982 1.566zM8 5c.535 0 .954.462.9.995l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 5.995A.905.905 0 0 1 8 5zm.002 6a1 1 0 1 1 0 2 1 1 0 0 1 0-2z"/>
  </symbol>
</svg>
*/ 

function populateSingerModalList(filteredSingers) {
    // console.log('[populateSingerModalList] Populating singer modal with', filteredSingers?.length || 0, 'singers'); // Log start
    const container = document.getElementById('singerListContainer');
    if (!container) {
        console.error('[populateSingerModalList] Singer list container not found');
        return;
    }
    container.innerHTML = ''; // Clear previous content (like "Loading...")

    if (!filteredSingers || !Array.isArray(filteredSingers) || filteredSingers.length === 0) { // Add check for array type
        console.warn('[populateSingerModalList] No valid singers array provided or array is empty.');
        container.innerHTML = '<p class="text-center text-muted">No artists found.</p>';
        return;
    }

    const listGroup = document.createElement('ul');
    listGroup.className = 'list-group';

    filteredSingers.forEach((singer, index) => {
        // Log each singer object being processed
        // console.log(`[populateSingerModalList] Processing singer ${index}:`, singer);
        
        // Validate singer object structure (basic check)
        if (!singer || typeof singer.id === 'undefined' || typeof singer.name === 'undefined') {
            console.warn(`[populateSingerModalList] Skipping invalid singer object at index ${index}:`, singer);
            return; // Skip this iteration
        }

        const singerIdStr = String(singer.id); // Ensure ID is a string for comparison and map keys
        const isChecked = selectedSingers.has(singerIdStr); // Check if singer is already selected
        const listItem = document.createElement('li');
        listItem.className = 'list-group-item';
        // Using Bootstrap form-check for better styling and consistency
        listItem.innerHTML = `
                <div class="form-check">
                    <input class="form-check-input singer-checkbox" type="checkbox" value="${singerIdStr}" id="singer-${singerIdStr}" ${isChecked ? 'checked' : ''}>
                    <label class="form-check-label" for="singer-${singerIdStr}">
                        ${escapeHTML(singer.name)} 
                    </label>
                </div>
        `;
        listGroup.appendChild(listItem);
    });
    container.appendChild(listGroup);
    // console.log('[populateSingerModalList] Finished populating list.'); // Log end
}

function updateSelectedSingersDisplay() {
    // console.log('Updating selected singers display');
    const container = document.getElementById('selectedSingersContainer');
    if (!container) {
        console.error('Selected singers container not found');
        return;
    }
    
    container.innerHTML = '';
    if (selectedSingers.size === 0) {
        container.innerHTML = '<span class="text-muted">No artists selected</span>';
    } else {
        selectedSingers.forEach((name, id) => {
            const pill = document.createElement('span');
            pill.className = 'badge bg-secondary me-1 mb-1';
            pill.textContent = name;
            container.appendChild(pill);
        });
    }
    // Update hidden input
    const ids = Array.from(selectedSingers.keys());
    const hiddenInput = document.getElementById('selectedSingerIds');
    if (hiddenInput) {
        hiddenInput.value = ids.join(',');
    } else {
        console.error('Selected singer IDs input not found');
    }
}

function setupEventListeners() {
    // console.log("[setupEventListeners] Setting up event listeners");
    
    // Setup Select Singers button
    const selectSingersBtn = document.getElementById('selectSingersBtn');
    if (selectSingersBtn) {
        // console.log("[setupEventListeners] Found selectSingersBtn:", selectSingersBtn);
        selectSingersBtn.addEventListener('click', function() {
            // console.log("[setupEventListeners] Select Singers button clicked");
            // Use Bootstrap 5 modal initialization
            const singerModalElement = document.getElementById('singerModal');
            if (singerModalElement) {
                // Get or create the modal instance
                const modalInstance = bootstrap.Modal.getOrCreateInstance(singerModalElement);
                // Log the data right before populating
                // console.log("[setupEventListeners] Attempting to populate modal with allSingers:", JSON.stringify(allSingers)); 
                populateSingerModalList(allSingers); // Populate the modal with all singers
                modalInstance.show(); // Show the modal
            } else {
                console.error("[setupEventListeners] Singer modal element not found");
            }
        });
    } else {
        console.error("[setupEventListeners] selectSingersBtn not found");
    }
    
    // Setup Singer Search
    const singerSearchInput = document.getElementById('singerSearchInput');
    if (singerSearchInput) {
        singerSearchInput.addEventListener('input', function() {
            const searchText = this.value.toLowerCase();
            // console.log("[setupEventListeners] Filtering singers by:", searchText);
            const filteredSingers = allSingers.filter(singer => 
                singer && singer.name && singer.name.toLowerCase().includes(searchText)
            );
            // console.log("[setupEventListeners] Filtered singers count:", filteredSingers.length);
            populateSingerModalList(filteredSingers);
        });
    }
    
    // Setup Confirm Selection button
    const confirmSingerSelectionBtn = document.getElementById('confirmSingerSelection');
    if (confirmSingerSelectionBtn) {
        confirmSingerSelectionBtn.addEventListener('click', function() {
            // console.log("[setupEventListeners] Confirm selection button clicked"); 
            const checkedBoxes = document.querySelectorAll('#singerListContainer input.singer-checkbox:checked');
            // console.log("[setupEventListeners] Checked boxes found:", checkedBoxes.length);
            selectedSingers.clear(); // Clear previous selections
            
            checkedBoxes.forEach(checkbox => {
                const id = checkbox.value; // ID is already a string from value attribute
                // Find the corresponding singer object from the original list to get the name accurately
                const singer = allSingers.find(s => String(s.id) === id); 
                 const name = singer ? singer.name : `Artist ID ${id}`; // Use the name from the fetched data, provide fallback
                selectedSingers.set(id, name); // Store string ID and Name
            });
            // console.log("[setupEventListeners] Selected singers Map:", selectedSingers);
            
            updateSelectedSingersDisplay();
            
            // Update hidden singerId field (for backward compatibility or single selection)
            const singleSingerIdInput = document.getElementById('singerId');
            if (singleSingerIdInput) {
                if (selectedSingers.size > 0) {
                    // Set the value to the ID of the first selected singer (if needed)
                    singleSingerIdInput.value = Array.from(selectedSingers.keys())[0];
                    // console.log("[setupEventListeners] Updated hidden singerId:", singleSingerIdInput.value);
                } else {
                     singleSingerIdInput.value = ''; // Clear if no selection
                     // console.log("[setupEventListeners] Cleared hidden singerId as no singers selected.");
                }
            } else {
                 console.warn("[setupEventListeners] Hidden input #singerId not found.");
            }

             // Update the multi-select hidden input as well
            const multiSingerIdsInput = document.getElementById('selectedSingerIds');
            if (multiSingerIdsInput) {
                multiSingerIdsInput.value = Array.from(selectedSingers.keys()).join(',');
                // console.log("[setupEventListeners] Updated hidden selectedSingerIds:", multiSingerIdsInput.value);
            } else {
                 console.warn("[setupEventListeners] Hidden input #selectedSingerIds not found.");
            }
            
            // Close modal
            const singerModalElement = document.getElementById('singerModal');
            const modalInstance = bootstrap.Modal.getInstance(singerModalElement);
            if (modalInstance) {
                // console.log("[setupEventListeners] Hiding modal");
                modalInstance.hide();
            }
        });
    } else {
        console.error("[setupEventListeners] confirmSingerSelection button not found");
    }
}

function initializeFormElements() {
    // Initialize form elements
    const fileInput = document.getElementById('musicFileInput');
    const browseBtn = document.getElementById('browseFilesBtn');

    if (browseBtn && fileInput) {
        // REMOVED: browseBtn.addEventListener('click', function() { ... });
        // REMOVED: fileInput.addEventListener('change', function(e) { ... });
    }
}

/**
 * New function: Process MP3 metadata by sending to the backend
 */
function processMP3Metadata(file) {
    // Create loading overlay
    console.log("[processMP3Metadata] Attempting to show loading overlay..."); // New Log
    showLoadingOverlay('Reading MP3 metadata...');
    
    // --- NEW: Show local spinner next to Select Artists button ---
    const selectBtn = document.getElementById('selectSingersBtn');
    if (selectBtn) {
        // Remove previous spinner if any
        const existingSpinner = document.getElementById('artist-metadata-spinner');
        if (existingSpinner) {
            existingSpinner.remove();
        }
        // Create and insert new spinner
        const spinner = document.createElement('span');
        spinner.id = 'artist-metadata-spinner';
        spinner.className = 'spinner-border spinner-border-sm text-secondary ms-2'; // Added margin
        spinner.setAttribute('role', 'status');
        spinner.setAttribute('aria-hidden', 'true');
        selectBtn.parentNode.insertBefore(spinner, selectBtn.nextSibling);
    }
    // ---------------------------------------------------------

    // Create form data for file upload
    const formData = new FormData();
    formData.append('file', file);
    
    // Call the new metadata processing endpoint
    axios.post(`${API_URL}/song/process-metadata`, formData, {
        headers: {
            // Axios sets Content-Type automatically for FormData
        }
    })
    .then(response => {
        console.log("[processMP3Metadata] Axios request succeeded. Attempting to hide overlay..."); // New Log
        hideLoadingOverlay();
        
        if (response.data && response.data.code === '200' && response.data.data) {
            const metadata = response.data.data;
            console.log('Extracted metadata:', metadata);
            
            // Auto-fill form with the extracted metadata
            autoFillFormWithMetadata(metadata);
            
            showMessage('MP3 metadata extracted successfully! Form has been auto-filled.', 'success');
        } else {
            console.warn('Metadata extraction response not in expected format:', response.data);
            showMessage('Could not read valid metadata from the MP3.', 'warning');
        }
    })
    .catch(error => {
        console.log("[processMP3Metadata] Axios request failed. Attempting to hide overlay..."); // New Log
        hideLoadingOverlay();
        console.error('Error processing MP3 metadata:', error);
        let errorMsg = 'Could not process MP3 metadata. Please fill the form manually.';
        
        if (error.response && error.response.data && error.response.data.msg) {
            errorMsg = `Metadata processing error: ${error.response.data.msg}`;
        } else if (error.message) {
            errorMsg = `Metadata processing error: ${error.message}`;
        }
        
        showMessage(errorMsg, 'warning');
    })
    .finally(() => {
        // Optionally add a log here if needed, but hide is called in then/catch
        console.log("[processMP3Metadata] Axios request finished (finally block). Hide should have been called."); // New Log
    });
}

/**
 * Auto-fill form fields with extracted metadata
 */
function autoFillFormWithMetadata(metadata) {
    // Fill song name if available
    if (metadata.title && metadata.title.trim() !== '') {
        const songNameInput = document.getElementById('songName');
        if (songNameInput) {
            songNameInput.value = metadata.title.trim();
            console.log('Auto-filled song name:', metadata.title);
        }
    }
    
    // Fill album into introduction if available
    if (metadata.album && metadata.album.trim() !== '') {
        const albumInput = document.getElementById('albumName'); // Find new album input
        if (albumInput) {
            albumInput.value = metadata.album.trim();
            console.log('Auto-filled album name:', metadata.album);
        }
    }
    
    // Auto-select singer if singerId is available
    if (metadata.singerId) {
        try {
            // Clear current singer selection
            selectedSingers.clear();
            
            // Find the singer in allSingers array to get the name
            const matchingSinger = allSingers.find(s => s && s.id === metadata.singerId);
            let singerName = null;
            
            if (matchingSinger) {
                singerName = matchingSinger.name;
                console.log('Found existing singer in local list:', singerName);
            } else if (metadata.recognizedArtistName && metadata.recognizedArtistName.trim() !== '') {
                // *** Fallback: Singer not found locally, but backend sent name ***
                singerName = metadata.recognizedArtistName.trim();
                console.log('Singer ID not found in local list, using name from metadata:', singerName);
                 // Optional: Trigger a refresh of the singer list in the background?
                 // loadSingers(); // Could cause UI flicker if modal is open
            } else {
                 console.warn('Could not find singer with ID:', metadata.singerId, 'and no recognized name provided.');
            }
            
            // If we have a singer ID and a name (either found locally or from metadata)
            if (singerName) {
                 // Add to the selected singers map
                 selectedSingers.set(String(metadata.singerId), singerName);
                
                 // Update the hidden singer ID fields
                 document.getElementById('selectedSingerIds').value = String(metadata.singerId);
                
                 // Backward compatibility for single singer ID
                 const singleSingerIdInput = document.getElementById('singerId');
                 if (singleSingerIdInput) {
                     singleSingerIdInput.value = String(metadata.singerId);
                 }
                
                 // Update the display
                 updateSelectedSingersDisplay();
                
                 console.log('Auto-selected singer:', singerName, 'with ID:', metadata.singerId);
                 showMessage(`Auto-selected singer: ${singerName}`, 'info');
            } else {
                 // This case means ID existed but we couldn't find or get a name
                 console.error('Could not associate singer ID:', metadata.singerId, 'with a name.');
                 showMessage(`Found singer ID ${metadata.singerId} in MP3 metadata, but could not find their name in the system. Please select the artist manually.`, 'warning');
            }

        } catch (e) {
            console.error('Error auto-selecting singer:', e);
            showMessage('Error during auto-selection of singer.', 'danger');
        }
    } else if (metadata.recognizedArtistName && metadata.recognizedArtistName.trim() !== '') {
        // If there's no singerId but there is a recognized artist name
        showMessage(`Recognized artist name from MP3: ${metadata.recognizedArtistName}, but the backend could not associate an ID. Please select the artist manually.`, 'info');
    }
    
    // ---- Corrected: Hide the specific spinner ----
    const readingIndicator = document.getElementById('artist-metadata-spinner'); // Use the correct ID
    if (readingIndicator) {
        readingIndicator.remove(); // Remove the spinner entirely
        console.log('Removed artist metadata spinner.');
    }
    // ------------------------------------------------
}

/**
 * Show loading overlay while processing metadata
 */
function showLoadingOverlay(message = '加载中...') {
    console.log("[showLoadingOverlay] Entered function. Message:", message); // New Log
    // Check if overlay already exists
    let overlay = document.getElementById('metadata-loading-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'metadata-loading-overlay';
        overlay.className = 'position-fixed d-flex flex-column align-items-center justify-content-center';
        overlay.style.top = '0';
        overlay.style.left = '0';
        overlay.style.width = '100%';
        overlay.style.height = '100%';
        overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
        overlay.style.zIndex = '9999';
        
        const spinner = document.createElement('div');
        spinner.className = 'spinner-border text-light mb-3';
        spinner.setAttribute('role', 'status');
        
        const messageEl = document.createElement('div');
        messageEl.className = 'text-light';
        messageEl.id = 'metadata-loading-message';
        messageEl.textContent = message;
        
        overlay.appendChild(spinner);
        overlay.appendChild(messageEl);
        document.body.appendChild(overlay);
        console.log("[showLoadingOverlay] Created and appended new overlay."); // New Log
    } else {
        // Update message if overlay exists
        const messageEl = document.getElementById('metadata-loading-message');
        if (messageEl) {
            messageEl.textContent = message;
        }
        overlay.style.display = 'flex';
        console.log("[showLoadingOverlay] Set existing overlay display to flex."); // New Log
    }
    // Log the actual style right after setting
    console.log("[showLoadingOverlay] Current overlay style.display:", overlay ? overlay.style.display : "Not found"); // New Log
}

/**
 * Hide loading overlay
 */
function hideLoadingOverlay() {
    console.log("[hideLoadingOverlay] Entered function."); // New Log
    const overlay = document.getElementById('metadata-loading-overlay');
    if (overlay) {
        // overlay.style.display = 'none'; // Keep this commented out or remove
        overlay.remove(); // Use remove() instead of setting display to none
        console.log("[hideLoadingOverlay] Removed overlay element from DOM."); // Updated Log
        // console.log("[hideLoadingOverlay] Current overlay style.display:", overlay.style.display); // This log is no longer relevant after removal
    } else {
        console.warn("[hideLoadingOverlay] Overlay element not found when trying to remove."); // Updated Log
    }
}

/**
 * Initialize form submission
 */
function initFormSubmit() {
    const form = document.getElementById('uploadMusicForm');
    if (!form) {
        console.error("Upload form not found.");
        return;
    }
    
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        if (!validateForm()) {
            return;
        }
        
        const progressBar = document.getElementById('uploadProgress');
        const progressBarInner = progressBar ? progressBar.querySelector('.progress-bar') : null;
        const submitButton = document.getElementById('uploadButton');

        if (progressBar) progressBar.style.display = 'block';
        if (progressBarInner) {
            progressBarInner.style.width = '0%';
            progressBarInner.setAttribute('aria-valuenow', 0);
        }
        if (submitButton) submitButton.disabled = true;
        
        const formData = new FormData();
        
        const musicFile = document.getElementById('musicFileInput').files[0];
        if (musicFile) {
            formData.append('file', musicFile);
        } else {
            showMessage('Music file missing.', 'danger');
            if (submitButton) submitButton.disabled = false;
            if (progressBar) progressBar.style.display = 'none';
            return;
        }
        
        // Append Image File
        const imageFile = document.getElementById('imageFileInput').files[0];
        if (imageFile) {
            formData.append('imageFile', imageFile);
        }
        
        formData.append('name', document.getElementById('songName').value);
        formData.append('userId', currentUserId);
        
        // CORRECTED SINGER ID HANDLING: Use 'singerIds' key and value from multi-select input
        const selectedIdsValue = document.getElementById('selectedSingerIds').value;
        if (selectedIdsValue) { // Ensure singers are selected
            formData.append('singerIds', selectedIdsValue); // Use correct key and value
        } else {
            // If your application requires at least one singer, handle the error here
            showMessage('Please select at least one artist', 'danger');
            if (submitButton) submitButton.disabled = false;
            if (progressBar) progressBar.style.display = 'none';
            return; // Stop the submission
            // If no singer is acceptable, you might send an empty string or omit the parameter
            // depending on backend handling. For now, we require a singer.
        }
        
        if (selectedUploadCategoryIds.size > 0) {
            formData.append('categoryIds', Array.from(selectedUploadCategoryIds).join(','));
        } else {
            showMessage('No category selected.', 'danger');
             if (submitButton) submitButton.disabled = false;
            if (progressBar) progressBar.style.display = 'none';
            return; 
        }
        
        const introduction = document.getElementById('introduction').value;
        if (introduction) {
            formData.append('introduction', introduction);
        }
        
        const lyric = document.getElementById('lyric').value;
        if (lyric) {
            formData.append('lyric', lyric);
        }
        
        // Add selected tag IDs
        if (selectedUploadTagIds.size > 0) {
            formData.append('tagIds', Array.from(selectedUploadTagIds).join(',')); 
        }
        
        // Get Album from new input field
        const albumValue = document.getElementById('albumName').value.trim();
        formData.append('album', albumValue); // Add album parameter
        
        // Upload
        try {
            showMessage('Uploading your music, please wait...', 'info');
            
            const response = await axios.post(`${API_URL}/song/add`, formData, {
                headers: {
                    // Axios sets Content-Type automatically for FormData
                },
                onUploadProgress: progressEvent => {
                    if (progressBarInner && progressEvent.total) {
                        const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                        progressBarInner.style.width = percentCompleted + '%';
                        progressBarInner.setAttribute('aria-valuenow', percentCompleted);
                    }
                }
            });
            
            if (response.data.code === '200') {
                showMessage('Music uploaded successfully! Redirecting...', 'success');
                form.reset();
                selectedUploadCategoryIds.clear();
                selectedUploadTagIds.clear();
                selectedSingers.clear(); // Clear selected singers too
                updateSelectedSingersDisplay(); // Update display to show cleared state
                loadCategories();
                loadUserTags();
                document.getElementById('browseFilesBtn').textContent = 'Browse Files';
                resetImagePreview(); // <-- Reset image preview on success
                
                setTimeout(() => {
                    window.location.href = 'my-music.html';
                }, 1500); 
            } else {
                showMessage(`Upload failed: ${response.data.msg || 'Unknown error'}`, 'danger');
                console.error('Upload failed:', response.data);
                 if (submitButton) submitButton.disabled = false; // Re-enable button on failure
            }
        } catch (error) {
            console.error('Error uploading music:', error);
            let errorMsg = 'Error uploading music. Please try again.';
            if (error.response && error.response.data && error.response.data.msg) {
                errorMsg = `Upload error: ${error.response.data.msg}`;
            } else if (error.message) {
                 errorMsg = `Upload error: ${error.message}`;
            }
            showMessage(errorMsg, 'danger');
             if (submitButton) submitButton.disabled = false; // Re-enable button on error
        } finally {
            // Hide progress bar only on error/failure, success redirects
            if (!(response && response.data.code === '200')) {
                 if (progressBar) progressBar.style.display = 'none';
            }
        }
    });
}

// ... existing code ... 
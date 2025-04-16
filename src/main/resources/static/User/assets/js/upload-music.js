import { API_URL } from '../../../Common/js/config.js';
import api from '../../../Common/js/api.js';

let currentUserId = null;
let selectedUploadCategoryIds = new Set(); // To store selected category IDs for upload
let selectedUploadTagIds = new Set(); // To store selected tag IDs for upload

document.addEventListener('DOMContentLoaded', function() {
    // Get User ID first
    getCurrentUserId(); 
    if (!currentUserId) {
        // Handle user not logged in early
        showMessage('Please log in to upload music.', 'danger');
        // Optional: Disable form or redirect
        const form = document.getElementById('uploadMusicForm');
        if (form) form.style.display = 'none';
        return;
    }
    
    // Initialize functionalities
    initUploadFunctionality();
    initDragAndDrop();
    initFormSubmit();
    loadCategories();
    loadUserTags(); // Load user tags
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
            console.log("Current User ID:", currentUserId);
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
            const categories = response.data.data;

            if (categories && categories.length > 0) {
                categories.forEach(category => {
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
                        console.log('Selected category IDs (Upload):', selectedUploadCategoryIds);
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
                        console.log('Selected tag IDs (Upload):', selectedUploadTagIds);
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
            
            showMessage('File is ready to upload', 'success');
        }
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
        
        formData.append('name', document.getElementById('songName').value);
        formData.append('singerId', document.getElementById('singerId').value);
        formData.append('userId', currentUserId);
        
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
                // Reset form after successful upload
                form.reset();
                // Clear the Sets
                selectedUploadCategoryIds.clear();
                selectedUploadTagIds.clear();
                // Re-render pills to unselected state (or just redirect)
                loadCategories(); // Re-load to reset visuals
                loadUserTags();   // Re-load to reset visuals
                document.getElementById('browseFilesBtn').textContent = 'Browse Files'; // Reset button text
                
                setTimeout(() => {
                    window.location.href = 'my-music.html'; // Redirect after success
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
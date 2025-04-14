import { API_URL } from '../../../Common/js/config.js';
import api from '../../../Common/js/api.js';

let currentUserId = null;

document.addEventListener('DOMContentLoaded', function() {
    // Get User ID first
    getCurrentUserId(); 
    if (!currentUserId) {
        // Handle user not logged in early
        showMessage('Please log in to upload music.', 'danger');
        // Optional: Disable form or redirect
        document.getElementById('uploadMusicForm').style.display = 'none';
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
 * Load categories from the API and populate the dropdown
 */
async function loadCategories() {
    const categorySelect = document.getElementById('category');
    if (!categorySelect) return; 

    try {
        const response = await api.get('/category/selectAll');
        if (response.data.code === '200') {
            const categories = response.data.data;
            if (categories && categories.length > 0) {
                categorySelect.innerHTML = '<option value="" disabled selected>Select a category</option>';
                categories.forEach(category => {
                    const option = document.createElement('option');
                    option.value = category.id;
                    option.textContent = escapeHTML(category.name);
                    categorySelect.appendChild(option);
                });
            } else {
                categorySelect.innerHTML = '<option value="" disabled>No categories found</option>';
            }
        } else {
            console.error('Failed to load categories:', response.data.msg);
            categorySelect.innerHTML = '<option value="" disabled>Error loading categories</option>';
        }
    } catch (error) {
        console.error('Error fetching categories:', error);
        categorySelect.innerHTML = '<option value="" disabled>Error loading categories</option>';
        showMessage('Failed to load categories. Please try refreshing.', 'danger');
    }
}

/**
 * Load user tags and populate the tags dropdown
 */
async function loadUserTags() {
    if (!currentUserId) return;
    
    const tagsSelect = document.getElementById('tags');
    if (!tagsSelect) return;
    
    try {
        const response = await api.get('/tag/user', { params: { userId: currentUserId } });
        if (response.data.code === '200') {
            const tags = response.data.data;
            
            // Clear loading option
            tagsSelect.innerHTML = '';
            
            if (tags && tags.length > 0) {
                // Add placeholder option
                const placeholderOption = document.createElement('option');
                placeholderOption.value = "";
                placeholderOption.disabled = true;
                placeholderOption.textContent = "Select tags (optional)";
                tagsSelect.appendChild(placeholderOption);
                
                // Add tag options
                tags.forEach(tag => {
                    const option = document.createElement('option');
                    option.value = tag.id;
                    option.textContent = escapeHTML(tag.name);
                    tagsSelect.appendChild(option);
                });
                
                // Initialize select2 if available
                if (typeof $.fn.select2 !== 'undefined') {
                    $(tagsSelect).select2({
                        placeholder: "Select tags",
                        allowClear: true
                    });
                }
            } else {
                const noTagsOption = document.createElement('option');
                noTagsOption.value = "";
                noTagsOption.disabled = true;
                noTagsOption.textContent = "No tags found. Use 'Manage Tags' to add some!";
                tagsSelect.appendChild(noTagsOption);
            }
        } else {
            console.error('Failed to load tags:', response.data.msg);
            tagsSelect.innerHTML = '<option value="" disabled>Error loading tags</option>';
        }
    } catch (error) {
        console.error('Error fetching tags:', error);
        tagsSelect.innerHTML = '<option value="" disabled>Error loading tags</option>';
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
    
    // Validate music file
    const musicFile = document.getElementById('musicFileInput').files[0];
    if (!musicFile) {
        showMessage('Please select a music file to upload', 'danger');
        return false;
    }
    
    // Validate terms checkbox
    const termsCheck = document.getElementById('termsCheck');
    if (!termsCheck.checked) {
        showMessage('Please confirm that you have the right to share this music', 'danger');
        return false;
    }
    
    // Validate category
    const categorySelect = document.getElementById('category');
    const categoryId = categorySelect.value;
    if (!categoryId) {
        showMessage('Please select a category for the song', 'danger');
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
    // Browse files button
    const browseButton = document.getElementById('browseFilesBtn');
    const fileInput = document.getElementById('musicFileInput');
    
    browseButton.addEventListener('click', function() {
        fileInput.click();
    });
    
    // Display selected filename
    fileInput.addEventListener('change', function() {
        if (this.files.length > 0) {
            const fileName = this.files[0].name;
            const fileSize = (this.files[0].size / (1024 * 1024)).toFixed(2); // Convert to MB
            
            browseButton.textContent = `Selected: ${escapeHTML(fileName)} (${fileSize}MB)`;
            
            // Check file size
            if (this.files[0].size > 50 * 1024 * 1024) { // 50MB limit
                showMessage('File is too large. Please select a music file under 50MB', 'danger');
                this.value = '';
                browseButton.textContent = 'Browse Files';
            }
        } else {
            browseButton.textContent = 'Browse Files';
        }
    });
    
    // MV file upload
    const mvFileInput = document.getElementById('mvFileInput');
    
    mvFileInput.addEventListener('change', function() {
        if (this.files.length > 0) {
            const fileSize = (this.files[0].size / (1024 * 1024)).toFixed(2); // Convert to MB
            
            // Check file size
            if (this.files[0].size > 500 * 1024 * 1024) { // 500MB limit
                showMessage('File is too large. Please select a video file under 500MB', 'danger');
                this.value = '';
            }
        }
    });
}

/**
 * Initialize drag and drop
 */
function initDragAndDrop() {
    const dropArea = document.querySelector('.upload-area-inner');
    const fileInput = document.getElementById('musicFileInput');
    
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
            const file = files[0]; // Take only the first file
            
            // Check if it's an audio file
            if (!file.type.match('audio.*')) {
                showMessage('Please upload an audio file', 'danger');
                return;
            }
            
            // Check file size
            if (file.size > 50 * 1024 * 1024) { // 50MB limit
                showMessage('File is too large. Please select a music file under 50MB', 'danger');
                return;
            }
            
            // Set file input
            const dataTransfer = new DataTransfer();
            dataTransfer.items.add(file);
            fileInput.files = dataTransfer.files;
            
            // Update button text
            const browseButton = document.getElementById('browseFilesBtn');
            const fileName = file.name;
            const fileSize = (file.size / (1024 * 1024)).toFixed(2); // Convert to MB
            browseButton.textContent = `Selected: ${escapeHTML(fileName)} (${fileSize}MB)`;
            
            showMessage('File is ready to upload', 'success');
        }
    }
}

/**
 * Initialize form submission
 */
function initFormSubmit() {
    const form = document.getElementById('uploadMusicForm');
    
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        // Validate form
        if (!validateForm()) {
            return;
        }
        
        // Show progress bar
        const progressBar = document.getElementById('uploadProgress');
        progressBar.style.display = 'block';
        const progressBarInner = progressBar.querySelector('.progress-bar');
        progressBarInner.style.width = '0%';
        progressBarInner.setAttribute('aria-valuenow', 0);
        
        // Disable submit button
        const submitButton = document.getElementById('uploadButton');
        submitButton.disabled = true;
        
        // Create FormData
        const formData = new FormData();
        
        // Add music file
        const musicFile = document.getElementById('musicFileInput').files[0];
        if (musicFile) {
            formData.append('file', musicFile);
        }
        
        // Add MV file
        const mvFile = document.getElementById('mvFileInput').files[0];
        if (mvFile) {
            formData.append('mvFile', mvFile);
        }
        
        // Add song details
        formData.append('name', document.getElementById('songName').value);
        formData.append('singerId', document.getElementById('singerId').value);
        formData.append('categoryId', document.getElementById('category').value);
        formData.append('userId', currentUserId);
        
        const introduction = document.getElementById('introduction').value;
        if (introduction) {
            formData.append('introduction', introduction);
        }
        
        const lyric = document.getElementById('lyric').value;
        if (lyric) {
            formData.append('lyric', lyric);
        }
        
        // Add selected tags
        const tagsSelect = document.getElementById('tags');
        if (tagsSelect) {
            const selectedTags = Array.from(tagsSelect.selectedOptions).map(option => option.value);
            if (selectedTags.length > 0) {
                formData.append('tags', selectedTags.join(','));
            }
        }
        
        // Upload
        try {
            showMessage('Uploading your music, please wait...', 'info');
            
            const response = await axios.post(`${API_URL}/song/upload`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                },
                onUploadProgress: progressEvent => {
                    const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                    progressBarInner.style.width = percentCompleted + '%';
                    progressBarInner.setAttribute('aria-valuenow', percentCompleted);
                }
            });
            
            if (response.data.code === '200') {
                showMessage('Music uploaded successfully!', 'success');
                // Reset form after successful upload
                form.reset();
                document.getElementById('browseFilesBtn').textContent = 'Browse Files';
                setTimeout(() => {
                    window.location.href = 'my-music.html';
                }, 2000);
            } else {
                showMessage(`Upload failed: ${response.data.msg}`, 'danger');
                console.error('Upload failed:', response.data);
            }
        } catch (error) {
            console.error('Error uploading music:', error);
            showMessage('Error uploading music. Please try again.', 'danger');
        } finally {
            submitButton.disabled = false;
            progressBar.style.display = 'none';
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
            '/': '&#x2F;'
        };
        return entityMap[s];
    });
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
        messageContainer.style.top = '1rem'; // Adjust position slightly
        messageContainer.style.right = '1rem';
        document.body.appendChild(messageContainer);
    }
    
    // Create message element
    const messageElement = document.createElement('div');
    messageElement.className = `alert alert-${type} alert-dismissible fade show d-flex align-items-center`;
    messageElement.setAttribute('role', 'alert');
    
    let iconClass = 'bi-info-circle-fill'; // Default icon
    if (type === 'success') iconClass = 'bi-check-circle-fill';
    if (type === 'danger') iconClass = 'bi-exclamation-triangle-fill';
    if (type === 'warning') iconClass = 'bi-exclamation-triangle-fill';

    messageElement.innerHTML = `
        <svg class="bi flex-shrink-0 me-2" width="24" height="24" role="img" aria-label="${type}:"><use xlink:href="#${iconClass}"/></svg>
        <div>
            ${message}
        </div>
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close" style="margin-left: auto;"></button>
    `;
     // Inject SVG definitions if not already present (simplified example)
     if (!document.getElementById('bootstrap-icon-symbols')) {
        const svgSymbols = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svgSymbols.setAttribute('id', 'bootstrap-icon-symbols');
        svgSymbols.style.display = 'none';
        svgSymbols.innerHTML = `
            <symbol id="bi-info-circle-fill" viewBox="0 0 16 16">
                <path d="M8 16A8 8 0 1 0 8 0a8 8 0 0 0 0 16zm.93-9.412l.223.147c.29.19.496.468.597.8.102.333.088.69-.038.997-.126.308-.368.56-.67.736-.302.176-.66.245-1.008.245-.37 0-.72-.074-1.007-.23-1.118-.568-.997-1.64-.82-2.196.153-.51.68-1.02 1.484-1.02.71 0 1.156.406 1.31.67l.223.383zM8 5.5a1 1 0 1 1 0-2 1 1 0 0 1 0 2z"/>
            </symbol>
            <symbol id="bi-check-circle-fill" viewBox="0 0 16 16">
                <path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zm-3.97-3.03a.75.75 0 0 0-1.08.022L7.477 9.417 5.384 7.323a.75.75 0 0 0-1.06 1.06L6.97 11.03a.75.75 0 0 0 1.079-.02l3.992-4.99a.75.75 0 0 0-.01-1.05z"/>
            </symbol>
            <symbol id="bi-exclamation-triangle-fill" viewBox="0 0 16 16">
                <path d="M8.982 1.566a1.13 1.13 0 0 0-1.96 0L.165 13.233c-.457.778.091 1.767.98 1.767h13.713c.889 0 1.438-.99.98-1.767L8.982 1.566zM8 5c.535 0 .954.462.9.995l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 5.995A.905.905 0 0 1 8 5zm.002 6a1 1 0 1 1 0 2 1 1 0 0 1 0-2z"/>
            </symbol>
        `;
        document.body.appendChild(svgSymbols);
    }
    
    // Add to container
    messageContainer.appendChild(messageElement);
    
    // Auto dismiss using Bootstrap's alert
    const alert = new bootstrap.Alert(messageElement);
    setTimeout(() => {
        alert.close();
    }, 5000);
} 
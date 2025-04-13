import { API_URL } from '../../../Common/js/config.js';
import api from '../../../Common/js/api.js';

document.addEventListener('DOMContentLoaded', function() {
    // Initialize upload functionality
    initUploadFunctionality();
    
    // Initialize drag and drop
    initDragAndDrop();
    
    // Initialize form submit
    initFormSubmit();
    
    // Load categories into the dropdown
    loadCategories();
});

/**
 * Load categories from the API and populate the dropdown
 */
async function loadCategories() {
    const categorySelect = document.getElementById('category');
    if (!categorySelect) return; // Exit if select element not found

    try {
        const response = await api.get('/category/selectAll'); // Use CategoryController endpoint
        if (response.data.code === '200') {
            const categories = response.data.data;
            if (categories && categories.length > 0) {
                categorySelect.innerHTML = '<option value="" disabled selected>Select a category</option>'; // Reset options
                categories.forEach(category => {
                    const option = document.createElement('option');
                    option.value = category.id;
                    option.textContent = category.name; // Assuming category object has id and name
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
            
            browseButton.textContent = `Selected: ${fileName} (${fileSize}MB)`;
            
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
            browseButton.textContent = `Selected: ${fileName} (${fileSize}MB)`;
            
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
        
        // Check if music file is selected
        const musicFile = document.getElementById('musicFileInput').files[0];
        if (!musicFile) {
            showMessage('Please select a music file to upload', 'danger');
            return;
        }
        
        // Check if terms are agreed
        const termsCheck = document.getElementById('termsCheck');
        if (!termsCheck.checked) {
            showMessage('Please confirm that you have the right to share this music', 'danger');
            return;
        }
        
        // Check if category is selected
        const categoryId = document.getElementById('category').value;
        if (!categoryId) {
            showMessage('Please select a category for the song', 'danger');
            return;
        }
        
        // Get form data
        const formData = new FormData();
        
        // Get current user ID
        const currentUser = JSON.parse(localStorage.getItem('user'));
        if (!currentUser || !currentUser.id) {
            showMessage('Please log in before uploading music', 'danger');
            // Redirect to login page
            setTimeout(() => {
                window.location.href = '../login.html';
            }, 2000);
            return;
        }
        
        // Add user ID
        formData.append('userId', currentUser.id);
        
        // Add required fields
        formData.append('singerId', document.getElementById('singerId').value);
        formData.append('name', document.getElementById('songName').value);
        formData.append('introduction', document.getElementById('introduction').value || '');
        formData.append('lyric', document.getElementById('lyric').value || '');
        formData.append('categoryId', categoryId);
        formData.append('tags', document.getElementById('tags').value.trim());
        
        // Add music file
        formData.append('file', musicFile);
        
        // Add MV file (if any)
        const mvFile = document.getElementById('mvFileInput').files[0];
        if (mvFile) {
            formData.append('files', mvFile);
        } else {
            // Backend needs files parameter, if no MV, add an empty file
            formData.append('files', new File([], 'empty.mp4', { type: 'video/mp4' }));
        }
        
        // Show upload progress bar
        const progressBar = document.querySelector('#uploadProgress .progress-bar');
        const progressContainer = document.getElementById('uploadProgress');
        progressContainer.style.display = 'flex';
        
        // Disable submit button
        const uploadButton = document.getElementById('uploadButton');
        uploadButton.disabled = true;
        uploadButton.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Uploading...';
        
        try {
            const response = await api.post(`/song/add`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                },
                onUploadProgress: function(progressEvent) {
                    const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                    progressBar.style.width = percentCompleted + '%';
                    progressBar.setAttribute('aria-valuenow', percentCompleted);
                }
            });
            
            // Handle response
            if (response.data.code === '200') {
                showMessage('Music uploaded successfully! It will be reviewed shortly.', 'success');
                // Reset form
                form.reset();
                // Reset file input
                document.getElementById('browseFilesBtn').textContent = 'Browse Files';
                // Redirect to music list page after 2 seconds
                setTimeout(() => {
                    window.location.href = 'my-music.html';
                }, 2000);
            } else {
                showMessage(`Upload failed: ${response.data.msg}`, 'danger');
            }
        } catch (error) {
            console.error('Upload error:', error);
            showMessage('An error occurred during upload. Please try again later', 'danger');
        } finally {
            // Re-enable submit button
            uploadButton.disabled = false;
            uploadButton.innerHTML = 'Upload Music';
            // Hide progress bar
            progressContainer.style.display = 'none';
        }
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
        document.body.appendChild(messageContainer);
    }
    
    // Create message element
    const messageElement = document.createElement('div');
    messageElement.className = `alert alert-${type} alert-dismissible fade show`;
    messageElement.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-dismiss="alert" aria-label="Close"></button>
    `;
    
    // Add to container
    messageContainer.appendChild(messageElement);
    
    // Auto dismiss
    setTimeout(() => {
        messageElement.classList.remove('show');
        setTimeout(() => {
            messageElement.remove();
        }, 300);
    }, 5000);
    
    // Close button functionality
    messageElement.querySelector('.btn-close').addEventListener('click', function() {
        messageElement.classList.remove('show');
        setTimeout(() => {
            messageElement.remove();
        }, 300);
    });
} 
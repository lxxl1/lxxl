// Handle file upload functionality
document.addEventListener('DOMContentLoaded', function() {
    const uploadForm = document.getElementById('uploadMusicForm');
    const musicFileInput = document.getElementById('musicFileInput');
    const mvFileInput = document.getElementById('mvFileInput');
    const browseFilesBtn = document.getElementById('browseFilesBtn');
    const uploadProgress = document.getElementById('uploadProgress');
    const progressBar = uploadProgress.querySelector('.progress-bar');

    // Handle browse files button click
    browseFilesBtn.addEventListener('click', function() {
        musicFileInput.click();
    });

    // Handle drag and drop functionality
    const uploadArea = document.querySelector('.upload-area-inner');
    
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        uploadArea.addEventListener(eventName, preventDefaults, false);
    });

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    ['dragenter', 'dragover'].forEach(eventName => {
        uploadArea.addEventListener(eventName, highlight, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        uploadArea.addEventListener(eventName, unhighlight, false);
    });

    function highlight(e) {
        uploadArea.classList.add('border-primary');
    }

    function unhighlight(e) {
        uploadArea.classList.remove('border-primary');
    }

    uploadArea.addEventListener('drop', handleDrop, false);

    function handleDrop(e) {
        const dt = e.dataTransfer;
        const files = dt.files;
        musicFileInput.files = files;
    }

    // Handle form submission
    uploadForm.addEventListener('submit', async function(e) {
        e.preventDefault();

        // Validate form
        if (!validateForm()) {
            return;
        }

        // Create FormData object
        const formData = new FormData();
        formData.append('file', musicFileInput.files[0]);
        formData.append('files', mvFileInput.files[0]);
        formData.append('singerId', document.getElementById('singerId').value);
        formData.append('name', document.getElementById('songName').value);
        formData.append('introduction', document.getElementById('introduction').value);
        formData.append('lyric', document.getElementById('lyric').value);

        try {
            // Show progress bar
            uploadProgress.style.display = 'block';
            progressBar.style.width = '0%';

            // Make API request
            const response = await axios.post('/song/add', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                },
                onUploadProgress: (progressEvent) => {
                    const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                    progressBar.style.width = percentCompleted + '%';
                }
            });

            // Handle response
            if (response.data.code === 1) {
                showAlert('success', 'Music uploaded successfully!');
                uploadForm.reset();
                musicFileInput.value = '';
                mvFileInput.value = '';
            } else {
                showAlert('error', response.data.msg || 'Upload failed');
            }
        } catch (error) {
            showAlert('error', 'An error occurred during upload: ' + error.message);
        } finally {
            // Hide progress bar after a delay
            setTimeout(() => {
                uploadProgress.style.display = 'none';
            }, 1000);
        }
    });

    // Form validation
    function validateForm() {
        const songName = document.getElementById('songName').value.trim();
        const singerId = document.getElementById('singerId').value.trim();
        const musicFile = musicFileInput.files[0];
        const termsCheck = document.getElementById('termsCheck').checked;

        if (!songName) {
            showAlert('error', 'Please enter a song name');
            return false;
        }

        if (!singerId) {
            showAlert('error', 'Please enter a singer ID');
            return false;
        }

        if (!musicFile) {
            showAlert('error', 'Please select a music file');
            return false;
        }

        // Check file size (50MB limit)
        if (musicFile.size > 50 * 1024 * 1024) {
            showAlert('error', 'Music file size must be less than 50MB');
            return false;
        }

        // Check file type
        const allowedTypes = ['audio/mpeg', 'audio/wav', 'audio/flac'];
        if (!allowedTypes.includes(musicFile.type)) {
            showAlert('error', 'Invalid music file format. Please upload MP3, WAV, or FLAC files');
            return false;
        }

        // Check MV file size if present
        const mvFile = mvFileInput.files[0];
        if (mvFile && mvFile.size > 500 * 1024 * 1024) {
            showAlert('error', 'MV file size must be less than 500MB');
            return false;
        }

        if (!termsCheck) {
            showAlert('error', 'Please confirm that you have the right to share this music');
            return false;
        }

        return true;
    }

    // Show alert message
    function showAlert(type, message) {
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${type === 'success' ? 'success' : 'danger'} alert-dismissible fade show`;
        alertDiv.innerHTML = `
            ${message}
            <button type="button" class="close" data-dismiss="alert" aria-label="Close">
                <span aria-hidden="true">&times;</span>
            </button>
        `;
        
        const form = document.getElementById('uploadMusicForm');
        form.insertBefore(alertDiv, form.firstChild);
        
        // Auto dismiss after 5 seconds
        setTimeout(() => {
            alertDiv.remove();
        }, 5000);
    }
}); 
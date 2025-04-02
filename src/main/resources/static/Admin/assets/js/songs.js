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

$(document).ready(function() {
    // Global variables
    const API_BASE_URL = '/song';  // Base URL for all song API endpoints
    let songsTable;
    let currentSongId;
    
    // Initialize DataTable
    initializeDataTable();
    
    // Event Listeners
    setupEventListeners();
    
    /**
     * Initialize DataTable with songs data
     */
    function initializeDataTable() {
        songsTable = $('#songsTable').DataTable({
            ajax: {
                url: `${API_BASE_URL}/allSong`,
                dataSrc: '',
                error: function(xhr, error, thrown) {
                    console.error('Error loading songs:', error);
                    showToast('error', 'Failed to load songs. Please try again.');
                }
            },
            columns: [
                { data: 'id' },
                { data: 'name' },
                { data: 'singerId' },
                { 
                    data: 'pic',
                    render: function(data) {
                        return data ? 
                            `<img src="${data}" alt="Cover" class="img-thumbnail" style="height: 50px;">` : 
                            `<img src="/img/songPic/tubiao.jpg" alt="Default Cover" class="img-thumbnail" style="height: 50px;">`;
                    }
                },
                { 
                    data: 'introduction',
                    render: function(data) {
                        return data ? 
                            (data.length > 50 ? data.substring(0, 50) + '...' : data) : 
                            '<span class="text-muted">No introduction</span>';
                    }
                },
                { data: 'numsplay', defaultContent: '0' },
                {
                    data: null,
                    render: function(data) {
                        return `<button class="btn btn-sm btn-outline-primary preview-btn" data-id="${data.id}">
                            <i class="fas fa-play"></i> Preview
                        </button>`;
                    }
                },
                {
                    data: null,
                    render: function(data) {
                        return `
                            <div class="btn-group">
                                <button class="btn btn-sm btn-outline-secondary edit-btn" data-id="${data.id}">
                                    <i class="fas fa-edit"></i>
                                </button>
                                <button class="btn btn-sm btn-outline-info update-files-btn" data-id="${data.id}">
                                    <i class="fas fa-file-upload"></i>
                                </button>
                                <button class="btn btn-sm btn-outline-danger delete-btn" data-id="${data.id}" data-name="${data.name}">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </div>
                        `;
                    }
                }
            ],
            order: [[0, 'desc']],
            responsive: true,
            language: {
                emptyTable: "No songs found",
                zeroRecords: "No matching songs found"
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
        $('#submitUpdateSong').on('click', function() {
            handleUpdateFile('updateSongFile', 'updateSongUrl');
        });
        
        // Update MV file
        $('#submitUpdateMV').on('click', function() {
            handleUpdateFile('updateMVFile', 'updateMVUrl');
        });
        
        // Update Cover Image
        $('#submitUpdatePic').on('click', function() {
            handleUpdateFile('updatePicFile', 'updateSongPic');
        });
        
        // Delete song
        $('#confirmDelete').on('click', handleDeleteSong);
        
        // Edit button click
        $('#songsTable').on('click', '.edit-btn', function() {
            const songId = $(this).data('id');
            loadSongForEdit(songId);
        });
        
        // Update files button click
        $('#songsTable').on('click', '.update-files-btn', function() {
            const songId = $(this).data('id');
            currentSongId = songId;
            $('#updateSongId').val(songId);
            $('#updateFilesModal').modal('show');
        });
        
        // Preview button click
        $('#songsTable').on('click', '.preview-btn', function() {
            const songId = $(this).data('id');
            loadSongForPreview(songId);
            
            // Increment play count
            $.get(`${API_BASE_URL}/addNums?songId=${songId}`);
        });
        
        // Delete button click
        $('#songsTable').on('click', '.delete-btn', function() {
            const songId = $(this).data('id');
            const songName = $(this).data('name');
            currentSongId = songId;
            $('#deleteSongName').text(songName);
            $('#deleteModal').modal('show');
        });
        
        // Apply filters
        $('#applyFilters').on('click', handleApplyFilters);
        
        // Clear filters
        $('#clearFilters').on('click', function() {
            $('#singerFilter').val('');
            $('#nameFilter').val('');
            $('#sortByPlays').val('');
            songsTable.ajax.url(`${API_BASE_URL}/allSong`).load();
        });
        
        // Global search
        $('#globalSearchBtn').on('click', function() {
            const searchTerm = $('#globalSearch').val().trim();
            if (searchTerm) {
                songsTable.ajax.url(`${API_BASE_URL}/likeSongOfName?songName=${encodeURIComponent(searchTerm)}`).load();
            } else {
                songsTable.ajax.url(`${API_BASE_URL}/allSong`).load();
            }
        });
        
        // Keyboard event for global search
        $('#globalSearch').on('keypress', function(e) {
            if (e.which === 13) { // Enter key
                $('#globalSearchBtn').click();
            }
        });
    }
    
    /**
     * Handle add song form submission
     */
    function handleAddSong() {
        const form = $('#addSongForm')[0];
        
        // Form validation
        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }
        
        const formData = new FormData(form);
        
        // Show progress bar
        const progressBar = $('#uploadProgress');
        progressBar.show();
        const progressBarInner = progressBar.find('.progress-bar');
        progressBarInner.css('width', '0%');
        
        // Disable submit button
        $('#submitAddSong').prop('disabled', true);
        
        $.ajax({
            url: `${API_BASE_URL}/add`,
            type: 'POST',
            data: formData,
            processData: false,
            contentType: false,
            xhr: function() {
                const xhr = new window.XMLHttpRequest();
                xhr.upload.addEventListener('progress', function(e) {
                    if (e.lengthComputable) {
                        const percent = Math.round((e.loaded / e.total) * 100);
                        progressBarInner.css('width', percent + '%');
                    }
                }, false);
                return xhr;
            },
            success: function(response) {
                if (response && response.code === 1) {
                    showToast('success', 'Song added successfully');
                    $('#addSongModal').modal('hide');
                    form.reset();
                    songsTable.ajax.reload();
                } else {
                    showToast('error', response.msg || 'Failed to add song');
                }
            },
            error: function(xhr, status, error) {
                showToast('error', 'An error occurred while adding the song: ' + error);
                console.error('Error adding song:', xhr.responseText);
            },
            complete: function() {
                $('#submitAddSong').prop('disabled', false);
                setTimeout(() => {
                    progressBar.hide();
                }, 1000);
            }
        });
    }
    
    /**
     * Load song data for editing
     */
    function loadSongForEdit(songId) {
        $.ajax({
            url: `${API_BASE_URL}/detail?songId=${songId}`,
            type: 'GET',
            success: function(response) {
                if (response) {
                    $('#editSongId').val(response.id);
                    $('#editSongName').val(response.name);
                    $('#editSingerId').val(response.singerId);
                    $('#editIntroduction').val(response.introduction);
                    $('#editLyric').val(response.lyric);
                    $('#currentSongFile').text(response.url || 'No song file');
                    $('#currentMVFile').text(response.mvurl || 'No MV file');
                    
                    currentSongId = response.id;
                    $('#editSongModal').modal('show');
                } else {
                    showToast('error', 'Failed to load song details');
                }
            },
            error: function(xhr, status, error) {
                showToast('error', 'An error occurred while loading song details: ' + error);
                console.error('Error loading song:', xhr.responseText);
            }
        });
    }
    
    /**
     * Handle edit song form submission
     */
    function handleEditSong() {
        const form = $('#editSongForm')[0];
        
        // Form validation
        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }
        
        const formData = new FormData(form);
        const serializedData = Object.fromEntries(formData.entries());
        
        // Disable submit button
        $('#submitEditSong').prop('disabled', true);
        
        $.ajax({
            url: `${API_BASE_URL}/update`,
            type: 'POST',
            data: serializedData,
            success: function(response) {
                if (response && response.code === 1) {
                    showToast('success', 'Song updated successfully');
                    $('#editSongModal').modal('hide');
                    songsTable.ajax.reload();
                } else {
                    showToast('error', response.msg || 'Failed to update song');
                }
            },
            error: function(xhr, status, error) {
                showToast('error', 'An error occurred while updating the song: ' + error);
                console.error('Error updating song:', xhr.responseText);
            },
            complete: function() {
                $('#submitEditSong').prop('disabled', false);
            }
        });
    }
    
    /**
     * Handle file updates (song, MV, cover)
     */
    function handleUpdateFile(fileInputId, endpoint) {
        const fileInput = $(`#${fileInputId}`)[0];
        
        if (!fileInput.files || fileInput.files.length === 0) {
            showToast('error', 'Please select a file to upload');
            return;
        }
        
        const formData = new FormData();
        formData.append('file', fileInput.files[0]);
        formData.append('id', currentSongId);
        
        // Show progress bar
        const progressBar = $('#updateProgress');
        progressBar.show();
        const progressBarInner = progressBar.find('.progress-bar');
        progressBarInner.css('width', '0%');
        
        // Disable submit button
        $(`#submitUpdate${fileInputId.replace('update', '').replace('File', '')}`).prop('disabled', true);
        
        $.ajax({
            url: `${API_BASE_URL}/${endpoint}`,
            type: 'POST',
            data: formData,
            processData: false,
            contentType: false,
            xhr: function() {
                const xhr = new window.XMLHttpRequest();
                xhr.upload.addEventListener('progress', function(e) {
                    if (e.lengthComputable) {
                        const percent = Math.round((e.loaded / e.total) * 100);
                        progressBarInner.css('width', percent + '%');
                    }
                }, false);
                return xhr;
            },
            success: function(response) {
                if (response && response.code === 1) {
                    showToast('success', 'File updated successfully');
                    fileInput.value = '';
                    songsTable.ajax.reload();
                } else {
                    showToast('error', response.msg || 'Failed to update file');
                }
            },
            error: function(xhr, status, error) {
                showToast('error', 'An error occurred while updating the file: ' + error);
                console.error('Error updating file:', xhr.responseText);
            },
            complete: function() {
                $(`#submitUpdate${fileInputId.replace('update', '').replace('File', '')}`).prop('disabled', false);
                setTimeout(() => {
                    progressBar.hide();
                }, 1000);
            }
        });
    }
    
    /**
     * Load song data for preview
     */
    function loadSongForPreview(songId) {
        $.ajax({
            url: `${API_BASE_URL}/detail?songId=${songId}`,
            type: 'GET',
            success: function(response) {
                if (response) {
                    // Set preview data
                    $('#previewTitle').text(response.name);
                    $('#previewSinger').text(`Singer ID: ${response.singerId}`);
                    $('#previewIntro').text(response.introduction || 'No introduction available');
                    
                    // Set cover image
                    if (response.pic) {
                        $('#previewCover').attr('src', response.pic);
                    } else {
                        $('#previewCover').attr('src', '/img/songPic/tubiao.jpg');
                    }
                    
                    // Set audio source
                    if (response.url) {
                        $('#previewAudio').show();
                        $('#previewAudio source').attr('src', response.url);
                        $('#previewAudio')[0].load();
                    } else {
                        $('#previewAudio').hide();
                    }
                    
                    // Set MV source
                    if (response.mvurl) {
                        $('#previewMVContainer').show();
                        $('#previewVideo source').attr('src', response.mvurl);
                        $('#previewVideo')[0].load();
                    } else {
                        $('#previewMVContainer').hide();
                    }
                    
                    // Set lyrics
                    if (response.lyric) {
                        $('#previewLyricsContainer').show();
                        $('#previewLyrics').text(response.lyric);
                    } else {
                        $('#previewLyricsContainer').hide();
                    }
                    
                    $('#previewModal').modal('show');
                } else {
                    showToast('error', 'Failed to load song details for preview');
                }
            },
            error: function(xhr, status, error) {
                showToast('error', 'An error occurred while loading song preview: ' + error);
                console.error('Error loading song preview:', xhr.responseText);
            }
        });
    }
    
    /**
     * Handle song deletion
     */
    function handleDeleteSong() {
        // Disable delete button
        $('#confirmDelete').prop('disabled', true);
        
        $.ajax({
            url: `${API_BASE_URL}/delete?id=${currentSongId}`,
            type: 'GET',
            success: function(response) {
                if (response === true) {
                    showToast('success', 'Song deleted successfully');
                    $('#deleteModal').modal('hide');
                    songsTable.ajax.reload();
                } else {
                    showToast('error', 'Failed to delete song');
                }
            },
            error: function(xhr, status, error) {
                showToast('error', 'An error occurred while deleting the song: ' + error);
                console.error('Error deleting song:', xhr.responseText);
            },
            complete: function() {
                $('#confirmDelete').prop('disabled', false);
            }
        });
    }
    
    /**
     * Handle applying filters
     */
    function handleApplyFilters() {
        const singerId = $('#singerFilter').val().trim();
        const songName = $('#nameFilter').val().trim();
        const sortBy = $('#sortByPlays').val();
        
        let url = API_BASE_URL;
        
        if (singerId) {
            url = `${API_BASE_URL}/singer/detail?singerId=${encodeURIComponent(singerId)}`;
        } else if (songName) {
            url = `${API_BASE_URL}/likeSongOfName?songName=${encodeURIComponent(songName)}`;
        } else if (sortBy === 'popular') {
            url = `${API_BASE_URL}/topSong`;
        } else {
            url = `${API_BASE_URL}/allSong`;
        }
        
        songsTable.ajax.url(url).load();
    }
    
    /**
     * Show toast notification
     */
    function showToast(type, message) {
        // Check if toast container exists, if not create it
        let toastContainer = $('.toast-container');
        if (toastContainer.length === 0) {
            toastContainer = $('<div class="toast-container position-fixed bottom-0 end-0 p-3"></div>');
            $('body').append(toastContainer);
        }
        
        // Create toast element
        const toastId = 'toast-' + new Date().getTime();
        const toast = $(`
            <div id="${toastId}" class="toast" role="alert" aria-live="assertive" aria-atomic="true">
                <div class="toast-header bg-${type === 'success' ? 'success' : 'danger'} text-white">
                    <strong class="me-auto">${type === 'success' ? 'Success' : 'Error'}</strong>
                    <button type="button" class="btn-close btn-close-white" data-bs-dismiss="toast" aria-label="Close"></button>
                </div>
                <div class="toast-body">${message}</div>
            </div>
        `);
        
        // Append toast to container
        toastContainer.append(toast);
        
        // Initialize Bootstrap toast and show it
        const toastElement = new bootstrap.Toast(document.getElementById(toastId), {
            delay: 5000
        });
        toastElement.show();
        
        // Remove toast from DOM after it's hidden
        $(`#${toastId}`).on('hidden.bs.toast', function() {
            $(this).remove();
        });
    }
}); 
import { API_URL } from '../../../Common/js/config.js';
import api from '../../../Common/js/api.js';

let currentUserId = null;

document.addEventListener('DOMContentLoaded', () => {
    // console.log('Tag Management page loaded.');
    
    // Check login and get user ID
    try {
        const user = JSON.parse(localStorage.getItem('user'));
        if (user && user.id) {
            currentUserId = user.id;
            // console.log('User ID:', currentUserId);
            initializeTagManagement();
        } else {
            console.error('User not logged in or ID not found.');
            showAlert('Please log in to manage tags.', 'danger');
            // Optionally disable functionality or redirect
        }
    } catch (error) {
        console.error('Error getting user ID:', error);
        showAlert('Error initializing page. Please try again.', 'danger');
    }
});

function initializeTagManagement() {
    if (!currentUserId) return;

    loadUserTags();
    setupEventListeners();
}

function setupEventListeners() {
    // Add Tag Form
    const addTagForm = document.getElementById('addTagForm');
    if (addTagForm) {
        addTagForm.addEventListener('submit', handleAddTagSubmit);
    }

    // Edit Tag Name Modal Save Button
    const saveTagNameBtn = document.getElementById('saveTagNameButton');
    if (saveTagNameBtn) {
        saveTagNameBtn.addEventListener('click', handleSaveTagName);
    }
}

// --- Tag Loading and Display ---
async function loadUserTags() {
    const tagListContainer = document.getElementById('tagListContainer');
    if (!tagListContainer) return;

    tagListContainer.innerHTML = '<div class="text-center p-3"><span class="text-muted">Loading tags...</span></div>';

    try {
        const response = await api.get('/tag/user', { params: { userId: currentUserId } });
        tagListContainer.innerHTML = ''; // Clear loading/previous content

        if (response.data.code === '200') {
            const tags = response.data.data || [];
            if (tags.length > 0) {
                tags.forEach(tag => {
                    const tagElement = createTagListItem(tag);
                    tagListContainer.appendChild(tagElement);
                });
            } else {
                tagListContainer.innerHTML = '<div class="list-group-item text-center text-muted">You haven\'t created any tags yet.</div>';
            }
            // Re-initialize feather icons if needed after adding new elements
            if (window.feather) feather.replace();
        } else {
            console.error('Failed to load tags:', response.data.msg);
            showAlert('Failed to load tags: ' + response.data.msg, 'danger');
            tagListContainer.innerHTML = '<div class="list-group-item text-center text-danger">Error loading tags.</div>';
        }
    } catch (error) {
        console.error('Error fetching tags:', error);
        showAlert('Error fetching tags. Please check your connection.', 'danger');
        tagListContainer.innerHTML = '<div class="list-group-item text-center text-danger">Error loading tags.</div>';
    }
}

function createTagListItem(tag) {
    const item = document.createElement('div');
    item.className = 'tag-list-item list-group-item'; // Removed list-group-item-action
    // item.style.cursor = 'default'; // No longer clickable as a whole
    item.dataset.tagId = tag.id;
    item.dataset.tagName = tag.name;

    const nameSpan = document.createElement('span');
    nameSpan.className = 'tag-name';
    nameSpan.textContent = escapeHTML(tag.name);

    const actionsDiv = document.createElement('div');
    actionsDiv.className = 'tag-actions';

    const manageBtn = document.createElement('button');
    manageBtn.className = 'btn btn-sm btn-outline-primary manage-songs-btn';
    manageBtn.innerHTML = '<i data-feather="music" style="width:16px; height:16px; margin-right: 4px;"></i> Manage Songs';
    manageBtn.title = 'Manage songs with this tag';
    manageBtn.addEventListener('click', () => {
        // Navigate to the new tag-songs page with parameters
        window.location.href = `tag-songs.html?tagId=${tag.id}&tagName=${encodeURIComponent(tag.name)}`;
    });

    const editBtn = document.createElement('button');
    editBtn.className = 'btn btn-sm btn-outline-secondary edit-tag-btn';
    editBtn.innerHTML = '<i data-feather="edit-2" style="width:16px; height:16px;"></i>';
    editBtn.title = 'Edit tag name';
    editBtn.addEventListener('click', (e) => {
        // No need for stopPropagation anymore
        openEditTagNameModal(tag.id, tag.name);
    });

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'btn btn-sm btn-outline-danger delete-tag-btn';
    deleteBtn.innerHTML = '<i data-feather="trash-2" style="width:16px; height:16px;"></i>';
    deleteBtn.title = 'Delete tag';
    deleteBtn.addEventListener('click', (e) => {
        // No need for stopPropagation anymore
        handleDeleteTag(tag.id, tag.name);
    });

    actionsDiv.appendChild(manageBtn); // Add manage songs button
    actionsDiv.appendChild(editBtn);
    actionsDiv.appendChild(deleteBtn);

    item.appendChild(nameSpan);
    item.appendChild(actionsDiv);
    
    // REMOVED: item.addEventListener('click', ...) 

    return item;
}

// --- Add/Edit/Delete Tag Logic (Mostly unchanged) ---
async function handleAddTagSubmit(event) {
    event.preventDefault();
    const tagNameInput = document.getElementById('newTagName');
    const tagName = tagNameInput.value.trim();
    const addButton = event.target.querySelector('button[type="submit"]');
    
    if (!tagName) {
        showAlert('Please enter a tag name.', 'warning');
        return;
    }
    if (!currentUserId) {
         showAlert('Cannot add tag: User ID missing.', 'danger');
         return;
    }

    // Disable button
    addButton.disabled = true;
    addButton.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Adding...';

    try {
        // IMPORTANT: Assumes a POST /tag/add endpoint exists or will be created
        // It should accept { name: tagName, userId: currentUserId } or similar
        const response = await api.post('/tag/add', { name: tagName, userId: currentUserId }); 

        if (response.data.code === '200') {
            showAlert('Tag added successfully!', 'success');
            tagNameInput.value = ''; // Clear input
            loadUserTags(); // Refresh the tag list
        } else {
            console.error('Failed to add tag:', response.data.msg);
            showAlert('Failed to add tag: ' + (response.data.msg || 'Unknown error'), 'danger');
        }
    } catch (error) {
        console.error('Error adding tag:', error);
        let errorMsg = 'Error adding tag. Please try again.';
        if (error.response && error.response.data && error.response.data.msg) {
             errorMsg += ` Server said: ${error.response.data.msg}`;
        }
        showAlert(errorMsg, 'danger');
        // Display backend missing error specifically?
        if (error.response && error.response.status === 404) {
             showAlert("Error: The backend endpoint to add tags is missing. Please contact support.", 'danger');
        }
    } finally {
        // Re-enable button
        addButton.disabled = false;
        addButton.innerHTML = 'Add Tag';
    }
}

function openEditTagNameModal(tagId, currentName) {
    document.getElementById('editTagId').value = tagId;
    document.getElementById('editTagNameInput').value = currentName;
    document.getElementById('editTagNameMessage').innerHTML = '';
    $('#editTagNameModal').modal('show');
}

async function handleSaveTagName() {
    const tagId = document.getElementById('editTagId').value;
    const newName = document.getElementById('editTagNameInput').value.trim();
    const saveButton = document.getElementById('saveTagNameButton');
    const messageDiv = document.getElementById('editTagNameMessage');
    messageDiv.innerHTML = '';

    if (!newName) {
        messageDiv.innerHTML = '<div class="alert alert-warning">Tag name cannot be empty.</div>';
        return;
    }
    
    saveButton.disabled = true;
    saveButton.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Saving...';

    try {
        const response = await api.post('/tag/update', { id: tagId, name: newName }); // Using POST as per controller

        if (response.data.code === '200') {
            messageDiv.innerHTML = '<div class="alert alert-success">Tag name updated successfully!</div>';
            loadUserTags(); // Refresh list
            setTimeout(() => {
                 $('#editTagNameModal').modal('hide');
            }, 1500);
        } else {
            messageDiv.innerHTML = `<div class="alert alert-danger">Failed to update tag: ${response.data.msg || 'Unknown error'}</div>`;
        }
    } catch (error) {
        console.error('Error updating tag name:', error);
        messageDiv.innerHTML = `<div class="alert alert-danger">Error updating tag: ${error.message || 'Please try again'}</div>`;
    } finally {
        saveButton.disabled = false;
        saveButton.innerHTML = 'Save Name';
    }
}

async function handleDeleteTag(tagId, tagName) {
    // Use SweetAlert2 for confirmation
    Swal.fire({
        title: 'Are you sure?',
        text: `Do you really want to delete the tag "${escapeHTML(tagName)}"? This cannot be undone.`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Yes, delete it!'
    }).then(async (result) => {
        if (result.isConfirmed) {
            try {
                // Use GET as per controller, pass ID in URL path or query param
                // Let's assume query param based on controller code
                const response = await api.get('/tag/delete', { params: { id: tagId } }); 

                if (response.data.code === '200') {
                    Swal.fire(
                        'Deleted!',
                        'The tag has been deleted.',
                        'success'
                    );
                    loadUserTags(); // Refresh the list
                } else {
                    Swal.fire(
                        'Error!',
                        `Failed to delete tag: ${response.data.msg || 'Unknown error'}`, 
                        'error'
                    );
                }
            } catch (error) {
                console.error('Error deleting tag:', error);
                Swal.fire(
                    'Error!',
                    `An error occurred: ${error.message || 'Please try again'}`, 
                    'error'
                );
            }
        }
    });
}

// --- REMOVED Song Loading and Display for a Tag Functions ---
// REMOVED: handleTagClick, preloadUserSongs, loadSongsForTag, displayTagSongs, createTagSongCard

// --- REMOVED Edit Song Tags Modal Logic Functions ---
// REMOVED: setupEditTagsListeners, handleEditTagsClick, populateTagModal, handleSaveTags

// --- REMOVED UI Navigation Functions ---
// REMOVED: showTagManagementArea, showTagSongsArea

// --- Utility Functions (Unchanged) ---

/**
 * HTML escape function
 */
function escapeHTML(str) {
    if (!str) return '';
    return String(str).replace(/[&<>'"/]/g, 
        tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;', '/': '&#x2F;' }[tag] || tag)
    );
}

/**
 * Show alert messages in specified container
 */
function showAlert(message, type = 'info', containerId = 'alerts') {
    const alertContainer = document.getElementById(containerId);
    if (!alertContainer) {
        console.error(`Alert container with ID '${containerId}' not found.`);
        if (containerId !== 'alerts') showAlert(message, type, 'alerts'); // Fallback
        else console.error(`Alert: [${type}] ${message}`); // Final fallback
        return;
    }
    
    const alertId = `alert-${Date.now()}`;
    const alertHTML = `
        <div id="${alertId}" class="alert alert-${type} alert-dismissible fade show" role="alert">
            ${escapeHTML(message)}
            <button type="button" class="close" data-dismiss="alert" aria-label="Close">
                <span aria-hidden="true">&times;</span>
            </button>
        </div>
    `;
    alertContainer.insertAdjacentHTML('beforeend', alertHTML); 
    
    // Auto-dismiss after 5 seconds (using Bootstrap 4 method)
    const alertElement = document.getElementById(alertId);
    if (alertElement) {
        setTimeout(() => {
            $(alertElement).alert('close'); 
        }, 5000);
    }
}

// Helper to get API endpoint URL (ensure consistency)
function getApiEndpoint() {
    return typeof API_URL !== 'undefined' ? API_URL : 'http://localhost:8080';
} 
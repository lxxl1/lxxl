import { API_URL } from '../../../Common/js/config.js';
import api from '../../../Common/js/api.js';

// Current user ID
let currentUserId = null;

document.addEventListener('DOMContentLoaded', function() {
    // Get current user ID
    getCurrentUserId();
    
    // Initialize page
    initPage();
    
    // Bind events
    bindEvents();
});

/**
 * Get current user ID
 */
function getCurrentUserId() {
    try {
        const user = JSON.parse(localStorage.getItem('user'));
        if (user && user.id) {
            currentUserId = user.id;
            return currentUserId;
        } else {
            console.error('User not logged in or ID missing');
            showMessage('Please login first', 'danger');
            setTimeout(() => {
                window.location.href = '../login.html';
            }, 2000);
            return null;
        }
    } catch (e) {
        console.error('Error parsing user data:', e);
        return null;
    }
}

/**
 * Initialize page
 */
async function initPage() {
    if (!currentUserId) return;
    
    try {
        // Load user tags
        await loadUserTags();
    } catch (error) {
        console.error('Failed to initialize page:', error);
        showMessage('Failed to load data. Please try again later.', 'danger');
    }
}

/**
 * Bind events
 */
function bindEvents() {
    // Add tag form submission
    const addTagForm = document.getElementById('addTagForm');
    if (addTagForm) {
        addTagForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            if (!currentUserId) {
                showMessage('Please login first', 'danger');
                return;
            }
            
            const tagNameInput = document.getElementById('newTagName');
            if (!tagNameInput) {
                console.error('Cannot find tag name input field');
                return;
            }
            
            const tagName = tagNameInput.value.trim();
            
            if (!tagName) {
                showMessage('Please enter a tag name', 'warning');
                return;
            }
            
            try {
                await createTag(tagName, currentUserId);
                
                // Clear input
                tagNameInput.value = '';
                
                // Reload tag list
                await loadUserTags();
                
                showMessage('Tag created successfully', 'success');
            } catch (error) {
                console.error('Failed to create tag:', error);
                showMessage('Failed to create tag: ' + (error.message || 'Unknown error'), 'danger');
            }
        });
    } else {
        console.error('Cannot find add tag form');
    }
    
    // Delete tag button click event (using event delegation)
    document.addEventListener('click', async function(e) {
        if (e.target.closest('.delete-tag-btn')) {
            e.preventDefault();
            
            if (!currentUserId) {
                showMessage('Please login first', 'danger');
                return;
            }
            
            const tagId = e.target.closest('.delete-tag-btn').getAttribute('data-id');
            
            if (confirm('Are you sure you want to delete this tag?')) {
                try {
                    await deleteTag(tagId);
                    showMessage('Tag deleted successfully', 'success');
                    
                    // Refresh tag list
                    await loadUserTags();
                } catch (error) {
                    console.error('Failed to delete tag:', error);
                    showMessage('Failed to delete tag: ' + (error.message || 'Unknown error'), 'danger');
                }
            }
        }
    });
}

/**
 * Load user tags
 */
async function loadUserTags() {
    if (!currentUserId) return;
    
    const tagList = document.getElementById('tagList');
    if (!tagList) {
        console.error('Cannot find tag list container');
        return;
    }
    
    // Show loading status
    tagList.innerHTML = '<p class="text-center">Loading tags...</p>';
    
    try {
        const response = await api.get('/tag/user', {
            params: { userId: currentUserId }
        });
        
        if (response.data.code === '200') {
            const tags = response.data.data || [];
            renderTagsList(tags);
            return tags;
        } else {
            throw new Error(response.data.msg || 'Failed to get tag list');
        }
    } catch (error) {
        console.error('Failed to load user tags:', error);
        tagList.innerHTML = '<p class="text-center text-danger">Failed to load tags. Please refresh the page and try again.</p>';
        throw error;
    }
}

/**
 * Create tag
 * @param {string} name - Tag name
 * @param {number} userId - User ID
 */
async function createTag(name, userId) {
    try {
        // Use provided API to add tag
        const formData = new FormData();
        formData.append('name', name);
        formData.append('userId', userId);
        
        const response = await api.post('/tag/add', formData);
        
        if (response.data.code === '200') {
            return response.data.data;
        } else {
            throw new Error(response.data.msg || 'Failed to create tag');
        }
    } catch (error) {
        console.error('Failed to call create tag API:', error);
        throw error;
    }
}

/**
 * Delete tag
 * @param {number} tagId - Tag ID
 */
async function deleteTag(tagId) {
    try {
        const response = await api.get('/tag/delete', {
            params: { id: tagId }
        });
        
        if (response.data.code === '200') {
            return true;
        } else {
            throw new Error(response.data.msg || 'Failed to delete tag');
        }
    } catch (error) {
        console.error('Failed to call delete tag API:', error);
        throw error;
    }
}

/**
 * Render tags list
 * @param {Array} tags - Tags array
 */
function renderTagsList(tags) {
    const tagList = document.getElementById('tagList');
    if (!tagList) return;
    
    if (!tags || tags.length === 0) {
        tagList.innerHTML = '<p class="text-center">You have not created any tags yet</p>';
        return;
    }
    
    let html = '';
    
    tags.forEach(tag => {
        html += `
        <div class="list-group-item d-flex justify-content-between align-items-center">
            <span class="tag-name">${escapeHTML(tag.name)}</span>
            <button class="btn btn-sm btn-outline-danger delete-tag-btn" data-id="${tag.id}">
                <i data-feather="trash-2"></i> Delete
            </button>
        </div>
        `;
    });
    
    tagList.innerHTML = html;
    
    // Initialize Feather icons
    if (window.feather) {
        feather.replace();
    }
}

/**
 * HTML escape function
 * @param {string} str - String to escape
 * @returns {string} Escaped string
 */
function escapeHTML(str) {
    if (!str) return '';
    return str.replace(/[&<>'"]/g, 
        tag => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            "'": '&#39;',
            '"': '&quot;'
        }[tag] || tag)
    );
}

/**
 * Show message notification
 * @param {string} message - Message content
 * @param {string} type - Message type (success, danger, warning, info)
 */
function showMessage(message, type) {
    // Check if message container exists
    let messageContainer = document.querySelector('.message-container');
    if (!messageContainer) {
        messageContainer = document.createElement('div');
        messageContainer.className = 'message-container position-fixed top-0 end-0 p-3';
        messageContainer.style.zIndex = '9999';
        messageContainer.style.top = '1rem';
        messageContainer.style.right = '1rem';
        document.body.appendChild(messageContainer);
    }
    
    // Create message element
    const messageElement = document.createElement('div');
    messageElement.className = `alert alert-${type} alert-dismissible fade show`;
    messageElement.setAttribute('role', 'alert');
    messageElement.innerHTML = `
        ${message}
        <button type="button" class="close" data-dismiss="alert" aria-label="Close">
            <span aria-hidden="true">&times;</span>
        </button>
    `;
    
    // Add to container
    messageContainer.appendChild(messageElement);
    
    // Auto close
    setTimeout(() => {
        $(messageElement).alert('close');
    }, 5000);
} 
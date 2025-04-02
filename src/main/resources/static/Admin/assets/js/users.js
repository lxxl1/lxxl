import { API_URL } from '../../../Common/js/config.js';

// Initialize DataTable
let usersTable;
let selectedUsers = [];

document.addEventListener('DOMContentLoaded', function() {
    // Initialize the DataTable with empty data first
    initializeDataTable();
    
    // Fetch and display users
    loadUsers();
    
    // Add event listeners
    setupEventListeners();
    
    // Load current admin name
    loadAdminInfo();
});

/**
 * Initialize the DataTable
 */
function initializeDataTable() {
    usersTable = $('#usersTable').DataTable({
        columns: [
            { 
                data: null,
                render: function(data, type, row) {
                    return `<div class="form-check">
                        <input class="form-check-input user-select" type="checkbox" value="${row.id}" id="check-${row.id}">
                        <label class="form-check-label" for="check-${row.id}"></label>
                    </div>`;
                },
                orderable: false
            },
            { data: 'username' },
            { data: 'name' },
            { 
                data: 'status',
                render: function(data) {
                    let badgeClass = 'bg-success';
                    if (data === 'Inactive') badgeClass = 'bg-secondary';
                    if (data === 'Suspended') badgeClass = 'bg-danger';
                    return `<span class="badge ${badgeClass}">${data}</span>`;
                }
            },
            { 
                data: null,
                render: function(data, type, row) {
                    return `
                        <div class="btn-group">
                            <button class="btn btn-sm btn-info view-user" data-id="${row.id}">
                                <i class="fas fa-eye"></i>
                            </button>
                            <button class="btn btn-sm btn-primary edit-user" data-id="${row.id}">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn btn-sm btn-danger delete-user" data-id="${row.id}">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    `;
                },
                orderable: false
            }
        ],
        responsive: true,
        order: [[1, 'asc']],
        language: {
            search: "_INPUT_",
            searchPlaceholder: "Search users...",
            emptyTable: "No users found"
        }
    });
}

/**
 * Load users from the API
 */
async function loadUsers(searchQuery = '', statusFilter = '') {
    try {
        const params = new URLSearchParams();
        if (searchQuery) params.append('username', searchQuery);
        if (statusFilter) params.append('status', statusFilter);
        
        const response = await axios.get(`${API_URL}/user/selectAll?${params.toString()}`);
        
        if (response.data.code === '1') {
            updateUserTable(response.data.data);
        } else {
            showAlert('Error loading users: ' + response.data.msg, 'danger');
        }
    } catch (error) {
        console.error('Error loading users:', error);
        showAlert('Failed to load users. Please try again later.', 'danger');
    }
}

/**
 * Load users with pagination
 */
async function loadUsersPaginated(pageNum = 1, pageSize = 10, searchQuery = '', statusFilter = '') {
    try {
        const params = new URLSearchParams();
        params.append('pageNum', pageNum);
        params.append('pageSize', pageSize);
        if (searchQuery) params.append('username', searchQuery);
        if (statusFilter) params.append('status', statusFilter);
        
        const response = await axios.get(`${API_URL}/user/selectPage?${params.toString()}`);
        
        if (response.data.code === '1') {
            updateUserTable(response.data.data.list);
            // Here you could also update pagination controls if needed
        } else {
            showAlert('Error loading users: ' + response.data.msg, 'danger');
        }
    } catch (error) {
        console.error('Error loading paginated users:', error);
        showAlert('Failed to load users. Please try again later.', 'danger');
    }
}

/**
 * Update the DataTable with user data
 */
function updateUserTable(users) {
    usersTable.clear();
    usersTable.rows.add(users);
    usersTable.draw();
}

/**
 * Add a new user
 */
async function addUser(userData) {
    try {
        const response = await axios.post(`${API_URL}/user/add`, userData);
        
        if (response.data.code === '1') {
            showAlert('User added successfully!', 'success');
            loadUsers(); // Reload the table
            return true;
        } else {
            showAlert('Error adding user: ' + response.data.msg, 'danger');
            return false;
        }
    } catch (error) {
        console.error('Error adding user:', error);
        showAlert('Failed to add user. Please try again.', 'danger');
        return false;
    }
}

/**
 * Get user by ID
 */
async function getUserById(id) {
    try {
        const response = await axios.get(`${API_URL}/user/selectById/${id}`);
        
        if (response.data.code === '1') {
            return response.data.data;
        } else {
            showAlert('Error retrieving user: ' + response.data.msg, 'danger');
            return null;
        }
    } catch (error) {
        console.error('Error retrieving user:', error);
        showAlert('Failed to retrieve user. Please try again.', 'danger');
        return null;
    }
}

/**
 * Update user
 */
async function updateUser(userData) {
    try {
        const response = await axios.put(`${API_URL}/user/update`, userData);
        
        if (response.data.code === '1') {
            showAlert('User updated successfully!', 'success');
            loadUsers(); // Reload the table
            return true;
        } else {
            showAlert('Error updating user: ' + response.data.msg, 'danger');
            return false;
        }
    } catch (error) {
        console.error('Error updating user:', error);
        showAlert('Failed to update user. Please try again.', 'danger');
        return false;
    }
}

/**
 * Delete user
 */
async function deleteUser(id) {
    try {
        const response = await axios.delete(`${API_URL}/user/delete/${id}`);
        
        if (response.data.code === '1') {
            showAlert('User deleted successfully!', 'success');
            loadUsers(); // Reload the table
            return true;
        } else {
            showAlert('Error deleting user: ' + response.data.msg, 'danger');
            return false;
        }
    } catch (error) {
        console.error('Error deleting user:', error);
        showAlert('Failed to delete user. Please try again.', 'danger');
        return false;
    }
}

/**
 * Delete multiple users
 */
async function deleteBatchUsers(ids) {
    try {
        const response = await axios.delete(`${API_URL}/user/delete/batch`, { data: ids });
        
        if (response.data.code === '1') {
            showAlert('Users deleted successfully!', 'success');
            loadUsers(); // Reload the table
            return true;
        } else {
            showAlert('Error deleting users: ' + response.data.msg, 'danger');
            return false;
        }
    } catch (error) {
        console.error('Error deleting users:', error);
        showAlert('Failed to delete users. Please try again.', 'danger');
        return false;
    }
}

/**
 * Setup event listeners for the page
 */
function setupEventListeners() {
    // Search button
    document.querySelector('button.btn-primary i.fas.fa-search').parentElement.addEventListener('click', function() {
        const searchQuery = document.getElementById('searchInput').value;
        const statusFilter = document.getElementById('statusFilter').value;
        loadUsers(searchQuery, statusFilter);
    });
    
    // Add user button
    document.querySelector('.card-header .btn-primary').addEventListener('click', function() {
        openAddUserModal();
    });
    
    // Status filter
    document.getElementById('statusFilter').addEventListener('change', function() {
        const searchQuery = document.getElementById('searchInput').value;
        const statusFilter = this.value;
        loadUsers(searchQuery, statusFilter);
    });
    
    // Table row selection
    $('#usersTable').on('change', '.user-select', function() {
        const userId = $(this).val();
        if (this.checked) {
            if (!selectedUsers.includes(userId)) {
                selectedUsers.push(userId);
            }
        } else {
            selectedUsers = selectedUsers.filter(id => id !== userId);
        }
        updateBulkActionButtons();
    });
    
    // View user
    $('#usersTable').on('click', '.view-user', async function() {
        const userId = $(this).data('id');
        const user = await getUserById(userId);
        if (user) {
            showUserDetails(user);
        }
    });
    
    // Edit user
    $('#usersTable').on('click', '.edit-user', async function() {
        const userId = $(this).data('id');
        const user = await getUserById(userId);
        if (user) {
            openEditUserModal(user);
        }
    });
    
    // Delete user
    $('#usersTable').on('click', '.delete-user', function() {
        const userId = $(this).data('id');
        confirmDeleteUser(userId);
    });
}

/**
 * Load admin information
 */
function loadAdminInfo() {
    const adminData = JSON.parse(localStorage.getItem('user')) || { name: 'Admin' };
    document.getElementById('adminName').textContent = adminData.name;
}

/**
 * Show alert message
 */
function showAlert(message, type = 'primary') {
    // Check if alert container exists, if not create it
    let alertContainer = document.getElementById('alertContainer');
    if (!alertContainer) {
        alertContainer = document.createElement('div');
        alertContainer.id = 'alertContainer';
        alertContainer.style.position = 'fixed';
        alertContainer.style.top = '20px';
        alertContainer.style.right = '20px';
        alertContainer.style.zIndex = '9999';
        document.body.appendChild(alertContainer);
    }
    
    const alert = document.createElement('div');
    alert.className = `alert alert-${type} alert-dismissible fade show`;
    alert.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `;
    
    alertContainer.appendChild(alert);
    
    // Remove the alert after 5 seconds
    setTimeout(() => {
        alert.classList.remove('show');
        setTimeout(() => alert.remove(), 300);
    }, 5000);
}

/**
 * Open modal for adding a new user
 */
function openAddUserModal() {
    // Template for the modal - assuming Bootstrap 5
    const modalHtml = `
    <div class="modal fade" id="addUserModal" tabindex="-1" aria-hidden="true">
        <div class="modal-dialog">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title">Add New User</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body">
                    <form id="addUserForm">
                        <div class="mb-3">
                            <label for="username" class="form-label">Username</label>
                            <input type="text" class="form-control" id="username" required>
                        </div>
                        <div class="mb-3">
                            <label for="name" class="form-label">Name</label>
                            <input type="text" class="form-control" id="name" required>
                        </div>
                        <div class="mb-3">
                            <label for="password" class="form-label">Password</label>
                            <input type="password" class="form-control" id="password" required>
                        </div>
                        <div class="mb-3">
                            <label for="status" class="form-label">Status</label>
                            <select class="form-select" id="status">
                                <option value="Active">Active</option>
                                <option value="Inactive">Inactive</option>
                            </select>
                        </div>
                    </form>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                    <button type="button" class="btn btn-primary" id="saveUserBtn">Save User</button>
                </div>
            </div>
        </div>
    </div>
    `;
    
    // Create and append the modal
    const modalContainer = document.createElement('div');
    modalContainer.innerHTML = modalHtml;
    document.body.appendChild(modalContainer);
    
    // Initialize the modal
    const modal = new bootstrap.Modal(document.getElementById('addUserModal'));
    modal.show();
    
    // Handle save button
    document.getElementById('saveUserBtn').addEventListener('click', async function() {
        const userData = {
            username: document.getElementById('username').value,
            name: document.getElementById('name').value,
            password: document.getElementById('password').value,
            status: document.getElementById('status').value,
            role: 'USER'  // Default role for users created in admin panel
        };
        
        if (await addUser(userData)) {
            modal.hide();
            // Remove the modal from DOM after hiding
            document.getElementById('addUserModal').addEventListener('hidden.bs.modal', function() {
                this.remove();
            });
        }
    });
    
    // Clean up when modal is closed
    document.getElementById('addUserModal').addEventListener('hidden.bs.modal', function() {
        this.remove();
    });
}

/**
 * Open modal for editing a user
 */
function openEditUserModal(user) {
    // Template for the modal - assuming Bootstrap 5
    const modalHtml = `
    <div class="modal fade" id="editUserModal" tabindex="-1" aria-hidden="true">
        <div class="modal-dialog">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title">Edit User</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body">
                    <form id="editUserForm">
                        <input type="hidden" id="userId" value="${user.id}">
                        <div class="mb-3">
                            <label for="username" class="form-label">Username</label>
                            <input type="text" class="form-control" id="username" value="${user.username}" readonly>
                        </div>
                        <div class="mb-3">
                            <label for="name" class="form-label">Name</label>
                            <input type="text" class="form-control" id="name" value="${user.name}" required>
                        </div>
                        <div class="mb-3">
                            <label for="status" class="form-label">Status</label>
                            <select class="form-select" id="status">
                                <option value="Active" ${user.status === 'Active' ? 'selected' : ''}>Active</option>
                                <option value="Inactive" ${user.status === 'Inactive' ? 'selected' : ''}>Inactive</option>
                                <option value="Suspended" ${user.status === 'Suspended' ? 'selected' : ''}>Suspended</option>
                            </select>
                        </div>
                    </form>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                    <button type="button" class="btn btn-primary" id="updateUserBtn">Update User</button>
                </div>
            </div>
        </div>
    </div>
    `;
    
    // Create and append the modal
    const modalContainer = document.createElement('div');
    modalContainer.innerHTML = modalHtml;
    document.body.appendChild(modalContainer);
    
    // Initialize the modal
    const modal = new bootstrap.Modal(document.getElementById('editUserModal'));
    modal.show();
    
    // Handle update button
    document.getElementById('updateUserBtn').addEventListener('click', async function() {
        const userData = {
            id: document.getElementById('userId').value,
            name: document.getElementById('name').value,
            status: document.getElementById('status').value
        };
        
        if (await updateUser(userData)) {
            modal.hide();
        }
    });
    
    // Clean up when modal is closed
    document.getElementById('editUserModal').addEventListener('hidden.bs.modal', function() {
        this.remove();
    });
}

/**
 * Show user details
 */
function showUserDetails(user) {
    // Template for the modal
    const modalHtml = `
    <div class="modal fade" id="viewUserModal" tabindex="-1" aria-hidden="true">
        <div class="modal-dialog">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title">User Details</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body">
                    <div class="card">
                        <div class="card-body">
                            <h5 class="card-title">${user.name}</h5>
                            <h6 class="card-subtitle mb-2 text-muted">@${user.username}</h6>
                            <p class="card-text">
                                <strong>Status:</strong> 
                                <span class="badge ${user.status === 'Active' ? 'bg-success' : (user.status === 'Inactive' ? 'bg-secondary' : 'bg-danger')}">
                                    ${user.status}
                                </span>
                            </p>
                            <p class="card-text"><strong>Role:</strong> ${user.role}</p>
                            <p class="card-text"><strong>ID:</strong> ${user.id}</p>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                </div>
            </div>
        </div>
    </div>
    `;
    
    // Create and append the modal
    const modalContainer = document.createElement('div');
    modalContainer.innerHTML = modalHtml;
    document.body.appendChild(modalContainer);
    
    // Initialize and show the modal
    const modal = new bootstrap.Modal(document.getElementById('viewUserModal'));
    modal.show();
    
    // Clean up when modal is closed
    document.getElementById('viewUserModal').addEventListener('hidden.bs.modal', function() {
        this.remove();
    });
}

/**
 * Confirm before deleting a user
 */
function confirmDeleteUser(userId) {
    // Template for the confirmation modal
    const modalHtml = `
    <div class="modal fade" id="deleteUserModal" tabindex="-1" aria-hidden="true">
        <div class="modal-dialog">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title">Confirm Deletion</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body">
                    <p>Are you sure you want to delete this user? This action cannot be undone.</p>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                    <button type="button" class="btn btn-danger" id="confirmDeleteBtn">Delete</button>
                </div>
            </div>
        </div>
    </div>
    `;
    
    // Create and append the modal
    const modalContainer = document.createElement('div');
    modalContainer.innerHTML = modalHtml;
    document.body.appendChild(modalContainer);
    
    // Initialize the modal
    const modal = new bootstrap.Modal(document.getElementById('deleteUserModal'));
    modal.show();
    
    // Handle delete confirmation
    document.getElementById('confirmDeleteBtn').addEventListener('click', async function() {
        if (await deleteUser(userId)) {
            modal.hide();
        }
    });
    
    // Clean up when modal is closed
    document.getElementById('deleteUserModal').addEventListener('hidden.bs.modal', function() {
        this.remove();
    });
}

/**
 * Update bulk action buttons based on selection
 */
function updateBulkActionButtons() {
    // Add UI elements for bulk actions if needed
    const actionsExist = document.querySelector('.bulk-actions');
    
    if (selectedUsers.length > 0) {
        if (!actionsExist) {
            const bulkActionsHtml = `
            <div class="bulk-actions card mb-3">
                <div class="card-body d-flex justify-content-between align-items-center">
                    <span>${selectedUsers.length} users selected</span>
                    <div>
                        <button class="btn btn-danger bulk-delete">
                            <i class="fas fa-trash"></i> Delete Selected
                        </button>
                    </div>
                </div>
            </div>
            `;
            
            const usersTable = document.querySelector('#usersTable');
            usersTable.parentNode.insertBefore(document.createRange().createContextualFragment(bulkActionsHtml), usersTable);
            
            // Add event listener for bulk delete
            document.querySelector('.bulk-delete').addEventListener('click', function() {
                confirmDeleteBatch(selectedUsers);
            });
        } else {
            document.querySelector('.bulk-actions span').textContent = `${selectedUsers.length} users selected`;
        }
    } else if (actionsExist) {
        actionsExist.remove();
    }
}

/**
 * Confirm before deleting multiple users
 */
function confirmDeleteBatch(userIds) {
    // Template for the confirmation modal
    const modalHtml = `
    <div class="modal fade" id="deleteBatchModal" tabindex="-1" aria-hidden="true">
        <div class="modal-dialog">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title">Confirm Multiple Deletion</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body">
                    <p>Are you sure you want to delete ${userIds.length} users? This action cannot be undone.</p>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                    <button type="button" class="btn btn-danger" id="confirmBatchDeleteBtn">Delete All</button>
                </div>
            </div>
        </div>
    </div>
    `;
    
    // Create and append the modal
    const modalContainer = document.createElement('div');
    modalContainer.innerHTML = modalHtml;
    document.body.appendChild(modalContainer);
    
    // Initialize the modal
    const modal = new bootstrap.Modal(document.getElementById('deleteBatchModal'));
    modal.show();
    
    // Handle delete confirmation
    document.getElementById('confirmBatchDeleteBtn').addEventListener('click', async function() {
        if (await deleteBatchUsers(userIds)) {
            modal.hide();
            selectedUsers = [];
            updateBulkActionButtons();
        }
    });
    
    // Clean up when modal is closed
    document.getElementById('deleteBatchModal').addEventListener('hidden.bs.modal', function() {
        this.remove();
    });
} 
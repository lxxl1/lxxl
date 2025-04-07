import { API_URL } from '../../../Common/js/config.js';

// Initialize DataTable and statistics
let usersTable;
let selectedUsers = [];
let userStats = {
    total: 0,
    active: 0,
    inactive: 0,
    suspended: 0
};

document.addEventListener('DOMContentLoaded', function() {
    // Initialize the DataTable with empty data first
    initializeDataTable();
    
    // Add statistics cards to the page
    addStatisticsCards();
    
    // Fetch and display users
    loadUsers();
    
    // Add event listeners
    setupEventListeners();
    
    // Load current admin name
    loadAdminInfo();
    
    // Add custom styles
    addCustomStyles();
    
    // Add search and filter container if it doesn't exist
    const tableContainer = document.querySelector('#usersTable')?.parentElement;
    if (tableContainer) {
        const controlsHtml = `
            <div class="row mb-3">
                <div class="col-md-6">
                    <div class="input-group">
                        <input type="text" id="searchInput" class="form-control" placeholder="Search users...">
                        <button class="btn btn-primary">
                            <i class="fas fa-search"></i>
                        </button>
                    </div>
                </div>
                <div class="col-md-6">
                    <select id="statusFilter" class="form-select">
                        <option value="">All Status</option>
                        <option value="Active">Active</option>
                        <option value="Inactive">Inactive</option>
                        <option value="Suspended">Suspended</option>
                    </select>
                </div>
            </div>
        `;
        
        tableContainer.insertAdjacentHTML('beforebegin', controlsHtml);
    }
    
    // Add table header button if it doesn't exist
    const cardHeader = document.querySelector('.card-header');
    if (cardHeader && !cardHeader.querySelector('.btn-primary')) {
        const addButtonHtml = `
            <button class="btn btn-primary float-end">
                <i class="fas fa-plus me-1"></i> Add User
            </button>
        `;
        cardHeader.insertAdjacentHTML('beforeend', addButtonHtml);
    }
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
                orderable: false,
                className: 'text-center'
            },
            { 
                data: 'username',
                render: function(data, type, row) {
                    return `<div class="d-flex align-items-center">
                        <div class="user-avatar rounded-circle mr-2 bg-light text-primary">
                            ${data.charAt(0).toUpperCase()}
                        </div>
                        <div class="user-info">
                            <div class="font-weight-bold">${data}</div>
                            <small class="text-muted">${row.name}</small>
                        </div>
                    </div>`;
                }
            },
            { 
                data: 'status',
                render: function(data) {
                    let badgeClass = 'bg-success';
                    let icon = 'check-circle';
                    
                    if (data === 'Inactive') {
                        badgeClass = 'bg-secondary';
                        icon = 'clock';
                    } else if (data === 'Suspended') {
                        badgeClass = 'bg-danger';
                        icon = 'ban';
                    }
                    
                    return `<span class="badge ${badgeClass}">
                        <i class="fas fa-${icon} me-1"></i> ${data}
                    </span>`;
                },
                className: 'text-center'
            },
            { 
                data: 'role',
                render: function(data) {
                    const roleClass = data === 'ADMIN' ? 'bg-warning' : 'bg-info';
                    const icon = data === 'ADMIN' ? 'crown' : 'user';
                    return `<span class="badge ${roleClass}">
                        <i class="fas fa-${icon} me-1"></i> ${data}
                    </span>`;
                },
                className: 'text-center'
            },
            { 
                data: null,
                render: function(data, type, row) {
                    return `
                        <div class="btn-group">
                            <button class="btn btn-sm btn-outline-info view-user" data-id="${row.id}" title="View Details">
                                <i class="fas fa-eye"></i>
                            </button>
                            <button class="btn btn-sm btn-outline-primary edit-user" data-id="${row.id}" title="Edit User">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn btn-sm btn-outline-danger delete-user" data-id="${row.id}" title="Delete User">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    `;
                },
                orderable: false,
                className: 'text-center'
            }
        ],
        responsive: true,
        order: [[1, 'asc']],
        language: {
            search: "_INPUT_",
            searchPlaceholder: "Search users...",
            emptyTable: "No users found",
            info: "Showing _START_ to _END_ of _TOTAL_ users",
            infoEmpty: "No users available",
            infoFiltered: "(filtered from _MAX_ total users)",
            lengthMenu: "Show _MENU_ users per page",
            zeroRecords: "No matching users found"
        },
        dom: '<"row"<"col-sm-12 col-md-6"l><"col-sm-12 col-md-6"f>>' +
             '<"row"<"col-sm-12"tr>>' +
             '<"row"<"col-sm-12 col-md-5"i><"col-sm-12 col-md-7"p>>',
        drawCallback: function() {
            // Add tooltips to action buttons
            $('[title]').tooltip();
        }
    });
}

/**
 * Add statistics cards to the page
 */
function addStatisticsCards() {
    const statsHtml = `
        <div class="row mb-4">
            <div class="col-xl-3 col-sm-6 mb-3">
                <div class="card text-white bg-primary o-hidden h-100">
                    <div class="card-body">
                        <div class="card-body-icon">
                            <i class="fas fa-users"></i>
                        </div>
                        <div>Total Users</div>
                        <div class="mr-5" id="totalUsers">0</div>
                    </div>
                </div>
            </div>
            <div class="col-xl-3 col-sm-6 mb-3">
                <div class="card text-white bg-success o-hidden h-100">
                    <div class="card-body">
                        <div class="card-body-icon">
                            <i class="fas fa-user-check"></i>
                        </div>
                        <div>Active Users</div>
                        <div class="mr-5" id="activeUsers">0</div>
                    </div>
                </div>
            </div>
            <div class="col-xl-3 col-sm-6 mb-3">
                <div class="card text-white bg-secondary o-hidden h-100">
                    <div class="card-body">
                        <div class="card-body-icon">
                            <i class="fas fa-user-clock"></i>
                        </div>
                        <div>Inactive Users</div>
                        <div class="mr-5" id="inactiveUsers">0</div>
                    </div>
                </div>
            </div>
            <div class="col-xl-3 col-sm-6 mb-3">
                <div class="card text-white bg-danger o-hidden h-100">
                    <div class="card-body">
                        <div class="card-body-icon">
                            <i class="fas fa-user-slash"></i>
                        </div>
                        <div>Suspended Users</div>
                        <div class="mr-5" id="suspendedUsers">0</div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Insert statistics cards before the users table
    const tableContainer = document.querySelector('#usersTable').parentElement;
    tableContainer.insertAdjacentHTML('beforebegin', statsHtml);
}

/**
 * Update user statistics
 */
function updateUserStats(users) {
    userStats = {
        total: users.length,
        active: users.filter(user => user.status === 'Active').length,
        inactive: users.filter(user => user.status === 'Inactive').length,
        suspended: users.filter(user => user.status === 'Suspended').length
    };
    
    // Update the UI
    document.getElementById('totalUsers').textContent = userStats.total;
    document.getElementById('activeUsers').textContent = userStats.active;
    document.getElementById('inactiveUsers').textContent = userStats.inactive;
    document.getElementById('suspendedUsers').textContent = userStats.suspended;
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
        
        if (response.data.code === '200') {
            const users = response.data.data;
            updateUserTable(users);
            updateUserStats(users);
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
        
        if (response.data.code === '200') {
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
        
        if (response.data.code === '200') {
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
        
        if (response.data.code === '200') {
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
 * Get user by username
 */
async function getUserByUsername(username) {
    try {
        const response = await axios.get(`${API_URL}/user/selectByUsername?userName=${username}`);
        
        if (response.data.code === '200') {
            return response.data.data;
        } else {
            showAlert('Error retrieving user: ' + response.data.msg, 'danger');
            return null;
        }
    } catch (error) {
        console.error('Error retrieving user by username:', error);
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
        
        if (response.data.code === '200') {
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
        
        if (response.data.code === '200') {
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
        const response = await axios.delete(`${API_URL}/user/delete/batch`, { 
            data: ids 
        });
        
        if (response.data.code === '200') {
            showAlert('Users deleted successfully!', 'success');
            loadUsers(); // Reload the table
            selectedUsers = []; // Clear selection
            updateBulkActionButtons();
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
    const searchButton = document.querySelector('button.btn-primary i.fas.fa-search');
    if (searchButton && searchButton.parentElement) {
        searchButton.parentElement.addEventListener('click', function() {
            const searchQuery = document.getElementById('searchInput')?.value || '';
            const statusFilter = document.getElementById('statusFilter')?.value || '';
            loadUsers(searchQuery, statusFilter);
        });
    }
    
    // Add user button
    const addUserButton = document.querySelector('.card-header .btn-primary');
    if (addUserButton) {
        addUserButton.addEventListener('click', function() {
            openAddUserModal();
        });
    }
    
    // Status filter
    const statusFilter = document.getElementById('statusFilter');
    if (statusFilter) {
        statusFilter.addEventListener('change', function() {
            const searchQuery = document.getElementById('searchInput')?.value || '';
            loadUsers(searchQuery, this.value);
        });
    }
    
    // Table row selection
    const usersTable = $('#usersTable');
    if (usersTable.length) {
        usersTable.on('change', '.user-select', function() {
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
        usersTable.on('click', '.view-user', async function() {
            const userId = $(this).data('id');
            const user = await getUserById(userId);
            if (user) {
                showUserDetails(user);
            }
        });
        
        // Edit user
        usersTable.on('click', '.edit-user', async function() {
            const userId = $(this).data('id');
            const user = await getUserById(userId);
            if (user) {
                openEditUserModal(user);
            }
        });
        
        // Delete user
        usersTable.on('click', '.delete-user', function() {
            const userId = $(this).data('id');
            confirmDeleteUser(userId);
        });
    }
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
        alertContainer.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 9999;
            min-width: 300px;
            max-width: 500px;
        `;
        document.body.appendChild(alertContainer);
    }
    
    const alert = document.createElement('div');
    alert.className = `alert alert-${type} alert-dismissible fade show d-flex align-items-center`;
    
    // Add appropriate icon based on alert type
    let icon = 'info-circle';
    switch(type) {
        case 'success':
            icon = 'check-circle';
            break;
        case 'danger':
            icon = 'exclamation-circle';
            break;
        case 'warning':
            icon = 'exclamation-triangle';
            break;
    }
    
    alert.innerHTML = `
        <i class="fas fa-${icon} me-2"></i>
        <div class="flex-grow-1">${message}</div>
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `;
    
    // Add custom styles for smooth animation
    alert.style.cssText = `
        opacity: 0;
        transform: translateX(100%);
        transition: all 0.3s ease-in-out;
    `;
    
    alertContainer.appendChild(alert);
    
    // Trigger animation
    setTimeout(() => {
        alert.style.opacity = '1';
        alert.style.transform = 'translateX(0)';
    }, 50);
    
    // Remove the alert after 5 seconds
    setTimeout(() => {
        alert.style.opacity = '0';
        alert.style.transform = 'translateX(100%)';
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
                        <div class="mb-3">
                            <label for="role" class="form-label">Role</label>
                            <select class="form-select" id="role">
                                <option value="USER">User</option>
                                <option value="ADMIN">Admin</option>
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
            role: document.getElementById('role').value
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
    const modalHtml = `
    <div class="modal fade" id="editUserModal" tabindex="-1" aria-hidden="true">
        <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content">
                <div class="modal-header bg-light">
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
                        <div class="mb-3">
                            <label for="role" class="form-label">Role</label>
                            <select class="form-select" id="role">
                                <option value="USER" ${user.role === 'USER' ? 'selected' : ''}>User</option>
                                <option value="ADMIN" ${user.role === 'ADMIN' ? 'selected' : ''}>Admin</option>
                            </select>
                        </div>
                    </form>
                </div>
                <div class="modal-footer bg-light">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                    <button type="button" class="btn btn-primary" id="updateUserBtn">
                        <i class="fas fa-save me-1"></i> Save Changes
                    </button>
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
            username: document.getElementById('username').value,
            name: document.getElementById('name').value,
            status: document.getElementById('status').value,
            role: document.getElementById('role').value
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
    const modalHtml = `
    <div class="modal fade" id="viewUserModal" tabindex="-1" aria-hidden="true">
        <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content">
                <div class="modal-header bg-light">
                    <h5 class="modal-title">User Details</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body">
                    <div class="text-center mb-4">
                        <div class="user-avatar-lg rounded-circle bg-light text-primary mx-auto mb-3">
                            ${user.username.charAt(0).toUpperCase()}
                        </div>
                        <h4 class="mb-1">${user.name}</h4>
                        <p class="text-muted">@${user.username}</p>
                    </div>
                    <div class="row g-3">
                        <div class="col-6">
                            <div class="border rounded p-3">
                                <small class="text-muted d-block">Status</small>
                                <span class="badge ${user.status === 'Active' ? 'bg-success' : (user.status === 'Inactive' ? 'bg-secondary' : 'bg-danger')}">
                                    <i class="fas fa-${user.status === 'Active' ? 'check-circle' : (user.status === 'Inactive' ? 'clock' : 'ban')}"></i>
                                    ${user.status}
                                </span>
                            </div>
                        </div>
                        <div class="col-6">
                            <div class="border rounded p-3">
                                <small class="text-muted d-block">Role</small>
                                <span class="badge ${user.role === 'ADMIN' ? 'bg-warning' : 'bg-info'}">
                                    <i class="fas fa-${user.role === 'ADMIN' ? 'crown' : 'user'}"></i>
                                    ${user.role}
                                </span>
                            </div>
                        </div>
                        <div class="col-12">
                            <div class="border rounded p-3">
                                <small class="text-muted d-block">User ID</small>
                                <code>${user.id}</code>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="modal-footer bg-light">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                    <button type="button" class="btn btn-primary edit-user" data-id="${user.id}">
                        <i class="fas fa-edit me-1"></i> Edit User
                    </button>
                </div>
            </div>
        </div>
    </div>
    `;
    
    // Add custom styles for user avatar
    const modalStyles = `
        <style>
            .user-avatar-lg {
                width: 80px;
                height: 80px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 2rem;
                font-weight: bold;
            }
            
            #viewUserModal .modal-content {
                border: none;
                box-shadow: 0 0.5rem 1rem rgba(0, 0, 0, 0.15);
            }
            
            #viewUserModal .border {
                border-color: #dee2e6 !important;
            }
        </style>
    `;
    
    // Create and append the modal
    const modalContainer = document.createElement('div');
    modalContainer.innerHTML = modalHtml + modalStyles;
    document.body.appendChild(modalContainer);
    
    // Initialize and show the modal
    const modal = new bootstrap.Modal(document.getElementById('viewUserModal'));
    modal.show();
    
    // Add event listener for edit button
    document.querySelector('#viewUserModal .edit-user').addEventListener('click', async function() {
        const userId = this.dataset.id;
        modal.hide();
        const user = await getUserById(userId);
        if (user) {
            openEditUserModal(user);
        }
    });
    
    // Clean up when modal is closed
    document.getElementById('viewUserModal').addEventListener('hidden.bs.modal', function() {
        this.remove();
    });
}

/**
 * Confirm before deleting a user
 */
function confirmDeleteUser(userId) {
    const modalHtml = `
    <div class="modal fade" id="deleteUserModal" tabindex="-1" aria-hidden="true">
        <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content">
                <div class="modal-header bg-danger text-white">
                    <h5 class="modal-title">
                        <i class="fas fa-exclamation-triangle me-2"></i>
                        Confirm Deletion
                    </h5>
                    <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body">
                    <p class="mb-0">Are you sure you want to delete this user? This action cannot be undone.</p>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                    <button type="button" class="btn btn-danger" id="confirmDeleteBtn">
                        <i class="fas fa-trash me-1"></i> Delete
                    </button>
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
    const modalHtml = `
    <div class="modal fade" id="deleteBatchModal" tabindex="-1" aria-hidden="true">
        <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content">
                <div class="modal-header bg-danger text-white">
                    <h5 class="modal-title">
                        <i class="fas fa-exclamation-triangle me-2"></i>
                        Confirm Multiple Deletion
                    </h5>
                    <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body">
                    <p class="mb-0">Are you sure you want to delete ${userIds.length} users? This action cannot be undone.</p>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                    <button type="button" class="btn btn-danger" id="confirmBatchDeleteBtn">
                        <i class="fas fa-trash me-1"></i> Delete All
                    </button>
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
        }
    });
    
    // Clean up when modal is closed
    document.getElementById('deleteBatchModal').addEventListener('hidden.bs.modal', function() {
        this.remove();
    });
}

// Add custom CSS styles
function addCustomStyles() {
    const customStyles = `
        <style>
            .user-avatar {
                width: 35px;
                height: 35px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-weight: bold;
                margin-right: 10px;
            }
            
            .badge {
                padding: 0.5em 0.8em;
                font-size: 0.85em;
            }
            
            .card-body-icon {
                position: absolute;
                z-index: 0;
                top: -1.5rem;
                right: -1rem;
                opacity: 0.4;
                font-size: 5rem;
                transform: rotate(15deg);
            }
            
            .card:hover .card-body-icon {
                transform: rotate(0deg);
                transition: transform 0.3s;
            }
            
            .btn-group .btn {
                margin: 0 2px;
            }
            
            .table thead th {
                background-color: #f8f9fa;
                border-bottom: 2px solid #dee2e6;
            }
            
            .table tbody tr:hover {
                background-color: rgba(0,0,0,.03);
            }
            
            .form-check-input:checked {
                background-color: #0d6efd;
                border-color: #0d6efd;
            }
        </style>
    `;
    
    document.head.insertAdjacentHTML('beforeend', customStyles);
} 
import { API_URL } from '../../../Common/js/config.js';
import api from '../../../Common/js/api.js';

// Utility function to escape HTML
function escapeHTML(str) {
    if (!str) return '';
    return str.replace(/[&<>"'/]/g, function (s) {
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

// Show toast notification
function showToast(message, type = 'info') {
    // Check if Toastify is available
    if (typeof Toastify === 'function') {
        let backgroundColor;
        let icon = 'info-circle';
        
        switch(type) {
            case 'success':
                backgroundColor = '#4caf50';
                icon = 'check-circle';
                break;
            case 'error':
                backgroundColor = '#f44336';
                icon = 'exclamation-circle';
                break;
            case 'warning':
                backgroundColor = '#ff9800';
                icon = 'exclamation-triangle';
                break;
            default:
                backgroundColor = '#2196f3';
        }
        
        Toastify({
            text: message,
            duration: 3000,
            close: true,
            gravity: 'top',
            position: 'right',
            backgroundColor: backgroundColor,
            stopOnFocus: true,
            onClick: function(){}
        }).showToast();
    } 
    // Fallback to alert if Toastify is not available
    else {
        console.log(`${type.toUpperCase()}: ${message}`);
        // Only show alert for errors to avoid too many popups
        if (type === 'error') {
            alert(message);
        }
    }
}

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
                    // Use default avatar if 'avatar' is missing or empty
                    const avatarUrl = row.avatar || '../Admin/assets/images/default-artist.png'; // Use 'avatar' field
                    return `<div class="d-flex align-items-center">
                        <img src="${avatarUrl}" alt="Avatar" class="user-avatar rounded-circle me-2" style="width: 32px; height: 32px; object-fit: cover;">
                        <div class="user-info">
                            <div class="fw-bold">${escapeHTML(data)}</div>
                            <small class="text-muted">${escapeHTML(row.name || '')}</small>
                        </div>
                    </div>`;
                }
            },
            { 
                data: 'status',
                render: function(data) {
                    // Translate status texts based on numeric values
                    let statusText, badgeClass, icon;
                    
                        const statusValue = parseInt(data);
                        switch (statusValue) {
                            case 0:
                            statusText = 'Active'; // 活动
                                badgeClass = 'bg-success';
                                icon = 'check-circle';
                                break;
                            case 1:
                            statusText = 'Inactive'; // 非活动 (Consider if this state is used/needed)
                                badgeClass = 'bg-secondary';
                                icon = 'clock';
                                break;
                            case 2:
                            statusText = 'Suspended'; // 禁用
                                badgeClass = 'bg-danger';
                                icon = 'ban';
                                break;
                            default:
                                statusText = 'Unknown';
                            badgeClass = 'bg-light text-dark';
                                icon = 'question-circle';
                    }
                    
                    return `<span class="badge ${badgeClass}">
                        <i class="fas fa-${icon} me-1"></i> ${statusText}
                    </span>`;
                },
                className: 'text-center'
            },
            { 
                data: 'role',
                render: function(data) {
                    const roleText = data === 'ADMIN' ? 'Admin' : 'User';
                    const roleClass = data === 'ADMIN' ? 'bg-warning text-dark' : 'bg-info';
                    const icon = data === 'ADMIN' ? 'crown' : 'user';
                    return `<span class="badge ${roleClass}">
                        <i class="fas fa-${icon} me-1"></i> ${roleText}
                    </span>`;
                },
                className: 'text-center'
            },
            { 
                data: null,
                render: function(data, type, row) {
                    // Translate button tooltips and determine state text
                    let toggleClass, toggleIcon, toggleTitle;
                        const statusValue = parseInt(row.status);

                        switch (statusValue) {
                            case 0: // Active
                                toggleClass = 'btn-outline-warning';
                                toggleIcon = 'ban';
                            toggleTitle = 'Suspend User'; // 禁用用户
                                break;
                            case 2: // Suspended
                                toggleClass = 'btn-outline-success';
                                toggleIcon = 'check-circle';
                            toggleTitle = 'Activate User'; // 激活用户
                                break;
                         case 1: // Inactive (assuming activation is desired)
                         default: // Also handles unknown status
                            toggleClass = 'btn-outline-success';
                            toggleIcon = 'check-circle';
                            toggleTitle = 'Activate User'; // 激活用户
                    }
                    
                    return `
                        <div class="btn-group">
                            <button class="btn btn-sm btn-outline-info view-user" data-id="${row.id}" title="View Details">
                                <i class="fas fa-eye"></i>
                            </button>
                            <button class="btn btn-sm btn-outline-primary edit-user" data-id="${row.id}" title="Edit User">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn btn-sm ${toggleClass} toggle-status" 
                                data-id="${row.id}" 
                                data-status="${row.status}"
                                title="${toggleTitle}">
                                <i class="fas fa-${toggleIcon}"></i>
                            </button>
                            <button class="btn btn-sm btn-outline-danger delete-user" data-id="${row.id}" data-username="${escapeHTML(row.username)}" title="Delete User">
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
        order: [[1, 'asc']], // Default sort by username
        // Translate DataTable language options
        language: {
            search: "", // Hide default search label, use placeholder
            searchPlaceholder: "Search by username or name...",
            emptyTable: "No users found",
            info: "Showing _START_ to _END_ of _TOTAL_ users",
            infoEmpty: "No users available",
            infoFiltered: "(filtered from _MAX_ total users)",
            lengthMenu: "Show _MENU_ users per page",
            zeroRecords: "No matching users found",
            processing: "Processing..." // Added processing message
        },
        dom: '<"row"<"col-sm-12 col-md-6"l><"col-sm-12 col-md-6 d-flex justify-content-end"f>>' + // Adjusted DOM for search placement
             '<"row"<"col-sm-12"tr>>' +
             '<"row"<"col-sm-12 col-md-5"i><"col-sm-12 col-md-7"p>>',
        drawCallback: function() {
            // Re-initialize tooltips after table draw
            const tooltipTriggerList = [].slice.call(document.querySelectorAll('[title]'));
            tooltipTriggerList.map(function (tooltipTriggerEl) {
                // Ensure Bootstrap tooltips are initialized correctly
                 // Remove existing tooltip instance if present
                 const existingTooltip = bootstrap.Tooltip.getInstance(tooltipTriggerEl);
                 if (existingTooltip) {
                     existingTooltip.dispose();
                 }
                 // Create new tooltip instance
                 return new bootstrap.Tooltip(tooltipTriggerEl);
            });
            updateBulkActionButtons(); // Update button state after draw
        },
        // Disable DataTables default search box as we use custom filtering
        searching: false,
        // Disable default ordering control if needed, or set default order
        // ordering: false,
        order: [[1, 'asc']], // Default order by username
        // Enable processing indicator
    });
}

/**
 * Add statistics cards to the page
 */
function addStatisticsCards() {
    const statsHtml = `
        <div id="statisticsCards" class="row mb-4 fade-in">
            <div class="col-xl-3 col-sm-6 mb-3">
                <div class="card text-white bg-primary o-hidden h-100">
                    <div class="card-body">
                        <div class="card-body-icon">
                            <i class="fas fa-users"></i>
                        </div>
                        <div class="d-flex flex-column">
                            <div class="fs-5">Total Users</div>
                            <div class="fs-2 fw-bold" id="totalUsersCount">0</div>
                        </div>
                    </div>
                    <div class="card-footer bg-primary-dark text-white">
                        <div class="small text-white">All registered users</div>
                    </div>
                </div>
            </div>
            <div class="col-xl-3 col-sm-6 mb-3">
                <div class="card text-white bg-success o-hidden h-100">
                    <div class="card-body">
                        <div class="card-body-icon">
                            <i class="fas fa-user-check"></i>
                        </div>
                        <div class="d-flex flex-column">
                            <div class="fs-5">Active Users</div>
                            <div class="fs-2 fw-bold" id="activeUsersCount">0</div>
                        </div>
                    </div>
                    <div class="card-footer bg-success-dark text-white">
                        <div class="progress">
                            <div id="activeProgress" class="progress-bar bg-white" role="progressbar" style="width: 0%"></div>
                        </div>
                    </div>
                </div>
            </div>
            <div class="col-xl-3 col-sm-6 mb-3">
                <div class="card text-white bg-warning o-hidden h-100">
                    <div class="card-body">
                        <div class="card-body-icon">
                            <i class="fas fa-user-clock"></i>
                        </div>
                        <div class="d-flex flex-column">
                            <div class="fs-5">Inactive Users</div>
                            <div class="fs-2 fw-bold" id="inactiveUsersCount">0</div>
                        </div>
                    </div>
                    <div class="card-footer bg-warning-dark text-white">
                        <div class="progress">
                            <div id="inactiveProgress" class="progress-bar bg-white" role="progressbar" style="width: 0%"></div>
                        </div>
                    </div>
                </div>
            </div>
            <div class="col-xl-3 col-sm-6 mb-3">
                <div class="card text-white bg-danger o-hidden h-100">
                    <div class="card-body">
                        <div class="card-body-icon">
                            <i class="fas fa-user-slash"></i>
                        </div>
                        <div class="d-flex flex-column">
                            <div class="fs-5">Suspended Users</div>
                            <div class="fs-2 fw-bold" id="suspendedUsersCount">0</div>
                        </div>
                    </div>
                    <div class="card-footer bg-danger-dark text-white">
                        <div class="progress">
                            <div id="suspendedProgress" class="progress-bar bg-white" role="progressbar" style="width: 0%"></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Insert statistics cards after page header and before search box
    const pageHeader = document.querySelector('.row.mb-4');
    if (pageHeader) {
        pageHeader.insertAdjacentHTML('afterend', statsHtml);
    } else {
        // Fallback: Insert statistics cards before the search box
        const searchBox = document.querySelector('.card.mb-4.fade-in');
        if (searchBox) {
            searchBox.insertAdjacentHTML('beforebegin', statsHtml);
        } else {
            // Last fallback: Insert before the users table
            const tableContainer = document.querySelector('#usersTable').closest('.card');
            tableContainer.insertAdjacentHTML('beforebegin', statsHtml);
        }
    }
    
    // Add custom styles for card footers
    const customStyles = `
        <style>
            .bg-primary-dark { background-color: rgba(0, 0, 0, 0.15) !important; }
            .bg-success-dark { background-color: rgba(0, 0, 0, 0.15) !important; }
            .bg-warning-dark { background-color: rgba(0, 0, 0, 0.15) !important; }
            .bg-danger-dark { background-color: rgba(0, 0, 0, 0.15) !important; }
            .card-footer { padding: 0.5rem 1rem; }
            .progress { height: 0.5rem; background-color: rgba(255, 255, 255, 0.2); }
        </style>
    `;
    document.head.insertAdjacentHTML('beforeend', customStyles);
}

/**
 * Update user statistics
 */
function updateUserStats(users) {
    // 确保统计卡片已添加
    if ($('#statisticsCards').length === 0) {
        addStatisticsCards();
    }
    
    // 基于前端获取的用户列表计算统计数据
    const stats = {
        total: users.length,
        active: users.filter(user => {
            // 处理数字状态值
            if (typeof user.status === 'number' || !isNaN(parseInt(user.status))) {
                return parseInt(user.status) === 0;
            }
            // 处理字符串状态值
            return user.status === 'Active';
        }).length,
        inactive: users.filter(user => {
            // 处理数字状态值
            if (typeof user.status === 'number' || !isNaN(parseInt(user.status))) {
                return parseInt(user.status) === 1;
            }
            // 处理字符串状态值
            return user.status === 'Inactive';
        }).length,
        suspended: users.filter(user => {
            // 处理数字状态值
            if (typeof user.status === 'number' || !isNaN(parseInt(user.status))) {
                return parseInt(user.status) === 2;
            }
            // 处理字符串状态值
            return user.status === 'Suspended';
        }).length
    };
    
    // 更新统计UI
    updateStatsUI(stats);
}

/**
 * 更新统计UI
 */
function updateStatsUI(stats) {
    // 更新统计数字
    $('#totalUsersCount').text(stats.total || 0);
    $('#activeUsersCount').text(stats.active || 0);
    $('#inactiveUsersCount').text(stats.inactive || 0);
    $('#suspendedUsersCount').text(stats.suspended || 0);
    
    // 更新进度条
    if (stats.total > 0) {
        const activePercent = Math.round((stats.active / stats.total) * 100);
        const inactivePercent = Math.round((stats.inactive / stats.total) * 100);
        const suspendedPercent = Math.round((stats.suspended / stats.total) * 100);
        
        $('#activeProgress').css('width', `${activePercent}%`).attr('aria-valuenow', activePercent);
        $('#inactiveProgress').css('width', `${inactivePercent}%`).attr('aria-valuenow', inactivePercent);
        $('#suspendedProgress').css('width', `${suspendedPercent}%`).attr('aria-valuenow', suspendedPercent);
    } else {
        $('#activeProgress, #inactiveProgress, #suspendedProgress').css('width', '0%').attr('aria-valuenow', 0);
    }
}

/**
 * Load users from the API and update the table and stats.
 * Reads filter values from the NEW static filter inputs.
 */
async function loadUsers(searchQueryParam = null, statusFilterParam = null) {
    // Get filter values from the NEW static inputs
    const searchQuery = searchQueryParam !== null ? searchQueryParam : $('#userNameFilter').val().trim();
    const statusFilterValue = statusFilterParam !== null ? statusFilterParam : $('#userStatusFilter').val();
    let statusForApi = ''; // Default to empty string for API (usually means 'all')

    // Map status text/value to the numeric value expected by API if necessary
    // Assuming API expects numeric status: 0=Active, 1=Inactive, 2=Suspended
    if (statusFilterValue === '0') {
        statusForApi = '0';
    } else if (statusFilterValue === '1') { // Handle Inactive
        statusForApi = '1';
    } else if (statusFilterValue === '2') { // Handle Suspended
        statusForApi = '2';
    }
    // If statusFilterValue is empty (''), statusForApi remains empty

    console.log(`Loading users with search: '${searchQuery}', status: '${statusForApi}'`);

    try {
        // Fetch paginated data (assuming loadUsersPaginated handles search/status)
        // Pass the correct status value for the API
        await loadUsersPaginated(1, 10, searchQuery, statusForApi);

        // Fetch all data for stats calculation (pass same filters)
        await loadUsersForStats(searchQuery, statusForApi);

    } catch (error) {
        console.error("Error loading user data:", error);
        showToast("Failed to load user data.", "error");
        // Optionally clear table or show error message in table
        if (usersTable) {
            usersTable.clear().draw();
        }
    }
}

/**
 * Load users for pagination
 */
async function loadUsersPaginated(pageNum = 1, pageSize = 10, searchQuery = '', statusFilter = '') {
    if (!usersTable) {
        console.error("DataTable not initialized.");
        return;
    }

    try {
        const params = new URLSearchParams();
        params.append('pageNum', pageNum);
        params.append('pageSize', pageSize);
        if (searchQuery) params.append('username', searchQuery);
        if (statusFilter) params.append('status', statusFilter);
        
        const response = await api.get(`/user/selectPage?${params.toString()}`);
        
        if (response.data.code === '200') {
            const users = response.data.data.list;
            // 更新用户表格
            updateUserTable(users);
            
            // 同时加载所有用户数据来更新统计信息
            // 这是为了确保统计信息是基于所有用户而不仅仅是当前页面的用户
            loadUsersForStats(searchQuery, statusFilter);
            
            return users;
        } else {
            showAlert('加载用户分页数据失败: ' + response.data.msg, 'danger');
            return [];
        }
    } catch (error) {
        console.error('加载用户分页数据错误:', error);
        showAlert('加载用户分页数据失败，请稍后重试', 'danger');
        return [];
    }
}

/**
 * 仅加载用户数据用于统计，不更新表格
 */
async function loadUsersForStats(searchQuery = '', statusFilter = '') {
    try {
        const params = new URLSearchParams();
        if (searchQuery) params.append('username', searchQuery);
        if (statusFilter) params.append('status', statusFilter);
        
        const response = await api.get(`/user/select/all?${params.toString()}`);
        
        if (response.data.code === '200') {
            const users = response.data.data;
            // 仅更新统计信息，不更新表格
            updateUserStats(users);
            return users;
        } else {
            console.error('Failed to load statistics data:', response.data.msg);
            return [];
        }
    } catch (error) {
        console.error('Error loading statistics data:', error);
        return [];
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
        const response = await api.post('/user/add', userData);
        
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
        const response = await api.get(`/user/select/${id}`);
        
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
        const response = await api.get(`/user/select/username/${username}`);
        
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
        // This function now only handles updating user text data
        const response = await api.post('/user/update', userData);
        
        if (response.data.code === '200') {
            // Don't reload here, let the calling function (saveUser) handle it after potential avatar upload
            return true;
        } else {
            showAlert('Error updating user info: ' + response.data.msg, 'danger');
            return false;
        }
    } catch (error) {
        console.error('Error updating user info:', error);
        showAlert('Failed to update user info. Please try again.', 'danger');
        return false;
    }
}

/**
 * Delete user
 */
async function deleteUser(id) {
    try {
        const response = await api.delete(`/user/delete/${id}`);
        
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
        const response = await api.delete('/user/delete/batch', { 
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
    // Modal related listeners
    $('#userModal').on('hidden.bs.modal', function () {
        resetUserModal();
    });
            
    // Save User button in modal
    $('#saveUserBtn').on('click', handleSaveUser);

    // DataTable event delegation for action buttons
    $('#usersTable tbody').on('click', 'button.edit-user', function() {
        const row = usersTable.row($(this).parents('tr')).data();
        openEditUserModal(row);
    });
    $('#usersTable tbody').on('click', 'button.delete-user', function() {
        const row = usersTable.row($(this).parents('tr')).data();
        confirmDeleteUser(row.id, row.username);
    });
    $('#usersTable tbody').on('click', 'button.toggle-status', function() {
        const row = usersTable.row($(this).parents('tr')).data();
        confirmAndUpdateStatus(row.id, row.status);
    });

    // DataTable event delegation for checkboxes
    $('#usersTable tbody').on('change', 'input.user-select', function() {
        const userId = parseInt($(this).val());
            if (this.checked) {
                    selectedUsers.push(userId);
            } else {
                selectedUsers = selectedUsers.filter(id => id !== userId);
            }
            updateBulkActionButtons();
        });
        
    // Select All checkbox listener
    $('#selectAllCheckbox').on('change', function() {
        const isChecked = this.checked;
        $('.user-select').prop('checked', isChecked);
        selectedUsers = [];
        if (isChecked) {
            usersTable.rows().data().each(function(user) {
                selectedUsers.push(user.id);
            });
        }
        updateBulkActionButtons();
        });
        
    // Batch Delete button listener
    $('#batchDeleteBtn').on('click', function() {
        if (selectedUsers.length > 0) {
            confirmDeleteBatch(selectedUsers);
        }
    });

    // Add User button listener (assuming it exists in the header now)
    $(document).on('click', '.card-header .btn-primary', function() {
        openAddUserModal();
        });
        
    // NEW Filter Button Listeners
    $('#applyUserFiltersBtn').on('click', function() {
        loadUsers(); // Load users based on current filter inputs
    });

    $('#resetUserFiltersBtn').on('click', function() {
        $('#userNameFilter').val('');
        $('#userStatusFilter').val('');
        // Clear any other filters here if added (e.g., role)
        // $('#userRoleFilter').val('');
        loadUsers('', ''); // Load all users after resetting
    });

    // Avatar file input change listener
    $('#userAvatarFile').on('change', function(event) {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                setImagePreview('userAvatarPreview', 'avatarPreviewText', e.target.result, 'Modal');
            }
            reader.readAsDataURL(file);
        } else {
            // If no file is selected (e.g., user cancels), reset to default or previous state
            // For simplicity, let's reset to default if no file is chosen
            resetImagePreview('userAvatarPreview', 'avatarPreviewText', 'Modal');
        }
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
function showAlert(message, type = 'info', duration = 3000) {
    const alertContainer = document.getElementById('alertContainer');
    if (!alertContainer) {
        console.error('Alert container #alertContainer not found.');
        // Fallback to Toastify or console
        showToast(message, type === 'danger' ? 'error' : type);
        return;
    }

    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
    alertDiv.role = 'alert';
    // Translate alert prefix
    const prefix = type === 'success' ? 'Success!' : type === 'danger' ? 'Error!' : 'Info:';
    alertDiv.innerHTML = `
        <strong>${prefix}</strong> ${escapeHTML(message)}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `;
    
    alertContainer.appendChild(alertDiv);

    // Auto-dismiss alert
    if (duration) {
    setTimeout(() => {
            alertDiv.classList.remove('show');
            // Remove the element after the fade transition
            setTimeout(() => alertDiv.remove(), 150);
        }, duration);
    }
}

/**
 * Open Add User Modal and clear form
 */
function openAddUserModal() {
    // Translate modal title
    $('#userModalLabel').text('Add New User');
    $('#userForm')[0].reset();
    $('#userId').val(''); // Ensure ID is cleared
    $('#username').prop('readonly', false); // Allow username editing for add
    $('#password').prop('required', true); // Password required for add
    $('#passwordHelp').show(); // Show password help text
    
    // Set defaults for Add User
    $('#role').val('USER').prop('disabled', true); // Default role to USER and disable editing for add
    $('#status').val('0'); // Default status to Active (0)

    // Translate image preview text
    resetImagePreview('userAvatarPreview', 'avatarPreviewText');
    // **Hide avatar upload section when adding**
    $('#avatarUploadGroup').hide(); 

    const modal = new bootstrap.Modal(document.getElementById('userModal'));
    modal.show();
}

/**
 * Open Edit User Modal and populate form
 */
function openEditUserModal(user) {
    if (!user) return;
    // Translate modal title
    $('#userModalLabel').text('Edit User Information');
    $('#userForm')[0].reset();
    $('#role').prop('disabled', false); // Ensure role is enabled for editing

    // Populate form fields
    $('#userId').val(user.id);
    $('#username').val(user.username).prop('readonly', true); // Usually cannot edit username
    $('#name').val(user.name);
    $('#email').val(user.email);
    $('#role').val(user.role);
    $('#status').val(user.status);

    // Password is not editable directly, only via reset/change password functionality
    $('#password').prop('required', false).val(''); // Clear password, make not required for edit
    $('#passwordHelp').hide(); // Hide password help text

    // Set image preview - Use 'avatar' field
    const avatarUrl = user.avatar || '../Admin/assets/images/default-artist.png';
    // Translate image preview text
    setImagePreview('userAvatarPreview', 'avatarPreviewText', avatarUrl);
    // **Show avatar upload section when editing**
    $('#avatarUploadGroup').show();

    const modal = new bootstrap.Modal(document.getElementById('userModal'));
    modal.show();
}

/** 
 * Confirm and delete a single user 
 */
function confirmDeleteUser(userId, username) {
    // Translate confirmation message
    if (confirm(`Are you sure you want to delete user "${username}" (ID: ${userId})? This action cannot be undone.`)) {
        // Translate toast message
        showToast('Deleting user...', 'info');
        deleteUser(userId)
            .then(() => {
                // Translate success toast
                showToast('User deleted successfully!', 'success');
            })
            .catch(error => {
                // Error toast is handled within deleteUser or globally
                console.error("Delete confirmation error:", error); 
            });
    }
}

/** 
 * Confirm and delete batch users 
 */
function confirmDeleteBatch(userIds) {
    // Translate confirmation message
    if (confirm(`Are you sure you want to delete ${userIds.length} selected users? This action cannot be undone.`)) {
         // Translate toast message
        showToast('Deleting selected users...', 'info');
        deleteBatchUsers(userIds)
            .then(() => {
                // Translate success toast
                showToast(`${userIds.length} users deleted successfully!`, 'success');
            })
            .catch(error => {
                // Error handled within deleteBatchUsers or globally
                 console.error("Batch delete confirmation error:", error);
            });
    }
}

/** 
 * Confirm and update user status 
 */
async function confirmAndUpdateStatus(userId, currentStatus) {
    const currentStatusValue = parseInt(currentStatus);
    let actionText = '';
    let newStatus = 0; // Default to Active (0)

    if (currentStatusValue === 0) { // Currently Active
        // Translate confirmation action
        actionText = 'suspend';
        newStatus = 2; // Suspend (2)
    } else { // Currently Suspended (2) or Inactive (1)
        // Translate confirmation action
        actionText = 'activate';
        newStatus = 0; // Activate (0)
    }

    // Translate confirmation message
    if (confirm(`Are you sure you want to ${actionText} this user (ID: ${userId})?`)) {
        // Translate toast message
        showToast(`Updating user status...`, 'info');
        // Call the dedicated status update function
        await updateUserStatus(userId, newStatus); 
    }
}

/**
 * Show user details
 */
function showUserDetails(user) {
    // 确定用户状态的显示文本和样式
    let statusText, statusClass, statusIcon;
    
    // 处理数字状态值
    if (typeof user.status === 'number' || !isNaN(parseInt(user.status))) {
        const statusValue = parseInt(user.status);
        switch (statusValue) {
            case 0:
                statusText = 'Active';
                statusClass = 'bg-success';
                statusIcon = 'check-circle';
                break;
            case 1:
                statusText = 'Inactive';
                statusClass = 'bg-secondary';
                statusIcon = 'clock';
                break;
            case 2:
                statusText = 'Suspended';
                statusClass = 'bg-danger';
                statusIcon = 'ban';
                break;
            default:
                statusText = 'Unknown';
                statusClass = 'bg-secondary';
                statusIcon = 'question-circle';
        }
    } else {
        // 处理字符串状态值
        statusText = user.status;
        if (user.status === 'Active') {
            statusClass = 'bg-success';
            statusIcon = 'check-circle';
        } else if (user.status === 'Inactive') {
            statusClass = 'bg-secondary';
            statusIcon = 'clock';
        } else if (user.status === 'Suspended') {
            statusClass = 'bg-danger';
            statusIcon = 'ban';
        } else {
            statusClass = 'bg-secondary';
            statusIcon = 'question-circle';
        }
    }
    
    // 确定是否处于活跃状态(0或'Active')
    const isActive = (user.status === 0 || user.status === '0' || user.status === 'Active');
    
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
                                <span class="badge ${statusClass}">
                                    <i class="fas fa-${statusIcon}"></i>
                                    ${statusText}
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
                    <button type="button" class="btn ${isActive ? 'btn-warning' : 'btn-success'} toggle-status" data-id="${user.id}" data-status="${user.status}">
                        <i class="fas fa-${isActive ? 'ban' : 'check-circle'} me-1"></i> 
                        ${isActive ? 'Disable User' : 'Enable User'}
                    </button>
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
    
    // Add event listener for status toggle button
    document.querySelector('#viewUserModal .toggle-status').addEventListener('click', function() {
        const userId = this.dataset.id;
        const status = this.dataset.status;
        modal.hide();
        confirmAndUpdateStatus(userId, status);
    });
    
    // Clean up when modal is closed
    document.getElementById('viewUserModal').addEventListener('hidden.bs.modal', function() {
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
 * Set image preview for the user modal
 */
function setImagePreview(previewElementId, textElementId, imageUrl, context = 'User') {
    const imagePreview = document.getElementById(previewElementId);
    const imagePreviewText = document.getElementById(textElementId);

    if (!imagePreview || !imagePreviewText) {
        // console.warn(`[${context} Modal] Image preview elements (#${previewElementId} or #${textElementId}) not found.`);
        return;
    }

    if (imageUrl) {
        imagePreview.src = imageUrl;
        imagePreview.style.display = 'block';
        imagePreviewText.style.display = 'none';
    } else {
        // If no URL, reset to default state
        resetImagePreview(previewElementId, textElementId, context);
    }
}

/**
 * Reset image preview for the user modal to its initial state
 */
function resetImagePreview(previewElementId, textElementId, context = 'User') {
    const imageInput = document.getElementById('userAvatarFile'); // Assuming this ID for file input
    const imagePreview = document.getElementById(previewElementId);
    const imagePreviewText = document.getElementById(textElementId);

    if (imageInput) imageInput.value = ''; // Clear the file input
    if (imagePreview) {
        imagePreview.src = '#'; // Use # or a transparent gif
        imagePreview.style.display = 'none';
    }
    if (imagePreviewText) {
        imagePreviewText.textContent = 'No image'; // Reset text
        imagePreviewText.style.display = 'block';
    }
}

/**
 * Update user status via dedicated endpoint
 */
async function updateUserStatus(id, newStatus) {
    try {
        const response = await api.post(`/user/status/${id}?status=${newStatus}`); 
        if (response.data.code === '200') {
            // Use backend message if available, otherwise default
            showToast(response.data.msg || 'User status updated successfully!', 'success'); 
            loadUsers(); // Reload table
            return true;
        } else {
            showToast('Error updating status: ' + response.data.msg, 'error');
            return false;
        }
    } catch (error) {
        // console.error('Error updating status:', error);
        showToast('Failed to update status. Please try again.', 'error');
        return false;
    }
}

/**
 * Upload user avatar
 */
async function uploadUserAvatar(formData) {
    try {
        // 1. Get token from localStorage before making the call
        const token = localStorage.getItem('token');
        if (!token) {
            // console.error('Authentication token not found in localStorage.');
            showAlert('Authentication failed. Please log in again.', 'danger');
            // Optionally redirect to login
            // window.location.href = '../login.html'; 
            return false;
        }

        const response = await api.post('/user/updateAvatar', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
                // 2. Add the Authorization header (adjust based on your token prefix if any, e.g., 'Bearer ')
                'Authorization': token // Assuming your interceptor expects just the token
            }
        });
        if (response.data.code === '200') {
            // Success message can be shown by the caller (saveUser)
            return true;
        } else {
            showAlert('Error uploading avatar: ' + response.data.msg, 'danger');
            return false;
        }
    } catch (error) {
        // console.error('Error uploading avatar:', error);
        showAlert('Failed to upload avatar. Please try again.', 'danger');
        return false;
    }
}

/**
 * Handle saving user (Add or Edit) including avatar upload
 */
async function handleSaveUser() {
    const form = document.getElementById('userForm');
    // Basic form validation (can be enhanced)
    if (!form.checkValidity()) {
        form.classList.add('was-validated');
        showAlert('Please fill in all required fields.', 'warning');
        return;
    }

    showToast('Saving user...', 'info');

    const userId = $('#userId').val();
    const isEdit = !!userId;

    // 1. Prepare user data (excluding file)
    const userData = {
        id: isEdit ? parseInt(userId) : null,
        username: $('#username').val(),
        name: $('#name').val(),
        email: $('#email').val(),
        role: isEdit ? $('#role').val() : 'USER', // Use selected role for edit, force USER for add
        status: parseInt($('#status').val()), // Use selected status
        // Do NOT include password if editing and field is empty
        password: (isEdit && !$('#password').val()) ? null : $('#password').val() 
    };

    // If adding, ensure status is set (should be defaulted, but double-check)
    if (!isEdit) {
        userData.status = userData.status || 0; // Default to 0 if somehow not set
    }

    try {
        let success = false;
        let savedUserId = isEdit ? userData.id : null;

        // 2. Save basic user data
        if (isEdit) {
            success = await updateUser(userData);
            } else {
            const addResponse = await api.post('/user/add', userData);
            if (addResponse.data.code === '200') {
                success = true;
                // Assuming the backend returns the new user's ID or the full user object
                // Adjust based on actual backend response structure if needed
                savedUserId = addResponse.data.data?.id || addResponse.data.data; // Example: get ID if nested
                if (!savedUserId) {
                     // console.warn("Could not determine saved user ID from response:", addResponse.data);
                     // Attempt to get user by username as fallback (might be slow)
                     const newUser = await getUserByUsername(userData.username);
                     savedUserId = newUser?.id;
                }
            } else {
                showAlert('Error adding user: ' + addResponse.data.msg, 'danger');
                success = false;
            }
        }

        // 3. Upload avatar ONLY if EDITING and a file is selected
        const avatarFile = document.getElementById('userAvatarFile').files[0];
        if (success && isEdit && avatarFile && savedUserId) {
             showToast('Uploading avatar...', 'info');
             const formData = new FormData();
             formData.append('avatarFile', avatarFile);
             
             // Always send the targetUserId when uploading via admin panel (during edit)
             formData.append('targetUserId', savedUserId);
             // console.log(`Admin editing user: Appending targetUserId=${savedUserId} to avatar upload.`);
             
             const avatarSuccess = await uploadUserAvatar(formData);
             if (!avatarSuccess) {
                 // Avatar failed, but user data might be saved. Inform the user.
                 showAlert('User data saved, but avatar upload failed.', 'warning');
                 // Decide if you want to proceed or treat as overall failure
                 success = false; // Treat as overall failure if avatar is critical
             }
        } else if (success && !isEdit && avatarFile) {
            // *** New Block: User added successfully, but avatar was selected. Inform admin to edit. ***
            // console.log("User added, but avatar upload skipped during add flow. Admin needs to edit.");
            showToast("User added. Please edit the user to upload the avatar.", "info"); // Inform admin
            // We still consider the overall operation successful as the user was added.
        } else if (success && !avatarFile && isEdit) {
            // No new avatar selected during edit, which is fine.
        } else if (success && !avatarFile && !isEdit) {
            // No avatar selected during add, which is fine.
        }

        // 4. Finalize
        if (success) {
            showToast(isEdit ? 'User updated successfully!' : 'User added successfully!', 'success');
            $('#userModal').modal('hide'); // Close the modal
            loadUsers(); // Reload the table
        } else {
             // Specific errors shown by called functions (addUser, updateUser, uploadUserAvatar)
             // Optionally show a generic failure message here if needed
             // showToast('Failed to save user.', 'error'); 
        }

    } catch (error) {
        console.error('Error saving user:', error);
        showAlert('An unexpected error occurred while saving the user.', 'danger');
    } finally {
         // Remove validation class if added
         form.classList.remove('was-validated');
    }
}
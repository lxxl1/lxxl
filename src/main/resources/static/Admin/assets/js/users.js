import { API_URL } from '../../../Common/js/config.js';
import api from '../../../Common/js/api.js';

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
                    // 根据数字状态值确定显示文本和样式
                    let statusText, badgeClass, icon;
                    
                    // 数字状态值的处理
                    if (typeof data === 'number' || !isNaN(parseInt(data))) {
                        const statusValue = parseInt(data);
                        switch (statusValue) {
                            case 0:
                                statusText = 'Active';
                                badgeClass = 'bg-success';
                                icon = 'check-circle';
                                break;
                            case 1:
                                statusText = 'Inactive';
                                badgeClass = 'bg-secondary';
                                icon = 'clock';
                                break;
                            case 2:
                                statusText = 'Suspended';
                                badgeClass = 'bg-danger';
                                icon = 'ban';
                                break;
                            default:
                                statusText = 'Unknown';
                                badgeClass = 'bg-secondary';
                                icon = 'question-circle';
                        }
                    } 
                    // 字符串状态值的处理（兼容性保留）
                    else {
                        statusText = data;
                        if (data === 'Active') {
                            badgeClass = 'bg-success';
                            icon = 'check-circle';
                        } else if (data === 'Inactive') {
                            badgeClass = 'bg-secondary';
                            icon = 'clock';
                        } else if (data === 'Suspended') {
                            badgeClass = 'bg-danger';
                            icon = 'ban';
                        } else {
                            badgeClass = 'bg-secondary';
                            icon = 'question-circle';
                        }
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
                    // 确定当前状态文本和切换按钮样式
                    let statusText, toggleClass, toggleIcon, toggleTitle;
                    
                    // 根据状态值确定按钮样式
                    if (typeof row.status === 'number' || !isNaN(parseInt(row.status))) {
                        const statusValue = parseInt(row.status);
                        switch (statusValue) {
                            case 0: // Active
                                toggleClass = 'btn-outline-warning';
                                toggleIcon = 'ban';
                                toggleTitle = 'Disable User';
                                break;
                            case 1: // Inactive
                                toggleClass = 'btn-outline-success';
                                toggleIcon = 'check-circle';
                                toggleTitle = 'Activate User';
                                break;
                            case 2: // Suspended
                                toggleClass = 'btn-outline-success';
                                toggleIcon = 'check-circle';
                                toggleTitle = 'Activate User';
                                break;
                            default:
                                toggleClass = 'btn-outline-secondary';
                                toggleIcon = 'sync';
                                toggleTitle = 'Toggle Status';
                        }
                    } else {
                        // 兼容处理字符串状态值
                        if (row.status === 'Active') {
                            toggleClass = 'btn-outline-warning';
                            toggleIcon = 'ban';
                            toggleTitle = 'Disable User';
                        } else {
                            toggleClass = 'btn-outline-success';
                            toggleIcon = 'check-circle';
                            toggleTitle = 'Activate User';
                        }
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
 * Load users from the API
 */
async function loadUsers(searchQuery = '', statusFilter = '') {
    try {
        const params = new URLSearchParams();
        if (searchQuery) params.append('username', searchQuery);
        if (statusFilter) params.append('status', statusFilter);
        
        const response = await api.get(`/user/select/all?${params.toString()}`);
        
        if (response.data.code === '200') {
            const users = response.data.data;
            // 先更新用户表格
            updateUserTable(users);
            // 然后更新统计信息
            updateUserStats(users);
            return users;
        } else {
            showAlert('Failed to load user data: ' + response.data.msg, 'danger');
            return [];
        }
    } catch (error) {
        console.error('Error loading user data:', error);
        showAlert('Failed to load user data. Please try again later.', 'danger');
        return [];
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
        const response = await api.post('/user/update', userData);
        
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
    // Search button
    const searchButton = document.querySelector('button.btn-primary i.fas.fa-search');
    if (searchButton && searchButton.parentElement) {
        searchButton.parentElement.addEventListener('click', function() {
            const searchQuery = document.getElementById('searchInput')?.value || '';
            const statusFilter = document.getElementById('statusFilter')?.value || '';
            
            // 加载用户数据并更新统计
            loadUsers(searchQuery, statusFilter);
            
            // 添加搜索状态指示
            if (searchQuery || statusFilter) {
                // 如果还没有筛选指示器，添加一个
                if (!document.getElementById('filterIndicator')) {
                    const indicator = document.createElement('div');
                    indicator.id = 'filterIndicator';
                    indicator.className = 'alert alert-info alert-dismissible fade show mt-3';
                    indicator.innerHTML = `
                        <div class="d-flex align-items-center">
                            <i class="fas fa-filter me-2"></i>
                            <div>
                                <strong>Filter Applied</strong>
                                <span class="filter-terms"></span>
                            </div>
                            <button type="button" class="btn-close ms-auto" id="clearFilter"></button>
                        </div>
                    `;
                    const searchContainer = document.querySelector('.card-body .row');
                    searchContainer.insertAdjacentElement('afterend', indicator);
                    
                    // 添加清除筛选的事件
                    document.getElementById('clearFilter').addEventListener('click', function() {
                        document.getElementById('searchInput').value = '';
                        document.getElementById('statusFilter').value = '';
                        loadUsers();
                        indicator.remove();
                    });
                }
                
                // 更新筛选条件文本
                const filterTerms = [];
                if (searchQuery) filterTerms.push(`Search: "${searchQuery}"`);
                if (statusFilter) filterTerms.push(`Status: ${statusFilter}`);
                
                document.querySelector('.filter-terms').textContent = ` - ${filterTerms.join(', ')}`;
            }
        });
    }
    
    // Add user button
    const addUserButton = document.querySelector('.card-header .btn-primary');
    if (addUserButton) {
        addUserButton.addEventListener('click', function() {
            openAddUserModal();
        });
    }
    
    // Status filter dropdown change
    const statusFilter = document.getElementById('statusFilter');
    if (statusFilter) {
        statusFilter.addEventListener('change', function() {
            const searchQuery = document.getElementById('searchInput')?.value || '';
            loadUsers(searchQuery, this.value);
        });
    }
    
    // Enter key in search input
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                const searchButton = document.querySelector('button.btn-primary i.fas.fa-search');
                if (searchButton && searchButton.parentElement) {
                    searchButton.parentElement.click();
                }
            }
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
        
        // Toggle user status
        usersTable.on('click', '.toggle-status', function() {
            const userId = $(this).data('id');
            const currentStatus = $(this).data('status');
            confirmAndUpdateStatus(userId, currentStatus);
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
                                <option value="0">Active</option>
                                <option value="1">Inactive</option>
                                <option value="2">Suspended</option>
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
                                <option value="0" ${(user.status === 0 || user.status === '0' || user.status === 'Active') ? 'selected' : ''}>Active</option>
                                <option value="1" ${(user.status === 1 || user.status === '1' || user.status === 'Inactive') ? 'selected' : ''}>Inactive</option>
                                <option value="2" ${(user.status === 2 || user.status === '2' || user.status === 'Suspended') ? 'selected' : ''}>Suspended</option>
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
    
    // 创建并添加模态框
    const modalContainer = document.createElement('div');
    modalContainer.innerHTML = modalHtml;
    document.body.appendChild(modalContainer);
    
    // 初始化模态框
    const modal = new bootstrap.Modal(document.getElementById('deleteUserModal'));
    modal.show();
    
    // 处理删除确认
    document.getElementById('confirmDeleteBtn').addEventListener('click', async function() {
        if (await deleteUser(userId)) {
            modal.hide();
        }
    });
    
    // 关闭时清理模态框
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
                        Confirm Batch Deletion
                    </h5>
                    <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body">
                    <p class="mb-0">Are you sure you want to delete these ${userIds.length} users? This action cannot be undone.</p>
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
    
    // 创建并添加模态框
    const modalContainer = document.createElement('div');
    modalContainer.innerHTML = modalHtml;
    document.body.appendChild(modalContainer);
    
    // 初始化模态框
    const modal = new bootstrap.Modal(document.getElementById('deleteBatchModal'));
    modal.show();
    
    // 处理删除确认
    document.getElementById('confirmBatchDeleteBtn').addEventListener('click', async function() {
        let success = true;
        for (const userId of userIds) {
            if (!await deleteUser(userId)) {
                success = false;
                break;
            }
        }
        
        if (success) {
            showAlert('All selected users have been successfully deleted', 'success');
            modal.hide();
            // 清空选择的用户
            selectedUsers = [];
            // 更新批量操作按钮
            updateBulkActionButtons();
        }
    });
    
    // 关闭时清理模态框
    document.getElementById('deleteBatchModal').addEventListener('hidden.bs.modal', function() {
        this.remove();
    });
}

/**
 * NEW FUNCTION: Confirm and update user status
 */
async function confirmAndUpdateStatus(userId, currentStatus) {
    // Determine the target status and action text
    let newStatus;
    let actionText;
    // Handle both string and number status values
    const statusNumber = parseInt(currentStatus);
    if (statusNumber === 0 || currentStatus === 'Active') {
        newStatus = 1; // Target: Inactive
        actionText = 'disable';
    } else { // Inactive (1) or Suspended (2)
        newStatus = 0; // Target: Active
        actionText = 'activate';
    }

    if (confirm(`Are you sure you want to ${actionText} this user (ID: ${userId})?`)) {
        try {
            // Assuming a POST endpoint like /user/update/status exists
            // Send data as form-urlencoded
            const response = await api.post(`/user/update/status`, 
                new URLSearchParams({ id: userId, status: newStatus }).toString(), 
                { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } } 
            );

            if (response.data && (response.data.code === '200' || response.data.code === 200)) {
                showAlert(`User status updated successfully!`, 'success');
                loadUsers(); // Reload the user list to reflect the change
            } else {
                 showAlert(response.data?.msg || 'Failed to update user status.', 'danger');
            }
        } catch (error) {
            console.error('Error updating user status:', error);
            showAlert('Error updating user status. ' + (error.response?.data?.msg || error.message), 'danger');
        }
    }
}
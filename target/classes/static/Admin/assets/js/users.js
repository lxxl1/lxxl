// Mock data for users
const mockUsers = [
    { username: 'john_doe', email: 'john@example.com', status: 'active', violations: 0 },
    { username: 'jane_smith', email: 'jane@example.com', status: 'locked', violations: 3 },
    { username: 'mike_wilson', email: 'mike@example.com', status: 'active', violations: 1 },
    { username: 'sarah_jones', email: 'sarah@example.com', status: 'active', violations: 0 },
    { username: 'tom_brown', email: 'tom@example.com', status: 'locked', violations: 5 }
];

// Initialize user management functionality
$(document).ready(function() {
    // Initialize DataTable
    const table = $('#usersTable').DataTable({
        data: mockUsers,
        columns: [
            { data: 'username' },
            { data: 'email' },
            { 
                data: 'status',
                render: function(data) {
                    return `<span class="status-badge status-${data}">${data}</span>`;
                }
            },
            { data: 'violations' },
            {
                data: null,
                render: function(data) {
                    const actionBtn = data.status === 'active' ? 
                        `<button class="btn btn-danger btn-sm action-btn" onclick="userManager.toggleUserStatus('${data.username}')">
                            <i class="fas fa-lock"></i> Lock
                        </button>` :
                        `<button class="btn btn-success btn-sm action-btn" onclick="userManager.toggleUserStatus('${data.username}')">
                            <i class="fas fa-unlock"></i> Unlock
                        </button>`;
                    return actionBtn;
                }
            }
        ],
        order: [[0, 'asc']]
    });

    // Search functionality
    $('#searchInput').on('keyup', function() {
        table.search(this.value).draw();
    });
});

// User management functions
const userManager = {
    // Toggle user status
    toggleUserStatus: function(username) {
        const user = mockUsers.find(u => u.username === username);
        if (user) {
            user.status = user.status === 'active' ? 'locked' : 'active';
            $('#usersTable').DataTable().ajax.reload();
            utils.showNotification(`User ${username} has been ${user.status}`);
        }
    },

    // Add new user
    addUser: function(userData) {
        // In a real application, this would make an API call
        mockUsers.push(userData);
        $('#usersTable').DataTable().ajax.reload();
        utils.showNotification('New user added successfully');
    },

    // Delete user
    deleteUser: function(username) {
        const index = mockUsers.findIndex(u => u.username === username);
        if (index !== -1) {
            mockUsers.splice(index, 1);
            $('#usersTable').DataTable().ajax.reload();
            utils.showNotification('User deleted successfully');
        }
    }
}; 
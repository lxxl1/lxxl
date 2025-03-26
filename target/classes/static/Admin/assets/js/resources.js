// Mock data for music resources
const mockResources = [
    {
        id: 1,
        title: 'Summer Vibes',
        artist: 'John Doe',
        category: 'pop',
        uploadDate: '2024-03-15',
        status: 'pending',
        audioUrl: 'https://example.com/audio1.mp3'
    },
    {
        id: 2,
        title: 'Midnight Dreams',
        artist: 'Jane Smith',
        category: 'rock',
        uploadDate: '2024-03-14',
        status: 'approved',
        audioUrl: 'https://example.com/audio2.mp3'
    },
    {
        id: 3,
        title: 'Jazz Night',
        artist: 'Mike Wilson',
        category: 'jazz',
        uploadDate: '2024-03-13',
        status: 'blocked',
        audioUrl: 'https://example.com/audio3.mp3'
    }
];

// Initialize resource management functionality
$(document).ready(function() {
    // Initialize DataTable
    const table = $('#resourcesTable').DataTable({
        data: mockResources,
        columns: [
            { data: 'title' },
            { data: 'artist' },
            { data: 'category' },
            { 
                data: 'uploadDate',
                render: function(data) {
                    return utils.formatDate(data);
                }
            },
            { 
                data: 'status',
                render: function(data) {
                    return `<span class="status-badge status-${data}">${data}</span>`;
                }
            },
            {
                data: null,
                render: function(data) {
                    return `<button class="btn btn-sm preview-btn action-btn" onclick="resourceManager.previewAudio('${data.audioUrl}')">
                                <i class="fas fa-play"></i> Preview
                            </button>`;
                }
            },
            {
                data: null,
                render: function(data) {
                    if (data.status === 'pending') {
                        return `
                            <button class="btn btn-sm approve-btn action-btn" onclick="resourceManager.updateStatus(${data.id}, 'approved')">
                                <i class="fas fa-check"></i> Approve
                            </button>
                            <button class="btn btn-sm block-btn action-btn" onclick="resourceManager.updateStatus(${data.id}, 'blocked')">
                                <i class="fas fa-ban"></i> Block
                            </button>
                        `;
                    }
                    return '';
                }
            }
        ],
        order: [[3, 'desc']]
    });

    // Search functionality
    $('#searchInput').on('keyup', function() {
        table.search(this.value).draw();
    });

    // Status filter
    $('#statusFilter').on('change', function() {
        const status = $(this).val();
        table.column(4).search(status).draw();
    });

    // Category filter
    $('#categoryFilter').on('change', function() {
        const category = $(this).val();
        table.column(2).search(category).draw();
    });

    // Date filter
    $('#dateFilter').on('change', function() {
        const date = $(this).val();
        table.column(3).search(date).draw();
    });
});

// Resource management functions
const resourceManager = {
    // Preview audio
    previewAudio: function(url) {
        // In a real application, this would open a modal with an audio player
        alert('Playing audio: ' + url);
    },

    // Update resource status
    updateStatus: function(id, status) {
        const resource = mockResources.find(r => r.id === id);
        if (resource) {
            resource.status = status;
            $('#resourcesTable').DataTable().ajax.reload();
            utils.showNotification(`Resource "${resource.title}" has been ${status}`);
        }
    },

    // Add new resource
    addResource: function(resourceData) {
        // In a real application, this would make an API call
        const newResource = {
            id: mockResources.length + 1,
            ...resourceData,
            status: 'pending',
            uploadDate: new Date().toISOString().split('T')[0]
        };
        mockResources.push(newResource);
        $('#resourcesTable').DataTable().ajax.reload();
        utils.showNotification('New resource added successfully');
    },

    // Delete resource
    deleteResource: function(id) {
        const index = mockResources.findIndex(r => r.id === id);
        if (index !== -1) {
            mockResources.splice(index, 1);
            $('#resourcesTable').DataTable().ajax.reload();
            utils.showNotification('Resource deleted successfully');
        }
    }
}; 
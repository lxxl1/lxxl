// Common functionality for all pages
$(document).ready(function() {
    // Initialize tooltips
    $('[data-bs-toggle="tooltip"]').tooltip();

    // Sidebar toggle
    $('#sidebarCollapse').on('click', function() {
        $('#sidebar').toggleClass('active');
        $('#content').toggleClass('active');
    });

    // Set admin name
    document.getElementById('adminName').textContent = localStorage.getItem('adminEmail') || 'Admin';

    // Handle sidebar links
    $('.components li a').click(function(e) {
        e.preventDefault();
        $('.components li').removeClass('active');
        $(this).parent().addClass('active');
        
        // Get the href and navigate
        const href = $(this).attr('href');
        if (href && href !== '#') {
            window.location.href = href;
        }
    });

    // Set active menu item based on current page
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    $('.components li a').each(function() {
        if ($(this).attr('href') === currentPage) {
            $(this).parent().addClass('active');
        }
    });

    // Handle responsive sidebar
    function checkWidth() {
        if ($(window).width() <= 768) {
            $('#sidebar').addClass('active');
            $('#content').addClass('active');
        } else {
            $('#sidebar').removeClass('active');
            $('#content').removeClass('active');
        }
    }

    // Check on load and resize
    checkWidth();
    $(window).resize(checkWidth);
});

// Common utility functions
const utils = {
    // Format date
    formatDate: function(date) {
        return new Date(date).toLocaleDateString();
    },

    // Show notification
    showNotification: function(message, type = 'success') {
        const alert = $(`<div class="alert alert-${type} alert-dismissible fade show" role="alert">
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        </div>`);
        
        $('.container-fluid').prepend(alert);
        
        setTimeout(() => {
            alert.alert('close');
        }, 5000);
    },

    // Handle API errors
    handleApiError: function(error) {
        console.error('API Error:', error);
        this.showNotification('An error occurred. Please try again.', 'danger');
    }
}; 
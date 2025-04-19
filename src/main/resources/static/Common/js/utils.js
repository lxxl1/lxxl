/**
 * Displays a temporary notification message to the user.
 * @param {string} message The message content.
 * @param {string} type The type of alert (e.g., 'success', 'info', 'warning', 'danger'). Defaults to 'info'.
 * @param {number} duration How long the message should stay visible in milliseconds. Defaults to 3000.
 */
export function showMessage(message, type = 'info', duration = 3000) {
    console.log(`[showMessage] Type: ${type}, Duration: ${duration}, Message: ${message}`);

    // Find or create the message container
    let messageContainer = document.getElementById('message-container');
    if (!messageContainer) {
        console.log('[showMessage] Creating message container.');
        messageContainer = document.createElement('div');
        messageContainer.id = 'message-container';
        // Apply some basic styling to position it
        Object.assign(messageContainer.style, {
            position: 'fixed',
            top: '20px',
            right: '20px',
            zIndex: '10000', // Ensure it's above most elements
            width: '300px'  // Optional: Set a max-width
        });
        document.body.appendChild(messageContainer);
    }

    // Create the alert element
    const messageElement = document.createElement('div');
    messageElement.className = `alert alert-${type} alert-dismissible fade show m-2`; // Added margin
    messageElement.setAttribute('role', 'alert');
    messageElement.innerHTML = `
        ${message}
        <button type="button" class="close" data-dismiss="alert" aria-label="Close">
            <span aria-hidden="true">&times;</span>
        </button>
    `;

    // Prepend to container so newest messages appear on top
    messageContainer.prepend(messageElement);

    // Auto-dismiss after duration
    const timer = setTimeout(() => {
        $(messageElement).alert('close'); // Use Bootstrap's alert close method
    }, duration);

    // Ensure timer is cleared if closed manually
    $(messageElement).on('closed.bs.alert', function () {
        clearTimeout(timer);
        console.log('[showMessage] Alert closed and removed.');
    });

     // Allow manual close via the button (Bootstrap handles this)
}

/**
 * Formats a date string or Date object into YYYY-MM-DD format.
 * Returns 'N/A' if the date is invalid or null.
 * @param {string | Date | null} dateInput The date string or Date object.
 * @returns {string} Formatted date string or 'N/A'.
 */
export function formatDate(dateInput) {
    if (!dateInput) return 'N/A';

    try {
        const date = new Date(dateInput);
        // Check if the date is valid
        if (isNaN(date.getTime())) {
            // console.warn(`[formatDate] Invalid date input received: ${dateInput}`);
            return 'Invalid Date';
        }
        // Intl.DateTimeFormat is more robust for locale-aware formatting, 
        // but YYYY-MM-DD is often preferred for consistency.
        const year = date.getFullYear();
        const month = (date.getMonth() + 1).toString().padStart(2, '0'); // Months are 0-indexed
        const day = date.getDate().toString().padStart(2, '0');
        return `${year}-${month}-${day}`;
    } catch (e) {
        console.error(`[formatDate] Error formatting date input ${dateInput}:`, e);
        return 'Format Error'; // Return original or error indication
    }
}

/**
 * Escapes HTML special characters to prevent XSS.
 * @param {string} str The string to escape.
 * @returns {string} The escaped string.
 */
export function escapeHTML(str) {
    if (!str) return '';
    return str.replace(/[&<>\'"/]/g, 
        tag => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            "'": '&#39;',
            '"': '&quot;',
            '/': '&#x2F;' // Escape forward slash for safety
        }[tag] || tag)
    );
}

/**
 * Sets up global event listeners, like logout buttons.
 */
export function setupGlobalEventListeners() {
    console.log('[setupGlobalEventListeners] Setting up global listeners...');

    // --- Logout Logic --- 
    const handleLogout = () => {
        console.log('[Logout] Logging out user...');
        localStorage.removeItem('user'); // Clear user data
        localStorage.removeItem('token'); // Clear token if used separately
        showMessage('You have been logged out.', 'info');
        // Redirect to login page after a short delay
        setTimeout(() => {
            window.location.href = '../login.html'; // Adjust path if necessary
        }, 1500);
    };

    // Find logout triggers (adjust selectors if needed)
    const logoutButtonHeader = document.getElementById('logout-button');
    const logoutLinkNav = document.getElementById('logout-link-nav');

    if (logoutButtonHeader) {
        logoutButtonHeader.addEventListener('click', (e) => {
            e.preventDefault();
            handleLogout();
        });
        console.log('[setupGlobalEventListeners] Logout button listener attached (header).');
    } else {
        console.warn('[setupGlobalEventListeners] Logout button (header) not found.');
    }

    if (logoutLinkNav) {
        logoutLinkNav.addEventListener('click', (e) => {
            e.preventDefault();
            handleLogout();
        });
        console.log('[setupGlobalEventListeners] Logout link listener attached (nav).');
    } else {
        console.warn('[setupGlobalEventListeners] Logout link (nav) not found.');
    }

    // --- Add other global listeners here if needed ---

    console.log('[setupGlobalEventListeners] Global listeners set up complete.');
}

/**
* Updates the user information displayed in the header/navigation.
* Assumes specific element IDs/classes in your HTML.
* @param {object} user The user object (e.g., from localStorage).
*/
export function updateUserHeader(user) {
    if (!user) return;

    console.log('[updateUserHeader] Updating header with user info:', user);

    // Use ID selectors for the standardized header elements
    const userNameElement = document.getElementById('header-user-name');
    const userAvatarElement = document.getElementById('header-user-avatar');

    if (userNameElement) {
        // Use user.name, fallback to user.username, then fallback to 'User'
        userNameElement.textContent = user.name || user.username || 'User'; 
    } else {
        console.warn('[updateUserHeader] Element with ID "header-user-name" not found.');
    }

    if (userAvatarElement) {
        userAvatarElement.src = user.avatar || 'assets/media/image/user/default_avatar.png'; // Use a default if no avatar
        userAvatarElement.alt = user.name || user.username || 'User Avatar'; // Update alt text as well
    } else {
         console.warn('[updateUserHeader] Element with ID "header-user-avatar" not found.');
    }

    console.log('[updateUserHeader] Header updated.');
} 
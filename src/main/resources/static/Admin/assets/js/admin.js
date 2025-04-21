import api from '../../../Common/js/api.js'; // Corrected import path

document.addEventListener('DOMContentLoaded', function() {
    // console.log("Admin dashboard script loaded.");

    // --- Update Admin Name --- 
    const adminNameElement = document.getElementById('adminName');
    const welcomeAdminNameElement = document.getElementById('welcomeAdminName'); // For welcome message
    
    function updateAdminDisplay(name) {
        if (adminNameElement) {
            adminNameElement.textContent = name;
        }
        if (welcomeAdminNameElement) { // Update welcome message too
            welcomeAdminNameElement.textContent = name;
        }
        // console.log(`Admin display name set to: ${name}`);
    }
    
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
        try {
            const user = JSON.parse(storedUser);
            const displayName = user.name || user.username || 'Admin';
            updateAdminDisplay(displayName);
        } catch (error) {
            // console.error("Error parsing user data from localStorage:", error);
            updateAdminDisplay('Admin'); // Fallback on error
        }
    } else {
        // console.warn("User data not found in localStorage for sidebar name.");
        updateAdminDisplay('Admin'); // Fallback if user data is missing
    }

    // --- Load Dashboard Stats from Local Storage --- 
    function loadDashboardStatsFromStorage() {
        // Check if we are on the dashboard page by looking for one of the stat elements
        const totalUsersElement = document.getElementById('totalUsersCount');
        if (!totalUsersElement) {
            // console.log("Not on the dashboard page, skipping stats loading.");
            return; // Exit if not on dashboard
        }
        
        // console.log("Loading dashboard stats from localStorage...");
        
        const totalSongsElement = document.getElementById('totalSongsCount');
        const pendingReviewsElement = document.getElementById('pendingReviewsCount');
        
        const usersCount = localStorage.getItem('totalUsersCount') || '0';
        const songsCount = localStorage.getItem('totalSongsCount') || '0';
        const pendingCount = localStorage.getItem('pendingReviewsCount') || '0';
        
        totalUsersElement.textContent = usersCount;
        // Update the accompanying text if needed, e.g., remove 'Loading...'
        if (totalUsersElement.nextElementSibling && totalUsersElement.nextElementSibling.tagName === 'P') {
             totalUsersElement.nextElementSibling.innerHTML = `<small>Total registered users</small>`;
        }

        if (totalSongsElement) {
            totalSongsElement.textContent = songsCount;
             if (totalSongsElement.nextElementSibling && totalSongsElement.nextElementSibling.tagName === 'P') {
                 totalSongsElement.nextElementSibling.innerHTML = `<small>Total music resources</small>`;
            }
        }
        
        if (pendingReviewsElement) {
            pendingReviewsElement.textContent = pendingCount;
            if (pendingReviewsElement.nextElementSibling && pendingReviewsElement.nextElementSibling.tagName === 'P') {
                 pendingReviewsElement.nextElementSibling.innerHTML = `<small>Resources awaiting review</small>`;
            }
        }
        // console.log(`Stats loaded: Users=${usersCount}, Songs=${songsCount}, Pending=${pendingCount}`);
    }
    
    // Call the function to load stats when the DOM is ready
    loadDashboardStatsFromStorage();

    // --- Functions to Fetch and Count Data --- 
    async function fetchAndCountUsers() {
        // console.log("Fetching all users for counting...");
        try {
            // Use the correct endpoint from UserController
            const response = await api.get('/user/select/all'); // Use imported api 
            if (response.data && (response.data.code === 200 || response.data.code === '200') && Array.isArray(response.data.data)) { // Check for number or string 200
                const usersCount = response.data.data.length;
                localStorage.setItem('totalUsersCount', usersCount);
                // console.log(`Total users count (${usersCount}) saved to localStorage.`);
                loadDashboardStatsFromStorage(); // Update dashboard if currently visible
            } else {
                // console.error('Failed to fetch users or unexpected data format:', response.data);
                 // Optionally show an error toast, but avoid flooding if called often
                 // showToast('Could not update user count.', 'error'); // Use local showToast
                 // Keep the old value in localStorage or set to 0?
                 // localStorage.setItem('totalUsersCount', '0'); 
            }
        } catch (error) {
            // Use the shared error handler, providing context
            handleApiError(error, 'fetchAndCountUsers'); // Use local handleApiError
             // Keep the old value in localStorage or set to 0?
             // localStorage.setItem('totalUsersCount', '0');
        }
    }

    async function fetchAndCountSongs() {
        // console.log("Fetching all songs for counting...");
        try {
            // Use the correct endpoint from SongController
            const response = await api.get('/song/allSong'); // Use imported api
            if (response.data && (response.data.code === 200 || response.data.code === '200') && Array.isArray(response.data.data)) { // Check for number or string 200
                const allSongsData = response.data.data;
                const totalSongs = allSongsData.length;
                // Count pending songs (status === 0)
                const pendingSongs = allSongsData.filter(song => song.status === 0).length;
                
                localStorage.setItem('totalSongsCount', totalSongs);
                localStorage.setItem('pendingReviewsCount', pendingSongs);
                
                // console.log(`Total songs count (${totalSongs}) saved to localStorage.`);
                // console.log(`Pending reviews count (${pendingSongs}) saved to localStorage.`);
                loadDashboardStatsFromStorage(); // Update dashboard if currently visible
            } else {
                // console.error('Failed to fetch songs or unexpected data format:', response.data);
                // showToast('Could not update song counts.', 'error'); // Use local showToast
                // localStorage.setItem('totalSongsCount', '0');
                // localStorage.setItem('pendingReviewsCount', '0');
            }
        } catch (error) {
            handleApiError(error, 'fetchAndCountSongs'); // Use local handleApiError
            // localStorage.setItem('totalSongsCount', '0');
            // localStorage.setItem('pendingReviewsCount', '0');
        }
    }

    // --- Initialize Dashboard Stats Fetching --- 
    // If we are on the dashboard, trigger fresh data fetching
    if (document.getElementById('totalUsersCount')) { // Check if dashboard elements exist
        // console.log("Dashboard detected, initiating fetch for latest stats...");
        fetchAndCountUsers(); // Fetch latest user count
        fetchAndCountSongs(); // Fetch latest song counts
    }

    // --- Common Utilities (API, Toast, Error Handling) --- 
    // Remove redundant local API setup 
    /*
    const API_BASE_URL = window.API_BASE_URL || '/'; // Use global config or default

    // Setup Axios instance 
    let api;
    try {
        api = axios.create({
            baseURL: API_BASE_URL,
            timeout: 30000, // 30 seconds timeout
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token') || ''}`,
                'X-Requested-With': 'XMLHttpRequest',
                'Accept': 'application/json'
            }
        });
        
        // Axios interceptors (optional but recommended)
        api.interceptors.response.use(
            response => response,
            error => {
                 if (error.response && (error.response.status === 401 || error.response.status === 403)) {
                    console.error("Authentication error detected. Redirecting to login.");
                    showToast("Authentication required. Redirecting to login...", 'error');
                    localStorage.removeItem('user');
                    localStorage.removeItem('token');
                    localStorage.removeItem('role');
                    setTimeout(() => { window.location.href = '../login.html'; }, 2000);
                } else {
                    // Handle other errors globally or let the caller handle them
                    console.error("Axios response error:", error);
                }
                return Promise.reject(error);
            }
        );
        
    } catch (e) {
        console.error("Axios library not found or failed to initialize!", e);
        // Provide a dummy api object to prevent errors in other scripts if axios fails to load
        api = {
             get: () => Promise.reject("Axios not available"),
             post: () => Promise.reject("Axios not available"),
             put: () => Promise.reject("Axios not available"),
             delete: () => Promise.reject("Axios not available"),
         };
    }
    */

    // Common function for Toastify notifications
    function showToast(message, type = 'success') {
        try {
            Toastify({
                text: message,
                duration: 3000,
                close: true,
                gravity: "top",
                position: "right", 
                // Use style.background for modern Toastify versions
                style: {
                    background: type === 'success' ? "linear-gradient(to right, #00b09b, #96c93d)" : "linear-gradient(to right, #ff5f6d, #ffc371)"
                },
                stopOnFocus: true,
            }).showToast();
        } catch (e) {
            // console.error("Toastify library not found or failed to show toast:", e);
            // Fallback to alert
            alert(`${type.toUpperCase()}: ${message}`);
        }
    }

    // Reusable API error handler
    function handleApiError(error, context = 'API call') {
        // console.error(`${context} failed:`, error);
        let message = `Error in ${context}. Please try again.`;
        if (error.response) {
            // console.error('Error response data:', error.response.data);
            // console.error('Error response status:', error.response.status);
             // Use detailed message from backend if available
             message = `Error: ${error.response.data.message || error.response.data.error || error.response.statusText || 'Server error'} (Status: ${error.response.status})`;
             // Avoid redirecting again if the interceptor already handled it
             if (error.response.status !== 401 && error.response.status !== 403) {
                 showToast(message, 'error');
             }
        } else if (error.request) {
            // console.error('Error request:', error.request);
            message = 'Network error or server did not respond.';
            showToast(message, 'error');
        } else if (message !== "Axios not available") { // Avoid showing toast if axios just wasn't loaded
            // console.error('Error message:', error.message || error);
            message = `Request setup error: ${error.message || error}`;
            showToast(message, 'error');
        }
       
    }

    // --- Sidebar Toggle --- 
    const sidebarToggle = document.getElementById('sidebarToggle');
    const sidebar = document.getElementById('sidebar');
    const content = document.getElementById('content'); // Get the content element

    if (sidebarToggle && sidebar && content) { // Check if all elements exist
        sidebarToggle.addEventListener('click', function() {
            sidebar.classList.toggle('active');
            content.classList.toggle('active'); // Also toggle active class on content
        });
    } else {
         // console.warn("Sidebar toggle button, sidebar, or content element not found.");
    }

    // --- Logout Logic --- 
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function(e) {
            e.preventDefault(); // Prevent default link behavior if it's an <a> tag
            // console.log("Logout button clicked.");
            // Add confirmation dialog
            if (confirm("Are you sure you want to logout?")) {
                // Clear local storage
                localStorage.removeItem('user');
                localStorage.removeItem('token');
                localStorage.removeItem('role');
                localStorage.removeItem('adminName'); // Clear admin specific data too
                // Optionally clear other relevant storage items
                localStorage.removeItem('totalUsersCount');
                localStorage.removeItem('totalSongsCount');
                localStorage.removeItem('pendingReviewsCount');
                
                // console.log("Local storage cleared.");
                
                // Redirect to login page
                showToast("Logging out...", 'info'); // Use local showToast
                setTimeout(() => {
                    window.location.href = '../login.html'; // Relative path from Admin folder
                }, 1000); // Short delay for toast visibility
            } else {
                // console.log("Logout cancelled by user.");
            }
        });
    } else {
        // console.warn("Logout button (#logoutBtn) not found.");
    }

    // --- Export functions for potential use by other admin scripts ---
    // Allows calling fetchAndCountUsers() from users.js after adding/deleting
    window.musicAdminApp = {
        fetchAndCountUsers: fetchAndCountUsers,
        fetchAndCountSongs: fetchAndCountSongs,
        showToast: showToast, // Expose toast function
        handleApiError: handleApiError // Expose error handler
    };

}); 
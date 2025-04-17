import api from '/Common/js/api.js'; // Use absolute path from root and import default

document.addEventListener('DOMContentLoaded', () => {
    console.log('Settings page loaded');
    
    // Get user info from localStorage
    const userString = localStorage.getItem('user');
    const currentUser = userString ? JSON.parse(userString) : null;
    const token = localStorage.getItem('token'); // Also get token for check
    const currentUserId = currentUser ? currentUser.id : null; // Get ID from parsed object

    // Get references to DOM elements (Corrected)
    const nameInput = document.getElementById('profile-name'); // Use the new name input ID
    const emailInput = document.getElementById('profile-email');
    const profileForm = document.getElementById('profile-form');
    const passwordForm = document.getElementById('password-change-form');
    const profileUpdateMessage = document.getElementById('profile-update-message');
    const passwordChangeMessage = document.getElementById('password-change-message');
    const avatarImg = document.getElementById('profile-avatar-img'); // Get avatar img element (Uncommented)

    let loadedUserProfile = null; // Variable to store loaded profile data

    if (!currentUserId || !token) { // Check for both ID and token
        console.error('User ID or Token not found in localStorage. Redirecting to login.');
        alert('Please log in to view settings.'); // Changed alert to English
        window.location.href = '../login.html'; // Redirect to login
        return;
    }
    
    console.log('Settings page user ID:', currentUserId);

    // Function to display messages
    function showMessage(element, message, isError = false) {
        if (!element) return; // Add null check for safety
        element.textContent = message;
        element.className = isError ? 'alert alert-danger mt-3' : 'alert alert-success mt-3';
        element.style.display = 'block';
    }

    // Function to clear messages
    function clearMessage(element) {
        if (!element) return; // Add null check for safety
        element.textContent = '';
        element.style.display = 'none';
    }

    // Function to load user profile data (Corrected)
    async function loadUserProfile() {
        clearMessage(profileUpdateMessage);
        console.log(`Fetching profile for user ID: ${currentUserId}`);
        try {
            const response = await api.get(`/user/select/${currentUserId}`);
            if (response.data && response.data.code === '200' && response.data.data) {
                loadedUserProfile = response.data.data; // Store the loaded profile
                console.log('Profile data received:', loadedUserProfile);

                 // --- Debugging ---
                console.log('Checking DOM elements before assignment:');
                console.log('nameInput element:', nameInput);
                console.log('emailInput element:', emailInput);
                console.log('avatarImg element:', avatarImg); // Check avatarImg too
                // --- End Debugging ---

                // Populate the form with data from backend response
                if (nameInput) {
                     console.log('Attempting to set nameInput.value');
                    nameInput.value = loadedUserProfile.name || ''; // Populate new name input
                } else {
                     console.warn('nameInput element was null or undefined.');
                }

                if (emailInput) {
                     console.log('Attempting to set emailInput.value');
                    emailInput.value = loadedUserProfile.email || ''; // Populate email with actual email field
                } else {
                     console.warn('emailInput element was null or undefined.');
                }

                // Handle avatar (Corrected)
                if (avatarImg) {
                     console.log('Attempting to set avatarImg.src');
                    if (loadedUserProfile.avatar) {
                        avatarImg.src = loadedUserProfile.avatar; // Use avatar URL from response
                    } else {
                        // Use a default path if avatar is null or empty
                        avatarImg.src = 'assets/media/image/user/default_avatar.png'; // Ensure this path is correct
                    }
                } else {
                     console.warn('avatarImg element was null or undefined.');
                }

            } else {
                console.error('Failed to load profile:', response.data ? response.data.msg : 'Unknown error');
                 // Changed message to English
                showMessage(profileUpdateMessage, `Failed to load user information: ${response.data ? response.data.msg : 'Could not retrieve data.'}`, true);
            }
        } catch (error) {
            console.error('Error fetching profile:', error);
            // Changed message to English
            showMessage(profileUpdateMessage, 'An error occurred while fetching user information. Please try again later.', true);
        }
    }

    // Function to handle profile update form submission (Corrected)
    async function handleProfileUpdate(event) {
        event.preventDefault();
        clearMessage(profileUpdateMessage);
        console.log('Profile update form submitted');

        if (!nameInput) {
             console.error("Name input field not found.");
             // Changed message to English
             showMessage(profileUpdateMessage, 'Internal error (Name input field missing).', true);
             return;
        }

        const updatedProfile = {
            id: parseInt(currentUserId),
            name: nameInput.value.trim(), // Get value from new name input
            // Only include fields expected by backend /user/update endpoint
        };

        // Check if name is empty
        if (!updatedProfile.name) {
             // Changed message to English
            showMessage(profileUpdateMessage, 'Name cannot be empty.', true);
            return;
        }

        console.log('Submitting profile update:', updatedProfile);

        try {
            const response = await api.post('/user/update', updatedProfile);
            if (response.data && response.data.code === '200') { 
                // Changed message to English
                showMessage(profileUpdateMessage, 'User information updated successfully!', false);
                 const currentUserData = JSON.parse(localStorage.getItem('user'));
                 if(currentUserData){
                    currentUserData.name = updatedProfile.name;
                    localStorage.setItem('user', JSON.stringify(currentUserData));
                 }
                 if (loadedUserProfile) {
                    loadedUserProfile.name = updatedProfile.name;
                 }
            } else {
                // Changed message to English
                showMessage(profileUpdateMessage, `Failed to update user information: ${response.data.msg || 'Unknown error.'}`, true);
            }
        } catch (error) {
            console.error('Error updating profile:', error);
            // Check if the error is due to token validation failure (status 401)
            if (error.response && error.response.status === 401) { 
                 console.log('Token expired or invalid during profile update. Redirecting to login.');
                 // Changed alert to English
                 alert('Your session has expired, please log in again.'); 
                 localStorage.removeItem('user');
                 localStorage.removeItem('token');
                 localStorage.removeItem('role');
                 window.location.href = '../login.html'; // Redirect to login page
            } else {
                 // Show generic error for other issues
                 // Changed message to English
                 showMessage(profileUpdateMessage, `An error occurred while updating user information: ${error.response?.data?.msg || error.message || 'Please try again later.'}`, true);
            }
        }
    }

    // Function to handle password change form submission (Corrected)
    async function handlePasswordChange(event) {
        event.preventDefault();
        clearMessage(passwordChangeMessage);
        console.log('Password change form submitted');

        const currentPassword = document.getElementById('current-password').value;
        const newPassword = document.getElementById('new-password').value;
        const confirmNewPassword = document.getElementById('confirm-new-password').value;

        if (!currentPassword || !newPassword || !confirmNewPassword) {
             // Changed message to English
             showMessage(passwordChangeMessage, 'All password fields are required.', true);
            return;
        }

        if (newPassword !== confirmNewPassword) {
             // Changed message to English
            showMessage(passwordChangeMessage, 'New passwords do not match.', true);
            return;
        }

        if (newPassword.length < 6) {
             // Changed message to English
            showMessage(passwordChangeMessage, 'New password must be at least 6 characters long.', true);
            return;
        }

        if (!loadedUserProfile || !loadedUserProfile.username) {
            console.warn('Loaded profile data not available, attempting re-fetch for username.');
            try {
                 await loadUserProfile();
                 if (!loadedUserProfile || !loadedUserProfile.username) {
                     // Changed message to English
                     showMessage(passwordChangeMessage, 'Could not retrieve user details to change password. Please refresh the page.', true);
                     return;
                 }
            } catch(e){
                 // Changed message to English
                 showMessage(passwordChangeMessage, 'Could not retrieve user details to change password. Please refresh the page.', true);
                 return;
            }
        }

        const userLoginIdentifier = loadedUserProfile.username;

        const passwordData = {
            username: userLoginIdentifier,
            password: currentPassword,
            newPassword: newPassword,
            role: loadedUserProfile.role || 'USER'
        };

        console.log('Submitting password change for username (login ID):', userLoginIdentifier);

        try {
            // Verify success code ('1' or '200'?)
            // NOTE: Backend currently uses code '1' for successful password change based on analysis
            const response = await api.put('/updatePassword', passwordData);
            if (response.data && response.data.code === '1') { // Keep checking '1' based on analysis, adjust if backend changes
                // Changed message to English
                showMessage(passwordChangeMessage, 'Password updated successfully!', false);
                document.getElementById('current-password').value = '';
                document.getElementById('new-password').value = '';
                document.getElementById('confirm-new-password').value = '';
            } else {
                // Changed message to English
                showMessage(passwordChangeMessage, `Password update failed: ${response.data.msg || 'Please check your current password.'}`, true);
            }
        } catch (error) {
            console.error('Error updating password:', error);
            // Check if the error is due to token validation failure (status 401)
            if (error.response && error.response.status === 401) { 
                 console.log('Token expired or invalid during password change. Redirecting to login.');
                 // Changed alert to English
                 alert('Your session has expired, please log in again.'); 
                 localStorage.removeItem('user');
                 localStorage.removeItem('token');
                 localStorage.removeItem('role');
                 window.location.href = '../login.html'; // Redirect to login page
            } else {
                 // Show generic error for other issues
                 // Changed message to English
                 showMessage(passwordChangeMessage, `An error occurred while updating password: ${error.response?.data?.msg || error.message || 'Please try again later.'}`, true);
            }
        }
    }

    // --- Add Event Listeners ---
    if (profileForm) {
        profileForm.addEventListener('submit', handleProfileUpdate);
    }
    if (passwordForm) {
        passwordForm.addEventListener('submit', handlePasswordChange);
    }

    // --- Initial Load ---
    loadUserProfile(); // Load the profile data when the page loads

}); 
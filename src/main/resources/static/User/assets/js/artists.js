import api from '../../../Common/js/api.js';
import { API_URL } from '../../../Common/js/config.js'; // If needed for image URLs etc.
import { showMessage, escapeHTML } from '../../../Common/js/utils.js'; // Corrected path

document.addEventListener('DOMContentLoaded', function() {
    // Ensure user is logged in - This is handled by auth-check.js automatically
    loadAndDisplayArtists();
    setupEventListeners(); // Keep search event listener setup
});

// Function to format sex
function formatSex(sexValue) {
    if (sexValue === 1) return 'Male';
    if (sexValue === 0) return 'Female';
    if (sexValue === 2) return 'Group'; // Assuming 2 might mean Group/Band
    return 'Unknown'; // Default/fallback
}

async function loadAndDisplayArtists() {
    const artistsContainer = document.getElementById('artists-container');
    const artistsGrid = document.getElementById('artists-grid');
    const loadingIndicator = document.getElementById('artists-loading');
    const noArtistsMessage = document.getElementById('no-artists-message');

    if (!artistsContainer || !artistsGrid || !loadingIndicator || !noArtistsMessage) {
        console.error('Required elements not found for artists display.');
        return;
    }

    loadingIndicator.style.display = 'block'; // Show loading
    artistsGrid.style.display = 'none'; // Hide grid initially
    noArtistsMessage.style.display = 'none'; // Hide no results message initially
    artistsGrid.innerHTML = ''; // Clear previous content

    try {
        const response = await api.get('/singer/allSinger');

        if (response.data && response.data.code === '200' && Array.isArray(response.data.data)) {
            const artists = response.data.data;

            if (artists.length === 0) {
                noArtistsMessage.style.display = 'block';
            } else {
                // Sort artists alphabetically by name (optional)
                artists.sort((a, b) => (a.name || '').localeCompare(b.name || ''));

                artists.forEach(artist => {
                    // Create a card column
                    const cardCol = document.createElement('div');
                    cardCol.className = 'col-xl-3 col-lg-4 col-md-6 col-sm-12 mb-4';
                    
                    // Default image if none exists
                    const artistImage = artist.pic || 'assets/media/image/default-artist.jpg';
                    
                    // Create card HTML
                    cardCol.innerHTML = `
                        <div class="card">
                            <a href="artist-detail.html?singerId=${artist.id}" class="card-link">
                                <img src="${escapeHTML(artistImage)}" class="card-img-top" alt="${escapeHTML(artist.name || 'Artist')}" 
                                     style="height: 200px; object-fit: cover;">
                                <div class="card-body text-center">
                                    <h5 class="card-title">${escapeHTML(artist.name || 'Unknown Artist')}</h5>
                                    <p class="card-text text-muted small">
                                        ${artist.location ? escapeHTML(artist.location) : ''}
                                    </p>
                                </div>
                            </a>
                        </div>
                    `;
                    
                    artistsGrid.appendChild(cardCol);
                });

                artistsGrid.style.display = 'flex'; // Show the grid with flex for proper row wrapping
            }
        } else {
            // Log the actual response data for debugging
            console.error('Failed to load artists. Unexpected response format. Received data:', response.data);
            // Determine the specific reason
            let reason = 'Unknown error';
            if (!response.data) {
                reason = 'Response data is missing.';
            } else if (response.data.code !== '200') {
                reason = `Expected code '200' but got ${response.data.code}. Message: ${response.data.message || response.data.msg || 'N/A'}`;
            } else if (!Array.isArray(response.data.data)) {
                reason = 'Expected data to be an array, but it was not.';
            }
            console.error('Specific reason for failure:', reason); // Log the specific reason
            artistsContainer.innerHTML = `<p class="text-center text-danger">Could not load artists. Please check console for details.</p>`;
        }
    } catch (error) {
        console.error('Error fetching artists:', error);
        artistsContainer.innerHTML = `<p class="text-center text-danger">An error occurred while loading artists.</p>`;
    } finally {
        loadingIndicator.style.display = 'none'; // Hide loading indicator
    }
}

function setupEventListeners() {
    // Add event listeners for search/filter on this page if needed later
    const searchForm = document.getElementById('song-search-form-artists');
    const searchInput = document.getElementById('song-search-input-artists');

    if(searchForm && searchInput) {
        searchForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const query = searchInput.value.trim();
            if(query) {
                // Redirect to search results page
                window.location.href = `search-results.html?query=${encodeURIComponent(query)}`;
            } else {
                // Maybe show a small message to enter a search term
                console.log("Search input is empty");
            }
        });
    }

    const addArtistForm = document.getElementById('addArtistForm');
    if (addArtistForm) {
        addArtistForm.addEventListener('submit', handleAddArtistSubmit);
    }

    // Listener for custom file input label
    const fileInput = document.getElementById('addArtistPic');
    if (fileInput) {
        fileInput.addEventListener('change', function() {
            const fileName = this.files[0] ? this.files[0].name : 'Choose image...';
            const nextSibling = this.nextElementSibling; // Get the label
            if (nextSibling && nextSibling.classList.contains('custom-file-label')) {
                nextSibling.innerText = fileName;
            }
        });
    }
}

/**
 * Handle the submission of the Add Artist form
 */
async function handleAddArtistSubmit(event) {
    event.preventDefault();
    const form = event.target;
    const alertContainer = document.getElementById('addArtistFormAlerts');
    alertContainer.innerHTML = ''; // Clear previous alerts

    // Basic validation (check required fields)
    const nameInput = document.getElementById('addArtistName');
    const sexInput = document.getElementById('addArtistSex');
    if (!nameInput.value || !sexInput.value) {
        showMessage('Please fill in all required fields (Name, Gender).', 'warning', alertContainer);
        return;
    }

    // Prepare form data for the API call (using FormData for easy handling)
    const formData = new FormData();
    formData.append('name', nameInput.value.trim());
    formData.append('sex', sexInput.value);
    formData.append('birth', document.getElementById('addArtistBirth').value || ''); // Send empty if not provided
    formData.append('location', document.getElementById('addArtistLocation').value.trim() || '');
    formData.append('introduction', document.getElementById('addArtistIntroduction').value.trim() || '');
    // **Important:** The backend expects a 'pic' parameter, even if it's empty,
    // because it was likely designed for form submissions where all fields are sent.
    // Send an empty string for now.
    formData.append('pic', '');

    // Note: We are NOT handling the actual file upload here yet due to backend limitations.
    // const pictureFile = document.getElementById('addArtistPic').files[0];

    try {
        // Convert FormData to a plain object for Axios POST request if backend expects JSON
        // Or send as x-www-form-urlencoded if backend expects that (which seems likely based on controller)
        // Let's assume x-www-form-urlencoded based on SingerController
        const params = new URLSearchParams();
        for (const pair of formData.entries()) {
            params.append(pair[0], pair[1]);
        }

        console.log("Submitting artist data:", Object.fromEntries(formData.entries()));

        const response = await api.post('/singer/add', params, {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });

        console.log("API Response:", response.data);

        if (response.data.code === '200') {
            showMessage('Artist added successfully!', 'success', alertContainer);
            form.reset(); // Reset the form fields
            // Reset file input label
            const fileInput = document.getElementById('addArtistPic');
            const fileLabel = fileInput?.nextElementSibling;
            if (fileLabel) fileLabel.innerText = 'Choose image...';
            
            $('#addArtistModal').modal('hide'); // Hide the modal using jQuery
            loadAndDisplayArtists(); // Refresh the artist list
        } else {
            throw new Error(response.data.msg || 'Failed to add artist');
        }
    } catch (error) {
        console.error('Error adding artist:', error);
        showMessage(`Error: ${error.message}`, 'danger', alertContainer);
    }
}

// --- Add Utility Functions if they don't exist globally --- 
// (Example showMessage - adapt if you have a central utils.js)
/*
function showMessage(message, type = 'info', container = null) {
    const alertElement = document.createElement('div');
    alertElement.className = `alert alert-${type} alert-dismissible fade show`;
    alertElement.role = 'alert';
    alertElement.innerHTML = `
        ${escapeHTML(message)}
        <button type="button" class="close" data-dismiss="alert" aria-label="Close">
            <span aria-hidden="true">&times;</span>
        </button>
    `;

    const targetContainer = container || document.body.querySelector('.main-content') || document.body;
    // Prepend to show at the top of the container
    targetContainer.insertBefore(alertElement, targetContainer.firstChild);

    // Auto-dismiss after 5 seconds
    setTimeout(() => {
         $(alertElement).alert('close'); // Use jQuery for smooth closing if available
    }, 5000);
}

function escapeHTML(str) {
    if (!str) return '';
    return str.replace(/[&<>'"/]/g, tag => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        "'": '&#39;',
        '"': '&quot;',
        '/': '&#x2F;'
    }[tag] || tag));
}
*/ 
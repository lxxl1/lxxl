import api from '../../../Common/js/api.js';
import { API_URL } from '../../../Common/js/config.js'; // If needed for image URLs etc.

document.addEventListener('DOMContentLoaded', function() {
    // Ensure user is logged in - This is handled by auth-check.js automatically
    loadAndDisplayArtists();
    setupEventListeners(); // Keep search event listener setup
});

// Function to safely escape HTML
function escapeHTML(str) {
    if (!str) return '';
    return str.replace(/[&<>'"]/g, 
        tag => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '\'': '&#39;',
            '"': '&quot;'
        }[tag] || tag)
    );
}

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
} 
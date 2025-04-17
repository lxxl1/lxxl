import api from '../../../Common/js/api.js';
import { API_URL } from '../../../Common/js/config.js'; // If needed for image URLs etc.
import { checkAuthentication } from './auth-check.js'; // Assuming auth check logic is needed

document.addEventListener('DOMContentLoaded', function() {
    checkUserLogin(); // Ensure user is logged in
    loadAndDisplayArtists();
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

async function loadAndDisplayArtists() {
    const container = document.getElementById('artists-by-letter-container');
    const loadingIndicator = document.getElementById('artists-loading');

    if (!container || !loadingIndicator) {
        console.error('Required elements not found for artists display.');
        return;
    }

    loadingIndicator.style.display = 'block'; // Show loading indicator
    container.innerHTML = ''; // Clear previous content (except loading)
    container.appendChild(loadingIndicator); // Keep loading indicator visible

    try {
        const response = await api.get('/singer/allSinger');
        
        if (response.data && response.data.code === 200 && Array.isArray(response.data.data)) {
            const artists = response.data.data;
            
            if (artists.length === 0) {
                 container.innerHTML = '<p class="text-center text-muted">No artists found.</p>';
                 return;
            }

            // Sort artists alphabetically by name
            artists.sort((a, b) => a.name.localeCompare(b.name));

            // Group artists by the first letter
            const groupedArtists = artists.reduce((groups, artist) => {
                const letter = artist.name.charAt(0).toUpperCase();
                 // Ensure the letter is A-Z, otherwise group under '#'
                const groupKey = (letter >= 'A' && letter <= 'Z') ? letter : '#'; 
                if (!groups[groupKey]) {
                    groups[groupKey] = [];
                }
                groups[groupKey].push(artist);
                return groups;
            }, {});

            // Display grouped artists
            container.innerHTML = ''; // Clear loading indicator and previous content
            
             // Get sorted letters including '#' if present
            const sortedLetters = Object.keys(groupedArtists).sort((a, b) => {
                if (a === '#') return 1; // Place '#' at the end
                if (b === '#') return -1;
                return a.localeCompare(b);
            });

            sortedLetters.forEach(letter => {
                const sectionDiv = document.createElement('div');
                sectionDiv.classList.add('letter-section', 'mb-4'); // Add margin bottom

                const header = document.createElement('h5');
                header.classList.add('letter-header', 'border-bottom', 'pb-2', 'mb-3'); // Style the header
                header.textContent = letter;
                sectionDiv.appendChild(header);

                const list = document.createElement('ul');
                list.classList.add('list-unstyled', 'row'); // Use Bootstrap row for grid layout

                groupedArtists[letter].forEach(artist => {
                    const listItem = document.createElement('li');
                    listItem.classList.add('col-md-4', 'col-sm-6', 'mb-2'); // Grid columns
                    // Create a link for each artist if needed later, for now just display name
                    // const link = document.createElement('a');
                    // link.href = `#`; // Placeholder link
                    // link.textContent = artist.name;
                    // listItem.appendChild(link);
                    listItem.textContent = artist.name;
                    list.appendChild(listItem);
                });

                sectionDiv.appendChild(list);
                container.appendChild(sectionDiv);
            });

        } else {
            console.error('Failed to load artists:', response.data ? response.data.message : 'Unknown error');
            container.innerHTML = '<p class="text-center text-danger">Could not load artists. Please try again later.</p>';
        }
    } catch (error) {
        console.error('Error fetching artists:', error);
         container.innerHTML = '<p class="text-center text-danger">An error occurred while loading artists.</p>';
    } finally {
        // Ensure loading indicator is hidden if it wasn't replaced by content or error message
        if (loadingIndicator && loadingIndicator.parentNode === container) { 
             loadingIndicator.style.display = 'none';
        }
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
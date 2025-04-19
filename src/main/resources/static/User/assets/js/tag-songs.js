import { API_URL } from '../../../Common/js/config.js';
import api from '../../../Common/js/api.js';

let currentUserId = null;
let currentTagId = null;
let currentTagName = '';
let allUserSongs = []; // Cache for user songs
let currentEditingSongTags = new Set(); // Temp storage for modal tag selection

document.addEventListener('DOMContentLoaded', () => {
    console.log('Tag Songs page loaded.');

    // Get user ID
    try {
        const user = JSON.parse(localStorage.getItem('user'));
        if (user && user.id) {
            currentUserId = user.id;
        } else {
            console.error('User not logged in or ID not found.');
            showAlert('Please log in to view tag songs.', 'danger');
            return; // Stop initialization if no user
        }
    } catch (error) {
        console.error('Error getting user ID:', error);
        showAlert('Error initializing page. Please try again.', 'danger');
        return;
    }

    // Get tag ID and name from URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    currentTagId = urlParams.get('tagId');
    currentTagName = urlParams.get('tagName') || 'Unknown Tag'; // Decode if needed, already done by URLSearchParams

    if (!currentTagId) {
        console.error('Tag ID not found in URL.');
        showAlert('Cannot load songs: Tag ID is missing.', 'danger');
        // Optionally redirect back to tag management page
        // window.location.href = 'tag-management.html';
        return;
    }

    console.log(`Initializing page for Tag ID: ${currentTagId}, Name: ${currentTagName}`);
    initializeTagSongsPage();
});

function initializeTagSongsPage() {
    if (!currentUserId || !currentTagId) return;

    updatePageTitlesAndStats();
    loadSongsForTag(currentTagId);
    setupEventListeners();
    // Preload all tags for the modal later?
    // preloadAllUserTags();
}

function updatePageTitlesAndStats() {
    const safeTagName = escapeHTML(currentTagName);
    document.getElementById('tagNameBreadcrumb').textContent = `Songs for "${safeTagName}"`;
    document.getElementById('tagNameStat').textContent = safeTagName;
    document.getElementById('tagPageTitle').textContent = `Songs with Tag: ${safeTagName}`;
    // Potentially update other stats like song count after loading
}

function setupEventListeners() {
    // Search functionality (if needed)
    const searchInput = document.getElementById('searchInput');
    const searchButton = document.getElementById('searchButton');
    if (searchInput && searchButton) {
        searchButton.addEventListener('click', () => filterAndDisplaySongs(searchInput.value.trim()));
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                filterAndDisplaySongs(searchInput.value.trim());
            }
        });
    }

    // Edit Tags Modal Save Button (Setup once)
    const saveTagsBtn = document.getElementById('saveTagsButton');
    if (saveTagsBtn) {
        saveTagsBtn.addEventListener('click', handleSaveTags);
    }
}

// --- Song Loading and Display --- 

async function preloadUserSongs() {
    if (!currentUserId) return [];
    console.log("Loading user songs...");
    try {
        const response = await api.get('/song/selectbyuser', { params: { userId: currentUserId } });
        
        // Check response code
        if (response.data.code === '200') {
            const responseData = response.data.data;
            
            // Check the returned data structure, prioritize list property (handle paginated object)
            if (responseData && Array.isArray(responseData.list)) {
                 console.log(`Loaded ${responseData.list.length} user songs (from paginated list).`);
                 return responseData.list; // Return the list array
            } 
            // Handle direct array return compatibility
            else if (Array.isArray(responseData)) {
                 console.log(`Loaded ${responseData.length} user songs (from direct array).`);
                 return responseData; // Return the array directly
            } 
            // Handle empty data or unexpected format
            else {
                console.warn("Received non-array or unexpected data format for user songs:", responseData);
                 return []; // Return empty array
            }
        } else {
            console.warn("Failed to load user songs:", response.data.msg);
            showAlert('Failed to load your songs list.', 'warning');
            return []; // Return empty array
        }
    } catch (error) {
        console.error("Error loading user songs:", error);
        showAlert('Error loading your songs list.', 'danger');
        return []; // Return empty array
    }
}

async function loadSongsForTag(tagId) {
    const songsContainer = document.getElementById('songsContainer');
    const noSongsMessage = document.getElementById('noSongsMessage');
    if (!songsContainer || !noSongsMessage) return;
    
    showLoadingState(songsContainer, noSongsMessage);

    try {
        // Fetch all user songs
        allUserSongs = await preloadUserSongs(); 
        filterAndDisplaySongs(); // Initial display without search term
        
    } catch (error) {
        console.error(`Error loading songs for tag ${tagId}:`, error);
        showAlert(`Failed to load songs for this tag.`, 'danger');
        songsContainer.innerHTML = '<div class="col-12 text-center text-danger">Error loading songs.</div>';
        noSongsMessage.style.display = 'none';
    }
}

function filterAndDisplaySongs(searchTerm = '') {
    const songsContainer = document.getElementById('songsContainer');
    const noSongsMessage = document.getElementById('noSongsMessage');
    const songCountBadge = document.getElementById('songCountBadge');
    const songCountStat = document.getElementById('songCountStat');
    const lowerSearchTerm = searchTerm.toLowerCase();

    // Filter songs that have the currentTagId
    let filteredSongs = allUserSongs.filter(song => 
        song && song.tagIds && Array.isArray(song.tagIds) && song.tagIds.includes(parseInt(currentTagId))
    );

    // Further filter by search term if provided
    if (lowerSearchTerm) {
        filteredSongs = filteredSongs.filter(song => 
            (song.name && song.name.toLowerCase().includes(lowerSearchTerm)) ||
            (song.singerName && song.singerName.toLowerCase().includes(lowerSearchTerm))
        );
    }

    console.log(`Displaying ${filteredSongs.length} songs for tag ${currentTagId} (Search: "${searchTerm}")`);
    displayTagSongs(filteredSongs, songsContainer, noSongsMessage, songCountBadge, songCountStat);
}

function displayTagSongs(songs, container, noSongsEl, countBadgeEl, countStatEl) {
    container.innerHTML = ''; // Clear loading/previous

    if (!songs || songs.length === 0) {
        noSongsEl.style.display = 'block';
        container.style.display = 'none';
        if (countBadgeEl) countBadgeEl.textContent = '0 songs';
        if (countStatEl) countStatEl.textContent = '0';
        return;
    }

    noSongsEl.style.display = 'none';
    container.style.display = 'flex'; // Ensure it shows as a row
    if (countBadgeEl) countBadgeEl.textContent = `${songs.length} song${songs.length !== 1 ? 's' : ''}`;
    if (countStatEl) countStatEl.textContent = songs.length;


    songs.forEach(song => {
        const songCard = createTagSongCard(song);
        container.appendChild(songCard);
    });
    
    if (window.feather) feather.replace();
    setupEditTagsListeners(); // Setup listeners for the newly added buttons
}

function createTagSongCard(song) {
    const songId = song.id;
    const songName = escapeHTML(song.name || 'Unknown Song');
    const singerName = escapeHTML(song.singerName || 'Unknown Artist'); // Assuming singerName is in DTO
    const coverUrl = song.pic ? `${getApiEndpoint()}${song.pic}` : 'assets/media/image/default-cover.jpg';

    const cardCol = document.createElement('div');
    cardCol.className = 'col-lg-3 col-md-4 col-sm-6 mb-4';

    // Card structure similar to category-songs.html, but with Edit Tags button
    cardCol.innerHTML = `
        <div class="card song-card shadow-sm h-100">
            <img src="${coverUrl}" class="card-img-top song-image" alt="${songName} Cover">
            <div class="card-body d-flex flex-column">
                <h6 class="card-title flex-grow-1" title="${songName}">${songName}</h6>
                <p class="card-text text-muted small mb-2">${singerName}</p>
                <div class="mt-auto d-flex justify-content-between align-items-center">
                    <button class="btn btn-sm btn-outline-primary play-song-btn" 
                            data-song-id="${songId}" 
                            data-song-url="${escapeHTML(song.url || '')}" 
                            data-song-name="${songName}" 
                            data-song-artist="${singerName}" 
                            data-song-cover="${coverUrl}">
                        <i data-feather="play-circle" class="mr-1" style="width: 16px; height: 16px;"></i> Play
                    </button>
                    <div class="song-controls">
                         <button class="btn btn-sm btn-light text-info edit-tags-btn" 
                                data-song-id="${songId}" 
                                data-song-name="${songName}" 
                                title="Edit Tags">
                            <i data-feather="tag"></i>
                        </button>
                        <!-- Add other controls like favorite if needed -->
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Add listener for the play button on this card
    const playButton = cardCol.querySelector('.play-song-btn');
    if (playButton) {
        playButton.addEventListener('click', () => {
             if (window.playAudioTrack) { // Check if audio-player.js function is available
                 window.playAudioTrack({
                     id: songId,
                     url: playButton.dataset.songUrl,
                     name: playButton.dataset.songName,
                     artist: playButton.dataset.songArtist,
                     cover: playButton.dataset.songCover
                 });
             } else {
                 console.error("Audio player function not found.");
                 showAlert("Cannot play audio: Player not ready.", "warning");
             }
        });
    }
    
    return cardCol;
}

// --- Edit Song Tags Modal Logic ---

function setupEditTagsListeners() {
    document.querySelectorAll('.edit-tags-btn').forEach(button => {
        // Simple re-attachment of listener for newly created buttons
        const newButton = button.cloneNode(true);
        button.parentNode.replaceChild(newButton, button);
        
        newButton.addEventListener('click', (event) => {
             const songId = newButton.dataset.songId;
             const songName = newButton.dataset.songName;
             handleEditTagsClick(songId, songName);
        });
    });
}

async function handleEditTagsClick(songId, songName) {
    console.log(`Editing tags for song ID: ${songId}, Name: ${songName}`);
    document.getElementById('modalSongTitle').textContent = songName; // Use the correct modal title span ID
    document.getElementById('modalSongId').value = songId; // Use the correct modal hidden input ID
    
    const modalTagList = document.getElementById('modalTagList');
    const modalAlerts = document.getElementById('modalAlerts'); // Use the correct modal alert ID
    modalTagList.innerHTML = '<div class="text-center w-100"><div class="spinner-border spinner-border-sm"></div></div>';
    modalAlerts.innerHTML = '';
    
    $('#editTagsModal').modal('show'); // Use the correct modal ID

    try {
        // Fetch all user tags and the song's current tags
        const [allTagsResponse, songTagsResponse] = await Promise.all([
            api.get('/tag/user', { params: { userId: currentUserId } }), // Fetch all tags user can assign
            api.get('/tag/song', { params: { songId: songId } }) // Fetch tags currently assigned to song
        ]);

        let allTags = [];
        if (allTagsResponse.data.code === '200') {
            allTags = allTagsResponse.data.data || [];
        } else {
            throw new Error('Failed to load available tags: ' + allTagsResponse.data.msg);
        }

        let currentSongTags = [];
        if (songTagsResponse.data.code === '200') {
            currentSongTags = songTagsResponse.data.data || [];
        } else {
            console.warn(`Failed to load tags for song ${songId}: ${songTagsResponse.data.msg}`);
            // Proceed even if current tags fail to load, assume none
        }
        
        const currentSongTagIds = new Set(currentSongTags.map(tag => tag.id));
        populateTagModal(allTags, currentSongTagIds, modalTagList);

    } catch (error) {
        console.error('Error preparing edit tags modal:', error);
        showAlert('Error loading tag information: ' + error.message, 'error', 'modalAlerts');
        modalTagList.innerHTML = '<p class="text-danger text-center">Failed to load tags.</p>';
    }
}

function populateTagModal(allTags, currentSongTagIds, container) {
    container.innerHTML = ''; // Clear spinner
    currentEditingSongTags = new Set(currentSongTagIds); // Initialize temp set for this edit session

    if (!allTags || allTags.length === 0) {
        container.innerHTML = '<p class="text-muted text-center w-100">No tags available to assign.</p>';
        return;
    }

    allTags.forEach(tag => {
        const tagId = tag.id;
        const isSelected = currentEditingSongTags.has(tagId);
        
        const pill = document.createElement('button');
        pill.type = 'button';
        pill.className = `btn btn-sm badge badge-pill ${isSelected ? 'btn-primary' : 'btn-outline-secondary'}`;
        pill.textContent = escapeHTML(tag.name);
        pill.dataset.tagId = tagId;

        pill.addEventListener('click', () => {
            const currentTagIdInt = parseInt(pill.dataset.tagId);
            if (pill.classList.contains('btn-primary')) {
                pill.classList.remove('btn-primary');
                pill.classList.add('btn-outline-secondary');
                currentEditingSongTags.delete(currentTagIdInt);
            } else {
                pill.classList.remove('btn-outline-secondary');
                pill.classList.add('btn-primary');
                currentEditingSongTags.add(currentTagIdInt);
            }
            console.log('Updated currentEditingSongTags:', currentEditingSongTags);
        });
        container.appendChild(pill);
    });
}

async function handleSaveTags() {
    const songId = document.getElementById('modalSongId').value; // Use correct ID
    const saveButton = document.getElementById('saveTagsButton'); // Use correct ID
    const modalAlerts = document.getElementById('modalAlerts'); // Use correct ID
    modalAlerts.innerHTML = '';

    const selectedTagIds = Array.from(currentEditingSongTags);
    console.log(`Saving tags for song ${songId}:`, selectedTagIds);

    saveButton.disabled = true;
    saveButton.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Saving...';

    try {
        // Backend expects POST /tag/song/add with urlencoded data
        const params = new URLSearchParams();
        params.append('songId', songId);
        params.append('tagIds', selectedTagIds.join(',')); // Join as comma-separated string

        const response = await api.post('/tag/song/add', params, {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });

        if (response.data.code === '200') {
            showAlert('Tags updated successfully!', 'success', 'modalAlerts');
            
            // Update the main song list data cache 
            const songIndex = allUserSongs.findIndex(s => s && s.id === parseInt(songId));
            if (songIndex !== -1) {
                allUserSongs[songIndex].tagIds = selectedTagIds; // Update local cache
                // Optionally update tagNames too if available/needed
                 console.log(`Local cache updated for song ${songId}`);
                 // Check if the current tag was removed, if so, remove card from view
                 if (!selectedTagIds.includes(parseInt(currentTagId))) {
                     console.log(`Song ${songId} no longer has tag ${currentTagId}. Removing from view.`);
                     filterAndDisplaySongs(document.getElementById('searchInput').value.trim()); // Re-render the list
                 }
            }
            
            setTimeout(() => {
                $('#editTagsModal').modal('hide'); // Use correct ID
            }, 1500);
        } else {
            showAlert(`Failed to update tags: ${response.data.msg || 'Unknown error'}`, 'error', 'modalAlerts');
        }
    } catch (error) {
        console.error('Error saving tags:', error);
        showAlert(`Error saving tags: ${error.message || 'Please try again'}`, 'error', 'modalAlerts');
    } finally {
        saveButton.disabled = false;
        saveButton.innerHTML = 'Save Changes';
    }
}

// --- Utility Functions ---

function showLoadingState(container, noItemsEl) {
     container.innerHTML = `<div class="col-12 text-center py-5">
                            <div class="spinner-border text-primary" role="status">
                                <span class="visually-hidden">Loading...</span>
                            </div>
                            <p class="mt-3">Loading songs...</p>
                        </div>`;
    noItemsEl.style.display = 'none';
    container.style.display = 'flex';
}

function escapeHTML(str) {
    if (!str) return '';
    return String(str).replace(/[&<>'"/]/g, 
        tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;', '/': '&#x2F;' }[tag] || tag)
    );
}

function showAlert(message, type = 'info', containerId = 'alerts') {
    const alertContainer = document.getElementById(containerId);
    if (!alertContainer) {
        console.error(`Alert container with ID '${containerId}' not found.`);
        if (containerId !== 'alerts') showAlert(message, type, 'alerts'); // Fallback
        else console.error(`Alert: [${type}] ${message}`); // Final fallback
        return;
    }
    
    const alertId = `alert-${Date.now()}`;
    const alertHTML = `
        <div id="${alertId}" class="alert alert-${type} alert-dismissible fade show" role="alert">
            ${escapeHTML(message)}
            <button type="button" class="close" data-dismiss="alert" aria-label="Close">
                <span aria-hidden="true">&times;</span>
            </button>
        </div>
    `;
    alertContainer.insertAdjacentHTML('beforeend', alertHTML); 
    
    const alertElement = document.getElementById(alertId);
    if (alertElement) {
        setTimeout(() => {
            $(alertElement).alert('close'); 
        }, 5000);
    }
}

function getApiEndpoint() {
    return typeof API_URL !== 'undefined' ? API_URL : 'http://localhost:8080';
} 
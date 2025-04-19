import { API_URL } from '../../../Common/js/config.js';
import api from '../../../Common/js/api.js';
import { playSongAudioPlayer } from './audio-player.js';

// Global variables
let currentUserId = null;
let currentPage = 1;
const pageSize = 10; // Or any other desired page size
let currentCategoryId = 'all'; // Store current filter value
let currentStatus = 'all';     // Store current filter value
let currentSearchTerm = '';   // Store current search term

document.addEventListener('DOMContentLoaded', function() {
    initPage();
});

/**
 * Initialize the page
 */
async function initPage() {
    const currentUser = JSON.parse(localStorage.getItem('user'));
    if (!currentUser || !currentUser.id) {
        showMessage('Please log in first', 'danger');
        setTimeout(() => {
            window.location.href = '../login.html';
        }, 2000);
        return;
    }
    currentUserId = currentUser.id; // Set global userId

    try {
        await populateCategoryFilter(); // Populate category filter first
        await loadUserSongs(); // Load initial data (page 1, default filters)
        setupEventListeners();
        updateStatistics(); // Call function to load and display stats
    } catch (error) {
        console.error('Failed to initialize page:', error);
        showMessage('Failed to load data, please try again later', 'danger');
    }
}

/**
 * Populate the category filter dropdown
 */
async function populateCategoryFilter() {
    const categorySelect = document.getElementById('categoryFilter');
    if (!categorySelect) return;

    try {
        const response = await api.get('/category/selectAll');
        if (response.data && response.data.code === '200' && response.data.data) {
            const categories = response.data.data;
            // Clear existing options except the first one ("All Categories")
            categorySelect.innerHTML = '<option value="all" selected>All Categories</option>'; 
            categories.forEach(category => {
                const option = document.createElement('option');
                option.value = category.id;
                option.textContent = category.name;
                categorySelect.appendChild(option);
            });
        } else {
            console.warn('Failed to load categories for filter:', response.data.msg);
            // Keep the default "All Categories" option
        }
    } catch (error) {
        console.error('Error fetching categories:', error);
        showMessage('Could not load categories for filtering', 'warning');
    }
}

/**
 * Load user songs with pagination, filtering, and searching
 */
async function loadUserSongs() {
    try {
        const tableBody = document.querySelector('#my-music-table tbody');
        tableBody.innerHTML = '<tr><td colspan="8" class="text-center">Loading songs...</td></tr>'; // Colspan is 8
        renderPaginationControls(null);

        // Prepare parameters, only include filters/search if they are not default values
        const params = {
            userId: currentUserId,
            pageNum: currentPage,
            pageSize: pageSize
        };
        if (currentCategoryId && currentCategoryId !== 'all') {
            params.categoryId = currentCategoryId;
        }
        if (currentStatus && currentStatus !== 'all') {
            params.status = currentStatus;
        }
        if (currentSearchTerm && currentSearchTerm.trim() !== '') {
            params.searchTerm = currentSearchTerm.trim(); // Use 'searchTerm' or adjust based on backend
        }

        console.log('Loading songs with params:', params);

        // !! IMPORTANT: Backend /song/selectbyuser needs to support categoryId, status, searchTerm !!
        // Update the API endpoint to the new search endpoint
        const response = await api.get('/song/user/search', { params });
        
        if (response.data.code === '200') {
            const pageInfo = response.data.data;
            if (pageInfo && pageInfo.list) {
                renderSongsList(pageInfo.list);
                renderPaginationControls(pageInfo);
                // currentPage = pageInfo.pageNum; // Update is handled by pagination controls now
            } else {
                 tableBody.innerHTML = '<tr><td colspan="8" class="text-center">No songs found matching your criteria.</td></tr>'; // Colspan is 8
                 renderPaginationControls(null);
            }
        } else {
            throw new Error(response.data.msg || 'Failed to fetch song list');
        }
    } catch (error) {
        console.error(`Failed to load user songs for page ${currentPage} with filters:`, error);
        const tableBody = document.querySelector('#my-music-table tbody');
        tableBody.innerHTML = '<tr><td colspan="8" class="text-center text-danger">Failed to load songs, please refresh and try again</td></tr>'; // Colspan is 8
        renderPaginationControls(null);
        // throw error; // Don't halt execution completely on load error
    }
}

/**
 * Render songs list to the table (Removed Plays, Added Singers)
 */
function renderSongsList(songs) {
    const tableBody = document.querySelector('#my-music-table tbody');
    tableBody.innerHTML = ''; // Clear existing rows

    if (!songs || songs.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="7" class="text-center">No songs found. Try uploading some music!</td></tr>';
        return;
    }
    
    songs.forEach((song, index) => {
        const singerNamesStr = Array.isArray(song.singerNames) ? song.singerNames.join(', ') : (song.singerNames || '-');
        const statusInfo = getStatusInfo(song.status); // Get status text and class
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>
                <div class="d-flex align-items-center">
                    <figure class="avatar avatar-sm mr-3">
                        <img src="${song.pic || 'assets/media/image/default-cover.jpg'}" alt="${song.name}">
                    </figure>
                    <span class="song-name">${song.name}</span>
                </div>
            </td>
            <td>${song.categoryNames || '-'}</td>
            <td>${song.tagNames || '-'}</td>
            <td>${formatDate(song.createTime)}</td>
            <td><span class="badge badge-${statusInfo.class}">${statusInfo.text}</span></td>
            <td>${singerNamesStr}</td>
            <td class="text-right">
                <div class="dropdown">
                    <a href="#" class="btn btn-sm btn-icon" data-toggle="dropdown">
                        <i data-feather="more-vertical"></i>
                    </a>
                    <div class="dropdown-menu dropdown-menu-right">
                        <a class="dropdown-item play-song" href="#" 
                           data-songid="${song.id}" 
                           data-url="${song.url || ''}" 
                           data-name="${escapeHTML(song.name || 'Unknown Song')}" 
                           data-singer="${escapeHTML(singerNamesStr)}" 
                           data-pic="${song.pic || 'assets/media/image/default-cover.jpg'}">
                            <i class="mr-2" data-feather="play"></i>Play
                        </a>
                        <a class="dropdown-item song-details" href="#" data-id="${song.id}">
                            <i class="mr-2" data-feather="info"></i>Details
                        </a>
                        <a class="dropdown-item delete-song" href="#" data-id="${song.id}">
                            <i class="mr-2" data-feather="trash"></i>Delete
                        </a>
                    </div>
                </div>
            </td>
        `;
        tableBody.appendChild(row);

        // *** Directly attach event listener for PLAY button ***
        const playButton = row.querySelector('.play-song');
        if (playButton) {
            playButton.addEventListener('click', function(e) {
                e.preventDefault(); 
                e.stopPropagation(); 
                const songId = this.getAttribute('data-songid');
                const songUrl = this.getAttribute('data-url');
                const name = this.getAttribute('data-name') || 'Unknown Song';
                const singer = this.getAttribute('data-singer') || '-';
                const pic = this.getAttribute('data-pic') || 'assets/media/image/default-cover.jpg';
                if (songUrl && songUrl.trim() !== '') { 
                    console.log(`Direct Play Click: ID=${songId}`);
                    playSongAudioPlayer(songUrl, name, singer, pic);
                } else {
                    console.error('Direct Play button clicked, but data-url missing.', this);
                    showMessage('Cannot play song: URL missing.', 'warning');
                }
            });
        }

        // *** Directly attach event listener for DETAILS button ***
        const detailsButton = row.querySelector('.song-details');
        if (detailsButton) {
            detailsButton.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation(); 
                const songId = this.getAttribute('data-id');
                if (songId) {
                    console.log(`Direct Details Click: ID=${songId}`);
                    showSongDetailsModal(songId);
                } else {
                    console.error('Direct Details button clicked, but data-id missing.', this);
                }
            });
        }

        // *** Directly attach event listener for DELETE button ***
        const deleteButton = row.querySelector('.delete-song');
        if (deleteButton) {
            deleteButton.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                const songId = this.getAttribute('data-id');
                if (songId) {
                    console.log(`Direct Delete Click: ID=${songId}`);
                    confirmDeleteSong(songId);
                } else {
                    console.error('Direct Delete button clicked, but data-id missing.', this);
                }
            });
        }
    });
    
    // Re-initialize Feather Icons
    if (window.feather) {
        feather.replace();
    }

    // Re-initialize Bootstrap Dropdowns (Keep this)
    setTimeout(() => {
        try {
            $('[data-toggle="dropdown"]').dropdown('dispose'); 
            $('[data-toggle="dropdown"]').dropdown(); 
            console.log('Dropdowns re-initialized after delay.');
        } catch (err) {
            console.error('Error re-initializing dropdowns:', err);
        }
    }, 50);

    // Optionally, re-initialize tooltips if they are also affected (less likely based on error)
    // $('[data-toggle="tooltip"]').tooltip(); 
}

/**
 * Render pagination controls
 */
function renderPaginationControls(pageInfo) {
    const paginationContainer = document.querySelector('#pagination-controls ul.pagination');
    if (!paginationContainer) return;

    paginationContainer.innerHTML = ''; 

    if (!pageInfo || pageInfo.pages <= 0) {
        paginationContainer.innerHTML = '<li class="page-item disabled"><span class="page-link">No songs</span></li>';
        return;
    }

    const currentP = pageInfo.pageNum;
    const totalPages = pageInfo.pages;

    // Previous Button
    const prevLi = document.createElement('li');
    prevLi.className = `page-item ${!pageInfo.hasPreviousPage ? 'disabled' : ''}`;
    const prevLink = document.createElement('a');
    prevLink.className = 'page-link';
    prevLink.href = '#';
    prevLink.textContent = 'Previous';
    prevLink.dataset.page = currentP - 1;
    prevLi.appendChild(prevLink);
    paginationContainer.appendChild(prevLi);

    // Page Number Buttons Logic (simplified)
    const pagesToShow = new Set();
    pagesToShow.add(1);
    if (totalPages > 1) pagesToShow.add(totalPages);
    if (currentP > 1) pagesToShow.add(currentP - 1);
    pagesToShow.add(currentP);
    if (currentP < totalPages) pagesToShow.add(currentP + 1);
    
    const sortedPages = Array.from(pagesToShow).filter(p => p >= 1 && p <= totalPages).sort((a, b) => a - b);

    let lastPageAdded = 0;
    sortedPages.forEach(pageNum => {
        if (pageNum > lastPageAdded + 1) {
             const ellipsisLi = document.createElement('li');
             ellipsisLi.className = 'page-item disabled';
             ellipsisLi.innerHTML = '<span class="page-link">...</span>';
             paginationContainer.appendChild(ellipsisLi);
        }
        const pageLi = document.createElement('li');
        pageLi.className = `page-item ${pageNum === currentP ? 'active' : ''}`;
        const pageLink = document.createElement('a');
        pageLink.className = 'page-link';
        pageLink.href = '#';
        pageLink.textContent = pageNum;
        pageLink.dataset.page = pageNum;
        pageLi.appendChild(pageLink);
        paginationContainer.appendChild(pageLi);
        lastPageAdded = pageNum;
    });
    
     if (lastPageAdded < totalPages -1 && !sortedPages.includes(totalPages)) {
         const ellipsisLi = document.createElement('li');
         ellipsisLi.className = 'page-item disabled';
         ellipsisLi.innerHTML = '<span class="page-link">...</span>';
         paginationContainer.appendChild(ellipsisLi);
         const lastPageLi = document.createElement('li');
         lastPageLi.className = 'page-item';
         const lastPageLink = document.createElement('a');
         lastPageLink.className = 'page-link';
         lastPageLink.href = '#';
         lastPageLink.textContent = totalPages;
         lastPageLink.dataset.page = totalPages;
         lastPageLi.appendChild(lastPageLink);
         paginationContainer.appendChild(lastPageLi);
     } else if (lastPageAdded === totalPages -1 && totalPages > 1 && !sortedPages.includes(totalPages)) {
          const lastPageLi = document.createElement('li');
          lastPageLi.className = 'page-item';
          const lastPageLink = document.createElement('a');
          lastPageLink.className = 'page-link';
          lastPageLink.href = '#';
          lastPageLink.textContent = totalPages;
          lastPageLink.dataset.page = totalPages;
          lastPageLi.appendChild(lastPageLink);
          paginationContainer.appendChild(lastPageLi);
     }

    // Next Button
    const nextLi = document.createElement('li');
    nextLi.className = `page-item ${!pageInfo.hasNextPage ? 'disabled' : ''}`;
    const nextLink = document.createElement('a');
    nextLink.className = 'page-link';
    nextLink.href = '#';
    nextLink.textContent = 'Next';
    nextLink.dataset.page = currentP + 1;
    nextLi.appendChild(nextLink);
    paginationContainer.appendChild(nextLi);
    
    // Event listeners for pagination links
    paginationContainer.querySelectorAll('.page-link').forEach(link => {
        if (!link.closest('.page-item').classList.contains('disabled')) {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const targetPage = parseInt(e.target.dataset.page);
                if (targetPage && targetPage !== currentPage) {
                    currentPage = targetPage; // Update global current page
                    loadUserSongs(); // Reload songs for the new page
                }
            });
        }
    });
}

/**
 * Update statistics cards (Removed Total Plays)
 */
async function updateStatistics() {
    console.log("Updating statistics...");
    if (!currentUserId) {
        console.warn("Cannot update stats, currentUserId is not set.");
        return;
    }

    try {
        // Call the dedicated statistics endpoint
        const response = await api.get(`/user/${currentUserId}/stats`); 

        if (response.data && response.data.code === '200' && response.data.data) {
            const stats = response.data.data;

            // Update UI elements for the remaining 3 cards
            const totalSongsEl = document.querySelector('.col-lg-4:nth-child(1) h2'); // Adjusted selector
            const approvedSongsEl = document.querySelector('.col-lg-4:nth-child(2) h2'); // Adjusted selector
            const pendingSongsEl = document.querySelector('.col-lg-4:nth-child(3) h2'); // Adjusted selector
            // const totalPlaysEl = document.querySelector('.col-lg-3:nth-child(4) h2'); // REMOVED

            if (totalSongsEl) totalSongsEl.textContent = stats.totalSongs ?? 0;
            if (approvedSongsEl) approvedSongsEl.textContent = stats.approvedSongs ?? 0;
            if (pendingSongsEl) pendingSongsEl.textContent = stats.pendingSongs ?? 0;
            // if (totalPlaysEl) totalPlaysEl.textContent = formatNumber(stats.totalPlays ?? 0); // REMOVED
            
            console.log("Statistics updated (excluding plays):", stats);

        } else {
             console.warn('Could not fetch or parse statistics data:', response.data.msg || 'No data received');
        }
    } catch (error) {
        console.error('Failed to update statistics via dedicated endpoint:', error);
        showMessage('Failed to load statistics', 'danger');
    }
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
    // Declare variables ONCE at the top of the function scope
    const tableBody = document.querySelector('#my-music-table tbody');
    const categoryFilter = document.getElementById('categoryFilter');
    const statusFilter = document.getElementById('statusFilter');
    const searchInput = document.getElementById('searchInput');
    const searchButton = document.getElementById('searchButton');
    const clearFiltersButton = document.getElementById('clearFiltersButton');
    const uploadButton = document.querySelector('button[data-target="#uploadMusicModal"]');

    // Filter listeners
    if (categoryFilter) {
        categoryFilter.addEventListener('change', function() {
            currentCategoryId = this.value;
            currentPage = 1;
            loadUserSongs();
        });
    }
    if (statusFilter) {
        statusFilter.addEventListener('change', function() {
            currentStatus = this.value;
            currentPage = 1;
            loadUserSongs();
        });
    }

    // Search listeners
    if (searchInput && searchButton) {
        searchInput.addEventListener('keyup', function(e) {
            if (e.key === 'Enter') {
                currentSearchTerm = this.value;
                currentPage = 1;
                loadUserSongs();
            }
        });
        searchButton.addEventListener('click', function() {
            currentSearchTerm = searchInput.value;
            currentPage = 1;
            loadUserSongs();
        });
    }

    // Clear Filters Button Listener
    if (clearFiltersButton) {
        clearFiltersButton.addEventListener('click', function() {
            if (categoryFilter) categoryFilter.value = 'all';
            if (statusFilter) statusFilter.value = 'all';
            if (searchInput) searchInput.value = '';
            currentCategoryId = 'all';
            currentStatus = 'all';
            currentSearchTerm = '';
            currentPage = 1;
            loadUserSongs();
        });
    }

    // Upload button redirect (If this modal button is still used)
     if (uploadButton) {
         uploadButton.addEventListener('click', function(e) {
             e.preventDefault();
             window.location.href = 'upload-music.html'; 
         });
     }
}

/**
 * Confirm deletion
 */
function confirmDeleteSong(songId) {
    if (confirm('Are you sure you want to delete this song? This action cannot be undone.')) {
        deleteSong(songId);
    }
}

/**
 * Delete song via API
 */
async function deleteSong(songId) {
    try {
        const response = await api.get(`/song/delete?id=${songId}`);
        if (response.data.code === '200') {
            showMessage('Song deleted successfully', 'success');
            // Reload the current page after deletion
            // Check if the current page becomes empty after deletion
            const tableBody = document.querySelector('#my-music-table tbody');
            if (tableBody && tableBody.rows.length === 1 && currentPage > 1) { 
                // If it was the last item on a page > 1, go to previous page
                currentPage--;
            }
            loadUserSongs(); // Reload potentially adjusted current page
            // updateStatistics(); // Consider if/how stats should be updated
        } else {
            throw new Error(response.data.msg || 'Deletion failed');
        }
    } catch (error) {
        console.error('Failed to delete song:', error);
        showMessage(`Deletion failed: ${error.message}`, 'danger');
    }
}

/**
 * Show song details in modal
 */
async function showSongDetailsModal(songId) {
    try {
        // Select modal elements once
        const detailSongImage = document.getElementById('detailSongImage');
        const detailSongName = document.getElementById('detailSongName');
        const detailSongArtist = document.getElementById('detailSongArtist');
        const detailSongCategory = document.getElementById('detailSongCategory');
        const detailSongTags = document.getElementById('detailSongTags');
        const detailSongDate = document.getElementById('detailSongDate');
        const detailSongStatus = document.getElementById('detailSongStatus');
        const detailSongDescription = document.getElementById('detailSongDescription');
        const detailSongLyrics = document.getElementById('detailSongLyrics');
        const detailPlayButton = document.getElementById('detailPlayButton');
        const modalElement = $('#songDetailsModal'); // jQuery object for modal control

        // Check if essential elements exist before proceeding
        if (!detailSongName || !detailSongArtist || !detailSongCategory || !detailSongTags || 
            !detailSongDate || !detailSongStatus || !detailSongDescription || !detailSongLyrics || 
            !detailSongImage || !detailPlayButton) {
            console.error("One or more modal elements not found!");
            showMessage("Could not display song details: Missing modal elements.", "danger");
            return;
        }

        // Show loading state (use innerHTML for tags/status)
        detailSongName.textContent = 'Loading...';
        detailSongArtist.textContent = '';
        detailSongCategory.textContent = '-';
        detailSongTags.innerHTML = '-'; // Use innerHTML for tags
        detailSongDate.textContent = '-';
        detailSongStatus.innerHTML = '-'; // Use innerHTML for status badge
        detailSongDescription.textContent = '-';
        detailSongLyrics.textContent = '-';
        detailSongImage.src = 'assets/media/image/default-cover.jpg'; // Default image
        detailPlayButton.onclick = null; // Disable play button initially
        
        // Show the modal using jQuery
        modalElement.modal('show');
        
        // Fetch song details from API - Use the correct API path
        // Assuming the API endpoint returns a SongDTO-like object with the expected fields
        const response = await api.get(`/song/detail?songId=${songId}`); 
        
        if (response.data.code !== '200' || !response.data.data) {
            throw new Error(response.data.msg || 'Failed to fetch song details');
        }
        
        const song = response.data.data; // Assume this is the song object
        
        // ---- Update the modal with fetched song details ----
        
        // Basic info
        detailSongImage.src = song.pic || 'assets/media/image/default-cover.jpg';
        detailSongName.textContent = song.name || 'Unknown Song';
        detailSongArtist.textContent = song.singerNames || '-'; // Assuming singerNames is a string
        detailSongCategory.textContent = song.categoryNames || '-'; // Assuming categoryNames is a string
        
        // Process tags (assuming song.tagNames is a comma-separated string or an array)
        let tagElements = '-';
        if (song.tagNames) {
            const tagsArray = Array.isArray(song.tagNames) ? song.tagNames : song.tagNames.split(',').map(t => t.trim()).filter(t => t);
            if (tagsArray.length > 0) {
                tagElements = tagsArray.map(tag => 
                    `<span class="badge badge-light mr-1">${escapeHTML(tag)}</span>`
                ).join('');
            }
        }
        detailSongTags.innerHTML = tagElements; // Use innerHTML
        
        // Format date using the utility function
        detailSongDate.textContent = formatDate(song.createTime);
        
        // Set status using the utility function
        detailSongStatus.innerHTML = getStatusBadge(song.status); // Use innerHTML
        
        // Set description and lyrics (Use escapeHTML for safety)
        detailSongDescription.textContent = song.introduction || 'No description available';
        // For lyrics, preserve line breaks by setting textContent on a <pre> tag
        detailSongLyrics.textContent = song.lyric || 'No lyrics available';
        
        // Setup play button event
        detailPlayButton.onclick = function() {
            // Close the modal
            modalElement.modal('hide');
            
            // Play the song using the audio player function
            playSongAudioPlayer(song.url, song.name, song.singerNames || '', song.pic || 'assets/media/image/default-cover.jpg');
        };
        
        // Re-initialize feather icons if they were used inside the modal (Play button icon)
        if (window.feather) {
            feather.replace();
        }
        
    } catch (error) {
        console.error('Error fetching or displaying song details:', error);
        // Update modal title or a dedicated error area within the modal if available
        if (document.getElementById('detailSongName')) {
             document.getElementById('detailSongName').textContent = 'Error loading details';
        }
        showMessage(`Error loading song details: ${error.message}`, 'danger');
        // Optionally hide the modal on error after a delay or keep it open with the error message
        // $('#songDetailsModal').modal('hide'); 
    }
}

/**
 * Helper function to get status badge HTML
 */
function getStatusBadge(status) {
    const info = getStatusInfo(status);
    return `<span class="badge badge-${info.class}">${escapeHTML(info.text)}</span>`;
}

// Refactored getStatusInfo function (used above)
function getStatusInfo(status) {
    switch(status) {
        case 0: return { text: 'Pending', class: 'warning' };
        case 1: return { text: 'Approved', class: 'success' };
        case 2: return { text: 'Rejected', class: 'danger' };
        default: return { text: 'Unknown', class: 'secondary' };
    }
}

// --- Utility Functions --- (formatDate, formatNumber, escapeHTML, showMessage) remain the same ---
function formatDate(dateString) {
    if (!dateString) return 'N/A';
    try {
        const date = new Date(dateString);
        const year = date.getFullYear();
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        return `${year}-${month}-${day}`;
    } catch (e) {
        return dateString;
    }
}

function formatNumber(num) {
    if (!num) return 0;
    if (num >= 1000) {
        return (num / 1000).toFixed(1) + 'k';
    }
    return num;
}

function escapeHTML(str) {
    if (!str) return '';
    return str.replace(/[&<>'"/]/g, function (tag) {
        const chars = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            "'": '&#39;',
            '"': '&quot;',
            '/': '&#x2F;'
        };
        return chars[tag] || tag;
    });
}

function showMessage(message, type = 'info') {
    let messageContainer = document.querySelector('.message-container');
    if (!messageContainer) {
        messageContainer = document.createElement('div');
        messageContainer.className = 'message-container position-fixed top-0 end-0 p-3';
        messageContainer.style.zIndex = '1050'; 
        messageContainer.style.top = '60px'; 
        messageContainer.style.right = '10px';
        document.body.appendChild(messageContainer);
    }
    const messageElement = document.createElement('div');
    messageElement.className = `alert alert-${type} alert-dismissible fade show`;
    messageElement.setAttribute('role', 'alert');
    messageElement.innerHTML = `
        ${escapeHTML(message)}
        <button type="button" class="close" data-dismiss="alert" aria-label="Close">
            <span aria-hidden="true">&times;</span>
        </button>
    `;
    messageContainer.appendChild(messageElement);
    setTimeout(() => {
        if (messageElement.parentElement) { 
             $(messageElement).alert('close');
        }
    }, 5000);
} 
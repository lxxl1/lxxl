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
    
    if (!songs || songs.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="8" class="text-center">No songs found matching your criteria.</td></tr>'; // Colspan 8
        return;
    }
    
    tableBody.innerHTML = '';
    
    songs.forEach((song, index) => {
        const row = document.createElement('tr');
        let statusText = 'Unknown';
        let statusClass = 'secondary';
        
        switch(song.status) {
            case 0: statusText = 'Pending'; statusClass = 'warning'; break;
            case 1: statusText = 'Approved'; statusClass = 'success'; break;
            case 2: statusText = 'Rejected'; statusClass = 'danger'; break;
        }
        
        // Colspan is 8 (Removed Plays, Added Singers)
        row.innerHTML = `
            <td>
                <div class="custom-control custom-checkbox">
                    <input type="checkbox" class="custom-control-input" id="song${song.id}">
                    <label class="custom-control-label" for="song${song.id}"></label>
                </div>
            </td>
            <td>
                <div class="d-flex align-items-center">
                    <img src="${song.pic || 'assets/media/image/music-thumbnail.jpg'}" alt="" class="mr-3" 
                        style="width: 40px; height: 40px; object-fit: cover;">
                    <div>
                        <h6 class="mb-0">
                            <a href="song-details.html?songId=${song.id}&from=my-music" class="text-dark">${escapeHTML(song.name)}</a>
                        </h6>
                        <!-- Display singer names in main info block if available -->
                        <!-- <small class="text-muted">${song.singerNames || ''}</small> --> 
                    </div>
                </div>
            </td>
            <td>${escapeHTML(song.categoryNames || 'N/A')}</td>
            <td>${escapeHTML(song.tagNames || 'N/A')}</td>
            <td>${formatDate(song.createTime)}</td>
            <td><span class="badge badge-${statusClass}">${statusText}</span></td>
            <!-- Display Singer(s) instead of Plays -->
            <td>${escapeHTML(song.singerNames || 'N/A')}</td> 
            <td class="text-right">
                <div class="dropdown">
                    <button class="btn btn-light btn-sm" type="button" data-toggle="dropdown">
                        <i data-feather="more-horizontal"></i>
                    </button>
                    <div class="dropdown-menu dropdown-menu-right">
                        <a class="dropdown-item play-song" href="#" data-id="${song.id}" data-url="${song.url}">
                            <i class="mr-2" data-feather="play"></i>Play
                        </a>
                        <a class="dropdown-item" href="song-details.html?songId=${song.id}&from=my-music">
                            <i class="mr-2" data-feather="info"></i>Details
                        </a>
                        <div class="dropdown-divider"></div>
                        <a class="dropdown-item text-danger delete-song" href="#" data-id="${song.id}">
                            <i class="mr-2" data-feather="trash"></i>Delete
                        </a>
                    </div>
                </div>
            </td>
        `;
        tableBody.appendChild(row);
    });
    
    if (window.feather) {
        feather.replace();
    }
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
    const tableBody = document.querySelector('#my-music-table tbody');
    const categoryFilter = document.getElementById('categoryFilter');
    const statusFilter = document.getElementById('statusFilter');
    const searchInput = document.getElementById('searchInput');
    const searchButton = document.getElementById('searchButton');
    const uploadButton = document.querySelector('button[data-target="#uploadMusicModal"]');
    const selectAllCheckbox = document.getElementById('selectAll');
    const clearFiltersButton = document.getElementById('clearFiltersButton'); // Get the new button

    // Table actions (Play, Delete) using event delegation
    if (tableBody) {
        tableBody.addEventListener('click', function(e) {
            const deleteLink = e.target.closest('.delete-song');
            const playLink = e.target.closest('.play-song');
            // No Edit listener needed anymore
            
            if (deleteLink) {
                e.preventDefault();
                const songId = deleteLink.getAttribute('data-id');
                confirmDeleteSong(songId);
            }
            
            if (playLink) {
                e.preventDefault();
                // ... (play logic remains the same) ...
                 const songId = playLink.getAttribute('data-id');
                 const songUrl = playLink.getAttribute('data-url');
                 const row = playLink.closest('tr');
                 const name = row?.querySelector('h6 a')?.textContent || 'Unknown Song';
                 const pic = row?.querySelector('img')?.src || 'assets/media/image/music-thumbnail.jpg';
                 const singer = row?.querySelector('small')?.textContent || '';
                 playSongAudioPlayer(songUrl, name, singer, pic);
            }
        });
    }
    
    // Filter listeners
    if (categoryFilter) {
        categoryFilter.addEventListener('change', function() {
            currentCategoryId = this.value;
            currentPage = 1; // Reset to first page when filter changes
            loadUserSongs();
        });
    }
    if (statusFilter) {
        statusFilter.addEventListener('change', function() {
            currentStatus = this.value;
            currentPage = 1; // Reset to first page
            loadUserSongs();
        });
    }

    // Search listeners
    if (searchInput) {
        searchInput.addEventListener('keyup', function(e) {
            if (e.key === 'Enter') {
                currentSearchTerm = this.value;
                currentPage = 1; // Reset to first page
                loadUserSongs();
            }
        });
    }
    if (searchButton) {
        searchButton.addEventListener('click', function() {
            currentSearchTerm = searchInput.value;
            currentPage = 1; // Reset to first page
            loadUserSongs();
        });
    }

    // Clear Filters Button Listener
    if (clearFiltersButton) {
        clearFiltersButton.addEventListener('click', function() {
            // Reset dropdowns
            if (categoryFilter) categoryFilter.value = 'all';
            if (statusFilter) statusFilter.value = 'all';
            // Reset search input
            if (searchInput) searchInput.value = '';
            
            // Reset JS variables
            currentCategoryId = 'all';
            currentStatus = 'all';
            currentSearchTerm = '';
            currentPage = 1;
            
            // Reload songs
            loadUserSongs();
            
            // Optionally re-focus the first filter or search input
            // if (categoryFilter) categoryFilter.focus(); 
        });
    }

    // Upload button redirect
     if (uploadButton) {
         uploadButton.addEventListener('click', function(e) {
             e.preventDefault();
             window.location.href = 'upload-music.html';
         });
     }
    
    // Select All Checkbox
    if (selectAllCheckbox && tableBody) {
        selectAllCheckbox.addEventListener('change', function() {
            const checkboxes = tableBody.querySelectorAll('.custom-control-input');
            checkboxes.forEach(checkbox => {
                checkbox.checked = this.checked;
            });
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
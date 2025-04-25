/**
 * Songs Management JavaScript
 * Handles all the song-related functionality including:
 * - Displaying all songs in a data table
 * - Adding new songs
 * - Editing song details
 * - Updating song files (audio, MV, cover image)
 * - Deleting songs
 * - Previewing songs
 * - Filtering and searching
 */

// Import config and API
import { API_URL } from '../../../Common/js/config.js';
import api from '../../../Common/js/api.js';

// API 基础URL - 移除 '/api' 前缀，直接使用控制器路径
// const API_BASE_URL = '/api'; // 不再需要这个，或者仅用于其他API
const SONG_API_BASE_URL = '/song';
const SINGER_API_BASE_URL = '/singer';
const CATEGORY_API_BASE_URL = '/category';

// 每页显示条数
const PAGE_SIZE = 10;

// Utility function to escape HTML
function escapeHTML(str) {
    if (!str) return '';
    return str.replace(/[&<>"'/]/g, function (s) {
        const entityMap = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;',
            '/': '&#x2F;'
        };
        return entityMap[s];
    });
}

/**
 * 显示或隐藏加载指示器
 * @param {boolean} show - 是否显示加载指示器
 */
function showLoadingIndicator(show) {
    const loadingOverlay = document.getElementById('loadingOverlay');
    if (!loadingOverlay) return;
    
    if (show) {
        loadingOverlay.classList.remove('d-none');
    } else {
        loadingOverlay.classList.add('d-none');
    }
}

/**
 * 显示上传进度
 * @param {number} percent - 上传百分比 (0-100)
 */
function updateUploadProgress(percent) {
    const progressContainer = document.getElementById('uploadProgress');
    const progressBar = progressContainer?.querySelector('.progress-bar');
    
    if (!progressContainer || !progressBar) return;
    
    progressContainer.classList.remove('d-none');
    
    const percentValue = Math.round(percent);
    progressBar.style.width = `${percentValue}%`;
    progressBar.setAttribute('aria-valuenow', percentValue);
    progressBar.textContent = `${percentValue}%`;
    
    if (percentValue >= 100) {
        // 上传完成后，3秒后隐藏进度条
        setTimeout(() => {
            progressContainer.classList.add('d-none');
            progressBar.style.width = '0%';
            progressBar.setAttribute('aria-valuenow', 0);
            progressBar.textContent = '0%';
        }, 3000);
    }
}

/**
 * 预览封面图片
 */
function setupCoverPreview() {
    const addCoverFileInput = document.getElementById('addCoverFile');
    const addCoverPreview = document.getElementById('addCoverPreview');
    
    if (addCoverFileInput && addCoverPreview) {
        addCoverFileInput.addEventListener('change', function() {
            if (this.files && this.files[0]) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    addCoverPreview.src = e.target.result;
                };
                reader.readAsDataURL(this.files[0]);
            }
        });
    }
}

// Global variables
let songsTable;
let currentSongId = null;
let allSongsData = []; // Store all fetched songs for filtering
let currentFilterStatus = 'All'; // Added declaration and initial value
let allSingersData = []; // Store all singers for selection modals
let selectedAddSingers = new Map();
let allCategoriesData = []; // Store all categories for selection modal
let selectedAddCategories = new Map();
let selectedEditSingers = new Map(); // Map for selected singers in Edit modal
let selectedEditCategories = new Map(); // Map for selected categories in Edit modal
let currentUserId = 0; // Default Admin User ID
let currentAlbumName = ''; // Variable to store extracted album name

// Initialize after document is loaded
document.addEventListener('DOMContentLoaded', async () => {
    // Set current user ID (if needed for uploads)
    // setCurrentUserId(); // No longer needed as we set it directly above
    
    // Initialize data table
    initializeDataTable();
    
    // Use Promise.all to wait for essential NON-SONG data loading
    try {
        console.log("Starting initial essential data load (Singers, Categories)...");
        const [singersLoaded, categoriesLoaded] = await Promise.all([
            loadSingers(),              // Load all singers
            loadCategories()            // Load all categories
        ]);
        console.log(`Initial essential data load status: Singers=${singersLoaded}, Categories=${categoriesLoaded}`);

        if (!singersLoaded) {
            showToast('Failed to load artists list. Singer selection might not work.', 'error');
        }
        if (!categoriesLoaded) {
            showToast('Failed to load categories list. Category selection might not work.', 'error');
        }

        // Setup event listeners AFTER data attempts loading
        setupEventListeners();

        // Initial UI updates based on fetched data
        console.log("[DOMContentLoaded] Calling fetchAndDisplaySongs for initial load...");
        await fetchAndDisplaySongs(true); // ADDED: Call the main function to load stats and table

    } catch (error) {
        console.error('Critical initialization error:', error);
        showToast('Error loading essential page data. Please refresh.', 'error');
    }
    
    // Initialize image preview for Add modal
    initAddImageUploadPreview();

    // Trigger count update on load (for localStorage and initial stats)
    console.log("[DOMContentLoaded] Initial setup complete.");
});

/**
 * Get user ID from localStorage and set it (if needed for uploads or other logic).
 * Note: Original function name had Chinese comment.
 * This function is now simplified to always use admin ID 0.
 */
function setCurrentUserId() {
    currentUserId = 0;
    // console.log("Admin User ID set to:", currentUserId);
    // Removed localStorage logic as per requirement for admin interface.
}

/**
 * Fetch and display songs based on current filters and status.
 * Also updates statistics using the dedicated /stats endpoint.
 * @param {boolean} initialLoad - Flag indicating if it's the initial page load.
 */
async function fetchAndDisplaySongs(initialLoad = false) {
    console.log("[fetchAndDisplaySongs] Function called. initialLoad:", initialLoad);
    showLoadingIndicator(true);
    try {
    if (initialLoad) {
            console.log("[fetchAndDisplaySongs] Initial load detected, loading singers/categories...");
        // Fetch supporting data only on initial load or when necessary
        const singersLoaded = await loadSingers();
        const categoriesLoaded = await loadCategories();
        if (!singersLoaded || !categoriesLoaded) {
            showToast("Failed to load necessary filters data. Song list may be incomplete.", "warning");
        }
    }

        // 1. Fetch Statistics Data
        try {
            console.log("[fetchAndDisplaySongs] Attempting to fetch /song/stats...");
            const statsResponse = await api.get(`${SONG_API_BASE_URL}/stats`);
            console.log("[fetchAndDisplaySongs] Received response from /song/stats:", statsResponse);

            if (statsResponse.data && (statsResponse.data.code === '200' || statsResponse.data.code === 200) && statsResponse.data.data) {
                const statsData = statsResponse.data.data;
                console.log("[fetchAndDisplaySongs] Successfully parsed stats data:", statsData);

                // Update UI directly with fetched stats - Use correct IDs from HTML
                console.log(`[fetchAndDisplaySongs] Updating #songsTotalCount with: ${statsData.totalSongs}`);
                $('#songsTotalCount').text(statsData.totalSongs);
                console.log(`[fetchAndDisplaySongs] Updating #songsPendingCount with: ${statsData.pendingSongs}`);
                $('#songsPendingCount').text(statsData.pendingSongs);
                console.log(`[fetchAndDisplaySongs] Updating #songsApprovedCount with: ${statsData.approvedSongs}`);
                $('#songsApprovedCount').text(statsData.approvedSongs);
                console.log(`[fetchAndDisplaySongs] Updating #songsRejectedCount with: ${statsData.rejectedSongs}`);
                $('#songsRejectedCount').text(statsData.rejectedSongs);

                // Update progress bars etc. based on statsData
                const safeTotal = statsData.totalSongs || 1; // Avoid division by zero
                console.log(`[fetchAndDisplaySongs] Updating progress bars based on safeTotal: ${safeTotal}`);
                $('#pendingProgress').css('width', `${(statsData.pendingSongs / safeTotal) * 100}%`);
                $('#approvedProgress').css('width', `${(statsData.approvedSongs / safeTotal) * 100}%`);
                $('#rejectedProgress').css('width', `${(statsData.rejectedSongs / safeTotal) * 100}%`);

                // Update filter button counts (optional, if you have elements like #pendingFilterCount)
                console.log("[fetchAndDisplaySongs] Updating filter counts (if elements exist)...");
                $('#allFilterCount').text(statsData.totalSongs);
                $('#pendingFilterCount').text(statsData.pendingSongs);
                $('#approvedFilterCount').text(statsData.approvedSongs);
                $('#rejectedFilterCount').text(statsData.rejectedSongs);
                console.log("[fetchAndDisplaySongs] Finished updating stats UI elements.");
            } else {
                console.error('[fetchAndDisplaySongs] Failed to fetch or parse stats:', statsResponse.data?.msg);
                showToast('Error fetching song statistics.', 'error');
                // Optionally clear stats or show error state - Use correct IDs
                $('#songsTotalCount, #songsPendingCount, #songsApprovedCount, #songsRejectedCount').text('Error');
                $('#pendingProgress, #approvedProgress, #rejectedProgress').css('width', '0%');
                $('#allFilterCount, #pendingFilterCount, #approvedFilterCount, #rejectedFilterCount').text('-');
            }
        } catch (error) {
            console.error('[fetchAndDisplaySongs] Network error fetching /song/stats:', error);
            showToast('Network error fetching song statistics.', 'error');
            // Optionally clear stats or show error state - Use correct IDs
            $('#songsTotalCount, #songsPendingCount, #songsApprovedCount, #songsRejectedCount').text('Error');
            $('#pendingProgress, #approvedProgress, #rejectedProgress').css('width', '0%');
            $('#allFilterCount, #pendingFilterCount, #approvedFilterCount, #rejectedFilterCount').text('-');
        }

        // 2. 获取筛选条件
    const filters = getAppliedFilters();
        console.log("[fetchAndDisplaySongs] Applied Filters:", filters);

        // 3. 使用后端API进行筛选查询，而不是获取所有歌曲后在前端筛选
        let songsData = [];
        try {
            // 根据筛选条件构建查询参数
            const params = new URLSearchParams();
            
            // 修改：只有当 filters.userId 有值时才添加 userId 参数
            if (filters.userId) {
                params.append('userId', filters.userId);
                console.log(`[fetchAndDisplaySongs] Applying filter userId: ${filters.userId}`);
            } else {
                // userId 筛选框为空，不发送 userId 参数，表示获取所有用户的歌曲
                console.log(`[fetchAndDisplaySongs] No userId specified, fetching songs for all users.`);
            }
            
            // 添加其他筛选参数
            if (filters.status !== '') {
                params.append('status', filters.status);
            }
            
            if (filters.songName) {
                params.append('searchTerm', filters.songName);
            }
            
            if (filters.categoryId) {
                params.append('categoryId', filters.categoryId);
            }
            
            // 添加分页参数（如果接口支持） - 暂时获取较多数据，稍后考虑真正分页
            params.append('pageNum', 1);
            params.append('pageSize', 500); // 获取更多数据以便前端临时查看
            
            const queryString = params.toString();
            let url = `${SONG_API_BASE_URL}/user/search`;
            if (queryString) {
                url += `?${queryString}`;
            }
            
            console.log(`[fetchAndDisplaySongs] Fetching filtered songs from: ${url}`);
            const response = await api.get(url);
            
            if (response.data && (response.data.code === '200' || response.data.code === 200)) {
                if (response.data.data && response.data.data.list) {
                    // 如果返回的是分页对象，获取list属性
                    songsData = response.data.data.list || [];
                } else {
                    // 如果直接返回数组
                    songsData = response.data.data || [];
                }
                console.log(`[fetchAndDisplaySongs] Fetched ${songsData.length} filtered songs.`);
            } else {
                console.error('[fetchAndDisplaySongs] Failed to fetch filtered songs:', response.data?.msg);
                showToast('Error fetching song data (server response).', 'error');
                throw new Error('API response error'); // 抛出错误进入备用方案
            }
        } catch (error) {
            console.error('[fetchAndDisplaySongs] Network error fetching filtered songs:', error);
            showToast('Error fetching song data (network error).', 'error');
            
            // 备用方案1: 根据名称模糊查询
            if (filters.songName) {
                try {
                    console.log("[fetchAndDisplaySongs] Attempting fallback to /likeSongOfName...");
                    const nameSearchResponse = await api.get(`${SONG_API_BASE_URL}/likeSongOfName?songName=${encodeURIComponent(filters.songName)}`);
                    if (nameSearchResponse.data && nameSearchResponse.data.code === 200 && Array.isArray(nameSearchResponse.data.data)) {
                        songsData = nameSearchResponse.data.data || [];
                        console.log(`[fetchAndDisplaySongs] Fallback name search found ${songsData.length} songs.`);
                        
                        // 如果有其他筛选条件，在前端进行进一步筛选
                        if (filters.status !== '' || filters.userId || filters.categoryId) {
                            songsData = filterSongs(songsData, filters);
                            console.log(`[fetchAndDisplaySongs] Further filtered to ${songsData.length} songs client-side.`);
                        }
                        
                        // 成功获取数据后不进入下一个备用方案
                        updateSongsTable(songsData);
                        return;
                    }
                } catch (nameSearchError) {
                    console.error('[fetchAndDisplaySongs] Name search fallback failed:', nameSearchError);
                }
            }
            
            // 备用方案2: 获取所有歌曲作为最后的备用方案
            try {
                console.log("[fetchAndDisplaySongs] Attempting fallback to /allSong...");
                const fallbackResponse = await api.get(`${SONG_API_BASE_URL}/allSong`);
                if (fallbackResponse.data && (fallbackResponse.data.code === '200' || fallbackResponse.data.code === 200) && Array.isArray(fallbackResponse.data.data)) {
                    songsData = fallbackResponse.data.data || [];
                    console.log(`[fetchAndDisplaySongs] Fallback fetched ${songsData.length} songs.`);
                    // 在前端进行筛选（作为备用）
                    songsData = filterSongs(songsData, filters);
                    console.log(`[fetchAndDisplaySongs] Filtered to ${songsData.length} songs client-side.`);
                }
            } catch (fallbackError) {
                console.error('[fetchAndDisplaySongs] Fallback fetch also failed:', fallbackError);
                songsData = []; // 确保有一个空数组而不是undefined
            }
        }

        // 4. 更新数据表格
        updateSongsTable(songsData);

    } catch (error) {
        console.error("[fetchAndDisplaySongs] General error in function: ", error);
        showToast("An error occurred while loading song data.", "error");
    } finally {
        showLoadingIndicator(false);
    }
}

/**
 * Get the currently applied filters from the UI elements.
 * @returns {object} An object containing the applied filters.
 */
function getAppliedFilters() {
    const filters = {
        status: $('#statusFilter').val() || '', // Get status from specific dropdown (0, 1, 2 or '')
        search: document.getElementById('searchInput')?.value.trim().toLowerCase() || '', // Keep global search
        userId: $('#userIdFilter').val().trim() || '', // Add User ID filter
        songName: $('#nameFilter').val().trim().toLowerCase() || '', // Add specific Song Name filter
        categoryId: document.getElementById('categoryFilter')?.value || '' // Keep category filter if exists
    };
    console.log("Retrieving filters from UI:", filters);
    return filters;
}

/**
 * Filter songs based on the applied filters.
 * @param {Array} songs - The array of all songs.
 * @param {object} filters - The filters object from getAppliedFilters.
 * @returns {Array} The filtered array of songs.
 */
function filterSongs(songs, filters) {
    // console.log("Filtering songs with filters:", filters);
    return songs.filter(song => {
        let match = true;
        
        // Filter by Status (using value from #statusFilter: '', '0', '1', '2')
        if (filters.status !== '') {
            match = match && (String(song.status) === filters.status);
        }

        // Filter by Uploader User ID (Exact match)
        if (filters.userId) {
            match = match && (String(song.userId) === filters.userId);
        }

        // Filter by Specific Song Name (Case-insensitive, contains)
        if (filters.songName) {
            match = match && (song.name && song.name.toLowerCase().includes(filters.songName));
        }

        // Filter by Global Search Term (name, introduction, singerNames)
        if (filters.search) {
            const searchTerm = filters.search;
            match = match && (
                (song.name && song.name.toLowerCase().includes(searchTerm)) ||
                (song.introduction && song.introduction.toLowerCase().includes(searchTerm)) ||
                // Optional: Search by singer names as well
                 (song.singerNames && song.singerNames.toLowerCase().includes(searchTerm))
            );
        }

        // Filter by Category ID
        if (filters.categoryId) {
             match = match && song.categoryId && (song.categoryId === parseInt(filters.categoryId, 10));
        }

        return match;
    });
}

/**
 * Update the DataTable with the provided songs data.
 * @param {Array} songs - The array of songs to display.
 */
function updateSongsTable(songs) {
    if (!songsTable) {
        // console.error("DataTable is not initialized!");
        return;
    }
    // console.log(`Updating DataTable with ${songs.length} songs.`);
        songsTable.clear();
            songsTable.rows.add(songs);
        songsTable.draw();
    // console.log("DataTable redraw complete.");
}

/**
 * Initialize the DataTable instance.
 */
function initializeDataTable() {
    if (!$.fn.DataTable) {
        showToast("Error initializing table: DataTable plugin not found.", "error");
        return;
    }

    songsTable = $('#songsTable').DataTable({
        processing: true,
        serverSide: false,
        searching: false,
        data: [],
        columns: [
            { data: 'id' },
            { data: 'name' },
            {
                data: 'pic',
                orderable: false, // Cover images usually aren't sortable
                render: function(data) {
                    const defaultPic = 'assets/images/default-song-cover.png';
                    return `<img src="${data || defaultPic}" alt="Cover" class="img-thumbnail" style="width: 50px; height: 50px; object-fit: cover;">`;
                }
            },
            {
                data: "singerNames", // Assuming the DTO provides this combined string
                render: function(data, type, row) {
                    const names = data || 'Unknown Artist';
                    // Tooltip for potentially long names
                    return `<span title="${escapeHTML(names)}">${escapeHTML(names.length > 30 ? names.substring(0, 30) + '...' : names)}</span>`;
                }
            },
            { 
                 data: 'album',
                render: function(data) {
                    const albumName = data || 'N/A';
                    return `<span title="${escapeHTML(albumName)}">${escapeHTML(albumName.length > 25 ? albumName.substring(0, 25) + '...' : albumName)}</span>`;
                }
            },
            { 
                 data: 'updateTime',
                render: function(data) {
                    if (!data) return 'N/A';
                    try {
                        // Format date and time nicely
                        const date = new Date(data);
                        return date.toLocaleString(); // Adjust formatting as needed
                    } catch (e) {
                        console.error("Error formatting date:", data, e);
                        return 'Invalid Date';
                    }
                }
            },
            { 
                data: 'status',
                render: function(data) {
                    let statusText, badgeClass, icon;
                    switch (parseInt(data)) {
                        case 0: statusText = 'Pending'; badgeClass = 'bg-warning text-dark'; icon = 'hourglass-half'; break;
                        case 1: statusText = 'Approved'; badgeClass = 'bg-success'; icon = 'check-circle'; break;
                        case 2: statusText = 'Rejected'; badgeClass = 'bg-danger'; icon = 'times-circle'; break;
                        default: statusText = 'Unknown'; badgeClass = 'bg-secondary'; icon = 'question-circle';
                    }
                    return `<span class="badge ${badgeClass}"><i class="fas fa-${icon} me-1"></i>${statusText}</span>`;
                },
                className: 'text-center'
            },
            { // Preview Column
                data: null,
                title: "Preview",
                orderable: false,
                render: function(data, type, row) {
                    // Encode the JSON string using Base64 to avoid HTML escaping issues
                    let encodedData = '';
                    try {
                        // Use try-catch for stringify as well, in case row data is problematic
                        const jsonString = JSON.stringify(row);
                        // Standard Base64 encoding
                        encodedData = btoa(unescape(encodeURIComponent(jsonString)));
                    } catch (e) {
                        console.error("Error encoding song data for button:", row, e);
                        // Optionally return a disabled button or an error indicator
                        return '<button class="btn btn-sm btn-secondary preview-btn" disabled title="Error encoding data"><i class="fas fa-exclamation-triangle"></i></button>';
                    }
                    return `<button class="btn btn-sm btn-info preview-btn" data-song='${encodedData}' title="Preview Song"><i class="fas fa-play"></i></button>`;
                },
                className: 'text-center'
            },
            { // Actions Column
                data: null,
                title: "Actions",
                orderable: false,
                render: function(data, type, row) {
                    const safeSongName = escapeHTML(row.name);
                    let actionButtons = '';

                    if (row.status === 0) { // Pending
                        actionButtons = `
                            <div class="btn-group" role="group">
                                <button class="btn btn-sm btn-success approve-btn" data-id="${row.id}" title="Approve Song">
                                    <i class="fas fa-check"></i> Approve
                                </button>
                                <button class="btn btn-sm btn-danger reject-btn" data-id="${row.id}" title="Reject Song">
                                    <i class="fas fa-times"></i> Reject
                                </button>
                            </div>
                        `;
                    } else { // Approved or Rejected
                        actionButtons = `
                            <div class="btn-group" role="group">
                                <button class="btn btn-sm btn-primary edit-btn" data-id="${row.id}" title="Edit Song"><i class="fas fa-edit"></i></button>
                                <button class="btn btn-sm btn-warning update-files-btn" data-id="${row.id}" title="Update Files"><i class="fas fa-file-upload"></i></button>
                                <button class="btn btn-sm btn-danger delete-btn" data-id="${row.id}" data-name="${safeSongName}" title="Delete Song"><i class="fas fa-trash"></i></button>
                            </div>
                        `;
                    }
                    return actionButtons;
                },
                className: 'text-center'
            }
        ],
        responsive: true,
        order: [[0, 'desc']],
        language: {
            search: "Search:",
            lengthMenu: "Show _MENU_ entries",
            zeroRecords: "No matching records found",
            info: "Showing _START_ to _END_ of _TOTAL_ entries",
            infoEmpty: "Showing 0 to 0 of 0 entries",
            infoFiltered: "(filtered from _MAX_ total entries)",
            paginate: {
                first: "First",
                last: "Last",
                next: "Next",
                previous: "Previous"
            },
            processing: "Processing..."
        },
        drawCallback: function(settings) {
            // Reinitialize tooltips after table draw
            const tooltipTriggerList = [].slice.call(document.querySelectorAll('#songsTable [title]'));
            tooltipTriggerList.forEach(function (tooltipTriggerEl) {
                const existingTooltip = bootstrap.Tooltip.getInstance(tooltipTriggerEl);
                if (existingTooltip) {
                    existingTooltip.dispose();
                }
                new bootstrap.Tooltip(tooltipTriggerEl);
            });
        }
    });
}

/**
 * Setup event listeners for buttons, filters, and modals.
 */
function setupEventListeners() {
    // console.log("Setting up event listeners...");

    // Filter buttons (All, Pending, Approved, Rejected)
    $('#allFilterBtn, #pendingFilterBtn, #approvedFilterBtn, #rejectedFilterBtn').on('click', function() {
        const newStatus = $(this).data('status');
        currentFilterStatus = newStatus;

        // Highlight active button
        $('.filter-btn').removeClass('active btn-primary').addClass('btn-outline-primary');
        $(this).removeClass('btn-outline-primary').addClass('active btn-primary');

        // console.log(`Filter status changed to: ${currentFilterStatus}`);
        fetchAndDisplaySongs(); // Refetch and filter data based on the new status
    });

    // Search Input & Button
    $('#searchButton').on('click', function() {
        // console.log("Search button clicked.");
        fetchAndDisplaySongs();
    });
    $('#searchInput').on('keypress', function(e) {
        if (e.key === 'Enter') {
            // console.log("Search input Enter key pressed.");
            fetchAndDisplaySongs();
        }
    });

    // Filter Dropdowns (Singer, Category)
    $('#singerFilter, #categoryFilter').on('change', function() {
        // console.log("Filter dropdown changed.");
        fetchAndDisplaySongs();
    });

    // 应用筛选按钮
    $('#applyFilters').on('click', function() {
        console.log("Apply filters button clicked.");
        fetchAndDisplaySongs();
    });

    // 清除筛选按钮
    $('#clearFilters').on('click', function() {
        console.log("Clear filters button clicked.");
        $('#userIdFilter').val('');
        $('#nameFilter').val('');
        $('#statusFilter').val('');
        $('#categoryFilter').val('');
        $('#searchInput').val('');
        // 重置后立即获取数据
        fetchAndDisplaySongs();
    });

    // --- Edit Modal Singer/Category Selection Event Listeners ---
    // Edit Song Modal - Category Selection Button
    $('#editSelectCategoryBtn').on('click', function() {
        console.log("Select Category button clicked (Edit Modal)");
        populateEditCategoryModalList(allCategoriesData);
        const categoryModal = new bootstrap.Modal(document.getElementById('editCategoryModal'));
        categoryModal.show();
    });

    // Edit Song Modal - Singer Selection Button
    $('#editSelectSingerBtn').on('click', function() {
        console.log("Select Singer button clicked (Edit Modal)");
        populateEditSingerModalList(allSingersData);
        const singerModal = new bootstrap.Modal(document.getElementById('editSingerModal'));
        singerModal.show();
    });

    // Edit Song Modal - Singer Search Input
    $('#editSingerSearchInput').on('input', function() {
        const searchTerm = $(this).val().toLowerCase();
        console.log("Searching singers (Edit Modal):", searchTerm);
        const filtered = allSingersData.filter(singer => singer.name.toLowerCase().includes(searchTerm));
        populateEditSingerModalList(filtered);
    });

    // Edit Song Modal - Category Search Input
    $('#editCategorySearchInput').on('input', function() {
        const searchTerm = $(this).val().toLowerCase();
        console.log("Searching categories (Edit Modal):", searchTerm);
        const filtered = allCategoriesData.filter(category => category.name.toLowerCase().includes(searchTerm));
        populateEditCategoryModalList(filtered);
    });

    // Edit Song Modal - Category Modal - Checkbox Change (Event Delegation)
    $('#editCategoryListContainer').on('change', '.edit-category-checkbox', function() {
        const categoryId = $(this).val();
        const categoryName = $(this).closest('.form-check').find('label').text().trim();
        console.log(`Category checkbox changed: ID=${categoryId}, Name=${categoryName}, Checked=${this.checked}`);
        if (this.checked) {
            selectedEditCategories.set(categoryId, categoryName);
        } else {
            selectedEditCategories.delete(categoryId);
        }
        console.log("Current selected categories (Edit Modal):", selectedEditCategories);
    });

    // Edit Song Modal - Singer Modal - Checkbox Change (Event Delegation)
    $('#editSingerListContainer').on('change', '.edit-singer-checkbox', function() {
        const singerId = $(this).val();
        const singerName = $(this).closest('.form-check').find('label').text().trim();
        console.log(`Singer checkbox changed: ID=${singerId}, Name=${singerName}, Checked=${this.checked}`);
        if (this.checked) {
            selectedEditSingers.set(singerId, singerName);
        } else {
            selectedEditSingers.delete(singerId);
        }
        console.log("Current selected singers (Edit Modal):", selectedEditSingers);
    });

    // Edit Song Modal - Category Modal - Confirm Button
    $('#confirmEditCategorySelection').on('click', function() {
        console.log("Confirming category selection (Edit Modal)");
        updateEditSelectedCategoriesDisplay();
        const categoryModal = bootstrap.Modal.getInstance(document.getElementById('editCategoryModal'));
        categoryModal?.hide();
    });

    // Edit Song Modal - Singer Modal - Confirm Button
    $('#confirmEditSingerSelection').on('click', function() {
        console.log("Confirming singer selection (Edit Modal)");
        updateEditSelectedSingersDisplay();
        const singerModal = bootstrap.Modal.getInstance(document.getElementById('editSingerModal'));
        singerModal?.hide();
    });
    // --- End Edit Modal Event Listeners ---

    // Reset Filters Button
    $('#resetFiltersBtn').on('click', function() {
        // console.log("Reset filters button clicked.");
        $('#searchInput').val('');
        $('#categoryFilter').val('');
        // Optionally reset status filter to 'All' or keep current status filter?
        // Let's keep the status filter active unless explicitly changed
        // currentFilterStatus = 'All'; // Uncomment to reset status filter too
        // $('.filter-btn').removeClass('active btn-primary').addClass('btn-outline-primary');
        // $('#allFilterBtn').addClass('active btn-primary'); // Highlight 'All'
        fetchAndDisplaySongs();
    });

    // Add Song Button -> Opens Modal
    $('#addSongBtn').on('click', function() {
        console.log("[Add Song Button] Clicked");
        // Reset the add form completely
        $('#addSongForm')[0].reset();
        // Reset selection Maps and display
        selectedAddSingers.clear();
        selectedAddCategories.clear();
        updateAddSelectedSingersDisplay();
        updateAddSelectedCategoriesDisplay();
        // Clear stored album name
        currentAlbumName = '';

        // Reset image preview
        resetAddImagePreview();
        // Ensure the correct modal title is set
        $('#addSongModalLabel').text('Add New Song');
        // Clear any previous validation states
        $('#addSongForm').removeClass('was-validated');
        // Clear progress bar if it exists in add modal
        $('#uploadProgress').addClass('d-none');
        $('#uploadProgress .progress-bar').css('width', '0%').attr('aria-valuenow', 0).text('0%');

        // Show the modal
        var addModal = new bootstrap.Modal(document.getElementById('addSongModal'));
        addModal.show();
    });

    // Add Song Modal - Music File Input Change (Metadata Extraction)
    $('#addMusicFile').on('change', async function(event) {
        const file = event.target.files[0];
        if (!file) return;

        console.log("[Music File Change] File selected:", file.name);
        const metadataLoadingIndicator = $('#metadataLoadingIndicator'); // Assume you add this indicator near the title
        metadataLoadingIndicator?.show(); // Show a spinner
        showToast('Processing audio file for metadata...', 'info');

        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await api.post(`${SONG_API_BASE_URL}/process-metadata`, formData);
            console.log("[Music File Change] Metadata response:", response);

            if (response.data && (response.data.code === '200' || response.data.code === 200) && response.data.data) {
                const metadata = response.data.data;
                console.log("[Music File Change] Extracted metadata:", metadata);
                showToast('Metadata extracted successfully!', 'success');

                // Auto-fill form fields
                if (metadata.title) {
                    $('#addTitle').val(metadata.title);
                    console.log(`[Music File Change] Auto-filled title: ${metadata.title}`);
                }
                if (metadata.singerId) {
                    // Pre-select the singer in the modal selection logic
                    const singerIdStr = String(metadata.singerId);
                    const singer = allSingersData.find(s => String(s.id) === singerIdStr);
                    if (singer) {
                        selectedAddSingers.set(singerIdStr, singer.name); // Add to map
                        updateAddSelectedSingersDisplay(); // Update main form display
                        console.log(`[Music File Change] Pre-selected singer: ${singer.name} (ID: ${singerIdStr})`);
                        // Note: Checkbox in the modal will be checked when modal is opened next
            } else {
                        console.warn(`[Music File Change] Singer ID ${singerIdStr} from metadata not found in loaded data.`);
                    }
                } else if (metadata.recognizedArtistName) {
                    // Optional: display the recognized name if no ID was found/created
                    showToast(`Artist recognized: ${metadata.recognizedArtistName}. Please confirm or select from list.`, 'info');
        }
                if (metadata.album) {
                    $('#addAlbum').val(metadata.album); // Populate the input field
                    console.log(`[Music File Change] Populated album field: ${metadata.album}`);
            } else {
                    $('#addAlbum').val(''); // Clear album field if not found in metadata
                }

        } else {
                console.error("[Music File Change] Failed to process metadata:", response.data?.msg);
                showToast(`Metadata extraction failed: ${response.data?.msg || 'Unknown error'}`, 'warning');
                // Clear fields if needed, or allow manual entry
                $('#addAlbum').val(''); // Clear album field on failure
            }
        } catch (error) {
            console.error("[Music File Change] Network error processing metadata:", error);
            showToast('Error contacting server for metadata extraction.', 'error');
            // currentAlbumName = ''; // Clear album on network error <-- No longer needed
            $('#addAlbum').val(''); // Clear album field on error
        } finally {
            metadataLoadingIndicator?.hide(); // Hide spinner
        }
    });

    // Add Song Modal - Category Selection Button
    $('#addSelectCategoryBtn').on('click', function() {
        console.log("Select Category button clicked (Add Modal)");
        // Populate the modal list just before showing, ensure latest data
        populateAddCategoryModalList(allCategoriesData);
        const categoryModal = new bootstrap.Modal(document.getElementById('addCategoryModal')); // Use existing modal ID
        categoryModal.show();
    });

    // Add Song Modal - Singer Selection Button
    $('#addSelectSingerBtn').on('click', function() {
        console.log("Select Singer button clicked (Add Modal)");
        // Populate the modal list just before showing
        populateAddSingerModalList(allSingersData);
        const singerModal = new bootstrap.Modal(document.getElementById('addSingerModal')); // Use existing modal ID
        singerModal.show();
    });

    // Add Song Modal - Category Modal - Search Input
    $('#addSingerSearchInput').on('input', function() {
        const searchTerm = $(this).val().toLowerCase();
        console.log("Searching singers (Add Modal):", searchTerm);
        const filtered = allSingersData.filter(singer => singer.name.toLowerCase().includes(searchTerm));
        populateAddSingerModalList(filtered);
    });

     // Add Song Modal - Category Modal - Checkbox Change (Event Delegation)
     $('#addCategoryListContainer').on('change', '.add-category-checkbox', function() {
        const categoryId = $(this).val();
        const categoryName = $(this).closest('.form-check').find('label').text().trim();
        console.log(`Category checkbox changed: ID=${categoryId}, Name=${categoryName}, Checked=${this.checked}`);
        if (this.checked) {
            selectedAddCategories.set(categoryId, categoryName);
            } else {
            selectedAddCategories.delete(categoryId);
        }
        console.log("Current selected categories (Add Modal):", selectedAddCategories);
    });

    // Add Song Modal - Singer Modal - Checkbox Change (Event Delegation)
    $('#addSingerListContainer').on('change', '.add-singer-checkbox', function() {
        const singerId = $(this).val();
        const singerName = $(this).closest('.form-check').find('label').text().trim();
        console.log(`Singer checkbox changed: ID=${singerId}, Name=${singerName}, Checked=${this.checked}`);
        if (this.checked) {
            selectedAddSingers.set(singerId, singerName);
            } else {
            selectedAddSingers.delete(singerId);
        }
         console.log("Current selected singers (Add Modal):", selectedAddSingers);
    });


    // Add Song Modal - Category Modal - Confirm Button
    $('#confirmAddCategorySelection').on('click', function() {
        console.log("Confirming category selection (Add Modal)");
        updateAddSelectedCategoriesDisplay();
        const categoryModal = bootstrap.Modal.getInstance(document.getElementById('addCategoryModal'));
        categoryModal?.hide();
    });

    // Add Song Modal - Singer Modal - Confirm Button
    $('#confirmAddSingerSelection').on('click', function() {
        console.log("Confirming singer selection (Add Modal)");
            updateAddSelectedSingersDisplay();
        const singerModal = bootstrap.Modal.getInstance(document.getElementById('addSingerModal'));
        singerModal?.hide();
    });

    // --- DataTable Button Event Delegation ---
    $('#songsTable tbody').on('click', 'button', function() {
        const action = $(this).attr('class'); // Get all classes to check substrings
        const songDataString = $(this).data('song');
        let songData = null;
        let songId = $(this).data('id'); // Fallback if song data isn't attached directly

        try {
            if (songDataString) {
                // Decode Base64 string
                const decodedJsonString = decodeURIComponent(escape(atob(songDataString)));
                // Parse the JSON
                songData = JSON.parse(decodedJsonString);
                songId = songData.id; // Get ID from the parsed data
                // console.log(`Action '${action}' triggered for song ID: ${songId}`, songData);
            } else if (songId) {
                 // console.log(`Action '${action}' triggered for song ID: ${songId} (data might be missing)`);
                 // Attempt to find song data from the global list if needed, though risky
                 // songData = allSongs.find(s => s.id === songId);
            } else {
                // console.warn("Action triggered but no song ID or data found on button:", this);
                showToast("Could not identify the song for this action.", "error");
                return;
            }
        } catch (e) {
            console.error("Error processing song data from button. Raw Base64 data:", songDataString, "Error:", e); // Log Base64 data on error
            showToast("Error processing song data for action.", "error");
            return;
        }

        if (action.includes('preview-btn')) {
            // console.log("Preview button clicked");
            if (songData) {
                previewSong(songData);
            } else {
                showToast("Cannot preview: Song data missing.", "error");
            }
        } else if (action.includes('edit-btn')) {
             // console.log("Edit button clicked");
            if (songId) {
                editSong(songId); // Function to open edit modal and load data
            }
        } else if (action.includes('files-btn')) {
            // console.log("Update Files button clicked");
            if (songId) {
                showUpdateFilesModal(songId); // Function to open the file update modal
            }
        } else if (action.includes('delete-btn')) {
             // console.log("Delete button clicked");
            const songName = $(this).data('name') || (songData ? songData.name : `ID ${songId}`);
            if (songId) {
                showDeleteModal(songId, songName);
            }
        } else if (action.includes('approve-btn')) {
            // console.log("Approve button clicked");
             if (songId) {
                handleAuditSong(songId, 1); // 1 for Approve
            }
        } else if (action.includes('reject-btn')) {
            // console.log("Reject button clicked");
            if (songId) {
                handleAuditSong(songId, 2); // 2 for Reject
            }
        } else {
            // console.log("Unhandled button action:", action);
        }
    });
    // --- End DataTable Button Event Delegation ---

    // Update Files Form Submission (handles individual file updates)
    // We don't submit the whole form, but trigger uploads via buttons
    $('#updateSongFileBtn')?.on('click', () => handleUpdateFile('song')); // Added null check
    $('#updatePicFileBtn')?.on('click', () => handleUpdateFile('pic')); // Added null check

    // Submit Edit Song Button
    $('#submitEditSong').on('click', function() {
        console.log("Submit Edit Song button clicked");
        handleEditSong();
    });

    // Delete Modal - Confirm Button
    $('#confirmDelete').on('click', function() {
        // console.log("Confirm Delete button clicked.");
        handleDeleteSong();
    });

    // Initialize image preview for Add Song modal
    initAddImageUploadPreview();

    // console.log("Event listeners setup complete.");
}

/**
 * Handle the Add Song form submission.
 */
async function handleAddSong() {
    const form = document.getElementById('addSongForm');
    const titleInput = form.querySelector('input[name="title"]');
    // Get IDs from hidden input
    const singerIdsInput = document.getElementById('addSelectedSingerIds');
    const categoryIdsInput = document.getElementById('addSelectedCategoryIds');
    const coverFile = form.querySelector('input[name="coverFile"]').files[0];
    const musicFile = form.querySelector('input[name="musicFile"]').files[0];

    // --- Form Validation --- (Simplified Example)
    let isValid = true;
    if (!titleInput.value.trim()) {
        showToast('Please enter a song title', 'warning');
        isValid = false;
    }
    // Validate hidden inputs
    if (!singerIdsInput.value) {
        showToast('Please select at least one artist', 'warning');
        isValid = false;
    }
    if (!categoryIdsInput.value) {
        showToast('Please select at least one category', 'warning');
        isValid = false;
    }
    if (!coverFile) {
        showToast('Please upload a cover image', 'warning');
        isValid = false;
    }
    if (!musicFile) {
        showToast('Please upload a music file', 'warning');
        isValid = false;
    }
    // Add more specific file type/size validation if needed here or rely on backend

    if (!isValid) return;
    // --- End Validation ---
    
    // Prepare form data
    const formData = new FormData();
    
    // Get data directly from form elements
    formData.append('userId', '0'); // Admin default ID
    formData.append('name', titleInput.value.trim());
    formData.append('introduction', form.querySelector('textarea[name="introduction"]')?.value.trim() || '');
    formData.append('lyric', form.querySelector('textarea[name="lyric"]')?.value.trim() || ''); // Make sure 'lyric' textarea exists or handle null
    
    // Add Singer IDs (from hidden input)
    if (singerIdsInput.value) {
        formData.append('singerIds', singerIdsInput.value);
    }
    
    // Add Category IDs (from hidden input)
    if (categoryIdsInput.value) {
        formData.append('categoryIds', categoryIdsInput.value);
    }
    
    // Add Album Name (from input field)
    const albumValue = form.querySelector('#addAlbum')?.value.trim();
    if (albumValue) {
        formData.append('album', albumValue);
    }
    
    // Add files
    formData.append('file', musicFile); // Music file
    formData.append('imageFile', coverFile); // Cover image
    
    console.log("[handleAddSong] Submitting FormData:", Object.fromEntries(formData.entries())); // Log form data (excluding files)
    
    try {
        // Show loading state
        showLoadingIndicator(true);
        
        // 设置上传进度回调
        const config = {
            onUploadProgress: function(progressEvent) {
                const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                updateUploadProgress(percentCompleted);
            }
        };
        
        // 发送请求
        const response = await api.post(`${SONG_API_BASE_URL}/add`, formData, config);
        
        if (response.data && (response.data.code === 200 || response.data.code === '200')) {
            // 成功添加歌曲
            showToast('Song added successfully', 'success');
            
            // 关闭模态框
            const modal = bootstrap.Modal.getInstance(document.getElementById('addSongModal'));
            if (modal) modal.hide();
            
            // 重新加载歌曲列表
            fetchAndDisplaySongs();
        } else {
            throw new Error(response.data?.msg || 'Failed to add song');
        }
    } catch (error) {
        console.error('Error adding song:', error);
        showToast(error.message || 'Failed to add song', 'error');
    } finally {
        // 隐藏加载状态
        showLoadingIndicator(false);
    }
}

/**
 * Load song data for editing and populate the modal.
 */
async function loadSongForEdit(songId) {
    showToast('Loading song details...', 'info');
    try {
        const response = await api.get(`${SONG_API_BASE_URL}/detail?songId=${songId}`);

        if (response.data && (response.data.code === '200' || response.data.code === 200) && response.data.data) {
            const song = response.data.data;
            console.log('[loadSongForEdit] Song data loaded:', song);
            
            // --- Populate Basic Info ---
            document.getElementById('editSongId').value = song.id;
            document.getElementById('editName').value = song.name || '';
            document.getElementById('editIntroduction').value = song.introduction || '';
            document.getElementById('editLyric').value = song.lyric || '';
            document.getElementById('editAlbum').value = song.album || '';
            
            // Enable debug button for testing
            document.getElementById('debugEditForm').classList.remove('d-none');
            
            // Verify the form values were correctly populated
            console.log('[loadSongForEdit] Populated form fields:', {
                editSongId: document.getElementById('editSongId').value,
                editName: document.getElementById('editName').value,
                editIntroduction: document.getElementById('editIntroduction').value,
                editLyric: document.getElementById('editLyric').value,
                editAlbum: document.getElementById('editAlbum').value
            });
            
            // 设置封面图片
            if (song.pic) {
                $('#editCoverPreview').attr('src', song.pic);
            }
            
            // 设置音乐文件信息
            if (song.url) {
                const fileName = song.url.split('/').pop();
                $('#editCurrentMusicFile').text(fileName || song.url);
            }
            
            // --- 处理歌手信息 ---
            // 确保获取了所有歌手数据
            if (allSingersData.length === 0) {
                await loadSingers();
            }
            
            // 清空并重新填充选中的歌手
            selectedEditSingers.clear();
            
            // 如果歌曲有关联的歌手ID列表
            if (song.singerIds && Array.isArray(song.singerIds) && song.singerIds.length > 0) {
                console.log('[loadSongForEdit] Song has associated singers:', song.singerIds);
                
                // 遍历歌手ID，找到匹配的歌手名称并添加到selectedEditSingers映射
                song.singerIds.forEach(singerId => {
                    const singerIdStr = String(singerId);
                    const singer = allSingersData.find(s => String(s.id) === singerIdStr);
                    if (singer) {
                        selectedEditSingers.set(singerIdStr, singer.name);
                    }
                });
            } else if (song.singerNames) {
                // 尝试从分隔的歌手名称字符串获取信息（备用方法）
                console.log('[loadSongForEdit] Using singer names instead:', song.singerNames);
                const singerNames = song.singerNames.split(',');
                singerNames.forEach(name => {
                    const trimmedName = name.trim();
                    if (trimmedName) {
                        const singer = allSingersData.find(s => s.name === trimmedName);
                        if (singer) {
                            selectedEditSingers.set(String(singer.id), singer.name);
                        }
                    }
                });
            }

            // 更新歌手显示和隐藏输入字段
            updateEditSelectedSingersDisplay();
            
            // --- 处理分类信息 ---
            // 确保获取了所有分类数据
            if (allCategoriesData.length === 0) {
                await loadCategories();
            }
            
            // 清空并重新填充选中的分类
            selectedEditCategories.clear();
            
            // 如果歌曲有关联的分类ID列表
            if (song.categoryIds && Array.isArray(song.categoryIds) && song.categoryIds.length > 0) {
                console.log('[loadSongForEdit] Song has associated categories:', song.categoryIds);
                
                // 遍历分类ID，找到匹配的分类名称并添加到selectedEditCategories映射
                song.categoryIds.forEach(categoryId => {
                    const categoryIdStr = String(categoryId);
                    const category = allCategoriesData.find(c => String(c.id) === categoryIdStr);
                    if (category) {
                        selectedEditCategories.set(categoryIdStr, category.name);
                    }
                });
            } else if (song.categoryNames) {
                // 尝试从分隔的分类名称字符串获取信息（备用方法）
                console.log('[loadSongForEdit] Using category names instead:', song.categoryNames);
                const categoryNames = song.categoryNames.split(',');
                categoryNames.forEach(name => {
                    const trimmedName = name.trim();
                    if (trimmedName) {
                        const category = allCategoriesData.find(c => c.name === trimmedName);
                        if (category) {
                            selectedEditCategories.set(String(category.id), category.name);
                        }
                    }
                });
            }
            
            // 更新分类显示和隐藏输入字段
            updateEditSelectedCategoriesDisplay();

            // 清除以前的验证
            $('#editSongForm').removeClass('was-validated');

            // 显示模态框
            const editModal = new bootstrap.Modal(document.getElementById('editSongModal'));
            editModal.show();
            showToast('Song details loaded.', 'success');
        } else {
            showToast(`Failed to load song details: ${response.data?.msg || 'Not found'}`, 'error');
        }
    } catch (error) {
        console.error('[loadSongForEdit] Error:', error);
        showToast('Error fetching song details. Please try again.', 'error');
    }
}

/**
 * Handle the Edit Song form submission (updates text details only).
 */
async function handleEditSong() {
    const form = document.getElementById('editSongForm');
    const submitButton = document.getElementById('submitEditSong');
    const songId = $('#editSongId').val();

    if (!songId) {
        showToast("Error: Song ID is missing. Cannot save.", "error");
        return;
    }

    console.log("Validating edit form (Metadata only)...", form);
    
    // --- Direct Metadata Validation --- 
    const nameVal = $('#editName').val()?.trim();
    const singerIds = Array.from(selectedEditSingers.keys());
    const categoryIds = Array.from(selectedEditCategories.keys());

    if (!nameVal) {
        showToast('Please enter a song title', 'warning');
        return;
    }
    if (singerIds.length === 0) {
        showToast('Please select at least one artist', 'warning');
        return;
    }
    if (categoryIds.length === 0) {
        showToast('Please select at least one category', 'warning');
        return;
    }
    console.log("Edit form metadata validation passed.");
    // --- End Metadata Validation --- 

    // Remove the old validation call:
    // if (!validateSongForm(form)) { 
    //     console.log("Form validation failed");
    //     return;
    // }

    submitButton.disabled = true;
    submitButton.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Saving...';

    // Prepare URLSearchParams for x-www-form-urlencoded
    const formData = new URLSearchParams();
    formData.append('id', songId);
    // Only append fields if they have a value or if backend handles nulls correctly
    // Assuming backend handles partial updates based on presence
    if (nameVal) formData.append('name', nameVal);
    
    const introVal = $('#editIntroduction').val()?.trim();
    if (introVal !== undefined && introVal !== null) formData.append('introduction', introVal); // Allow empty string
    
    const lyricVal = $('#editLyric').val()?.trim();
    if (lyricVal !== undefined && lyricVal !== null) formData.append('lyric', lyricVal); // Allow empty string
    
    const albumVal = $('#editAlbum').val()?.trim();
    if (albumVal !== undefined && albumVal !== null) formData.append('album', albumVal); // Allow empty string
    
    // Get selected singer IDs
    if (singerIds.length > 0) {
        formData.append('singerIds', singerIds.join(','));
    } else {
        // Explicitly send empty if required by backend to clear associations
        // formData.append('singerIds', ''); 
    }
    
    // Get selected category IDs
    if (categoryIds.length > 0) {
        formData.append('categoryIds', categoryIds.join(','));
    } else {
         // Explicitly send empty if required by backend to clear associations
        // formData.append('categoryIds', '');
    }
    
    // Backend might need user ID for auditing (use admin default)
    formData.append('userId', currentUserId || '0');

    console.log("Submitting Edit Data (URL Encoded):", formData.toString());

    try {
        // 发送表单数据作为URL编码格式
        const response = await api.post(`${SONG_API_BASE_URL}/update`, formData.toString(), {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });

        if (response.data && (response.data.code === '200' || response.data.code === 200)) {
            showToast('Song details updated successfully!', 'success');
            $('#editSongModal').modal('hide');
            fetchAndDisplaySongs();
        } else {
            const errorMsg = response.data?.msg || response.data?.message || 'Unknown server error';
            showToast(`Failed to update song: ${errorMsg}`, 'error');
        }
    } catch (error) {
        const errorMsg = error.response?.data?.msg || error.response?.data?.message || error.message || 'Network error';
        showToast(`Error updating song: ${errorMsg}`, 'error');
    } finally {
        submitButton.disabled = false;
        submitButton.innerHTML = 'Save Changes';
    }
}


/**
 * Handle updating a specific file (Song, Picture) for a song.
 * @param {string} fileType - 'song' or 'pic'.
 */
async function handleUpdateFile(fileType) {
    const songId = $('#updateSongId').val();
    let fileInputId, buttonId, endpointUrl, progressBarId, progressTextId, progressContainerId;

    switch (fileType) {
        case 'song':
            fileInputId = '#updateSongFile';
            buttonId = '#updateSongFileBtn';
            endpointUrl = `${SONG_API_BASE_URL}/updateSongUrl`; // 使用后端实际的URL
            progressBarId = '#updateSongProgress';
            progressTextId = '#updateSongProgressText';
            progressContainerId = '#updateSongProgressContainer';
            break;
        case 'pic':
            fileInputId = '#updatePicFile';
            buttonId = '#updatePicFileBtn';
            endpointUrl = `${SONG_API_BASE_URL}/updateSongPic`; // 使用后端实际的URL
            progressBarId = '#updatePicProgress';
            progressTextId = '#updatePicProgressText';
            progressContainerId = '#updatePicProgressContainer';
            break;
        default:
            showToast("Invalid file type specified for update.", "error");
            return;
    }

    const fileInput = $(fileInputId)[0];
    const submitButton = $(buttonId);
    const progressBar = $(progressBarId);
    const progressText = $(progressTextId);
    const progressContainer = $(progressContainerId);

    if (!songId) {
        showToast(`Error: Song ID missing. Cannot update ${fileType}.`, "error");
        return;
    }

    if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
        showToast(`Please select a file to update the ${fileType}.`, 'warning');
        return;
    }

    const file = fileInput.files[0];

    submitButton.prop('disabled', true).html('<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Uploading...');
    progressContainer.show();
    progressBar.css('width', '0%').attr('aria-valuenow', 0).removeClass('bg-danger bg-success').addClass('bg-primary progress-bar-striped progress-bar-animated');
    progressText.text('Preparing...');

    const formData = new FormData();
    formData.append('file', file); // 后端期望的文件参数名
    formData.append('id', songId); // 后端期望的ID参数名

    try {
        const response = await api.post(endpointUrl, formData, {
            headers: {
                'Content-Type': 'multipart/form-data' // 确保使用正确的Content-Type
            },
            onUploadProgress: function(progressEvent) {
                const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                progressBar.css('width', percentCompleted + '%').attr('aria-valuenow', percentCompleted);
                progressText.text(`${percentCompleted}% Uploaded`);
            }
        });

        if (response.data && (response.data.code === '200' || response.data.code === 200)) {
            showToast(`${capitalizeFirstLetter(fileType)} updated successfully!`, 'success');
            progressBar.removeClass('bg-primary progress-bar-animated').addClass('bg-success');
            progressText.text('Upload Complete!');
            fetchAndDisplaySongs();
        } else {
            const errorMsg = response.data?.msg || response.data?.message || `Failed to update ${fileType}`;
            showToast(`Failed to update ${fileType}: ${errorMsg}`, 'error');
            progressBar.removeClass('bg-primary progress-bar-animated').addClass('bg-danger');
            progressText.text('Upload Failed!');
        }
    } catch (error) {
        const errorMsg = error.response?.data?.msg || error.response?.data?.message || error.message || 'Network error';
        showToast(`Error updating ${fileType}: ${errorMsg}`, 'error');
        progressBar.removeClass('bg-primary progress-bar-animated').addClass('bg-danger');
        progressText.text('Upload Error!');
    } finally {
        submitButton.prop('disabled', false).html(`Update ${capitalizeFirstLetter(fileType)}`);
        fileInput.value = ''; // 清空文件输入
        // 延迟隐藏进度条
        setTimeout(() => { progressContainer.hide(); }, 3000);
    }
}

// Helper to capitalize first letter
function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}
/**
 * Preview song using data passed from the button
 */
function previewSong(songData) {
    // Assume songData is now a SongDTO
    // Populate the preview modal
    $('#previewTitle').text(songData.name || 'Song Preview');
    // Display singer names
    $('#previewSinger').text(`Artist(s): ${songData.singerNames || 'N/A'}`);
    $('#previewIntro').text(songData.introduction || 'No introduction available.');

    // Set cover image (use a default if pic is missing)
    const coverUrl = songData.pic ? songData.pic : 'assets/images/default-song-cover.png'; // Ensure this default exists
    $('#previewCover').attr('src', coverUrl).show();

    // Set audio source directly
    const audioPlayer = $('#previewAudio');
    if (songData.url) {
        audioPlayer.attr('src', songData.url);
        audioPlayer.show();
    } else {
        audioPlayer.hide();
        audioPlayer.attr('src', ''); // Clear src if no URL
    }

    // REMOVED: Set MV source and hide MV container
    const videoPlayer = $('#previewVideo');
    const mvContainer = $('#previewMVContainer');
    if (mvContainer) mvContainer.hide();
    if (videoPlayer) videoPlayer.attr('src', '');

    // Set lyrics
    const lyricsContainer = $('#previewLyricsContainer');
    if (songData.lyric) {
        $('#previewLyrics').text(songData.lyric);
        lyricsContainer.show();
    } else {
        lyricsContainer.hide();
    }

    // Show the modal
    const previewModal = new bootstrap.Modal(document.getElementById('previewModal'));
    previewModal.show();

    // Stop audio when modal is closed to prevent background playback
    $('#previewModal').off('hidden.bs.modal').on('hidden.bs.modal', function () {
        audioPlayer[0]?.pause();
        // REMOVED: videoPlayer[0]?.pause();
        // Optional: Reset player source or time
        // audioPlayer.attr('src', '');
    });

    // Call the global player function
    playSongAudioPlayer(songData.url, songData.name, displaySingers, songData.pic);
}

/**
 * Handle song deletion
 */
function handleDeleteSong() {
    // Disable delete button
    $('#confirmDelete').prop('disabled', true);
    
    api.get(`${SONG_API_BASE_URL}/delete?id=${currentSongId}`)
        .then(response => {
            if (response.status === 200 && response.data && (response.data.code === '200' || response.data.code === 200)) {
                showToast('Song deleted successfully!', 'success');
                $('#deleteModal').modal('hide');
                fetchAndDisplaySongs();
            } else {
                showToast('Failed to delete song: ' + (response.data.msg || 'Unknown error'), 'error');
            }
        })
        .catch(error => {
            console.error('Error deleting song:', error);
            showToast('Error deleting song: ' + (error.message || 'Unknown error'), 'error');
        })
        .finally(() => {
            $('#confirmDelete').prop('disabled', false);
        });
}

/**
 * Handle song audit (Approve/Reject)
 */
async function handleAuditSong(songId, status) {
    const action = status === 1 ? 'Approve' : 'Reject';
    // 确认审核操作
    const confirmMessage = `Are you sure you want to ${action.toLowerCase()} this song (ID: ${songId})?`;
    
    if (!confirm(confirmMessage)) {
        return;
    }
    
    // 构造表单数据
    const formData = new URLSearchParams();
    formData.append('songId', songId);
    formData.append('status', status);

    try {
        // 发送POST请求到审核接口
        const response = await api.post(`${SONG_API_BASE_URL}/audit`, formData.toString(), {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });

        // 检查响应状态
        if (response.data && (response.data.code === '200' || response.data.code === 200)) {
            showToast(`Song ${action.toLowerCase()}d successfully!`, 'success');
            fetchAndDisplaySongs();
        } else {
            const errorMsg = response.data?.msg || response.data?.message || `Server responded with code: ${response.data?.code}`;
            showToast(`Failed to ${action.toLowerCase()} song. ${errorMsg}`, 'error');
        }
    } catch (error) {
        console.error(`Error ${action.toLowerCase()}ing song:`, error);
        const errorMsg = error.response?.data?.msg || error.response?.data?.message || error.message || 'Unknown error';
        showToast(`Error ${action.toLowerCase()}ing song: ${errorMsg}`, 'error');
    }
}

/**
 * 显示通知消息
 * @param {string} message - 消息内容
 * @param {string} type - 消息类型 (success, error, warning, info)
 */
function showToast(message, type = 'info') {
    const toastContainer = document.getElementById('toastContainer');
    if (!toastContainer) return;
    
    const toastId = 'toast-' + Date.now();
    
    const toastHTML = `
        <div id="${toastId}" class="toast" role="alert" aria-live="assertive" aria-atomic="true">
            <div class="toast-header ${getToastHeaderClass(type)}">
                <strong class="me-auto">${getToastTitle(type)}</strong>
                <button type="button" class="btn-close" data-bs-dismiss="toast" aria-label="Close"></button>
            </div>
            <div class="toast-body">
                ${message}
            </div>
        </div>
    `;
    
    toastContainer.insertAdjacentHTML('beforeend', toastHTML);
    
    const toastElement = document.getElementById(toastId);
    const toast = new bootstrap.Toast(toastElement, { autohide: true, delay: 5000 });
    toast.show();
    
    // 自动移除
    toastElement.addEventListener('hidden.bs.toast', function() {
        toastElement.remove();
    });
}

/**
 * 获取Toast标题
 * @param {string} type - 通知类型
 * @returns {string} - 标题文本
 */
function getToastTitle(type) {
    switch (type) {
        case 'success': return 'Success';
        case 'error': return 'Error';
        case 'warning': return 'Warning';
        default: return 'Information';
    }
}

/**
 * 获取Toast头部样式类
 * @param {string} type - 通知类型
 * @returns {string} - CSS类名
 */
function getToastHeaderClass(type) {
    switch (type) {
        case 'success': return 'bg-success text-white';
        case 'error': return 'bg-danger text-white';
        case 'warning': return 'bg-warning text-dark';
        default: return 'bg-info text-white';
    }
}

/**
 * 验证歌曲表单 - 通用版本，可以处理添加或编辑
 * @param {HTMLFormElement} form - 表单元素
 * @returns {boolean} - 验证结果
 */
function validateSongForm(form) {
    // 在传入的form元素内部查找 name="name" (编辑) 或 name="title" (添加) 的输入框
    const nameField = form.querySelector('input[name="name"], input[name="title"]'); 

    const name = nameField?.value.trim() || '';

    // 更新调试日志
    console.log(`[validateSongForm] Form ID: ${form.id}, Field Name: ${nameField?.name}, Value: '${nameField?.value}', Trimmed Value: '${name}'`);

    if (!name) {
        showToast('Please enter a song title', 'warning');
        console.log('Song title validation failed. Field value:', name);
        console.log('Field element found:', nameField); // 记录找到的元素
        return false;
    }

    // --- 保留剩余的验证逻辑 ---
    const isEditForm = form.id === 'editSongForm';

    // Get singer and category IDs using querySelector within the form
    const singerIdsInput = form.querySelector('#editSelectedSingerIds, #addSelectedSingerIds');
    const categoryIdsInput = form.querySelector('#editSelectedCategoryIds, #addSelectedCategoryIds');

    // Validate hidden inputs for singers
    if (!singerIdsInput || !singerIdsInput.value.trim()) {
        showToast('Please select at least one artist', 'warning');
        return false;
    }

    // Validate hidden inputs for categories
    if (!categoryIdsInput || !categoryIdsInput.value.trim()) {
        showToast('Please select at least one category', 'warning');
        return false;
    }

    // For Add form only: validate file uploads
    if (!isEditForm) {
        const coverFileField = form.querySelector('input[name="coverFile"]');
        const musicFileField = form.querySelector('input[name="musicFile"]');
        const coverFile = coverFileField?.files[0];
        const musicFile = musicFileField?.files[0];
    
    if (!coverFile) {
            showToast('Please upload a cover image', 'warning');
        return false;
    }
    
    if (!musicFile) {
            showToast('Please upload a music file', 'warning');
        return false;
    }
    
        // Check file types
    const validImageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!validImageTypes.includes(coverFile.type)) {
        showToast('Cover must be a valid image file (JPEG, PNG, GIF, WEBP)', 'error');
        return false;
    }
    
    const validMusicTypes = ['audio/mpeg', 'audio/wav', 'audio/mp3', 'audio/ogg', 'audio/flac'];
    if (!validMusicTypes.includes(musicFile.type) && !musicFile.name.endsWith('.mp3')) {
        showToast('Music file must be in a valid audio format (MP3, WAV, OGG, FLAC)', 'error');
        return false;
    }
    
        // Check file sizes (cover < 5MB, music < 50MB)
    if (coverFile.size > 5 * 1024 * 1024) {
        showToast('Cover image must be less than 5MB', 'error');
        return false;
    }
    
    if (musicFile.size > 50 * 1024 * 1024) {
        showToast('Music file must be less than 50MB', 'error');
        return false;
    }
    }
    
    return true;
}

// Edit song - Open edit modal and load data
function editSong(songId) {
    currentSongId = songId;
    console.log(`[editSong] Editing song with ID: ${songId}`);
    // Clear form before loading new data
    $('#editSongForm')[0].reset();
    selectedEditSingers.clear(); // Clear selected singers map
    selectedEditCategories.clear(); // Clear selected categories map
    updateEditSelectedSingersDisplay(); // Update display
    updateEditSelectedCategoriesDisplay(); // Update display
    resetEditImagePreview(); // Reset image preview
    $('#editCurrentMusicFile').text('N/A'); // Reset current file text
    
    // Load song data into the redesigned modal
    loadSongForEdit(songId);
}

// Show update files modal
function showUpdateFilesModal(songId) {
    currentSongId = songId;
    // Set hidden field value
    $('#updateSongId').val(songId);
    // Reset file input fields
    $('#updateSongFile').val('');
    $('#updatePicFile').val('');
    // Hide progress bar
    $('#updateProgress').hide(); // Assuming a general progress bar, adjust if needed
    // Hide individual progress bars
    $('#updateSongProgressContainer').hide();
    $('#updatePicProgressContainer').hide();
    // Show modal
    $('#updateFilesModal').modal('show');
}

// Show delete confirmation modal
function showDeleteModal(songId, songName) {
    currentSongId = songId;
    $('#deleteSongName').text(songName);
    $('#deleteModal').modal('show');
}

/**
 * Load all singers from API using async/await
 * @returns {Promise<boolean>} True if successful, false otherwise.
 */
async function loadSingers() {
    try {
        // 使用 allSinger 路径，相对于 SINGER_API_BASE_URL (/api/singer)
        const response = await api.get(`${SINGER_API_BASE_URL}/allSinger`);
        if (response.data && (response.data.code === '200' || response.data.code === 200) && Array.isArray(response.data.data)) {
            allSingersData = response.data.data || [];
            populateSingerDropdowns();
            return true;
        } else {
            showToast("Error loading artists list (server response).", "error");
            allSingersData = [];
            populateSingerDropdowns();
            return false;
        }
    } catch (error) {
        showToast("Could not fetch artists list (network error).", "error");
        allSingersData = [];
        populateSingerDropdowns();
        return false;
    }
}

/**
 * Helper function to populate singer dropdowns (Edit modal, Filter)
 * NOW ALSO POPULATES Add modal Select2
 */
function populateSingerDropdowns() {
    console.log("[populateSingerDropdowns] Populating Edit/Add Selectors...");

    // Populate Edit modal dropdown (KEEP THIS)
    const editSelect = document.getElementById('editSingers');
    if (editSelect) {
        editSelect.innerHTML = ''; // Clear existing
        if (allSingersData.length > 0) {
            allSingersData.forEach(singer => {
                const option = document.createElement('option');
                option.value = singer.id;
                option.textContent = escapeHTML(singer.name);
                editSelect.appendChild(option);
                    });
                } else {
            editSelect.innerHTML = '<option value="" disabled>No artists available</option>';
                }
            } else {
        // console.warn("Edit singers dropdown (#editSingers) not found.");
    }

    // console.log("Finished populating singer dropdowns.");
}

/**
 * Load categories, store globally, and populate filter dropdown using async/await.
 * NOW ALSO POPULATES Add modal Select2
 * @returns {Promise<boolean>} True if successful, false otherwise.
 */
async function loadCategories() {
    console.log("[loadCategories] Loading and populating...");
    const filterSelect = document.getElementById('categoryFilter');
    try {
        // 使用 selectAll 路径，相对于 CATEGORY_API_BASE_URL (/api/category)
        const response = await api.get(`${CATEGORY_API_BASE_URL}/selectAll`);
        if (response.data.code === '200' || response.data.code === 200) {
            allCategoriesData = response.data.data || [];
            if (filterSelect) {
                filterSelect.innerHTML = '<option value="">All Categories</option>';
                if (allCategoriesData.length > 0) {
                    allCategoriesData.forEach(category => {
                        const option = document.createElement('option');
                        option.value = category.id;
                        option.textContent = escapeHTML(category.name);
                        filterSelect.appendChild(option);
                    });
                } else {
                    filterSelect.innerHTML = '<option value="" disabled>No categories found</option>';
                }
            } else {
                console.log("Category filter dropdown not found, skipping population.");
            }
            return true;
        } else {
            allCategoriesData = [];
            if (filterSelect) filterSelect.innerHTML = '<option value="" disabled>Error loading</option>';
            showToast('Failed to load categories (server response). ', 'error');
            populateSelect2Dropdown('#addCategories', [], 'Error loading categories'); // Populate add modal with error state
            return false;
        }
    } catch (error) {
        allCategoriesData = [];
        if (filterSelect) filterSelect.innerHTML = '<option value="" disabled>Error loading</option>';
        showToast('Failed to load categories (network error).', 'error');
        populateSelect2Dropdown('#addCategories', [], 'Error loading categories'); // Populate add modal with error state
        return false;
    }
}

/**
 * Helper function to populate a Select2 dropdown.
 * @param {string} selector - The jQuery selector for the <select> element.
 * @param {Array} data - The array of data objects (must have id and name properties).
 * @param {string} placeholder - The placeholder text for the dropdown.
 */
function populateSelect2Dropdown(selector, data, placeholder) {
    const $select = $(selector);
    if (!$select.length) {
        console.warn(`[populateSelect2Dropdown] Element not found for selector: ${selector}`);
        return;
    }

    // Clear existing options
    $select.empty();

    // Add placeholder/default option if needed (Select2 handles placeholder text)
    // $select.append(new Option(placeholder, '', true, true)).trigger('change'); // Might interfere with Select2 placeholder

    // Add options from data
    if (data && data.length > 0) {
        data.forEach(item => {
            const option = new Option(escapeHTML(item.name), item.id, false, false);
            $select.append(option);
        });
    }

    // Refresh Select2 to reflect changes
    // Initialize if not already initialized (or re-initialize)
    if (!$select.data('select2')) {
        console.log(`[populateSelect2Dropdown] Initializing Select2 for: ${selector}`);
        $select.select2({
            theme: 'bootstrap-5',
            width: '100%',
            placeholder: placeholder,
            closeOnSelect: false, // Keep open for multi-select
            allowClear: true
        });
    } else {
        console.log(`[populateSelect2Dropdown] Triggering change for already initialized Select2: ${selector}`);
        // $select.trigger('change'); // Might not be needed if options are replaced
    }
    // Ensure initial value is cleared after populating (important for modals)
    $select.val(null).trigger('change'); 
    console.log(`[populateSelect2Dropdown] Populated and refreshed Select2 for: ${selector}`);
}

/**
 * Initialize image upload and preview functionality for the Add Song modal
 */
function initAddImageUploadPreview() {
    const imageInput = document.getElementById('addCoverFile');
    const browseImageBtn = document.getElementById('browseAddImageBtn');
    const imagePreview = document.getElementById('addCoverPreview');
    const imagePreviewText = document.getElementById('addImagePreviewText');

    if (!imageInput || !imagePreview) {
        console.warn("Add Song modal image upload elements (addCoverFile or addCoverPreview) not found.");
        return;
    }

    // 不需要 browseImageBtn，因为文件输入框本身可以触发选择
    // browseImageBtn.addEventListener('click', () => {
    //     correctImageInput.click();
    // });

    imageInput.addEventListener('change', function(event) {
        const file = event.target.files[0];
        if (file) {
            if (!file.type.startsWith('image/')) {
                showToast('Please select an image file (JPEG, PNG, GIF)', 'warning');
                this.value = '';
                resetAddImagePreview();
                return;
            }
            if (file.size > 5 * 1024 * 1024) { // 5MB limit
                showToast('Image file is too large (Max 5MB)', 'danger');
                this.value = '';
                resetAddImagePreview();
                return;
            }
            const reader = new FileReader();
            reader.onload = function(e) {
                imagePreview.src = e.target.result;
                imagePreview.style.display = 'block';
                // 不需要 imagePreviewText
                // if (imagePreviewText) imagePreviewText.style.display = 'none';
            }
            reader.readAsDataURL(file);
        } else {
            resetAddImagePreview();
        }
    });
}

/**
 * Reset image preview for the Add Song modal to its initial state
 */
function resetAddImagePreview() {
    const imageInput = document.getElementById('addCoverFile');
    const imagePreview = document.getElementById('addCoverPreview');
    // const imagePreviewText = document.getElementById('addImagePreviewText'); // 不需要

    if (imageInput) imageInput.value = '';
    if (imagePreview) {
        imagePreview.src = '/Admin/assets/img/default-cover.jpg'; // 重置为默认图片
        imagePreview.style.display = 'block'; // 确保预览总是可见
    }
    // if (imagePreviewText) {
    //     imagePreviewText.style.display = 'block';
    // }
}

/**
 * 页面初始化
 */
document.addEventListener('DOMContentLoaded', function() {
    // 初始化选择器
    initializeSelectors();
    
    // 加载数据
    loadSingers();
    loadCategories();
    
    // 设置封面预览
    setupCoverPreview();
    
    // 绑定按钮事件
    document.getElementById('submitAddSongBtn').addEventListener('click', handleAddSong);
    
    // 初始化表单事件
    const addSongModal = document.getElementById('addSongModal');
    if (addSongModal) {
        addSongModal.addEventListener('hidden.bs.modal', clearAddForm);
    }
});

/**
 * 初始化Select2选择器
 */
function initializeSelectors() {
    console.log("[initializeSelectors] Skipping Select2 initialization as modals are used.");
}

/**
 * 清空添加歌曲表单
 */
function clearAddForm() {
    const form = document.getElementById('addSongForm');
    if (!form) return;
    
    form.reset(); // This should clear #addAlbum as well
    
    // RE-ADD: Reset selection Maps and display
    selectedAddSingers.clear();
    selectedAddCategories.clear();
    updateAddSelectedSingersDisplay();
    updateAddSelectedCategoriesDisplay();
    
    // Reset封面预览
    document.getElementById('addCoverPreview').src = '/Admin/assets/img/default-cover.jpg';
    
    // 隐藏进度条
    const progressContainer = document.getElementById('uploadProgress');
    if (progressContainer) {
        progressContainer.classList.add('d-none');
    }
}

/**
 * Populate the category list in the Add Category Modal
 */
function populateAddCategoryModalList(categories) {
    const container = document.getElementById('addCategoryListContainer');
    if (!container) {
        console.error('[populateAddCategoryModalList] Add category list container not found');
        return;
    }
    // console.log('[populateAddCategoryModalList] Attempting to populate with:', categories);
    container.innerHTML = ''; // Clear previous content

    if (!categories || !Array.isArray(categories)) {
        console.warn('[populateAddCategoryModalList] Invalid or null categories data provided.');
        container.innerHTML = '<p class="text-center text-danger">Error: Could not load categories data.</p>';
        return;
    }
    if (categories.length === 0) {
        // console.warn('[populateAddCategoryModalList] No categories found to display.');
        container.innerHTML = '<p class="text-center text-muted">No categories found.</p>';
        return;
    }

    const listGroup = document.createElement('ul');
    listGroup.className = 'list-group list-group-flush';

    categories.forEach((category) => {
        if (!category || typeof category.id === 'undefined' || typeof category.name === 'undefined') {
            console.warn(`[populateAddCategoryModalList] Skipping invalid category object:`, category);
            return;
        }
        const categoryIdStr = String(category.id);
        const isChecked = selectedAddCategories.has(categoryIdStr);
        const listItem = document.createElement('li');
        listItem.className = 'list-group-item';
        listItem.innerHTML = `
            <div class="form-check">
                <input class="form-check-input add-category-checkbox" type="checkbox" value="${categoryIdStr}" id="add-category-${categoryIdStr}" ${isChecked ? 'checked' : ''}>
                <label class="form-check-label w-100" for="add-category-${categoryIdStr}">
                    ${escapeHTML(category.name)}
                </label>
            </div>
        `;
        listGroup.appendChild(listItem);
    });
    container.appendChild(listGroup);
    console.log('[populateAddCategoryModalList] Finished populating add category list.');
}

/**
 * Update the display of selected categories in the Add Song Modal
 */
function updateAddSelectedCategoriesDisplay() {
    // console.log('Updating add selected categories display');
    const container = document.getElementById('addSelectedCategoriesContainer');
    const hiddenInput = document.getElementById('addSelectedCategoryIds'); // Define hiddenInput here

    if (!container || !hiddenInput) {
        console.error('Add selected categories container or hidden input not found');
        return;
    }

    container.innerHTML = '';
    if (selectedAddCategories.size === 0) {
        container.innerHTML = '<span class="text-muted small">No categories selected</span>';
    } else {
        selectedAddCategories.forEach((name, id) => {
            const pill = document.createElement('span');
            pill.className = 'badge bg-info text-dark me-1 mb-1';
            pill.textContent = escapeHTML(name);
            container.appendChild(pill);
        });
    }
    const ids = Array.from(selectedAddCategories.keys());
    hiddenInput.value = ids.join(',');
    console.log('Updated hidden #addSelectedCategoryIds:', hiddenInput.value);
}

/**
 * Populate the singer list in the Add Singer Modal
 */
function populateAddSingerModalList(filteredSingers) {
    const container = document.getElementById('addSingerListContainer');
    if (!container) {
        console.error('[populateAddSingerModalList] Add singer list container not found');
        return;
    }
    // console.log('[populateAddSingerModalList] Attempting to populate with:', filteredSingers);
    container.innerHTML = '';

    if (!filteredSingers || !Array.isArray(filteredSingers)) {
        console.warn('[populateAddSingerModalList] Invalid or null filteredSingers data provided.');
        container.innerHTML = '<p class="text-center text-danger">Error: Could not load artists data.</p>';
        return;
    }
    if (filteredSingers.length === 0) {
        // console.warn('[populateAddSingerModalList] No singers found to display.');
        container.innerHTML = '<p class="text-center text-muted">No artists found.</p>';
        return;
    }

    const listGroup = document.createElement('ul');
    listGroup.className = 'list-group list-group-flush';

    filteredSingers.forEach((singer) => {
        if (!singer || typeof singer.id === 'undefined' || typeof singer.name === 'undefined') {
            console.warn(`[populateAddSingerModalList] Skipping invalid singer object:`, singer);
            return;
        }
        const singerIdStr = String(singer.id);
        const isChecked = selectedAddSingers.has(singerIdStr);
        const listItem = document.createElement('li');
        listItem.className = 'list-group-item';
        listItem.innerHTML = `
            <div class="form-check">
                <input class="form-check-input add-singer-checkbox" type="checkbox" value="${singerIdStr}" id="add-singer-${singerIdStr}" ${isChecked ? 'checked' : ''}>
                <label class="form-check-label w-100" for="add-singer-${singerIdStr}">
                    ${escapeHTML(singer.name)}
                </label>
            </div>
        `;
        listGroup.appendChild(listItem);
    });
    container.appendChild(listGroup);
    console.log('[populateAddSingerModalList] Finished populating add singer list.');
}

/**
 * Update the display of selected singers in the Add Song Modal
 */
function updateAddSelectedSingersDisplay() {
    // console.log('Updating add selected singers display');
    const container = document.getElementById('addSelectedSingersContainer');
    const hiddenInput = document.getElementById('addSelectedSingerIds'); // Define hiddenInput here

    if (!container || !hiddenInput) {
        console.error('Add selected singers container or hidden input not found');
        return;
    }
    container.innerHTML = '';
    if (selectedAddSingers.size === 0) {
        container.innerHTML = '<span class="text-muted small">No artists selected</span>';
    } else {
        selectedAddSingers.forEach((name, id) => {
            const pill = document.createElement('span');
            pill.className = 'badge bg-secondary me-1 mb-1';
            pill.innerHTML = escapeHTML(name);
            container.appendChild(pill);
        });
    }
    const ids = Array.from(selectedAddSingers.keys());
    hiddenInput.value = ids.join(',');
    console.log('Updated hidden #addSelectedSingerIds:', hiddenInput.value);
}

/**
 * Reset image preview for the Edit Song modal to its initial state
 */
function resetEditImagePreview() {
    const imageInput = document.getElementById('editCoverFile');
    const imagePreview = document.getElementById('editCoverPreview');
    if (imageInput) imageInput.value = '';
    if (imagePreview) {
        imagePreview.src = '/Admin/assets/img/default-cover.jpg'; // Reset to default
    }
}

/**
 * Populate the category list in the Edit Category Modal
 */
function populateEditCategoryModalList(categories) {
    const container = document.getElementById('editCategoryListContainer');
    if (!container) return;
    container.innerHTML = '';
    if (!categories || !Array.isArray(categories) || categories.length === 0) {
        container.innerHTML = '<p class="text-center text-muted">No categories found.</p>';
        return;
    }

    const listGroup = document.createElement('ul');
    listGroup.className = 'list-group list-group-flush';

    categories.forEach((category) => {
        const categoryIdStr = String(category.id);
        const isChecked = selectedEditCategories.has(categoryIdStr);
        const listItem = document.createElement('li');
        listItem.className = 'list-group-item';
        listItem.innerHTML = `
            <div class="form-check">
                <input class="form-check-input edit-category-checkbox" type="checkbox" value="${categoryIdStr}" id="edit-category-${categoryIdStr}" ${isChecked ? 'checked' : ''}>
                <label class="form-check-label w-100" for="edit-category-${categoryIdStr}">
                    ${escapeHTML(category.name)}
                </label>
            </div>
        `;
        listGroup.appendChild(listItem);
    });
    container.appendChild(listGroup);
}

/**
 * Update the display of selected categories in the Edit Song Modal
 */
function updateEditSelectedCategoriesDisplay() {
    const container = document.getElementById('editSelectedCategoriesContainer');
    const hiddenInput = document.getElementById('editSelectedCategoryIds');
    if (!container || !hiddenInput) return;

    container.innerHTML = '';
    if (selectedEditCategories.size === 0) {
        container.innerHTML = '<span class="text-muted small">No categories selected</span>';
    } else {
        selectedEditCategories.forEach((name, id) => {
            const pill = document.createElement('span');
            pill.className = 'badge bg-info text-dark me-1 mb-1';
            pill.textContent = escapeHTML(name);
            container.appendChild(pill);
        });
    }
    const ids = Array.from(selectedEditCategories.keys());
    hiddenInput.value = ids.join(',');
    console.log('Updated hidden #editSelectedCategoryIds:', hiddenInput.value);
}

/**
 * Populate the singer list in the Edit Singer Modal
 */
function populateEditSingerModalList(filteredSingers) {
    const container = document.getElementById('editSingerListContainer');
    if (!container) return;
    container.innerHTML = '';
    if (!filteredSingers || !Array.isArray(filteredSingers) || filteredSingers.length === 0) {
        container.innerHTML = '<p class="text-center text-muted">No artists found.</p>';
        return;
    }

    const listGroup = document.createElement('ul');
    listGroup.className = 'list-group list-group-flush';

    filteredSingers.forEach((singer) => {
        const singerIdStr = String(singer.id);
        const isChecked = selectedEditSingers.has(singerIdStr);
        const listItem = document.createElement('li');
        listItem.className = 'list-group-item';
        listItem.innerHTML = `
            <div class="form-check">
                <input class="form-check-input edit-singer-checkbox" type="checkbox" value="${singerIdStr}" id="edit-singer-${singerIdStr}" ${isChecked ? 'checked' : ''}>
                <label class="form-check-label w-100" for="edit-singer-${singerIdStr}">
                    ${escapeHTML(singer.name)}
                </label>
            </div>
        `;
        listGroup.appendChild(listItem);
    });
    container.appendChild(listGroup);
}

/**
 * Update the display of selected singers in the Edit Song Modal
 */
function updateEditSelectedSingersDisplay() {
    const container = document.getElementById('editSelectedSingersContainer');
    const hiddenInput = document.getElementById('editSelectedSingerIds');
    if (!container || !hiddenInput) return;

    container.innerHTML = '';
    if (selectedEditSingers.size === 0) {
        container.innerHTML = '<span class="text-muted small">No artists selected</span>';
        } else {
        selectedEditSingers.forEach((name, id) => {
            const pill = document.createElement('span');
            pill.className = 'badge bg-secondary me-1 mb-1';
            pill.innerHTML = escapeHTML(name);
            container.appendChild(pill);
        });
    }
    const ids = Array.from(selectedEditSingers.keys());
    hiddenInput.value = ids.join(',');
    console.log('Updated hidden #editSelectedSingerIds:', hiddenInput.value);
}
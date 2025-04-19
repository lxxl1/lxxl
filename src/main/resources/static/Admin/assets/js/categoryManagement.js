/**
 * Category Management JavaScript
 * Handles all the category-related functionality including:
 * - Displaying categories with pagination
 * - Searching categories
 * - Adding new categories
 * - Editing existing categories
 * - Deleting single and batch categories
 */

// Import necessary modules
import { API_URL } from '../../../Common/js/config.js'; // Adjust path if needed
import api from '../../../Common/js/api.js'; // Adjust path if needed

// --- Global Variables ---
let currentPage = 1;
const pageSize = 10; // Or get from a config/UI element
let currentSearchTerm = '';
let isEditMode = false;
let currentEditCategoryId = null;
const selectedCategoryIds = new Set();

// --- Utility Functions ---

// Basic HTML escaping (reuse if available globally)
function escapeHTML(str) {
    if (!str) return '';
    return str.replace(/[&<>"'/]/g, function (s) {
        const entityMap = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;', '/': '&#x2F;' };
        return entityMap[s];
    });
}

// Show toast notifications (reuse if available globally)
function showToast(message, type = 'info') {
    if (typeof Toastify === 'function') {
        let backgroundColor;
        switch (type) {
            case 'success': backgroundColor = '#4caf50'; break;
            case 'error': backgroundColor = '#f44336'; break;
            case 'warning': backgroundColor = '#ff9800'; break;
            default: backgroundColor = '#2196f3';
        }
        Toastify({
            text: message, duration: 3000, close: true, gravity: 'top', position: 'right',
            backgroundColor: backgroundColor, stopOnFocus: true
        }).showToast();
    } else {
        console.log(`${type.toUpperCase()}: ${message}`);
        if (type === 'error') alert(message); // Fallback for errors
    }
}

// --- Core Functions ---

/**
 * Fetch categories from the API based on page number and search term.
 * @param {number} pageNum - The page number to fetch.
 * @param {string} searchTerm - The search term to filter by (optional).
 */
async function fetchCategories(pageNum = 1, searchTerm = '') {
    currentPage = pageNum;
    currentSearchTerm = searchTerm.trim();
    const tableBody = document.getElementById('categoryTableBody');
    const paginationContainer = document.getElementById('pagination');

    if (!tableBody || !paginationContainer) {
        console.error('Table body or pagination container not found.');
        return;
    }

    tableBody.innerHTML = `<tr><td colspan="4" class="text-center">
                           <div class="spinner-border spinner-border-sm" role="status">
                             <span class="visually-hidden">Loading...</span>
                           </div> Loading categories...
                         </td></tr>`;
    paginationContainer.innerHTML = ''; // Clear pagination

    try {
        const params = {
            pageNum: currentPage,
            pageSize: pageSize,
            name: currentSearchTerm // Pass search term as 'name' parameter
        };
        // console.log("Fetching categories with params:", params); // Debugging
        const response = await api.get('/category/selectPage', { params });
        // console.log("API Response:", response); // Debugging

        if (response.data && (response.data.code === '200' || response.data.code === 200) && response.data.data) {
            const pageInfo = response.data.data;
            // console.log("PageInfo:", pageInfo); // Debugging
            renderTable(pageInfo.list || []);
            renderPagination(pageInfo);
            updateSelectAllCheckboxState(); // Ensure header checkbox reflects current page state
            updateBatchDeleteButtonVisibility(); // Update based on selections
        } else {
            console.error('Failed to fetch categories or unexpected data format:', response.data);
            tableBody.innerHTML = '<tr><td colspan="4" class="text-center text-danger">Failed to load categories.</td></tr>';
            showToast(response.data?.msg || 'Failed to load categories.', 'error');
        }
    } catch (error) {
        console.error('Error fetching categories:', error);
        tableBody.innerHTML = '<tr><td colspan="4" class="text-center text-danger">Error loading categories. Please check connection.</td></tr>';
        showToast('Error connecting to the server.', 'error');
    }
}

/**
 * Render the category table with the provided data.
 * @param {Array} categories - Array of category objects.
 */
function renderTable(categories) {
    const tableBody = document.getElementById('categoryTableBody');
    tableBody.innerHTML = ''; // Clear previous content or loading state

    if (!categories || categories.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="4" class="text-center">No categories found.</td></tr>';
        return;
    }

    categories.forEach(category => {
        const isSelected = selectedCategoryIds.has(category.id);
        const row = document.createElement('tr');
        row.innerHTML = `
            <td><input type="checkbox" class="form-check-input row-checkbox" value="${category.id}" ${isSelected ? 'checked' : ''}></td>
            <td>${category.id}</td>
            <td>${escapeHTML(category.name)}</td>
            <td>
                <button class="btn btn-sm btn-primary edit-btn" data-id="${category.id}" title="Edit">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn-sm btn-danger delete-btn" data-id="${category.id}" data-name="${escapeHTML(category.name)}" title="Delete">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;
        tableBody.appendChild(row);
    });
}

/**
 * Render pagination controls based on PageInfo from the API.
 * @param {object} pageInfo - PageInfo object from the backend.
 */
function renderPagination(pageInfo) {
    const paginationContainer = document.getElementById('pagination');
    paginationContainer.innerHTML = ''; // Clear existing pagination

    if (!pageInfo || pageInfo.pages <= 1) {
        return; // No pagination needed for 0 or 1 page
    }

    const { pageNum, pages, hasPreviousPage, hasNextPage, prePage, nextPage } = pageInfo;

    // Previous button
    const prevLi = document.createElement('li');
    prevLi.className = `page-item ${!hasPreviousPage ? 'disabled' : ''}`;
    prevLi.innerHTML = `<a class="page-link" href="#" data-page="${prePage}">&laquo;</a>`;
    paginationContainer.appendChild(prevLi);

    // Page number buttons (simplified version)
    for (let i = 1; i <= pages; i++) {
        const pageLi = document.createElement('li');
        pageLi.className = `page-item ${i === pageNum ? 'active' : ''}`;
        pageLi.innerHTML = `<a class="page-link" href="#" data-page="${i}">${i}</a>`;
        paginationContainer.appendChild(pageLi);
    }

    // Next button
    const nextLi = document.createElement('li');
    nextLi.className = `page-item ${!hasNextPage ? 'disabled' : ''}`;
    nextLi.innerHTML = `<a class="page-link" href="#" data-page="${nextPage}">&raquo;</a>`;
    paginationContainer.appendChild(nextLi);
}

/**
 * Reset the category modal form to its default state.
 */
function resetCategoryModal() {
    const form = document.getElementById('categoryForm');
    const modalTitle = document.getElementById('categoryModalLabel');
    const categoryIdInput = document.getElementById('categoryId');
    const categoryTypeSelect = document.getElementById('categoryTypeSelect');
    const customCategoryDiv = document.getElementById('customCategoryDiv');
    const customCategoryNameInput = document.getElementById('customCategoryName');

    form?.reset(); // Reset form fields
    if (modalTitle) modalTitle.textContent = 'Add Category';
    if (categoryIdInput) categoryIdInput.value = '';
    if (categoryTypeSelect) categoryTypeSelect.disabled = false; // Enable type selection for add
    if (customCategoryDiv) customCategoryDiv.style.display = 'none'; // Hide custom input initially
    if (customCategoryNameInput) customCategoryNameInput.value = '';

    isEditMode = false;
    currentEditCategoryId = null;
}

/**
 * Populate the category modal for editing.
 * @param {number} categoryId - The ID of the category to edit.
 */
async function populateEditModal(categoryId) {
    resetCategoryModal(); // Start with a clean slate
    isEditMode = true;
    currentEditCategoryId = categoryId;

    const modalTitle = document.getElementById('categoryModalLabel');
    const categoryIdInput = document.getElementById('categoryId');
    const categoryTypeSelect = document.getElementById('categoryTypeSelect');
    const customCategoryDiv = document.getElementById('customCategoryDiv');
    const customCategoryNameInput = document.getElementById('customCategoryName');
    const modalElement = document.getElementById('categoryModal');
    const modal = bootstrap.Modal.getInstance(modalElement) || new bootstrap.Modal(modalElement);

    if (modalTitle) modalTitle.textContent = 'Edit Category';
    if (categoryIdInput) categoryIdInput.value = categoryId;

    try {
        showToast('Loading category data...', 'info');
        const response = await api.get(`/category/selectById/${categoryId}`);
        if (response.data && (response.data.code === '200' || response.data.code === 200) && response.data.data) {
            const category = response.data.data;

            // Attempt to find the category name in the standard options
            let foundStandard = false;
            if (categoryTypeSelect) {
                for (let option of categoryTypeSelect.options) {
                    if (option.value === category.name && option.value !== 'Custom') {
                        option.selected = true;
                        foundStandard = true;
                        break;
                    }
                }
            }

            // If not found in standard options, assume it's custom
            if (!foundStandard && categoryTypeSelect) {
                const customOption = categoryTypeSelect.querySelector('option[value="Custom"]');
                if (customOption) customOption.selected = true;
                if (customCategoryDiv) customCategoryDiv.style.display = 'block';
                if (customCategoryNameInput) customCategoryNameInput.value = category.name;
            } else {
                 if (customCategoryDiv) customCategoryDiv.style.display = 'none'; // Hide if standard
            }

            // Optionally disable type selection during edit if needed
            // if (categoryTypeSelect) categoryTypeSelect.disabled = true;

            modal.show();
        } else {
            showToast(response.data?.msg || 'Failed to load category details.', 'error');
            isEditMode = false; // Revert mode if load fails
            currentEditCategoryId = null;
        }
    } catch (error) {
        console.error('Error loading category for edit:', error);
        showToast('Error loading category data.', 'error');
        isEditMode = false; // Revert mode if load fails
        currentEditCategoryId = null;
    }
}

/**
 * Handle saving category (both add and edit).
 */
async function handleSaveCategory() {
    const form = document.getElementById('categoryForm');
    const categoryId = document.getElementById('categoryId').value;
    const categoryTypeSelect = document.getElementById('categoryTypeSelect');
    const customCategoryNameInput = document.getElementById('customCategoryName');
    const saveButton = document.getElementById('saveCategoryBtn');

    let categoryName = '';
    const selectedType = categoryTypeSelect.value;

    if (selectedType === 'Custom') {
        categoryName = customCategoryNameInput.value.trim();
        if (!categoryName) {
            showToast('Please enter a custom category name.', 'warning');
            customCategoryNameInput.focus();
            return;
        }
    } else {
        categoryName = selectedType;
    }

    if (!categoryName) {
        showToast('Invalid category selection.', 'warning');
        return;
    }

    const categoryData = {
        name: categoryName
    };

    let url = '/category/add';
    let method = 'POST';

    if (isEditMode && currentEditCategoryId) {
        categoryData.id = currentEditCategoryId;
        url = '/category/update';
        method = 'PUT';
    }

    saveButton.disabled = true;
    saveButton.innerHTML = `<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Saving...`;

    try {
        const response = await api({ method: method, url: url, data: categoryData });

        if (response.data && (response.data.code === '200' || response.data.code === 200)) {
            showToast(`Category ${isEditMode ? 'updated' : 'added'} successfully!`, 'success');
            const modalElement = document.getElementById('categoryModal');
            const modal = bootstrap.Modal.getInstance(modalElement);
            modal?.hide();
            fetchCategories(isEditMode ? currentPage : 1); // Refresh current or go to first page
        } else {
             showToast(response.data?.msg || `Failed to ${isEditMode ? 'update' : 'add'} category.`, 'error');
        }
    } catch (error) {
        console.error('Error saving category:', error);
        showToast(`Error saving category: ${error.response?.data?.msg || error.message}`, 'error');
    } finally {
        saveButton.disabled = false;
        saveButton.textContent = 'Save Category';
    }
}

/**
 * Handle deleting a single category.
 * @param {number} categoryId - The ID of the category to delete.
 * @param {string} categoryName - The name for confirmation message.
 */
async function handleDeleteCategory(categoryId, categoryName) {
    if (!confirm(`Are you sure you want to delete the category "${categoryName}" (ID: ${categoryId})?`)) {
        return;
    }

    showToast('Deleting category...', 'info');
    try {
        const response = await api.delete(`/category/delete/${categoryId}`);
        if (response.data && (response.data.code === '200' || response.data.code === 200)) {
            showToast('Category deleted successfully!', 'success');
            selectedCategoryIds.delete(categoryId); // Remove from selection if present
            fetchCategories(currentPage); // Refresh current page
        } else {
            showToast(response.data?.msg || 'Failed to delete category.', 'error');
        }
    } catch (error) {
        console.error('Error deleting category:', error);
        showToast(`Error deleting category: ${error.response?.data?.msg || error.message}`, 'error');
    }
}

/**
 * Handle batch deleting selected categories.
 */
async function handleBatchDelete() {
    if (selectedCategoryIds.size === 0) {
        showToast('No categories selected for deletion.', 'warning');
        return;
    }

    if (!confirm(`Are you sure you want to delete ${selectedCategoryIds.size} selected categories? This action cannot be undone.`)) {
        return;
    }

    const idsToDelete = Array.from(selectedCategoryIds);
    const batchDeleteButton = document.getElementById('batchDeleteBtn');
    batchDeleteButton.disabled = true;
    batchDeleteButton.innerHTML = `<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Deleting...`;

    try {
        const response = await api.delete('/category/delete/batch', { data: idsToDelete }); // Send IDs in request body
        if (response.data && (response.data.code === '200' || response.data.code === 200)) {
            showToast(`${idsToDelete.length} categories deleted successfully!`, 'success');
            selectedCategoryIds.clear();
            fetchCategories(1); // Go back to first page after batch delete
        } else {
            showToast(response.data?.msg || 'Failed to delete categories.', 'error');
        }
    } catch (error) {
        console.error('Error batch deleting categories:', error);
         showToast(`Error deleting categories: ${error.response?.data?.msg || error.message}`, 'error');
    } finally {
        batchDeleteButton.disabled = false;
        batchDeleteButton.innerHTML = `<i class="fas fa-trash-alt"></i> Batch Delete`;
        updateBatchDeleteButtonVisibility();
        updateSelectAllCheckboxState();
    }
}

/**
 * Update the visibility of the batch delete button based on selection.
 */
function updateBatchDeleteButtonVisibility() {
    const batchDeleteButton = document.getElementById('batchDeleteBtn');
    if (batchDeleteButton) {
        batchDeleteButton.style.display = selectedCategoryIds.size > 0 ? 'inline-block' : 'none';
    }
}

/**
 * Update the state of the header "Select All" checkbox.
 */
function updateSelectAllCheckboxState() {
    const selectAllCheckbox = document.getElementById('selectAllCheckbox');
    const rowCheckboxes = document.querySelectorAll('#categoryTableBody .row-checkbox');
    if (!selectAllCheckbox) return;

    if (rowCheckboxes.length === 0) {
        selectAllCheckbox.checked = false;
        selectAllCheckbox.indeterminate = false;
        return;
    }

    const allChecked = Array.from(rowCheckboxes).every(cb => cb.checked);
    const someChecked = Array.from(rowCheckboxes).some(cb => cb.checked);

    selectAllCheckbox.checked = allChecked;
    selectAllCheckbox.indeterminate = !allChecked && someChecked;
}


// --- Event Listeners ---

function setupEventListeners() {
    const addCategoryBtn = document.getElementById('addCategoryBtn');
    const saveCategoryBtn = document.getElementById('saveCategoryBtn');
    const categoryModalElement = document.getElementById('categoryModal');
    const categoryTableBody = document.getElementById('categoryTableBody');
    const categorySearchBtn = document.getElementById('categorySearchBtn');
    const categorySearchInput = document.getElementById('categorySearchInput');
    const paginationContainer = document.getElementById('pagination');
    const categoryTypeSelect = document.getElementById('categoryTypeSelect');
    const selectAllCheckbox = document.getElementById('selectAllCheckbox');
    const batchDeleteBtn = document.getElementById('batchDeleteBtn');

    // Add Category Button
    addCategoryBtn?.addEventListener('click', () => {
        resetCategoryModal();
        const modal = new bootstrap.Modal(categoryModalElement);
        modal.show();
    });

    // Save Category Button (in modal)
    saveCategoryBtn?.addEventListener('click', handleSaveCategory);

    // Modal Hidden Event - Reset form when modal closes
    categoryModalElement?.addEventListener('hidden.bs.modal', resetCategoryModal);

    // Table Event Delegation (Edit/Delete/Checkbox)
    categoryTableBody?.addEventListener('click', (event) => {
        const target = event.target;
        const id = target.closest('button')?.dataset.id || target.closest('tr')?.querySelector('.row-checkbox')?.value;

        if (target.closest('.edit-btn')) {
            populateEditModal(id);
        } else if (target.closest('.delete-btn')) {
            const name = target.closest('button').dataset.name;
            handleDeleteCategory(id, name);
        } else if (target.classList.contains('row-checkbox')) {
             const categoryId = parseInt(target.value, 10);
             if (target.checked) {
                 selectedCategoryIds.add(categoryId);
             } else {
                 selectedCategoryIds.delete(categoryId);
             }
             updateBatchDeleteButtonVisibility();
             updateSelectAllCheckboxState();
        }
    });

    // Search Button
    categorySearchBtn?.addEventListener('click', () => {
        fetchCategories(1, categorySearchInput.value);
    });

    // Search Input Enter Key
    categorySearchInput?.addEventListener('keypress', (event) => {
        if (event.key === 'Enter') {
            fetchCategories(1, categorySearchInput.value);
        }
    });

    // Pagination Click
    paginationContainer?.addEventListener('click', (event) => {
        event.preventDefault();
        const target = event.target;
        if (target.tagName === 'A' && target.dataset.page) {
            const pageNum = parseInt(target.dataset.page, 10);
            if (!isNaN(pageNum)) {
                fetchCategories(pageNum, currentSearchTerm);
            }
        }
    });

    // Category Type Selection Change (in modal)
    categoryTypeSelect?.addEventListener('change', function() {
        const customCategoryDiv = document.getElementById('customCategoryDiv');
        if (this.value === 'Custom') {
            customCategoryDiv.style.display = 'block';
        } else {
            customCategoryDiv.style.display = 'none';
        }
    });

     // Select All Checkbox
     selectAllCheckbox?.addEventListener('change', function() {
         const isChecked = this.checked;
         const rowCheckboxes = document.querySelectorAll('#categoryTableBody .row-checkbox');
         rowCheckboxes.forEach(checkbox => {
             const categoryId = parseInt(checkbox.value, 10);
             checkbox.checked = isChecked;
             if (isChecked) {
                 selectedCategoryIds.add(categoryId);
             } else {
                 selectedCategoryIds.delete(categoryId);
             }
         });
         updateBatchDeleteButtonVisibility();
     });

     // Batch Delete Button
     batchDeleteBtn?.addEventListener('click', handleBatchDelete);
}

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    // Basic auth check simulation (replace with actual logic if needed)
    // if (!localStorage.getItem('adminToken')) {
    //     window.location.href = 'login.html'; // Redirect if not logged in
    //     return;
    // }

    setupEventListeners();
    fetchCategories(); // Initial fetch (page 1, no search term)
}); 
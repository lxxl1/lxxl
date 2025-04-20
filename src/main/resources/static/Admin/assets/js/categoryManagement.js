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
let categoriesTable; // Variable for DataTable instance

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
    // Ensure DataTable is initialized
    if (!categoriesTable) {
        console.error('DataTable not initialized yet.');
        return;
    }

    // Show processing indicator (DataTables might have its own)
    // categoriesTable.processing(true);

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
            renderTable(pageInfo.list || []); // Update DataTable
            updateSelectAllCheckboxState(); // Ensure header checkbox reflects current page state
            updateBatchDeleteButtonVisibility(); // Update based on selections
        } else {
            console.error('Failed to fetch categories or unexpected data format:', response.data);
            // Show error in table (DataTables might handle this)
            categoriesTable.clear().draw(); // Clear table on error
            // Optionally add a row indicating error
            showToast(response.data?.msg || 'Failed to load categories.', 'error');
        }
    } catch (error) {
        console.error('Error fetching categories:', error);
        categoriesTable.clear().draw(); // Clear table on error
        showToast('Error connecting to the server.', 'error');
    } finally {
        // categoriesTable.processing(false); // Hide processing indicator
    }
}

/**
 * Render the category table using DataTables API.
 * @param {Array} categories - Array of category objects.
 */
function renderTable(categories) {
    if (!categoriesTable) return;
    categoriesTable.clear();
    categoriesTable.rows.add(categories);
    categoriesTable.draw();
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
    const categoryDescriptionInput = document.getElementById('categoryDescription');

    form?.reset(); // Reset form fields
    if (modalTitle) modalTitle.textContent = 'Add Category';
    if (categoryIdInput) categoryIdInput.value = '';
    if (categoryTypeSelect) categoryTypeSelect.disabled = false; // Enable type selection for add
    if (customCategoryDiv) customCategoryDiv.style.display = 'none'; // Hide custom input initially
    if (customCategoryNameInput) customCategoryNameInput.value = '';
    if (categoryDescriptionInput) categoryDescriptionInput.value = '';

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
    const categoryDescriptionInput = document.getElementById('categoryDescription');
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

            // Populate description
            if (categoryDescriptionInput) {
                categoryDescriptionInput.value = category.description || ''; // Set description or empty string
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
    const categoryDescriptionInput = document.getElementById('categoryDescription');
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
        name: categoryName,
        description: categoryDescriptionInput.value.trim()
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

/**
 * Initialize the DataTable
 */
function initializeDataTable() {
    categoriesTable = $('#categoriesTable').DataTable({
        // Server-side processing is likely needed if data volume is large
        // For now, assuming client-side data rendering after fetch
        // processing: true, 
        // serverSide: true, 
        // ajax: function (data, callback, settings) { ... }, // Requires backend changes
        columns: [
            { 
                data: null,
                render: function(data, type, row) {
                    const isSelected = selectedCategoryIds.has(row.id);
                    return `<input type="checkbox" class="form-check-input row-checkbox" value="${row.id}" ${isSelected ? 'checked' : ''}>`;
                },
                orderable: false,
                className: 'text-center dt-body-center'
            },
            { data: 'id', className: 'dt-body-left' },
            { data: 'name', render: escapeHTML },
            { 
                data: null,
                render: function(data, type, row) {
                    return `
                        <button class="btn btn-sm btn-primary edit-btn me-1" data-id="${row.id}" title="Edit">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-sm btn-danger delete-btn" data-id="${row.id}" data-name="${escapeHTML(row.name)}" title="Delete">
                            <i class="fas fa-trash"></i>
                        </button>
                    `;
                },
                orderable: false,
                className: 'text-center dt-body-center'
            }
        ],
        responsive: true,
        order: [[1, 'asc']], // Default sort by ID
        language: {
            search: "", // Use placeholder
            searchPlaceholder: "Search categories...",
            emptyTable: "No categories found",
            info: "Showing _START_ to _END_ of _TOTAL_ categories",
            infoEmpty: "No categories available",
            infoFiltered: "(filtered from _MAX_ total categories)",
            lengthMenu: "Show _MENU_ categories",
            zeroRecords: "No matching categories found",
            paginate: { // Use Bootstrap 5 classes if needed 
               first:    "&laquo;",
               last:     "&raquo;",
               next:     "&rsaquo;",
               previous: "&lsaquo;"
             }
        },
        pagingType: "full_numbers", // Example pagination type
        // Adjust DOM structure if needed, e.g., remove default search box if using custom one
        dom: '<"row"<"col-sm-12"tr>>' + 
             '<"row mt-3"<"col-sm-12 col-md-5"i><"col-sm-12 col-md-7"p>>',
        drawCallback: function(settings) {
            // Re-initialize tooltips after table draw if needed
            $('[data-bs-toggle="tooltip"]').tooltip('dispose').tooltip();
            // Update select all checkbox state after draw
            updateSelectAllCheckboxState();
            // Re-attach listeners might be needed if using complex selectors not handled by delegation
        }
    });
}

// --- Event Listeners ---

function setupEventListeners() {
    const addCategoryBtn = document.getElementById('addCategoryBtn');
    const saveCategoryBtn = document.getElementById('saveCategoryBtn');
    const categoryModalElement = document.getElementById('categoryModal');
    const categoriesTableElement = $('#categoriesTable'); // Use jQuery selector for DataTable events
    const categorySearchBtn = document.getElementById('categorySearchBtn');
    const categorySearchInput = document.getElementById('categorySearchInput');
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

    // DataTable Event Delegation (Edit/Delete/Checkbox)
    categoriesTableElement.on('click', 'button.edit-btn, button.delete-btn, input.row-checkbox', function(event) {
        const target = event.target;

        if ($(this).hasClass('edit-btn')) {
            const id = $(this).data('id');
            populateEditModal(id);
        } else if ($(this).hasClass('delete-btn')) {
            const id = $(this).data('id');
            const name = $(this).data('name');
            handleDeleteCategory(id, name);
        } else if ($(this).hasClass('row-checkbox')) {
            const categoryId = parseInt($(this).val(), 10);
            if (this.checked) {
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

    initializeDataTable(); // Initialize DataTable on DOM ready
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
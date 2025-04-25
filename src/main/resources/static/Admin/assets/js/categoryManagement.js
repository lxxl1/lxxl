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
let allCategoriesData = []; // 存储所有分类数据
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
            style: { background: backgroundColor },
            stopOnFocus: true
        }).showToast();
    } else {
        console.log(`${type.toUpperCase()}: ${message}`);
        if (type === 'error') alert(message); // Fallback for errors
    }
}

/**
 * Escape special characters in a string for use in a regular expression
 */
function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// --- Core Functions ---

/**
 * Fetch all categories from the API at once.
 */
async function loadAllCategories() {
    showToast('Loading categories...', 'info');
    $('#categoriesTable').addClass('loading');

    try {
        // 请求所有分类数据
        const response = await api.get('/category/selectAll');
        
        if (response.data && (response.data.code === '200' || response.data.code === 200)) {
            allCategoriesData = response.data.data || [];
            console.log(`Loaded ${allCategoriesData.length} categories`);
            
            // 初始化DataTable
            initializeDataTable();
            
            // 更新全选复选框状态
            updateSelectAllCheckboxState();
            updateBatchDeleteButtonVisibility();
            
            showToast(`Loaded ${allCategoriesData.length} categories successfully`, 'success');
        } else {
            console.error('Failed to fetch categories:', response.data);
            showToast(response.data?.msg || 'Failed to load categories.', 'error');
            allCategoriesData = [];
            initializeDataTable(); // 初始化空表格
        }
    } catch (error) {
        console.error('Error fetching categories:', error);
        showToast('Error connecting to the server.', 'error');
        allCategoriesData = [];
        initializeDataTable(); // 初始化空表格
    } finally {
        $('#categoriesTable').removeClass('loading');
    }
}

/**
 * 前端搜索过滤功能
 * @param {string} searchTerm - 搜索关键词
 */
function filterCategories(searchTerm) {
    const term = searchTerm.trim().toLowerCase();
    
    // 显示搜索中状态
    $('#categoriesTable').addClass('loading');
    showToast('Searching...', 'info');
    
    if (!categoriesTable) {
        console.error('DataTable not initialized');
        return;
    }
    
    // 使用DataTable的搜索功能
    categoriesTable.search(term).draw();
    
    // 获取过滤后的结果数量
    const filteredCount = categoriesTable.rows({ search: 'applied' }).count();
    
    // 更新UI状态
    $('#categoriesTable').removeClass('loading');
    
    if (term) {
        if (filteredCount > 0) {
            showToast(`Found ${filteredCount} categories matching "${term}"`, 'success');
        } else {
            showToast(`No categories found matching "${term}"`, 'info');
        }
    } else {
        showToast(`Showing all ${allCategoriesData.length} categories`, 'info');
    }
    
    // 更新全选复选框状态
    updateSelectAllCheckboxState();
}

/**
 * Initialize the DataTable
 */
function initializeDataTable() {
    // 如果表格已经初始化，先销毁
    if (categoriesTable) {
        categoriesTable.destroy();
    }
    
    categoriesTable = $('#categoriesTable').DataTable({
        data: allCategoriesData,
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
            { 
                data: 'name', 
                render: function(data, type, row) {
                    if (type === 'display' && data) {
                        // 搜索高亮
                        const searchTerm = categoriesTable ? categoriesTable.search() : '';
                        if (searchTerm && searchTerm.length > 0) {
                            const regex = new RegExp(`(${escapeRegExp(searchTerm)})`, 'gi');
                            return escapeHTML(data).replace(regex, '<span class="search-highlight">$1</span>');
                        }
                    }
                    return escapeHTML(data);
                }
            },
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
            emptyTable: `
                <div class="empty-table-message">
                    <i class="fas fa-folder-open"></i>
                    <p>No categories found</p>
                    <p class="small">Try adding a new category</p>
                </div>
            `,
            info: "Showing _START_ to _END_ of _TOTAL_ categories",
            infoEmpty: "No categories available",
            infoFiltered: "(filtered from _MAX_ total categories)",
            lengthMenu: "Show _MENU_ categories",
            zeroRecords: `
                <div class="empty-table-message">
                    <i class="fas fa-search"></i>
                    <p>No matching categories found</p>
                    <p class="small">Try adjusting your search criteria</p>
                </div>
            `,
            paginate: { 
               first: "&laquo;",
               last: "&raquo;",
               next: "&rsaquo;",
               previous: "&lsaquo;"
            }
        },
        pagingType: "full_numbers", 
        dom: '<"row"<"col-sm-12"tr>>' + 
             '<"row mt-3"<"col-sm-12 col-md-5"i><"col-sm-12 col-md-7"p>>',
        drawCallback: function(settings) {
            // 重新初始化工具提示
            $('[data-bs-toggle="tooltip"]').tooltip('dispose').tooltip();
            // 更新全选复选框状态
            updateSelectAllCheckboxState();
        }
    });
    
    // 隐藏DataTable默认的搜索框，使用我们自定义的搜索框
    $('.dataTables_filter').hide();
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
function populateEditModal(categoryId) {
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

    // 从本地数据查找分类
    const category = allCategoriesData.find(cat => cat.id === categoryId);
    
    if (category) {
        // 尝试在标准选项中找到分类名称
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

        // 如果在标准选项中未找到，假定它是自定义的
        if (!foundStandard && categoryTypeSelect) {
            const customOption = categoryTypeSelect.querySelector('option[value="Custom"]');
            if (customOption) customOption.selected = true;
            if (customCategoryDiv) customCategoryDiv.style.display = 'block';
            if (customCategoryNameInput) customCategoryNameInput.value = category.name;
        } else {
            if (customCategoryDiv) customCategoryDiv.style.display = 'none'; // 如果是标准选项则隐藏
        }

        // 填充描述
        if (categoryDescriptionInput) {
            categoryDescriptionInput.value = category.description || '';
        }

        modal.show();
        showToast('Category loaded for editing', 'success');
    } else {
        showToast('Could not find category with ID: ' + categoryId, 'error');
        isEditMode = false;
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
            
            // 重新加载所有分类数据
            await loadAllCategories();
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
            
            // 从本地数据中移除并更新表格
            allCategoriesData = allCategoriesData.filter(cat => cat.id !== categoryId);
            initializeDataTable();
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
            
            // 重新加载所有分类数据
            await loadAllCategories();
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
 * Debounce function to limit how often a function can run
 * @param {Function} func - The function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @returns {Function} - Debounced function
 */
function debounce(func, wait) {
    let timeout;
    return function(...args) {
        const context = this;
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(context, args), wait);
    };
}

// --- Event Listeners ---
let isEditMode = false;
let currentEditCategoryId = null;

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
            const id = parseInt($(this).data('id'), 10);
            populateEditModal(id);
        } else if ($(this).hasClass('delete-btn')) {
            const id = parseInt($(this).data('id'), 10);
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

    // Search Button Click
    categorySearchBtn?.addEventListener('click', () => {
        const searchTerm = categorySearchInput.value.trim();
        filterCategories(searchTerm);
    });

    // 搜索输入框 - 输入时搜索（使用防抖动提高性能）
    if (categorySearchInput) {
        const debouncedSearch = debounce(() => {
            const searchTerm = categorySearchInput.value.trim();
            filterCategories(searchTerm);
        }, 300); // 300ms防抖时间
        
        categorySearchInput.addEventListener('input', debouncedSearch);
        
        // 回车键立即搜索
        categorySearchInput.addEventListener('keypress', (event) => {
            if (event.key === 'Enter') {
                const searchTerm = categorySearchInput.value.trim();
                filterCategories(searchTerm);
            }
        });
        
        // 添加清除按钮功能
        const clearSearchBtn = document.createElement('button');
        clearSearchBtn.className = 'btn btn-outline-secondary';
        clearSearchBtn.type = 'button';
        clearSearchBtn.innerHTML = '<i class="fas fa-times"></i>';
        clearSearchBtn.title = 'Clear search';
        clearSearchBtn.style.display = 'none';
        
        // 将清除按钮插入到输入组中
        const inputGroup = categorySearchInput.parentElement;
        if (inputGroup && inputGroup.classList.contains('input-group')) {
            inputGroup.insertBefore(clearSearchBtn, categorySearchBtn);
        }
        
        // 根据搜索输入显示/隐藏清除按钮
        categorySearchInput.addEventListener('input', () => {
            clearSearchBtn.style.display = categorySearchInput.value ? 'block' : 'none';
        });
        
        // 点击时清除搜索并重置表格
        clearSearchBtn.addEventListener('click', () => {
            categorySearchInput.value = '';
            filterCategories('');
            clearSearchBtn.style.display = 'none';
        });
    }

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
         const displayedRows = categoriesTable.rows({ search: 'applied' }).nodes();
         const rowCheckboxes = Array.from(displayedRows).map(node => node.querySelector('.row-checkbox'));
         
         rowCheckboxes.forEach(checkbox => {
             if (checkbox) {
                 const categoryId = parseInt(checkbox.value, 10);
                 checkbox.checked = isChecked;
                 if (isChecked) {
                     selectedCategoryIds.add(categoryId);
                 } else {
                     selectedCategoryIds.delete(categoryId);
                 }
             }
         });
         
         updateBatchDeleteButtonVisibility();
     });

     // Batch Delete Button
     batchDeleteBtn?.addEventListener('click', handleBatchDelete);
}

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    loadAllCategories(); // 一次性加载所有分类数据
}); 
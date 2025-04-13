import api from '../../../Common/js/api.js'; // Adjust path as needed

document.addEventListener('DOMContentLoaded', () => {
    const categoryTableBody = document.getElementById('categoryTableBody');
    const pagination = document.getElementById('pagination');
    const categoryModal = new bootstrap.Modal(document.getElementById('categoryModal'));
    const categoryForm = document.getElementById('categoryForm');
    const categoryModalLabel = document.getElementById('categoryModalLabel');
    const categoryIdInput = document.getElementById('categoryId');
    const categoryTypeSelect = document.getElementById('categoryTypeSelect');
    const customCategoryDiv = document.getElementById('customCategoryDiv');
    const customCategoryNameInput = document.getElementById('customCategoryName');
    const saveCategoryBtn = document.getElementById('saveCategoryBtn');
    const addCategoryBtn = document.getElementById('addCategoryBtn');
    const selectAllCheckbox = document.getElementById('selectAllCheckbox');
    const batchDeleteBtn = document.getElementById('batchDeleteBtn');
    const categorySearchInput = document.getElementById('categorySearchInput');
    const categorySearchBtn = document.getElementById('categorySearchBtn');

    let currentPage = 1;
    const pageSize = 10;
    let currentSearchName = '';
    let currentCategory = null; // To store category data being edited

    // --- Data Fetching and Rendering ---

    async function fetchCategories(page = 1, name = '') {
        currentPage = page;
        currentSearchName = name;
        try {
            const response = await api.get('/category/selectPage', {
                params: {
                    pageNum: page,
                    pageSize: pageSize,
                    name: name // Send name for filtering
                }
            });
            if (response.data.code === '200' && response.data.data) {
                renderTable(response.data.data.list);
                renderPagination(response.data.data);
                updateBatchDeleteButtonVisibility(); // Update visibility after fetch
            } else {
                showToast(response.data.msg || 'Failed to load categories.', 'error');
                categoryTableBody.innerHTML = '<tr><td colspan="4" class="text-center">Failed to load data.</td></tr>';
                pagination.innerHTML = '';
            }
        } catch (error) {
            console.error('Error fetching categories:', error);
            showToast('Error fetching categories. Check console.', 'error');
            categoryTableBody.innerHTML = '<tr><td colspan="4" class="text-center">Error loading data.</td></tr>';
            pagination.innerHTML = '';
        }
    }

    function renderTable(categories) {
        categoryTableBody.innerHTML = ''; // Clear existing rows
        if (!categories || categories.length === 0) {
             categoryTableBody.innerHTML = '<tr><td colspan="4" class="text-center">No categories found.</td></tr>';
             return;
        }
        categories.forEach(category => {
            const row = `
                <tr>
                    <td><input type="checkbox" class="row-checkbox" value="${category.id}"></td>
                    <td>${category.id}</td>
                    <td>${escapeHtml(category.name || '')}</td>
                    <td>
                        <button class="btn btn-sm btn-outline-primary edit-btn" data-id="${category.id}"><i class="fas fa-edit"></i></button>
                        <button class="btn btn-sm btn-outline-danger delete-btn" data-id="${category.id}"><i class="fas fa-trash-alt"></i></button>
                    </td>
                </tr>
            `;
            categoryTableBody.insertAdjacentHTML('beforeend', row);
        });

        // Add event listeners for new buttons
        document.querySelectorAll('.edit-btn').forEach(button => {
            button.addEventListener('click', handleEdit);
        });
        document.querySelectorAll('.delete-btn').forEach(button => {
            button.addEventListener('click', handleDelete);
        });
        document.querySelectorAll('.row-checkbox').forEach(checkbox => {
             checkbox.addEventListener('change', updateBatchDeleteButtonVisibility);
        });

        // Ensure selectAllCheckbox state is correct after rendering
        selectAllCheckbox.checked = areAllRowsSelected();
    }

    function renderPagination(pageInfo) {
        pagination.innerHTML = ''; // Clear existing pagination
        const { pageNum, pages, hasPreviousPage, hasNextPage } = pageInfo;

        // Previous Button
        pagination.insertAdjacentHTML('beforeend', `
            <li class="page-item ${!hasPreviousPage ? 'disabled' : ''}">
                <a class="page-link" href="#" data-page="${pageNum - 1}" aria-label="Previous">
                    <span aria-hidden="true">&laquo;</span>
                </a>
            </li>
        `);

        // Page Number Buttons (simplified for brevity, could add more logic for many pages)
         const maxPagesToShow = 5;
         let startPage = Math.max(1, pageNum - Math.floor(maxPagesToShow / 2));
         let endPage = Math.min(pages, startPage + maxPagesToShow - 1);

         if (endPage - startPage + 1 < maxPagesToShow) {
             startPage = Math.max(1, endPage - maxPagesToShow + 1);
         }


         if (startPage > 1) {
             pagination.insertAdjacentHTML('beforeend', `<li class="page-item"><a class="page-link" href="#" data-page="1">1</a></li>`);
             if (startPage > 2) {
                 pagination.insertAdjacentHTML('beforeend', `<li class="page-item disabled"><span class="page-link">...</span></li>`);
             }
         }


        for (let i = startPage; i <= endPage; i++) {
            pagination.insertAdjacentHTML('beforeend', `
                <li class="page-item ${i === pageNum ? 'active' : ''}">
                    <a class="page-link" href="#" data-page="${i}">${i}</a>
                </li>
            `);
        }

         if (endPage < pages) {
            if (endPage < pages - 1) {
                 pagination.insertAdjacentHTML('beforeend', `<li class="page-item disabled"><span class="page-link">...</span></li>`);
             }
             pagination.insertAdjacentHTML('beforeend', `<li class="page-item"><a class="page-link" href="#" data-page="${pages}">${pages}</a></li>`);
         }


        // Next Button
        pagination.insertAdjacentHTML('beforeend', `
            <li class="page-item ${!hasNextPage ? 'disabled' : ''}">
                <a class="page-link" href="#" data-page="${pageNum + 1}" aria-label="Next">
                    <span aria-hidden="true">&raquo;</span>
                </a>
            </li>
        `);

        // Add event listeners for page links
        document.querySelectorAll('.page-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const page = e.target.closest('.page-link').dataset.page;
                 if (page && !e.target.closest('.page-item.disabled')) {
                    fetchCategories(parseInt(page), currentSearchName);
                }
            });
        });
    }

    // --- Modal and Form Handling ---

    function openModal(mode = 'add', category = null) {
        currentCategory = category; // Store the category being edited
        categoryForm.reset(); // Clear previous data
        categoryIdInput.value = ''; // Clear hidden ID
        customCategoryDiv.style.display = 'none'; // Hide custom field initially
        customCategoryNameInput.value = ''; // Clear custom field
        categoryTypeSelect.value = 'Pop'; // Default to first option or a common one

        if (mode === 'edit' && category) {
            categoryModalLabel.textContent = 'Edit Category';
            categoryIdInput.value = category.id;
            // Check if the category name matches a predefined option
            const predefinedOptions = Array.from(categoryTypeSelect.options).map(opt => opt.value);
            if (predefinedOptions.includes(category.name) && category.name !== 'Custom') {
                categoryTypeSelect.value = category.name;
                customCategoryDiv.style.display = 'none';
            } else {
                // If it doesn't match or is named "Custom" (unlikely), set to Custom and fill the input
                categoryTypeSelect.value = 'Custom';
                customCategoryNameInput.value = category.name;
                customCategoryDiv.style.display = 'block';
            }
        } else {
            categoryModalLabel.textContent = 'Add Category';
            // Ensure custom field is hidden for new categories initially
            customCategoryDiv.style.display = 'none';
        }
        categoryModal.show();
    }

    async function handleSave() {
        const id = categoryIdInput.value;
        const selectedType = categoryTypeSelect.value;
        let name = '';

        if (selectedType === 'Custom') {
            name = customCategoryNameInput.value.trim();
            if (!name) {
                showToast('Custom category name cannot be empty.', 'error');
                return;
            }
        } else {
            name = selectedType;
        }

        if (!name) { // Should not happen if logic is correct, but as a safeguard
            showToast('Category name cannot be empty.', 'error');
            return;
        }

        const categoryData = { name };
        let response;

        try {
            if (id) {
                // Update existing category
                categoryData.id = id;
                response = await api.put('/category/update', categoryData);
            } else {
                // Add new category
                response = await api.post('/category/add', categoryData);
            }

            if (response.data.code === '200') {
                showToast(`Category ${id ? 'updated' : 'added'} successfully.`, 'success');
                categoryModal.hide();
                fetchCategories(id ? currentPage : 1, currentSearchName); // Refresh list (go to page 1 on add)
            } else {
                showToast(response.data.msg || `Failed to ${id ? 'update' : 'add'} category.`, 'error');
            }
        } catch (error) {
            console.error('Error saving category:', error);
            showToast(`Error saving category: ${error.message}`, 'error');
        }
    }

    // --- Edit and Delete Handling ---

     async function handleEdit(event) {
        const id = event.target.closest('.edit-btn').dataset.id;
         // Option 1: Fetch fresh data (safer if data might be stale)
         try {
             const response = await api.get(`/category/selectById/${id}`);
             if (response.data.code === '200' && response.data.data) {
                 openModal('edit', response.data.data);
             } else {
                 showToast(response.data.msg || 'Failed to fetch category details.', 'error');
             }
         } catch (error) {
             console.error('Error fetching category for edit:', error);
             showToast('Error fetching category details.', 'error');
         }

        // Option 2: Use data potentially already in the row (faster but less safe)
        // Find the category data associated with the button - requires storing it or reading from the row
        // const row = event.target.closest('tr');
        // const name = row.cells[2].textContent; // Assumes name is in the 3rd cell
        // const categoryData = { id: id, name: name };
        // openModal('edit', categoryData);
    }

    async function handleDelete(event) {
        const id = event.target.closest('.delete-btn').dataset.id;
        if (!confirm(`Are you sure you want to delete category ID ${id}?`)) {
            return;
        }

        try {
            const response = await api.delete(`/category/delete/${id}`);
            if (response.data.code === '200') {
                showToast('Category deleted successfully.', 'success');
                // Determine if we need to go back a page after deletion
                 const checkboxes = document.querySelectorAll('.row-checkbox');
                 if (checkboxes.length === 1 && currentPage > 1) {
                     fetchCategories(currentPage - 1, currentSearchName);
                 } else {
                     fetchCategories(currentPage, currentSearchName);
                 }
            } else {
                showToast(response.data.msg || 'Failed to delete category.', 'error');
            }
        } catch (error) {
            console.error('Error deleting category:', error);
            showToast(`Error deleting category: ${error.message}`, 'error');
        }
    }

     // --- Batch Delete Handling ---

     function getSelectedIds() {
         return Array.from(document.querySelectorAll('.row-checkbox:checked')).map(cb => cb.value);
     }

     function updateBatchDeleteButtonVisibility() {
         const selectedIds = getSelectedIds();
         batchDeleteBtn.style.display = selectedIds.length > 0 ? 'inline-block' : 'none';
         selectAllCheckbox.checked = areAllRowsSelected(); // Update select all based on row checkboxes
     }

    function areAllRowsSelected() {
        const rowCheckboxes = document.querySelectorAll('.row-checkbox');
        if (rowCheckboxes.length === 0) return false; // No rows, nothing selected
        return Array.from(rowCheckboxes).every(cb => cb.checked);
    }


     selectAllCheckbox.addEventListener('change', (event) => {
         const isChecked = event.target.checked;
         document.querySelectorAll('.row-checkbox').forEach(checkbox => {
             checkbox.checked = isChecked;
         });
         updateBatchDeleteButtonVisibility();
     });

    async function handleBatchDelete() {
        const selectedIds = getSelectedIds();
        if (selectedIds.length === 0) {
             showToast('No categories selected for deletion.', 'info');
             return;
         }

         if (!confirm(`Are you sure you want to delete ${selectedIds.length} selected categories?`)) {
             return;
         }

        try {
            const response = await api.delete('/category/delete/batch', { data: selectedIds }); // Send IDs in request body for DELETE
             if (response.data.code === '200') {
                showToast('Selected categories deleted successfully.', 'success');
                selectAllCheckbox.checked = false; // Uncheck master checkbox
                fetchCategories(1, currentSearchName); // Refresh list from page 1 after batch delete
             } else {
                 showToast(response.data.msg || 'Failed to delete categories.', 'error');
             }
         } catch (error) {
            console.error('Error batch deleting categories:', error);
             showToast(`Error deleting categories: ${error.message}`, 'error');
         }
    }

    // --- Search Handling ---
     function handleSearch() {
         const searchTerm = categorySearchInput.value.trim();
         fetchCategories(1, searchTerm); // Start search from page 1
     }


    // --- Utility Functions ---

    function showToast(message, type = 'info') {
        Toastify({
            text: message,
            duration: 3000,
            close: true,
            gravity: "top", // `top` or `bottom`
            position: "right", // `left`, `center` or `right`
            backgroundColor: type === 'success' ? '#28a745' : (type === 'error' ? '#dc3545' : '#17a2b8'), // Bootstrap colors
            stopOnFocus: true, // Prevents dismissing of toast on hover
        }).showToast();
    }

     function escapeHtml(unsafe) {
         if (!unsafe) return '';
         return unsafe
              .replace(/&/g, "&amp;")
              .replace(/</g, "&lt;")
              .replace(/>/g, "&gt;")
              .replace(/"/g, "&quot;")
              .replace(/'/g, "&#039;");
     }


    // --- Event Listeners ---
    addCategoryBtn.addEventListener('click', () => openModal('add'));
    saveCategoryBtn.addEventListener('click', handleSave);
    batchDeleteBtn.addEventListener('click', handleBatchDelete);
    categorySearchBtn.addEventListener('click', handleSearch);
    categorySearchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            handleSearch();
        }
    });

    // Show/hide custom input based on dropdown selection
    categoryTypeSelect.addEventListener('change', (event) => {
        if (event.target.value === 'Custom') {
            customCategoryDiv.style.display = 'block';
            customCategoryNameInput.required = true; // Make custom field required if selected
        } else {
            customCategoryDiv.style.display = 'none';
            customCategoryNameInput.required = false;
            customCategoryNameInput.value = ''; // Clear custom input when switching away
        }
    });

    // Initial data load
    fetchCategories(currentPage, currentSearchName);
}); 
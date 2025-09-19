import { Component } from '../../core/Component.js';
import { CreateBranchWorkflow } from '../../core/workflow/types/CreateBranchWorkflow.js';
import { UpdateBranchWorkflow } from '../../core/workflow/types/UpdateBranchWorkflow.js';
import { DeleteBranchWorkflow } from '../../core/workflow/types/DeleteBranchWorkflow.js';
import { BranchReadWorkflow } from '../../core/workflow/types/BranchReadWorkflow.js';
import { BranchListWorkflow } from '../../core/workflow/types/BranchListWorkflow.js';

/**
 * Branch Management Component
 * Main UI component for managing organization branches
 */
export class BranchManagement extends Component {
    constructor() {
        super();
        this.currentWorkflow = null;
        this.branches = [];
        this.currentBranch = null;
        this.currentView = 'list';
        this.filters = {};
        this.sortOptions = { field: 'branch_name', direction: 'asc' };
        this.pagination = { page: 1, limit: 20 };
    }

    async render() {
        const container = document.createElement('div');
        container.className = 'branch-management-container';
        container.innerHTML = `
            <div class="branch-management-header">
                <h2>Branch Management</h2>
                <div class="branch-actions">
                    <button id="createBranchBtn" class="btn btn-primary">
                        <i class="fas fa-plus"></i> Create New Branch
                    </button>
                    <button id="refreshListBtn" class="btn btn-secondary">
                        <i class="fas fa-sync"></i> Refresh
                    </button>
                    <button id="exportListBtn" class="btn btn-outline">
                        <i class="fas fa-download"></i> Export
                    </button>
                </div>
            </div>

            <div class="branch-management-content">
                <div class="branch-filters-section">
                    <div class="filters-row">
                        <div class="filter-group">
                            <label for="statusFilter">Status:</label>
                            <select id="statusFilter" name="branch_status">
                                <option value="">All Statuses</option>
                                <option value="active">Active</option>
                                <option value="inactive">Inactive</option>
                                <option value="pending">Pending</option>
                                <option value="closed">Closed</option>
                                <option value="suspended">Suspended</option>
                            </select>
                        </div>
                        <div class="filter-group">
                            <label for="regionFilter">Region:</label>
                            <select id="regionFilter" name="region">
                                <option value="">All Regions</option>
                                <option value="North">North</option>
                                <option value="South">South</option>
                                <option value="East">East</option>
                                <option value="West">West</option>
                                <option value="Central">Central</option>
                            </select>
                        </div>
                        <div class="filter-group">
                            <label for="functionFilter">Function:</label>
                            <select id="functionFilter" name="branch_function">
                                <option value="">All Functions</option>
                                <option value="headquarters">Headquarters</option>
                                <option value="regional_office">Regional Office</option>
                                <option value="sales_office">Sales Office</option>
                                <option value="service_center">Service Center</option>
                                <option value="warehouse">Warehouse</option>
                                <option value="manufacturing">Manufacturing</option>
                                <option value="retail_store">Retail Store</option>
                            </select>
                        </div>
                        <div class="filter-group">
                            <label for="searchFilter">Search:</label>
                            <input type="text" id="searchFilter" name="search" placeholder="Search branches...">
                        </div>
                        <div class="filter-actions">
                            <button id="applyFiltersBtn" class="btn btn-primary">Apply</button>
                            <button id="clearFiltersBtn" class="btn btn-secondary">Clear</button>
                        </div>
                    </div>
                </div>

                <div class="branch-list-section">
                    <div class="list-controls">
                        <div class="sort-controls">
                            <label for="sortField">Sort by:</label>
                            <select id="sortField">
                                <option value="branch_name">Branch Name</option>
                                <option value="branch_code">Branch Code</option>
                                <option value="established_date">Established Date</option>
                                <option value="branch_status">Status</option>
                                <option value="region">Region</option>
                            </select>
                            <select id="sortDirection">
                                <option value="asc">Ascending</option>
                                <option value="desc">Descending</option>
                            </select>
                        </div>
                        <div class="view-controls">
                            <button id="listViewBtn" class="btn btn-sm active">
                                <i class="fas fa-list"></i> List
                            </button>
                            <button id="cardViewBtn" class="btn btn-sm">
                                <i class="fas fa-th"></i> Cards
                            </button>
                        </div>
                    </div>

                    <div id="branchListContainer" class="branch-list-container">
                        <div class="loading">Loading branches...</div>
                    </div>

                    <div class="pagination-container">
                        <div class="pagination-info">
                            <span id="paginationInfo">Loading...</span>
                        </div>
                        <div class="pagination-controls">
                            <button id="prevPageBtn" class="btn btn-sm" disabled>
                                <i class="fas fa-chevron-left"></i> Previous
                            </button>
                            <span id="pageNumbers" class="page-numbers"></span>
                            <button id="nextPageBtn" class="btn btn-sm" disabled>
                                Next <i class="fas fa-chevron-right"></i>
                            </button>
                        </div>
                    </div>
                </div>

                <div id="branchDetailsModal" class="modal">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h3 id="modalTitle">Branch Details</h3>
                            <span class="close">&times;</span>
                        </div>
                        <div id="modalBody" class="modal-body">
                            <!-- Branch details will be rendered here -->
                        </div>
                        <div class="modal-footer">
                            <button id="editBranchBtn" class="btn btn-primary">Edit Branch</button>
                            <button id="deleteBranchBtn" class="btn btn-danger">Delete Branch</button>
                            <button class="btn btn-secondary close-modal">Close</button>
                        </div>
                    </div>
                </div>

                <div id="branchFormModal" class="modal">
                    <div class="modal-content large">
                        <div class="modal-header">
                            <h3 id="formModalTitle">Create Branch</h3>
                            <span class="close">&times;</span>
                        </div>
                        <div id="formModalBody" class="modal-body">
                            <!-- Branch form will be rendered here -->
                        </div>
                    </div>
                </div>
            </div>

            <div id="workflowStatus" class="workflow-status hidden">
                <div class="status-content">
                    <div class="status-header">
                        <h4 id="workflowTitle">Workflow Status</h4>
                        <button id="closeWorkflowStatus" class="close-btn">&times;</button>
                    </div>
                    <div id="workflowProgress" class="workflow-progress">
                        <!-- Workflow progress will be rendered here -->
                    </div>
                </div>
            </div>
        `;

        this.setupEventListeners(container);
        this.loadBranchList();

        return container;
    }

    setupEventListeners(container) {
        // Create branch button
        container.querySelector('#createBranchBtn').addEventListener('click', () => {
            this.openCreateBranchForm();
        });

        // Refresh list button
        container.querySelector('#refreshListBtn').addEventListener('click', () => {
            this.refreshBranchList();
        });

        // Export list button
        container.querySelector('#exportListBtn').addEventListener('click', () => {
            this.exportBranchList();
        });

        // Filter controls
        container.querySelector('#applyFiltersBtn').addEventListener('click', () => {
            this.applyFilters();
        });

        container.querySelector('#clearFiltersBtn').addEventListener('click', () => {
            this.clearFilters();
        });

        // Sort controls
        container.querySelector('#sortField').addEventListener('change', () => {
            this.updateSortOptions();
        });

        container.querySelector('#sortDirection').addEventListener('change', () => {
            this.updateSortOptions();
        });

        // View controls
        container.querySelector('#listViewBtn').addEventListener('click', () => {
            this.setViewMode('list');
        });

        container.querySelector('#cardViewBtn').addEventListener('click', () => {
            this.setViewMode('card');
        });

        // Pagination controls
        container.querySelector('#prevPageBtn').addEventListener('click', () => {
            this.goToPreviousPage();
        });

        container.querySelector('#nextPageBtn').addEventListener('click', () => {
            this.goToNextPage();
        });

        // Modal controls
        container.querySelectorAll('.close, .close-modal').forEach(button => {
            button.addEventListener('click', (e) => {
                this.closeModal(e.target.closest('.modal'));
            });
        });

        // Edit and delete buttons in modal
        container.querySelector('#editBranchBtn').addEventListener('click', () => {
            this.openEditBranchForm(this.currentBranch);
        });

        container.querySelector('#deleteBranchBtn').addEventListener('click', () => {
            this.confirmDeleteBranch(this.currentBranch);
        });

        // Workflow status close
        container.querySelector('#closeWorkflowStatus').addEventListener('click', () => {
            this.hideWorkflowStatus();
        });
    }

    async loadBranchList() {
        try {
            this.showLoading('Loading branches...');

            // Create list workflow
            this.currentWorkflow = new BranchListWorkflow(
                `list_${Date.now()}`,
                {
                    filters: this.filters,
                    sortOptions: this.sortOptions,
                    pagination: this.pagination,
                    includeMetrics: true
                }
            );

            // Start the workflow
            await this.currentWorkflow.start(
                this.getCurrentUser(),
                this.getOrganizationContext()
            );

            // Wait for completion
            await this.waitForWorkflowState(['loaded', 'error', 'denied']);

            if (this.currentWorkflow.currentState === 'loaded') {
                this.branches = this.currentWorkflow.context.branches || [];
                this.renderBranchList();
                this.updatePaginationInfo();
            } else if (this.currentWorkflow.currentState === 'error') {
                this.showError('Failed to load branches: ' + this.currentWorkflow.context.error_message);
            } else if (this.currentWorkflow.currentState === 'denied') {
                this.showError('Access denied: ' + this.currentWorkflow.context.denial_reason);
            }

        } catch (error) {
            this.showError('Error loading branches: ' + error.message);
        }
    }

    renderBranchList() {
        const container = document.querySelector('#branchListContainer');

        if (this.branches.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-building fa-3x"></i>
                    <h3>No branches found</h3>
                    <p>No branches match your current filters.</p>
                    <button class="btn btn-primary" onclick="this.clearFilters()">Clear Filters</button>
                </div>
            `;
            return;
        }

        if (this.currentView === 'list') {
            this.renderListView(container);
        } else {
            this.renderCardView(container);
        }
    }

    renderListView(container) {
        const tableHTML = `
            <table class="branch-table">
                <thead>
                    <tr>
                        <th>Code</th>
                        <th>Name</th>
                        <th>Status</th>
                        <th>Region</th>
                        <th>Function</th>
                        <th>Established</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${this.branches.map(branch => `
                        <tr class="branch-row" data-branch-id="${branch.id}">
                            <td class="branch-code">${branch.branch_code}</td>
                            <td class="branch-name">
                                <strong>${branch.branch_name}</strong>
                                ${branch.zone ? `<br><small>Zone: ${branch.zone}</small>` : ''}
                            </td>
                            <td class="branch-status">
                                <span class="status-badge status-${branch.branch_status}">
                                    ${this.getStatusDisplay(branch.branch_status)}
                                </span>
                            </td>
                            <td class="branch-region">${branch.region || '-'}</td>
                            <td class="branch-function">
                                ${this.getFunctionDisplay(branch.branch_function)}
                            </td>
                            <td class="branch-established">
                                ${branch.established_date ? new Date(branch.established_date).toLocaleDateString() : '-'}
                            </td>
                            <td class="branch-actions">
                                <button class="btn btn-sm btn-primary view-branch" data-branch-id="${branch.id}">
                                    <i class="fas fa-eye"></i>
                                </button>
                                <button class="btn btn-sm btn-secondary edit-branch" data-branch-id="${branch.id}">
                                    <i class="fas fa-edit"></i>
                                </button>
                                <button class="btn btn-sm btn-danger delete-branch" data-branch-id="${branch.id}">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;

        container.innerHTML = tableHTML;
        this.setupTableEventListeners(container);
    }

    renderCardView(container) {
        const cardsHTML = `
            <div class="branch-cards">
                ${this.branches.map(branch => `
                    <div class="branch-card" data-branch-id="${branch.id}">
                        <div class="card-header">
                            <h4 class="branch-name">${branch.branch_name}</h4>
                            <span class="status-badge status-${branch.branch_status}">
                                ${this.getStatusDisplay(branch.branch_status)}
                            </span>
                        </div>
                        <div class="card-body">
                            <div class="branch-info">
                                <div class="info-item">
                                    <label>Code:</label>
                                    <span>${branch.branch_code}</span>
                                </div>
                                <div class="info-item">
                                    <label>Region:</label>
                                    <span>${branch.region || '-'}</span>
                                </div>
                                <div class="info-item">
                                    <label>Function:</label>
                                    <span>${this.getFunctionDisplay(branch.branch_function)}</span>
                                </div>
                                <div class="info-item">
                                    <label>Established:</label>
                                    <span>${branch.established_date ? new Date(branch.established_date).toLocaleDateString() : '-'}</span>
                                </div>
                            </div>
                        </div>
                        <div class="card-footer">
                            <button class="btn btn-sm btn-primary view-branch" data-branch-id="${branch.id}">
                                <i class="fas fa-eye"></i> View
                            </button>
                            <button class="btn btn-sm btn-secondary edit-branch" data-branch-id="${branch.id}">
                                <i class="fas fa-edit"></i> Edit
                            </button>
                            <button class="btn btn-sm btn-danger delete-branch" data-branch-id="${branch.id}">
                                <i class="fas fa-trash"></i> Delete
                            </button>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;

        container.innerHTML = cardsHTML;
        this.setupTableEventListeners(container);
    }

    setupTableEventListeners(container) {
        // View branch buttons
        container.querySelectorAll('.view-branch').forEach(button => {
            button.addEventListener('click', (e) => {
                const branchId = e.target.closest('[data-branch-id]').dataset.branchId;
                this.viewBranch(branchId);
            });
        });

        // Edit branch buttons
        container.querySelectorAll('.edit-branch').forEach(button => {
            button.addEventListener('click', (e) => {
                const branchId = e.target.closest('[data-branch-id]').dataset.branchId;
                const branch = this.branches.find(b => b.id === branchId);
                this.openEditBranchForm(branch);
            });
        });

        // Delete branch buttons
        container.querySelectorAll('.delete-branch').forEach(button => {
            button.addEventListener('click', (e) => {
                const branchId = e.target.closest('[data-branch-id]').dataset.branchId;
                const branch = this.branches.find(b => b.id === branchId);
                this.confirmDeleteBranch(branch);
            });
        });

        // Row click for details
        container.querySelectorAll('.branch-row').forEach(row => {
            row.addEventListener('click', (e) => {
                if (!e.target.closest('button')) {
                    const branchId = row.dataset.branchId;
                    this.viewBranch(branchId);
                }
            });
        });
    }

    async viewBranch(branchId) {
        try {
            const branch = this.branches.find(b => b.id === branchId);
            if (!branch) {
                this.showError('Branch not found');
                return;
            }

            // Create read workflow for detailed view
            const readWorkflow = new BranchReadWorkflow(
                `read_${branchId}_${Date.now()}`,
                {
                    branchId: branchId,
                    includeRelated: true,
                    includeSensitive: true
                }
            );

            await readWorkflow.start(
                this.getCurrentUser(),
                this.getOrganizationContext()
            );

            await this.waitForWorkflowState(['loaded', 'error', 'denied'], readWorkflow);

            if (readWorkflow.currentState === 'loaded') {
                this.currentBranch = readWorkflow.context.branchData;
                this.showBranchDetails(this.currentBranch);
            } else {
                this.showError('Failed to load branch details');
            }

        } catch (error) {
            this.showError('Error viewing branch: ' + error.message);
        }
    }

    showBranchDetails(branch) {
        const modal = document.querySelector('#branchDetailsModal');
        const modalBody = modal.querySelector('#modalBody');

        modalBody.innerHTML = `
            <div class="branch-details">
                <div class="details-section">
                    <h4>Basic Information</h4>
                    <div class="details-grid">
                        <div class="detail-item">
                            <label>Branch Code:</label>
                            <span>${branch.branch_code}</span>
                        </div>
                        <div class="detail-item">
                            <label>Branch Name:</label>
                            <span>${branch.branch_name}</span>
                        </div>
                        <div class="detail-item">
                            <label>Status:</label>
                            <span class="status-badge status-${branch.branch_status}">
                                ${this.getStatusDisplay(branch.branch_status)}
                            </span>
                        </div>
                        <div class="detail-item">
                            <label>Function:</label>
                            <span>${this.getFunctionDisplay(branch.branch_function)}</span>
                        </div>
                        <div class="detail-item">
                            <label>Region:</label>
                            <span>${branch.region || '-'}</span>
                        </div>
                        <div class="detail-item">
                            <label>Zone:</label>
                            <span>${branch.zone || '-'}</span>
                        </div>
                        <div class="detail-item">
                            <label>Multiple Buildings:</label>
                            <span>${branch.has_multiple_buildings ? 'Yes' : 'No'}</span>
                        </div>
                    </div>
                </div>

                ${branch.primary_phone_number || branch.primary_email_address ? `
                    <div class="details-section">
                        <h4>Contact Information</h4>
                        <div class="details-grid">
                            ${branch.primary_phone_number ? `
                                <div class="detail-item">
                                    <label>Phone:</label>
                                    <span>${branch.primary_phone_number}</span>
                                </div>
                            ` : ''}
                            ${branch.primary_email_address ? `
                                <div class="detail-item">
                                    <label>Email:</label>
                                    <span>${branch.primary_email_address}</span>
                                </div>
                            ` : ''}
                            ${branch.fax_number ? `
                                <div class="detail-item">
                                    <label>Fax:</label>
                                    <span>${branch.fax_number}</span>
                                </div>
                            ` : ''}
                            ${branch.website ? `
                                <div class="detail-item">
                                    <label>Website:</label>
                                    <span><a href="${branch.website}" target="_blank">${branch.website}</a></span>
                                </div>
                            ` : ''}
                        </div>
                    </div>
                ` : ''}

                <div class="details-section">
                    <h4>Dates</h4>
                    <div class="details-grid">
                        <div class="detail-item">
                            <label>Established:</label>
                            <span>${branch.established_date ? new Date(branch.established_date).toLocaleDateString() : '-'}</span>
                        </div>
                        <div class="detail-item">
                            <label>Activation:</label>
                            <span>${branch.activation_date ? new Date(branch.activation_date).toLocaleDateString() : '-'}</span>
                        </div>
                        ${branch.closure_date ? `
                            <div class="detail-item">
                                <label>Closure:</label>
                                <span>${new Date(branch.closure_date).toLocaleDateString()}</span>
                            </div>
                        ` : ''}
                    </div>
                </div>

                ${branch.purpose_description ? `
                    <div class="details-section">
                        <h4>Purpose</h4>
                        <p>${branch.purpose_description}</p>
                    </div>
                ` : ''}

                ${branch.operating_hours ? `
                    <div class="details-section">
                        <h4>Operating Hours</h4>
                        <div class="operating-hours">
                            ${this.renderOperatingHours(branch.operating_hours)}
                        </div>
                    </div>
                ` : ''}
            </div>
        `;

        this.showModal(modal);
    }

    renderOperatingHours(hours) {
        const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
        const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

        return days.map((day, index) => {
            const dayHours = hours[day];
            if (!dayHours) return '';

            return `
                <div class="operating-day">
                    <span class="day-name">${dayNames[index]}:</span>
                    <span class="day-hours">
                        ${dayHours.closed ? 'Closed' : `${dayHours.open} - ${dayHours.close}`}
                    </span>
                </div>
            `;
        }).join('');
    }

    // Additional helper methods for UI components
    getStatusDisplay(status) {
        const statusMap = {
            'active': '🟢 Active',
            'inactive': '🟡 Inactive',
            'pending': '🟠 Pending',
            'closed': '🔴 Closed',
            'suspended': '⏸️ Suspended'
        };
        return statusMap[status] || status;
    }

    getFunctionDisplay(branchFunction) {
        const functionMap = {
            'headquarters': '🏢 Headquarters',
            'regional_office': '🌍 Regional Office',
            'sales_office': '💼 Sales Office',
            'service_center': '🔧 Service Center',
            'warehouse': '📦 Warehouse',
            'manufacturing': '🏭 Manufacturing',
            'retail_store': '🛍️ Retail Store'
        };
        return functionMap[branchFunction] || branchFunction;
    }

    showModal(modal) {
        modal.classList.add('show');
        document.body.classList.add('modal-open');
    }

    closeModal(modal) {
        modal.classList.remove('show');
        document.body.classList.remove('modal-open');
    }

    showLoading(message) {
        const container = document.querySelector('#branchListContainer');
        container.innerHTML = `<div class="loading">${message}</div>`;
    }

    showError(message) {
        // Implementation would show error notification
        console.error(message);
        alert(message); // Temporary implementation
    }

    getCurrentUser() {
        // Implementation would return current user
        return {
            id: 'user_123',
            username: 'testuser',
            firstName: 'Test',
            lastName: 'User'
        };
    }

    getOrganizationContext() {
        // Implementation would return organization context
        return {
            organizationId: 'org_1',
            positions: [{
                designation: { name: 'Manager' }
            }]
        };
    }

    async waitForWorkflowState(states, workflow = null) {
        const targetWorkflow = workflow || this.currentWorkflow;
        return new Promise((resolve) => {
            const checkState = () => {
                if (states.includes(targetWorkflow.currentState)) {
                    resolve();
                } else {
                    setTimeout(checkState, 100);
                }
            };
            checkState();
        });
    }

    // Placeholder methods for remaining functionality
    async openCreateBranchForm() {
        // Implementation for create form
        console.log('Open create branch form');
    }

    async openEditBranchForm(branch) {
        // Implementation for edit form
        console.log('Open edit branch form', branch);
    }

    async confirmDeleteBranch(branch) {
        // Implementation for delete confirmation
        console.log('Confirm delete branch', branch);
    }

    async refreshBranchList() {
        await this.loadBranchList();
    }

    async exportBranchList() {
        // Implementation for export
        console.log('Export branch list');
    }

    applyFilters() {
        // Implementation for applying filters
        console.log('Apply filters');
    }

    clearFilters() {
        // Implementation for clearing filters
        console.log('Clear filters');
    }

    updateSortOptions() {
        // Implementation for updating sort
        console.log('Update sort options');
    }

    setViewMode(mode) {
        this.currentView = mode;
        this.renderBranchList();
    }

    goToPreviousPage() {
        // Implementation for pagination
        console.log('Go to previous page');
    }

    goToNextPage() {
        // Implementation for pagination
        console.log('Go to next page');
    }

    updatePaginationInfo() {
        // Implementation for updating pagination info
        console.log('Update pagination info');
    }

    showWorkflowStatus() {
        // Implementation for showing workflow status
        console.log('Show workflow status');
    }

    hideWorkflowStatus() {
        // Implementation for hiding workflow status
        console.log('Hide workflow status');
    }
}
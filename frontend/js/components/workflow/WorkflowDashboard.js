import { Component } from "../../core/Component.js";

/**
 * Workflow Dashboard Component
 * Main dashboard for workflow management and overview
 */
export class WorkflowDashboard extends Component {
    constructor(workflowService, user, organizationContext) {
        super();
        this.workflowService = workflowService;
        this.user = user;
        this.organizationContext = organizationContext;
        this.workflows = [];
        this.statistics = {};
        this.currentFilter = 'all';
        this.currentSort = 'updated_desc';
        this.isLoading = false;
    }

    async render() {
        const dashboard = this.createElement("div", "workflow-dashboard");

        dashboard.innerHTML = `
            <div class="dashboard-header">
                <div class="header-content">
                    <h1>Workflow Dashboard</h1>
                    <p>Manage and track your organization's workflows</p>
                </div>
                <div class="header-actions">
                    <button class="btn-primary" id="create-workflow-btn">
                        ➕ Create Workflow
                    </button>
                    <button class="btn-outline" id="refresh-btn">
                        🔄 Refresh
                    </button>
                </div>
            </div>

            <div class="dashboard-stats">
                <div class="stat-card">
                    <div class="stat-icon">📋</div>
                    <div class="stat-content">
                        <div class="stat-value" id="total-workflows">-</div>
                        <div class="stat-label">Total Workflows</div>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon">⏳</div>
                    <div class="stat-content">
                        <div class="stat-value" id="pending-workflows">-</div>
                        <div class="stat-label">Pending Action</div>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon">✅</div>
                    <div class="stat-content">
                        <div class="stat-value" id="completed-workflows">-</div>
                        <div class="stat-label">Completed</div>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon">👤</div>
                    <div class="stat-content">
                        <div class="stat-value" id="my-workflows">-</div>
                        <div class="stat-label">My Workflows</div>
                    </div>
                </div>
            </div>

            <div class="dashboard-filters">
                <div class="filter-group">
                    <label>Filter by Status:</label>
                    <select id="status-filter" class="form-select">
                        <option value="all">All Workflows</option>
                        <option value="pending">Pending Action</option>
                        <option value="in_progress">In Progress</option>
                        <option value="completed">Completed</option>
                        <option value="my_workflows">My Workflows</option>
                    </select>
                </div>
                <div class="filter-group">
                    <label>Sort by:</label>
                    <select id="sort-filter" class="form-select">
                        <option value="updated_desc">Recently Updated</option>
                        <option value="created_desc">Recently Created</option>
                        <option value="priority_desc">Priority</option>
                        <option value="type_asc">Workflow Type</option>
                    </select>
                </div>
                <div class="filter-group">
                    <label>Search:</label>
                    <input type="text" id="search-input" class="form-input" placeholder="Search workflows...">
                </div>
            </div>

            <div class="dashboard-content">
                <div class="workflow-grid" id="workflow-grid">
                    <div class="loading-placeholder" id="loading-placeholder">
                        <div class="spinner"></div>
                        <p>Loading workflows...</p>
                    </div>
                </div>

                <div class="empty-state hidden" id="empty-state">
                    <div class="empty-icon">📋</div>
                    <h3>No Workflows Found</h3>
                    <p>No workflows match your current filters.</p>
                    <button class="btn-primary" id="create-first-workflow">
                        Create Your First Workflow
                    </button>
                </div>
            </div>

            <!-- Create Workflow Modal -->
            <div class="modal-backdrop hidden" id="create-workflow-modal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>Create New Workflow</h3>
                        <button class="modal-close" id="close-modal">&times;</button>
                    </div>
                    <div class="modal-body">
                        <form id="create-workflow-form">
                            <div class="form-group">
                                <label for="workflow-type">Workflow Type</label>
                                <select id="workflow-type" class="form-select" required>
                                    <option value="">Select workflow type...</option>
                                    <option value="HireWorkflow">Hire Workflow</option>
                                    <option value="ExpenseApprovalWorkflow">Expense Approval</option>
                                    <option value="DocumentApprovalWorkflow">Document Approval</option>
                                    <option value="ProjectApprovalWorkflow">Project Approval</option>
                                    <option value="ProcurementWorkflow">Procurement</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label for="workflow-title">Title</label>
                                <input type="text" id="workflow-title" class="form-input" required
                                       placeholder="Enter workflow title...">
                            </div>
                            <div class="form-group">
                                <label for="workflow-description">Description</label>
                                <textarea id="workflow-description" class="form-textarea" rows="3"
                                          placeholder="Enter workflow description..."></textarea>
                            </div>
                            <div class="form-group">
                                <label for="workflow-priority">Priority</label>
                                <select id="workflow-priority" class="form-select">
                                    <option value="normal">Normal</option>
                                    <option value="high">High</option>
                                    <option value="urgent">Urgent</option>
                                </select>
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button class="btn-outline" id="cancel-create">Cancel</button>
                        <button class="btn-primary" id="confirm-create">Create Workflow</button>
                    </div>
                </div>
            </div>
        `;

        this.addEventListeners(dashboard);
        await this.loadWorkflows();

        return dashboard;
    }

    addEventListeners(dashboard) {
        // Create workflow button
        const createBtn = dashboard.querySelector('#create-workflow-btn');
        const createFirstBtn = dashboard.querySelector('#create-first-workflow');

        [createBtn, createFirstBtn].forEach(btn => {
            if (btn) {
                btn.addEventListener('click', () => this.showCreateWorkflowModal());
            }
        });

        // Refresh button
        const refreshBtn = dashboard.querySelector('#refresh-btn');
        refreshBtn.addEventListener('click', () => this.loadWorkflows());

        // Filters
        const statusFilter = dashboard.querySelector('#status-filter');
        statusFilter.addEventListener('change', (e) => {
            this.currentFilter = e.target.value;
            this.filterAndDisplayWorkflows();
        });

        const sortFilter = dashboard.querySelector('#sort-filter');
        sortFilter.addEventListener('change', (e) => {
            this.currentSort = e.target.value;
            this.filterAndDisplayWorkflows();
        });

        const searchInput = dashboard.querySelector('#search-input');
        searchInput.addEventListener('input', (e) => {
            this.searchTerm = e.target.value;
            this.filterAndDisplayWorkflows();
        });

        // Modal controls
        const modal = dashboard.querySelector('#create-workflow-modal');
        const closeModal = dashboard.querySelector('#close-modal');
        const cancelCreate = dashboard.querySelector('#cancel-create');
        const confirmCreate = dashboard.querySelector('#confirm-create');

        [closeModal, cancelCreate].forEach(btn => {
            btn.addEventListener('click', () => this.hideCreateWorkflowModal());
        });

        confirmCreate.addEventListener('click', () => this.handleCreateWorkflow());

        // Close modal on backdrop click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.hideCreateWorkflowModal();
            }
        });
    }

    async loadWorkflows() {
        this.isLoading = true;
        this.showLoading();

        try {
            // Load user workflows
            const userWorkflows = await this.workflowService.getUserWorkflows(
                this.user,
                this.organizationContext
            );

            this.workflows = userWorkflows;

            // Load statistics
            this.statistics = await this.workflowService.getWorkflowStatistics(
                this.organizationContext.organizationId
            );

            this.updateStatistics();
            this.filterAndDisplayWorkflows();

        } catch (error) {
            console.error('Error loading workflows:', error);
            this.showError('Failed to load workflows. Please try again.');
        } finally {
            this.isLoading = false;
            this.hideLoading();
        }
    }

    updateStatistics() {
        const totalElement = document.getElementById('total-workflows');
        const pendingElement = document.getElementById('pending-workflows');
        const completedElement = document.getElementById('completed-workflows');
        const myWorkflowsElement = document.getElementById('my-workflows');

        if (totalElement) totalElement.textContent = this.workflows.length;

        const pendingCount = this.workflows.filter(w =>
            w.availableActions && w.availableActions.length > 0
        ).length;
        if (pendingElement) pendingElement.textContent = pendingCount;

        const completedCount = this.workflows.filter(w =>
            w.workflow.currentState === 'completed' ||
            w.workflow.currentState === 'paid'
        ).length;
        if (completedElement) completedElement.textContent = completedCount;

        const myWorkflowsCount = this.workflows.filter(w => w.isOwner).length;
        if (myWorkflowsElement) myWorkflowsElement.textContent = myWorkflowsCount;
    }

    filterAndDisplayWorkflows() {
        let filteredWorkflows = [...this.workflows];

        // Apply status filter
        switch (this.currentFilter) {
            case 'pending':
                filteredWorkflows = filteredWorkflows.filter(w =>
                    w.availableActions && w.availableActions.length > 0
                );
                break;
            case 'in_progress':
                filteredWorkflows = filteredWorkflows.filter(w =>
                    w.workflow.currentState &&
                    !['completed', 'cancelled', 'rejected', 'paid'].includes(w.workflow.currentState)
                );
                break;
            case 'completed':
                filteredWorkflows = filteredWorkflows.filter(w =>
                    ['completed', 'cancelled', 'rejected', 'paid'].includes(w.workflow.currentState)
                );
                break;
            case 'my_workflows':
                filteredWorkflows = filteredWorkflows.filter(w => w.isOwner);
                break;
        }

        // Apply search filter
        if (this.searchTerm) {
            const term = this.searchTerm.toLowerCase();
            filteredWorkflows = filteredWorkflows.filter(w =>
                w.workflow.id.toLowerCase().includes(term) ||
                w.workflow.type.toLowerCase().includes(term) ||
                (w.workflow.metadata && JSON.stringify(w.workflow.metadata).toLowerCase().includes(term))
            );
        }

        // Apply sorting
        filteredWorkflows.sort((a, b) => {
            switch (this.currentSort) {
                case 'updated_desc':
                    return new Date(b.workflow.updatedAt) - new Date(a.workflow.updatedAt);
                case 'created_desc':
                    return new Date(b.workflow.createdAt) - new Date(a.workflow.createdAt);
                case 'priority_desc':
                    const priorityOrder = { urgent: 3, high: 2, normal: 1 };
                    return (priorityOrder[b.workflow.metadata?.priority] || 1) -
                           (priorityOrder[a.workflow.metadata?.priority] || 1);
                case 'type_asc':
                    return a.workflow.type.localeCompare(b.workflow.type);
                default:
                    return 0;
            }
        });

        this.displayWorkflows(filteredWorkflows);
    }

    displayWorkflows(workflows) {
        const grid = document.getElementById('workflow-grid');
        const emptyState = document.getElementById('empty-state');

        if (workflows.length === 0) {
            grid.innerHTML = '';
            emptyState.classList.remove('hidden');
            return;
        }

        emptyState.classList.add('hidden');
        grid.innerHTML = workflows.map(w => this.renderWorkflowCard(w)).join('');

        // Add click listeners to workflow cards
        grid.querySelectorAll('.workflow-card').forEach(card => {
            card.addEventListener('click', (e) => {
                if (!e.target.closest('.workflow-actions')) {
                    const workflowId = card.dataset.workflowId;
                    this.openWorkflow(workflowId);
                }
            });
        });

        // Add action button listeners
        grid.querySelectorAll('.action-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const workflowId = btn.dataset.workflowId;
                const action = btn.dataset.action;
                this.handleWorkflowAction(workflowId, action);
            });
        });
    }

    renderWorkflowCard(workflowData) {
        const { workflow, availableActions, canEdit, isOwner } = workflowData;
        const priority = workflow.metadata?.priority || 'normal';
        const timeAgo = this.getTimeAgo(workflow.updatedAt);
        const stateClass = this.getStateClass(workflow.currentState);

        return `
            <div class="workflow-card ${priority}" data-workflow-id="${workflow.id}">
                <div class="workflow-header">
                    <div class="workflow-type">${this.formatWorkflowType(workflow.type)}</div>
                    <div class="workflow-priority priority-${priority}">${priority.toUpperCase()}</div>
                </div>

                <div class="workflow-content">
                    <h3 class="workflow-title">${workflow.metadata?.title || workflow.id}</h3>
                    <p class="workflow-description">${workflow.metadata?.description || 'No description'}</p>

                    <div class="workflow-meta">
                        <div class="workflow-state ${stateClass}">
                            <span class="state-indicator"></span>
                            ${this.formatState(workflow.currentState)}
                        </div>
                        <div class="workflow-time">Updated ${timeAgo}</div>
                    </div>

                    ${isOwner ? '<div class="workflow-owner">👤 Owner</div>' : ''}
                </div>

                <div class="workflow-actions">
                    ${availableActions.map(action => `
                        <button class="action-btn btn-sm"
                                data-workflow-id="${workflow.id}"
                                data-action="${action.action}">
                            ${action.label}
                        </button>
                    `).join('')}

                    <button class="action-btn btn-outline btn-sm"
                            data-workflow-id="${workflow.id}"
                            data-action="view">
                        👁️ View
                    </button>
                </div>
            </div>
        `;
    }

    formatWorkflowType(type) {
        return type.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()).trim();
    }

    formatState(state) {
        if (!state) return 'Unknown';
        return state.replace(/_/g, ' ').replace(/^./, str => str.toUpperCase());
    }

    getStateClass(state) {
        if (['completed', 'paid'].includes(state)) return 'state-completed';
        if (['rejected', 'cancelled'].includes(state)) return 'state-rejected';
        if (['pending_approval', 'submitted', 'posted'].includes(state)) return 'state-pending';
        return 'state-in-progress';
    }

    getTimeAgo(timestamp) {
        const now = new Date();
        const time = new Date(timestamp);
        const diffMs = now - time;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 30) return `${diffDays}d ago`;
        return time.toLocaleDateString();
    }

    showCreateWorkflowModal() {
        const modal = document.getElementById('create-workflow-modal');
        modal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    }

    hideCreateWorkflowModal() {
        const modal = document.getElementById('create-workflow-modal');
        modal.classList.add('hidden');
        document.body.style.overflow = '';

        // Reset form
        const form = document.getElementById('create-workflow-form');
        form.reset();
    }

    async handleCreateWorkflow() {
        const form = document.getElementById('create-workflow-form');
        const formData = new FormData(form);

        const workflowData = {
            type: document.getElementById('workflow-type').value,
            title: document.getElementById('workflow-title').value,
            description: document.getElementById('workflow-description').value,
            priority: document.getElementById('workflow-priority').value
        };

        if (!workflowData.type || !workflowData.title) {
            this.showError('Please fill in all required fields.');
            return;
        }

        try {
            const workflowId = `${workflowData.type.toLowerCase()}_${Date.now()}`;

            const workflow = await this.workflowService.createWorkflow(
                workflowData.type,
                workflowId,
                this.user,
                this.organizationContext,
                {
                    metadata: {
                        title: workflowData.title,
                        description: workflowData.description,
                        priority: workflowData.priority
                    }
                }
            );

            this.hideCreateWorkflowModal();
            await this.loadWorkflows();
            this.showSuccess(`Workflow "${workflowData.title}" created successfully!`);

            // Navigate to the new workflow
            setTimeout(() => {
                this.openWorkflow(workflowId);
            }, 1000);

        } catch (error) {
            console.error('Error creating workflow:', error);
            this.showError('Failed to create workflow. Please try again.');
        }
    }

    async handleWorkflowAction(workflowId, action) {
        if (action === 'view') {
            this.openWorkflow(workflowId);
            return;
        }

        try {
            // Find the workflow and action details
            const workflowData = this.workflows.find(w => w.workflow.id === workflowId);
            const actionData = workflowData?.availableActions.find(a => a.action === action);

            if (!actionData) {
                this.showError('Action not available.');
                return;
            }

            // Confirm if required
            if (actionData.requiresConfirmation) {
                if (!confirm(`Are you sure you want to ${actionData.label.toLowerCase()}?`)) {
                    return;
                }
            }

            // Execute the action
            await this.workflowService.executeWorkflowAction(
                workflowId,
                actionData.target,
                this.user,
                this.organizationContext,
                {}
            );

            await this.loadWorkflows();
            this.showSuccess(`Action "${actionData.label}" executed successfully!`);

        } catch (error) {
            console.error('Error executing workflow action:', error);
            this.showError('Failed to execute action. Please try again.');
        }
    }

    openWorkflow(workflowId) {
        window.location.hash = `#workflows/${workflowId}`;
    }

    showLoading() {
        const loading = document.getElementById('loading-placeholder');
        const grid = document.getElementById('workflow-grid');

        if (loading && grid) {
            grid.innerHTML = '';
            loading.classList.remove('hidden');
        }
    }

    hideLoading() {
        const loading = document.getElementById('loading-placeholder');
        if (loading) {
            loading.classList.add('hidden');
        }
    }

    showError(message) {
        // Simple error display - in a real app, use a proper notification system
        alert(message);
    }

    showSuccess(message) {
        // Simple success display - in a real app, use a proper notification system
        alert(message);
    }
}
import { Component } from '../../core/Component.js';
import { organizationService } from '../../core/OrganizationService.js';
import { WorkflowEngine } from '../../core/workflow/WorkflowEngine.js';

/**
 * Organization Details Component
 * Displays comprehensive organization information and workflow listings
 */
export class OrganizationDetails extends Component {
    constructor() {
        super();
        this.organization = null;
        this.workflows = [];
        this.workflowStats = {};
        this.activeTab = 'overview';
        this.workflowFilters = {
            status: '',
            type: '',
            timeframe: '30days'
        };
    }

    async render() {
        // Load organization data
        await this.loadOrganizationData();

        const container = document.createElement('div');
        container.className = 'organization-details-container';
        container.innerHTML = `
            <div class="organization-header">
                <div class="org-header-content">
                    <div class="org-header-left">
                        <div class="org-avatar-large">
                            ${this.getOrgInitials(this.organization?.name || '')}
                        </div>
                        <div class="org-header-info">
                            <h1 class="org-name">${this.organization?.name || 'Organization'}</h1>
                            <p class="org-tagline">${this.organization?.tag_line || 'No tagline available'}</p>
                            <div class="org-meta">
                                <span class="org-type">
                                    <i class="fas fa-building"></i>
                                    ${this.organization?.type || 'Unknown Type'}
                                </span>
                                <span class="org-id">
                                    <i class="fas fa-id-badge"></i>
                                    ID: ${this.organization?.id || 'N/A'}
                                </span>
                            </div>
                        </div>
                    </div>
                    <div class="org-header-actions">
                        <button id="editOrgBtn" class="btn btn-primary">
                            <i class="fas fa-edit"></i> Edit Organization
                        </button>
                        <button id="manageUsersBtn" class="btn btn-secondary">
                            <i class="fas fa-users"></i> Manage Users
                        </button>
                        <button id="settingsBtn" class="btn btn-outline">
                            <i class="fas fa-cog"></i> Settings
                        </button>
                    </div>
                </div>
            </div>

            <div class="organization-content">
                <div class="org-tabs">
                    <button class="tab-btn active" data-tab="overview">
                        <i class="fas fa-chart-line"></i>
                        Overview
                    </button>
                    <button class="tab-btn" data-tab="workflows">
                        <i class="fas fa-project-diagram"></i>
                        Workflows
                        <span class="tab-badge">${this.workflows.length}</span>
                    </button>
                    <button class="tab-btn" data-tab="branches">
                        <i class="fas fa-map-marker-alt"></i>
                        Branches
                    </button>
                    <button class="tab-btn" data-tab="users">
                        <i class="fas fa-users"></i>
                        Users
                    </button>
                    <button class="tab-btn" data-tab="analytics">
                        <i class="fas fa-analytics"></i>
                        Analytics
                    </button>
                </div>

                <div class="tab-content">
                    <div id="overviewTab" class="tab-panel active">
                        ${this.renderOverviewTab()}
                    </div>

                    <div id="workflowsTab" class="tab-panel">
                        ${this.renderWorkflowsTab()}
                    </div>

                    <div id="branchesTab" class="tab-panel">
                        ${this.renderBranchesTab()}
                    </div>

                    <div id="usersTab" class="tab-panel">
                        ${this.renderUsersTab()}
                    </div>

                    <div id="analyticsTab" class="tab-panel">
                        ${this.renderAnalyticsTab()}
                    </div>
                </div>
            </div>
        `;

        this.setupEventListeners(container);
        return container;
    }

    renderOverviewTab() {
        return `
            <div class="overview-content">
                <div class="overview-cards">
                    <div class="overview-card">
                        <div class="card-icon">
                            <i class="fas fa-project-diagram"></i>
                        </div>
                        <div class="card-content">
                            <h3>${this.workflowStats.totalWorkflows || 0}</h3>
                            <p>Total Workflows</p>
                            <small class="text-success">
                                ${this.workflowStats.activeWorkflows || 0} active
                            </small>
                        </div>
                    </div>

                    <div class="overview-card">
                        <div class="card-icon">
                            <i class="fas fa-map-marker-alt"></i>
                        </div>
                        <div class="card-content">
                            <h3>${this.organization?.branches?.length || 0}</h3>
                            <p>Branches</p>
                            <small class="text-info">
                                ${this.getActiveBranchCount()} active
                            </small>
                        </div>
                    </div>

                    <div class="overview-card">
                        <div class="card-icon">
                            <i class="fas fa-users"></i>
                        </div>
                        <div class="card-content">
                            <h3>${this.organization?.users?.length || 0}</h3>
                            <p>Users</p>
                            <small class="text-primary">
                                ${this.getActiveUserCount()} active
                            </small>
                        </div>
                    </div>

                    <div class="overview-card">
                        <div class="card-icon">
                            <i class="fas fa-chart-line"></i>
                        </div>
                        <div class="card-content">
                            <h3>${this.workflowStats.completionRate || 0}%</h3>
                            <p>Completion Rate</p>
                            <small class="text-success">
                                Last 30 days
                            </small>
                        </div>
                    </div>
                </div>

                <div class="overview-sections">
                    <div class="overview-left">
                        <div class="section-card">
                            <h3>Organization Information</h3>
                            <div class="org-details-grid">
                                <div class="detail-item">
                                    <label>Organization ID:</label>
                                    <span>${this.organization?.id || 'N/A'}</span>
                                </div>
                                <div class="detail-item">
                                    <label>Name:</label>
                                    <span>${this.organization?.name || 'N/A'}</span>
                                </div>
                                <div class="detail-item">
                                    <label>Type:</label>
                                    <span>${this.organization?.type || 'N/A'}</span>
                                </div>
                                <div class="detail-item">
                                    <label>Tagline:</label>
                                    <span>${this.organization?.tag_line || 'Not set'}</span>
                                </div>
                                <div class="detail-item">
                                    <label>Created:</label>
                                    <span>${this.organization?.created_at ? new Date(this.organization.created_at).toLocaleDateString() : 'N/A'}</span>
                                </div>
                                <div class="detail-item">
                                    <label>Status:</label>
                                    <span class="status-badge status-${this.organization?.status || 'unknown'}">
                                        ${this.getStatusDisplay(this.organization?.status)}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div class="section-card">
                            <h3>Recent Activity</h3>
                            <div class="activity-list">
                                ${this.renderRecentActivity()}
                            </div>
                        </div>
                    </div>

                    <div class="overview-right">
                        <div class="section-card">
                            <h3>Workflow Status Distribution</h3>
                            <div class="workflow-status-chart">
                                ${this.renderWorkflowStatusChart()}
                            </div>
                        </div>

                        <div class="section-card">
                            <h3>Quick Actions</h3>
                            <div class="quick-actions">
                                <button class="quick-action-btn" onclick="this.createNewWorkflow()">
                                    <i class="fas fa-plus"></i>
                                    Create Workflow
                                </button>
                                <button class="quick-action-btn" onclick="this.manageBranches()">
                                    <i class="fas fa-map-marker-alt"></i>
                                    Manage Branches
                                </button>
                                <button class="quick-action-btn" onclick="this.generateReport()">
                                    <i class="fas fa-file-alt"></i>
                                    Generate Report
                                </button>
                                <button class="quick-action-btn" onclick="this.viewAnalytics()">
                                    <i class="fas fa-chart-bar"></i>
                                    View Analytics
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    renderWorkflowsTab() {
        return `
            <div class="workflows-content">
                <div class="workflows-header">
                    <div class="workflows-title">
                        <h3>Organization Workflows</h3>
                        <p>Manage and monitor all workflows within this organization</p>
                    </div>
                    <div class="workflows-actions">
                        <button id="createWorkflowBtn" class="btn btn-primary">
                            <i class="fas fa-plus"></i> Create Workflow
                        </button>
                        <button id="exportWorkflowsBtn" class="btn btn-outline">
                            <i class="fas fa-download"></i> Export
                        </button>
                    </div>
                </div>

                <div class="workflows-filters">
                    <div class="filter-group">
                        <label for="statusFilter">Status:</label>
                        <select id="statusFilter" name="status">
                            <option value="">All Statuses</option>
                            <option value="running">Running</option>
                            <option value="completed">Completed</option>
                            <option value="paused">Paused</option>
                            <option value="failed">Failed</option>
                            <option value="cancelled">Cancelled</option>
                        </select>
                    </div>
                    <div class="filter-group">
                        <label for="typeFilter">Type:</label>
                        <select id="typeFilter" name="type">
                            <option value="">All Types</option>
                            <option value="CreateBranchWorkflow">Create Branch</option>
                            <option value="UpdateBranchWorkflow">Update Branch</option>
                            <option value="DeleteBranchWorkflow">Delete Branch</option>
                            <option value="HireWorkflow">Hire Employee</option>
                            <option value="ExpenseApprovalWorkflow">Expense Approval</option>
                        </select>
                    </div>
                    <div class="filter-group">
                        <label for="timeframeFilter">Timeframe:</label>
                        <select id="timeframeFilter" name="timeframe">
                            <option value="7days">Last 7 days</option>
                            <option value="30days" selected>Last 30 days</option>
                            <option value="90days">Last 90 days</option>
                            <option value="6months">Last 6 months</option>
                            <option value="1year">Last year</option>
                            <option value="all">All time</option>
                        </select>
                    </div>
                    <div class="filter-actions">
                        <button id="applyWorkflowFiltersBtn" class="btn btn-primary">Apply</button>
                        <button id="clearWorkflowFiltersBtn" class="btn btn-secondary">Clear</button>
                    </div>
                </div>

                <div class="workflows-stats">
                    <div class="stat-item">
                        <span class="stat-value">${this.workflowStats.totalWorkflows || 0}</span>
                        <span class="stat-label">Total Workflows</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-value">${this.workflowStats.activeWorkflows || 0}</span>
                        <span class="stat-label">Active</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-value">${this.workflowStats.completedWorkflows || 0}</span>
                        <span class="stat-label">Completed</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-value">${this.workflowStats.failedWorkflows || 0}</span>
                        <span class="stat-label">Failed</span>
                    </div>
                </div>

                <div class="workflows-list">
                    ${this.renderWorkflowList()}
                </div>

                <div class="workflows-pagination">
                    <div class="pagination-info">
                        Showing ${this.workflows.length} workflows
                    </div>
                    <div class="pagination-controls">
                        <button class="btn btn-sm" disabled>
                            <i class="fas fa-chevron-left"></i> Previous
                        </button>
                        <span class="page-numbers">
                            <span class="page-number active">1</span>
                        </span>
                        <button class="btn btn-sm" disabled>
                            Next <i class="fas fa-chevron-right"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    renderWorkflowList() {
        if (this.workflows.length === 0) {
            return `
                <div class="empty-state">
                    <i class="fas fa-project-diagram fa-3x"></i>
                    <h3>No workflows found</h3>
                    <p>No workflows match your current filters or this organization has no workflows yet.</p>
                    <button class="btn btn-primary" onclick="this.createNewWorkflow()">
                        Create Your First Workflow
                    </button>
                </div>
            `;
        }

        return `
            <table class="workflows-table">
                <thead>
                    <tr>
                        <th>Workflow ID</th>
                        <th>Type</th>
                        <th>Status</th>
                        <th>Created</th>
                        <th>Duration</th>
                        <th>Progress</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${this.workflows.map(workflow => `
                        <tr class="workflow-row" data-workflow-id="${workflow.id}">
                            <td class="workflow-id">
                                <span class="id-text">${workflow.id}</span>
                                <small class="workflow-description">${workflow.description || ''}</small>
                            </td>
                            <td class="workflow-type">
                                <span class="type-badge type-${workflow.type.toLowerCase().replace(/workflow$/, '')}">
                                    ${this.getWorkflowTypeDisplay(workflow.type)}
                                </span>
                            </td>
                            <td class="workflow-status">
                                <span class="status-badge status-${workflow.currentState}">
                                    ${this.getWorkflowStatusDisplay(workflow.currentState)}
                                </span>
                            </td>
                            <td class="workflow-created">
                                ${new Date(workflow.createdAt).toLocaleDateString()}
                                <small>${new Date(workflow.createdAt).toLocaleTimeString()}</small>
                            </td>
                            <td class="workflow-duration">
                                ${this.formatDuration(workflow.duration || 0)}
                            </td>
                            <td class="workflow-progress">
                                <div class="progress-bar-small">
                                    <div class="progress-fill" style="width: ${workflow.progress || 0}%"></div>
                                </div>
                                <span class="progress-text">${workflow.progress || 0}%</span>
                            </td>
                            <td class="workflow-actions">
                                <button class="btn btn-sm btn-primary view-workflow" data-workflow-id="${workflow.id}">
                                    <i class="fas fa-eye"></i>
                                </button>
                                <button class="btn btn-sm btn-secondary edit-workflow" data-workflow-id="${workflow.id}">
                                    <i class="fas fa-edit"></i>
                                </button>
                                ${workflow.currentState === 'running' ? `
                                    <button class="btn btn-sm btn-warning pause-workflow" data-workflow-id="${workflow.id}">
                                        <i class="fas fa-pause"></i>
                                    </button>
                                ` : ''}
                                <button class="btn btn-sm btn-danger delete-workflow" data-workflow-id="${workflow.id}">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    }

    renderBranchesTab() {
        const branches = this.organization?.branches || [];
        return `
            <div class="branches-content">
                <div class="branches-header">
                    <div class="branches-title">
                        <h3>Organization Branches</h3>
                        <p>Manage all branches within this organization</p>
                    </div>
                    <div class="branches-actions">
                        <button class="btn btn-primary" onclick="this.openBranchManagement()">
                            <i class="fas fa-cog"></i> Manage Branches
                        </button>
                    </div>
                </div>

                <div class="branches-grid">
                    ${branches.map(branch => `
                        <div class="branch-card">
                            <div class="branch-header">
                                <h4>${branch.name}</h4>
                                <span class="status-badge status-${branch.status}">
                                    ${this.getStatusDisplay(branch.status)}
                                </span>
                            </div>
                            <div class="branch-details">
                                <div class="detail-item">
                                    <label>Code:</label>
                                    <span>${branch.code}</span>
                                </div>
                                <div class="detail-item">
                                    <label>Region:</label>
                                    <span>${branch.region || 'N/A'}</span>
                                </div>
                                <div class="detail-item">
                                    <label>Type:</label>
                                    <span>${branch.type || 'N/A'}</span>
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>

                ${branches.length === 0 ? `
                    <div class="empty-state">
                        <i class="fas fa-map-marker-alt fa-3x"></i>
                        <h3>No branches found</h3>
                        <p>This organization doesn't have any branches yet.</p>
                    </div>
                ` : ''}
            </div>
        `;
    }

    renderUsersTab() {
        const users = this.organization?.users || [];
        return `
            <div class="users-content">
                <div class="users-header">
                    <div class="users-title">
                        <h3>Organization Users</h3>
                        <p>Manage user access and permissions</p>
                    </div>
                    <div class="users-actions">
                        <button class="btn btn-primary">
                            <i class="fas fa-plus"></i> Invite User
                        </button>
                    </div>
                </div>

                <div class="users-list">
                    ${users.map(user => `
                        <div class="user-card">
                            <div class="user-avatar">
                                ${this.getUserInitials(user.firstName, user.lastName)}
                            </div>
                            <div class="user-info">
                                <h4>${user.firstName} ${user.lastName}</h4>
                                <p>${user.email}</p>
                                <small>${user.role || 'User'}</small>
                            </div>
                            <div class="user-status">
                                <span class="status-badge status-${user.status || 'active'}">
                                    ${this.getStatusDisplay(user.status || 'active')}
                                </span>
                            </div>
                        </div>
                    `).join('')}
                </div>

                ${users.length === 0 ? `
                    <div class="empty-state">
                        <i class="fas fa-users fa-3x"></i>
                        <h3>No users found</h3>
                        <p>This organization doesn't have any users yet.</p>
                    </div>
                ` : ''}
            </div>
        `;
    }

    renderAnalyticsTab() {
        return `
            <div class="analytics-content">
                <div class="analytics-header">
                    <h3>Organization Analytics</h3>
                    <p>Performance metrics and insights</p>
                </div>

                <div class="analytics-cards">
                    <div class="analytics-card">
                        <h4>Workflow Performance</h4>
                        <div class="metric-large">
                            ${this.workflowStats.avgCompletionTime || 0}h
                        </div>
                        <p>Average completion time</p>
                    </div>

                    <div class="analytics-card">
                        <h4>Success Rate</h4>
                        <div class="metric-large">
                            ${this.workflowStats.successRate || 0}%
                        </div>
                        <p>Workflow success rate</p>
                    </div>

                    <div class="analytics-card">
                        <h4>Active Users</h4>
                        <div class="metric-large">
                            ${this.getActiveUserCount()}
                        </div>
                        <p>Users active this month</p>
                    </div>

                    <div class="analytics-card">
                        <h4>Growth Rate</h4>
                        <div class="metric-large">
                            +12%
                        </div>
                        <p>Month over month</p>
                    </div>
                </div>

                <div class="analytics-placeholder">
                    <i class="fas fa-chart-line fa-3x"></i>
                    <h3>Advanced Analytics Coming Soon</h3>
                    <p>Detailed charts and reporting features will be available here.</p>
                </div>
            </div>
        `;
    }

    renderRecentActivity() {
        const activities = [
            {
                type: 'workflow_created',
                description: 'New branch creation workflow started',
                time: '2 hours ago',
                user: 'John Doe'
            },
            {
                type: 'user_added',
                description: 'New user invited to organization',
                time: '4 hours ago',
                user: 'Admin'
            },
            {
                type: 'workflow_completed',
                description: 'Employee hire workflow completed',
                time: '1 day ago',
                user: 'Jane Smith'
            }
        ];

        return activities.map(activity => `
            <div class="activity-item">
                <div class="activity-icon">
                    <i class="fas ${this.getActivityIcon(activity.type)}"></i>
                </div>
                <div class="activity-content">
                    <p>${activity.description}</p>
                    <small>${activity.time} by ${activity.user}</small>
                </div>
            </div>
        `).join('');
    }

    renderWorkflowStatusChart() {
        const statusCounts = this.getWorkflowStatusCounts();
        return `
            <div class="status-chart">
                ${Object.entries(statusCounts).map(([status, count]) => `
                    <div class="status-item">
                        <span class="status-label">${status}</span>
                        <div class="status-bar">
                            <div class="status-fill status-${status}" style="width: ${(count / this.workflows.length) * 100}%"></div>
                        </div>
                        <span class="status-count">${count}</span>
                    </div>
                `).join('')}
            </div>
        `;
    }

    async loadOrganizationData() {
        try {
            // Get current organization
            this.organization = organizationService.getCurrentOrganization();

            // Load workflows for this organization
            await this.loadOrganizationWorkflows();

            // Calculate workflow statistics
            this.calculateWorkflowStats();

        } catch (error) {
            console.error('Error loading organization data:', error);
            this.organization = {
                id: 'unknown',
                name: 'Unknown Organization',
                tag_line: 'Unable to load organization data'
            };
        }
    }

    async loadOrganizationWorkflows() {
        // In a real implementation, this would fetch from a workflow service
        // For now, we'll simulate some workflow data
        this.workflows = [
            {
                id: 'wf_001',
                type: 'CreateBranchWorkflow',
                currentState: 'completed',
                createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
                duration: 45000,
                progress: 100,
                description: 'Create new regional office'
            },
            {
                id: 'wf_002',
                type: 'HireWorkflow',
                currentState: 'running',
                createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
                duration: 7200000,
                progress: 65,
                description: 'Hire senior developer'
            },
            {
                id: 'wf_003',
                type: 'ExpenseApprovalWorkflow',
                currentState: 'paused',
                createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000),
                duration: 3600000,
                progress: 30,
                description: 'Equipment purchase approval'
            }
        ];
    }

    calculateWorkflowStats() {
        const total = this.workflows.length;
        const active = this.workflows.filter(w => w.currentState === 'running').length;
        const completed = this.workflows.filter(w => w.currentState === 'completed').length;
        const failed = this.workflows.filter(w => w.currentState === 'failed').length;

        this.workflowStats = {
            totalWorkflows: total,
            activeWorkflows: active,
            completedWorkflows: completed,
            failedWorkflows: failed,
            completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
            successRate: total > 0 ? Math.round(((completed) / total) * 100) : 0,
            avgCompletionTime: this.calculateAverageCompletionTime()
        };
    }

    calculateAverageCompletionTime() {
        const completedWorkflows = this.workflows.filter(w => w.currentState === 'completed');
        if (completedWorkflows.length === 0) return 0;

        const totalTime = completedWorkflows.reduce((sum, w) => sum + (w.duration || 0), 0);
        return Math.round((totalTime / completedWorkflows.length) / (1000 * 60 * 60)); // Convert to hours
    }

    setupEventListeners(container) {
        // Tab switching
        container.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const tabName = btn.dataset.tab;
                this.switchTab(tabName);
            });
        });

        // Header action buttons
        container.querySelector('#editOrgBtn')?.addEventListener('click', () => {
            this.editOrganization();
        });

        container.querySelector('#manageUsersBtn')?.addEventListener('click', () => {
            this.manageUsers();
        });

        container.querySelector('#settingsBtn')?.addEventListener('click', () => {
            this.openSettings();
        });

        // Workflow actions
        container.querySelector('#createWorkflowBtn')?.addEventListener('click', () => {
            this.createNewWorkflow();
        });

        // Filter actions
        container.querySelector('#applyWorkflowFiltersBtn')?.addEventListener('click', () => {
            this.applyWorkflowFilters();
        });

        container.querySelector('#clearWorkflowFiltersBtn')?.addEventListener('click', () => {
            this.clearWorkflowFilters();
        });

        // Workflow table actions
        this.setupWorkflowTableListeners(container);
    }

    setupWorkflowTableListeners(container) {
        container.querySelectorAll('.view-workflow').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const workflowId = e.target.closest('[data-workflow-id]').dataset.workflowId;
                this.viewWorkflow(workflowId);
            });
        });

        container.querySelectorAll('.edit-workflow').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const workflowId = e.target.closest('[data-workflow-id]').dataset.workflowId;
                this.editWorkflow(workflowId);
            });
        });

        container.querySelectorAll('.pause-workflow').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const workflowId = e.target.closest('[data-workflow-id]').dataset.workflowId;
                this.pauseWorkflow(workflowId);
            });
        });

        container.querySelectorAll('.delete-workflow').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const workflowId = e.target.closest('[data-workflow-id]').dataset.workflowId;
                this.deleteWorkflow(workflowId);
            });
        });
    }

    switchTab(tabName) {
        this.activeTab = tabName;

        // Update tab buttons
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabName);
        });

        // Update tab panels
        document.querySelectorAll('.tab-panel').forEach(panel => {
            panel.classList.remove('active');
        });
        document.querySelector(`#${tabName}Tab`).classList.add('active');
    }

    // Helper methods
    getOrgInitials(name) {
        return name.split(' ')
            .map(word => word[0])
            .join('')
            .slice(0, 2)
            .toUpperCase();
    }

    getUserInitials(firstName, lastName) {
        const first = firstName?.[0] || '';
        const last = lastName?.[0] || '';
        return (first + last).toUpperCase() || 'U';
    }

    getStatusDisplay(status) {
        const statusMap = {
            'active': '🟢 Active',
            'inactive': '🟡 Inactive',
            'pending': '🟠 Pending',
            'completed': '✅ Completed',
            'running': '▶️ Running',
            'paused': '⏸️ Paused',
            'failed': '❌ Failed',
            'cancelled': '🚫 Cancelled'
        };
        return statusMap[status] || status;
    }

    getWorkflowTypeDisplay(type) {
        return type.replace(/Workflow$/, '').replace(/([A-Z])/g, ' $1').trim();
    }

    getWorkflowStatusDisplay(status) {
        return status.charAt(0).toUpperCase() + status.slice(1);
    }

    formatDuration(ms) {
        if (ms < 60000) return `${Math.round(ms / 1000)}s`;
        if (ms < 3600000) return `${Math.round(ms / 60000)}m`;
        return `${Math.round(ms / 3600000)}h`;
    }

    getActiveBranchCount() {
        return (this.organization?.branches || []).filter(b => b.status === 'active').length;
    }

    getActiveUserCount() {
        return (this.organization?.users || []).filter(u => u.status === 'active').length;
    }

    getActivityIcon(type) {
        const iconMap = {
            'workflow_created': 'fa-plus',
            'workflow_completed': 'fa-check',
            'user_added': 'fa-user-plus',
            'branch_created': 'fa-map-marker-alt'
        };
        return iconMap[type] || 'fa-info';
    }

    getWorkflowStatusCounts() {
        const counts = {};
        this.workflows.forEach(workflow => {
            counts[workflow.currentState] = (counts[workflow.currentState] || 0) + 1;
        });
        return counts;
    }

    // Action methods (placeholders for full implementation)
    editOrganization() {
        console.log('Edit organization');
        // Implementation would open organization edit form
    }

    manageUsers() {
        console.log('Manage users');
        // Implementation would navigate to user management
    }

    openSettings() {
        console.log('Open settings');
        // Implementation would open organization settings
    }

    createNewWorkflow() {
        console.log('Create new workflow');
        // Implementation would open workflow creation wizard
    }

    viewWorkflow(workflowId) {
        console.log('View workflow:', workflowId);
        // Implementation would open workflow details
    }

    editWorkflow(workflowId) {
        console.log('Edit workflow:', workflowId);
        // Implementation would open workflow editor
    }

    pauseWorkflow(workflowId) {
        console.log('Pause workflow:', workflowId);
        // Implementation would pause the workflow
    }

    deleteWorkflow(workflowId) {
        console.log('Delete workflow:', workflowId);
        // Implementation would delete the workflow
    }

    applyWorkflowFilters() {
        // Get filter values and reload workflows
        console.log('Apply workflow filters');
    }

    clearWorkflowFilters() {
        // Clear all filters and reload
        console.log('Clear workflow filters');
    }

    openBranchManagement() {
        // Navigate to branch management
        window.location.hash = '#branch-management';
    }

    manageBranches() {
        this.openBranchManagement();
    }

    generateReport() {
        console.log('Generate report');
        // Implementation would generate organization report
    }

    viewAnalytics() {
        this.switchTab('analytics');
    }
}
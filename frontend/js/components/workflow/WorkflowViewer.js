import { Component } from "../../core/Component.js";

/**
 * Workflow Viewer Component
 * Displays detailed workflow information and allows state transitions
 */
export class WorkflowViewer extends Component {
    constructor(workflowService, workflowId, user, organizationContext) {
        super();
        this.workflowService = workflowService;
        this.workflowId = workflowId;
        this.user = user;
        this.organizationContext = organizationContext;
        this.workflow = null;
        this.workflowData = null;
        this.isLoading = false;
        this.activeTab = 'overview';
    }

    async render() {
        const viewer = this.createElement("div", "workflow-viewer");

        viewer.innerHTML = `
            <div class="workflow-header">
                <div class="header-navigation">
                    <button class="btn-outline btn-sm" id="back-to-dashboard">
                        ← Back to Dashboard
                    </button>
                    <div class="breadcrumb">
                        <span>Workflows</span>
                        <span class="separator">></span>
                        <span id="workflow-type-breadcrumb">Loading...</span>
                        <span class="separator">></span>
                        <span id="workflow-id-breadcrumb">${this.workflowId}</span>
                    </div>
                </div>
                <div class="header-actions">
                    <button class="btn-outline" id="refresh-workflow">
                        🔄 Refresh
                    </button>
                    <button class="btn-outline" id="export-workflow">
                        📄 Export
                    </button>
                </div>
            </div>

            <div class="workflow-content">
                <div class="loading-state" id="loading-state">
                    <div class="spinner"></div>
                    <p>Loading workflow...</p>
                </div>

                <div class="workflow-main hidden" id="workflow-main">
                    <!-- Workflow Status Bar -->
                    <div class="workflow-status-bar">
                        <div class="status-info">
                            <div class="workflow-title">
                                <h1 id="workflow-title">Workflow Title</h1>
                                <div class="workflow-meta">
                                    <span class="workflow-type" id="workflow-type-display"></span>
                                    <span class="workflow-state" id="workflow-state-display"></span>
                                    <span class="workflow-priority" id="workflow-priority-display"></span>
                                </div>
                            </div>
                        </div>
                        <div class="status-actions" id="workflow-actions">
                            <!-- Actions will be populated dynamically -->
                        </div>
                    </div>

                    <!-- Workflow Progress -->
                    <div class="workflow-progress">
                        <div class="progress-timeline" id="progress-timeline">
                            <!-- Timeline will be populated dynamically -->
                        </div>
                    </div>

                    <!-- Workflow Tabs -->
                    <div class="workflow-tabs">
                        <div class="tab-headers">
                            <button class="tab-header active" data-tab="overview">Overview</button>
                            <button class="tab-header" data-tab="details">Details</button>
                            <button class="tab-header" data-tab="history">History</button>
                            <button class="tab-header" data-tab="comments">Comments</button>
                            <button class="tab-header" data-tab="audit">Audit Log</button>
                        </div>

                        <div class="tab-content">
                            <!-- Overview Tab -->
                            <div class="tab-pane active" id="overview-tab">
                                <div class="overview-grid">
                                    <div class="overview-card">
                                        <h3>Current Status</h3>
                                        <div id="current-status-content">
                                            <!-- Status content -->
                                        </div>
                                    </div>
                                    <div class="overview-card">
                                        <h3>Key Information</h3>
                                        <div id="key-info-content">
                                            <!-- Key info content -->
                                        </div>
                                    </div>
                                    <div class="overview-card">
                                        <h3>Next Steps</h3>
                                        <div id="next-steps-content">
                                            <!-- Next steps content -->
                                        </div>
                                    </div>
                                    <div class="overview-card">
                                        <h3>Workflow Metrics</h3>
                                        <div id="metrics-content">
                                            <!-- Metrics content -->
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <!-- Details Tab -->
                            <div class="tab-pane" id="details-tab">
                                <div class="details-container">
                                    <div class="details-section">
                                        <h3>Workflow Context</h3>
                                        <div class="context-editor" id="context-editor">
                                            <!-- Context data will be displayed here -->
                                        </div>
                                    </div>
                                    <div class="details-section">
                                        <h3>Attachments</h3>
                                        <div class="attachments-list" id="attachments-list">
                                            <!-- Attachments will be listed here -->
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <!-- History Tab -->
                            <div class="tab-pane" id="history-tab">
                                <div class="history-timeline" id="history-timeline">
                                    <!-- History entries will be populated here -->
                                </div>
                            </div>

                            <!-- Comments Tab -->
                            <div class="tab-pane" id="comments-tab">
                                <div class="comments-container">
                                    <div class="comment-form">
                                        <textarea id="new-comment" class="form-textarea"
                                                  placeholder="Add a comment..." rows="3"></textarea>
                                        <button class="btn-primary" id="add-comment">Add Comment</button>
                                    </div>
                                    <div class="comments-list" id="comments-list">
                                        <!-- Comments will be listed here -->
                                    </div>
                                </div>
                            </div>

                            <!-- Audit Log Tab -->
                            <div class="tab-pane" id="audit-tab">
                                <div class="audit-filters">
                                    <select id="audit-action-filter" class="form-select">
                                        <option value="">All Actions</option>
                                        <option value="WORKFLOW_TRANSITION">State Transitions</option>
                                        <option value="WORKFLOW_CONTEXT_UPDATED">Context Updates</option>
                                        <option value="PERMISSION_CHECK">Permission Checks</option>
                                    </select>
                                    <input type="date" id="audit-date-filter" class="form-input">
                                </div>
                                <div class="audit-log" id="audit-log">
                                    <!-- Audit entries will be listed here -->
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="error-state hidden" id="error-state">
                    <div class="error-content">
                        <h3>Error Loading Workflow</h3>
                        <p id="error-message">Failed to load workflow details.</p>
                        <button class="btn-primary" id="retry-load">Retry</button>
                    </div>
                </div>
            </div>

            <!-- Action Execution Modal -->
            <div class="modal-backdrop hidden" id="action-modal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3 id="action-modal-title">Execute Action</h3>
                        <button class="modal-close" id="close-action-modal">&times;</button>
                    </div>
                    <div class="modal-body">
                        <div id="action-form-container">
                            <!-- Action-specific form will be generated here -->
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="btn-outline" id="cancel-action">Cancel</button>
                        <button class="btn-primary" id="confirm-action">Execute</button>
                    </div>
                </div>
            </div>
        `;

        this.addEventListeners(viewer);
        await this.loadWorkflow();

        return viewer;
    }

    addEventListeners(viewer) {
        // Navigation
        const backBtn = viewer.querySelector('#back-to-dashboard');
        backBtn.addEventListener('click', () => {
            window.location.hash = '#workflows';
        });

        // Header actions
        const refreshBtn = viewer.querySelector('#refresh-workflow');
        refreshBtn.addEventListener('click', () => this.loadWorkflow());

        const exportBtn = viewer.querySelector('#export-workflow');
        exportBtn.addEventListener('click', () => this.exportWorkflow());

        // Tab navigation
        const tabHeaders = viewer.querySelectorAll('.tab-header');
        tabHeaders.forEach(header => {
            header.addEventListener('click', (e) => {
                const tabName = e.target.dataset.tab;
                this.switchTab(tabName);
            });
        });

        // Modal controls
        const actionModal = viewer.querySelector('#action-modal');
        const closeActionModal = viewer.querySelector('#close-action-modal');
        const cancelAction = viewer.querySelector('#cancel-action');
        const confirmAction = viewer.querySelector('#confirm-action');

        [closeActionModal, cancelAction].forEach(btn => {
            btn.addEventListener('click', () => this.hideActionModal());
        });

        confirmAction.addEventListener('click', () => this.executeAction());

        // Close modal on backdrop click
        actionModal.addEventListener('click', (e) => {
            if (e.target === actionModal) {
                this.hideActionModal();
            }
        });

        // Comments
        const addCommentBtn = viewer.querySelector('#add-comment');
        addCommentBtn.addEventListener('click', () => this.addComment());

        // Retry on error
        const retryBtn = viewer.querySelector('#retry-load');
        retryBtn.addEventListener('click', () => this.loadWorkflow());

        // Audit filters
        const auditActionFilter = viewer.querySelector('#audit-action-filter');
        const auditDateFilter = viewer.querySelector('#audit-date-filter');

        [auditActionFilter, auditDateFilter].forEach(filter => {
            filter.addEventListener('change', () => this.loadAuditLog());
        });
    }

    async loadWorkflow() {
        this.isLoading = true;
        this.showLoading();

        try {
            // Load workflow data
            this.workflow = await this.workflowService.getWorkflow(this.workflowId);
            this.workflowData = await this.workflowService.getWorkflowData(
                this.workflowId,
                this.user,
                this.organizationContext
            );

            this.updateUI();
            this.hideLoading();

        } catch (error) {
            console.error('Error loading workflow:', error);
            this.showError(error.message || 'Failed to load workflow');
        } finally {
            this.isLoading = false;
        }
    }

    updateUI() {
        // Update breadcrumb
        const typeBreadcrumb = document.getElementById('workflow-type-breadcrumb');
        typeBreadcrumb.textContent = this.formatWorkflowType(this.workflow.type);

        // Update workflow title and meta
        const titleElement = document.getElementById('workflow-title');
        titleElement.textContent = this.workflow.metadata?.title || this.workflowId;

        const typeDisplay = document.getElementById('workflow-type-display');
        typeDisplay.textContent = this.formatWorkflowType(this.workflow.type);

        const stateDisplay = document.getElementById('workflow-state-display');
        stateDisplay.textContent = this.formatState(this.workflow.currentState);
        stateDisplay.className = `workflow-state ${this.getStateClass(this.workflow.currentState)}`;

        const priorityDisplay = document.getElementById('workflow-priority-display');
        const priority = this.workflow.metadata?.priority || 'normal';
        priorityDisplay.textContent = priority.toUpperCase();
        priorityDisplay.className = `workflow-priority priority-${priority}`;

        // Update actions
        this.updateActions();

        // Update progress timeline
        this.updateProgressTimeline();

        // Update tab content based on active tab
        this.updateTabContent();
    }

    updateActions() {
        const actionsContainer = document.getElementById('workflow-actions');
        const availableActions = this.workflowData?.availableActions || [];

        if (availableActions.length === 0) {
            actionsContainer.innerHTML = '<span class="no-actions">No actions available</span>';
            return;
        }

        actionsContainer.innerHTML = availableActions.map(action => `
            <button class="btn-primary action-btn"
                    data-action="${action.action}"
                    data-target="${action.target}">
                ${action.label}
            </button>
        `).join('');

        // Add click listeners to action buttons
        actionsContainer.querySelectorAll('.action-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const action = e.target.dataset.action;
                const target = e.target.dataset.target;
                this.showActionModal(action, target);
            });
        });
    }

    updateProgressTimeline() {
        const timeline = document.getElementById('progress-timeline');
        const history = this.workflow.history || [];

        if (history.length === 0) {
            timeline.innerHTML = '<div class="no-progress">No progress recorded</div>';
            return;
        }

        const timelineHTML = history.map((entry, index) => {
            const isLast = index === history.length - 1;
            const timeAgo = this.getTimeAgo(entry.timestamp);

            return `
                <div class="timeline-item ${isLast ? 'current' : ''}">
                    <div class="timeline-marker"></div>
                    <div class="timeline-content">
                        <div class="timeline-state">${this.formatState(entry.toState)}</div>
                        <div class="timeline-user">${entry.user.name}</div>
                        <div class="timeline-time">${timeAgo}</div>
                    </div>
                </div>
            `;
        }).join('');

        timeline.innerHTML = timelineHTML;
    }

    switchTab(tabName) {
        // Update tab headers
        document.querySelectorAll('.tab-header').forEach(header => {
            header.classList.toggle('active', header.dataset.tab === tabName);
        });

        // Update tab panes
        document.querySelectorAll('.tab-pane').forEach(pane => {
            pane.classList.toggle('active', pane.id === `${tabName}-tab`);
        });

        this.activeTab = tabName;
        this.updateTabContent();
    }

    updateTabContent() {
        switch (this.activeTab) {
            case 'overview':
                this.updateOverviewTab();
                break;
            case 'details':
                this.updateDetailsTab();
                break;
            case 'history':
                this.updateHistoryTab();
                break;
            case 'comments':
                this.updateCommentsTab();
                break;
            case 'audit':
                this.loadAuditLog();
                break;
        }
    }

    updateOverviewTab() {
        // Current Status
        const statusContent = document.getElementById('current-status-content');
        statusContent.innerHTML = `
            <div class="status-item">
                <strong>State:</strong> ${this.formatState(this.workflow.currentState)}
            </div>
            <div class="status-item">
                <strong>Updated:</strong> ${this.formatDateTime(this.workflow.updatedAt)}
            </div>
            <div class="status-item">
                <strong>Time in State:</strong> ${this.formatDuration(this.workflow.timeInCurrentState)}
            </div>
        `;

        // Key Information
        const keyInfoContent = document.getElementById('key-info-content');
        keyInfoContent.innerHTML = `
            <div class="info-item">
                <strong>Created:</strong> ${this.formatDateTime(this.workflow.createdAt)}
            </div>
            <div class="info-item">
                <strong>Creator:</strong> ${this.workflow.createdBy || 'Unknown'}
            </div>
            <div class="info-item">
                <strong>Organization:</strong> ${this.organizationContext.organizationId}
            </div>
            <div class="info-item">
                <strong>Priority:</strong> ${(this.workflow.metadata?.priority || 'normal').toUpperCase()}
            </div>
        `;

        // Next Steps
        const nextStepsContent = document.getElementById('next-steps-content');
        const availableActions = this.workflowData?.availableActions || [];

        if (availableActions.length > 0) {
            nextStepsContent.innerHTML = availableActions.map(action => `
                <div class="next-step">
                    <strong>${action.label}</strong>
                    <p>${action.description || 'No description available'}</p>
                </div>
            `).join('');
        } else {
            nextStepsContent.innerHTML = '<div class="no-steps">No actions available</div>';
        }

        // Metrics
        const metricsContent = document.getElementById('metrics-content');
        const metrics = this.workflow.metrics || {};
        metricsContent.innerHTML = `
            <div class="metric-item">
                <strong>History Entries:</strong> ${this.workflow.historyCount || 0}
            </div>
            <div class="metric-item">
                <strong>State Count:</strong> ${this.workflow.stateCount || 0}
            </div>
            ${metrics.time_to_hire ? `
                <div class="metric-item">
                    <strong>Time to Hire:</strong> ${this.formatDuration(metrics.time_to_hire)}
                </div>
            ` : ''}
            ${metrics.total_amount ? `
                <div class="metric-item">
                    <strong>Total Amount:</strong> $${metrics.total_amount.toFixed(2)}
                </div>
            ` : ''}
        `;
    }

    updateDetailsTab() {
        const contextEditor = document.getElementById('context-editor');
        const context = this.workflow.context || {};

        // Create an editable JSON view of the context
        contextEditor.innerHTML = `
            <div class="context-viewer">
                <pre class="context-json">${JSON.stringify(context, null, 2)}</pre>
                ${this.workflowData?.canEdit ? `
                    <button class="btn-outline btn-sm" id="edit-context">Edit Context</button>
                ` : ''}
            </div>
        `;

        // Attachments (placeholder)
        const attachmentsList = document.getElementById('attachments-list');
        attachmentsList.innerHTML = `
            <div class="no-attachments">
                <p>No attachments available</p>
                ${this.workflowData?.canEdit ? `
                    <button class="btn-outline btn-sm">Add Attachment</button>
                ` : ''}
            </div>
        `;
    }

    updateHistoryTab() {
        const historyTimeline = document.getElementById('history-timeline');
        const history = this.workflow.history || [];

        if (history.length === 0) {
            historyTimeline.innerHTML = '<div class="no-history">No history available</div>';
            return;
        }

        historyTimeline.innerHTML = history.map(entry => `
            <div class="history-entry">
                <div class="history-header">
                    <div class="history-transition">
                        ${entry.fromState ? `${this.formatState(entry.fromState)} →` : 'Initial:'}
                        <strong>${this.formatState(entry.toState)}</strong>
                    </div>
                    <div class="history-time">${this.formatDateTime(entry.timestamp)}</div>
                </div>
                <div class="history-details">
                    <div class="history-user">👤 ${entry.user.name}</div>
                    ${entry.context && Object.keys(entry.context).length > 0 ? `
                        <div class="history-context">
                            <details>
                                <summary>View Context</summary>
                                <pre>${JSON.stringify(entry.context, null, 2)}</pre>
                            </details>
                        </div>
                    ` : ''}
                </div>
            </div>
        `).join('');
    }

    updateCommentsTab() {
        const commentsList = document.getElementById('comments-list');

        // Placeholder for comments - in a real implementation, this would load from a service
        commentsList.innerHTML = `
            <div class="no-comments">
                <p>No comments yet. Be the first to add a comment!</p>
            </div>
        `;
    }

    async loadAuditLog() {
        const auditLog = document.getElementById('audit-log');
        auditLog.innerHTML = '<div class="loading">Loading audit log...</div>';

        try {
            // In a real implementation, this would call the audit service
            const mockAuditEntries = [
                {
                    id: 'audit_1',
                    timestamp: new Date(),
                    action: 'WORKFLOW_CREATED',
                    username: this.user.username,
                    details: { initialState: 'draft' }
                },
                {
                    id: 'audit_2',
                    timestamp: new Date(Date.now() - 3600000),
                    action: 'WORKFLOW_TRANSITION',
                    username: this.user.username,
                    details: { fromState: 'draft', toState: 'submitted' }
                }
            ];

            auditLog.innerHTML = mockAuditEntries.map(entry => `
                <div class="audit-entry">
                    <div class="audit-header">
                        <span class="audit-action">${entry.action}</span>
                        <span class="audit-time">${this.formatDateTime(entry.timestamp)}</span>
                    </div>
                    <div class="audit-details">
                        <div class="audit-user">👤 ${entry.username}</div>
                        <div class="audit-info">
                            <pre>${JSON.stringify(entry.details, null, 2)}</pre>
                        </div>
                    </div>
                </div>
            `).join('');

        } catch (error) {
            auditLog.innerHTML = '<div class="error">Failed to load audit log</div>';
        }
    }

    showActionModal(action, target) {
        const modal = document.getElementById('action-modal');
        const title = document.getElementById('action-modal-title');
        const formContainer = document.getElementById('action-form-container');

        title.textContent = `Execute: ${action.replace(/_/g, ' ')}`;

        // Generate action-specific form
        formContainer.innerHTML = this.generateActionForm(action, target);

        modal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';

        this.currentAction = { action, target };
    }

    generateActionForm(action, target) {
        // Basic form for most actions
        let formHTML = `
            <div class="form-group">
                <label for="action-comment">Comment (optional)</label>
                <textarea id="action-comment" class="form-textarea" rows="3"
                          placeholder="Add a comment about this action..."></textarea>
            </div>
        `;

        // Add action-specific fields
        if (action.includes('reject')) {
            formHTML += `
                <div class="form-group">
                    <label for="rejection-reason">Rejection Reason *</label>
                    <textarea id="rejection-reason" class="form-textarea" rows="3"
                              placeholder="Please provide a reason for rejection..." required></textarea>
                </div>
            `;
        }

        if (action.includes('approve')) {
            formHTML += `
                <div class="form-group">
                    <label for="approval-notes">Approval Notes</label>
                    <textarea id="approval-notes" class="form-textarea" rows="3"
                              placeholder="Add any approval notes..."></textarea>
                </div>
            `;
        }

        return formHTML;
    }

    hideActionModal() {
        const modal = document.getElementById('action-modal');
        modal.classList.add('hidden');
        document.body.style.overflow = '';
        this.currentAction = null;
    }

    async executeAction() {
        if (!this.currentAction) return;

        try {
            const formData = this.collectActionFormData();

            await this.workflowService.executeWorkflowAction(
                this.workflowId,
                this.currentAction.target,
                this.user,
                this.organizationContext,
                formData
            );

            this.hideActionModal();
            await this.loadWorkflow();
            this.showSuccess('Action executed successfully!');

        } catch (error) {
            console.error('Error executing action:', error);
            this.showError('Failed to execute action. Please try again.');
        }
    }

    collectActionFormData() {
        const formData = {};

        const comment = document.getElementById('action-comment')?.value;
        if (comment) formData.comment = comment;

        const rejectionReason = document.getElementById('rejection-reason')?.value;
        if (rejectionReason) formData.rejection_reason = rejectionReason;

        const approvalNotes = document.getElementById('approval-notes')?.value;
        if (approvalNotes) formData.approval_notes = approvalNotes;

        return formData;
    }

    async addComment() {
        const textarea = document.getElementById('new-comment');
        const comment = textarea.value.trim();

        if (!comment) return;

        try {
            // In a real implementation, this would call a comments service
            console.log('Adding comment:', comment);
            textarea.value = '';
            this.showSuccess('Comment added successfully!');

        } catch (error) {
            console.error('Error adding comment:', error);
            this.showError('Failed to add comment. Please try again.');
        }
    }

    async exportWorkflow() {
        try {
            const exportData = {
                workflow: this.workflow,
                exportedAt: new Date(),
                exportedBy: this.user.username
            };

            const blob = new Blob([JSON.stringify(exportData, null, 2)], {
                type: 'application/json'
            });

            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `workflow_${this.workflowId}_${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            this.showSuccess('Workflow exported successfully!');

        } catch (error) {
            console.error('Error exporting workflow:', error);
            this.showError('Failed to export workflow. Please try again.');
        }
    }

    // Utility methods
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

    formatDateTime(timestamp) {
        return new Date(timestamp).toLocaleString();
    }

    formatDuration(ms) {
        if (!ms) return 'N/A';

        const hours = Math.floor(ms / 3600000);
        const minutes = Math.floor((ms % 3600000) / 60000);

        if (hours > 24) {
            const days = Math.floor(hours / 24);
            return `${days}d ${hours % 24}h`;
        }
        if (hours > 0) {
            return `${hours}h ${minutes}m`;
        }
        return `${minutes}m`;
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

    showLoading() {
        document.getElementById('loading-state').classList.remove('hidden');
        document.getElementById('workflow-main').classList.add('hidden');
        document.getElementById('error-state').classList.add('hidden');
    }

    hideLoading() {
        document.getElementById('loading-state').classList.add('hidden');
        document.getElementById('workflow-main').classList.remove('hidden');
    }

    showError(message) {
        document.getElementById('error-message').textContent = message;
        document.getElementById('loading-state').classList.add('hidden');
        document.getElementById('workflow-main').classList.add('hidden');
        document.getElementById('error-state').classList.remove('hidden');
    }

    showSuccess(message) {
        // Simple success display - in a real app, use a proper notification system
        alert(message);
    }
}
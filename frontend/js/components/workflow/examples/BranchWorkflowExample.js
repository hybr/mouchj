import { Component } from '../../../core/Component.js';
import { CreateBranchWorkflow } from '../../../core/workflow/types/CreateBranchWorkflow.js';
import { UpdateBranchWorkflow } from '../../../core/workflow/types/UpdateBranchWorkflow.js';
import { DeleteBranchWorkflow } from '../../../core/workflow/types/DeleteBranchWorkflow.js';
import { BranchReadWorkflow } from '../../../core/workflow/types/BranchReadWorkflow.js';
import { BranchListWorkflow } from '../../../core/workflow/types/BranchListWorkflow.js';

/**
 * Branch Workflow Example Component
 * Demonstrates the complete branch management workflow system
 */
export class BranchWorkflowExample extends Component {
    constructor() {
        super();
        this.currentWorkflow = null;
        this.workflowHistory = [];
        this.selectedWorkflowType = 'create';
        this.isRunning = false;
    }

    async render() {
        const container = document.createElement('div');
        container.className = 'branch-workflow-example';
        container.innerHTML = `
            <div class="example-header">
                <h2>Branch Management Workflow Example</h2>
                <p>This example demonstrates the complete branch management workflow system with all CRUD operations.</p>
            </div>

            <div class="workflow-controls">
                <div class="workflow-selection">
                    <h3>Select Workflow Type</h3>
                    <div class="workflow-buttons">
                        <button class="workflow-btn" data-type="create">
                            <i class="fas fa-plus"></i>
                            <span>Create Branch</span>
                            <small>Complete branch creation process</small>
                        </button>
                        <button class="workflow-btn" data-type="read">
                            <i class="fas fa-eye"></i>
                            <span>Read Branch</span>
                            <small>View branch details with permissions</small>
                        </button>
                        <button class="workflow-btn" data-type="update">
                            <i class="fas fa-edit"></i>
                            <span>Update Branch</span>
                            <small>Modify existing branch data</small>
                        </button>
                        <button class="workflow-btn" data-type="delete">
                            <i class="fas fa-trash"></i>
                            <span>Delete Branch</span>
                            <small>Remove branch with dependencies</small>
                        </button>
                        <button class="workflow-btn" data-type="list">
                            <i class="fas fa-list"></i>
                            <span>List Branches</span>
                            <small>Browse and filter branches</small>
                        </button>
                    </div>
                </div>

                <div class="workflow-parameters">
                    <h3>Workflow Parameters</h3>
                    <div id="parametersContainer">
                        <!-- Dynamic parameter inputs will be rendered here -->
                    </div>
                </div>

                <div class="workflow-actions">
                    <button id="startWorkflowBtn" class="btn btn-primary btn-large" disabled>
                        <i class="fas fa-play"></i> Start Workflow
                    </button>
                    <button id="stopWorkflowBtn" class="btn btn-danger" style="display: none;">
                        <i class="fas fa-stop"></i> Stop Workflow
                    </button>
                    <button id="clearHistoryBtn" class="btn btn-secondary">
                        <i class="fas fa-trash"></i> Clear History
                    </button>
                </div>
            </div>

            <div class="workflow-visualization">
                <div class="workflow-status">
                    <h3>Current Workflow Status</h3>
                    <div id="workflowStatusContainer">
                        <div class="no-workflow">
                            <p>No workflow running. Select a workflow type and click "Start Workflow" to begin.</p>
                        </div>
                    </div>
                </div>

                <div class="workflow-progress">
                    <h3>Workflow Progress</h3>
                    <div id="progressContainer">
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: 0%"></div>
                        </div>
                        <div class="progress-text">Ready to start</div>
                    </div>
                </div>

                <div class="workflow-states">
                    <h3>State Machine</h3>
                    <div id="statesContainer">
                        <!-- State visualization will be rendered here -->
                    </div>
                </div>
            </div>

            <div class="workflow-output">
                <div class="output-tabs">
                    <button class="tab-btn active" data-tab="current">Current Workflow</button>
                    <button class="tab-btn" data-tab="history">Workflow History</button>
                    <button class="tab-btn" data-tab="logs">Operation Logs</button>
                    <button class="tab-btn" data-tab="metrics">Metrics</button>
                </div>

                <div class="tab-content">
                    <div id="currentTab" class="tab-panel active">
                        <h4>Current Workflow Details</h4>
                        <pre id="currentWorkflowData">No workflow running</pre>
                    </div>

                    <div id="historyTab" class="tab-panel">
                        <h4>Workflow History</h4>
                        <div id="workflowHistoryContainer">
                            <p>No workflows executed yet.</p>
                        </div>
                    </div>

                    <div id="logsTab" class="tab-panel">
                        <h4>Operation Logs</h4>
                        <div id="operationLogsContainer">
                            <p>No logs available.</p>
                        </div>
                    </div>

                    <div id="metricsTab" class="tab-panel">
                        <h4>Workflow Metrics</h4>
                        <div id="metricsContainer">
                            <p>No metrics available.</p>
                        </div>
                    </div>
                </div>
            </div>

            <div class="example-scenarios">
                <h3>Example Scenarios</h3>
                <div class="scenario-buttons">
                    <button class="scenario-btn" data-scenario="new-headquarters">
                        <i class="fas fa-building"></i>
                        New Headquarters
                    </button>
                    <button class="scenario-btn" data-scenario="regional-office">
                        <i class="fas fa-map-marker"></i>
                        Regional Office
                    </button>
                    <button class="scenario-btn" data-scenario="branch-closure">
                        <i class="fas fa-times-circle"></i>
                        Branch Closure
                    </button>
                    <button class="scenario-btn" data-scenario="bulk-operations">
                        <i class="fas fa-layer-group"></i>
                        Bulk Operations
                    </button>
                </div>
            </div>
        `;

        this.setupEventListeners(container);
        this.selectWorkflowType('create');
        this.updateDisplay();

        return container;
    }

    setupEventListeners(container) {
        // Workflow type selection
        container.querySelectorAll('.workflow-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const type = btn.dataset.type;
                this.selectWorkflowType(type);
            });
        });

        // Workflow control buttons
        container.querySelector('#startWorkflowBtn').addEventListener('click', () => {
            this.startWorkflow();
        });

        container.querySelector('#stopWorkflowBtn').addEventListener('click', () => {
            this.stopWorkflow();
        });

        container.querySelector('#clearHistoryBtn').addEventListener('click', () => {
            this.clearHistory();
        });

        // Tab controls
        container.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const tabName = btn.dataset.tab;
                this.switchTab(tabName);
            });
        });

        // Scenario buttons
        container.querySelectorAll('.scenario-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const scenario = btn.dataset.scenario;
                this.loadScenario(scenario);
            });
        });
    }

    selectWorkflowType(type) {
        this.selectedWorkflowType = type;

        // Update button states
        document.querySelectorAll('.workflow-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.type === type);
        });

        // Render parameters for selected workflow
        this.renderWorkflowParameters(type);

        // Enable start button
        document.querySelector('#startWorkflowBtn').disabled = false;

        this.updateDisplay();
    }

    renderWorkflowParameters(type) {
        const container = document.querySelector('#parametersContainer');

        const parameterSets = {
            create: this.getCreateParameters(),
            read: this.getReadParameters(),
            update: this.getUpdateParameters(),
            delete: this.getDeleteParameters(),
            list: this.getListParameters()
        };

        const parameters = parameterSets[type] || [];

        container.innerHTML = `
            <div class="parameters-form">
                ${parameters.map(param => `
                    <div class="parameter-group">
                        <label for="${param.name}">${param.label}:</label>
                        ${this.renderParameterInput(param)}
                        ${param.description ? `<small>${param.description}</small>` : ''}
                    </div>
                `).join('')}
            </div>
        `;
    }

    renderParameterInput(param) {
        switch (param.type) {
            case 'text':
                return `<input type="text" id="${param.name}" name="${param.name}" value="${param.default || ''}" placeholder="${param.placeholder || ''}">`;
            case 'select':
                return `
                    <select id="${param.name}" name="${param.name}">
                        ${param.options.map(option => `
                            <option value="${option.value}" ${option.value === param.default ? 'selected' : ''}>
                                ${option.label}
                            </option>
                        `).join('')}
                    </select>
                `;
            case 'checkbox':
                return `<input type="checkbox" id="${param.name}" name="${param.name}" ${param.default ? 'checked' : ''}>`;
            case 'date':
                return `<input type="date" id="${param.name}" name="${param.name}" value="${param.default || ''}">`;
            case 'number':
                return `<input type="number" id="${param.name}" name="${param.name}" value="${param.default || ''}" min="${param.min || ''}" max="${param.max || ''}">`;
            default:
                return `<input type="text" id="${param.name}" name="${param.name}" value="${param.default || ''}">`;
        }
    }

    getCreateParameters() {
        return [
            {
                name: 'branch_name',
                label: 'Branch Name',
                type: 'text',
                default: 'New Regional Office',
                placeholder: 'Enter branch name',
                description: 'The official name of the branch'
            },
            {
                name: 'branch_function',
                label: 'Branch Function',
                type: 'select',
                default: 'regional_office',
                options: [
                    { value: 'headquarters', label: 'Headquarters' },
                    { value: 'regional_office', label: 'Regional Office' },
                    { value: 'sales_office', label: 'Sales Office' },
                    { value: 'service_center', label: 'Service Center' },
                    { value: 'warehouse', label: 'Warehouse' },
                    { value: 'manufacturing', label: 'Manufacturing' },
                    { value: 'retail_store', label: 'Retail Store' }
                ],
                description: 'Primary function of the branch'
            },
            {
                name: 'region',
                label: 'Region',
                type: 'select',
                default: 'North',
                options: [
                    { value: 'North', label: 'North' },
                    { value: 'South', label: 'South' },
                    { value: 'East', label: 'East' },
                    { value: 'West', label: 'West' },
                    { value: 'Central', label: 'Central' }
                ],
                description: 'Geographic region'
            },
            {
                name: 'established_date',
                label: 'Established Date',
                type: 'date',
                default: new Date().toISOString().split('T')[0],
                description: 'Date when the branch was established'
            },
            {
                name: 'has_multiple_buildings',
                label: 'Multiple Buildings',
                type: 'checkbox',
                default: false,
                description: 'Check if branch spans multiple buildings'
            }
        ];
    }

    getReadParameters() {
        return [
            {
                name: 'branch_id',
                label: 'Branch ID',
                type: 'text',
                default: 'branch_1',
                placeholder: 'Enter branch ID',
                description: 'Unique identifier of the branch to read'
            },
            {
                name: 'include_related',
                label: 'Include Related Data',
                type: 'checkbox',
                default: true,
                description: 'Include related entities (employees, departments)'
            },
            {
                name: 'include_sensitive',
                label: 'Include Sensitive Data',
                type: 'checkbox',
                default: false,
                description: 'Include sensitive information (requires permissions)'
            }
        ];
    }

    getUpdateParameters() {
        return [
            {
                name: 'branch_id',
                label: 'Branch ID',
                type: 'text',
                default: 'branch_1',
                placeholder: 'Enter branch ID',
                description: 'ID of the branch to update'
            },
            {
                name: 'update_type',
                label: 'Update Type',
                type: 'select',
                default: 'minor',
                options: [
                    { value: 'minor', label: 'Minor Update' },
                    { value: 'major', label: 'Major Update' },
                    { value: 'critical', label: 'Critical Update' }
                ],
                description: 'Severity level of the update'
            },
            {
                name: 'update_reason',
                label: 'Update Reason',
                type: 'text',
                default: 'Contact information update',
                placeholder: 'Reason for update',
                description: 'Brief description of why the update is needed'
            }
        ];
    }

    getDeleteParameters() {
        return [
            {
                name: 'branch_id',
                label: 'Branch ID',
                type: 'text',
                default: 'branch_3',
                placeholder: 'Enter branch ID',
                description: 'ID of the branch to delete'
            },
            {
                name: 'deletion_strategy',
                label: 'Deletion Strategy',
                type: 'select',
                default: 'immediate',
                options: [
                    { value: 'immediate', label: 'Immediate Deletion' },
                    { value: 'phased', label: 'Phased Deletion' },
                    { value: 'scheduled', label: 'Scheduled Deletion' }
                ],
                description: 'How to handle the deletion process'
            },
            {
                name: 'force_deletion',
                label: 'Force Deletion',
                type: 'checkbox',
                default: false,
                description: 'Force deletion even with dependencies (dangerous)'
            }
        ];
    }

    getListParameters() {
        return [
            {
                name: 'page_size',
                label: 'Page Size',
                type: 'number',
                default: 10,
                min: 1,
                max: 100,
                description: 'Number of branches per page'
            },
            {
                name: 'filter_status',
                label: 'Filter by Status',
                type: 'select',
                default: '',
                options: [
                    { value: '', label: 'All Statuses' },
                    { value: 'active', label: 'Active' },
                    { value: 'inactive', label: 'Inactive' },
                    { value: 'pending', label: 'Pending' },
                    { value: 'closed', label: 'Closed' }
                ],
                description: 'Filter branches by status'
            },
            {
                name: 'sort_field',
                label: 'Sort Field',
                type: 'select',
                default: 'branch_name',
                options: [
                    { value: 'branch_name', label: 'Branch Name' },
                    { value: 'branch_code', label: 'Branch Code' },
                    { value: 'established_date', label: 'Established Date' },
                    { value: 'region', label: 'Region' }
                ],
                description: 'Field to sort by'
            },
            {
                name: 'include_metrics',
                label: 'Include Metrics',
                type: 'checkbox',
                default: true,
                description: 'Include performance metrics for each branch'
            }
        ];
    }

    async startWorkflow() {
        if (this.isRunning) return;

        try {
            this.isRunning = true;
            this.updateControlButtons();

            // Get parameters from form
            const parameters = this.getFormParameters();

            // Create workflow based on selected type
            this.currentWorkflow = this.createWorkflow(this.selectedWorkflowType, parameters);

            // Start the workflow
            await this.currentWorkflow.start(
                this.getMockUser(),
                this.getMockOrganizationContext()
            );

            // Monitor workflow progress
            this.startProgressMonitoring();

            this.updateDisplay();

        } catch (error) {
            this.isRunning = false;
            this.updateControlButtons();
            console.error('Error starting workflow:', error);
            alert('Error starting workflow: ' + error.message);
        }
    }

    createWorkflow(type, parameters) {
        const workflowId = `${type}_${Date.now()}`;

        switch (type) {
            case 'create':
                return new CreateBranchWorkflow(workflowId, {
                    branchData: {
                        branch_name: parameters.branch_name,
                        branch_function: parameters.branch_function,
                        region: parameters.region,
                        established_date: parameters.established_date,
                        has_multiple_buildings: parameters.has_multiple_buildings
                    }
                });

            case 'read':
                return new BranchReadWorkflow(workflowId, {
                    branchId: parameters.branch_id,
                    includeRelated: parameters.include_related,
                    includeSensitive: parameters.include_sensitive
                });

            case 'update':
                return new UpdateBranchWorkflow(workflowId, {
                    branchId: parameters.branch_id,
                    updateData: {
                        primary_email_address: 'updated@example.com',
                        primary_phone_number: '+1-555-9999'
                    },
                    updateType: parameters.update_type,
                    updateReason: parameters.update_reason
                });

            case 'delete':
                return new DeleteBranchWorkflow(workflowId, {
                    branchId: parameters.branch_id,
                    deletionStrategy: parameters.deletion_strategy,
                    forceDeletion: parameters.force_deletion
                });

            case 'list':
                return new BranchListWorkflow(workflowId, {
                    pagination: { page: 1, limit: parameters.page_size },
                    filters: parameters.filter_status ? { branch_status: parameters.filter_status } : {},
                    sortOptions: { field: parameters.sort_field, direction: 'asc' },
                    includeMetrics: parameters.include_metrics
                });

            default:
                throw new Error(`Unknown workflow type: ${type}`);
        }
    }

    getFormParameters() {
        const form = document.querySelector('.parameters-form');
        const parameters = {};

        form.querySelectorAll('input, select').forEach(input => {
            if (input.type === 'checkbox') {
                parameters[input.name] = input.checked;
            } else if (input.type === 'number') {
                parameters[input.name] = parseInt(input.value) || 0;
            } else {
                parameters[input.name] = input.value;
            }
        });

        return parameters;
    }

    startProgressMonitoring() {
        const monitorInterval = setInterval(() => {
            if (!this.currentWorkflow || !this.isRunning) {
                clearInterval(monitorInterval);
                return;
            }

            this.updateWorkflowDisplay();

            // Check if workflow is complete
            const terminalStates = ['completed', 'cancelled', 'error', 'denied', 'activated', 'deleted', 'verified'];
            if (terminalStates.includes(this.currentWorkflow.currentState)) {
                this.isRunning = false;
                this.updateControlButtons();
                this.addToHistory();
                clearInterval(monitorInterval);
            }
        }, 500);
    }

    updateWorkflowDisplay() {
        this.updateProgressBar();
        this.updateStateVisualization();
        this.updateCurrentWorkflowData();
        this.updateOperationLogs();
        this.updateMetrics();
    }

    updateProgressBar() {
        if (!this.currentWorkflow) return;

        const progressContainer = document.querySelector('#progressContainer');
        const progressBar = progressContainer.querySelector('.progress-fill');
        const progressText = progressContainer.querySelector('.progress-text');

        let progress = 0;
        let statusText = 'Ready';

        if (this.currentWorkflow.getCreationProgress) {
            const progressInfo = this.currentWorkflow.getCreationProgress();
            progress = progressInfo.percentage;
            statusText = `${progressInfo.stage} (${progressInfo.completed}/${progressInfo.total})`;
        } else {
            // Generic progress calculation
            const states = Object.keys(this.currentWorkflow.states);
            const currentIndex = states.indexOf(this.currentWorkflow.currentState);
            progress = currentIndex >= 0 ? (currentIndex / (states.length - 1)) * 100 : 0;
            statusText = this.currentWorkflow.currentState;
        }

        progressBar.style.width = `${progress}%`;
        progressText.textContent = statusText;
    }

    updateStateVisualization() {
        if (!this.currentWorkflow) return;

        const container = document.querySelector('#statesContainer');
        const states = Object.keys(this.currentWorkflow.states);
        const currentState = this.currentWorkflow.currentState;

        container.innerHTML = `
            <div class="state-flow">
                ${states.map(state => `
                    <div class="state-node ${state === currentState ? 'current' : ''}">
                        <div class="state-name">${state}</div>
                        ${state === currentState ? '<div class="state-indicator"></div>' : ''}
                    </div>
                `).join('<div class="state-arrow">→</div>')}
            </div>
        `;
    }

    updateCurrentWorkflowData() {
        if (!this.currentWorkflow) return;

        const container = document.querySelector('#currentWorkflowData');
        const workflowData = {
            id: this.currentWorkflow.id,
            type: this.currentWorkflow.type,
            currentState: this.currentWorkflow.currentState,
            createdAt: this.currentWorkflow.createdAt,
            context: this.currentWorkflow.context,
            history: this.currentWorkflow.history
        };

        container.textContent = JSON.stringify(workflowData, null, 2);
    }

    updateOperationLogs() {
        if (!this.currentWorkflow || !this.currentWorkflow.context.operationLog) return;

        const container = document.querySelector('#operationLogsContainer');
        const logs = this.currentWorkflow.context.operationLog;

        container.innerHTML = `
            <div class="logs-list">
                ${logs.map(log => `
                    <div class="log-entry">
                        <div class="log-timestamp">${new Date(log.timestamp).toLocaleString()}</div>
                        <div class="log-operation">${log.operation}</div>
                        <div class="log-user">${log.user.name}</div>
                        <div class="log-details">${JSON.stringify(log.details, null, 2)}</div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    updateMetrics() {
        if (!this.currentWorkflow) return;

        const container = document.querySelector('#metricsContainer');
        const metrics = this.currentWorkflow.getMetrics ? this.currentWorkflow.getMetrics() : {};

        container.innerHTML = `
            <div class="metrics-grid">
                <div class="metric-item">
                    <label>Workflow Type:</label>
                    <span>${this.currentWorkflow.type}</span>
                </div>
                <div class="metric-item">
                    <label>Duration:</label>
                    <span>${metrics.duration || 0}ms</span>
                </div>
                <div class="metric-item">
                    <label>State Transitions:</label>
                    <span>${metrics.transitionCount || 0}</span>
                </div>
                <div class="metric-item">
                    <label>Current State:</label>
                    <span>${this.currentWorkflow.currentState}</span>
                </div>
            </div>
        `;
    }

    addToHistory() {
        if (!this.currentWorkflow) return;

        const historyEntry = {
            id: this.currentWorkflow.id,
            type: this.currentWorkflow.type,
            startTime: this.currentWorkflow.createdAt,
            endTime: new Date(),
            finalState: this.currentWorkflow.currentState,
            metrics: this.currentWorkflow.getMetrics ? this.currentWorkflow.getMetrics() : {},
            context: this.currentWorkflow.context
        };

        this.workflowHistory.push(historyEntry);
        this.updateHistoryDisplay();
    }

    updateHistoryDisplay() {
        const container = document.querySelector('#workflowHistoryContainer');

        if (this.workflowHistory.length === 0) {
            container.innerHTML = '<p>No workflows executed yet.</p>';
            return;
        }

        container.innerHTML = `
            <div class="history-list">
                ${this.workflowHistory.map((entry, index) => `
                    <div class="history-entry">
                        <div class="history-header">
                            <h5>${entry.type} - ${entry.id}</h5>
                            <span class="history-state state-${entry.finalState}">${entry.finalState}</span>
                        </div>
                        <div class="history-details">
                            <div class="history-time">
                                Duration: ${entry.endTime - entry.startTime}ms
                            </div>
                            <div class="history-metrics">
                                Transitions: ${entry.metrics.transitionCount || 0}
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    stopWorkflow() {
        this.isRunning = false;
        this.updateControlButtons();

        if (this.currentWorkflow) {
            // In a real implementation, you might want to transition to a cancelled state
            console.log('Stopping workflow:', this.currentWorkflow.id);
        }
    }

    clearHistory() {
        this.workflowHistory = [];
        this.updateHistoryDisplay();
    }

    switchTab(tabName) {
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

    updateControlButtons() {
        const startBtn = document.querySelector('#startWorkflowBtn');
        const stopBtn = document.querySelector('#stopWorkflowBtn');

        if (this.isRunning) {
            startBtn.style.display = 'none';
            stopBtn.style.display = 'inline-block';
        } else {
            startBtn.style.display = 'inline-block';
            stopBtn.style.display = 'none';
        }
    }

    updateDisplay() {
        const statusContainer = document.querySelector('#workflowStatusContainer');

        if (!this.currentWorkflow) {
            statusContainer.innerHTML = `
                <div class="no-workflow">
                    <p>No workflow running. Select a workflow type and click "Start Workflow" to begin.</p>
                </div>
            `;
        } else {
            statusContainer.innerHTML = `
                <div class="workflow-info">
                    <div class="workflow-header">
                        <h4>${this.currentWorkflow.type} Workflow</h4>
                        <span class="workflow-id">${this.currentWorkflow.id}</span>
                    </div>
                    <div class="workflow-status-current">
                        <strong>Current State:</strong> ${this.currentWorkflow.currentState}
                    </div>
                </div>
            `;
        }
    }

    loadScenario(scenario) {
        const scenarios = {
            'new-headquarters': () => {
                this.selectWorkflowType('create');
                this.setParameterValues({
                    branch_name: 'Corporate Headquarters',
                    branch_function: 'headquarters',
                    region: 'Central',
                    established_date: new Date().toISOString().split('T')[0],
                    has_multiple_buildings: true
                });
            },
            'regional-office': () => {
                this.selectWorkflowType('create');
                this.setParameterValues({
                    branch_name: 'Northwest Regional Office',
                    branch_function: 'regional_office',
                    region: 'North',
                    established_date: new Date().toISOString().split('T')[0],
                    has_multiple_buildings: false
                });
            },
            'branch-closure': () => {
                this.selectWorkflowType('delete');
                this.setParameterValues({
                    branch_id: 'branch_3',
                    deletion_strategy: 'phased',
                    force_deletion: false
                });
            },
            'bulk-operations': () => {
                this.selectWorkflowType('list');
                this.setParameterValues({
                    page_size: 50,
                    filter_status: 'active',
                    sort_field: 'branch_name',
                    include_metrics: true
                });
            }
        };

        if (scenarios[scenario]) {
            scenarios[scenario]();
        }
    }

    setParameterValues(values) {
        Object.entries(values).forEach(([name, value]) => {
            const input = document.querySelector(`[name="${name}"]`);
            if (input) {
                if (input.type === 'checkbox') {
                    input.checked = value;
                } else {
                    input.value = value;
                }
            }
        });
    }

    getMockUser() {
        return {
            id: 'user_123',
            username: 'demo_user',
            firstName: 'Demo',
            lastName: 'User'
        };
    }

    getMockOrganizationContext() {
        return {
            organizationId: 'org_demo',
            positions: [{
                designation: { name: 'Manager' },
                department: { name: 'Operations' }
            }]
        };
    }
}
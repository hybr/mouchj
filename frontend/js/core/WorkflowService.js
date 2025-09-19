import { WorkflowEngine } from './workflow/WorkflowEngine.js';
import { NotificationService } from './workflow/NotificationService.js';
import { AuditService } from './workflow/AuditService.js';
import { OrganizationalContextManager } from './workflow/OrganizationalModels.js';

// Import workflow types
import { HireWorkflow } from './workflow/types/HireWorkflow.js';
import { ExpenseApprovalWorkflow } from './workflow/types/ExpenseApprovalWorkflow.js';

/**
 * Workflow Service Integration
 * Provides high-level workflow management functionality
 */
export class WorkflowService {
    constructor(organizationService, options = {}) {
        this.organizationService = organizationService;

        // Initialize supporting services
        this.notificationService = new NotificationService({
            auditService: options.auditService,
            metricsCollector: options.metricsCollector
        });

        this.auditService = new AuditService({
            persistenceService: options.persistenceService,
            retentionPeriod: options.auditRetentionPeriod,
            isEnabled: options.auditEnabled !== false
        });

        // Initialize workflow engine
        this.workflowEngine = new WorkflowEngine({
            organizationService: this.organizationService,
            notificationService: this.notificationService,
            auditService: this.auditService,
            persistenceService: options.persistenceService,
            validationEngine: options.validationEngine,
            autoSaveInterval: options.autoSaveInterval,
            metricsCollector: options.metricsCollector
        });

        this.isInitialized = false;
    }

    /**
     * Initialize the workflow service
     */
    async initialize() {
        if (this.isInitialized) return;

        try {
            // Register workflow types
            this.registerWorkflowTypes();

            // Start the workflow engine
            await this.workflowEngine.start();

            // Setup event listeners
            this.setupEventListeners();

            this.isInitialized = true;
            console.log('WorkflowService initialized successfully');

        } catch (error) {
            console.error('Failed to initialize WorkflowService:', error);
            throw error;
        }
    }

    /**
     * Register available workflow types
     */
    registerWorkflowTypes() {
        this.workflowEngine.registerWorkflowType('HireWorkflow', HireWorkflow);
        this.workflowEngine.registerWorkflowType('ExpenseApprovalWorkflow', ExpenseApprovalWorkflow);

        // Add more workflow types as they're implemented
        // this.workflowEngine.registerWorkflowType('DocumentApprovalWorkflow', DocumentApprovalWorkflow);
        // this.workflowEngine.registerWorkflowType('ProjectApprovalWorkflow', ProjectApprovalWorkflow);
        // this.workflowEngine.registerWorkflowType('ProcurementWorkflow', ProcurementWorkflow);
    }

    /**
     * Setup event listeners for workflow events
     */
    setupEventListeners() {
        this.workflowEngine.on('workflowCreated', (data) => {
            console.log(`Workflow created: ${data.workflow.id}`);
        });

        this.workflowEngine.on('workflowStateChanged', (data) => {
            console.log(`Workflow ${data.workflow.id} transitioned to ${data.toState}`);
        });

        this.workflowEngine.on('workflowCompleted', (data) => {
            console.log(`Workflow completed: ${data.workflow.id}`);
        });
    }

    /**
     * Create a new workflow
     */
    async createWorkflow(type, id, user, organizationContext, options = {}) {
        this.ensureInitialized();

        try {
            const workflow = await this.workflowEngine.createWorkflow(
                type,
                id,
                user,
                organizationContext,
                options
            );

            return {
                id: workflow.id,
                type: workflow.type,
                currentState: workflow.currentState,
                createdAt: workflow.createdAt,
                metadata: workflow.metadata
            };

        } catch (error) {
            console.error('Error creating workflow:', error);
            throw new Error(`Failed to create workflow: ${error.message}`);
        }
    }

    /**
     * Get workflow by ID
     */
    async getWorkflow(workflowId) {
        this.ensureInitialized();

        try {
            const workflow = this.workflowEngine.getWorkflow(workflowId);
            if (!workflow) {
                throw new Error(`Workflow ${workflowId} not found`);
            }

            return workflow.serialize();

        } catch (error) {
            console.error('Error getting workflow:', error);
            throw new Error(`Failed to get workflow: ${error.message}`);
        }
    }

    /**
     * Get workflow data with user permissions
     */
    async getWorkflowData(workflowId, user, organizationContext) {
        this.ensureInitialized();

        try {
            const workflow = this.workflowEngine.getWorkflow(workflowId);
            if (!workflow) {
                throw new Error(`Workflow ${workflowId} not found`);
            }

            // Get organizational context
            const orgContextManager = new OrganizationalContextManager(this.organizationService);
            const orgContext = await orgContextManager.getOrganizationalContext(
                user.id,
                organizationContext.organizationId
            );

            // Get available actions for user
            const availableActions = workflow.getAvailableActionsForUser(user, orgContext);

            // Check if user can edit
            const currentState = workflow.getCurrentState();
            const canEdit = currentState?.node.hasPermission(user, orgContext, workflow.context) || false;

            return {
                workflow: workflow.serialize(),
                availableActions,
                canEdit,
                isOwner: workflow.createdBy === user.id,
                organizationContext: orgContext
            };

        } catch (error) {
            console.error('Error getting workflow data:', error);
            throw new Error(`Failed to get workflow data: ${error.message}`);
        }
    }

    /**
     * Get user's workflows
     */
    async getUserWorkflows(user, organizationContext, options = {}) {
        this.ensureInitialized();

        try {
            return await this.workflowEngine.getUserWorkflows(user, organizationContext, options);

        } catch (error) {
            console.error('Error getting user workflows:', error);
            throw new Error(`Failed to get user workflows: ${error.message}`);
        }
    }

    /**
     * Execute workflow action/transition
     */
    async executeWorkflowAction(workflowId, targetState, user, organizationContext, transitionContext = {}) {
        this.ensureInitialized();

        try {
            const workflow = await this.workflowEngine.executeTransition(
                workflowId,
                targetState,
                user,
                organizationContext,
                transitionContext
            );

            return {
                id: workflow.id,
                currentState: workflow.currentState,
                updatedAt: workflow.updatedAt
            };

        } catch (error) {
            console.error('Error executing workflow action:', error);
            throw new Error(`Failed to execute workflow action: ${error.message}`);
        }
    }

    /**
     * Update workflow context
     */
    async updateWorkflowContext(workflowId, contextUpdates, user, organizationContext) {
        this.ensureInitialized();

        try {
            const workflow = await this.workflowEngine.updateWorkflowContext(
                workflowId,
                contextUpdates,
                user,
                organizationContext
            );

            return {
                id: workflow.id,
                context: workflow.context,
                updatedAt: workflow.updatedAt
            };

        } catch (error) {
            console.error('Error updating workflow context:', error);
            throw new Error(`Failed to update workflow context: ${error.message}`);
        }
    }

    /**
     * Get workflow statistics
     */
    async getWorkflowStatistics(organizationId) {
        this.ensureInitialized();

        try {
            const statistics = this.workflowEngine.getStatistics();

            // Filter by organization if specified
            if (organizationId) {
                const orgWorkflows = this.workflowEngine.getWorkflows({ organizationId });

                const orgStats = {
                    totalWorkflows: orgWorkflows.length,
                    activeWorkflows: 0,
                    completedWorkflows: 0,
                    byType: {},
                    byState: {},
                    byUser: {}
                };

                orgWorkflows.forEach(workflow => {
                    // Count by type
                    if (!orgStats.byType[workflow.type]) {
                        orgStats.byType[workflow.type] = 0;
                    }
                    orgStats.byType[workflow.type]++;

                    // Count by state
                    if (workflow.currentState) {
                        if (!orgStats.byState[workflow.currentState]) {
                            orgStats.byState[workflow.currentState] = 0;
                        }
                        orgStats.byState[workflow.currentState]++;

                        // Count active vs completed
                        if (['completed', 'cancelled', 'paid'].includes(workflow.currentState)) {
                            orgStats.completedWorkflows++;
                        } else {
                            orgStats.activeWorkflows++;
                        }
                    }

                    // Count by user
                    if (workflow.createdBy) {
                        if (!orgStats.byUser[workflow.createdBy]) {
                            orgStats.byUser[workflow.createdBy] = 0;
                        }
                        orgStats.byUser[workflow.createdBy]++;
                    }
                });

                return orgStats;
            }

            return statistics;

        } catch (error) {
            console.error('Error getting workflow statistics:', error);
            throw new Error(`Failed to get workflow statistics: ${error.message}`);
        }
    }

    /**
     * Search workflows
     */
    async searchWorkflows(criteria, user, organizationContext) {
        this.ensureInitialized();

        try {
            const allWorkflows = await this.getUserWorkflows(user, organizationContext);

            let results = allWorkflows;

            // Apply search criteria
            if (criteria.query) {
                const query = criteria.query.toLowerCase();
                results = results.filter(w =>
                    w.workflow.id.toLowerCase().includes(query) ||
                    w.workflow.type.toLowerCase().includes(query) ||
                    (w.workflow.metadata?.title && w.workflow.metadata.title.toLowerCase().includes(query)) ||
                    (w.workflow.metadata?.description && w.workflow.metadata.description.toLowerCase().includes(query))
                );
            }

            if (criteria.type) {
                results = results.filter(w => w.workflow.type === criteria.type);
            }

            if (criteria.state) {
                results = results.filter(w => w.workflow.currentState === criteria.state);
            }

            if (criteria.priority) {
                results = results.filter(w => w.workflow.metadata?.priority === criteria.priority);
            }

            if (criteria.createdBy) {
                results = results.filter(w => w.workflow.createdBy === criteria.createdBy);
            }

            if (criteria.dateRange) {
                const startDate = new Date(criteria.dateRange.start);
                const endDate = new Date(criteria.dateRange.end);
                results = results.filter(w => {
                    const createdAt = new Date(w.workflow.createdAt);
                    return createdAt >= startDate && createdAt <= endDate;
                });
            }

            // Apply sorting
            if (criteria.sort) {
                results.sort((a, b) => {
                    switch (criteria.sort) {
                        case 'created_desc':
                            return new Date(b.workflow.createdAt) - new Date(a.workflow.createdAt);
                        case 'created_asc':
                            return new Date(a.workflow.createdAt) - new Date(b.workflow.createdAt);
                        case 'updated_desc':
                            return new Date(b.workflow.updatedAt) - new Date(a.workflow.updatedAt);
                        case 'updated_asc':
                            return new Date(a.workflow.updatedAt) - new Date(b.workflow.updatedAt);
                        case 'priority':
                            const priorityOrder = { urgent: 3, high: 2, normal: 1 };
                            return (priorityOrder[b.workflow.metadata?.priority] || 1) -
                                   (priorityOrder[a.workflow.metadata?.priority] || 1);
                        case 'type':
                            return a.workflow.type.localeCompare(b.workflow.type);
                        default:
                            return 0;
                    }
                });
            }

            // Apply pagination
            if (criteria.pagination) {
                const { page = 1, limit = 10 } = criteria.pagination;
                const startIndex = (page - 1) * limit;
                const endIndex = startIndex + limit;

                return {
                    workflows: results.slice(startIndex, endIndex),
                    pagination: {
                        total: results.length,
                        page,
                        limit,
                        totalPages: Math.ceil(results.length / limit)
                    }
                };
            }

            return { workflows: results };

        } catch (error) {
            console.error('Error searching workflows:', error);
            throw new Error(`Failed to search workflows: ${error.message}`);
        }
    }

    /**
     * Get workflow audit log
     */
    async getWorkflowAuditLog(workflowId, criteria = {}) {
        this.ensureInitialized();

        try {
            return await this.auditService.searchAuditLog({
                workflowId,
                ...criteria
            });

        } catch (error) {
            console.error('Error getting workflow audit log:', error);
            throw new Error(`Failed to get workflow audit log: ${error.message}`);
        }
    }

    /**
     * Generate compliance report
     */
    async generateComplianceReport(organizationId, startDate, endDate) {
        this.ensureInitialized();

        try {
            return await this.auditService.generateComplianceReport(
                organizationId,
                startDate,
                endDate
            );

        } catch (error) {
            console.error('Error generating compliance report:', error);
            throw new Error(`Failed to generate compliance report: ${error.message}`);
        }
    }

    /**
     * Get workflow types and their definitions
     */
    getWorkflowTypes() {
        this.ensureInitialized();

        return [
            {
                type: 'HireWorkflow',
                name: 'Hire Workflow',
                description: 'Manage the complete hiring process from job posting to onboarding',
                category: 'HR',
                states: ['draft', 'pending_approval', 'approved', 'posted', 'screening', 'interviewing', 'selecting', 'offer_preparation', 'offer_sent', 'offer_accepted', 'onboarding', 'completed']
            },
            {
                type: 'ExpenseApprovalWorkflow',
                name: 'Expense Approval',
                description: 'Handle expense claims and reimbursement approval process',
                category: 'Finance',
                states: ['draft', 'submitted', 'manager_review', 'finance_review', 'approved', 'payment_processing', 'paid']
            }
            // Add more workflow type definitions as they're implemented
        ];
    }

    /**
     * Validate workflow data
     */
    async validateWorkflow(workflowId) {
        this.ensureInitialized();

        try {
            const workflow = this.workflowEngine.getWorkflow(workflowId);
            if (!workflow) {
                throw new Error(`Workflow ${workflowId} not found`);
            }

            const validationErrors = await workflow.validate();

            return {
                isValid: validationErrors.length === 0,
                errors: validationErrors,
                workflow: {
                    id: workflow.id,
                    type: workflow.type,
                    currentState: workflow.currentState
                }
            };

        } catch (error) {
            console.error('Error validating workflow:', error);
            throw new Error(`Failed to validate workflow: ${error.message}`);
        }
    }

    /**
     * Get workflow metrics and analytics
     */
    async getWorkflowMetrics(organizationId, options = {}) {
        this.ensureInitialized();

        try {
            const { timeRange, workflowType } = options;

            let workflows = this.workflowEngine.getWorkflows({ organizationId });

            // Apply filters
            if (workflowType) {
                workflows = workflows.filter(w => w.type === workflowType);
            }

            if (timeRange) {
                const startDate = new Date(timeRange.start);
                const endDate = new Date(timeRange.end);
                workflows = workflows.filter(w => {
                    const createdAt = new Date(w.createdAt);
                    return createdAt >= startDate && createdAt <= endDate;
                });
            }

            // Calculate metrics
            const metrics = {
                totalWorkflows: workflows.length,
                completedWorkflows: workflows.filter(w =>
                    ['completed', 'paid', 'cancelled'].includes(w.currentState)
                ).length,
                averageCompletionTime: 0,
                workflowsByType: {},
                workflowsByState: {},
                completionRate: 0,
                processingTimes: []
            };

            // Calculate completion rate
            if (metrics.totalWorkflows > 0) {
                metrics.completionRate = (metrics.completedWorkflows / metrics.totalWorkflows) * 100;
            }

            // Group by type and state
            workflows.forEach(workflow => {
                // By type
                if (!metrics.workflowsByType[workflow.type]) {
                    metrics.workflowsByType[workflow.type] = 0;
                }
                metrics.workflowsByType[workflow.type]++;

                // By state
                if (!metrics.workflowsByState[workflow.currentState]) {
                    metrics.workflowsByState[workflow.currentState] = 0;
                }
                metrics.workflowsByState[workflow.currentState]++;

                // Calculate processing time for completed workflows
                if (['completed', 'paid'].includes(workflow.currentState) && workflow.history) {
                    const completedEntry = workflow.history.find(h =>
                        ['completed', 'paid'].includes(h.toState)
                    );
                    if (completedEntry) {
                        const processingTime = new Date(completedEntry.timestamp) - new Date(workflow.createdAt);
                        metrics.processingTimes.push(processingTime);
                    }
                }
            });

            // Calculate average completion time
            if (metrics.processingTimes.length > 0) {
                metrics.averageCompletionTime = metrics.processingTimes.reduce((sum, time) => sum + time, 0) / metrics.processingTimes.length;
            }

            return metrics;

        } catch (error) {
            console.error('Error getting workflow metrics:', error);
            throw new Error(`Failed to get workflow metrics: ${error.message}`);
        }
    }

    /**
     * Export workflow data
     */
    async exportWorkflow(workflowId, format = 'json') {
        this.ensureInitialized();

        try {
            const workflow = this.workflowEngine.getWorkflow(workflowId);
            if (!workflow) {
                throw new Error(`Workflow ${workflowId} not found`);
            }

            const exportData = workflow.exportData ? workflow.exportData() : workflow.serialize();

            switch (format.toLowerCase()) {
                case 'json':
                    return {
                        data: JSON.stringify(exportData, null, 2),
                        mimeType: 'application/json',
                        filename: `workflow_${workflowId}.json`
                    };

                case 'csv':
                    // Simple CSV export of history
                    const csvHeaders = ['Timestamp', 'From State', 'To State', 'User', 'Comments'];
                    const csvRows = [csvHeaders];

                    if (exportData.history) {
                        exportData.history.forEach(entry => {
                            csvRows.push([
                                new Date(entry.timestamp).toISOString(),
                                entry.fromState || '',
                                entry.toState || '',
                                entry.user?.name || '',
                                entry.context?.comment || ''
                            ]);
                        });
                    }

                    const csvContent = csvRows.map(row =>
                        row.map(field => `"${field}"`).join(',')
                    ).join('\n');

                    return {
                        data: csvContent,
                        mimeType: 'text/csv',
                        filename: `workflow_${workflowId}.csv`
                    };

                default:
                    throw new Error(`Unsupported export format: ${format}`);
            }

        } catch (error) {
            console.error('Error exporting workflow:', error);
            throw new Error(`Failed to export workflow: ${error.message}`);
        }
    }

    /**
     * Ensure service is initialized
     */
    ensureInitialized() {
        if (!this.isInitialized) {
            throw new Error('WorkflowService not initialized. Call initialize() first.');
        }
    }

    /**
     * Get service status
     */
    getStatus() {
        return {
            isInitialized: this.isInitialized,
            engineStatus: this.workflowEngine?.getStatistics() || null,
            notificationStatus: this.notificationService?.getDeliveryStatistics() || null,
            auditStatus: this.auditService?.getAuditStatistics() || null
        };
    }

    /**
     * Shutdown the service
     */
    async shutdown() {
        if (!this.isInitialized) return;

        try {
            await this.workflowEngine.stop();
            this.auditService.destroy();
            this.isInitialized = false;
            console.log('WorkflowService shut down successfully');

        } catch (error) {
            console.error('Error shutting down WorkflowService:', error);
            throw error;
        }
    }
}
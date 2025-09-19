import { RBACPermissionResolver } from './RBACPermissionResolver.js';
import { OrganizationalContextManager } from './OrganizationalModels.js';

/**
 * Workflow Engine - Orchestrates workflow execution with security enforcement
 */
export class WorkflowEngine {
    constructor(options = {}) {
        this.workflows = new Map();
        this.workflowTypes = new Map();
        this.organizationService = options.organizationService;
        this.rbacResolver = new RBACPermissionResolver(this.organizationService);
        this.orgContextManager = new OrganizationalContextManager(this.organizationService);
        this.notificationService = options.notificationService;
        this.auditService = options.auditService;
        this.persistenceService = options.persistenceService;
        this.validationEngine = options.validationEngine;
        this.eventListeners = new Map();
        this.globalEventListeners = [];
        this.lockManager = new Map();
        this.lockTimeout = 30000; // 30 seconds
        this.autoSaveInterval = options.autoSaveInterval || 60000; // 1 minute
        this.metricsCollector = options.metricsCollector;
        this.isRunning = false;

        // Auto-save timer
        if (this.autoSaveInterval > 0) {
            this.autoSaveTimer = setInterval(() => {
                this.autoSaveWorkflows();
            }, this.autoSaveInterval);
        }
    }

    /**
     * Start the workflow engine
     */
    async start() {
        if (this.isRunning) return;

        try {
            // Load persisted workflows
            if (this.persistenceService) {
                await this.loadPersistedWorkflows();
            }

            // Initialize event listeners
            this.setupEventListeners();

            this.isRunning = true;
            this.emit('engineStarted', { timestamp: new Date() });

            console.log('Workflow Engine started successfully');
        } catch (error) {
            console.error('Failed to start Workflow Engine:', error);
            throw error;
        }
    }

    /**
     * Stop the workflow engine
     */
    async stop() {
        if (!this.isRunning) return;

        try {
            // Save all workflows
            if (this.persistenceService) {
                await this.saveAllWorkflows();
            }

            // Clear timers
            if (this.autoSaveTimer) {
                clearInterval(this.autoSaveTimer);
            }

            // Release all locks
            this.lockManager.clear();

            this.isRunning = false;
            this.emit('engineStopped', { timestamp: new Date() });

            console.log('Workflow Engine stopped successfully');
        } catch (error) {
            console.error('Error stopping Workflow Engine:', error);
            throw error;
        }
    }

    /**
     * Register a workflow type
     */
    registerWorkflowType(name, workflowClass) {
        if (typeof workflowClass !== 'function') {
            throw new Error('Workflow class must be a constructor function');
        }

        this.workflowTypes.set(name, workflowClass);
        this.emit('workflowTypeRegistered', { name, workflowClass });
    }

    /**
     * Create a new workflow instance
     */
    async createWorkflow(type, id, user, organizationContext, options = {}) {
        if (!this.isRunning) {
            throw new Error('Workflow Engine is not running');
        }

        if (!this.workflowTypes.has(type)) {
            throw new Error(`Unknown workflow type: ${type}`);
        }

        // Check if workflow already exists
        if (this.workflows.has(id)) {
            throw new Error(`Workflow with ID ${id} already exists`);
        }

        try {
            // Get organizational context
            const orgContext = await this.orgContextManager.getOrganizationalContext(
                user.id,
                organizationContext.organizationId
            );

            // Create workflow instance
            const WorkflowClass = this.workflowTypes.get(type);
            const workflow = new WorkflowClass(id, {
                ...options,
                createdBy: user.id,
                organizationId: organizationContext.organizationId,
                rbacResolver: this.rbacResolver
            });

            // Set up workflow event listeners
            this.setupWorkflowEventListeners(workflow);

            // Set initial state
            const initialState = workflow.getInitialState();
            await workflow.setState(initialState, user, orgContext);

            // Store workflow
            this.workflows.set(id, workflow);

            // Audit workflow creation
            if (this.auditService) {
                await this.auditService.logWorkflowCreation(workflow, user, orgContext);
            }

            // Persist workflow
            if (this.persistenceService) {
                await this.persistenceService.saveWorkflow(workflow.serialize());
            }

            // Emit creation event
            this.emit('workflowCreated', {
                workflow,
                user,
                organizationContext: orgContext
            });

            // Collect metrics
            if (this.metricsCollector) {
                this.metricsCollector.recordWorkflowCreation(type, user.id, organizationContext.organizationId);
            }

            return workflow;

        } catch (error) {
            // Clean up on error
            this.workflows.delete(id);
            throw error;
        }
    }

    /**
     * Get workflow by ID
     */
    getWorkflow(id) {
        return this.workflows.get(id);
    }

    /**
     * Get workflows by criteria
     */
    getWorkflows(criteria = {}) {
        const results = [];

        for (const workflow of this.workflows.values()) {
            let matches = true;

            // Filter by type
            if (criteria.type && workflow.type !== criteria.type) {
                matches = false;
            }

            // Filter by organization
            if (criteria.organizationId && workflow.organizationId !== criteria.organizationId) {
                matches = false;
            }

            // Filter by creator
            if (criteria.createdBy && workflow.createdBy !== criteria.createdBy) {
                matches = false;
            }

            // Filter by current state
            if (criteria.currentState && workflow.currentState !== criteria.currentState) {
                matches = false;
            }

            // Filter by date range
            if (criteria.createdAfter && workflow.createdAt < criteria.createdAfter) {
                matches = false;
            }

            if (criteria.createdBefore && workflow.createdAt > criteria.createdBefore) {
                matches = false;
            }

            if (matches) {
                results.push(workflow);
            }
        }

        return results;
    }

    /**
     * Execute workflow transition with full validation
     */
    async executeTransition(workflowId, targetState, user, organizationContext, transitionContext = {}) {
        const workflow = this.getWorkflow(workflowId);
        if (!workflow) {
            throw new Error(`Workflow ${workflowId} not found`);
        }

        // Acquire workflow lock
        await this.acquireWorkflowLock(workflowId, user);

        try {
            // Get organizational context
            const orgContext = await this.orgContextManager.getOrganizationalContext(
                user.id,
                organizationContext.organizationId
            );

            // Validate current state
            const validationErrors = await workflow.validate();
            if (validationErrors.length > 0) {
                throw new Error(`Workflow validation failed: ${validationErrors.join(', ')}`);
            }

            // Execute transition
            await workflow.transitionWithPermissionCheck(targetState, user, orgContext, transitionContext);

            // Audit transition
            if (this.auditService) {
                await this.auditService.logWorkflowTransition(workflow, user, orgContext, {
                    targetState,
                    transitionContext
                });
            }

            // Persist workflow
            if (this.persistenceService) {
                await this.persistenceService.saveWorkflow(workflow.serialize());
            }

            // Send notifications
            if (this.notificationService) {
                await this.sendWorkflowNotifications(workflow, user, orgContext);
            }

            // Collect metrics
            if (this.metricsCollector) {
                this.metricsCollector.recordWorkflowTransition(
                    workflow.type,
                    targetState,
                    user.id,
                    organizationContext.organizationId
                );
            }

            return workflow;

        } finally {
            this.releaseWorkflowLock(workflowId);
        }
    }

    /**
     * Update workflow context
     */
    async updateWorkflowContext(workflowId, contextUpdates, user, organizationContext) {
        const workflow = this.getWorkflow(workflowId);
        if (!workflow) {
            throw new Error(`Workflow ${workflowId} not found`);
        }

        // Acquire workflow lock
        await this.acquireWorkflowLock(workflowId, user);

        try {
            // Get organizational context
            const orgContext = await this.orgContextManager.getOrganizationalContext(
                user.id,
                organizationContext.organizationId
            );

            // Check permissions for context update
            const currentState = workflow.getCurrentState();
            if (currentState && !currentState.node.hasPermission(user, orgContext, workflow.context)) {
                throw new Error('User does not have permission to update workflow context');
            }

            // Update context
            workflow.updateContext(contextUpdates, user);

            // Audit context update
            if (this.auditService) {
                await this.auditService.logWorkflowContextUpdate(workflow, user, orgContext, contextUpdates);
            }

            // Persist workflow
            if (this.persistenceService) {
                await this.persistenceService.saveWorkflow(workflow.serialize());
            }

            return workflow;

        } finally {
            this.releaseWorkflowLock(workflowId);
        }
    }

    /**
     * Get user's available workflows
     */
    async getUserWorkflows(user, organizationContext, options = {}) {
        const orgContext = await this.orgContextManager.getOrganizationalContext(
            user.id,
            organizationContext.organizationId
        );

        const allWorkflows = this.getWorkflows({
            organizationId: organizationContext.organizationId,
            ...options
        });

        const userWorkflows = [];

        for (const workflow of allWorkflows) {
            const currentState = workflow.getCurrentState();

            // Check if user can access this workflow
            if (workflow.createdBy === user.id ||
                (currentState && currentState.node.hasPermission(user, orgContext, workflow.context))) {

                // Get available actions for this user
                const availableActions = workflow.getAvailableActionsForUser(user, orgContext);

                userWorkflows.push({
                    workflow: workflow.getSummary(),
                    availableActions,
                    canEdit: currentState?.node.hasPermission(user, orgContext, workflow.context) || false,
                    isOwner: workflow.createdBy === user.id
                });
            }
        }

        return userWorkflows;
    }

    /**
     * Acquire workflow lock for thread-safe operations
     */
    async acquireWorkflowLock(workflowId, user) {
        const lockKey = `workflow:${workflowId}`;
        const existingLock = this.lockManager.get(lockKey);

        if (existingLock) {
            const lockAge = Date.now() - existingLock.acquiredAt;
            if (lockAge < this.lockTimeout && existingLock.userId !== user.id) {
                throw new Error(`Workflow is locked by another user. Try again in ${Math.ceil((this.lockTimeout - lockAge) / 1000)} seconds.`);
            }
            // Auto-release expired lock
            if (lockAge >= this.lockTimeout) {
                this.lockManager.delete(lockKey);
            }
        }

        this.lockManager.set(lockKey, {
            userId: user.id,
            acquiredAt: Date.now()
        });
    }

    /**
     * Release workflow lock
     */
    releaseWorkflowLock(workflowId) {
        const lockKey = `workflow:${workflowId}`;
        this.lockManager.delete(lockKey);
    }

    /**
     * Setup event listeners for a workflow
     */
    setupWorkflowEventListeners(workflow) {
        workflow.on('stateChanged', (data) => {
            this.emit('workflowStateChanged', data);
        });

        workflow.on('contextUpdated', (data) => {
            this.emit('workflowContextUpdated', data);
        });

        workflow.on('workflowReset', (data) => {
            this.emit('workflowReset', data);
        });
    }

    /**
     * Setup global event listeners
     */
    setupEventListeners() {
        this.on('workflowStateChanged', (data) => {
            console.log(`Workflow ${data.workflow.id} transitioned from ${data.fromState} to ${data.toState}`);
        });
    }

    /**
     * Send workflow notifications
     */
    async sendWorkflowNotifications(workflow, user, organizationContext) {
        if (!this.notificationService) return;

        try {
            const currentState = workflow.getCurrentState();
            const nextActors = currentState?.node.requiredActors || [];

            // Get users who need to be notified
            const notificationRecipients = await this.getNotificationRecipients(
                workflow,
                nextActors,
                organizationContext
            );

            // Send notifications
            for (const recipient of notificationRecipients) {
                await this.notificationService.sendWorkflowNotification({
                    recipient,
                    workflow,
                    currentState: currentState?.name,
                    actor: user,
                    organizationContext
                });
            }

        } catch (error) {
            console.error('Error sending workflow notifications:', error);
        }
    }

    /**
     * Get notification recipients based on workflow actors
     */
    async getNotificationRecipients(workflow, requiredActors, organizationContext) {
        const recipients = [];

        for (const actor of requiredActors) {
            const users = await this.organizationService.getUsersByActor(
                actor,
                organizationContext.organizationId,
                workflow.context
            );
            recipients.push(...users);
        }

        return recipients;
    }

    /**
     * Auto-save workflows periodically
     */
    async autoSaveWorkflows() {
        if (!this.persistenceService) return;

        try {
            const dirtyWorkflows = Array.from(this.workflows.values()).filter(
                workflow => workflow.updatedAt > workflow.lastSavedAt || new Date()
            );

            for (const workflow of dirtyWorkflows) {
                await this.persistenceService.saveWorkflow(workflow.serialize());
                workflow.lastSavedAt = new Date();
            }

            if (dirtyWorkflows.length > 0) {
                console.log(`Auto-saved ${dirtyWorkflows.length} workflows`);
            }

        } catch (error) {
            console.error('Error during auto-save:', error);
        }
    }

    /**
     * Save all workflows
     */
    async saveAllWorkflows() {
        if (!this.persistenceService) return;

        const workflows = Array.from(this.workflows.values());
        await Promise.all(workflows.map(workflow =>
            this.persistenceService.saveWorkflow(workflow.serialize())
        ));
    }

    /**
     * Load persisted workflows
     */
    async loadPersistedWorkflows() {
        if (!this.persistenceService) return;

        try {
            const workflowData = await this.persistenceService.loadWorkflows();

            for (const data of workflowData) {
                if (this.workflowTypes.has(data.type)) {
                    const WorkflowClass = this.workflowTypes.get(data.type);
                    const workflow = new WorkflowClass(data.id, {
                        context: data.context,
                        metadata: data.metadata,
                        createdBy: data.createdBy,
                        organizationId: data.organizationId,
                        rbacResolver: this.rbacResolver
                    });

                    // Restore state
                    workflow.currentState = data.currentState;
                    workflow.history = data.history;
                    workflow.createdAt = new Date(data.createdAt);
                    workflow.updatedAt = new Date(data.updatedAt);

                    this.setupWorkflowEventListeners(workflow);
                    this.workflows.set(workflow.id, workflow);
                }
            }

            console.log(`Loaded ${workflowData.length} persisted workflows`);

        } catch (error) {
            console.error('Error loading persisted workflows:', error);
        }
    }

    /**
     * Global event management
     */
    on(eventName, callback) {
        if (!this.eventListeners.has(eventName)) {
            this.eventListeners.set(eventName, []);
        }
        this.eventListeners.get(eventName).push(callback);
    }

    off(eventName, callback) {
        if (!this.eventListeners.has(eventName)) return;

        const callbacks = this.eventListeners.get(eventName);
        const index = callbacks.indexOf(callback);
        if (index !== -1) {
            callbacks.splice(index, 1);
        }
    }

    emit(eventName, data) {
        if (this.eventListeners.has(eventName)) {
            const callbacks = this.eventListeners.get(eventName);
            callbacks.forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`Error in event listener for ${eventName}:`, error);
                }
            });
        }

        // Also notify global listeners
        this.globalEventListeners.forEach(callback => {
            try {
                callback(eventName, data);
            } catch (error) {
                console.error(`Error in global event listener:`, error);
            }
        });
    }

    /**
     * Get engine statistics
     */
    getStatistics() {
        const stats = {
            totalWorkflows: this.workflows.size,
            workflowTypes: Array.from(this.workflowTypes.keys()),
            activeWorkflows: 0,
            completedWorkflows: 0,
            byType: {},
            byState: {},
            isRunning: this.isRunning,
            lockedWorkflows: this.lockManager.size
        };

        for (const workflow of this.workflows.values()) {
            // Count by type
            if (!stats.byType[workflow.type]) {
                stats.byType[workflow.type] = 0;
            }
            stats.byType[workflow.type]++;

            // Count by state
            if (workflow.currentState) {
                if (!stats.byState[workflow.currentState]) {
                    stats.byState[workflow.currentState] = 0;
                }
                stats.byState[workflow.currentState]++;

                // Count active vs completed
                if (workflow.currentState === 'completed' || workflow.currentState === 'cancelled') {
                    stats.completedWorkflows++;
                } else {
                    stats.activeWorkflows++;
                }
            }
        }

        return stats;
    }

    /**
     * Cleanup resources
     */
    destroy() {
        this.stop();
        this.workflows.clear();
        this.workflowTypes.clear();
        this.eventListeners.clear();
        this.globalEventListeners = [];
        this.lockManager.clear();
    }
}
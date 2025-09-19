import { BranchManagementWorkflow } from './BranchManagementWorkflow.js';
import { StateNode } from '../StateNode.js';
import { WorkflowActors } from '../OrganizationalModels.js';

/**
 * Create Branch Workflow Implementation
 * Manages the process of creating a new organization branch
 */
export class CreateBranchWorkflow extends BranchManagementWorkflow {
    constructor(id, options = {}) {
        super(id, { ...options, type: 'CreateBranchWorkflow', operationType: 'create' });
        this.initialize();
    }

    /**
     * Get initial state for create branch workflow
     */
    getInitialState() {
        return 'draft';
    }

    /**
     * Define all states for create branch workflow
     */
    defineStates() {
        // Draft State - Branch data collection and preparation
        this.addState('draft', new StateNode('draft', {
            transitions: [
                { target: 'validation', action: 'validate_data', label: 'Validate Branch Data' },
                { target: 'cancelled', action: 'cancel', label: 'Cancel Creation' }
            ],
            requiredActors: [WorkflowActors.REQUESTOR],
            permissionConditions: {
                customCondition: async (user, orgContext, workflowContext) => {
                    return await this.checkBranchPermission(user, orgContext, 'create');
                }
            },
            validations: [
                (context) => context.branchData ? true : 'Branch data is required',
                (context) => {
                    if (!context.branchData) return true;
                    const errors = this.validateBranchData(context.branchData);
                    return errors.length === 0 ? true : errors.join(', ');
                }
            ],
            onEnter: async (context, user, orgContext) => {
                this.logOperation('draft_created', user, { action: 'Branch creation started' });

                // Initialize default values if not provided
                if (!context.branchData) {
                    context.branchData = {
                        organization_id: orgContext.organizationId,
                        branch_status: 'pending',
                        has_multiple_buildings: false,
                        operating_hours: this.getDefaultOperatingHours()
                    };
                }
            }
        }));

        // Validation State - Data validation and business rules checking
        this.addState('validation', new StateNode('validation', {
            transitions: [
                {
                    target: 'review',
                    action: 'proceed_to_review',
                    label: 'Proceed to Review',
                    guards: [(context) => this.validateBranchData(context.branchData).length === 0]
                },
                { target: 'draft', action: 'return_to_draft', label: 'Return to Draft' },
                { target: 'cancelled', action: 'cancel', label: 'Cancel Creation' }
            ],
            requiredActors: [WorkflowActors.REQUESTOR, WorkflowActors.ANALYZER],
            validations: [
                async (context) => {
                    const errors = this.validateBranchData(context.branchData);
                    return errors.length === 0 ? true : `Validation failed: ${errors.join(', ')}`;
                },
                async (context) => {
                    // Check for duplicate branch codes
                    return await this.checkDuplicateBranchCode(context.branchData);
                },
                async (context) => {
                    // Validate parent branch relationship
                    return await this.validateParentBranch(context.branchData);
                }
            ],
            onEnter: async (context, user, orgContext) => {
                // Generate branch code if not provided
                if (!context.branchData.branch_code) {
                    context.branchData.branch_code = this.generateBranchCode(
                        context.branchData.branch_name,
                        context.branchData.organization_id
                    );
                }

                // Set default dates if not provided
                if (!context.branchData.established_date) {
                    context.branchData.established_date = new Date().toISOString().split('T')[0];
                }

                this.logOperation('validation_started', user, {
                    branchCode: context.branchData.branch_code,
                    validationChecks: ['data_format', 'business_rules', 'duplicates', 'relationships']
                });
            }
        }));

        // Review State - Management review and approval
        this.addState('review', new StateNode('review', {
            transitions: [
                {
                    target: 'approved',
                    action: 'approve_creation',
                    label: 'Approve Branch Creation',
                    guards: [(context) => context.approval_comments && context.approved_by]
                },
                {
                    target: 'rejected',
                    action: 'reject_creation',
                    label: 'Reject Branch Creation',
                    guards: [(context) => context.rejection_reason]
                },
                { target: 'validation', action: 'request_changes', label: 'Request Changes' }
            ],
            requiredActors: [WorkflowActors.APPROVER],
            permissionConditions: {
                designation: ['Manager', 'Director', 'Head', 'Admin', 'CEO', 'COO'],
                customCondition: async (user, orgContext, workflowContext) => {
                    // Ensure user has management authority
                    return await this.checkBranchPermission(user, orgContext, 'create');
                }
            },
            onEnter: async (context, user, orgContext) => {
                this.logOperation('review_started', user, {
                    branchCode: context.branchData.branch_code,
                    reviewLevel: 'management_approval'
                });
            }
        }));

        // Approved State - Ready for creation
        this.addState('approved', new StateNode('approved', {
            transitions: [
                { target: 'creating', action: 'create_branch', label: 'Create Branch in System' }
            ],
            requiredActors: [WorkflowActors.IMPLEMENTOR],
            permissionConditions: {
                designation: ['Admin', 'System Admin', 'IT Admin'],
                customCondition: async (user, orgContext, workflowContext) => {
                    return await this.checkBranchPermission(user, orgContext, 'create');
                }
            },
            onEnter: async (context, user, orgContext) => {
                context.approved_at = new Date();
                this.logOperation('creation_approved', user, {
                    branchCode: context.branchData.branch_code,
                    approver: user.username,
                    comments: context.approval_comments
                });
            }
        }));

        // Creating State - System creation in progress
        this.addState('creating', new StateNode('creating', {
            transitions: [
                { target: 'created', action: 'confirm_creation', label: 'Confirm Creation Success' },
                { target: 'creation_failed', action: 'creation_failed', label: 'Mark Creation Failed' }
            ],
            requiredActors: [WorkflowActors.IMPLEMENTOR],
            validations: [
                (context) => context.branchData.id ? true : 'Branch ID must be assigned during creation'
            ],
            onEnter: async (context, user, orgContext) => {
                // Simulate branch creation process
                context.creation_started_at = new Date();

                // In a real implementation, this would call the actual branch creation API
                try {
                    // Generate a unique branch ID (in real app, this would come from the database)
                    context.branchData.id = `branch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

                    // Set activation date if not provided
                    if (!context.branchData.activation_date) {
                        const activationDate = new Date();
                        activationDate.setDate(activationDate.getDate() + 7); // Default to 1 week from now
                        context.branchData.activation_date = activationDate.toISOString().split('T')[0];
                    }

                    this.logOperation('creation_in_progress', user, {
                        branchId: context.branchData.id,
                        branchCode: context.branchData.branch_code,
                        systemStatus: 'creating'
                    });

                } catch (error) {
                    this.logOperation('creation_error', user, {
                        error: error.message,
                        branchCode: context.branchData.branch_code
                    });
                }
            }
        }));

        // Created State - Branch successfully created
        this.addState('created', new StateNode('created', {
            transitions: [
                { target: 'activated', action: 'activate_branch', label: 'Activate Branch' }
            ],
            requiredActors: [WorkflowActors.IMPLEMENTOR],
            onEnter: async (context, user, orgContext) => {
                context.created_at = new Date();
                context.branch_reference = context.branchData.id;

                this.logOperation('creation_completed', user, {
                    branchId: context.branchData.id,
                    branchCode: context.branchData.branch_code,
                    branchName: context.branchData.branch_name,
                    status: 'created_successfully'
                });

                // Update branch data with creation metadata
                this.branchData = context.branchData;
            }
        }));

        // Activated State - Branch is active and operational
        this.addState('activated', new StateNode('activated', {
            transitions: [],
            requiredActors: [],
            onEnter: async (context, user, orgContext) => {
                context.activated_at = new Date();
                context.branchData.branch_status = 'active';

                this.logOperation('branch_activated', user, {
                    branchId: context.branchData.id,
                    branchCode: context.branchData.branch_code,
                    activationDate: context.activated_at,
                    finalStatus: 'operational'
                });

                // Calculate final metrics
                context.metrics = this.calculateBranchMetrics(context.branchData);
            }
        }));

        // Creation Failed State - Error during creation
        this.addState('creation_failed', new StateNode('creation_failed', {
            transitions: [
                { target: 'creating', action: 'retry_creation', label: 'Retry Creation' },
                { target: 'cancelled', action: 'cancel_after_failure', label: 'Cancel Creation' }
            ],
            requiredActors: [WorkflowActors.IMPLEMENTOR],
            onEnter: async (context, user, orgContext) => {
                context.creation_failed_at = new Date();

                this.logOperation('creation_failed', user, {
                    branchCode: context.branchData.branch_code,
                    failureReason: context.failure_reason,
                    failureTime: context.creation_failed_at
                });
            }
        }));

        // Rejected State - Creation rejected
        this.addState('rejected', new StateNode('rejected', {
            transitions: [
                { target: 'draft', action: 'revise_and_resubmit', label: 'Revise and Resubmit' }
            ],
            requiredActors: [WorkflowActors.REQUESTOR],
            onEnter: async (context, user, orgContext) => {
                context.rejected_at = new Date();

                this.logOperation('creation_rejected', user, {
                    branchCode: context.branchData.branch_code,
                    rejectionReason: context.rejection_reason,
                    rejectedBy: user.username
                });
            }
        }));

        // Cancelled State - Creation cancelled
        this.addState('cancelled', new StateNode('cancelled', {
            transitions: [],
            requiredActors: [],
            onEnter: async (context, user, orgContext) => {
                context.cancelled_at = new Date();

                this.logOperation('creation_cancelled', user, {
                    branchCode: context.branchData?.branch_code,
                    cancellationReason: context.cancellation_reason,
                    cancelledBy: user.username
                });
            }
        }));
    }

    /**
     * Check for duplicate branch codes
     */
    async checkDuplicateBranchCode(branchData) {
        // In a real implementation, this would query the database
        // For demo purposes, we'll simulate the check

        if (!branchData.branch_code) {
            return 'Branch code is required for duplicate check';
        }

        // Simulate database check (in real app, query actual branch records)
        const existingCodes = ['HQ-001-2024', 'REG-002-2024', 'SAL-003-2024']; // Mock existing codes

        if (existingCodes.includes(branchData.branch_code)) {
            return `Branch code '${branchData.branch_code}' already exists`;
        }

        return true;
    }

    /**
     * Validate parent branch relationship
     */
    async validateParentBranch(branchData) {
        if (!branchData.parent_branch_id) {
            return true; // No parent branch is valid (top-level branch)
        }

        // In a real implementation, this would verify the parent branch exists
        // and belongs to the same organization

        // Simulate parent branch validation
        if (branchData.parent_branch_id === branchData.id) {
            return 'Branch cannot be its own parent';
        }

        // Mock validation - in real app, query database for parent branch
        const validParentIds = ['parent_1', 'parent_2', 'parent_3'];
        if (!validParentIds.includes(branchData.parent_branch_id)) {
            return `Parent branch '${branchData.parent_branch_id}' not found or invalid`;
        }

        return true;
    }

    /**
     * Update branch data
     */
    updateBranchData(newData, user) {
        const oldData = { ...this.context.branchData };
        this.context.branchData = { ...this.context.branchData, ...newData };

        this.logOperation('data_updated', user, {
            changes: this.getDataChanges(oldData, this.context.branchData),
            updatedFields: Object.keys(newData)
        });

        this.updateContext({ branchData: this.context.branchData }, user);
    }

    /**
     * Get data changes for audit trail
     */
    getDataChanges(oldData, newData) {
        const changes = {};

        for (const [key, value] of Object.entries(newData)) {
            if (oldData[key] !== value) {
                changes[key] = {
                    from: oldData[key],
                    to: value
                };
            }
        }

        return changes;
    }

    /**
     * Get creation progress
     */
    getCreationProgress() {
        const states = ['draft', 'validation', 'review', 'approved', 'creating', 'created', 'activated'];
        const currentIndex = states.indexOf(this.currentState);

        if (currentIndex === -1) {
            return { percentage: 0, stage: 'Unknown', completed: 0, total: states.length };
        }

        return {
            percentage: Math.round((currentIndex / (states.length - 1)) * 100),
            stage: this.currentState,
            completed: currentIndex + 1,
            total: states.length
        };
    }

    /**
     * Get workflow metrics specific to branch creation
     */
    getCreationMetrics() {
        const baseMetrics = this.getMetrics();

        const creationSpecificMetrics = {
            ...baseMetrics,
            creationProgress: this.getCreationProgress(),
            branchMetrics: this.context.branchData ? this.calculateBranchMetrics(this.context.branchData) : null,
            timeToApproval: this.context.approved_at && this.createdAt ?
                this.context.approved_at - this.createdAt : null,
            timeToCreation: this.context.created_at && this.createdAt ?
                this.context.created_at - this.createdAt : null,
            timeToActivation: this.context.activated_at && this.createdAt ?
                this.context.activated_at - this.createdAt : null
        };

        return creationSpecificMetrics;
    }

    /**
     * Export creation data for reporting
     */
    exportCreationData() {
        return {
            ...this.exportBranchData(),
            creationWorkflow: {
                progress: this.getCreationProgress(),
                metrics: this.getCreationMetrics(),
                timeline: this.history.map(entry => ({
                    stage: entry.toState,
                    date: entry.timestamp,
                    user: entry.user.name,
                    duration: entry.duration
                })),
                operationLog: this.context.operationLog || []
            }
        };
    }
}
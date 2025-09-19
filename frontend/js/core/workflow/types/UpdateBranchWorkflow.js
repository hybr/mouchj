import { BranchManagementWorkflow } from './BranchManagementWorkflow.js';
import { StateNode } from '../StateNode.js';
import { WorkflowActors } from '../OrganizationalModels.js';

/**
 * Update Branch Workflow Implementation
 * Manages the process of updating an existing organization branch
 */
export class UpdateBranchWorkflow extends BranchManagementWorkflow {
    constructor(id, options = {}) {
        super(id, { ...options, type: 'UpdateBranchWorkflow', operationType: 'update' });
        this.originalBranchData = options.originalBranchData || {};
        this.initialize();
    }

    /**
     * Get initial state for update branch workflow
     */
    getInitialState() {
        return 'draft';
    }

    /**
     * Define all states for update branch workflow
     */
    defineStates() {
        // Draft State - Prepare branch updates
        this.addState('draft', new StateNode('draft', {
            transitions: [
                { target: 'validation', action: 'validate_changes', label: 'Validate Changes' },
                { target: 'cancelled', action: 'cancel', label: 'Cancel Update' }
            ],
            requiredActors: [WorkflowActors.REQUESTOR],
            permissionConditions: {
                customCondition: async (user, orgContext, workflowContext) => {
                    return await this.checkBranchPermission(user, orgContext, 'update');
                }
            },
            validations: [
                (context) => context.branchData ? true : 'Branch data is required',
                (context) => context.branchData?.id ? true : 'Branch ID is required for updates',
                (context) => {
                    if (!context.branchData) return true;
                    const errors = this.validateBranchData(context.branchData);
                    return errors.length === 0 ? true : errors.join(', ');
                }
            ],
            onEnter: async (context, user, orgContext) => {
                // Initialize update context
                if (!context.updateMetadata) {
                    context.updateMetadata = {
                        updateInitiatedBy: user.id,
                        updateInitiatedAt: new Date(),
                        updateReason: '',
                        changesSummary: {}
                    };
                }

                this.logOperation('update_draft_created', user, {
                    branchId: context.branchData?.id,
                    branchCode: context.branchData?.branch_code,
                    action: 'Update preparation started'
                });
            }
        }));

        // Validation State - Validate changes and check business rules
        this.addState('validation', new StateNode('validation', {
            transitions: [
                {
                    target: 'impact_analysis',
                    action: 'analyze_impact',
                    label: 'Analyze Update Impact',
                    guards: [(context) => this.validateBranchData(context.branchData).length === 0]
                },
                { target: 'draft', action: 'return_to_draft', label: 'Return to Draft' },
                { target: 'cancelled', action: 'cancel', label: 'Cancel Update' }
            ],
            requiredActors: [WorkflowActors.REQUESTOR, WorkflowActors.ANALYZER],
            validations: [
                async (context) => {
                    const errors = this.validateBranchData(context.branchData);
                    return errors.length === 0 ? true : `Validation failed: ${errors.join(', ')}`;
                },
                async (context) => {
                    // Check for conflicting updates
                    return await this.checkForConflicts(context.branchData);
                },
                async (context) => {
                    // Validate critical field changes
                    return await this.validateCriticalChanges(context);
                }
            ],
            onEnter: async (context, user, orgContext) => {
                // Calculate changes
                context.updateMetadata.changesSummary = this.calculateChanges(
                    this.originalBranchData,
                    context.branchData
                );

                // Determine update severity
                context.updateMetadata.updateSeverity = this.determineUpdateSeverity(
                    context.updateMetadata.changesSummary
                );

                this.logOperation('validation_started', user, {
                    branchId: context.branchData.id,
                    changesSummary: context.updateMetadata.changesSummary,
                    updateSeverity: context.updateMetadata.updateSeverity
                });
            }
        }));

        // Impact Analysis State - Analyze the impact of changes
        this.addState('impact_analysis', new StateNode('impact_analysis', {
            transitions: [
                {
                    target: 'review',
                    action: 'proceed_to_review',
                    label: 'Proceed to Review',
                    guards: [(context) => context.impactAnalysis && context.impactAnalysis.completed]
                },
                { target: 'validation', action: 'return_to_validation', label: 'Return to Validation' },
                { target: 'cancelled', action: 'cancel', label: 'Cancel Update' }
            ],
            requiredActors: [WorkflowActors.ANALYZER],
            validations: [
                (context) => {
                    const severity = context.updateMetadata?.updateSeverity;
                    return severity ? true : 'Update severity assessment is required';
                }
            ],
            onEnter: async (context, user, orgContext) => {
                // Perform impact analysis
                context.impactAnalysis = await this.performImpactAnalysis(
                    this.originalBranchData,
                    context.branchData,
                    context.updateMetadata.changesSummary
                );

                this.logOperation('impact_analysis_completed', user, {
                    branchId: context.branchData.id,
                    impactLevel: context.impactAnalysis.impactLevel,
                    affectedAreas: context.impactAnalysis.affectedAreas,
                    riskAssessment: context.impactAnalysis.riskAssessment
                });
            }
        }));

        // Review State - Management review based on update severity
        this.addState('review', new StateNode('review', {
            transitions: [
                {
                    target: 'approved',
                    action: 'approve_update',
                    label: 'Approve Update',
                    guards: [(context) => context.approval_comments && context.approved_by]
                },
                {
                    target: 'rejected',
                    action: 'reject_update',
                    label: 'Reject Update',
                    guards: [(context) => context.rejection_reason]
                },
                { target: 'impact_analysis', action: 'request_more_analysis', label: 'Request More Analysis' }
            ],
            requiredActors: [WorkflowActors.APPROVER],
            permissionConditions: {
                designation: ['Manager', 'Director', 'Head', 'Admin', 'CEO', 'COO'],
                customCondition: async (user, orgContext, workflowContext) => {
                    const severity = workflowContext.updateMetadata?.updateSeverity;

                    // High severity updates require higher-level approval
                    if (severity === 'high' || severity === 'critical') {
                        return orgContext.positions.some(pos =>
                            ['Director', 'Head', 'CEO', 'COO', 'Admin'].some(role =>
                                pos.designation.name.toLowerCase().includes(role.toLowerCase())
                            )
                        );
                    }

                    return await this.checkBranchPermission(user, orgContext, 'update');
                }
            },
            onEnter: async (context, user, orgContext) => {
                this.logOperation('review_started', user, {
                    branchId: context.branchData.id,
                    reviewLevel: this.getRequiredReviewLevel(context.updateMetadata.updateSeverity),
                    impactLevel: context.impactAnalysis?.impactLevel
                });
            }
        }));

        // Approved State - Update approved, ready for implementation
        this.addState('approved', new StateNode('approved', {
            transitions: [
                { target: 'updating', action: 'apply_update', label: 'Apply Update' },
                { target: 'scheduled', action: 'schedule_update', label: 'Schedule Update' }
            ],
            requiredActors: [WorkflowActors.IMPLEMENTOR],
            permissionConditions: {
                designation: ['Admin', 'System Admin', 'IT Admin'],
                customCondition: async (user, orgContext, workflowContext) => {
                    return await this.checkBranchPermission(user, orgContext, 'update');
                }
            },
            onEnter: async (context, user, orgContext) => {
                context.approved_at = new Date();

                // Determine if immediate update or scheduled update is needed
                context.updateStrategy = this.determineUpdateStrategy(
                    context.impactAnalysis,
                    context.updateMetadata.updateSeverity
                );

                this.logOperation('update_approved', user, {
                    branchId: context.branchData.id,
                    approver: user.username,
                    updateStrategy: context.updateStrategy,
                    scheduledFor: context.scheduledUpdateTime
                });
            }
        }));

        // Scheduled State - Update scheduled for later execution
        this.addState('scheduled', new StateNode('scheduled', {
            transitions: [
                { target: 'updating', action: 'execute_scheduled_update', label: 'Execute Scheduled Update' },
                { target: 'approved', action: 'reschedule_update', label: 'Reschedule Update' },
                { target: 'cancelled', action: 'cancel_scheduled_update', label: 'Cancel Scheduled Update' }
            ],
            requiredActors: [WorkflowActors.IMPLEMENTOR],
            onEnter: async (context, user, orgContext) => {
                context.scheduled_at = new Date();

                if (!context.scheduledUpdateTime) {
                    // Default to next maintenance window (e.g., next weekend)
                    const nextWeekend = new Date();
                    nextWeekend.setDate(nextWeekend.getDate() + (6 - nextWeekend.getDay()));
                    nextWeekend.setHours(2, 0, 0, 0); // 2 AM on Saturday
                    context.scheduledUpdateTime = nextWeekend;
                }

                this.logOperation('update_scheduled', user, {
                    branchId: context.branchData.id,
                    scheduledFor: context.scheduledUpdateTime,
                    reason: 'Impact analysis suggests scheduled maintenance window'
                });
            }
        }));

        // Updating State - Update in progress
        this.addState('updating', new StateNode('updating', {
            transitions: [
                { target: 'updated', action: 'confirm_update_success', label: 'Confirm Update Success' },
                { target: 'update_failed', action: 'mark_update_failed', label: 'Mark Update Failed' },
                { target: 'rollback', action: 'initiate_rollback', label: 'Initiate Rollback' }
            ],
            requiredActors: [WorkflowActors.IMPLEMENTOR],
            onEnter: async (context, user, orgContext) => {
                context.update_started_at = new Date();

                // Create backup of current state
                context.backup = {
                    branchData: { ...this.originalBranchData },
                    timestamp: context.update_started_at,
                    backupId: `backup_${context.branchData.id}_${Date.now()}`
                };

                // Simulate update process
                try {
                    // Apply changes (in real implementation, this would update the database)
                    context.updateResults = await this.applyBranchUpdate(
                        context.branchData,
                        context.updateMetadata.changesSummary
                    );

                    this.logOperation('update_in_progress', user, {
                        branchId: context.branchData.id,
                        backupId: context.backup.backupId,
                        changesApplied: Object.keys(context.updateMetadata.changesSummary)
                    });

                } catch (error) {
                    context.updateError = error.message;
                    this.logOperation('update_error', user, {
                        branchId: context.branchData.id,
                        error: error.message
                    });
                }
            }
        }));

        // Updated State - Update completed successfully
        this.addState('updated', new StateNode('updated', {
            transitions: [
                { target: 'verified', action: 'verify_update', label: 'Verify Update' }
            ],
            requiredActors: [WorkflowActors.IMPLEMENTOR, WorkflowActors.ANALYZER],
            onEnter: async (context, user, orgContext) => {
                context.updated_at = new Date();

                // Update the branch data reference
                this.branchData = context.branchData;

                // Calculate post-update metrics
                context.postUpdateMetrics = this.calculateBranchMetrics(context.branchData);

                this.logOperation('update_completed', user, {
                    branchId: context.branchData.id,
                    branchCode: context.branchData.branch_code,
                    updateDuration: context.updated_at - context.update_started_at,
                    changesApplied: Object.keys(context.updateMetadata.changesSummary).length
                });
            }
        }));

        // Verified State - Update verified and finalized
        this.addState('verified', new StateNode('verified', {
            transitions: [],
            requiredActors: [],
            onEnter: async (context, user, orgContext) => {
                context.verified_at = new Date();

                // Clean up backup if verification successful
                if (context.backup) {
                    context.backup.cleanedUp = true;
                    context.backup.cleanupDate = context.verified_at;
                }

                this.logOperation('update_verified', user, {
                    branchId: context.branchData.id,
                    verificationStatus: 'successful',
                    finalStatus: 'update_complete',
                    totalUpdateTime: context.verified_at - context.updateMetadata.updateInitiatedAt
                });
            }
        }));

        // Rollback State - Rollback to previous state
        this.addState('rollback', new StateNode('rollback', {
            transitions: [
                { target: 'rolled_back', action: 'confirm_rollback', label: 'Confirm Rollback Complete' },
                { target: 'rollback_failed', action: 'rollback_failed', label: 'Mark Rollback Failed' }
            ],
            requiredActors: [WorkflowActors.IMPLEMENTOR],
            onEnter: async (context, user, orgContext) => {
                context.rollback_started_at = new Date();

                try {
                    // Restore from backup
                    if (context.backup) {
                        context.branchData = { ...context.backup.branchData };

                        this.logOperation('rollback_in_progress', user, {
                            branchId: context.branchData.id,
                            backupId: context.backup.backupId,
                            rollbackReason: context.rollbackReason || 'Update verification failed'
                        });
                    }
                } catch (error) {
                    context.rollbackError = error.message;
                    this.logOperation('rollback_error', user, {
                        branchId: context.branchData.id,
                        error: error.message
                    });
                }
            }
        }));

        // Rolled Back State - Successfully rolled back
        this.addState('rolled_back', new StateNode('rolled_back', {
            transitions: [
                { target: 'draft', action: 'restart_update_process', label: 'Restart Update Process' }
            ],
            requiredActors: [WorkflowActors.REQUESTOR],
            onEnter: async (context, user, orgContext) => {
                context.rolled_back_at = new Date();

                this.logOperation('rollback_completed', user, {
                    branchId: context.branchData.id,
                    rollbackDuration: context.rolled_back_at - context.rollback_started_at,
                    restoredToBackup: context.backup?.backupId
                });
            }
        }));

        // Update Failed State - Update failed
        this.addState('update_failed', new StateNode('update_failed', {
            transitions: [
                { target: 'updating', action: 'retry_update', label: 'Retry Update' },
                { target: 'rollback', action: 'initiate_rollback', label: 'Rollback Changes' },
                { target: 'cancelled', action: 'cancel_after_failure', label: 'Cancel Update' }
            ],
            requiredActors: [WorkflowActors.IMPLEMENTOR],
            onEnter: async (context, user, orgContext) => {
                context.update_failed_at = new Date();

                this.logOperation('update_failed', user, {
                    branchId: context.branchData.id,
                    failureReason: context.updateError,
                    failureTime: context.update_failed_at
                });
            }
        }));

        // Rollback Failed State - Rollback failed
        this.addState('rollback_failed', new StateNode('rollback_failed', {
            transitions: [
                { target: 'rollback', action: 'retry_rollback', label: 'Retry Rollback' }
            ],
            requiredActors: [WorkflowActors.IMPLEMENTOR],
            onEnter: async (context, user, orgContext) => {
                context.rollback_failed_at = new Date();

                this.logOperation('rollback_failed', user, {
                    branchId: context.branchData.id,
                    rollbackError: context.rollbackError,
                    criticalStatus: 'manual_intervention_required'
                });
            }
        }));

        // Rejected State - Update rejected
        this.addState('rejected', new StateNode('rejected', {
            transitions: [
                { target: 'draft', action: 'revise_and_resubmit', label: 'Revise and Resubmit' }
            ],
            requiredActors: [WorkflowActors.REQUESTOR],
            onEnter: async (context, user, orgContext) => {
                context.rejected_at = new Date();

                this.logOperation('update_rejected', user, {
                    branchId: context.branchData.id,
                    rejectionReason: context.rejection_reason,
                    rejectedBy: user.username
                });
            }
        }));

        // Cancelled State - Update cancelled
        this.addState('cancelled', new StateNode('cancelled', {
            transitions: [],
            requiredActors: [],
            onEnter: async (context, user, orgContext) => {
                context.cancelled_at = new Date();

                this.logOperation('update_cancelled', user, {
                    branchId: context.branchData?.id,
                    cancellationReason: context.cancellation_reason,
                    cancelledBy: user.username
                });
            }
        }));
    }

    /**
     * Calculate changes between original and updated data
     */
    calculateChanges(originalData, updatedData) {
        const changes = {};

        for (const [key, value] of Object.entries(updatedData)) {
            if (originalData[key] !== value) {
                changes[key] = {
                    from: originalData[key],
                    to: value,
                    type: this.getChangeType(key, originalData[key], value)
                };
            }
        }

        return changes;
    }

    /**
     * Get change type for a field
     */
    getChangeType(field, oldValue, newValue) {
        // Critical fields that require special handling
        const criticalFields = ['branch_code', 'organization_id', 'branch_status'];
        const contactFields = ['primary_phone_number', 'primary_email_address', 'website'];
        const dateFields = ['established_date', 'activation_date', 'closure_date'];

        if (criticalFields.includes(field)) {
            return 'critical';
        }
        if (contactFields.includes(field)) {
            return 'contact';
        }
        if (dateFields.includes(field)) {
            return 'date';
        }
        if (field === 'operating_hours') {
            return 'operational';
        }

        return 'standard';
    }

    /**
     * Determine update severity based on changes
     */
    determineUpdateSeverity(changesSummary) {
        const changes = Object.values(changesSummary);

        const hasCriticalChanges = changes.some(change => change.type === 'critical');
        const hasOperationalChanges = changes.some(change => change.type === 'operational');
        const changeCount = changes.length;

        if (hasCriticalChanges) {
            return 'critical';
        }
        if (hasOperationalChanges || changeCount > 5) {
            return 'high';
        }
        if (changeCount > 2) {
            return 'medium';
        }

        return 'low';
    }

    /**
     * Check for conflicting updates
     */
    async checkForConflicts(branchData) {
        // In a real implementation, this would check for concurrent updates
        // and data conflicts with other systems

        // Simulate conflict detection
        if (branchData.branch_code && branchData.branch_code !== this.originalBranchData.branch_code) {
            // Check if new branch code already exists
            const existingCodes = ['HQ-001-2024', 'REG-002-2024', 'SAL-003-2024'];
            if (existingCodes.includes(branchData.branch_code)) {
                return `Branch code '${branchData.branch_code}' is already in use`;
            }
        }

        return true;
    }

    /**
     * Validate critical field changes
     */
    async validateCriticalChanges(context) {
        const changes = context.updateMetadata?.changesSummary || {};
        const criticalChanges = Object.entries(changes).filter(([key, change]) => change.type === 'critical');

        for (const [field, change] of criticalChanges) {
            switch (field) {
                case 'branch_code':
                    if (!context.criticalChangeApproval?.branch_code_change_approved) {
                        return 'Branch code changes require special approval';
                    }
                    break;

                case 'organization_id':
                    return 'Organization ID cannot be changed through update workflow';

                case 'branch_status':
                    if (change.to === 'closed' && !context.closureDocumentation) {
                        return 'Branch closure requires proper documentation';
                    }
                    break;
            }
        }

        return true;
    }

    /**
     * Perform impact analysis
     */
    async performImpactAnalysis(originalData, updatedData, changesSummary) {
        const analysis = {
            completed: true,
            impactLevel: 'low',
            affectedAreas: [],
            riskAssessment: 'low',
            recommendations: [],
            estimatedDowntime: 0
        };

        const changes = Object.values(changesSummary);

        // Analyze impact based on change types
        const criticalChanges = changes.filter(c => c.type === 'critical');
        const operationalChanges = changes.filter(c => c.type === 'operational');
        const contactChanges = changes.filter(c => c.type === 'contact');

        if (criticalChanges.length > 0) {
            analysis.impactLevel = 'high';
            analysis.riskAssessment = 'high';
            analysis.affectedAreas.push('System Integration', 'Reporting', 'Compliance');
            analysis.estimatedDowntime = 30; // minutes
            analysis.recommendations.push('Schedule during maintenance window');
            analysis.recommendations.push('Notify all stakeholders');
        }

        if (operationalChanges.length > 0) {
            analysis.impactLevel = analysis.impactLevel === 'high' ? 'high' : 'medium';
            analysis.affectedAreas.push('Operations', 'Customer Service');
            analysis.estimatedDowntime = Math.max(analysis.estimatedDowntime, 15);
            analysis.recommendations.push('Update customer communications');
        }

        if (contactChanges.length > 0) {
            analysis.affectedAreas.push('Communications', 'Marketing Materials');
            analysis.recommendations.push('Update published contact information');
        }

        // Remove duplicates
        analysis.affectedAreas = [...new Set(analysis.affectedAreas)];
        analysis.recommendations = [...new Set(analysis.recommendations)];

        return analysis;
    }

    /**
     * Get required review level based on severity
     */
    getRequiredReviewLevel(severity) {
        const reviewLevels = {
            'low': 'Manager Approval',
            'medium': 'Department Head Approval',
            'high': 'Director Approval',
            'critical': 'Executive Approval'
        };

        return reviewLevels[severity] || 'Standard Approval';
    }

    /**
     * Determine update strategy
     */
    determineUpdateStrategy(impactAnalysis, severity) {
        if (severity === 'critical' || impactAnalysis.estimatedDowntime > 0) {
            return 'scheduled';
        }

        if (impactAnalysis.impactLevel === 'high') {
            return 'immediate_with_monitoring';
        }

        return 'immediate';
    }

    /**
     * Apply branch update (simulation)
     */
    async applyBranchUpdate(branchData, changesSummary) {
        // Simulate update process
        const results = {
            success: true,
            appliedChanges: [],
            warnings: [],
            errors: []
        };

        for (const [field, change] of Object.entries(changesSummary)) {
            try {
                // Simulate field-specific update logic
                switch (change.type) {
                    case 'critical':
                        // Critical changes require additional validation
                        await this.applyCriticalChange(field, change);
                        results.appliedChanges.push(`${field}: ${change.from} → ${change.to}`);
                        break;

                    case 'operational':
                        // Operational changes may have dependencies
                        await this.applyOperationalChange(field, change);
                        results.appliedChanges.push(`${field}: ${change.from} → ${change.to}`);
                        break;

                    default:
                        // Standard changes
                        results.appliedChanges.push(`${field}: ${change.from} → ${change.to}`);
                        break;
                }
            } catch (error) {
                results.errors.push(`Failed to update ${field}: ${error.message}`);
                results.success = false;
            }
        }

        return results;
    }

    /**
     * Apply critical change with special handling
     */
    async applyCriticalChange(field, change) {
        // Simulate critical change application
        console.log(`Applying critical change to ${field}: ${change.from} → ${change.to}`);

        // Add slight delay to simulate complex operation
        await new Promise(resolve => setTimeout(resolve, 100));
    }

    /**
     * Apply operational change
     */
    async applyOperationalChange(field, change) {
        // Simulate operational change application
        console.log(`Applying operational change to ${field}: ${change.from} → ${change.to}`);

        // Add slight delay to simulate operation
        await new Promise(resolve => setTimeout(resolve, 50));
    }

    /**
     * Get update progress
     */
    getUpdateProgress() {
        const states = ['draft', 'validation', 'impact_analysis', 'review', 'approved', 'updating', 'updated', 'verified'];
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
     * Get update metrics
     */
    getUpdateMetrics() {
        const baseMetrics = this.getMetrics();

        const updateSpecificMetrics = {
            ...baseMetrics,
            updateProgress: this.getUpdateProgress(),
            changesSummary: this.context.updateMetadata?.changesSummary || {},
            updateSeverity: this.context.updateMetadata?.updateSeverity,
            impactAnalysis: this.context.impactAnalysis,
            timeToApproval: this.context.approved_at && this.createdAt ?
                this.context.approved_at - this.createdAt : null,
            timeToCompletion: this.context.verified_at && this.createdAt ?
                this.context.verified_at - this.createdAt : null,
            rollbacksPerformed: this.context.rollback_started_at ? 1 : 0
        };

        return updateSpecificMetrics;
    }

    /**
     * Export update data for reporting
     */
    exportUpdateData() {
        return {
            ...this.exportBranchData(),
            updateWorkflow: {
                originalData: this.originalBranchData,
                updatedData: this.branchData,
                progress: this.getUpdateProgress(),
                metrics: this.getUpdateMetrics(),
                changesSummary: this.context.updateMetadata?.changesSummary,
                impactAnalysis: this.context.impactAnalysis,
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
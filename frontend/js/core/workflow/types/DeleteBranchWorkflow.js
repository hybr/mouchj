import { BranchManagementWorkflow } from './BranchManagementWorkflow.js';
import { StateNode } from '../StateNode.js';
import { WorkflowActors } from '../OrganizationalModels.js';

/**
 * Delete Branch Workflow Implementation
 * Manages the process of safely deleting an organization branch
 */
export class DeleteBranchWorkflow extends BranchManagementWorkflow {
    constructor(id, options = {}) {
        super(id, { ...options, type: 'DeleteBranchWorkflow', operationType: 'delete' });
        this.initialize();
    }

    /**
     * Get initial state for delete branch workflow
     */
    getInitialState() {
        return 'draft';
    }

    /**
     * Define all states for delete branch workflow
     */
    defineStates() {
        // Draft State - Prepare for deletion
        this.addState('draft', new StateNode('draft', {
            transitions: [
                { target: 'dependency_check', action: 'check_dependencies', label: 'Check Dependencies' },
                { target: 'cancelled', action: 'cancel', label: 'Cancel Deletion' }
            ],
            requiredActors: [WorkflowActors.REQUESTOR],
            permissionConditions: {
                customCondition: async (user, orgContext, workflowContext) => {
                    return await this.checkBranchPermission(user, orgContext, 'delete');
                }
            },
            validations: [
                (context) => context.branchData ? true : 'Branch data is required',
                (context) => context.branchData?.id ? true : 'Branch ID is required for deletion',
                (context) => context.deletionReason ? true : 'Deletion reason is required'
            ],
            onEnter: async (context, user, orgContext) => {
                // Initialize deletion metadata
                if (!context.deletionMetadata) {
                    context.deletionMetadata = {
                        deletionInitiatedBy: user.id,
                        deletionInitiatedAt: new Date(),
                        deletionReason: '',
                        deletionType: 'soft', // soft or hard
                        backupRequired: true
                    };
                }

                this.logOperation('deletion_draft_created', user, {
                    branchId: context.branchData?.id,
                    branchCode: context.branchData?.branch_code,
                    action: 'Deletion preparation started'
                });
            }
        }));

        // Dependency Check State - Check for dependencies before deletion
        this.addState('dependency_check', new StateNode('dependency_check', {
            transitions: [
                {
                    target: 'impact_assessment',
                    action: 'assess_impact',
                    label: 'Assess Deletion Impact',
                    guards: [(context) => context.dependencyCheck && context.dependencyCheck.completed]
                },
                { target: 'dependency_resolution', action: 'resolve_dependencies', label: 'Resolve Dependencies' },
                { target: 'blocked', action: 'block_deletion', label: 'Block Deletion' },
                { target: 'cancelled', action: 'cancel', label: 'Cancel Deletion' }
            ],
            requiredActors: [WorkflowActors.ANALYZER],
            onEnter: async (context, user, orgContext) => {
                // Perform dependency check
                context.dependencyCheck = await this.performDependencyCheck(context.branchData);

                this.logOperation('dependency_check_completed', user, {
                    branchId: context.branchData.id,
                    dependenciesFound: context.dependencyCheck.dependenciesFound,
                    blockingDependencies: context.dependencyCheck.blockingDependencies,
                    canProceed: context.dependencyCheck.canProceed
                });
            }
        }));

        // Dependency Resolution State - Resolve blocking dependencies
        this.addState('dependency_resolution', new StateNode('dependency_resolution', {
            transitions: [
                { target: 'dependency_check', action: 'recheck_dependencies', label: 'Recheck Dependencies' },
                { target: 'impact_assessment', action: 'proceed_with_dependencies', label: 'Proceed Despite Dependencies' },
                { target: 'blocked', action: 'unable_to_resolve', label: 'Unable to Resolve' }
            ],
            requiredActors: [WorkflowActors.IMPLEMENTOR, WorkflowActors.ANALYZER],
            onEnter: async (context, user, orgContext) => {
                this.logOperation('dependency_resolution_started', user, {
                    branchId: context.branchData.id,
                    dependenciesToResolve: context.dependencyCheck?.blockingDependencies?.length || 0
                });
            }
        }));

        // Impact Assessment State - Assess deletion impact
        this.addState('impact_assessment', new StateNode('impact_assessment', {
            transitions: [
                {
                    target: 'review',
                    action: 'proceed_to_review',
                    label: 'Proceed to Review',
                    guards: [(context) => context.impactAssessment && context.impactAssessment.completed]
                },
                { target: 'dependency_check', action: 'return_to_dependency_check', label: 'Return to Dependency Check' },
                { target: 'cancelled', action: 'cancel_due_to_impact', label: 'Cancel Due to Impact' }
            ],
            requiredActors: [WorkflowActors.ANALYZER],
            onEnter: async (context, user, orgContext) => {
                // Perform impact assessment
                context.impactAssessment = await this.performImpactAssessment(
                    context.branchData,
                    context.dependencyCheck
                );

                // Determine deletion complexity
                context.deletionComplexity = this.determineDeletionComplexity(
                    context.impactAssessment,
                    context.dependencyCheck
                );

                this.logOperation('impact_assessment_completed', user, {
                    branchId: context.branchData.id,
                    impactLevel: context.impactAssessment.impactLevel,
                    deletionComplexity: context.deletionComplexity,
                    affectedSystems: context.impactAssessment.affectedSystems
                });
            }
        }));

        // Review State - Management review for deletion approval
        this.addState('review', new StateNode('review', {
            transitions: [
                {
                    target: 'approved',
                    action: 'approve_deletion',
                    label: 'Approve Deletion',
                    guards: [(context) => context.approval_comments && context.approved_by]
                },
                {
                    target: 'rejected',
                    action: 'reject_deletion',
                    label: 'Reject Deletion',
                    guards: [(context) => context.rejection_reason]
                },
                { target: 'impact_assessment', action: 'request_more_assessment', label: 'Request More Assessment' }
            ],
            requiredActors: [WorkflowActors.APPROVER],
            permissionConditions: {
                designation: ['Director', 'Head', 'Admin', 'CEO', 'COO'],
                customCondition: async (user, orgContext, workflowContext) => {
                    // High-impact deletions require executive approval
                    const complexity = workflowContext.deletionComplexity;
                    if (complexity === 'high' || complexity === 'critical') {
                        return orgContext.positions.some(pos =>
                            ['Director', 'Head', 'CEO', 'COO', 'Admin'].some(role =>
                                pos.designation.name.toLowerCase().includes(role.toLowerCase())
                            )
                        );
                    }

                    return await this.checkBranchPermission(user, orgContext, 'delete');
                }
            },
            onEnter: async (context, user, orgContext) => {
                this.logOperation('deletion_review_started', user, {
                    branchId: context.branchData.id,
                    reviewLevel: this.getRequiredApprovalLevel(context.deletionComplexity),
                    impactLevel: context.impactAssessment?.impactLevel
                });
            }
        }));

        // Approved State - Deletion approved, ready for execution
        this.addState('approved', new StateNode('approved', {
            transitions: [
                { target: 'backup', action: 'create_backup', label: 'Create Backup' },
                { target: 'deleting', action: 'proceed_to_deletion', label: 'Proceed to Deletion' }
            ],
            requiredActors: [WorkflowActors.IMPLEMENTOR],
            permissionConditions: {
                designation: ['Admin', 'System Admin', 'IT Admin'],
                customCondition: async (user, orgContext, workflowContext) => {
                    return await this.checkBranchPermission(user, orgContext, 'delete');
                }
            },
            onEnter: async (context, user, orgContext) => {
                context.approved_at = new Date();

                // Set deletion strategy based on complexity
                context.deletionStrategy = this.determineDeletionStrategy(
                    context.deletionComplexity,
                    context.impactAssessment
                );

                this.logOperation('deletion_approved', user, {
                    branchId: context.branchData.id,
                    approver: user.username,
                    deletionStrategy: context.deletionStrategy,
                    backupRequired: context.deletionMetadata.backupRequired
                });
            }
        }));

        // Backup State - Create backup before deletion
        this.addState('backup', new StateNode('backup', {
            transitions: [
                { target: 'deleting', action: 'proceed_to_deletion', label: 'Proceed to Deletion' },
                { target: 'backup_failed', action: 'backup_failed', label: 'Mark Backup Failed' }
            ],
            requiredActors: [WorkflowActors.IMPLEMENTOR],
            onEnter: async (context, user, orgContext) => {
                context.backup_started_at = new Date();

                try {
                    // Create comprehensive backup
                    context.backup = await this.createBranchBackup(context.branchData);

                    this.logOperation('backup_created', user, {
                        branchId: context.branchData.id,
                        backupId: context.backup.backupId,
                        backupSize: context.backup.size,
                        backupLocation: context.backup.location
                    });

                } catch (error) {
                    context.backupError = error.message;
                    this.logOperation('backup_failed', user, {
                        branchId: context.branchData.id,
                        error: error.message
                    });
                }
            }
        }));

        // Deleting State - Deletion in progress
        this.addState('deleting', new StateNode('deleting', {
            transitions: [
                { target: 'deleted', action: 'confirm_deletion', label: 'Confirm Deletion Complete' },
                { target: 'deletion_failed', action: 'deletion_failed', label: 'Mark Deletion Failed' },
                { target: 'restore', action: 'initiate_restore', label: 'Restore from Backup' }
            ],
            requiredActors: [WorkflowActors.IMPLEMENTOR],
            onEnter: async (context, user, orgContext) => {
                context.deletion_started_at = new Date();

                try {
                    // Execute deletion process
                    context.deletionResults = await this.executeBranchDeletion(
                        context.branchData,
                        context.deletionStrategy
                    );

                    this.logOperation('deletion_in_progress', user, {
                        branchId: context.branchData.id,
                        deletionType: context.deletionMetadata.deletionType,
                        strategy: context.deletionStrategy
                    });

                } catch (error) {
                    context.deletionError = error.message;
                    this.logOperation('deletion_error', user, {
                        branchId: context.branchData.id,
                        error: error.message
                    });
                }
            }
        }));

        // Deleted State - Branch successfully deleted
        this.addState('deleted', new StateNode('deleted', {
            transitions: [
                { target: 'verified', action: 'verify_deletion', label: 'Verify Deletion' }
            ],
            requiredActors: [WorkflowActors.ANALYZER],
            onEnter: async (context, user, orgContext) => {
                context.deleted_at = new Date();

                // Mark branch as deleted
                if (context.deletionMetadata.deletionType === 'soft') {
                    context.branchData.branch_status = 'deleted';
                    context.branchData.deleted_at = context.deleted_at;
                }

                this.logOperation('deletion_completed', user, {
                    branchId: context.branchData.id,
                    branchCode: context.branchData.branch_code,
                    deletionDuration: context.deleted_at - context.deletion_started_at,
                    deletionType: context.deletionMetadata.deletionType
                });
            }
        }));

        // Verified State - Deletion verified and finalized
        this.addState('verified', new StateNode('verified', {
            transitions: [],
            requiredActors: [],
            onEnter: async (context, user, orgContext) => {
                context.verified_at = new Date();

                // Archive or retain backup based on policy
                if (context.backup) {
                    context.backup.archived = true;
                    context.backup.archiveDate = context.verified_at;
                    context.backup.retentionPeriod = 365; // days
                }

                this.logOperation('deletion_verified', user, {
                    branchId: context.branchData.id,
                    verificationStatus: 'successful',
                    finalStatus: 'deletion_complete',
                    totalDeletionTime: context.verified_at - context.deletionMetadata.deletionInitiatedAt
                });
            }
        }));

        // Restore State - Restore from backup
        this.addState('restore', new StateNode('restore', {
            transitions: [
                { target: 'restored', action: 'confirm_restore', label: 'Confirm Restore Complete' },
                { target: 'restore_failed', action: 'restore_failed', label: 'Mark Restore Failed' }
            ],
            requiredActors: [WorkflowActors.IMPLEMENTOR],
            onEnter: async (context, user, orgContext) => {
                context.restore_started_at = new Date();

                try {
                    if (context.backup) {
                        // Restore from backup
                        context.restoreResults = await this.restoreFromBackup(context.backup);

                        this.logOperation('restore_in_progress', user, {
                            branchId: context.branchData.id,
                            backupId: context.backup.backupId,
                            restoreReason: context.restoreReason || 'Deletion rollback'
                        });
                    }
                } catch (error) {
                    context.restoreError = error.message;
                    this.logOperation('restore_error', user, {
                        branchId: context.branchData.id,
                        error: error.message
                    });
                }
            }
        }));

        // Restored State - Successfully restored
        this.addState('restored', new StateNode('restored', {
            transitions: [
                { target: 'draft', action: 'restart_deletion_process', label: 'Restart Deletion Process' }
            ],
            requiredActors: [WorkflowActors.REQUESTOR],
            onEnter: async (context, user, orgContext) => {
                context.restored_at = new Date();

                // Reset branch status
                context.branchData.branch_status = 'active';
                delete context.branchData.deleted_at;

                this.logOperation('restore_completed', user, {
                    branchId: context.branchData.id,
                    restoreDuration: context.restored_at - context.restore_started_at,
                    restoredFromBackup: context.backup?.backupId
                });
            }
        }));

        // Blocked State - Deletion blocked due to dependencies
        this.addState('blocked', new StateNode('blocked', {
            transitions: [
                { target: 'dependency_resolution', action: 'retry_dependency_resolution', label: 'Retry Dependency Resolution' },
                { target: 'cancelled', action: 'cancel_due_to_blocking', label: 'Cancel Due to Blocking Issues' }
            ],
            requiredActors: [WorkflowActors.ANALYZER],
            onEnter: async (context, user, orgContext) => {
                context.blocked_at = new Date();

                this.logOperation('deletion_blocked', user, {
                    branchId: context.branchData.id,
                    blockingReason: context.blockingReason || 'Unresolved dependencies',
                    blockingDependencies: context.dependencyCheck?.blockingDependencies
                });
            }
        }));

        // Failed States
        this.addState('backup_failed', new StateNode('backup_failed', {
            transitions: [
                { target: 'backup', action: 'retry_backup', label: 'Retry Backup' },
                { target: 'deleting', action: 'proceed_without_backup', label: 'Proceed Without Backup' },
                { target: 'cancelled', action: 'cancel_due_to_backup_failure', label: 'Cancel Due to Backup Failure' }
            ],
            requiredActors: [WorkflowActors.IMPLEMENTOR],
            onEnter: async (context, user, orgContext) => {
                context.backup_failed_at = new Date();

                this.logOperation('backup_failed', user, {
                    branchId: context.branchData.id,
                    backupError: context.backupError
                });
            }
        }));

        this.addState('deletion_failed', new StateNode('deletion_failed', {
            transitions: [
                { target: 'deleting', action: 'retry_deletion', label: 'Retry Deletion' },
                { target: 'restore', action: 'restore_from_backup', label: 'Restore from Backup' },
                { target: 'cancelled', action: 'cancel_after_failure', label: 'Cancel After Failure' }
            ],
            requiredActors: [WorkflowActors.IMPLEMENTOR],
            onEnter: async (context, user, orgContext) => {
                context.deletion_failed_at = new Date();

                this.logOperation('deletion_failed', user, {
                    branchId: context.branchData.id,
                    deletionError: context.deletionError
                });
            }
        }));

        this.addState('restore_failed', new StateNode('restore_failed', {
            transitions: [
                { target: 'restore', action: 'retry_restore', label: 'Retry Restore' }
            ],
            requiredActors: [WorkflowActors.IMPLEMENTOR],
            onEnter: async (context, user, orgContext) => {
                context.restore_failed_at = new Date();

                this.logOperation('restore_failed', user, {
                    branchId: context.branchData.id,
                    restoreError: context.restoreError,
                    criticalStatus: 'manual_intervention_required'
                });
            }
        }));

        // Rejected State - Deletion rejected
        this.addState('rejected', new StateNode('rejected', {
            transitions: [
                { target: 'draft', action: 'revise_and_resubmit', label: 'Revise and Resubmit' }
            ],
            requiredActors: [WorkflowActors.REQUESTOR],
            onEnter: async (context, user, orgContext) => {
                context.rejected_at = new Date();

                this.logOperation('deletion_rejected', user, {
                    branchId: context.branchData.id,
                    rejectionReason: context.rejection_reason,
                    rejectedBy: user.username
                });
            }
        }));

        // Cancelled State - Deletion cancelled
        this.addState('cancelled', new StateNode('cancelled', {
            transitions: [],
            requiredActors: [],
            onEnter: async (context, user, orgContext) => {
                context.cancelled_at = new Date();

                this.logOperation('deletion_cancelled', user, {
                    branchId: context.branchData?.id,
                    cancellationReason: context.cancellation_reason,
                    cancelledBy: user.username
                });
            }
        }));
    }

    /**
     * Perform dependency check
     */
    async performDependencyCheck(branchData) {
        const dependencyCheck = {
            completed: true,
            dependenciesFound: 0,
            blockingDependencies: [],
            warningDependencies: [],
            canProceed: true,
            checkedSystems: []
        };

        // Check for child branches
        const childBranches = await this.findChildBranches(branchData.id);
        if (childBranches.length > 0) {
            dependencyCheck.blockingDependencies.push({
                type: 'child_branches',
                description: `${childBranches.length} child branches exist`,
                items: childBranches,
                severity: 'high',
                resolution: 'Reassign child branches to different parent or delete them first'
            });
        }

        // Check for associated users/employees
        const associatedUsers = await this.findAssociatedUsers(branchData.id);
        if (associatedUsers.length > 0) {
            dependencyCheck.blockingDependencies.push({
                type: 'associated_users',
                description: `${associatedUsers.length} users are associated with this branch`,
                items: associatedUsers,
                severity: 'high',
                resolution: 'Transfer users to different branch or terminate associations'
            });
        }

        // Check for active operations
        const activeOperations = await this.findActiveOperations(branchData.id);
        if (activeOperations.length > 0) {
            dependencyCheck.warningDependencies.push({
                type: 'active_operations',
                description: `${activeOperations.length} active operations found`,
                items: activeOperations,
                severity: 'medium',
                resolution: 'Complete or transfer active operations before deletion'
            });
        }

        // Check for financial records
        const financialRecords = await this.findFinancialRecords(branchData.id);
        if (financialRecords.length > 0) {
            dependencyCheck.warningDependencies.push({
                type: 'financial_records',
                description: `${financialRecords.length} financial records linked to branch`,
                items: financialRecords,
                severity: 'medium',
                resolution: 'Archive financial records before deletion'
            });
        }

        dependencyCheck.dependenciesFound =
            dependencyCheck.blockingDependencies.length + dependencyCheck.warningDependencies.length;
        dependencyCheck.canProceed = dependencyCheck.blockingDependencies.length === 0;

        return dependencyCheck;
    }

    /**
     * Find child branches (simulation)
     */
    async findChildBranches(branchId) {
        // In real implementation, query database for branches with parent_branch_id = branchId
        // For demo, return mock data
        return [
            { id: 'child_1', branch_code: 'CH1-001', branch_name: 'Child Branch 1' },
            { id: 'child_2', branch_code: 'CH2-002', branch_name: 'Child Branch 2' }
        ];
    }

    /**
     * Find associated users (simulation)
     */
    async findAssociatedUsers(branchId) {
        // In real implementation, query for users assigned to this branch
        return [
            { id: 'user_1', name: 'John Doe', position: 'Branch Manager' },
            { id: 'user_2', name: 'Jane Smith', position: 'Sales Representative' }
        ];
    }

    /**
     * Find active operations (simulation)
     */
    async findActiveOperations(branchId) {
        // In real implementation, check for active workflows, orders, etc.
        return [
            { id: 'op_1', type: 'Sales Order', status: 'processing' },
            { id: 'op_2', type: 'Procurement', status: 'pending' }
        ];
    }

    /**
     * Find financial records (simulation)
     */
    async findFinancialRecords(branchId) {
        // In real implementation, check for financial transactions, reports, etc.
        return [
            { id: 'fin_1', type: 'Monthly Report', period: '2024-03' },
            { id: 'fin_2', type: 'Expense Record', amount: 5000 }
        ];
    }

    /**
     * Perform impact assessment
     */
    async performImpactAssessment(branchData, dependencyCheck) {
        const assessment = {
            completed: true,
            impactLevel: 'low',
            affectedSystems: [],
            affectedStakeholders: [],
            businessImpact: 'minimal',
            technicalImpact: 'minimal',
            complianceImpact: 'none',
            recommendations: []
        };

        // Assess impact based on dependencies
        if (dependencyCheck.blockingDependencies.length > 0) {
            assessment.impactLevel = 'high';
            assessment.businessImpact = 'significant';
            assessment.affectedSystems.push('Branch Management', 'User Management');
        }

        if (dependencyCheck.warningDependencies.length > 0) {
            assessment.impactLevel = assessment.impactLevel === 'high' ? 'high' : 'medium';
            assessment.affectedSystems.push('Operations', 'Financial Systems');
        }

        // Assess branch importance
        if (branchData.branch_function === 'headquarters') {
            assessment.impactLevel = 'critical';
            assessment.businessImpact = 'critical';
            assessment.complianceImpact = 'high';
            assessment.recommendations.push('Headquarters deletion requires board approval');
        }

        if (branchData.has_multiple_buildings) {
            assessment.impactLevel = assessment.impactLevel === 'critical' ? 'critical' : 'high';
            assessment.affectedSystems.push('Facility Management', 'Asset Management');
        }

        // Add affected stakeholders
        assessment.affectedStakeholders = [
            'Branch Employees',
            'Local Customers',
            'Regional Management',
            'IT Department',
            'Finance Department'
        ];

        // Add recommendations
        assessment.recommendations.push('Create detailed communication plan');
        assessment.recommendations.push('Archive all branch data before deletion');
        assessment.recommendations.push('Transfer critical operations to other branches');

        return assessment;
    }

    /**
     * Determine deletion complexity
     */
    determineDeletionComplexity(impactAssessment, dependencyCheck) {
        const blockingDeps = dependencyCheck.blockingDependencies.length;
        const warningDeps = dependencyCheck.warningDependencies.length;
        const impactLevel = impactAssessment.impactLevel;

        if (impactLevel === 'critical' || blockingDeps > 2) {
            return 'critical';
        }
        if (impactLevel === 'high' || blockingDeps > 0) {
            return 'high';
        }
        if (impactLevel === 'medium' || warningDeps > 2) {
            return 'medium';
        }

        return 'low';
    }

    /**
     * Get required approval level based on complexity
     */
    getRequiredApprovalLevel(complexity) {
        const approvalLevels = {
            'low': 'Manager Approval',
            'medium': 'Department Head Approval',
            'high': 'Director Approval',
            'critical': 'Executive Board Approval'
        };

        return approvalLevels[complexity] || 'Standard Approval';
    }

    /**
     * Determine deletion strategy
     */
    determineDeletionStrategy(complexity, impactAssessment) {
        if (complexity === 'critical') {
            return 'phased_deletion_with_migration';
        }
        if (complexity === 'high') {
            return 'scheduled_deletion_with_backup';
        }
        if (impactAssessment.affectedSystems.length > 3) {
            return 'coordinated_deletion';
        }

        return 'standard_deletion';
    }

    /**
     * Create branch backup
     */
    async createBranchBackup(branchData) {
        const backup = {
            backupId: `backup_${branchData.id}_${Date.now()}`,
            branchData: { ...branchData },
            timestamp: new Date(),
            size: '2.5MB', // Simulated size
            location: `/backups/branches/${branchData.branch_code}`,
            checksums: {},
            metadata: {
                backupType: 'full',
                compressionUsed: true,
                encryptionUsed: true
            }
        };

        // Simulate backup process
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Calculate checksums (simulation)
        backup.checksums = {
            md5: 'abc123def456',
            sha256: '789ghi012jkl345mno678pqr'
        };

        return backup;
    }

    /**
     * Execute branch deletion
     */
    async executeBranchDeletion(branchData, deletionStrategy) {
        const results = {
            success: true,
            deletionType: this.context.deletionMetadata?.deletionType || 'soft',
            steps: [],
            warnings: [],
            errors: []
        };

        try {
            switch (deletionStrategy) {
                case 'phased_deletion_with_migration':
                    await this.executesPhasedDeletion(branchData, results);
                    break;

                case 'scheduled_deletion_with_backup':
                    await this.executeScheduledDeletion(branchData, results);
                    break;

                case 'coordinated_deletion':
                    await this.executeCoordinatedDeletion(branchData, results);
                    break;

                default:
                    await this.executeStandardDeletion(branchData, results);
                    break;
            }

        } catch (error) {
            results.success = false;
            results.errors.push(error.message);
        }

        return results;
    }

    /**
     * Execute standard deletion
     */
    async executeStandardDeletion(branchData, results) {
        results.steps.push('Marking branch as deleted');

        if (this.context.deletionMetadata?.deletionType === 'soft') {
            // Soft delete - mark as deleted but keep data
            results.steps.push('Soft delete: Updating branch status to deleted');
        } else {
            // Hard delete - remove data (simulation)
            results.steps.push('Hard delete: Removing branch data from systems');
        }

        // Simulate deletion process
        await new Promise(resolve => setTimeout(resolve, 500));

        results.steps.push('Deletion completed successfully');
    }

    /**
     * Execute phased deletion
     */
    async executesPhasedDeletion(branchData, results) {
        const phases = [
            'Migrate critical data',
            'Transfer user assignments',
            'Archive financial records',
            'Update system references',
            'Perform final deletion'
        ];

        for (const phase of phases) {
            results.steps.push(`Phase: ${phase}`);
            await new Promise(resolve => setTimeout(resolve, 200));
        }
    }

    /**
     * Execute scheduled deletion
     */
    async executeScheduledDeletion(branchData, results) {
        results.steps.push('Executing scheduled deletion');
        results.steps.push('Coordinating with affected systems');
        await new Promise(resolve => setTimeout(resolve, 300));
        results.steps.push('Deletion completed during maintenance window');
    }

    /**
     * Execute coordinated deletion
     */
    async executeCoordinatedDeletion(branchData, results) {
        results.steps.push('Coordinating with multiple systems');
        results.steps.push('Updating system references');
        results.steps.push('Cleaning up related data');
        await new Promise(resolve => setTimeout(resolve, 400));
        results.steps.push('Coordinated deletion completed');
    }

    /**
     * Restore from backup
     */
    async restoreFromBackup(backup) {
        const results = {
            success: true,
            restoredData: backup.branchData,
            verificationStatus: 'verified',
            warnings: []
        };

        // Simulate restore process
        await new Promise(resolve => setTimeout(resolve, 800));

        return results;
    }

    /**
     * Get deletion progress
     */
    getDeletionProgress() {
        const states = ['draft', 'dependency_check', 'impact_assessment', 'review', 'approved', 'backup', 'deleting', 'deleted', 'verified'];
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
     * Get deletion metrics
     */
    getDeletionMetrics() {
        const baseMetrics = this.getMetrics();

        const deletionSpecificMetrics = {
            ...baseMetrics,
            deletionProgress: this.getDeletionProgress(),
            deletionComplexity: this.context.deletionComplexity,
            dependenciesFound: this.context.dependencyCheck?.dependenciesFound || 0,
            blockingDependencies: this.context.dependencyCheck?.blockingDependencies?.length || 0,
            impactLevel: this.context.impactAssessment?.impactLevel,
            timeToApproval: this.context.approved_at && this.createdAt ?
                this.context.approved_at - this.createdAt : null,
            timeToCompletion: this.context.verified_at && this.createdAt ?
                this.context.verified_at - this.createdAt : null,
            restoresPerformed: this.context.restore_started_at ? 1 : 0
        };

        return deletionSpecificMetrics;
    }

    /**
     * Export deletion data for reporting
     */
    exportDeletionData() {
        return {
            ...this.exportBranchData(),
            deletionWorkflow: {
                progress: this.getDeletionProgress(),
                metrics: this.getDeletionMetrics(),
                dependencyCheck: this.context.dependencyCheck,
                impactAssessment: this.context.impactAssessment,
                backup: this.context.backup,
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
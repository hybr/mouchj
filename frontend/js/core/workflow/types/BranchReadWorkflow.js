import { BranchManagementWorkflow } from './BranchManagementWorkflow.js';
import { StateNode } from '../StateNode.js';
import { WorkflowActors } from '../OrganizationalModels.js';

/**
 * Branch Read Workflow Implementation
 * Manages the process of viewing branch details with proper permissions and audit trail
 */
export class BranchReadWorkflow extends BranchManagementWorkflow {
    constructor(id, options = {}) {
        super(id, { ...options, type: 'BranchReadWorkflow', operationType: 'read' });
        this.branchId = options.branchId;
        this.includeRelated = options.includeRelated || false;
        this.includeSensitive = options.includeSensitive || false;
        this.initialize();
    }

    /**
     * Get initial state for read branch workflow
     */
    getInitialState() {
        return 'requested';
    }

    /**
     * Define all states for read branch workflow
     */
    defineStates() {
        // Requested State - Initial request to view branch
        this.addState('requested', new StateNode('requested', {
            transitions: [
                { target: 'validating', action: 'validate_request', label: 'Validate Read Request' },
                { target: 'denied', action: 'deny_access', label: 'Deny Access' }
            ],
            requiredActors: [WorkflowActors.REQUESTOR],
            permissionConditions: {
                customCondition: async (user, orgContext, workflowContext) => {
                    return await this.checkBranchPermission(user, orgContext, 'read');
                }
            },
            validations: [
                (context) => context.branchId ? true : 'Branch ID is required for read operation',
                (context) => this.isValidBranchId(context.branchId) ? true : 'Invalid branch ID format'
            ],
            onEnter: async (context, user, orgContext) => {
                // Set branch ID from constructor if not in context
                if (!context.branchId && this.branchId) {
                    context.branchId = this.branchId;
                }

                this.logOperation('read_requested', user, {
                    branchId: context.branchId,
                    includeRelated: this.includeRelated,
                    includeSensitive: this.includeSensitive,
                    requestTime: new Date()
                });
            }
        }));

        // Validating State - Validate request and check permissions
        this.addState('validating', new StateNode('validating', {
            transitions: [
                {
                    target: 'authorized',
                    action: 'authorize_access',
                    label: 'Authorize Read Access',
                    guards: [
                        (context) => context.branchExists === true,
                        (context) => context.hasReadPermission === true
                    ]
                },
                { target: 'denied', action: 'deny_access', label: 'Deny Access' }
            ],
            requiredActors: [WorkflowActors.ANALYZER],
            validations: [
                async (context) => {
                    // Check if branch exists
                    const branchExists = await this.checkBranchExists(context.branchId);
                    context.branchExists = branchExists;
                    return branchExists ? true : 'Branch not found';
                },
                async (context) => {
                    // Check organization access
                    return await this.validateOrganizationAccess(context);
                }
            ],
            onEnter: async (context, user, orgContext) => {
                // Validate branch existence and permissions
                try {
                    // In real implementation, this would query the database
                    context.branchExists = await this.checkBranchExists(context.branchId);

                    if (context.branchExists) {
                        // Load basic branch information
                        context.branchBasicInfo = await this.loadBranchBasicInfo(context.branchId);

                        // Check if user has permission to read this specific branch
                        context.hasReadPermission = await this.checkSpecificBranchPermission(
                            user, orgContext, context.branchBasicInfo, 'read'
                        );
                    }

                    this.logOperation('validation_started', user, {
                        branchId: context.branchId,
                        branchExists: context.branchExists,
                        hasPermission: context.hasReadPermission,
                        validationChecks: ['existence', 'organization_match', 'read_permission']
                    });

                } catch (error) {
                    context.validationError = error.message;
                    this.logOperation('validation_error', user, {
                        branchId: context.branchId,
                        error: error.message
                    });
                }
            }
        }));

        // Authorized State - User authorized to read branch data
        this.addState('authorized', new StateNode('authorized', {
            transitions: [
                { target: 'loading', action: 'load_branch_data', label: 'Load Branch Data' }
            ],
            requiredActors: [WorkflowActors.REQUESTOR],
            onEnter: async (context, user, orgContext) => {
                context.authorized_at = new Date();
                context.access_level = this.determineAccessLevel(user, orgContext, context.branchBasicInfo);

                this.logOperation('access_authorized', user, {
                    branchId: context.branchId,
                    accessLevel: context.access_level,
                    authorizedAt: context.authorized_at
                });
            }
        }));

        // Loading State - Loading complete branch data
        this.addState('loading', new StateNode('loading', {
            transitions: [
                { target: 'loaded', action: 'data_loaded', label: 'Data Successfully Loaded' },
                { target: 'error', action: 'loading_failed', label: 'Loading Failed' }
            ],
            requiredActors: [WorkflowActors.REQUESTOR],
            onEnter: async (context, user, orgContext) => {
                context.loading_started_at = new Date();

                try {
                    // Load complete branch data based on access level
                    context.branchData = await this.loadCompleteBranchData(
                        context.branchId,
                        context.access_level,
                        user,
                        orgContext
                    );

                    // Load related data if requested and authorized
                    if (this.includeRelated && this.canAccessRelatedData(context.access_level)) {
                        context.relatedData = await this.loadRelatedBranchData(context.branchId, user);
                    }

                    // Format data for display
                    context.formattedBranchData = this.formatBranchData(context.branchData);
                    context.branchMetrics = this.calculateBranchMetrics(context.branchData);

                    this.logOperation('data_loading', user, {
                        branchId: context.branchId,
                        dataFields: Object.keys(context.branchData),
                        includesRelated: !!context.relatedData,
                        accessLevel: context.access_level
                    });

                } catch (error) {
                    context.loadingError = error.message;
                    this.logOperation('loading_error', user, {
                        branchId: context.branchId,
                        error: error.message
                    });
                }
            }
        }));

        // Loaded State - Data successfully loaded and ready for display
        this.addState('loaded', new StateNode('loaded', {
            transitions: [
                { target: 'refreshing', action: 'refresh_data', label: 'Refresh Branch Data' },
                { target: 'viewing', action: 'view_data', label: 'View Branch Data' }
            ],
            requiredActors: [WorkflowActors.REQUESTOR],
            onEnter: async (context, user, orgContext) => {
                context.loaded_at = new Date();
                context.loading_duration = context.loaded_at - context.loading_started_at;

                // Store loaded data for access
                this.branchData = context.branchData;

                this.logOperation('data_loaded', user, {
                    branchId: context.branchId,
                    branchCode: context.branchData.branch_code,
                    branchName: context.branchData.branch_name,
                    loadingDuration: context.loading_duration,
                    dataSize: JSON.stringify(context.branchData).length
                });
            }
        }));

        // Viewing State - User actively viewing the branch data
        this.addState('viewing', new StateNode('viewing', {
            transitions: [
                { target: 'refreshing', action: 'refresh_data', label: 'Refresh Data' },
                { target: 'completed', action: 'complete_viewing', label: 'Complete Viewing' }
            ],
            requiredActors: [WorkflowActors.REQUESTOR],
            onEnter: async (context, user, orgContext) => {
                context.viewing_started_at = new Date();
                context.view_count = (context.view_count || 0) + 1;

                this.logOperation('viewing_started', user, {
                    branchId: context.branchId,
                    viewCount: context.view_count,
                    viewStartTime: context.viewing_started_at
                });
            },
            onExit: async (context, user, orgContext) => {
                if (context.viewing_started_at) {
                    context.viewing_duration = new Date() - context.viewing_started_at;
                    context.total_viewing_time = (context.total_viewing_time || 0) + context.viewing_duration;

                    this.logOperation('viewing_session_ended', user, {
                        branchId: context.branchId,
                        sessionDuration: context.viewing_duration,
                        totalViewingTime: context.total_viewing_time
                    });
                }
            }
        }));

        // Refreshing State - Refreshing branch data
        this.addState('refreshing', new StateNode('refreshing', {
            transitions: [
                { target: 'loaded', action: 'refresh_completed', label: 'Refresh Completed' },
                { target: 'error', action: 'refresh_failed', label: 'Refresh Failed' }
            ],
            requiredActors: [WorkflowActors.REQUESTOR],
            onEnter: async (context, user, orgContext) => {
                context.refresh_started_at = new Date();
                context.refresh_count = (context.refresh_count || 0) + 1;

                try {
                    // Reload branch data
                    const refreshedData = await this.loadCompleteBranchData(
                        context.branchId,
                        context.access_level,
                        user,
                        orgContext
                    );

                    // Compare with existing data to detect changes
                    context.dataChanges = this.compareDataChanges(context.branchData, refreshedData);
                    context.branchData = refreshedData;
                    context.formattedBranchData = this.formatBranchData(refreshedData);
                    context.branchMetrics = this.calculateBranchMetrics(refreshedData);

                    this.logOperation('data_refreshed', user, {
                        branchId: context.branchId,
                        refreshCount: context.refresh_count,
                        changesDetected: Object.keys(context.dataChanges).length,
                        changes: context.dataChanges
                    });

                } catch (error) {
                    context.refreshError = error.message;
                    this.logOperation('refresh_error', user, {
                        branchId: context.branchId,
                        error: error.message
                    });
                }
            }
        }));

        // Completed State - Read operation completed
        this.addState('completed', new StateNode('completed', {
            transitions: [],
            requiredActors: [],
            onEnter: async (context, user, orgContext) => {
                context.completed_at = new Date();
                context.total_duration = context.completed_at - (context.authorized_at || this.createdAt);

                this.logOperation('read_completed', user, {
                    branchId: context.branchId,
                    branchCode: context.branchData?.branch_code,
                    totalDuration: context.total_duration,
                    viewCount: context.view_count || 0,
                    refreshCount: context.refresh_count || 0,
                    totalViewingTime: context.total_viewing_time || 0
                });
            }
        }));

        // Error State - Error during read operation
        this.addState('error', new StateNode('error', {
            transitions: [
                { target: 'loading', action: 'retry_loading', label: 'Retry Loading' },
                { target: 'denied', action: 'give_up', label: 'Give Up' }
            ],
            requiredActors: [WorkflowActors.REQUESTOR],
            onEnter: async (context, user, orgContext) => {
                context.error_occurred_at = new Date();
                context.error_message = context.loadingError || context.refreshError || 'Unknown error';

                this.logOperation('read_error', user, {
                    branchId: context.branchId,
                    errorMessage: context.error_message,
                    errorTime: context.error_occurred_at
                });
            }
        }));

        // Denied State - Access denied
        this.addState('denied', new StateNode('denied', {
            transitions: [],
            requiredActors: [],
            onEnter: async (context, user, orgContext) => {
                context.denied_at = new Date();
                context.denial_reason = this.getDenialReason(context);

                this.logOperation('access_denied', user, {
                    branchId: context.branchId,
                    denialReason: context.denial_reason,
                    deniedAt: context.denied_at
                });
            }
        }));
    }

    /**
     * Check if branch ID format is valid
     */
    isValidBranchId(branchId) {
        return branchId && (typeof branchId === 'string' || typeof branchId === 'number');
    }

    /**
     * Check if branch exists
     */
    async checkBranchExists(branchId) {
        // In real implementation, this would query the database
        // For demo purposes, simulate check

        if (!branchId) return false;

        // Mock existing branch IDs
        const existingBranches = [
            'branch_1', 'branch_2', 'branch_3',
            'HQ-001-2024', 'REG-002-2024', 'SAL-003-2024'
        ];

        return existingBranches.includes(branchId.toString()) ||
               branchId.toString().startsWith('branch_');
    }

    /**
     * Load basic branch information
     */
    async loadBranchBasicInfo(branchId) {
        // In real implementation, this would query the database
        // Return mock basic info
        return {
            id: branchId,
            branch_code: `BR-${branchId}`,
            branch_name: `Branch ${branchId}`,
            organization_id: 'org_1',
            branch_status: 'active'
        };
    }

    /**
     * Check specific branch permission
     */
    async checkSpecificBranchPermission(user, orgContext, branchInfo, operation) {
        // Check if branch belongs to user's organization
        if (branchInfo.organization_id !== orgContext.organizationId) {
            return false;
        }

        // Use base permission check
        return await this.checkBranchPermission(user, orgContext, operation);
    }

    /**
     * Determine user's access level
     */
    determineAccessLevel(user, orgContext, branchInfo) {
        const positions = orgContext.positions || [];

        // Check for admin roles
        const hasAdminRole = positions.some(position => {
            const designation = position.designation.name.toLowerCase();
            return designation.includes('admin') || designation.includes('director');
        });

        // Check for management roles
        const hasManagementRole = positions.some(position => {
            const designation = position.designation.name.toLowerCase();
            return designation.includes('manager') || designation.includes('head');
        });

        if (hasAdminRole) return 'full';
        if (hasManagementRole) return 'management';
        return 'basic';
    }

    /**
     * Load complete branch data based on access level
     */
    async loadCompleteBranchData(branchId, accessLevel, user, orgContext) {
        // In real implementation, this would query the database with appropriate filters

        const baseData = {
            id: branchId,
            branch_code: `BR-${branchId}`,
            branch_name: `Branch ${branchId}`,
            organization_id: orgContext.organizationId,
            zone: 'Zone A',
            region: 'Region 1',
            has_multiple_buildings: false,
            branch_function: 'regional_office',
            branch_status: 'active',
            established_date: '2024-01-15',
            activation_date: '2024-02-01',
            operating_hours: this.getDefaultOperatingHours()
        };

        // Add sensitive data based on access level
        if (accessLevel === 'management' || accessLevel === 'full') {
            baseData.primary_phone_number = '+1-555-0123';
            baseData.primary_email_address = `branch${branchId}@example.com`;
            baseData.contact_person_id = 'person_123';
        }

        if (accessLevel === 'full') {
            baseData.fax_number = '+1-555-0124';
            baseData.website = `https://branch${branchId}.example.com`;
            baseData.purpose_description = 'Regional operations and customer service';
        }

        return baseData;
    }

    /**
     * Check if user can access related data
     */
    canAccessRelatedData(accessLevel) {
        return accessLevel === 'management' || accessLevel === 'full';
    }

    /**
     * Load related branch data
     */
    async loadRelatedBranchData(branchId, user) {
        // In real implementation, this would load related entities
        return {
            parentBranch: null,
            childBranches: [],
            contactPerson: {
                id: 'person_123',
                name: 'John Doe',
                title: 'Branch Manager'
            },
            employees: [],
            departments: []
        };
    }

    /**
     * Validate organization access
     */
    async validateOrganizationAccess(context) {
        // This would validate that the branch belongs to an organization
        // the user has access to
        return true;
    }

    /**
     * Compare data changes for refresh operations
     */
    compareDataChanges(oldData, newData) {
        const changes = {};

        if (!oldData) return changes;

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
     * Get denial reason
     */
    getDenialReason(context) {
        if (!context.branchExists) {
            return 'Branch not found';
        }

        if (context.hasReadPermission === false) {
            return 'Insufficient permissions to read branch data';
        }

        if (context.validationError) {
            return context.validationError;
        }

        return 'Access denied for unknown reason';
    }

    /**
     * Get branch access summary
     */
    getBranchAccessSummary() {
        return {
            branchId: this.context.branchId,
            branchCode: this.context.branchData?.branch_code,
            branchName: this.context.branchData?.branch_name,
            accessLevel: this.context.access_level,
            currentState: this.currentState,
            viewCount: this.context.view_count || 0,
            totalViewingTime: this.context.total_viewing_time || 0,
            lastAccessed: this.context.viewing_started_at,
            dataLoaded: !!this.context.branchData
        };
    }

    /**
     * Get read metrics specific to this operation
     */
    getReadMetrics() {
        const baseMetrics = this.getMetrics();

        return {
            ...baseMetrics,
            branchAccess: this.getBranchAccessSummary(),
            performance: {
                loadingDuration: this.context.loading_duration,
                totalViewingTime: this.context.total_viewing_time,
                refreshCount: this.context.refresh_count || 0,
                viewCount: this.context.view_count || 0
            },
            dataMetrics: this.context.branchData ?
                this.calculateBranchMetrics(this.context.branchData) : null
        };
    }

    /**
     * Export read session data
     */
    exportReadSession() {
        return {
            ...this.exportBranchData(),
            readSession: {
                summary: this.getBranchAccessSummary(),
                metrics: this.getReadMetrics(),
                timeline: this.history.map(entry => ({
                    state: entry.toState,
                    timestamp: entry.timestamp,
                    user: entry.user.name,
                    duration: entry.duration
                })),
                accessLog: this.context.operationLog || []
            }
        };
    }
}
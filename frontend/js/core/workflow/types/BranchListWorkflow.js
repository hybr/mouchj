import { BranchManagementWorkflow } from './BranchManagementWorkflow.js';
import { StateNode } from '../StateNode.js';
import { WorkflowActors } from '../OrganizationalModels.js';

/**
 * Branch List Workflow Implementation
 * Manages the process of listing branches with filtering, sorting, and pagination
 */
export class BranchListWorkflow extends BranchManagementWorkflow {
    constructor(id, options = {}) {
        super(id, { ...options, type: 'BranchListWorkflow', operationType: 'list' });
        this.filters = options.filters || {};
        this.sortOptions = options.sortOptions || { field: 'branch_name', direction: 'asc' };
        this.pagination = options.pagination || { page: 1, limit: 20 };
        this.includeInactive = options.includeInactive || false;
        this.includeMetrics = options.includeMetrics || false;
        this.initialize();
    }

    /**
     * Get initial state for list branches workflow
     */
    getInitialState() {
        return 'requested';
    }

    /**
     * Define all states for list branches workflow
     */
    defineStates() {
        // Requested State - Initial request to list branches
        this.addState('requested', new StateNode('requested', {
            transitions: [
                { target: 'validating', action: 'validate_request', label: 'Validate List Request' },
                { target: 'denied', action: 'deny_access', label: 'Deny Access' }
            ],
            requiredActors: [WorkflowActors.REQUESTOR],
            permissionConditions: {
                customCondition: async (user, orgContext, workflowContext) => {
                    return await this.checkBranchPermission(user, orgContext, 'list');
                }
            },
            validations: [
                (context) => this.validatePaginationParams(context.pagination),
                (context) => this.validateSortOptions(context.sortOptions),
                (context) => this.validateFilters(context.filters)
            ],
            onEnter: async (context, user, orgContext) => {
                // Initialize request parameters
                context.filters = { ...this.filters };
                context.sortOptions = { ...this.sortOptions };
                context.pagination = { ...this.pagination };
                context.includeInactive = this.includeInactive;
                context.includeMetrics = this.includeMetrics;

                // Add organization filter automatically
                context.filters.organization_id = orgContext.organizationId;

                this.logOperation('list_requested', user, {
                    filters: context.filters,
                    sortOptions: context.sortOptions,
                    pagination: context.pagination,
                    includeInactive: context.includeInactive,
                    includeMetrics: context.includeMetrics,
                    requestTime: new Date()
                });
            }
        }));

        // Validating State - Validate request parameters and permissions
        this.addState('validating', new StateNode('validating', {
            transitions: [
                {
                    target: 'authorized',
                    action: 'authorize_access',
                    label: 'Authorize List Access',
                    guards: [
                        (context) => context.hasListPermission === true,
                        (context) => context.validationPassed === true
                    ]
                },
                { target: 'denied', action: 'deny_access', label: 'Deny Access' }
            ],
            requiredActors: [WorkflowActors.ANALYZER],
            validations: [
                async (context) => {
                    // Validate organization access
                    return await this.validateOrganizationAccess(context);
                },
                async (context) => {
                    // Validate filter permissions
                    return await this.validateFilterPermissions(context);
                }
            ],
            onEnter: async (context, user, orgContext) => {
                try {
                    // Check list permissions
                    context.hasListPermission = await this.checkBranchPermission(user, orgContext, 'list');

                    // Validate and sanitize filters
                    context.sanitizedFilters = this.sanitizeFilters(context.filters, user, orgContext);

                    // Determine user's access level for data filtering
                    context.accessLevel = this.determineAccessLevel(user, orgContext);

                    // Validate pagination limits based on user role
                    context.maxLimit = this.getMaxPaginationLimit(context.accessLevel);
                    if (context.pagination.limit > context.maxLimit) {
                        context.pagination.limit = context.maxLimit;
                    }

                    context.validationPassed = true;

                    this.logOperation('validation_completed', user, {
                        hasPermission: context.hasListPermission,
                        accessLevel: context.accessLevel,
                        sanitizedFilters: context.sanitizedFilters,
                        maxLimit: context.maxLimit,
                        validationChecks: ['permissions', 'filters', 'pagination', 'organization_access']
                    });

                } catch (error) {
                    context.validationError = error.message;
                    context.validationPassed = false;

                    this.logOperation('validation_error', user, {
                        error: error.message
                    });
                }
            }
        }));

        // Authorized State - User authorized to list branches
        this.addState('authorized', new StateNode('authorized', {
            transitions: [
                { target: 'loading', action: 'load_branch_list', label: 'Load Branch List' }
            ],
            requiredActors: [WorkflowActors.REQUESTOR],
            onEnter: async (context, user, orgContext) => {
                context.authorized_at = new Date();

                // Build final query parameters
                context.queryParams = this.buildQueryParameters(
                    context.sanitizedFilters,
                    context.sortOptions,
                    context.pagination,
                    context.accessLevel
                );

                this.logOperation('access_authorized', user, {
                    accessLevel: context.accessLevel,
                    queryParams: context.queryParams,
                    authorizedAt: context.authorized_at
                });
            }
        }));

        // Loading State - Loading branch list data
        this.addState('loading', new StateNode('loading', {
            transitions: [
                { target: 'loaded', action: 'data_loaded', label: 'Data Successfully Loaded' },
                { target: 'error', action: 'loading_failed', label: 'Loading Failed' }
            ],
            requiredActors: [WorkflowActors.REQUESTOR],
            onEnter: async (context, user, orgContext) => {
                context.loading_started_at = new Date();

                try {
                    // Load branch list from data source
                    const listResult = await this.loadBranchList(context.queryParams, context.accessLevel);

                    context.branches = listResult.branches;
                    context.totalCount = listResult.totalCount;
                    context.pageInfo = this.calculatePageInfo(context.pagination, listResult.totalCount);

                    // Load metrics for each branch if requested
                    if (context.includeMetrics && context.branches.length > 0) {
                        context.branchMetrics = await this.loadBranchListMetrics(context.branches);
                    }

                    // Format branch data for display
                    context.formattedBranches = context.branches.map(branch =>
                        this.formatBranchData(branch)
                    );

                    // Calculate summary statistics
                    context.summaryStats = this.calculateSummaryStatistics(context.branches);

                    this.logOperation('data_loading', user, {
                        branchCount: context.branches.length,
                        totalCount: context.totalCount,
                        pageInfo: context.pageInfo,
                        includesMetrics: !!context.branchMetrics,
                        queryParams: context.queryParams
                    });

                } catch (error) {
                    context.loadingError = error.message;
                    this.logOperation('loading_error', user, {
                        error: error.message,
                        queryParams: context.queryParams
                    });
                }
            }
        }));

        // Loaded State - Data successfully loaded and ready for display
        this.addState('loaded', new StateNode('loaded', {
            transitions: [
                { target: 'refreshing', action: 'refresh_list', label: 'Refresh Branch List' },
                { target: 'filtering', action: 'apply_filters', label: 'Apply New Filters' },
                { target: 'sorting', action: 'sort_list', label: 'Sort List' },
                { target: 'paginating', action: 'change_page', label: 'Change Page' },
                { target: 'viewing', action: 'view_list', label: 'View Branch List' }
            ],
            requiredActors: [WorkflowActors.REQUESTOR],
            onEnter: async (context, user, orgContext) => {
                context.loaded_at = new Date();
                context.loading_duration = context.loaded_at - context.loading_started_at;

                // Store loaded data for access
                this.branchList = context.branches;
                this.listSummary = context.summaryStats;

                this.logOperation('data_loaded', user, {
                    branchCount: context.branches.length,
                    totalCount: context.totalCount,
                    loadingDuration: context.loading_duration,
                    summaryStats: context.summaryStats
                });
            }
        }));

        // Viewing State - User actively viewing the branch list
        this.addState('viewing', new StateNode('viewing', {
            transitions: [
                { target: 'refreshing', action: 'refresh_list', label: 'Refresh List' },
                { target: 'filtering', action: 'apply_filters', label: 'Apply Filters' },
                { target: 'sorting', action: 'sort_list', label: 'Sort List' },
                { target: 'paginating', action: 'change_page', label: 'Change Page' },
                { target: 'completed', action: 'complete_viewing', label: 'Complete Viewing' }
            ],
            requiredActors: [WorkflowActors.REQUESTOR],
            onEnter: async (context, user, orgContext) => {
                context.viewing_started_at = new Date();
                context.view_count = (context.view_count || 0) + 1;

                this.logOperation('viewing_started', user, {
                    branchCount: context.branches.length,
                    viewCount: context.view_count,
                    viewStartTime: context.viewing_started_at
                });
            }
        }));

        // Filtering State - Applying new filters
        this.addState('filtering', new StateNode('filtering', {
            transitions: [
                { target: 'loading', action: 'reload_with_filters', label: 'Reload with New Filters' },
                { target: 'loaded', action: 'cancel_filtering', label: 'Cancel Filtering' }
            ],
            requiredActors: [WorkflowActors.REQUESTOR],
            validations: [
                (context) => this.validateFilters(context.newFilters || {}),
                (context) => this.validateFilterPermissions(context)
            ],
            onEnter: async (context, user, orgContext) => {
                // Process new filters
                if (context.newFilters) {
                    context.sanitizedFilters = this.sanitizeFilters(context.newFilters, user, orgContext);
                    context.queryParams = this.buildQueryParameters(
                        context.sanitizedFilters,
                        context.sortOptions,
                        { page: 1, limit: context.pagination.limit }, // Reset to first page
                        context.accessLevel
                    );
                }

                this.logOperation('filtering_applied', user, {
                    newFilters: context.newFilters,
                    sanitizedFilters: context.sanitizedFilters
                });
            }
        }));

        // Sorting State - Applying new sort options
        this.addState('sorting', new StateNode('sorting', {
            transitions: [
                { target: 'loading', action: 'reload_with_sort', label: 'Reload with New Sort' },
                { target: 'loaded', action: 'cancel_sorting', label: 'Cancel Sorting' }
            ],
            requiredActors: [WorkflowActors.REQUESTOR],
            validations: [
                (context) => this.validateSortOptions(context.newSortOptions || {})
            ],
            onEnter: async (context, user, orgContext) => {
                // Process new sort options
                if (context.newSortOptions) {
                    context.sortOptions = { ...context.newSortOptions };
                    context.queryParams = this.buildQueryParameters(
                        context.sanitizedFilters,
                        context.sortOptions,
                        context.pagination,
                        context.accessLevel
                    );
                }

                this.logOperation('sorting_applied', user, {
                    newSortOptions: context.newSortOptions
                });
            }
        }));

        // Paginating State - Changing page
        this.addState('paginating', new StateNode('paginating', {
            transitions: [
                { target: 'loading', action: 'reload_with_pagination', label: 'Reload with New Page' },
                { target: 'loaded', action: 'cancel_pagination', label: 'Cancel Pagination' }
            ],
            requiredActors: [WorkflowActors.REQUESTOR],
            validations: [
                (context) => this.validatePaginationParams(context.newPagination || {})
            ],
            onEnter: async (context, user, orgContext) => {
                // Process new pagination
                if (context.newPagination) {
                    context.pagination = { ...context.pagination, ...context.newPagination };
                    context.queryParams = this.buildQueryParameters(
                        context.sanitizedFilters,
                        context.sortOptions,
                        context.pagination,
                        context.accessLevel
                    );
                }

                this.logOperation('pagination_changed', user, {
                    newPagination: context.newPagination,
                    currentPagination: context.pagination
                });
            }
        }));

        // Refreshing State - Refreshing branch list
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
                    // Reload with current parameters
                    const listResult = await this.loadBranchList(context.queryParams, context.accessLevel);

                    // Compare with existing data to detect changes
                    context.dataChanges = this.compareListChanges(context.branches, listResult.branches);

                    context.branches = listResult.branches;
                    context.totalCount = listResult.totalCount;
                    context.pageInfo = this.calculatePageInfo(context.pagination, listResult.totalCount);
                    context.formattedBranches = context.branches.map(branch =>
                        this.formatBranchData(branch)
                    );
                    context.summaryStats = this.calculateSummaryStatistics(context.branches);

                    if (context.includeMetrics && context.branches.length > 0) {
                        context.branchMetrics = await this.loadBranchListMetrics(context.branches);
                    }

                    this.logOperation('list_refreshed', user, {
                        refreshCount: context.refresh_count,
                        branchCount: context.branches.length,
                        changesDetected: context.dataChanges.length,
                        changes: context.dataChanges
                    });

                } catch (error) {
                    context.refreshError = error.message;
                    this.logOperation('refresh_error', user, {
                        error: error.message
                    });
                }
            }
        }));

        // Completed State - List operation completed
        this.addState('completed', new StateNode('completed', {
            transitions: [],
            requiredActors: [],
            onEnter: async (context, user, orgContext) => {
                context.completed_at = new Date();
                context.total_duration = context.completed_at - (context.authorized_at || this.createdAt);

                this.logOperation('list_completed', user, {
                    totalDuration: context.total_duration,
                    branchCount: context.branches?.length || 0,
                    viewCount: context.view_count || 0,
                    refreshCount: context.refresh_count || 0,
                    finalSummary: context.summaryStats
                });
            }
        }));

        // Error State - Error during list operation
        this.addState('error', new StateNode('error', {
            transitions: [
                { target: 'loading', action: 'retry_loading', label: 'Retry Loading' },
                { target: 'denied', action: 'give_up', label: 'Give Up' }
            ],
            requiredActors: [WorkflowActors.REQUESTOR],
            onEnter: async (context, user, orgContext) => {
                context.error_occurred_at = new Date();
                context.error_message = context.loadingError || context.refreshError || 'Unknown error';

                this.logOperation('list_error', user, {
                    errorMessage: context.error_message,
                    errorTime: context.error_occurred_at,
                    queryParams: context.queryParams
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
                    denialReason: context.denial_reason,
                    deniedAt: context.denied_at
                });
            }
        }));
    }

    /**
     * Validate pagination parameters
     */
    validatePaginationParams(pagination) {
        if (!pagination) return 'Pagination parameters are required';

        const { page, limit } = pagination;

        if (page && (page < 1 || !Number.isInteger(page))) {
            return 'Page must be a positive integer';
        }

        if (limit && (limit < 1 || limit > 100 || !Number.isInteger(limit))) {
            return 'Limit must be a positive integer between 1 and 100';
        }

        return true;
    }

    /**
     * Validate sort options
     */
    validateSortOptions(sortOptions) {
        if (!sortOptions) return true;

        const validFields = [
            'branch_name', 'branch_code', 'established_date',
            'activation_date', 'branch_status', 'zone', 'region'
        ];

        const validDirections = ['asc', 'desc'];

        if (sortOptions.field && !validFields.includes(sortOptions.field)) {
            return `Invalid sort field. Valid options: ${validFields.join(', ')}`;
        }

        if (sortOptions.direction && !validDirections.includes(sortOptions.direction)) {
            return `Invalid sort direction. Valid options: ${validDirections.join(', ')}`;
        }

        return true;
    }

    /**
     * Validate filters
     */
    validateFilters(filters) {
        if (!filters || typeof filters !== 'object') return true;

        const validFilters = [
            'branch_status', 'zone', 'region', 'branch_function',
            'has_multiple_buildings', 'parent_branch_id', 'search'
        ];

        for (const filterKey of Object.keys(filters)) {
            if (!validFilters.includes(filterKey) && filterKey !== 'organization_id') {
                return `Invalid filter: ${filterKey}. Valid options: ${validFilters.join(', ')}`;
            }
        }

        return true;
    }

    /**
     * Determine user's access level
     */
    determineAccessLevel(user, orgContext) {
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
     * Get maximum pagination limit based on access level
     */
    getMaxPaginationLimit(accessLevel) {
        const limits = {
            'full': 100,
            'management': 50,
            'basic': 20
        };

        return limits[accessLevel] || 20;
    }

    /**
     * Sanitize filters based on user permissions
     */
    sanitizeFilters(filters, user, orgContext) {
        const sanitized = { ...filters };

        // Always enforce organization filter
        sanitized.organization_id = orgContext.organizationId;

        // Remove sensitive filters for basic users
        const accessLevel = this.determineAccessLevel(user, orgContext);
        if (accessLevel === 'basic') {
            // Basic users can only see active branches
            sanitized.branch_status = 'active';
        }

        return sanitized;
    }

    /**
     * Validate filter permissions
     */
    async validateFilterPermissions(context) {
        // Check if user can access inactive branches
        if (context.includeInactive && context.accessLevel === 'basic') {
            return 'Insufficient permissions to view inactive branches';
        }

        return true;
    }

    /**
     * Validate organization access
     */
    async validateOrganizationAccess(context) {
        // Validate that user belongs to the organization
        return true;
    }

    /**
     * Build query parameters for data loading
     */
    buildQueryParameters(filters, sortOptions, pagination, accessLevel) {
        return {
            filters: filters,
            sort: sortOptions,
            pagination: pagination,
            accessLevel: accessLevel,
            includeInactive: filters.branch_status !== 'active'
        };
    }

    /**
     * Load branch list from data source
     */
    async loadBranchList(queryParams, accessLevel) {
        // In real implementation, this would query the database

        // Mock branch data
        const allBranches = [
            {
                id: 'branch_1',
                branch_code: 'HQ-001-2024',
                branch_name: 'Headquarters',
                organization_id: queryParams.filters.organization_id,
                zone: 'Zone A',
                region: 'Central',
                branch_status: 'active',
                branch_function: 'headquarters',
                has_multiple_buildings: true,
                established_date: '2024-01-15',
                activation_date: '2024-02-01',
                primary_phone_number: accessLevel !== 'basic' ? '+1-555-0001' : null,
                primary_email_address: accessLevel !== 'basic' ? 'hq@example.com' : null
            },
            {
                id: 'branch_2',
                branch_code: 'REG-002-2024',
                branch_name: 'Regional Office North',
                organization_id: queryParams.filters.organization_id,
                zone: 'Zone B',
                region: 'North',
                branch_status: 'active',
                branch_function: 'regional_office',
                has_multiple_buildings: false,
                established_date: '2024-02-01',
                activation_date: '2024-02-15',
                primary_phone_number: accessLevel !== 'basic' ? '+1-555-0002' : null,
                primary_email_address: accessLevel !== 'basic' ? 'north@example.com' : null
            },
            {
                id: 'branch_3',
                branch_code: 'SAL-003-2024',
                branch_name: 'Sales Office West',
                organization_id: queryParams.filters.organization_id,
                zone: 'Zone C',
                region: 'West',
                branch_status: 'inactive',
                branch_function: 'sales_office',
                has_multiple_buildings: false,
                established_date: '2024-03-01',
                activation_date: '2024-03-15',
                primary_phone_number: accessLevel !== 'basic' ? '+1-555-0003' : null,
                primary_email_address: accessLevel !== 'basic' ? 'west@example.com' : null
            }
        ];

        // Apply filters
        let filteredBranches = allBranches.filter(branch => {
            // Organization filter
            if (branch.organization_id !== queryParams.filters.organization_id) return false;

            // Status filter
            if (queryParams.filters.branch_status &&
                branch.branch_status !== queryParams.filters.branch_status) return false;

            // Zone filter
            if (queryParams.filters.zone && branch.zone !== queryParams.filters.zone) return false;

            // Region filter
            if (queryParams.filters.region && branch.region !== queryParams.filters.region) return false;

            // Function filter
            if (queryParams.filters.branch_function &&
                branch.branch_function !== queryParams.filters.branch_function) return false;

            // Search filter
            if (queryParams.filters.search) {
                const searchTerm = queryParams.filters.search.toLowerCase();
                const searchFields = [branch.branch_name, branch.branch_code].join(' ').toLowerCase();
                if (!searchFields.includes(searchTerm)) return false;
            }

            return true;
        });

        // Apply sorting
        if (queryParams.sort.field) {
            filteredBranches.sort((a, b) => {
                const aVal = a[queryParams.sort.field] || '';
                const bVal = b[queryParams.sort.field] || '';

                const comparison = aVal.localeCompare(bVal);
                return queryParams.sort.direction === 'desc' ? -comparison : comparison;
            });
        }

        // Calculate pagination
        const totalCount = filteredBranches.length;
        const startIndex = (queryParams.pagination.page - 1) * queryParams.pagination.limit;
        const endIndex = startIndex + queryParams.pagination.limit;
        const paginatedBranches = filteredBranches.slice(startIndex, endIndex);

        return {
            branches: paginatedBranches,
            totalCount: totalCount
        };
    }

    /**
     * Calculate page information
     */
    calculatePageInfo(pagination, totalCount) {
        const totalPages = Math.ceil(totalCount / pagination.limit);

        return {
            currentPage: pagination.page,
            totalPages: totalPages,
            totalItems: totalCount,
            itemsPerPage: pagination.limit,
            hasNextPage: pagination.page < totalPages,
            hasPreviousPage: pagination.page > 1,
            startIndex: (pagination.page - 1) * pagination.limit + 1,
            endIndex: Math.min(pagination.page * pagination.limit, totalCount)
        };
    }

    /**
     * Load metrics for branch list
     */
    async loadBranchListMetrics(branches) {
        const metrics = {};

        for (const branch of branches) {
            metrics[branch.id] = this.calculateBranchMetrics(branch);
        }

        return metrics;
    }

    /**
     * Calculate summary statistics
     */
    calculateSummaryStatistics(branches) {
        const stats = {
            totalBranches: branches.length,
            statusBreakdown: {},
            regionBreakdown: {},
            functionBreakdown: {},
            averageAge: 0,
            multipleBuildings: 0
        };

        branches.forEach(branch => {
            // Status breakdown
            stats.statusBreakdown[branch.branch_status] =
                (stats.statusBreakdown[branch.branch_status] || 0) + 1;

            // Region breakdown
            stats.regionBreakdown[branch.region] =
                (stats.regionBreakdown[branch.region] || 0) + 1;

            // Function breakdown
            stats.functionBreakdown[branch.branch_function] =
                (stats.functionBreakdown[branch.branch_function] || 0) + 1;

            // Multiple buildings count
            if (branch.has_multiple_buildings) {
                stats.multipleBuildings++;
            }

            // Age calculation
            if (branch.established_date) {
                const establishedDate = new Date(branch.established_date);
                const ageInYears = (new Date() - establishedDate) / (365.25 * 24 * 60 * 60 * 1000);
                stats.averageAge += ageInYears;
            }
        });

        if (branches.length > 0) {
            stats.averageAge = stats.averageAge / branches.length;
        }

        return stats;
    }

    /**
     * Compare list changes for refresh operations
     */
    compareListChanges(oldBranches, newBranches) {
        const changes = [];

        if (!oldBranches || !newBranches) return changes;

        // Check for new branches
        newBranches.forEach(newBranch => {
            const oldBranch = oldBranches.find(b => b.id === newBranch.id);
            if (!oldBranch) {
                changes.push({
                    type: 'added',
                    branchId: newBranch.id,
                    branchCode: newBranch.branch_code
                });
            }
        });

        // Check for removed or modified branches
        oldBranches.forEach(oldBranch => {
            const newBranch = newBranches.find(b => b.id === oldBranch.id);
            if (!newBranch) {
                changes.push({
                    type: 'removed',
                    branchId: oldBranch.id,
                    branchCode: oldBranch.branch_code
                });
            } else {
                // Check for modifications
                const fieldChanges = this.getDataChanges(oldBranch, newBranch);
                if (Object.keys(fieldChanges).length > 0) {
                    changes.push({
                        type: 'modified',
                        branchId: oldBranch.id,
                        branchCode: oldBranch.branch_code,
                        changes: fieldChanges
                    });
                }
            }
        });

        return changes;
    }

    /**
     * Get denial reason
     */
    getDenialReason(context) {
        if (!context.hasListPermission) {
            return 'Insufficient permissions to list branches';
        }

        if (context.validationError) {
            return context.validationError;
        }

        return 'Access denied for unknown reason';
    }

    /**
     * Update list parameters
     */
    updateListParameters(newFilters, newSortOptions, newPagination, user) {
        if (newFilters) {
            this.updateContext({ newFilters }, user);
        }

        if (newSortOptions) {
            this.updateContext({ newSortOptions }, user);
        }

        if (newPagination) {
            this.updateContext({ newPagination }, user);
        }
    }

    /**
     * Get list summary
     */
    getListSummary() {
        return {
            currentState: this.currentState,
            branchCount: this.context.branches?.length || 0,
            totalCount: this.context.totalCount || 0,
            pageInfo: this.context.pageInfo,
            summaryStats: this.context.summaryStats,
            filters: this.context.filters,
            sortOptions: this.context.sortOptions,
            accessLevel: this.context.accessLevel,
            lastLoaded: this.context.loaded_at
        };
    }

    /**
     * Get list metrics specific to this operation
     */
    getListMetrics() {
        const baseMetrics = this.getMetrics();

        return {
            ...baseMetrics,
            listSummary: this.getListSummary(),
            performance: {
                loadingDuration: this.context.loading_duration,
                refreshCount: this.context.refresh_count || 0,
                viewCount: this.context.view_count || 0
            },
            dataMetrics: this.context.summaryStats
        };
    }

    /**
     * Export list session data
     */
    exportListSession() {
        return {
            listSession: {
                summary: this.getListSummary(),
                metrics: this.getListMetrics(),
                branches: this.context.formattedBranches || [],
                timeline: this.history.map(entry => ({
                    state: entry.toState,
                    timestamp: entry.timestamp,
                    user: entry.user.name,
                    duration: entry.duration
                })),
                operationLog: this.context.operationLog || []
            }
        };
    }
}
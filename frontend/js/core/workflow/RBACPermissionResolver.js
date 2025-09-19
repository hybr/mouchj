/**
 * Multi-dimensional RBAC Permission Resolver
 * Handles complex organizational permission checking for workflows
 */
export class RBACPermissionResolver {
    constructor(organizationService) {
        this.organizationService = organizationService;
        this.permissionCache = new Map();
        this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
    }

    /**
     * Check if user has permission for workflow operation
     * WorkflowPermission = WorkflowActor + OrganizationGroup + OrganizationDesignation + Context
     */
    async hasPermission(user, workflowPermission, organizationContext, workflowContext = {}) {
        const cacheKey = this.generateCacheKey(user.id, workflowPermission, organizationContext);

        // Check cache first
        if (this.permissionCache.has(cacheKey)) {
            const cached = this.permissionCache.get(cacheKey);
            if (Date.now() - cached.timestamp < this.cacheTimeout) {
                return cached.result;
            }
            this.permissionCache.delete(cacheKey);
        }

        // Resolve permission
        const result = await this.resolvePermission(user, workflowPermission, organizationContext, workflowContext);

        // Cache result
        this.permissionCache.set(cacheKey, {
            result,
            timestamp: Date.now()
        });

        return result;
    }

    /**
     * Core permission resolution logic
     */
    async resolvePermission(user, workflowPermission, organizationContext, workflowContext) {
        try {
            // Get user's organizational positions
            const userPositions = await this.getUserOrganizationalPositions(user, organizationContext.organizationId);

            // Check each dimension of the permission
            const checks = await Promise.all([
                this.checkWorkflowActor(user, workflowPermission.actor, userPositions, workflowContext),
                this.checkOrganizationGroup(user, workflowPermission.organizationGroup, userPositions),
                this.checkOrganizationDesignation(user, workflowPermission.organizationDesignation, userPositions),
                this.checkContextualPermissions(user, workflowPermission.contextConditions, organizationContext, workflowContext)
            ]);

            // All checks must pass
            return checks.every(check => check === true);

        } catch (error) {
            console.error('Permission resolution error:', error);
            return false;
        }
    }

    /**
     * Check workflow actor permission
     */
    async checkWorkflowActor(user, requiredActor, userPositions, workflowContext) {
        if (!requiredActor) return true;

        const userActors = this.mapPositionsToWorkflowActors(userPositions, workflowContext);

        if (Array.isArray(requiredActor)) {
            return requiredActor.some(actor => userActors.includes(actor));
        }

        return userActors.includes(requiredActor);
    }

    /**
     * Map organizational positions to workflow actors
     */
    mapPositionsToWorkflowActors(positions, workflowContext = {}) {
        const actors = new Set();

        positions.forEach(position => {
            const designation = position.designation.name.toLowerCase();
            const department = position.group?.department?.name?.toLowerCase() || '';
            const team = position.group?.team?.name?.toLowerCase() || '';

            // Map based on designation
            if (this.isManagerialRole(designation)) {
                actors.add('Approver');
            }

            if (this.isAnalyticalRole(designation)) {
                actors.add('Analyzer');
            }

            if (this.isDevelopmentRole(designation)) {
                actors.add('Developer');
            }

            if (this.isTestingRole(designation)) {
                actors.add('Tester');
            }

            if (this.isDesignRole(designation)) {
                actors.add('Designer');
            }

            if (this.isSupportRole(designation)) {
                actors.add('Supporter');
            }

            if (this.isImplementationRole(designation)) {
                actors.add('Implementor');
            }

            // Map based on department/team context
            if (department.includes('hr') || department.includes('human')) {
                actors.add('HRSpecialist');
            }

            if (department.includes('finance') || department.includes('accounting')) {
                actors.add('FinanceSpecialist');
            }

            if (department.includes('procurement') || department.includes('purchasing')) {
                actors.add('ProcurementSpecialist');
            }

            // Everyone can be a requestor
            actors.add('Requestor');
        });

        return Array.from(actors);
    }

    /**
     * Role checking helper methods
     */
    isManagerialRole(designation) {
        const managerialKeywords = ['manager', 'head', 'director', 'supervisor', 'lead', 'chief', 'executive'];
        return managerialKeywords.some(keyword => designation.includes(keyword));
    }

    isAnalyticalRole(designation) {
        const analyticalKeywords = ['analyst', 'reviewer', 'evaluator', 'assessor', 'auditor'];
        return analyticalKeywords.some(keyword => designation.includes(keyword));
    }

    isDevelopmentRole(designation) {
        const developmentKeywords = ['developer', 'engineer', 'programmer', 'coder', 'architect'];
        return developmentKeywords.some(keyword => designation.includes(keyword));
    }

    isTestingRole(designation) {
        const testingKeywords = ['tester', 'qa', 'quality', 'validation', 'verification'];
        return testingKeywords.some(keyword => designation.includes(keyword));
    }

    isDesignRole(designation) {
        const designKeywords = ['designer', 'architect', 'ux', 'ui', 'creative'];
        return designKeywords.some(keyword => designation.includes(keyword));
    }

    isSupportRole(designation) {
        const supportKeywords = ['support', 'maintenance', 'operations', 'technician'];
        return supportKeywords.some(keyword => designation.includes(keyword));
    }

    isImplementationRole(designation) {
        const implementationKeywords = ['implementor', 'deployment', 'devops', 'infrastructure'];
        return implementationKeywords.some(keyword => designation.includes(keyword));
    }

    /**
     * Check organization group permissions
     */
    async checkOrganizationGroup(user, requiredGroup, userPositions) {
        if (!requiredGroup) return true;

        const userGroups = userPositions.map(position => {
            const group = position.group;
            return {
                department: group?.department?.name,
                team: group?.team?.name,
                type: group?.department ? 'department' : 'team'
            };
        });

        if (Array.isArray(requiredGroup)) {
            return requiredGroup.some(group => this.matchesGroup(group, userGroups));
        }

        return this.matchesGroup(requiredGroup, userGroups);
    }

    /**
     * Check if user groups match required group
     */
    matchesGroup(requiredGroup, userGroups) {
        return userGroups.some(userGroup => {
            if (requiredGroup.type === 'department') {
                return userGroup.type === 'department' && userGroup.department === requiredGroup.name;
            }
            if (requiredGroup.type === 'team') {
                return userGroup.team === requiredGroup.name;
            }
            // Generic match
            return userGroup.department === requiredGroup.name || userGroup.team === requiredGroup.name;
        });
    }

    /**
     * Check organization designation permissions
     */
    async checkOrganizationDesignation(user, requiredDesignation, userPositions) {
        if (!requiredDesignation) return true;

        const userDesignations = userPositions.map(position => position.designation.name);

        if (Array.isArray(requiredDesignation)) {
            return requiredDesignation.some(designation => userDesignations.includes(designation));
        }

        return userDesignations.includes(requiredDesignation);
    }

    /**
     * Check contextual permissions
     */
    async checkContextualPermissions(user, contextConditions, organizationContext, workflowContext) {
        if (!contextConditions || Object.keys(contextConditions).length === 0) {
            return true;
        }

        for (const [condition, requirement] of Object.entries(contextConditions)) {
            switch (condition) {
                case 'isOwner':
                    if (requirement && workflowContext.createdBy !== user.id) {
                        return false;
                    }
                    break;

                case 'isSameOrganization':
                    if (requirement && workflowContext.organizationId !== organizationContext.organizationId) {
                        return false;
                    }
                    break;

                case 'workflowValue':
                    if (!this.checkWorkflowValueCondition(requirement, workflowContext)) {
                        return false;
                    }
                    break;

                case 'timeWindow':
                    if (!this.checkTimeWindowCondition(requirement, workflowContext)) {
                        return false;
                    }
                    break;

                case 'customCondition':
                    if (typeof requirement === 'function') {
                        const result = await requirement(user, organizationContext, workflowContext);
                        if (!result) return false;
                    }
                    break;

                default:
                    console.warn(`Unknown context condition: ${condition}`);
            }
        }

        return true;
    }

    /**
     * Check workflow value conditions
     */
    checkWorkflowValueCondition(requirement, workflowContext) {
        const { field, operator, value } = requirement;
        const fieldValue = this.getNestedValue(workflowContext, field);

        switch (operator) {
            case 'equals': return fieldValue === value;
            case 'not_equals': return fieldValue !== value;
            case 'greater_than': return fieldValue > value;
            case 'less_than': return fieldValue < value;
            case 'greater_equal': return fieldValue >= value;
            case 'less_equal': return fieldValue <= value;
            case 'contains': return fieldValue && fieldValue.includes(value);
            case 'in': return Array.isArray(value) && value.includes(fieldValue);
            default: return false;
        }
    }

    /**
     * Check time window conditions
     */
    checkTimeWindowCondition(requirement, workflowContext) {
        const { field, duration, unit } = requirement;
        const timestamp = this.getNestedValue(workflowContext, field);

        if (!timestamp) return false;

        const now = new Date();
        const targetTime = new Date(timestamp);
        const diffMs = now - targetTime;

        let allowedMs;
        switch (unit) {
            case 'minutes': allowedMs = duration * 60 * 1000; break;
            case 'hours': allowedMs = duration * 60 * 60 * 1000; break;
            case 'days': allowedMs = duration * 24 * 60 * 60 * 1000; break;
            default: return false;
        }

        return diffMs <= allowedMs;
    }

    /**
     * Get user's organizational positions
     */
    async getUserOrganizationalPositions(user, organizationId) {
        try {
            return await this.organizationService.getUserPositions(user.id, organizationId);
        } catch (error) {
            console.error('Error fetching user positions:', error);
            return [];
        }
    }

    /**
     * Generate cache key for permission check
     */
    generateCacheKey(userId, workflowPermission, organizationContext) {
        const permissionHash = JSON.stringify(workflowPermission);
        const contextHash = JSON.stringify({
            organizationId: organizationContext.organizationId,
            timestamp: Math.floor(Date.now() / (5 * 60 * 1000)) // 5-minute buckets
        });

        return `${userId}-${btoa(permissionHash)}-${btoa(contextHash)}`;
    }

    /**
     * Get nested value from object using dot notation
     */
    getNestedValue(obj, path) {
        return path.split('.').reduce((current, key) =>
            current && current[key] !== undefined ? current[key] : undefined, obj
        );
    }

    /**
     * Clear permission cache
     */
    clearCache() {
        this.permissionCache.clear();
    }

    /**
     * Clear expired cache entries
     */
    clearExpiredCache() {
        const now = Date.now();
        for (const [key, value] of this.permissionCache.entries()) {
            if (now - value.timestamp >= this.cacheTimeout) {
                this.permissionCache.delete(key);
            }
        }
    }

    /**
     * Get cache statistics
     */
    getCacheStats() {
        return {
            size: this.permissionCache.size,
            timeout: this.cacheTimeout,
            entries: Array.from(this.permissionCache.keys())
        };
    }
}
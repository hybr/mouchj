/**
 * Enhanced State Node with integrated RBAC permissions
 */
export class StateNode {
    constructor(name, options = {}) {
        this.name = name;
        this.transitions = options.transitions || [];
        this.validations = options.validations || [];
        this.requiredActors = options.requiredActors || [];
        this.permissionConditions = options.permissionConditions || {};
        this.onEnter = options.onEnter;
        this.onExit = options.onExit;
        this.allowMultipleActors = options.allowMultipleActors || false;
        this.timeoutDuration = options.timeoutDuration;
        this.escalationRules = options.escalationRules || [];
    }

    /**
     * Check if transition to target state is allowed
     */
    canTransitionTo(targetState, context = {}) {
        return this.transitions.some(transition =>
            transition.target === targetState &&
            this.evaluateGuardConditions(transition.guards || [], context)
        );
    }

    /**
     * Get available transitions for current context
     */
    getAvailableTransitions(context = {}) {
        return this.transitions.filter(transition =>
            this.evaluateGuardConditions(transition.guards || [], context)
        );
    }

    /**
     * Check if user has permission to act in this state
     */
    hasPermission(user, organizationContext, workflowContext = {}) {
        // Check required actors
        if (this.requiredActors.length > 0) {
            const userActors = this.getUserActors(user, organizationContext);
            const hasRequiredActor = this.requiredActors.some(actor =>
                userActors.includes(actor)
            );
            if (!hasRequiredActor) return false;
        }

        // Check permission conditions
        return this.evaluatePermissionConditions(user, organizationContext, workflowContext);
    }

    /**
     * Get user's workflow actors based on organizational position
     */
    getUserActors(user, organizationContext) {
        const actors = [];

        // Map organizational roles to workflow actors
        if (organizationContext.positions) {
            organizationContext.positions.forEach(position => {
                const designation = position.designation;

                // Map designations to workflow actors
                if (designation.name.toLowerCase().includes('manager') ||
                    designation.name.toLowerCase().includes('head') ||
                    designation.name.toLowerCase().includes('director')) {
                    actors.push('Approver');
                }

                if (designation.name.toLowerCase().includes('analyst') ||
                    designation.name.toLowerCase().includes('reviewer')) {
                    actors.push('Analyzer');
                }

                if (designation.name.toLowerCase().includes('developer') ||
                    designation.name.toLowerCase().includes('engineer')) {
                    actors.push('Developer');
                }

                if (designation.name.toLowerCase().includes('tester') ||
                    designation.name.toLowerCase().includes('qa')) {
                    actors.push('Tester');
                }

                if (designation.name.toLowerCase().includes('support') ||
                    designation.name.toLowerCase().includes('maintenance')) {
                    actors.push('Supporter');
                }

                if (designation.name.toLowerCase().includes('designer') ||
                    designation.name.toLowerCase().includes('architect')) {
                    actors.push('Designer');
                }
            });
        }

        // Every user can be a requestor
        actors.push('Requestor');

        return [...new Set(actors)]; // Remove duplicates
    }

    /**
     * Evaluate guard conditions for transitions
     */
    evaluateGuardConditions(guards, context) {
        return guards.every(guard => {
            if (typeof guard === 'function') {
                return guard(context);
            }
            if (typeof guard === 'object') {
                return this.evaluateConditionObject(guard, context);
            }
            return true;
        });
    }

    /**
     * Evaluate permission conditions
     */
    evaluatePermissionConditions(user, organizationContext, workflowContext) {
        for (const [condition, requirement] of Object.entries(this.permissionConditions)) {
            switch (condition) {
                case 'department':
                    if (!this.checkDepartmentAccess(user, organizationContext, requirement)) {
                        return false;
                    }
                    break;
                case 'team':
                    if (!this.checkTeamAccess(user, organizationContext, requirement)) {
                        return false;
                    }
                    break;
                case 'designation':
                    if (!this.checkDesignationAccess(user, organizationContext, requirement)) {
                        return false;
                    }
                    break;
                case 'customCondition':
                    if (typeof requirement === 'function' && !requirement(user, organizationContext, workflowContext)) {
                        return false;
                    }
                    break;
            }
        }
        return true;
    }

    /**
     * Check department access
     */
    checkDepartmentAccess(user, organizationContext, requirement) {
        if (!organizationContext.positions) return false;

        return organizationContext.positions.some(position => {
            const department = position.group?.department || position.department;
            if (Array.isArray(requirement)) {
                return requirement.includes(department?.name);
            }
            return department?.name === requirement;
        });
    }

    /**
     * Check team access
     */
    checkTeamAccess(user, organizationContext, requirement) {
        if (!organizationContext.positions) return false;

        return organizationContext.positions.some(position => {
            const team = position.group?.team || position.team;
            if (Array.isArray(requirement)) {
                return requirement.includes(team?.name);
            }
            return team?.name === requirement;
        });
    }

    /**
     * Check designation access
     */
    checkDesignationAccess(user, organizationContext, requirement) {
        if (!organizationContext.positions) return false;

        return organizationContext.positions.some(position => {
            const designation = position.designation;
            if (Array.isArray(requirement)) {
                return requirement.includes(designation?.name);
            }
            return designation?.name === requirement;
        });
    }

    /**
     * Evaluate complex condition objects
     */
    evaluateConditionObject(guard, context) {
        if (guard.operator === 'and') {
            return guard.conditions.every(condition =>
                this.evaluateConditionObject(condition, context)
            );
        }
        if (guard.operator === 'or') {
            return guard.conditions.some(condition =>
                this.evaluateConditionObject(condition, context)
            );
        }
        if (guard.field && guard.value !== undefined) {
            const fieldValue = this.getNestedValue(context, guard.field);
            switch (guard.operator) {
                case 'equals': return fieldValue === guard.value;
                case 'not_equals': return fieldValue !== guard.value;
                case 'greater_than': return fieldValue > guard.value;
                case 'less_than': return fieldValue < guard.value;
                case 'contains': return fieldValue && fieldValue.includes(guard.value);
                case 'in': return Array.isArray(guard.value) && guard.value.includes(fieldValue);
                default: return fieldValue === guard.value;
            }
        }
        return true;
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
     * Execute state entry actions
     */
    async executeOnEnter(context, user, organizationContext) {
        if (this.onEnter) {
            await this.onEnter(context, user, organizationContext);
        }
    }

    /**
     * Execute state exit actions
     */
    async executeOnExit(context, user, organizationContext) {
        if (this.onExit) {
            await this.onExit(context, user, organizationContext);
        }
    }

    /**
     * Validate state data
     */
    async validate(context) {
        const results = [];

        for (const validation of this.validations) {
            try {
                const result = await validation(context);
                if (result !== true) {
                    results.push(result || 'Validation failed');
                }
            } catch (error) {
                results.push(error.message || 'Validation error');
            }
        }

        return results;
    }
}
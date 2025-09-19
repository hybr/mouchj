/**
 * Organizational Structure Models for RBAC Integration
 */

export class OrganizationPosition {
    constructor(data) {
        this.id = data.id;
        this.userId = data.userId;
        this.organizationId = data.organizationId;
        this.workerSeat = data.workerSeat; // OrganizationWorkerSeat
        this.designation = data.designation; // OrganizationGroupDesignation
        this.group = data.group; // OrganizationGroup (department or team)
        this.isActive = data.isActive !== false;
        this.startDate = data.startDate ? new Date(data.startDate) : new Date();
        this.endDate = data.endDate ? new Date(data.endDate) : null;
        this.metadata = data.metadata || {};
    }

    /**
     * Check if position is currently active
     */
    isCurrentlyActive() {
        const now = new Date();
        return this.isActive &&
               this.startDate <= now &&
               (!this.endDate || this.endDate >= now);
    }

    /**
     * Get full position title
     */
    getFullTitle() {
        const groupName = this.group?.department?.name || this.group?.team?.name || 'Unknown Group';
        return `${this.designation.name} - ${groupName}`;
    }

    /**
     * Get organizational level (for hierarchy calculations)
     */
    getOrganizationalLevel() {
        return this.designation.level || 0;
    }
}

export class OrganizationWorkerSeat {
    constructor(data) {
        this.id = data.id;
        this.name = data.name;
        this.code = data.code;
        this.building = data.building; // OrganizationBuilding
        this.floor = data.floor;
        this.room = data.room;
        this.capacity = data.capacity || 1;
        this.isActive = data.isActive !== false;
        this.metadata = data.metadata || {};
    }

    /**
     * Get full seat location
     */
    getFullLocation() {
        const building = this.building?.name || 'Unknown Building';
        const floor = this.floor ? ` Floor ${this.floor}` : '';
        const room = this.room ? ` Room ${this.room}` : '';
        return `${building}${floor}${room} - ${this.name}`;
    }
}

export class OrganizationBuilding {
    constructor(data) {
        this.id = data.id;
        this.name = data.name;
        this.address = data.address;
        this.branch = data.branch; // OrganizationBranch
        this.floors = data.floors || 1;
        this.isActive = data.isActive !== false;
        this.metadata = data.metadata || {};
    }
}

export class OrganizationBranch {
    constructor(data) {
        this.id = data.id;
        this.name = data.name;
        this.code = data.code;
        this.organizationId = data.organizationId;
        this.address = data.address;
        this.isHeadquarters = data.isHeadquarters || false;
        this.isActive = data.isActive !== false;
        this.metadata = data.metadata || {};
    }
}

export class OrganizationGroupDesignation {
    constructor(data) {
        this.id = data.id;
        this.name = data.name;
        this.code = data.code;
        this.description = data.description;
        this.level = data.level || 0; // Organizational hierarchy level
        this.group = data.group; // OrganizationGroup (department or team)
        this.isActive = data.isActive !== false;
        this.permissions = data.permissions || [];
        this.metadata = data.metadata || {};
    }

    /**
     * Check if designation has specific permission
     */
    hasPermission(permission) {
        return this.permissions.includes(permission);
    }

    /**
     * Get designation hierarchy level description
     */
    getLevelDescription() {
        const levels = {
            0: 'Individual Contributor',
            1: 'Senior Individual Contributor',
            2: 'Team Lead',
            3: 'Manager',
            4: 'Senior Manager',
            5: 'Director',
            6: 'Senior Director',
            7: 'Vice President',
            8: 'Senior Vice President',
            9: 'Executive Vice President',
            10: 'C-Level Executive'
        };
        return levels[this.level] || `Level ${this.level}`;
    }
}

export class OrganizationDepartment {
    constructor(data) {
        this.id = data.id;
        this.name = data.name;
        this.code = data.code;
        this.description = data.description;
        this.organizationId = data.organizationId;
        this.parentDepartment = data.parentDepartment; // For nested departments
        this.head = data.head; // Department head user
        this.isActive = data.isActive !== false;
        this.budget = data.budget || 0;
        this.costCenter = data.costCenter;
        this.metadata = data.metadata || {};
    }

    /**
     * Get department hierarchy path
     */
    getHierarchyPath() {
        const path = [this.name];
        let current = this.parentDepartment;

        while (current) {
            path.unshift(current.name);
            current = current.parentDepartment;
        }

        return path.join(' > ');
    }
}

export class OrganizationTeam {
    constructor(data) {
        this.id = data.id;
        this.name = data.name;
        this.code = data.code;
        this.description = data.description;
        this.department = data.department; // OrganizationDepartment
        this.lead = data.lead; // Team lead user
        this.maxSize = data.maxSize || null;
        this.isActive = data.isActive !== false;
        this.metadata = data.metadata || {};
    }

    /**
     * Get full team path
     */
    getFullPath() {
        const department = this.department?.name || 'Unknown Department';
        return `${department} > ${this.name}`;
    }
}

export class OrganizationGroup {
    constructor(data) {
        this.id = data.id;
        this.type = data.type; // 'department' or 'team'
        this.department = data.department; // OrganizationDepartment if type is 'department'
        this.team = data.team; // OrganizationTeam if type is 'team'
    }

    /**
     * Get group name
     */
    getName() {
        return this.department?.name || this.team?.name || 'Unknown Group';
    }

    /**
     * Get group full path
     */
    getFullPath() {
        if (this.type === 'department') {
            return this.department?.getHierarchyPath() || this.getName();
        }
        if (this.type === 'team') {
            return this.team?.getFullPath() || this.getName();
        }
        return this.getName();
    }

    /**
     * Check if group is active
     */
    isActive() {
        return this.department?.isActive || this.team?.isActive || false;
    }
}

/**
 * Workflow Permission Entity
 */
export class WorkflowPermission {
    constructor(data) {
        this.id = data.id;
        this.workflowType = data.workflowType;
        this.stepName = data.stepName;
        this.actor = data.actor; // WorkflowActor
        this.organizationGroup = data.organizationGroup; // OrganizationGroup constraint
        this.organizationDesignation = data.organizationDesignation; // Designation constraint
        this.contextConditions = data.contextConditions || {}; // Additional context-based conditions
        this.isRequired = data.isRequired !== false;
        this.priority = data.priority || 0;
        this.metadata = data.metadata || {};
    }

    /**
     * Check if permission matches given criteria
     */
    matches(workflowType, stepName, actor = null) {
        if (this.workflowType !== workflowType) return false;
        if (this.stepName && this.stepName !== stepName) return false;
        if (actor && this.actor !== actor) return false;
        return true;
    }
}

/**
 * Workflow Actor Definitions
 */
export const WorkflowActors = {
    REQUESTOR: 'Requestor',
    ANALYZER: 'Analyzer',
    APPROVER: 'Approver',
    DESIGNER: 'Designer',
    DEVELOPER: 'Developer',
    TESTER: 'Tester',
    IMPLEMENTOR: 'Implementor',
    SUPPORTER: 'Supporter',
    HR_SPECIALIST: 'HRSpecialist',
    FINANCE_SPECIALIST: 'FinanceSpecialist',
    PROCUREMENT_SPECIALIST: 'ProcurementSpecialist'
};

/**
 * Organizational Context Manager
 */
export class OrganizationalContextManager {
    constructor(organizationService) {
        this.organizationService = organizationService;
        this.contextCache = new Map();
        this.cacheTimeout = 10 * 60 * 1000; // 10 minutes
    }

    /**
     * Get full organizational context for user
     */
    async getOrganizationalContext(userId, organizationId) {
        const cacheKey = `${userId}-${organizationId}`;

        if (this.contextCache.has(cacheKey)) {
            const cached = this.contextCache.get(cacheKey);
            if (Date.now() - cached.timestamp < this.cacheTimeout) {
                return cached.context;
            }
            this.contextCache.delete(cacheKey);
        }

        const context = await this.buildOrganizationalContext(userId, organizationId);

        this.contextCache.set(cacheKey, {
            context,
            timestamp: Date.now()
        });

        return context;
    }

    /**
     * Build organizational context
     */
    async buildOrganizationalContext(userId, organizationId) {
        const [positions, departments, teams, branches] = await Promise.all([
            this.organizationService.getUserPositions(userId, organizationId),
            this.organizationService.getDepartments(organizationId),
            this.organizationService.getTeams(organizationId),
            this.organizationService.getBranches(organizationId)
        ]);

        return {
            organizationId,
            positions: positions.map(p => new OrganizationPosition(p)),
            departments: departments.map(d => new OrganizationDepartment(d)),
            teams: teams.map(t => new OrganizationTeam(t)),
            branches: branches.map(b => new OrganizationBranch(b)),
            hierarchy: this.buildHierarchy(positions, departments, teams),
            permissions: this.aggregatePermissions(positions)
        };
    }

    /**
     * Build organizational hierarchy
     */
    buildHierarchy(positions, departments, teams) {
        const hierarchy = {
            level: 0,
            positions: [],
            directReports: [],
            peers: [],
            superiors: []
        };

        // Calculate user's highest organizational level
        hierarchy.level = Math.max(...positions.map(p => p.designation?.level || 0));

        // Find positions at different hierarchy levels
        positions.forEach(position => {
            const level = position.designation?.level || 0;

            if (level === hierarchy.level) {
                hierarchy.positions.push(position);
            } else if (level < hierarchy.level) {
                hierarchy.superiors.push(position);
            }
        });

        return hierarchy;
    }

    /**
     * Aggregate permissions from all positions
     */
    aggregatePermissions(positions) {
        const permissions = new Set();

        positions.forEach(position => {
            if (position.designation?.permissions) {
                position.designation.permissions.forEach(permission => {
                    permissions.add(permission);
                });
            }
        });

        return Array.from(permissions);
    }

    /**
     * Clear context cache
     */
    clearCache() {
        this.contextCache.clear();
    }

    /**
     * Clear expired cache entries
     */
    clearExpiredCache() {
        const now = Date.now();
        for (const [key, value] of this.contextCache.entries()) {
            if (now - value.timestamp >= this.cacheTimeout) {
                this.contextCache.delete(key);
            }
        }
    }
}
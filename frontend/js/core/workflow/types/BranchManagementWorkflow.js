import { BaseWorkflow } from '../BaseWorkflow.js';
import { StateNode } from '../StateNode.js';
import { WorkflowActors } from '../OrganizationalModels.js';

/**
 * Base Branch Management Workflow
 * Common functionality for all branch management operations
 */
export class BranchManagementWorkflow extends BaseWorkflow {
    constructor(id, options = {}) {
        super(id, { ...options, type: options.type || 'BranchManagementWorkflow' });
        this.branchData = options.branchData || {};
        this.operationType = options.operationType || 'create'; // create, update, delete, read, list
    }

    /**
     * Validate branch data structure
     */
    validateBranchData(branchData) {
        const errors = [];

        // Required fields validation
        if (!branchData.branch_code) {
            errors.push('Branch code is required');
        }

        if (!branchData.branch_name) {
            errors.push('Branch name is required');
        }

        if (!branchData.organization_id) {
            errors.push('Organization ID is required');
        }

        // Format validations
        if (branchData.primary_email_address && !this.isValidEmail(branchData.primary_email_address)) {
            errors.push('Invalid email address format');
        }

        if (branchData.primary_phone_number && !this.isValidPhoneNumber(branchData.primary_phone_number)) {
            errors.push('Invalid phone number format');
        }

        if (branchData.website && !this.isValidURL(branchData.website)) {
            errors.push('Invalid website URL format');
        }

        // Date validations
        if (branchData.established_date && branchData.activation_date) {
            const establishedDate = new Date(branchData.established_date);
            const activationDate = new Date(branchData.activation_date);
            if (activationDate < establishedDate) {
                errors.push('Activation date cannot be before established date');
            }
        }

        if (branchData.closure_date) {
            const closureDate = new Date(branchData.closure_date);
            const now = new Date();
            if (closureDate < now && branchData.branch_status !== 'closed') {
                errors.push('Closure date is in the past but branch status is not closed');
            }
        }

        // Business logic validations
        if (branchData.parent_branch_id === branchData.id) {
            errors.push('Branch cannot be its own parent');
        }

        // Operating hours validation
        if (branchData.operating_hours && !this.isValidOperatingHours(branchData.operating_hours)) {
            errors.push('Invalid operating hours format');
        }

        return errors;
    }

    /**
     * Validate email format
     */
    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    /**
     * Validate phone number format
     */
    isValidPhoneNumber(phone) {
        const phoneRegex = /^\+?[\d\s\-\(\)]+$/;
        return phoneRegex.test(phone) && phone.replace(/\D/g, '').length >= 10;
    }

    /**
     * Validate URL format
     */
    isValidURL(url) {
        try {
            new URL(url);
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Validate operating hours format
     */
    isValidOperatingHours(hours) {
        if (!hours || typeof hours !== 'object') return false;

        const validDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
        const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;

        for (const day of validDays) {
            if (hours[day]) {
                const dayHours = hours[day];
                if (dayHours.open && !timeRegex.test(dayHours.open)) return false;
                if (dayHours.close && !timeRegex.test(dayHours.close)) return false;
                if (dayHours.open && dayHours.close && dayHours.open >= dayHours.close) return false;
            }
        }

        return true;
    }

    /**
     * Check if user has permission for branch operations
     */
    async checkBranchPermission(user, organizationContext, operation) {
        // Check if user belongs to the organization
        if (!organizationContext.positions || organizationContext.positions.length === 0) {
            return false;
        }

        const userPositions = organizationContext.positions;

        // Check for admin or management roles
        const hasAdminRole = userPositions.some(position => {
            const designation = position.designation.name.toLowerCase();
            return designation.includes('admin') ||
                   designation.includes('manager') ||
                   designation.includes('director') ||
                   designation.includes('head') ||
                   designation.includes('ceo') ||
                   designation.includes('coo');
        });

        // Operations that require admin privileges
        const adminOperations = ['create', 'update', 'delete'];
        if (adminOperations.includes(operation) && !hasAdminRole) {
            return false;
        }

        // Read and list operations can be performed by most users
        const readOperations = ['read', 'list'];
        if (readOperations.includes(operation)) {
            return true; // Any organization member can read/list
        }

        return hasAdminRole;
    }

    /**
     * Generate branch code if not provided
     */
    generateBranchCode(branchName, organizationId) {
        const namePrefix = branchName.substring(0, 3).toUpperCase();
        const orgSuffix = organizationId.toString().padStart(3, '0');
        const timestamp = Date.now().toString().slice(-4);
        return `${namePrefix}-${orgSuffix}-${timestamp}`;
    }

    /**
     * Format branch data for display
     */
    formatBranchData(branchData) {
        return {
            ...branchData,
            formatted_established_date: branchData.established_date ?
                new Date(branchData.established_date).toLocaleDateString() : null,
            formatted_activation_date: branchData.activation_date ?
                new Date(branchData.activation_date).toLocaleDateString() : null,
            formatted_closure_date: branchData.closure_date ?
                new Date(branchData.closure_date).toLocaleDateString() : null,
            status_display: this.getStatusDisplay(branchData.branch_status),
            function_display: this.getFunctionDisplay(branchData.branch_function, branchData.other_branch_function)
        };
    }

    /**
     * Get status display text
     */
    getStatusDisplay(status) {
        const statusMap = {
            'active': '🟢 Active',
            'inactive': '🟡 Inactive',
            'pending': '🟠 Pending',
            'closed': '🔴 Closed',
            'suspended': '⏸️ Suspended'
        };
        return statusMap[status] || status;
    }

    /**
     * Get function display text
     */
    getFunctionDisplay(branchFunction, otherFunction) {
        if (branchFunction === 'other' && otherFunction) {
            return otherFunction;
        }

        const functionMap = {
            'headquarters': '🏢 Headquarters',
            'regional_office': '🌍 Regional Office',
            'sales_office': '💼 Sales Office',
            'service_center': '🔧 Service Center',
            'warehouse': '📦 Warehouse',
            'manufacturing': '🏭 Manufacturing',
            'retail_store': '🛍️ Retail Store',
            'customer_service': '📞 Customer Service',
            'research_development': '🔬 Research & Development',
            'training_center': '🎓 Training Center'
        };

        return functionMap[branchFunction] || branchFunction;
    }

    /**
     * Calculate branch metrics
     */
    calculateBranchMetrics(branchData) {
        const now = new Date();
        const establishedDate = branchData.established_date ? new Date(branchData.established_date) : null;
        const activationDate = branchData.activation_date ? new Date(branchData.activation_date) : null;

        let yearsInOperation = 0;
        let daysUntilActivation = 0;

        if (establishedDate) {
            yearsInOperation = Math.floor((now - establishedDate) / (365.25 * 24 * 60 * 60 * 1000));
        }

        if (activationDate && activationDate > now) {
            daysUntilActivation = Math.ceil((activationDate - now) / (24 * 60 * 60 * 1000));
        }

        return {
            yearsInOperation: Math.max(0, yearsInOperation),
            daysUntilActivation: Math.max(0, daysUntilActivation),
            isActive: branchData.branch_status === 'active',
            hasMultipleBuildings: branchData.has_multiple_buildings || false,
            operationalStatus: this.getOperationalStatus(branchData)
        };
    }

    /**
     * Get operational status
     */
    getOperationalStatus(branchData) {
        const now = new Date();
        const activationDate = branchData.activation_date ? new Date(branchData.activation_date) : null;
        const closureDate = branchData.closure_date ? new Date(branchData.closure_date) : null;

        if (closureDate && now >= closureDate) {
            return 'closed';
        }

        if (activationDate && now < activationDate) {
            return 'pending_activation';
        }

        if (branchData.branch_status === 'active') {
            return 'operational';
        }

        return branchData.branch_status || 'unknown';
    }

    /**
     * Get default operating hours
     */
    getDefaultOperatingHours() {
        return {
            monday: { open: '09:00', close: '17:00', closed: false },
            tuesday: { open: '09:00', close: '17:00', closed: false },
            wednesday: { open: '09:00', close: '17:00', closed: false },
            thursday: { open: '09:00', close: '17:00', closed: false },
            friday: { open: '09:00', close: '17:00', closed: false },
            saturday: { open: '10:00', close: '14:00', closed: false },
            sunday: { closed: true }
        };
    }

    /**
     * Export branch data
     */
    exportBranchData(format = 'json') {
        const exportData = {
            workflow: this.serialize(),
            branchData: this.formatBranchData(this.branchData),
            metrics: this.calculateBranchMetrics(this.branchData),
            exportedAt: new Date(),
            exportFormat: format
        };

        switch (format.toLowerCase()) {
            case 'json':
                return {
                    data: JSON.stringify(exportData, null, 2),
                    mimeType: 'application/json',
                    filename: `branch_${this.branchData.branch_code || this.id}.json`
                };

            case 'csv':
                const csvData = this.convertBranchToCSV(this.branchData);
                return {
                    data: csvData,
                    mimeType: 'text/csv',
                    filename: `branch_${this.branchData.branch_code || this.id}.csv`
                };

            default:
                throw new Error(`Unsupported export format: ${format}`);
        }
    }

    /**
     * Convert branch data to CSV format
     */
    convertBranchToCSV(branchData) {
        const headers = [
            'Branch Code', 'Branch Name', 'Organization ID', 'Parent Branch ID',
            'Zone', 'Region', 'Has Multiple Buildings', 'Primary Phone',
            'Primary Email', 'Fax Number', 'Website', 'Contact Person ID',
            'Branch Function', 'Other Function', 'Branch Status', 'Purpose Description',
            'Established Date', 'Activation Date', 'Closure Date'
        ];

        const values = [
            branchData.branch_code || '',
            branchData.branch_name || '',
            branchData.organization_id || '',
            branchData.parent_branch_id || '',
            branchData.zone || '',
            branchData.region || '',
            branchData.has_multiple_buildings ? 'Yes' : 'No',
            branchData.primary_phone_number || '',
            branchData.primary_email_address || '',
            branchData.fax_number || '',
            branchData.website || '',
            branchData.contact_person_id || '',
            branchData.branch_function || '',
            branchData.other_branch_function || '',
            branchData.branch_status || '',
            branchData.purpose_description || '',
            branchData.established_date || '',
            branchData.activation_date || '',
            branchData.closure_date || ''
        ];

        const csvHeaders = headers.map(h => `"${h}"`).join(',');
        const csvValues = values.map(v => `"${v}"`).join(',');

        return `${csvHeaders}\n${csvValues}`;
    }

    /**
     * Common validation for all branch operations
     */
    async validateCommonPermissions(user, organizationContext, operation) {
        // Check basic permissions
        const hasPermission = await this.checkBranchPermission(user, organizationContext, operation);
        if (!hasPermission) {
            throw new Error(`Insufficient permissions for ${operation} operation`);
        }

        // Ensure user belongs to the target organization
        if (this.branchData.organization_id &&
            organizationContext.organizationId !== this.branchData.organization_id) {
            throw new Error('User does not belong to the target organization');
        }

        return true;
    }

    /**
     * Log operation for audit trail
     */
    logOperation(operation, user, details = {}) {
        const logEntry = {
            timestamp: new Date(),
            operation: operation,
            user: {
                id: user.id,
                username: user.username,
                name: user.firstName && user.lastName ?
                    `${user.firstName} ${user.lastName}` : user.username
            },
            branchCode: this.branchData.branch_code,
            branchName: this.branchData.branch_name,
            organizationId: this.branchData.organization_id,
            details: details
        };

        // Add to workflow context for audit trail
        if (!this.context.operationLog) {
            this.context.operationLog = [];
        }
        this.context.operationLog.push(logEntry);

        console.log(`Branch ${operation}:`, logEntry);
        return logEntry;
    }
}
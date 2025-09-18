export class OrganizationService {
    constructor() {
        this.organizations = [];
        this.currentOrganization = null;
        this.listeners = [];

        // Load existing data from localStorage
        this.loadFromStorage();
    }

    loadFromStorage() {
        const saved = localStorage.getItem('organizations');
        const currentOrgId = localStorage.getItem('currentOrganizationId');

        if (saved) {
            this.organizations = JSON.parse(saved);
        }

        if (currentOrgId) {
            this.currentOrganization = this.organizations.find(org => org.id === currentOrgId);
        }

        // Initialize with some sample data if empty
        if (this.organizations.length === 0) {
            this.initializeSampleData();
        }
    }

    initializeSampleData() {
        const sampleOrgs = [
            {
                id: 'org-1',
                name: 'TechCorp Solutions',
                legal_name: 'TechCorp Solutions LLC',
                tag_line: 'Innovative Technology Solutions',
                description: 'Leading provider of enterprise software solutions',
                owner_id: 'admin',
                sub_domain_to_v4l_app: 'techcorp',
                website: 'https://techcorp.com',
                logo_url: null,
                industry: 'Technology',
                is_active: true,
                primary_phone_number: '+1-555-0123',
                primary_email_address: 'contact@techcorp.com',
                fiscal_year_start_month: 1,
                primary_currency_code: 'USD',
                main_time_zone: 'America/New_York',
                main_locale: 'en-US',
                created_at: '2024-01-15'
            },
            {
                id: 'org-2',
                name: 'Global Dynamics',
                legal_name: 'Global Dynamics Inc.',
                tag_line: 'Powering Global Commerce',
                description: 'International trading and logistics company',
                owner_id: 'admin',
                sub_domain_to_v4l_app: 'globaldyn',
                website: 'https://globaldynamics.com',
                logo_url: null,
                industry: 'Logistics',
                is_active: true,
                primary_phone_number: '+1-555-0456',
                primary_email_address: 'info@globaldynamics.com',
                fiscal_year_start_month: 4,
                primary_currency_code: 'USD',
                main_time_zone: 'America/Los_Angeles',
                main_locale: 'en-US',
                created_at: '2024-02-20'
            }
        ];

        this.organizations = sampleOrgs;
        this.currentOrganization = sampleOrgs[0];
        this.saveToStorage();
    }

    saveToStorage() {
        localStorage.setItem('organizations', JSON.stringify(this.organizations));
        if (this.currentOrganization) {
            localStorage.setItem('currentOrganizationId', this.currentOrganization.id);
        } else {
            localStorage.removeItem('currentOrganizationId');
        }
        this.notifyListeners();
    }

    getAllOrganizations(userId = null) {
        if (userId) {
            return this.organizations.filter(org => org.owner_id === userId);
        }
        return [...this.organizations];
    }

    getOrganizationById(id) {
        return this.organizations.find(org => org.id === id);
    }

    getCurrentOrganization() {
        return this.currentOrganization;
    }

    setCurrentOrganization(organizationId) {
        const org = this.getOrganizationById(organizationId);
        if (org) {
            this.currentOrganization = org;
            this.saveToStorage();
            return org;
        }
        return null;
    }

    async createOrganization(orgData) {
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 1000));

        const newOrg = {
            id: `org-${Date.now()}`,
            ...orgData,
            created_at: new Date().toISOString(),
            is_active: true
        };

        // Validate required fields
        const requiredFields = ['name', 'owner_id'];
        for (const field of requiredFields) {
            if (!newOrg[field]) {
                throw new Error(`${field} is required`);
            }
        }

        // Check for duplicate subdomain
        if (newOrg.sub_domain_to_v4l_app) {
            const existing = this.organizations.find(org =>
                org.sub_domain_to_v4l_app === newOrg.sub_domain_to_v4l_app
            );
            if (existing) {
                throw new Error('Subdomain already exists');
            }
        }

        this.organizations.push(newOrg);
        this.saveToStorage();

        return newOrg;
    }

    async updateOrganization(id, updates) {
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 800));

        const index = this.organizations.findIndex(org => org.id === id);
        if (index === -1) {
            throw new Error('Organization not found');
        }

        // Check for duplicate subdomain (excluding current org)
        if (updates.sub_domain_to_v4l_app) {
            const existing = this.organizations.find(org =>
                org.id !== id && org.sub_domain_to_v4l_app === updates.sub_domain_to_v4l_app
            );
            if (existing) {
                throw new Error('Subdomain already exists');
            }
        }

        this.organizations[index] = {
            ...this.organizations[index],
            ...updates,
            updated_at: new Date().toISOString()
        };

        // Update current org if it's the one being updated
        if (this.currentOrganization && this.currentOrganization.id === id) {
            this.currentOrganization = this.organizations[index];
        }

        this.saveToStorage();
        return this.organizations[index];
    }

    async deleteOrganization(id) {
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 500));

        const index = this.organizations.findIndex(org => org.id === id);
        if (index === -1) {
            throw new Error('Organization not found');
        }

        // Can't delete if it's the only organization
        if (this.organizations.length === 1) {
            throw new Error('Cannot delete the only organization');
        }

        // Remove organization
        this.organizations.splice(index, 1);

        // If deleted org was current, switch to first available
        if (this.currentOrganization && this.currentOrganization.id === id) {
            this.currentOrganization = this.organizations[0] || null;
        }

        this.saveToStorage();
        return true;
    }

    async toggleOrganizationStatus(id) {
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 300));

        const org = this.getOrganizationById(id);
        if (!org) {
            throw new Error('Organization not found');
        }

        return this.updateOrganization(id, {
            is_active: !org.is_active
        });
    }

    // Event listener system
    addListener(callback) {
        this.listeners.push(callback);
    }

    removeListener(callback) {
        this.listeners = this.listeners.filter(listener => listener !== callback);
    }

    notifyListeners() {
        this.listeners.forEach(callback => {
            callback({
                organizations: this.getAllOrganizations(),
                currentOrganization: this.getCurrentOrganization()
            });
        });
    }

    // Utility methods
    getIndustryOptions() {
        return [
            'Technology', 'Healthcare', 'Finance', 'Education', 'Manufacturing',
            'Retail', 'Logistics', 'Real Estate', 'Construction', 'Consulting',
            'Marketing', 'Legal', 'Non-profit', 'Government', 'Other'
        ];
    }

    getCurrencyOptions() {
        return [
            { code: 'USD', name: 'US Dollar' },
            { code: 'EUR', name: 'Euro' },
            { code: 'GBP', name: 'British Pound' },
            { code: 'CAD', name: 'Canadian Dollar' },
            { code: 'JPY', name: 'Japanese Yen' },
            { code: 'AUD', name: 'Australian Dollar' }
        ];
    }

    getTimezoneOptions() {
        return [
            'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
            'Europe/London', 'Europe/Paris', 'Europe/Berlin', 'Asia/Tokyo',
            'Asia/Shanghai', 'Australia/Sydney'
        ];
    }

    getFiscalMonthOptions() {
        return [
            { value: 1, label: 'January' },
            { value: 2, label: 'February' },
            { value: 3, label: 'March' },
            { value: 4, label: 'April' },
            { value: 5, label: 'May' },
            { value: 6, label: 'June' },
            { value: 7, label: 'July' },
            { value: 8, label: 'August' },
            { value: 9, label: 'September' },
            { value: 10, label: 'October' },
            { value: 11, label: 'November' },
            { value: 12, label: 'December' }
        ];
    }
}

// Create singleton instance
export const organizationService = new OrganizationService();
import { Component } from "../../core/Component.js";
import { organizationService } from "../../core/OrganizationService.js";
import { authManager } from "../../core/AuthManager.js";

export class OrganizationList extends Component {
    constructor(props) {
        super(props);
        this.organizations = [];
        this.currentOrg = null;
        this.currentUser = authManager.getCurrentUser();

        // Listen for organization updates
        this.orgListener = (orgData) => {
            this.organizations = orgData.organizations.filter(org =>
                org.owner_id === this.currentUser?.username
            );
            this.currentOrg = orgData.currentOrganization;
            this.updateView();
        };

        organizationService.addListener(this.orgListener);

        // Set initial data
        this.organizations = organizationService.getAllOrganizations(this.currentUser?.username);
        this.currentOrg = organizationService.getCurrentOrganization();
    }

    render() {
        const wrapper = this.createElement("div", "organization-list-wrapper");
        wrapper.innerHTML = `
            <div class="organization-list-container">
                <div class="org-list-header">
                    <h2 class="org-list-title">My Organizations</h2>
                    <button class="btn-primary" id="create-org-btn">
                        ➕ Create Organization
                    </button>
                </div>

                <div class="current-org-section" id="current-org-section">
                    ${this.renderCurrentOrganization()}
                </div>

                <div class="org-list-section">
                    <h3 class="section-title">All Organizations (${this.organizations.length})</h3>
                    <div class="organizations-grid" id="organizations-grid">
                        ${this.renderOrganizations()}
                    </div>
                </div>
            </div>
        `;

        this.addEventListeners(wrapper);
        return wrapper;
    }

    renderCurrentOrganization() {
        if (!this.currentOrg) {
            return `
                <div class="no-current-org">
                    <div class="no-org-icon">🏢</div>
                    <h3>No Current Organization</h3>
                    <p>Select an organization to make it your current workspace</p>
                </div>
            `;
        }

        return `
            <div class="current-org-card">
                <div class="current-org-badge">Current Organization</div>
                <div class="org-card-content">
                    <div class="org-header">
                        <div class="org-avatar">
                            ${this.getOrgInitials(this.currentOrg.name)}
                        </div>
                        <div class="org-info">
                            <h3 class="org-name">${this.currentOrg.name}</h3>
                            <p class="org-tagline">${this.currentOrg.tag_line || 'No tagline'}</p>
                            <div class="org-meta">
                                <span class="org-industry">${this.currentOrg.industry || 'N/A'}</span>
                                <span class="org-status ${this.currentOrg.is_active ? 'active' : 'inactive'}">
                                    ${this.currentOrg.is_active ? '🟢 Active' : '🔴 Inactive'}
                                </span>
                            </div>
                        </div>
                    </div>
                    <div class="org-actions">
                        <button class="btn-secondary" onclick="this.editOrganization('${this.currentOrg.id}')">
                            ✏️ Edit
                        </button>
                        <button class="btn-outline" onclick="this.viewOrganization('${this.currentOrg.id}')">
                            👁️ View Details
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    renderOrganizations() {
        if (this.organizations.length === 0) {
            return `
                <div class="no-organizations">
                    <div class="no-org-icon">📋</div>
                    <h3>No Organizations Yet</h3>
                    <p>Create your first organization to get started</p>
                    <button class="btn-primary" onclick="this.createOrganization()">
                        Create Organization
                    </button>
                </div>
            `;
        }

        return this.organizations.map(org => `
            <div class="org-card ${org.id === this.currentOrg?.id ? 'current' : ''}" data-org-id="${org.id}">
                <div class="org-card-header">
                    <div class="org-avatar small">
                        ${this.getOrgInitials(org.name)}
                    </div>
                    <div class="org-basic-info">
                        <h4 class="org-card-name">${org.name}</h4>
                        <p class="org-card-tagline">${org.tag_line || 'No tagline'}</p>
                    </div>
                    <div class="org-card-status">
                        <span class="status-badge ${org.is_active ? 'active' : 'inactive'}">
                            ${org.is_active ? '🟢' : '🔴'}
                        </span>
                    </div>
                </div>

                <div class="org-card-details">
                    <div class="detail-item">
                        <span class="detail-label">Industry:</span>
                        <span class="detail-value">${org.industry || 'N/A'}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Subdomain:</span>
                        <span class="detail-value">${org.sub_domain_to_v4l_app || 'N/A'}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Currency:</span>
                        <span class="detail-value">${org.primary_currency_code || 'USD'}</span>
                    </div>
                </div>

                <div class="org-card-actions">
                    ${org.id !== this.currentOrg?.id ? `
                        <button class="btn-outline btn-sm" onclick="this.switchToOrganization('${org.id}')">
                            🔄 Switch To
                        </button>
                    ` : ''}
                    <button class="btn-secondary btn-sm" onclick="this.editOrganization('${org.id}')">
                        ✏️ Edit
                    </button>
                    <div class="dropdown">
                        <button class="btn-outline btn-sm dropdown-toggle" onclick="this.toggleOrgDropdown('${org.id}')">
                            ⚙️
                        </button>
                        <div class="dropdown-menu" id="dropdown-${org.id}">
                            <button class="dropdown-item" onclick="this.viewOrganization('${org.id}')">
                                👁️ View Details
                            </button>
                            <button class="dropdown-item" onclick="this.toggleOrgStatus('${org.id}')">
                                ${org.is_active ? '⏸️ Deactivate' : '▶️ Activate'}
                            </button>
                            <div class="dropdown-divider"></div>
                            <button class="dropdown-item danger" onclick="this.deleteOrganization('${org.id}')">
                                🗑️ Delete
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `).join('');
    }

    getOrgInitials(name) {
        return name.split(' ')
            .map(word => word[0])
            .join('')
            .slice(0, 2)
            .toUpperCase();
    }

    updateView() {
        if (this.element) {
            const currentOrgSection = this.element.querySelector('#current-org-section');
            const organizationsGrid = this.element.querySelector('#organizations-grid');

            if (currentOrgSection) {
                currentOrgSection.innerHTML = this.renderCurrentOrganization();
            }
            if (organizationsGrid) {
                organizationsGrid.innerHTML = this.renderOrganizations();
            }

            // Update organization count
            const sectionTitle = this.element.querySelector('.section-title');
            if (sectionTitle) {
                sectionTitle.textContent = `All Organizations (${this.organizations.length})`;
            }
        }
    }

    addEventListeners(wrapper) {
        const createOrgBtn = wrapper.querySelector('#create-org-btn');
        if (createOrgBtn) {
            createOrgBtn.addEventListener('click', () => {
                window.location.hash = '#org-create';
            });
        }

        // Add global methods for button clicks
        window.switchToOrganization = async (orgId) => {
            try {
                organizationService.setCurrentOrganization(orgId);
                this.showMessage('Organization switched successfully!', 'success');
            } catch (error) {
                this.showMessage(error.message, 'error');
            }
        };

        window.editOrganization = (orgId) => {
            window.location.hash = `#org-edit/${orgId}`;
        };

        window.viewOrganization = (orgId) => {
            window.location.hash = `#org-view/${orgId}`;
        };

        window.toggleOrgDropdown = (orgId) => {
            const dropdown = document.getElementById(`dropdown-${orgId}`);
            if (dropdown) {
                dropdown.classList.toggle('show');
            }
        };

        window.toggleOrgStatus = async (orgId) => {
            try {
                await organizationService.toggleOrganizationStatus(orgId);
                this.showMessage('Organization status updated!', 'success');
            } catch (error) {
                this.showMessage(error.message, 'error');
            }
        };

        window.deleteOrganization = async (orgId) => {
            const org = organizationService.getOrganizationById(orgId);
            if (confirm(`Are you sure you want to delete "${org.name}"? This action cannot be undone.`)) {
                try {
                    await organizationService.deleteOrganization(orgId);
                    this.showMessage('Organization deleted successfully!', 'success');
                } catch (error) {
                    this.showMessage(error.message, 'error');
                }
            }
        };

        // Close dropdowns when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.dropdown')) {
                const dropdowns = document.querySelectorAll('.dropdown-menu.show');
                dropdowns.forEach(dropdown => dropdown.classList.remove('show'));
            }
        });
    }

    showMessage(message, type) {
        // Create temporary message element
        const messageEl = document.createElement('div');
        messageEl.className = `alert alert-${type}`;
        messageEl.textContent = message;

        const container = this.element.querySelector('.organization-list-container');
        container.insertBefore(messageEl, container.firstChild);

        setTimeout(() => messageEl.remove(), 3000);
    }

    destroy() {
        if (this.orgListener) {
            organizationService.removeListener(this.orgListener);
        }
    }
}
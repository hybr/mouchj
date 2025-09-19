import { Component } from "../core/Component.js";
import { authManager } from "../core/AuthManager.js";
import { organizationService } from "../core/OrganizationService.js";

export class Header extends Component {
    constructor(props) {
        super(props);
        this.isMenuOpen = false;
        this.isAuthenticated = false;
        this.currentUser = null;
        this.currentOrganization = null;
        this.organizations = [];

        // Listen for auth state changes
        this.authListener = (authState) => {
            this.isAuthenticated = authState.isAuthenticated;
            this.currentUser = authState.user;
            this.updateNavigation();
        };

        // Listen for organization changes
        this.orgListener = (orgData) => {
            this.currentOrganization = orgData.currentOrganization;
            this.organizations = orgData.organizations;
            this.updateNavigation();
        };

        authManager.addAuthListener(this.authListener);
        organizationService.addListener(this.orgListener);

        // Set initial state
        this.isAuthenticated = authManager.isLoggedIn();
        this.currentUser = authManager.getCurrentUser();
        this.currentOrganization = organizationService.getCurrentOrganization();
        this.organizations = organizationService.getAllOrganizations(this.currentUser?.username);
    }

    render() {
        const header = this.createElement("header", "responsive-header");
        header.innerHTML = `
            <div class="header-container">
                <div class="logo">
                    <h1>V</h1>
                </div>

                <nav class="desktop-nav">
                    ${this.renderOrganizationMenu()}
                    ${this.renderNavLink()}
                </nav>

                <button class="mobile-menu-toggle" aria-label="Toggle mobile menu">
                    <span class="hamburger-line"></span>
                    <span class="hamburger-line"></span>
                    <span class="hamburger-line"></span>
                </button>

                <div class="mobile-nav-backdrop"></div>
                <nav class="mobile-nav">
                    <div class="mobile-nav-content">
                        ${this.renderMobileOrgContent()}
                        ${this.renderMobileNavContent()}
                    </div>
                </nav>
            </div>
        `;

        this.addEventListeners(header);
        return header;
    }

    renderOrganizationMenu() {
        if (!this.isAuthenticated) {
            return `<a href="#signin" class="nav-link">Sign In</a>`;
        }

        const currentOrgName = this.currentOrganization?.name || 'No Organization';
        const orgInitials = this.currentOrganization
            ? this.getOrgInitials(this.currentOrganization.name)
            : `<a href="#signin" class="nav-link">Sign In</a>`;

        let rStr = '<div class="" id="org-dropdown">';
        if (this.currentOrganization) {
            rStr = rStr + `<div class="current-org-container">
                            <a href="#organizations" class="current-org-item clickable">
                                <div class="org-avatar large">${orgInitials}</div>
                                <div class="org-info">
                                    <div class="org-name">${this.currentOrganization.name}</div>
                                    <div class="org-tagline">${this.currentOrganization.tag_line || 'No tagline'}</div>
                                </div>
                            </a>
                            <div class="org-actions">
                                <button class="org-action-btn" id="viewOrgDetailsBtn" title="View Details">
                                    <i class="fas fa-info-circle"></i>
                                </button>
                                <button class="org-action-btn" id="orgMenuBtn" title="More Options">
                                    <i class="fas fa-chevron-down"></i>
                                </button>
                            </div>
                        </div>
                        <div class="org-dropdown-menu" id="orgDropdownMenu">
                            <a href="#organization-details" class="dropdown-item">
                                <i class="fas fa-info-circle"></i>
                                View Details
                            </a>
                            <a href="#organizations" class="dropdown-item">
                                <i class="fas fa-cog"></i>
                                Manage Organizations
                            </a>
                            <a href="#branch-management" class="dropdown-item">
                                <i class="fas fa-map-marker-alt"></i>
                                Manage Branches
                            </a>
                            <div class="dropdown-divider"></div>
                            <a href="#organization-settings" class="dropdown-item">
                                <i class="fas fa-sliders-h"></i>
                                Organization Settings
                            </a>
                        </div>`;
        } else {
            rStr = rStr + `<a href="#organizations" class="no-current-org clickable">
                            <div class="org-avatar large">?</div>
                            <div class="org-info">
                                <div class="org-name">No Organization Selected</div>
                                <div class="org-tagline">Manage organizations</div>
                            </div>
                        </a>`;
        }
        return rStr + `</div>`;
    }

    renderNavLink() {
        if (this.isAuthenticated) {
            const displayName = this.currentUser?.firstName || this.currentUser?.username || 'User';
            return `
                        <a href="#profile" class="dropdown-header profile-link">
                            <div class="dropdown-avatar">${this.getUserInitials()}</div>
                            <div class="dropdown-info">
                                <div class="dropdown-name">${displayName}</div>
                                <div class="dropdown-email">${this.currentUser?.email || ''}</div>
                            </div>
                        </a>
            `;
        } else {
            return `<a href="#signin" class="nav-link">Sign In</a>`;
        }
    }

    renderMobileOrgContent() {
        if (!this.isAuthenticated) {
            return '';
        }

        const currentOrgName = this.currentOrganization?.name || 'No Organization';
        const orgInitials = this.currentOrganization
            ? this.getOrgInitials(this.currentOrganization.name)
            : '?';

        return `
            <div class="mobile-org-section">
                <div class="mobile-org-header">
                    <h4>Current Organization</h4>
                </div>
                <a href="#organizations" class="mobile-current-org">
                    <div class="mobile-org-avatar">${orgInitials}</div>
                    <div class="mobile-org-details">
                        <div class="mobile-org-name">${currentOrgName}</div>
                        <div class="mobile-org-tagline">${this.currentOrganization?.tag_line || 'Manage organizations'}</div>
                    </div>
                </a>
            </div>
            <div class="mobile-nav-divider"></div>
        `;
    }

    renderMobileNavContent() {
        if (this.isAuthenticated) {
            const displayName = this.currentUser?.firstName || this.currentUser?.username || 'User';
            return `
                <a href="#profile" class="mobile-user-info">
                    <div class="mobile-avatar">${this.getUserInitials()}</div>
                    <div class="mobile-user-details">
                        <div class="mobile-name">${displayName}</div>
                        <div class="mobile-email">${this.currentUser?.email || ''}</div>
                    </div>
                </a>
                <div class="mobile-nav-divider"></div>
                <div class="mobile-nav-divider"></div>
                <button class="mobile-logout-btn" id="mobile-logout-btn">🚪 Sign Out</button>
            `;
        } else {
            return `<a href="#my">Sign In</a>`;
        }
    }

    getOrgInitials(name) {
        return name.split(' ')
            .map(word => word[0])
            .join('')
            .slice(0, 2)
            .toUpperCase();
    }

    getUserInitials() {
        if (this.currentUser?.firstName || this.currentUser?.lastName) {
            const first = this.currentUser.firstName?.[0] || '';
            const last = this.currentUser.lastName?.[0] || '';
            return (first + last).toUpperCase();
        }
        return this.currentUser?.username?.slice(0, 2).toUpperCase() || 'U';
    }

    updateNavigation() {
        if (this.element) {
            // Update desktop navigation
            const desktopNav = this.element.querySelector('.desktop-nav');
            if (desktopNav) {
                desktopNav.innerHTML = this.renderNavLink();
            }

            // Update mobile navigation
            const mobileNavContent = this.element.querySelector('.mobile-nav-content');
            if (mobileNavContent) {
                mobileNavContent.innerHTML = this.renderMobileNavContent();
            }

            // Re-add event listeners for new elements
            this.addUserMenuListeners();
        }
    }

    addEventListeners(header) {
        const menuToggle = header.querySelector('.mobile-menu-toggle');
        const mobileNav = header.querySelector('.mobile-nav');
        const backdrop = header.querySelector('.mobile-nav-backdrop');

        menuToggle.addEventListener('click', () => {
            this.isMenuOpen = !this.isMenuOpen;
            menuToggle.classList.toggle('active', this.isMenuOpen);
            mobileNav.classList.toggle('active', this.isMenuOpen);
            backdrop.classList.toggle('active', this.isMenuOpen);

            // Prevent body scroll when menu is open
            document.body.style.overflow = this.isMenuOpen ? 'hidden' : '';
        });

        // Close mobile menu when clicking on backdrop
        backdrop.addEventListener('click', () => {
            this.closeMenu(menuToggle, mobileNav, backdrop);
        });

        // Close mobile menu when clicking on a link
        const mobileLinks = header.querySelectorAll('.mobile-nav a');
        mobileLinks.forEach(link => {
            link.addEventListener('click', () => {
                this.closeMenu(menuToggle, mobileNav, backdrop);
            });
        });

        // Close mobile menu when clicking outside
        document.addEventListener('click', (e) => {
            if (!header.contains(e.target) && this.isMenuOpen) {
                this.closeMenu(menuToggle, mobileNav, backdrop);
            }
        });

        // Add user menu listeners
        this.addUserMenuListeners();
    }

    addUserMenuListeners() {
        // Organization details button
        const viewOrgDetailsBtn = document.getElementById('viewOrgDetailsBtn');
        if (viewOrgDetailsBtn) {
            viewOrgDetailsBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                window.location.hash = '#organization-details';
            });
        }

        // Organization menu button
        const orgMenuBtn = document.getElementById('orgMenuBtn');
        const orgDropdownMenu = document.getElementById('orgDropdownMenu');

        if (orgMenuBtn && orgDropdownMenu) {
            orgMenuBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                // Close user dropdown if open
                const userDropdown = document.getElementById('user-dropdown');
                if (userDropdown) userDropdown.classList.remove('show');

                orgDropdownMenu.classList.toggle('show');
            });
        }

        // Desktop user menu
        const userMenuTrigger = document.getElementById('user-menu-trigger');
        const userDropdown = document.getElementById('user-dropdown');
        const logoutBtn = document.getElementById('logout-btn');
        const mobileLogoutBtn = document.getElementById('mobile-logout-btn');

        if (userMenuTrigger && userDropdown) {
            userMenuTrigger.addEventListener('click', (e) => {
                e.stopPropagation();
                // Close org dropdown if open
                if (orgDropdown) orgDropdown.classList.remove('show');

                userDropdown.classList.toggle('show');
            });
        }

        // Close dropdowns when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.user-menu')) {
                const userDropdown = document.getElementById('user-dropdown');
                if (userDropdown) userDropdown.classList.remove('show');
            }
            if (!e.target.closest('.org-dropdown')) {
                const orgDropdownMenu = document.getElementById('orgDropdownMenu');
                if (orgDropdownMenu) orgDropdownMenu.classList.remove('show');
            }
        });

        // Organization switching
        window.switchOrganization = async (orgId) => {
            try {
                organizationService.setCurrentOrganization(orgId);
                // Close dropdown
                const orgDropdownMenu = document.getElementById('orgDropdownMenu');
                if (orgDropdownMenu) orgDropdownMenu.classList.remove('show');
            } catch (error) {
                console.error('Failed to switch organization:', error);
            }
        };

        // Logout functionality
        if (logoutBtn) {
            logoutBtn.addEventListener('click', async (e) => {
                e.preventDefault();
                await this.handleLogout();
            });
        }

        if (mobileLogoutBtn) {
            mobileLogoutBtn.addEventListener('click', async (e) => {
                e.preventDefault();
                await this.handleLogout();
            });
        }
    }

    async handleLogout() {
        try {
            await authManager.logout();

            // Redirect to home or login
            window.location.hash = '';

            // Close any open menus
            if (this.isMenuOpen) {
                const menuToggle = this.element.querySelector('.mobile-menu-toggle');
                const mobileNav = this.element.querySelector('.mobile-nav');
                const backdrop = this.element.querySelector('.mobile-nav-backdrop');
                this.closeMenu(menuToggle, mobileNav, backdrop);
            }

            // Close user dropdown
            const userDropdown = document.getElementById('user-dropdown');
            if (userDropdown) {
                userDropdown.classList.remove('show');
            }

            // Close org dropdown
            const orgDropdownMenu = document.getElementById('orgDropdownMenu');
            if (orgDropdownMenu) {
                orgDropdownMenu.classList.remove('show');
            }

        } catch (error) {
            console.error('Logout failed:', error);
        }
    }

    closeMenu(menuToggle, mobileNav, backdrop) {
        this.isMenuOpen = false;
        menuToggle.classList.remove('active');
        mobileNav.classList.remove('active');
        backdrop.classList.remove('active');
        document.body.style.overflow = '';
    }

    // Cleanup method
    destroy() {
        if (this.authListener) {
            authManager.removeAuthListener(this.authListener);
        }
        if (this.orgListener) {
            organizationService.removeListener(this.orgListener);
        }
    }
}
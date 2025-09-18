import { Component } from "../core/Component.js";
import { authManager } from "../core/AuthManager.js";

export class Header extends Component {
    constructor(props) {
        super(props);
        this.isMenuOpen = false;
        this.isAuthenticated = false;
        this.currentUser = null;

        // Listen for auth state changes
        this.authListener = (authState) => {
            this.isAuthenticated = authState.isAuthenticated;
            this.currentUser = authState.user;
            this.updateNavigation();
        };

        authManager.addAuthListener(this.authListener);

        // Set initial state
        this.isAuthenticated = authManager.isLoggedIn();
        this.currentUser = authManager.getCurrentUser();
    }

    render() {
        const header = this.createElement("header", "responsive-header");
        header.innerHTML = `
            <div class="header-container">
                <div class="logo">
                    <h1>OOP Website</h1>
                </div>

                <nav class="desktop-nav">
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
                        ${this.renderMobileNavContent()}
                    </div>
                </nav>
            </div>
        `;

        this.addEventListeners(header);
        return header;
    }

    renderNavLink() {
        if (this.isAuthenticated) {
            const displayName = this.currentUser?.firstName || this.currentUser?.username || 'User';
            return `
                <div class="user-menu">
                    <button class="user-menu-trigger" id="user-menu-trigger">
                        <span class="user-avatar">${this.getUserInitials()}</span>
                        <span class="user-name">My</span>
                        <span class="dropdown-arrow">▼</span>
                    </button>
                    <div class="user-dropdown" id="user-dropdown">
                        <div class="dropdown-header">
                            <div class="dropdown-avatar">${this.getUserInitials()}</div>
                            <div class="dropdown-info">
                                <div class="dropdown-name">${displayName}</div>
                                <div class="dropdown-email">${this.currentUser?.email || ''}</div>
                            </div>
                        </div>
                        <div class="dropdown-divider"></div>
                        <a href="#profile" class="dropdown-item">👤 My Profile</a>
                        <a href="#changepw" class="dropdown-item">🔒 Change Password</a>
                        <div class="dropdown-divider"></div>
                        <button class="dropdown-item logout-btn" id="logout-btn">🚪 Sign Out</button>
                    </div>
                </div>
            `;
        } else {
            return `<a href="#my" class="nav-link">My</a>`;
        }
    }

    renderMobileNavContent() {
        if (this.isAuthenticated) {
            const displayName = this.currentUser?.firstName || this.currentUser?.username || 'User';
            return `
                <div class="mobile-user-info">
                    <div class="mobile-avatar">${this.getUserInitials()}</div>
                    <div class="mobile-user-details">
                        <div class="mobile-name">${displayName}</div>
                        <div class="mobile-email">${this.currentUser?.email || ''}</div>
                    </div>
                </div>
                <div class="mobile-nav-divider"></div>
                <a href="#profile">👤 My Profile</a>
                <a href="#changepw">🔒 Change Password</a>
                <div class="mobile-nav-divider"></div>
                <button class="mobile-logout-btn" id="mobile-logout-btn">🚪 Sign Out</button>
            `;
        } else {
            return `<a href="#my">Sign In</a>`;
        }
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
        // Desktop user menu
        const userMenuTrigger = document.getElementById('user-menu-trigger');
        const userDropdown = document.getElementById('user-dropdown');
        const logoutBtn = document.getElementById('logout-btn');
        const mobileLogoutBtn = document.getElementById('mobile-logout-btn');

        if (userMenuTrigger && userDropdown) {
            userMenuTrigger.addEventListener('click', (e) => {
                e.stopPropagation();
                userDropdown.classList.toggle('show');
            });

            // Close dropdown when clicking outside
            document.addEventListener('click', (e) => {
                if (!userMenuTrigger.contains(e.target) && !userDropdown.contains(e.target)) {
                    userDropdown.classList.remove('show');
                }
            });
        }

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
    }
}
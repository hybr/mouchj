import { Component } from "../../core/Component.js";
import { authManager } from "../../core/AuthManager.js";

export class Profile extends Component {
    constructor(user) {
        super();
        this.user = user || {
            username: "johndoe",
            email: "john.doe@example.com",
            firstName: "John",
            lastName: "Doe",
            joinedDate: "2024-01-15",
            lastLogin: "2024-09-18",
            avatar: null
        };
        this.isEditing = false;
    }

    render() {
        const profileWrapper = this.createElement("div", "profile-wrapper");
        profileWrapper.innerHTML = `
            <div class="profile-container">
                <div class="profile-header">
                    <div class="profile-avatar">
                        <div class="avatar-placeholder">
                            ${this.getAvatarInitials()}
                        </div>
                        <button class="avatar-upload-btn" title="Change avatar">
                            📷
                        </button>
                    </div>
                    <div class="profile-info">
                        <h2 class="profile-name">${this.getFullName()}</h2>
                        <p class="profile-username">@${this.user.username}</p>
                        <p class="profile-join-date">Member since ${this.formatDate(this.user.joinedDate)}</p>
                    </div>
                    <div class="profile-actions">
                        <button class="btn-secondary" id="edit-profile-btn">
                            ✏️ Edit Profile
                        </button>
                        <button class="btn-outline" id="change-password-btn">
                            🔒 Change Password
                        </button>
                        <button class="btn-danger" id="logout-btn">
                            🚪 Sign Out
                        </button>
                    </div>
                </div>

                <div class="profile-content">
                    <div class="profile-section">
                        <h3 class="section-title">Personal Information</h3>
                        <div class="info-grid" id="profile-info-display">
                            <div class="info-item">
                                <label>First Name</label>
                                <span>${this.user.firstName || 'Not provided'}</span>
                            </div>
                            <div class="info-item">
                                <label>Last Name</label>
                                <span>${this.user.lastName || 'Not provided'}</span>
                            </div>
                            <div class="info-item">
                                <label>Email</label>
                                <span>${this.user.email}</span>
                            </div>
                            <div class="info-item">
                                <label>Username</label>
                                <span>${this.user.username}</span>
                            </div>
                        </div>

                        <form class="edit-form hidden" id="profile-edit-form">
                            <div class="form-row">
                                <div class="form-group">
                                    <label for="firstName">First Name</label>
                                    <input type="text" id="firstName" name="firstName" value="${this.user.firstName || ''}" class="form-input">
                                </div>
                                <div class="form-group">
                                    <label for="lastName">Last Name</label>
                                    <input type="text" id="lastName" name="lastName" value="${this.user.lastName || ''}" class="form-input">
                                </div>
                            </div>
                            <div class="form-row">
                                <div class="form-group">
                                    <label for="email">Email</label>
                                    <input type="email" id="email" name="email" value="${this.user.email}" class="form-input" required>
                                </div>
                                <div class="form-group">
                                    <label for="username">Username</label>
                                    <input type="text" id="username" name="username" value="${this.user.username}" class="form-input" required>
                                </div>
                            </div>
                            <div class="form-actions">
                                <button type="button" class="btn-outline" id="cancel-edit-btn">Cancel</button>
                                <button type="submit" class="btn-primary">
                                    <span class="btn-text">Save Changes</span>
                                    <div class="btn-loader">
                                        <div class="spinner"></div>
                                    </div>
                                </button>
                            </div>
                        </form>
                    </div>

                    <div class="profile-section">
                        <h3 class="section-title">Account Activity</h3>
                        <div class="activity-grid">
                            <div class="activity-item">
                                <div class="activity-icon">🕒</div>
                                <div class="activity-content">
                                    <h4>Last Login</h4>
                                    <p>${this.formatDateTime(this.user.lastLogin)}</p>
                                </div>
                            </div>
                            <div class="activity-item">
                                <div class="activity-icon">📅</div>
                                <div class="activity-content">
                                    <h4>Account Created</h4>
                                    <p>${this.formatDate(this.user.joinedDate)}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="profile-section danger-zone">
                        <h3 class="section-title">Danger Zone</h3>
                        <div class="danger-actions">
                            <button class="btn-danger" id="delete-account-btn">
                                🗑️ Delete Account
                            </button>
                            <p class="danger-warning">
                                This action cannot be undone. This will permanently delete your account.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        `;

        this.addProfileEventListeners(profileWrapper);
        return profileWrapper;
    }

    addProfileEventListeners(wrapper) {
        const editBtn = wrapper.querySelector('#edit-profile-btn');
        const cancelBtn = wrapper.querySelector('#cancel-edit-btn');
        const editForm = wrapper.querySelector('#profile-edit-form');
        const infoDisplay = wrapper.querySelector('#profile-info-display');
        const changePasswordBtn = wrapper.querySelector('#change-password-btn');
        const deleteAccountBtn = wrapper.querySelector('#delete-account-btn');
        const logoutBtn = wrapper.querySelector('#logout-btn');

        // Edit profile toggle
        editBtn.addEventListener('click', () => {
            this.toggleEditMode(true, editBtn, infoDisplay, editForm);
        });

        cancelBtn.addEventListener('click', () => {
            this.toggleEditMode(false, editBtn, infoDisplay, editForm);
        });

        // Form submission
        editForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.handleProfileUpdate(e.target);
        });

        // Change password
        changePasswordBtn.addEventListener('click', () => {
            window.location.hash = '#changepw';
        });

        // Delete account (with confirmation)
        deleteAccountBtn.addEventListener('click', () => {
            if (confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
                this.handleAccountDeletion();
            }
        });

        // Logout
        logoutBtn.addEventListener('click', async () => {
            await this.handleLogout();
        });
    }

    toggleEditMode(isEditing, editBtn, infoDisplay, editForm) {
        this.isEditing = isEditing;

        if (isEditing) {
            editBtn.textContent = '👁️ View Profile';
            infoDisplay.classList.add('hidden');
            editForm.classList.remove('hidden');
        } else {
            editBtn.textContent = '✏️ Edit Profile';
            infoDisplay.classList.remove('hidden');
            editForm.classList.add('hidden');
        }
    }

    async handleProfileUpdate(form) {
        const submitBtn = form.querySelector('button[type="submit"]');
        const btnText = submitBtn.querySelector('.btn-text');
        const btnLoader = submitBtn.querySelector('.btn-loader');

        // Show loading
        submitBtn.classList.add('loading');
        btnText.style.opacity = '0';
        btnLoader.style.opacity = '1';
        submitBtn.disabled = true;

        try {
            const formData = new FormData(form);
            const updatedData = Object.fromEntries(formData);

            // Simulate API call
            await new Promise(resolve => setTimeout(resolve, 1500));

            // Update user data
            Object.assign(this.user, updatedData);

            // Show success message
            this.showSuccessMessage('Profile updated successfully!');

            // Exit edit mode
            setTimeout(() => {
                this.toggleEditMode(false,
                    document.querySelector('#edit-profile-btn'),
                    document.querySelector('#profile-info-display'),
                    document.querySelector('#profile-edit-form')
                );
                location.reload(); // In a real app, just update the display
            }, 1000);

        } catch (error) {
            this.showErrorMessage('Failed to update profile. Please try again.');
        } finally {
            // Hide loading
            submitBtn.classList.remove('loading');
            btnText.style.opacity = '1';
            btnLoader.style.opacity = '0';
            submitBtn.disabled = false;
        }
    }

    async handleAccountDeletion() {
        try {
            // Show loading or confirmation dialog
            await new Promise(resolve => setTimeout(resolve, 1000));

            this.showSuccessMessage('Account deletion requested. You will receive an email with further instructions.');
        } catch (error) {
            this.showErrorMessage('Failed to process account deletion request.');
        }
    }

    async handleLogout() {
        try {
            await authManager.logout();
            // Redirect to home page
            window.location.hash = '';
        } catch (error) {
            console.error('Logout failed:', error);
            this.showErrorMessage('Failed to logout. Please try again.');
        }
    }

    showSuccessMessage(message) {
        // Create and show a temporary success message
        const messageEl = document.createElement('div');
        messageEl.className = 'alert alert-success';
        messageEl.textContent = message;
        document.querySelector('.profile-container').insertBefore(messageEl, document.querySelector('.profile-header'));

        setTimeout(() => messageEl.remove(), 5000);
    }

    showErrorMessage(message) {
        // Create and show a temporary error message
        const messageEl = document.createElement('div');
        messageEl.className = 'alert alert-error';
        messageEl.textContent = message;
        document.querySelector('.profile-container').insertBefore(messageEl, document.querySelector('.profile-header'));

        setTimeout(() => messageEl.remove(), 5000);
    }

    getFullName() {
        if (this.user.firstName || this.user.lastName) {
            return `${this.user.firstName || ''} ${this.user.lastName || ''}`.trim();
        }
        return this.user.username;
    }

    getAvatarInitials() {
        if (this.user.firstName || this.user.lastName) {
            const first = this.user.firstName?.[0] || '';
            const last = this.user.lastName?.[0] || '';
            return (first + last).toUpperCase();
        }
        return (this.user.username || 'U').slice(0, 2).toUpperCase();
    }

    formatDate(dateString) {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }

    formatDateTime(dateString) {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }
}

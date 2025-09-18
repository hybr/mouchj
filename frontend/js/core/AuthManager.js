export class AuthManager {
    constructor() {
        this.currentUser = null;
        this.isAuthenticated = false;
        this.listeners = [];

        // Check for existing session on initialization
        this.checkExistingSession();
    }

    checkExistingSession() {
        // Check localStorage for existing session
        const savedUser = localStorage.getItem('currentUser');
        const savedAuth = localStorage.getItem('isAuthenticated');

        if (savedUser && savedAuth === 'true') {
            this.currentUser = JSON.parse(savedUser);
            this.isAuthenticated = true;
        }
    }

    login(userData) {
        this.currentUser = userData;
        this.isAuthenticated = true;

        // Save to localStorage
        localStorage.setItem('currentUser', JSON.stringify(userData));
        localStorage.setItem('isAuthenticated', 'true');

        // Notify listeners
        this.notifyListeners();

        return Promise.resolve(userData);
    }

    logout() {
        this.currentUser = null;
        this.isAuthenticated = false;

        // Clear localStorage
        localStorage.removeItem('currentUser');
        localStorage.removeItem('isAuthenticated');

        // Notify listeners
        this.notifyListeners();

        return Promise.resolve();
    }

    getCurrentUser() {
        return this.currentUser;
    }

    isLoggedIn() {
        return this.isAuthenticated;
    }

    updateUser(userData) {
        if (this.isAuthenticated) {
            this.currentUser = { ...this.currentUser, ...userData };
            localStorage.setItem('currentUser', JSON.stringify(this.currentUser));
            this.notifyListeners();
        }
    }

    // Event listener system for auth state changes
    addAuthListener(callback) {
        this.listeners.push(callback);
    }

    removeAuthListener(callback) {
        this.listeners = this.listeners.filter(listener => listener !== callback);
    }

    notifyListeners() {
        this.listeners.forEach(callback => {
            callback({
                isAuthenticated: this.isAuthenticated,
                user: this.currentUser
            });
        });
    }
}

// Create singleton instance
export const authManager = new AuthManager();
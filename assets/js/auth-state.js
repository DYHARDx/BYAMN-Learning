// Centralized Authentication State Manager
// This module provides a consistent way to manage authentication state across the application

class AuthState {
    constructor() {
        this.user = null;
        this.isAuthenticated = false;
        this.isLoading = true;
        this.listeners = [];
        this.initialize();
    }

    // Initialize the authentication state manager
    async initialize() {
        try {
            // Wait for Firebase to be ready
            if (typeof firebaseServices === 'undefined') {
                console.warn('Firebase services not available yet');
                this.isLoading = false;
                this.notifyListeners();
                return;
            }

            // Set up auth state listener
            firebaseServices.onAuthStateChanged((user) => {
                this.user = user;
                this.isAuthenticated = !!user;
                this.isLoading = false;
                this.notifyListeners();
            });
        } catch (error) {
            console.error('Error initializing auth state:', error);
            this.isLoading = false;
            this.notifyListeners();
        }
    }

    // Subscribe to auth state changes
    subscribe(callback) {
        this.listeners.push(callback);
        // Immediately notify with current state
        callback({
            user: this.user,
            isAuthenticated: this.isAuthenticated,
            isLoading: this.isLoading
        });
        return () => {
            this.listeners = this.listeners.filter(listener => listener !== callback);
        };
    }

    // Notify all listeners of state changes
    notifyListeners() {
        const state = {
            user: this.user,
            isAuthenticated: this.isAuthenticated,
            isLoading: this.isLoading
        };
        this.listeners.forEach(listener => listener(state));
    }

    // Get current auth state
    getState() {
        return {
            user: this.user,
            isAuthenticated: this.isAuthenticated,
            isLoading: this.isLoading
        };
    }

    // Login method
    async login(email, password) {
        try {
            this.isLoading = true;
            this.notifyListeners();
            
            const userCredential = await firebaseServices.signInWithEmailAndPassword(email, password);
            const user = userCredential.user;
            
            // Update last login time
            const userData = {
                lastLoginAt: new Date().toISOString()
            };

            await firebaseServices.update(firebaseServices.ref('users/' + user.uid), userData);
            
            this.user = user;
            this.isAuthenticated = true;
            this.isLoading = false;
            this.notifyListeners();
            
            return { success: true, user };
        } catch (error) {
            this.isLoading = false;
            this.notifyListeners();
            throw error;
        }
    }

    // Logout method
    async logout() {
        try {
            this.isLoading = true;
            this.notifyListeners();
            
            await firebaseServices.signOut();
            
            this.user = null;
            this.isAuthenticated = false;
            this.isLoading = false;
            this.notifyListeners();
            
            return { success: true };
        } catch (error) {
            this.isLoading = false;
            this.notifyListeners();
            throw error;
        }
    }

    // Register method
    async register(name, email, password) {
        try {
            this.isLoading = true;
            this.notifyListeners();
            
            // Check if email already exists
            const signInMethods = await firebaseServices.fetchSignInMethodsForEmail(email);
            if (signInMethods.length > 0) {
                throw new Error('auth/email-already-in-use');
            }
            
            // Create user
            const userCredential = await firebaseServices.createUserWithEmailAndPassword(email, password);
            const user = userCredential.user;
            
            // Update profile
            await user.updateProfile({ displayName: name });
            
            // Reload user to get updated data
            await user.reload();
            
            // Save user data to database
            const userData = {
                uid: user.uid,
                email: user.email,
                displayName: user.displayName || name,
                role: 'student',
                createdAt: new Date().toISOString(),
                lastLoginAt: new Date().toISOString()
            };
            
            await firebaseServices.createUserInDatabase(userData);
            
            this.user = user;
            this.isAuthenticated = true;
            this.isLoading = false;
            this.notifyListeners();
            
            return { success: true, user };
        } catch (error) {
            this.isLoading = false;
            this.notifyListeners();
            throw error;
        }
    }
}

// Create singleton instance
const authState = new AuthState();

// Export for use in other modules
window.authState = authState;

export default authState;
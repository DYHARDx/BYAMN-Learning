// Main JavaScript file for common functionality across all pages

// Add a function to log activities to Firebase
function logActivity(activityData) {
    // Only log activities if Firebase is available
    if (typeof firebaseServices !== 'undefined') {
        try {
            const { ref, push, set } = firebaseServices;
            const activityRef = push(ref('activities'));
            const activity = {
                ...activityData,
                timestamp: new Date().toISOString()
            };
            set(activityRef, activity);
        } catch (error) {
            console.error('Error logging activity:', error);
        }
    }
}

// Theme toggle functionality
document.addEventListener('DOMContentLoaded', function() {
    // Theme toggle elements
    const themeToggle = document.getElementById('theme-toggle');
    const themeToggleDarkIcon = document.getElementById('theme-toggle-dark-icon');
    const themeToggleLightIcon = document.getElementById('theme-toggle-light-icon');

    // Mobile menu elements
    const mobileMenuButton = document.getElementById('mobile-menu-button');
    const mobileMenu = document.getElementById('mobile-menu');

    // User action elements
    const userActionsDesktop = document.getElementById('user-actions-desktop');
    const userActionsMobile = document.getElementById('user-actions-mobile');

    // Set initial theme to light mode only
    function initTheme() {
        // Ensure dark mode is disabled
        document.documentElement.classList.remove('dark');
        localStorage.setItem('theme', 'light');

        // Hide dark mode icon and show light mode icon
        if (themeToggleDarkIcon) themeToggleDarkIcon.classList.add('hidden');
        if (themeToggleLightIcon) themeToggleLightIcon.classList.remove('hidden');
    }

    // Toggle theme function - now just keeps light mode
    function toggleTheme() {
        // Always ensure light mode
        document.documentElement.classList.remove('dark');
        localStorage.setItem('theme', 'light');

        // Keep light mode icon visible
        if (themeToggleDarkIcon) themeToggleDarkIcon.classList.add('hidden');
        if (themeToggleLightIcon) themeToggleLightIcon.classList.remove('hidden');
    }

    // Toggle mobile menu function
    function toggleMobileMenu() {
        mobileMenu.classList.toggle('hidden');
    }

    // Update UI based on auth state
    function updateAuthUI(user) {
        if (user) {
            // User is signed in
            const userName = user.displayName || user.email;

            // Update desktop navigation
            if (userActionsDesktop) {
                userActionsDesktop.innerHTML = `
                    <a href="./dashboard.html" class="btn btn-primary">
                        Dashboard
                    </a>
                    <button id="logout-btn" class="btn btn-outline">
                        Logout
                    </button>
                `;

                // Add logout event listener
                const logoutBtn = document.getElementById('logout-btn');
                if (logoutBtn) {
                    logoutBtn.addEventListener('click', function() {
                        // Import Firebase services
                        if (typeof firebase !== 'undefined' && typeof firebaseServices !== 'undefined') {
                            firebaseServices.signOut()
                                .then(() => {
                                    window.location.href = './index.html';
                                })
                                .catch((error) => {
                                    console.error('Logout error:', error);
                                    utils.showNotification('Logout failed: ' + error.message, 'error');
                                });
                        }
                    });
                }
            }

            // Update mobile navigation
            if (userActionsMobile) {
                userActionsMobile.innerHTML = `
                    <a href="./dashboard.html" class="block w-full text-center btn btn-primary mb-2">
                        Dashboard
                    </a>
                    <button id="mobile-logout-btn" class="block w-full text-center btn btn-outline">
                        Logout
                    </button>
                `;

                // Add mobile logout event listener
                const mobileLogoutBtn = document.getElementById('mobile-logout-btn');
                if (mobileLogoutBtn) {
                    mobileLogoutBtn.addEventListener('click', function() {
                        // Import Firebase services
                        if (typeof firebase !== 'undefined' && typeof firebaseServices !== 'undefined') {
                            firebaseServices.signOut()
                                .then(() => {
                                    window.location.href = './index.html';
                                })
                                .catch((error) => {
                                    console.error('Logout error:', error);
                                    utils.showNotification('Logout failed: ' + error.message, 'error');
                                });
                        }
                    });
                }
            }
        } else {
            // User is signed out
            if (userActionsDesktop) {
                userActionsDesktop.innerHTML = `
                    <a href="./auth/login.html" class="btn btn-outline">
                        Login
                    </a>
                    <a href="./auth/register.html" class="btn btn-primary">
                        Get Started
                    </a>
                `;
            }

            if (userActionsMobile) {
                userActionsMobile.innerHTML = `
                    <a href="./auth/login.html" class="block w-full text-center btn btn-outline mb-2">
                        Login
                    </a>
                    <a href="./auth/register.html" class="block w-full text-center btn btn-primary">
                        Get Started
                    </a>
                `;
            }
        }
    }

    // Initialize theme
    initTheme();

    // Add event listeners
    if (themeToggle) {
        themeToggle.addEventListener('click', toggleTheme);
    }

    if (mobileMenuButton) {
        mobileMenuButton.addEventListener('click', toggleMobileMenu);
    }

    // Close mobile menu when clicking outside
    document.addEventListener('click', function(event) {
        if (mobileMenu && !mobileMenu.classList.contains('hidden') &&
            !mobileMenu.contains(event.target) &&
            !mobileMenuButton.contains(event.target)) {
            mobileMenu.classList.add('hidden');
        }
    });

    // Check auth state
    // We need to load Firebase first if it's not already loaded
    if (typeof firebase !== 'undefined') {
        // Add Firebase auth state listener
        if (typeof firebaseServices !== 'undefined') {
            firebaseServices.onAuthStateChanged(function(user) {
                updateAuthUI(user);
            });
        }
    }
});

// Utility functions
function showNotification(message, type = 'success') {
    // Remove any existing notifications
    const existingNotification = document.querySelector('.notification-toast');
    if (existingNotification) {
        existingNotification.remove();
    }

    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification-toast fixed top-6 right-6 px-6 py-4 rounded-xl shadow-xl z-50 transform transition-all duration-300 max-w-sm ${
        type === 'success' ? 'bg-green-500 text-white' :
        type === 'error' ? 'bg-red-500 text-white' :
        type === 'warning' ? 'bg-yellow-500 text-white' :
        'bg-blue-500 text-white'
    }`;
    notification.innerHTML = `
        <div class="flex items-start">
            <div class="flex-shrink-0">
                ${type === 'success' ?
                    '<svg class="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" /></svg>' :
                type === 'error' ?
                    '<svg class="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>' :
                type === 'warning' ?
                    '<svg class="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>' :
                    '<svg class="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>'
                }
            </div>
            <div class="ml-4">
                <p class="text-sm font-semibold">${message}</p>
            </div>
            <div class="ml-4 flex-shrink-0 flex">
                <button id="notification-close" class="inline-flex text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-green-500 focus:ring-white rounded-full">
                    <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>
        </div>
    `;

    // Add to document
    document.body.appendChild(notification);

    // Add close event listener
    const closeBtn = notification.querySelector('#notification-close');
    if (closeBtn) {
        closeBtn.addEventListener('click', function() {
            notification.classList.add('opacity-0', 'translate-x-full');
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 300);
        });
    }

    // Remove after 5 seconds
    setTimeout(() => {
        if (notification.parentNode) {
            notification.classList.add('opacity-0', 'translate-x-full');
            setTimeout(() => {
                if (notification.parentNode) {
                    document.body.removeChild(notification);
                }
            }, 300);
        }
    }, 5000);
}

// Format date function
function formatDate(dateString) {
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
}

// Format number with commas
function formatNumber(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

// Time ago function
function timeAgo(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);

    let interval = Math.floor(seconds / 31536000);
    if (interval > 1) {
        return interval + ' years ago';
    }

    interval = Math.floor(seconds / 2592000);
    if (interval > 1) {
        return interval + ' months ago';
    }

    interval = Math.floor(seconds / 86400);
    if (interval > 1) {
        return interval + ' days ago';
    }

    interval = Math.floor(seconds / 3600);
    if (interval > 1) {
        return interval + ' hours ago';
    }

    interval = Math.floor(seconds / 60);
    if (interval > 1) {
        return interval + ' minutes ago';
    }

    return Math.floor(seconds) + ' seconds ago';
}

// Debounce function for search/input optimization
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Export functions for use in other modules
window.utils = {
    showNotification,
    formatDate,
    formatNumber,
    timeAgo,
    debounce
};

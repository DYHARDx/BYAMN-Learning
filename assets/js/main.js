function logActivity(activityData) {
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

document.addEventListener('DOMContentLoaded', function() {

    // ✅ Redirect to home when clicking logo  
    const logoElement = document.getElementById('site-logo');
    if (logoElement) {
        logoElement.addEventListener('click', function () {
            window.location.href = './index.html';
        });
    }

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
        document.documentElement.classList.remove('dark');
        localStorage.setItem('theme', 'light');
        if (themeToggleDarkIcon) themeToggleDarkIcon.classList.add('hidden');
        if (themeToggleLightIcon) themeToggleLightIcon.classList.remove('hidden');
    }

    function toggleTheme() {
        document.documentElement.classList.remove('dark');
        localStorage.setItem('theme', 'light');
        if (themeToggleDarkIcon) themeToggleDarkIcon.classList.add('hidden');
        if (themeToggleLightIcon) themeToggleLightIcon.classList.remove('hidden');
    }

    function toggleMobileMenu() {
        mobileMenu.classList.toggle('hidden');
    }

    // Update UI based on auth state
    function updateAuthUI(user) {
        if (user) {
            const userName = user.displayName || user.email;

            if (userActionsDesktop) {
                userActionsDesktop.innerHTML = `
                    <a href="./dashboard.html" class="btn btn-primary">Dashboard</a>
                    <button id="logout-btn" class="btn btn-outline">Logout</button>
                `;
                const logoutBtn = document.getElementById('logout-btn');
                if (logoutBtn) {
                    logoutBtn.addEventListener('click', function() {
                        if (typeof firebase !== 'undefined' && typeof firebaseServices !== 'undefined') {
                            firebaseServices.signOut()
                                .then(() => window.location.href = './index.html')
                                .catch((error) => utils.showNotification('Logout failed: ' + error.message, 'error'));
                        }
                    });
                }
            }

            if (userActionsMobile) {
                userActionsMobile.innerHTML = `
                    <a href="./dashboard.html" class="block w-full text-center btn btn-primary mb-2">Dashboard</a>
                    <button id="mobile-logout-btn" class="block w-full text-center btn btn-outline">Logout</button>
                `;
                const mobileLogoutBtn = document.getElementById('mobile-logout-btn');
                if (mobileLogoutBtn) {
                    mobileLogoutBtn.addEventListener('click', function() {
                        if (typeof firebase !== 'undefined' && typeof firebaseServices !== 'undefined') {
                            firebaseServices.signOut()
                                .then(() => window.location.href = './index.html')
                                .catch((error) => utils.showNotification('Logout failed: ' + error.message, 'error'));
                        }
                    });
                }
            }
        } else {
            if (userActionsDesktop) {
                userActionsDesktop.innerHTML = `
                    <a href="./auth/login.html" class="btn btn-outline">Login</a>
                    <a href="./auth/register.html" class="btn btn-primary">Get Started</a>
                `;
            }
            if (userActionsMobile) {
                userActionsMobile.innerHTML = `
                    <a href="./auth/login.html" class="block w-full text-center btn btn-outline mb-2">Login</a>
                    <a href="./auth/register.html" class="block w-full text-center btn btn-primary">Get Started</a>
                `;
            }
        }
    }

    initTheme();

    if (themeToggle) themeToggle.addEventListener('click', toggleTheme);
    if (mobileMenuButton) mobileMenuButton.addEventListener('click', toggleMobileMenu);

    document.addEventListener('click', function(event) {
        if (mobileMenu && !mobileMenu.classList.contains('hidden') &&
            !mobileMenu.contains(event.target) && !mobileMenuButton.contains(event.target)) {
            mobileMenu.classList.add('hidden');
        }
    });

    if (typeof firebase !== 'undefined' && typeof firebaseServices !== 'undefined') {
        firebaseServices.onAuthStateChanged(updateAuthUI);
    }
});

// Utility functions
function showNotification(message, type = 'success') {
    const existingNotification = document.querySelector('.notification-toast');
    if (existingNotification) existingNotification.remove();
    const notification = document.createElement('div');
    notification.className = `notification-toast fixed top-6 right-6 px-6 py-4 rounded-xl shadow-xl z-50 max-w-sm ${
        type === 'success' ? 'bg-green-500' :
        type === 'error' ? 'bg-red-500' :
        type === 'warning' ? 'bg-yellow-500' :
        'bg-blue-500'
    } text-white`;
    notification.innerHTML = `
        <div class="flex items-start">
            <div>${message}</div>
            <button id="notification-close" class="ml-4">×</button>
        </div>`;
    document.body.appendChild(notification);

    notification.querySelector('#notification-close').addEventListener('click', () => notification.remove());
    setTimeout(() => notification.remove(), 5000);
}

function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
}

function formatNumber(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function timeAgo(dateString) {
    const seconds = Math.floor((new Date() - new Date(dateString)) / 1000);
    const units = [
        [31536000, "years"], [2592000, "months"], [86400, "days"],
        [3600, "hours"], [60, "minutes"]
    ];
    for (const [sec, name] of units) {
        const val = Math.floor(seconds / sec);
        if (val > 1) return val + " " + name + " ago";
    }
    return Math.floor(seconds) + " seconds ago";
}

function debounce(func, wait) {
    let timeout;
    return (...args) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => func(...args), wait);
    };
}

window.utils = { showNotification, formatDate, formatNumber, timeAgo, debounce };
// Fix logo path depending on folder depth
const logoLink = document.getElementById("logoLink");
const logoImg = document.getElementById("siteLogo");

if (window.location.pathname.includes("/auth/")) {
    // inside /auth/
    logoLink.href = "../index.html";
    logoImg.src = "../logo.png";
} else {
    // root pages
    logoLink.href = "./index.html";
    logoImg.src = "./logo.png";
}

// Authentication JavaScript for login and registration pages

// Add a function to log activities to Firebase
function logActivity(activityData) {
    try {
        const { ref, push, set } = firebaseServices;
        const activityRef = push(ref('activities'));
        const activity = {
            ...activityData,
            timestamp: new Date().toISOString()
        };
        activityRef.set(activity);
    } catch (error) {
        console.error('Error logging activity:', error);
    }
}

document.addEventListener('DOMContentLoaded', function() {
    // Login form
    const loginForm = document.getElementById('login-form');
    // Register form
    const registerForm = document.getElementById('register-form');
    // Logout button
    const logoutBtn = document.getElementById('logout-btn');

    // Handle login form submission
    if (loginForm) {
        loginForm.addEventListener('submit', function(e) {
            e.preventDefault();

            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;

            // Show loading state
            const submitBtn = loginForm.querySelector('button[type="submit"]');
            const originalText = submitBtn.textContent;
            submitBtn.innerHTML = '<svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> Signing in...';
            submitBtn.disabled = true;

            // Add timeout to prevent hanging
            const loginTimeout = setTimeout(() => {
                utils.showNotification('Login is taking longer than expected. Please try again.', 'warning');
                submitBtn.textContent = originalText;
                submitBtn.disabled = false;
            }, 10000); // 10 second timeout

            // Directly attempt to sign in with email and password
            // This approach is more reliable than checking email existence first
            firebaseServices.signInWithEmailAndPassword(email, password)
                .then((userCredential) => {
                    // Clear timeout since login succeeded
                    clearTimeout(loginTimeout);
                    
                    // Signed in
                    const user = userCredential.user;
                    console.log('User signed in:', user);

                    // Update last login time
                    const userData = {
                        lastLoginAt: new Date().toISOString()
                    };

                    const { ref, update } = firebaseServices;
                    return update(ref('users/' + user.uid), userData);
                })
                .then(() => {
                    // Redirect to student dashboard
                    window.location.href = '../dashboard.html';
                })
                .catch((error) => {
                    // Clear timeout since we got an error
                    clearTimeout(loginTimeout);
                    
                    // Handle errors
                    const errorCode = error.code;
                    const errorMessage = error.message;
                    console.error('Login error:', errorCode, errorMessage);

                    // Show appropriate error message based on error code
                    let message = 'Login failed. Please try again.';
                    if (errorCode === 'auth/wrong-password') {
                        message = 'Incorrect password. Please try again.';
                    } else if (errorCode === 'auth/user-not-found') {
                        message = 'No account found with this email. Please check your email or register for a new account.';
                    } else if (errorCode === 'auth/too-many-requests') {
                        message = 'Too many failed login attempts. Please try again later.';
                    } else if (errorCode === 'auth/invalid-email') {
                        message = 'Invalid email address. Please check your email and try again.';
                    } else if (errorCode === 'auth/user-disabled') {
                        message = 'This account has been disabled. Please contact support.';
                    }

                    utils.showNotification(message, 'error');

                    // Reset button
                    submitBtn.textContent = originalText;
                    submitBtn.disabled = false;
                });
        });
    }

    // Handle register form submission
    if (registerForm) {
        registerForm.addEventListener('submit', function(e) {
            e.preventDefault();

            const name = document.getElementById('name').value;
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            const confirmPassword = document.getElementById('confirm-password').value;
            const terms = document.getElementById('terms').checked;

            // Validate passwords match
            if (password !== confirmPassword) {
                utils.showNotification('Passwords do not match', 'error');
                return;
            }

            // Validate terms acceptance
            if (!terms) {
                utils.showNotification('Please accept the Terms of Service and Privacy Policy', 'error');
                return;
            }

            // Show loading state
            const submitBtn = registerForm.querySelector('button[type="submit"]');
            const originalText = submitBtn.textContent;
            submitBtn.innerHTML = '<svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> Creating account...';
            submitBtn.disabled = true;

            // Check if email already exists before creating account
            firebaseServices.auth.fetchSignInMethodsForEmail(email)
                .then((signInMethods) => {
                    if (signInMethods.length > 0) {
                        // Email already exists
                        utils.showNotification('An account with this email already exists. Please use a different email or login instead.', 'error');

                        // Reset button
                        submitBtn.textContent = originalText;
                        submitBtn.disabled = false;
                    } else {
                        // Email doesn't exist, proceed with registration
                        return firebaseServices.createUserWithEmailAndPassword(email, password)
                            .then((userCredential) => {
                                // Signed up
                                const user = userCredential.user;
                                console.log('User created:', user);

                                // Update user profile with display name
                                return user.updateProfile({
                                    displayName: name
                                });
                            })
                            .then(() => {
                                console.log('User profile updated');
                                // Reload the user to ensure we have the latest data
                                const { auth } = firebaseServices;
                                return auth.currentUser.reload();
                            })
                            .then(() => {
                                // Get the updated current user
                                const { auth } = firebaseServices;
                                const currentUser = auth.currentUser;

                                // Save user data to Realtime Database
                                const userData = {
                                    uid: currentUser.uid,
                                    email: currentUser.email,
                                    displayName: currentUser.displayName || name,
                                    role: 'student',
                                    createdAt: new Date().toISOString(),
                                    lastLoginAt: new Date().toISOString()
                                };

                                console.log('Saving user data to database:', userData);
                                return firebaseServices.createUserInDatabase(userData);
                            })
                            .then(() => {
                                console.log('User data saved successfully');

                                // Log activity for new user signup
                                const { auth } = firebaseServices;
                                const currentUser = auth.currentUser;
                                logActivity({
                                    type: 'user_signup',
                                    userId: currentUser.uid,
                                    userName: currentUser.displayName || name,
                                    userEmail: currentUser.email
                                });

                                // Show success message
                                utils.showNotification('Account created successfully!', 'success');

                                // Redirect to dashboard after a short delay
                                setTimeout(() => {
                                    window.location.href = '../dashboard.html';
                                }, 3000);
                            });
                    }
                })
                .catch((error) => {
                    // Handle errors
                    const errorCode = error.code;
                    const errorMessage = error.message;
                    console.error('Registration error:', errorCode, errorMessage);

                    // Show error message
                    utils.showNotification('Registration failed: ' + errorMessage, 'error');

                    // Reset button
                    submitBtn.textContent = originalText;
                    submitBtn.disabled = false;
                });
        });
    }

    // Handle logout
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function() {
            firebaseServices.signOut()
                .then(() => {
                    // Sign-out successful
                    console.log('User signed out');
                    // Force a full page reload to ensure clean state
                    window.location.href = '../index.html';
                })
                .catch((error) => {
                    // Handle errors
                    console.error('Logout error:', error);
                    utils.showNotification('Logout failed: ' + error.message, 'error');
                    // Even if logout fails, redirect to homepage
                    window.location.href = '../index.html';
                });
        });
    }

    // Check auth state and update UI
    firebaseServices.onAuthStateChanged((user) => {
        if (user) {
            // User is signed in
            console.log('User is signed in:', user);

            // Update user name in header if element exists
            const userNameElement = document.getElementById('user-name');
            if (userNameElement) {
                userNameElement.textContent = `Welcome, ${user.displayName || user.email}`;
            }

            // Hide/show auth buttons based on auth state
            const userActionsDesktop = document.getElementById('user-actions-desktop');
            const userActionsMobile = document.getElementById('user-actions-mobile');

            if (userActionsDesktop) {
                userActionsDesktop.innerHTML = `
                    <span class="text-gray-700 dark:text-gray-300 font-medium">Welcome, ${user.displayName || user.email}</span>
                    <button id="logout-btn" class="px-4 py-2 rounded-md bg-[#5624d0] hover:bg-[#451db0] text-white font-medium transition duration-300">
                        Logout
                    </button>
                `;

                // Add event listener to new logout button
                document.getElementById('logout-btn').addEventListener('click', function() {
                    firebaseServices.signOut()
                        .then(() => {
                            // Force a full page reload to ensure clean state
                            window.location.href = '../index.html';
                        })
                        .catch((error) => {
                            console.error('Logout error:', error);
                            utils.showNotification('Logout failed: ' + error.message, 'error');
                            // Even if logout fails, redirect to homepage
                            window.location.href = '../index.html';
                        });
                });
            }

            if (userActionsMobile) {
                userActionsMobile.innerHTML = `
                    <div class="px-3 py-2 text-gray-700 dark:text-gray-300 font-medium">
                        Welcome, ${user.displayName || user.email}
                    </div>
                    <button id="mobile-logout-btn" class="block w-full text-center px-4 py-2 rounded-md bg-[#5624d0] hover:bg-[#451db0] text-white font-medium transition duration-300">
                        Logout
                    </button>
                `;

                // Add event listener to new mobile logout button
                document.getElementById('mobile-logout-btn').addEventListener('click', function() {
                    firebaseServices.signOut()
                        .then(() => {
                            // Force a full page reload to ensure clean state
                            window.location.href = '../index.html';
                        })
                        .catch((error) => {
                            console.error('Logout error:', error);
                            utils.showNotification('Logout failed: ' + error.message, 'error');
                            // Even if logout fails, redirect to homepage
                            window.location.href = '../index.html';
                        });
                });
            }
        } else {
            // User is signed out
            console.log('User is signed out');

            // Redirect to login page if on a protected page
            const protectedPages = ['/dashboard.html', '/student-courses.html'];
            if (protectedPages.includes(window.location.pathname)) {
                window.location.href = '../auth/login.html';
            }
        }
    });
});

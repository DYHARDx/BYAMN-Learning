// Newsletter Subscription Handler
// This module handles newsletter subscriptions using Firebase Realtime Database

document.addEventListener('DOMContentLoaded', function() {
    const newsletterForm = document.getElementById('newsletter-form');
    const emailInput = document.getElementById('newsletter-email');
    const submitButton = document.getElementById('newsletter-submit');
    const messageDiv = document.getElementById('newsletter-message');

    if (!newsletterForm || !emailInput || !submitButton || !messageDiv) {
        console.error('Newsletter form elements not found');
        return;
    }

    // Email validation regex
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    // Show message to user
    function showMessage(message, isError = false) {
        messageDiv.textContent = message;
        messageDiv.className = `text-sm min-h-6 ${isError ? 'text-red-400' : 'text-green-400'}`;
        
        // Clear message after 5 seconds
        setTimeout(() => {
            messageDiv.textContent = '';
            messageDiv.className = 'text-sm min-h-6';
        }, 5000);
    }

    // Disable/enable form
    function setFormState(disabled) {
        emailInput.disabled = disabled;
        submitButton.disabled = disabled;
        submitButton.textContent = disabled ? 'Subscribing...' : 'Subscribe';
    }

    // Check if email already exists
    async function checkExistingSubscription(email) {
        try {
            if (!window.firebaseServices || !window.firebaseServices.rtdb) {
                throw new Error('Firebase services not initialized');
            }

            const { ref, get, query, orderByChild, equalTo } = window.firebaseServices;
            const rtdb = window.firebaseServices.rtdb;

            // Query for existing subscription
            const subscribersRef = ref(rtdb, 'newsletter_subscribers');
            const existingQuery = query(subscribersRef, orderByChild('email'), equalTo(email));
            const snapshot = await get(existingQuery);

            return snapshot.exists();
        } catch (error) {
            console.error('Error checking existing subscription:', error);
            throw error;
        }
    }

    // Subscribe user to newsletter
    async function subscribeToNewsletter(email) {
        try {
            if (!window.firebaseServices || !window.firebaseServices.rtdb) {
                throw new Error('Firebase services not initialized. Please refresh the page.');
            }

            const { ref, set, push } = window.firebaseServices;
            const rtdb = window.firebaseServices.rtdb;

            // Check if already subscribed
            const alreadySubscribed = await checkExistingSubscription(email);
            if (alreadySubscribed) {
                showMessage('You are already subscribed to our newsletter!', true);
                return false;
            }

            // Create subscription data
            const subscriptionData = {
                email: email,
                subscribedAt: new Date().toISOString(),
                status: 'active',
                source: 'website_footer',
                userAgent: navigator.userAgent,
                ipAddress: 'client-side' // Will be set by backend if needed
            };

            // Add to database
            const subscribersRef = ref(rtdb, 'newsletter_subscribers');
            const newSubscriberRef = push(subscribersRef);
            await set(newSubscriberRef, subscriptionData);

            // Log subscription event
            if (window.firebaseServices.analytics) {
                try {
                    const { logEvent } = await import('firebase/analytics');
                    logEvent(window.firebaseServices.analytics, 'newsletter_subscription', {
                        email: email,
                        timestamp: new Date().toISOString()
                    });
                } catch (analyticsError) {
                    console.log('Analytics not available:', analyticsError);
                }
            }

            return true;
        } catch (error) {
            console.error('Error subscribing to newsletter:', error);
            throw error;
        }
    }

    // Handle form submission
    newsletterForm.addEventListener('submit', async function(e) {
        e.preventDefault();

        const email = emailInput.value.trim();

        // Validate email
        if (!email) {
            showMessage('Please enter your email address', true);
            emailInput.focus();
            return;
        }

        if (!emailRegex.test(email)) {
            showMessage('Please enter a valid email address', true);
            emailInput.focus();
            return;
        }

        // Disable form during submission
        setFormState(true);

        try {
            // Wait for Firebase to be ready
            let retries = 0;
            const maxRetries = 10;
            while (!window.firebaseServices && retries < maxRetries) {
                await new Promise(resolve => setTimeout(resolve, 500));
                retries++;
            }

            if (!window.firebaseServices) {
                throw new Error('Firebase failed to initialize. Please refresh the page and try again.');
            }

            // Subscribe to newsletter
            const success = await subscribeToNewsletter(email);

            if (success) {
                showMessage('Successfully subscribed! Check your inbox for confirmation.');
                emailInput.value = '';
                
                // Optional: Send welcome email via Firebase Functions
                // This would require setting up Firebase Functions
                // await sendWelcomeEmail(email);
            }
        } catch (error) {
            console.error('Subscription error:', error);
            
            // User-friendly error messages
            let errorMessage = 'An error occurred. Please try again later.';
            
            if (error.message.includes('Firebase')) {
                errorMessage = 'Connection error. Please check your internet and try again.';
            } else if (error.message.includes('permission')) {
                errorMessage = 'Permission denied. Please contact support.';
            }
            
            showMessage(errorMessage, true);
        } finally {
            // Re-enable form
            setFormState(false);
        }
    });

    // Optional: Real-time validation
    emailInput.addEventListener('blur', function() {
        const email = emailInput.value.trim();
        if (email && !emailRegex.test(email)) {
            emailInput.classList.add('border-red-500');
            showMessage('Please enter a valid email address', true);
        } else {
            emailInput.classList.remove('border-red-500');
        }
    });

    emailInput.addEventListener('input', function() {
        emailInput.classList.remove('border-red-500');
        if (messageDiv.textContent.includes('valid email')) {
            messageDiv.textContent = '';
        }
    });

    console.log('Newsletter subscription handler initialized');
});
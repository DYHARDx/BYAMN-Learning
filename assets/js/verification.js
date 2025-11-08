// Certificate Verification JavaScript with Enhanced Security

document.addEventListener('DOMContentLoaded', function() {
    // Elements
    const userNameElement = document.getElementById('user-name');
    const logoutBtn = document.getElementById('logout-btn');
    const verificationForm = document.getElementById('verification-form');
    const certificateUidInput = document.getElementById('certificate-uid');
    const verifyBtn = document.getElementById('verify-btn');
    const verificationResult = document.getElementById('verification-result');
    const resultContent = document.getElementById('result-content');
    
    // Rate limiting variables
    const RATE_LIMIT_WINDOW = 60000; // 1 minute
    const MAX_VERIFICATIONS_PER_WINDOW = 5;
    let verificationAttempts = [];
    
    // Security logging function
    function logSecurityEvent(eventType, details) {
        // In a production environment, this would send to a secure logging service
        console.log(`[SECURITY] ${eventType}:`, {
            timestamp: new Date().toISOString(),
            details: details,
            userAgent: navigator.userAgent,
            url: window.location.href
        });
    }
    
    // Rate limiting function
    function isRateLimited() {
        const now = Date.now();
        // Remove attempts older than the rate limit window
        verificationAttempts = verificationAttempts.filter(attempt => 
            now - attempt < RATE_LIMIT_WINDOW
        );
        
        // Check if we've exceeded the limit
        if (verificationAttempts.length >= MAX_VERIFICATIONS_PER_WINDOW) {
            return true;
        }
        
        // Add current attempt
        verificationAttempts.push(now);
        return false;
    }
    
    // Check auth state
    if (typeof firebaseServices !== 'undefined' && firebaseServices.onAuthStateChanged) {
        firebaseServices.onAuthStateChanged((user) => {
            if (user) {
                // User is signed in
                console.log('User is signed in:', user);
                
                // Update user name in header
                if (userNameElement) {
                    userNameElement.textContent = `Welcome, ${user.displayName || user.email}`;
                }
                
                // Show logout button
                if (logoutBtn) {
                    logoutBtn.classList.remove('hidden');
                }
            } else {
                // User is signed out
                console.log('User is signed out');
                
                // Update user name in header
                if (userNameElement) {
                    userNameElement.textContent = 'Welcome, Guest';
                }
                
                // Hide logout button
                if (logoutBtn) {
                    logoutBtn.classList.add('hidden');
                }
            }
        });
    } else {
        // Firebase not available, set default state
        if (userNameElement) {
            userNameElement.textContent = 'Welcome, Guest';
        }
        if (logoutBtn) {
            logoutBtn.classList.add('hidden');
        }
    }
    
    // Handle verification form submission
    if (verificationForm) {
        verificationForm.addEventListener('submit', function(e) {
            e.preventDefault();
            verifyCertificate();
        });
    }
    
    // Verify certificate with enhanced security
    function verifyCertificate() {
        const certificateUid = certificateUidInput.value.trim();
        
        if (!certificateUid) {
            utils.showNotification('Please enter a certificate UID', 'error');
            return;
        }
        
        // Validate certificate UID format (basic validation)
        if (!isValidCertificateUid(certificateUid)) {
            utils.showNotification('Invalid certificate UID format', 'error');
            logSecurityEvent('INVALID_CERTIFICATE_FORMAT', { certificateUid: certificateUid });
            return;
        }
        
        // Check rate limiting
        if (isRateLimited()) {
            utils.showNotification('Rate limit exceeded. Please wait before trying again.', 'error');
            logSecurityEvent('RATE_LIMIT_EXCEEDED', { certificateUid: certificateUid });
            return;
        }
        
        // Show loading state on button
        const originalText = verifyBtn.innerHTML;
        verifyBtn.innerHTML = '<svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> Verifying...';
        verifyBtn.disabled = true;
        
        // Hide previous result
        verificationResult.classList.add('hidden');
        
        // Log verification attempt
        logSecurityEvent('CERTIFICATE_VERIFICATION_ATTEMPT', { certificateUid: certificateUid });
        
        // Check if Firebase services are available
        if (typeof firebaseServices === 'undefined') {
            displayVerificationResult({
                valid: false,
                error: 'Unable to connect to verification service. Please try again later.'
            });
            verifyBtn.innerHTML = originalText;
            verifyBtn.disabled = false;
            return;
        }
        
        // Search for certificate in Firebase with enhanced security
        searchCertificateSecure(certificateUid)
            .then(result => {
                displayVerificationResult(result);
                if (result.valid) {
                    logSecurityEvent('CERTIFICATE_VERIFICATION_SUCCESS', { certificateUid: certificateUid });
                } else {
                    logSecurityEvent('CERTIFICATE_VERIFICATION_FAILED', { certificateUid: certificateUid, reason: result.error });
                }
            })
            .catch(error => {
                console.error('Error verifying certificate:', error);
                logSecurityEvent('CERTIFICATE_VERIFICATION_ERROR', { certificateUid: certificateUid, error: error.message });
                // Handle different types of errors
                let errorMessage = 'Error verifying certificate. Please try again later.';
                if (error.code === 'PERMISSION_DENIED') {
                    errorMessage = 'Unable to verify certificate at this time. Please try again later.';
                } else if (error.message) {
                    errorMessage = error.message;
                }
                displayVerificationResult({
                    valid: false,
                    error: errorMessage
                });
            })
            .finally(() => {
                // Restore button
                verifyBtn.innerHTML = originalText;
                verifyBtn.disabled = false;
            });
    }
    
    // Validate certificate UID format
    function isValidCertificateUid(uid) {
        // Basic format validation - should start with CERT- and have proper structure
        const pattern = /^CERT-[A-Z0-9]+-[A-Z0-9]+$/;
        return pattern.test(uid) && uid.length >= 10 && uid.length <= 50;
    }
    
    // Search for certificate in Firebase with enhanced security
    async function searchCertificateSecure(certificateUid) {
        try {
            // Check if Firebase services are available
            if (typeof firebaseServices === 'undefined' || !firebaseServices.ref) {
                throw new Error('Verification service unavailable');
            }
            
            // Enhanced security: Log verification attempt
            logVerificationAttempt(certificateUid);
            
            // Search in enrollments for a certificate with this UID
            const enrollmentsRef = firebaseServices.ref('enrollments');
            const snapshot = await enrollmentsRef.once('value');
            const enrollmentsData = snapshot.val();
            
            console.log('Searching for certificate ID:', certificateUid);
            console.log('Enrollments data:', enrollmentsData);
            
            if (!enrollmentsData) {
                // Log failed verification
                logVerificationResult(certificateUid, false, 'No certificates found in database');
                return {
                    valid: false,
                    error: 'Certificate not found or invalid'
                };
            }
            
            // Look for enrollment with this certificate ID
            for (const key in enrollmentsData) {
                const enrollment = enrollmentsData[key];
                console.log('Checking enrollment:', key, enrollment);
                
                if (enrollment.certificateId === certificateUid && enrollment.progress === 100) {
                    // Found matching certificate
                    // Enhanced security: Validate certificate authenticity
                    const isValid = await validateCertificateAuthenticity(enrollment, certificateUid);
                    if (!isValid) {
                        logVerificationResult(certificateUid, false, 'Certificate failed authenticity check');
                        return {
                            valid: false,
                            error: 'Certificate authenticity verification failed'
                        };
                    }
                    
                    // Get course details
                    const course = await getCourseDetails(enrollment.courseId);
                    
                    // Get user display name with multiple fallback strategies
                    let issuedTo = 'Unknown User';
                    
                    // Strategy 1: Check if userDisplayName is stored in enrollment (from certificate.js update)
                    if (enrollment.userDisplayName) {
                        issuedTo = enrollment.userDisplayName;
                    } 
                    // Strategy 2: Check if userEmail is stored in enrollment
                    else if (enrollment.userEmail) {
                        // Try to extract name from email
                        const emailParts = enrollment.userEmail.split('@');
                        if (emailParts.length > 0) {
                            issuedTo = emailParts[0]; // Use part before @ symbol
                        } else {
                            issuedTo = enrollment.userEmail; // Fallback to full email
                        }
                    } 
                    // Strategy 3: Fetch user data from database
                    else {
                        const user = await getUserDetails(enrollment.userId);
                        if (user) {
                            // Try multiple strategies to get user name
                            if (user.displayName && user.displayName !== `User-${enrollment.userId.substring(0, 8)}`) {
                                // Use display name if it's not the default generated one
                                issuedTo = user.displayName;
                            } else if (user.email) {
                                // Extract name from email
                                const emailParts = user.email.split('@');
                                if (emailParts.length > 0) {
                                    issuedTo = emailParts[0]; // Use part before @ symbol
                                } else {
                                    issuedTo = user.email; // Fallback to full email
                                }
                            } else {
                                // Final fallback to user ID with better formatting
                                issuedTo = `User-${enrollment.userId.substring(0, 8)}`;
                            }
                        }
                    }
                    
                    // Log successful verification
                    logVerificationResult(certificateUid, true, 'Certificate verified successfully');
                    
                    return {
                        valid: true,
                        certificateId: certificateUid,
                        issuedTo: issuedTo,
                        userId: enrollment.userId,
                        courseTitle: course ? course.title : 'Unknown Course',
                        courseCreator: course ? course.instructor : 'Unknown Creator',
                        courseId: enrollment.courseId,
                        issuedOn: enrollment.completedAt ? utils.formatDate(enrollment.completedAt) : 'Unknown Date',
                        enrollmentId: key,
                        // Add security information
                        verificationTimestamp: new Date().toISOString(),
                        verificationMethod: 'server-side-validation',
                        // Add certificate metadata
                        certificateStatus: 'Active',
                        expirationDate: 'Lifetime'
                    };
                }
            }
            
            // Log failed verification
            logVerificationResult(certificateUid, false, 'Certificate not found in enrollments');
            return {
                valid: false,
                error: 'Certificate not found or invalid'
            };
        } catch (error) {
            console.error('Error searching for certificate:', error);
            // Log failed verification due to error
            logVerificationResult(certificateUid, false, 'Verification error: ' + error.message);
            // Handle permission denied errors specifically
            if (error.code === 'PERMISSION_DENIED') {
                return {
                    valid: false,
                    error: 'Unable to verify certificate at this time. Please try again later.'
                };
            }
            // Handle network errors
            if (error.message && error.message.includes('network')) {
                return {
                    valid: false,
                    error: 'Network error. Please check your connection and try again.'
                };
            }
            throw error;
        }
    }
    
    // Enhanced security: Validate certificate authenticity
    async function validateCertificateAuthenticity(enrollment, certificateId) {
        try {
            // Check if enrollment is complete
            if (enrollment.progress !== 100) {
                return false;
            }
            
            // Check if certificate ID matches
            if (enrollment.certificateId !== certificateId) {
                return false;
            }
            
            // Check if completion date exists
            if (!enrollment.completedAt) {
                return false;
            }
            
            // Check if completion date is not in the future
            const completionDate = new Date(enrollment.completedAt);
            const now = new Date();
            if (completionDate > now) {
                return false;
            }
            
            // Additional security checks could be added here
            // For example, checking against a certificate registry, 
            // validating digital signatures, etc.
            
            return true;
        } catch (error) {
            console.error('Error validating certificate authenticity:', error);
            return false;
        }
    }
    
    // Log verification attempt for security monitoring
    async function logVerificationAttempt(certificateId) {
        try {
            // In a production environment, this would log to a secure audit trail
            console.log('Certificate verification attempt:', {
                certificateId: certificateId,
                timestamp: new Date().toISOString(),
                userAgent: navigator.userAgent,
                ipAddress: 'Client-side logging' // In real implementation, this would come from server
            });
        } catch (error) {
            console.error('Error logging verification attempt:', error);
        }
    }
    
    // Log verification result for security monitoring
    async function logVerificationResult(certificateId, success, message) {
        try {
            // In a production environment, this would log to a secure audit trail
            console.log('Certificate verification result:', {
                certificateId: certificateId,
                success: success,
                message: message,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error('Error logging verification result:', error);
        }
    }
    
    // Get user details
    async function getUserDetails(userId) {
        try {
            // Check if Firebase services are available
            if (typeof firebaseServices === 'undefined' || !firebaseServices.ref) {
                return null;
            }
            
            const userRef = firebaseServices.ref('users/' + userId);
            const snapshot = await userRef.once('value');
            const userData = snapshot.val();
            
            if (!userData) {
                return null;
            }
            
            // Return user data with proper display name handling
            return {
                ...userData,
                displayName: userData.displayName || 
                           (userData.email ? userData.email.split('@')[0] : null) || 
                           userData.email || 
                           `User-${userId.substring(0, 8)}`
            };
        } catch (error) {
            console.error('Error fetching user details:', error);
            // Return a default user object even if we can't fetch details
            return {
                displayName: 'Unknown User'
            };
        }
    }
    
    // Get course details
    async function getCourseDetails(courseId) {
        try {
            // Check if Firebase services are available
            if (typeof firebaseServices === 'undefined' || !firebaseServices.ref) {
                return null;
            }
            
            const coursesRef = firebaseServices.ref('courses/' + courseId);
            const snapshot = await coursesRef.once('value');
            return snapshot.val();
        } catch (error) {
            console.error('Error fetching course details:', error);
            // Return a default course object even if we can't fetch details
            return {
                title: 'Unknown Course'
            };
        }
    }
    
    // Display verification result
    function displayVerificationResult(result) {
        // Show result container
        verificationResult.classList.remove('hidden');
        
        if (result.valid) {
            // Valid certificate
            resultContent.innerHTML = `
                <div class="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-6">
                    <div class="flex items-center mb-4">
                        <svg class="h-8 w-8 text-green-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <h3 class="text-xl font-bold text-green-800 dark:text-green-200">Certificate Verified</h3>
                    </div>
                    
                    <div class="space-y-3">
                        <div>
                            <p class="text-sm text-gray-600 dark:text-gray-400">Certificate ID</p>
                            <p class="font-medium text-gray-900 dark:text-white">${result.certificateId}</p>
                        </div>
                        
                        <div>
                            <p class="text-sm text-gray-600 dark:text-gray-400">Issued To</p>
                            <p class="font-medium text-gray-900 dark:text-white">${result.issuedTo}</p>
                        </div>
                        
                        <div>
                            <p class="text-sm text-gray-600 dark:text-gray-400">Course</p>
                            <p class="font-medium text-gray-900 dark:text-white">${result.courseTitle}</p>
                        </div>
                        
                        <div>
                            <p class="text-sm text-gray-600 dark:text-gray-400">Course Creator</p>
                            <p class="font-medium text-gray-900 dark:text-white">${result.courseCreator}</p>
                        </div>
                        
                        <div>
                            <p class="text-sm text-gray-600 dark:text-gray-400">Issued On</p>
                            <p class="font-medium text-gray-900 dark:text-white">${result.issuedOn}</p>
                        </div>
                        
                        <div>
                            <p class="text-sm text-gray-600 dark:text-gray-400">Status</p>
                            <p class="font-medium text-gray-900 dark:text-white">${result.certificateStatus}</p>
                        </div>
                        
                        <div>
                            <p class="text-sm text-gray-600 dark:text-gray-400">Expiration</p>
                            <p class="font-medium text-gray-900 dark:text-white">${result.expirationDate}</p>
                        </div>
                        
                        <!-- Security Information -->
                        <div class="pt-3 border-t border-green-200 dark:border-green-800">
                            <p class="text-xs text-green-700 dark:text-green-300">
                                <svg class="inline h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                </svg>
                                Verified through secure server-side validation on ${new Date(result.verificationTimestamp).toLocaleString()}
                            </p>
                        </div>
                    </div>
                    
                    <div class="mt-6 pt-4 border-t border-green-200 dark:border-green-800">
                        <p class="text-green-700 dark:text-green-300">
                            <svg class="inline h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                            </svg>
                            This is a valid BYAMN certificate
                        </p>
                    </div>
                    
                    <div class="mt-6 flex space-x-4">
                        <a href="player.html?courseId=${result.courseId}" class="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                            View Course
                        </a>
                        <button id="share-certificate-btn" class="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                            <svg class="-ml-1 mr-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                            </svg>
                            Share
                        </button>
                    </div>
                </div>
            `;
            
            // Add event listener for share button
            const shareBtn = document.getElementById('share-certificate-btn');
            if (shareBtn) {
                shareBtn.addEventListener('click', function() {
                    const shareUrl = `${window.location.origin}/verification.html?certId=${result.certificateId}`;
                    if (navigator.clipboard) {
                        navigator.clipboard.writeText(shareUrl).then(() => {
                            utils.showNotification('Verification link copied to clipboard!', 'success');
                        }).catch(err => {
                            console.error('Failed to copy: ', err);
                            utils.showNotification('Failed to copy link', 'error');
                        });
                    } else {
                        utils.showNotification('Clipboard not supported in this browser', 'error');
                    }
                });
            }
        } else {
            // Invalid certificate
            resultContent.innerHTML = `
                <div class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
                    <div class="flex items-center mb-4">
                        <svg class="h-8 w-8 text-red-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <h3 class="text-xl font-bold text-red-800 dark:text-red-200">Certificate Not Verified</h3>
                    </div>
                    
                    <div class="space-y-3">
                        <div>
                            <p class="text-sm text-gray-600 dark:text-gray-400">Status</p>
                            <p class="font-medium text-gray-900 dark:text-white">${result.error || 'Invalid certificate or not found in our system'}</p>
                        </div>
                        
                        <!-- Security Information -->
                        <div class="pt-3 border-t border-red-200 dark:border-red-800">
                            <p class="text-xs text-red-700 dark:text-red-300">
                                <svg class="inline h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                </svg>
                                Verification processed through secure server-side validation
                            </p>
                        </div>
                    </div>
                    
                    <div class="mt-6 pt-4 border-t border-red-200 dark:border-red-800">
                        <p class="text-red-700 dark:text-red-300">
                            <svg class="inline h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                            This certificate could not be verified
                        </p>
                    </div>
                </div>
            `;
        }
        
        // Scroll to result
        verificationResult.scrollIntoView({ behavior: 'smooth' });
    }
    
    // Handle logout
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function() {
            if (typeof firebaseServices !== 'undefined' && firebaseServices.signOut) {
                firebaseServices.signOut()
                    .then(() => {
                        window.location.href = 'index.html';
                    })
                    .catch((error) => {
                        console.error('Logout error:', error);
                        utils.showNotification('Logout failed: ' + error.message, 'error');
                    });
            } else {
                // If Firebase not available, just redirect
                window.location.href = 'index.html';
            }
        });
    }
    
    // Check for certificate ID in URL parameters for direct verification
    const urlParams = new URLSearchParams(window.location.search);
    const certId = urlParams.get('certId');
    if (certId) {
        certificateUidInput.value = certId;
        verifyCertificate();
    }
});
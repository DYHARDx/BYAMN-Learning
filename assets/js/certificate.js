// Certificate JavaScript

document.addEventListener('DOMContentLoaded', function() {
    // Elements
    const userNameElement = document.getElementById('user-name');
    const downloadBtn = document.getElementById('download-btn');
    const shareBtn = document.getElementById('share-certificate-btn');
    const verifyLink = document.getElementById('verify-link');
    const logoutBtn = document.getElementById('logout-btn');
    
    // New certificate elements
    const studentNameCertificate = document.getElementById('student-name-certificate');
    const courseTitleCertificate = document.getElementById('course-title-certificate');
    const completionDateDisplay = document.getElementById('completion-date-display');
    const certificateUid = document.getElementById('certificate-uid');
    const issuedDate = document.getElementById('issued-date');
    const instructorName = document.getElementById('instructor-name');
    
    // Custom certificate name modal elements
    let certificateModal = null;
    let certificateNameInput = null;
    let certificateSaveBtn = null;
    let certificateSkipBtn = null;
    
    // Get course ID from URL parameter
    const urlParams = new URLSearchParams(window.location.search);
    const courseId = urlParams.get('courseId');
    
    // Check auth state
    firebaseServices.onAuthStateChanged((user) => {
        if (user) {
            // User is signed in
            console.log('User is signed in:', user);
            
            // Update user name in header
            if (userNameElement) {
                userNameElement.textContent = `Welcome, ${user.displayName || user.email}`;
            }
            
            // Load certificate data
            loadCertificateData(user, courseId);
        } else {
            // User is signed out
            console.log('User is signed out');
            window.location.href = '../auth/login.html';
        }
    });
    
    // Load certificate data
    function loadCertificateData(user, courseId) {
        // Validate inputs
        if (!user || !courseId) {
            showError('Invalid user or course');
            return;
        }
        
        // Show loading state
        // Show user's display name if available, otherwise email
        if (studentNameCertificate) studentNameCertificate.textContent = user.displayName || user.email.split('@')[0] || user.email;
        if (courseTitleCertificate) courseTitleCertificate.textContent = 'Loading course...';
        if (completionDateDisplay) completionDateDisplay.textContent = '...';
        if (instructorName) instructorName.textContent = 'Loading...';
        
        // Fetch real data from Firebase
        Promise.all([
            firebaseServices.getCourses(),
            firebaseServices.getUserEnrollments(user.uid)
        ])
        .then(([courses, enrollments]) => {
            // Find the course
            const course = courses.find(c => c.id === courseId);
            
            // Find the enrollment for this user and course
            const enrollment = enrollments.find(e => e.courseId === courseId);
            
            if (course && enrollment && enrollment.progress === 100) {
                // Check if we need to ask for certificate name
                const hasAskedForName = localStorage.getItem(`certificateNameAsked_${enrollment.id}`);
                
                // Ensure certificate ID is generated and saved
                let certId = enrollment.certificateId;
                if (!certId) {
                    // Generate certificate ID
                    certId = 'CERT-BYAMN-' + Date.now().toString().substr(-5) + Math.floor(1000 + Math.random() * 9000);
                    
                    // Update enrollment with certificate ID
                    updateEnrollmentWithCertificateId(enrollment.id, certId, user, enrollment);
                }
                
                if (!hasAskedForName) {
                    // Show the certificate name modal
                    showCertificateNameModal(user, enrollment);
                    
                    // Mark that we've asked for the name
                    localStorage.setItem(`certificateNameAsked_${enrollment.id}`, 'true');
                } else {
                    // Update certificate information
                    // Show custom certificate name if available, otherwise use defaults
                    const displayName = enrollment.customCertificateName || user.displayName || user.email.split('@')[0] || user.email;
                    if (studentNameCertificate) studentNameCertificate.textContent = displayName;
                    if (courseTitleCertificate) courseTitleCertificate.textContent = course.title;
                    if (completionDateDisplay) completionDateDisplay.textContent = utils.formatDate(enrollment.completedAt || new Date());
                    if (instructorName) instructorName.textContent = course.instructor || 'Rajesh Kumar';
                    
                    // Update issued date
                    if (issuedDate) issuedDate.innerHTML = 'Issued On: ' + utils.formatDate(enrollment.completedAt || new Date());
                    
                    // Update certificate UID
                    if (certificateUid) certificateUid.textContent = 'UID: ' + certId;
                    
                    // Update verification link with certificate ID
                    if (verifyLink) {
                        verifyLink.href = `verification.html?certId=${certId}`;
                    }
                }
            } else {
                // Show error if course not found or not completed
                if (studentNameCertificate) studentNameCertificate.textContent = 'N/A';
                if (courseTitleCertificate) courseTitleCertificate.textContent = 'Course Not Found';
                if (completionDateDisplay) completionDateDisplay.textContent = 'N/A';
                if (instructorName) instructorName.textContent = 'N/A';
                downloadBtn.disabled = true;
                utils.showNotification('Course not found or not completed', 'error');
            }
        })
        .catch((error) => {
            console.error('Error loading certificate data:', error);
            utils.showNotification('Error loading certificate data: ' + error.message, 'error');
            
            // Show error state
            if (studentNameCertificate) studentNameCertificate.textContent = 'N/A';
            if (courseTitleCertificate) courseTitleCertificate.textContent = 'Error Loading';
            if (completionDateDisplay) completionDateDisplay.textContent = 'N/A';
            if (instructorName) instructorName.textContent = 'N/A';
            downloadBtn.disabled = true;
        });
    }
    
    // Show certificate name modal
    function showCertificateNameModal(user, enrollment) {
        // Create modal if it doesn't exist
        if (!certificateModal) {
            createCertificateNameModal();
        }
        
        // Show the modal
        if (certificateModal) certificateModal.classList.remove('hidden');
        
        // Pre-fill with current display name if available
        if (user && user.displayName && certificateNameInput) {
            certificateNameInput.value = user.displayName;
        } else if (user && user.email && certificateNameInput) {
            // Use email username as fallback
            certificateNameInput.value = user.email.split('@')[0];
        }
    }
    
    // Create certificate name modal
    function createCertificateNameModal() {
        // Create modal HTML
        const modalHTML = `
            <div id="certificate-name-modal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div class="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
                    <h3 class="text-xl font-bold text-gray-900 dark:text-white mb-4">Certificate Name</h3>
                    <p class="text-gray-600 dark:text-gray-300 mb-4">Please enter the name you want to appear on your certificate:</p>
                    
                    <input 
                        type="text" 
                        id="certificate-name-input" 
                        class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
                        placeholder="Enter your name"
                        required
                    >
                    
                    <div class="mt-6 flex justify-end space-x-3">
                        <button 
                            id="certificate-skip-btn"
                            class="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                        >
                            Skip
                        </button>
                        <button 
                            id="certificate-save-btn"
                            class="px-4 py-2 rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                        >
                            Save Name
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        // Add modal to body
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        
        // Get modal elements
        certificateModal = document.getElementById('certificate-name-modal');
        certificateNameInput = document.getElementById('certificate-name-input');
        certificateSaveBtn = document.getElementById('certificate-save-btn');
        certificateSkipBtn = document.getElementById('certificate-skip-btn');
        
        // Add event listeners
        if (certificateSaveBtn) certificateSaveBtn.addEventListener('click', saveCertificateName);
        if (certificateSkipBtn) certificateSkipBtn.addEventListener('click', closeCertificateNameModal);
        
        // Close modal when clicking outside
        if (certificateModal) {
            certificateModal.addEventListener('click', function(e) {
                if (e.target === certificateModal) {
                    closeCertificateNameModal();
                }
            });
        }
        
        // Close modal on Escape key
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape' && certificateModal && !certificateModal.classList.contains('hidden')) {
                closeCertificateNameModal();
            }
        });
    }
    
    // Save certificate name
    function saveCertificateName() {
        const name = certificateNameInput ? certificateNameInput.value.trim() : '';
        
        if (!name) {
            utils.showNotification('Please enter a name for your certificate', 'error');
            return;
        }
        
        // Get course ID from URL
        const urlParams = new URLSearchParams(window.location.search);
        const courseId = urlParams.get('courseId');
        
        if (!courseId) {
            utils.showNotification('Course ID not found', 'error');
            return;
        }
        
        // Get current user
        const user = firebaseServices.auth.currentUser;
        if (!user) {
            utils.showNotification('User not found', 'error');
            return;
        }
        
        // Fetch enrollment to update
        Promise.all([
            firebaseServices.getCourses(),
            firebaseServices.getUserEnrollments(user.uid)
        ])
        .then(([courses, enrollments]) => {
            // Find the enrollment for this user and course
            const enrollment = enrollments.find(e => e.courseId === courseId);
            
            if (!enrollment) {
                utils.showNotification('Enrollment not found', 'error');
                return;
            }
            
            // Update enrollment with custom certificate name
            const enrollmentRef = firebaseServices.ref('enrollments/' + enrollment.id);
            enrollmentRef.update({
                customCertificateName: name
            })
            .then(() => {
                utils.showNotification('Certificate name saved successfully!', 'success');
                closeCertificateNameModal();
                
                // Update certificate information
                const course = courses.find(c => c.id === courseId);
                if (course) {
                    if (studentNameCertificate) studentNameCertificate.textContent = name;
                    if (courseTitleCertificate) courseTitleCertificate.textContent = course.title;
                    if (completionDateDisplay) completionDateDisplay.textContent = utils.formatDate(enrollment.completedAt || new Date());
                    if (instructorName) instructorName.textContent = course.instructor || 'Rajesh Kumar';
                    
                    // Update issued date
                    if (issuedDate) issuedDate.innerHTML = 'Issued On: ' + utils.formatDate(enrollment.completedAt || new Date());
                    
                    // Update certificate UID
                    const certId = enrollment.certificateId || 'CERT-BYAMN-' + Date.now().toString().substr(-5) + Math.floor(1000 + Math.random() * 9000);
                    if (certificateUid) certificateUid.textContent = 'UID: ' + certId;
                    
                    // Update verification link with certificate ID
                    if (verifyLink) {
                        verifyLink.href = `verification.html?certId=${certId}`;
                    }
                }
            })
            .catch((error) => {
                console.error('Error saving certificate name:', error);
                utils.showNotification('Error saving certificate name: ' + error.message, 'error');
            });
        })
        .catch((error) => {
            console.error('Error fetching enrollment data:', error);
            utils.showNotification('Error: ' + error.message, 'error');
        });
    }
    
    // Close certificate name modal
    function closeCertificateNameModal() {
        if (certificateModal) {
            certificateModal.classList.add('hidden');
        }
    }
    
    // Update enrollment with certificate ID and user display name
    function updateEnrollmentWithCertificateId(enrollmentId, certificateId, user, enrollment) {
        // Update enrollment in Firebase with certificate ID and user display name
        const enrollmentRef = firebaseServices.ref('enrollments/' + enrollmentId);
        const updateData = {
            certificateId: certificateId,
            completedAt: new Date().toISOString(),
            // Store user display name for certificate verification
            userDisplayName: enrollment.customCertificateName || user.displayName || user.email.split('@')[0] || user.email,
            userEmail: user.email
        };
        
        console.log('Updating enrollment with data:', updateData);
        enrollmentRef.update(updateData)
            .then(() => {
                console.log('Certificate ID and user display name updated in enrollment');
                // Show a notification that the certificate is ready for verification
                utils.showNotification('Certificate is ready for verification!', 'success');
            })
            .catch((error) => {
                console.error('Error updating enrollment with certificate ID and user display name:', error);
                utils.showNotification('Error saving certificate data: ' + error.message, 'error');
            });
    }
    
    // Handle download certificate
    if (downloadBtn) {
        downloadBtn.addEventListener('click', function() {
            // Generate certificate ID if not already present
            const urlParams = new URLSearchParams(window.location.search);
            const courseId = urlParams.get('courseId');
            
            if (courseId) {
                const user = firebaseServices.auth.currentUser;
                if (user) {
                    // Fetch enrollment to ensure certificate ID is set
                    firebaseServices.getUserEnrollments(user.uid)
                        .then(enrollments => {
                            const enrollment = enrollments.find(e => e.courseId === courseId);
                            if (enrollment && enrollment.progress === 100) {
                                // Generate certificate ID if not present
                                if (!enrollment.certificateId) {
                                    const certId = 'CERT-BYAMN-' + Date.now().toString().substr(-5) + Math.floor(1000 + Math.random() * 9000);
                                    updateEnrollmentWithCertificateId(enrollment.id, certId, user, enrollment);
                                    
                                    // Update UI with certificate ID
                                    if (certificateUid) certificateUid.textContent = 'UID: ' + certId;
                                    if (verifyLink) verifyLink.href = `verification.html?certId=${certId}`;
                                }
                            }
                        })
                        .catch(error => {
                            console.error('Error fetching enrollments for certificate ID check:', error);
                        });
                }
            }
            
            downloadCertificate();
        });
    }
    
    // Handle share certificate
    if (shareBtn) {
        shareBtn.addEventListener('click', function() {
            const certId = certificateUid.textContent.replace('UID: ', '');
            const shareUrl = `${window.location.origin}/verification.html?certId=${certId}`;
            
            // Try to use Web Share API if available
            if (navigator.share) {
                navigator.share({
                    title: 'BYAMN Certificate',
                    text: 'I earned a certificate from BYAMN!',
                    url: shareUrl
                }).catch(console.error);
            } else {
                // Fallback to clipboard
                navigator.clipboard.writeText(shareUrl).then(() => {
                    utils.showNotification('Verification link copied to clipboard!', 'success');
                }).catch(err => {
                    console.error('Failed to copy: ', err);
                    utils.showNotification('Failed to copy link', 'error');
                });
            }
        });
    }
    
    // Download certificate as PDF
    function downloadCertificate() {
        // Check if required libraries are available
        if (typeof jspdf === 'undefined' || typeof jspdf.jsPDF === 'undefined') {
            utils.showNotification('PDF library not loaded', 'error');
            return;
        }
        
        if (typeof html2canvas === 'undefined') {
            utils.showNotification('Image capture library not loaded', 'error');
            return;
        }
        
        // Get the certificate element to capture
        const certificateElement = document.getElementById('certificate-to-download');
        
        if (!certificateElement) {
            utils.showNotification('Certificate element not found', 'error');
            return;
        }
        
        // Show loading state on button
        const originalText = downloadBtn.innerHTML;
        downloadBtn.innerHTML = '<svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> Generating...';
        downloadBtn.disabled = true;
        
        // Use html2canvas to capture the certificate as an image
        html2canvas(certificateElement, {
            scale: 2, // Higher scale for better quality
            useCORS: true, // Enable CORS for images
            logging: false // Disable logging
        })
        .then(canvas => {
            // Convert canvas to image data
            const imgData = canvas.toDataURL('image/png');
            
            // Create a new jsPDF instance
            const { jsPDF } = jspdf;
            const doc = new jsPDF({
                orientation: 'landscape',
                unit: 'mm',
                format: 'a4'
            });
            
            // Calculate dimensions to fit the certificate in the PDF
            const imgWidth = 280; // A4 width in mm (landscape)
            const pageHeight = 210; // A4 height in mm (landscape)
            const imgHeight = (canvas.height * imgWidth) / canvas.width;
            let heightLeft = imgHeight;
            let position = 0;
            
            // Add image to PDF
            doc.addImage(imgData, 'PNG', 5, position, imgWidth, imgHeight);
            heightLeft -= pageHeight;
            
            // Add additional pages if needed
            while (heightLeft >= 0) {
                position = heightLeft - imgHeight;
                doc.addPage();
                doc.addImage(imgData, 'PNG', 5, position, imgWidth, imgHeight);
                heightLeft -= pageHeight;
            }
            
            // Get course title for filename
            const courseTitle = courseTitleCertificate ? courseTitleCertificate.textContent : 'Course';
            
            // Save the PDF
            doc.save(`certificate-${courseTitle.replace(/\s+/g, '-')}.pdf`);
            
            // Restore button
            downloadBtn.innerHTML = originalText;
            downloadBtn.disabled = false;
            
            utils.showNotification('Certificate downloaded successfully!', 'success');
        })
        .catch(error => {
            console.error('Error generating certificate PDF:', error);
            utils.showNotification('Error generating certificate: ' + error.message, 'error');
            
            // Restore button
            downloadBtn.innerHTML = originalText;
            downloadBtn.disabled = false;
        });
    }
    
    // Handle logout
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function() {
            firebaseServices.signOut()
                .then(() => {
                    window.location.href = '../index.html';
                })
                .catch((error) => {
                    console.error('Logout error:', error);
                    utils.showNotification('Logout failed: ' + error.message, 'error');
                });
        });
    }
});
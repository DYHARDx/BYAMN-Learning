// Student Courses JavaScript

document.addEventListener('DOMContentLoaded', function() {
    // Elements
    const userNameElement = document.getElementById('user-name');
    const logoutBtn = document.getElementById('logout-btn');
    const coursesContainer = document.getElementById('courses-container');
    
    // Check auth state
    firebaseServices.onAuthStateChanged((user) => {
        if (user) {
            // User is signed in
            console.log('User is signed in:', user);
            
            // Update user name in header
            if (userNameElement) {
                userNameElement.textContent = `Welcome, ${user.displayName || user.email}`;
            }
            
            // Load enrolled courses
            loadEnrolledCourses(user);
        } else {
            // User is signed out
            console.log('User is signed out');
            window.location.href = 'auth/login.html';
        }
    });
    
    // Load enrolled courses
    function loadEnrolledCourses(user) {
        // Show loading state
        coursesContainer.innerHTML = `
            <div class="col-span-full text-center py-12">
                <svg class="animate-spin mx-auto h-12 w-12 text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <h3 class="mt-4 text-lg font-medium text-gray-900">Loading your courses...</h3>
            </div>
        `;
        
        // Fetch user enrollments, courses, and categories
        Promise.all([
            firebaseServices.getCourses(),
            firebaseServices.getUserEnrollments(user.uid),
            firebaseServices.getCategories() // Also fetch categories to map IDs to names
        ])
        .then(([courses, enrollments, categories]) => {
            // Create a map of category IDs to names
            const categoryMap = {};
            categories.forEach(category => {
                categoryMap[category.id] = category.name;
            });
            
            // Filter courses that the user is enrolled in
            const enrolledCourses = courses.filter(course => 
                enrollments.some(enrollment => enrollment.courseId === course.id)
            );
            
            // Add enrollment data to courses
            const coursesWithEnrollment = enrolledCourses.map(course => {
                const enrollment = enrollments.find(e => e.courseId === course.id);
                return {
                    ...course,
                    enrollment: enrollment
                };
            });
            
            renderCourses(coursesWithEnrollment, categoryMap);
        })
        .catch((error) => {
            console.error('Error loading courses:', error);
            coursesContainer.innerHTML = `
                <div class="col-span-full text-center py-12">
                    <svg class="mx-auto h-12 w-12 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <h3 class="mt-4 text-lg font-medium text-gray-900">Error loading courses</h3>
                    <p class="mt-2 text-gray-500">There was an error loading your courses. Please try again later.</p>
                </div>
            `;
        });
    }
    
    // Render courses
    function renderCourses(courses, categoryMap) {
        console.log('Rendering enrolled courses:', courses);
        if (courses.length === 0) {
            coursesContainer.innerHTML = `
                <div class="col-span-full text-center py-12">
                    <svg class="mx-auto h-16 w-16 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                    <h3 class="mt-4 text-lg font-medium text-gray-900">No enrolled courses yet</h3>
                    <p class="mt-2 text-gray-500">Get started by browsing our course catalog</p>
                    <div class="mt-6">
                        <a href="courses.html" class="px-4 py-2 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white font-medium transition duration-300 inline-flex items-center">
                            <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                            </svg>
                            Add Course
                        </a>
                    </div>
                </div>
            `;
            return;
        }
        
        // Generate HTML for courses
        let coursesHTML = '';
        console.log('Processing enrolled courses for display:', courses);
        courses.forEach(course => {
            console.log('Processing enrolled course:', course);
            const progress = course.enrollment.progress || 0;
            const isCompleted = progress === 100;
            
            // Map category ID to name if it's an ID, otherwise use as is
            let categoryName = course.category || 'General';
            if (categoryMap && categoryMap[course.category]) {
                categoryName = categoryMap[course.category];
            }
            
            coursesHTML += `
                <div class="bg-white rounded-xl shadow-md overflow-hidden hover-lift transition-all duration-300 course-card">
                    <div class="h-48 overflow-hidden">
                        <img class="w-full h-full object-cover" src="${course.thumbnail || 'https://images.unsplash.com/photo-1547658719-da2b51169166?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=600&q=80'}" alt="${course.title}">
                    </div>
                    <div class="p-6">
                        <div class="flex justify-between items-start">
                            <div>
                                <h3 class="text-xl font-bold text-gray-900">${course.title}</h3>
                                <p class="mt-1 text-sm text-gray-500">${categoryName} • ${course.difficulty || 'Beginner'}</p>
                            </div>
                            ${isCompleted ? `
                                <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                    Completed
                                </span>
                            ` : `
                                <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                    In Progress
                                </span>
                            `}
                        </div>
                        
                        <p class="mt-3 text-gray-600 line-clamp-2">${course.description || 'No description available'}</p>
                        
                        <div class="mt-4">
                            <div class="flex justify-between text-sm text-gray-500 mb-1">
                                <span>Progress</span>
                                <span>${progress}%</span>
                            </div>
                            <div class="w-full bg-gray-200 rounded-full h-2">
                                <div class="bg-indigo-600 h-2 rounded-full" style="width: ${progress}%"></div>
                            </div>
                        </div>
                        
                        <div class="mt-6 flex justify-between">
                            <a href="player.html?courseId=${course.id}" class="px-4 py-2 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white font-medium transition duration-300 text-center flex-1 mr-2">
                                ${isCompleted ? 'Review' : 'Continue'}
                            </a>
                            ${isCompleted ? `
                                <a href="certificate.html?courseId=${course.id}" class="px-4 py-2 rounded-md border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition duration-300 text-center flex-1 ml-2">
                                    Certificate
                                </a>
                            ` : ''}
                        </div>
                        
                        ${isCompleted && course.enrollment.certificateId ? `
                            <div class="mt-4 text-center">
                                <a href="verification.html" class="text-sm text-indigo-600 hover:underline">
                                    Verify Certificate
                                </a>
                            </div>
                        ` : ''}
                    </div>
                </div>
            `;

        });
        
        console.log('Generated enrolled courses HTML:', coursesHTML);
        coursesContainer.innerHTML = coursesHTML;
        console.log('Enrolled courses container updated with', courses.length, 'courses');
    }
    
    // Handle logout
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function() {
            firebaseServices.signOut()
                .then(() => {
                    window.location.href = 'index.html';
                })
                .catch((error) => {
                    console.error('Logout error:', error);
                    utils.showNotification('Logout failed: ' + error.message, 'error');
                });
        });
    }
});
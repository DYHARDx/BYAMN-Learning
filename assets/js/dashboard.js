// Student Dashboard JavaScript

document.addEventListener('DOMContentLoaded', function() {
    // Elements
    const userNameElement = document.getElementById('user-name');
    const enrolledCountElement = document.getElementById('enrolled-count');
    const completedCountElement = document.getElementById('completed-count');
    const inProgressCountElement = document.getElementById('in-progress-count');
    const certificatesCountElement = document.getElementById('certificates-count');
    const coursesContainer = document.getElementById('courses-container');
    const logoutBtn = document.getElementById('logout-btn');
    const progressChartContainer = document.getElementById('progress-chart-container');
    const categoryChartContainer = document.getElementById('category-chart-container');
    
    // Check auth state
    firebaseServices.onAuthStateChanged((user) => {
        if (user) {
            // User is signed in
            console.log('User is signed in:', user);
            
            // Update user name in header
            if (userNameElement) {
                userNameElement.textContent = `Welcome, ${user.displayName || user.email}`;
            }
            
            // Load user's enrollments
            loadUserEnrollments(user.uid);
        } else {
            // User is signed out
            console.log('User is signed out');
            window.location.href = '../auth/login.html';
        }
    });
    
    // Load user's enrollments
    function loadUserEnrollments(userId) {
        // Show loading state
        coursesContainer.innerHTML = '<div class="text-center py-12 col-span-full"><svg class="animate-spin mx-auto h-12 w-12 text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg><p class="mt-4 text-gray-600">Loading your courses...</p></div>';
        
        // Fetch real data from Firebase
        Promise.all([
            firebaseServices.getCourses(),
            firebaseServices.getUserEnrollments(userId),
            firebaseServices.getCategories() // Also fetch categories to map IDs to names
        ])
        .then(([courses, userEnrollments, categories]) => {
            // Create a map of category IDs to names
            const categoryMap = {};
            categories.forEach(category => {
                categoryMap[category.id] = category.name;
            });
            
            // Update stats
            updateStats(userEnrollments);
            
            // Render courses
            renderCourses(userEnrollments, courses, categoryMap);
            
            // Render charts
            renderCharts(userEnrollments, courses, categoryMap);
        })
        .catch((error) => {
            console.error('Error loading dashboard data:', error);
            utils.showNotification('Error loading dashboard data: ' + error.message, 'error');
            
            // Show error state
            coursesContainer.innerHTML = `
                <div class="text-center py-12 col-span-full">
                    <svg class="mx-auto h-16 w-16 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <h3 class="mt-4 text-lg font-medium text-gray-900">Error Loading Courses</h3>
                    <p class="mt-2 text-gray-500">There was an error loading your courses. Please try again later.</p>
                    <div class="mt-6">
                        <button onclick="location.reload()" class="px-4 py-2 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white font-medium transition duration-300">
                            Retry
                        </button>
                    </div>
                </div>
            `;
        });
    }
    
    // Update dashboard stats
    function updateStats(enrollments) {
        // Total enrolled
        enrolledCountElement.textContent = enrollments.length;
        
        // Completed courses
        const completed = enrollments.filter(e => e.progress === 100).length;
        completedCountElement.textContent = completed;
        
        // In progress courses
        const inProgress = enrollments.filter(e => e.progress > 0 && e.progress < 100).length;
        inProgressCountElement.textContent = inProgress;
        
        // Certificates earned - count all completed courses as eligible for certificates
        // Even if certificateId doesn't exist yet, completed courses are eligible
        const certificates = enrollments.filter(e => e.progress === 100).length;
        certificatesCountElement.textContent = certificates;
    }
    
    // Render charts
    function renderCharts(enrollments, courses, categoryMap) {
        // Progress distribution chart
        renderProgressChart(enrollments);
        
        // Category distribution chart
        renderCategoryChart(enrollments, courses, categoryMap);
    }
    
    // Render progress distribution chart
    function renderProgressChart(enrollments) {
        // Calculate progress distribution
        const notStarted = enrollments.filter(e => e.progress === 0).length;
        const inProgress = enrollments.filter(e => e.progress > 0 && e.progress < 100).length;
        const completed = enrollments.filter(e => e.progress === 100).length;
        const total = enrollments.length;
        
        // Donut chart implementation for learning progress
        const chartHTML = `
            <div class="w-full h-full flex flex-col items-center justify-center">
                <div class="relative w-48 h-48 mb-6">
                    <!-- Donut chart background -->
                    <div class="absolute inset-0 rounded-full border-8 border-gray-200"></div>
                    
                    <!-- Not Started segment -->
                    <div class="absolute inset-0 rounded-full border-8 border-gray-400 clip-segment" 
                         style="clip-path: ${getClipPath(0, (notStarted / Math.max(1, total)) * 100)};"></div>
                    
                    <!-- In Progress segment -->
                    <div class="absolute inset-0 rounded-full border-8 border-amber-500 clip-segment" 
                         style="clip-path: ${getClipPath((notStarted / Math.max(1, total)) * 100, ((notStarted + inProgress) / Math.max(1, total)) * 100)};"></div>
                    
                    <!-- Completed segment -->
                    <div class="absolute inset-0 rounded-full border-8 border-green-500 clip-segment" 
                         style="clip-path: ${getClipPath(((notStarted + inProgress) / Math.max(1, total)) * 100, 100)};"></div>
                    
                    <!-- Center label -->
                    <div class="absolute inset-0 flex flex-col items-center justify-center">
                        <span class="text-2xl font-bold text-gray-900">${total}</span>
                        <span class="text-sm text-gray-500">Total Courses</span>
                    </div>
                </div>
                
                <!-- Legend -->
                <div class="flex flex-wrap justify-center gap-4 mt-4">
                    <div class="flex items-center">
                        <div class="w-4 h-4 bg-gray-400 rounded-full mr-2"></div>
                        <span class="text-sm text-gray-600">Not Started (${notStarted})</span>
                    </div>
                    <div class="flex items-center">
                        <div class="w-4 h-4 bg-amber-500 rounded-full mr-2"></div>
                        <span class="text-sm text-gray-600">In Progress (${inProgress})</span>
                    </div>
                    <div class="flex items-center">
                        <div class="w-4 h-4 bg-green-500 rounded-full mr-2"></div>
                        <span class="text-sm text-gray-600">Completed (${completed})</span>
                    </div>
                </div>
                
                <div class="mt-6 text-center">
                    <p class="text-sm text-gray-600 font-medium">Your Learning Progress Distribution</p>
                </div>
            </div>
        `;
        
        progressChartContainer.innerHTML = chartHTML;
    }
    
    // Helper function to generate clip-path for donut segments
    function getClipPath(startPercent, endPercent) {
        if (startPercent >= endPercent) return 'inset(0)';
        
        // Convert percentages to angles (0-360 degrees)
        const startAngle = (startPercent / 100) * 360;
        const endAngle = (endPercent / 100) * 360;
        
        // For a full circle, we need a different approach
        if (endAngle - startAngle >= 360) {
            return 'inset(0)';
        }
        
        // Calculate points for the segment
        const centerX = 50;
        const centerY = 50;
        const radius = 50;
        
        // Convert angles to radians
        const startRad = (startAngle - 90) * Math.PI / 180;
        const endRad = (endAngle - 90) * Math.PI / 180;
        
        // Calculate start and end points
        const startX = centerX + radius * Math.cos(startRad);
        const startY = centerY + radius * Math.sin(startRad);
        const endX = centerX + radius * Math.cos(endRad);
        const endY = centerY + radius * Math.sin(endRad);
        
        // Large arc flag (1 if angle > 180 degrees)
        const largeArcFlag = endAngle - startAngle > 180 ? 1 : 0;
        
        // Create path data for the segment
        if (startAngle === 0 && endAngle === 360) {
            // Full circle
            return 'inset(0)';
        } else {
            // Partial circle
            return `path("M ${centerX},${centerY} L ${startX},${startY} A ${radius},${radius} 0 ${largeArcFlag},1 ${endX},${endY} Z")`;
        }
    }
    
    // Render category distribution chart
    function renderCategoryChart(enrollments, courses, categoryMap) {
        // Match enrollments with courses to get categories
        const enrichedEnrollments = enrollments.map(enrollment => {
            const course = courses.find(c => c.id === enrollment.courseId);
            return {
                ...enrollment,
                course: course || null
            };
        });
        
        // Count courses by category
        const categoryCounts = {};
        enrichedEnrollments.forEach(enrollment => {
            if (enrollment.course && enrollment.course.category) {
                // Map category ID to name if it's an ID, otherwise use as is
                const categoryId = enrollment.course.category;
                const categoryName = categoryMap[categoryId] || categoryId;
                categoryCounts[categoryName] = (categoryCounts[categoryName] || 0) + 1;
            }
        });
        
        // Convert to array and sort by count
        const sortedCategories = Object.entries(categoryCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5); // Top 5 categories
        
        if (sortedCategories.length === 0) {
            categoryChartContainer.innerHTML = `
                <div class="text-center text-gray-500">
                    <svg class="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                    <p class="mt-2">No category data available</p>
                </div>
            `;
            return;
        }
        
        // Generate enhanced bar chart with animations and interactive elements
        const maxCount = Math.max(...sortedCategories.map(c => c[1]));
        const chartHTML = `
            <div class="w-full h-full flex flex-col">
                <div class="flex items-end flex-1 space-x-2 md:space-x-3 px-2 py-4">
                    ${sortedCategories.map(([category, count], index) => {
                        // Generate different colors for each bar
                        const colors = [
                            'from-indigo-500 to-purple-600',
                            'from-blue-500 to-cyan-600',
                            'from-green-500 to-emerald-600',
                            'from-amber-500 to-orange-600',
                            'from-rose-500 to-pink-600'
                        ];
                        const colorClass = colors[index % colors.length];
                        
                        // Calculate height percentage
                        const heightPercent = Math.max(20, (count / maxCount) * 100);
                        
                        // Calculate width based on text length for better label fit
                        const labelWidth = Math.max(50, category.length * 6);
                        
                        return `
                            <div class="flex flex-col items-center flex-1 group min-w-[50px] md:min-w-[60px]">
                                <div class="text-xs text-gray-500 mb-1 font-bold transition-all duration-300 group-hover:text-gray-900">${count}</div>
                                <div class="w-3/4 md:w-3/4 bg-gradient-to-t ${colorClass} rounded-t-lg transition-all duration-700 ease-out hover:opacity-90 hover:shadow-lg transform hover:-translate-y-1" 
                                     style="height: ${heightPercent}%">
                                </div>
                                <div class="text-xs text-gray-600 mt-2 text-center truncate w-full px-1 font-semibold transition-all duration-300 group-hover:text-gray-900" 
                                     style="max-width: ${labelWidth}px;">${category}</div>
                            </div>
                        `;
                    }).join('')}
                </div>
                
                <div class="mt-4 md:mt-6 text-center">
                    <p class="text-sm text-gray-600 font-medium">Course Categories Distribution</p>
                    <div class="mt-2 flex justify-center">
                        <div class="inline-flex items-center text-xs text-gray-500">
                            <span class="flex h-3 w-3">
                                <span class="animate-ping absolute h-3 w-3 rounded-full bg-indigo-400 opacity-75"></span>
                                <span class="relative h-3 w-3 rounded-full bg-indigo-500"></span>
                            </span>
                            <span class="ml-2">Top 5 Categories</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        categoryChartContainer.innerHTML = chartHTML;
    }
    
    // Render courses
    function renderCourses(enrollments, courses, categoryMap) {
        console.log('Rendering dashboard courses:', enrollments, courses);
        if (enrollments.length === 0) {
            coursesContainer.innerHTML = `
                <div class="text-center py-12 col-span-full">
                    <svg class="mx-auto h-16 w-16 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                    <h3 class="mt-4 text-lg font-medium text-gray-900">No enrolled courses yet</h3>
                    <p class="mt-2 text-gray-500">Get started by browsing our course catalog</p>
                    <div class="mt-6">
                        <a href="../courses.html" class="px-4 py-2 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white font-medium transition duration-300 inline-flex items-center">
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
        
        // Match enrollments with courses
        const enrichedEnrollments = enrollments.map(enrollment => {
            const course = courses.find(c => c.id === enrollment.courseId);
            return {
                ...enrollment,
                course: course || null
            };
        }).filter(enrollment => enrollment.course); // Filter out enrollments without matching courses
        
        // Sort by last accessed time (most recent first)
        enrichedEnrollments.sort((a, b) => {
            const dateA = a.lastAccessed ? new Date(a.lastAccessed) : new Date(0);
            const dateB = b.lastAccessed ? new Date(b.lastAccessed) : new Date(0);
            return dateB - dateA;
        });
        
        // Generate HTML for all courses (without separating recently accessed)
        let coursesHTML = '';
        
        enrichedEnrollments.forEach(enrollment => {
            coursesHTML += generateCourseCardHTML(enrollment, categoryMap);
        });
        
        console.log('Generated dashboard courses HTML:', coursesHTML);
        coursesContainer.innerHTML = coursesHTML;
        console.log('Dashboard courses container updated with', enrichedEnrollments.length, 'courses');
    }
    
    // Helper function to generate course card HTML
    function generateCourseCardHTML(enrollment, categoryMap) {
        if (!enrollment.course) return '';
        
        // Map category ID to name if it's an ID, otherwise use as is
        let categoryName = enrollment.course.category || 'General';
        if (categoryMap && categoryMap[enrollment.course.category]) {
            categoryName = categoryMap[enrollment.course.category];
        }
        
        // Determine category tag color based on category name
        let categoryClass = 'bg-indigo-100 text-indigo-800'; // Default indigo color
        
        const categoryLower = categoryName.toLowerCase();
        if (categoryLower.includes('android')) {
            categoryClass = 'bg-green-100 text-green-800'; // Green for Android
        } else if (categoryLower.includes('python')) {
            categoryClass = 'bg-blue-100 text-blue-800'; // Blue for Python
        } else if (categoryLower.includes('web')) {
            categoryClass = 'bg-amber-100 text-amber-800'; // Amber for Web
        } else if (categoryLower.includes('data')) {
            categoryClass = 'bg-purple-100 text-purple-800'; // Purple for Data
        }
        
        const progress = enrollment.progress || 0;
        const isCompleted = progress === 100;
        
        return `
            <div class="bg-white rounded-xl shadow-md overflow-hidden hover-lift transition-all duration-300 course-card" data-enrollment-id="${enrollment.id}">
                <!-- Thumbnail -->
                <div class="h-48 overflow-hidden">
                    <img 
                        src="${enrollment.course.thumbnail}" 
                        alt="${enrollment.course.title}" 
                        class="w-full h-full object-cover"
                        loading="lazy"
                        onerror="this.src='data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPjxyZWN0IHg9IjMiIHk9IjQiIHdpZHRoPSIxOCIgaGVpZ2h0PSIxMyIgcng9IjIiLz48cG9seWxpbmUgcG9pbnRzPSIxIDIwIDggMTMgMTMgMTgiLz48cG9seWxpbmUgcG9pbnRzPSIyMSAyMCAxNi41IDE1LjUgMTQgMTgiLz48bGluZSB4MT0iOSIgeDI9IjkiIHkxPSI5IiB5Mj0iOSIvPjwvc3ZnPg==';"
                    >
                </div>
                
                <div class="p-6">
                    <div class="flex justify-between items-start">
                        <h3 class="text-xl font-bold text-gray-900 line-clamp-2">
                            ${enrollment.course.title}
                        </h3>
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
                    
                    <p class="mt-2 text-sm text-gray-500">
                        ${categoryName} • ${enrollment.course.difficulty || 'Beginner'}
                    </p>
                    
                    <p class="mt-3 text-gray-600 line-clamp-2">
                        ${enrollment.course.description ? enrollment.course.description.substring(0, 100) + '...' : 'No description available'}
                    </p>
                    
                    <div class="mt-4">
                        <div class="flex justify-between text-sm text-gray-500 mb-1">
                            <span>Progress</span>
                            <span>${progress}%</span>
                        </div>
                        <div class="w-full bg-gray-200 rounded-full h-2">
                            <div 
                                class="h-2 rounded-full ${
                                    isCompleted ? 'bg-green-500' : 
                                    progress > 50 ? 'bg-indigo-600' : 'bg-amber-500'
                                } transition-all duration-500" 
                                style="width: ${progress}%"
                            ></div>
                        </div>
                    </div>
                    
                    <div class="mt-6 flex justify-between">
                        <a 
                            href="../player.html?courseId=${enrollment.courseId}" 
                            class="px-4 py-2 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white font-medium transition duration-300 text-center flex-1 mr-2"
                        >
                            ${isCompleted ? 'Review' : 'Continue'}
                        </a>
                        ${isCompleted ? `
                            <a 
                                href="../certificate.html?courseId=${enrollment.courseId}"
                                class="px-4 py-2 rounded-md border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition duration-300 text-center flex-1 ml-2"
                            >
                                Certificate
                            </a>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;
    }
    

    
    // Handle logout
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function() {
            firebaseServices.signOut()
                .then(() => {
                    window.location.href = '../auth/login.html';
                })
                .catch((error) => {
                    console.error('Logout error:', error);
                    utils.showNotification('Logout failed: ' + error.message, 'error');
                });
        });
    }
});
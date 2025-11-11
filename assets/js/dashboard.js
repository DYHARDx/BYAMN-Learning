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
    
    // New analytics elements
    const studyTimeElement = document.getElementById('study-time');
    const lessonsCompletedElement = document.getElementById('lessons-completed');
    const learningStreakElement = document.getElementById('learning-streak');
    const favoriteCategoryElement = document.getElementById('favorite-category');
    const studyTimeChartContainer = document.getElementById('study-time-chart-container');
    const activityChartContainer = document.getElementById('activity-chart-container');
    const streakChartContainer = document.getElementById('streak-chart-container');
    
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
            firebaseServices.getCategories(), // Also fetch categories to map IDs to names
            firebaseServices.getUserAnalytics(userId) // Fetch user analytics
        ])
        .then(([courses, userEnrollments, categories, userAnalytics]) => {
            // Create a map of category IDs to names
            const categoryMap = {};
            categories.forEach(category => {
                categoryMap[category.id] = category.name;
            });
            
            // Update stats
            updateStats(userEnrollments);
            
            // Update analytics stats
            updateAnalyticsStats(userAnalytics);
            
            // Render courses
            renderCourses(userEnrollments, courses, categoryMap);
            
            // Render charts
            renderCharts(userEnrollments, courses, categoryMap);
            
            // Render analytics charts
            renderAnalyticsCharts(userAnalytics);
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
    
    // Update analytics stats
    function updateAnalyticsStats(analytics) {
        if (!analytics) {
            // Set default values if no analytics data
            if (studyTimeElement) studyTimeElement.textContent = '0h 0m';
            if (lessonsCompletedElement) lessonsCompletedElement.textContent = '0';
            if (learningStreakElement) learningStreakElement.textContent = '0';
            if (favoriteCategoryElement) favoriteCategoryElement.textContent = 'None';
            return;
        }
        
        // Format study time (convert seconds to hours and minutes)
        if (studyTimeElement) {
            const totalSeconds = analytics.totalStudyTime || 0;
            const hours = Math.floor(totalSeconds / 3600);
            const minutes = Math.floor((totalSeconds % 3600) / 60);
            studyTimeElement.textContent = `${hours}h ${minutes}m`;
        }
        
        // Lessons completed
        if (lessonsCompletedElement) {
            lessonsCompletedElement.textContent = analytics.lessonsCompleted || 0;
        }
        
        // Learning streak
        if (learningStreakElement) {
            learningStreakElement.textContent = analytics.learningStreak || 0;
        }
        
        // Favorite category
        if (favoriteCategoryElement && analytics.favoriteCategories) {
            // Find the category with the highest count
            let favoriteCategory = 'None';
            let maxCount = 0;
            
            Object.entries(analytics.favoriteCategories).forEach(([category, count]) => {
                if (count > maxCount) {
                    maxCount = count;
                    favoriteCategory = category;
                }
            });
            
            favoriteCategoryElement.textContent = favoriteCategory;
        } else if (favoriteCategoryElement) {
            favoriteCategoryElement.textContent = 'None';
        }
    }
    
    // Render charts
    function renderCharts(enrollments, courses, categoryMap) {
        // Progress distribution chart
        renderProgressChart(enrollments);
        
        // Category distribution chart
        renderCategoryChart(enrollments, courses, categoryMap);
    }
    
    // Render progress chart (enrollment progress distribution)
    function renderProgressChart(enrollments) {
        const container = document.getElementById('progress-chart-container');
        if (!container) return;
        
        if (enrollments.length === 0) {
            container.innerHTML = `
                <div class="text-center text-gray-500">
                    <svg class="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm8-12a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2v-6a2 2 0 00-2-2h-2z" />
                    </svg>
                    <p class="mt-2">No progress data available</p>
                </div>
            `;
            return;
        }
        
        // Categorize enrollments by progress
        const progressCategories = {
            'Not Started': 0,
            '1-25%': 0,
            '26-50%': 0,
            '51-75%': 0,
            '76-99%': 0,
            'Completed': 0
        };
        
        enrollments.forEach(enrollment => {
            const progress = enrollment.progress || 0;
            if (progress === 0) {
                progressCategories['Not Started']++;
            } else if (progress <= 25) {
                progressCategories['1-25%']++;
            } else if (progress <= 50) {
                progressCategories['26-50%']++;
            } else if (progress <= 75) {
                progressCategories['51-75%']++;
            } else if (progress < 100) {
                progressCategories['76-99%']++;
            } else {
                progressCategories['Completed']++;
            }
        });
        
        // Generate chart HTML
        let chartHTML = `
            <div class="flex items-end justify-between h-48 px-2">
        `;
        
        const categories = Object.keys(progressCategories);
        const values = Object.values(progressCategories);
        const maxValue = Math.max(...values, 1); // Avoid division by zero
        
        categories.forEach((category, index) => {
            const value = values[index];
            const heightPercent = (value / maxValue) * 80; // Max 80% height
            chartHTML += `
                <div class="flex flex-col items-center flex-1 px-1">
                    <div class="flex flex-col items-center justify-end w-full h-full">
                        <div class="w-3/4 bg-indigo-500 rounded-t" style="height: ${heightPercent}%; min-height: 4px;"></div>
                    </div>
                    <div class="mt-2 text-center">
                        <p class="text-xs font-medium text-gray-900">${value}</p>
                        <p class="text-xs text-gray-500 truncate">${category}</p>
                    </div>
                </div>
            `;
        });
        
        chartHTML += `
            </div>
            <div class="mt-6 text-center">
                <p class="text-sm text-gray-500">Course progress distribution</p>
            </div>
        `;
        
        container.innerHTML = chartHTML;
    }
    
    // Render category chart
    function renderCategoryChart(enrollments, courses, categoryMap) {
        const container = document.getElementById('category-chart-container');
        if (!container) return;
        
        if (enrollments.length === 0 || courses.length === 0) {
            container.innerHTML = `
                <div class="text-center text-gray-500">
                    <svg class="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <p class="mt-2">No category data available</p>
                </div>
            `;
            return;
        }
        
        // Count courses by category
        const categoryCount = {};
        enrollments.forEach(enrollment => {
            const course = courses.find(c => c.id === enrollment.courseId);
            if (course && course.category) {
                const categoryName = categoryMap[course.category] || course.category;
                categoryCount[categoryName] = (categoryCount[categoryName] || 0) + 1;
            }
        });
        
        // If no categories found, show message
        if (Object.keys(categoryCount).length === 0) {
            container.innerHTML = `
                <div class="text-center text-gray-500">
                    <svg class="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <p class="mt-2">No category data available</p>
                </div>
            `;
            return;
        }
        
        // Generate chart HTML
        let chartHTML = `
            <div class="flex items-end justify-between h-48 px-2">
        `;
        
        const categories = Object.keys(categoryCount);
        const values = Object.values(categoryCount);
        const maxValue = Math.max(...values, 1); // Avoid division by zero
        
        categories.forEach((category, index) => {
            const value = values[index];
            const heightPercent = (value / maxValue) * 80; // Max 80% height
            chartHTML += `
                <div class="flex flex-col items-center flex-1 px-1">
                    <div class="flex flex-col items-center justify-end w-full h-full">
                        <div class="w-3/4 bg-purple-500 rounded-t" style="height: ${heightPercent}%; min-height: 4px;"></div>
                    </div>
                    <div class="mt-2 text-center">
                        <p class="text-xs font-medium text-gray-900">${value}</p>
                        <p class="text-xs text-gray-500 truncate">${category}</p>
                    </div>
                </div>
            `;
        });
        
        chartHTML += `
            </div>
            <div class="mt-6 text-center">
                <p class="text-sm text-gray-500">Enrolled courses by category</p>
            </div>
        `;
        
        container.innerHTML = chartHTML;
    }
    
    // Render analytics charts
    function renderAnalyticsCharts(analytics) {
        if (!analytics) {
            // Show empty state for analytics charts
            renderEmptyChart('study-time-chart-container', 'Study Time');
            renderEmptyChart('activity-chart-container', 'Activity');
            renderEmptyChart('streak-chart-container', 'Study Streak');
            return;
        }
        
        // Render study time chart (last 7 days)
        renderStudyTimeChart(analytics);
        
        // Render activity chart (lessons completed over time)
        renderActivityChart(analytics);
        
        // Render streak chart
        renderStreakChart(analytics);
    }
    
    // Render study time chart
    function renderStudyTimeChart(analytics) {
        const container = document.getElementById('study-time-chart-container');
        if (!container) return;
        
        // Get last 7 days of study time data
        const dailyActivity = analytics.dailyActivity || {};
        const dates = Object.keys(dailyActivity).sort().slice(-7);
        
        if (dates.length === 0) {
            renderEmptyChart('study-time-chart-container', 'Study Time');
            return;
        }
        
        // Prepare data for chart
        const studyTimes = dates.map(date => {
            const activity = dailyActivity[date] || {};
            return (activity.studyTime || 0) / 60; // Convert to minutes
        });
        
        const maxValue = Math.max(...studyTimes, 1);
        
        // Generate chart HTML
        let chartHTML = `
            <div class="flex items-end justify-between h-48 px-2">
        `;
        
        dates.forEach((date, index) => {
            const studyTime = studyTimes[index];
            const heightPercent = (studyTime / maxValue) * 80; // Max 80% height
            const displayDate = new Date(date).toLocaleDateString('en-US', { weekday: 'short' });
            
            chartHTML += `
                <div class="flex flex-col items-center flex-1 px-1">
                    <div class="flex flex-col items-center justify-end w-full h-full">
                        <div class="w-3/4 bg-indigo-500 rounded-t" style="height: ${heightPercent}%; min-height: 4px;"></div>
                    </div>
                    <div class="mt-2 text-center">
                        <p class="text-xs font-medium text-gray-900">${Math.round(studyTime)}m</p>
                        <p class="text-xs text-gray-500">${displayDate}</p>
                    </div>
                </div>
            `;
        });
        
        chartHTML += `
            </div>
            <div class="mt-6 text-center">
                <p class="text-sm text-gray-500">Minutes studied per day (last 7 days)</p>
            </div>
        `;
        
        container.innerHTML = chartHTML;
    }
    
    // Render activity chart
    function renderActivityChart(analytics) {
        const container = document.getElementById('activity-chart-container');
        if (!container) return;
        
        // Get last 7 days of activity data
        const dailyActivity = analytics.dailyActivity || {};
        const dates = Object.keys(dailyActivity).sort().slice(-7);
        
        if (dates.length === 0) {
            renderEmptyChart('activity-chart-container', 'Activity');
            return;
        }
        
        // Prepare data for chart
        const lessonsCompleted = dates.map(date => {
            const activity = dailyActivity[date] || {};
            return activity.lessonsCompleted || 0;
        });
        
        const maxValue = Math.max(...lessonsCompleted, 1);
        
        // Generate chart HTML
        let chartHTML = `
            <div class="flex items-end justify-between h-48 px-2">
        `;
        
        dates.forEach((date, index) => {
            const lessons = lessonsCompleted[index];
            const heightPercent = (lessons / maxValue) * 80; // Max 80% height
            const displayDate = new Date(date).toLocaleDateString('en-US', { weekday: 'short' });
            
            chartHTML += `
                <div class="flex flex-col items-center flex-1 px-1">
                    <div class="flex flex-col items-center justify-end w-full h-full">
                        <div class="w-3/4 bg-green-500 rounded-t" style="height: ${heightPercent}%; min-height: 4px;"></div>
                    </div>
                    <div class="mt-2 text-center">
                        <p class="text-xs font-medium text-gray-900">${lessons}</p>
                        <p class="text-xs text-gray-500">${displayDate}</p>
                    </div>
                </div>
            `;
        });
        
        chartHTML += `
            </div>
            <div class="mt-6 text-center">
                <p class="text-sm text-gray-500">Lessons completed per day (last 7 days)</p>
            </div>
        `;
        
        container.innerHTML = chartHTML;
    }
    
    // Render streak chart
    function renderStreakChart(analytics) {
        const container = document.getElementById('streak-chart-container');
        if (!container) return;
        
        const currentStreak = analytics.currentStreak || 0;
        const longestStreak = analytics.longestStreak || 0;
        
        // Generate chart HTML
        let chartHTML = `
            <div class="flex items-end justify-center h-48 px-2">
                <div class="flex flex-col items-center px-4">
                    <div class="flex flex-col items-center justify-end w-full h-full">
                        <div class="w-16 bg-amber-500 rounded-t" style="height: ${Math.min((currentStreak / Math.max(longestStreak, 1)) * 80, 80)}%; min-height: 4px;"></div>
                    </div>
                    <div class="mt-2 text-center">
                        <p class="text-xs font-medium text-gray-900">${currentStreak}</p>
                        <p class="text-xs text-gray-500">Current</p>
                    </div>
                </div>
                <div class="flex flex-col items-center px-4">
                    <div class="flex flex-col items-center justify-end w-full h-full">
                        <div class="w-16 bg-purple-500 rounded-t" style="height: 80%; min-height: 4px;"></div>
                    </div>
                    <div class="mt-2 text-center">
                        <p class="text-xs font-medium text-gray-900">${longestStreak}</p>
                        <p class="text-xs text-gray-500">Longest</p>
                    </div>
                </div>
            </div>
            <div class="mt-6 text-center">
                <p class="text-sm text-gray-500">Learning streaks (days)</p>
            </div>
        `;
        
        container.innerHTML = chartHTML;
    }
    
    // Render empty chart
    function renderEmptyChart(containerId, title) {
        const container = document.getElementById(containerId);
        if (!container) return;
        
        container.innerHTML = `
            <div class="text-center text-gray-500">
                <svg class="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <p class="mt-2">No ${title.toLowerCase()} data available</p>
            </div>
        `;
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
    
    // Advanced analytics functions
    
    // Analyze learning patterns
    function analyzeLearningPatterns(analytics) {
        if (!analytics || !analytics.dailyActivity) return null;
        
        const dailyActivity = analytics.dailyActivity;
        const dates = Object.keys(dailyActivity).sort();
        
        // Calculate learning consistency
        let totalDays = 0;
        let activeDays = 0;
        let totalStudyTime = 0;
        let totalTimeStudied = 0;
        
        dates.forEach(date => {
            totalDays++;
            const activity = dailyActivity[date];
            if (activity.studyTime > 0) {
                activeDays++;
                totalTimeStudied += activity.studyTime;
            }
            totalStudyTime += activity.studyTime || 0;
        });
        
        // Calculate consistency percentage
        const consistency = totalDays > 0 ? (activeDays / totalDays) * 100 : 0;
        
        // Calculate average study time per active day
        const avgStudyTime = activeDays > 0 ? totalTimeStudied / activeDays : 0;
        
        // Find peak learning hours (simplified - would need more detailed data)
        const peakHours = findPeakLearningHours(dailyActivity);
        
        // Calculate learning velocity (improvement over time)
        const learningVelocity = calculateLearningVelocity(dailyActivity);
        
        return {
            consistency: Math.round(consistency),
            avgStudyTime: Math.round(avgStudyTime),
            totalTimeStudied: Math.round(totalTimeStudied),
            peakHours: peakHours,
            learningVelocity: learningVelocity,
            activeDays: activeDays,
            totalDays: totalDays
        };
    }
    
    // Find peak learning hours
    function findPeakLearningHours(dailyActivity) {
        // This is a simplified version - in a real implementation, 
        // we would have more granular time data
        const hourCounts = {};
        
        // For now, we'll just return a generic peak time
        return {
            morning: 30, // 6-12 AM
            afternoon: 40, // 12-6 PM
            evening: 30 // 6-12 PM
        };
    }
    
    // Calculate learning velocity
    function calculateLearningVelocity(dailyActivity) {
        const dates = Object.keys(dailyActivity).sort();
        if (dates.length < 2) return 0;
        
        // Get first and last week data
        const firstWeek = dates.slice(0, 7);
        const lastWeek = dates.slice(-7);
        
        // Calculate average study time for each period
        let firstWeekTotal = 0;
        let lastWeekTotal = 0;
        
        firstWeek.forEach(date => {
            firstWeekTotal += dailyActivity[date].studyTime || 0;
        });
        
        lastWeek.forEach(date => {
            lastWeekTotal += dailyActivity[date].studyTime || 0;
        });
        
        const firstWeekAvg = firstWeekTotal / firstWeek.length;
        const lastWeekAvg = lastWeekTotal / lastWeek.length;
        
        // Calculate percentage change
        if (firstWeekAvg === 0) return lastWeekAvg > 0 ? 100 : 0;
        
        return Math.round(((lastWeekAvg - firstWeekAvg) / firstWeekAvg) * 100);
    }
    
    // Render learning patterns analysis
    function renderLearningPatterns(patterns) {
        const patternsContainer = document.getElementById('learning-patterns-container');
        if (!patternsContainer) return;
        
        if (!patterns) {
            patternsContainer.innerHTML = `
                <div class="text-center text-gray-500">
                    <svg class="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm8-12a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2v-6a2 2 0 00-2-2h-2z" />
                    </svg>
                    <p class="mt-2">No learning pattern data available</p>
                </div>
            `;
            return;
        }
        
        const improvementText = patterns.learningVelocity > 0 ? 
            `You're improving! ${patterns.learningVelocity}% more than when you started.` : 
            patterns.learningVelocity < 0 ? 
            `Keep going! You can improve your learning pace.` : 
            `Consistent progress! Keep up the good work.`;
        
        const patternsHTML = `
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div class="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl p-6 border border-indigo-100">
                    <div class="flex items-center mb-4">
                        <div class="p-2 rounded-lg bg-indigo-100">
                            <svg class="h-6 w-6 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                            </svg>
                        </div>
                        <h3 class="ml-3 text-lg font-semibold text-gray-900">Learning Consistency</h3>
                    </div>
                    <div class="mt-4">
                        <div class="flex justify-between mb-1">
                            <span class="text-sm font-medium text-gray-700">${patterns.consistency}%</span>
                            <span class="text-sm font-medium text-gray-700">${patterns.activeDays}/${patterns.totalDays} days</span>
                        </div>
                        <div class="w-full bg-gray-200 rounded-full h-2.5">
                            <div class="bg-indigo-600 h-2.5 rounded-full" style="width: ${patterns.consistency}%"></div>
                        </div>
                        <p class="mt-2 text-sm text-gray-600">${patterns.consistency >= 80 ? 'Excellent consistency!' : patterns.consistency >= 60 ? 'Good consistency!' : 'Keep building your learning habit!'}</p>
                    </div>
                </div>
                
                <div class="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl p-6 border border-amber-100">
                    <div class="flex items-center mb-4">
                        <div class="p-2 rounded-lg bg-amber-100">
                            <svg class="h-6 w-6 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <h3 class="ml-3 text-lg font-semibold text-gray-900">Study Time</h3>
                    </div>
                    <div class="mt-4">
                        <p class="text-2xl font-bold text-gray-900">${Math.round(patterns.avgStudyTime / 60)} min/day</p>
                        <p class="mt-1 text-sm text-gray-600">Average study time on active days</p>
                        <p class="mt-2 text-sm text-gray-600">Total: ${Math.round(patterns.totalTimeStudied / 3600)} hours</p>
                    </div>
                </div>
                
                <div class="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-6 border border-green-100 md:col-span-2">
                    <div class="flex items-center mb-4">
                        <div class="p-2 rounded-lg bg-green-100">
                            <svg class="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                            </svg>
                        </div>
                        <h3 class="ml-3 text-lg font-semibold text-gray-900">Learning Progress</h3>
                    </div>
                    <div class="mt-4">
                        <p class="text-lg font-medium text-gray-900">${improvementText}</p>
                        <div class="mt-3 flex items-center">
                            <span class="text-sm text-gray-600 mr-2">Learning Velocity:</span>
                            <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${patterns.learningVelocity >= 0 ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}">
                                ${patterns.learningVelocity >= 0 ? '+' : ''}${patterns.learningVelocity}%
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        patternsContainer.innerHTML = patternsHTML;
    }
    
    // Render recommendations
    function renderRecommendations(recommendations) {
        const recommendationsContainer = document.getElementById('recommendations-container');
        if (!recommendationsContainer) return;
        
        if (!recommendations || recommendations.length === 0) {
            recommendationsContainer.innerHTML = `
                <div class="text-center text-gray-500 py-8">
                    <svg class="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                    <p class="mt-2">No recommendations available at the moment</p>
                </div>
            `;
            return;
        }
        
        let recommendationsHTML = '<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">';
        
        recommendations.slice(0, 3).forEach(course => {
            recommendationsHTML += `
                <div class="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-all duration-300">
                    <div class="h-32 overflow-hidden">
                        <img 
                            src="${course.thumbnail || 'https://placehold.co/400x200/6366f1/white?text=Course'}" 
                            alt="${course.title}" 
                            class="w-full h-full object-cover"
                            onerror="this.src='https://placehold.co/400x200/6366f1/white?text=Course';"
                        >
                    </div>
                    <div class="p-5">
                        <h3 class="font-bold text-gray-900 line-clamp-2">${course.title}</h3>
                        <p class="mt-2 text-sm text-gray-600 line-clamp-2">${course.description || 'No description available'}</p>
                        <div class="mt-4 flex justify-between items-center">
                            <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                                ${course.category || 'General'}
                            </span>
                            <a 
                                href="../player.html?courseId=${course.id}"
                                class="px-3 py-1.5 text-sm rounded-md bg-indigo-600 hover:bg-indigo-700 text-white font-medium transition duration-300"
                            >
                                Explore
                            </a>
                        </div>
                    </div>
                </div>
            `;
        });
        
        recommendationsHTML += '</div>';
        recommendationsContainer.innerHTML = recommendationsHTML;
    }
    
    // Render achievements
    function renderAchievements(achievements) {
        const achievementsContainer = document.getElementById('achievements-container');
        if (!achievementsContainer) return;
        
        if (!achievements || achievements.length === 0) {
            achievementsContainer.innerHTML = `
                <div class="text-center text-gray-500 py-8">
                    <svg class="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                    </svg>
                    <p class="mt-2">No achievements yet. Complete courses to earn badges!</p>
                </div>
            `;
            return;
        }
        
        let achievementsHTML = '<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">';
        
        achievements.forEach(achievement => {
            achievementsHTML += `
                <div class="bg-white rounded-lg shadow-sm p-4 border ${achievement.earned ? 'border-green-200 bg-green-50' : 'border-gray-200'}">
                    <div class="flex items-center">
                        <div class="flex-shrink-0 ${achievement.earned ? 'text-green-500' : 'text-gray-400'}">
                            <svg class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                            </svg>
                        </div>
                        <div class="ml-3">
                            <h4 class="text-sm font-medium ${achievement.earned ? 'text-green-800' : 'text-gray-800'}">${achievement.name}</h4>
                            <p class="text-xs ${achievement.earned ? 'text-green-600' : 'text-gray-500'}">${achievement.earned ? 'Earned' : 'Locked'}</p>
                        </div>
                    </div>
                    <p class="mt-2 text-xs text-gray-600">${achievement.description}</p>
                </div>
            `;
        });
        
        achievementsHTML += '</div>';
        achievementsContainer.innerHTML = achievementsHTML;
    }
    
    // Get course recommendations based on user analytics and enrollments
    function getCourseRecommendations(enrollments, courses, analytics) {
        if (!courses || !analytics) return [];
        
        // Get user's favorite categories
        const favoriteCategories = analytics.favoriteCategories || {};
        
        // Get completed and in-progress courses
        const completedCourseIds = enrollments
            .filter(e => e.progress === 100)
            .map(e => e.courseId);
        
        const inProgressCourseIds = enrollments
            .filter(e => e.progress > 0 && e.progress < 100)
            .map(e => e.courseId);
        
        // Get all enrolled course IDs
        const enrolledCourseIds = [...completedCourseIds, ...inProgressCourseIds];
        
        // Score courses based on relevance
        const scoredCourses = courses.map(course => {
            let score = 0;
            
            // Boost score for courses in favorite categories
            if (course.category && favoriteCategories[course.category]) {
                score += favoriteCategories[course.category] * 10;
            }
            
            // Boost score for courses with higher difficulty if user is progressing well
            if (analytics.learningVelocity > 0 && course.difficulty) {
                const difficultyBoost = course.difficulty === 'Advanced' ? 15 : 
                                     course.difficulty === 'Intermediate' ? 10 : 5;
                score += difficultyBoost;
            }
            
            // Boost score for courses with good ratings
            if (course.rating && course.rating >= 4.5) {
                score += course.rating * 2;
            }
            
            // Boost score for popular courses
            if (course.enrollmentCount && course.enrollmentCount > 100) {
                score += 5;
            }
            
            // Penalize courses that are already enrolled in
            if (enrolledCourseIds.includes(course.id)) {
                score -= 100; // Effectively exclude
            }
            
            return {
                ...course,
                score: score
            };
        });
        
        // Filter out courses with negative scores and sort by score
        return scoredCourses
            .filter(course => course.score > 0)
            .sort((a, b) => b.score - a.score)
            .slice(0, 6); // Return top 6 recommendations
    }
});
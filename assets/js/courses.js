// Courses page JavaScript for fetching and displaying course data from Firebase

// Store all courses for filtering
let allCourses = [];
let currentFilter = 'all';
let currentSearchTerm = '';
let currentSort = 'newest'; // newest, oldest, enrollmentAsc, enrollmentDesc, ratingDesc, priceAsc, priceDesc
let categoryMap = {}; // Map to store category ID to name mappings
let difficultyFilter = 'all'; // all, beginner, intermediate, advanced
let durationFilter = 'all'; // all, short, medium, long
let instructorFilter = 'all'; // all, specific instructors
let priceFilter = 'all'; // all, free, paid

// Intersection Observer for lazy loading images
const imageObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            const img = entry.target;
            img.src = img.dataset.src;
            img.classList.remove('lazy-load');
            observer.unobserve(img);
        }
    });
});

// Add helper function for date normalization (similar to the one in firebase.js)
function getNormalizedDate(dateValue) {
    if (!dateValue) return new Date(0); // Default to epoch if no date

    // Handle Firebase Timestamp objects
    if (dateValue._seconds !== undefined) {
        return new Date(dateValue._seconds * 1000);
    }

    // Handle Unix timestamps (numbers)
    if (typeof dateValue === 'number') {
        // Check if it's in seconds or milliseconds
        if (dateValue > 10000000000) {
            // Milliseconds
            return new Date(dateValue);
        } else {
            // Seconds
            return new Date(dateValue * 1000);
        }
    }

    // Handle string dates
    if (typeof dateValue === 'string') {
        // Try to parse the string date
        const parsedDate = new Date(dateValue);
        if (!isNaN(parsedDate.getTime())) {
            return parsedDate;
        }
    }

    // Handle Date objects
    if (dateValue instanceof Date) {
        return dateValue;
    }

    // Fallback
    return new Date(0);
}

// Utility function to get course duration category
function getDurationCategory(duration) {
    if (!duration) return 'short';
    
    // Convert duration to minutes if it's in HH:MM format
    if (typeof duration === 'string' && duration.includes(':')) {
        const parts = duration.split(':');
        const hours = parseInt(parts[0]) || 0;
        const minutes = parseInt(parts[1]) || 0;
        const totalMinutes = hours * 60 + minutes;
        if (totalMinutes <= 120) return 'short';
        if (totalMinutes <= 360) return 'medium';
        return 'long';
    }
    
    // If duration is in minutes
    if (typeof duration === 'number') {
        if (duration <= 120) return 'short';
        if (duration <= 360) return 'medium';
        return 'long';
    }
    
    return 'short';
}

// Utility function to filter courses
function filterCourses(courses, searchTerm, category, difficulty, duration, instructor, price) {
    return courses.filter(course => {
        // Search term filter
        if (searchTerm) {
            const searchLower = searchTerm.toLowerCase();
            const titleMatch = course.title && course.title.toLowerCase().includes(searchLower);
            const descriptionMatch = course.description && course.description.toLowerCase().includes(searchLower);
            const instructorMatch = course.instructor && course.instructor.toLowerCase().includes(searchLower);
            const categoryMatch = categoryMap[course.category] && categoryMap[course.category].toLowerCase().includes(searchLower);
            const languageMatch = course.language && course.language.toLowerCase().includes(searchLower);
            
            if (!titleMatch && !descriptionMatch && !instructorMatch && !categoryMatch && !languageMatch) {
                return false;
            }
        }
        
        // Category filter
        if (category !== 'all' && categoryMap[course.category] !== category) {
            return false;
        }
        
        // Difficulty filter
        if (difficulty !== 'all' && course.difficulty && course.difficulty.toLowerCase() !== difficulty) {
            return false;
        }
        
        // Duration filter
        if (duration !== 'all') {
            const courseDuration = getDurationCategory(course.duration);
            if (courseDuration !== duration) {
                return false;
            }
        }
        
        // Instructor filter
        if (instructor !== 'all' && course.instructor !== instructor) {
            return false;
        }
        
        // Price filter
        if (price !== 'all') {
            const isFree = !course.price || course.price === 0;
            if (price === 'free' && !isFree) {
                return false;
            }
            if (price === 'paid' && isFree) {
                return false;
            }
        }
        
        return true;
    });
}

// Utility function to sort courses
function sortCourses(courses, sortOption) {
    const sortedCourses = [...courses];
    
    switch (sortOption) {
        case 'newest':
            sortedCourses.sort((a, b) => {
                const dateA = getNormalizedDate(a.createdAt || a.created || a.date || a.timestamp);
                const dateB = getNormalizedDate(b.createdAt || b.created || b.date || b.timestamp);
                return dateB - dateA;
            });
            break;
        case 'oldest':
            sortedCourses.sort((a, b) => {
                const dateA = getNormalizedDate(a.createdAt || a.created || a.date || a.timestamp);
                const dateB = getNormalizedDate(b.createdAt || b.created || b.date || b.timestamp);
                return dateA - dateB;
            });
            break;
        case 'enrollmentAsc':
            sortedCourses.sort((a, b) => (a.enrollmentCount || 0) - (b.enrollmentCount || 0));
            break;
        case 'enrollmentDesc':
            sortedCourses.sort((a, b) => (b.enrollmentCount || 0) - (a.enrollmentCount || 0));
            break;
        case 'ratingDesc':
            sortedCourses.sort((a, b) => (b.rating || 0) - (a.rating || 0));
            break;
        case 'priceAsc':
            sortedCourses.sort((a, b) => (a.price || 0) - (b.price || 0));
            break;
        case 'priceDesc':
            sortedCourses.sort((a, b) => (b.price || 0) - (a.price || 0));
            break;
        default:
            // Default to newest
            sortedCourses.sort((a, b) => {
                const dateA = getNormalizedDate(a.createdAt || a.created || a.date || a.timestamp);
                const dateB = getNormalizedDate(b.createdAt || b.created || b.date || b.timestamp);
                return dateB - dateA;
            });
    }
    
    return sortedCourses;
}

document.addEventListener('DOMContentLoaded', function() {
    // Elements
    const coursesContainer = document.getElementById('courses-container');
    const categoryFilterContainer = document.getElementById('category-filters');
    const searchInput = document.getElementById('course-search');
    const sortSelect = document.getElementById('sort-options');
    const toggleFiltersBtn = document.getElementById('toggle-filters');
    const advancedFiltersPanel = document.getElementById('advanced-filters');
    const difficultyFilterSelect = document.getElementById('difficulty-filter');
    const durationFilterSelect = document.getElementById('duration-filter');
    const instructorFilterSelect = document.getElementById('instructor-filter');
    const priceFilterSelect = document.getElementById('price-filter');
    const clearFiltersBtn = document.getElementById('clear-filters');
    const resultsCount = document.getElementById('results-count');

    // Load courses and categories when page loads
    loadCategoriesAndCourses();

    // Add search event listener
    if (searchInput) {
        searchInput.addEventListener('input', utils.debounce(function(e) {
            currentSearchTerm = e.target.value.toLowerCase();
            applyFilters();
        }, 300));
    }

    // Add sort event listener
    if (sortSelect) {
        sortSelect.addEventListener('change', function(e) {
            currentSort = e.target.value;
            applyFilters();
        });
    }

    // Add toggle filters event listener
    if (toggleFiltersBtn) {
        toggleFiltersBtn.addEventListener('click', function() {
            advancedFiltersPanel.classList.toggle('hidden');
            const isHidden = advancedFiltersPanel.classList.contains('hidden');
            toggleFiltersBtn.innerHTML = isHidden ? 
                `<svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"></path>
                </svg>
                Advanced Filters` :
                `<svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
                Hide Filters`;
        });
    }

    // Add difficulty filter event listener
    if (difficultyFilterSelect) {
        difficultyFilterSelect.addEventListener('change', function(e) {
            difficultyFilter = e.target.value;
            applyFilters();
        });
    }

    // Add duration filter event listener
    if (durationFilterSelect) {
        durationFilterSelect.addEventListener('change', function(e) {
            durationFilter = e.target.value;
            applyFilters();
        });
    }

    // Add instructor filter event listener
    if (instructorFilterSelect) {
        instructorFilterSelect.addEventListener('change', function(e) {
            instructorFilter = e.target.value;
            applyFilters();
        });
    }

    // Add price filter event listener
    if (priceFilterSelect) {
        priceFilterSelect.addEventListener('change', function(e) {
            priceFilter = e.target.value;
            applyFilters();
        });
    }

    // Add clear filters event listener
    if (clearFiltersBtn) {
        clearFiltersBtn.addEventListener('click', function() {
            // Reset all filters
            currentSearchTerm = '';
            currentFilter = 'all';
            difficultyFilter = 'all';
            durationFilter = 'all';
            instructorFilter = 'all';
            priceFilter = 'all';
            currentSort = 'newest';
            
            // Reset UI elements
            if (searchInput) searchInput.value = '';
            if (sortSelect) sortSelect.value = 'newest';
            if (difficultyFilterSelect) difficultyFilterSelect.value = 'all';
            if (durationFilterSelect) durationFilterSelect.value = 'all';
            if (instructorFilterSelect) instructorFilterSelect.value = 'all';
            if (priceFilterSelect) priceFilterSelect.value = 'all';
            
            // Update active button styling
            document.querySelectorAll('.filter-btn').forEach(btn => {
                if (btn.getAttribute('data-category') === 'all') {
                    btn.classList.add('active');
                } else {
                    btn.classList.remove('active');
                }
            });
            
            applyFilters();
        });
    }

    // Apply all filters
    function applyFilters() {
        // Filter courses
        let filteredCourses = filterCourses(
            allCourses, 
            currentSearchTerm, 
            currentFilter, 
            difficultyFilter, 
            durationFilter, 
            instructorFilter,
            priceFilter
        );
        
        // Sort courses
        filteredCourses = sortCourses(filteredCourses, currentSort);
        
        // Render courses
        renderCourses(filteredCourses);
        
        // Update results count
        if (resultsCount) {
            resultsCount.textContent = `${filteredCourses.length} course${filteredCourses.length !== 1 ? 's' : ''} found`;
        }
    }

    // Load categories and courses from Firebase
    async function loadCategoriesAndCourses() {
        try {
            // Show loading state
            coursesContainer.innerHTML = `
                <div class="col-span-full text-center py-20">
                    <div class="loading-spinner mx-auto"></div>
                    <p class="mt-8 text-gray-700 font-semibold text-lg">Loading courses...</p>
                    <p class="mt-3 text-gray-500">Please wait while we fetch our course catalog</p>
                </div>
            `;

            // Fetch categories and courses from Firebase Realtime Database
            const [categoriesSnapshot, coursesSnapshot] = await Promise.all([
                firebaseServices.getCategories(),
                firebaseServices.getCourses()
            ]);

            const categories = categoriesSnapshot;
            const courses = coursesSnapshot;

            console.log('Categories data from Firebase:', categories);
            console.log('Courses data from Firebase:', courses);

            // Create category ID to name mapping
            categoryMap = {};
            if (categories && categories.length > 0) {
                categories.forEach(category => {
                    // Map both the ID and name for lookup
                    categoryMap[category.id] = category.name || category.id;
                });
            }

            // Store all courses for filtering
            allCourses = courses;

            // Render category filters
            renderCategoryFilters(categories);
            
            // Render instructor filters
            renderInstructorFilters(courses);
            
            // Render all courses by default
            renderCourses(courses);

            // Set the "All Courses" button as active
            const allCoursesButton = document.querySelector('.filter-btn[data-category="all"]');
            if (allCoursesButton) {
                allCoursesButton.classList.add('active');
            }
            
            // Update results count
            if (resultsCount) {
                resultsCount.textContent = `${courses.length} course${courses.length !== 1 ? 's' : ''} found`;
            }
        } catch (error) {
            console.error('Error loading categories and courses:', error);
            utils.showNotification('Error loading data: ' + error.message, 'error');

            // Show error state
            coursesContainer.innerHTML = `
                <div class="col-span-full text-center py-20">
                    <svg class="mx-auto h-16 w-16 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <h3 class="mt-6 text-2xl font-bold text-gray-900">Error Loading Data</h3>
                    <p class="mt-3 text-gray-600 max-w-md mx-auto">There was an error loading courses. Please try again later.</p>
                    <div class="mt-8">
                        <button onclick="location.reload()" class="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold transition duration-300 shadow-md hover:shadow-lg">
                            Retry
                        </button>
                    </div>
                </div>
            `;
        }
    }

    // Render category filters
    function renderCategoryFilters(categories) {
        if (!categoryFilterContainer) return;

        console.log('Rendering category filters:', categories);

        // Start with "All Courses" button
        let filtersHTML = '<button class="category-btn filter-btn active" data-category="all">All Courses</button>';

        // Add buttons for each category
        if (categories && categories.length > 0) {
            // Get unique categories from courses
            const courseCategories = [...new Set(allCourses.map(course => course.category).filter(Boolean))];

            // Add buttons for each unique category
            courseCategories.forEach(category => {
                const categoryName = categoryMap[category] || category;
                console.log('Adding category button:', categoryName);
                filtersHTML += `<button class="category-btn filter-btn" data-category="${categoryName}">${categoryName}</button>`;
            });
        } else {
            // Fallback to categories from courses if none exist in database
            console.log('No categories found in database, using categories from courses');
            const courseCategories = [...new Set(allCourses.map(course => course.category).filter(Boolean))];

            courseCategories.forEach(category => {
                const categoryName = categoryMap[category] || category;
                console.log('Adding course category button:', categoryName);
                filtersHTML += `<button class="category-btn filter-btn" data-category="${categoryName}">${categoryName}</button>`;
            });
        }

        categoryFilterContainer.innerHTML = filtersHTML;

        // Add event listeners to filter buttons
        document.querySelectorAll('.filter-btn').forEach(button => {
            button.addEventListener('click', function() {
                const category = this.getAttribute('data-category');
                console.log('Category button clicked:', category);

                // Update active button styling
                document.querySelectorAll('.filter-btn').forEach(btn => {
                    if (btn.getAttribute('data-category') === category) {
                        btn.classList.add('active');
                    } else {
                        btn.classList.remove('active');
                    }
                });

                // Update current filter and apply filters
                currentFilter = category;
                applyFilters();
            });
        });
    }
    
    // Render instructor filters
    function renderInstructorFilters(courses) {
        if (!instructorFilterSelect) return;
        
        // Get unique instructors
        const instructors = [...new Set(courses.map(course => course.instructor).filter(Boolean))];
        
        // Clear existing options except the first one
        instructorFilterSelect.innerHTML = '<option value="all">All Instructors</option>';
        
        // Add instructor options
        instructors.forEach(instructor => {
            const option = document.createElement('option');
            option.value = instructor;
            option.textContent = instructor;
            instructorFilterSelect.appendChild(option);
        });
    }

    // Render courses
    function renderCourses(courses) {
        if (!coursesContainer) return;

        if (courses.length === 0) {
            coursesContainer.innerHTML = `
                <div class="col-span-full text-center py-20">
                    <svg class="mx-auto h-16 w-16 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <h3 class="mt-6 text-2xl font-bold text-gray-900">No courses found</h3>
                    <p class="mt-3 text-gray-600 max-w-md mx-auto">Try adjusting your search or filter criteria</p>
                    <div class="mt-8">
                        <button id="clear-filters-btn" class="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold transition duration-300 shadow-md hover:shadow-lg">
                            Clear Filters
                        </button>
                    </div>
                </div>
            `;
            
            // Add event listener to clear filters button
            const clearFiltersBtn = document.getElementById('clear-filters-btn');
            if (clearFiltersBtn) {
                clearFiltersBtn.addEventListener('click', function() {
                    // Reset all filters
                    currentSearchTerm = '';
                    currentFilter = 'all';
                    difficultyFilter = 'all';
                    durationFilter = 'all';
                    instructorFilter = 'all';
                    priceFilter = 'all';
                    currentSort = 'newest';
                    
                    // Reset UI elements
                    if (searchInput) searchInput.value = '';
                    if (sortSelect) sortSelect.value = 'newest';
                    if (difficultyFilterSelect) difficultyFilterSelect.value = 'all';
                    if (durationFilterSelect) durationFilterSelect.value = 'all';
                    if (instructorFilterSelect) instructorFilterSelect.value = 'all';
                    if (priceFilterSelect) priceFilterSelect.value = 'all';
                    
                    // Update active button styling
                    document.querySelectorAll('.filter-btn').forEach(btn => {
                        if (btn.getAttribute('data-category') === 'all') {
                            btn.classList.add('active');
                        } else {
                            btn.classList.remove('active');
                        }
                    });
                    
                    applyFilters();
                });
            }
            
            return;
        }

        // Generate HTML for courses
        let coursesHTML = '';
        console.log('Processing courses for display:', courses);
        courses.forEach(course => {
            console.log('Processing course:', course);
            
            // Map category ID to name if it's an ID, otherwise use as is
            let categoryName = course.category || 'General';
            if (categoryMap && categoryMap[course.category]) {
                categoryName = categoryMap[course.category];
            }
            
            // Get duration category
            const durationCategory = getDurationCategory(course.duration);
            let durationText = course.duration || 'N/A';
            if (durationCategory === 'short') durationText += ' (Short)';
            else if (durationCategory === 'medium') durationText += ' (Medium)';
            else if (durationCategory === 'long') durationText += ' (Long)';
            
            // Determine badge color based on category
            let badgeClass = 'bg-gray-100 text-gray-800';
            if (categoryName) {
                const category = categoryName.toLowerCase();
                if (category.includes('web')) {
                    badgeClass = 'bg-blue-100 text-blue-800';
                } else if (category.includes('data')) {
                    badgeClass = 'bg-green-100 text-green-800';
                } else if (category.includes('design')) {
                    badgeClass = 'bg-purple-100 text-purple-800';
                } else if (category.includes('mobile')) {
                    badgeClass = 'bg-amber-100 text-amber-800';
                } else if (category.includes('business')) {
                    badgeClass = 'bg-indigo-100 text-indigo-800';
                }
            }
            
            // Format price
            let priceText = 'Free';
            if (course.price && course.price > 0) {
                priceText = `$${course.price.toFixed(2)}`;
            }
            
            coursesHTML += `
                <div class="course-card">
                    <div class="course-image-container">
                        <img
                            src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPjxyZWN0IHg9IjMiIHk9IjQiIHdpZHRoPSIxOCIgaGVpZ2h0PSIxMyIgcng9IjIiLz48cG9seWxpbmUgcG9pbnRzPSIxIDIwIDggMTMgMTMgMTgiLz48cG9seWxpbmUgcG9pbnRzPSIyMSAyMCAxNi41IDE1LjUgMTQgMTgiLz48bGluZSB4MT0iOSIgeDI9IjkiIHkxPSI5IiB5Mj0iOSIvPjwvc3ZnPg=="
                            data-src="${course.thumbnail || 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=600&q=80'}"
                            alt="${course.title}"
                            class="course-image lazy-load"
                            loading="lazy"
                            onerror="this.src='https://images.unsplash.com/photo-1555066931-4365d14bab8c?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=600&q=80';"
                        >
                    </div>
                    <div class="course-card-content">
                        <div class="flex justify-between items-start mb-4">
                            <span class="badge ${badgeClass}">
                                ${categoryName}
                            </span>
                            <div class="flex items-center text-amber-500">
                                <svg class="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path>
                                </svg>
                                <span class="ml-1 text-gray-700 font-semibold text-sm">${course.rating || '4.5'}</span>
                            </div>
                        </div>
                        <h3 class="course-card-title">${course.title}</h3>
                        <p class="course-card-description">
                            ${course.description || 'No description available for this course.'}
                        </p>
                        <div class="course-card-meta">
                            <div class="flex flex-wrap items-center gap-2 text-gray-600 text-sm">
                                <div class="flex items-center">
                                    <svg class="h-5 w-5 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <span class="font-medium">${durationText}</span>
                                </div>
                                ${course.language ? `<span class="badge bg-gray-100 text-gray-800">${course.language}</span>` : ''}
                                ${course.enrollmentCount ? `<span class="badge bg-green-100 text-green-800">${course.enrollmentCount} enrolled</span>` : ''}
                                ${course.difficulty ? `<span class="badge bg-purple-100 text-purple-800">${course.difficulty}</span>` : ''}
                            </div>
                            <div class="flex items-center mt-3">
                                <span class="course-card-price mr-3">${priceText}</span>
                                <button class="btn btn-primary enroll-btn" data-course-id="${course.id}">
                                    Enroll Now
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        });

        console.log('Generated courses HTML:', coursesHTML);
        coursesContainer.innerHTML = coursesHTML;
        console.log('Courses container updated with', courses.length, 'courses');
        
        // Observe images for lazy loading
        document.querySelectorAll('.lazy-load').forEach(img => {
            imageObserver.observe(img);
        });

        // Add event listeners to enroll buttons
        document.querySelectorAll('.enroll-btn').forEach(button => {
            button.addEventListener('click', function() {
                const courseId = this.getAttribute('data-course-id');
                enrollInCourse(courseId);
            });
        });
    }

    // Enroll in a course
    async function enrollInCourse(courseId) {
        try {
            // Get current user
            const { auth } = firebaseServices;
            const user = auth.currentUser;
            if (!user) {
                // Redirect to login page
                window.location.href = 'auth/login.html';
                return;
            }

            // Show loading state on button
            const button = document.querySelector(`.enroll-btn[data-course-id="${courseId}"]`);
            const originalText = button.textContent;
            button.innerHTML = '<svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> Enrolling...';
            button.disabled = true;

            // Enroll user in course using Firebase
            await firebaseServices.enrollUserInCourse(user.uid, courseId);
            utils.showNotification('Successfully enrolled in course!', 'success');

            // Redirect to dashboard after a short delay
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 1500);
        } catch (error) {
            console.error('Error enrolling in course:', error);
            utils.showNotification('Error enrolling in course: ' + error.message, 'error');

            // Reset button
            const button = document.querySelector(`.enroll-btn[data-course-id="${courseId}"]`);
            button.textContent = 'Enroll Now';
            button.disabled = false;
        }
    }
});
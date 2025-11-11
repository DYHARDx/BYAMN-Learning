// Courses page JavaScript for fetching and displaying course data from Firebase

// Store all courses for filtering
let allCourses = [];
let currentFilter = 'all';
let currentSearchTerm = '';
let currentSort = 'newest'; // newest, oldest, enrollmentAsc, enrollmentDesc
let categoryMap = {}; // Map to store category ID to name mappings
let searchDebounceTimer = null;
let searchHistory = [];

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

document.addEventListener('DOMContentLoaded', function() {
    // Elements
    const coursesContainer = document.getElementById('courses-container');
    const categoryFilterContainer = document.getElementById('category-filters');
    const searchInput = document.getElementById('course-search');
    const sortSelect = document.getElementById('sort-options');
    const recommendationsSection = document.getElementById('recommendations-section');
    const recommendationsContainer = document.getElementById('recommendations-container');
    // New elements for enhanced search
    const searchSuggestions = document.getElementById('search-suggestions');
    const clearSearchBtn = document.getElementById('clear-search');
    const difficultyFilter = document.getElementById('difficulty-filter');
    const durationFilter = document.getElementById('duration-filter');
    const ratingFilter = document.getElementById('rating-filter');
    const languageFilter = document.getElementById('language-filter');
    const resetFiltersBtn = document.getElementById('reset-filters');
    const activeFiltersContainer = document.getElementById('active-filters');

    // Load courses and categories when page loads
    loadCategoriesAndCourses();

    // Add search event listener with enhanced functionality
    if (searchInput) {
        searchInput.addEventListener('input', function(e) {
            clearTimeout(searchDebounceTimer);
            currentSearchTerm = e.target.value.toLowerCase();
            
            // Show clear button when there's text
            if (clearSearchBtn) {
                clearSearchBtn.style.display = currentSearchTerm ? 'block' : 'none';
            }
            
            // Debounce search to improve performance
            searchDebounceTimer = setTimeout(() => {
                if (currentSearchTerm.length > 1) {
                    // Show search suggestions
                    showSearchSuggestions(currentSearchTerm);
                } else if (searchSuggestions) {
                    searchSuggestions.innerHTML = '';
                    searchSuggestions.style.display = 'none';
                }
                applyFilters();
            }, 300);
        });
        
        // Handle search submission
        searchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                addToSearchHistory(currentSearchTerm);
                applyFilters();
                if (searchSuggestions) {
                    searchSuggestions.style.display = 'none';
                }
            }
        });
    }
    
    // Clear search functionality
    if (clearSearchBtn) {
        clearSearchBtn.addEventListener('click', function() {
            if (searchInput) {
                searchInput.value = '';
                currentSearchTerm = '';
                clearSearchBtn.style.display = 'none';
                if (searchSuggestions) {
                    searchSuggestions.innerHTML = '';
                    searchSuggestions.style.display = 'none';
                }
                applyFilters();
            }
        });
    }

    // Add sort event listener
    if (sortSelect) {
        sortSelect.addEventListener('change', function(e) {
            currentSort = e.target.value;
            applyFilters();
        });
    }

    // Add filter event listeners
    if (difficultyFilter) {
        difficultyFilter.addEventListener('change', applyFilters);
    }
    
    if (durationFilter) {
        durationFilter.addEventListener('change', applyFilters);
    }
    
    if (ratingFilter) {
        ratingFilter.addEventListener('change', applyFilters);
    }
    
    if (languageFilter) {
        languageFilter.addEventListener('change', applyFilters);
    }
    
    // Reset filters button
    if (resetFiltersBtn) {
        resetFiltersBtn.addEventListener('click', function() {
            resetAllFilters();
        });
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

            // Check if user is logged in to show personalized recommendations
            const user = firebaseServices.auth.currentUser;
            if (user) {
                // Load personalized recommendations
                loadRecommendations(user.uid, courses, categories);
            } else {
                // Hide recommendations section for non-logged in users
                if (recommendationsSection) {
                    recommendationsSection.style.display = 'none';
                }
            }

            // Populate language filter with available languages
            populateLanguageFilter();

            // Render category filters
            renderCategoryFilters(categories);

            // Render all courses by default
            renderCourses(courses);

            // Set the "All Courses" button as active
            const allCoursesButton = document.querySelector('.filter-btn[data-category="all"]');
            if (allCoursesButton) {
                allCoursesButton.classList.add('active');
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

    // Populate language filter with available languages
    async function populateLanguageFilter() {
        const languageFilter = document.getElementById('language-filter');
        if (!languageFilter) return;

        try {
            const languages = await firebaseServices.getAvailableLanguages();
            
            // Clear existing options except the first one
            languageFilter.innerHTML = '<option value="all">All Languages</option>';
            
            // Add available languages
            languages.forEach(language => {
                const option = document.createElement('option');
                option.value = language;
                option.textContent = language;
                languageFilter.appendChild(option);
            });
        } catch (error) {
            console.error('Error populating language filter:', error);
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

    // Enhanced filter application with advanced options
    function applyFilters() {
        console.log('Applying filters - Category:', currentFilter, 'Search:', currentSearchTerm, 'Sort:', currentSort);
        console.log('All courses:', allCourses);

        let filteredCourses = [...allCourses]; // Create a copy to avoid modifying original array

        // Apply category filter
        if (currentFilter !== 'all') {
            filteredCourses = filteredCourses.filter(course => {
                // Check if course has a category and if it matches (case-insensitive)
                const courseCategory = course.category ? course.category.trim() : '';

                // Normalize both values for comparison
                const normalizedCourseCategory = (categoryMap[courseCategory] || courseCategory).toLowerCase();
                const normalizedFilterCategory = currentFilter.toLowerCase();

                // Check for exact match or partial matches for common categories
                const matches = normalizedCourseCategory === normalizedFilterCategory ||
                              (normalizedFilterCategory === 'mobile development' && normalizedCourseCategory.includes('mobile')) ||
                              (normalizedFilterCategory === 'web development' && normalizedCourseCategory.includes('web')) ||
                              (normalizedFilterCategory === 'data science' && (normalizedCourseCategory.includes('data') || normalizedCourseCategory.includes('science'))) ||
                              (normalizedFilterCategory === 'business' && normalizedCourseCategory.includes('business')) ||
                              (normalizedFilterCategory === 'marketing' && normalizedCourseCategory.includes('marketing'));

                console.log(`Course "${course.title}" category "${normalizedCourseCategory}" matches "${normalizedFilterCategory}": ${matches}`);
                return matches;
            });
        }

        // Apply search filter with enhanced matching
        if (currentSearchTerm) {
            filteredCourses = filteredCourses.filter(course => {
                return smartSearchMatch(course, currentSearchTerm);
            });
        }
        
        // Apply difficulty filter
        const difficultyValue = difficultyFilter ? difficultyFilter.value : '';
        if (difficultyValue && difficultyValue !== 'all') {
            filteredCourses = filteredCourses.filter(course => {
                return course.difficulty && course.difficulty.toLowerCase() === difficultyValue.toLowerCase();
            });
        }
        
        // Apply duration filter
        const durationValue = durationFilter ? durationFilter.value : '';
        if (durationValue && durationValue !== 'all') {
            filteredCourses = filteredCourses.filter(course => {
                if (!course.lessons || !Array.isArray(course.lessons)) return false;
                
                const totalDuration = course.lessons.reduce((sum, lesson) => sum + (lesson.duration || 0), 0);
                
                switch (durationValue) {
                    case 'short':
                        return totalDuration <= 3600; // <= 1 hour
                    case 'medium':
                        return totalDuration > 3600 && totalDuration <= 10800; // 1-3 hours
                    case 'long':
                        return totalDuration > 10800; // > 3 hours
                    default:
                        return true;
                }
            });
        }
        
        // Apply rating filter
        const ratingValue = ratingFilter ? parseFloat(ratingFilter.value) : 0;
        if (ratingValue > 0) {
            filteredCourses = filteredCourses.filter(course => {
                return course.rating && course.rating >= ratingValue;
            });
        }
        
        // Apply language filter
        const languageValue = languageFilter ? languageFilter.value : '';
        if (languageValue && languageValue !== 'all') {
            filteredCourses = filteredCourses.filter(course => {
                return course.language && course.language.toLowerCase() === languageValue.toLowerCase();
            });
        }

        // Apply sorting
        filteredCourses = sortCourses(filteredCourses, currentSort);

        console.log('Filtered and sorted courses:', filteredCourses);
        renderCourses(filteredCourses);
        updateActiveFiltersDisplay();
    }
    
    // Smart search matching function
    function smartSearchMatch(course, searchTerm) {
        // Split search term into words for better matching
        const searchWords = searchTerm.toLowerCase().split(/\s+/);
        
        // Fields to search in
        const searchableFields = [
            course.title,
            course.description,
            course.category,
            course.instructor,
            course.language,
            course.difficulty
        ].filter(Boolean).map(field => field.toLowerCase());
        
        // Check for exact phrase match
        const phraseMatch = searchableFields.some(field => 
            field.includes(searchTerm.toLowerCase())
        );
        
        if (phraseMatch) return true;
        
        // Check for word matches
        return searchWords.every(word => 
            searchableFields.some(field => field.includes(word))
        );
    }
    
    // Show search suggestions
    function showSearchSuggestions(term) {
        if (!searchSuggestions) return;
        
        // Get matching courses for suggestions
        const matchingCourses = allCourses.filter(course => 
            course.title && course.title.toLowerCase().includes(term)
        ).slice(0, 5); // Limit to 5 suggestions
        
        if (matchingCourses.length === 0) {
            searchSuggestions.innerHTML = '';
            searchSuggestions.style.display = 'none';
            return;
        }
        
        let suggestionsHTML = '';
        matchingCourses.forEach(course => {
            suggestionsHTML += `
                <div class="suggestion-item px-4 py-2 hover:bg-gray-100 cursor-pointer flex items-center" data-value="${course.title}">
                    <svg class="h-4 w-4 text-gray-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <span>${course.title}</span>
                </div>
            `;
        });
        
        searchSuggestions.innerHTML = suggestionsHTML;
        searchSuggestions.style.display = 'block';
        
        // Add click event listeners to suggestions
        document.querySelectorAll('.suggestion-item').forEach(item => {
            item.addEventListener('click', function() {
                const value = this.getAttribute('data-value');
                if (searchInput) {
                    searchInput.value = value;
                    currentSearchTerm = value.toLowerCase();
                    addToSearchHistory(currentSearchTerm);
                    applyFilters();
                    searchSuggestions.style.display = 'none';
                }
            });
        });
    }
    
    // Add to search history
    function addToSearchHistory(term) {
        if (!term) return;
        
        // Remove if already exists
        searchHistory = searchHistory.filter(item => item !== term);
        
        // Add to beginning of array
        searchHistory.unshift(term);
        
        // Keep only last 10 items
        if (searchHistory.length > 10) {
            searchHistory = searchHistory.slice(0, 10);
        }
        
        // Save to localStorage
        try {
            localStorage.setItem('courseSearchHistory', JSON.stringify(searchHistory));
        } catch (e) {
            console.warn('Could not save search history to localStorage');
        }
    }
    
    // Reset all filters
    function resetAllFilters() {
        // Reset category filter
        currentFilter = 'all';
        document.querySelectorAll('.filter-btn').forEach(btn => {
            if (btn.getAttribute('data-category') === 'all') {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
        
        // Reset search
        if (searchInput) {
            searchInput.value = '';
            currentSearchTerm = '';
        }
        
        if (clearSearchBtn) {
            clearSearchBtn.style.display = 'none';
        }
        
        if (searchSuggestions) {
            searchSuggestions.innerHTML = '';
            searchSuggestions.style.display = 'none';
        }
        
        // Reset advanced filters
        if (difficultyFilter) difficultyFilter.value = 'all';
        if (durationFilter) durationFilter.value = 'all';
        if (ratingFilter) ratingFilter.value = '0';
        if (languageFilter) languageFilter.value = 'all';
        
        // Apply filters
        applyFilters();
    }
    
    // Update active filters display
    function updateActiveFiltersDisplay() {
        if (!activeFiltersContainer) return;
        
        const activeFilters = [];
        
        // Category filter
        if (currentFilter !== 'all') {
            activeFilters.push({
                type: 'Category',
                value: currentFilter,
                element: 'category'
            });
        }
        
        // Difficulty filter
        const difficultyValue = difficultyFilter ? difficultyFilter.value : '';
        if (difficultyValue && difficultyValue !== 'all') {
            activeFilters.push({
                type: 'Difficulty',
                value: difficultyValue,
                element: 'difficulty'
            });
        }
        
        // Duration filter
        const durationValue = durationFilter ? durationFilter.value : '';
        if (durationValue && durationValue !== 'all') {
            let durationLabel = '';
            switch (durationValue) {
                case 'short': durationLabel = 'Short (< 1 hour)'; break;
                case 'medium': durationLabel = 'Medium (1-3 hours)'; break;
                case 'long': durationLabel = 'Long (> 3 hours)'; break;
                default: durationLabel = durationValue;
            }
            activeFilters.push({
                type: 'Duration',
                value: durationLabel,
                element: 'duration'
            });
        }
        
        // Rating filter
        const ratingValue = ratingFilter ? parseFloat(ratingFilter.value) : 0;
        if (ratingValue > 0) {
            activeFilters.push({
                type: 'Rating',
                value: `${ratingValue}+ stars`,
                element: 'rating'
            });
        }
        
        // Language filter
        const languageValue = languageFilter ? languageFilter.value : '';
        if (languageValue && languageValue !== 'all') {
            activeFilters.push({
                type: 'Language',
                value: languageValue,
                element: 'language'
            });
        }
        
        if (activeFilters.length === 0) {
            activeFiltersContainer.innerHTML = '';
            activeFiltersContainer.style.display = 'none';
            return;
        }
        
        let filtersHTML = '<div class="flex flex-wrap items-center gap-2">';
        filtersHTML += '<span class="text-sm text-gray-600 font-medium">Active filters:</span>';
        
        activeFilters.forEach(filter => {
            filtersHTML += `
                <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                    ${filter.type}: ${filter.value}
                    <button type="button" class="ml-1.5 flex-shrink-0 h-4 w-4 rounded-full inline-flex items-center justify-center text-indigo-400 hover:bg-indigo-200 hover:text-indigo-500 focus:outline-none focus:bg-indigo-500 focus:text-white remove-filter" data-element="${filter.element}">
                        <span class="sr-only">Remove filter</span>
                        <svg class="h-2 w-2" stroke="currentColor" fill="none" viewBox="0 0 8 8">
                            <path stroke-linecap="round" stroke-width="1.5" d="M1 1l6 6m0-6L1 7" />
                        </svg>
                    </button>
                </span>
            `;
        });
        
        filtersHTML += `
            <button id="clear-all-filters" class="text-xs text-indigo-600 hover:text-indigo-800 font-medium">
                Clear all
            </button>
        `;
        
        filtersHTML += '</div>';
        activeFiltersContainer.innerHTML = filtersHTML;
        activeFiltersContainer.style.display = 'block';
        
        // Add event listeners to remove filter buttons
        document.querySelectorAll('.remove-filter').forEach(button => {
            button.addEventListener('click', function() {
                const element = this.getAttribute('data-element');
                removeFilter(element);
            });
        });
        
        // Add event listener to clear all filters button
        const clearAllBtn = document.getElementById('clear-all-filters');
        if (clearAllBtn) {
            clearAllBtn.addEventListener('click', resetAllFilters);
        }
    }
    
    // Remove specific filter
    function removeFilter(element) {
        switch (element) {
            case 'category':
                currentFilter = 'all';
                document.querySelectorAll('.filter-btn').forEach(btn => {
                    if (btn.getAttribute('data-category') === 'all') {
                        btn.classList.add('active');
                    } else {
                        btn.classList.remove('active');
                    }
                });
                break;
            case 'difficulty':
                if (difficultyFilter) difficultyFilter.value = 'all';
                break;
            case 'duration':
                if (durationFilter) durationFilter.value = 'all';
                break;
            case 'rating':
                if (ratingFilter) ratingFilter.value = '0';
                break;
            case 'language':
                if (languageFilter) languageFilter.value = 'all';
                break;
        }
        applyFilters();
    }

    // Sort courses based on selected criteria
    function sortCourses(courses, sortType) {
        // Create a copy of the array to avoid modifying the original
        const coursesCopy = [...courses];

        switch(sortType) {
            case 'newest':
                // Sort by creation date (newest first)
                return coursesCopy.sort((a, b) => {
                    const dateA = getNormalizedDate(a.createdAt || a.created || a.date || a.timestamp);
                    const dateB = getNormalizedDate(b.createdAt || b.created || b.date || b.timestamp);
                    return dateB - dateA;
                });

            case 'oldest':
                // Sort by creation date (oldest first)
                return coursesCopy.sort((a, b) => {
                    const dateA = getNormalizedDate(a.createdAt || a.created || a.date || a.timestamp);
                    const dateB = getNormalizedDate(b.createdAt || b.created || b.date || b.timestamp);
                    return dateA - dateB;
                });

            case 'enrollmentAsc':
                // Sort by enrollment count (ascending)
                return coursesCopy.sort((a, b) => {
                    const countA = a.enrollmentCount || 0;
                    const countB = b.enrollmentCount || 0;
                    return countA - countB;
                });

            case 'enrollmentDesc':
                // Sort by enrollment count (descending)
                return coursesCopy.sort((a, b) => {
                    const countA = a.enrollmentCount || 0;
                    const countB = b.enrollmentCount || 0;
                    return countB - countA;
                });
                
            case 'ratingDesc':
                // Sort by rating (descending)
                return coursesCopy.sort((a, b) => {
                    const ratingA = a.rating || 0;
                    const ratingB = b.rating || 0;
                    return ratingB - ratingA;
                });
                
            case 'durationAsc':
                // Sort by duration (ascending)
                return coursesCopy.sort((a, b) => {
                    const durationA = a.lessons ? a.lessons.reduce((sum, lesson) => sum + (lesson.duration || 0), 0) : 0;
                    const durationB = b.lessons ? b.lessons.reduce((sum, lesson) => sum + (lesson.duration || 0), 0) : 0;
                    return durationA - durationB;
                });
                
            case 'durationDesc':
                // Sort by duration (descending)
                return coursesCopy.sort((a, b) => {
                    const durationA = a.lessons ? a.lessons.reduce((sum, lesson) => sum + (lesson.duration || 0), 0) : 0;
                    const durationB = b.lessons ? b.lessons.reduce((sum, lesson) => sum + (lesson.duration || 0), 0) : 0;
                    return durationB - durationA;
                });

            default:
                return coursesCopy;
        }
    }

    // Render courses
    function renderCourses(courses) {
        if (!coursesContainer) return;

        console.log('Rendering courses:', courses);

        if (!courses || courses.length === 0) {
            coursesContainer.innerHTML = `
                <div class="col-span-full text-center py-20">
                    <svg class="mx-auto h-16 w-16 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <h3 class="mt-6 text-2xl font-bold text-gray-900">No courses found</h3>
                    <p class="mt-3 text-gray-600 max-w-md mx-auto">Try adjusting your search or filter criteria to find what you're looking for.</p>
                </div>
            `;
            return;
        }

        // Generate HTML for courses
        let coursesHTML = '';
        console.log('Processing courses for display:', courses);
        courses.forEach(course => {
            console.log('Processing course:', course);
            // Calculate average duration of lessons
            let totalDuration = 0;
            let lessonCount = 0;
            if (course.lessons) {
                Object.values(course.lessons).forEach(lesson => {
                    totalDuration += lesson.duration || 0;
                    lessonCount++;
                });
            }

            // Get category name, mapping from ID if necessary
            let categoryName = 'General';
            if (course.category) {
                // Check if it's a category ID that needs to be mapped to a name
                categoryName = categoryMap[course.category] || course.category;
            }

            // Determine badge color based on category
            let badgeClass = 'badge-primary';
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
                } else {
                    badgeClass = 'bg-gray-100 text-gray-800';
                }
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
                                <span class="ml-1 text-gray-700 font-semibold text-sm">4.5</span>
                            </div>
                        </div>
                        <h3 class="course-card-title">${course.title}</h3>
                        <p class="course-card-description">
                            ${course.description || 'No description available for this course.'}
                        </p>
                        <div class="course-card-meta">
                            <div class="flex items-center text-gray-600 text-sm">
                                <svg class="h-5 w-5 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <span class="font-medium">${formatDuration(Math.ceil(totalDuration)) || '0m 0s'}</span>
                                ${course.language ? `<span class="ml-3 badge bg-gray-100 text-gray-800">${course.language}</span>` : ''}
                                ${course.enrollmentCount ? `<span class="ml-3 badge bg-green-100 text-green-800">${course.enrollmentCount} enrolled</span>` : ''}
                            </div>
                            <button class="btn btn-primary enroll-btn" data-course-id="${course.id}">
                                Enroll Now
                            </button>
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

    // Format duration from seconds to HH:MM:SS or MM:SS format
    function formatDuration(seconds) {
        if (!seconds) return '0m 0s';

        const hrs = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;

        if (hrs > 0) {
            return `${hrs}h ${mins}m`;
        } else {
            return `${mins}m ${secs}s`;
        }
    }
});

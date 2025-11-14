// Firebase configuration and initialization for client-side
// CORRECTED VERSION - Uses your actual credentials from .env

// Import Firebase modules
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-analytics.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged, fetchSignInMethodsForEmail } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, doc, collection, getDoc, getDocs, updateDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getDatabase, ref, get, set, push, query, orderByChild, equalTo, remove, update } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

// Your Firebase configuration from .env
// NOTE: For client-side apps, these credentials are PUBLIC and that's okay!
// Firebase security is handled through Security Rules, not by hiding credentials
const firebaseConfig = {
  apiKey: "AIzaSyCDlU6SzJK4acxccwoU1MGAZuOa1Na2qTw",
  authDomain: "byamn-learning.firebaseapp.com",
  databaseURL: "https://byamn-learning-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "byamn-learning",
  storageBucket: "byamn-learning.firebasestorage.app",
  messagingSenderId: "392701533119",
  appId: "1:392701533119:web:a40ce8bba6b79617af1f0a",
  measurementId: "G-6S5EK0S9RS"
};

// Initialize Firebase
let app, analytics, auth, db, rtdb;

try {
  console.log('Initializing Firebase...');
  app = initializeApp(firebaseConfig);
  console.log('Firebase app initialized successfully');
  
  // Initialize Analytics (optional, may fail in some environments)
  try {
    analytics = getAnalytics(app);
    console.log('Firebase Analytics initialized');
  } catch (analyticsError) {
    console.warn('Firebase Analytics not available:', analyticsError.message);
  }
  
  // Initialize Auth
  auth = getAuth(app);
  console.log('Firebase Auth initialized');
  
  // Initialize Firestore
  db = getFirestore(app);
  console.log('Firestore initialized');
  
  // Initialize Realtime Database
  rtdb = getDatabase(app);
  console.log('Realtime Database initialized');
  console.log('Database URL:', firebaseConfig.databaseURL);
  
} catch (error) {
  console.error('FATAL: Firebase initialization failed:', error);
  alert('Failed to connect to Firebase. Please check your internet connection and refresh the page.');
}

// Helper function to normalize different date formats
function getNormalizedDate(dateValue) {
  if (!dateValue) return new Date(0);

  if (dateValue._seconds !== undefined) {
    return new Date(dateValue._seconds * 1000);
  }

  if (typeof dateValue === 'number') {
    if (dateValue > 10000000000) {
      return new Date(dateValue);
    } else {
      return new Date(dateValue * 1000);
    }
  }

  if (typeof dateValue === 'string') {
    const parsedDate = new Date(dateValue);
    if (!isNaN(parsedDate.getTime())) {
      return parsedDate;
    }
  }

  if (dateValue instanceof Date) {
    return dateValue;
  }

  return new Date(0);
}

// Export services for use in other modules
window.firebaseServices = {
    app,
    auth,
    db,
    rtdb,
    analytics,
    
    // Export helper functions directly
    ref,
    get,
    set,
    push,
    query,
    orderByChild,
    equalTo,
    remove,
    update,
    
    // Auth methods
    signInWithEmailAndPassword: (email, password) => signInWithEmailAndPassword(auth, email, password),
    createUserWithEmailAndPassword: (email, password) => createUserWithEmailAndPassword(auth, email, password),
    signOut: () => signOut(auth),
    onAuthStateChanged: (callback) => onAuthStateChanged(auth, callback),
    fetchSignInMethodsForEmail: (email) => fetchSignInMethodsForEmail(auth, email),

    // Database methods
    getDoc: (reference) => getDoc(reference),
    getDocs: (query) => getDocs(query),
    doc: (path, id) => doc(db, path, id),
    collection: (path) => collection(db, path),

    // Helper functions for data operations
    getCourses: async () => {
        try {
            const coursesRef = ref(rtdb, 'courses');
            const snapshot = await get(coursesRef);
            const coursesData = snapshot.val();

            const courses = [];
            if (coursesData) {
                Object.keys(coursesData).forEach(key => {
                    courses.push({ id: key, ...coursesData[key] });
                });
            }

            courses.sort((a, b) => {
                const dateA = getNormalizedDate(a.createdAt || a.created || a.date || a.timestamp);
                const dateB = getNormalizedDate(b.createdAt || b.created || b.date || b.timestamp);
                return dateB - dateA;
            });

            return courses;
        } catch (error) {
            console.error('Error fetching courses:', error);
            throw error;
        }
    },

    getCategories: async () => {
        try {
            const categoriesRef = ref(rtdb, 'categories');
            const snapshot = await get(categoriesRef);
            const categoriesData = snapshot.val();

            const categories = [];
            if (categoriesData) {
                Object.keys(categoriesData).forEach(key => {
                    categories.push({ id: key, ...categoriesData[key] });
                });
            }

            return categories;
        } catch (error) {
            console.error('Error fetching categories:', error);
            throw error;
        }
    },

    createUserInDatabase: async (userData) => {
        try {
            console.log('Attempting to save user data to database:', userData);
            const userRef = ref(rtdb, 'users/' + userData.uid);
            const snapshot = await get(userRef);

            if (snapshot.exists()) {
                console.log('User already exists in database, updating instead of creating duplicate');
                await set(userRef, {...snapshot.val(), ...userData});
            } else {
                await set(userRef, userData);
            }

            console.log('User data saved to database:', userData);
            return userData;
        } catch (error) {
            console.error('Error saving user to database:', error);
            throw error;
        }
    },

    initializeUserAnalytics: async (userId) => {
        try {
            const analyticsRef = ref(rtdb, 'userAnalytics/' + userId);
            const snapshot = await get(analyticsRef);
            
            if (!snapshot.exists()) {
                const analyticsData = {
                    totalStudyTime: 0,
                    lessonsCompleted: 0,
                    coursesCompleted: 0,
                    dailyActivity: {},
                    weeklyActivity: {},
                    monthlyActivity: {},
                    favoriteCategories: {},
                    learningStreak: 0,
                    currentStreak: 0,
                    longestStreak: 0,
                    lastActiveDate: null,
                    createdAt: new Date().toISOString(),
                    achievements: {}
                };
                await set(analyticsRef, analyticsData);
                return analyticsData;
            }
            
            return snapshot.val();
        } catch (error) {
            console.error('Error initializing user analytics:', error);
            throw error;
        }
    },

    updateLessonAnalytics: async (userId, courseId, lessonId, timeSpent, completionStatus) => {
        try {
            // Update lesson-specific analytics
            const lessonAnalyticsRef = ref(rtdb, `userAnalytics/${userId}/lessonDetails/${courseId}/${lessonId}`);
            const currentData = await get(lessonAnalyticsRef);
            const existingData = currentData.val() || {};
            
            const lessonData = {
                timeSpent: (existingData.timeSpent || 0) + timeSpent,
                completed: completionStatus,
                lastAccessed: new Date().toISOString(),
                accesses: (existingData.accesses || 0) + 1
                lastAccessed: new Date().toISOString()
            };
            await set(lessonAnalyticsRef, lessonData);
            
            const userAnalyticsRef = ref(rtdb, `userAnalytics/${userId}`);
            
            // Get current analytics data
            const snapshot = await get(userAnalyticsRef);
            const currentData = snapshot.val() || {};
            
            // Update streak tracking
            const today = new Date().toISOString().split('T')[0];
            let currentStreak = currentData.currentStreak || 0;
            let longestStreak = currentData.longestStreak || 0;
            const lastActiveDate = currentData.lastActiveDate;
            
            // Check if we need to update streak
            if (!lastActiveDate || lastActiveDate !== today) {
                const yesterday = new Date();
                yesterday.setDate(yesterday.getDate() - 1);
                const yesterdayStr = yesterday.toISOString().split('T')[0];
                
                if (lastActiveDate === yesterdayStr) {
                    // Continue streak
                    currentStreak++;
                } else {
                    // Reset streak (except for first day)
                    if (lastActiveDate) {
                        currentStreak = 1;
                    }
                }
                
                // Update longest streak if needed
                if (currentStreak > longestStreak) {
                    longestStreak = currentStreak;
                }
            }
            
            const userData = {
                totalStudyTime: (currentData.totalStudyTime || 0) + timeSpent,
                lessonsCompleted: completionStatus ? (currentData.lessonsCompleted || 0) + 1 : currentData.lessonsCompleted || 0,
                lastActiveDate: today,
                currentStreak: currentStreak,
                longestStreak: longestStreak
            };
            
            await update(userAnalyticsRef, userData);
            
            // Update daily activity
            const dailyActivityRef = ref(rtdb, `userAnalytics/${userId}/dailyActivity/${today}`);
            const dailySnapshot = await get(dailyActivityRef);
            const dailyData = dailySnapshot.val() || {};
            
            const updatedDailyData = {
                studyTime: (dailyData.studyTime || 0) + timeSpent,
                lessonsCompleted: completionStatus ? (dailyData.lessonsCompleted || 0) + 1 : dailyData.lessonsCompleted || 0
            };
            
            await set(dailyActivityRef, updatedDailyData);
            
            return true;
        } catch (error) {
            console.error('Error updating lesson analytics:', error);
            throw error;
        }
    },

    // Function to update detailed video analytics
    updateVideoAnalytics: async (userId, courseId, lessonId, videoEvents) => {
        try {
            // Update video-specific analytics
            const videoAnalyticsRef = ref(rtdb, `userAnalytics/${userId}/videoDetails/${courseId}/${lessonId}`);
            
            // Get existing video analytics data
            const snapshot = await get(videoAnalyticsRef);
            const existingData = snapshot.val() || {};
            
            // Merge new events with existing data
            const updatedData = {
                ...existingData,
                ...videoEvents,
                lastUpdated: new Date().toISOString()
            };
            
            await set(videoAnalyticsRef, updatedData);
            
            return true;
        } catch (error) {
            console.error('Error updating video analytics:', error);
            throw error;
        }
    },

    // Function to update course completion analytics
    updateCourseCompletionAnalytics: async (userId, courseId) => {
        try {
            // Update user overall analytics
            const userAnalyticsRef = ref(rtdb, `userAnalytics/${userId}`);
            
            // Get current analytics data
            const snapshot = await get(userAnalyticsRef);
            const currentData = snapshot.val() || {};
            
            const userData = {
                coursesCompleted: (currentData.coursesCompleted || 0) + 1
            };
            
            await update(userAnalyticsRef, userData);
            
            const courseCompletionRef = ref(rtdb, `userAnalytics/${userId}/completedCourses/${courseId}`);
            const courseData = {
                completedAt: new Date().toISOString(),
                completionStatus: true
            };
            await set(courseCompletionRef, courseData);
            
            return true;
        } catch (error) {
            console.error('Error updating course completion analytics:', error);
            throw error;
        }
    },

    getUserAnalytics: async (userId) => {
        try {
            const analyticsRef = ref(rtdb, 'userAnalytics/' + userId);
            const snapshot = await get(analyticsRef);
            
            if (snapshot.exists()) {
                return snapshot.val();
            }
            
            return null;
        } catch (error) {
            console.error('Error fetching user analytics:', error);
            throw error;
        }
    },

    // Helper function for increment operations
    increment: (value) => {
        // This would be implemented with Firebase's increment functionality
        // For now, we'll return the value for manual handling
        return value;
    },

    // Function to aggregate user analytics data
    aggregateUserAnalytics: async (userId) => {
        try {
            // Get user analytics data
            const analyticsRef = ref(rtdb, 'userAnalytics/' + userId);
            const analyticsSnapshot = await get(analyticsRef);
            
            if (!analyticsSnapshot.exists()) {
                return null;
            }
            
            const analyticsData = analyticsSnapshot.val();
            
            // Calculate additional metrics
            const aggregatedData = {
                ...analyticsData,
                averageStudyTimePerDay: 0,
                mostActiveDay: null,
                categoryDistribution: {}
            };
            
            // Calculate average study time per day
            if (analyticsData.dailyActivity) {
                const dailyActivity = analyticsData.dailyActivity;
                const totalDays = Object.keys(dailyActivity).length;
                let totalStudyTime = 0;
                let maxStudyTime = 0;
                let mostActiveDay = null;
                
                Object.entries(dailyActivity).forEach(([date, activity]) => {
                    totalStudyTime += activity.studyTime || 0;
                    
                    if ((activity.studyTime || 0) > maxStudyTime) {
                        maxStudyTime = activity.studyTime || 0;
                        mostActiveDay = date;
                    }
                });
                
                aggregatedData.averageStudyTimePerDay = totalDays > 0 ? totalStudyTime / totalDays : 0;
                aggregatedData.mostActiveDay = mostActiveDay;
            }
            
            // Calculate category distribution
            if (analyticsData.lessonDetails) {
                const lessonDetails = analyticsData.lessonDetails;
                const categoryCount = {};
                
                // This would require mapping lessons to categories
                // For now, we'll just return the existing favoriteCategories
                aggregatedData.categoryDistribution = analyticsData.favoriteCategories || {};
            }
            
            return aggregatedData;
        } catch (error) {
            console.error('Error aggregating user analytics:', error);
            throw error;
        }
    },

    // Function to get user analytics trends
    getUserAnalyticsTrends: async (userId, days = 30) => {
        try {
            // Get user analytics data
            const analyticsRef = ref(rtdb, 'userAnalytics/' + userId);
            const analyticsSnapshot = await get(analyticsRef);
            
            if (!analyticsSnapshot.exists()) {
                return null;
            }
            
            const analyticsData = analyticsSnapshot.val();
            
            // Get daily activity for the specified number of days
            const dailyActivity = analyticsData.dailyActivity || {};
            const dates = Object.keys(dailyActivity).sort();
            
            // Get the last N days
            const recentDates = dates.slice(-days);
            
            // Prepare trend data
            const trendData = {
                studyTime: [],
                lessonsCompleted: [],
                dates: recentDates
            };
            
            recentDates.forEach(date => {
                const activity = dailyActivity[date] || {};
                trendData.studyTime.push(activity.studyTime || 0);
                trendData.lessonsCompleted.push(activity.lessonsCompleted || 0);
            });
            
            return trendData;
        } catch (error) {
            console.error('Error getting user analytics trends:', error);
            throw error;
        }
    },

    // Function to get a single user
    getUser: async (userId) => {
        try {
            const userRef = ref(rtdb, 'users/' + userId);
            const snapshot = await get(userRef);
            const userData = snapshot.val();

            if (userData) {
                return { id: userId, ...userData };
            }

            return null;
        } catch (error) {
            console.error('Error fetching user:', error);
            throw error;
        }
    },

    getUserEnrollments: async (userId) => {
        try {
            const enrollmentsRef = ref(rtdb, 'enrollments');
            const enrollmentsQuery = query(enrollmentsRef, orderByChild('userId'), equalTo(userId));
            const snapshot = await get(enrollmentsQuery);
            const enrollmentsData = snapshot.val();

            const enrollments = [];
            if (enrollmentsData) {
                Object.keys(enrollmentsData).forEach(key => {
                    enrollments.push({ id: key, ...enrollmentsData[key] });
                });
            }

            return enrollments;
        } catch (error) {
            console.error('Error fetching user enrollments:', error);
            throw error;
        }
    },

    enrollUserInCourse: async (userId, courseId) => {
        try {
            const enrollmentsRef = ref(rtdb, 'enrollments');
            const snapshot = await get(enrollmentsRef);
            const enrollmentsData = snapshot.val();

            if (enrollmentsData) {
                for (const key in enrollmentsData) {
                    if (enrollmentsData[key].userId === userId && enrollmentsData[key].courseId === courseId) {
                        console.log('Enrollment already exists for user and course');
                        return { id: key, ...enrollmentsData[key] };
                    }
                }
            }

            const enrollmentData = {
                userId: userId,
                courseId: courseId,
                enrolledAt: new Date().toISOString(),
                progress: 0,
                completedLessons: []
            };

            const newEnrollmentRef = push(enrollmentsRef);
            await set(newEnrollmentRef, enrollmentData);

            return { id: newEnrollmentRef.key, ...enrollmentData };
        } catch (error) {
            console.error('Error enrolling user in course:', error);
            throw error;
        }
    },

    updateLessonProgress: async (enrollmentId, lessonId, progress) => {
        try {
            const enrollmentRef = ref(rtdb, 'enrollments/' + enrollmentId);
            const enrollmentSnapshot = await get(enrollmentRef);
            const enrollmentData = enrollmentSnapshot.val();

            if (!enrollmentData) {
                throw new Error('Enrollment not found');
            }

            let completedLessons = enrollmentData.completedLessons || [];

            if (!completedLessons.includes(lessonId)) {
                completedLessons = [...completedLessons, lessonId];
            }

            const updatedData = {
                completedLessons: completedLessons,
                progress: progress,
                lastAccessed: new Date().toISOString()
            };

            await set(enrollmentRef, {...enrollmentData, ...updatedData});
            return { ...enrollmentData, ...updatedData };
        } catch (error) {
            console.error('Error updating lesson progress:', error);
            throw error;
        }
    },

    deleteEnrollment: async (enrollmentId, userId) => {
        try {
            const enrollmentRef = ref(rtdb, 'enrollments/' + enrollmentId);
            const enrollmentSnapshot = await get(enrollmentRef);
            const enrollmentData = enrollmentSnapshot.val();

            if (!enrollmentData) {
                throw new Error('Enrollment not found');
            }

            if (enrollmentData.userId !== userId) {
                throw new Error('User does not have permission to delete this enrollment');
            }

            await remove(enrollmentRef);
            console.log('Enrollment deleted successfully');
            return true;
        } catch (error) {
            console.error('Error deleting enrollment:', error);
            throw error;
        }
    },
    
    getAchievements: async () => {
        try {
            const defaultAchievements = [
                {
                    id: 'first_course',
                    name: 'First Steps',
                    description: 'Complete your first course',
                    icon: 'beginner',
                    criteria: { coursesCompleted: 1 }
                },
                {
                    id: 'five_courses',
                    name: 'Learning Enthusiast',
                    description: 'Complete 5 courses',
                    icon: 'enthusiast',
                    criteria: { coursesCompleted: 5 }
                },
                {
                    id: 'ten_courses',
                    name: 'Knowledge Seeker',
                    description: 'Complete 10 courses',
                    icon: 'seeker',
                    criteria: { coursesCompleted: 10 }
                },
                {
                    id: 'streak_7',
                    name: 'Week Warrior',
                    description: 'Maintain a 7-day learning streak',
                    icon: 'warrior',
                    criteria: { learningStreak: 7 }
                },
                {
                    id: 'streak_30',
                    name: 'Month Master',
                    description: 'Maintain a 30-day learning streak',
                    icon: 'master',
                    criteria: { learningStreak: 30 }
                },
                {
                    id: 'study_10_hours',
                    name: 'Dedicated Learner',
                    description: 'Study for 10 hours total',
                    icon: 'dedicated',
                    criteria: { totalStudyTime: 36000 }
                }
            ];
            
            return defaultAchievements;
        } catch (error) {
            console.error('Error fetching achievements:', error);
            throw error;
        }
    },
    
    checkAchievementEarned: async (userId, achievement) => {
        try {
            // Get user analytics
            const analyticsRef = ref(rtdb, 'userAnalytics/' + userId);
            const snapshot = await get(analyticsRef);
            
            if (!snapshot.exists()) {
                return false;
            }
            
            const analytics = snapshot.val();
            
            if (achievement.criteria.coursesCompleted) {
                return (analytics.coursesCompleted || 0) >= achievement.criteria.coursesCompleted;
            }
            
            if (achievement.criteria.learningStreak) {
                return (analytics.currentStreak || 0) >= achievement.criteria.learningStreak;
            }
            
            if (achievement.criteria.totalStudyTime) {
                return (analytics.totalStudyTime || 0) >= achievement.criteria.totalStudyTime;
            }
            
            return false;
        } catch (error) {
            console.error('Error checking achievement:', error);
            return false;
        }
    },
    
    getUserAchievements: async (userId) => {
        try {
            const achievements = await window.firebaseServices.getAchievements();
            const earnedAchievements = [];
            
            for (const achievement of achievements) {
                const earned = await window.firebaseServices.checkAchievementEarned(userId, achievement);
                earnedAchievements.push({
                    ...achievement,
                    earned: earned
                });
            }
            
            return earnedAchievements;
        } catch (error) {
            console.error('Error fetching user achievements:', error);
            throw error;
        }
    },
    
    // Function to track recommendation interactions
    trackRecommendationInteraction: async (userId, courseId, interactionType) => {
        try {
            const { ref, get, update } = await import("firebase/database");
            const interactionsRef = ref(rtdb, `userAnalytics/${userId}/recommendationInteractions/${courseId}`);
            const snapshot = await get(interactionsRef);
            
            const interactionData = {
                type: interactionType,
                timestamp: new Date().toISOString()
            };
            
            if (snapshot.exists()) {
                // Update existing interaction
                await update(interactionsRef, interactionData);
            } else {
                // Create new interaction
                await set(interactionsRef, interactionData);
            }
            
            return interactionData;
        } catch (error) {
            console.error('Error tracking recommendation interaction:', error);
            throw error;
        }
    },
    
    // Function to get user's recommendation interactions
    getUserRecommendationInteractions: async (userId) => {
        try {
            const { ref, get } = await import("firebase/database");
            const interactionsRef = ref(rtdb, `userAnalytics/${userId}/recommendationInteractions`);
            const snapshot = await get(interactionsRef);
            
            if (!snapshot.exists()) {
                return {};
            }
            
            return snapshot.val();
        } catch (error) {
            console.error('Error fetching user recommendation interactions:', error);
            throw error;
        }
    },
    
    // Function to update user's favorite categories based on interactions
    updateUserFavoriteCategories: async (userId) => {
        try {
            const interactions = await firebaseServices.getUserRecommendationInteractions(userId);
            const categoryCount = {};
            
            // Count interactions per category
            for (const courseId in interactions) {
                const course = await firebaseServices.getCourse(courseId);
                if (course && course.categories) {
                    course.categories.forEach(category => {
                        categoryCount[category] = (categoryCount[category] || 0) + 1;
                    });
                }
            }
            
            // Update user analytics with favorite categories
            const { ref, update } = await import("firebase/database");
            const analyticsRef = ref(rtdb, `userAnalytics/${userId}`);
            await update(analyticsRef, { favoriteCategories: categoryCount });
            
            return categoryCount;
        } catch (error) {
            console.error('Error updating user favorite categories:', error);
            throw error;
        }
    },
    
    // Smart search function for courses
    smartSearchCourses: async (query, filters = {}) => {
        try {
            const courses = await firebaseServices.getCourses();
            const filteredCourses = courses.filter(course => {
                // Filter by query
                if (query) {
                    const lowerCaseQuery = query.toLowerCase();
                    if (!course.title.toLowerCase().includes(lowerCaseQuery) &&
                        !course.description.toLowerCase().includes(lowerCaseQuery)) {
                        return false;
                    }
                }
                
                // Filter by language
                if (filters.language && course.language !== filters.language) {
                    return false;
                }
                
                // Filter by category
                if (filters.category && !course.categories.includes(filters.category)) {
                    return false;
                }
                
                return true;
            });
            
            return filteredCourses;
        } catch (error) {
            console.error('Error performing smart search:', error);
            throw error;
        }
    },
    
    // Get available languages for filtering
    getAvailableLanguages: async () => {
        try {
            const courses = await firebaseServices.getCourses();
            const languages = new Set();
            
            courses.forEach(course => {
                if (course.language) {
                    languages.add(course.language);
                }
            });
            
            return Array.from(languages);
        } catch (error) {
            console.error('Error fetching available languages:', error);
            throw error;
        }
    },
    
    // Get course categories with counts
    getCourseCategoriesWithCounts: async () => {
        try {
            const courses = await firebaseServices.getCourses();
            const categoryCount = {};
            
            courses.forEach(course => {
                if (course.categories) {
                    course.categories.forEach(category => {
                        categoryCount[category] = (categoryCount[category] || 0) + 1;
                    });
                }
            });
            
            return categoryCount;
        } catch (error) {
            console.error('Error fetching course categories with counts:', error);
            throw error;
        }
    },
    
    // Function to update user streak and consistency data
    updateUserStreakData: async (userId) => {
        try {
            const { ref, get, update } = await import("firebase/database");
            const analyticsRef = ref(rtdb, `userAnalytics/${userId}`);
            const snapshot = await get(analyticsRef);
            
            if (!snapshot.exists()) {
                return null;
            }
            
            const analytics = snapshot.val();
            const dailyActivity = analytics.dailyActivity || {};
            const today = new Date().toISOString().split('T')[0];
            
            // Get sorted dates
            const dates = Object.keys(dailyActivity).sort();
            
            // Calculate current streak
            let currentStreak = 0;
            let currentDate = new Date();
            
            // Check backwards from today to count consecutive days with activity
            while (true) {
                const checkDate = currentDate.toISOString().split('T')[0];
                if (dailyActivity[checkDate] && 
                    (dailyActivity[checkDate].studyTime > 0 || 
                     dailyActivity[checkDate].lessonsCompleted > 0)) {
                    currentStreak++;
                    currentDate.setDate(currentDate.getDate() - 1);
                } else {
                    break;
                }
            }
            
            // Calculate longest streak
            let longestStreak = currentStreak;
            if (dates.length > 0) {
                let tempStreak = 0;
                let previousDate = null;
                
                for (const date of dates) {
                    const currentDateObj = new Date(date);
                    
                    if (previousDate) {
                        const diffTime = previousDate - currentDateObj;
                        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                        
                        if (diffDays === 1) {
                            // Consecutive day
                            tempStreak++;
                        } else {
                            // Break in streak
                            longestStreak = Math.max(longestStreak, tempStreak);
                            tempStreak = 1;
                        }
                    } else {
                        tempStreak = 1;
                    }
                    
                    previousDate = currentDateObj;
                }
                
                longestStreak = Math.max(longestStreak, tempStreak);
            }
            
            // Update analytics with streak data
            const updatedData = {
                learningStreak: currentStreak,
                longestLearningStreak: longestStreak,
                lastActiveDate: today
            };
            
            await update(analyticsRef, updatedData);
            
            return {
                ...analytics,
                ...updatedData
            };
        } catch (error) {
            console.error('Error updating user streak data:', error);
            throw error;
        }
    },
    
    // Function to get detailed learning patterns
    getLearningPatterns: async (userId) => {
        try {
            const analytics = await firebaseServices.getUserAnalytics(userId);
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
            const peakHours = firebaseServices.findPeakLearningHours(dailyActivity);
            
            // Calculate learning velocity (improvement over time)
            const learningVelocity = firebaseServices.calculateLearningVelocity(dailyActivity);
            
            // Calculate weekly averages
            const weeklyAverages = firebaseServices.calculateWeeklyAverages(dailyActivity);
            
            // Calculate category distribution
            const categoryDistribution = analytics.favoriteCategories || {};
            
            return {
                consistency: Math.round(consistency),
                avgStudyTime: Math.round(avgStudyTime),
                totalTimeStudied: Math.round(totalTimeStudied),
                peakHours: peakHours,
                learningVelocity: learningVelocity,
                activeDays: activeDays,
                totalDays: totalDays,
                weeklyAverages: weeklyAverages,
                categoryDistribution: categoryDistribution,
                longestStreak: analytics.longestLearningStreak || 0,
                currentStreak: analytics.learningStreak || 0
            };
        } catch (error) {
            console.error('Error getting learning patterns:', error);
            throw error;
        }
    },
    
    // Find peak learning hours
    findPeakLearningHours: (dailyActivity) => {
        // This is a simplified version - in a real implementation, 
        // we would have more granular time data
        const hourCounts = {};
        
        // For now, we'll distribute activity across morning/afternoon/evening
        let morning = 0;
        let afternoon = 0;
        let evening = 0;
        
        Object.values(dailyActivity).forEach(activity => {
            if (activity.studyTime > 0) {
                // Distribute based on study time
                const portion = activity.studyTime / 3;
                morning += portion;
                afternoon += portion;
                evening += portion;
            }
        });
        
        return {
            morning: Math.round((morning / (morning + afternoon + evening)) * 100) || 33,
            afternoon: Math.round((afternoon / (morning + afternoon + evening)) * 100) || 33,
            evening: Math.round((evening / (morning + afternoon + evening)) * 100) || 34
        };
    },
    
    // Calculate learning velocity
    calculateLearningVelocity: (dailyActivity) => {
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
    },
    
    // Calculate weekly averages
    calculateWeeklyAverages: (dailyActivity) => {
        const dates = Object.keys(dailyActivity).sort();
        if (dates.length === 0) return [];
        
        const weeks = [];
        let currentWeek = [];
        let currentWeekStart = new Date(dates[0]);
        currentWeekStart.setDate(currentWeekStart.getDate() - currentWeekStart.getDay()); // Start of week (Sunday)
        
        dates.forEach(date => {
            const dateObj = new Date(date);
            const weekStart = new Date(dateObj);
            weekStart.setDate(weekStart.getDate() - weekStart.getDay());
            
            // Check if this date belongs to the current week
            if (weekStart.getTime() === currentWeekStart.getTime()) {
                currentWeek.push(date);
            } else {
                // Save current week and start a new one
                if (currentWeek.length > 0) {
                    weeks.push({
                        start: currentWeekStart.toISOString().split('T')[0],
                        dates: [...currentWeek]
                    });
                }
                
                currentWeekStart = weekStart;
                currentWeek = [date];
            }
        });
        
        // Add the last week
        if (currentWeek.length > 0) {
            weeks.push({
                start: currentWeekStart.toISOString().split('T')[0],
                dates: currentWeek
            });
        }
        
        // Calculate averages for each week
        return weeks.map(week => {
            let totalStudyTime = 0;
            let totalLessons = 0;
            let activeDays = 0;
            
            week.dates.forEach(date => {
                const activity = dailyActivity[date];
                if (activity.studyTime > 0) {
                    activeDays++;
                }
                totalStudyTime += activity.studyTime || 0;
                totalLessons += activity.lessonsCompleted || 0;
            });
            
            return {
                weekStart: week.start,
                avgDailyStudyTime: activeDays > 0 ? Math.round(totalStudyTime / activeDays) : 0,
                totalStudyTime: Math.round(totalStudyTime),
                lessonsCompleted: totalLessons,
                activeDays: activeDays
            };
        });
    },
    
    // Function to get user engagement score
    getUserEngagementScore: async (userId) => {
        try {
            const analytics = await firebaseServices.getUserAnalytics(userId);
            if (!analytics) return 0;
            
            // Calculate engagement score based on multiple factors
            let score = 0;
            
            // Factor 1: Consistency (30% weight)
            const consistency = analytics.dailyActivity ? 
                (Object.values(analytics.dailyActivity).filter(a => a.studyTime > 0).length / 
                 Object.keys(analytics.dailyActivity).length) * 100 : 0;
            score += consistency * 0.3;
            
            // Factor 2: Total study time (25% weight)
            const totalStudyTimeHours = (analytics.totalStudyTime || 0) / 3600;
            score += Math.min(100, totalStudyTimeHours * 2) * 0.25; // Cap at 100
            
            // Factor 3: Courses completed (20% weight)
            score += Math.min(100, (analytics.coursesCompleted || 0) * 10) * 0.20; // Cap at 100
            
            // Factor 4: Lessons completed (15% weight)
            score += Math.min(100, (analytics.lessonsCompleted || 0) * 2) * 0.15; // Cap at 100
            
            // Factor 5: Streak (10% weight)
            score += Math.min(100, (analytics.learningStreak || 0) * 5) * 0.10; // Cap at 100
            
            return Math.round(score);
        } catch (error) {
            console.error('Error calculating user engagement score:', error);
            return 0;
        }
    },
    
    // Function to calculate video engagement score
    calculateVideoEngagementScore: (videoEvents) => {
        if (!videoEvents) return 0;
        
        // Calculate engagement based on play/pause ratio and seek behavior
        const playEvents = videoEvents.playEvents || 0;
        const pauseEvents = videoEvents.pauseEvents || 0;
        const seekEvents = videoEvents.seekEvents || 0;
        
        // Base score on play/pause ratio (more pauses might indicate more engagement)
        const playPauseRatio = pauseEvents > 0 ? playEvents / pauseEvents : playEvents;
        
        // Penalty for excessive seeking (might indicate skimming)
        const seekPenalty = Math.min(50, seekEvents * 2); // Max 50 point penalty
        
        // Calculate score (0-100)
        let score = Math.min(100, playPauseRatio * 10 - seekPenalty);
        score = Math.max(0, score); // Ensure non-negative
        
        return Math.round(score);
    }
};

console.log('Firebase services exported to window.firebaseServices');
console.log('Available services:', Object.keys(window.firebaseServices));
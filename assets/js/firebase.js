// Firebase configuration and initialization for client-side
// This replaces the mock services with actual Firebase integration

// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged, fetchSignInMethodsForEmail } from "firebase/auth";
import { getFirestore, doc, collection, getDoc, getDocs, update } from "firebase/firestore";
import { getDatabase, ref, get, set, push, query, orderByChild, equalTo, remove } from "firebase/database";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
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
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);
const db = getFirestore(app);
const rtdb = getDatabase(app);

// Helper function to normalize different date formats
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

// Export services for use in other modules
window.firebaseServices = {
    auth,
    db,
    rtdb,
    app,
    // Auth methods - directly exported instead of dynamically imported
    signInWithEmailAndPassword: (email, password) => signInWithEmailAndPassword(auth, email, password),
    createUserWithEmailAndPassword: (email, password) => createUserWithEmailAndPassword(auth, email, password),
    signOut: () => signOut(auth),
    onAuthStateChanged: (callback) => onAuthStateChanged(auth, callback),
    fetchSignInMethodsForEmail: (email) => fetchSignInMethodsForEmail(auth, email),

    // Database methods - directly exported instead of dynamically imported
    getDoc: (reference) => getDoc(reference),
    getDocs: (query) => getDocs(query),
    doc: (path, id) => doc(db, path, id),
    collection: (path) => collection(db, path),
    ref: (path) => ref(rtdb, path),
    get: (reference) => get(reference),
    set: (reference, data) => set(reference, data),
    push: (reference) => push(reference),
    update: (reference, data) => update(reference, data),
    query: (reference, ...constraints) => query(reference, ...constraints),
    orderByChild: (path) => orderByChild(path),
    equalTo: (value) => equalTo(value),
    remove: (reference) => remove(reference),

    // Helper functions for data operations
    getCourses: async () => {
        try {
            // Fetch courses from Realtime Database
            const coursesRef = ref(rtdb, 'courses');
            const snapshot = await get(coursesRef);
            const coursesData = snapshot.val();

            // Convert object to array format
            const courses = [];
            if (coursesData) {
                Object.keys(coursesData).forEach(key => {
                    courses.push({ id: key, ...coursesData[key] });
                });
            }

            // Sort courses by creation date (newest first)
            // Handle different date formats that might exist in the database
            courses.sort((a, b) => {
                // Get date values, with fallbacks
                const dateA = getNormalizedDate(a.createdAt || a.created || a.date || a.timestamp);
                const dateB = getNormalizedDate(b.createdAt || b.created || b.date || b.timestamp);

                // Sort in descending order (newest first)
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
            // Fetch categories from Realtime Database
            const categoriesRef = ref(rtdb, 'categories');
            const snapshot = await get(categoriesRef);
            const categoriesData = snapshot.val();

            // Convert object to array format
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

    // Function to create user in database
    createUserInDatabase: async (userData) => {
        try {
            console.log('Attempting to save user data to database:', userData);
            // Ensure we're not creating duplicate entries by checking if user already exists
            const userRef = ref(rtdb, 'users/' + userData.uid);
            const snapshot = await get(userRef);

            if (snapshot.exists()) {
                console.log('User already exists in database, updating instead of creating duplicate');
                // Update existing user data instead of creating duplicate
                await set(userRef, {...snapshot.val(), ...userData});
            } else {
                // Create new user entry
                await set(userRef, userData);
            }

            console.log('User data saved to database:', userData);
            return userData;
        } catch (error) {
            console.error('Error saving user to database:', error);
            throw error;
        }
    },

    // Function to initialize detailed analytics for a user
    initializeUserAnalytics: async (userId) => {
        try {
            const { ref, get, set } = await import("firebase/database");
            const analyticsRef = ref(rtdb, 'userAnalytics/' + userId);
            const snapshot = await get(analyticsRef);
            
            // If analytics data doesn't exist, create it
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
                    lastActiveDate: null,
                    createdAt: new Date().toISOString()
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

    // Function to update lesson analytics
    updateLessonAnalytics: async (userId, courseId, lessonId, timeSpent, completionStatus) => {
        try {
            const { ref, get, update } = await import("firebase/database");
            
            // Update lesson-specific analytics
            const lessonAnalyticsRef = ref(rtdb, `userAnalytics/${userId}/lessonDetails/${courseId}/${lessonId}`);
            const lessonData = {
                timeSpent: timeSpent,
                completed: completionStatus,
                lastAccessed: new Date().toISOString(),
                accesses: firebaseServices.increment(1)
            };
            await update(lessonAnalyticsRef, lessonData);
            
            // Update user overall analytics
            const userAnalyticsRef = ref(rtdb, `userAnalytics/${userId}`);
            const userData = {
                totalStudyTime: firebaseServices.increment(timeSpent),
                lessonsCompleted: completionStatus ? firebaseServices.increment(1) : 0,
                lastActiveDate: new Date().toISOString()
            };
            await update(userAnalyticsRef, userData);
            
            // Update daily activity
            const today = new Date().toISOString().split('T')[0];
            const dailyActivityRef = ref(rtdb, `userAnalytics/${userId}/dailyActivity/${today}`);
            const dailyData = {
                studyTime: firebaseServices.increment(timeSpent),
                lessonsCompleted: completionStatus ? firebaseServices.increment(1) : 0
            };
            await update(dailyActivityRef, dailyData);
            
            return true;
        } catch (error) {
            console.error('Error updating lesson analytics:', error);
            throw error;
        }
    },

    // Function to update course completion analytics
    updateCourseCompletionAnalytics: async (userId, courseId) => {
        try {
            const { ref, update } = await import("firebase/database");
            
            // Update user overall analytics
            const userAnalyticsRef = ref(rtdb, `userAnalytics/${userId}`);
            const userData = {
                coursesCompleted: firebaseServices.increment(1)
            };
            await update(userAnalyticsRef, userData);
            
            // Update course completion in user analytics
            const courseCompletionRef = ref(rtdb, `userAnalytics/${userId}/completedCourses/${courseId}`);
            const courseData = {
                completedAt: new Date().toISOString(),
                completionStatus: true
            };
            await update(courseCompletionRef, courseData);
            
            return true;
        } catch (error) {
            console.error('Error updating course completion analytics:', error);
            throw error;
        }
    },

    // Function to get user analytics
    getUserAnalytics: async (userId) => {
        try {
            const { ref, get } = await import("firebase/database");
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
            const { ref, get } = await import("firebase/database");
            
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
            const { ref, get } = await import("firebase/database");
            
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
            // Fetch enrollments from Realtime Database for this specific user
            // This is more efficient than fetching all enrollments and filtering
            const enrollmentsRef = ref(rtdb, 'enrollments');
            const enrollmentsQuery = query(enrollmentsRef, orderByChild('userId'), equalTo(userId));
            const snapshot = await get(enrollmentsQuery);
            const enrollmentsData = snapshot.val();

            // Convert to array format
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
            // First check if enrollment already exists
            const enrollmentsRef = ref(rtdb, 'enrollments');
            const snapshot = await get(enrollmentsRef);
            const enrollmentsData = snapshot.val();

            // Check if user is already enrolled in this course
            if (enrollmentsData) {
                for (const key in enrollmentsData) {
                    if (enrollmentsData[key].userId === userId && enrollmentsData[key].courseId === courseId) {
                        // Enrollment already exists, return it
                        console.log('Enrollment already exists for user and course');
                        return { id: key, ...enrollmentsData[key] };
                    }
                }
            }

            // Create new enrollment in Realtime Database
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
            // Update enrollment progress in Realtime Database
            const enrollmentRef = ref(rtdb, 'enrollments/' + enrollmentId);
            const enrollmentSnapshot = await get(enrollmentRef);
            const enrollmentData = enrollmentSnapshot.val();

            if (!enrollmentData) {
                throw new Error('Enrollment not found');
            }

            let completedLessons = enrollmentData.completedLessons || [];

            // Add lesson to completed lessons if not already there
            if (!completedLessons.includes(lessonId)) {
                completedLessons = [...completedLessons, lessonId];
            }

            // Update progress
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

    // Delete user enrollment
    deleteEnrollment: async (enrollmentId, userId) => {
        try {
            // Reference to the enrollment
            const enrollmentRef = ref(rtdb, 'enrollments/' + enrollmentId);

            // Get the enrollment data to verify ownership
            const enrollmentSnapshot = await get(enrollmentRef);
            const enrollmentData = enrollmentSnapshot.val();

            if (!enrollmentData) {
                throw new Error('Enrollment not found');
            }

            // Verify that the user owns this enrollment
            if (enrollmentData.userId !== userId) {
                throw new Error('User does not have permission to delete this enrollment');
            }

            // Delete the enrollment
            await remove(enrollmentRef);
            console.log('Enrollment deleted successfully');
            return true;
        } catch (error) {
            console.error('Error deleting enrollment:', error);
            throw error;
        }
    },
    
    // Function to get user achievements
    getAchievements: async () => {
        try {
            // Define default achievements
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
                    criteria: { totalStudyTime: 36000 } // 10 hours in seconds
                }
            ];
            
            return defaultAchievements;
        } catch (error) {
            console.error('Error fetching achievements:', error);
            throw error;
        }
    },
    
    // Function to check if user has earned an achievement
    checkAchievementEarned: async (userId, achievement) => {
        try {
            const { ref, get } = await import("firebase/database");
            
            // Get user analytics
            const analyticsRef = ref(rtdb, 'userAnalytics/' + userId);
            const snapshot = await get(analyticsRef);
            
            if (!snapshot.exists()) {
                return false;
            }
            
            const analytics = snapshot.val();
            
            // Check achievement criteria
            if (achievement.criteria.coursesCompleted) {
                return (analytics.coursesCompleted || 0) >= achievement.criteria.coursesCompleted;
            }
            
            if (achievement.criteria.learningStreak) {
                return (analytics.learningStreak || 0) >= achievement.criteria.learningStreak;
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
    
    // Function to get all earned achievements for a user
    getUserAchievements: async (userId) => {
        try {
            const achievements = await firebaseServices.getAchievements();
            const earnedAchievements = [];
            
            // Check which achievements have been earned
            for (const achievement of achievements) {
                const earned = await firebaseServices.checkAchievementEarned(userId, achievement);
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
    }
};
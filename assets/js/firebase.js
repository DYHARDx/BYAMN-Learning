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

    updateLessonAnalytics: async (userId, courseId, lessonId, timeSpent, completionStatus) => {
        try {
            const lessonAnalyticsRef = ref(rtdb, `userAnalytics/${userId}/lessonDetails/${courseId}/${lessonId}`);
            const currentData = await get(lessonAnalyticsRef);
            const existingData = currentData.val() || {};
            
            const lessonData = {
                timeSpent: (existingData.timeSpent || 0) + timeSpent,
                completed: completionStatus,
                lastAccessed: new Date().toISOString(),
                accesses: (existingData.accesses || 0) + 1
            };
            await update(lessonAnalyticsRef, lessonData);
            
            const userAnalyticsRef = ref(rtdb, `userAnalytics/${userId}`);
            const userSnapshot = await get(userAnalyticsRef);
            const userData = userSnapshot.val() || {};
            
            const updatedUserData = {
                totalStudyTime: (userData.totalStudyTime || 0) + timeSpent,
                lessonsCompleted: completionStatus ? (userData.lessonsCompleted || 0) + 1 : userData.lessonsCompleted || 0,
                lastActiveDate: new Date().toISOString()
            };
            await update(userAnalyticsRef, updatedUserData);
            
            const today = new Date().toISOString().split('T')[0];
            const dailyActivityRef = ref(rtdb, `userAnalytics/${userId}/dailyActivity/${today}`);
            const dailySnapshot = await get(dailyActivityRef);
            const dailyData = dailySnapshot.val() || {};
            
            const updatedDailyData = {
                studyTime: (dailyData.studyTime || 0) + timeSpent,
                lessonsCompleted: completionStatus ? (dailyData.lessonsCompleted || 0) + 1 : dailyData.lessonsCompleted || 0
            };
            await update(dailyActivityRef, updatedDailyData);
            
            return true;
        } catch (error) {
            console.error('Error updating lesson analytics:', error);
            throw error;
        }
    },

    updateCourseCompletionAnalytics: async (userId, courseId) => {
        try {
            const userAnalyticsRef = ref(rtdb, `userAnalytics/${userId}`);
            const snapshot = await get(userAnalyticsRef);
            const userData = snapshot.val() || {};
            
            const updatedData = {
                coursesCompleted: (userData.coursesCompleted || 0) + 1
            };
            await update(userAnalyticsRef, updatedData);
            
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
    }
};

console.log('Firebase services exported to window.firebaseServices');
console.log('Available services:', Object.keys(window.firebaseServices));
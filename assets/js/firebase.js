// Firebase configuration and initialization for client-side
// This replaces the mock services with actual Firebase integration

// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getDatabase } from "firebase/database";

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
    // Auth methods
    signInWithEmailAndPassword: (email, password) =>
        import("firebase/auth").then(({ signInWithEmailAndPassword }) =>
            signInWithEmailAndPassword(auth, email, password)),
    createUserWithEmailAndPassword: (email, password) =>
        import("firebase/auth").then(({ createUserWithEmailAndPassword }) =>
            createUserWithEmailAndPassword(auth, email, password)),
    signOut: () =>
        import("firebase/auth").then(({ signOut }) =>
            signOut(auth)),
    onAuthStateChanged: (callback) =>
        import("firebase/auth").then(({ onAuthStateChanged }) =>
            onAuthStateChanged(auth, callback)),
    fetchSignInMethodsForEmail: (email) =>
        import("firebase/auth").then(({ fetchSignInMethodsForEmail }) =>
            fetchSignInMethodsForEmail(auth, email)),

    // Database methods
    getDoc: (ref) =>
        import("firebase/firestore").then(({ getDoc }) =>
            getDoc(ref)),
    getDocs: (query) =>
        import("firebase/firestore").then(({ getDocs }) =>
            getDocs(query)),
    doc: (collection, id) =>
        import("firebase/firestore").then(({ doc }) =>
            doc(db, collection, id)),
    collection: (path) =>
        import("firebase/firestore").then(({ collection }) =>
            collection(db, path)),
    ref: (path) =>
        import("firebase/database").then(({ ref }) =>
            ref(rtdb, path)),
    get: (reference) =>
        import("firebase/database").then(({ get }) =>
            get(reference)),

    // Helper functions for data operations
    getCourses: async () => {
        try {
            // Fetch courses from Realtime Database
            const { ref, get } = await import("firebase/database");
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
            const { ref, get } = await import("firebase/database");
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
            const { ref, get, set, update } = await import("firebase/database");
            const userRef = ref(rtdb, 'users/' + userData.uid);
            const snapshot = await get(userRef);

            if (snapshot.exists()) {
                console.log('User already exists in database, updating instead of creating duplicate');
                // Update existing user data instead of creating duplicate
                await update(userRef, userData);
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

    // Function to get a single user
    getUser: async (userId) => {
        try {
            const { ref, get } = await import("firebase/database");
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
            const { ref, query, orderByChild, equalTo, get } = await import("firebase/database");
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
            const { ref, get, push, set } = await import("firebase/database");
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
            const { ref, get, update } = await import("firebase/database");
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

            await update(enrollmentRef, updatedData);
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
            const { ref, get, remove } = await import("firebase/database");
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
    }
};

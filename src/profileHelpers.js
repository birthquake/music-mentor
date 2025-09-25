// profileHelpers.js - Create this new file
import { 
  doc, 
  setDoc, 
  getDoc, 
  collection, 
  query, 
  where, 
  getDocs,
  updateDoc,
  addDoc,
  serverTimestamp
} from 'firebase/firestore';
import { db } from './firebase';

// Profile Data Schemas
export const createUserProfile = async (userId, profileData) => {
  try {
    await setDoc(doc(db, 'userProfiles', userId), {
      ...profileData,
      userId,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    return { success: true };
  } catch (error) {
    console.error('Error creating user profile:', error);
    return { success: false, error: error.message };
  }
};

export const createMentorProfile = async (userId, mentorData) => {
  try {
    await setDoc(doc(db, 'mentorProfiles', userId), {
      ...mentorData,
      userId,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    return { success: true };
  } catch (error) {
    console.error('Error creating mentor profile:', error);
    return { success: false, error: error.message };
  }
};

export const getUserProfile = async (userId) => {
  try {
    const docRef = doc(db, 'userProfiles', userId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return { success: true, profile: docSnap.data() };
    } else {
      return { success: false, error: 'Profile not found' };
    }
  } catch (error) {
    console.error('Error getting user profile:', error);
    return { success: false, error: error.message };
  }
};

export const getMentorProfile = async (userId) => {
  try {
    const docRef = doc(db, 'mentorProfiles', userId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return { success: true, profile: docSnap.data() };
    } else {
      return { success: false, error: 'Mentor profile not found' };
    }
  } catch (error) {
    console.error('Error getting mentor profile:', error);
    return { success: false, error: error.message };
  }
};

export const getAllMentors = async () => {
  try {
    const q = query(collection(db, 'mentorProfiles'), where('isActive', '==', true));
    const querySnapshot = await getDocs(q);
    const mentors = [];
    
    querySnapshot.forEach((doc) => {
      mentors.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    return { success: true, mentors };
  } catch (error) {
    console.error('Error getting mentors:', error);
    return { success: false, error: error.message };
  }
};

// Add these functions to your profileHelpers.js file

// Get display name for any user (checks both profile collections)
export const getUserDisplayName = async (userId, userEmail) => {
  try {
    // First try to get from user profile
    const userResult = await getUserProfile(userId);
    if (userResult.success && userResult.profile.displayName) {
      return userResult.profile.displayName;
    }

    // Then try mentor profile  
    const mentorResult = await getMentorProfile(userId);
    if (mentorResult.success && mentorResult.profile.displayName) {
      return mentorResult.profile.displayName;
    }

    // Fallback to email
    return userEmail || 'Unknown User';
  } catch (error) {
    console.error('Error getting display name:', error);
    return userEmail || 'Unknown User';
  }
};


export const getEnhancedMentors = async () => {
  try {
    const { success, mentors } = await getAllMentors();
    
    if (success && mentors.length > 0) {
      // Use profile data if available
      return mentors.map(mentor => ({
        id: mentor.userId,           // Firestore document ID (for backwards compatibility)
        userId: mentor.userId,       // Also include as userId for CalendarBooking
        name: mentor.displayName,
        email: mentor.userId,        // For backwards compatibility
        specialty: mentor.bio.substring(0, 50) + '...',
        experience: mentor.experience,
        rate: mentor.rate,
        rating: 4.8,                 // Default rating for now
        reviewCount: Math.floor(Math.random() * 200) + 50, // Random for now
        category: mentor.categories[0] || 'other',
        videoAvailable: true,
        tags: mentor.specialties || []
      }));
   } else {
  // Return empty array if no mentor profiles exist yet
  return [];
}
  } catch (error) {
  console.error('Error getting enhanced mentors:', error);
  // Return empty array on error too
  return [];
}
};

// Enhanced booking creation that includes profile names
export const createBookingWithProfiles = async (bookingData) => {
  try {
    // Get student display name
    const studentName = await getUserDisplayName(bookingData.userId, bookingData.userEmail);
    
    // Get mentor display name  
    const mentorName = await getUserDisplayName(bookingData.mentorId, '');

    // Create booking with profile names
    await addDoc(collection(db, 'bookings'), {
      ...bookingData,
      studentName,
      mentorName: mentorName || bookingData.mentorName, // fallback to existing
      createdAt: serverTimestamp()
    });

    return { success: true };
  } catch (error) {
    console.error('Error creating booking with profiles:', error);
    return { success: false, error: error.message };
  }
};

// Default profile structures
export const DEFAULT_USER_PROFILE = {
  firstName: '',
  lastName: '',
  displayName: '',
  bio: '',
  instrument: '',
  experienceLevel: 'beginner', // beginner, intermediate, advanced
  learningGoals: '',
  profileImageUrl: '',
  contactPreferences: {
    email: true,
    sms: false
  }
};

export const DEFAULT_MENTOR_PROFILE = {
  firstName: '',
  lastName: '',
  displayName: '',
  bio: '',
  tagline: '',
  specialties: [], // Array of specialties
  categories: [], // guitar, vocals, production, business, etc.
  experience: 0,
  credentials: '', // Text description
  teachingPhilosophy: '',
  rate: 35, // Default rate per 15min
  availability: {
    timeZone: 'America/New_York',
    weeklySchedule: {
      monday: { available: false, slots: [] },
      tuesday: { available: false, slots: [] },
      wednesday: { available: false, slots: [] },
      thursday: { available: false, slots: [] },
      friday: { available: false, slots: [] },
      saturday: { available: false, slots: [] },
      sunday: { available: false, slots: [] }
    }
  },
  portfolio: {
    audioSamples: [], // Array of {title, url, description}
    videos: [], // Array of {title, url, description}
    achievements: [] // Array of text achievements
  },
  profileImageUrl: '',
  socialLinks: {
    website: '',
    instagram: '',
    youtube: '',
    spotify: ''
  },
  pricing: {
    standard: 35,
    premium: null, // For longer sessions
    package: null // For multi-session deals
  },
  isActive: true,
  featured: false
};

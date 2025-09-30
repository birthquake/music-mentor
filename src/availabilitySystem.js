// availabilitySystem.js - Calendar data structure and utilities

// Firebase imports at the top
import { collection, doc, getDoc, setDoc, query, where, getDocs } from 'firebase/firestore';
import { db } from './firebase';

// 1. Mentor Availability Data Structure (stored in Firestore)
const mentorAvailabilityExample = {
  mentorId: "mentor_123",
  mentorEmail: "sarah@musicmentor.com",
  timezone: "America/New_York", // Important for cross-timezone booking
  weeklySchedule: {
    // Days 0-6 (Sunday-Saturday)
    1: [ // Monday
      { start: "14:00", end: "18:00" }, // 2 PM - 6 PM
      { start: "19:00", end: "21:00" }  // 7 PM - 9 PM
    ],
    3: [ // Wednesday  
      { start: "10:00", end: "14:00" }  // 10 AM - 2 PM
    ],
    5: [ // Friday
      { start: "16:00", end: "20:00" }  // 4 PM - 8 PM
    ]
    // Days not listed = not available
  },
  // Optional: Block specific dates
  blockedDates: [
    "2025-10-15", // Vacation day
    "2025-10-22"  // Conference day
  ],
  // 15-minute session duration
  sessionDuration: 15
};

// 2. Time Slot Generation Function
export const generateAvailableSlots = (mentorAvailability, weeksAhead = 3) => {
  const slots = [];
  const startDate = new Date();
  startDate.setHours(0, 0, 0, 0); // Start from today
  
  // Generate slots for next N weeks
  for (let week = 0; week < weeksAhead; week++) {
    for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
      const currentDate = new Date(startDate);
      currentDate.setDate(startDate.getDate() + (week * 7) + dayOffset);
      
      const dayOfWeek = currentDate.getDay();
      const dateString = currentDate.toISOString().split('T')[0];
      
      // Skip if date is blocked
      if (mentorAvailability.blockedDates?.includes(dateString)) {
        continue;
      }
      
      // Check if mentor has availability for this day
      const daySchedule = mentorAvailability.weeklySchedule[dayOfWeek];
      if (!daySchedule) continue;
      
      // Generate 15-minute slots for each availability window
      daySchedule.forEach(timeBlock => {
        const startTime = parseTimeString(timeBlock.start);
        const endTime = parseTimeString(timeBlock.end);
        
        let currentSlot = new Date(currentDate);
        currentSlot.setHours(startTime.hours, startTime.minutes, 0, 0);
        
        const blockEnd = new Date(currentDate);
        blockEnd.setHours(endTime.hours, endTime.minutes, 0, 0);
        
        // Generate 15-minute slots
        while (currentSlot < blockEnd) {
          const slotEnd = new Date(currentSlot);
          slotEnd.setMinutes(currentSlot.getMinutes() + mentorAvailability.sessionDuration);
          
          // Don't include slots in the past
          if (currentSlot > new Date()) {
            slots.push({
              mentorId: mentorAvailability.mentorId,
              start: new Date(currentSlot),
              end: new Date(slotEnd),
              available: true, // Will be checked against bookings
              slotId: `${mentorAvailability.mentorId}_${currentSlot.getTime()}`
            });
          }
          
          currentSlot.setMinutes(currentSlot.getMinutes() + mentorAvailability.sessionDuration);
        }
      });
    }
  }
  
  return slots;
};

// 3. Utility Functions
const parseTimeString = (timeStr) => {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return { hours, minutes };
};

export const formatSlotTime = (date) => {
  return date.toLocaleString('en-US', {
    weekday: 'short',
    month: 'short', 
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
};

// 4. Check Slot Availability Against Existing Bookings (with 15-min buffer)
export const checkSlotAvailability = (slots, existingBookings) => {
  return slots.map(slot => {
    // Check if this slot conflicts with any existing booking OR the 15-min buffer after
    const isBooked = existingBookings.some(booking => {
      if (!booking.scheduledStart || !booking.scheduledEnd) return false;
      
      const bookingStart = booking.scheduledStart?.toDate ? booking.scheduledStart.toDate() : new Date(booking.scheduledStart);
      const bookingEnd = booking.scheduledEnd?.toDate ? booking.scheduledEnd.toDate() : new Date(booking.scheduledEnd);
      
      // Add 15-minute buffer after booking ends
      const bufferEnd = new Date(bookingEnd);
      bufferEnd.setMinutes(bufferEnd.getMinutes() + 15);
      
      // Check for overlap with booking OR buffer period
      return (slot.start < bufferEnd && slot.end > bookingStart);
    });
    
    return {
      ...slot,
      available: !isBooked
    };
  });
};
// 5. Group Slots by Date for UI Display
export const groupSlotsByDate = (slots) => {
  const grouped = {};
  
  slots.forEach(slot => {
    const dateKey = slot.start.toDateString();
    if (!grouped[dateKey]) {
      grouped[dateKey] = [];
    }
    grouped[dateKey].push(slot);
  });
  
  return grouped;
};

// 6. Sample Mentor Availability Data
export const SAMPLE_MENTOR_AVAILABILITY = [
  {
    mentorId: "1",
    mentorEmail: "sarah@musicmentor.com",
    mentorName: "Sarah Chen",
    timezone: "America/New_York",
    weeklySchedule: {
      1: [{ start: "14:00", end: "18:00" }], // Monday 2-6 PM
      3: [{ start: "10:00", end: "14:00" }], // Wednesday 10 AM-2 PM  
      5: [{ start: "16:00", end: "20:00" }]  // Friday 4-8 PM
    },
    sessionDuration: 15
  },
  {
    mentorId: "2", 
    mentorEmail: "marcus@musicmentor.com",
    mentorName: "Marcus Johnson",
    timezone: "America/Los_Angeles",
    weeklySchedule: {
      2: [{ start: "19:00", end: "22:00" }], // Tuesday 7-10 PM
      4: [{ start: "18:00", end: "21:00" }], // Thursday 6-9 PM
      6: [{ start: "09:00", end: "12:00" }]  // Saturday 9 AM-12 PM
    },
    sessionDuration: 15
  },
  {
    mentorId: "3",
    mentorEmail: "elena@musicmentor.com", 
    mentorName: "Elena Rodriguez",
    timezone: "America/Chicago",
    weeklySchedule: {
      1: [{ start: "17:00", end: "20:00" }], // Monday 5-8 PM
      2: [{ start: "17:00", end: "20:00" }], // Tuesday 5-8 PM
      4: [{ start: "17:00", end: "20:00" }]  // Thursday 5-8 PM
    },
    sessionDuration: 15
  },
  {
    mentorId: "4",
    mentorEmail: "rashiedtyre@gmail.com", // Your test account
    mentorName: "Your Test Mentor Profile",
    timezone: "America/New_York", 
    weeklySchedule: {
      0: [{ start: "10:00", end: "16:00" }], // Sunday 10 AM-4 PM (for testing)
      3: [{ start: "18:00", end: "21:00" }], // Wednesday 6-9 PM
      5: [{ start: "14:00", end: "17:00" }]  // Friday 2-5 PM
    },
    sessionDuration: 15
  }
];

// 7. Firebase Integration Functions
export const saveMentorAvailability = async (mentorId, availabilityData) => {
  try {
    await setDoc(doc(db, 'mentorAvailability', mentorId), availabilityData);
    console.log('Mentor availability saved successfully');
  } catch (error) {
    console.error('Error saving mentor availability:', error);
  }
};

export const getMentorAvailability = async (mentorId) => {
  try {
    const docRef = doc(db, 'mentorAvailability', mentorId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return docSnap.data();
    } else {
      console.log('No availability data found for mentor');
      return null;
    }
  } catch (error) {
    console.error('Error getting mentor availability:', error);
    return null;
  }
};

export const getMentorBookings = async (mentorId) => {
  try {
    const q = query(
      collection(db, 'bookings'), 
      where('mentorId', '==', mentorId)
    );
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })).filter(booking => {
      // Block availability for both pending and confirmed bookings
      return booking.status === 'confirmed' || booking.status === 'pending';
    });
  } catch (error) {
    console.error('Error getting mentor bookings:', error);
    return [];
  }
};

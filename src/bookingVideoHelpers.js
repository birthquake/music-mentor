// bookingVideoHelpers.js - Video room management for MusicMentor bookings

import { db } from './firebase';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { dailyVideoService, getMeetingUrl, isVideoEnabled } from './dailyVideoService';

/**
 * Creates a video room when a booking is confirmed
 * Integrates with your existing booking confirmation flow
 */
export const createVideoRoomForBooking = async (bookingId, bookingData) => {
  // Only proceed if video features are enabled and video was requested
  if (!isVideoEnabled()) {
    console.log('Video features not enabled - skipping room creation');
    return null;
  }

  if (!bookingData.videoPreferred) {
    console.log('Video not requested for booking:', bookingId);
    return null;
  }

  try {
    console.log('Creating video room for booking:', bookingId);
    
    // Create the Daily.co room
    const roomDetails = await dailyVideoService.createRoom(bookingId, bookingData);
    
    // Update the booking document with video room information
    const bookingRef = doc(db, 'bookings', bookingId);
    await updateDoc(bookingRef, {
      videoRoom: {
        roomName: roomDetails.roomName,
        roomUrl: roomDetails.roomUrl,
        roomId: roomDetails.roomId,
        expiresAt: roomDetails.expiresAt,
        createdAt: roomDetails.createdAt,
        meetingUrl: getMeetingUrl(roomDetails.roomName),
        status: 'ready'
      },
      updatedAt: new Date()
    });

    console.log('✅ Video room created successfully:', roomDetails.roomName);
    return roomDetails;

  } catch (error) {
    console.error('❌ Error creating video room:', error);
    
    // Don't fail the booking confirmation if video room creation fails
    // Just log the error and continue without video
    try {
      const bookingRef = doc(db, 'bookings', bookingId);
      await updateDoc(bookingRef, {
        videoRoom: {
          status: 'failed',
          error: error.message,
          createdAt: new Date()
        }
      });
    } catch (updateError) {
      console.error('Failed to update booking with video error:', updateError);
    }
    
    return null;
  }
};

/**
 * Enhanced booking confirmation that includes video room creation
 * Use this to replace your existing handleAcceptBooking function
 */
export const confirmBookingWithVideo = async (bookingId) => {
  try {
    // First, get the booking data
    const bookingRef = doc(db, 'bookings', bookingId);
    const bookingDoc = await getDoc(bookingRef);
    
    if (!bookingDoc.exists()) {
      throw new Error('Booking not found');
    }

    const bookingData = bookingDoc.data();
    console.log('Confirming booking:', bookingId, 'Video requested:', bookingData.videoPreferred);
    
    // Update booking status to confirmed (your existing logic)
    await updateDoc(bookingRef, {
      status: 'confirmed',
      confirmedAt: new Date()
    });

    // Create video room if requested
    const videoRoom = await createVideoRoomForBooking(bookingId, bookingData);

    const result = {
      success: true,
      bookingId,
      hasVideo: !!videoRoom,
      videoRoom,
      message: videoRoom 
        ? 'Booking confirmed! Video room is ready.' 
        : bookingData.videoPreferred 
          ? 'Booking confirmed! (Video room creation failed, but booking is still valid)'
          : 'Booking confirmed!'
    };

    console.log('✅ Booking confirmation complete:', result);
    return result;

  } catch (error) {
    console.error('❌ Error confirming booking:', error);
    throw new Error(`Failed to confirm booking: ${error.message}`);
  }
};

/**
 * Check if a booking has a video room and get access details
 */
export const getVideoRoomStatus = (bookingData) => {
  if (!bookingData.videoRoom) {
    return {
      hasVideo: false,
      status: bookingData.videoPreferred ? 'not-created' : 'not-requested'
    };
  }

  const { videoRoom } = bookingData;
  
  return {
    hasVideo: true,
    status: videoRoom.status || 'unknown',
    roomName: videoRoom.roomName,
    meetingUrl: videoRoom.meetingUrl,
    expiresAt: videoRoom.expiresAt,
    error: videoRoom.error
  };
};

/**
 * Check if a video session is accessible (within time window)
 */
export const canAccessVideoSession = (bookingData) => {
  if (!bookingData.scheduledStart || !bookingData.scheduledEnd) {
    return {
      canAccess: false,
      reason: 'No scheduled time set'
    };
  }

  const now = new Date();
  const sessionStart = new Date(bookingData.scheduledStart.seconds * 1000);
  const sessionEnd = new Date(bookingData.scheduledEnd.seconds * 1000);
  
  // Allow access 30 minutes before session start to 30 minutes after session end
  const accessStart = new Date(sessionStart.getTime() - 30 * 60 * 1000);
  const accessEnd = new Date(sessionEnd.getTime() + 30 * 60 * 1000);
  
  if (now < accessStart) {
    const minutesUntil = Math.ceil((accessStart.getTime() - now.getTime()) / (1000 * 60));
    return {
      canAccess: false,
      reason: `Video opens ${minutesUntil} minutes before session start`
    };
  }
  
  if (now > accessEnd) {
    return {
      canAccess: false,
      reason: 'Video session has ended'
    };
  }
  
  return {
    canAccess: true,
    sessionStart,
    sessionEnd
  };
};

/**
 * Get time until session starts (for display purposes)
 */
export const getSessionTimeStatus = (bookingData) => {
  if (!bookingData.scheduledStart) return 'Time not set';
  
  const now = new Date();
  const sessionStart = new Date(bookingData.scheduledStart.seconds * 1000);
  const diff = sessionStart.getTime() - now.getTime();
  
  if (diff <= 0) {
    const sessionEnd = new Date(bookingData.scheduledEnd.seconds * 1000);
    if (now <= sessionEnd) {
      return 'Session is live now!';
    } else {
      return 'Session completed';
    }
  }
  
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  
  if (hours > 24) {
    const days = Math.floor(hours / 24);
    return `Starts in ${days} day${days > 1 ? 's' : ''}`;
  } else if (hours > 0) {
    return `Starts in ${hours}h ${minutes}m`;
  } else {
    return `Starts in ${minutes}m`;
  }
};

/**
 * Clean up expired video rooms (call this periodically or on booking completion)
 */
export const cleanupVideoRoom = async (bookingId) => {
  if (!isVideoEnabled()) return;
  
  try {
    const bookingRef = doc(db, 'bookings', bookingId);
    const bookingDoc = await getDoc(bookingRef);
    
    if (!bookingDoc.exists()) return;

    const bookingData = bookingDoc.data();
    
    if (bookingData.videoRoom && bookingData.videoRoom.roomName) {
      console.log('Cleaning up video room:', bookingData.videoRoom.roomName);
      
      // Delete the Daily.co room
      await dailyVideoService.deleteRoom(bookingData.videoRoom.roomName);
      
      // Update booking to mark video room as cleaned up
      await updateDoc(bookingRef, {
        videoRoom: {
          ...bookingData.videoRoom,
          status: 'cleaned-up',
          cleanedUpAt: new Date()
        }
      });
      
      console.log('✅ Video room cleaned up for booking:', bookingId);
    }
  } catch (error) {
    console.error('❌ Error cleaning up video room:', error);
    // Don't throw - this is cleanup, not critical
  }
};

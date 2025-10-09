// notificationHelpers.js - Notification & Messaging System
import { db } from './firebase';
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  orderBy,
  onSnapshot,
  updateDoc,
  doc,
  serverTimestamp,
  getDocs,
  Timestamp,
  limit
} from 'firebase/firestore';

/* ============================================
   NOTIFICATIONS SYSTEM
   ============================================ */

/**
 * Create a notification for a user
 * @param {Object} notificationData - The notification details
 * @returns {Promise<Object>} Success/error result
 */
export const createNotification = async (notificationData) => {
  try {
    const {
      userId,
      type,
      title,
      message,
      bookingId,
      actionUrl
    } = notificationData;

    if (!userId) {
      throw new Error('userId is required for notifications');
    }

    const notificationRef = await addDoc(collection(db, 'notifications'), {
      userId,
      type,
      title,
      message,
      bookingId: bookingId || null,
      actionUrl: actionUrl || null,
      read: false,
      createdAt: serverTimestamp()
    });

    return {
      success: true,
      notificationId: notificationRef.id
    };
  } catch (error) {
    console.error('Error creating notification:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Get unread notification count for a user
 * @param {string} userId - The user's ID
 * @param {Function} callback - Callback with count
 * @returns {Function} Unsubscribe function
 */
export const subscribeToUnreadCount = (userId, callback) => {
  if (!userId) {
    callback(0);
    return () => {};
  }

  const q = query(
    collection(db, 'notifications'),
    where('userId', '==', userId),
    where('read', '==', false)
  );

  return onSnapshot(q, (snapshot) => {
    callback(snapshot.size);
  }, (error) => {
    console.error('Error subscribing to unread count:', error);
    callback(0);
  });
};

/**
 * Get all notifications for a user (real-time)
 * @param {string} userId - The user's ID
 * @param {Function} callback - Callback with notifications array
 * @returns {Function} Unsubscribe function
 */
export const subscribeToNotifications = (userId, callback) => {
  if (!userId) {
    callback([]);
    return () => {};
  }

  const q = query(
    collection(db, 'notifications'),
    where('userId', '==', userId),
    orderBy('createdAt', 'desc'),
    limit(20)
  );

  return onSnapshot(q, (snapshot) => {
    const notifications = [];
    snapshot.forEach((doc) => {
      notifications.push({
        id: doc.id,
        ...doc.data()
      });
    });
    callback(notifications);
  }, (error) => {
    console.error('Error subscribing to notifications:', error);
    callback([]);
  });
};

/**
 * Mark a notification as read
 * @param {string} notificationId - The notification ID
 * @returns {Promise<Object>} Success/error result
 */
export const markNotificationAsRead = async (notificationId) => {
  try {
    const notificationRef = doc(db, 'notifications', notificationId);
    await updateDoc(notificationRef, {
      read: true
    });

    return { success: true };
  } catch (error) {
    console.error('Error marking notification as read:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Mark all notifications as read for a user
 * @param {string} userId - The user's ID
 * @returns {Promise<Object>} Success/error result
 */
export const markAllNotificationsAsRead = async (userId) => {
  try {
    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', userId),
      where('read', '==', false)
    );

    const snapshot = await getDocs(q);
    const updates = [];

    snapshot.forEach((document) => {
      updates.push(
        updateDoc(doc(db, 'notifications', document.id), {
          read: true
        })
      );
    });

    await Promise.all(updates);

    return { success: true };
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/* ============================================
   MESSAGING SYSTEM
   ============================================ */

/**
 * Send a message in a booking conversation
 * @param {Object} messageData - The message details
 * @returns {Promise<Object>} Success/error result
 */
export const sendMessage = async (messageData) => {
  try {
    const {
      bookingId,
      senderId,
      senderName,
      receiverId,
      receiverName,
      message
    } = messageData;

    if (!bookingId || !senderId || !receiverId || !message) {
      throw new Error('Missing required fields for message');
    }

    // Create the message
    const messageRef = await addDoc(collection(db, 'messages'), {
      bookingId,
      senderId,
      senderName,
      receiverId,
      receiverName,
      message: message.trim(),
      read: false,
      createdAt: serverTimestamp()
    });

    // HARDCODED TEST - THIS SHOULD APPEAR IN FIREBASE!
    await createNotification({
      userId: receiverId,
      type: 'new_message',
      title: 'New Message',
      message: `${senderName} sent you a message`,
      bookingId,
      actionUrl: '/my-bookings?booking=' + bookingId + '&openMessages=true'
    });

    return {
      success: true,
      messageId: messageRef.id
    };
  } catch (error) {
    console.error('Error sending message:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Subscribe to messages for a booking (real-time)
 * @param {string} bookingId - The booking ID
 * @param {Function} callback - Callback with messages array
 * @returns {Function} Unsubscribe function
 */
export const subscribeToMessages = (bookingId, callback) => {
  if (!bookingId) {
    callback([]);
    return () => {};
  }

  const q = query(
    collection(db, 'messages'),
    where('bookingId', '==', bookingId),
    orderBy('createdAt', 'asc')
  );

  return onSnapshot(q, (snapshot) => {
    const messages = [];
    snapshot.forEach((doc) => {
      messages.push({
        id: doc.id,
        ...doc.data()
      });
    });
    callback(messages);
  }, (error) => {
    console.error('Error subscribing to messages:', error);
    callback([]);
  });
};

/**
 * Get unread message count for a booking
 * @param {string} bookingId - The booking ID
 * @param {string} userId - The current user's ID
 * @param {Function} callback - Callback with count
 * @returns {Function} Unsubscribe function
 */
export const subscribeToUnreadMessages = (bookingId, userId, callback) => {
  if (!bookingId || !userId) {
    callback(0);
    return () => {};
  }

  const q = query(
    collection(db, 'messages'),
    where('bookingId', '==', bookingId),
    where('receiverId', '==', userId),
    where('read', '==', false)
  );

  return onSnapshot(q, (snapshot) => {
    callback(snapshot.size);
  }, (error) => {
    console.error('Error subscribing to unread messages:', error);
    callback(0);
  });
};

/**
 * Mark messages as read
 * @param {string} bookingId - The booking ID
 * @param {string} userId - The current user's ID
 * @returns {Promise<Object>} Success/error result
 */
export const markMessagesAsRead = async (bookingId, userId) => {
  try {
    const q = query(
      collection(db, 'messages'),
      where('bookingId', '==', bookingId),
      where('receiverId', '==', userId),
      where('read', '==', false)
    );

    const snapshot = await getDocs(q);
    const updates = [];

    snapshot.forEach((document) => {
      updates.push(
        updateDoc(doc(db, 'messages', document.id), {
          read: true
        })
      );
    });

    await Promise.all(updates);

    return { success: true };
  } catch (error) {
    console.error('Error marking messages as read:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

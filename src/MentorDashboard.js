import React, { useState, useEffect } from 'react';
import { db } from './firebase';
import { 
  collection, 
  query, 
  where, 
  onSnapshot,
  doc,
  updateDoc,
  orderBy,
  Timestamp,
  getDoc,
  addDoc
} from 'firebase/firestore';
import { confirmBookingWithVideo } from './bookingVideoHelpers';
import { getVideoRoomStatus, canAccessVideoSession, getSessionTimeStatus } from './bookingVideoHelpers';
import { 
  ButtonSpinner, 
  SkeletonGrid,
  SkeletonStatsCard,
  FullPageLoading,
  useToast
} from './LoadingComponents';
import { createNotification, subscribeToUnreadMessages } from './notificationHelpers';
import MessagingComponent from './MessagingComponent';
import { playConfirmSound, playDeclineSound } from './notificationSounds';

/* ============================================
   ICONS
   ============================================ */
const ClockIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <circle cx="12" cy="12" r="10"></circle>
    <polyline points="12,6 12,12 16,14"></polyline>
  </svg>
);

const VideoIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <polygon points="23 7 16 12 23 17 23 7"></polygon>
    <rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
  </svg>
);

const CheckIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <polyline points="20,6 9,17 4,12"></polyline>
  </svg>
);

const XIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <line x1="18" y1="6" x2="6" y2="18"></line>
    <line x1="6" y1="6" x2="18" y2="18"></line>
  </svg>
);

const CalendarIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
    <line x1="16" y1="2" x2="16" y2="6"></line>
    <line x1="8" y1="2" x2="8" y2="6"></line>
    <line x1="3" y1="10" x2="21" y2="10"></line>
  </svg>
);

const TrendingUpIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline>
    <polyline points="17 6 23 6 23 12"></polyline>
  </svg>
);

const MessageIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
  </svg>
);

const InboxIcon = () => (
  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ opacity: 0.5 }}>
    <polyline points="22 12 16 12 14 15 10 15 8 12 2 12"></polyline>
    <path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"></path>
  </svg>
);

/* ============================================
   BOOKING CARD
   ============================================ */
const BookingCard = ({ booking, onAccept, onDecline, onOpenMessages }) => {
  const [loading, setLoading] = useState(false);
  const [studentName, setStudentName] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const { showToast } = useToast();

  useEffect(() => {
    const getStudentName = async () => {
      if (!booking.studentId && !booking.userId) return;
      
      try {
        const userId = booking.studentId || booking.userId;
        const userProfileRef = doc(db, 'userProfiles', userId);
        const userProfileSnap = await getDoc(userProfileRef);
        
        if (userProfileSnap.exists() && (userProfileSnap.data().name || userProfileSnap.data().displayName)) {
          const profileName = userProfileSnap.data().name || userProfileSnap.data().displayName;
          setStudentName(profileName);
        }
      } catch (error) {
        console.error('Error getting student name:', error);
      }
    };

    getStudentName();
  }, [booking.studentId, booking.userId]);

  useEffect(() => {
    if (!booking.id || !booking.mentorId) return;

    const unsubscribe = subscribeToUnreadMessages(
      booking.id, 
      booking.mentorId, 
      (count) => setUnreadCount(count)
    );

    return () => unsubscribe();
  }, [booking.id, booking.mentorId]);

  const displayName = studentName || booking.studentName || booking.userEmail?.split('@')[0] || 'Student';
  const displayInitials = studentName ? 
    studentName.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2) :
    (booking.userEmail?.charAt(0).toUpperCase() || 'S');

  const handleAccept = async () => {
    setLoading(true);
    try {
      await onAccept(booking.id);
    } catch (error) {
      console.error('Error accepting booking:', error);
      showToast('Error accepting booking. Please try again.', 'error');
    }
    setLoading(false);
  };

  const handleDecline = async () => {
    setLoading(true);
    try {
      await onDecline(booking.id);
    } catch (error) {
      console.error('Error declining booking:', error);
      showToast('Error declining booking. Please try again.', 'error');
    }
    setLoading(false);
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'Just now';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString() + ' at ' + date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
  };

  const getStatusBadge = (status) => {
    const badges = {
      pending: { color: '#fbbf24', bg: 'rgba(245, 158, 11, 0.15)', border: 'rgba(245, 158, 11, 0.3)', text: 'Pending Review' },
      confirmed: { color: '#34d399', bg: 'rgba(16, 185, 129, 0.15)', border: 'rgba(16, 185, 129, 0.3)', text: 'Confirmed' },
      declined: { color: '#f87171', bg: 'rgba(239, 68, 68, 0.15)', border: 'rgba(239, 68, 68, 0.3)', text: 'Declined' },
      completed: { color: '#a78bfa', bg: 'rgba(139, 92, 246, 0.15)', border: 'rgba(139, 92, 246, 0.3)', text: 'Completed' }
    };
    
    const badge = badges[status] || badges.pending;
    
    return (
      <span 
        style={{
          color: badge.color,
          backgroundColor: badge.bg,
          border: `1px solid ${badge.border}`,
          padding: '0.25rem 0.75rem',
          borderRadius: '9999px',
          fontSize: '0.75rem',
          fontWeight: '600',
          letterSpacing: '0.3px'
        }}
      >
        {badge.text}
      </span>
    );
  };

  return (
    <div className="booking-card" data-status={booking.status} data-booking-id={booking.id}>
      <div className="booking-header">
        <div className="booking-user">
          <div className="user-avatar">
            {displayInitials}
          </div>
          <div className="user-info">
            <h4>{displayName}</h4>
            <p className="booking-date">
              <CalendarIcon />
              Requested {formatDate(booking.createdAt)}
            </p>
          </div>
        </div>
        {getStatusBadge(booking.status)}
      </div>

      <div className="booking-details">
        <div className="booking-preferences">
          <div className="preference-item">
            <ClockIcon />
            <span>
              {booking.preferredTime 
                ? `Prefers ${booking.preferredTime}` 
                : booking.scheduledStart 
                  ? `Scheduled: ${new Date(booking.scheduledStart.seconds * 1000).toLocaleDateString()} at ${new Date(booking.scheduledStart.seconds * 1000).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`
                  : 'Time preference not specified'
              }
            </span>
          </div>
          {booking.videoPreferred && (
            <div className="preference-item">
              <VideoIcon />
              <span>Video session requested</span>
            </div>
          )}
          <div className="preference-item">
            <span className="rate">${booking.rate} for 15 minutes</span>
          </div>
        </div>

        <div className="booking-message">
          <h5>What they need help with:</h5>
          <p>"{booking.message}"</p>
        </div>
      </div>

      {booking.status === 'confirmed' && booking.videoPreferred && (
        <div className="video-access-section">
          {(() => {
            const videoStatus = getVideoRoomStatus(booking);
            const accessCheck = canAccessVideoSession(booking);
            
            if (!videoStatus.hasVideo) {
              return (
                <div className="video-status video-unavailable">
                  <VideoIcon />
                  <span>Video room setup failed</span>
                </div>
              );
            }
            
            if (videoStatus.status === 'ready' && accessCheck.canAccess) {
              return (
                <div className="video-ready">
                  <button 
                    onClick={() => window.open(videoStatus.meetingUrl, '_blank')}
                    className="join-video-btn"
                  >
                    <VideoIcon />
                    Join Video Session
                  </button>
                </div>
              );
            }
            
            return (
              <div className="video-status video-locked">
                <VideoIcon />
                <span>{accessCheck.reason}</span>
              </div>
            );
          })()}
        </div>
      )}

      {/* Message Button for Confirmed Bookings */}
      {booking.status === 'confirmed' && (
        <div className="booking-message-btn-container">
          <button 
            onClick={() => onOpenMessages(booking)}
            className="message-booking-btn"
          >
            <MessageIcon />
            Message Student
            {unreadCount > 0 && (
              <span className="message-badge">{unreadCount}</span>
            )}
          </button>
        </div>
      )}

      {booking.status === 'pending' && (
        <div className="booking-actions">
          <button 
            onClick={handleDecline}
            className="decline-btn"
            disabled={loading}
          >
            {loading ? <ButtonSpinner /> : <XIcon />}
            {loading ? 'Declining...' : 'Decline'}
          </button>
          <button 
            onClick={handleAccept}
            className="accept-btn"
            disabled={loading}
          >
            {loading ? <ButtonSpinner /> : <CheckIcon />}
            {loading ? 'Accepting...' : 'Accept Session'}
          </button>
        </div>
      )}
    </div>
  );
};

/* ============================================
   STATS CARD
   ============================================ */
const StatsCard = ({ title, value, icon, color, onClick, isActive }) => (
  <button 
    className={`stats-card ${isActive ? 'active' : ''}`}
    style={{ '--card-accent': color }}
    onClick={onClick}
  >
    <div className="stats-icon" style={{ background: color }}>
      {icon}
    </div>
    <div className="stats-content">
      <div className="stats-value">{value}</div>
      <div className="stats-title">{title}</div>
    </div>
  </button>
);

/* ============================================
   MAIN MENTOR DASHBOARD
   ============================================ */
const MentorDashboard = ({ user, mentorInfo }) => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('pending');
  const [messagingOpen, setMessagingOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const { showToast } = useToast();

  useEffect(() => {
    if (!user || !mentorInfo) {
      console.log('No user or mentorInfo:', { user: !!user, mentorInfo: !!mentorInfo });
      setLoading(false);
      return;
    }

    const q = collection(db, 'bookings');

    const unsubscribe = onSnapshot(q, 
      (querySnapshot) => {
        const bookingData = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          
          if (data.mentorId == mentorInfo.id || data.mentorId === user.uid || data.mentorId == user.uid) {
            bookingData.push({
              id: doc.id,
              ...data
            });
          }
        });
        
        const sortedBookings = bookingData.sort((a, b) => {
          const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
          const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
          return dateB - dateA;
        });

        setBookings(sortedBookings);
        setLoading(false);
      },
      (error) => {
        console.error('Error getting bookings:', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user, mentorInfo]);

  const handleAcceptBooking = async (bookingId) => {
    try {
      const bookingRef = doc(db, 'bookings', bookingId);
      const bookingSnap = await getDoc(bookingRef);
      
      if (!bookingSnap.exists()) {
        throw new Error('Booking not found');
      }

      const bookingData = bookingSnap.data();

      const result = await confirmBookingWithVideo(bookingId);
      console.log('Booking confirmed:', result.message);

      await createNotification({
        userId: bookingData.userId,
        type: 'booking_confirmed',
        title: 'Session Confirmed! 🎉',
        message: `${mentorInfo.displayName || 'Your mentor'} confirmed your session request`,
        bookingId: bookingId,
        actionUrl: '/my-bookings'
      });

      showToast('Session confirmed! The student has been notified.', 'success');
      playConfirmSound();

      // Flash the card green
      const card = document.querySelector(`[data-booking-id="${bookingId}"]`);
      if (card) {
        card.classList.add('status-confirmed-flash');
        setTimeout(() => card.classList.remove('status-confirmed-flash'), 1000);
      }

    } catch (error) {
      console.error('Error confirming booking:', error);
      throw error;
    }
  };

  const handleDeclineBooking = async (bookingId) => {
    try {
      const bookingRef = doc(db, 'bookings', bookingId);
      const bookingSnap = await getDoc(bookingRef);
      
      if (!bookingSnap.exists()) {
        throw new Error('Booking not found');
      }

      const bookingData = bookingSnap.data();

      await updateDoc(bookingRef, {
        status: 'declined',
        declinedAt: Timestamp.now()
      });

      await createNotification({
        userId: bookingData.userId,
        type: 'booking_declined',
        title: 'Session Update',
        message: `${mentorInfo.displayName || 'Your mentor'} is unavailable for your session request. Try booking another mentor!`,
        bookingId: bookingId,
        actionUrl: '/'
      });

      showToast('Session declined. The student has been notified.', 'info');
      playDeclineSound();

      // Fade the card briefly
      const card = document.querySelector(`[data-booking-id="${bookingId}"]`);
      if (card) {
        card.classList.add('status-declined-fade');
        setTimeout(() => card.classList.remove('status-declined-fade'), 800);
      }

    } catch (error) {
      console.error('Error declining booking:', error);
      throw error;
    }
  };

  const handleOpenMessages = (booking) => {
    setSelectedBooking(booking);
    setMessagingOpen(true);
  };

  const handleCloseMessages = () => {
    setMessagingOpen(false);
    setSelectedBooking(null);
  };

  const stats = {
    pending: bookings.filter(b => b.status === 'pending').length,
    confirmed: bookings.filter(b => b.status === 'confirmed').length,
    total: bookings.length,
    thisMonth: bookings.filter(b => {
      if (!b.createdAt) return false;
      const bookingDate = b.createdAt.toDate ? b.createdAt.toDate() : new Date(b.createdAt);
      const thisMonth = new Date();
      return bookingDate.getMonth() === thisMonth.getMonth() && 
             bookingDate.getFullYear() === thisMonth.getFullYear();
    }).length
  };

  const filteredBookings = bookings.filter(booking => {
    if (activeFilter === 'pending') return booking.status === 'pending';
    if (activeFilter === 'confirmed') return booking.status === 'confirmed';
    if (activeFilter === 'thisMonth') {
      if (!booking.createdAt) return false;
      const bookingDate = booking.createdAt.toDate ? booking.createdAt.toDate() : new Date(booking.createdAt);
      const thisMonth = new Date();
      return bookingDate.getMonth() === thisMonth.getMonth() && 
             bookingDate.getFullYear() === thisMonth.getFullYear();
    }
    return true;
  });

  const getSectionTitle = () => {
    const titles = {
      pending: 'Pending Requests',
      confirmed: 'Confirmed Sessions',
      thisMonth: 'This Month\'s Bookings',
      all: 'All Bookings'
    };
    return titles[activeFilter] || 'Bookings';
  };

  if (loading) {
    return <FullPageLoading message="Loading dashboard..." />;
  }

  if (!mentorInfo) {
    return (
      <div className="dashboard-container">
        <div className="not-mentor">
          <h2>Access Restricted</h2>
          <p>This dashboard is only available to registered mentors.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <div className="mentor-welcome">
          <h1>Hi, {mentorInfo.displayName?.split(' ')[0] || mentorInfo.displayName || 'there'}!</h1>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid">
        <StatsCard
          title="Pending Requests"
          value={stats.pending}
          icon={<ClockIcon />}
          color="#f59e0b"
          onClick={() => setActiveFilter('pending')}
          isActive={activeFilter === 'pending'}
        />
        <StatsCard
          title="Confirmed Sessions"
          value={stats.confirmed}
          icon={<CheckIcon />}
          color="#10b981"
          onClick={() => setActiveFilter('confirmed')}
          isActive={activeFilter === 'confirmed'}
        />
        <StatsCard
          title="This Month"
          value={stats.thisMonth}
          icon={<TrendingUpIcon />}
          color="#8b5cf6"
          onClick={() => setActiveFilter('thisMonth')}
          isActive={activeFilter === 'thisMonth'}
        />
        <StatsCard
          title="All Time"
          value={stats.total}
          icon={<CalendarIcon />}
          color="#3b82f6"
          onClick={() => setActiveFilter('all')}
          isActive={activeFilter === 'all'}
        />
      </div>

      {/* Bookings List */}
      <div className="bookings-section">
        <h2 className="section-heading">{getSectionTitle()}</h2>
        
        {filteredBookings.length === 0 ? (
          <div className="no-bookings">
            <InboxIcon />
            <h3>No {activeFilter === 'all' ? 'bookings' : getSectionTitle().toLowerCase()} yet</h3>
            <p>
              {activeFilter === 'pending' 
                ? 'New session requests from students will appear here.'
                : activeFilter === 'confirmed'
                ? 'Sessions you confirm will show up here with messaging and video options.'
                : 'When students book sessions with you, they\'ll appear here.'}
            </p>
          </div>
        ) : (
          <div className="bookings-grid">
            {filteredBookings.map(booking => (
              <BookingCard
                key={booking.id}
                booking={booking}
                onAccept={handleAcceptBooking}
                onDecline={handleDeclineBooking}
                onOpenMessages={handleOpenMessages}
              />
            ))}
          </div>
        )}
      </div>

      {/* Messaging */}
      {selectedBooking && (
        <MessagingComponent
          booking={selectedBooking}
          user={user}
          isOpen={messagingOpen}
          onClose={handleCloseMessages}
        />
      )}
    </div>
  );
};

export default MentorDashboard;

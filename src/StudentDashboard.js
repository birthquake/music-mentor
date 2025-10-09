import React, { useState, useEffect } from 'react';
import { db } from './firebase';
import { 
  collection, 
  query, 
  where, 
  onSnapshot,
  orderBy
} from 'firebase/firestore';
import { useLocation } from 'react-router-dom';  // NEW IMPORT
import { 
  ButtonSpinner, 
  SkeletonGrid,
  SkeletonStatsCard 
} from './LoadingComponents';
import { subscribeToUnreadMessages } from './notificationHelpers';
import MessagingComponent from './MessagingComponent';
import './MentorDashboard.css';

// CSS FIX for notification navigation
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement("style");
  styleSheet.textContent = `
    body {
      background: var(--bg-primary, #0f172a) !important;
      min-height: 100vh;
    }
    .App {
      background: var(--bg-primary, #0f172a) !important;
      min-height: 100vh;
    }
  `;
  if (!document.head.querySelector('style[data-student-dashboard]')) {
    styleSheet.setAttribute('data-student-dashboard', 'true');
    document.head.appendChild(styleSheet);
  }
}

// Video access helper functions with error handling
const canAccessVideoSession = (booking) => {
  try {
    if (!booking.videoRoom || booking.status !== 'confirmed') {
      return { canAccess: false, reason: 'not_available' };
    }

    const now = new Date();
    const scheduledStart = booking.scheduledStart?.toDate ? booking.scheduledStart.toDate() : new Date(booking.scheduledStart);
    const scheduledEnd = booking.scheduledEnd?.toDate ? booking.scheduledEnd.toDate() : new Date(booking.scheduledEnd);

    if (isNaN(scheduledStart.getTime()) || isNaN(scheduledEnd.getTime())) {
      console.error('Invalid date in booking:', booking);
      return { canAccess: false, reason: 'invalid_date' };
    }

    const accessStart = new Date(scheduledStart.getTime() - 30 * 60 * 1000);
    const accessEnd = new Date(scheduledEnd.getTime() + 30 * 60 * 1000);

    if (now < accessStart) {
      const minutesUntil = Math.floor((accessStart - now) / 60000);
      return { 
        canAccess: false, 
        reason: 'too_early',
        minutesUntil 
      };
    }

    if (now > accessEnd) {
      return { 
        canAccess: false, 
        reason: 'expired' 
      };
    }

    return { canAccess: true };
  } catch (error) {
    console.error('Error checking video access:', error);
    return { canAccess: false, reason: 'error' };
  }
};

const getTimeUntilSession = (scheduledStart) => {
  try {
    const start = scheduledStart?.toDate ? scheduledStart.toDate() : new Date(scheduledStart);
    
    if (isNaN(start.getTime())) {
      return 'Time unavailable';
    }
    
    const now = new Date();
    const diffMs = start - now;
    
    if (diffMs < 0) return 'Session started';
    
    const minutes = Math.floor(diffMs / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `in ${days} day${days > 1 ? 's' : ''}`;
    if (hours > 0) return `in ${hours} hour${hours > 1 ? 's' : ''}`;
    if (minutes > 0) return `in ${minutes} minute${minutes > 1 ? 's' : ''}`;
    return 'starting now';
  } catch (error) {
    console.error('Error calculating time until session:', error);
    return 'Time unavailable';
  }
};

// Icons
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

const CalendarIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
    <line x1="16" y1="2" x2="16" y2="6"></line>
    <line x1="8" y1="2" x2="8" y2="6"></line>
    <line x1="3" y1="10" x2="21" y2="10"></line>
  </svg>
);

const UserIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
    <circle cx="12" cy="7" r="4"></circle>
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

// Student Booking Card Component
const StudentBookingCard = ({ booking, onOpenMessages }) => {
  const [joiningVideo, setJoiningVideo] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // Subscribe to unread message count
  useEffect(() => {
    if (!booking.id || !booking.userId) return;

    const unsubscribe = subscribeToUnreadMessages(
      booking.id, 
      booking.userId, 
      (count) => setUnreadCount(count)
    );

    return () => unsubscribe();
  }, [booking.id, booking.userId]);

  const formatDate = (timestamp) => {
    try {
      if (!timestamp) return 'Just now';
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      if (isNaN(date.getTime())) return 'Date unavailable';
      return date.toLocaleDateString() + ' at ' + date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Date unavailable';
    }
  };

  const formatSessionTime = (start, end) => {
    try {
      if (!start) return '';
      const startDate = start.toDate ? start.toDate() : new Date(start);
      const endDate = end?.toDate ? end.toDate() : new Date(end);
      
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        return 'Time unavailable';
      }
      
      return `${startDate.toLocaleDateString()} at ${startDate.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit'
      })} - ${endDate.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit'
      })}`;
    } catch (error) {
      console.error('Error formatting session time:', error);
      return 'Time unavailable';
    }
  };

  const handleJoinVideo = () => {
    try {
      if (!booking.videoRoom?.meetingUrl) {
        alert('Video link is not available. Please contact your mentor.');
        return;
      }
      setJoiningVideo(true);
      window.open(booking.videoRoom.meetingUrl, '_blank');
      setTimeout(() => setJoiningVideo(false), 2000);
    } catch (error) {
      console.error('Error joining video:', error);
      alert('Unable to open video session. Please try again.');
      setJoiningVideo(false);
    }
  };

  const videoAccess = canAccessVideoSession(booking);

  const getStatusBadge = (status) => {
    const badges = {
      pending: { 
        color: '#f59e0b', 
        bg: '#fef3c7', 
        text: 'Awaiting Response',
        description: 'Your mentor will respond soon!'
      },
      confirmed: { 
        color: '#10b981', 
        bg: '#d1fae5', 
        text: 'Confirmed',
        description: 'Session confirmed! Get ready to learn.'
      },
      declined: { 
        color: '#ef4444', 
        bg: '#fecaca', 
        text: 'Declined',
        description: 'This mentor isn\'t available. Try booking with someone else!'
      },
      completed: { 
        color: '#6b7280', 
        bg: '#f3f4f6', 
        text: 'Completed',
        description: 'Hope you had a great session!'
      }
    };
    
    const badge = badges[status] || badges.pending;
    
    return (
      <div className="status-info">
        <span 
          style={{
            color: badge.color,
            backgroundColor: badge.bg,
            padding: '0.25rem 0.75rem',
            borderRadius: '9999px',
            fontSize: '0.75rem',
            fontWeight: '500'
          }}
        >
          {badge.text}
        </span>
        <p className="status-description">{badge.description}</p>
      </div>
    );
  };

  return (
    <div className="student-booking-card">
      <div className="booking-header">
        <div className="mentor-info">
          <div className="mentor-avatar">
            {booking.mentorName ? booking.mentorName.split(' ').map(n => n[0]).join('') : 'M'}
          </div>
          <div className="mentor-details">
            <h4>{booking.mentorName || 'Mentor'}</h4>
            <p className="booking-date">
              <CalendarIcon />
              Booked {formatDate(booking.createdAt)}
            </p>
          </div>
        </div>
        {getStatusBadge(booking.status)}
      </div>

      <div className="booking-content">
        <div className="session-details">
          {booking.scheduledStart && booking.status === 'confirmed' && (
            <div className="detail-item session-time-highlight">
              <ClockIcon />
              <span>{formatSessionTime(booking.scheduledStart, booking.scheduledEnd)}</span>
            </div>
          )}
          
          {!booking.scheduledStart && booking.preferredTime && (
            <div className="detail-item">
              <ClockIcon />
              <span>Preferred time: {booking.preferredTime}</span>
            </div>
          )}

          {booking.videoPreferred && (
            <div className="detail-item">
              <VideoIcon />
              <span>Video session requested</span>
            </div>
          )}
          <div className="detail-item">
            <span className="price-tag">${booking.rate || 0} for 15 minutes</span>
          </div>
        </div>

        {booking.message && (
          <div className="your-question">
            <h5>Your Question:</h5>
            <p>"{booking.message}"</p>
          </div>
        )}

        {booking.status === 'confirmed' && booking.videoRoom && (
          <div className="video-access-section">
            {videoAccess.canAccess ? (
              <button 
                className="join-video-btn"
                onClick={handleJoinVideo}
                disabled={joiningVideo}
              >
                {joiningVideo ? (
                  <ButtonSpinner />
                ) : (
                  <>
                    <VideoIcon />
                    Join Video Session
                  </>
                )}
              </button>
            ) : (
              <div className="video-waiting">
                {videoAccess.reason === 'too_early' && (
                  <>
                    <ClockIcon />
                    <span>
                      Video available {getTimeUntilSession(booking.scheduledStart)} 
                      (30 min before session)
                    </span>
                  </>
                )}
                {videoAccess.reason === 'expired' && (
                  <span style={{ color: 'var(--text-secondary)' }}>
                    Video session has ended
                  </span>
                )}
                {videoAccess.reason === 'invalid_date' && (
                  <span style={{ color: 'var(--text-secondary)' }}>
                    Session time unavailable
                  </span>
                )}
                {videoAccess.reason === 'error' && (
                  <span style={{ color: 'var(--text-secondary)' }}>
                    Unable to check video access
                  </span>
                )}
              </div>
            )}
          </div>
        )}

        {booking.status === 'confirmed' && !booking.videoRoom && booking.videoPreferred && (
          <div className="next-steps">
            <h5>Next Steps:</h5>
            <p>Your session is confirmed! Video call details will be available once your mentor finalizes the setup.</p>
          </div>
        )}

        {booking.status === 'confirmed' && !booking.videoPreferred && (
          <div className="next-steps">
            <h5>Next Steps:</h5>
            <p>Your session is confirmed! Your mentor will reach out with details for your session.</p>
          </div>
        )}
      </div>

      {/* Message Button for Confirmed Bookings */}
      {booking.status === 'confirmed' && (
        <div className="booking-message-btn-container">
          <button 
            onClick={() => onOpenMessages(booking)}
            className="message-booking-btn"
          >
            <MessageIcon />
            Message Mentor
            {unreadCount > 0 && (
              <span className="message-badge">{unreadCount}</span>
            )}
          </button>
        </div>
      )}
    </div>
  );
};

// Clickable Stats Component
const StudentStatsCard = ({ title, value, icon, color, onClick, isActive }) => (
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

// Main Student Dashboard Component
const StudentDashboard = ({ user }) => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('pending');
  const [error, setError] = useState(null);
  const [messagingOpen, setMessagingOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);
  
  // NEW: Get location to read URL parameters
  const location = useLocation();

  useEffect(() => {
    if (!user) {
      console.log('No user found for student dashboard');
      setLoading(false);
      return;
    }

    if (!user.uid) {
      console.error('User missing UID');
      setError('User information is incomplete. Please log in again.');
      setLoading(false);
      return;
    }

    try {
      const q = collection(db, 'bookings');

      const unsubscribe = onSnapshot(
        q, 
        (querySnapshot) => {
          try {
            const bookingData = [];
            
            querySnapshot.forEach((doc) => {
              try {
                const data = doc.data();
                
                if (data.userId === user.uid) {
                  bookingData.push({
                    id: doc.id,
                    ...data
                  });
                }
              } catch (docError) {
                console.error('Error processing booking document:', doc.id, docError);
              }
            });
            
            try {
              bookingData.sort((a, b) => {
                const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
                const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
                return dateB - dateA;
              });
            } catch (sortError) {
              console.error('Error sorting bookings:', sortError);
            }
            
            setBookings(bookingData);
            setError(null);
            setLoading(false);
          } catch (snapshotError) {
            console.error('Error processing snapshot:', snapshotError);
            setError('Error loading bookings. Please refresh the page.');
            setLoading(false);
          }
        },
        (error) => {
          console.error('Error getting student bookings:', error);
          setError('Unable to load bookings. Please check your connection and try again.');
          setLoading(false);
        }
      );

      return () => {
        try {
          unsubscribe();
        } catch (unsubError) {
          console.error('Error unsubscribing:', unsubError);
        }
      };
    } catch (error) {
      console.error('Error setting up bookings listener:', error);
      setError('Failed to connect to bookings. Please refresh the page.');
      setLoading(false);
    }
  }, [user]);

  // NEW: Auto-open messages when navigating from notification
  useEffect(() => {
    if (!bookings.length || loading) return;

    const searchParams = new URLSearchParams(location.search);
    const bookingId = searchParams.get('booking');
    const shouldOpenMessages = searchParams.get('openMessages');

    if (bookingId && shouldOpenMessages === 'true') {
      // Find the booking
      const booking = bookings.find(b => b.id === bookingId);
      
      if (booking) {
        console.log('Auto-opening messages for booking:', bookingId);
        // Open the messaging modal
        setSelectedBooking(booking);
        setMessagingOpen(true);
        
        // Clean up URL (remove query params)
        window.history.replaceState({}, '', '/my-bookings');
      }
    }
  }, [bookings, loading, location.search]);

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
    completed: bookings.filter(b => b.status === 'completed').length,
    total: bookings.length
  };

  // Filter bookings based on active stat card
  const filteredBookings = bookings.filter(booking => {
    try {
      if (activeFilter === 'pending') return booking.status === 'pending';
      if (activeFilter === 'confirmed') return booking.status === 'confirmed';
      if (activeFilter === 'completed') return booking.status === 'completed';
      return true; // 'all' shows everything
    } catch (error) {
      console.error('Error filtering booking:', booking, error);
      return false;
    }
  });

  // Get section title based on active filter
  const getSectionTitle = () => {
    const titles = {
      pending: 'Awaiting Response',
      confirmed: 'Confirmed Sessions',
      completed: 'Completed Sessions',
      all: 'All Sessions'
    };
    return titles[activeFilter] || 'Your Sessions';
  };

  if (!user) {
    return (
      <div className="dashboard-container">
        <div className="no-bookings">
          <h3>Please log in</h3>
          <p>You need to be logged in to view your bookings.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="dashboard-container">
        <div className="dashboard-header">
          <div className="student-welcome">
            <h1>Hi, {user.displayName?.split(' ')[0] || user.email?.split('@')[0] || 'there'}!</h1>
          </div>
        </div>

        <div className="stats-grid">
          <SkeletonStatsCard />
          <SkeletonStatsCard />
          <SkeletonStatsCard />
          <SkeletonStatsCard />
        </div>

        <div className="bookings-section">
          <SkeletonGrid count={3} />
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <div className="student-welcome">
          <h1>Hi, {user.displayName?.split(' ')[0] || user.email?.split('@')[0] || 'there'}!</h1>
        </div>
      </div>

      {error && (
        <div style={{
          padding: '1rem',
          margin: '1rem 0',
          backgroundColor: '#fee2e2',
          border: '1px solid #ef4444',
          borderRadius: '8px',
          color: '#991b1b'
        }}>
          {error}
        </div>
      )}

      {/* Clickable Stats Grid */}
      <div className="stats-grid">
        <StudentStatsCard
          title="Awaiting Response"
          value={stats.pending}
          icon={<ClockIcon />}
          color="#f59e0b"
          onClick={() => setActiveFilter('pending')}
          isActive={activeFilter === 'pending'}
        />
        <StudentStatsCard
          title="Confirmed Sessions"
          value={stats.confirmed}
          icon={<CheckIcon />}
          color="#10b981"
          onClick={() => setActiveFilter('confirmed')}
          isActive={activeFilter === 'confirmed'}
        />
        <StudentStatsCard
          title="Completed"
          value={stats.completed}
          icon={<TrendingUpIcon />}
          color="#8b5cf6"
          onClick={() => setActiveFilter('completed')}
          isActive={activeFilter === 'completed'}
        />
        <StudentStatsCard
          title="Total Sessions"
          value={stats.total}
          icon={<CalendarIcon />}
          color="#3b82f6"
          onClick={() => setActiveFilter('all')}
          isActive={activeFilter === 'all'}
        />
      </div>

      {/* Bookings List - Filtered by active card */}
      <div className="bookings-section">
        <h2 className="section-heading">{getSectionTitle()}</h2>
        
        {filteredBookings.length === 0 ? (
          <div className="no-bookings">
            <h3>No {activeFilter === 'all' ? '' : getSectionTitle().toLowerCase()} yet</h3>
            <p>
              {stats.total === 0 
                ? "Ready to start learning? Browse mentors and book your first session!"
                : `No ${activeFilter} sessions found. Try clicking a different stat card!`
              }
            </p>
          </div>
        ) : (
          <div className="bookings-grid">
            {filteredBookings.map(booking => (
              <StudentBookingCard
                key={booking.id}
                booking={booking}
                onOpenMessages={handleOpenMessages}
              />
            ))}
          </div>
        )}
      </div>

      {/* Messaging Component */}
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

export default StudentDashboard;

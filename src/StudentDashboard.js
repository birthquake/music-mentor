import React, { useState, useEffect, useRef } from 'react';
import { db } from './firebase';
import { 
  collection, 
  onSnapshot
} from 'firebase/firestore';
import { useLocation, Link } from 'react-router-dom';
import { 
  ButtonSpinner, 
  SkeletonGrid,
  SkeletonStatsCard,
  useToast
} from './LoadingComponents';
import { subscribeToUnreadMessages } from './notificationHelpers';
import { getUserProfile } from './profileHelpers';
import MessagingComponent from './MessagingComponent';
import { ProfileCompletionBar } from './UserProfile';
import { playConfirmSound, playDeclineSound } from './notificationSounds';
import './MentorDashboard.css';

/* ============================================
   VIDEO ACCESS HELPERS
   ============================================ */
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
      return { canAccess: false, reason: 'too_early', minutesUntil };
    }

    if (now > accessEnd) {
      return { canAccess: false, reason: 'expired' };
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
    if (isNaN(start.getTime())) return 'Time unavailable';
    
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

/* Friendly countdown for confirmed sessions */
const getSessionCountdown = (scheduledStart) => {
  try {
    const start = scheduledStart?.toDate ? scheduledStart.toDate() : new Date(scheduledStart);
    if (isNaN(start.getTime())) return null;
    
    const now = new Date();
    const diffMs = start - now;
    
    if (diffMs < 0) return { label: 'Now', urgent: true };
    
    const minutes = Math.floor(diffMs / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 1) return { label: `${days} days away`, urgent: false };
    if (days === 1) return { label: 'Tomorrow', urgent: false };
    if (hours > 1) return { label: `In ${hours} hours`, urgent: hours <= 3 };
    if (minutes > 0) return { label: `In ${minutes} min`, urgent: true };
    return { label: 'Starting now', urgent: true };
  } catch {
    return null;
  }
};

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

const MusicNoteIcon = () => (
  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ opacity: 0.5 }}>
    <path d="M9 18V5l12-2v13" />
    <circle cx="6" cy="18" r="3" />
    <circle cx="18" cy="16" r="3" />
  </svg>
);

/* ============================================
   STUDENT BOOKING CARD
   ============================================ */
const StudentBookingCard = ({ booking, onOpenMessages }) => {
  const [joiningVideo, setJoiningVideo] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const { showToast } = useToast();

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
        showToast('Video link is not available. Please contact your mentor.', 'warning');
        return;
      }
      setJoiningVideo(true);
      window.open(booking.videoRoom.meetingUrl, '_blank');
      setTimeout(() => setJoiningVideo(false), 2000);
    } catch (error) {
      console.error('Error joining video:', error);
      showToast('Unable to open video session. Please try again.', 'error');
      setJoiningVideo(false);
    }
  };

  const videoAccess = canAccessVideoSession(booking);
  const countdown = booking.scheduledStart && booking.status === 'confirmed' 
    ? getSessionCountdown(booking.scheduledStart) 
    : null;

  const getStatusBadge = (status) => {
    const badges = {
      pending: { 
        color: '#fbbf24', bg: 'rgba(245, 158, 11, 0.15)', border: 'rgba(245, 158, 11, 0.3)',
        text: 'Awaiting Response',
        description: 'Your mentor will respond soon!'
      },
      confirmed: { 
        color: '#34d399', bg: 'rgba(16, 185, 129, 0.15)', border: 'rgba(16, 185, 129, 0.3)',
        text: 'Confirmed',
        description: 'Session confirmed! Get ready to learn.'
      },
      declined: { 
        color: '#f87171', bg: 'rgba(239, 68, 68, 0.15)', border: 'rgba(239, 68, 68, 0.3)',
        text: 'Declined',
        description: "This mentor isn't available. Try booking with someone else!"
      },
      completed: { 
        color: '#a78bfa', bg: 'rgba(139, 92, 246, 0.15)', border: 'rgba(139, 92, 246, 0.3)',
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
        <p className="status-description">{badge.description}</p>
      </div>
    );
  };

  return (
    <div className="student-booking-card" data-status={booking.status} data-status-card={booking.id}>
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
        {/* Session countdown for confirmed bookings */}
        {countdown && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--spacing-sm)',
            padding: 'var(--spacing-md)',
            background: countdown.urgent ? 'rgba(16, 185, 129, 0.15)' : 'var(--bg-secondary)',
            border: countdown.urgent ? '1px solid var(--accent-green)' : '1px solid var(--border-color)',
            borderRadius: 'var(--radius-md)',
            marginBottom: 'var(--spacing-md)'
          }}>
            <CalendarIcon />
            <span style={{ 
              fontSize: '1.125rem', 
              fontWeight: '700', 
              color: countdown.urgent ? 'var(--accent-green-light)' : 'var(--text-primary)'
            }}>
              {countdown.label}
            </span>
            {booking.scheduledStart && (
              <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginLeft: 'auto' }}>
                {formatSessionTime(booking.scheduledStart, booking.scheduledEnd)}
              </span>
            )}
          </div>
        )}

        <div className="session-details">
          {booking.scheduledStart && booking.status === 'confirmed' && !countdown && (
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

/* ============================================
   STATS CARD
   ============================================ */
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

/* ============================================
   MAIN STUDENT DASHBOARD
   ============================================ */
const StudentDashboard = ({ user }) => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('pending');
  const [messagingOpen, setMessagingOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const prevStatusRef = useRef({});
  
  const location = useLocation();

  // Load student profile for completion bar
  useEffect(() => {
    if (!user?.uid) return;
    const loadProfile = async () => {
      try {
        const result = await getUserProfile(user.uid);
        if (result.success) setUserProfile(result.profile);
      } catch (err) {
        console.error('Error loading user profile:', err);
      }
    };
    loadProfile();
  }, [user]);

  useEffect(() => {
    if (!user || !user.uid) {
      setLoading(false);
      return;
    }

    const q = collection(db, 'bookings');
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const bookingData = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.userId === user.uid) {
          bookingData.push({ id: doc.id, ...data });
        }
      });
      
      bookingData.sort((a, b) => {
        const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
        const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
        return dateB - dateA;
      });
      
      setBookings(bookingData);
      
      // Detect status changes and play sounds/animations
      if (!loading) {
        bookingData.forEach(b => {
          const prev = prevStatusRef.current[b.id];
          if (prev && prev !== b.status) {
            if (b.status === 'confirmed') {
              playConfirmSound();
              setTimeout(() => {
                const card = document.querySelector(`[data-status-card="${b.id}"]`);
                if (card) {
                  card.classList.add('status-confirmed-flash');
                  setTimeout(() => card.classList.remove('status-confirmed-flash'), 1000);
                }
              }, 100);
            } else if (b.status === 'declined') {
              playDeclineSound();
              setTimeout(() => {
                const card = document.querySelector(`[data-status-card="${b.id}"]`);
                if (card) {
                  card.classList.add('status-declined-fade');
                  setTimeout(() => card.classList.remove('status-declined-fade'), 800);
                }
              }, 100);
            }
          }
        });
      }
      
      // Store current statuses for next comparison
      const statusMap = {};
      bookingData.forEach(b => { statusMap[b.id] = b.status; });
      prevStatusRef.current = statusMap;
      
      setLoading(false);
    });

    return () => unsubscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => {
    if (!bookings.length || loading) return;

    const searchParams = new URLSearchParams(location.search);
    const bookingId = searchParams.get('booking');
    const shouldOpenMessages = searchParams.get('openMessages');

    if (bookingId && shouldOpenMessages === 'true') {
      const booking = bookings.find(b => b.id === bookingId);
      
      if (booking) {
        setSelectedBooking(booking);
        setMessagingOpen(true);
        window.history.replaceState({}, '', '/my-bookings');
      }
    }
  }, [bookings, loading, location.search]);

  useEffect(() => {
    const handleOpenMessage = (event) => {
      const { bookingId } = event.detail;
      if (!bookingId || !bookings.length) return;
      
      const booking = bookings.find(b => b.id === bookingId);
      if (booking) {
        setSelectedBooking(booking);
        setMessagingOpen(true);
      }
    };

    window.addEventListener('openBookingMessage', handleOpenMessage);
    return () => window.removeEventListener('openBookingMessage', handleOpenMessage);
  }, [bookings]);

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

  const filteredBookings = bookings.filter(booking => {
    if (activeFilter === 'pending') return booking.status === 'pending';
    if (activeFilter === 'confirmed') return booking.status === 'confirmed';
    if (activeFilter === 'completed') return booking.status === 'completed';
    return true;
  });

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

      {/* Profile completion nudge */}
      {userProfile && <ProfileCompletionBar profile={userProfile} compact />}

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

      <div className="bookings-section">
        <h2 className="section-heading">{getSectionTitle()}</h2>
        
        {filteredBookings.length === 0 ? (
          <div className="no-bookings">
            <MusicNoteIcon />
            <h3>
              {stats.total === 0 
                ? 'Ready to start learning?' 
                : `No ${activeFilter === 'all' ? '' : getSectionTitle().toLowerCase()} yet`}
            </h3>
            <p style={{ marginBottom: stats.total === 0 ? 'var(--spacing-lg)' : '0' }}>
              {stats.total === 0 
                ? 'Browse our mentors and book your first 15-minute session!'
                : activeFilter === 'pending'
                ? 'All your requests have been responded to.'
                : activeFilter === 'confirmed'
                ? 'No upcoming sessions right now. Book a new one!'
                : `No ${activeFilter} sessions found. Try a different filter!`
              }
            </p>
            {stats.total === 0 && (
              <Link 
                to="/" 
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.75rem 1.5rem',
                  background: 'var(--accent-green)',
                  color: 'white',
                  borderRadius: 'var(--radius-md)',
                  textDecoration: 'none',
                  fontWeight: '600',
                  fontSize: '0.9375rem',
                  transition: 'all 0.2s ease'
                }}
              >
                Browse Mentors
              </Link>
            )}
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

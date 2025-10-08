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
  SkeletonStatsCard 
} from './LoadingComponents';

// Icons
const ClockIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <circle cx="12" cy="12" r="10"></circle>
    <polyline points="12,6 12,12 16,14"></polyline>
  </svg>
);

const VideoIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <polygon points="23 7 16 12 23 17 23 7"></polygon>
    <rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
  </svg>
);

const CheckIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
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
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
    <line x1="16" y1="2" x2="16" y2="6"></line>
    <line x1="8" y1="2" x2="8" y2="6"></line>
    <line x1="3" y1="10" x2="21" y2="10"></line>
  </svg>
);

const TrendingUpIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline>
    <polyline points="17 6 23 6 23 12"></polyline>
  </svg>
);

// Booking Card Component
const BookingCard = ({ booking, onAccept, onDecline }) => {
  const [loading, setLoading] = useState(false);
  const [studentName, setStudentName] = useState(null);

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
      alert('Error accepting booking. Please try again.');
    }
    setLoading(false);
  };

  const handleDecline = async () => {
    setLoading(true);
    try {
      await onDecline(booking.id);
    } catch (error) {
      console.error('Error declining booking:', error);
      alert('Error declining booking. Please try again.');
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
      pending: { color: '#f59e0b', bg: '#fef3c7', text: 'Pending Review' },
      confirmed: { color: '#10b981', bg: '#d1fae5', text: 'Confirmed' },
      declined: { color: '#ef4444', bg: '#fecaca', text: 'Declined' },
      completed: { color: '#6b7280', bg: '#f3f4f6', text: 'Completed' }
    };
    
    const badge = badges[status] || badges.pending;
    
    return (
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
    );
  };

  return (
    <div className="booking-card">
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
// Enhanced Stats Component with Progress Bar and Color Variety
const StatsCard = ({ title, value, subtitle, icon, color, progress }) => (
  <div className="stats-card" style={{ '--card-accent': color }}>
    <div className="stats-icon" style={{ background: color }}>
      {icon}
    </div>
    <div className="stats-content">
      <div className="stats-value">{value}</div>
      <div className="stats-title">{title}</div>
      {subtitle && <div className="stats-subtitle">{subtitle}</div>}
      {progress !== undefined && (
        <div className="stats-progress">
          <div className="progress-bar">
            <div 
              className="progress-fill" 
              style={{ width: `${progress}%`, background: color }}
            ></div>
          </div>
          <span className="progress-label">{progress}%</span>
        </div>
      )}
    </div>
  </div>
);

// Main Mentor Dashboard Component
const MentorDashboard = ({ user, mentorInfo }) => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending');

  useEffect(() => {
    if (!user || !mentorInfo) {
      console.log('No user or mentorInfo:', { user: !!user, mentorInfo: !!mentorInfo });
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

      const result = await confirmBookingWithVideo(bookingId);
      console.log('Booking confirmed:', result.message);
      alert('Session confirmed! The student will see the update in their dashboard.');

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

      await updateDoc(bookingRef, {
        status: 'declined',
        declinedAt: Timestamp.now()
      });

      console.log('Booking declined successfully');
      alert('Session declined. The student will be notified in their dashboard.');

    } catch (error) {
      console.error('Error declining booking:', error);
      throw error;
    }
  };

  const filteredBookings = bookings.filter(booking => {
    if (filter === 'all') return true;
    return booking.status === filter;
  });

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

  // Calculate completion rate for progress bar
  const completionRate = stats.total > 0 
    ? Math.round((stats.confirmed / stats.total) * 100) 
    : 0;

  const responseRate = stats.total > 0
    ? Math.round(((stats.confirmed + bookings.filter(b => b.status === 'declined').length) / stats.total) * 100)
    : 0;

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
          <h1>Welcome back, {mentorInfo.name}!</h1>
          <p>Manage your mentorship sessions and help musicians grow</p>
        </div>
      </div>

      {/* Enhanced Stats Section with Different Colors */}
      {loading ? (
        <div className="stats-grid">
          <SkeletonStatsCard />
          <SkeletonStatsCard />
          <SkeletonStatsCard />
          <SkeletonStatsCard />
        </div>
      ) : (
        <div className="stats-grid">
          <StatsCard
            title="Pending Requests"
            value={stats.pending}
            subtitle="Awaiting your response"
            icon={<ClockIcon />}
            color="#f59e0b"
            progress={stats.total > 0 ? Math.round((stats.pending / stats.total) * 100) : 0}
          />
          <StatsCard
            title="Confirmed Sessions"
            value={stats.confirmed}
            subtitle="Ready to go"
            icon={<CheckIcon />}
            color="#10b981"
            progress={completionRate}
          />
          <StatsCard
            title="This Month"
            value={stats.thisMonth}
            subtitle="Total requests"
            icon={<TrendingUpIcon />}
            color="#8b5cf6"
            progress={stats.total > 0 ? Math.round((stats.thisMonth / stats.total) * 100) : 0}
          />
          <StatsCard
            title="All Time"
            value={stats.total}
            subtitle="Total bookings"
            icon={<CalendarIcon />}
            color="#3b82f6"
            progress={responseRate}
          />
        </div>
      )}

      {/* Filter Tabs */}
      <div className="filter-tabs">
        <button 
          className={filter === 'pending' ? 'active' : ''}
          onClick={() => setFilter('pending')}
        >
          Pending ({stats.pending})
        </button>
        <button 
          className={filter === 'confirmed' ? 'active' : ''}
          onClick={() => setFilter('confirmed')}
        >
          Confirmed ({stats.confirmed})
        </button>
        <button 
          className={filter === 'all' ? 'active' : ''}
          onClick={() => setFilter('all')}
        >
          All Bookings ({stats.total})
        </button>
      </div>

      {/* Bookings List */}
      <div className="bookings-section">
        {loading ? (
          <SkeletonGrid count={3} />
        ) : filteredBookings.length === 0 ? (
          <div className="no-bookings">
            <h3>No {filter === 'all' ? '' : filter} bookings yet</h3>
            <p>When students book sessions with you, they'll appear here.</p>
          </div>
        ) : (
          <div className="bookings-grid">
            {filteredBookings.map(booking => (
              <BookingCard
                key={booking.id}
                booking={booking}
                onAccept={handleAcceptBooking}
                onDecline={handleDeclineBooking}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MentorDashboard;

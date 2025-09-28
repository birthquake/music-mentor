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
  getDoc
} from 'firebase/firestore';
import { confirmBookingWithVideo } from './bookingVideoHelpers';
// Icons
const ClockIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10"></circle>
    <polyline points="12,6 12,12 16,14"></polyline>
  </svg>
);

const VideoIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polygon points="23 7 16 12 23 17 23 7"></polygon>
    <rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
  </svg>
);

const CheckIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="20,6 9,17 4,12"></polyline>
  </svg>
);

const XIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="18" y1="6" x2="6" y2="18"></line>
    <line x1="6" y1="6" x2="18" y2="18"></line>
  </svg>
);

const CalendarIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
    <line x1="16" y1="2" x2="16" y2="6"></line>
    <line x1="8" y1="2" x2="8" y2="6"></line>
    <line x1="3" y1="10" x2="21" y2="10"></line>
  </svg>
);

// Booking Card Component
const BookingCard = ({ booking, onAccept, onDecline }) => {
  const [loading, setLoading] = useState(false);
  const [studentName, setStudentName] = useState(null);

  // Get student name from profile
useEffect(() => {
  const getStudentName = async () => {
    console.log('Booking data:', booking);
    console.log('Available fields:', Object.keys(booking));
    
    if (!booking.studentId && !booking.userId) {
      console.log('No studentId or userId found in booking');
      return;
    }
    
    try {
      const userId = booking.studentId || booking.userId;
      console.log('Looking up user profile for ID:', userId);
      
      const userProfileRef = doc(db, 'userProfiles', userId);
      const userProfileSnap = await getDoc(userProfileRef);
      
      console.log('Profile exists?', userProfileSnap.exists());
      if (userProfileSnap.exists()) {
        console.log('Profile data:', userProfileSnap.data());
      }
      
      if (userProfileSnap.exists() && (userProfileSnap.data().name || userProfileSnap.data().displayName)) {
      const profileName = userProfileSnap.data().name || userProfileSnap.data().displayName;
        console.log('Found profile name:', profileName);
        setStudentName(profileName);
      } else {
        console.log('No profile name found');
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

      {booking.status === 'pending' && (
        <div className="booking-actions">
          <button 
            onClick={handleDecline}
            className="decline-btn"
            disabled={loading}
          >
            <XIcon />
            Decline
          </button>
          <button 
            onClick={handleAccept}
            className="accept-btn"
            disabled={loading}
          >
            <CheckIcon />
            {loading ? 'Accepting...' : 'Accept Session'}
          </button>
        </div>
      )}
    </div>
  );
};
// Stats Component
const StatsCard = ({ title, value, subtitle, icon }) => (
  <div className="stats-card">
    <div className="stats-icon">
      {icon}
    </div>
    <div className="stats-content">
      <h3>{value}</h3>
      <p className="stats-title">{title}</p>
      {subtitle && <p className="stats-subtitle">{subtitle}</p>}
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

  console.log('Setting up bookings query for mentor:', mentorInfo.id);

  // Query bookings for this mentor - simplified version
  const q = collection(db, 'bookings');

  const unsubscribe = onSnapshot(q, 
    (querySnapshot) => {
      console.log('Query snapshot received, size:', querySnapshot.size);
      const bookingData = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        console.log('Found booking:', doc.id, data);
        
        // Filter for this mentor's bookings
// Filter for this mentor's bookings - handle both old numeric IDs and new Firestore IDs
if (data.mentorId == mentorInfo.id || data.mentorId === user.uid || data.mentorId == user.uid) {
  bookingData.push({
    id: doc.id,
    ...data
  });
}
      });
      
      // Sort bookings by creation date (newest first)
const sortedBookings = bookingData.sort((a, b) => {
  const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
  const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
  return dateB - dateA; // Newest first
});

console.log('Total bookings for this mentor:', sortedBookings.length);
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
    const result = await confirmBookingWithVideo(bookingId);
    console.log('Booking confirmed:', result.message);
    // Optionally show a success message to the user
    // alert(result.message);
  } catch (error) {
    console.error('Error confirming booking:', error);
    alert('Failed to confirm booking. Please try again.');
  }
};

  const handleDeclineBooking = async (bookingId) => {
    const bookingRef = doc(db, 'bookings', bookingId);
    await updateDoc(bookingRef, {
      status: 'declined',
      declinedAt: Timestamp.now()
    });
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

      {/* Stats Section */}
      <div className="stats-grid">
        <StatsCard
          title="Pending Requests"
          value={stats.pending}
          subtitle="Need your review"
          icon={<ClockIcon />}
        />
        <StatsCard
          title="Confirmed Sessions"
          value={stats.confirmed}
          subtitle="Ready to go"
          icon={<CheckIcon />}
        />
        <StatsCard
          title="This Month"
          value={stats.thisMonth}
          subtitle="Total requests"
          icon={<CalendarIcon />}
        />
        <StatsCard
          title="All Time"
          value={stats.total}
          subtitle="Total bookings"
          icon={<VideoIcon />}
        />
      </div>

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
          <div className="loading-bookings">Loading your bookings...</div>
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

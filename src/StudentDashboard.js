import React, { useState, useEffect } from 'react';
import { db } from './firebase';
import { 
  collection, 
  query, 
  where, 
  onSnapshot,
  orderBy
} from 'firebase/firestore';

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

const CalendarIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
    <line x1="16" y1="2" x2="16" y2="6"></line>
    <line x1="8" y1="2" x2="8" y2="6"></line>
    <line x1="3" y1="10" x2="21" y2="10"></line>
  </svg>
);

const UserIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
    <circle cx="12" cy="7" r="4"></circle>
  </svg>
);

// Student Booking Card Component
const StudentBookingCard = ({ booking }) => {
  const formatDate = (timestamp) => {
    if (!timestamp) return 'Just now';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString() + ' at ' + date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
  };

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
        description: 'Session confirmed! You\'ll receive details soon.'
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
            {booking.mentorName.split(' ').map(n => n[0]).join('')}
          </div>
          <div className="mentor-details">
            <h4>{booking.mentorName}</h4>
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
          <div className="detail-item">
            <ClockIcon />
            <span>Preferred time: {booking.preferredTime}</span>
          </div>
          {booking.videoPreferred && (
            <div className="detail-item">
              <VideoIcon />
              <span>Video session requested</span>
            </div>
          )}
          <div className="detail-item">
            <span className="price-tag">${booking.rate} for 15 minutes</span>
          </div>
        </div>

        <div className="your-question">
          <h5>Your Question:</h5>
          <p>"{booking.message}"</p>
        </div>

        {booking.status === 'confirmed' && (
          <div className="next-steps">
            <h5>Next Steps:</h5>
            <p>🎉 Great news! Your mentor has confirmed your session. You'll receive an email with scheduling details and video call information shortly.</p>
          </div>
        )}
      </div>
    </div>
  );
};

// Stats Component for Students
const StudentStatsCard = ({ title, value, subtitle, icon }) => (
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

// Main Student Dashboard Component
const StudentDashboard = ({ user }) => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    if (!user) {
      console.log('No user found for student dashboard');
      return;
    }

    console.log('Loading bookings for user:', user.uid);

    // Query bookings for this user
    const q = collection(db, 'bookings');

    const unsubscribe = onSnapshot(q, 
      (querySnapshot) => {
        console.log('Student query snapshot received, size:', querySnapshot.size);
        const bookingData = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          
          // Filter for this user's bookings
          if (data.userId === user.uid) {
            bookingData.push({
              id: doc.id,
              ...data
            });
          }
        });
        
        // Sort by most recent first
        bookingData.sort((a, b) => {
          const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt);
          const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt);
          return dateB - dateA;
        });
        
        console.log('Total bookings for this user:', bookingData.length);
        setBookings(bookingData);
        setLoading(false);
      },
      (error) => {
        console.error('Error getting student bookings:', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  const filteredBookings = bookings.filter(booking => {
    if (filter === 'all') return true;
    if (filter === 'active') return booking.status === 'pending' || booking.status === 'confirmed';
    return booking.status === filter;
  });

  const stats = {
    pending: bookings.filter(b => b.status === 'pending').length,
    confirmed: bookings.filter(b => b.status === 'confirmed').length,
    completed: bookings.filter(b => b.status === 'completed').length,
    total: bookings.length
  };

  if (loading) {
    return (
      <div className="dashboard-container">
        <div className="loading-bookings">Loading your bookings...</div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <div className="student-welcome">
          <h1>Your Music Learning Journey</h1>
          <p>Track your mentorship sessions and learning progress</p>
        </div>
      </div>

      {/* Stats Section */}
      <div className="stats-grid">
        <StudentStatsCard
          title="Awaiting Response"
          value={stats.pending}
          subtitle="Mentors reviewing"
          icon={<ClockIcon />}
        />
        <StudentStatsCard
          title="Confirmed Sessions"
          value={stats.confirmed}
          subtitle="Ready to learn"
          icon={<CheckIcon />}
        />
        <StudentStatsCard
          title="Completed"
          value={stats.completed}
          subtitle="Learning wins"
          icon={<UserIcon />}
        />
        <StudentStatsCard
          title="Total Sessions"
          value={stats.total}
          subtitle="Your journey"
          icon={<VideoIcon />}
        />
      </div>

      {/* Filter Tabs */}
      <div className="filter-tabs">
        <button 
          className={filter === 'active' ? 'active' : ''}
          onClick={() => setFilter('active')}
        >
          Active ({stats.pending + stats.confirmed})
        </button>
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
          All Sessions ({stats.total})
        </button>
      </div>

      {/* Bookings List */}
      <div className="bookings-section">
        {filteredBookings.length === 0 ? (
          <div className="no-bookings">
            <h3>No {filter === 'all' ? '' : filter} sessions yet</h3>
            <p>
              {stats.total === 0 
                ? "Ready to start learning? Browse mentors and book your first session!"
                : `No ${filter} sessions found. Check other tabs or book another session!`
              }
            </p>
          </div>
        ) : (
          <div className="bookings-grid">
            {filteredBookings.map(booking => (
              <StudentBookingCard
                key={booking.id}
                booking={booking}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentDashboard;

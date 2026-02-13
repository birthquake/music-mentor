// MentorDetailPage.js — Public mentor profile & booking entry point
import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getMentorProfile } from './profileHelpers';
import { FullPageLoading, useToast } from './LoadingComponents';
import CalendarBooking from './CalendarBooking';
import './MentorDetailPage.css';

/* ============================================
   ICONS
   ============================================ */
const StarIcon = ({ filled }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill={filled ? "#fbbf24" : "none"} stroke={filled ? "#fbbf24" : "#4b5563"} strokeWidth="2">
    <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26 12,2" />
  </svg>
);

const ClockIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10" /><polyline points="12,6 12,12 16,14" />
  </svg>
);

const VideoIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polygon points="23 7 16 12 23 17 23 7" /><rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
  </svg>
);

const CalendarIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);

const GlobeIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10" />
    <line x1="2" y1="12" x2="22" y2="12" />
    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
  </svg>
);

const InstagramIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
  </svg>
);

const YoutubeIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19.13C5.12 19.56 12 19.56 12 19.56s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33z" />
    <polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02" />
  </svg>
);

const SpotifyIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10" />
    <path d="M8 15s2-1 4-1 4 1 4 1" /><path d="M7 12s2.5-1.5 5-1.5 5 1.5 5 1.5" /><path d="M6 9s3-2 6-2 6 2 6 2" />
  </svg>
);

const ArrowLeftIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="m15 18-6-6 6-6"/>
  </svg>
);

const CheckCircleIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
  </svg>
);

/* ============================================
   AVAILABILITY SUMMARY
   ============================================ */
const AvailabilitySummary = ({ weeklySchedule }) => {
  if (!weeklySchedule) return null;

  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  const dayAbbrevs = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  const formatTime = (t) => {
    if (!t) return '';
    const [h, m] = t.split(':').map(Number);
    const period = h >= 12 ? 'PM' : 'AM';
    const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
    return `${h12}${m ? ':' + String(m).padStart(2, '0') : ''} ${period}`;
  };

  return (
    <div className="availability-summary">
      {days.map((day, i) => {
        const schedule = weeklySchedule[day];
        const isAvailable = schedule?.available && schedule?.slots?.length > 0;

        return (
          <div key={day} className={`avail-day ${isAvailable ? 'available' : 'unavailable'}`}>
            <span className="avail-day-name">{dayAbbrevs[i]}</span>
            {isAvailable ? (
              <div className="avail-slots">
                {schedule.slots.map((slot, j) => (
                  <span key={j} className="avail-time">
                    {formatTime(slot.start)} – {formatTime(slot.end)}
                  </span>
                ))}
              </div>
            ) : (
              <span className="avail-off">Unavailable</span>
            )}
          </div>
        );
      })}
    </div>
  );
};

/* ============================================
   MAIN COMPONENT
   ============================================ */
const MentorDetailPage = ({ user, onAuthClick }) => {
  const { mentorId } = useParams();
  const [mentor, setMentor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [showBooking, setShowBooking] = useState(false);
  const { showToast } = useToast();

  // Unique gradient per mentor name
  const getAvatarGradient = (name) => {
    const gradients = [
      'linear-gradient(135deg, #8b5cf6, #3b82f6)',
      'linear-gradient(135deg, #ec4899, #f59e0b)',
      'linear-gradient(135deg, #10b981, #06b6d4)',
      'linear-gradient(135deg, #f43f5e, #8b5cf6)',
      'linear-gradient(135deg, #3b82f6, #10b981)',
      'linear-gradient(135deg, #f59e0b, #ef4444)',
      'linear-gradient(135deg, #06b6d4, #8b5cf6)',
      'linear-gradient(135deg, #84cc16, #06b6d4)',
    ];
    let hash = 0;
    for (let i = 0; i < (name || '').length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return gradients[Math.abs(hash) % gradients.length];
  };

  useEffect(() => {
    const loadMentor = async () => {
      setLoading(true);
      try {
        const result = await getMentorProfile(mentorId);
        if (result.success) {
          setMentor({ id: mentorId, userId: mentorId, ...result.profile });
        } else {
          setNotFound(true);
        }
      } catch (err) {
        console.error('Error loading mentor:', err);
        setNotFound(true);
      }
      setLoading(false);
    };

    if (mentorId) loadMentor();
  }, [mentorId]);

  const handleBookClick = () => {
    if (!user) {
      onAuthClick();
      showToast('Please sign in to book a session.', 'info');
      return;
    }
    setShowBooking(true);
  };

  const handleConfirmBooking = (time, message, videoPreferred) => {
    showToast(`Session requested with ${mentor.displayName}! Check "My Bookings" for updates.`, 'success');
    setShowBooking(false);
  };

  if (loading) {
    return <FullPageLoading message="Loading mentor profile..." />;
  }

  if (notFound) {
    return (
      <div className="mentor-detail-container">
        <div className="mentor-not-found">
          <h2>Mentor Not Found</h2>
          <p>This mentor profile doesn't exist or has been deactivated.</p>
          <Link to="/" className="back-to-browse">
            <ArrowLeftIcon /> Browse All Mentors
          </Link>
        </div>
      </div>
    );
  }

  const rating = 4.8;
  const reviewCount = Math.floor(Math.random() * 200) + 50;
  const availableDaysCount = mentor.availability?.weeklySchedule 
    ? Object.values(mentor.availability.weeklySchedule).filter(d => d.available).length 
    : 0;

  const hasSocialLinks = mentor.socialLinks && 
    Object.values(mentor.socialLinks).some(v => v?.trim());

  const hasPortfolio = mentor.portfolio && (
    mentor.portfolio.achievements?.length > 0 ||
    mentor.portfolio.audioSamples?.length > 0 ||
    mentor.portfolio.videos?.length > 0
  );

  return (
    <div className="mentor-detail-container">
      {/* Back Link */}
      <Link to="/" className="back-link">
        <ArrowLeftIcon /> All Mentors
      </Link>

      <div className="mentor-detail-layout">
        {/* LEFT COLUMN — Profile Info */}
        <div className="mentor-detail-main">
          {/* Hero */}
          <div className="mentor-detail-hero">
            <div className="mentor-detail-avatar" style={{ background: getAvatarGradient(mentor.displayName) }}>
              {mentor.displayName?.split(' ').map(n => n[0]).join('') || '?'}
            </div>
            <div className="mentor-detail-intro">
              <h1>{mentor.displayName}</h1>
              {mentor.tagline && <p className="mentor-tagline">{mentor.tagline}</p>}
              <div className="mentor-detail-meta">
                <div className="meta-item">
                  {[...Array(5)].map((_, i) => <StarIcon key={i} filled={i < Math.floor(rating)} />)}
                  <span className="rating-value">{rating}</span>
                  <span className="rating-count">({reviewCount} reviews)</span>
                </div>
                {mentor.experience > 0 && (
                  <div className="meta-item">
                    <ClockIcon />
                    <span>{mentor.experience} years experience</span>
                  </div>
                )}
                <div className="meta-item">
                  <VideoIcon />
                  <span>Video available</span>
                </div>
              </div>

              {/* Tags */}
              {mentor.specialties?.length > 0 && (
                <div className="mentor-detail-tags">
                  {mentor.specialties.map(tag => (
                    <span key={tag} className="detail-tag">{tag}</span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* About */}
          {mentor.bio && (
            <section className="detail-section">
              <h2>About</h2>
              <p className="mentor-bio">{mentor.bio}</p>
            </section>
          )}

          {/* Teaching Philosophy */}
          {mentor.teachingPhilosophy && (
            <section className="detail-section">
              <h2>Teaching Philosophy</h2>
              <p className="mentor-bio">{mentor.teachingPhilosophy}</p>
            </section>
          )}

          {/* Credentials */}
          {mentor.credentials && (
            <section className="detail-section">
              <h2>Credentials</h2>
              <p className="mentor-bio">{mentor.credentials}</p>
            </section>
          )}

          {/* Portfolio / Achievements */}
          {hasPortfolio && (
            <section className="detail-section">
              <h2>Achievements & Portfolio</h2>
              {mentor.portfolio.achievements?.length > 0 && (
                <ul className="achievements-list">
                  {mentor.portfolio.achievements.map((item, i) => (
                    <li key={i}>
                      <CheckCircleIcon />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}

          {/* Availability */}
          {mentor.availability?.weeklySchedule && availableDaysCount > 0 && (
            <section className="detail-section">
              <h2>Weekly Availability</h2>
              <AvailabilitySummary weeklySchedule={mentor.availability.weeklySchedule} />
            </section>
          )}

          {/* Social Links */}
          {hasSocialLinks && (
            <section className="detail-section">
              <h2>Find Me Online</h2>
              <div className="social-links">
                {mentor.socialLinks.website && (
                  <a href={mentor.socialLinks.website} target="_blank" rel="noopener noreferrer" className="social-link">
                    <GlobeIcon /> Website
                  </a>
                )}
                {mentor.socialLinks.instagram && (
                  <a href={mentor.socialLinks.instagram} target="_blank" rel="noopener noreferrer" className="social-link">
                    <InstagramIcon /> Instagram
                  </a>
                )}
                {mentor.socialLinks.youtube && (
                  <a href={mentor.socialLinks.youtube} target="_blank" rel="noopener noreferrer" className="social-link">
                    <YoutubeIcon /> YouTube
                  </a>
                )}
                {mentor.socialLinks.spotify && (
                  <a href={mentor.socialLinks.spotify} target="_blank" rel="noopener noreferrer" className="social-link">
                    <SpotifyIcon /> Spotify
                  </a>
                )}
              </div>
            </section>
          )}
        </div>

        {/* RIGHT COLUMN — Sticky Booking Card */}
        <aside className="mentor-detail-sidebar">
          <div className="booking-sidebar-card">
            <div className="sidebar-price">
              <span className="sidebar-rate">${mentor.rate}</span>
              <span className="sidebar-per">/15 min session</span>
            </div>

            <div className="sidebar-highlights">
              <div className="sidebar-highlight-item">
                <CalendarIcon />
                <span>{availableDaysCount} day{availableDaysCount !== 1 ? 's' : ''}/week</span>
              </div>
              <div className="sidebar-highlight-item">
                <VideoIcon />
                <span>Video sessions</span>
              </div>
              <div className="sidebar-highlight-item">
                <ClockIcon />
                <span>15-minute focused sessions</span>
              </div>
            </div>

            <button 
              className="sidebar-book-btn"
              onClick={handleBookClick}
            >
              {user ? 'Book a Session' : 'Sign In to Book'}
            </button>

            <p className="sidebar-guarantee">
              You won't be charged until the mentor confirms.
            </p>
          </div>
        </aside>
      </div>

      {/* Booking Modal */}
      <CalendarBooking
        mentor={mentor}
        isOpen={showBooking}
        onClose={() => setShowBooking(false)}
        onConfirm={handleConfirmBooking}
        user={user}
      />
    </div>
  );
};

export default MentorDetailPage;

/* ============================================
   App.js — MusicMentor
   Unified with toast notifications, footer,
   brand icon, and skeleton loading
   ============================================ */

import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { auth, db } from './firebase';
import { 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut
} from 'firebase/auth';
import { 
  collection, 
  addDoc,
  serverTimestamp,
  doc,
  getDoc
} from 'firebase/firestore';
import { createBookingWithProfiles, getEnhancedMentors } from './profileHelpers';
import { ToastProvider, useToast, SkeletonMentorGrid } from './LoadingComponents';
import UserProfile from './UserProfile';
import MentorProfile from './MentorProfile';
import CalendarBooking from './CalendarBooking';
import MentorDashboard from './MentorDashboard';
import StudentDashboard from './StudentDashboard';
import MentorDetailPage from './MentorDetailPage';
import MobileBottomNav from './MobileBottomNav';
import NotificationBell from './NotificationBell';
import './App.css';
import './MentorDashboard.css';

/* ============================================
   ICONS
   ============================================ */
const StarIcon = ({ filled = false }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill={filled ? "#FFA500" : "none"} stroke={filled ? "#FFA500" : "#4b5563"} strokeWidth="2">
    <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26 12,2" />
  </svg>
);

const VideoIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polygon points="23 7 16 12 23 17 23 7"></polygon>
    <rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
  </svg>
);

const ClockIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10"></circle>
    <polyline points="12,6 12,12 16,14"></polyline>
  </svg>
);

const CheckIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="20,6 9,17 4,12"></polyline>
  </svg>
);

const MusicNoteIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 18V5l12-2v13" />
    <circle cx="6" cy="18" r="3" />
    <circle cx="18" cy="16" r="3" />
  </svg>
);

/* ============================================
   AUTH MODAL
   ============================================ */
const AuthModal = ({ isOpen, onClose }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { showToast } = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
        showToast('Welcome back!', 'success');
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
        showToast('Account created! Welcome to MusicMentor.', 'success');
      }
      onClose();
      setEmail('');
      setPassword('');
    } catch (error) {
      setError(error.message);
      showToast('Sign in failed. Please check your credentials.', 'error');
    }
    
    setLoading(false);
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content auth-modal" onClick={e => e.stopPropagation()}>
        <h2>{isLogin ? 'Welcome Back' : 'Join MusicMentor'}</h2>
        <p className="auth-subtitle">
          {isLogin ? 'Sign in to book sessions' : 'Create your account to get started'}
        </p>
        
        {error && (
          <div style={{
            color: '#fca5a5', 
            marginBottom: '1rem', 
            padding: '0.75rem', 
            background: 'rgba(239, 68, 68, 0.15)', 
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '8px', 
            fontSize: '0.875rem'
          }}>
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="auth-form">
          <input
            type="email"
            placeholder="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          
          <button type="submit" className="auth-btn primary" disabled={loading}>
            {loading ? 'Please wait...' : (isLogin ? 'Sign In' : 'Create Account')}
          </button>
        </form>
        
        <p className="auth-switch">
          {isLogin ? "Don't have an account? " : "Already have an account? "}
          <button 
            type="button" 
            onClick={() => {
              setIsLogin(!isLogin);
              setError('');
            }}
            className="link-btn"
          >
            {isLogin ? 'Sign up' : 'Sign in'}
          </button>
        </p>
      </div>
    </div>
  );
};

/* ============================================
   HEADER
   ============================================ */
const Header = ({ user, onSignOut, onAuthClick, mentorInfo }) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const toggleDropdown = () => {
    setDropdownOpen(!dropdownOpen);
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownOpen && !event.target.closest('.user-menu-button') && !event.target.closest('.user-dropdown')) {
        setDropdownOpen(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [dropdownOpen]);

  return (
    <header className="header">
      <div className="container">
        <div className="header-content">
          <div className="brand">
            <Link to="/" style={{ color: 'white', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ color: 'var(--accent-primary)', display: 'flex' }}>
                <MusicNoteIcon />
              </span>
              <h1>MusicMentor</h1>
            </Link>
          </div>
          
          <div className="header-actions">
            {user ? (
              <>
                <NotificationBell user={user} />
                
                <div className="user-menu">
                  <div className="user-menu-button" onClick={toggleDropdown}>
                    <div className="hamburger-icon">
                      <span></span>
                      <span></span>
                      <span></span>
                    </div>
                  </div>
                  <div className={`user-dropdown ${dropdownOpen ? 'active' : ''}`}>
                    <Link 
                      to={mentorInfo ? "/mentor-profile" : "/profile"}
                      className="dropdown-item"
                      onClick={() => setDropdownOpen(false)}
                    >
                      <svg viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                      </svg>
                      {mentorInfo ? 'Mentor Profile' : 'My Profile'}
                    </Link>
                    
                    <Link 
                      to={mentorInfo ? "/mentor-dashboard" : "/my-bookings"}
                      className="dropdown-item"
                      onClick={() => setDropdownOpen(false)}
                    >
                      <svg viewBox="0 0 24 24" fill="currentColor">
                        <path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z"/>
                      </svg>
                      {mentorInfo ? 'Mentor Dashboard' : 'My Bookings'}
                    </Link>
                    
                    <button 
                      className="dropdown-item"
                      onClick={() => {
                        setDropdownOpen(false);
                        onSignOut();
                      }}
                    >
                      <svg viewBox="0 0 24 24" fill="currentColor">
                        <path d="M10.09 15.59L11.5 17l5-5-5-5-1.41 1.41L12.67 11H3v2h9.67l-2.58 2.59zM19 3H5c-1.11 0-2 .9-2 2v4h2V5h14v14H5v-4H3v4c0 1.1.89 2 2 2h14c1.11 0 2-.9 2-2V5c0-1.1-.89-2-2-2z"/>
                      </svg>
                      Sign Out
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <button onClick={onAuthClick} className="sign-in-btn">
                Sign In
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

/* ============================================
   FOOTER
   ============================================ */
const Footer = () => (
  <footer className="site-footer">
    <div className="footer-content">
      <div className="footer-top">
        <div className="footer-brand">
          <h3>MusicMentor</h3>
          <p>Personalized advice from experienced musicians in focused 15-minute sessions.</p>
        </div>
        <div className="footer-links">
          <div className="footer-column">
            <h4>Platform</h4>
            <ul>
              <li><Link to="/">Browse Mentors</Link></li>
              <li><a href="#how-it-works">How It Works</a></li>
              <li><a href="#pricing">Pricing</a></li>
            </ul>
          </div>
          <div className="footer-column">
            <h4>Support</h4>
            <ul>
              <li><a href="mailto:support@musicmentor.com">Contact Us</a></li>
              <li><a href="#faq">FAQ</a></li>
              <li><a href="#become-a-mentor">Become a Mentor</a></li>
            </ul>
          </div>
        </div>
      </div>
      <div className="footer-bottom">
        <p>&copy; {new Date().getFullYear()} MusicMentor. All rights reserved.</p>
        <div className="footer-bottom-links">
          <a href="#privacy">Privacy</a>
          <a href="#terms">Terms</a>
        </div>
      </div>
    </div>
  </footer>
);

/* ============================================
   MENTOR CARD
   ============================================ */
const MentorCard = ({ mentor, onBook, user }) => {
  const renderStars = (rating) => {
    return [...Array(5)].map((_, i) => (
      <StarIcon key={i} filled={i < Math.floor(rating)} />
    ));
  };

  // Generate a unique gradient from the mentor's name
  const getAvatarGradient = (name) => {
    const gradients = [
      'linear-gradient(135deg, #8b5cf6, #3b82f6)',  // purple → blue
      'linear-gradient(135deg, #ec4899, #f59e0b)',  // pink → amber
      'linear-gradient(135deg, #10b981, #06b6d4)',  // green → cyan
      'linear-gradient(135deg, #f43f5e, #8b5cf6)',  // rose → purple
      'linear-gradient(135deg, #3b82f6, #10b981)',  // blue → green
      'linear-gradient(135deg, #f59e0b, #ef4444)',  // amber → red
      'linear-gradient(135deg, #06b6d4, #8b5cf6)',  // cyan → purple
      'linear-gradient(135deg, #84cc16, #06b6d4)',  // lime → cyan
    ];
    let hash = 0;
    for (let i = 0; i < (name || '').length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return gradients[Math.abs(hash) % gradients.length];
  };

  return (
    <div className="mentor-card">
      <div className="mentor-header">
        <div className="mentor-avatar" style={{ background: getAvatarGradient(mentor.name) }}>
          {mentor.name.split(' ').map(n => n[0]).join('')}
        </div>
        <div className="mentor-basic-info">
          <h3>
              <Link to={`/mentor/${mentor.userId || mentor.id}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                {mentor.name}
              </Link>
            </h3>
          <div className="mentor-rating">
            {renderStars(mentor.rating)}
            <span className="rating-text">({mentor.reviewCount})</span>
          </div>
        </div>
      </div>
      
      <div className="mentor-details">
        <p className="specialty">{mentor.specialty}</p>
        <div className="mentor-stats">
          <div className="stat">
            <ClockIcon />
            <span>{mentor.experience} years</span>
          </div>
          <div className="stat">
            <VideoIcon />
            <span>Video {mentor.videoAvailable ? 'available' : 'optional'}</span>
          </div>
        </div>
        
        <div className="mentor-tags">
          {mentor.tags?.map(tag => (
            <span key={tag} className="tag">{tag}</span>
          ))}
        </div>
      </div>
      
      <div className="mentor-footer">
        <div className="price">
          <span className="rate">${mentor.rate}</span>
          <span className="duration">/15min</span>
        </div>
        
        <button 
          onClick={() => onBook(mentor)} 
          className="book-btn"
          disabled={!user}
        >
          {user ? 'Book Session' : 'Sign in to Book'}
        </button>
      </div>
    </div>
  );
};

/* ============================================
   BOOKING MODAL (legacy fallback — CalendarBooking
   is the primary booking flow)
   ============================================ */
const BookingModal = ({ mentor, isOpen, onClose, onConfirm, user }) => {
  const [selectedTime, setSelectedTime] = useState('');
  const [message, setMessage] = useState('');
  const [videoPreferred, setVideoPreferred] = useState(false);
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const result = await createBookingWithProfiles({
        mentorId: mentor.id,
        mentorName: mentor.name,
        userId: user.uid,
        userEmail: user.email,
        preferredTime: selectedTime,
        message,
        videoPreferred,
        status: 'pending',
        rate: mentor.rate
      });

      if (!result.success) {
        throw new Error(result.error);
      }
      
      onConfirm(selectedTime, message, videoPreferred);
      
      setSelectedTime('');
      setMessage('');
      setVideoPreferred(false);
    } catch (error) {
      console.error('Error creating booking:', error);
      showToast('Error creating booking. Please try again.', 'error');
    }
    
    setLoading(false);
  };

  if (!isOpen || !mentor) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content booking-modal" onClick={e => e.stopPropagation()}>
        <div className="booking-header">
          <h2>Book Session with {mentor.name}</h2>
          <p className="session-details">
            <ClockIcon /> 15-minute session &bull; ${mentor.rate}
          </p>
        </div>
        
        <form onSubmit={handleSubmit} className="booking-form">
          <div className="form-group">
            <label>Preferred Time Slot</label>
            <select 
              value={selectedTime} 
              onChange={e => setSelectedTime(e.target.value)}
              required
            >
              <option value="">Choose your preferred time</option>
              <option value="morning">Morning (9AM - 12PM)</option>
              <option value="afternoon">Afternoon (12PM - 5PM)</option>
              <option value="evening">Evening (5PM - 9PM)</option>
              <option value="flexible">I'm flexible</option>
            </select>
          </div>
          
          <div className="form-group">
            <label>What specific challenge can {mentor.name.split(' ')[0]} help you with?</label>
            <textarea 
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="Be specific about your question or challenge. This helps your mentor prepare and give you the best advice in your 15 minutes together."
              rows="4"
              required
            />
          </div>
          
          {mentor.videoAvailable && (
            <div className="form-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={videoPreferred}
                  onChange={e => setVideoPreferred(e.target.checked)}
                />
                <CheckIcon />
                <span>I'd prefer video for this session (recommended for technique questions)</span>
              </label>
            </div>
          )}
          
          <div className="booking-actions">
            <button type="button" onClick={onClose} className="cancel-btn">
              Cancel
            </button>
            <button 
              type="submit"
              className="confirm-btn"
              disabled={loading || !selectedTime || !message.trim()}
            >
              {loading ? 'Requesting...' : `Request Session ($${mentor.rate})`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

/* ============================================
   HOMEPAGE
   ============================================ */
const Homepage = ({ user, onAuthClick }) => {
  const [mentors, setMentors] = useState([]);
  const [loading, setLoading] = useState(true);  
  const [selectedMentor, setSelectedMentor] = useState(null);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [filter, setFilter] = useState('all');
  const { showToast } = useToast();

  useEffect(() => {
    const loadMentors = async () => {
      const enhancedMentors = await getEnhancedMentors();
      setMentors(enhancedMentors);
      setLoading(false);
    };
    loadMentors();
  }, []);

  const handleBookMentor = (mentor) => {
    if (!user) {
      onAuthClick();
      return;
    }
    setSelectedMentor(mentor);
    setShowBookingModal(true);
  };

  const handleConfirmBooking = (time, message, videoPreferred) => {
    showToast(`Session requested with ${selectedMentor.name}! Check "My Bookings" for updates.`, 'success');
    setShowBookingModal(false);
    setSelectedMentor(null);
  };

  const filteredMentors = filter === 'all' 
    ? mentors 
    : mentors.filter(mentor => mentor.category === filter);

  return (
    <main className="main">
      <div className="container">
        <section className="hero-section">
          <h2>Find Your Perfect Music Mentor</h2>
          <p>Get personalized advice from experienced musicians in focused 15-minute sessions</p>
        </section>

        <section className="filters">
          <div className="filter-buttons">
            {[
              { key: 'all', label: 'All Specialties' },
              { key: 'guitar', label: 'Guitar' },
              { key: 'production', label: 'Production' },
              { key: 'vocals', label: 'Vocals' },
              { key: 'business', label: 'Business' }
            ].map(({ key, label }) => (
              <button 
                key={key}
                className={filter === key ? 'active' : ''} 
                onClick={() => setFilter(key)}
              >
                {label}
              </button>
            ))}
          </div>
        </section>

        <section className="mentors-grid">
          {loading ? (
            <SkeletonMentorGrid count={4} />
          ) : filteredMentors.length === 0 ? (
            <div style={{
              gridColumn: '1 / -1',
              textAlign: 'center',
              padding: '3rem 1rem',
              color: 'var(--text-muted)'
            }}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ marginBottom: '1rem', opacity: 0.5 }}>
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <h3 style={{ color: 'var(--text-secondary)', marginBottom: '0.5rem', fontSize: '1.125rem' }}>
                No mentors found
              </h3>
              <p style={{ fontSize: '0.875rem' }}>
                Try selecting a different specialty or check back soon for new mentors.
              </p>
            </div>
          ) : (
            filteredMentors.map(mentor => (
              <MentorCard 
                key={mentor.id}
                mentor={mentor}
                onBook={handleBookMentor}
                user={user}
              />
            ))
          )}
        </section>
      </div>

      <CalendarBooking
        mentor={selectedMentor}
        isOpen={showBookingModal}
        onClose={() => setShowBookingModal(false)}
        onConfirm={handleConfirmBooking}
        user={user}
      />
    </main>
  );
};

/* ============================================
   MAIN APP COMPONENT
   ============================================ */
function App() {
  const [user, setUser] = useState(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [mentorInfo, setMentorInfo] = useState(null);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (authUser) => {
      if (authUser) {
        try {
          const mentorProfileRef = doc(db, 'mentorProfiles', authUser.uid);
          const mentorProfileSnap = await getDoc(mentorProfileRef);
          
          if (mentorProfileSnap.exists()) {
            const profileData = mentorProfileSnap.data();
            setMentorInfo({
              id: authUser.uid,
              displayName: profileData.displayName,
              ...profileData
            });
            
            setUser({
              ...authUser,
              displayName: profileData.displayName
            });
          } else {
            setMentorInfo(null);
            
            try {
              const userProfileRef = doc(db, 'userProfiles', authUser.uid);
              const userProfileSnap = await getDoc(userProfileRef);
              
              if (userProfileSnap.exists()) {
                const profileData = userProfileSnap.data();
                setUser({
                  ...authUser,
                  displayName: profileData.displayName || profileData.name || authUser.email
                });
              } else {
                setUser(authUser);
              }
            } catch (error) {
              console.error('Error fetching user profile:', error);
              setUser(authUser);
            }
          }
        } catch (error) {
          console.error('Error fetching mentor profile:', error);
          setMentorInfo(null);
          setUser(authUser);
        }
      } else {
        setUser(null);
        setMentorInfo(null);
      }
      
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  if (loading) {
    return (
      <div className="loading">
        <div>Loading MusicMentor...</div>
      </div>
    );
  }

  return (
    <Router>
      <div className="App" style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <Header 
          user={user}
          onSignOut={handleSignOut}
          onAuthClick={() => setShowAuthModal(true)}
          mentorInfo={mentorInfo}
        />
        
        <div style={{ flex: 1 }}>
          <Routes>
            <Route 
              path="/" 
              element={
                <Homepage 
                  user={user} 
                  onAuthClick={() => setShowAuthModal(true)} 
                />
              } 
            />
            <Route 
              path="/mentor-dashboard" 
              element={
                <MentorDashboard 
                  user={user} 
                  mentorInfo={mentorInfo} 
                />
              } 
            />
            <Route 
              path="/profile" 
              element={<UserProfile user={user} />} 
            />
            <Route 
              path="/mentor-profile" 
              element={<MentorProfile user={user} mentorInfo={mentorInfo} />} 
            />
            <Route 
              path="/mentor/:mentorId" 
              element={
                <MentorDetailPage 
                  user={user} 
                  onAuthClick={() => setShowAuthModal(true)} 
                />
              } 
            />
            <Route 
              path="/my-bookings" 
              element={
                <StudentDashboard 
                  user={user} 
                />
              } 
            />
          </Routes>
        </div>

        <Footer />

        <MobileBottomNav user={user} mentorInfo={mentorInfo} />

        <AuthModal
          isOpen={showAuthModal}
          onClose={() => setShowAuthModal(false)}
        />
      </div>
    </Router>
  );
}

/* ============================================
   WRAPPED EXPORT WITH TOAST PROVIDER
   ============================================ */
const AppWithProviders = () => (
  <ToastProvider>
    <App />
  </ToastProvider>
);

export default AppWithProviders;

/* ============================================
   INJECTED STYLES (hamburger menu, etc.)
   ============================================ */
if (typeof document !== 'undefined') {
  const id = 'app-injected-styles';
  if (!document.getElementById(id)) {
    const styleSheet = document.createElement("style");
    styleSheet.id = id;
    styleSheet.textContent = `
      .dashboard-link {
        color: white;
        text-decoration: none;
        background: rgba(255, 255, 255, 0.15);
        padding: 0.5rem 1rem;
        border-radius: 6px;
        font-weight: 500;
        transition: all 0.2s ease;
        backdrop-filter: blur(10px);
      }

      .dashboard-link:hover {
        background: rgba(255, 255, 255, 0.25);
        transform: translateY(-1px);
      }

      .user-menu-button {
        cursor: pointer;
        padding: 8px;
        border-radius: 6px;
        transition: background-color 0.2s ease;
      }

      .user-menu-button:hover {
        background: rgba(255, 255, 255, 0.1);
      }

      .hamburger-icon {
        display: flex;
        flex-direction: column;
        width: 24px;
        height: 18px;
        justify-content: space-between;
      }

      .hamburger-icon span {
        display: block;
        height: 2px;
        width: 100%;
        background-color: white;
        border-radius: 1px;
        transition: all 0.2s ease;
      }
    `;
    document.head.appendChild(styleSheet);
  }
}

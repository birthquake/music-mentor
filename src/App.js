/* ============================================
   App.js - SECTION 1 of 7
   Imports & Icon Components
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
import UserProfile from './UserProfile';
import MentorProfile from './MentorProfile';
import CalendarBooking from './CalendarBooking';
import MentorDashboard from './MentorDashboard';
import StudentDashboard from './StudentDashboard';
import './App.css';
import './MentorDashboard.css';

// Icons
const StarIcon = ({ filled = false }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill={filled ? "#FFA500" : "none"} stroke={filled ? "#FFA500" : "#CBD5E0"} strokeWidth="2">
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

const UserIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
    <circle cx="12" cy="7" r="4"></circle>
  </svg>
);

/* END OF SECTION 1 - Copy this section to your App.js */
/* ============================================
   App.js - SECTION 2 of 7
   Sample Mentors Data & Auth Modal Component
   ============================================ */

// Sample mentors data
const SAMPLE_MENTORS = [
  {
    id: 1,
    name: "Sarah Chen",
    email: "sarah@musicmentor.com",
    specialty: "Guitar & Songwriting",
    experience: 8,
    rate: 35,
    rating: 4.9,
    reviewCount: 127,
    category: "guitar",
    videoAvailable: true,
    tags: ["Acoustic", "Electric", "Songwriting", "Theory"]
  },
  {
    id: 2,
    name: "Marcus Johnson", 
    email: "marcus@musicmentor.com",
    specialty: "Music Production & Mixing",
    experience: 12,
    rate: 55,
    rating: 4.8,
    reviewCount: 89,
    category: "production",
    videoAvailable: true,
    tags: ["Logic Pro", "Ableton", "Mixing", "Mastering"]
  },
  {
    id: 3,
    name: "Elena Rodriguez",
    email: "elena@musicmentor.com", 
    specialty: "Vocal Technique & Performance",
    experience: 6,
    rate: 40,
    rating: 5.0,
    reviewCount: 203,
    category: "vocals",
    videoAvailable: true,
    tags: ["Classical", "Pop", "Breathing", "Performance"]
  },
  {
    id: 4,
    name: "Your Test Mentor Profile",
    email: "rashiedtyre@gmail.com", // YOUR EMAIL
    specialty: "Music Business & Booking", 
    experience: 15,
    rate: 45,
    rating: 4.7,
    reviewCount: 156,
    category: "business",
    videoAvailable: false,
    tags: ["Booking", "Contracts", "Marketing", "Revenue"]
  }
];

// Auth Modal Component
const AuthModal = ({ isOpen, onClose }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
      }
      onClose();
      setEmail('');
      setPassword('');
    } catch (error) {
      setError(error.message);
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
          <div style={{color: '#e53e3e', marginBottom: '1rem', padding: '0.75rem', background: '#fed7d7', borderRadius: '8px', fontSize: '0.875rem'}}>
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

        {/* Mentor login hint */}
        <div style={{marginTop: '1rem', padding: '0.75rem', background: '#f0f9ff', borderRadius: '8px', fontSize: '0.875rem', color: '#0369a1'}}>
          <strong>Mentors:</strong> Use sarah@musicmentor.com, marcus@musicmentor.com, elena@musicmentor.com with password "mentor123" to access dashboard
        </div>
      </div>
    </div>
  );
};

/* END OF SECTION 2 - Copy this below Section 1 */
/* ============================================
   App.js - SECTION 3 of 7
   Header Component & Dashboard Link Styles
   ============================================ */

// Header Component
const Header = ({ user, onSignOut, onAuthClick, mentorInfo }) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const toggleDropdown = () => {
    setDropdownOpen(!dropdownOpen);
  };

  // Close dropdown when clicking outside
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
            <Link to="/" style={{ color: 'white', textDecoration: 'none' }}>
              <h1>MusicMentor</h1>
            </Link>
          </div>
          
          <div className="header-actions">
            {user ? (
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

// Dashboard Link Styles
const dashboardLinkStyles = `
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

// Inject the styles
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement("style");
  styleSheet.textContent = dashboardLinkStyles;
  document.head.appendChild(styleSheet);
}

/* END OF SECTION 3 - Copy this below Section 2 */
/* ============================================
   App.js - SECTION 4 of 7
   Mentor Card & Booking Modal Components
   ============================================ */

// Mentor Card Component
const MentorCard = ({ mentor, onBook, user }) => {
  const renderStars = (rating) => {
    return [...Array(5)].map((_, i) => (
      <StarIcon key={i} filled={i < Math.floor(rating)} />
    ));
  };

  return (
    <div className="mentor-card">
      <div className="mentor-header">
        <div className="mentor-avatar">
          {mentor.name.split(' ').map(n => n[0]).join('')}
        </div>
        <div className="mentor-basic-info">
          <h3>{mentor.name}</h3>
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

// Booking Modal Component  
const BookingModal = ({ mentor, isOpen, onClose, onConfirm, user }) => {
  const [selectedTime, setSelectedTime] = useState('');
  const [message, setMessage] = useState('');
  const [videoPreferred, setVideoPreferred] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      // Save booking to Firestore with profile integration
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
      
      // Reset form
      setSelectedTime('');
      setMessage('');
      setVideoPreferred(false);
    } catch (error) {
      console.error('Error creating booking:', error);
      alert('Error creating booking. Please try again.');
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
            <ClockIcon /> 15-minute session • ${mentor.rate}
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

/* END OF SECTION 4 - Copy this below Section 3 */
/* ============================================
   App.js - SECTION 5 of 7
   Homepage Component
   ============================================ */

// Homepage Component
const Homepage = ({ user, onAuthClick }) => {
  const [mentors, setMentors] = useState([]);
  const [loading, setLoading] = useState(true);  
  const [selectedMentor, setSelectedMentor] = useState(null);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [filter, setFilter] = useState('all');

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
    alert(`🎵 Session requested successfully!\n\nMentor: ${selectedMentor.name}\nTime preference: ${time}\nVideo: ${videoPreferred ? 'Yes' : 'Audio only'}\n\nYou can track your booking status in "My Bookings".`);
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
            <button 
              className={filter === 'all' ? 'active' : ''} 
              onClick={() => setFilter('all')}
            >
              All Specialties
            </button>
            <button 
              className={filter === 'guitar' ? 'active' : ''} 
              onClick={() => setFilter('guitar')}
            >
              Guitar
            </button>
            <button 
              className={filter === 'production' ? 'active' : ''} 
              onClick={() => setFilter('production')}
            >
              Production
            </button>
            <button 
              className={filter === 'vocals' ? 'active' : ''} 
              onClick={() => setFilter('vocals')}
            >
              Vocals
            </button>
            <button 
              className={filter === 'business' ? 'active' : ''} 
              onClick={() => setFilter('business')}
            >
              Business
            </button>
          </div>
        </section>

        <section className="mentors-grid">
          {loading ? (
            <div>Loading mentors...</div>
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

/* END OF SECTION 5 - Copy this below Section 4 */
/* ============================================
   App.js - SECTION 6 of 7
   Main App Component with FIXED User Profile Loading
   ============================================ */

// Main App Component
function App() {
  const [user, setUser] = useState(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [mentorInfo, setMentorInfo] = useState(null);

  // Auth state listener with FIXED student profile loading
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (authUser) => {
      if (authUser) {
        // First, try to load mentor profile
        try {
          const mentorProfileRef = doc(db, 'mentorProfiles', authUser.uid);
          const mentorProfileSnap = await getDoc(mentorProfileRef);
          
          if (mentorProfileSnap.exists()) {
            // User is a mentor
            const profileData = mentorProfileSnap.data();
            setMentorInfo({
              id: authUser.uid,
              displayName: profileData.displayName,
              ...profileData
            });
            
            // Set user with mentor data
            setUser({
              ...authUser,
              displayName: profileData.displayName
            });
          } else {
            // Not a mentor, try to load student profile
            setMentorInfo(null);
            
            try {
              const userProfileRef = doc(db, 'userProfiles', authUser.uid);
              const userProfileSnap = await getDoc(userProfileRef);
              
              if (userProfileSnap.exists()) {
                // User has a student profile
                const profileData = userProfileSnap.data();
                setUser({
                  ...authUser,
                  displayName: profileData.displayName || profileData.name || authUser.email
                });
              } else {
                // No profile exists yet
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
        // User signed out
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
      <div className="App">
        <Header 
          user={user}
          onSignOut={handleSignOut}
          onAuthClick={() => setShowAuthModal(true)}
          mentorInfo={mentorInfo}
        />
        
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
            path="/my-bookings" 
            element={
              <StudentDashboard 
                user={user} 
              />
            } 
          />
        </Routes>

        <AuthModal
          isOpen={showAuthModal}
          onClose={() => setShowAuthModal(false)}
        />
      </div>
    </Router>
  );
}

/* END OF SECTION 6 - Copy this below Section 5 */
/* ============================================
   App.js - SECTION 7 of 7 (FINAL)
   Export Statement
   ============================================ */

export default App;

/* ============================================
   🎉 COMPLETE! All 7 sections done!
   
   Your App.js should now have:
   ✅ Section 1: Imports & Icons
   ✅ Section 2: Sample Mentors & Auth Modal
   ✅ Section 3: Header Component & Styles
   ✅ Section 4: Mentor Card & Booking Modal
   ✅ Section 5: Homepage Component
   ✅ Section 6: Main App Component (FIXED)
   ✅ Section 7: Export
   
   KEY FIXES IN THIS VERSION:
   - Student profile loading from userProfiles collection
   - Uses displayName field for students
   - Proper fallback handling
   - Should fix "Hi, corktapp" issue
   
   DEPLOY & TEST:
   1. Deploy to Vercel/your hosting
   2. Hard refresh (Ctrl+Shift+R)
   3. Check student dashboard name
   4. Check if stats grid appears
   ============================================ */

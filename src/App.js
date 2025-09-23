import React, { useState, useEffect } from 'react';
import { auth, db } from './firebase';
import { 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut
} from 'firebase/auth';
import { 
  collection, 
  addDoc,
  serverTimestamp
} from 'firebase/firestore';
import './App.css';

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
      </div>
    </div>
  );
};

// Header Component
const Header = ({ user, onSignOut, onAuthClick }) => (
  <header className="header">
    <div className="container">
      <div className="header-content">
        <div className="brand">
          <h1>MusicMentor</h1>
          <p>Expert music guidance in 15 minutes</p>
        </div>
        
        <div className="header-actions">
          {user ? (
            <div className="user-menu">
              <div className="user-info">
                <UserIcon />
                <span>{user.email}</span>
              </div>
              <button onClick={onSignOut} className="sign-out-btn">
                Sign Out
              </button>
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
      // Save booking to Firestore
      await addDoc(collection(db, 'bookings'), {
        mentorId: mentor.id,
        mentorName: mentor.name,
        userId: user.uid,
        userEmail: user.email,
        preferredTime: selectedTime,
        message,
        videoPreferred,
        status: 'pending',
        createdAt: serverTimestamp(),
        rate: mentor.rate
      });
      
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
// Main App Component
function App() {
  const [user, setUser] = useState(null);
  const [mentors, setMentors] = useState([]);
  const [selectedMentor, setSelectedMentor] = useState(null);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  // Auth state listener
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setUser(user);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Load sample mentors
  useEffect(() => {
    const sampleMentors = [
      {
        id: 1,
        name: "Sarah Chen",
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
        name: "Dave Williams",
        specialty: "Music Business & Booking",
        experience: 15,
        rate: 45,
        rating: 4.7,
        reviewCount: 156,
        category: "business",
        videoAvailable: false,
        tags: ["Booking", "Contracts", "Marketing", "Revenue"]
      },
      {
        id: 5,
        name: "Aisha Patel",
        specialty: "Piano & Music Theory",
        experience: 10,
        rate: 42,
        rating: 4.9,
        reviewCount: 178,
        category: "piano",
        videoAvailable: true,
        tags: ["Classical", "Jazz", "Theory", "Composition"]
      },
      {
        id: 6,
        name: "Ryan Murphy",
        specialty: "Drums & Rhythm",
        experience: 7,
        rate: 38,
        rating: 4.6,
        reviewCount: 94,
        category: "drums",
        videoAvailable: true,
        tags: ["Rock", "Jazz", "Latin", "Technique"]
      }
    ];
    setMentors(sampleMentors);
  }, []);

  const handleBookMentor = (mentor) => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }
    setSelectedMentor(mentor);
    setShowBookingModal(true);
  };

  const handleConfirmBooking = (time, message, videoPreferred) => {
    alert(`🎵 Session requested successfully!\n\nMentor: ${selectedMentor.name}\nTime preference: ${time}\nVideo: ${videoPreferred ? 'Yes' : 'Audio only'}\n\nYou'll receive a confirmation email shortly with next steps.`);
    setShowBookingModal(false);
    setSelectedMentor(null);
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const filteredMentors = filter === 'all' 
    ? mentors 
    : mentors.filter(mentor => mentor.category === filter);

  if (loading) {
    return (
      <div className="loading">
        <div>Loading MusicMentor...</div>
      </div>
    );
  }

  return (
    <div className="App">
      <Header 
        user={user}
        onSignOut={handleSignOut}
        onAuthClick={() => setShowAuthModal(true)}
      />
      
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
              <button 
                className={filter === 'piano' ? 'active' : ''} 
                onClick={() => setFilter('piano')}
              >
                Piano
              </button>
              <button 
                className={filter === 'drums' ? 'active' : ''} 
                onClick={() => setFilter('drums')}
              >
                Drums
              </button>
            </div>
          </section>

          <section className="mentors-grid">
            {filteredMentors.map(mentor => (
              <MentorCard 
                key={mentor.id}
                mentor={mentor}
                onBook={handleBookMentor}
                user={user}
              />
            ))}
          </section>
        </div>
      </main>

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
      />

      <BookingModal
        mentor={selectedMentor}
        isOpen={showBookingModal}
        onClose={() => setShowBookingModal(false)}
        onConfirm={handleConfirmBooking}
        user={user}
      />
    </div>
  );
}

export default App;

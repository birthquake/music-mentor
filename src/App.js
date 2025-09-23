import React, { useState, useEffect } from 'react';
import { auth } from './firebase';
import { 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut
} from 'firebase/auth';
import './App.css';

// Simple Auth Modal
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
    } catch (error) {
      setError(error.message);
      console.error('Auth error:', error);
    }
    
    setLoading(false);
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content auth-modal" onClick={e => e.stopPropagation()}>
        <h2>{isLogin ? 'Sign In' : 'Create Account'}</h2>
        
        {error && (
          <div style={{color: 'red', marginBottom: '1rem', padding: '0.5rem', background: '#fee', borderRadius: '4px'}}>
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="auth-form">
          <input
            type="email"
            placeholder="Email"
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
            {loading ? 'Loading...' : (isLogin ? 'Sign In' : 'Create Account')}
          </button>
        </form>
        
        <p>
          {isLogin ? "Don't have an account? " : "Have an account? "}
          <button 
            type="button" 
            onClick={() => setIsLogin(!isLogin)}
            style={{background: 'none', border: 'none', color: '#667eea', cursor: 'pointer', textDecoration: 'underline'}}
          >
            {isLogin ? 'Sign up' : 'Sign in'}
          </button>
        </p>
      </div>
    </div>
  );
};

// Simple Header
const Header = ({ user, onSignOut, onSignIn }) => (
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
              <span style={{color: 'white', marginRight: '1rem'}}>
                Welcome, {user.email}!
              </span>
              <button onClick={onSignOut} className="sign-out-btn">
                Sign Out
              </button>
            </div>
          ) : (
            <button onClick={onSignIn} className="sign-in-btn">
              Sign In
            </button>
          )}
        </div>
      </div>
    </div>
  </header>
);

// Main App
function App() {
  const [user, setUser] = useState(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [loading, setLoading] = useState(true);

  // Listen for auth changes
  useEffect(() => {
    console.log('Setting up auth listener...');
    const unsubscribe = auth.onAuthStateChanged((user) => {
      console.log('Auth state changed:', user);
      setUser(user);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      console.log('Signed out successfully');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div className="App">
      <Header 
        user={user}
        onSignOut={handleSignOut}
        onSignIn={() => {
          console.log('Sign in button clicked');
          setShowAuthModal(true);
        }}
      />
      
      <main className="main">
        <div className="container">
          <div style={{textAlign: 'center', padding: '2rem'}}>
            {user ? (
              <div>
                <h2>Welcome back!</h2>
                <p>You are signed in as: {user.email}</p>
                <p>User ID: {user.uid}</p>
              </div>
            ) : (
              <div>
                <h2>Please sign in to continue</h2>
                <button 
                  onClick={() => setShowAuthModal(true)}
                  style={{
                    background: '#667eea',
                    color: 'white',
                    border: 'none',
                    padding: '1rem 2rem',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '1rem'
                  }}
                >
                  Sign In
                </button>
              </div>
            )}
          </div>
        </div>
      </main>

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => {
          console.log('Closing auth modal');
          setShowAuthModal(false);
        }}
      />
    </div>
  );
}

export default App;

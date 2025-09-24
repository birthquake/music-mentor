// UserProfile.js - Create this new component
import React, { useState, useEffect } from 'react';
import { getUserProfile, createUserProfile, DEFAULT_USER_PROFILE } from './profileHelpers';

// Icons
const UserIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
    <circle cx="12" cy="7" r="4"></circle>
  </svg>
);

const MusicIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
  </svg>
);

const TargetIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10"></circle>
    <circle cx="12" cy="12" r="6"></circle>
    <circle cx="12" cy="12" r="2"></circle>
  </svg>
);

const UserProfile = ({ user }) => {
  const [profile, setProfile] = useState(DEFAULT_USER_PROFILE);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasProfile, setHasProfile] = useState(false);

  useEffect(() => {
    if (user) {
      loadProfile();
    }
  }, [user]);

  const loadProfile = async () => {
    try {
      const result = await getUserProfile(user.uid);
      if (result.success) {
        setProfile(result.profile);
        setHasProfile(true);
      } else {
        // No profile exists yet, use defaults
        setProfile({
          ...DEFAULT_USER_PROFILE,
          displayName: user.displayName || '',
          firstName: user.displayName?.split(' ')[0] || '',
          lastName: user.displayName?.split(' ')[1] || ''
        });
        setHasProfile(false);
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    }
    setLoading(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      const result = await createUserProfile(user.uid, profile);
      if (result.success) {
        setHasProfile(true);
        alert('Profile saved successfully!');
      } else {
        alert('Error saving profile: ' + result.error);
      }
    } catch (error) {
      console.error('Error saving profile:', error);
      alert('Error saving profile');
    }

    setSaving(false);
  };

  const handleChange = (field, value) => {
    setProfile(prev => ({
      ...prev,
      [field]: value
    }));
  };

  if (loading) {
    return (
      <div className="dashboard-container">
        <div className="loading-bookings">Loading your profile...</div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <div className="student-welcome">
          <h1>Your Profile</h1>
          <p>Tell us about your musical journey and learning goals</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="profile-form">
        {/* Basic Information */}
        <div className="profile-section">
          <div className="section-header">
            <UserIcon />
            <h3>Basic Information</h3>
          </div>
          
          <div className="form-grid">
            <div className="form-group">
              <label>First Name</label>
              <input
                type="text"
                value={profile.firstName}
                onChange={(e) => handleChange('firstName', e.target.value)}
                placeholder="Your first name"
                required
              />
            </div>

            <div className="form-group">
              <label>Last Name</label>
              <input
                type="text"
                value={profile.lastName}
                onChange={(e) => handleChange('lastName', e.target.value)}
                placeholder="Your last name"
                required
              />
            </div>

            <div className="form-group">
              <label>Display Name</label>
              <input
                type="text"
                value={profile.displayName}
                onChange={(e) => handleChange('displayName', e.target.value)}
                placeholder="How you'd like to appear to mentors"
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label>Bio</label>
            <textarea
              value={profile.bio}
              onChange={(e) => handleChange('bio', e.target.value)}
              placeholder="Tell mentors a bit about yourself and your musical background..."
              rows="4"
            />
          </div>
        </div>

        {/* Musical Information */}
        <div className="profile-section">
          <div className="section-header">
            <MusicIcon />
            <h3>Musical Background</h3>
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label>Primary Instrument/Focus</label>
              <select
                value={profile.instrument}
                onChange={(e) => handleChange('instrument', e.target.value)}
                required
              >
                <option value="">Select your main focus</option>
                <option value="guitar">Guitar</option>
                <option value="vocals">Vocals</option>
                <option value="piano">Piano/Keys</option>
                <option value="bass">Bass</option>
                <option value="drums">Drums</option>
                <option value="production">Music Production</option>
                <option value="songwriting">Songwriting</option>
                <option value="music-business">Music Business</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div className="form-group">
              <label>Experience Level</label>
              <select
                value={profile.experienceLevel}
                onChange={(e) => handleChange('experienceLevel', e.target.value)}
                required
              >
                <option value="beginner">Beginner (0-1 years)</option>
                <option value="intermediate">Intermediate (1-5 years)</option>
                <option value="advanced">Advanced (5+ years)</option>
                <option value="professional">Professional</option>
              </select>
            </div>
          </div>
        </div>

        {/* Learning Goals */}
        <div className="profile-section">
          <div className="section-header">
            <TargetIcon />
            <h3>Learning Goals</h3>
          </div>

          <div className="form-group">
            <label>What are you hoping to achieve?</label>
            <textarea
              value={profile.learningGoals}
              onChange={(e) => handleChange('learningGoals', e.target.value)}
              placeholder="Describe your musical goals, what you want to learn, or challenges you're facing..."
              rows="4"
            />
          </div>
        </div>

        {/* Contact Preferences */}
        <div className="profile-section">
          <div className="section-header">
            <h3>Preferences</h3>
          </div>

          <div className="preferences-grid">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={profile.contactPreferences.email}
                onChange={(e) => handleChange('contactPreferences', {
                  ...profile.contactPreferences,
                  email: e.target.checked
                })}
              />
              <span className="checkbox-text">Email notifications for booking updates</span>
            </label>

            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={profile.contactPreferences.sms}
                onChange={(e) => handleChange('contactPreferences', {
                  ...profile.contactPreferences,
                  sms: e.target.checked
                })}
              />
              <span className="checkbox-text">SMS notifications (coming soon)</span>
            </label>
          </div>
        </div>

        {/* Submit Button */}
        <div className="form-actions">
          <button
            type="submit"
            className="save-profile-btn"
            disabled={saving}
          >
            {saving ? 'Saving...' : hasProfile ? 'Update Profile' : 'Create Profile'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default UserProfile;

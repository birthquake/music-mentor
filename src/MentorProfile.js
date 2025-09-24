// MentorProfile.js - Basic structure only
import React, { useState, useEffect } from 'react';
import { getMentorProfile, createMentorProfile, DEFAULT_MENTOR_PROFILE } from './profileHelpers';

const MentorProfile = ({ user, mentorInfo }) => {
  const [profile, setProfile] = useState(DEFAULT_MENTOR_PROFILE);
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
      const result = await getMentorProfile(user.uid);
      if (result.success) {
        setProfile(result.profile);
        setHasProfile(true);
      } else {
        // Use defaults with prefilled data from existing mentor info
        setProfile({
          ...DEFAULT_MENTOR_PROFILE,
          displayName: mentorInfo?.name || '',
          firstName: mentorInfo?.name?.split(' ')[0] || '',
          lastName: mentorInfo?.name?.split(' ')[1] || '',
          rate: mentorInfo?.rate || 35,
          experience: mentorInfo?.experience || 0
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
      const result = await createMentorProfile(user.uid, profile);
      if (result.success) {
        setHasProfile(true);
        alert('Mentor profile saved successfully!');
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
        <div className="loading-bookings">Loading your mentor profile...</div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <div className="mentor-welcome">
          <h1>Mentor Profile</h1>
          <p>Create your mentor profile to start receiving session requests</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="profile-form">
        {/* Basic Info Section */}
        <div className="profile-section">
          <h3>Basic Information</h3>
          
          <div className="form-grid">
            <div className="form-group">
              <label>Display Name *</label>
              <input
                type="text"
                value={profile.displayName}
                onChange={(e) => handleChange('displayName', e.target.value)}
                placeholder="How you appear to students"
                required
              />
            </div>

            <div className="form-group">
              <label>Years of Experience *</label>
              <input
                type="number"
                value={profile.experience}
                onChange={(e) => handleChange('experience', parseInt(e.target.value) || 0)}
                placeholder="Years"
                min="0"
                max="50"
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label>Bio *</label>
            <textarea
              value={profile.bio}
              onChange={(e) => handleChange('bio', e.target.value)}
              placeholder="Tell students about your background and experience..."
              rows="4"
              required
            />
          </div>

          <div className="form-group">
            <label>Rate per 15-minute session *</label>
            <div className="price-input">
              <span className="currency">$</span>
              <input
                type="number"
                value={profile.rate}
                onChange={(e) => handleChange('rate', parseInt(e.target.value) || 35)}
                placeholder="35"
                min="10"
                max="500"
                required
              />
            </div>
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

export default MentorProfile;

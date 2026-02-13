// UserProfile.js - Student profile with completion indicator
import React, { useState, useEffect } from 'react';
import { getUserProfile, createUserProfile, DEFAULT_USER_PROFILE } from './profileHelpers';
import { 
  ButtonSpinner, 
  FullPageLoading, 
  useToast 
} from './LoadingComponents';

/* ============================================
   ICONS
   ============================================ */
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

const CheckCircleIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
  </svg>
);

const CircleIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10" />
  </svg>
);

/* ============================================
   PROFILE COMPLETION CALCULATION
   ============================================ */
export const getProfileCompletion = (profile) => {
  if (!profile) return { percent: 0, completed: [], missing: [], nextTip: '' };

  const fields = [
    { key: 'displayName', label: 'Display name', required: true },
    { key: 'firstName', label: 'First name', required: true },
    { key: 'lastName', label: 'Last name', required: true },
    { key: 'instrument', label: 'Primary instrument', required: true },
    { key: 'experienceLevel', label: 'Experience level', required: false },
    { key: 'bio', label: 'Bio', required: false },
    { key: 'learningGoals', label: 'Learning goals', required: false },
  ];

  const completed = [];
  const missing = [];

  fields.forEach(f => {
    const val = profile[f.key];
    const isFilled = val && typeof val === 'string' ? val.trim().length > 0 : !!val;
    if (isFilled) {
      completed.push(f);
    } else {
      missing.push(f);
    }
  });

  const percent = Math.round((completed.length / fields.length) * 100);

  const tips = {
    bio: 'Adding a bio helps mentors understand your background.',
    learningGoals: 'Sharing your goals helps mentors prepare better sessions.',
    instrument: 'Select your primary instrument to get matched with the right mentors.',
    displayName: 'Set a display name so mentors know who you are.',
  };

  const nextTip = missing.length > 0 ? (tips[missing[0].key] || `Complete your ${missing[0].label}.`) : '';

  return { percent, completed, missing, nextTip };
};

/* ============================================
   PROFILE COMPLETION BAR (exported for reuse)
   ============================================ */
export const ProfileCompletionBar = ({ profile, compact = false }) => {
  const { percent, completed, missing, nextTip } = getProfileCompletion(profile);

  if (percent === 100) {
    if (compact) return null; // Don't show on dashboard if complete
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--spacing-sm)',
        padding: 'var(--spacing-md)',
        background: 'rgba(16, 185, 129, 0.1)',
        border: '1px solid rgba(16, 185, 129, 0.3)',
        borderRadius: 'var(--radius-md)',
        marginBottom: 'var(--spacing-xl)',
        color: 'var(--accent-green-light)',
        fontSize: '0.875rem',
        fontWeight: '600'
      }}>
        <CheckCircleIcon />
        Profile complete! Mentors can see your full background.
      </div>
    );
  }

  const barColor = percent >= 75 ? 'var(--accent-green)' : percent >= 40 ? 'var(--accent-orange)' : 'var(--accent-blue)';

  return (
    <div style={{
      padding: compact ? 'var(--spacing-md)' : 'var(--spacing-lg)',
      background: 'var(--bg-card)',
      border: '1px solid var(--border-color)',
      borderRadius: 'var(--radius-lg)',
      marginBottom: 'var(--spacing-xl)'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-sm)' }}>
        <span style={{ fontSize: '0.875rem', fontWeight: '700', color: 'var(--text-primary)' }}>
          Profile {percent}% complete
        </span>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          {completed.length}/{completed.length + missing.length} fields
        </span>
      </div>

      {/* Progress bar */}
      <div style={{
        width: '100%',
        height: '8px',
        background: 'var(--bg-elevated)',
        borderRadius: '4px',
        overflow: 'hidden',
        marginBottom: nextTip && !compact ? 'var(--spacing-sm)' : '0'
      }}>
        <div style={{
          width: `${percent}%`,
          height: '100%',
          background: barColor,
          borderRadius: '4px',
          transition: 'width 0.5s ease'
        }} />
      </div>

      {/* Next tip */}
      {nextTip && !compact && (
        <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', margin: 0 }}>
          {nextTip}
        </p>
      )}

      {/* Checklist (full view only) */}
      {!compact && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: 'var(--spacing-md)' }}>
          {[...getProfileCompletion(profile).completed.map(f => ({ ...f, done: true })),
            ...getProfileCompletion(profile).missing.map(f => ({ ...f, done: false }))
          ].map(f => (
            <span key={f.key} style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '0.75rem',
              padding: '0.25rem 0.625rem',
              borderRadius: 'var(--radius-full)',
              background: f.done ? 'rgba(16, 185, 129, 0.1)' : 'var(--bg-elevated)',
              color: f.done ? 'var(--accent-green-light)' : 'var(--text-muted)',
              border: f.done ? '1px solid rgba(16, 185, 129, 0.2)' : '1px solid var(--border-color)'
            }}>
              {f.done ? <CheckCircleIcon /> : <CircleIcon />}
              {f.label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

/* ============================================
   MAIN COMPONENT
   ============================================ */
const UserProfile = ({ user }) => {
  const [profile, setProfile] = useState(DEFAULT_USER_PROFILE);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasProfile, setHasProfile] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    if (user) {
      loadProfile();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const loadProfile = async () => {
    try {
      const result = await getUserProfile(user.uid);
      if (result.success) {
        setProfile(result.profile);
        setHasProfile(true);
      } else {
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
        showToast('Profile saved!', 'success');
      } else {
        showToast('Error saving profile: ' + result.error, 'error');
      }
    } catch (error) {
      console.error('Error saving profile:', error);
      showToast('Error saving profile. Please try again.', 'error');
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
    return <FullPageLoading message="Loading your profile..." />;
  }

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <div className="student-welcome">
          <h1>Your Profile</h1>
          <p>Tell us about your musical journey and learning goals</p>
        </div>
      </div>

      {/* Profile Completion */}
      <ProfileCompletionBar profile={profile} />

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

        {/* Submit */}
        <div className="form-actions">
          <button
            type="submit"
            className="save-profile-btn"
            disabled={saving}
          >
            {saving ? (
              <>
                <ButtonSpinner />
                Saving...
              </>
            ) : (
              hasProfile ? 'Update Profile' : 'Create Profile'
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default UserProfile;

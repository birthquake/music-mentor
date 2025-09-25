// MentorProfile.js - With Availability Management
import React, { useState, useEffect } from 'react';
import { getMentorProfile, createMentorProfile, DEFAULT_MENTOR_PROFILE } from './profileHelpers';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from './firebase';

const MentorProfile = ({ user, mentorInfo }) => {
  const [profile, setProfile] = useState(DEFAULT_MENTOR_PROFILE);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasProfile, setHasProfile] = useState(false);
  const [activeTab, setActiveTab] = useState('basic'); // 'basic' or 'availability'

  const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  const TIME_SLOTS = [
    '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
    '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
    '15:00', '15:30', '16:00', '16:30', '17:00', '17:30',
    '18:00', '18:30', '19:00', '19:30', '20:00', '20:30'
  ];

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
      if (hasProfile) {
        // Update existing profile
        await updateDoc(doc(db, 'mentorProfiles', user.uid), {
          ...profile,
          updatedAt: new Date()
        });
        alert('Mentor profile updated successfully!');
      } else {
        // Create new profile
        const result = await createMentorProfile(user.uid, profile);
        if (result.success) {
          setHasProfile(true);
          alert('Mentor profile created successfully!');
        } else {
          alert('Error saving profile: ' + result.error);
        }
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

  const handleAvailabilityChange = (day, field, value) => {
    setProfile(prev => ({
      ...prev,
      availability: {
        ...prev.availability,
        weeklySchedule: {
          ...prev.availability.weeklySchedule,
          [day]: {
            ...prev.availability.weeklySchedule[day],
            [field]: value
          }
        }
      }
    }));
  };

  const addTimeSlot = (day) => {
    const currentSlots = profile.availability.weeklySchedule[day].slots || [];
    const newSlot = { start: '09:00', end: '09:15' };
    
    setProfile(prev => ({
      ...prev,
      availability: {
        ...prev.availability,
        weeklySchedule: {
          ...prev.availability.weeklySchedule,
          [day]: {
            ...prev.availability.weeklySchedule[day],
            slots: [...currentSlots, newSlot]
          }
        }
      }
    }));
  };

  const removeTimeSlot = (day, index) => {
    const currentSlots = [...profile.availability.weeklySchedule[day].slots];
    currentSlots.splice(index, 1);
    
    setProfile(prev => ({
      ...prev,
      availability: {
        ...prev.availability,
        weeklySchedule: {
          ...prev.availability.weeklySchedule,
          [day]: {
            ...prev.availability.weeklySchedule[day],
            slots: currentSlots
          }
        }
      }
    }));
  };

  const updateTimeSlot = (day, index, field, value) => {
    const currentSlots = [...profile.availability.weeklySchedule[day].slots];
    currentSlots[index] = {
      ...currentSlots[index],
      [field]: value
    };
    
    setProfile(prev => ({
      ...prev,
      availability: {
        ...prev.availability,
        weeklySchedule: {
          ...prev.availability.weeklySchedule,
          [day]: {
            ...prev.availability.weeklySchedule[day],
            slots: currentSlots
          }
        }
      }
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

      {/* Tab Navigation */}
      <div className="profile-tabs">
        <button 
          className={`tab ${activeTab === 'basic' ? 'active' : ''}`}
          onClick={() => setActiveTab('basic')}
        >
          Basic Information
        </button>
        <button 
          className={`tab ${activeTab === 'availability' ? 'active' : ''}`}
          onClick={() => setActiveTab('availability')}
        >
          Availability
        </button>
      </div>

      <form onSubmit={handleSubmit} className="profile-form">
        {/* Basic Info Tab */}
        {activeTab === 'basic' && (
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
        )}

        {/* Availability Tab */}
        {activeTab === 'availability' && (
          <div className="profile-section">
            <h3>Set Your Availability</h3>
            <p>Choose the days and times when you're available for mentoring sessions.</p>
            
            <div className="availability-settings">
              {DAYS.map(day => {
                const dayData = profile.availability.weeklySchedule[day];
                const isAvailable = dayData?.available || false;
                const slots = dayData?.slots || [];
                
                return (
                  <div key={day} className="day-availability">
                    <div className="day-header">
                      <label className="day-toggle">
                        <input
                          type="checkbox"
                          checked={isAvailable}
                          onChange={(e) => handleAvailabilityChange(day, 'available', e.target.checked)}
                        />
                        <span className="day-name">{day.charAt(0).toUpperCase() + day.slice(1)}</span>
                      </label>
                    </div>
                    
                    {isAvailable && (
                      <div className="time-slots">
                        {slots.map((slot, index) => (
                          <div key={index} className="time-slot">
                            <select
                              value={slot.start}
                              onChange={(e) => updateTimeSlot(day, index, 'start', e.target.value)}
                            >
                              {TIME_SLOTS.map(time => (
                                <option key={time} value={time}>{time}</option>
                              ))}
                            </select>
                            <span>to</span>
                            <select
                              value={slot.end}
                              onChange={(e) => updateTimeSlot(day, index, 'end', e.target.value)}
                            >
                              {TIME_SLOTS.map(time => (
                                <option key={time} value={time}>{time}</option>
                              ))}
                            </select>
                            <button
                              type="button"
                              onClick={() => removeTimeSlot(day, index)}
                              className="remove-slot"
                            >
                              Remove
                            </button>
                          </div>
                        ))}
                        
                        <button
                          type="button"
                          onClick={() => addTimeSlot(day)}
                          className="add-slot"
                        >
                          Add Time Slot
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

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

      <style jsx>{`
        .profile-tabs {
          display: flex;
          margin-bottom: 2rem;
          border-bottom: 2px solid #e2e8f0;
        }
        
        .tab {
          padding: 0.75rem 1.5rem;
          background: none;
          border: none;
          font-weight: 500;
          cursor: pointer;
          color: #64748b;
          border-bottom: 3px solid transparent;
        }
        
        .tab.active {
          color: #3b82f6;
          border-bottom-color: #3b82f6;
        }
        
        .availability-settings {
          space-y: 1.5rem;
        }
        
        .day-availability {
          padding: 1rem;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          margin-bottom: 1rem;
        }
        
        .day-header {
          margin-bottom: 1rem;
        }
        
        .day-toggle {
          display: flex;
          align-items: center;
          cursor: pointer;
        }
        
        .day-toggle input {
          margin-right: 0.5rem;
        }
        
        .day-name {
          font-weight: 600;
          font-size: 1.1rem;
        }
        
        .time-slots {
          padding-left: 1.5rem;
        }
        
        .time-slot {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 0.5rem;
        }
        
        .time-slot select {
          padding: 0.25rem 0.5rem;
          border: 1px solid #d1d5db;
          border-radius: 4px;
        }
        
        .remove-slot {
          background: #ef4444;
          color: white;
          border: none;
          padding: 0.25rem 0.5rem;
          border-radius: 4px;
          cursor: pointer;
          font-size: 0.875rem;
        }
        
        .add-slot {
          background: #10b981;
          color: white;
          border: none;
          padding: 0.5rem 1rem;
          border-radius: 4px;
          cursor: pointer;
          margin-top: 0.5rem;
        }
        
        .form-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
        }
        
        .price-input {
          display: flex;
          align-items: center;
        }
        
        .currency {
          background: #f8fafc;
          border: 1px solid #d1d5db;
          border-right: none;
          padding: 0.5rem 0.75rem;
          border-radius: 6px 0 0 6px;
        }
        
        .price-input input {
          border-radius: 0 6px 6px 0 !important;
        }
      `}</style>
    </div>
  );
};

export default MentorProfile;

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
    <div className="availability-header">
      <h3>Set Your Availability</h3>
      <p>Choose the days and times when you're available for mentoring sessions.</p>
    </div>
    
    <div className="availability-grid">
      {DAYS.map(day => {
        const dayData = profile.availability.weeklySchedule[day];
        const isAvailable = dayData?.available || false;
        const slots = dayData?.slots || [];
        const dayDisplayName = day.charAt(0).toUpperCase() + day.slice(1);
        
        return (
          <div key={day} className={`day-card ${isAvailable ? 'available' : 'unavailable'}`}>
            <div className="day-card-header">
              <h4 className="day-title">{dayDisplayName}</h4>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={isAvailable}
                  onChange={(e) => handleAvailabilityChange(day, 'available', e.target.checked)}
                  className="toggle-input"
                />
                <span className="toggle-slider"></span>
              </label>
            </div>
            
            {isAvailable && (
              <div className="time-slots-container">
                {slots.length === 0 ? (
                  <div className="empty-slots">
                    <p>No time slots added yet</p>
                  </div>
                ) : (
                  <div className="slots-list">
                    {slots.map((slot, index) => (
                      <div key={index} className="time-slot-item">
                        <div className="time-inputs">
                          <div className="time-input-group">
                            <label>From</label>
                            <select
                              value={slot.start}
                              onChange={(e) => updateTimeSlot(day, index, 'start', e.target.value)}
                              className="time-select"
                            >
                              {TIME_SLOTS.map(time => (
                                <option key={time} value={time}>{time}</option>
                              ))}
                            </select>
                          </div>
                          <div className="time-separator">to</div>
                          <div className="time-input-group">
                            <label>Until</label>
                            <select
                              value={slot.end}
                              onChange={(e) => updateTimeSlot(day, index, 'end', e.target.value)}
                              className="time-select"
                            >
                              {TIME_SLOTS.map(time => (
                                <option key={time} value={time}>{time}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeTimeSlot(day, index)}
                          className="remove-slot-btn"
                          aria-label="Remove time slot"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                
                <button
                  type="button"
                  onClick={() => addTimeSlot(day)}
                  className="add-slot-btn"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="12" y1="5" x2="12" y2="19"></line>
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                  </svg>
                  Add Time Slot
                </button>
              </div>
            )}
            
            {!isAvailable && (
              <div className="unavailable-message">
                <p>Not available on {dayDisplayName.toLowerCase()}s</p>
              </div>
            )}
          </div>
        );
      })}
    </div>
    
    <div className="availability-tips">
      <h4>Tips for setting availability:</h4>
      <ul>
        <li>Set realistic time blocks - students book 15-minute sessions</li>
        <li>Leave buffer time between sessions for notes and preparation</li>
        <li>Consider your time zone when setting hours</li>
        <li>You can always adjust your availability later</li>
      </ul>
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

      {/* Updated CSS - Replace the existing style jsx section */}
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
    transition: all 0.2s ease;
  }
  
  .tab.active {
    color: #3b82f6;
    border-bottom-color: #3b82f6;
  }
  
  .availability-header {
    margin-bottom: 2rem;
  }
  
  .availability-header h3 {
    margin: 0 0 0.5rem 0;
    color: #1f2937;
    font-size: 1.5rem;
  }
  
  .availability-header p {
    margin: 0;
    color: #6b7280;
  }
  
  .availability-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
    gap: 1.5rem;
    margin-bottom: 2rem;
  }
  
  .day-card {
    background: white;
    border: 2px solid #e5e7eb;
    border-radius: 12px;
    padding: 1.5rem;
    transition: all 0.2s ease;
    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  }
  
  .day-card.available {
    border-color: #10b981;
    background: #f0fdf4;
  }
  
  .day-card.unavailable {
    border-color: #e5e7eb;
    background: #f9fafb;
  }
  
  .day-card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
  }
  
  .day-title {
    margin: 0;
    font-size: 1.1rem;
    font-weight: 600;
    color: #374151;
  }
  
  .toggle-switch {
    position: relative;
    display: inline-block;
    cursor: pointer;
  }
  
  .toggle-input {
    opacity: 0;
    width: 0;
    height: 0;
  }
  
  .toggle-slider {
    position: relative;
    display: inline-block;
    width: 48px;
    height: 24px;
    background-color: #cbd5e0;
    border-radius: 24px;
    transition: background-color 0.2s ease;
  }
  
  .toggle-slider::before {
    content: '';
    position: absolute;
    top: 2px;
    left: 2px;
    width: 20px;
    height: 20px;
    background-color: white;
    border-radius: 50%;
    transition: transform 0.2s ease;
    box-shadow: 0 2px 4px rgba(0,0,0,0.2);
  }
  
  .toggle-input:checked + .toggle-slider {
    background-color: #10b981;
  }
  
  .toggle-input:checked + .toggle-slider::before {
    transform: translateX(24px);
  }
  
  .time-slots-container {
    min-height: 60px;
  }
  
  .empty-slots {
    text-align: center;
    padding: 2rem 0;
    color: #6b7280;
    font-style: italic;
  }
  
  .slots-list {
    margin-bottom: 1rem;
  }
  
  .time-slot-item {
    display: flex;
    align-items: flex-end;
    gap: 1rem;
    padding: 1rem;
    background: white;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    margin-bottom: 0.75rem;
  }
  
  .time-inputs {
    display: flex;
    align-items: flex-end;
    gap: 1rem;
    flex: 1;
  }
  
  .time-input-group {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }
  
  .time-input-group label {
    font-size: 0.75rem;
    font-weight: 500;
    color: #6b7280;
    text-transform: uppercase;
  }
  
  .time-select {
    padding: 0.5rem;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    background: white;
    font-size: 0.875rem;
    min-width: 80px;
    cursor: pointer;
  }
  
  .time-select:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }
  
  .time-separator {
    padding: 0 0.5rem;
    color: #6b7280;
    font-weight: 500;
    margin-bottom: 0.25rem;
  }
  
  .remove-slot-btn {
    background: #ef4444;
    color: white;
    border: none;
    padding: 0.5rem;
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }
  
  .remove-slot-btn:hover {
    background: #dc2626;
    transform: scale(1.05);
  }
  
  .add-slot-btn {
    background: #10b981;
    color: white;
    border: none;
    padding: 0.75rem 1rem;
    border-radius: 8px;
    cursor: pointer;
    font-weight: 500;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    transition: all 0.2s ease;
    width: 100%;
    justify-content: center;
  }
  
  .add-slot-btn:hover {
    background: #059669;
    transform: translateY(-1px);
  }
  
  .unavailable-message {
    text-align: center;
    padding: 2rem 0;
    color: #9ca3af;
    font-style: italic;
  }
  
  .availability-tips {
    background: #f0f9ff;
    border: 1px solid #bfdbfe;
    border-radius: 12px;
    padding: 1.5rem;
    margin-top: 2rem;
  }
  
  .availability-tips h4 {
    margin: 0 0 1rem 0;
    color: #1e40af;
    font-size: 1rem;
  }
  
  .availability-tips ul {
    margin: 0;
    padding-left: 1.25rem;
  }
  
  .availability-tips li {
    margin-bottom: 0.5rem;
    color: #1e40af;
    line-height: 1.5;
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
  
  @media (max-width: 768px) {
    .availability-grid {
      grid-template-columns: 1fr;
    }
    
    .time-inputs {
      flex-direction: column;
      align-items: stretch;
      gap: 0.75rem;
    }
    
    .time-separator {
      text-align: center;
      padding: 0;
    }
  }
`}</style>
    </div>
  );
};

export default MentorProfile;

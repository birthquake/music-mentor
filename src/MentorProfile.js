// MentorProfile.js - Improved Availability Management with 12-hour format
import React, { useState, useEffect } from 'react';
import { getMentorProfile, createMentorProfile, DEFAULT_MENTOR_PROFILE } from './profileHelpers';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from './firebase';

const MentorProfile = ({ user, mentorInfo }) => {
  const [profile, setProfile] = useState(DEFAULT_MENTOR_PROFILE);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasProfile, setHasProfile] = useState(false);
  const [activeTab, setActiveTab] = useState('basic');
  const [copyMenuOpen, setCopyMenuOpen] = useState(null);

  const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  
  // Extended time slots from 6:00 AM to 11:00 PM in 15-minute increments
  const generateTimeSlots = () => {
    const slots = [];
    for (let hour = 6; hour <= 23; hour++) {
      for (let minute = 0; minute < 60; minute += 15) {
        if (hour === 23 && minute > 0) break; // Stop at 11:00 PM
        const time24 = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        slots.push(time24);
      }
    }
    return slots;
  };

  const TIME_SLOTS = generateTimeSlots();

  // Convert 24-hour time to 12-hour format
  const formatTime12Hour = (time24) => {
    const [hours, minutes] = time24.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const hours12 = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
    return `${hours12}:${minutes.toString().padStart(2, '0')} ${period}`;
  };

  // Parse various time input formats and convert to 24-hour format
  const parseTimeInput = (input) => {
    if (!input) return null;
    
    // Remove spaces and convert to lowercase
    let cleaned = input.toLowerCase().replace(/\s/g, '');
    
    // Handle formats like "9am", "9:30pm", "930am", etc.
    const timeRegex = /^(\d{1,2}):?(\d{2})?(am|pm)?$/;
    const match = cleaned.match(timeRegex);
    
    if (!match) return null;
    
    let hours = parseInt(match[1]);
    const minutes = match[2] ? parseInt(match[2]) : 0;
    const period = match[3];
    
    // Convert to 24-hour format
    if (period === 'pm' && hours !== 12) {
      hours += 12;
    } else if (period === 'am' && hours === 12) {
      hours = 0;
    }
    
    // Validate
    if (hours < 6 || hours > 23 || minutes < 0 || minutes > 59) {
      return null;
    }
    
    // Round to nearest 15-minute increment
    const roundedMinutes = Math.round(minutes / 15) * 15;
    const finalMinutes = roundedMinutes === 60 ? 0 : roundedMinutes;
    const finalHours = roundedMinutes === 60 ? hours + 1 : hours;
    
    return `${finalHours.toString().padStart(2, '0')}:${finalMinutes.toString().padStart(2, '0')}`;
  };

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
        await updateDoc(doc(db, 'mentorProfiles', user.uid), {
          ...profile,
          updatedAt: new Date()
        });
        alert('Mentor profile updated successfully!');
      } else {
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
    // Default to a reasonable 3-hour block
    const newSlot = { start: '09:00', end: '12:00' };
    
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

  // Add preset time blocks
  const addPresetBlock = (day, preset) => {
    const currentSlots = profile.availability.weeklySchedule[day].slots || [];
    
    const presets = {
      morning: { start: '09:00', end: '12:00' },
      afternoon: { start: '13:00', end: '17:00' },
      evening: { start: '18:00', end: '21:00' },
      fullDay: { start: '09:00', end: '17:00' }
    };
    
    const newSlot = presets[preset];
    
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

  // Copy slots from one day to selected days
  const copySlotsToDay = (sourceDay, targetDay) => {
    const sourceSlots = profile.availability.weeklySchedule[sourceDay].slots || [];
    
    setProfile(prev => ({
      ...prev,
      availability: {
        ...prev.availability,
        weeklySchedule: {
          ...prev.availability.weeklySchedule,
          [targetDay]: {
            available: true,
            slots: [...sourceSlots]
          }
        }
      }
    }));
    
    setCopyMenuOpen(null);
  };

  // Calculate visual timeline for a day (simplified)
  const getTimelineBlocks = (slots) => {
    if (!slots || slots.length === 0) return [];
    
    // Convert slots to percentage positions (6am = 0%, 11pm = 100%)
    const startHour = 6;
    const endHour = 23;
    const totalHours = endHour - startHour;
    
    return slots.map(slot => {
      const [startH, startM] = slot.start.split(':').map(Number);
      const [endH, endM] = slot.end.split(':').map(Number);
      
      const startOffset = (startH - startHour) + (startM / 60);
      const endOffset = (endH - startHour) + (endM / 60);
      
      return {
        left: (startOffset / totalHours) * 100,
        width: ((endOffset - startOffset) / totalHours) * 100
      };
    });
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
          <p className="availability-description">Create your mentor profile to start receiving session requests</p>
        </div>
      </div>

      <div className="mentor-profile-tabs">
        <button 
          className={`mentor-tab ${activeTab === 'basic' ? 'active' : ''}`}
          onClick={() => setActiveTab('basic')}
        >
          Basic Information
        </button>
        <button 
          className={`mentor-tab ${activeTab === 'availability' ? 'active' : ''}`}
          onClick={() => setActiveTab('availability')}
        >
          Availability
        </button>
      </div>

      <form onSubmit={handleSubmit} className="profile-form">
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

        {activeTab === 'availability' && (
          <div className="profile-section">
            <div className="availability-header">
              <h3>Set Your Availability</h3>
              <p className="availability-description">Choose the days and times when you're available for mentoring sessions (6:00 AM - 11:00 PM).</p>
            </div>
            
            <div className="availability-grid">
              {DAYS.map(day => {
                const dayData = profile.availability.weeklySchedule[day];
                const isAvailable = dayData?.available || false;
                const slots = dayData?.slots || [];
                const dayDisplayName = day.charAt(0).toUpperCase() + day.slice(1);
                const timelineBlocks = getTimelineBlocks(slots);
                
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
                      <>
                        {/* Visual Timeline */}
                        {slots.length > 0 && (
                          <div className="timeline-container">
                            <div className="timeline-bar">
                              {timelineBlocks.map((block, i) => (
                                <div 
                                  key={i}
                                  className="timeline-block"
                                  style={{
                                    left: `${block.left}%`,
                                    width: `${block.width}%`
                                  }}
                                />
                              ))}
                            </div>
                            <div className="timeline-labels">
                              <span>6 AM</span>
                              <span>11 PM</span>
                            </div>
                          </div>
                        )}
                        
                        <div className="time-slots-container">
                          {slots.length === 0 ? (
                            <div className="empty-slots">
                              <p className="empty-slots-text">No time blocks added yet</p>
                              <div className="preset-buttons">
                                <button
                                  type="button"
                                  onClick={() => addPresetBlock(day, 'morning')}
                                  className="preset-btn"
                                >
                                  Morning (9 AM-12 PM)
                                </button>
                                <button
                                  type="button"
                                  onClick={() => addPresetBlock(day, 'afternoon')}
                                  className="preset-btn"
                                >
                                  Afternoon (1-5 PM)
                                </button>
                                <button
                                  type="button"
                                  onClick={() => addPresetBlock(day, 'evening')}
                                  className="preset-btn"
                                >
                                  Evening (6-9 PM)
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="slots-list">
                              {slots.map((slot, index) => (
                                <div key={index} className="time-slot-item">
                                  <div className="time-inputs">
                                    <div className="time-input-group">
                                      <label className="time-label">From</label>
                                      <select
                                        value={slot.start}
                                        onChange={(e) => updateTimeSlot(day, index, 'start', e.target.value)}
                                        className="time-select"
                                      >
                                        {TIME_SLOTS.map(time => (
                                          <option key={time} value={time}>
                                            {formatTime12Hour(time)}
                                          </option>
                                        ))}
                                      </select>
                                    </div>
                                    <div className="time-separator">to</div>
                                    <div className="time-input-group">
                                      <label className="time-label">Until</label>
                                      <select
                                        value={slot.end}
                                        onChange={(e) => updateTimeSlot(day, index, 'end', e.target.value)}
                                        className="time-select"
                                      >
                                        {TIME_SLOTS.map(time => (
                                          <option key={time} value={time}>
                                            {formatTime12Hour(time)}
                                          </option>
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
                          
                          <div className="slot-actions">
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
                            
                            {slots.length > 0 && (
                              <div className="copy-menu-container">
                                <button
                                  type="button"
                                  onClick={() => setCopyMenuOpen(copyMenuOpen === day ? null : day)}
                                  className="copy-slots-btn"
                                >
                                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                                  </svg>
                                  Copy to...
                                </button>
                                
                                {copyMenuOpen === day && (
                                  <div className="copy-dropdown">
                                    {DAYS.filter(d => d !== day).map(targetDay => (
                                      <button
                                        key={targetDay}
                                        type="button"
                                        onClick={() => copySlotsToDay(day, targetDay)}
                                        className="copy-option"
                                      >
                                        {targetDay.charAt(0).toUpperCase() + targetDay.slice(1)}
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </>
                    )}
                    
                    {!isAvailable && (
                      <div className="unavailable-message">
                        <p className="unavailable-text">Not available on {dayDisplayName.toLowerCase()}s</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            
            <div className="availability-tips">
              <h4 className="tips-title">Tips for setting availability:</h4>
              <ul className="tips-list">
                <li>Use preset buttons for quick setup, then adjust times as needed</li>
                <li>Each time block automatically generates 15-minute bookable slots</li>
                <li>15-minute buffer is automatically added between sessions</li>
                <li>Add multiple blocks per day for flexibility (e.g., morning + evening)</li>
                <li>Use "Copy to..." to quickly replicate schedules across days</li>
                <li>Consider your time zone when setting hours (6 AM - 11 PM available)</li>
              </ul>
            </div>
          </div>
        )}

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

// CalendarBooking.js - Step-by-step calendar booking with error handling

import React, { useState, useEffect } from 'react';
import { getMentorBookings, checkSlotAvailability } from './availabilitySystem';
import { getMentorProfile } from './profileHelpers';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';
import { 
  ButtonSpinner, 
  FullPageLoading 
} from './LoadingComponents';
import './MentorDashboard.css';

// Icons
const CalendarIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
    <line x1="16" y1="2" x2="16" y2="6"></line>
    <line x1="8" y1="2" x2="8" y2="6"></line>
    <line x1="3" y1="10" x2="21" y2="10"></line>
  </svg>
);

const ClockIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10"></circle>
    <polyline points="12,6 12,12 16,14"></polyline>
  </svg>
);

const ArrowLeftIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="m15 18-6-6 6-6"/>
  </svg>
);

const ArrowRightIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="m9 18 6-6-6-6"/>
  </svg>
);

// Toggle Component
const Toggle = ({ checked, onChange, label }) => (
  <div className="toggle-container">
    <label className="toggle-label">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="toggle-input"
      />
      <span className="toggle-slider"></span>
      <span className="toggle-text">{label}</span>
    </label>
  </div>
);
// Step 1: Date Selection Component
const DateSelection = ({ availableDates, onSelectDate, onBack }) => {
  return (
    <div className="step-content">
      <div className="step-header">
        <h3>Choose a date</h3>
        <p>Select from available dates in the next few weeks</p>
      </div>
      
      <div className="date-grid">
        {availableDates.map(({ date, slots }) => {
          const dayName = date.toLocaleDateString('en-US', { 
            weekday: 'long',
            month: 'short', 
            day: 'numeric' 
          });
          const slotCount = slots.length;
          
          return (
            <button
              key={date.toDateString()}
              onClick={() => onSelectDate(date, slots)}
              className="date-option"
            >
              <div className="date-day">{dayName}</div>
              <div className="date-slots">{slotCount} slot{slotCount !== 1 ? 's' : ''} available</div>
            </button>
          );
        })}
      </div>
      
      {availableDates.length === 0 && (
        <div className="no-dates">
          <CalendarIcon />
          <h4>No availability found</h4>
          <p>This mentor hasn't set their available time slots yet.</p>
        </div>
      )}
    </div>
  );
};

// Step 2: Time Selection Component
const TimeSelection = ({ selectedDate, availableSlots, onSelectTime, onBack, selectedTime }) => {
  const dayName = selectedDate.toLocaleDateString('en-US', { 
    weekday: 'long',
    month: 'long', 
    day: 'numeric' 
  });

  return (
    <div className="step-content">
      <div className="step-header">
        <button onClick={onBack} className="back-button">
          <ArrowLeftIcon /> Back to dates
        </button>
        <h3>{dayName}</h3>
        <p>Choose your preferred time</p>
      </div>
      
      <div className="time-grid">
        {availableSlots.map(slot => {
          const timeStr = slot.start.toLocaleTimeString([], { 
            hour: 'numeric', 
            minute: '2-digit', 
            hour12: true 
          });
          
          return (
            <button
              key={slot.slotId}
              onClick={() => onSelectTime(slot)}
              className={`time-option ${selectedTime?.slotId === slot.slotId ? 'selected' : ''}`}
            >
              {timeStr}
            </button>
          );
        })}
      </div>
    </div>
  );
};
// Step 3: Booking Details Component
const BookingDetails = ({ 
  selectedDate, 
  selectedTime, 
  mentor, 
  message, 
  setMessage, 
  videoPreferred, 
  setVideoPreferred, 
  onBack, 
  onConfirm, 
  loading 
}) => {
  const dayName = selectedDate.toLocaleDateString('en-US', { 
    weekday: 'long',
    month: 'long', 
    day: 'numeric' 
  });
  
  const timeStr = selectedTime.start.toLocaleTimeString([], { 
    hour: 'numeric', 
    minute: '2-digit', 
    hour12: true 
  });

  return (
    <div className="step-content">
      <div className="step-header">
        <button onClick={onBack} className="back-button">
          <ArrowLeftIcon /> Back to times
        </button>
        <h3>Confirm your session</h3>
        <p>{dayName} at {timeStr}</p>
      </div>
      
      <form onSubmit={onConfirm} className="booking-details-form">
        <div className="form-group">
          <label>What specific challenge can {mentor?.name?.split(' ')[0]} help you with? <span style={{color: '#ef4444'}}>*</span></label>
          <textarea 
            value={message}
            onChange={e => setMessage(e.target.value)}
            placeholder="Be specific about your question or challenge. This helps your mentor prepare for your session."
            rows="4"
            required
          />
        </div>
        
        <div className="form-group">
          <Toggle
            checked={videoPreferred}
            onChange={e => setVideoPreferred(e.target.checked)}
            label="I'd prefer video for this session (recommended for technique questions)"
          />
        </div>

        <div className="session-summary">
          <h4>Session Summary</h4>
          <div className="summary-details">
            <div className="summary-item">
              <CalendarIcon />
              <span>{dayName} at {timeStr}</span>
            </div>
            <div className="summary-item">
              <ClockIcon />
              <span>15 minutes • ${mentor?.rate}</span>
            </div>
          </div>
        </div>

        <div className="booking-actions">
          <button type="submit" className="confirm-btn" disabled={loading || !message.trim()}>
            {loading ? (
              <>
                <ButtonSpinner />
                Requesting...
              </>
            ) : (
              `Request Session ($${mentor?.rate})`
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
// Main Step-by-Step Calendar Booking Component
const CalendarBooking = ({ mentor, user, onClose, onConfirm, isOpen }) => {
  // All hooks at the top
  const [availableSlots, setAvailableSlots] = useState([]);
  const [step, setStep] = useState('dates');
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTime, setSelectedTime] = useState(null);
  const [message, setMessage] = useState('');
  const [videoPreferred, setVideoPreferred] = useState(false);
  const [loading, setLoading] = useState(true);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [error, setError] = useState(null);

  // Load mentor availability from Firestore with error handling
  const loadMentorAvailability = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Validate mentor data
      if (!mentor?.userId && !mentor?.id) {
        throw new Error('Mentor information is missing');
      }

      const profileResult = await getMentorProfile(mentor.userId || mentor.id);
      
      if (!profileResult.success) {
        console.log('No mentor profile found for:', mentor.name);
        setAvailableSlots([]);
        setLoading(false);
        return;
      }

      const mentorProfile = profileResult.profile;
      const weeklySchedule = mentorProfile.availability?.weeklySchedule;
      
      if (!weeklySchedule) {
        console.log('No availability schedule found for mentor');
        setAvailableSlots([]);
        setLoading(false);
        return;
      }

      // Generate 15-minute slots for the next 3 weeks
      const slots = [];
      const today = new Date();
      const endDate = new Date(today);
      endDate.setDate(endDate.getDate() + 21);
      const now = new Date();

      for (let d = new Date(today); d <= endDate; d.setDate(d.getDate() + 1)) {
        const dayName = d.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
        const daySchedule = weeklySchedule[dayName];
        
        if (daySchedule?.available && daySchedule.slots?.length > 0) {
          daySchedule.slots.forEach((timeBlock) => {
            try {
              const [startHour, startMin] = timeBlock.start.split(':').map(Number);
              const [endHour, endMin] = timeBlock.end.split(':').map(Number);
              
              const blockStart = new Date(d);
              blockStart.setHours(startHour, startMin, 0, 0);
              
              const blockEnd = new Date(d);
              blockEnd.setHours(endHour, endMin, 0, 0);
              
              let currentSlotStart = new Date(blockStart);
              
              while (currentSlotStart < blockEnd) {
                const currentSlotEnd = new Date(currentSlotStart);
                currentSlotEnd.setMinutes(currentSlotStart.getMinutes() + 15);
                
                if (currentSlotEnd > now) {
                  slots.push({
                    slotId: `${d.toDateString()}-${currentSlotStart.getHours()}-${currentSlotStart.getMinutes()}`,
                    start: new Date(currentSlotStart),
                    end: new Date(currentSlotEnd),
                    available: true
                  });
                }
                
                currentSlotStart.setMinutes(currentSlotStart.getMinutes() + 15);
              }
            } catch (slotError) {
              console.error('Error processing time slot:', timeBlock, slotError);
            }
          });
        }
      }

      console.log(`Generated ${slots.length} 15-minute slots`);

      const sortedSlots = slots.sort((a, b) => a.start - b.start);
      
      // Check against existing bookings with error handling
      try {
        const existingBookings = await getMentorBookings(mentor.id.toString());
        const checkedSlots = checkSlotAvailability(sortedSlots, existingBookings);
        const availableOnly = checkedSlots.filter(slot => slot.available);
        console.log(`${availableOnly.length} slots available after checking bookings`);
        setAvailableSlots(availableOnly);
      } catch (bookingError) {
        console.error('Error checking existing bookings:', bookingError);
        // Still show slots even if we can't check bookings
        setAvailableSlots(sortedSlots);
      }
      
    } catch (error) {
      console.error('Error loading mentor availability:', error);
      setError('Unable to load availability. Please try again.');
      setAvailableSlots([]);
    }
    
    setLoading(false);
  };

  useEffect(() => {
    if (mentor?.id) {
      loadMentorAvailability();
    }
  }, [mentor?.id]);

  // Group available slots by date
  const availableDates = React.useMemo(() => {
    const grouped = {};
    availableSlots.forEach(slot => {
      const dateKey = slot.start.toDateString();
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(slot);
    });

    return Object.keys(grouped)
      .sort((a, b) => new Date(a) - new Date(b))
      .slice(0, 14)
      .map(dateKey => ({
        date: new Date(dateKey),
        slots: grouped[dateKey]
      }));
  }, [availableSlots]);

  const handleSelectDate = (date, slots) => {
    setSelectedDate(date);
    setSelectedTime(null);
    setStep('times');
  };

  const handleSelectTime = (slot) => {
    setSelectedTime(slot);
    setStep('details');
  };

  const handleBackToDates = () => {
    setStep('dates');
    setSelectedDate(null);
    setSelectedTime(null);
  };

  const handleBackToTimes = () => {
    setStep('times');
    setSelectedTime(null);
  };

  const handleBooking = async (e) => {
    e.preventDefault();
    
    // Validation
    if (!selectedTime || !message.trim()) {
      alert('Please fill in all required fields');
      return;
    }

    if (!user?.uid || !user?.email) {
      alert('User information is missing. Please log in again.');
      return;
    }

    if (!mentor?.id || !mentor?.name) {
      alert('Mentor information is missing. Please try again.');
      return;
    }

    setBookingLoading(true);
    setError(null);
    
    try {
      await addDoc(collection(db, 'bookings'), {
        mentorId: mentor.id,
        mentorName: mentor.name,
        userId: user.uid,
        userEmail: user.email,
        studentName: user.displayName || user.email,
        message: message.trim(),
        videoPreferred,
        status: 'pending',
        createdAt: serverTimestamp(),
        scheduledStart: selectedTime.start,
        scheduledEnd: selectedTime.end,
        rate: mentor.rate,
        bookingType: 'scheduled',
        preferredTime: selectedTime.start.toLocaleString('en-US', {
          weekday: 'long',
          month: 'long',
          day: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        })
      });

      const timeStr = selectedTime.start.toLocaleTimeString([], { 
        hour: 'numeric', 
        minute: '2-digit', 
        hour12: true 
      });
      
      onConfirm(`Requested for ${timeStr}`, message, videoPreferred);
      
    } catch (error) {
      console.error('Error creating booking:', error);
      setError('Failed to create booking. Please check your connection and try again.');
      alert('Error creating booking. Please try again.');
    }
    
    setBookingLoading(false);
  };

  // Early return after all hooks
  if (!isOpen || !mentor || !user) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content booking-modal step-modal" onClick={e => e.stopPropagation()}>
        <div className="booking-header">
          <h2>Book Session with {mentor?.name}</h2>
          <div className="step-indicator">
            <span className={step === 'dates' ? 'active' : step !== 'dates' ? 'completed' : ''}>
              1. Date
            </span>
            <ArrowRightIcon />
            <span className={step === 'times' ? 'active' : step === 'details' ? 'completed' : ''}>
              2. Time
            </span>
            <ArrowRightIcon />
            <span className={step === 'details' ? 'active' : ''}>
              3. Details
            </span>
          </div>
        </div>

        {error && (
          <div style={{
            padding: '1rem',
            margin: '1rem',
            backgroundColor: '#fee2e2',
            border: '1px solid #ef4444',
            borderRadius: '8px',
            color: '#991b1b'
          }}>
            {error}
          </div>
        )}

        {loading ? (
          <FullPageLoading message="Loading available times..." />
        ) : (
          <>
            {step === 'dates' && (
              <DateSelection
                availableDates={availableDates}
                onSelectDate={handleSelectDate}
                onBack={handleBackToDates}
              />
            )}
            
            {step === 'times' && selectedDate && (
              <TimeSelection
                selectedDate={selectedDate}
                availableSlots={availableDates.find(d => d.date.toDateString() === selectedDate.toDateString())?.slots || []}
                onSelectTime={handleSelectTime}
                onBack={handleBackToDates}
                selectedTime={selectedTime}
              />
            )}
            
            {step === 'details' && selectedTime && (
              <BookingDetails
                selectedDate={selectedDate}
                selectedTime={selectedTime}
                mentor={mentor}
                message={message}
                setMessage={setMessage}
                videoPreferred={videoPreferred}
                setVideoPreferred={setVideoPreferred}
                onBack={handleBackToTimes}
                onConfirm={handleBooking}
                loading={bookingLoading}
              />
            )}
          </>
        )}
        
        <div className="modal-actions">
          <button onClick={onClose} className="cancel-btn">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
// Toggle and button styling
const toggleStyles = `
.toggle-container {
  margin: 1rem 0;
}

.toggle-label {
  display: flex;
  align-items: center;
  cursor: pointer;
  gap: 0.75rem;
}

.toggle-input {
  display: none;
}

.toggle-slider {
  position: relative;
  width: 48px;
  height: 24px;
  background-color: #cbd5e0;
  border-radius: 12px;
  transition: background-color 0.2s ease;
  flex-shrink: 0;
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
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.toggle-input:checked + .toggle-slider {
  background-color: #3b82f6;
}

.toggle-input:checked + .toggle-slider::before {
  transform: translateX(24px);
}

.toggle-text {
  font-size: 0.875rem;
  line-height: 1.4;
  color: #white;
}

.confirm-btn:disabled {
  background-color: #9ca3af !important;
  cursor: not-allowed;
  opacity: 0.6;
}

.confirm-btn:disabled:hover {
  background-color: #9ca3af !important;
}
`;

if (typeof document !== 'undefined') {
  const styleSheet = document.createElement("style");
  styleSheet.textContent = toggleStyles;
  document.head.appendChild(styleSheet);
}

export default CalendarBooking;

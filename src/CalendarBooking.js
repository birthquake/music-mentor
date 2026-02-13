// CalendarBooking.js - Step-by-step calendar booking

import React, { useState, useEffect } from 'react';
import { getMentorBookings, checkSlotAvailability } from './availabilitySystem';
import { getMentorProfile } from './profileHelpers';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';
import { 
  ButtonSpinner, 
  FullPageLoading,
  useToast
} from './LoadingComponents';
import './MentorDashboard.css';

/* ============================================
   ICONS
   ============================================ */
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


/* ============================================
   STEP PROGRESS BAR
   ============================================ */
const StepProgressBar = ({ currentStep }) => {
  const steps = [
    { key: 'dates', label: 'Date', num: 1 },
    { key: 'times', label: 'Time', num: 2 },
    { key: 'details', label: 'Details', num: 3 }
  ];

  const currentIndex = steps.findIndex(s => s.key === currentStep);

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '0',
      padding: '0 0.5rem',
      marginTop: '0.75rem'
    }}>
      {steps.map((step, i) => {
        const isCompleted = i < currentIndex;
        const isActive = i === currentIndex;
        const isFuture = i > currentIndex;

        return (
          <React.Fragment key={step.key}>
            {/* Step circle + label */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: '48px' }}>
              <div style={{
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.75rem',
                fontWeight: '700',
                transition: 'all 0.3s ease',
                background: isCompleted ? 'var(--accent-green)' : isActive ? 'var(--accent-blue)' : 'var(--bg-elevated)',
                color: isCompleted || isActive ? 'white' : 'var(--text-muted)',
                border: isFuture ? '2px solid var(--border-color)' : 'none',
                boxShadow: isActive ? '0 0 0 3px rgba(59, 130, 246, 0.3)' : 'none'
              }}>
                {isCompleted ? '✓' : step.num}
              </div>
              <span style={{
                fontSize: '0.6875rem',
                marginTop: '4px',
                fontWeight: isActive ? '600' : '400',
                color: isActive ? 'var(--text-primary)' : 'var(--text-muted)',
                letterSpacing: '0.3px'
              }}>
                {step.label}
              </span>
            </div>

            {/* Connector line */}
            {i < steps.length - 1 && (
              <div style={{
                flex: 1,
                height: '2px',
                background: isCompleted ? 'var(--accent-green)' : 'var(--border-color)',
                transition: 'background 0.3s ease',
                marginBottom: '18px'
              }} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};

/* ============================================
   TOGGLE
   ============================================ */
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

/* ============================================
   STEP 1: DATE SELECTION
   ============================================ */
const DateSelection = ({ availableDates, onSelectDate }) => {
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

/* ============================================
   STEP 2: TIME SELECTION
   ============================================ */
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

/* ============================================
   STEP 3: BOOKING DETAILS
   ============================================ */
const MAX_MESSAGE_LENGTH = 500;

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

  const charCount = message.length;
  const charNearLimit = charCount > MAX_MESSAGE_LENGTH * 0.8;

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
          <label>
            What specific challenge can {mentor?.name?.split(' ')[0]} help you with?{' '}
            <span style={{ color: 'var(--error)' }}>*</span>
          </label>
          <textarea 
            value={message}
            onChange={e => {
              if (e.target.value.length <= MAX_MESSAGE_LENGTH) {
                setMessage(e.target.value);
              }
            }}
            placeholder="Be specific about your question or challenge. This helps your mentor prepare for your session."
            rows="4"
            required
          />
          <div style={{
            display: 'flex',
            justifyContent: 'flex-end',
            marginTop: '0.25rem',
            fontSize: '0.75rem',
            color: charNearLimit ? 'var(--warning)' : 'var(--text-subtle)',
            transition: 'color 0.2s ease'
          }}>
            {charCount}/{MAX_MESSAGE_LENGTH}
          </div>
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
              <span>15 minutes &bull; ${mentor?.rate}</span>
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

/* ============================================
   MAIN CALENDAR BOOKING
   ============================================ */
const CalendarBooking = ({ mentor, user, onClose, onConfirm, isOpen }) => {
  const [availableSlots, setAvailableSlots] = useState([]);
  const [step, setStep] = useState('dates');
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTime, setSelectedTime] = useState(null);
  const [message, setMessage] = useState('');
  const [videoPreferred, setVideoPreferred] = useState(false);
  const [loading, setLoading] = useState(true);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [error, setError] = useState(null);
  const { showToast } = useToast();

  const loadMentorAvailability = async () => {
    setLoading(true);
    setError(null);
    
    try {
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
      
      try {
        const existingBookings = await getMentorBookings(mentor.id.toString());
        const checkedSlots = checkSlotAvailability(sortedSlots, existingBookings);
        const availableOnly = checkedSlots.filter(slot => slot.available);
        console.log(`${availableOnly.length} slots available after checking bookings`);
        setAvailableSlots(availableOnly);
      } catch (bookingError) {
        console.error('Error checking existing bookings:', bookingError);
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mentor?.id]);

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
    
    if (!selectedTime || !message.trim()) {
      showToast('Please fill in all required fields.', 'warning');
      return;
    }

    if (!user?.uid || !user?.email) {
      showToast('Please log in again to continue.', 'error');
      return;
    }

    if (!mentor?.id || !mentor?.name) {
      showToast('Mentor information is missing. Please try again.', 'error');
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
      showToast('Error creating booking. Please try again.', 'error');
    }
    
    setBookingLoading(false);
  };

  if (!isOpen || !mentor || !user) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content booking-modal step-modal" onClick={e => e.stopPropagation()}>
        <div className="booking-header">
          <h2>Book Session with {mentor?.name}</h2>
          <StepProgressBar currentStep={step} />
        </div>

        {error && (
          <div style={{
            padding: '1rem',
            margin: '0 1rem 1rem',
            backgroundColor: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '8px',
            color: '#fca5a5',
            fontSize: '0.875rem'
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

/* ============================================
   INJECTED STYLES (toggle, disabled button)
   ============================================ */
if (typeof document !== 'undefined') {
  const id = 'calendar-booking-styles';
  if (!document.getElementById(id)) {
    const styleSheet = document.createElement('style');
    styleSheet.id = id;
    styleSheet.textContent = `
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
        background-color: var(--bg-elevated, #374151);
        border: 1px solid var(--border-color, #4b5563);
        border-radius: 12px;
        transition: all 0.2s ease;
        flex-shrink: 0;
      }

      .toggle-slider::before {
        content: '';
        position: absolute;
        top: 2px;
        left: 2px;
        width: 18px;
        height: 18px;
        background-color: var(--text-muted, #9ca3af);
        border-radius: 50%;
        transition: all 0.2s ease;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
      }

      .toggle-input:checked + .toggle-slider {
        background-color: var(--accent-blue, #3b82f6);
        border-color: var(--accent-blue, #3b82f6);
      }

      .toggle-input:checked + .toggle-slider::before {
        transform: translateX(24px);
        background-color: white;
      }

      .toggle-text {
        font-size: 0.875rem;
        line-height: 1.4;
        color: var(--text-secondary, #e5e7eb);
      }

      .confirm-btn:disabled {
        background-color: var(--bg-elevated, #374151) !important;
        color: var(--text-muted, #9ca3af) !important;
        cursor: not-allowed;
        opacity: 0.6;
      }

      .confirm-btn:disabled:hover {
        background-color: var(--bg-elevated, #374151) !important;
        transform: none;
      }
    `;
    document.head.appendChild(styleSheet);
  }
}

export default CalendarBooking;

// CalendarBooking.js - Step-by-step calendar booking

import React, { useState, useEffect } from 'react';
import { 
  generateAvailableSlots, 
  checkSlotAvailability, 
  formatSlotTime,
  getMentorBookings,
  SAMPLE_MENTOR_AVAILABILITY
} from './availabilitySystem';
import { getMentorProfile } from './profileHelpers';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';
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
          <p>This mentor doesn't have available time slots in the next few weeks.</p>
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
          <label>What specific challenge can {mentor?.name?.split(' ')[0]} help you with?</label>
          <textarea 
            value={message}
            onChange={e => setMessage(e.target.value)}
            placeholder="Be specific about your question or challenge. This helps your mentor prepare for your session."
            rows="4"
            required
          />
        </div>
        
        <div className="form-group">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={videoPreferred}
              onChange={e => setVideoPreferred(e.target.checked)}
            />
            <span className="checkbox-text">I'd prefer video for this session (recommended for technique questions)</span>
          </label>
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
            {loading ? 'Requesting...' : `Request Session ($${mentor?.rate})`}
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
  const [step, setStep] = useState('dates'); // 'dates', 'times', 'details'
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTime, setSelectedTime] = useState(null);
  const [message, setMessage] = useState('');
  const [videoPreferred, setVideoPreferred] = useState(false);
  const [loading, setLoading] = useState(true);
  const [bookingLoading, setBookingLoading] = useState(false);

  // Add this function to your CalendarBooking.js file
// Replace the existing loadMentorAvailability function

const loadMentorAvailabilityFromFirestore = async (mentor) => {
  try {
    // Import getMentorProfile at the top of your file
    const { getMentorProfile } = require('./profileHelpers');
    
    // Get mentor profile from Firestore using their userId 
    const profileResult = await getMentorProfile(mentor.userId || mentor.id);
    
    if (!profileResult.success) {
      console.log('No mentor profile found for:', mentor.name);
      return [];
    }

    const mentorProfile = profileResult.profile;
    const weeklySchedule = mentorProfile.availability?.weeklySchedule;
    
    if (!weeklySchedule) {
      console.log('No availability schedule found for mentor');
      return [];
    }

    // Generate available slots for the next 3 weeks
    const slots = [];
    const today = new Date();
    const endDate = new Date(today);
    endDate.setDate(endDate.getDate() + 21); // 3 weeks

    // Loop through each day in the next 3 weeks
    for (let d = new Date(today); d <= endDate; d.setDate(d.getDate() + 1)) {
      const dayName = d.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
      const daySchedule = weeklySchedule[dayName];
      
      // If this day is available and has time slots
      if (daySchedule?.available && daySchedule.slots?.length > 0) {
        daySchedule.slots.forEach((timeSlot, index) => {
          const slotDate = new Date(d);
          const [startHour, startMin] = timeSlot.start.split(':').map(Number);
          const [endHour, endMin] = timeSlot.end.split(':').map(Number);
          
          const startTime = new Date(slotDate);
          startTime.setHours(startHour, startMin, 0, 0);
          
          const endTime = new Date(slotDate);
          endTime.setHours(endHour, endMin, 0, 0);
          
          // Only include future slots (not past times)
          if (startTime > new Date()) {
            slots.push({
              slotId: `${slotDate.toDateString()}-${timeSlot.start}-${index}`,
              start: startTime,
              end: endTime,
              available: true
            });
          }
        });
      }
    }

    return slots.sort((a, b) => a.start - b.start);
    
  } catch (error) {
    console.error('Error loading mentor availability from Firestore:', error);
    return [];
  }
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
      .slice(0, 14) // Show max 14 days
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
    if (!selectedTime || !message.trim()) return;

    setBookingLoading(true);
    try {
      await addDoc(collection(db, 'bookings'), {
        mentorId: mentor?.id,
        mentorName: mentor?.name,
        mentorEmail: mentor?.email,
        userId: user?.uid,
        userEmail: user?.email,
        message,
        videoPreferred,
        status: 'pending', // Requires mentor approval
        createdAt: serverTimestamp(),
        scheduledStart: selectedTime.start,
        scheduledEnd: selectedTime.end,
        rate: mentor?.rate,
        bookingType: 'scheduled'
      });

      onConfirm(`Requested for ${formatSlotTime(selectedTime.start)}`, message, videoPreferred);
    } catch (error) {
      console.error('Error creating booking:', error);
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

        {loading ? (
          <div className="loading-slots">Loading available times...</div>
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

export default CalendarBooking;

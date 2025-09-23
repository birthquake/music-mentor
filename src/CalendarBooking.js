// CalendarBooking.js - Calendar scheduling UI components

import React, { useState, useEffect } from 'react';
import { 
  generateAvailableSlots, 
  checkSlotAvailability, 
  groupSlotsByDate, 
  formatSlotTime,
  getMentorAvailability,
  getMentorBookings,
  SAMPLE_MENTOR_AVAILABILITY
} from './availabilitySystem';
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

const VideoIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polygon points="23 7 16 12 23 17 23 7"></polygon>
    <rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
  </svg>
);

// Time Slot Component
const TimeSlot = ({ slot, onSelect, isSelected, isBooked = false }) => {
  const startTime = slot.start.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
  const endTime = slot.end.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
  
  return (
    <button
      onClick={() => onSelect(slot)}
      disabled={isBooked || !slot.available}
      className={`time-slot ${isSelected ? 'selected' : ''} ${isBooked ? 'booked' : ''} ${!slot.available ? 'unavailable' : ''}`}
    >
      <span className="slot-time">{startTime} - {endTime}</span>
      {isBooked && <span className="slot-status">Booked</span>}
    </button>
  );
};

// Day View Component
const DayAvailability = ({ date, slots, onSlotSelect, selectedSlot }) => {
  const daySlots = slots.filter(slot => 
    slot.start.toDateString() === date.toDateString()
  ).sort((a, b) => a.start - b.start);

  if (daySlots.length === 0) {
    return null;
  }

  const dayName = date.toLocaleDateString('en-US', { 
    weekday: 'long', 
    month: 'short', 
    day: 'numeric' 
  });

  return (
    <div className="day-availability">
      <h4 className="day-header">
        <CalendarIcon />
        {dayName}
      </h4>
      <div className="time-slots-grid">
        {daySlots.map(slot => (
          <TimeSlot
            key={slot.slotId}
            slot={slot}
            onSelect={onSlotSelect}
            isSelected={selectedSlot?.slotId === slot.slotId}
            isBooked={!slot.available}
          />
        ))}
      </div>
    </div>
  );
};

// Main Calendar Booking Component
const CalendarBooking = ({ mentor, user, onClose, onConfirm, isOpen }) => {
  // Early return if not open or missing required props
  if (!isOpen || !mentor || !user) return null;
  const [availableSlots, setAvailableSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [message, setMessage] = useState('');
  const [videoPreferred, setVideoPreferred] = useState(false);
  const [loading, setLoading] = useState(true);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [currentWeekStart, setCurrentWeekStart] = useState(new Date());

  useEffect(() => {
    if (mentor?.id) {
      loadMentorAvailability();
    }
  }, [mentor?.id]);

  const loadMentorAvailability = async () => {
    setLoading(true);
    try {
      // For demo purposes, use sample data
      // In production, this would fetch from getMentorAvailability(mentor.id)
      const mentorAvailability = SAMPLE_MENTOR_AVAILABILITY.find(
        m => m.mentorId === mentor?.id?.toString()
      );

      if (!mentorAvailability) {
        console.log('No availability found for mentor');
        setAvailableSlots([]);
        setLoading(false);
        return;
      }

      // Generate available slots
      const slots = generateAvailableSlots(mentorAvailability, 3);
      
      // Get existing bookings to check availability
      const existingBookings = await getMentorBookings(mentor.id.toString());
      
      // Check which slots are actually available
      const checkedSlots = checkSlotAvailability(slots, existingBookings);
      
      setAvailableSlots(checkedSlots);
    } catch (error) {
      console.error('Error loading mentor availability:', error);
    }
    setLoading(false);
  };

  const handleSlotSelect = (slot) => {
    setSelectedSlot(slot);
  };

  const handleBooking = async (e) => {
    e.preventDefault();
    if (!selectedSlot || !message.trim()) return;

    setBookingLoading(true);
    try {
      // Create booking with specific scheduled time
      await addDoc(collection(db, 'bookings'), {
        mentorId: mentor?.id,
        mentorName: mentor?.name,
        mentorEmail: mentor?.email,
        userId: user?.uid,
        userEmail: user?.email,
        message,
        videoPreferred,
        status: 'confirmed', // Auto-confirm since specific time was selected
        createdAt: serverTimestamp(),
        scheduledStart: selectedSlot.start,
        scheduledEnd: selectedSlot.end,
        rate: mentor?.rate,
        bookingType: 'scheduled' // vs 'preference-based'
      });

      onConfirm(`Scheduled for ${formatSlotTime(selectedSlot.start)}`, message, videoPreferred);
    } catch (error) {
      console.error('Error creating booking:', error);
      alert('Error creating booking. Please try again.');
    }
    setBookingLoading(false);
  };

  // Group slots by date for display
  const groupedSlots = groupSlotsByDate(availableSlots);
  const sortedDates = Object.keys(groupedSlots).sort((a, b) => new Date(a) - new Date(b));
  
  // Get next 14 days for display
  const displayDates = sortedDates.slice(0, 14);

  if (loading) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content booking-modal" onClick={e => e.stopPropagation()}>
          <div className="loading-slots">Loading available times...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content booking-modal calendar-booking-modal" onClick={e => e.stopPropagation()}>
        <div className="booking-header">
          <h2>Schedule with {mentor?.name || 'Mentor'}</h2>
          <p className="session-details">
            <ClockIcon /> 15-minute session • ${mentor?.rate || 0}
          </p>
        </div>

        {displayDates.length === 0 ? (
          <div className="no-availability">
            <CalendarIcon />
            <h3>No availability found</h3>
            <p>This mentor hasn't set up their schedule yet. Try booking with the preference system instead.</p>
            <button onClick={onClose} className="cancel-btn">
              Go Back
            </button>
          </div>
        ) : (
          <form onSubmit={handleBooking} className="calendar-booking-form">
            <div className="availability-section">
              <h3>Choose a time that works for you:</h3>
              <div className="calendar-view">
                {displayDates.map(dateStr => {
                  const date = new Date(dateStr);
                  return (
                    <DayAvailability
                      key={dateStr}
                      date={date}
                      slots={groupedSlots[dateStr]}
                      onSlotSelect={handleSlotSelect}
                      selectedSlot={selectedSlot}
                    />
                  );
                })}
              </div>
            </div>

            {selectedSlot && (
              <div className="booking-details-section">
                <div className="selected-time-display">
                  <h4>Selected Time:</h4>
                  <p className="selected-time">
                    <CalendarIcon />
                    {formatSlotTime(selectedSlot.start)}
                  </p>
                </div>

                <div className="form-group">
                  <label>What specific challenge can {mentor.name.split(' ')[0]} help you with?</label>
                  <textarea 
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    placeholder="Be specific about your question or challenge. This helps your mentor prepare for your session."
                    rows="3"
                    required
                  />
                </div>
                
                {mentor.videoAvailable && (
                  <div className="form-group">
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={videoPreferred}
                        onChange={e => setVideoPreferred(e.target.checked)}
                      />
                      <span>I'd prefer video for this session (recommended for technique questions)</span>
                    </label>
                  </div>
                )}

                <div className="booking-actions">
                  <button type="button" onClick={onClose} className="cancel-btn">
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="confirm-btn"
                    disabled={bookingLoading || !selectedSlot || !message.trim()}
                  >
                    {bookingLoading ? 'Booking...' : `Confirm Session ($${mentor.rate})`}
                  </button>
                </div>
              </div>
            )}
          </form>
        )}
      </div>
    </div>
  );
};

export default CalendarBooking;

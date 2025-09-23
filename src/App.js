import React, { useState, useEffect } from 'react';
import './App.css';

// Simple components for our MVP
const Header = () => (
  <header className="header">
    <div className="container">
      <h1>MusicMentor</h1>
      <p>Get expert music advice in 15 minutes</p>
    </div>
  </header>
);

const MentorCard = ({ mentor, onBook }) => (
  <div className="mentor-card">
    <div className="mentor-info">
      <h3>{mentor.name}</h3>
      <p className="specialty">{mentor.specialty}</p>
      <p className="experience">{mentor.experience} years experience</p>
      <p className="rate">${mentor.rate}/15min session</p>
    </div>
    <div className="mentor-actions">
      <button onClick={() => onBook(mentor)} className="book-btn">
        Book Session
      </button>
    </div>
  </div>
);

const BookingModal = ({ mentor, isOpen, onClose, onConfirm }) => {
  const [selectedTime, setSelectedTime] = useState('');
  const [message, setMessage] = useState('');

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <h2>Book Session with {mentor?.name}</h2>
        <div className="booking-form">
          <label>
            Preferred Time:
            <select 
              value={selectedTime} 
              onChange={e => setSelectedTime(e.target.value)}
            >
              <option value="">Select a time</option>
              <option value="morning">Morning (9-12pm)</option>
              <option value="afternoon">Afternoon (1-5pm)</option>
              <option value="evening">Evening (6-9pm)</option>
            </select>
          </label>
          
          <label>
            What do you need help with?
            <textarea 
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="Describe your specific question or challenge..."
              rows="3"
            />
          </label>
          
          <div className="modal-actions">
            <button onClick={onClose} className="cancel-btn">Cancel</button>
            <button 
              onClick={() => onConfirm(selectedTime, message)} 
              className="confirm-btn"
              disabled={!selectedTime || !message.trim()}
            >
              Request Session (${mentor?.rate})
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

function App() {
  const [mentors, setMentors] = useState([]);
  const [selectedMentor, setSelectedMentor] = useState(null);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [filter, setFilter] = useState('all');

  // Sample data for MVP
  useEffect(() => {
    const sampleMentors = [
      {
        id: 1,
        name: "Sarah Chen",
        specialty: "Guitar & Songwriting",
        experience: 8,
        rate: 35,
        category: "guitar"
      },
      {
        id: 2,
        name: "Marcus Johnson",
        specialty: "Music Production & Mixing",
        experience: 12,
        rate: 50,
        category: "production"
      },
      {
        id: 3,
        name: "Elena Rodriguez",
        specialty: "Vocal Technique & Performance",
        experience: 6,
        rate: 40,
        category: "vocals"
      },
      {
        id: 4,
        name: "Dave Williams",
        specialty: "Music Business & Booking",
        experience: 15,
        rate: 45,
        category: "business"
      }
    ];
    setMentors(sampleMentors);
  }, []);

  const handleBookMentor = (mentor) => {
    setSelectedMentor(mentor);
    setShowBookingModal(true);
  };

  const handleConfirmBooking = (time, message) => {
    // In a real app, this would call your backend
    alert(`Booking requested!\nMentor: ${selectedMentor.name}\nTime: ${time}\nMessage: ${message}`);
    setShowBookingModal(false);
    setSelectedMentor(null);
  };

  const filteredMentors = filter === 'all' 
    ? mentors 
    : mentors.filter(mentor => mentor.category === filter);

  return (
    <div className="App">
      <Header />
      
      <main className="main">
        <div className="container">
          <section className="filters">
            <h2>Find Your Music Mentor</h2>
            <div className="filter-buttons">
              <button 
                className={filter === 'all' ? 'active' : ''} 
                onClick={() => setFilter('all')}
              >
                All Mentors
              </button>
              <button 
                className={filter === 'guitar' ? 'active' : ''} 
                onClick={() => setFilter('guitar')}
              >
                Guitar
              </button>
              <button 
                className={filter === 'production' ? 'active' : ''} 
                onClick={() => setFilter('production')}
              >
                Production
              </button>
              <button 
                className={filter === 'vocals' ? 'active' : ''} 
                onClick={() => setFilter('vocals')}
              >
                Vocals
              </button>
              <button 
                className={filter === 'business' ? 'active' : ''} 
                onClick={() => setFilter('business')}
              >
                Business
              </button>
            </div>
          </section>

          <section className="mentors-grid">
            {filteredMentors.map(mentor => (
              <MentorCard 
                key={mentor.id}
                mentor={mentor}
                onBook={handleBookMentor}
              />
            ))}
          </section>
        </div>
      </main>

      <BookingModal
        mentor={selectedMentor}
        isOpen={showBookingModal}
        onClose={() => setShowBookingModal(false)}
        onConfirm={handleConfirmBooking}
      />
    </div>
  );
}

export default App;

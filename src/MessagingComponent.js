// MessagingComponent.js - Real-time Chat for Bookings
import React, { useState, useEffect, useRef } from 'react';
import { 
  subscribeToMessages, 
  sendMessage, 
  markMessagesAsRead,
  subscribeToUnreadMessages 
} from './notificationHelpers';
import { ButtonSpinner } from './LoadingComponents';
import './MessagingComponent.css';

/* ============================================
   SVG ICONS
   ============================================ */

const SendIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="22" y1="2" x2="11" y2="13"></line>
    <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
  </svg>
);

const MessageIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
  </svg>
);

const XIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <line x1="18" y1="6" x2="6" y2="18"></line>
    <line x1="6" y1="6" x2="18" y2="18"></line>
  </svg>
);

/* ============================================
   MESSAGING COMPONENT
   ============================================ */

const MessagingComponent = ({ booking, user, isOpen, onClose }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);
  const messageInputRef = useRef(null);

  // Determine who the other person is
  const otherPersonId = user.uid === booking.mentorId ? booking.userId : booking.mentorId;
  const otherPersonName = user.uid === booking.mentorId ? 
    (booking.studentName || booking.userEmail?.split('@')[0] || 'Student') : 
    booking.mentorName;

  // Subscribe to messages
  useEffect(() => {
    if (!isOpen || !booking?.id) {
      setMessages([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    const unsubscribe = subscribeToMessages(booking.id, (msgs) => {
      setMessages(msgs);
      setLoading(false);
      
      // Mark messages as read
      if (msgs.length > 0) {
        markMessagesAsRead(booking.id, user.uid);
      }
    });

    return () => unsubscribe();
  }, [isOpen, booking?.id, user.uid]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Focus input when opening
  useEffect(() => {
    if (isOpen && messageInputRef.current) {
      setTimeout(() => {
        messageInputRef.current.focus();
      }, 100);
    }
  }, [isOpen]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    
    if (!newMessage.trim() || sending) return;

    setSending(true);

    try {
      const result = await sendMessage({
        bookingId: booking.id,
        senderId: user.uid,
        senderName: user.displayName || user.email?.split('@')[0] || 'User',
        receiverId: otherPersonId,
        receiverName: otherPersonName,
        message: newMessage.trim()
      });

      if (result.success) {
        setNewMessage('');
        messageInputRef.current?.focus();
      } else {
        alert('Failed to send message. Please try again.');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Error sending message. Please try again.');
    }

    setSending(false);
  };

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return '';
    
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);

    // Today - show time only
    if (diffHours < 24 && date.getDate() === now.getDate()) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    // Yesterday
    if (diffHours < 48 && date.getDate() === now.getDate() - 1) {
      return 'Yesterday ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    // Older - show date and time
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' }) + 
           ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (!isOpen) return null;

  return (
    <div className="messaging-overlay" onClick={onClose}>
      <div className="messaging-container" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="messaging-header">
          <div className="messaging-header-info">
            <MessageIcon />
            <div>
              <h3>Chat with {otherPersonName}</h3>
              <p className="messaging-subtitle">
                Session: {booking.scheduledStart ? 
                  new Date(booking.scheduledStart.seconds * 1000).toLocaleDateString() : 
                  'Pending scheduling'}
              </p>
            </div>
          </div>
          <button className="messaging-close-btn" onClick={onClose}>
            <XIcon />
          </button>
        </div>

        {/* Messages Area */}
        <div className="messages-area">
          {loading ? (
            <div className="messages-loading">
              <ButtonSpinner />
              <p>Loading messages...</p>
            </div>
          ) : messages.length === 0 ? (
            <div className="messages-empty">
              <MessageIcon />
              <p>No messages yet</p>
              <span>Send a message to start the conversation!</span>
            </div>
          ) : (
            <div className="messages-list">
              {messages.map((msg) => {
                const isOwn = msg.senderId === user.uid;
                return (
                  <div 
                    key={msg.id} 
                    className={`message-item ${isOwn ? 'own' : 'other'}`}
                  >
                    <div className="message-bubble">
                      <div className="message-text">{msg.message}</div>
                      <div className="message-time">{formatTimestamp(msg.createdAt)}</div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input Area */}
        <form onSubmit={handleSendMessage} className="message-input-area">
          <input
            ref={messageInputRef}
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            disabled={sending}
            maxLength={500}
          />
          <button 
            type="submit" 
            className="send-btn"
            disabled={!newMessage.trim() || sending}
          >
            {sending ? <ButtonSpinner /> : <SendIcon />}
          </button>
        </form>
      </div>
    </div>
  );
};

export default MessagingComponent;

/* END OF SECTION 6 - Create this as: src/MessagingComponent.js */

// MessagingComponent.js - Real-time Chat for Bookings
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  subscribeToMessages, 
  sendMessage, 
  markMessagesAsRead
} from './notificationHelpers';
import { ButtonSpinner, useToast } from './LoadingComponents';
import './MessagingComponent.css';

/* ============================================
   ICONS
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

/* Read receipt: single check = sent, double check = read */
const CheckSingle = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"></polyline>
  </svg>
);

const CheckDouble = () => (
  <svg width="18" height="14" viewBox="0 0 28 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"></polyline>
    <polyline points="26 6 15 17 12 14"></polyline>
  </svg>
);

/* ============================================
   MESSAGING COMPONENT
   ============================================ */
const MAX_MESSAGE_LENGTH = 500;

const MessagingComponent = ({ booking, user, isOpen, onClose }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);
  const { showToast } = useToast();

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
      
      if (msgs.length > 0) {
        markMessagesAsRead(booking.id, user.uid);
      }
    });

    return () => unsubscribe();
  }, [isOpen, booking?.id, user.uid]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Focus textarea when opening
  useEffect(() => {
    if (isOpen && textareaRef.current) {
      setTimeout(() => textareaRef.current.focus(), 100);
    }
  }, [isOpen]);

  // Auto-resize textarea
  const autoResize = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 120) + 'px';
  }, []);

  useEffect(() => {
    autoResize();
  }, [newMessage, autoResize]);

  const handleSendMessage = async (e) => {
    e?.preventDefault();
    
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
        // Reset textarea height
        if (textareaRef.current) {
          textareaRef.current.style.height = 'auto';
        }
        textareaRef.current?.focus();
      } else {
        showToast('Failed to send message. Please try again.', 'error');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      showToast('Error sending message. Please try again.', 'error');
    }

    setSending(false);
  };

  const handleKeyDown = (e) => {
    // Enter sends, Shift+Enter adds newline
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return '';
    
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffHours = Math.floor(diffMs / 3600000);

    if (diffHours < 24 && date.getDate() === now.getDate()) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    if (diffHours < 48 && date.getDate() === now.getDate() - 1) {
      return 'Yesterday ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    return date.toLocaleDateString([], { month: 'short', day: 'numeric' }) + 
           ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (!isOpen) return null;

  const charCount = newMessage.length;

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
                const isRead = msg.read || (msg.readBy && msg.readBy.includes(otherPersonId));
                return (
                  <div 
                    key={msg.id} 
                    className={`message-item ${isOwn ? 'own' : 'other'}`}
                  >
                    <div className="message-bubble">
                      <div className="message-text">{msg.message}</div>
                      <div className="message-meta">
                        <span className="message-time">{formatTimestamp(msg.createdAt)}</span>
                        {isOwn && (
                          <span className={`message-receipt ${isRead ? 'read' : 'sent'}`}>
                            {isRead ? <CheckDouble /> : <CheckSingle />}
                          </span>
                        )}
                      </div>
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
          <div className="message-input-wrapper">
            <textarea
              ref={textareaRef}
              value={newMessage}
              onChange={(e) => {
                if (e.target.value.length <= MAX_MESSAGE_LENGTH) {
                  setNewMessage(e.target.value);
                }
              }}
              onKeyDown={handleKeyDown}
              placeholder="Type a message..."
              disabled={sending}
              rows={1}
            />
            {charCount > 0 && (
              <span className={`message-char-count ${charCount > MAX_MESSAGE_LENGTH * 0.8 ? 'near-limit' : ''}`}>
                {charCount}/{MAX_MESSAGE_LENGTH}
              </span>
            )}
          </div>
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

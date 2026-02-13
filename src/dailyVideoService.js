// dailyVideoService.js - Daily.co API integration for MusicMentor

const DAILY_API_BASE_URL = 'https://api.daily.co/v1';

/**
 * Daily.co API service for creating and managing video rooms
 * Requires REACT_APP_DAILY_API_KEY environment variable
 */
class DailyVideoService {
  constructor() {
    this.apiKey = process.env.REACT_APP_DAILY_API_KEY;
    this.domain = 'musicmentor'; // Your Daily.co subdomain
    
    if (!this.apiKey) {
      console.warn('Daily.co API key not found. Video features will be disabled.');
    }
  }

  /**
   * Create a new Daily.co room for a booking session
   * @param {string} bookingId - Unique booking identifier
   * @param {Object} bookingDetails - Booking information
   * @returns {Promise<Object>} Room details with join URL
   */
  async createRoom(bookingId, bookingDetails) {
    if (!this.apiKey) {
      throw new Error('Daily.co API key not configured');
    }

    console.log('🔍 Daily.co API Key present:', this.apiKey ? 'Yes' : 'No');
    console.log('🔍 API Key prefix:', this.apiKey ? this.apiKey.substring(0, 8) + '...' : 'None');
    console.log('🔍 Domain:', this.domain);
    console.log('🔍 Booking details:', bookingDetails);

    // eslint-disable-next-line no-unused-vars
    const { scheduledStart, scheduledEnd, mentorName, studentName } = bookingDetails;
    
    // Calculate session duration (add 5 minutes buffer)
    const startTime = new Date(scheduledStart.seconds * 1000);
    const endTime = new Date(scheduledEnd.seconds * 1000);
    // eslint-disable-next-line no-unused-vars
    const durationMinutes = Math.ceil((endTime - startTime) / (1000 * 60)) + 5;

    // Public room config - explicitly set to public so anyone with link can join
    const roomConfig = {
      name: `musicmentor-session-${bookingId}`,
      privacy: 'public'
    };

    console.log('🔍 Room config:', roomConfig);

    try {
      console.log('🔍 Making API request to:', `${DAILY_API_BASE_URL}/rooms`);
      
      const response = await fetch(`${DAILY_API_BASE_URL}/rooms`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify(roomConfig)
      });

      console.log('🔍 Response status:', response.status);
      console.log('🔍 Response headers:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        const errorText = await response.text();
        console.log('🔍 Error response body:', errorText);
        
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch (e) {
          errorData = { error: errorText };
        }
        
        throw new Error(`Daily.co API Error (${response.status}): ${errorData.error || errorData.message || errorText}`);
      }

      const room = await response.json();
      console.log('🔍 Successfully created room:', room);
      
      return {
        roomName: room.name,
        roomUrl: room.url,
        roomId: room.id,
        expiresAt: room.config?.exp ? new Date(room.config.exp * 1000) : new Date(Date.now() + 24 * 60 * 60 * 1000),
        createdAt: new Date()
      };

    } catch (error) {
      console.error('❌ Error creating Daily.co room:', error);
      throw error;
    }
  }

  /**
   * Delete a Daily.co room (cleanup after session)
   * @param {string} roomName - Room name to delete
   */
  async deleteRoom(roomName) {
    if (!this.apiKey) return;

    try {
      const response = await fetch(`${DAILY_API_BASE_URL}/rooms/${roomName}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        }
      });

      if (!response.ok) {
        console.warn(`Failed to delete room ${roomName}:`, await response.text());
      }
    } catch (error) {
      console.error('Error deleting Daily.co room:', error);
    }
  }

  /**
   * Generate meeting token for secure room access
   * @param {string} roomName - Daily.co room name
   * @param {Object} userInfo - User information
   * @returns {Promise<string>} Meeting token
   */
  async createMeetingToken(roomName, userInfo) {
    if (!this.apiKey) {
      throw new Error('Daily.co API key not configured');
    }

    const tokenConfig = {
      room_name: roomName,
      user_name: userInfo.displayName,
      is_owner: userInfo.role === 'mentor', // Mentors get owner privileges
      
      // Token expires 1 hour from now
      exp: Math.floor(Date.now() / 1000) + (60 * 60),
      
      // Additional permissions
      enable_screenshare: true,
      enable_recording: userInfo.role === 'mentor' // Only mentors can record
    };

    try {
      const response = await fetch(`${DAILY_API_BASE_URL}/meeting-tokens`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify(tokenConfig)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Failed to create meeting token: ${error.error}`);
      }

      const result = await response.json();
      return result.token;

    } catch (error) {
      console.error('Error creating meeting token:', error);
      throw error;
    }
  }

  /**
   * Get room information
   * @param {string} roomName - Room name to query
   * @returns {Promise<Object>} Room details
   */
  async getRoomInfo(roomName) {
    if (!this.apiKey) return null;

    try {
      const response = await fetch(`${DAILY_API_BASE_URL}/rooms/${roomName}`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        }
      });

      if (!response.ok) return null;
      return await response.json();
    } catch (error) {
      console.error('Error getting room info:', error);
      return null;
    }
  }
}

// Export singleton instance
export const dailyVideoService = new DailyVideoService();

/**
 * Utility function to check if video features are available
 */
export const isVideoEnabled = () => {
  return Boolean(process.env.REACT_APP_DAILY_API_KEY);
};

/**
 * Generate a user-friendly meeting URL for the MusicMentor domain
 * @param {string} roomName - Daily.co room name
 * @returns {string} Meeting URL
 */
export const getMeetingUrl = (roomName) => {
  return `https://musicmentor.daily.co/${roomName}`;
};

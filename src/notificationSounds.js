// notificationSounds.js — Notification sounds using Web Audio API
// No external audio files needed — generates tones programmatically

let audioContext = null;

const getAudioContext = () => {
  if (!audioContext) {
    try {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) {
      console.warn('Web Audio API not available:', e);
      return null;
    }
  }
  // Resume if suspended (browsers require user gesture)
  if (audioContext.state === 'suspended') {
    audioContext.resume();
  }
  return audioContext;
};

const playTone = (frequency, duration, type = 'sine', volume = 0.15) => {
  const ctx = getAudioContext();
  if (!ctx) return;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.type = type;
  osc.frequency.setValueAtTime(frequency, ctx.currentTime);

  // Soft attack and release to avoid clicks
  gain.gain.setValueAtTime(0, ctx.currentTime);
  gain.gain.linearRampToValueAtTime(volume, ctx.currentTime + 0.02);
  gain.gain.linearRampToValueAtTime(0, ctx.currentTime + duration);

  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + duration);
};

/**
 * Booking confirmed — two ascending piano-like tones (C5 → E5)
 * Upbeat, positive, short
 */
export const playConfirmSound = () => {
  try {
    playTone(523.25, 0.2, 'sine', 0.12);    // C5
    setTimeout(() => {
      playTone(659.25, 0.3, 'sine', 0.12);  // E5
    }, 150);
  } catch (e) {
    // Silently fail — sound is enhancement, not critical
  }
};

/**
 * New message received — single soft bell (G5)
 */
export const playMessageSound = () => {
  try {
    playTone(783.99, 0.25, 'sine', 0.08);   // G5
  } catch (e) {}
};

/**
 * Booking declined — single descending tone (E4)
 * Neutral, not punishing
 */
export const playDeclineSound = () => {
  try {
    playTone(329.63, 0.3, 'triangle', 0.08); // E4 triangle wave
  } catch (e) {}
};

/**
 * Generic notification — soft chime (A5)
 */
export const playNotificationSound = () => {
  try {
    playTone(880, 0.2, 'sine', 0.1);        // A5
  } catch (e) {}
};

/**
 * Success — three-note ascending arpeggio (C5 → E5 → G5)
 * For significant wins like first booking
 */
export const playSuccessChime = () => {
  try {
    playTone(523.25, 0.15, 'sine', 0.1);    // C5
    setTimeout(() => playTone(659.25, 0.15, 'sine', 0.1), 120);  // E5
    setTimeout(() => playTone(783.99, 0.25, 'sine', 0.1), 240);  // G5
  } catch (e) {}
};

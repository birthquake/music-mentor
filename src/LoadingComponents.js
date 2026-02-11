// LoadingComponents.js - Reusable loading states, spinners, and toast notifications
import React, { useState, useEffect, useCallback, createContext, useContext } from 'react';

/* ============================================
   SHIMMER GRADIENT (dark-theme appropriate)
   ============================================ */
const shimmerBg = 'linear-gradient(90deg, rgba(255,255,255,0.04) 25%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.04) 75%)';
const shimmerStyle = {
  background: shimmerBg,
  backgroundSize: '200% 100%',
  animation: 'shimmer 1.5s ease-in-out infinite',
  borderRadius: '6px'
};

/* ============================================
   SPINNER
   ============================================ */
export const Spinner = ({ size = 'medium', color = '#3b82f6' }) => {
  const sizes = {
    small: '16px',
    medium: '24px',
    large: '40px'
  };

  return (
    <div
      style={{
        width: sizes[size],
        height: sizes[size],
        border: `3px solid rgba(255, 255, 255, 0.1)`,
        borderTopColor: color,
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
        flexShrink: 0
      }}
    />
  );
};

/* ============================================
   BUTTON SPINNER (inline for buttons)
   ============================================ */
export const ButtonSpinner = () => (
  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
    <Spinner size="small" color="currentColor" />
    <span>Loading...</span>
  </div>
);

/* ============================================
   FULL PAGE LOADING
   ============================================ */
export const FullPageLoading = ({ message = 'Loading...' }) => (
  <div style={{
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '400px',
    gap: '1rem'
  }}>
    <Spinner size="large" />
    <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
      {message}
    </p>
  </div>
);

/* ============================================
   INLINE LOADING
   ============================================ */
export const InlineLoading = ({ message = 'Loading...' }) => (
  <div style={{
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.5rem',
    color: 'var(--text-secondary)',
    fontSize: '0.875rem'
  }}>
    <Spinner size="small" />
    <span>{message}</span>
  </div>
);

/* ============================================
   SKELETON COMPONENTS (dark theme)
   ============================================ */

// Skeleton Card (for booking cards)
export const SkeletonCard = () => (
  <div className="booking-card" style={{ opacity: 0.7 }}>
    <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
      <div style={{ width: '48px', height: '48px', borderRadius: '50%', ...shimmerStyle }} />
      <div style={{ flex: 1 }}>
        <div style={{ height: '20px', width: '60%', marginBottom: '0.5rem', ...shimmerStyle }} />
        <div style={{ height: '16px', width: '40%', ...shimmerStyle }} />
      </div>
    </div>
    <div style={{ height: '60px', marginBottom: '1rem', ...shimmerStyle }} />
    <div style={{ height: '40px', width: '100%', borderRadius: '8px', ...shimmerStyle }} />
  </div>
);

// Skeleton Grid (multiple cards)
export const SkeletonGrid = ({ count = 3 }) => (
  <div className="bookings-grid">
    {Array(count).fill(0).map((_, i) => (
      <SkeletonCard key={i} />
    ))}
  </div>
);

// Skeleton Mentor Card (for homepage grid)
export const SkeletonMentorCard = () => (
  <div className="mentor-card" style={{ opacity: 0.7, border: '1px solid var(--border-color)' }}>
    <div style={{ display: 'flex', gap: '12px', padding: '16px' }}>
      <div style={{ width: '40px', height: '40px', borderRadius: '50%', flexShrink: 0, ...shimmerStyle }} />
      <div style={{ flex: 1 }}>
        <div style={{ height: '18px', width: '55%', marginBottom: '8px', ...shimmerStyle }} />
        <div style={{ height: '14px', width: '35%', ...shimmerStyle }} />
      </div>
    </div>
    <div style={{ padding: '0 16px 16px' }}>
      <div style={{ height: '14px', width: '70%', marginBottom: '12px', ...shimmerStyle }} />
      <div style={{ display: 'flex', gap: '6px', marginBottom: '16px' }}>
        <div style={{ height: '24px', width: '60px', borderRadius: '12px', ...shimmerStyle }} />
        <div style={{ height: '24px', width: '50px', borderRadius: '12px', ...shimmerStyle }} />
        <div style={{ height: '24px', width: '70px', borderRadius: '12px', ...shimmerStyle }} />
      </div>
    </div>
    <div style={{ 
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '12px 16px', borderTop: '1px solid var(--border-color)'
    }}>
      <div style={{ height: '24px', width: '60px', ...shimmerStyle }} />
      <div style={{ height: '36px', width: '110px', borderRadius: '18px', ...shimmerStyle }} />
    </div>
  </div>
);

// Skeleton Mentor Grid (for homepage)
export const SkeletonMentorGrid = ({ count = 4 }) => (
  <div className="mentors-grid">
    {Array(count).fill(0).map((_, i) => (
      <SkeletonMentorCard key={i} />
    ))}
  </div>
);

// Stats Card Skeleton
export const SkeletonStatsCard = () => (
  <div className="stats-card" style={{ opacity: 0.7 }}>
    <div style={{ width: '60px', height: '60px', borderRadius: '12px', ...shimmerStyle }} />
    <div style={{ flex: 1 }}>
      <div style={{ height: '36px', width: '50px', marginBottom: '0.5rem', ...shimmerStyle }} />
      <div style={{ height: '14px', width: '80%', ...shimmerStyle }} />
    </div>
  </div>
);

/* ============================================
   TOAST NOTIFICATION SYSTEM
   
   Usage:
   1. Wrap your app with <ToastProvider>
   2. In any component: const { showToast } = useToast();
   3. Call: showToast('Session confirmed!', 'success')
   
   Types: 'success', 'error', 'warning', 'info'
   ============================================ */

// Toast icons
const ToastIcons = {
  success: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  ),
  error: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <circle cx="12" cy="12" r="10" />
      <line x1="15" y1="9" x2="9" y2="15" />
      <line x1="9" y1="9" x2="15" y2="15" />
    </svg>
  ),
  warning: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  ),
  info: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="16" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
  )
};

// Toast styling per type
const toastThemes = {
  success: {
    bg: 'linear-gradient(135deg, #064e3b, #065f46)',
    border: '#10b981',
    color: '#d1fae5',
    iconColor: '#34d399'
  },
  error: {
    bg: 'linear-gradient(135deg, #7f1d1d, #991b1b)',
    border: '#ef4444',
    color: '#fecaca',
    iconColor: '#f87171'
  },
  warning: {
    bg: 'linear-gradient(135deg, #78350f, #92400e)',
    border: '#f59e0b',
    color: '#fef3c7',
    iconColor: '#fbbf24'
  },
  info: {
    bg: 'linear-gradient(135deg, #1e3a5f, #1e40af)',
    border: '#3b82f6',
    color: '#dbeafe',
    iconColor: '#60a5fa'
  }
};

// Single toast item
const Toast = ({ id, message, type = 'info', onDismiss }) => {
  const [isExiting, setIsExiting] = useState(false);
  const theme = toastThemes[type] || toastThemes.info;
  const Icon = ToastIcons[type] || ToastIcons.info;

  const handleDismiss = useCallback(() => {
    setIsExiting(true);
    setTimeout(() => onDismiss(id), 200);
  }, [id, onDismiss]);

  useEffect(() => {
    const timer = setTimeout(handleDismiss, 3500);
    return () => clearTimeout(timer);
  }, [handleDismiss]);

  return (
    <div
      role="alert"
      onClick={handleDismiss}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '14px 18px',
        background: theme.bg,
        border: `1px solid ${theme.border}`,
        borderRadius: '12px',
        color: theme.color,
        fontSize: '14px',
        fontWeight: '500',
        lineHeight: '1.4',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
        cursor: 'pointer',
        maxWidth: '420px',
        width: '100%',
        animation: isExiting ? 'toastExit 0.2s ease-in forwards' : 'toastEnter 0.3s ease-out',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)'
      }}
    >
      <div style={{ color: theme.iconColor, flexShrink: 0, display: 'flex' }}>
        <Icon />
      </div>
      <span style={{ flex: 1 }}>{message}</span>
      <div style={{ 
        color: theme.iconColor, 
        opacity: 0.6, 
        flexShrink: 0, 
        fontSize: '18px', 
        lineHeight: 1,
        fontWeight: '300'
      }}>
        ×
      </div>
    </div>
  );
};

// Toast context
const ToastContext = createContext(null);

// Toast provider — wrap your <App> with this
export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((message, type = 'info') => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type }]);
  }, []);

  const dismissToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {/* Toast container */}
      <div
        aria-live="polite"
        style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          display: 'flex',
          flexDirection: 'column-reverse',
          gap: '8px',
          zIndex: 9999,
          pointerEvents: 'none',
          maxWidth: 'calc(100vw - 48px)'
        }}
      >
        {toasts.map(toast => (
          <div key={toast.id} style={{ pointerEvents: 'auto' }}>
            <Toast
              id={toast.id}
              message={toast.message}
              type={toast.type}
              onDismiss={dismissToast}
            />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

// Hook for consuming toast in any component
export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    // Fallback if used outside provider (won't crash, just won't show)
    console.warn('useToast used outside ToastProvider — toasts will not display');
    return { showToast: () => {} };
  }
  return context;
};

/* ============================================
   INJECT ANIMATIONS
   ============================================ */
if (typeof document !== 'undefined') {
  const id = 'loading-components-styles';
  if (!document.getElementById(id)) {
    const style = document.createElement('style');
    style.id = id;
    style.textContent = `
      @keyframes spin {
        to { transform: rotate(360deg); }
      }

      @keyframes shimmer {
        0% { background-position: 200% 0; }
        100% { background-position: -200% 0; }
      }

      @keyframes toastEnter {
        from {
          opacity: 0;
          transform: translateY(16px) scale(0.95);
        }
        to {
          opacity: 1;
          transform: translateY(0) scale(1);
        }
      }

      @keyframes toastExit {
        from {
          opacity: 1;
          transform: translateY(0) scale(1);
        }
        to {
          opacity: 0;
          transform: translateY(-8px) scale(0.95);
        }
      }

      @media (max-width: 480px) {
        [aria-live="polite"] {
          bottom: 16px !important;
          right: 16px !important;
          left: 16px !important;
        }
      }
    `;
    document.head.appendChild(style);
  }
}

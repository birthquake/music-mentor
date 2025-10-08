// LoadingComponents.js - Reusable loading states and spinners
import React from 'react';

// Spinner Component
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
        border: `3px solid rgba(59, 130, 246, 0.1)`,
        borderTopColor: color,
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite'
      }}
    />
  );
};

// Loading Button Content
export const ButtonSpinner = () => (
  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
    <Spinner size="small" color="currentColor" />
    <span>Loading...</span>
  </div>
);

// Full Page Loading
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

// Skeleton Card (for booking cards)
export const SkeletonCard = () => (
  <div className="booking-card" style={{ opacity: 0.6 }}>
    <div style={{
      display: 'flex',
      gap: '1rem',
      marginBottom: '1rem'
    }}>
      {/* Avatar skeleton */}
      <div style={{
        width: '48px',
        height: '48px',
        borderRadius: '50%',
        background: 'linear-gradient(90deg, #f3f4f6 25%, #e5e7eb 50%, #f3f4f6 75%)',
        backgroundSize: '200% 100%',
        animation: 'shimmer 1.5s infinite'
      }} />
      
      <div style={{ flex: 1 }}>
        {/* Name skeleton */}
        <div style={{
          height: '20px',
          width: '60%',
          marginBottom: '0.5rem',
          borderRadius: '4px',
          background: 'linear-gradient(90deg, #f3f4f6 25%, #e5e7eb 50%, #f3f4f6 75%)',
          backgroundSize: '200% 100%',
          animation: 'shimmer 1.5s infinite'
        }} />
        
        {/* Date skeleton */}
        <div style={{
          height: '16px',
          width: '40%',
          borderRadius: '4px',
          background: 'linear-gradient(90deg, #f3f4f6 25%, #e5e7eb 50%, #f3f4f6 75%)',
          backgroundSize: '200% 100%',
          animation: 'shimmer 1.5s infinite'
        }} />
      </div>
    </div>
    
    {/* Content skeleton */}
    <div style={{
      height: '60px',
      marginBottom: '1rem',
      borderRadius: '4px',
      background: 'linear-gradient(90deg, #f3f4f6 25%, #e5e7eb 50%, #f3f4f6 75%)',
      backgroundSize: '200% 100%',
      animation: 'shimmer 1.5s infinite'
    }} />
    
    {/* Button skeleton */}
    <div style={{
      height: '40px',
      width: '100%',
      borderRadius: '8px',
      background: 'linear-gradient(90deg, #f3f4f6 25%, #e5e7eb 50%, #f3f4f6 75%)',
      backgroundSize: '200% 100%',
      animation: 'shimmer 1.5s infinite'
    }} />
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

// Inline Loading (for small operations)
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

// Stats Card Skeleton
export const SkeletonStatsCard = () => (
  <div className="stats-card" style={{ opacity: 0.6 }}>
    <div style={{
      width: '40px',
      height: '40px',
      borderRadius: '8px',
      marginBottom: '0.5rem',
      background: 'linear-gradient(90deg, #f3f4f6 25%, #e5e7eb 50%, #f3f4f6 75%)',
      backgroundSize: '200% 100%',
      animation: 'shimmer 1.5s infinite'
    }} />
    <div style={{
      height: '32px',
      width: '50px',
      marginBottom: '0.5rem',
      borderRadius: '4px',
      background: 'linear-gradient(90deg, #f3f4f6 25%, #e5e7eb 50%, #f3f4f6 75%)',
      backgroundSize: '200% 100%',
      animation: 'shimmer 1.5s infinite'
    }} />
    <div style={{
      height: '16px',
      width: '80%',
      borderRadius: '4px',
      background: 'linear-gradient(90deg, #f3f4f6 25%, #e5e7eb 50%, #f3f4f6 75%)',
      backgroundSize: '200% 100%',
      animation: 'shimmer 1.5s infinite'
    }} />
  </div>
);

// Add animations to document
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = `
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    
    @keyframes shimmer {
      0% { background-position: 200% 0; }
      100% { background-position: -200% 0; }
    }
  `;
  document.head.appendChild(style);
}

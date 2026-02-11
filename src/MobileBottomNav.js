// MobileBottomNav.js — Sticky bottom navigation for mobile
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import './MobileBottomNav.css';

/* ============================================
   ICONS (filled variants for active state)
   ============================================ */
const HomeIcon = ({ active }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth={active ? "0" : "2"}>
    {active ? (
      <path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0a1 1 0 01-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1h-2z" />
    ) : (
      <path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0h6" />
    )}
  </svg>
);

const SessionsIcon = ({ active }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth={active ? "0" : "2"}>
    {active ? (
      <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 3c1.93 0 3.5 1.57 3.5 3.5S13.93 13 12 13s-3.5-1.57-3.5-3.5S10.07 6 12 6zm7 13H5v-.23c0-.62.28-1.2.76-1.58C7.47 15.82 9.64 15 12 15s4.53.82 6.24 2.19c.48.38.76.97.76 1.58V19z" />
    ) : (
      <>
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
        <circle cx="12" cy="10" r="3" />
        <path d="M6 21v-1a6 6 0 0112 0v1" />
      </>
    )}
  </svg>
);

const ProfileIcon = ({ active }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth={active ? "0" : "2"}>
    {active ? (
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z" />
    ) : (
      <>
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </>
    )}
  </svg>
);

const MusicNoteIcon = ({ active }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth={active ? "0" : "2"}>
    {active ? (
      <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
    ) : (
      <>
        <path d="M9 18V5l12-2v13" />
        <circle cx="6" cy="18" r="3" />
        <circle cx="18" cy="16" r="3" />
      </>
    )}
  </svg>
);

/* ============================================
   COMPONENT
   ============================================ */
const MobileBottomNav = ({ user, mentorInfo }) => {
  const location = useLocation();
  const path = location.pathname;

  if (!user) return null;

  const isMentor = !!mentorInfo;

  const navItems = isMentor
    ? [
        { to: '/', label: 'Browse', icon: HomeIcon, match: ['/'] },
        { to: '/mentor-dashboard', label: 'Dashboard', icon: SessionsIcon, match: ['/mentor-dashboard'] },
        { to: '/mentor-profile', label: 'Profile', icon: ProfileIcon, match: ['/mentor-profile'] },
      ]
    : [
        { to: '/', label: 'Browse', icon: HomeIcon, match: ['/'] },
        { to: '/my-bookings', label: 'Sessions', icon: MusicNoteIcon, match: ['/my-bookings'] },
        { to: '/profile', label: 'Profile', icon: ProfileIcon, match: ['/profile'] },
      ];

  return (
    <nav className="mobile-bottom-nav" role="navigation" aria-label="Mobile navigation">
      {navItems.map(item => {
        const isActive = item.match.includes(path);
        const Icon = item.icon;

        return (
          <Link
            key={item.to}
            to={item.to}
            className={`bottom-nav-item ${isActive ? 'active' : ''}`}
            aria-current={isActive ? 'page' : undefined}
          >
            <Icon active={isActive} />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
};

export default MobileBottomNav;

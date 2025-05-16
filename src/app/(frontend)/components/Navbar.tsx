'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import { useEffect, useState, useRef } from 'react';

const Navbar = () => {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const isLoginPage = pathname === '/login';
  const [authError, setAuthError] = useState<string | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Don't render the navbar on the login page
  if (isLoginPage) {
    return null;
  }

  const getInitials = (name: string) => {
    return name.charAt(0).toUpperCase();
  };

  return (
    <nav className="navbar">
      <div className="logo">
        <Link href="/">SSS Image Tagging</Link>
      </div>
      <div className="nav-links">
        {user ? (
          <>
            <Link 
              href="/" 
              className={`nav-link ${pathname === '/' ? 'active' : ''}`}
            >
              Home
            </Link>
            <Link 
              href="/tag" 
              className={`nav-link ${pathname === '/tag' ? 'active' : ''}`}
            >
              Tag
            </Link>
            <Link 
              href="/gallery" 
              className={`nav-link ${pathname === '/gallery' ? 'active' : ''}`}
            >
              Gallery
            </Link>
            {user.role === 'admin' && (
              <Link 
                href="/dashboard" 
                className={`nav-link ${pathname === '/dashboard' ? 'active' : ''}`}
              >
                Dashboard
              </Link>
            )}
            <div className="avatar-container" ref={dropdownRef}>
              <button 
                className="avatar-button"
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              >
                {getInitials(user.displayName || user.email)}
              </button>
              {isDropdownOpen && (
                <div className="avatar-dropdown">
                  <div className="dropdown-user-info">
                    {user.displayName || user.email}
                  </div>
                  <button 
                    onClick={logout} 
                    className="dropdown-logout-button"
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
          </>
        ) : (
          <>
            <div className="auth-error">
              Your session has expired. Please log in again.
            </div>
            <button 
              onClick={() => window.location.href = '/login'} 
              className="login-button"
            >
              Login
            </button>
          </>
        )}
      </div>
    </nav>
  );
};

export default Navbar; 
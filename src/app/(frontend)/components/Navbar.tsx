'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import { useEffect, useState } from 'react';

const Navbar = () => {
  const pathname = usePathname();
  const { user, logout, isChecking } = useAuth();
  const isLoginPage = pathname === '/login';
  const [authError, setAuthError] = useState<string | null>(null);

  // Don't render the navbar on the login page
  if (isLoginPage) {
    return null;
  }

  // Show a minimal navbar while checking auth
  if (isChecking) {
    return (
      <nav className="navbar">
        <div className="logo">
          <Link href="/">SSS Image Tagging</Link>
        </div>
      </nav>
    );
  }

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
            <Link 
              href="/uploads" 
              className={`nav-link ${pathname === '/uploads' ? 'active' : ''}`}
            >
              Uploads
            </Link>
            <button 
              onClick={logout} 
              className="logout-button"
            >
              Logout
            </button>
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
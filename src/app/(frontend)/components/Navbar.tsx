'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '../context/AuthContext';

const Navbar = () => {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const isLoginPage = pathname === '/login';

  // Don't render the navbar on the login page
  if (isLoginPage) {
    return null;
  }

  return (
    <nav className="navbar">
      <div className="logo">
        <Link href="/">SSS Image Tagging</Link>
      </div>
      {user && (
        <div className="nav-links">
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
          <button 
            onClick={logout} 
            className="logout-button"
          >
            Logout
          </button>
        </div>
      )}
    </nav>
  );
};

export default Navbar; 
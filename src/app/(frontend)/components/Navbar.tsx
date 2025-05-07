'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '../context/AuthContext';

const Navbar = () => {
  const pathname = usePathname();
  const router = useRouter();
  const { user, setUser } = useAuth();

  const handleLogout = async () => {
    try {
      const res = await fetch('/api/users/logout', {
        method: 'POST',
        credentials: 'include',
      });

      if (!res.ok) {
        throw new Error('Logout failed');
      }

      // Clear auth state and localStorage
      setUser(null);
      localStorage.removeItem('auth-state');
      
      // Dispatch storage event to notify other tabs
      window.dispatchEvent(new StorageEvent('storage', {
        key: 'auth-state',
        newValue: null
      }));

      router.push('/login');
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

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
            onClick={handleLogout} 
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
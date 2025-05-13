'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { User } from '../../payload-types';

interface AuthContextType {
  user: User | null;
  setUser: (user: User | null) => void;
  checkAuth: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(false);

  const checkAuth = async () => {
    if (isChecking) return; // Prevent concurrent checks
    setIsChecking(true);
    
    try {
      const res = await fetch('/api/users/me', {
        credentials: 'include',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });

      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        // Update localStorage after successful auth check
        localStorage.setItem('auth-state', JSON.stringify(data.user));
        // Set a timestamp for the auth state
        localStorage.setItem('auth-timestamp', Date.now().toString());
      } else {
        setUser(null);
        localStorage.removeItem('auth-state');
        localStorage.removeItem('auth-timestamp');
      }
    } catch (err) {
      console.error('Auth check error:', err);
      setUser(null);
      localStorage.removeItem('auth-state');
      localStorage.removeItem('auth-timestamp');
    } finally {
      setIsChecking(false);
    }
  };

  const logout = async () => {
    try {
      const res = await fetch('/api/users/logout', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });

      if (!res.ok) {
        throw new Error('Logout failed');
      }

      // Clear auth state and localStorage
      setUser(null);
      localStorage.removeItem('auth-state');
      localStorage.removeItem('auth-timestamp');
      
      // Dispatch storage event to notify other tabs
      window.dispatchEvent(new StorageEvent('storage', {
        key: 'auth-state',
        newValue: null
      }));

      // Clear cookies by setting them to expire
      document.cookie = 'token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
      document.cookie = 'payload-token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';

      // Force a hard reload to clear any cached state
      window.location.href = '/login';
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  useEffect(() => {
    // Initial auth check
    checkAuth();

    // Set up periodic auth check
    const authCheckInterval = setInterval(() => {
      const authTimestamp = localStorage.getItem('auth-timestamp');
      if (authTimestamp) {
        const timestamp = parseInt(authTimestamp);
        const now = Date.now();
        // Check auth every 5 minutes
        if (now - timestamp > 5 * 60 * 1000) {
          checkAuth();
        }
      }
    }, 60000); // Check every minute

    // Listen for storage events to sync auth state across tabs
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'auth-state') {
        const newState = e.newValue ? JSON.parse(e.newValue) : null;
        setUser(newState);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      clearInterval(authCheckInterval);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, setUser, checkAuth, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}; 
'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { User } from '../../../payload-types';

interface AuthContextType {
  user: User | null;
  setUser: (user: User | null) => void;
  checkAuth: () => Promise<void>;
  logout: () => Promise<void>;
  isChecking: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Create a custom event for auth errors
export const AUTH_ERROR_EVENT = 'auth-error';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    if (isLoggingOut) return; // Prevent multiple logout attempts
    setIsLoggingOut(true);
    
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

      // Only redirect if we're not already on the login page
      if (window.location.pathname !== '/login') {
        router.push('/login');
      }
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setIsLoggingOut(false);
    }
  };

  const checkAuth = async () => {
    if (isChecking || isLoggingOut) return; // Prevent concurrent checks and don't check while logging out
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
        // If authentication fails, trigger automatic logout
        await handleLogout();
      }
    } catch (err) {
      console.error('Auth check error:', err);
      // If there's an error checking auth, trigger automatic logout
      await handleLogout();
    } finally {
      setIsChecking(false);
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
      } else {
        // If no timestamp exists, user is not authenticated
        handleLogout();
      }
    }, 60000); // Check every minute

    // Listen for storage events to sync auth state across tabs
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'auth-state') {
        const newState = e.newValue ? JSON.parse(e.newValue) : null;
        if (!newState) {
          // If auth state is cleared in another tab, logout
          handleLogout();
        } else {
          setUser(newState);
        }
      }
    };

    // Add visibility change listener to check auth when tab becomes visible
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkAuth();
      }
    };

    // Add global fetch interceptor to handle auth errors
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      const response = await originalFetch(...args);
      
      // Check if the response is an auth error
      if (response.status === 401) {
        // Dispatch auth error event
        window.dispatchEvent(new CustomEvent(AUTH_ERROR_EVENT, {
          detail: { message: 'Your session has expired. Please log in again.' }
        }));
        
        // Clear user state
        setUser(null);
        localStorage.removeItem('auth-state');
        localStorage.removeItem('auth-timestamp');
      }
      
      return response;
    };

    window.addEventListener('storage', handleStorageChange);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      clearInterval(authCheckInterval);
      window.removeEventListener('storage', handleStorageChange);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      // Restore original fetch
      window.fetch = originalFetch;
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, setUser, checkAuth, logout: handleLogout, isChecking }}>
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
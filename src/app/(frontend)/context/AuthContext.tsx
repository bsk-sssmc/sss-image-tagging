'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import type { User } from '../../../payload-types';

interface AuthContextType {
  user: User | null;
  setUser: (user: User | null) => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const isLoginPage = pathname === '/login';

  // Handle initial mount and hydration
  useEffect(() => {
    setIsMounted(true);
    // Initialize from localStorage only after mount
    const storedUser = localStorage.getItem('auth-state');
    const storedTimestamp = localStorage.getItem('auth-timestamp');
    
    // Check if stored data is still valid (less than 24 hours old)
    if (storedUser && storedTimestamp) {
      const timestamp = parseInt(storedTimestamp, 10);
      const now = Date.now();
      if (now - timestamp < 24 * 60 * 60 * 1000) { // 24 hours
        try {
          setUser(JSON.parse(storedUser));
        } catch (e) {
          console.error('Failed to parse stored user:', e);
          localStorage.removeItem('auth-state');
          localStorage.removeItem('auth-timestamp');
        }
      } else {
        // Clear expired data
        localStorage.removeItem('auth-state');
        localStorage.removeItem('auth-timestamp');
      }
    }
  }, []);

  const handleLogout = useCallback(async () => {
    try {
      // Clear all auth state first
      setUser(null);
      localStorage.removeItem('auth-state');
      localStorage.removeItem('auth-timestamp');
      
      // Clear cookies with proper domain and path
      const domain = window.location.hostname;
      document.cookie = `token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=${domain}; SameSite=Lax`;
      document.cookie = `payload-token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=${domain}; SameSite=Lax`;

      // Try to call logout endpoint, but don't fail if it errors
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
          console.warn('Logout endpoint returned error:', res.status);
        }
      } catch (err) {
        console.warn('Logout endpoint error:', err);
      }

      // Only redirect if not already on login page
      if (!isLoginPage) {
        router.push('/login');
      }
    } catch (err) {
      console.error('Logout error:', err);
      // Even if there's an error, clear local state and redirect
      setUser(null);
      localStorage.removeItem('auth-state');
      localStorage.removeItem('auth-timestamp');
      if (!isLoginPage) {
        router.push('/login');
      }
    }
  }, [isLoginPage, router]);

  // Simple auth check for protected pages
  useEffect(() => {
    const checkAuth = async () => {
      // Skip auth check on login page or before mount
      if (isLoginPage || !isMounted) return;

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
          if (data?.user) {
            setUser(data.user);
            // Only store in localStorage if we're not in production
            if (process.env.NODE_ENV !== 'production') {
              localStorage.setItem('auth-state', JSON.stringify(data.user));
              localStorage.setItem('auth-timestamp', Date.now().toString());
            }
          } else {
            // No user data, treat as unauthorized
            await handleLogout();
          }
        } else if (res.status === 401) {
          // Unauthorized, logout
          await handleLogout();
        }
      } catch (err) {
        console.error('Auth check error:', err);
        // Don't logout on network errors, keep existing state
        if (err instanceof Error && err.message !== 'Failed to fetch') {
          await handleLogout();
        }
      }
    };

    // Only check auth on protected pages and after mount
    if (!isLoginPage && isMounted) {
      checkAuth();
    }
  }, [isLoginPage, pathname, isMounted, handleLogout]);

  // Prevent hydration mismatch by not rendering children until mounted
  if (!isMounted) {
    return null;
  }

  return (
    <AuthContext.Provider value={{ user, setUser, logout: handleLogout }}>
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
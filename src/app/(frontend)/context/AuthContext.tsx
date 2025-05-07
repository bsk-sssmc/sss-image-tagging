'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { User } from '../../payload-types';

interface AuthContextType {
  user: User | null;
  setUser: (user: User | null) => void;
  checkAuth: () => Promise<void>;
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
      });

      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        // Update localStorage after successful auth check
        localStorage.setItem('auth-state', JSON.stringify(data.user));
      } else {
        setUser(null);
        localStorage.removeItem('auth-state');
      }
    } catch (err) {
      console.error('Auth check error:', err);
      setUser(null);
      localStorage.removeItem('auth-state');
    } finally {
      setIsChecking(false);
    }
  };

  useEffect(() => {
    // Initial auth check
    checkAuth();

    // Listen for storage events to sync auth state across tabs
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'auth-state') {
        const newState = e.newValue ? JSON.parse(e.newValue) : null;
        setUser(newState);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  return (
    <AuthContext.Provider value={{ user, setUser, checkAuth }}>
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
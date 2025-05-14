'use client';

import { useEffect, useState } from 'react';
import { AUTH_ERROR_EVENT } from '../context/AuthContext';

export default function AuthErrorNotification() {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleAuthError = (event: CustomEvent) => {
      setError(event.detail.message);
      // Auto-hide after 5 seconds
      setTimeout(() => setError(null), 5000);
    };

    window.addEventListener(AUTH_ERROR_EVENT, handleAuthError as EventListener);
    return () => {
      window.removeEventListener(AUTH_ERROR_EVENT, handleAuthError as EventListener);
    };
  }, []);

  if (!error) return null;

  return (
    <div className="auth-error-notification">
      <div className="auth-error-content">
        <p>{error}</p>
        <button 
          onClick={() => window.location.href = '/login'}
          className="auth-error-button"
        >
          Login Again
        </button>
      </div>
    </div>
  );
} 
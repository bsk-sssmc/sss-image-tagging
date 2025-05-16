'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AuthErrorNotification() {
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    // Listen for 401 responses
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      const response = await originalFetch(...args);
      
      if (response.status === 401) {
        setError('Your session has expired. Please log in again.');
        // Auto-hide after 5 seconds
        setTimeout(() => setError(null), 5000);
      }
      
      return response;
    };

    return () => {
      window.fetch = originalFetch;
    };
  }, []);

  if (!error) return null;

  return (
    <div className="auth-error-notification">
      <div className="auth-error-content">
        <p>{error}</p>
        <button 
          onClick={() => router.push('/login')}
          className="auth-error-button"
        >
          Login Again
        </button>
      </div>
    </div>
  );
} 
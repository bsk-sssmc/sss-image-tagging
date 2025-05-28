'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function TagDefaultPage() {
  const router = useRouter();

  useEffect(() => {
    const fetchRandomImage = async () => {
      try {
        const response = await fetch('/api/media/random', {
          credentials: 'include',
        });
        
        if (!response.ok) {
          if (response.status === 401) {
            const from = encodeURIComponent('/tag');
            router.push(`/login?from=${from}`);
            return;
          }
          throw new Error('Failed to fetch image');
        }
        
        const data = await response.json();
        router.replace(`/tag/${data.id}`);
      } catch (error) {
        console.error('Error fetching random image:', error);
      }
    };

    fetchRandomImage();
  }, [router]);

  return (
    <div className="loading-overlay">
      <div className="loading-spinner"></div>
    </div>
  );
} 
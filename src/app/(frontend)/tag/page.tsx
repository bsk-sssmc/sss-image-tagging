'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import ImageModal from './components/ImageModal';
import TagForm from './components/TagForm';
import Comments from './components/Comments';
import { useSearchParams, useRouter } from 'next/navigation';
import Cookies from 'js-cookie';

interface Media {
  id: string;
  url: string;
  alt?: string;
}

export default function TagPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [currentImage, setCurrentImage] = useState<Media | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const searchParams = useSearchParams();
  const router = useRouter();
  const imageId = searchParams.get('image');

  // Check authentication on page load
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/users/me', {
          credentials: 'include',
        });
        
        if (!response.ok) {
          console.log('Not authenticated, redirecting to login...');
          const from = encodeURIComponent('/tag');
          router.push(`/login?from=${from}`);
          return;
        }

        // If we get here, we're authenticated
        if (imageId) {
          fetchSpecificImage(imageId);
        } else {
          fetchRandomImage();
        }
      } catch (error) {
        console.error('Auth check error:', error);
        const from = encodeURIComponent('/tag');
        router.push(`/login?from=${from}`);
      }
    };

    checkAuth();
  }, [router, imageId]);

  useEffect(() => {
    const handleOpenImageModal = (event: CustomEvent) => {
      setSelectedImage(event.detail.imageUrl);
      setIsModalOpen(true);
    };

    window.addEventListener('openImageModal', handleOpenImageModal as EventListener);
    return () => {
      window.removeEventListener('openImageModal', handleOpenImageModal as EventListener);
    };
  }, []);

  const fetchSpecificImage = async (id: string) => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/media/${id}`, {
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch image');
      }
      
      const data = await response.json();
      setCurrentImage(data);
    } catch (error) {
      console.error('Error fetching specific image:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchRandomImage = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/media/random', {
        credentials: 'include',
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          console.log('401 response, redirecting to login...');
          const from = encodeURIComponent('/tag');
          router.push(`/login?from=${from}`);
          return;
        }
        throw new Error('Failed to fetch image');
      }
      const data = await response.json();
      setCurrentImage(data);
      // Always update URL with the current image ID
      router.replace(`/tag?image=${data.id}`, { scroll: false });
    } catch (error) {
      console.error('Error fetching image:', error);
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  const handleImageClick = () => {
    if (currentImage?.url) {
      setSelectedImage(currentImage.url);
      setIsModalOpen(true);
    }
  };

  const handleRefresh = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering image click
    fetchRandomImage();
  };

  const handleFormSubmit = async (formData: any) => {
    console.log('Tag form submitted with data:', formData);
    
    try {
      // Only fetch random image if we're not viewing a specific image
      if (!imageId) {
        await fetchRandomImage();
      }
      
      console.log('Successfully processed tag submission');
    } catch (error) {
      console.error('Error processing tag submission:', error);
    }
  };

  return (
    <div className="tag-container">
      <div className="tag-grid">
        {/* Left Column - Image */}
        <div className="image-container">
          <div 
            className="image-wrapper"
            onContextMenu={(e) => e.preventDefault()}
            onDragStart={(e) => e.preventDefault()}
            onSelect={(e) => e.preventDefault()}
          >
            {isLoading ? (
              <div className="loading-overlay">
                <div className="loading-spinner"></div>
              </div>
            ) : currentImage?.url ? (
              <div 
                className="image-click-area"
                onClick={handleImageClick}
              >
                <Image
                  src={currentImage.url}
                  alt={currentImage.alt || 'Image to tag'}
                  fill
                  style={{ objectFit: 'contain', userSelect: 'none', WebkitUserSelect: 'none' }}
                  priority
                  draggable={false}
                  onContextMenu={(e) => e.preventDefault()}
                />
              </div>
            ) : null}
            <button
              onClick={handleRefresh}
              className="refresh-button"
              aria-label="Refresh image"
            >
              <svg 
                viewBox="0 0 24 24" 
                width="24" 
                height="24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2"
              >
                <path d="M23 4v6h-6M1 20v-6h6" />
                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
              </svg>
            </button>
          </div>
        </div>

        {/* Right Column - Form */}
        <div className="right-column">
          <TagForm 
            onSubmit={handleFormSubmit} 
            currentImageUrl={currentImage?.url}
            currentImageId={currentImage?.id}
          />
        </div>
      </div>

      {/* Comments Section - Full Width */}
      {currentImage?.id && (
        <>
          {console.log('Passing image ID to Comments:', currentImage.id)}
          <div className="comments-section-container">
            <Comments imageId={currentImage.id} />
          </div>
        </>
      )}

      {/* Image Modal */}
      <ImageModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        imageUrl={selectedImage}
      />
    </div>
  );
} 
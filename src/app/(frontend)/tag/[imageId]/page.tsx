'use client';

import { useState, useEffect, useCallback, use, useRef } from 'react';
import Image from 'next/image';
import ImageModal from '../components/ImageModal';
import TagForm from '../components/TagForm';
import Comments from '../components/Comments';
import VerifiedInfo from '../components/VerifiedInfo';
import { useRouter } from 'next/navigation';

import '../../styles.css';

interface Media {
  id: string;
  url: string;
  alt?: string;
}

// Updated to match the FormState type expected by TagForm
interface FormState {
  selectedPersons: Array<{
    id: string;
    name: string;
  }>;
  selectedLocation: {
    id: string;
    name: string;
  } | null;
  locationConfidence: string;
  selectedOccasion: {
    id: string;
    name: string;
  } | null;
  occasionConfidence: string;
  dateType: string;
  dateValue: string;
  dateConfidence: string;
  context: string;
  remarks: string;
  pins: Array<{
    id?: string;
    personId?: string;
    x: number;
    y: number;
    confidence?: string;
  }>;
}

export default function TagPage({ params }: { params: Promise<{ imageId: string }> }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [currentImage, setCurrentImage] = useState<Media | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showSessionTimeout, setShowSessionTimeout] = useState(false);
  const router = useRouter();
  const { imageId } = use(params);
  const hasInitialized = useRef(false);

  // Check authentication and fetch image on mount
  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    const initialize = async () => {
      try {
        const response = await fetch('/api/users/me', {
          credentials: 'include',
        });
        
        if (!response.ok) {
          console.log('Not authenticated, showing session timeout modal...');
          setShowSessionTimeout(true);
          return;
        }

        // If we get here, we're authenticated
        if (imageId) {
          await fetchSpecificImage(imageId);
        } else {
          setError('No image ID provided');
          setIsLoading(false);
        }
      } catch (error) {
        console.error('Auth check error:', error);
        setShowSessionTimeout(true);
      }
    };

    initialize();
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
    if (!id) return;
    
    setIsLoading(true);
    setError(null);
    try {
      // Use PayloadCMS's default REST API route
      const response = await fetch(`/api/images/${id}`, {
        credentials: 'include',
      });
      
      if (!response.ok) {
        if (response.status === 404) {
          setError('Image not found');
        } else {
          throw new Error('Failed to fetch image');
        }
        return;
      }
      
      const data = await response.json();
      setCurrentImage(data);
    } catch (error) {
      console.error('Error fetching specific image:', error);
      setError('Failed to load image');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchRandomImage = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/images/random', {
        credentials: 'include',
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          console.log('401 response, redirecting to login...');
          const from = encodeURIComponent(`/tag/${imageId}`);
          router.push(`/login?from=${from}`);
          return;
        }
        throw new Error('Failed to fetch image');
      }
      
      const data = await response.json();
      setCurrentImage(data);
      router.replace(`/tag/${data.id}`, { scroll: false });
    } catch (error) {
      console.error('Error fetching random image:', error);
      setError('Failed to load random image');
    } finally {
      setIsLoading(false);
    }
  }, [router, imageId]);

  const handleImageClick = () => {
    if (currentImage?.url) {
      setSelectedImage(currentImage.url);
      setIsModalOpen(true);
    }
  };

  const handleRefresh = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering image click
    fetchRandomImage(); // Fetch a new random image and update URL
  };

  const handleFormSubmit = async (formData: FormState) => {
    try {
      if (!imageId) {
        throw new Error('No image ID provided');
      }

      console.log('=== Form Data ===');
      console.log(JSON.stringify(formData, null, 2));

      // First, create a new tag in the Image Tags collection
      const tagPayload = {
        mediaId: imageId, // PayloadCMS will handle the relationship
        whenType: formData.dateType || 'full_date', // Must be one of the valid options
        whenValue: formData.dateValue || '',
        whenValueConfidence: formData.dateConfidence || '3',
        location: formData.selectedLocation?.id || null,
        locationConfidence: formData.locationConfidence || '3',
        occasion: formData.selectedOccasion?.id || null,
        occasionConfidence: formData.occasionConfidence || '3',
        context: formData.context || '',
        remarks: formData.remarks || '',
        status: 'Tagged',
        personTags: formData.selectedPersons.map(person => ({
          personId: person.id, // PayloadCMS will handle the relationship
          confidence: formData.locationConfidence || '3',
          coordinates: {
            x: 50, // Default to center
            y: 50  // Default to center
          }
        }))
      };

      console.log('=== Tag Payload ===');
      console.log(JSON.stringify(tagPayload, null, 2));

      // Create the tag using PayloadCMS's default REST API route
      const tagResponse = await fetch('/api/image-tags', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(tagPayload)
      });

      if (!tagResponse.ok) {
        const errorData = await tagResponse.json().catch(() => null);
        console.error('Error creating tag:', errorData);
        throw new Error(errorData?.message || 'Failed to create tag');
      }

      const createdTag = await tagResponse.json();
      console.log('=== Created Tag ===');
      console.log(JSON.stringify(createdTag, null, 2));

      // Now update the image to reference this tag
      const imageUpdatePayload = {
        tags: [{
          relationTo: 'image-tags',
          value: createdTag.id
        }]
      };

      console.log('=== Image Update Payload ===');
      console.log(JSON.stringify(imageUpdatePayload, null, 2));

      const imageResponse = await fetch(`/api/images/${imageId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(imageUpdatePayload)
      });

      if (!imageResponse.ok) {
        const errorData = await imageResponse.json().catch(() => null);
        console.error('Error updating image:', errorData);
        throw new Error(errorData?.message || 'Failed to update image');
      }

      const updatedImage = await imageResponse.json();
      console.log('=== Updated Image ===');
      console.log(JSON.stringify(updatedImage, null, 2));

      // Refresh the image data to show the updated tags
      await fetchSpecificImage(imageId);
      
    } catch (error) {
      console.error('Error processing tag submission:', error);
      throw error;
    }
  };

  const handleLogin = () => {
    const from = encodeURIComponent(`/tag/${imageId}`);
    router.push(`/login?from=${from}`);
  };

  if (error) {
    return (
      <div className="tag-container">
        <div className="error-message">
          {error}
          <button 
            onClick={() => router.push('/tag')}
            className="auth-button"
            style={{ marginTop: '1rem' }}
          >
            Go to Random Image
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="tag-container">
      {showSessionTimeout && (
        <div className="session-timeout-overlay">
          <div className="session-timeout-modal">
            <h2>Session Expired</h2>
            <p>Your session has timed out. Please log in again to continue.</p>
            <button onClick={handleLogin} className="login-button">
              Log In
            </button>
          </div>
        </div>
      )}
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
            _currentImageUrl={currentImage?.url}
            currentImageId={currentImage?.id}
          />
        </div>
      </div>

      {/* Verified Information Section */}
      {currentImage?.id && (
        <VerifiedInfo imageId={currentImage.id} />
      )}

      {/* Comments Section - Full Width */}
      {currentImage?.id && (
        <div className="comments-section-container">
          <Comments imageId={currentImage.id} />
        </div>
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
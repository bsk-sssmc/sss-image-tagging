'use client';

import { useState, useEffect, useCallback, use, useRef } from 'react';
import Image from 'next/image';
import ImageModal from '../components/ImageModal';
import TagForm from '../components/TagForm';
import VerifiedInfo from '../components/VerifiedInfo';
import CommentSection from '../components/CommentSection';
import { useRouter } from 'next/navigation';
import { RefreshCcw } from 'lucide-react';

import '../../styles.css';

interface Media {
  id: string;
  url: string;
  alt?: string;
}

interface Pin {
  id: string;
  x: number;
  y: number;
  personId?: string;
  confidence?: string;
  isVerified?: boolean;
}

interface PersonTag {
  personId: string;
  name: string;
  confidence: string;
}

// Updated to match the FormState type expected by TagForm
interface FormState {
  selectedPersons: PersonTag[];
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
  const [verifiedTags, setVerifiedTags] = useState<Array<{
    personTags?: Array<{
      personId: {
        id: string;
        name: string;
      };
      coordinates?: {
        x: number;
        y: number;
      };
    }>;
  }>>([]);
  const [currentPins, setCurrentPins] = useState<Pin[]>([]);
  const router = useRouter();
  const { imageId } = use(params);
  const hasInitialized = useRef(false);
  const [persons, setPersons] = useState<{ id: string; name: string }[]>([]);

  // Check authentication and fetch image on mount
  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    const initialize = async () => {
      try {
        const response = await fetch('/api/auth/me', {
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

  // Add effect to listen for pin updates
  useEffect(() => {
    const handlePinUpdate = (event: CustomEvent<{ pins: Pin[] }>) => {
      setCurrentPins(event.detail.pins);
    };

    window.addEventListener('pinUpdate', handlePinUpdate as EventListener);
    return () => {
      window.removeEventListener('pinUpdate', handlePinUpdate as EventListener);
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
        whenType: formData.dateType || null,
        whenValue: formData.dateValue || '',
        whenValueConfidence: formData.dateConfidence || '3',
        location: formData.selectedLocation?.id || null,
        locationConfidence: formData.locationConfidence || '3',
        occasion: formData.selectedOccasion?.id || null,
        occasionConfidence: formData.occasionConfidence || '3',
        context: formData.context || '',
        remarks: formData.remarks || '',
        status: 'Tagged',
        personTags: formData.selectedPersons.map(personTag => {
          // Find the corresponding pin for this person using the personId from the PersonTag
          const pin = formData.pins.find(p => p.personId === personTag.personId);
          return {
            personId: personTag.personId, // Use personId from the PersonTag
            confidence: personTag.confidence, // Use confidence from the PersonTag
            coordinates: pin ? {
              x: pin.x,
              y: pin.y
            } : undefined, // Only include coordinates if a pin exists
          };
        })
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

  // Fetch verified tags when image changes
  useEffect(() => {
    const fetchVerifiedTags = async () => {
      if (!imageId) return;
      try {
        const response = await fetch(
          `/api/image-tags?where[mediaId][equals]=${imageId}&where[status][equals]=Verified&populate[personTags.personId]=true&populate[location]=true&populate[occasion]=true&sort=-createdAt`
        );
        if (!response.ok) return;
        const data = await response.json();
        setVerifiedTags(data.docs || []);
      } catch (error) {
        console.error('Error fetching verified tags:', error);
        setVerifiedTags([]);
      }
    };
    fetchVerifiedTags();
  }, [imageId]);

  // Fetch persons on mount
  useEffect(() => {
    const fetchPersons = async () => {
      try {
        const response = await fetch('/api/persons?limit=100');
        const data = await response.json();
        setPersons(data.docs);
      } catch (error) {
        console.error('Error fetching persons:', error);
      }
    };
    fetchPersons();
  }, []);

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
            style={{ position: 'relative' }}
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
                <button
                  onClick={handleRefresh}
                  aria-label="Refresh image"
                  style={{
                    position: 'absolute',
                    top: 16,
                    right: 16,
                    zIndex: 20,
                    background: 'none',
                    border: 'none',
                    borderRadius: 0,
                    width: 'auto',
                    height: 'auto',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    boxShadow: 'none',
                    color: '#fff',
                    transition: 'background 0.2s',
                    padding: 0,
                  }}
                >
                  <RefreshCcw size={28} color="#fff" />
                </button>
              </div>
            ) : null}
          </div>
        </div>

        {/* Right Column - Form */}
        <div className="right-column">
          <TagForm 
            onSubmit={handleFormSubmit} 
            _currentImageUrl={currentImage?.url}
            currentImageId={currentImage?.id}
            persons={persons}
            setPersons={setPersons}
          />
        </div>
      </div>

      {/* Verified Information Section */}
      {currentImage?.id && (
        <div className="verified-info-section">
          <div className="verified-info-container">
            <VerifiedInfo imageId={currentImage.id} />
          </div>
          <div className="comments-container">
            <CommentSection imageId={imageId} />
          </div>
        </div>
      )}

      {/* Image Modal */}
      {isModalOpen && selectedImage && (
        <ImageModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          imageUrl={selectedImage}
          verifiedTags={verifiedTags}
          persons={persons}
          setPersons={setPersons}
          initialPins={currentPins}
        />
      )}
    </div>
  );
}
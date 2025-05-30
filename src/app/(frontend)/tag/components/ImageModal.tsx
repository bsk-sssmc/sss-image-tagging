'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import Image from 'next/image';

interface Person {
  id: string;
  name: string;
}

interface Pin {
  id: string;
  x: number;
  y: number;
  personId?: string;
  confidence?: string;
  isVerified?: boolean;
}

interface ImageModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string | null;
  verifiedTags?: Array<{
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
  }>;
  persons: Person[];
  setPersons: React.Dispatch<React.SetStateAction<Person[]>>;
  initialPins?: Pin[];
}

interface PinMenuPosition {
  left: string;
  top: string;
  transform: string;
}

interface CreatePersonData {
  name: string;
  shortDescription: string;
}

export default function ImageModal({ isOpen, onClose, imageUrl, verifiedTags = [], persons, setPersons, initialPins = [] }: ImageModalProps) {
  const [userPins, setUserPins] = useState<Pin[]>([]);
  const [verifiedPins, setVerifiedPins] = useState<Pin[]>([]);
  const [isPlacingPin, setIsPlacingPin] = useState(false);
  const [selectedPinId, setSelectedPinId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoadingPersons, setIsLoadingPersons] = useState(false);
  const [isCreatePersonModalOpen, setIsCreatePersonModalOpen] = useState(false);
  const imageContainerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuPosition, setMenuPosition] = useState<PinMenuPosition>({
    left: '0%',
    top: '0%',
    transform: 'translate(-50%, -100%)'
  });

  // Convert verified tags to pins (run whenever verifiedTags changes)
  useEffect(() => {
    const pins = verifiedTags
      .flatMap((tag) => tag.personTags || [])
      .filter((tag) => tag.coordinates)
      .map((tag) => ({
        id: `verified-${tag.personId.id}-${tag.coordinates!.x}-${tag.coordinates!.y}`,
        x: tag.coordinates!.x,
        y: tag.coordinates!.y,
        personId: tag.personId.id,
        isVerified: true
      }));
    setVerifiedPins(pins);
  }, [verifiedTags]);

  // Listen for openImageModal event
  useEffect(() => {
    const handleOpenImageModal = (event: CustomEvent) => {
      if (event.detail.pins) {
        setUserPins(event.detail.pins);
      }
    };
    window.addEventListener('openImageModal', handleOpenImageModal as EventListener);
    return () => {
      window.removeEventListener('openImageModal', handleOpenImageModal as EventListener);
    };
  }, []);

  // Add event listener for pin updates
  useEffect(() => {
    const handlePinUpdate = (event: CustomEvent) => {
      const updatedPins = event.detail.pins;
      setUserPins(updatedPins);
    };
    window.addEventListener('pinUpdate', handlePinUpdate as EventListener);
    return () => {
      window.removeEventListener('pinUpdate', handlePinUpdate as EventListener);
    };
  }, []);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isCreatePersonModalOpen) {
          setIsCreatePersonModalOpen(false);
        } else {
          onClose();
        }
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose, isCreatePersonModalOpen]);

  // Fetch persons when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchPersons();
    }
  }, [isOpen]);

  // Update userPins when initialPins changes or modal opens
  useEffect(() => {
    if (isOpen && initialPins.length > 0) {
      setUserPins(initialPins);
    }
  }, [isOpen, initialPins]);

  const handleCloseMenu = useCallback(() => {
    if (selectedPinId) {
      const selectedPin = userPins.find(pin => pin.id === selectedPinId);
      if (selectedPin && !selectedPin.personId) {
        setUserPins(prevPins => prevPins.filter(pin => pin.id !== selectedPinId));
      }
    }
    setSelectedPinId(null);
  }, [selectedPinId, userPins]);

  // Update the click outside handler
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        menuRef.current && 
        !menuRef.current.contains(event.target as Node) &&
        !(event.target as Element).closest('.create-entry-modal-overlay')
      ) {
        handleCloseMenu();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [handleCloseMenu]);

  const fetchPersons = async () => {
    setIsLoadingPersons(true);
    try {
      const response = await fetch('/api/persons?limit=100');
      const data = await response.json();
      setPersons(data.docs);
    } catch (error) {
      console.error('Error fetching persons:', error);
    } finally {
      setIsLoadingPersons(false);
    }
  };

  const handleImageClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isPlacingPin || !imageContainerRef.current) return;
    const rect = imageContainerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    if (x >= 0 && x <= 100 && y >= 0 && y <= 100) {
      const newPin: Pin = {
        id: `new-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        x,
        y,
        confidence: '3' // Set default confidence
      };
      setUserPins([...userPins, newPin]);
      setSelectedPinId(newPin.id);
      setIsPlacingPin(false);
      calculateMenuPosition(newPin);
    }
  };

  const handleStartPlacingPin = () => {
    setIsPlacingPin(true);
    setSelectedPinId(null);
  };

  const handleCancelPlacingPin = () => {
    setIsPlacingPin(false);
  };

  const calculateMenuPosition = (pin: Pin) => {
    if (!imageContainerRef.current) return;

    const rect = imageContainerRef.current.getBoundingClientRect();
    const pinX = (pin.x / 100) * rect.width;
    const pinY = (pin.y / 100) * rect.height;

    // Calculate available space in each direction
    const spaceAbove = pinY;
    const spaceBelow = rect.height - pinY;
    const spaceLeft = pinX;
    const spaceRight = rect.width - pinX;

    // Minimum space needed for the menu
    const menuWidth = 300; // min-width of the menu
    const menuHeight = 400; // max-height of the menu

    let position: PinMenuPosition = {
      left: `${pinX}px`,
      top: `${pinY}px`,
      transform: 'translate(-50%, -100%)' // default: above
    };

    // Check if there's enough space above
    if (spaceAbove >= menuHeight) {
      position = {
        left: `${pinX}px`,
        top: `${pinY}px`,
        transform: 'translate(-50%, -100%)'
      };
    }
    // Check if there's enough space below
    else if (spaceBelow >= menuHeight) {
      position = {
        left: `${pinX}px`,
        top: `${pinY}px`,
        transform: 'translate(-50%, 0%)'
      };
    }
    // Check if there's enough space on the right
    else if (spaceRight >= menuWidth) {
      position = {
        left: `${pinX}px`,
        top: `${pinY}px`,
        transform: 'translate(0%, -50%)'
      };
    }
    // Check if there's enough space on the left
    else if (spaceLeft >= menuWidth) {
      position = {
        left: `${pinX}px`,
        top: `${pinY}px`,
        transform: 'translate(-100%, -50%)'
      };
    }
    // If no space is available, try to position it in the center
    else {
      position = {
        left: `${rect.width / 2}px`,
        top: `${rect.height / 2}px`,
        transform: 'translate(-50%, -50%)'
      };
    }

    setMenuPosition(position);
  };

  const handlePinClick = (pinId: string) => {
    const pin = userPins.find((p: Pin) => p.id === pinId);
    if (pin) {
      setSelectedPinId(pinId);
      calculateMenuPosition(pin);
    }
  };

  const handlePersonSelect = (personId: string, confidence: string = '3') => {
    if (!selectedPinId) return;
    
    const updatedPins = userPins.map((pin: Pin) => {
      if (pin.id === selectedPinId) {
        return {
          ...pin,
          personId,
          confidence,
          // Preserve the original x and y coordinates
          x: pin.x,
          y: pin.y
        };
      }
      return pin;
    });
    
    setUserPins(updatedPins);
    setSelectedPinId(null);
    
    // Dispatch event to update pins in TagForm
    window.dispatchEvent(new CustomEvent('pinUpdate', { 
      detail: { pins: updatedPins }
    }));
  };

  const handleDeletePin = () => {
    const updatedPins = userPins.filter((pin: Pin) => pin.id !== selectedPinId);
    setUserPins(updatedPins);
    setSelectedPinId(null);
    
    // Dispatch event to update pins in TagForm
    window.dispatchEvent(new CustomEvent('pinUpdate', { 
      detail: { pins: updatedPins }
    }));
  };

  const handleCreatePerson = async (data: CreatePersonData) => {
    try {
      const response = await fetch('/api/persons', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error('Failed to create person');
      }

      const responseData = await response.json();
      const newPerson = responseData.doc;
      setPersons([...persons, newPerson]);
      
      // Update the pin with the new person ID while preserving coordinates
      if (selectedPinId) {
        const updatedPins = userPins.map(pin => {
          if (pin.id === selectedPinId) {
            return {
              ...pin,
              personId: newPerson.id,
              confidence: '3',
              // Preserve the original x and y coordinates
              x: pin.x,
              y: pin.y
            };
          }
          return pin;
        });
        setUserPins(updatedPins);
        
        // Dispatch event to update pins in TagForm
        window.dispatchEvent(new CustomEvent('pinUpdate', { 
          detail: { pins: updatedPins }
        }));
      }
      
      setIsCreatePersonModalOpen(false);
    } catch (error) {
      console.error('Error creating person:', error);
    }
  };

  const filteredPersons = persons.filter(person =>
    person.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!isOpen || !imageUrl) return null;

  const selectedPin = userPins.find(pin => pin.id === selectedPinId);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-instructions">
          {isPlacingPin ? 'Click on the image to place a pin' : 'Click on "Place Pin" to tag a person. Click outside or press ESC to close'}
        </div>
        <div className="modal-actions">
          {!isPlacingPin ? (
            <button
              onClick={handleStartPlacingPin}
              className="modal-action-button"
              aria-label="Start placing pin"
            >
              Place Pin
            </button>
          ) : (
            <button
              onClick={handleCancelPlacingPin}
              className="modal-action-button cancel"
              aria-label="Cancel placing pin"
            >
              Cancel
            </button>
          )}
          <button
            onClick={onClose}
            className="modal-close"
            aria-label="Close modal"
          >
            <svg 
              viewBox="0 0 24 24" 
              width="24" 
              height="24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2"
            >
              <path d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div 
          ref={imageContainerRef}
          className={`modal-image-container ${isPlacingPin ? 'placing-pin' : ''}`}
          onClick={handleImageClick}
        >
          <Image
            src={imageUrl}
            alt="Full size image"
            fill
            style={{ objectFit: 'contain' }}
            priority
          />
          {/* Render verified pins (blue, non-interactive) */}
          {verifiedPins.map(pin => (
            <div
              key={pin.id}
              className="pin verified-pin"
              style={{ left: `${pin.x}%`, top: `${pin.y}%`, cursor: 'default' }}
            >
              {pin.personId && (
                <div className="pin-tooltip">
                  {persons.find(p => p.id === pin.personId)?.name}
                </div>
              )}
            </div>
          ))}
          {/* Render user pins (red, interactive) */}
          {userPins.map(pin => (
            <div
              key={pin.id}
              className={`pin${pin.id === selectedPinId ? ' selected' : ''}`}
              style={{ left: `${pin.x}%`, top: `${pin.y}%`, cursor: 'pointer' }}
              onClick={e => {
                e.stopPropagation();
                handlePinClick(pin.id);
              }}
            >
              {pin.personId && (
                <div className="pin-tooltip">
                  {persons.find(p => p.id === pin.personId)?.name}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Pin Menu */}
        {selectedPin && (
          <div 
            ref={menuRef}
            className="pin-menu"
            style={{
              left: menuPosition.left,
              top: menuPosition.top,
              transform: menuPosition.transform
            }}
          >
            <button
              onClick={handleCloseMenu}
              className="pin-menu-close"
              aria-label="Close menu"
            >
              <svg 
                viewBox="0 0 24 24" 
                width="16" 
                height="16" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2"
              >
                <path d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <div className="pin-menu-content">
              <div className="pin-menu-search">
                <input
                  type="text"
                  placeholder="Search people..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              {isLoadingPersons ? (
                <div className="pin-menu-loading">
                  <div className="loading-spinner"></div>
                </div>
              ) : (
                <>
                  <div className="pin-menu-list">
                    {filteredPersons.map(person => (
                      <div
                        key={person.id}
                        className={`pin-menu-item ${selectedPin.personId === person.id ? 'selected' : ''}`}
                      >
                        <div 
                          className="pin-menu-person"
                          onClick={() => handlePersonSelect(person.id)}
                        >
                          {person.name}
                        </div>
                        {selectedPin.personId === person.id && (
                          <div className="star-rating">
                            {[1, 2, 3, 4, 5].map((rating) => (
                              <span
                                key={rating}
                                className={`star ${selectedPin.confidence === rating.toString() ? 'filled' : ''}`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handlePersonSelect(person.id, rating.toString());
                                }}
                              >
                                ★
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="pin-menu-actions">
                    <button
                      onClick={() => setIsCreatePersonModalOpen(true)}
                      className="add-person-button"
                      aria-label="Add new person"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 5v14M5 12h14" />
                      </svg>
                      Add Person
                    </button>
                    <button
                      onClick={handleDeletePin}
                      className="delete-pin-button"
                    >
                      Delete Pin
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Create Person Modal */}
        {isCreatePersonModalOpen && (
          <div 
            className="create-entry-modal-overlay" 
            style={{ zIndex: 2000 }}
            onClick={(e) => {
              e.stopPropagation();
              setIsCreatePersonModalOpen(false);
            }}
          >
            <div 
              className="create-entry-modal-content"
              onClick={e => e.stopPropagation()}
            >
              <div className="modal-header">
                <h2>Add New Person</h2>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsCreatePersonModalOpen(false);
                  }} 
                  className="modal-close"
                >
                  <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  const formData = new FormData(e.currentTarget);
                  const name = formData.get('name');
                  const shortDescription = formData.get('shortDescription');
                  
                  if (typeof name === 'string' && typeof shortDescription === 'string') {
                    handleCreatePerson({
                      name,
                      shortDescription
                    });
                  }
                }}
                onClick={e => e.stopPropagation()}
              >
                <div className="form-group">
                  <label htmlFor="name">Name *</label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    required
                    placeholder="Enter person name"
                    onClick={e => e.stopPropagation()}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="shortDescription">Short Description *</label>
                  <textarea
                    id="shortDescription"
                    name="shortDescription"
                    required
                    placeholder="Enter person description"
                    onClick={e => e.stopPropagation()}
                  />
                </div>
                <div className="modal-actions">
                  <button 
                    type="submit" 
                    className="modal-action-button"
                    onClick={e => e.stopPropagation()}
                  >
                    Create Person
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 
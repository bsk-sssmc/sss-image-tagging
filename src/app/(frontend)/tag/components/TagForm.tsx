'use client';

import { useState, useEffect, useRef } from 'react';
import Cookies from 'js-cookie';
import { useRouter } from 'next/navigation';
import NotificationPopup from '../../components/NotificationPopup';
import CreateEntryModal from './CreateEntryModal';

interface Person {
  id: string;
  name: string;
}

interface Location {
  id: string;
  name: string;
}

interface Occasion {
  id: string;
  name: string;
}

interface Pin {
  id: string;
  x: number;
  y: number;
  personId?: string;
  confidence?: string;
}

interface TagFormProps {
  onSubmit: (formData: any) => void;
  currentImageUrl?: string;
  currentImageId?: string;
}

export default function TagForm({ onSubmit, currentImageUrl, currentImageId }: TagFormProps) {
  // State for form fields
  const [selectedPersons, setSelectedPersons] = useState<Person[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const [locationConfidence, setLocationConfidence] = useState('3');
  const [locationHoverRating, setLocationHoverRating] = useState(0);
  const [selectedOccasion, setSelectedOccasion] = useState<Occasion | null>(null);
  const [occasionConfidence, setOccasionConfidence] = useState('3');
  const [occasionHoverRating, setOccasionHoverRating] = useState(0);
  const [dateType, setDateType] = useState('');
  const [dateValue, setDateValue] = useState('');
  const [dateConfidence, setDateConfidence] = useState('3');
  const [dateHoverRating, setDateHoverRating] = useState(0);
  const [context, setContext] = useState<string>('');
  const [remarks, setRemarks] = useState<string>('');
  const [pins, setPins] = useState<Pin[]>([]);

  // State for dropdowns
  const [persons, setPersons] = useState<Person[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [occasions, setOccasions] = useState<Occasion[]>([]);
  const [isPersonsDropdownOpen, setIsPersonsDropdownOpen] = useState(false);
  const [isLocationsDropdownOpen, setIsLocationsDropdownOpen] = useState(false);
  const [isOccasionsDropdownOpen, setIsOccasionsDropdownOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [locationInput, setLocationInput] = useState('');
  const [occasionInput, setOccasionInput] = useState('');

  // Add loading states
  const [isLoadingPersons, setIsLoadingPersons] = useState(false);
  const [isLoadingLocations, setIsLoadingLocations] = useState(false);
  const [isLoadingOccasions, setIsLoadingOccasions] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showNotification, setShowNotification] = useState(false);
  const [notificationType, setNotificationType] = useState<'success' | 'error'>('success');
  const [notificationMessage, setNotificationMessage] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Refs for click outside handling
  const locationDropdownRef = useRef<HTMLDivElement>(null);
  const occasionDropdownRef = useRef<HTMLDivElement>(null);
  const personsDropdownRef = useRef<HTMLDivElement>(null);

  // Add new state for modals
  const [isCreatePersonModalOpen, setIsCreatePersonModalOpen] = useState(false);
  const [isCreateLocationModalOpen, setIsCreateLocationModalOpen] = useState(false);
  const [isCreateOccasionModalOpen, setIsCreateOccasionModalOpen] = useState(false);

  const router = useRouter();

  // Fetch data from PayloadCMS API
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch persons
        setIsLoadingPersons(true);
        const personsResponse = await fetch('/api/persons?limit=100');
        const personsData = await personsResponse.json();
        setPersons(personsData.docs);
        setIsLoadingPersons(false);

        // Fetch locations
        setIsLoadingLocations(true);
        const locationsResponse = await fetch('/api/locations?limit=100');
        const locationsData = await locationsResponse.json();
        setLocations(locationsData.docs);
        setIsLoadingLocations(false);

        // Fetch occasions
        setIsLoadingOccasions(true);
        const occasionsResponse = await fetch('/api/occasions?limit=100');
        const occasionsData = await occasionsResponse.json();
        setOccasions(occasionsData.docs);
        setIsLoadingOccasions(false);
      } catch (error) {
        console.error('Error fetching data:', error);
        setIsLoadingPersons(false);
        setIsLoadingLocations(false);
        setIsLoadingOccasions(false);
      }
    };

    fetchData();
  }, []);

  // Add event listener for pin updates
  useEffect(() => {
    const handlePinUpdate = (event: CustomEvent) => {
      const updatedPins = event.detail.pins;
      setPins(updatedPins);
      
      // Update selectedPersons based on pins
      const personIds = updatedPins
        .filter((pin: Pin) => pin.personId)
        .map((pin: Pin) => pin.personId);
      
      // Filter out duplicates
      const uniquePersonIds = [...new Set(personIds)];
      
      // Update selectedPersons with the new list
      setSelectedPersons(persons.filter(person => 
        uniquePersonIds.includes(person.id)
      ));
    };

    window.addEventListener('pinUpdate', handlePinUpdate as EventListener);
    return () => {
      window.removeEventListener('pinUpdate', handlePinUpdate as EventListener);
    };
  }, [persons]);

  // Click outside handler
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (locationDropdownRef.current && !locationDropdownRef.current.contains(event.target as Node)) {
        setIsLocationsDropdownOpen(false);
      }
      if (occasionDropdownRef.current && !occasionDropdownRef.current.contains(event.target as Node)) {
        setIsOccasionsDropdownOpen(false);
      }
      if (personsDropdownRef.current && !personsDropdownRef.current.contains(event.target as Node)) {
        setIsPersonsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handlePersonSelect = (person: Person | null) => {
    if (person && !selectedPersons.find(p => p.id === person.id)) {
      setSelectedPersons([...selectedPersons, person]);
    }
    setIsPersonsDropdownOpen(false);
    setSearchTerm('');
  };

  const handlePersonRemove = (personId: string) => {
    // Remove person from selectedPersons
    setSelectedPersons(prev => prev.filter(person => person.id !== personId));
    
    // Remove corresponding pin
    const updatedPins = pins.filter(pin => pin.personId !== personId);
    setPins(updatedPins);
    
    // Dispatch event to update pins in ImageModal
    const event = new CustomEvent('pinUpdate', { 
      detail: { pins: updatedPins }
    });
    window.dispatchEvent(event);
  };

  const handleLocationSelect = (location: Location | null) => {
    setSelectedLocation(location);
    setLocationInput(location?.name || '');
    setIsLocationsDropdownOpen(false);
  };

  const handleOccasionSelect = (occasion: Occasion | null) => {
    setSelectedOccasion(occasion);
    setOccasionInput(occasion?.name || '');
    setIsOccasionsDropdownOpen(false);
  };

  const handleLocationInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocationInput(e.target.value);
    setSelectedLocation(null);
    setIsLocationsDropdownOpen(true);
  };

  const handleOccasionInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setOccasionInput(e.target.value);
    setSelectedOccasion(null);
    setIsOccasionsDropdownOpen(true);
  };

  const handlePersonInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setIsPersonsDropdownOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      // First create the image tag
      const imageTagResponse = await fetch('/api/image-tags', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          whenType: dateType || undefined,
          whenValue: dateValue || undefined,
          whenValueConfidence: dateConfidence,
          mediaId: currentImageId,
          persons: selectedPersons.map(p => p.id),
          location: selectedLocation?.id,
          locationConfidence,
          occasion: selectedOccasion?.id,
          occasionConfidence,
          context,
          remarks,
        }),
      });

      if (!imageTagResponse.ok) {
        throw new Error('Failed to create image tag');
      }

      const imageTagData = await imageTagResponse.json();

      // Then create person tags for each pin
      const personTagPromises = pins
        .filter(pin => pin.personId)
        .map(pin => 
          fetch('/api/person-tags', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({
              mediaId: currentImageId,
              personId: pin.personId,
              confidence: pin.confidence || '3',
              coordinates: {
                x: pin.x,
                y: pin.y,
              },
            }),
          })
        );

      await Promise.all(personTagPromises);

      setShowNotification(true);
      setNotificationType('success');
      setNotificationMessage('Tags submitted successfully!');
    } catch (error) {
      console.error('Error submitting tags:', error);
      setShowNotification(true);
      setNotificationType('error');
      setNotificationMessage('Failed to submit tags. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredPersons = persons.filter(person =>
    person.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredLocations = locations.filter(location =>
    location.name.toLowerCase().includes(locationInput.toLowerCase())
  );

  const filteredOccasions = occasions.filter(occasion =>
    occasion.name.toLowerCase().includes(occasionInput.toLowerCase())
  );

  // Function to check if any form field has a value
  const isFormEmpty = () => {
    return (
      selectedPersons.length === 0 &&
      !selectedLocation &&
      !selectedOccasion &&
      !dateValue &&
      !context.trim() &&
      !remarks.trim()
    );
  };

  const handleCreatePerson = async (data: any) => {
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
      // PayloadCMS returns the created document in the 'doc' property
      const newPerson = responseData.doc;
      
      if (!newPerson || !newPerson.id) {
        throw new Error('Invalid response format from server');
      }

      setPersons(prev => [...prev, newPerson]);
      handlePersonSelect(newPerson);
      setIsCreatePersonModalOpen(false);
    } catch (error) {
      console.error('Error creating person:', error);
      throw error;
    }
  };

  const handleCreateLocation = async (data: any) => {
    try {
      const response = await fetch('/api/locations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error('Failed to create location');
      }

      const responseData = await response.json();
      // PayloadCMS returns the created document in the 'doc' property
      const newLocation = responseData.doc;
      
      if (!newLocation || !newLocation.id) {
        throw new Error('Invalid response format from server');
      }

      setLocations(prev => [...prev, newLocation]);
      handleLocationSelect(newLocation);
      setIsCreateLocationModalOpen(false);
    } catch (error) {
      console.error('Error creating location:', error);
      throw error;
    }
  };

  const handleCreateOccasion = async (data: any) => {
    try {
      const response = await fetch('/api/occasions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error('Failed to create occasion');
      }

      const responseData = await response.json();
      // PayloadCMS returns the created document in the 'doc' property
      const newOccasion = responseData.doc;
      
      if (!newOccasion || !newOccasion.id) {
        throw new Error('Invalid response format from server');
      }

      setOccasions(prev => [...prev, newOccasion]);
      handleOccasionSelect(newOccasion);
      setIsCreateOccasionModalOpen(false);
    } catch (error) {
      console.error('Error creating occasion:', error);
      throw error;
    }
  };

  return (
    <form onSubmit={handleSubmit} className="tag-form">
      <h2>Tag Image</h2>
      
      {/* Loading Overlay */}
      {isSubmitting && (
        <div className="form-loading-overlay">
          <div className="loading-spinner"></div>
        </div>
      )}

      {/* Notification Popup */}
      {showNotification && (
        <NotificationPopup
          type={notificationType}
          message={notificationMessage}
          onClose={() => setShowNotification(false)}
          onTagAnother={() => {
            setShowNotification(false);
            window.location.reload();
          }}
        />
      )}
      
      {/* Persons Input */}
      <div className="form-group">
        <label>Who are in the image?</label>
        <div className="input-group">
          <button
            type="button"
            className="add-people-button"
            onClick={() => {
              if (currentImageUrl) {
                window.dispatchEvent(new CustomEvent('openImageModal', { 
                  detail: { 
                    imageUrl: currentImageUrl,
                    pins: pins
                  } 
                }));
              }
            }}
          >
            Add People
          </button>
        </div>
        <div className="person-tag-rows">
          {selectedPersons.map(person => {
            const pin = pins.find(p => p.personId === person.id);
            return (
              <div key={person.id} className="person-tag-row">
                <span className="person-tag-name">{person.name}</span>
                <div className="person-tag-rating">
                  {[1, 2, 3, 4, 5].map((rating) => (
                    <span
                      key={rating}
                      className={`star ${pin?.confidence === rating.toString() ? 'filled' : ''}`}
                      onClick={() => {
                        const updatedPins = pins.map(p => 
                          p.personId === person.id 
                            ? { ...p, confidence: rating.toString() }
                            : p
                        );
                        setPins(updatedPins);
                        window.dispatchEvent(new CustomEvent('pinUpdate', { 
                          detail: { pins: updatedPins }
                        }));
                      }}
                    >
                      ★
                    </span>
                  ))}
                </div>
                <button
                  type="button"
                  className="person-tag-remove"
                  onClick={() => handlePersonRemove(person.id)}
                  aria-label={`Remove ${person.name}`}
                >
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Location Input */}
      <div className="form-group">
        <div className="input-header">
          <label>Where was this image taken?</label>
          {selectedLocation && (
            <div className="star-rating">
              {[1, 2, 3, 4, 5].map((star) => (
                <span
                  key={star}
                  className={`star ${star <= (locationHoverRating || parseInt(locationConfidence)) ? 'filled' : ''}`}
                  onMouseEnter={() => setLocationHoverRating(star)}
                  onMouseLeave={() => setLocationHoverRating(0)}
                  onClick={() => setLocationConfidence(star.toString())}
                >
                  ★
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="dropdown-container" ref={locationDropdownRef}>
          <div className="input-group">
            <input
              type="text"
              className="dropdown-input"
              placeholder="Search and select location..."
              value={locationInput}
              onChange={handleLocationInputChange}
              onFocus={() => setIsLocationsDropdownOpen(true)}
            />
            <button
              type="button"
              className="add-button"
              onClick={() => setIsCreateLocationModalOpen(true)}
              aria-label="Add new location"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 5v14M5 12h14" />
              </svg>
            </button>
          </div>
          {isLocationsDropdownOpen && (
            <div className="dropdown-list">
              {filteredLocations.map(location => (
                <div
                  key={location.id}
                  className="dropdown-item"
                  onClick={() => handleLocationSelect(location)}
                >
                  {location.name}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Occasion Input */}
      <div className="form-group">
        <div className="input-header">
          <label>Any occasion / festival around the image?</label>
          {selectedOccasion && (
            <div className="star-rating">
              {[1, 2, 3, 4, 5].map((star) => (
                <span
                  key={star}
                  className={`star ${star <= (occasionHoverRating || parseInt(occasionConfidence)) ? 'filled' : ''}`}
                  onMouseEnter={() => setOccasionHoverRating(star)}
                  onMouseLeave={() => setOccasionHoverRating(0)}
                  onClick={() => setOccasionConfidence(star.toString())}
                >
                  ★
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="dropdown-container" ref={occasionDropdownRef}>
          <div className="input-group">
            <input
              type="text"
              className="dropdown-input"
              placeholder="Search and select occasion..."
              value={occasionInput}
              onChange={handleOccasionInputChange}
              onFocus={() => setIsOccasionsDropdownOpen(true)}
            />
            <button
              type="button"
              className="add-button"
              onClick={() => setIsCreateOccasionModalOpen(true)}
              aria-label="Add new occasion"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 5v14M5 12h14" />
              </svg>
            </button>
          </div>
          {isOccasionsDropdownOpen && (
            <div className="dropdown-list">
              {filteredOccasions.map(occasion => (
                <div
                  key={occasion.id}
                  className="dropdown-item"
                  onClick={() => handleOccasionSelect(occasion)}
                >
                  {occasion.name}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Date Input */}
      <div className="form-group">
        <div className="input-header">
          <label>When was this image taken?</label>
          {dateValue && (
            <div className="star-rating">
              {[1, 2, 3, 4, 5].map((star) => (
                <span
                  key={star}
                  className={`star ${star <= (dateHoverRating || parseInt(dateConfidence)) ? 'filled' : ''}`}
                  onMouseEnter={() => setDateHoverRating(star)}
                  onMouseLeave={() => setDateHoverRating(0)}
                  onClick={() => setDateConfidence(star.toString())}
                >
                  ★
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="date-type-selector">
          <select
            value={dateType}
            onChange={(e) => setDateType(e.target.value)}
            className="date-type-select"
          >
            <option value="">Select an option</option>
            <option value="full_date">Full Date</option>
            <option value="decades">Decade</option>
            <option value="year">Year</option>
            <option value="month_year">Month-Year</option>
          </select>
        </div>
        {dateType && (
          <input
            type="text"
            value={dateValue}
            onChange={(e) => setDateValue(e.target.value)}
            placeholder={
              dateType === 'full_date'
                ? 'YYYY-MM-DD'
                : dateType === 'decades'
                ? 'e.g., 1980s'
                : dateType === 'year'
                ? 'YYYY'
                : 'YYYY-MM'
            }
            className="date-input"
          />
        )}
      </div>

      {/* Context Input */}
      <div className="form-group">
        <label>What is the picture about? (Context)</label>
        <textarea
          value={context}
          onChange={(e) => setContext(e.target.value)}
          placeholder="Enter the context of the image..."
        />
      </div>

      {/* Remarks Input */}
      <div className="form-group">
        <label>Any additional remarks</label>
        <textarea
          value={remarks}
          onChange={(e) => setRemarks(e.target.value)}
          placeholder="Enter any additional remarks..."
        />
      </div>

      <button 
        type="submit" 
        className="submit-button"
        disabled={isFormEmpty()}
      >
        Submit Tags
      </button>

      {/* Create Entry Modals */}
      <CreateEntryModal
        isOpen={isCreatePersonModalOpen}
        onClose={() => setIsCreatePersonModalOpen(false)}
        type="person"
        onSubmit={handleCreatePerson}
      />

      <CreateEntryModal
        isOpen={isCreateLocationModalOpen}
        onClose={() => setIsCreateLocationModalOpen(false)}
        type="location"
        onSubmit={handleCreateLocation}
      />

      <CreateEntryModal
        isOpen={isCreateOccasionModalOpen}
        onClose={() => setIsCreateOccasionModalOpen(false)}
        type="occasion"
        onSubmit={handleCreateOccasion}
      />
    </form>
  );
} 
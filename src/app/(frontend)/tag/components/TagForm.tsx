'use client';

import { useState, useEffect, useRef } from 'react';
import Cookies from 'js-cookie';
import { useRouter } from 'next/navigation';
import NotificationPopup from '../../components/NotificationPopup';
import CreateEntryModal from './CreateEntryModal';
import ExistingTags from './ExistingTags';
import { useAuth } from '../../context/AuthContext';

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
  id?: string;
  personId?: string;
  x: number;
  y: number;
  confidence?: string;
}

interface TagFormProps {
  onSubmit: (formData: any) => void;
  currentImageUrl?: string;
  currentImageId?: string;
}

interface FormState {
  selectedPersons: Person[];
  selectedLocation: Location | null;
  locationConfidence: string;
  selectedOccasion: Occasion | null;
  occasionConfidence: string;
  dateType: string;
  dateValue: string;
  dateConfidence: string;
  context: string;
  remarks: string;
  pins: Pin[];
}

interface ExistingTag {
  id: string;
  persons: Person[];
  location?: Location;
  locationConfidence?: string;
  occasion?: Occasion;
  occasionConfidence?: string;
  whenType?: string;
  whenValue?: string;
  whenValueConfidence?: string;
  context?: string;
  createdBy: {
    id: string;
    displayName: string;
    email: string;
  };
  createdAt: string;
}

// Add a cache for API responses
const apiCache = {
  persons: null,
  locations: null,
  occasions: null,
  imageTags: new Map(),
};

const styles = `
.existing-tags-preview {
  margin-bottom: 1rem;
  padding: 0.5rem;
  background-color: #f8f9fa;
  border-radius: 4px;
}

.existing-tag-preview {
  margin-bottom: 0.5rem;
}

.tag-label {
  font-size: 0.875rem;
  color: #666;
  margin-right: 0.5rem;
}

.tag-values {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 0.25rem;
}

.tag-value {
  background-color: #e9ecef;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.875rem;
}

.context-preview {
  cursor: pointer;
  color: #666;
  font-style: italic;
  padding: 0.25rem 0.5rem;
  background-color: #e9ecef;
  border-radius: 4px;
  transition: background-color 0.2s;
}

.context-preview:hover {
  background-color: #dee2e6;
}

.latest-tag-indicator {
  font-size: 0.75rem;
  color: #666;
  background-color: #e9ecef;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  margin-left: 0.5rem;
  display: inline-flex;
  align-items: center;
}

.input-header {
  display: flex;
  align-items: center;
  margin-bottom: 0.5rem;
}

.input-header label {
  margin-bottom: 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
`

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

  // Add new state for tracking form changes
  const [hasChanges, setHasChanges] = useState(false);
  const [initialFormState, setInitialFormState] = useState<FormState>({
    selectedPersons: [],
    selectedLocation: null,
    locationConfidence: '3',
    selectedOccasion: null,
    occasionConfidence: '3',
    dateType: '',
    dateValue: '',
    dateConfidence: '3',
    context: '',
    remarks: '',
    pins: []
  });

  // Add new state for latest tag info
  const [latestTag, setLatestTag] = useState<ExistingTag | null>(null);

  const router = useRouter();
  const { user } = useAuth();
  const [hasOtherUserTags, setHasOtherUserTags] = useState(false);
  const [expandedContext, setExpandedContext] = useState<string | null>(null);
  const [myTaggedPersons, setMyTaggedPersons] = useState<Person[]>([]);
  const [otherUserPersons, setOtherUserPersons] = useState<Person[]>([]);

  // Fetch data from PayloadCMS API with caching
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch persons if not cached
        if (!apiCache.persons) {
          setIsLoadingPersons(true);
          const personsResponse = await fetch('/api/persons?limit=100');
          const personsData = await personsResponse.json();
          apiCache.persons = personsData.docs;
          setPersons(personsData.docs);
          setIsLoadingPersons(false);
        } else {
          setPersons(apiCache.persons);
        }

        // Fetch locations if not cached
        if (!apiCache.locations) {
          setIsLoadingLocations(true);
          const locationsResponse = await fetch('/api/locations?limit=100');
          const locationsData = await locationsResponse.json();
          apiCache.locations = locationsData.docs;
          setLocations(locationsData.docs);
          setIsLoadingLocations(false);
        } else {
          setLocations(apiCache.locations);
        }

        // Fetch occasions if not cached
        if (!apiCache.occasions) {
          setIsLoadingOccasions(true);
          const occasionsResponse = await fetch('/api/occasions?limit=100');
          const occasionsData = await occasionsResponse.json();
          apiCache.occasions = occasionsData.docs;
          setOccasions(occasionsData.docs);
          setIsLoadingOccasions(false);
        } else {
          setOccasions(apiCache.occasions);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        setIsLoadingPersons(false);
        setIsLoadingLocations(false);
        setIsLoadingOccasions(false);
      }
    };

    fetchData();
  }, []);

  // Fetch all tagged persons for this image and split into mine/others with caching
  useEffect(() => {
    const fetchAllTaggedPersons = async () => {
      if (!currentImageId || !user) return;
      
      // Check cache first
      if (apiCache.imageTags.has(currentImageId)) {
        const cachedData = apiCache.imageTags.get(currentImageId);
        const mine = cachedData.docs
          .filter((tag: any) => tag.createdBy?.id === user.id)
          .flatMap((tag: any) => tag.persons || []);
        const others = cachedData.docs
          .filter((tag: any) => tag.createdBy?.id !== user.id)
          .flatMap((tag: any) => tag.persons || []);
        const uniqueMine = Array.from(new Map(mine.map((p: any) => [p.id, p])).values()) as Person[];
        const uniqueOthers = Array.from(new Map(others.map((p: any) => [p.id, p])).values()) as Person[];
        setMyTaggedPersons(uniqueMine);
        setOtherUserPersons(uniqueOthers);
        
        // Update selectedPersons with my tagged persons
        setSelectedPersons(uniqueMine);
        return;
      }

      try {
        const response = await fetch(`/api/image-tags?where[mediaId][equals]=${currentImageId}&populate[persons]=true`);
        if (!response.ok) return;
        const data = await response.json();
        
        // Cache the response
        apiCache.imageTags.set(currentImageId, data);
        
        // Process the data
        const mine = data.docs
          .filter((tag: any) => tag.createdBy?.id === user.id)
          .flatMap((tag: any) => tag.persons || []);
        const others = data.docs
          .filter((tag: any) => tag.createdBy?.id !== user.id)
          .flatMap((tag: any) => tag.persons || []);
        const uniqueMine = Array.from(new Map(mine.map((p: any) => [p.id, p])).values()) as Person[];
        const uniqueOthers = Array.from(new Map(others.map((p: any) => [p.id, p])).values()) as Person[];
        setMyTaggedPersons(uniqueMine);
        setOtherUserPersons(uniqueOthers);
        
        // Update selectedPersons with my tagged persons
        setSelectedPersons(uniqueMine);
      } catch (e) {
        // ignore
      }
    };
    fetchAllTaggedPersons();
  }, [currentImageId, user]);

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
      const newSelectedPersons = persons.filter(person => 
        uniquePersonIds.includes(person.id)
      );
      setSelectedPersons(newSelectedPersons);
      
      // Update hasChanges state
      setHasChanges(true);
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

  // Update initial form state when component mounts
  useEffect(() => {
    const initialState = {
      selectedPersons: [],
      selectedLocation: null,
      locationConfidence: '3',
      selectedOccasion: null,
      occasionConfidence: '3',
      dateType: '',
      dateValue: '',
      dateConfidence: '3',
      context: '',
      remarks: '',
      pins: []
    };
    setInitialFormState(initialState);
  }, []);

  // Check for changes whenever form fields change
  useEffect(() => {
    const currentState = {
      selectedPersons,
      selectedLocation,
      locationConfidence,
      selectedOccasion,
      occasionConfidence,
      dateType,
      dateValue,
      dateConfidence,
      context,
      remarks,
      pins
    };

    const hasFormChanged = JSON.stringify(currentState) !== JSON.stringify(initialFormState);
    setHasChanges(hasFormChanged);
  }, [
    selectedPersons,
    selectedLocation,
    locationConfidence,
    selectedOccasion,
    occasionConfidence,
    dateType,
    dateValue,
    dateConfidence,
    context,
    remarks,
    pins
  ]);

  // 1. Sync selectedPersons with pins whenever pins or persons change
  useEffect(() => {
    if (pins.length > 0) {
      // Get unique personIds from pins
      const personIds = pins.filter(pin => pin.personId).map(pin => pin.personId);
      const uniquePersonIds = [...new Set(personIds)];
      const newSelectedPersons = persons.filter(person => uniquePersonIds.includes(person.id));
      setSelectedPersons(newSelectedPersons);
    }
  }, [pins, persons]);

  // 2. On mount and when tags are fetched, if there are no pins, set selectedPersons to user's tagged persons
  useEffect(() => {
    if (pins.length === 0 && myTaggedPersons.length > 0) {
      setSelectedPersons(myTaggedPersons);
    }
  }, [pins, myTaggedPersons]);

  // 3. After successful save, update selectedPersons to match the latest tags
  useEffect(() => {
    if (!isSubmitting && showNotification && notificationType === 'success') {
      setSelectedPersons(myTaggedPersons);
    }
  }, [isSubmitting, showNotification, notificationType, myTaggedPersons]);

  // Fetch latest tag info when component mounts or imageId changes
  useEffect(() => {
    const fetchLatestTag = async () => {
      if (!currentImageId) return;

      try {
        const response = await fetch(`/api/image-tags?where[mediaId][equals]=${currentImageId}&populate[location]=true&populate[occasion]=true&populate[createdBy]=true&sort=-createdAt&limit=1`);
        if (!response.ok) return;
        const data = await response.json();
        if (data.docs && data.docs.length > 0) {
          const latest = data.docs[0];
          setLatestTag(latest);
          // Do NOT set form fields with latest tag info, just show as reference
        }
      } catch (error) {
        console.error('Error fetching latest tag:', error);
      }
    };
    fetchLatestTag();
  }, [currentImageId]);

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
      // Create a single image tag with person tags
      const response = await fetch('/api/image-tags', {
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
          personTags: pins
            .filter(pin => pin.personId)
            .map(pin => ({
              personId: pin.personId,
              confidence: pin.confidence || '3',
              coordinates: {
                x: pin.x,
                y: pin.y,
              },
            })),
          location: selectedLocation?.id,
          locationConfidence,
          occasion: selectedOccasion?.id,
          occasionConfidence,
          context,
          remarks,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create image tag');
      }

      // Update initial form state after successful submission
      setInitialFormState({
        selectedPersons,
        selectedLocation,
        locationConfidence,
        selectedOccasion,
        occasionConfidence,
        dateType,
        dateValue,
        dateConfidence,
        context,
        remarks,
        pins
      });
      setHasChanges(false);

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

  const handleTagRemove = (tagId: string) => {
    // Refresh the form state after tag removal
    setSelectedPersons([]);
    setSelectedLocation(null);
    setSelectedOccasion(null);
    setDateType('');
    setDateValue('');
    setContext('');
    setRemarks('');
    setPins([]);
  };

  return (
    <form onSubmit={handleSubmit} className="tag-form">
      <div style={{ position: 'relative' }}>
        <h2>
          Tag Image
          <button 
            type="submit" 
            className={`save-button ${hasChanges ? 'visible' : ''}`}
            disabled={!hasChanges || isSubmitting}
          >
            Save Changes
          </button>
        </h2>
      </div>
      
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
        <div className="person-tag-instructions">
          Click on the image to tag the people in it.
        </div>
        {(myTaggedPersons.length > 0 || otherUserPersons.length > 0) && (
          <div className="tagged-people-list">
            {myTaggedPersons.map(person => (
              <div key={person.id} className="tagged-person">
                {person.name}
                <button
                  type="button"
                  className="tagged-person-remove"
                  onClick={() => handlePersonRemove(person.id)}
                >
                  ×
                </button>
              </div>
            ))}
            {otherUserPersons.map(person => (
              <div key={person.id} className="tagged-person tagged-person-other">
                {person.name}
              </div>
            ))}
          </div>
        )}
        {/* Debug: Show all tagged people as text */}
        {(myTaggedPersons.length > 0 || otherUserPersons.length > 0) && (
          <div style={{ marginTop: '0.5rem', color: '#aaa', fontSize: '0.85rem' }}>
            Tagged people (debug):
            {[...myTaggedPersons, ...otherUserPersons].map(p => p.name).join(', ')}
          </div>
        )}
      </div>

      {/* Location Input */}
      <div className="form-group">
        <div className="input-header">
          <label>
            Where was this image taken?
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
          </label>
          {latestTag?.location && (
            <div className="latest-tag-inline">
              Latest tag by {latestTag.createdBy.displayName}; {latestTag.location.name}
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
            {selectedLocation && (
              <button
                type="button"
                className="clear-button"
                onClick={() => {
                  setSelectedLocation(null);
                  setLocationInput('');
                  setLocationConfidence('3');
                }}
                aria-label="Clear location"
              >
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
            <button
              type="button"
              className="add-button"
              onClick={() => setIsCreateLocationModalOpen(true)}
            >
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 5v14M5 12h14" />
              </svg>
            </button>
          </div>
          {isLocationsDropdownOpen && (
            <div className="dropdown-list">
              {isLoadingLocations ? (
                <div className="dropdown-loading">
                  <div className="loading-spinner"></div>
                </div>
              ) : (
                locations
                  .filter(location => 
                    location.name.toLowerCase().includes(locationInput.toLowerCase())
                  )
                  .map(location => (
                    <div
                      key={location.id}
                      className="dropdown-item"
                      onClick={() => handleLocationSelect(location)}
                    >
                      <span className="item-name">{location.name}</span>
                    </div>
                  ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* Occasion Input */}
      <div className="form-group">
        <label>Any occasion / festival around the image?</label>
        {latestTag?.occasion && (
          <div className="latest-tag-inline">
            Latest tag by {latestTag.createdBy.displayName}; {latestTag.occasion.name}
          </div>
        )}
        <div className="input-header">
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
            {selectedOccasion && (
              <button
                type="button"
                className="clear-button"
                onClick={() => {
                  setSelectedOccasion(null);
                  setOccasionInput('');
                  setOccasionConfidence('3');
                }}
                aria-label="Clear occasion"
              >
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
            <button
              type="button"
              className="add-button"
              onClick={() => setIsCreateOccasionModalOpen(true)}
            >
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 5v14M5 12h14" />
              </svg>
            </button>
          </div>
          {isOccasionsDropdownOpen && (
            <div className="dropdown-list">
              {isLoadingOccasions ? (
                <div className="dropdown-loading">
                  <div className="loading-spinner"></div>
                </div>
              ) : (
                occasions
                  .filter(occasion => 
                    occasion.name.toLowerCase().includes(occasionInput.toLowerCase())
                  )
                  .map(occasion => (
                    <div
                      key={occasion.id}
                      className="dropdown-item"
                      onClick={() => handleOccasionSelect(occasion)}
                    >
                      <span className="item-name">{occasion.name}</span>
                    </div>
                  ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* Date Input */}
      <div className="form-group">
        <label>When was this image taken?</label>
        {latestTag?.whenValue && (
          <div className="latest-tag-inline">
            Latest tag by {latestTag.createdBy.displayName}
            {latestTag.whenType && (
              <>; {latestTag.whenType === 'full_date' && 'Full Date'}
                 {latestTag.whenType === 'decades' && 'Decades'}
                 {latestTag.whenType === 'year' && 'Year'}
                 {latestTag.whenType === 'month_year' && 'Month-Year'}
              </>
            )}
            ; {latestTag.whenValue}
          </div>
        )}
        <div className="input-header">
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
        <div className="date-inputs">
          <select
            value={dateType}
            onChange={(e) => {
              setDateType(e.target.value);
              setDateValue(''); // Reset value when type changes
              setDateConfidence('3'); // Reset confidence when type changes
            }}
            className="date-type-select"
          >
            <option value="">Select an option</option>
            <option value="full_date">Full Date</option>
            <option value="decades">Decades</option>
            <option value="year">Year</option>
            <option value="month_year">Month-Year</option>
          </select>
          
          {dateType === 'full_date' && (
            <div className="date-value-group">
              <input
                type="date"
                value={dateValue}
                onChange={(e) => setDateValue(e.target.value)}
                className="date-input"
                min="1926-11-23"
                max="2011-04-24"
              />
              {dateValue && (
                <button
                  type="button"
                  className="clear-button"
                  onClick={() => setDateValue('')}
                  aria-label="Clear date"
                >
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          )}

          {dateType === 'decades' && (
            <div className="date-value-group">
              <select
                value={dateValue}
                onChange={(e) => setDateValue(e.target.value)}
                className="date-value-select"
              >
                <option value="">Select decade</option>
                {['1920s', '1930s', '1940s', '1950s', '1960s', '1970s', '1980s', '1990s', '2000s'].map(decade => (
                  <option key={decade} value={decade}>{decade}</option>
                ))}
              </select>
              {dateValue && (
                <button
                  type="button"
                  className="clear-button"
                  onClick={() => setDateValue('')}
                  aria-label="Clear decade"
                >
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          )}

          {dateType === 'year' && (
            <div className="date-value-group">
              <select
                value={dateValue}
                onChange={(e) => setDateValue(e.target.value)}
                className="date-value-select"
              >
                <option value="">Select year</option>
                {Array.from({ length: 86 }, (_, i) => 1926 + i).map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
              {dateValue && (
                <button
                  type="button"
                  className="clear-button"
                  onClick={() => setDateValue('')}
                  aria-label="Clear year"
                >
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          )}

          {dateType === 'month_year' && (
            <div className="month-year-inputs">
              <div className="date-value-group">
                <select
                  value={dateValue.split('-')[0] || ''}
                  onChange={(e) => {
                    const month = e.target.value;
                    const year = dateValue.split('-')[1] || '';
                    setDateValue(year ? `${month}-${year}` : month);
                  }}
                  className="month-select"
                >
                  <option value="">Select month</option>
                  {[
                    'January', 'February', 'March', 'April', 'May', 'June',
                    'July', 'August', 'September', 'October', 'November', 'December'
                  ].map((month, index) => (
                    <option key={month} value={month}>{month}</option>
                  ))}
                </select>
                {dateValue.split('-')[0] && (
                  <button
                    type="button"
                    className="clear-button"
                    onClick={() => {
                      const year = dateValue.split('-')[1] || '';
                      setDateValue(year);
                    }}
                    aria-label="Clear month"
                  >
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
              <div className="date-value-group">
                <select
                  value={dateValue.split('-')[1] || ''}
                  onChange={(e) => {
                    const month = dateValue.split('-')[0] || '';
                    const year = e.target.value;
                    setDateValue(month ? `${month}-${year}` : year);
                  }}
                  className="year-select"
                >
                  <option value="">Select year</option>
                  {Array.from({ length: 86 }, (_, i) => 1926 + i).map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
                {dateValue.split('-')[1] && (
                  <button
                    type="button"
                    className="clear-button"
                    onClick={() => {
                      const month = dateValue.split('-')[0] || '';
                      setDateValue(month);
                    }}
                    aria-label="Clear year"
                  >
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Context Input */}
      <div className="form-group">
        <label>What is the picture about? (Context)</label>
        {latestTag?.context && (
          <div className="latest-tag-inline">
            Latest tag by {latestTag.createdBy.displayName}; {latestTag.context}
          </div>
        )}
        <div className="input-group">
          <textarea
            value={context}
            onChange={(e) => setContext(e.target.value)}
            placeholder="Describe the context of the image..."
            rows={4}
          />
          {context && (
            <button
              type="button"
              className="clear-button"
              onClick={() => setContext('')}
              aria-label="Clear context"
            >
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Remarks Input */}
      <div className="form-group">
        <label>Additional Remarks</label>
        <div className="input-group">
          <textarea
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            placeholder="Add any additional remarks or notes..."
            rows={4}
          />
          {remarks && (
            <button
              type="button"
              className="clear-button"
              onClick={() => setRemarks('')}
              aria-label="Clear remarks"
            >
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Create Entry Modals */}
      <CreateEntryModal
        isOpen={isCreatePersonModalOpen}
        onClose={() => setIsCreatePersonModalOpen(false)}
        onSubmit={handleCreatePerson}
        title="Create New Person"
        fields={[
          { name: 'name', label: 'Name', type: 'text', required: true }
        ]}
      />

      <CreateEntryModal
        isOpen={isCreateLocationModalOpen}
        onClose={() => setIsCreateLocationModalOpen(false)}
        onSubmit={handleCreateLocation}
        title="Create New Location"
        fields={[
          { name: 'name', label: 'Name', type: 'text', required: true },
          { name: 'shortDescription', label: 'Short Description', type: 'textarea', required: false },
          { name: 'city', label: 'City', type: 'text', required: false },
          { name: 'state', label: 'State', type: 'text', required: false }
        ]}
      />

      <CreateEntryModal
        isOpen={isCreateOccasionModalOpen}
        onClose={() => setIsCreateOccasionModalOpen(false)}
        onSubmit={handleCreateOccasion}
        title="Create New Occasion"
        fields={[
          { name: 'name', label: 'Name', type: 'text', required: true }
        ]}
      />
    </form>
  );
} 
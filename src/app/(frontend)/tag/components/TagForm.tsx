'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import NotificationPopup from '../../components/NotificationPopup';
import CreateEntryModal from './CreateEntryModal';
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

interface PersonTag {
  personId: string;
  name: string;
  confidence: string;
}

interface TagFormProps {
  onSubmit: (formData: FormState) => void;
  _currentImageUrl?: string;
  currentImageId?: string;
  persons: Person[];
  setPersons: React.Dispatch<React.SetStateAction<Person[]>>;
}

interface FormState {
  selectedPersons: PersonTag[];
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

interface CreatePersonData {
  name: string;
  shortDescription: string;
}

interface CreateLocationData {
  name: string;
  shortDescription: string;
}

interface CreateOccasionData {
  name: string;
  shortDescription: string;
}

// Add a cache for API responses
const apiCache = {
  persons: null as Person[] | null,
  locations: null as Location[] | null,
  occasions: null as Occasion[] | null,
  imageTags: new Map<string, { docs: ExistingTag[] }>(),
};

const styles = ``;

export default function TagForm({ onSubmit, _currentImageUrl, currentImageId, persons, setPersons }: TagFormProps) {
  const [selectedPersons, setSelectedPersons] = useState<PersonTag[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const [locationConfidence, setLocationConfidence] = useState('');
  const [_locationHoverRating, _setLocationHoverRating] = useState(0);
  const [selectedOccasion, setSelectedOccasion] = useState<Occasion | null>(null);
  const [occasionConfidence, setOccasionConfidence] = useState('');
  const [_occasionHoverRating, _setOccasionHoverRating] = useState(0);
  const [dateType, setDateType] = useState('');
  const [dateValue, setDateValue] = useState('');
  const [dateConfidence, setDateConfidence] = useState('');
  const [_dateHoverRating, _setDateHoverRating] = useState(0);
  const [context, setContext] = useState<string>('');
  const [remarks, setRemarks] = useState<string>('');
  const [pins, setPins] = useState<Pin[]>([]);

  const [_locations, setLocations] = useState<Location[]>([]);
  const [_occasions, setOccasions] = useState<Occasion[]>([]);
  const [isPersonsDropdownOpen, setIsPersonsDropdownOpen] = useState(false);
  const [_isLocationsDropdownOpen, _setIsLocationsDropdownOpen] = useState(false);
  const [_isOccasionsDropdownOpen, _setIsOccasionsDropdownOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [_locationInput, _setLocationInput] = useState('');
  const [_occasionInput, _setOccasionInput] = useState('');

  const [_isLoadingPersons, setIsLoadingPersons] = useState(false);
  const [_isLoadingLocations, setIsLoadingLocations] = useState(false);
  const [_isLoadingOccasions, setIsLoadingOccasions] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showNotification, setShowNotification] = useState(false);
  const [notificationType, setNotificationType] = useState<'success' | 'error'>('success');
  const [notificationMessage, setNotificationMessage] = useState('');
  const [_error, _setError] = useState<string | null>(null);

  const _locationDropdownRef = useRef<HTMLDivElement>(null);
  const _occasionDropdownRef = useRef<HTMLDivElement>(null);
  const _personsDropdownRef = useRef<HTMLDivElement>(null);

  const [_isCreatePersonModalOpen, _setIsCreatePersonModalOpen] = useState(false);
  const [_isCreateLocationModalOpen, _setIsCreateLocationModalOpen] = useState(false);
  const [_isCreateOccasionModalOpen, _setIsCreateOccasionModalOpen] = useState(false);

  const [_hasChanges, _setHasChanges] = useState(false);
  const [_initialFormState, _setInitialFormState] = useState<FormState>({
    selectedPersons: [],
    selectedLocation: null,
    locationConfidence: '',
    selectedOccasion: null,
    occasionConfidence: '',
    dateType: '',
    dateValue: '',
    dateConfidence: '',
    context: '',
    remarks: '',
    pins: []
  });

  const [_latestTag, _setLatestTag] = useState<ExistingTag | null>(null);

  const _router = useRouter();
  const { user: _user } = useAuth();
  const [_hasOtherUserTags, _setHasOtherUserTags] = useState(false);
  const [_expandedContext, _setExpandedContext] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      // Fetch persons if not cached
      if (!apiCache.persons) {
        setIsLoadingPersons(true);
        const personsResponse = await fetch('/api/persons?limit=100');
        const personsData = await personsResponse.json();
        console.log('Fetched persons data:', personsData);
        apiCache.persons = personsData.docs;
        setPersons(personsData.docs);
        setIsLoadingPersons(false);
      } else {
        console.log('Using cached persons:', apiCache.persons);
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

  useEffect(() => {
    if (currentImageId) {
      fetchData();
    }
  }, [currentImageId]);

  const _handleCreatePerson = async (data: CreatePersonData) => {
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

      setPersons((prev: Person[]) => [...prev, newPerson]);
      _setIsCreatePersonModalOpen(false);
    } catch (error) {
      console.error('Error creating person:', error);
    }
  };

  const _handleCreateLocation = async (data: CreateLocationData) => {
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
      const newLocation = responseData.doc;

      setLocations((prev: Location[]) => [...prev, newLocation]);
      _setIsCreateLocationModalOpen(false);
    } catch (error) {
      console.error('Error creating location:', error);
    }
  };

  const _handleCreateOccasion = async (data: CreateOccasionData) => {
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
      const newOccasion = responseData.doc;

      setOccasions((prev: Occasion[]) => [...prev, newOccasion]);
      _setIsCreateOccasionModalOpen(false);
    } catch (error) {
      console.error('Error creating occasion:', error);
    }
  };

  // Add effect to log state changes
  useEffect(() => {
    console.log('selectedPersons state updated:', selectedPersons);
  }, [selectedPersons]);

  // Add debug logging for person selection
  const handlePersonSelect = (person: Person) => {
    console.log('handlePersonSelect called with person:', person);
    console.log('Current selectedPersons before update:', selectedPersons);
    
    // Check if the person is already selected
    if (selectedPersons.find(p => p.personId === person.id)) {
      console.log('Person already selected.');
      return; // Do not add if already exists
    }

    // Create a new PersonTag object with default confidence
    const newPersonTag: PersonTag = {
      personId: person.id,
      name: person.name,
      confidence: '3' // Set default confidence
    };

    // Create a new array with the selected person tag
    const newSelectedPersons = [...selectedPersons, newPersonTag];
    console.log('Setting new selectedPersons:', newSelectedPersons);
    
    // Update state directly
    setSelectedPersons(newSelectedPersons);
    
    // Clear search and close dropdown
    setSearchTerm('');
    setIsPersonsDropdownOpen(false);
  };

  const handlePersonRemove = (personId: string) => {
    console.log('Removing person:', personId);
    console.log('Current selectedPersons before removal:', selectedPersons);
    
    // Create a new array without the removed person tag
    const newSelectedPersons = selectedPersons.filter((p: PersonTag) => p.personId !== personId);
    console.log('Setting new selectedPersons after removal:', newSelectedPersons);
    
    // Update state directly
    setSelectedPersons(newSelectedPersons);
  };

  // Update confidence when location is selected/deselected
  useEffect(() => {
    if (selectedLocation && !locationConfidence) {
      setLocationConfidence('3');
    } else if (!selectedLocation) {
      setLocationConfidence('');
    }
  }, [selectedLocation]);

  // Update confidence when occasion is selected/deselected
  useEffect(() => {
    if (selectedOccasion && !occasionConfidence) {
      setOccasionConfidence('3');
    } else if (!selectedOccasion) {
      setOccasionConfidence('');
    }
  }, [selectedOccasion]);

  // Update confidence when date is selected/deselected
  useEffect(() => {
    if (dateType && !dateConfidence) {
      setDateConfidence('3');
    } else if (!dateType) {
      setDateConfidence('');
    }
  }, [dateType]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      console.log('Form submission - Current selectedPersons:', selectedPersons);
      console.log('Form submission - selectedPersons type:', typeof selectedPersons);
      console.log('Form submission - selectedPersons is array:', Array.isArray(selectedPersons));

      const formData: FormState = {
        selectedPersons,
        selectedLocation,
        locationConfidence: selectedLocation ? locationConfidence : '',
        selectedOccasion,
        occasionConfidence: selectedOccasion ? occasionConfidence : '',
        dateType,
        dateValue: dateType ? dateValue : '',
        dateConfidence: dateType ? dateConfidence : '',
        context,
        remarks,
        pins
      };

      console.log('Submitting form data:', formData);
      await onSubmit(formData);
      setShowNotification(true);
      setNotificationType('success');
      setNotificationMessage('Tag created successfully!');
    } catch (error) {
      console.error('Error submitting form:', error);
      setShowNotification(true);
      setNotificationType('error');
      setNotificationMessage('Failed to create tag. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Add click outside handler for dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (_personsDropdownRef.current && !_personsDropdownRef.current.contains(event.target as Node)) {
        setIsPersonsDropdownOpen(false);
      }
      if (_locationDropdownRef.current && !_locationDropdownRef.current.contains(event.target as Node)) {
        _setIsLocationsDropdownOpen(false);
      }
      if (_occasionDropdownRef.current && !_occasionDropdownRef.current.contains(event.target as Node)) {
        _setIsOccasionsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Helper to compare form state
  const isFormChanged = useCallback(() => {
    const currentState: FormState = {
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
    return JSON.stringify(currentState) !== JSON.stringify(_initialFormState);
  }, [selectedPersons, selectedLocation, locationConfidence, selectedOccasion, occasionConfidence, dateType, dateValue, dateConfidence, context, remarks, pins, _initialFormState]);

  // Track changes
  useEffect(() => {
    _setHasChanges(isFormChanged());
  }, [isFormChanged]);

  // Set initial state when form loads or image changes
  useEffect(() => {
    const initialState: FormState = {
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
    _setInitialFormState(initialState);
  }, [currentImageId]);

  // Add effect to listen for pin updates
  useEffect(() => {
    const handlePinUpdate = (event: CustomEvent<{ pins: Pin[] }>) => {
      const updatedPins = event.detail.pins;
      setPins(updatedPins);
      
      // Update selectedPersons based on pins with personId and confidence
      const personsFromPins: PersonTag[] = updatedPins
        .filter((pin: Pin) => pin.personId)
        .map((pin: Pin) => ({
          personId: pin.personId!,
          name: persons.find((p: Person) => p.id === pin.personId)?.name || '',
          confidence: pin.confidence || '3' // Use pin's confidence or default
        }))
        .filter((personTag: PersonTag) => personTag.name); // Only include persons that were found in persons

      // Merge personsFromPins with existing selectedPersons, prioritizing confidence from pins
      setSelectedPersons(prevSelectedPersons => {
        const mergedPersons: PersonTag[] = [];
        const personsFromPinsMap = new Map(personsFromPins.map(p => [p.personId, p]));

        // Add existing selected persons, updating confidence if a corresponding pin exists
        prevSelectedPersons.forEach(prevPerson => {
          if (personsFromPinsMap.has(prevPerson.personId)) {
            mergedPersons.push(personsFromPinsMap.get(prevPerson.personId)!); // Use confidence from pin
            personsFromPinsMap.delete(prevPerson.personId); // Remove from map as it's been processed
          } else {
            mergedPersons.push(prevPerson); // Keep existing person and confidence
          }
        });

        // Add any new persons from pins that were not already in selectedPersons
        personsFromPinsMap.forEach(newPerson => {
          mergedPersons.push(newPerson);
        });

        return mergedPersons;
      });
    };

    window.addEventListener('pinUpdate', handlePinUpdate as EventListener);
    return () => {
      window.removeEventListener('pinUpdate', handlePinUpdate as EventListener);
    };
  }, [persons]);

  return (
    <form className="tag-form" onSubmit={handleSubmit}>
      {/* Heading row with Save button */}
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '2rem' }}>
        <h2 style={{ margin: 0, fontSize: '2rem', fontWeight: 700, color: '#4a90e2' }}>Tag this image</h2>
        {_hasChanges && (
          <button
            type="submit"
            className="save-button visible"
            style={{ marginLeft: 'auto' }}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Saving...' : 'Save Tag'}
          </button>
        )}
      </div>

      <div className="form-group">
        <label>People</label>
        <div className="tag-preview" style={{ marginTop: '8px', display: selectedPersons && selectedPersons.length > 0 ? 'block' : 'block', gap: '8px', flexWrap: 'wrap', background: 'none', boxShadow: 'none', padding: 0 }}>
          {selectedPersons && selectedPersons.length > 0 ? (
            selectedPersons.map((personTag: PersonTag) => (
              <div key={personTag.personId} className="person-tag-row" style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                <span className="person-name" style={{ marginRight: '8px' }}>{personTag.name}</span>
                <div className="star-rating" style={{ display: 'flex', alignItems: 'center' }}>
                  {[1, 2, 3, 4, 5].map((rating) => (
                    <span
                      key={rating}
                      className={`star ${parseInt(personTag.confidence) >= rating ? 'filled' : ''}`}
                      onClick={() => {
                        // Update confidence for this person tag
                        setSelectedPersons(prevSelected =>
                          prevSelected.map(p =>
                            p.personId === personTag.personId ? { ...p, confidence: rating.toString() } : p
                          )
                        );
                      }}
                      style={{ cursor: 'pointer', color: parseInt(personTag.confidence) >= rating ? '#ffc107' : '#e4e5e9' }}
                    >
                      ★
                    </span>
                  ))}
                </div>
                <button
                  type="button"
                  className="remove-button"
                  onClick={() => handlePersonRemove(personTag.personId)}
                  style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#dc3545', cursor: 'pointer', padding: '4px' }}
                >
                  ×
                </button>
              </div>
            ))
          ) : (
            <p style={{ color: '#888' }}>No people tagged yet.</p>
          )}
        </div>
      </div>

      <div className="form-group">
        <label>Location</label>
        <div className="dropdown" ref={_locationDropdownRef}>
          <input
            type="text"
            className="dropdown-input"
            placeholder="Search locations..."
            value={_locationInput}
            onChange={(e) => _setLocationInput(e.target.value)}
            onFocus={() => _setIsLocationsDropdownOpen(true)}
          />
          {_isLocationsDropdownOpen && (
            <div className="dropdown-menu">
              <div
                className="dropdown-item"
                onClick={() => {
                  setSelectedLocation(null);
                  setLocationConfidence('');
                  _setLocationInput('');
                  _setIsLocationsDropdownOpen(false);
                }}
              >
                Clear selection
              </div>
              {_locations.map((location: Location) => (
                <div
                  key={location.id}
                  className="dropdown-item"
                  onClick={() => {
                    setSelectedLocation(location);
                    _setLocationInput('');
                    _setIsLocationsDropdownOpen(false);
                  }}
                >
                  {location.name}
                </div>
              ))}
              <div className="dropdown-item add-new-item" style={{ borderTop: '1px solid #eee', marginTop: 8, paddingTop: 8 }}>
                <button
                  type="button"
                  className="add-new-location-btn"
                  style={{ width: '100%', background: 'none', border: 'none', color: '#4a90e2', cursor: 'pointer', textAlign: 'left', padding: 0 }}
                  onClick={() => {
                    _setIsCreateLocationModalOpen(true);
                    _setIsLocationsDropdownOpen(false);
                  }}
                >
                  + Add new location
                </button>
              </div>
            </div>
          )}
        </div>
          <div className="tag-preview" style={{ marginTop: '8px', display: selectedPersons && selectedPersons.length > 0 ? 'flex' : 'block', gap: '8px', flexWrap: 'wrap', background: 'none', boxShadow: 'none', padding: 0 }}>
        {selectedLocation && (
          <span className="tag-preview" style={{ display: 'inline-flex', alignItems: 'center', margin: '8px 0 0 0', padding: '4px 12px', background: 'none', border: '1px solid #4a90e2', borderRadius: '8px', color: '#4a90e2', fontWeight: 500, fontSize: '1rem', boxShadow: 'none', width: 'auto', maxWidth: '100%' }}>
            {selectedLocation.name}
            <button
              type="button"
              style={{
                marginLeft: '8px',
                border: 'none',
                background: 'none',
                cursor: 'pointer',
                color: '#4a90e2',
                fontSize: '1.1em',
              }}
              onClick={() => setSelectedLocation(null)}
              aria-label={`Remove ${selectedLocation.name}`}
            >
              ×
            </button>
          </span>
        )}
        </div>
        {/* Location Confidence Meter - only show if a location is selected */}
        {selectedLocation && (
          <div className="confidence-rating">
            <label>Confidence:</label>
            {[1, 2, 3, 4, 5].map((rating) => (
              <button
                key={rating}
                type="button"
                className={locationConfidence === rating.toString() ? 'active' : ''}
                onClick={() => setLocationConfidence(rating.toString())}
              >
                {rating}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Add CreateEntryModal for Location */}
      <CreateEntryModal
        isOpen={_isCreateLocationModalOpen}
        onClose={() => _setIsCreateLocationModalOpen(false)}
        title="Add New Location"
        fields={[
          { name: 'name', label: 'Name', type: 'text', required: true },
          { name: 'shortDescription', label: 'Short Description', type: 'textarea', required: true },
          { name: 'city', label: 'City', type: 'text', required: true },
          { name: 'state', label: 'State', type: 'select', required: true, options: [
            'Andaman and Nicobar Islands',
            'Andhra Pradesh',
            'Arunachal Pradesh',
            'Assam',
            'Bihar',
            'Chandigarh',
            'Chhattisgarh',
            'Dadra and Nagar Haveli',
            'Daman and Diu',
            'Delhi',
            'Goa',
            'Gujarat',
            'Haryana',
            'Himachal Pradesh',
            'Jammu and Kashmir',
            'Jharkhand',
            'Karnataka',
            'Kerala',
            'Ladakh',
            'Lakshadweep',
            'Madhya Pradesh',
            'Maharashtra',
            'Manipur',
            'Meghalaya',
            'Mizoram',
            'Nagaland',
            'Odisha',
            'Puducherry',
            'Punjab',
            'Rajasthan',
            'Sikkim',
            'Tamil Nadu',
            'Telangana',
            'Tripura',
            'Uttar Pradesh',
            'Uttarakhand',
            'West Bengal',
          ] },
        ]}
        onSubmit={async (data) => {
          // POST to PayloadCMS default REST API
          const response = await fetch('/api/locations', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(data),
          });
          if (!response.ok) {
            const errorData = await response.json().catch(() => null);
            throw new Error(errorData?.message || 'Failed to create location');
          }
          const responseData = await response.json();
          const newLocation = responseData.doc;
          setLocations((prev: Location[]) => [...prev, newLocation]);
          setSelectedLocation(newLocation);
        }}
      />

      <div className="form-group">
        <label>Occasion</label>
        <div className="dropdown" ref={_occasionDropdownRef}>
          <input
            type="text"
            className="dropdown-input"
            placeholder="Search occasions..."
            value={_occasionInput}
            onChange={(e) => _setOccasionInput(e.target.value)}
            onFocus={() => _setIsOccasionsDropdownOpen(true)}
          />
          {_isOccasionsDropdownOpen && (
            <div className="dropdown-menu">
              <div
                className="dropdown-item"
                onClick={() => {
                  setSelectedOccasion(null);
                  setOccasionConfidence('');
                  _setOccasionInput('');
                  _setIsOccasionsDropdownOpen(false);
                }}
              >
                Clear selection
              </div>
              {_occasions.map((occasion: Occasion) => (
                <div
                  key={occasion.id}
                  className="dropdown-item"
                  onClick={() => {
                    setSelectedOccasion(occasion);
                    _setOccasionInput('');
                    _setIsOccasionsDropdownOpen(false);
                  }}
                >
                  {occasion.name}
                </div>
              ))}
              <div className="dropdown-item add-new-item" style={{ borderTop: '1px solid #eee', marginTop: 8, paddingTop: 8 }}>
                <button
                  type="button"
                  className="add-new-occasion-btn"
                  style={{ width: '100%', background: 'none', border: 'none', color: '#4a90e2', cursor: 'pointer', textAlign: 'left', padding: 0 }}
                  onClick={() => {
                    _setIsCreateOccasionModalOpen(true);
                    _setIsOccasionsDropdownOpen(false);
                  }}
                >
                  + Add new occasion
                </button>
              </div>
            </div>
          )}
        </div>
        <div className="tag-preview" style={{ marginTop: '8px', display: selectedPersons && selectedPersons.length > 0 ? 'flex' : 'block', gap: '8px', flexWrap: 'wrap', background: 'none', boxShadow: 'none', padding: 0 }}>
        {selectedOccasion && (
          <span className="tag-preview" style={{ display: 'inline-flex', alignItems: 'center', margin: '8px 0 0 0', padding: '4px 12px', background: 'none', border: '1px solid #4a90e2', borderRadius: '8px', color: '#4a90e2', fontWeight: 500, fontSize: '1rem', boxShadow: 'none', width: 'auto', maxWidth: '100%' }}>
            {selectedOccasion.name}
            <button
              type="button"
              style={{
                marginLeft: '8px',
                border: 'none',
                background: 'none',
                cursor: 'pointer',
                color: '#4a90e2',
                fontSize: '1.1em',
              }}
              onClick={() => setSelectedOccasion(null)}
              aria-label={`Remove ${selectedOccasion.name}`}
            >
              ×
            </button>
          </span>
        )}
        </div>
        {/* Occasion Confidence Meter - only show if an occasion is selected */}
        {selectedOccasion && (
          <div className="confidence-rating">
            <label>Confidence:</label>
            {[1, 2, 3, 4, 5].map((rating) => (
              <button
                key={rating}
                type="button"
                className={occasionConfidence === rating.toString() ? 'active' : ''}
                onClick={() => setOccasionConfidence(rating.toString())}
              >
                {rating}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Add CreateEntryModal for Occasion */}
      <CreateEntryModal
        isOpen={_isCreateOccasionModalOpen}
        onClose={() => _setIsCreateOccasionModalOpen(false)}
        title="Add New Occasion"
        fields={[
          { name: 'name', label: 'Name', type: 'text', required: true },
          { name: 'shortDescription', label: 'Short Description', type: 'textarea', required: false },
        ]}
        onSubmit={async (data) => {
          // POST to PayloadCMS default REST API
          const response = await fetch('/api/occasions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(data),
          });
          if (!response.ok) {
            const errorData = await response.json().catch(() => null);
            throw new Error(errorData?.message || 'Failed to create occasion');
          }
          const responseData = await response.json();
          const newOccasion = responseData.doc;
          setOccasions((prev: Occasion[]) => [...prev, newOccasion]);
          setSelectedOccasion(newOccasion);
        }}
      />

      <div className="form-group">
        <label>Date</label>
        <select
          className="form-control"
          value={dateType}
          onChange={(e) => {
            setDateType(e.target.value);
            setDateValue('');
            setDateConfidence('');
          }}
        >
          <option value="">Select date type</option>
          <option value="decades">Decades</option>
          <option value="year">Years</option>
          <option value="month_year">Month Year</option>
          <option value="full_date">Full Date</option>
        </select>
        {dateType && (
          <div className="date-value-input">
            {dateType === 'decades' && (
              <select
                className="form-control"
                value={dateValue}
                onChange={(e) => setDateValue(e.target.value)}
              >
                <option value="">Select decade</option>
                {['1920s', '1930s', '1940s', '1950s', '1960s', '1970s', '1980s', '1990s', '2000s', '2010s'].map((decade) => (
                  <option key={decade} value={decade}>{decade}</option>
                ))}
              </select>
            )}
            {dateType === 'year' && (
              <select
                className="form-control"
                value={dateValue}
                onChange={(e) => setDateValue(e.target.value)}
              >
                <option value="">Select year</option>
                {Array.from({ length: 86 }, (_, i) => 1926 + i).map((year) => (
                  <option key={year} value={year.toString()}>{year}</option>
                ))}
              </select>
            )}
            {dateType === 'month_year' && (
              <div style={{ display: 'flex', gap: '1rem' }}>
                <select
                  className="form-control"
                  value={dateValue.split(' ')[0] || ''}
                  onChange={(e) => {
                    const month = e.target.value;
                    const year = dateValue.split(' ')[1] || '';
                    setDateValue(`${month} ${year}`.trim());
                  }}
                >
                  <option value="">Select month</option>
                  {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((month) => (
                    <option key={month} value={month}>{month}</option>
                  ))}
                </select>
                <select
                  className="form-control"
                  value={dateValue.split(' ')[1] || ''}
                  onChange={(e) => {
                    const month = dateValue.split(' ')[0] || '';
                    const year = e.target.value;
                    setDateValue(`${month} ${year}`.trim());
                  }}
                >
                  <option value="">Select year</option>
                  {Array.from({ length: 86 }, (_, i) => 1926 + i).map((year) => (
                    <option key={year} value={year.toString()}>{year}</option>
                  ))}
                </select>
              </div>
            )}
            {dateType === 'full_date' && (
              <div style={{ display: 'flex', gap: '1rem' }}>
                <select
                  className="form-control"
                  value={dateValue.split('-')[0] || ''}
                  onChange={(e) => {
                    const day = e.target.value;
                    const [_, month, year] = dateValue.split('-');
                    setDateValue(`${day}-${month || ''}-${year || ''}`.trim());
                  }}
                >
                  <option value="">Day</option>
                  {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                    <option key={day} value={day.toString().padStart(2, '0')}>{day}</option>
                  ))}
                </select>
                <select
                  className="form-control"
                  value={dateValue.split('-')[1] || ''}
                  onChange={(e) => {
                    const [day, _, year] = dateValue.split('-');
                    const month = e.target.value;
                    setDateValue(`${day || ''}-${month}-${year || ''}`.trim());
                  }}
                >
                  <option value="">Month</option>
                  {['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'].map((month) => (
                    <option key={month} value={month}>{new Date(2000, parseInt(month) - 1).toLocaleString('default', { month: 'long' })}</option>
                  ))}
                </select>
                <select
                  className="form-control"
                  value={dateValue.split('-')[2] || ''}
                  onChange={(e) => {
                    const [day, month, _] = dateValue.split('-');
                    const year = e.target.value;
                    setDateValue(`${day || ''}-${month || ''}-${year}`.trim());
                  }}
                >
                  <option value="">Year</option>
                  {Array.from({ length: 86 }, (_, i) => 1926 + i).map((year) => (
                    <option key={year} value={year.toString()}>{year}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        )}
        {/* Date Confidence Meter - only show if a date type is selected */}
        {dateType && (
          <div className="confidence-rating">
            <label>Confidence:</label>
            {[1, 2, 3, 4, 5].map((rating) => (
              <button
                key={rating}
                type="button"
                className={dateConfidence === rating.toString() ? 'active' : ''}
                onClick={() => setDateConfidence(rating.toString())}
              >
                {rating}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="form-group">
        <label>Context</label>
        <textarea
          className="form-control"
          value={context}
          onChange={(e) => setContext(e.target.value)}
          placeholder="Enter context about the image..."
          rows={4}
        />
      </div>

      <div className="form-group">
        <label>Remarks</label>
        <textarea
          className="form-control"
          value={remarks}
          onChange={(e) => setRemarks(e.target.value)}
          placeholder="Enter any additional remarks..."
          rows={4}
        />
      </div>

      {showNotification && (
        <NotificationPopup
          type={notificationType}
          message={notificationMessage}
          onClose={() => setShowNotification(false)}
        />
      )}
    </form>
  );
} 
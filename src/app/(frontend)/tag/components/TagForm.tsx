'use client';

import { useState, useEffect, useRef } from 'react';
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

interface TagFormProps {
  onSubmit: (formData: FormState) => void;
  _currentImageUrl?: string;
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

export default function TagForm({ onSubmit, _currentImageUrl, currentImageId }: TagFormProps) {
  const [selectedPersons, setSelectedPersons] = useState<Person[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const [locationConfidence, setLocationConfidence] = useState('3');
  const [_locationHoverRating, _setLocationHoverRating] = useState(0);
  const [selectedOccasion, setSelectedOccasion] = useState<Occasion | null>(null);
  const [occasionConfidence, setOccasionConfidence] = useState('3');
  const [_occasionHoverRating, _setOccasionHoverRating] = useState(0);
  const [dateType, setDateType] = useState('');
  const [dateValue, setDateValue] = useState('');
  const [dateConfidence, setDateConfidence] = useState('3');
  const [_dateHoverRating, _setDateHoverRating] = useState(0);
  const [context, setContext] = useState<string>('');
  const [remarks, setRemarks] = useState<string>('');
  const [pins, setPins] = useState<Pin[]>([]);

  const [_persons, setPersons] = useState<Person[]>([]);
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

      setPersons(prev => [...prev, newPerson]);
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

      setLocations(prev => [...prev, newLocation]);
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

      setOccasions(prev => [...prev, newOccasion]);
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
    
    // Create a new array with the selected person
    const newSelectedPersons = [...selectedPersons, person];
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
    
    // Create a new array without the removed person
    const newSelectedPersons = selectedPersons.filter(p => p.id !== personId);
    console.log('Setting new selectedPersons after removal:', newSelectedPersons);
    
    // Update state directly
    setSelectedPersons(newSelectedPersons);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      console.log('Form submission - Current selectedPersons:', selectedPersons);
      console.log('Form submission - selectedPersons type:', typeof selectedPersons);
      console.log('Form submission - selectedPersons is array:', Array.isArray(selectedPersons));
      
      // Validate that at least one person is selected
      if (!selectedPersons || selectedPersons.length === 0) {
        console.log('No persons selected, showing error');
        setShowNotification(true);
        setNotificationType('error');
        setNotificationMessage('Please select at least one person');
        setIsSubmitting(false);
        return;
      }

      const formData: FormState = {
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
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <form className="tag-form" onSubmit={handleSubmit}>
      <div className="form-group">
        <label>People <span className="required">*</span></label>
        <div className="dropdown" ref={_personsDropdownRef}>
          <input
            type="text"
            className="dropdown-input"
            placeholder="Search people..."
            value={searchTerm}
            onChange={(e) => {
              console.log('Search input changed:', e.target.value);
              setSearchTerm(e.target.value);
              setIsPersonsDropdownOpen(true);
            }}
            onFocus={() => {
              console.log('Search input focused');
              setIsPersonsDropdownOpen(true);
            }}
          />
          {isPersonsDropdownOpen && (
            <div className="dropdown-menu">
              {_persons && _persons.length > 0 ? (
                _persons
                  .filter(person => 
                    person.name.toLowerCase().includes(searchTerm.toLowerCase())
                  )
                  .map((person) => (
                    <div
                      key={person.id}
                      className="dropdown-item"
                      style={{ cursor: 'pointer', padding: '8px' }}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        console.log('Person clicked:', person);
                        handlePersonSelect(person);
                      }}
                    >
                      {person.name}
                    </div>
                  ))
              ) : (
                <div className="dropdown-item">No persons found</div>
              )}
            </div>
          )}
        </div>
        <div className="tag-preview" style={{ marginTop: '8px' }}>
          {selectedPersons && selectedPersons.length > 0 ? (
            selectedPersons.map((person) => (
              <span 
                key={person.id} 
                className="tag-preview"
                style={{
                  display: 'inline-block',
                  margin: '4px',
                  padding: '4px 8px',
                  backgroundColor: '#e0e0e0',
                  borderRadius: '4px'
                }}
              >
                {person.name}
                <button
                  type="button"
                  style={{
                    marginLeft: '8px',
                    border: 'none',
                    background: 'none',
                    cursor: 'pointer'
                  }}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handlePersonRemove(person.id);
                  }}
                >
                  ×
                </button>
              </span>
            ))
          ) : (
            <div style={{ color: '#666' }}>No persons selected</div>
          )}
        </div>
      </div>

      <div className="form-group">
        <label>Location</label>
        <div className="dropdown">
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
              {_locations.map((location) => (
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
            </div>
          )}
        </div>
        {selectedLocation && (
          <div className="tag-preview">
            {selectedLocation.name}
            <button onClick={() => setSelectedLocation(null)}>×</button>
          </div>
        )}
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
      </div>

      <div className="form-group">
        <label>Occasion</label>
        <div className="dropdown">
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
              {_occasions.map((occasion) => (
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
            </div>
          )}
        </div>
        {selectedOccasion && (
          <div className="tag-preview">
            {selectedOccasion.name}
            <button onClick={() => setSelectedOccasion(null)}>×</button>
          </div>
        )}
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
      </div>

      <div className="form-group">
        <label>Date</label>
        <select
          className="form-control"
          value={dateType}
          onChange={(e) => setDateType(e.target.value)}
        >
          <option value="">Select date type</option>
          <option value="full_date">Full Date</option>
          <option value="year">Year</option>
          <option value="decades">Decades</option>
          <option value="month_year">Month-Year</option>
        </select>
        {dateType && (
          <input
            type="text"
            className="form-control"
            placeholder={`Enter ${dateType}`}
            value={dateValue}
            onChange={(e) => setDateValue(e.target.value)}
          />
        )}
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

      <button
        type="submit"
        className="submit-button"
        disabled={isSubmitting}
      >
        {isSubmitting ? 'Submitting...' : 'Submit Tag'}
      </button>

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
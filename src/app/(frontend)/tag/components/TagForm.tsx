'use client';

import { useState, useEffect, useRef } from 'react';
import Cookies from 'js-cookie';
import { useRouter } from 'next/navigation';
import NotificationPopup from '../../components/NotificationPopup';

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

interface TagFormProps {
  onSubmit: (formData: any) => void;
}

export default function TagForm({ onSubmit }: TagFormProps) {
  // State for form fields
  const [selectedPersons, setSelectedPersons] = useState<Person[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const [selectedOccasion, setSelectedOccasion] = useState<Occasion | null>(null);
  const [dateType, setDateType] = useState<'full' | 'decade' | 'year' | 'month-year'>('full');
  const [dateValue, setDateValue] = useState<string>('');
  const [context, setContext] = useState<string>('');
  const [remarks, setRemarks] = useState<string>('');

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
    setSelectedPersons(selectedPersons.filter(p => p.id !== personId));
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
      // Get the current image ID from the URL
      const imageId = window.location.search.split('=')[1];
      if (!imageId) {
        throw new Error('No image ID found');
      }

      // First, get the current user's ID
      const meResponse = await fetch('/api/users/me', {
        credentials: 'include',
      });

      if (!meResponse.ok) {
        throw new Error('Failed to get current user');
      }

      const { user } = await meResponse.json();
      if (!user?.id) {
        throw new Error('No user ID found');
      }

      // Prepare the form data according to Payload's expected format
      const formData = {
        whenType: dateType === 'full' ? 'full_date' : 
                  dateType === 'decade' ? 'decades' : 
                  dateType === 'year' ? 'year' : 'month_year',
        whenValue: dateValue,
        mediaId: imageId,
        persons: selectedPersons.map(person => person.id),
        location: selectedLocation?.id || null,
        occasion: selectedOccasion?.id || null,
        context: context.trim(),
        remarks: remarks.trim(),
        createdBy: user.id,
      };

      console.log('Submitting form data:', formData);

      // Submit the form data
      const response = await fetch('/api/image-tags', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        if (response.status === 401) {
          console.log('401 response, redirecting to login...');
          const from = encodeURIComponent('/tag');
          router.push(`/login?from=${from}`);
          return;
        }
        
        const errorData = await response.json();
        console.error('Error response:', errorData);
        throw new Error(errorData.errors?.[0]?.message || 'Failed to submit form');
      }

      const data = await response.json();
      console.log('Successfully created image tag:', data);

      // Show success notification
      setNotificationType('success');
      setNotificationMessage('Image tagged successfully!');
      setShowNotification(true);

      // Clear form
      setDateType('full');
      setDateValue('');
      setSelectedPersons([]);
      setSelectedLocation(null);
      setSelectedOccasion(null);
      setContext('');
      setRemarks('');
      setSearchTerm('');
      setLocationInput('');
      setOccasionInput('');

      // Notify parent component
      onSubmit(data);
    } catch (error) {
      console.error('Form submission error:', error);
      setError(error instanceof Error ? error.message : 'An error occurred');
      setNotificationType('error');
      setNotificationMessage(error instanceof Error ? error.message : 'Failed to submit form');
      setShowNotification(true);
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
        <div className="dropdown-container" ref={personsDropdownRef}>
          <input
            type="text"
            className="dropdown-input"
            placeholder="Search and select persons..."
            value={searchTerm}
            onChange={handlePersonInputChange}
            onFocus={() => setIsPersonsDropdownOpen(true)}
          />
          {isPersonsDropdownOpen && (
            <div className="dropdown-list">
              {filteredPersons.map(person => (
                <div
                  key={person.id}
                  className="dropdown-item"
                  onClick={() => handlePersonSelect(person)}
                >
                  {person.name}
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="pill-container">
          {selectedPersons.map(person => (
            <div key={person.id} className="pill">
              {person.name}
              <button
                type="button"
                onClick={() => handlePersonRemove(person.id)}
                aria-label={`Remove ${person.name}`}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Location Input */}
      <div className="form-group">
        <label>Where was this image taken?</label>
        <div className="dropdown-container" ref={locationDropdownRef}>
          <input
            type="text"
            className="dropdown-input"
            placeholder="Search and select location..."
            value={locationInput}
            onChange={handleLocationInputChange}
            onFocus={() => setIsLocationsDropdownOpen(true)}
          />
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
        <label>Any occasion / festival around the image?</label>
        <div className="dropdown-container" ref={occasionDropdownRef}>
          <input
            type="text"
            className="dropdown-input"
            placeholder="Search and select occasion..."
            value={occasionInput}
            onChange={handleOccasionInputChange}
            onFocus={() => setIsOccasionsDropdownOpen(true)}
          />
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
        <label>When was this image taken?</label>
        <div className="date-inputs">
          <select
            value={dateType}
            onChange={(e) => setDateType(e.target.value as any)}
          >
            <option value="full">Full Date</option>
            <option value="decade">Decades</option>
            <option value="year">Year</option>
            <option value="month-year">Month-Year</option>
          </select>

          {dateType === 'full' && (
            <input
              type="date"
              min="1926-11-23"
              max="2011-04-24"
              value={dateValue}
              onChange={(e) => setDateValue(e.target.value)}
            />
          )}

          {dateType === 'decade' && (
            <select
              value={dateValue}
              onChange={(e) => setDateValue(e.target.value)}
            >
              <option value="">Select decade</option>
              {['1920s', '1930s', '1940s', '1950s', '1960s', '1970s', '1980s', '1990s', '2000s'].map(decade => (
                <option key={decade} value={decade}>{decade}</option>
              ))}
            </select>
          )}

          {dateType === 'year' && (
            <select
              value={dateValue}
              onChange={(e) => setDateValue(e.target.value)}
            >
              <option value="">Select year</option>
              {Array.from({ length: 86 }, (_, i) => 1926 + i).map(year => (
                <option key={year} value={year.toString()}>{year}</option>
              ))}
            </select>
          )}

          {dateType === 'month-year' && (
            <select
              value={dateValue}
              onChange={(e) => setDateValue(e.target.value)}
            >
              <option value="">Select month and year</option>
              {Array.from({ length: 1014 }, (_, i) => {
                const date = new Date(1926, 10 + i, 1); // Start from November 1926
                if (date > new Date(2011, 3, 24)) return null; // End at April 2011
                return (
                  <option key={i} value={date.toISOString().slice(0, 7)}>
                    {date.toLocaleString('default', { month: 'long', year: 'numeric' })}
                  </option>
                );
              }).filter(Boolean)}
            </select>
          )}
        </div>
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
    </form>
  );
} 
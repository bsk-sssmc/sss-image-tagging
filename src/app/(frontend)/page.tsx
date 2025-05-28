'use client'

import './styles.css'
import React, { useEffect, useState, useRef, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from './context/AuthContext'
import Image from 'next/image'

interface Location {
  id: string;
  name: string;
}

interface Occasion {
  id: string;
  name: string;
}

interface Person {
  id: string;
  name: string;
}

interface Media {
  id: string;
  filename: string;
  url?: string;
  alt?: string;
}

interface PersonTag {
  personId: Person;
  confidence?: string;
  coordinates: {
    x: number;
    y: number;
  };
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

interface ImageTag {
  id: string;
  whenType?: string;
  whenValue?: string;
  mediaId: Media;
  personTags: PersonTag[];
  location?: Location;
  occasion?: Occasion;
  context?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export default function HomePage() {
  const router = useRouter()
  const { user, setUser } = useAuth()
  const [tags, setTags] = useState<ImageTag[]>([])
  const [filteredTags, setFilteredTags] = useState<ImageTag[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [expandedPills, setExpandedPills] = useState<string | null>(null)
  const [isEditingName, setIsEditingName] = useState(false)
  const [newDisplayName, setNewDisplayName] = useState('')
  const hasFetchedData = useRef(false)

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)
  const itemsPerPageOptions = [5, 10, 20, 50, 100]

  // Filter states
  const [selectedPersons, setSelectedPersons] = useState<string[]>([])
  const [selectedLocations, setSelectedLocations] = useState<string[]>([])
  const [selectedOccasions, setSelectedOccasions] = useState<string[]>([])
  const [selectedDate, setSelectedDate] = useState<string>('')

  // Add new state for image title filter
  const [selectedImageTitles, setSelectedImageTitles] = useState<string[]>([])

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [selectedPersons, selectedLocations, selectedOccasions, selectedDate, itemsPerPage, selectedImageTitles])

  // Calculate pagination
  const totalPages = Math.ceil(filteredTags.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const currentTags = filteredTags.slice(startIndex, endIndex)

  // Extract unique values for filters
  const uniquePersons = useMemo(() => {
    const persons = new Map<string, string>()
    tags.forEach(tag => {
      tag.personTags.forEach(personTag => {
        persons.set(personTag.personId.id, personTag.personId.name)
      })
    })
    return Array.from(persons.entries())
  }, [tags])

  const uniqueLocations = useMemo(() => {
    const locations = new Map<string, string>()
    tags.forEach(tag => {
      if (tag.location) {
        locations.set(tag.location.id, tag.location.name)
      }
    })
    return Array.from(locations.entries())
  }, [tags])

  const uniqueOccasions = useMemo(() => {
    const occasions = new Map<string, string>()
    tags.forEach(tag => {
      if (tag.occasion) {
        occasions.set(tag.occasion.id, tag.occasion.name)
      }
    })
    return Array.from(occasions.entries())
  }, [tags])

  // Extract unique image titles for filter
  const uniqueImageTitles = useMemo(() => {
    const titles = new Map<string, string>()
    tags.forEach(tag => {
      if (tag.mediaId.filename) {
        titles.set(tag.mediaId.id, tag.mediaId.filename)
      }
    })
    return Array.from(titles.entries())
  }, [tags])

  // Apply filters
  useEffect(() => {
    let filtered = [...tags]

    if (selectedPersons.length > 0) {
      filtered = filtered.filter(tag =>
        tag.personTags.some(personTag => selectedPersons.includes(personTag.personId.id))
      )
    }

    if (selectedLocations.length > 0) {
      filtered = filtered.filter(tag =>
        tag.location && selectedLocations.includes(tag.location.id)
      )
    }

    if (selectedOccasions.length > 0) {
      filtered = filtered.filter(tag =>
        tag.occasion && selectedOccasions.includes(tag.occasion.id)
      )
    }

    if (selectedImageTitles.length > 0) {
      filtered = filtered.filter(tag =>
        selectedImageTitles.includes(tag.mediaId.id)
      )
    }

    // Apply date filter
    if (selectedDate) {
      const filterDate = new Date(selectedDate)
      const nextDay = new Date(filterDate)
      nextDay.setDate(nextDay.getDate() + 1)
      
      filtered = filtered.filter(tag => {
        const tagDate = new Date(tag.createdAt)
        return tagDate >= filterDate && tagDate < nextDay
      })
    }

    setFilteredTags(filtered)
  }, [tags, selectedPersons, selectedLocations, selectedOccasions, selectedDate, selectedImageTitles])

  const fetchTags = async (userId: string) => {
    if (hasFetchedData.current) return

    try {
      const response = await fetch(`/api/image-tags?where[createdBy][equals]=${userId}&populate[location]=true&populate[occasion]=true&populate[personTags.personId]=true`)

      if (response.ok) {
        const data = await response.json()
        setTags(data.docs)
        setFilteredTags(data.docs)
        setIsLoading(false)
        hasFetchedData.current = true
      }
    } catch (error) {
      console.error('Error fetching tags:', error)
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (!user) {
      router.push('/login')
    } else {
      fetchTags(user.id)
    }
  }, [user, router])

  useEffect(() => {
    hasFetchedData.current = false
  }, [user?.id])

  const renderConfidenceStars = (confidence?: string) => {
    if (!confidence) return null
    const numStars = parseInt(confidence)
    if (isNaN(numStars)) return null
    return (
      <span className="confidence-stars">
        {Array(numStars).fill('★').join('')}
      </span>
    )
  }

  const togglePillExpansion = (tagId: string) => {
    setExpandedPills(expandedPills === tagId ? null : tagId)
  }

  const handleNameEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !newDisplayName.trim()) return

    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ displayName: newDisplayName.trim() }),
        credentials: 'include',
      })

      if (!res.ok) {
        throw new Error('Failed to update display name')
      }

      const data = await res.json()
      setUser(data.user)
      setIsEditingName(false)
    } catch (error) {
      console.error('Error updating display name:', error)
    }
  }

  const FilterDropdown = ({ label, options, selected, onChange }: {
    label: string
    options: [string, string][]
    selected: string[]
    onChange: (values: string[]) => void
  }) => {
    const [isOpen, setIsOpen] = useState(false)
    const dropdownRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
          setIsOpen(false)
        }
      }

      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    if (options.length === 0) return null

    return (
      <div className="filter-dropdown" ref={dropdownRef}>
        <div className="filter-header" onClick={() => setIsOpen(!isOpen)}>
          <span className="filter-label">{label}</span>
          <span className="filter-arrow">{isOpen ? '▲' : '▼'}</span>
        </div>
        {isOpen && (
          <div className="filter-options">
            {options.map(([id, name]) => (
              <div
                key={id}
                className={`filter-option ${selected.includes(id) ? 'selected' : ''}`}
                onClick={() => {
                  if (selected.includes(id)) {
                    onChange(selected.filter(s => s !== id))
                  } else {
                    onChange([...selected, id])
                  }
                }}
              >
                {name}
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  const DateFilter = () => {
    const [isOpen, setIsOpen] = useState(false)
    const dropdownRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
          setIsOpen(false)
        }
      }

      if (isOpen) {
        document.addEventListener('mousedown', handleClickOutside)
      }

      return () => {
        document.removeEventListener('mousedown', handleClickOutside)
      }
    }, [isOpen])

    const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      e.stopPropagation()
      setSelectedDate(e.target.value)
      setIsOpen(false)
    }

    const handleClear = (e: React.MouseEvent) => {
      e.stopPropagation()
      setSelectedDate('')
      setIsOpen(false)
    }

    return (
      <div className="filter-dropdown" ref={dropdownRef}>
        <div 
          className="filter-header" 
          onClick={(e) => {
            e.stopPropagation()
            setIsOpen(!isOpen)
          }}
        >
          <span className="filter-label">Created Date</span>
          <span className="filter-arrow">{isOpen ? '▲' : '▼'}</span>
        </div>
        {isOpen && (
          <div 
            className="filter-options date-filter-options"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="date-input-group">
              <input
                type="date"
                value={selectedDate}
                onChange={handleDateChange}
                onMouseDown={(e) => e.stopPropagation()}
                autoFocus
              />
            </div>
            {selectedDate && (
              <div className="date-filter-actions">
                <button
                  className="clear-dates"
                  onClick={handleClear}
                >
                  Clear Date
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="home-container">
      <div className="profile-section">
        <h2>Your Profile</h2>
        <div className="profile-content">
          {isEditingName ? (
            <form onSubmit={handleNameEdit} className="profile-edit-form">
              <input
                type="text"
                value={newDisplayName}
                onChange={(e) => setNewDisplayName(e.target.value)}
                placeholder="Enter new display name"
                className="profile-input"
              />
              <div className="profile-edit-buttons">
                <button type="submit" className="profile-save-button">Save</button>
                <button 
                  type="button" 
                  onClick={() => {
                    setIsEditingName(false)
                    setNewDisplayName('')
                  }}
                  className="profile-cancel-button"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <div className="profile-info">
              <div className="profile-field">
                <span className="profile-label">Name:</span>
                <span className="profile-value">{user.displayName}</span>
                <button 
                  onClick={() => {
                    setIsEditingName(true)
                    setNewDisplayName(user.displayName || '')
                  }}
                  className="profile-edit-button"
                >
                  Edit
                </button>
              </div>
              <div className="profile-field">
                <span className="profile-label">Email:</span>
                <span className="profile-value">{user.email}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="table-container">
        <h2>Your Tags</h2>
        {isLoading ? (
          <div className="loading-spinner-container">
            <div className="loading-spinner" />
          </div>
        ) : tags.length > 0 ? (
          <>
            <div className="filters-section">
              <div className="filters-container">
                <FilterDropdown
                  label="Persons"
                  options={uniquePersons}
                  selected={selectedPersons}
                  onChange={setSelectedPersons}
                />
                <FilterDropdown
                  label="Locations"
                  options={uniqueLocations}
                  selected={selectedLocations}
                  onChange={setSelectedLocations}
                />
                <FilterDropdown
                  label="Occasions"
                  options={uniqueOccasions}
                  selected={selectedOccasions}
                  onChange={setSelectedOccasions}
                />
                <FilterDropdown
                  label="Image Titles"
                  options={uniqueImageTitles}
                  selected={selectedImageTitles}
                  onChange={setSelectedImageTitles}
                />
                <DateFilter />
              </div>
              <div className="selected-filters">
                {selectedPersons.map(id => {
                  const option = uniquePersons.find(([optId]) => optId === id)
                  if (!option) return null
                  return (
                    <span key={id} className="selected-pill">
                      Person: {option[1]}
                      <button
                        className="remove-pill"
                        onClick={() => setSelectedPersons(selectedPersons.filter(s => s !== id))}
                      >
                        ×
                      </button>
                    </span>
                  )
                })}
                {selectedLocations.map(id => {
                  const option = uniqueLocations.find(([optId]) => optId === id)
                  if (!option) return null
                  return (
                    <span key={id} className="selected-pill">
                      Location: {option[1]}
                      <button
                        className="remove-pill"
                        onClick={() => setSelectedLocations(selectedLocations.filter(s => s !== id))}
                      >
                        ×
                      </button>
                    </span>
                  )
                })}
                {selectedOccasions.map(id => {
                  const option = uniqueOccasions.find(([optId]) => optId === id)
                  if (!option) return null
                  return (
                    <span key={id} className="selected-pill">
                      Occasion: {option[1]}
                      <button
                        className="remove-pill"
                        onClick={() => setSelectedOccasions(selectedOccasions.filter(s => s !== id))}
                      >
                        ×
                      </button>
                    </span>
                  )
                })}
                {selectedDate && (
                  <span className="selected-pill">
                    Date: {new Date(selectedDate).toLocaleDateString()}
                    <button
                      className="remove-pill"
                      onClick={() => setSelectedDate('')}
                    >
                      ×
                    </button>
                  </span>
                )}
                {selectedImageTitles.map(id => {
                  const option = uniqueImageTitles.find(([optId]) => optId === id)
                  if (!option) return null
                  return (
                    <span key={id} className="selected-pill">
                      Image: {option[1]}
                      <button
                        className="remove-pill"
                        onClick={() => setSelectedImageTitles(selectedImageTitles.filter(s => s !== id))}
                      >
                        ×
                      </button>
                    </span>
                  )
                })}
              </div>
            </div>
            <div className="table-wrapper">
              <table className="tags-table">
                <thead>
                  <tr>
                    <th>Created At</th>
                    <th>Image</th>
                    <th>Who</th>
                    <th>Location</th>
                    <th>Occasion</th>
                    <th>When Type</th>
                    <th>When</th>
                    <th>What</th>
                  </tr>
                </thead>
                <tbody>
                  {currentTags.map((tag) => (
                    <tr key={`${tag.id}-${tag.mediaId.id}`}>
                      <td>{new Date(tag.createdAt).toLocaleDateString()}</td>
                      <td>
                        <div className="image-link">
                          <a href={`/tag/${tag.mediaId.id}`} className="image-link">
                            {tag.mediaId.filename}
                          </a>
                          <div className="image-preview-tooltip">
                            <Image
                              src={tag.mediaId.url || ''}
                              alt={tag.mediaId.alt || tag.mediaId.filename}
                              width={200}
                              height={200}
                              style={{ objectFit: 'cover' }}
                            />
                          </div>
                        </div>
                      </td>
                      <td>
                        <div 
                          className={`pill-container ${expandedPills === tag.id ? 'expanded' : ''}`}
                          onClick={() => togglePillExpansion(tag.id)}
                        >
                          {tag.personTags.map((personTag) => (
                            <span key={`${tag.id}-${personTag.personId.id}`} className="pill">
                              {personTag.personId.name}
                              {personTag.confidence && renderConfidenceStars(personTag.confidence)}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td>{tag.location?.name || '-'}</td>
                      <td>{tag.occasion?.name || '-'}</td>
                      <td>{tag.whenType || '-'}</td>
                      <td>{tag.whenValue || '-'}</td>
                      <td>{tag.context || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="pagination-controls">
              <div className="items-per-page">
                <label htmlFor="itemsPerPage">Items per page:</label>
                <select
                  id="itemsPerPage"
                  value={itemsPerPage}
                  onChange={(e) => setItemsPerPage(Number(e.target.value))}
                  className="items-per-page-select"
                >
                  {itemsPerPageOptions.map(option => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
              <div className="pagination-info">
                Showing {startIndex + 1}-{Math.min(endIndex, filteredTags.length)} of {filteredTags.length} tags
              </div>
              <div className="pagination-buttons">
                <button
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                  className="pagination-button"
                >
                  «
                </button>
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="pagination-button"
                >
                  ‹
                </button>
                <span className="pagination-page-info">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="pagination-button"
                >
                  ›
                </button>
                <button
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                  className="pagination-button"
                >
                  »
                </button>
              </div>
            </div>
          </>
        ) : (
          <p className="no-tags">No tags found. Start tagging to see them here!</p>
        )}
      </div>
    </div>
  )
}

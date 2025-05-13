'use client'

import './styles.css'
import React, { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from './context/AuthContext'

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
  title: string;
}

interface ImageTag {
  id: string;
  whenType?: string;
  whenValue?: string;
  mediaId: Media;
  persons?: Person[];
  location?: Location;
  occasion?: Occasion;
  context?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

interface PersonTag {
  id: string;
  mediaId: Media;
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

interface UnifiedTag {
  id: string;
  createdAt: string;
  persons: Person[];
  location?: Location;
  occasion?: Occasion;
  whenType?: string;
  whenValue?: string;
  context?: string;
  confidence?: string;
  mediaId: Media;
}

export default function HomePage() {
  const router = useRouter()
  const { user, checkAuth } = useAuth()
  const [unifiedTags, setUnifiedTags] = useState<UnifiedTag[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [expandedPills, setExpandedPills] = useState<string | null>(null)
  const hasFetchedData = useRef(false)

  const fetchTags = async (userId: string) => {
    if (hasFetchedData.current) return

    try {
      // Fetch image tags with populated relationships
      const imageTagsResponse = await fetch(`/api/image-tags?where[createdBy][equals]=${userId}&depth=1`, {
        credentials: 'include',
      })
      const personTagsResponse = await fetch(`/api/person-tags?where[createdBy][equals]=${userId}&depth=1`, {
        credentials: 'include',
      })

      if (imageTagsResponse.ok && personTagsResponse.ok) {
        const imageData = await imageTagsResponse.json()
        const personData = await personTagsResponse.json()

        // Combine and sort tags
        const combinedTags: UnifiedTag[] = [
          ...imageData.docs.map((tag: ImageTag) => ({
            id: tag.id,
            createdAt: tag.createdAt,
            persons: tag.persons || [],
            location: tag.location,
            occasion: tag.occasion,
            whenType: tag.whenType,
            whenValue: tag.whenValue,
            context: tag.context,
            mediaId: tag.mediaId,
          })),
          ...personData.docs.map((tag: PersonTag) => ({
            id: tag.id,
            createdAt: tag.createdAt,
            persons: [tag.personId],
            confidence: tag.confidence,
            mediaId: tag.mediaId,
          })),
        ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

        setUnifiedTags(combinedTags)
      }
    } catch (error) {
      console.error('Error fetching tags:', error)
    } finally {
      setIsLoading(false)
      hasFetchedData.current = true
    }
  }

  useEffect(() => {
    const checkUser = async () => {
      await checkAuth()
      if (!user) {
        router.push('/login')
      } else {
        fetchTags(user.id)
      }
    }
    checkUser()
  }, [])

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

  const handleImageClick = (mediaId: string) => {
    router.push(`/tag?image=${mediaId}`)
  }

  if (!user) {
    return null
  }

  return (
    <div className="home-container">
      <h1 className="welcome-message">Welcome, {user.displayName}!</h1>
      
      <div className="table-container">
        <h2>Your Tags</h2>
        {isLoading ? (
          <div className="loading-spinner-container">
            <div className="loading-spinner" />
          </div>
        ) : unifiedTags.length > 0 ? (
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
              {unifiedTags.map((tag) => (
                <tr key={tag.id}>
                  <td>{new Date(tag.createdAt).toLocaleDateString()}</td>
                  <td>
                    <a 
                      href={`/tag?image=${tag.mediaId.id}`}
                      className="image-link"
                      onClick={(e) => {
                        e.preventDefault()
                        handleImageClick(tag.mediaId.id)
                      }}
                    >
                      {tag.mediaId.title || 'Untitled'}
                    </a>
                  </td>
                  <td>
                    <div 
                      className={`pill-container ${expandedPills === tag.id ? 'expanded' : ''}`}
                      onClick={() => togglePillExpansion(tag.id)}
                    >
                      {tag.persons.map((person) => (
                        <span key={person.id} className="pill">
                          {person.name}
                          {tag.confidence && renderConfidenceStars(tag.confidence)}
                        </span>
                      ))}
                    </div>
                    {expandedPills === tag.id && (
                      <div className="pill-popout">
                        <div className="pill-container expanded">
                          {tag.persons.map((person) => (
                            <span key={person.id} className="pill">
                              {person.name}
                              {tag.confidence && renderConfidenceStars(tag.confidence)}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
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
        ) : (
          <p className="no-tags">No tags found. Start tagging to see them here!</p>
        )}
      </div>
    </div>
  )
}

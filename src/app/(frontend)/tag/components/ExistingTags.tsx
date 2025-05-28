'use client';

import { useState, useEffect, useCallback } from 'react';
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

interface PersonTag {
  personId: Person;
  confidence?: string;
  coordinates?: {
    x: number;
    y: number;
  };
}

interface ExistingTag {
  id: string;
  personTags: PersonTag[];
  location?: Location;
  occasion?: Occasion;
  whenType?: string;
  whenValue?: string;
  context?: string;
  createdBy: string;
  createdAt: string;
}

interface ExistingTagsProps {
  imageId: string;
  onTagRemove: (tagId: string) => void;
}

interface ApiCacheData {
  docs: ExistingTag[];
  totalDocs: number;
  limit: number;
  totalPages: number;
  page: number;
  pagingCounter: number;
  hasPrevPage: boolean;
  hasNextPage: boolean;
  prevPage: number | null;
  nextPage: number | null;
}

// Use the same cache as TagForm
declare const apiCache: {
  persons: Record<string, Person>;
  locations: Record<string, Location>;
  occasions: Record<string, Occasion>;
  imageTags: Map<string, ApiCacheData>;
};

export default function ExistingTags({ imageId, onTagRemove }: ExistingTagsProps) {
  const [tags, setTags] = useState<ExistingTag[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();
  const [expandedContext, setExpandedContext] = useState<string | null>(null);

  const fetchExistingTags = useCallback(async () => {
    try {
      // Check cache first
      if (apiCache.imageTags.has(imageId)) {
        const cachedData = apiCache.imageTags.get(imageId);
        if (cachedData) {
          setTags(cachedData.docs);
          setIsLoading(false);
          return;
        }
      }

      const response = await fetch(`/api/image-tags?where[mediaId][equals]=${imageId}&populate[personTags.personId]=true&populate[location]=true&populate[occasion]=true&populate[createdBy]=true`, {
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch existing tags');
      }
      
      const data = await response.json();
      
      // Cache the response
      apiCache.imageTags.set(imageId, data);
      
      setTags(data.docs);
    } catch (error) {
      console.error('Error fetching existing tags:', error);
    } finally {
      setIsLoading(false);
    }
  }, [imageId]);

  useEffect(() => {
    fetchExistingTags();
  }, [fetchExistingTags]);

  const handleRemoveTag = async (tagId: string) => {
    try {
      const response = await fetch(`/api/image-tags/${tagId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to remove tag');
      }

      // Remove from cache
      if (apiCache.imageTags.has(imageId)) {
        const cachedData = apiCache.imageTags.get(imageId);
        if (cachedData) {
          cachedData.docs = cachedData.docs.filter((tag: ExistingTag) => tag.id !== tagId);
          apiCache.imageTags.set(imageId, cachedData);
        }
      }

      onTagRemove(tagId);
      setTags(prevTags => prevTags.filter(tag => tag.id !== tagId));
    } catch (error) {
      console.error('Error removing tag:', error);
    }
  };

  const renderConfidenceStars = (confidence?: string) => {
    if (!confidence) return null;
    const numStars = parseInt(confidence);
    if (isNaN(numStars)) return null;
    return (
      <span className="confidence-stars">
        {Array(numStars).fill('★').join('')}
      </span>
    );
  };

  if (isLoading) {
    return <div className="loading-spinner" />;
  }

  if (tags.length === 0) {
    return null;
  }

  return (
    <div className="existing-tags">
      <h3>Existing Tags</h3>
      {tags.map(tag => (
        <div key={tag.id} className="existing-tag">
          {tag.personTags.length > 0 && (
            <div className="tag-section">
              <strong>Who:</strong>
              <div className="tag-values">
                {tag.personTags.map(personTag => (
                  <span key={personTag.personId.id} className="tag-value">
                    {personTag.personId.name}
                    {personTag.confidence && renderConfidenceStars(personTag.confidence)}
                  </span>
                ))}
              </div>
            </div>
          )}
          
          {tag.location && (
            <div className="tag-section">
              <strong>Where:</strong>
              <div className="tag-values">
                <span className="tag-value">{tag.location.name}</span>
              </div>
            </div>
          )}
          
          {tag.occasion && (
            <div className="tag-section">
              <strong>Occasion:</strong>
              <div className="tag-values">
                <span className="tag-value">{tag.occasion.name}</span>
              </div>
            </div>
          )}
          
          {tag.whenType && tag.whenValue && (
            <div className="tag-section">
              <strong>When:</strong>
              <div className="tag-values">
                <span className="tag-value">{tag.whenValue}</span>
              </div>
            </div>
          )}
          
          {tag.context && (
            <div className="tag-section">
              <strong>What:</strong>
              <div className="tag-values">
                {tag.createdBy === user?.id ? (
                  <span className="tag-value">{tag.context}</span>
                ) : (
                  <div 
                    className="context-preview"
                    onClick={() => setExpandedContext(expandedContext === tag.id ? null : tag.id)}
                  >
                    {expandedContext === tag.id ? tag.context : `"${tag.context.length > 100 ? `${tag.context.substring(0, 100)}...` : tag.context}"`}
                  </div>
                )}
              </div>
            </div>
          )}
          
          {tag.createdBy === user?.id && (
            <button
              className="remove-tag-button"
              onClick={() => handleRemoveTag(tag.id)}
            >
              Remove Tag
            </button>
          )}
        </div>
      ))}
    </div>
  );
} 
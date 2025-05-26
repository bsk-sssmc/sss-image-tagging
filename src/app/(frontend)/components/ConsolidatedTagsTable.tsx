'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import Image from 'next/image';

interface Tag {
  id: string;
  mediaId: {
    id: string;
    url: string;
    filename: string;
    alt?: string;
  };
  createdBy: {
    id: string;
    displayName: string;
  };
  createdAt: string;
  updatedAt: string;
  location?: {
    id: string;
    name: string;
  };
  occasion?: {
    id: string;
    name: string;
  };
  whenType?: string;
  whenValue?: string;
  personTags: Array<{
    personId: {
      id: string;
      name: string;
    };
    confidence?: string;
  }>;
  context?: string;
  status?: string;
}

interface ConsolidatedTag {
  mediaId: {
    id: string;
    url: string;
    filename: string;
    alt?: string;
  };
  persons: Set<string>;
  locations: Set<string>;
  occasions: Set<string>;
  whenTypes: Set<string>;
  whenValues: Set<string>;
  contexts: Set<string>;
  status: string;
}

export default function ConsolidatedTagsTable() {
  const { user: _user } = useAuth();
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalItems, setTotalItems] = useState(0);
  const [expandedPills, setExpandedPills] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<{ url: string; alt: string; x: number; y: number; position: 'top' | 'bottom' } | null>(null);
  const tableRef = useRef<HTMLDivElement>(null);

  const fetchTags = useCallback(async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams({
        page: currentPage.toString(),
        limit: itemsPerPage.toString(),
        sort: `createdAt:${sortOrder}`,
        'populate[location]': 'true',
        'populate[occasion]': 'true',
        'populate[personTags.personId]': 'true',
        'populate[createdBy]': 'true',
        'where[status][equals]': 'Verified',
        depth: '1',
      });

      const response = await fetch(`/api/image-tags?${queryParams.toString()}`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch tags');
      }

      const data = await response.json();
      setTags(data.docs);
      setTotalItems(data.totalDocs);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [currentPage, itemsPerPage, sortOrder]);

  useEffect(() => {
    fetchTags();
  }, [currentPage, itemsPerPage, sortOrder, fetchTags]);

  // Consolidate tags by image
  const consolidatedTags = useMemo(() => {
    const consolidatedMap = new Map<string, ConsolidatedTag>();

    tags.forEach((tag: Tag) => {
      const imageId = tag.mediaId.id;
      if (!consolidatedMap.has(imageId)) {
        consolidatedMap.set(imageId, {
          mediaId: tag.mediaId,
          persons: new Set(),
          locations: new Set(),
          occasions: new Set(),
          whenTypes: new Set(),
          whenValues: new Set(),
          contexts: new Set(),
          status: tag.status || 'Verified'
        });
      }

      const consolidated = consolidatedMap.get(imageId)!;
      
      // Add person tags
      tag.personTags?.forEach((personTag: { personId: { name: string } }) => {
        consolidated.persons.add(personTag.personId.name);
      });

      // Add location
      if (tag.location?.name) {
        consolidated.locations.add(tag.location.name);
      }

      // Add occasion
      if (tag.occasion?.name) {
        consolidated.occasions.add(tag.occasion.name);
      }

      // Add when type and value
      if (tag.whenType) {
        consolidated.whenTypes.add(tag.whenType);
      }
      if (tag.whenValue) {
        consolidated.whenValues.add(tag.whenValue);
      }

      // Add context
      if (tag.context) {
        consolidated.contexts.add(tag.context);
      }
    });

    return Array.from(consolidatedMap.values());
  }, [tags]);

  const _handleSortToggle = () => {
    setSortOrder((prev: 'asc' | 'desc') => prev === 'asc' ? 'desc' : 'asc');
  };

  const totalPages = Math.ceil(totalItems / itemsPerPage);

  const togglePillExpansion = (imageId: string) => {
    setExpandedPills((prev: string | null) => (prev === imageId ? null : imageId));
  };

  if (error) {
    return <div className="error-message">{error}</div>;
  }

  return (
    <div className="table-container" ref={tableRef}>
      <h2>Consolidated Verified Tags</h2>
      <div className="table-wrapper" style={{ overflowX: 'auto', maxHeight: '70vh', overflowY: 'auto' }}>
        <table className="tags-table">
          <thead>
            <tr>
              <th>Image</th>
              <th>Who</th>
              <th>Location</th>
              <th>Occasion</th>
              <th>When Type</th>
              <th>When</th>
              <th>What</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} className="loading-cell">
                  <div className="loading-spinner"></div>
                </td>
              </tr>
            ) : consolidatedTags.length === 0 ? (
              <tr>
                <td colSpan={8} className="no-tags">
                  No verified tags found
                </td>
              </tr>
            ) : (
              consolidatedTags.map((tag: ConsolidatedTag) => (
                <tr key={tag.mediaId.id}>
                  <td>
                    <div className="image-link" style={{ position: 'relative', display: 'inline-block' }}>
                      <a
                        href={`/tag/${tag.mediaId.id}`}
                        className="image-link"
                        onMouseEnter={(e: React.MouseEvent<HTMLAnchorElement>) => {
                          const linkRect = (e.target as HTMLElement).getBoundingClientRect();
                          const tableRect = tableRef.current?.getBoundingClientRect();
                          const tooltipHeight = 200;
                          const margin = 12;
                          let position: 'top' | 'bottom' = 'bottom';
                          if (tableRect) {
                            if (linkRect.bottom + tooltipHeight + margin > tableRect.bottom && linkRect.top - tooltipHeight - margin > tableRect.top) {
                              position = 'top';
                            }
                          } else {
                            if (linkRect.bottom + tooltipHeight + margin > window.innerHeight && linkRect.top - tooltipHeight - margin > 0) {
                              position = 'top';
                            }
                          }
                          setTooltip({
                            url: tag.mediaId.url,
                            alt: tag.mediaId.alt || tag.mediaId.filename,
                            x: linkRect.left + linkRect.width / 2,
                            y: position === 'top' ? linkRect.top : linkRect.bottom,
                            position,
                          });
                        }}
                        onMouseLeave={() => setTooltip(null)}
                      >
                        {tag.mediaId.filename}
                      </a>
                      {tooltip && tooltip.url === tag.mediaId.url && (
                        <div
                          className="tooltip"
                          style={{
                            position: 'fixed',
                            left: tooltip.x,
                            top: tooltip.position === 'top' ? tooltip.y - 220 : tooltip.y + 12,
                            transform: 'translateX(-50%)',
                            zIndex: 1000,
                          }}
                        >
                          <Image
                            src={tooltip.url}
                            alt={tooltip.alt}
                            width={200}
                            height={200}
                            style={{ objectFit: 'cover' }}
                          />
                        </div>
                      )}
                    </div>
                  </td>
                  <td>
                    <div
                      className={`pill-container ${expandedPills === tag.mediaId.id ? 'expanded' : ''}`}
                      onClick={() => togglePillExpansion(tag.mediaId.id)}
                    >
                      {Array.from(tag.persons).map((person: string) => (
                        <span key={person} className="pill">
                          {person}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td>{Array.from(tag.locations).join(', ') || '-'}</td>
                  <td>{Array.from(tag.occasions).join(', ') || '-'}</td>
                  <td>{Array.from(tag.whenTypes).join(', ') || '-'}</td>
                  <td>{Array.from(tag.whenValues).join(', ') || '-'}</td>
                  <td>{Array.from(tag.contexts).join(', ') || '-'}</td>
                  <td>{tag.status}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="pagination-controls">
        <div className="items-per-page">
          <label htmlFor="itemsPerPage">Items per page:</label>
          <select
            id="itemsPerPage"
            value={itemsPerPage}
            onChange={(e) => {
              setItemsPerPage(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="items-per-page-select"
          >
            <option value="10">10</option>
            <option value="25">25</option>
            <option value="50">50</option>
            <option value="100">100</option>
          </select>
        </div>

        <div className="pagination-info">
          Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, totalItems)} of {totalItems} items
        </div>

        <div className="pagination-buttons">
          <button
            className="pagination-button"
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
          >
            Previous
          </button>
          <span className="pagination-page-info">
            Page {currentPage} of {totalPages}
          </span>
          <button
            className="pagination-button"
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
} 
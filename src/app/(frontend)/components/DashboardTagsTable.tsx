'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import Link from 'next/link';

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

interface DashboardTagsTableProps {
  initialTags?: Tag[];
}

export default function DashboardTagsTable({ initialTags = [] }: DashboardTagsTableProps) {
  const { user } = useAuth();
  const [tags, setTags] = useState<Tag[]>(initialTags);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [userFilter, setUserFilter] = useState('');
  const [totalItems, setTotalItems] = useState(0);
  const [expandedPills, setExpandedPills] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkLoading, setBulkLoading] = useState(false);

  useEffect(() => {
    fetchTags();
  }, [currentPage, itemsPerPage, sortOrder, userFilter]);

  const fetchTags = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams({
        page: currentPage.toString(),
        limit: itemsPerPage.toString(),
        sort: `createdAt:${sortOrder}`,
        user: userFilter,
      });

      const response = await fetch(`/api/tags/dashboard?${queryParams}`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch tags');
      }

      const data = await response.json();
      setTags(data.tags);
      setTotalItems(data.total);
      setSelectedIds([]); // Clear selection on new fetch
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleSortToggle = () => {
    setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
  };

  const handleUserFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUserFilter(e.target.value);
    setCurrentPage(1); // Reset to first page when filter changes
  };

  const totalPages = Math.ceil(totalItems / itemsPerPage);

  const togglePillExpansion = (tagId: string) => {
    setExpandedPills(prev => (prev === tagId ? null : tagId));
  };

  // Render confidence stars (if needed)
  const renderConfidenceStars = (confidence?: string) => {
    if (!confidence) return null;
    const level = parseInt(confidence, 10);
    return (
      <span className="confidence-stars">
        {'★'.repeat(level)}{'☆'.repeat(5 - level)}
      </span>
    );
  };

  // Checkbox logic
  const allSelected = tags.length > 0 && selectedIds.length === tags.length;
  const handleSelectAll = () => {
    if (allSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(tags.map(tag => tag.id));
    }
  };
  const handleSelectRow = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  // Bulk actions
  const handleBulkStatus = async (status: string) => {
    setBulkLoading(true);
    try {
      await Promise.all(selectedIds.map(id =>
        fetch(`/api/image-tags/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status }),
        })
      ));
      await fetchTags();
    } finally {
      setBulkLoading(false);
    }
  };
  const handleBulkDelete = async () => {
    setBulkLoading(true);
    try {
      await Promise.all(selectedIds.map(id =>
        fetch(`/api/image-tags/${id}`, { method: 'DELETE' })
      ));
      await fetchTags();
    } finally {
      setBulkLoading(false);
    }
  };

  if (error) {
    return <div className="error-message">{error}</div>;
  }

  return (
    <div className="table-container">
      <div className="filters-section">
        <div className="filters-container">
          <div className="filter-dropdown">
            <input
              type="text"
              placeholder="Filter by user name..."
              value={userFilter}
              onChange={handleUserFilterChange}
              className="filter-input"
            />
          </div>
        </div>
      </div>

      {selectedIds.length > 0 && (
        <div className="bulk-controls">
          <span>{selectedIds.length} selected</span>
          <button onClick={() => handleBulkStatus('Verified')} disabled={bulkLoading} className="bulk-action-btn">Set Verified</button>
          <button onClick={() => handleBulkStatus('Not Verified')} disabled={bulkLoading} className="bulk-action-btn">Set Not Verified</button>
          <button onClick={handleBulkDelete} disabled={bulkLoading} className="bulk-action-btn delete">Delete</button>
          {bulkLoading && <span className="loading-spinner" style={{ marginLeft: 8 }} />}
        </div>
      )}

      <div className="table-wrapper" style={{ overflowX: 'auto', maxHeight: '70vh', overflowY: 'auto' }}>
        <table className="tags-table">
          <thead>
            <tr>
              <th>
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={handleSelectAll}
                  aria-label="Select all"
                />
              </th>
              <th>User Name</th>
              <th>Created At
                <button onClick={handleSortToggle} className="sort-button">
                  {sortOrder === 'asc' ? '↑' : '↓'}
                </button>
              </th>
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
                <td colSpan={11} className="loading-cell">
                  <div className="loading-spinner"></div>
                </td>
              </tr>
            ) : tags.length === 0 ? (
              <tr>
                <td colSpan={11} className="no-tags">
                  No tags found
                </td>
              </tr>
            ) : (
              tags.map((tag) => (
                <tr key={tag.id}>
                  <td>
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(tag.id)}
                      onChange={() => handleSelectRow(tag.id)}
                      aria-label={`Select tag ${tag.id}`}
                    />
                  </td>
                  <td>{tag.createdBy?.displayName || '-'}</td>
                  <td>{new Date(tag.createdAt).toLocaleDateString()}</td>
                  <td>
                    <div className="image-link" style={{ position: 'relative', display: 'inline-block' }}>
                      <a href={`/tag/${tag.mediaId.id}`} className="image-link">
                        {tag.mediaId.filename}
                      </a>
                      <div className="image-preview-tooltip">
                        <img
                          src={tag.mediaId.url}
                          alt={tag.mediaId.alt || tag.mediaId.filename}
                          style={{ maxWidth: 180, maxHeight: 180 }}
                          loading="lazy"
                        />
                      </div>
                    </div>
                  </td>
                  <td>
                    <div
                      className={`pill-container ${expandedPills === tag.id ? 'expanded' : ''}`}
                      onClick={() => togglePillExpansion(tag.id)}
                    >
                      {tag.personTags?.map((personTag) => (
                        <span key={personTag.personId.id} className="pill">
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
                  <td>{tag.status || '-'}</td>
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
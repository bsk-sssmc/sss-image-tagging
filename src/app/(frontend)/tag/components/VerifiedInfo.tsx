import { useState, useEffect } from 'react';
import { useAuth } from '@/app/(frontend)/context/AuthContext';

interface VerifiedInfoProps {
  imageId: string;
}

interface VerifiedTag {
  id: string;
  personTags?: {
    personId: {
      id: string;
      name: string;
    };
  }[];
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
  context?: string;
}

export default function VerifiedInfo({ imageId }: VerifiedInfoProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [verifiedTag, setVerifiedTag] = useState<VerifiedTag | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchVerifiedTag = async () => {
      if (!imageId) return;
      setIsLoading(true);
      try {
        const response = await fetch(
          `/api/image-tags?where[mediaId][equals]=${imageId}&where[status][equals]=Verified&populate[personTags.personId]=true&populate[location]=true&populate[occasion]=true&limit=1`
        );
        if (!response.ok) return;
        const data = await response.json();
        if (data.docs && data.docs.length > 0) {
          setVerifiedTag(data.docs[0]);
        } else {
          setVerifiedTag(null);
        }
      } catch (error) {
        setVerifiedTag(null);
        console.error('Error fetching verified tag:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchVerifiedTag();
  }, [imageId]);

  const isDisabled = isLoading || !verifiedTag;

  const handleHeaderClick = () => {
    if (isDisabled) return;
    setIsExpanded((prev) => !prev);
  };

  return (
    <section className="verified-info-accordion-panel">
      <button
        className={`verified-info-header-row${isDisabled ? ' disabled' : ''}`}
        onClick={handleHeaderClick}
        style={isDisabled ? { cursor: 'not-allowed' } : { cursor: 'pointer' }}
        tabIndex={0}
        aria-disabled={isDisabled}
        aria-expanded={isExpanded}
        type="button"
      >
        <span className="verified-info-header-title">Verified Information</span>
        <span className={`chevron-icon-inline${isExpanded ? ' expanded' : ''}`} aria-hidden="true">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M6 8L10 12L14 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </button>
      {isExpanded && (
        <div className="verified-info-content-panel">
          {verifiedTag ? (
            <dl className="verified-info-list">
              {verifiedTag.personTags && verifiedTag.personTags.length > 0 && (
                <div className="verified-info-row">
                  <dt>Persons:</dt>
                  <dd>
                    <div className="person-pills">
                      {verifiedTag.personTags.map((tag) => (
                        <span key={tag.personId.id} className="person-pill">
                          {tag.personId.name}
                        </span>
                      ))}
                    </div>
                  </dd>
                </div>
              )}
              {verifiedTag.location && (
                <div className="verified-info-row">
                  <dt>Location:</dt>
                  <dd>{verifiedTag.location.name}</dd>
                </div>
              )}
              {verifiedTag.occasion && (
                <div className="verified-info-row">
                  <dt>Occasion:</dt>
                  <dd>{verifiedTag.occasion.name}</dd>
                </div>
              )}
              {verifiedTag.whenType && verifiedTag.whenValue && (
                <div className="verified-info-row">
                  <dt>When:</dt>
                  <dd>
                    {verifiedTag.whenType === 'full_date' && 'Full Date: '}
                    {verifiedTag.whenType === 'decades' && 'Decade: '}
                    {verifiedTag.whenType === 'year' && 'Year: '}
                    {verifiedTag.whenType === 'month_year' && 'Month-Year: '}
                    {verifiedTag.whenValue}
                  </dd>
                </div>
              )}
              {verifiedTag.context && (
                <div className="verified-info-row">
                  <dt>What (context):</dt>
                  <dd>{verifiedTag.context}</dd>
                </div>
              )}
            </dl>
          ) : (
            <div className="verified-info-item no-verified-info">
              No verified information available for this image.
            </div>
          )}
        </div>
      )}
    </section>
  );
} 
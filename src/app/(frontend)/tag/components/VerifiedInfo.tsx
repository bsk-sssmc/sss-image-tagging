import { useState, useEffect } from 'react';

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
  createdAt?: string;
}

export default function VerifiedInfo({ imageId }: VerifiedInfoProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [verifiedTags, setVerifiedTags] = useState<VerifiedTag[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedContexts, setExpandedContexts] = useState<{ [id: string]: boolean }>({});

  useEffect(() => {
    const fetchVerifiedTags = async () => {
      if (!imageId) return;
      setIsLoading(true);
      try {
        const response = await fetch(
          `/api/image-tags?where[mediaId][equals]=${imageId}&where[status][equals]=Verified&populate[personTags.personId]=true&populate[location]=true&populate[occasion]=true&sort=-createdAt`
        );
        if (!response.ok) return;
        const data = await response.json();
        setVerifiedTags(data.docs || []);
      } catch (error) {
        setVerifiedTags([]);
        console.error('Error fetching verified tags:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchVerifiedTags();
  }, [imageId]);

  // Aggregate people (unique)
  const allPeople = Array.from(
    new Map(
      verifiedTags.flatMap(tag => tag.personTags || []).map(pt => [pt.personId.id, pt.personId])
    ).values()
  );

  // Get latest tag with a value for each field
  const getLatestWithField = (field: keyof VerifiedTag) =>
    verifiedTags.find(tag => tag[field]);

  const latestLocation = getLatestWithField('location')?.location;
  const latestOccasion = getLatestWithField('occasion')?.occasion;
  const latestWhenTag = verifiedTags.find(tag => tag.whenType && tag.whenValue);

  // All contexts (what)
  const allContexts = verifiedTags.filter(tag => tag.context);

  const isDisabled = isLoading || verifiedTags.length === 0;

  const handleHeaderClick = () => {
    if (isDisabled) return;
    setIsExpanded((prev) => !prev);
  };

  const handleContextExpand = (id: string) => {
    setExpandedContexts(prev => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <section className="verified-info-card">
      <div className="verified-info-title-row">
        <span className="verified-info-title">Verified Information</span>
        <button
          className={`verified-info-chevron-btn${isDisabled ? ' disabled' : ''}`}
          onClick={handleHeaderClick}
          tabIndex={0}
          aria-disabled={isDisabled}
          aria-expanded={isExpanded}
          type="button"
        >
          <span className={`chevron-icon-card${isExpanded ? ' expanded' : ''}`} aria-hidden="true">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M6 8L10 12L14 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
        </button>
      </div>
      {isExpanded && (
        <div className="verified-info-card-content">
          {verifiedTags.length > 0 ? (
            <dl className="verified-info-list">
              {allPeople.length > 0 && (
                <div className="verified-info-row-card">
                  <dt>Persons:</dt>
                  <dd>
                    <div className="person-pills">
                      {allPeople.map((person) => (
                        <span key={person.id} className="person-pill">
                          {person.name}
                        </span>
                      ))}
                    </div>
                  </dd>
                </div>
              )}
              {latestLocation && (
                <div className="verified-info-row-card">
                  <dt>Location:</dt>
                  <dd>{latestLocation.name}</dd>
                </div>
              )}
              {latestOccasion && (
                <div className="verified-info-row-card">
                  <dt>Occasion:</dt>
                  <dd>{latestOccasion.name}</dd>
                </div>
              )}
              {latestWhenTag && (
                <div className="verified-info-row-card">
                  <dt>When:</dt>
                  <dd>
                    {latestWhenTag.whenType === 'full_date' && 'Full Date: '}
                    {latestWhenTag.whenType === 'decades' && 'Decade: '}
                    {latestWhenTag.whenType === 'year' && 'Year: '}
                    {latestWhenTag.whenType === 'month_year' && 'Month-Year: '}
                    {latestWhenTag.whenValue}
                  </dd>
                </div>
              )}
              {allContexts.length > 0 && (
                <div className="verified-info-row-card">
                  <dt>What (context):</dt>
                  <dd>
                    {allContexts.map((tag) => (
                      <div
                        key={tag.id}
                        className={`verified-context-panel${expandedContexts[tag.id] ? ' expanded' : ''}`}
                        onClick={() => handleContextExpand(tag.id)}
                        title={expandedContexts[tag.id] ? undefined : tag.context}
                      >
                        <span
                          className="verified-context-preview"
                        >
                          {expandedContexts[tag.id]
                            ? tag.context
                            : tag.context!.length > 0
                              ? tag.context
                              : ''}
                        </span>
                        {!expandedContexts[tag.id] && tag.context && tag.context.length > 0 && (
                          <span className="context-expand">
                            ... (more)
                          </span>
                        )}
                        {expandedContexts[tag.id] && tag.context && tag.context.length > 100 && (
                          <span className="context-expand">
                            (less)
                          </span>
                        )}
                      </div>
                    ))}
                  </dd>
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
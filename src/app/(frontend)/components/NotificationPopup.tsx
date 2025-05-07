import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

interface NotificationPopupProps {
  type: 'success' | 'error';
  message: string;
  onClose: () => void;
  onTagAnother?: () => void;
}

export default function NotificationPopup({ type, message, onClose, onTagAnother }: NotificationPopupProps) {
  const popupRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  return (
    <div className="notification-popup-overlay">
      <div 
        ref={popupRef}
        className={`notification-popup ${type}`}
      >
        <button
          onClick={onClose}
          className="notification-close"
          aria-label="Close notification"
        >
          <svg 
            viewBox="0 0 24 24" 
            width="24" 
            height="24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2"
          >
            <path d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        
        <div className="notification-content">
          <p className="notification-message">{message}</p>
          
          {type === 'success' && (
            <div className="notification-actions">
              <button
                onClick={() => router.push('/gallery')}
                className="notification-button"
              >
                See other images
              </button>
              <button
                onClick={onTagAnother}
                className="notification-button"
              >
                Tag another image
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 
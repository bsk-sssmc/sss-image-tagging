'use client';

import { useEffect } from 'react';
import Image from 'next/image';

interface ImageModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string | null;
}

export default function ImageModal({ isOpen, onClose, imageUrl }: ImageModalProps) {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen || !imageUrl) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-instructions">
          Please click the ESC button on your keyboard or the Close Icon on the top right to close this image
        </div>
        <button
          onClick={onClose}
          className="modal-close"
          aria-label="Close modal"
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
        <Image
          src={imageUrl}
          alt="Full size image"
          fill
          style={{ objectFit: 'contain' }}
          priority
        />
      </div>
    </div>
  );
} 
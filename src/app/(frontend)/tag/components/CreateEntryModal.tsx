import { useState, useEffect, useRef } from 'react';

interface Field {
  name: string;
  label: string;
  type: string;
  required: boolean;
  options?: string[];
}

interface CreateEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  fields: Field[];
  onSubmit: (data: Record<string, string>) => Promise<void>;
}

export default function CreateEntryModal({ isOpen, onClose, title, fields, onSubmit }: CreateEntryModalProps) {
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const modalContentRef = useRef<HTMLDivElement>(null);

  // Close on ESC key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Close on overlay click
  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (modalContentRef.current && !modalContentRef.current.contains(e.target as Node)) {
      onClose();
    }
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      await onSubmit(formData);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev: Record<string, string>) => ({ ...prev, [name]: value }));
  };

  const isFormValid = () => {
    return fields.every(field => !field.required || formData[field.name]);
  };

  return (
    <div className="create-entry-modal-overlay" onClick={handleOverlayClick} style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.5)' }}>
      <div ref={modalContentRef} className="create-entry-modal-content" style={{ position: 'relative', margin: '5% auto', background: '#181A20', borderRadius: 12, maxWidth: 420, width: '100%', boxShadow: '0 8px 32px rgba(0,0,0,0.25)', padding: 0, display: 'flex', flexDirection: 'column' }}>
        <div className="modal-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.5rem 2rem 1rem 2rem' }}>
          <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700, color: '#4a90e2' }}>{title}</h2>
          <button onClick={onClose} className="modal-close" aria-label="Close modal" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginLeft: 16, zIndex: 2 }}>
            <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="create-entry-form" style={{ flex: 1, overflowY: 'auto', padding: '0 2rem 1rem 2rem' }}>
          {fields.map(field => (
            <div key={field.name} className="form-group" style={{ marginBottom: 20 }}>
              <label htmlFor={field.name} style={{ display: 'block', marginBottom: 6, color: '#fff', fontWeight: 500 }}>{field.label} {field.required && '*'}</label>
              {field.type === 'textarea' ? (
                <textarea
                  id={field.name}
                  name={field.name}
                  value={formData[field.name] || ''}
                  onChange={handleChange}
                  required={field.required}
                  placeholder={`Enter ${field.label.toLowerCase()}`}
                  style={{ width: '100%', minHeight: 60, borderRadius: 8, border: '1px solid #4a90e2', padding: 10, background: '#23262F', color: '#fff' }}
                />
              ) : field.type === 'select' && field.options ? (
                <select
                  id={field.name}
                  name={field.name}
                  value={formData[field.name] || ''}
                  onChange={handleChange}
                  required={field.required}
                  style={{ width: '100%', borderRadius: 8, border: '1px solid #4a90e2', padding: 10, background: '#23262F', color: '#fff' }}
                >
                  <option value="">Select {field.label}</option>
                  {field.options.map(option => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              ) : (
                <input
                  type={field.type}
                  id={field.name}
                  name={field.name}
                  value={formData[field.name] || ''}
                  onChange={handleChange}
                  required={field.required}
                  placeholder={`Enter ${field.label.toLowerCase()}`}
                  style={{ width: '100%', borderRadius: 8, border: '1px solid #4a90e2', padding: 10, background: '#23262F', color: '#fff' }}
                />
              )}
            </div>
          ))}

          {error && <div className="error-message" style={{ color: '#ff4d4f', marginBottom: 12 }}>{error}</div>}
        </div>
        <div className="modal-actions" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 2rem', borderTop: '1px solid #23262F', background: '#181A20', borderRadius: '0 0 12px 12px' }}>
          <button type="button" onClick={onClose} className="cancel-button" style={{ background: '#23262F', color: '#fff', border: 'none', borderRadius: 8, padding: '0.5rem 1.5rem', fontWeight: 500, cursor: 'pointer' }}>
            Cancel
          </button>
          <button 
            type="button" 
            className="submit-button" 
            style={{ background: '#4a90e2', color: '#fff', border: 'none', borderRadius: 8, padding: '0.5rem 1.5rem', fontWeight: 700, cursor: isSubmitting || !isFormValid() ? 'not-allowed' : 'pointer', opacity: isSubmitting || !isFormValid() ? 0.7 : 1 }}
            disabled={isSubmitting || !isFormValid()}
            onClick={handleSubmit}
          >
            {isSubmitting ? 'Creating...' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  );
} 
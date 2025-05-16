import { useState } from 'react';

interface Field {
  name: string;
  label: string;
  type: string;
  required: boolean;
}

interface CreateEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  fields: Field[];
  onSubmit: (data: any) => Promise<void>;
}

export default function CreateEntryModal({ isOpen, onClose, title, fields, onSubmit }: CreateEntryModalProps) {
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const isFormValid = () => {
    return fields.every(field => !field.required || formData[field.name]);
  };

  return (
    <div className="create-entry-modal-overlay">
      <div className="create-entry-modal-content">
        <div className="modal-header">
          <h2>{title}</h2>
          <button onClick={onClose} className="modal-close" aria-label="Close modal">
            <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="create-entry-form">
          {fields.map(field => (
            <div key={field.name} className="form-group">
              <label htmlFor={field.name}>{field.label} {field.required && '*'}</label>
              {field.type === 'textarea' ? (
                <textarea
                  id={field.name}
                  name={field.name}
                  value={formData[field.name] || ''}
                  onChange={handleChange}
                  required={field.required}
                  placeholder={`Enter ${field.label.toLowerCase()}`}
                />
              ) : (
                <input
                  type={field.type}
                  id={field.name}
                  name={field.name}
                  value={formData[field.name] || ''}
                  onChange={handleChange}
                  required={field.required}
                  placeholder={`Enter ${field.label.toLowerCase()}`}
                />
              )}
            </div>
          ))}

          {error && <div className="error-message">{error}</div>}

          <div className="modal-actions">
            <button type="button" onClick={onClose} className="cancel-button">
              Cancel
            </button>
            <button 
              type="button" 
              className="submit-button" 
              disabled={isSubmitting || !isFormValid()}
              onClick={handleSubmit}
            >
              {isSubmitting ? 'Creating...' : 'Create'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 
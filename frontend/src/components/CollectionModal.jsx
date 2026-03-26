import React, { useState, useEffect } from 'react';
import { FaFolder, FaTimes } from 'react-icons/fa';
import './Collections.css';

const CollectionModal = ({ isOpen, onClose, onSubmit, initialData }) => {
  const [formData, setFormData] = useState({
    name: '',
    description: ''
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setFormData({
          name: initialData.name || '',
          description: initialData.description || ''
        });
      } else {
        setFormData({
          name: '',
          description: ''
        });
      }

      setError(null);
      setSuccess(null);
    }
  }, [initialData, isOpen]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      if (!formData.name.trim()) {
        throw new Error('Collection name is required');
      }

      const submitData = { ...formData };
      await onSubmit(submitData, initialData);

      setSuccess('Collection saved successfully!');

      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err) {
      setError(err.message || 'Failed to save collection');
      console.error('Error saving collection:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="premium-modal-overlay" onClick={onClose}>
      <div className="premium-modal" onClick={(e) => e.stopPropagation()}>
        <div className="premium-modal-header">
          <div className="premium-modal-title">
            <div className="premium-modal-title-icon collection">
              <FaFolder />
            </div>
            <div>
              <h2>{initialData ? 'Edit Collection' : 'New Collection'}</h2>
              <div className="modal-subtitle">
                {initialData ? 'Update collection details' : 'Create a new financial collection'}
              </div>
            </div>
          </div>
          <button className="premium-modal-close" onClick={onClose}>
            <FaTimes />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="premium-modal-body">
            <div className="premium-form-group">
              <label className="premium-form-label">
                Collection Name
                <span className="required-dot"></span>
              </label>
              <input
                type="text"
                className="premium-form-input"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                disabled={loading}
                placeholder="Enter collection name"
                autoFocus
              />
            </div>

            <div className="premium-form-group">
              <label className="premium-form-label">
                Description
                <span className="label-hint">Optional</span>
              </label>
              <textarea
                className="premium-form-input"
                name="description"
                value={formData.description}
                onChange={handleChange}
                disabled={loading}
                placeholder="Describe the purpose of this collection..."
                rows="3"
              />
            </div>

            {(error || success) && (
              <div className={`premium-status-msg ${error ? 'error' : 'success'}`}>
                <span className="status-icon">{error ? '⚠️' : '✅'}</span>
                <span>{error || success}</span>
              </div>
            )}
          </div>

          <div className="premium-modal-footer">
            <button
              type="button"
              className="premium-btn cancel"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="premium-btn primary"
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="btn-spinner"></span>
                  {initialData ? 'Updating...' : 'Creating...'}
                </>
              ) : (
                initialData ? 'Update Collection' : 'Create Collection'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CollectionModal;
import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { subcollectionAPI } from '../api'
import { FaArrowLeft, FaPlus, FaRupeeSign, FaEdit, FaTrash, FaRedo, FaTimes, FaCalendarAlt } from 'react-icons/fa'
import DeleteConfirmModal from './DeleteConfirmModal'
import './Collections.css'

const Subcollections = ({
  subcollections,
  selectedCollection,
  setEditing,
  deleteItem,
  setSelectedSubcollection,
  handleEditSubcollection,
  handleAddSubcollection,
  loadDataForTab
}) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    year: new Date().getFullYear(),
    amount: '',
    due_date: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [subcollectionToDelete, setSubcollectionToDelete] = useState(null);
  const [editingSubcollection, setEditingSubcollection] = useState(null);

  const navigate = useNavigate();

  useEffect(() => {
    loadDataForTab('subcollections', false)
  }, [loadDataForTab])

  const handleSubcollectionClick = (subcollection) => {
    setSelectedSubcollection(subcollection)
    navigate('/obligations')
  }

  const handleReloadData = () => {
    loadDataForTab('subcollections', true)
  }

  const handleBack = () => {
    navigate('/collections')
  }

  const handleDeleteSubcollection = (subcollection) => {
    setSubcollectionToDelete(subcollection);
    setIsDeleteModalOpen(true);
  }

  const confirmDelete = async () => {
    if (subcollectionToDelete) {
      try {
        await deleteItem('subcollections', subcollectionToDelete.id)
        setIsDeleteModalOpen(false);
        setSubcollectionToDelete(null);
      } catch (error) {
        console.error('Failed to delete subcollection:', error)
        throw error;
      }
    }
  }

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    if (error) setError(null);
    if (success) setSuccess(null);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      if (!formData.name.trim()) {
        throw new Error('Subcollection name is required');
      }
      if (!formData.amount) {
        throw new Error('Amount is required');
      }

      const submissionData = {
        ...formData,
        due_date: formData.due_date || null,
        amount: parseFloat(formData.amount) || 0,
        collection: selectedCollection?.id
      };

      if (!submissionData.collection) {
        throw new Error('No parent collection selected');
      }

      if (editingSubcollection) {
        await subcollectionAPI.update(editingSubcollection.id, submissionData);
        setSuccess('Subcollection updated successfully!');
      } else {
        await subcollectionAPI.create(submissionData);
        setSuccess('Subcollection created successfully!');
      }

      setFormData({
        name: '',
        year: new Date().getFullYear(),
        amount: '',
        due_date: ''
      });
      setEditingSubcollection(null);
      setShowAddForm(false);
      loadDataForTab('subcollections', true);
    } catch (err) {
      setError(err.message || 'Failed to save subcollection');
      console.error('Error saving subcollection:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFormClose = () => {
    setShowAddForm(false);
    setEditingSubcollection(null);
    setFormData({
      name: '',
      year: new Date().getFullYear(),
      amount: '',
      due_date: ''
    });
    setError(null);
    setSuccess(null);
  };

  const handleEditClick = (subcollection) => {
    setEditingSubcollection(subcollection);
    setFormData({
      name: subcollection.name,
      year: subcollection.year,
      amount: subcollection.amount,
      due_date: subcollection.due_date || ''
    });
    setShowAddForm(true);
    setError(null);
    setSuccess(null);
  };

  const filteredSubcollections = subcollections.filter(
    sc => sc.collection === selectedCollection?.id
  );

  const formatDate = (dateStr) => {
    if (!dateStr) return null;
    try {
      return new Date(dateStr).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="data-section animate-in subcollections-page">
      <div className="section-header">
        <div className="header-content-wrapper">
          <button onClick={handleBack} className="back-btn" title="Back to Collections">
            <FaArrowLeft />
          </button>
          <h2>
            <div className="header-icon-wrapper">
              <FaRupeeSign />
            </div>
            {selectedCollection?.name || 'Subcollections'}
          </h2>
        </div>
        <div className="header-actions">
          <button onClick={handleReloadData} className="reload-btn" title="Reload Data">
            <FaRedo />
          </button>
          <button onClick={() => setShowAddForm(true)} className="btn-primary">
            + New Subcollection
          </button>
        </div>
      </div>

      {/* Premium Cards Grid */}
      <div className="subcollection-cards-grid">
        {filteredSubcollections.map(subcollection => (
          <div
            key={subcollection.id}
            className="coll-card"
            onClick={() => handleSubcollectionClick(subcollection)}
          >
            <div className="coll-card-body">
              <div className="coll-card-icon rupee">
                <FaRupeeSign />
              </div>
              <div className="coll-card-info">
                <div className="coll-card-name">{subcollection.name}</div>
                {subcollection.due_date && (
                  <div className="coll-card-desc">
                    Due: {formatDate(subcollection.due_date)}
                  </div>
                )}
              </div>
            </div>
            <div className="coll-card-meta">
              <span className="meta-chip year">{subcollection.year}</span>
              <span className="meta-chip amount">₹ {subcollection.amount}</span>
              {subcollection.due_date && (
                <span className="meta-chip due">
                  <FaCalendarAlt style={{ fontSize: '0.7rem' }} />
                  {formatDate(subcollection.due_date)}
                </span>
              )}
            </div>
            <div className="coll-card-actions">
              <button
                className="action-icon-btn edit"
                title="Edit"
                onClick={(e) => {
                  e.stopPropagation()
                  handleEditClick(subcollection)
                }}
              >
                <FaEdit />
              </button>
              <button
                className="action-icon-btn delete"
                title="Delete"
                onClick={(e) => {
                  e.stopPropagation()
                  handleDeleteSubcollection(subcollection)
                }}
              >
                <FaTrash />
              </button>
            </div>
          </div>
        ))}

        {/* Add Card */}
        <div className="coll-add-card" onClick={() => setShowAddForm(true)}>
          <div className="coll-add-card-icon">
            <FaPlus />
          </div>
          <div className="coll-add-card-text">New Period</div>
        </div>
      </div>

      {filteredSubcollections.length === 0 && (
        <div className="coll-empty-state">
          <div className="coll-empty-state-icon">💰</div>
          <p>No subcollections yet. Create a new period to start tracking obligations.</p>
        </div>
      )}

      {/* Premium Modal */}
      {showAddForm && (
        <div className="premium-modal-overlay" onClick={handleFormClose}>
          <div className="premium-modal" onClick={(e) => e.stopPropagation()}>
            <div className="premium-modal-header">
              <div className="premium-modal-title">
                <div className="premium-modal-title-icon subcollection">
                  <FaRupeeSign />
                </div>
                <div>
                  <h2>{editingSubcollection ? 'Edit Subcollection' : 'New Subcollection'}</h2>
                  <div className="modal-subtitle">
                    {editingSubcollection
                      ? `Editing "${editingSubcollection.name}"`
                      : `Under: ${selectedCollection?.name || 'Collection'}`
                    }
                  </div>
                </div>
              </div>
              <button className="premium-modal-close" onClick={handleFormClose}>
                <FaTimes />
              </button>
            </div>

            <form onSubmit={handleFormSubmit}>
              <div className="premium-modal-body">
                <div className="premium-form-group">
                  <label className="premium-form-label">
                    Subcollection Name
                    <span className="required-dot"></span>
                  </label>
                  <input
                    type="text"
                    className="premium-form-input"
                    name="name"
                    value={formData.name}
                    onChange={handleFormChange}
                    required
                    disabled={loading}
                    placeholder="e.g. Monthly Dues January"
                    autoFocus
                  />
                </div>

                <div className="premium-form-row">
                  <div className="premium-form-group">
                    <label className="premium-form-label">
                      Year
                      <span className="required-dot"></span>
                    </label>
                    <input
                      type="number"
                      className="premium-form-input"
                      name="year"
                      value={formData.year}
                      onChange={handleFormChange}
                      required
                      disabled={loading}
                      min="2000"
                      max="2100"
                    />
                  </div>

                  <div className="premium-form-group">
                    <label className="premium-form-label">
                      Amount (₹)
                      <span className="required-dot"></span>
                    </label>
                    <input
                      type="number"
                      className="premium-form-input"
                      name="amount"
                      value={formData.amount}
                      onChange={handleFormChange}
                      required
                      disabled={loading}
                      placeholder="0.00"
                      min="0"
                      step="0.01"
                    />
                  </div>
                </div>

                <div className="premium-form-group">
                  <label className="premium-form-label">
                    Due Date
                    <span className="label-hint">Optional</span>
                  </label>
                  <input
                    type="date"
                    className="premium-form-input"
                    name="due_date"
                    value={formData.due_date}
                    onChange={handleFormChange}
                    disabled={loading}
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
                  onClick={handleFormClose}
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
                      Saving...
                    </>
                  ) : (
                    editingSubcollection ? 'Update Subcollection' : 'Create Subcollection'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <DeleteConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={confirmDelete}
        item={subcollectionToDelete}
        itemType="subcollections"
      />
    </div>
  )
}

export default Subcollections
import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { collectionAPI } from '../api'
import { FaFolder, FaPlus, FaEdit, FaTrash, FaRedo, FaTimes } from 'react-icons/fa'
import DeleteConfirmModal from './DeleteConfirmModal'
import './Collections.css'

const Collections = ({
  collections,
  setEditing,
  deleteItem,
  setSelectedCollection,
  loadDataForTab
}) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({ name: '', description: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [collectionToDelete, setCollectionToDelete] = useState(null);
  const [editingCollection, setEditingCollection] = useState(null);

  const navigate = useNavigate();

  useEffect(() => {
    loadDataForTab('collections', false)
  }, [loadDataForTab])

  const handleCollectionClick = (collection) => {
    setSelectedCollection(collection)
    navigate('/subcollections')
  }

  const handleReloadData = () => {
    loadDataForTab('collections', true)
  }

  const handleDeleteCollection = (collection) => {
    setCollectionToDelete(collection);
    setIsDeleteModalOpen(true);
  }

  const confirmDelete = async () => {
    if (collectionToDelete) {
      try {
        await deleteItem('collections', collectionToDelete.id)
        setIsDeleteModalOpen(false);
        setCollectionToDelete(null);
      } catch (error) {
        console.error('Failed to delete collection:', error)
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
        throw new Error('Collection name is required');
      }

      if (editingCollection) {
        await collectionAPI.update(editingCollection.id, formData);
        setSuccess('Collection updated successfully!');
      } else {
        await collectionAPI.create(formData);
        setSuccess('Collection created successfully!');
      }

      setFormData({ name: '', description: '' });
      setEditingCollection(null);
      setShowAddForm(false);
      loadDataForTab('collections', true);
    } catch (err) {
      setError(err.message || 'Failed to save collection');
      console.error('Error saving collection:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFormClose = () => {
    setShowAddForm(false);
    setEditingCollection(null);
    setFormData({ name: '', description: '' });
    setError(null);
    setSuccess(null);
  };

  const handleEditClick = (collection) => {
    setEditingCollection(collection);
    setFormData({
      name: collection.name,
      description: collection.description || ''
    });
    setShowAddForm(true);
    setError(null);
    setSuccess(null);
  };

  return (
    <div className="data-section animate-in collections-page">
      <div className="section-header">
        <h2>
          <div className="header-icon-wrapper">
            <FaFolder />
          </div>
          Collections
        </h2>
        <div className="header-actions">
          <button onClick={handleReloadData} className="reload-btn" title="Reload Data">
            <FaRedo />
          </button>
          <button onClick={() => setShowAddForm(true)} className="btn-primary">
            + Create New Collection
          </button>
        </div>
      </div>

      {/* Premium Cards Grid */}
      <div className="collection-cards-grid">
        {collections.map(collection => (
          <div
            key={collection.id}
            className="coll-card"
            onClick={() => handleCollectionClick(collection)}
          >
            <div className="coll-card-body">
              <div className="coll-card-icon folder">
                <FaFolder />
              </div>
              <div className="coll-card-info">
                <div className="coll-card-name">{collection.name}</div>
                {collection.description && (
                  <div className="coll-card-desc">{collection.description}</div>
                )}
              </div>
            </div>
            <div className="coll-card-actions">
              <button
                className="action-icon-btn edit"
                title="Edit"
                onClick={(e) => {
                  e.stopPropagation()
                  handleEditClick(collection)
                }}
              >
                <FaEdit />
              </button>
              <button
                className="action-icon-btn delete"
                title="Delete"
                onClick={(e) => {
                  e.stopPropagation()
                  handleDeleteCollection(collection)
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
          <div className="coll-add-card-text">New Collection</div>
        </div>
      </div>

      {collections.length === 0 && (
        <div className="coll-empty-state">
          <div className="coll-empty-state-icon">📂</div>
          <p>No collections yet. Create your first collection to start organizing finances.</p>
        </div>
      )}

      {/* Premium Modal */}
      {showAddForm && (
        <div className="premium-modal-overlay" onClick={handleFormClose}>
          <div className="premium-modal" onClick={(e) => e.stopPropagation()}>
            <div className="premium-modal-header">
              <div className="premium-modal-title">
                <div className="premium-modal-title-icon collection">
                  <FaFolder />
                </div>
                <div>
                  <h2>{editingCollection ? 'Edit Collection' : 'New Collection'}</h2>
                  <div className="modal-subtitle">
                    {editingCollection ? 'Update details for this collection' : 'Create a new financial collection'}
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
                    Collection Name
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
                    placeholder="e.g. Annual Fund 2024"
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
                    onChange={handleFormChange}
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
                    editingCollection ? 'Update Collection' : 'Create Collection'
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
        item={collectionToDelete}
        itemType="collections"
      />
    </div>
  )
}

export default Collections
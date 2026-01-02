import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { collectionAPI } from '../api'
import { FaFolder, FaPlus, FaEdit, FaTrash, FaRedo, FaTimes } from 'react-icons/fa'

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
  
  const navigate = useNavigate();

  // Load collections data on initial mount
  useEffect(() => {
    loadDataForTab('collections', false)
  }, [loadDataForTab])

  const handleCollectionClick = (collection) => {
    setSelectedCollection(collection)
    navigate('/subcollections')
  }

  const handleOpenCollection = (collection, e) => {
    e.stopPropagation()
    setSelectedCollection(collection)
    navigate('/subcollections')
  }

  const handleReloadData = () => {
    loadDataForTab('collections', true) // Force reload
  }

  const handleDeleteCollection = async (collection) => {
    if (window.confirm(`Are you sure you want to delete the collection "${collection.name}"? This will also delete all associated subcollections and obligations.`)) {
      try {
        await deleteItem('collections', collection.id)
      } catch (error) {
        console.error('Failed to delete collection:', error)
        alert('Failed to delete collection. Please try again.')
      }
    }
  }

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error when user starts typing
    if (error) setError(null);
    if (success) setSuccess(null);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      // Validate required fields
      if (!formData.name.trim()) {
        throw new Error('Collection name is required');
      }
      
      if (editingCollection) {
        // Update existing collection
        await collectionAPI.update(editingCollection.id, formData);
        setSuccess('Collection updated successfully!');
      } else {
        // Create new collection
        await collectionAPI.create(formData);
        setSuccess('Collection created successfully!');
      }
      
      // Reset form
      setFormData({ name: '', description: '' });
      setEditingCollection(null);
      setShowAddForm(false);
      
      // Reload collections
      loadDataForTab('collections', true);
    } catch (err) {
      setError(err.message || 'Failed to save collection');
      console.error('Error saving collection:', err);
    } finally {
      setLoading(false);
    }
  };

  const [editingCollection, setEditingCollection] = useState(null);

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

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      // Validate required fields
      if (!formData.name.trim()) {
        throw new Error('Collection name is required');
      }
      
      // Update the collection
      await collectionAPI.update(editingCollection.id, formData);
      
      // Reset form
      setFormData({ name: '', description: '' });
      setEditingCollection(null);
      setShowAddForm(false);
      setSuccess('Collection updated successfully!');
      
      // Reload collections
      loadDataForTab('collections', true);
    } catch (err) {
      setError(err.message || 'Failed to update collection');
      console.error('Error updating collection:', err);
    } finally {
      setLoading(false);
    }
  };



  return (
    <div className="data-section">
      <div className="section-header">
        <h2><FaFolder /> Collections</h2>
        <div className="header-actions">
          <button onClick={handleReloadData} className="reload-btn">
            <FaRedo /> Reload
          </button>
          <button onClick={() => setShowAddForm(true)} className="add-btn">
            <FaPlus /> Add New Collection
          </button>
        </div>
        
        {/* Collection Form Modal */}
        {showAddForm && (
          <div className="modal-overlay">
            <div className="modal-content">
              <div className="modal-header">
                <h2><FaFolder /> {editingCollection ? 'Edit Collection' : 'Add New Collection'}</h2>
                <button className="close-btn" onClick={handleFormClose}>×</button>
              </div>
              <form onSubmit={handleFormSubmit}>
                <div className="form-group">
                  <label htmlFor="collectionName">Collection Name *</label>
                  <input
                    type="text"
                    id="collectionName"
                    name="name"
                    value={formData.name}
                    onChange={handleFormChange}
                    required
                    disabled={loading}
                    placeholder="Enter collection name"
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="collectionDescription">Description</label>
                  <textarea
                    id="collectionDescription"
                    name="description"
                    value={formData.description}
                    onChange={handleFormChange}
                    disabled={loading}
                    placeholder="Enter collection description (optional)"
                    rows="3"
                  />
                </div>
                
                {(error || success) && (
                  <div className={`status-message ${error ? 'error' : 'success'}`}>
                    {error || success}
                  </div>
                )}
                
                <div className="form-actions">
                  <button 
                    type="button" 
                    className="cancel-btn" 
                    onClick={handleFormClose}
                    disabled={loading}
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="save-btn"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <span className="spinner"></span>
                        {editingCollection ? 'Updating...' : 'Creating...'}
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
      </div>
      
      <div className="collection-cards-container">
        {collections.map(collection => (
          <div 
            key={collection.id} 
            className="collection-card"
          >
            <div className="collection-card-icon">
              <FaFolder />
            </div>
            <div className="collection-card-name">
              {collection.name}
            </div>
            <div className="collection-card-actions">
              <button 
                className="open-btn"
                onClick={(e) => handleOpenCollection(collection, e)}
              >
                Open
              </button>
              <button 
                className="edit-btn"
                onClick={(e) => {
                  e.stopPropagation()
                  handleEditClick(collection)
                }}
              >
                <FaEdit /> Edit
              </button>
              <button 
                className="delete-btn"
                onClick={(e) => {
                  e.stopPropagation()
                  handleDeleteCollection(collection)
                }}
              >
                <FaTrash /> Delete
              </button>
            </div>
            <div 
              className="collection-card-overlay"
              onClick={() => handleCollectionClick(collection)}
            ></div>
          </div>
        ))}
        
        {/* Add New Collection Card */}
        <div 
          className="add-btn-card"
          onClick={() => setShowAddForm(true)}
        >
          <div className="add-btn-card-icon">
            <FaPlus />
          </div>
          <div className="add-btn-card-text">
            Add New Collection
          </div>
        </div>
      </div>
      
      {collections.length === 0 && (
        <div className="empty-state">
          <p>No collections found. Add a new collection to get started.</p>
        </div>
      )}
    </div>
  )
}

export default Collections
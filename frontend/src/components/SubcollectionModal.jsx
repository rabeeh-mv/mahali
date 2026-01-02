import React, { useState, useEffect } from 'react';
import { memberAPI, areaAPI } from '../api';
import { FaClipboard, FaSearch, FaTimes, FaFilter } from 'react-icons/fa';

const SubcollectionModal = ({ isOpen, onClose, onSubmit, initialData, selectedCollection, collections }) => {
  const [formData, setFormData] = useState({
    name: '',
    year: new Date().getFullYear(),
    amount: '',
    due_date: '',
    collection: selectedCollection?.id || ''
  });
  
  const [members, setMembers] = useState([]);
  const [areas, setAreas] = useState([]);
  const [filteredMembers, setFilteredMembers] = useState([]);
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedArea, setSelectedArea] = useState('');
  const [birthYear, setBirthYear] = useState('');
  const [guardianFilter, setGuardianFilter] = useState(''); // '' for all, 'true' for guardian, 'false' for non-guardian

  useEffect(() => {
    if (isOpen) {
      // Load members and areas when modal opens
      loadMembers();
      loadAreas();
      
      if (initialData) {
        setFormData({
          name: initialData.name || '',
          year: initialData.year || new Date().getFullYear(),
          amount: initialData.amount || '',
          due_date: initialData.due_date || '',
          collection: initialData.collection?.id || selectedCollection?.id || ''
        });
        
        // If editing, load existing member obligations
        if (initialData.obligations) {
          setSelectedMembers(initialData.obligations.map(ob => ob.member?.member_id || ob.member));
        }
      } else {
        setFormData({
          name: '',
          year: new Date().getFullYear(),
          amount: '',
          due_date: '',
          collection: selectedCollection?.id || ''
        });
        setSelectedMembers([]);
      }
      
      // Reset status messages when modal opens
      setError(null);
      setSuccess(null);
      setSearchTerm('');
      setSelectedArea('');
      setBirthYear('');
    }
  }, [initialData, selectedCollection, isOpen]);

  const loadMembers = async () => {
    try {
      const response = await memberAPI.getAll();
      setMembers(response.data);
      setFilteredMembers(response.data);
    } catch (err) {
      console.error('Failed to load members:', err);
    }
  };

  const loadAreas = async () => {
    try {
      const response = await areaAPI.getAll();
      setAreas(response.data);
    } catch (err) {
      console.error('Failed to load areas:', err);
    }
  };

  const applyFilters = () => {
    let filtered = members;
    
    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(member => 
        member.name && member.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // Apply area filter
    if (selectedArea) {
      filtered = filtered.filter(member => 
        member.house && member.house.area && member.house.area.id === selectedArea
      );
    }
    
    // Apply birth year filter
    if (birthYear) {
      filtered = filtered.filter(member => 
        member.date_of_birth && new Date(member.date_of_birth).getFullYear() == birthYear
      );
    }
    
    // Apply guardian filter
    if (guardianFilter !== '') {
      filtered = filtered.filter(member => 
        String(member.isGuardian) === guardianFilter
      );
    }
    
    // Only show live members
    filtered = filtered.filter(member => member.status === 'live');
    
    setFilteredMembers(filtered);
  };

  useEffect(() => {
    if (isOpen) {
      applyFilters();
    }
  }, [searchTerm, selectedArea, birthYear, guardianFilter, members, isOpen]);

  const handleMemberSelect = (memberId) => {
    if (selectedMembers.includes(memberId)) {
      setSelectedMembers(selectedMembers.filter(id => id !== memberId));
    } else {
      setSelectedMembers([...selectedMembers, memberId]);
    }
  };

  // Select all filtered members
  const handleSelectAllFiltered = () => {
    const filteredMemberIds = filteredMembers.map(member => member.member_id);
    setSelectedMembers(filteredMemberIds);
  };

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
      // Prepare data for submission
      const submitData = { ...formData };
      
      // Ensure collection is included
      if (!submitData.collection && selectedCollection?.id) {
        submitData.collection = selectedCollection.id;
      }
      
      // Call the onSubmit function with both subcollection data and selected members
      await onSubmit(submitData, selectedMembers, initialData);
      
      setSuccess('Subcollection saved successfully!');
      
      // Close modal after a short delay
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err) {
      setError(err.response?.data?.detail || err.response?.data?.message || err.response?.data || 'Failed to save subcollection');
      console.error('Error saving subcollection:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content modal-content-wide">
        <div className="modal-header">
          <h2><FaClipboard /> {initialData ? 'Edit Subcollection' : 'Add New Subcollection'}</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="name">Subcollection Name *</label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              disabled={loading}
              placeholder="Enter subcollection name"
            />
          </div>
          
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="year">Year *</label>
              <input
                type="number"
                id="year"
                name="year"
                value={formData.year}
                onChange={handleChange}
                required
                disabled={loading}
                min="2000"
                max="2100"
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="amount">Amount (₹) *</label>
              <input
                type="number"
                id="amount"
                name="amount"
                value={formData.amount}
                onChange={handleChange}
                required
                disabled={loading}
                min="0"
                step="0.01"
              />
            </div>
          </div>
          
          <div className="form-group">
            <label htmlFor="due_date">Due Date</label>
            <input
              type="date"
              id="due_date"
              name="due_date"
              value={formData.due_date}
              onChange={handleChange}
              disabled={loading}
            />
          </div>
          
          {/* Member Selection Section */}
          <div className="section-header">
            <h3>Select Members for this Subcollection</h3>
          </div>
          
          {/* Filters */}
          <div className="filter-section">
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="search"><FaSearch /> Search Members</label>
                <input
                  type="text"
                  id="search"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by name..."
                  disabled={loading}
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="area"><FaFilter /> Filter by Area</label>
                <select
                  id="area"
                  value={selectedArea}
                  onChange={(e) => setSelectedArea(e.target.value)}
                  disabled={loading}
                >
                  <option value="">All Areas</option>
                  {areas.map(area => (
                    <option key={area.id} value={area.id}>{area.name}</option>
                  ))}
                </select>
              </div>
              
              <div className="form-group">
                <label htmlFor="birthYear"><FaFilter /> Filter by Birth Year</label>
                <input
                  type="number"
                  id="birthYear"
                  value={birthYear}
                  onChange={(e) => setBirthYear(e.target.value)}
                  placeholder="Enter birth year"
                  disabled={loading}
                  min="1900"
                  max={new Date().getFullYear()}
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="guardian-filter">Filter by Guardian</label>
                <select
                  id="guardian-filter"
                  value={guardianFilter}
                  onChange={(e) => setGuardianFilter(e.target.value)}
                  className="filter-select"
                  disabled={loading}
                >
                  <option value="">All Members</option>
                  <option value="true">Guardians Only</option>
                  <option value="false">Non-Guardians Only</option>
                </select>
              </div>
            </div>
            
            {/* Select All Filtered Button */}
            <div className="form-group">
              <button 
                type="button" 
                className="select-all-btn"
                onClick={handleSelectAllFiltered}
                disabled={loading || filteredMembers.length === 0}
              >
                Select All Filtered Members ({filteredMembers.length})
              </button>
            </div>
          </div>
          
          {/* Member List */}
          <div className="member-selection-container">
            <div className="member-list-header">
              <div>Selected: {selectedMembers.length} members</div>
            </div>
            
            <div className="member-list">
              {filteredMembers.length > 0 ? (
                filteredMembers.map(member => (
                  <div 
                    key={member.member_id} 
                    className={`member-item ${selectedMembers.includes(member.member_id) ? 'selected' : ''}`}
                    onClick={() => handleMemberSelect(member.member_id)}
                  >
                    <div className="member-info">
                      <div className="member-name">{member.name || 'Unknown Member'}</div>
                      <div className="member-details">
                        ID: #{member.member_id} | 
                        House: {member.house?.house_name || 'N/A'} | 
                        Area: {member.house?.area?.name || 'N/A'} | 
                        DOB: {member.date_of_birth ? new Date(member.date_of_birth).getFullYear() : 'N/A'}
                      </div>
                    </div>
                    <div className="selection-indicator">
                      {selectedMembers.includes(member.member_id) ? '✓ Selected' : '○ Click to Select'}
                    </div>
                  </div>
                ))
              ) : (
                <div className="no-members">No members found matching the current filters</div>
              )}
            </div>
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
              onClick={onClose}
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
                  {initialData ? 'Updating...' : 'Creating...'}
                </>
              ) : (
                initialData ? 'Update Subcollection' : 'Create Subcollection'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SubcollectionModal;
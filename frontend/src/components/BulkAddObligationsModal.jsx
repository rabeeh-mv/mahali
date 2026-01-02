import React, { useState, useEffect } from 'react';
import { FaSearch, FaUsers, FaArrowLeft, FaTimes } from 'react-icons/fa';
import { memberAPI, obligationAPI } from '../api';

const BulkAddObligationsModal = ({ 
  isOpen, 
  onClose, 
  selectedSubcollection, 
  areas, 
  loadDataForTab 
}) => {
  const [loading, setLoading] = useState(false);
  const [members, setMembers] = useState([]);
  const [filteredMembers, setFilteredMembers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedArea, setSelectedArea] = useState('');
  const [selectedGuardian, setSelectedGuardian] = useState('');
  const [amount, setAmount] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [selectAll, setSelectAll] = useState(false);

  // Load members when modal opens
  useEffect(() => {
    if (isOpen) {
      loadMembers();
      setError('');
      setSuccess('');
      setAmount('');
      setSelectedMembers([]);
      setSelectAll(false);
      setSearchTerm('');
      setSelectedArea('');
      setSelectedGuardian('');
    }
  }, [isOpen]);

  // Filter members when search terms change
  useEffect(() => {
    if (members.length > 0) {
      filterMembers();
    }
  }, [searchTerm, selectedArea, selectedGuardian]);

  const loadMembers = async () => {
    try {
      const response = await memberAPI.getAll();
      setMembers(response.data);
      setFilteredMembers(response.data);
    } catch (error) {
      console.error('Failed to load members:', error);
      setError('Failed to load members');
    }
  };

  const filterMembers = () => {
    let filtered = members;
    
    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(member =>
        member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        member.id.toString().includes(searchTerm)
      );
    }
    
    // Filter by area
    if (selectedArea) {
      filtered = filtered.filter(member => 
        member.house && member.house.area && member.house.area.id === selectedArea
      );
    }
    
    // Filter by guardian status
    if (selectedGuardian !== '') {
      filtered = filtered.filter(member => 
        member.isguardian === (selectedGuardian === 'true')
      );
    }
    
    setFilteredMembers(filtered);
    // Reset selection when filters change
    setSelectedMembers([]);
    setSelectAll(false);
  };

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedMembers([]);
    } else {
      setSelectedMembers(filteredMembers.map(member => member.id));
    }
    setSelectAll(!selectAll);
  };

  const handleSelectMember = (memberId) => {
    if (selectedMembers.includes(memberId)) {
      setSelectedMembers(selectedMembers.filter(id => id !== memberId));
    } else {
      setSelectedMembers([...selectedMembers, memberId]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!amount || parseFloat(amount) <= 0) {
      setError('Amount is required and must be greater than 0');
      return;
    }
    
    if (selectedMembers.length === 0) {
      setError('Please select at least one member');
      return;
    }
    
    if (!selectedSubcollection) {
      setError('No subcollection selected');
      return;
    }
    
    try {
      setLoading(true);
      setError('');
      
      // Prepare bulk create data
      const obligationsData = selectedMembers.map(memberId => ({
        member: memberId,
        subcollection: selectedSubcollection.id,
        amount: parseFloat(amount),
        paid_status: 'pending'
      }));
      
      // Use bulk create API to create all obligations at once
      await obligationAPI.bulkCreate({ obligations: obligationsData });
      
      setSuccess(`Successfully created ${selectedMembers.length} obligations!`);
      
      // Reload obligations data
      if (loadDataForTab) {
        await loadDataForTab('obligations', true);
      }
      
      // Clear form after successful submission
      setTimeout(() => {
        onClose();
      }, 1500);
      
    } catch (error) {
      console.error('Failed to create bulk obligations:', error);
      setError(error.message || 'Failed to create obligations');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content large-modal">
        <div className="modal-header">
          <h2><FaUsers /> Bulk Add Obligations</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="bulk-add-amount">Amount (₹) *</label>
            <input
              type="number"
              id="bulk-add-amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
              min="0"
              step="0.01"
              placeholder="Enter amount for each obligation"
              disabled={loading}
            />
          </div>
          
          {/* Search and Filters */}
          <div className="filter-section">
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="bulk-add-search"><FaSearch /> Search Members</label>
                <input
                  type="text"
                  id="bulk-add-search"
                  placeholder="Search by name or ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="search-input"
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="bulk-add-area-filter">Area</label>
                <select
                  id="bulk-add-area-filter"
                  value={selectedArea}
                  onChange={(e) => setSelectedArea(e.target.value)}
                  className="filter-select"
                >
                  <option value="">All Areas</option>
                  {areas.map(area => (
                    <option key={area.id} value={area.id}>{area.name}</option>
                  ))}
                </select>
              </div>
              
              <div className="form-group">
                <label htmlFor="bulk-add-guardian-filter">Guardian</label>
                <select
                  id="bulk-add-guardian-filter"
                  value={selectedGuardian}
                  onChange={(e) => setSelectedGuardian(e.target.value)}
                  className="filter-select"
                >
                  <option value="">All Members</option>
                  <option value="true">Guardians Only</option>
                  <option value="false">Non-Guardians Only</option>
                </select>
              </div>
            </div>
          </div>
          
          {/* Member Selection Table */}
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th width="50">
                    <input
                      type="checkbox"
                      checked={selectAll}
                      onChange={handleSelectAll}
                    />
                  </th>
                  <th>Member</th>
                  <th>Area</th>
                  <th>Guardian</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredMembers.length > 0 ? (
                  filteredMembers.map(member => (
                    <tr key={member.id}>
                      <td>
                        <input
                          type="checkbox"
                          checked={selectedMembers.includes(member.id)}
                          onChange={() => handleSelectMember(member.id)}
                        />
                      </td>
                      <td>{member.name}</td>
                      <td>{member.house?.area?.name || 'N/A'}</td>
                      <td>{member.isguardian ? 'Yes' : 'No'}</td>
                      <td>
                        <button 
                          type="button" 
                          className="view-btn"
                          onClick={() => {
                            // This could navigate to member details if needed
                          }}
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" className="empty-state">
                      {searchTerm || selectedArea || selectedGuardian ? 'No members match your search' : 'No members found'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          
          <div className="form-info">
            <p>Selected members: {selectedMembers.length}</p>
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
              disabled={loading || selectedMembers.length === 0}
            >
              {loading ? (
                <span>
                  <span className="spinner"></span>
                  Creating...
                </span>
              ) : (
                `Create ${selectedMembers.length} Obligations`
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default BulkAddObligationsModal;
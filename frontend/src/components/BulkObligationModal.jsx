import React, { useState, useEffect } from 'react';
import { memberAPI, obligationAPI } from '../api';
import { FaMoneyBill, FaSearch, FaTimes, FaPlus, FaMinus } from 'react-icons/fa';

const BulkObligationModal = ({ isOpen, onClose, onSubmit, selectedSubcollection, existingObligations = [] }) => {
  const [members, setMembers] = useState([]);
  const [filteredMembers, setFilteredMembers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [guardianFilter, setGuardianFilter] = useState(''); // '' for all, 'true' for guardian, 'false' for non-guardian
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [selectAllFiltered, setSelectAllFiltered] = useState(false);
  const [existingMemberIds, setExistingMemberIds] = useState([]);

  useEffect(() => {
    if (isOpen) {
      loadMembers();
      // Set existing member IDs from existing obligations
      const existingIds = existingObligations.map(ob => ob.member?.member_id).filter(id => id);
      setExistingMemberIds(existingIds);
      setSelectedMembers([]);
      setSearchTerm('');
      setSelectAllFiltered(false);
      setError(null);
      setSuccess(null);
    }
  }, [isOpen, existingObligations]);

  const loadMembers = async () => {
    try {
      const response = await memberAPI.getAll();
      setMembers(response.data);
      setFilteredMembers(response.data);
    } catch (err) {
      console.error('Failed to load members:', err);
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
  }, [searchTerm, guardianFilter, members, isOpen]);

  const handleMemberSelect = (memberId) => {
    // Don't allow selection of already added members
    if (existingMemberIds.includes(memberId)) {
      return;
    }
    
    if (selectedMembers.includes(memberId)) {
      setSelectedMembers(selectedMembers.filter(id => id !== memberId));
    } else {
      setSelectedMembers([...selectedMembers, memberId]);
    }
  };

  const handleSelectAllFiltered = () => {
    if (selectAllFiltered) {
      // Deselect all filtered members
      const newSelected = selectedMembers.filter(id => 
        !filteredMembers.some(member => member.member_id === id)
      );
      setSelectedMembers(newSelected);
    } else {
      // Select all filtered members (avoid duplicates and exclude existing members)
      const newSelected = [...selectedMembers];
      filteredMembers.forEach(member => {
        // Skip if already selected, already exists, or not live
        if (!newSelected.includes(member.member_id) && 
            !existingMemberIds.includes(member.member_id) && 
            member.status === 'live') {
          newSelected.push(member.member_id);
        }
      });
      setSelectedMembers(newSelected);
    }
    setSelectAllFiltered(!selectAllFiltered);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      if (selectedMembers.length === 0) {
        throw new Error('Please select at least one member');
      }
      
      if (!selectedSubcollection) {
        throw new Error('No subcollection selected');
      }
      
      // Prepare data for bulk submission
      const obligationsData = selectedMembers.map(memberId => ({
        member: memberId,
        subcollection: selectedSubcollection.id,
        amount: selectedSubcollection.amount,
        paid_status: 'pending'
      }));
      
      // Call the onSubmit function
      await onSubmit({ obligations: obligationsData });
      
      setSuccess(`Successfully created ${selectedMembers.length} obligations!`);
      
      // Close modal after a short delay
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err) {
      setError(err.message || 'Failed to create obligations');
      console.error('Error creating obligations:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content modal-content-wide">
        <div className="modal-header">
          <h2><FaMoneyBill /> Create Bulk Obligations</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-row">
            {/* Member Selection - Full Height with Scroll */}
            <div className="form-group member-selection-section">
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
                <label htmlFor="guardian-filter">Guardian Filter</label>
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
              
              <div className="bulk-selection-controls">
                <button 
                  type="button" 
                  className="select-all-btn"
                  onClick={handleSelectAllFiltered}
                  disabled={filteredMembers.length === 0}
                >
                  {selectAllFiltered ? 'Deselect All Filtered' : 'Select All Filtered'} ({filteredMembers.length})
                </button>
              </div>
              
              <div className="member-list-scrollable">
                {filteredMembers.length > 0 ? (
                  filteredMembers.map(member => {
                    const isExisting = existingMemberIds.includes(member.member_id);
                    const isSelected = selectedMembers.includes(member.member_id);
                    const isDisabled = isExisting || member.status !== 'live';
                    
                    return (
                      <div 
                        key={member.member_id} 
                        className={`member-item ${isSelected ? 'selected' : ''} ${isDisabled ? 'disabled' : ''}`}
                        onClick={() => !isDisabled && handleMemberSelect(member.member_id)}
                      >
                        <div className="member-info">
                          <div className="member-name">{member.name || 'Unknown Member'}</div>
                          <div className="member-details">
                            ID: #{member.member_id} | 
                            House: {member.house?.house_name || 'N/A'} |
                            Status: {member.status}
                          </div>
                        </div>
                        <div className="selection-indicator">
                          {isExisting ? '✓ Already Added' : 
                           isSelected ? '✓ Selected' : 
                           isDisabled ? '○ Disabled' : '○ Click to Select'}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="no-members">No members found matching the current search</div>
                )}
              </div>
            </div>
            
            {/* Selected Members and Submit Section */}
            <div className="form-group obligation-details-section">
              <div className="form-group">
                <label>Selected Members ({selectedMembers.length})</label>
                <div className="selected-members-list">
                  {selectedMembers.length > 0 ? (
                    selectedMembers.map(memberId => {
                      const member = members.find(m => m.member_id === memberId);
                      return (
                        <div key={memberId} className="selected-member-item">
                          <span>{member?.name || memberId}</span>
                          <button 
                            type="button" 
                            className="remove-member-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMemberSelect(memberId);
                            }}
                          >
                            <FaMinus />
                          </button>
                        </div>
                      );
                    })
                  ) : (
                    <div className="no-selected-members">No members selected</div>
                  )}
                </div>
              </div>
              
              <div className="form-group">
                <label>Subcollection Details</label>
                <div className="subcollection-info">
                  <div><strong>Name:</strong> {selectedSubcollection?.name}</div>
                  <div><strong>Year:</strong> {selectedSubcollection?.year}</div>
                  <div><strong>Amount:</strong> ₹{selectedSubcollection?.amount}</div>
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
                  disabled={loading || selectedMembers.length === 0}
                >
                  {loading ? (
                    <>
                      <span className="spinner"></span>
                      Creating {selectedMembers.length} Obligations...
                    </>
                  ) : (
                    <>
                      <FaPlus /> Create {selectedMembers.length} Obligations
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default BulkObligationModal;
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
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(member =>
        (member.name && member.name.toLowerCase().includes(term)) ||
        (member.surname && member.surname.toLowerCase().includes(term)) ||
        (member.member_id && member.member_id.toString().includes(term)) ||
        (member.id && member.id.toString().includes(term))
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
      <div className="modal-content large-modal animate-in">
        <div className="modal-header">
          <h2>
            <div className="header-icon-wrapper">
              <FaUsers />
            </div>
            Bulk Add Obligations
          </h2>
          <button className="close-btn" onClick={onClose}><FaTimes /></button>
        </div>


        <form onSubmit={handleSubmit} className="modal-body">
          <div className="input-wrapper">
            <label htmlFor="bulk-add-amount">Amount per Responsibility (₹) *</label>
            <input
              type="number"
              id="bulk-add-amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
              min="0"
              step="0.01"
              placeholder="0.00"
              disabled={loading}
              style={{ fontSize: '1.4rem', fontWeight: 'bold' }}
            />
          </div>


          {/* Search and Filters */}
          <div className="filter-section" style={{ background: 'var(--header-bg)', padding: '20px', borderRadius: '16px', marginBottom: '24px' }}>
            <div className="form-row">
              <div className="input-wrapper">
                <label htmlFor="bulk-add-search"><FaSearch /> Search</label>
                <input
                  type="text"
                  id="bulk-add-search"
                  placeholder="Search ID, Name or Surname..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <div className="input-wrapper">
                <label htmlFor="bulk-add-area-filter">Area</label>
                <select
                  id="bulk-add-area-filter"
                  value={selectedArea}
                  onChange={(e) => setSelectedArea(e.target.value)}
                >
                  <option value="">All Areas</option>
                  {areas.map(area => (
                    <option key={area.id} value={area.id}>{area.name}</option>
                  ))}
                </select>
              </div>

              <div className="input-wrapper">
                <label htmlFor="bulk-add-guardian-filter">Guardian</label>
                <select
                  id="bulk-add-guardian-filter"
                  value={selectedGuardian}
                  onChange={(e) => setSelectedGuardian(e.target.value)}
                >
                  <option value="">All</option>
                  <option value="true">Yes</option>
                  <option value="false">No</option>
                </select>
              </div>
            </div>
          </div>


          {/* Member Selection Table */}
          <div className="table-container-no-bg animate-in" style={{ animationDelay: '0.1s', marginBottom: '24px' }}>
            <table>
              <thead>
                <tr>
                  <th width="50">
                    <input
                      type="checkbox"
                      checked={selectAll}
                      onChange={handleSelectAll}
                      style={{ width: '18px', height: '18px' }}
                    />
                  </th>
                  <th>Member ID</th>
                  <th>Name</th>
                  <th>Surname</th>
                  <th>Father Name</th>
                  <th>House Name</th>
                  <th>Area</th>
                  <th className="text-center">Guardian</th>
                  <th className="text-center">GBM</th>
                </tr>
              </thead>
              <tbody>
                {filteredMembers.length > 0 ? (
                  filteredMembers.map(member => (
                    <tr key={member.id} onClick={() => handleSelectMember(member.id)} style={{ cursor: 'pointer' }}>
                      <td onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selectedMembers.includes(member.id)}
                          onChange={() => handleSelectMember(member.id)}
                          style={{ width: '18px', height: '18px' }}
                        />
                      </td>
                      <td className="font-mono">{member.member_id}</td>
                      <td style={{ fontWeight: 600 }}>{member.name}</td>
                      <td>{member.surname}</td>
                      <td>{member.father_name}</td>
                      <td>{member.house_details?.house_name || member.house?.house_name || '-'}</td>
                      <td>{member.house_details?.area_name || member.house?.area?.name || 'N/A'}</td>
                      <td className="text-center">
                        {member.isguardian ?
                          <span className="badge-primary" style={{ padding: '2px 8px', fontSize: '0.7rem' }}>Yes</span> :
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>-</span>
                        }
                      </td>
                      <td className="text-center">
                        {member.general_body_member ?
                          <span className="badge-success" style={{ padding: '2px 8px', fontSize: '0.7rem', background: '#e6fffa', color: '#047857' }}>Yes</span> :
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>-</span>
                        }
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="9" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                      {searchTerm || selectedArea || selectedGuardian ? 'No members match your filters' : 'No members found'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>


          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--header-bg)', padding: '16px', borderRadius: '12px', marginBottom: '24px' }}>
            <span style={{ fontWeight: 600 }}>Total Selected: {selectedMembers.length} Members</span>
            <span className="badge-primary">Ready to process</span>
          </div>

          {(error || success) && (
            <div className={`status-banner ${error ? 'error' : 'success'}`} style={{ marginBottom: '24px' }}>
              {error || success}
            </div>
          )}

          <div className="form-actions">
            <button
              type="button"
              className="btn-secondary"
              onClick={onClose}
              disabled={loading}
              style={{ flex: 1 }}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={loading || selectedMembers.length === 0}
              style={{ flex: 2 }}
            >
              {loading ? (
                <>
                  <span className="spinner"></span>
                  Processing...
                </>
              ) : (
                `Confirm & Create ${selectedMembers.length} Obligations`
              )}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};

export default BulkAddObligationsModal;
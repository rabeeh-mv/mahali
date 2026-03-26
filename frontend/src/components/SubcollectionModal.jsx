import React, { useState, useEffect } from 'react';
import { memberAPI, areaAPI } from '../api';
import { FaClipboard, FaSearch, FaTimes, FaFilter, FaUsers } from 'react-icons/fa';
import './Collections.css';

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
  const [guardianFilter, setGuardianFilter] = useState('');

  useEffect(() => {
    if (isOpen) {
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

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(member =>
        (member.name && member.name.toLowerCase().includes(term)) ||
        (member.surname && member.surname.toLowerCase().includes(term)) ||
        (member.member_id && member.member_id.toString().includes(term))
      );
    }

    if (selectedArea) {
      filtered = filtered.filter(member =>
        member.house && member.house.area && member.house.area.id === selectedArea
      );
    }

    if (birthYear) {
      filtered = filtered.filter(member =>
        member.date_of_birth && new Date(member.date_of_birth).getFullYear() == birthYear
      );
    }

    if (guardianFilter !== '') {
      filtered = filtered.filter(member =>
        String(member.isGuardian) === guardianFilter
      );
    }

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
      const submitData = { ...formData };

      if (!submitData.collection && selectedCollection?.id) {
        submitData.collection = selectedCollection.id;
      }

      await onSubmit(submitData, selectedMembers, initialData);

      setSuccess('Subcollection saved successfully!');

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
    <div className="premium-modal-overlay" onClick={onClose}>
      <div className="premium-modal wide" onClick={(e) => e.stopPropagation()}>
        <div className="premium-modal-header">
          <div className="premium-modal-title">
            <div className="premium-modal-title-icon subcollection">
              <FaClipboard />
            </div>
            <div>
              <h2>{initialData ? 'Edit Subcollection' : 'New Subcollection'}</h2>
              <div className="modal-subtitle">
                {initialData
                  ? `Editing "${initialData.name}"`
                  : `Under: ${selectedCollection?.name || 'Collection'}`
                }
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
                Subcollection Name
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
                placeholder="Enter subcollection name"
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
                  onChange={handleChange}
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
                  onChange={handleChange}
                  required
                  disabled={loading}
                  min="0"
                  step="0.01"
                  placeholder="0.00"
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
                onChange={handleChange}
                disabled={loading}
              />
            </div>

            {/* Member Selection */}
            <div className="member-select-section">
              <div className="member-select-title">
                <FaUsers />
                Select Members
                <span className="count-badge">{selectedMembers.length}</span>
              </div>

              {/* Filters */}
              <div className="member-filters">
                <div className="premium-form-row four-col">
                  <div className="premium-form-group">
                    <label className="premium-form-label">
                      <FaSearch style={{ fontSize: '0.75rem' }} /> Search
                    </label>
                    <input
                      type="text"
                      className="premium-form-input"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="ID, Name..."
                      disabled={loading}
                    />
                  </div>

                  <div className="premium-form-group">
                    <label className="premium-form-label">
                      <FaFilter style={{ fontSize: '0.7rem' }} /> Area
                    </label>
                    <select
                      className="premium-form-input"
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

                  <div className="premium-form-group">
                    <label className="premium-form-label">Birth Year</label>
                    <input
                      type="number"
                      className="premium-form-input"
                      value={birthYear}
                      onChange={(e) => setBirthYear(e.target.value)}
                      placeholder="YYYY"
                      disabled={loading}
                      min="1900"
                      max={new Date().getFullYear()}
                    />
                  </div>

                  <div className="premium-form-group">
                    <label className="premium-form-label">Guardian</label>
                    <select
                      className="premium-form-input"
                      value={guardianFilter}
                      onChange={(e) => setGuardianFilter(e.target.value)}
                      disabled={loading}
                    >
                      <option value="">All</option>
                      <option value="true">Yes</option>
                      <option value="false">No</option>
                    </select>
                  </div>
                </div>

                <button
                  type="button"
                  className="select-all-btn"
                  onClick={handleSelectAllFiltered}
                  disabled={loading || filteredMembers.length === 0}
                >
                  Select All Filtered ({filteredMembers.length})
                </button>
              </div>

              {/* Member List */}
              <div className="member-list-box">
                <div className="member-list-header">
                  <span>Members</span>
                  <span>{selectedMembers.length} selected</span>
                </div>
                <div className="member-list-scroll">
                  {filteredMembers.length > 0 ? (
                    filteredMembers.map(member => (
                      <div
                        key={member.member_id}
                        className={`member-list-item ${selectedMembers.includes(member.member_id) ? 'selected' : ''}`}
                        onClick={() => handleMemberSelect(member.member_id)}
                      >
                        <div className="member-info">
                          <div className="member-name">
                            {member.member_id} — {member.name} {member.surname || ''}
                          </div>
                          <div className="member-detail">
                            House: {member.house?.house_name || 'N/A'} · Area: {member.house?.area?.name || 'N/A'}
                          </div>
                        </div>
                        <span className={`select-badge ${selectedMembers.includes(member.member_id) ? 'selected' : 'unselected'}`}>
                          {selectedMembers.includes(member.member_id) ? '✓ Selected' : 'Select'}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="member-list-empty">No members match the current filters</div>
                  )}
                </div>
              </div>
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
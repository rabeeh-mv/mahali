import React, { useState, useEffect } from 'react';
import { memberAPI, houseAPI } from '../api';
import { FaUser, FaSearch, FaTimes, FaUpload } from 'react-icons/fa';

const MemberModal = ({ isOpen, onClose, onSubmit, initialData, loadDataForTab }) => {
  const [formData, setFormData] = useState({
    name: '',
    surname: '',  // Added surname field
    house: '',
    status: 'live',
    date_of_birth: '',
    date_of_death: '',
    mother_name: '',
    mother_surname: '',
    mother: '',
    father_name: '',
    father_surname: '',
    father: '',
    adhar: '',
    phone: '',
    whatsapp: '',
    isGuardian: false,
    photo: null
  });
  const [houses, setHouses] = useState([]);
  const [allMembers, setAllMembers] = useState([]);
  const [filteredHouses, setFilteredHouses] = useState([]);
  const [filteredMembers, setFilteredMembers] = useState([]);
  const [showHouseSearch, setShowHouseSearch] = useState(false);
  const [showFatherSearch, setShowFatherSearch] = useState(false);
  const [showMotherSearch, setShowMotherSearch] = useState(false);
  const [houseSearchTerm, setHouseSearchTerm] = useState('');
  const [fatherSearchTerm, setFatherSearchTerm] = useState('');
  const [motherSearchTerm, setMotherSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    if (isOpen) {
      // Load houses and members when modal opens
      loadHouses();
      loadMembers();
      
      if (initialData) {
        setFormData({
          name: initialData.name || '',
          surname: initialData.surname || initialData.sur_name || '',  // Added surname field
          house: initialData.house?.home_id || initialData.house?.id || initialData.house || '',
          status: initialData.status || initialData.member_status || 'live',
          date_of_birth: initialData.date_of_birth || '',
          date_of_death: initialData.date_of_death || '',
          mother_name: initialData.mother_name || '',
          mother_surname: initialData.mother_surname || '',
          mother: initialData.mother?.member_id || initialData.mother?.id || initialData.mother || '',
          father_name: initialData.father_name || '',
          father_surname: initialData.father_surname || '',
          father: initialData.father?.member_id || initialData.father?.id || initialData.father || '',
          adhar: initialData.adhar || '',
          phone: initialData.phone || '',
          whatsapp: initialData.whatsapp || '',
          isGuardian: initialData.isGuardian || initialData.isguardian || initialData.is_guardian || false,
          photo: null
        });
      } else {
        setFormData({
          name: '',
          surname: '',  // Added surname field
          house: '',
          status: 'live',
          date_of_birth: '',
          date_of_death: '',
          mother_name: '',
          mother_surname: '',
          mother: '',
          father_name: '',
          father_surname: '',
          father: '',
          adhar: '',
          phone: '',
          whatsapp: '',
          isGuardian: false,
          photo: null
        });
      }
      // Reset status messages when modal opens
      setError(null);
      setSuccess(null);
      // Reset search states
      setHouseSearchTerm('');
      setFatherSearchTerm('');
      setMotherSearchTerm('');
      setFilteredHouses([]);
      setFilteredMembers([]);
    }
  }, [initialData, isOpen]);

  const loadHouses = async () => {
    try {
      const response = await houseAPI.getAll();
      setHouses(response.data);
      setFilteredHouses(response.data);
    } catch (err) {
      console.error('Failed to load houses:', err);
    }
  };

  const loadMembers = async () => {
    try {
      const response = await memberAPI.getAll();
      setAllMembers(response.data);
      setFilteredMembers(response.data);
    } catch (err) {
      console.error('Failed to load members:', err);
    }
  };

  const handleHouseSearch = (term) => {
    setHouseSearchTerm(term);
    if (!term) {
      setFilteredHouses(houses);
    } else {
      const filtered = houses.filter(house => 
        house.house_name.toLowerCase().includes(term.toLowerCase()) ||
        house.home_id.includes(term)
      );
      setFilteredHouses(filtered);
    }
  };

  const handleFatherSearch = (term) => {
    setFatherSearchTerm(term);
    if (!term) {
      setFilteredMembers(allMembers);
    } else {
      const filtered = allMembers.filter(member => 
        (member.name && member.name.toLowerCase().includes(term.toLowerCase())) ||
        member.member_id.includes(term)
      );
      setFilteredMembers(filtered);
    }
  };

  const handleMotherSearch = (term) => {
    setMotherSearchTerm(term);
    if (!term) {
      setFilteredMembers(allMembers);
    } else {
      const filtered = allMembers.filter(member => 
        (member.name && member.name.toLowerCase().includes(term.toLowerCase())) ||
        member.member_id.includes(term)
      );
      setFilteredMembers(filtered);
    }
  };

  const selectHouse = (house) => {
    setFormData(prev => ({
      ...prev,
      house: house.home_id
    }));
    setShowHouseSearch(false);
    setHouseSearchTerm('');
  };

  const selectFather = (member) => {
    setFormData(prev => ({
      ...prev,
      father: member.member_id,
      father_name: member.name || '',
      father_surname: member.surname || ''
    }));
    setShowFatherSearch(false);
    setFatherSearchTerm('');
  };

  const selectMother = (member) => {
    setFormData(prev => ({
      ...prev,
      mother: member.member_id,
      mother_name: member.name || '',
      mother_surname: member.surname || ''
    }));
    setShowMotherSearch(false);
    setMotherSearchTerm('');
  };

  const handlePhotoChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFormData(prev => ({
        ...prev,
        photo: e.target.files[0]
      }));
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
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
      
      // Remove empty date_of_death if status is not 'dead'
      if (submitData.status !== 'dead' && !submitData.date_of_death) {
        delete submitData.date_of_death;
      }
      
      // Remove photo from submitData if it's null (not used in API)
      if (!submitData.photo) {
        delete submitData.photo;
      }
      
      // Remove empty father/mother IDs
      if (!submitData.father) {
        delete submitData.father;
      }
      
      if (!submitData.mother) {
        delete submitData.mother;
      }
      
      // Remove empty house ID
      if (!submitData.house) {
        delete submitData.house;
      }
      
      // Handle potential field name variations for API compatibility
      if (submitData.sur_name && !submitData.surname) {
        submitData.surname = submitData.sur_name;
        delete submitData.sur_name;
      }
      
      if (submitData.member_status && !submitData.status) {
        submitData.status = submitData.member_status;
        delete submitData.member_status;
      }
      
      if (submitData.is_guardian !== undefined && submitData.isGuardian === undefined) {
        submitData.isGuardian = submitData.is_guardian;
        delete submitData.is_guardian;
      }
      
      if (initialData) {
        // Update existing member
        await memberAPI.update(initialData.member_id, submitData);
        setSuccess('Member updated successfully!');
      } else {
        // Create new member (member_id will be auto-generated by backend)
        await memberAPI.create(submitData);
        setSuccess('Member created successfully!');
      }
      
      // Reload member data
      if (loadDataForTab) {
        loadDataForTab('members', true); // Force reload
      }
      
      // Close modal after a short delay
      setTimeout(() => {
        onClose();
        onSubmit && onSubmit(submitData);
      }, 1500);
    } catch (err) {
      setError(err.response?.data?.detail || err.response?.data?.message || err.response?.data || 'Failed to save member');
      console.error('Error saving member:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content modal-content-wide">
        <div className="modal-header">
          <h2><FaUser /> {initialData ? 'Edit Member' : 'Add New Member'}</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="name">Full Name *</label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                disabled={loading}
                placeholder="Enter full name"
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="surname">Surname</label>
              <input
                type="text"
                id="surname"
                name="surname"
                value={formData.surname}
                onChange={handleChange}
                disabled={loading}
                placeholder="Enter surname (optional)"
              />
            </div>
          </div>
          
          {/* Photo Upload Section */}
          <div className="form-group">
            <label htmlFor="photo">Photo (Optional)</label>
            <div className="photo-upload-container">
              <input
                type="file"
                id="photo"
                name="photo"
                accept="image/*"
                onChange={handlePhotoChange}
                disabled={loading}
                className="photo-input"
              />
              <label htmlFor="photo" className="photo-upload-label">
                <FaUpload /> Choose Photo
              </label>
              {formData.photo && (
                <span className="photo-selected">
                  {formData.photo.name}
                </span>
              )}
            </div>
          </div>
          
          {/* House Selection with Search */}
          <div className="form-group">
            <label>House</label>
            <div className="searchable-select">
              <div className="select-display">
                {formData.house ? (
                  <span>
                    {houses && Array.isArray(houses) ? 
                      (houses.find(h => h.home_id === formData.house)?.house_name || 'Unknown House') :
                      'Loading...'} 
                    (#{formData.house})
                  </span>
                ) : (
                  <span>Select a house</span>
                )}
                <button 
                  type="button" 
                  className="search-btn"
                  onClick={() => setShowHouseSearch(true)}
                  disabled={loading}
                >
                  <FaSearch />
                </button>
              </div>
            </div>
          </div>
          
          {/* House Search Modal */}
          {showHouseSearch && (
            <div className="search-modal-overlay">
              <div className="search-modal">
                <div className="search-modal-header">
                  <h3>Select House</h3>
                  <button 
                    className="close-btn" 
                    onClick={() => setShowHouseSearch(false)}
                  >
                    <FaTimes />
                  </button>
                </div>
                <div className="search-modal-content">
                  <input
                    type="text"
                    placeholder="Search by house name or ID..."
                    value={houseSearchTerm}
                    onChange={(e) => handleHouseSearch(e.target.value)}
                    className="search-input"
                  />
                  <div className="search-results">
                    {filteredHouses.length > 0 ? (
                      filteredHouses.map(house => (
                        <div 
                          key={house.home_id} 
                          className="search-result-item"
                          onClick={() => selectHouse(house)}
                        >
                          <div className="search-result-title">{house.house_name}</div>
                          <div className="search-result-subtitle">ID: #{house.home_id}</div>
                        </div>
                      ))
                    ) : (
                      <div className="no-results">No houses found</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
          
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="status">Status *</label>
              <select
                id="status"
                name="status"
                value={formData.status}
                onChange={handleChange}
                required
                disabled={loading}
              >
                <option value="live">Live</option>
                <option value="dead">Dead</option>
                <option value="terminated">Terminated</option>
              </select>
            </div>
            
            <div className="form-group">
              <label htmlFor="date_of_birth">Date of Birth *</label>
              <input
                type="date"
                id="date_of_birth"
                name="date_of_birth"
                value={formData.date_of_birth}
                onChange={handleChange}
                required
                disabled={loading}
              />
            </div>
          </div>
          
          {formData.status === 'dead' && (
            <div className="form-group">
              <label htmlFor="date_of_death">Date of Death</label>
              <input
                type="date"
                id="date_of_death"
                name="date_of_death"
                value={formData.date_of_death}
                onChange={handleChange}
                disabled={loading}
              />
            </div>
          )}
          
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="father_name">Father's Name</label>
              <input
                type="text"
                id="father_name"
                name="father_name"
                value={formData.father_name}
                onChange={handleChange}
                disabled={loading}
                placeholder="Father's first name"
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="father_surname">Father's Surname</label>
              <input
                type="text"
                id="father_surname"
                name="father_surname"
                value={formData.father_surname}
                onChange={handleChange}
                disabled={loading}
                placeholder="Father's surname"
              />
            </div>
          </div>
          
          {/* Father Selection with Search */}
          <div className="form-group">
            <label>Link to Father (Optional)</label>
            <div className="searchable-select">
              <div className="select-display">
                {formData.father ? (
                  <span>
                    {allMembers && Array.isArray(allMembers) ? 
                      (allMembers.find(m => m.member_id === formData.father)?.name || 'Unknown Member') :
                      'Loading...'} 
                    (#{formData.father})
                  </span>
                ) : (
                  <span>Select a father</span>
                )}
                <button 
                  type="button" 
                  className="search-btn"
                  onClick={() => setShowFatherSearch(true)}
                  disabled={loading}
                >
                  <FaSearch />
                </button>
              </div>
            </div>
          </div>
          
          {/* Father Search Modal */}
          {showFatherSearch && (
            <div className="search-modal-overlay">
              <div className="search-modal">
                <div className="search-modal-header">
                  <h3>Select Father</h3>
                  <button 
                    className="close-btn" 
                    onClick={() => setShowFatherSearch(false)}
                  >
                    <FaTimes />
                  </button>
                </div>
                <div className="search-modal-content">
                  <input
                    type="text"
                    placeholder="Search by name or ID..."
                    value={fatherSearchTerm}
                    onChange={(e) => handleFatherSearch(e.target.value)}
                    className="search-input"
                  />
                  <div className="search-results">
                    {filteredMembers.length > 0 ? (
                      filteredMembers.map(member => (
                        <div 
                          key={member.member_id} 
                          className="search-result-item"
                          onClick={() => selectFather(member)}
                        >
                          <div className="search-result-title">{member.name || 'Unknown Member'}</div>
                          <div className="search-result-subtitle">ID: #{member.member_id}</div>
                        </div>
                      ))
                    ) : (
                      <div className="no-results">No members found</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
          
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="mother_name">Mother's Name</label>
              <input
                type="text"
                id="mother_name"
                name="mother_name"
                value={formData.mother_name}
                onChange={handleChange}
                disabled={loading}
                placeholder="Mother's first name"
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="mother_surname">Mother's Surname</label>
              <input
                type="text"
                id="mother_surname"
                name="mother_surname"
                value={formData.mother_surname}
                onChange={handleChange}
                disabled={loading}
                placeholder="Mother's surname"
              />
            </div>
          </div>
          
          {/* Mother Selection with Search */}
          <div className="form-group">
            <label>Link to Mother (Optional)</label>
            <div className="searchable-select">
              <div className="select-display">
                {formData.mother ? (
                  <span>
                    {allMembers && Array.isArray(allMembers) ? 
                      (allMembers.find(m => m.member_id === formData.mother)?.name || 'Unknown Member') :
                      'Loading...'} 
                    (#{formData.mother})
                  </span>
                ) : (
                  <span>Select a mother</span>
                )}
                <button 
                  type="button" 
                  className="search-btn"
                  onClick={() => setShowMotherSearch(true)}
                  disabled={loading}
                >
                  <FaSearch />
                </button>
              </div>
            </div>
          </div>
          
          {/* Mother Search Modal */}
          {showMotherSearch && (
            <div className="search-modal-overlay">
              <div className="search-modal">
                <div className="search-modal-header">
                  <h3>Select Mother</h3>
                  <button 
                    className="close-btn" 
                    onClick={() => setShowMotherSearch(false)}
                  >
                    <FaTimes />
                  </button>
                </div>
                <div className="search-modal-content">
                  <input
                    type="text"
                    placeholder="Search by name or ID..."
                    value={motherSearchTerm}
                    onChange={(e) => handleMotherSearch(e.target.value)}
                    className="search-input"
                  />
                  <div className="search-results">
                    {filteredMembers.length > 0 ? (
                      filteredMembers.map(member => (
                        <div 
                          key={member.member_id} 
                          className="search-result-item"
                          onClick={() => selectMother(member)}
                        >
                          <div className="search-result-title">{member.name || 'Unknown Member'}</div>
                          <div className="search-result-subtitle">ID: #{member.member_id}</div>
                        </div>
                      ))
                    ) : (
                      <div className="no-results">No members found</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
          
          <div className="form-group">
            <label htmlFor="adhar">Aadhar Number</label>
            <input
              type="text"
              id="adhar"
              name="adhar"
              value={formData.adhar}
              onChange={handleChange}
              disabled={loading}
              placeholder="12-digit Aadhar number"
              maxLength="12"
            />
          </div>
          
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="phone">Phone Number</label>
              <input
                type="tel"
                id="phone"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                disabled={loading}
                placeholder="Phone number"
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="whatsapp">WhatsApp Number</label>
              <input
                type="tel"
                id="whatsapp"
                name="whatsapp"
                value={formData.whatsapp}
                onChange={handleChange}
                disabled={loading}
                placeholder="WhatsApp number"
              />
            </div>
          </div>
          
          <div className="form-group checkbox-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                name="isGuardian"
                checked={formData.isGuardian}
                onChange={handleChange}
                disabled={loading}
                className="checkbox-input"
              />
              <span className="checkbox-text">Is Guardian of the Family</span>
            </label>
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
                initialData ? 'Update Member' : 'Create Member'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default MemberModal;
import React, { useState, useEffect } from 'react';
import { settingsAPI, areaAPI, houseAPI, memberAPI } from '../api';
import {
  FaSearch,
  FaTimes,
  FaHome,
  FaUserFriends,
  FaMapMarkerAlt,
  FaCheck,
  FaArrowRight,
  FaTrash,
  FaSync,
  FaInfoCircle,
  FaChild,
  FaFemale,
  FaMale
} from 'react-icons/fa';
import './FirebaseDataImproved.css';

const FirebaseDataImproved = () => {
  // App Config & Data
  const [firebaseConfig, setFirebaseConfig] = useState(null);
  const [firebaseData, setFirebaseData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [areas, setAreas] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');

  // Wizard State
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(1); // 1: House, 2: Members, 3: Relationships
  const [processingItem, setProcessingItem] = useState(null);
  const [saving, setSaving] = useState(false);

  // Step 1: House Data
  const [houseData, setHouseData] = useState({
    house_name: '',
    family_name: '',
    location_name: '',
    area: '', // Will store area ID
    address: '',
    road_name: ''
  });
  const [createdHouseId, setCreatedHouseId] = useState(null);

  // Step 2: Member Data
  const [availableMembers, setAvailableMembers] = useState([]); // Members from request
  const [selectedMemberIds, setSelectedMemberIds] = useState(new Set());
  const [savedMembers, setSavedMembers] = useState([]); // Members successfully saved to DB

  // Step 3: Relationships
  const [relationships, setRelationships] = useState({}); // Map memberId -> { fatherId, motherId, guardianId }

  useEffect(() => {
    loadAppSettings();
    loadAreas();

    // Listen for settings updates
    const handleSettingsUpdate = (event) => {
      if (event.detail.firebase_config) {
        try {
          setFirebaseConfig(JSON.parse(event.detail.firebase_config));
        } catch (e) {
          console.error('Invalid Firebase config update');
        }
      }
    };
    window.addEventListener('settingsUpdated', handleSettingsUpdate);
    return () => window.removeEventListener('settingsUpdated', handleSettingsUpdate);
  }, []);

  useEffect(() => {
    if (firebaseConfig) {
      loadFirebaseData();
    }
  }, [firebaseConfig]);

  const loadAppSettings = async () => {
    try {
      const response = await settingsAPI.getAll();
      if (response.data.length > 0) {
        const settings = response.data[0];
        if (settings.firebase_config) {
          try {
            setFirebaseConfig(JSON.parse(settings.firebase_config));
          } catch (e) {
            setError('Invalid Firebase configuration');
          }
        } else {
          setError('Firebase not configured in settings');
        }
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  };

  const loadAreas = async () => {
    try {
      const response = await areaAPI.getAll();
      setAreas(response.data);
    } catch (error) {
      console.error('Failed to load areas:', error);
    }
  };

  const loadFirebaseData = async () => {
    if (!firebaseConfig) return;

    setLoading(true);
    try {
      // Dynamically import Firebase
      const { initializeApp } = await import('firebase/app');
      const { getFirestore, collection, getDocs } = await import('firebase/firestore');

      const app = initializeApp(firebaseConfig);
      const db = getFirestore(app);

      const querySnapshot = await getDocs(collection(db, 'families'));
      const dataList = [];
      querySnapshot.forEach((doc) => {
        dataList.push({ id: doc.id, ...doc.data() });
      });

      setFirebaseData(dataList);
      setError(null);
    } catch (err) {
      console.error('Firebase Error:', err);
      const isNetworkError = err.code === 'unavailable' || err.message?.includes('offline') || err.message?.includes('ERR_NAME_NOT_RESOLVED');
      setError(
        isNetworkError
          ? 'Network Error: Unable to connect to member request server. Please check your internet connection.'
          : `Failed to load requests: ${err.message || 'Unknown error'}`
      );
    } finally {
      setLoading(false);
    }
  };

  // --- Wizard Logic ---

  const openProcessWizard = (item) => {
    setProcessingItem(item);
    setCurrentStep(1);
    setIsWizardOpen(true);
    setCreatedHouseId(null);
    setSavedMembers([]);
    setRelationships({});

    // Pre-fill House Data
    setHouseData({
      house_name: item.houseName || item.house_name || '',
      family_name: item.familyName || item.family_name || '',
      location_name: item.locationName || item.location || '',
      area: '',
      address: item.address || '',
      road_name: item.roadName || ''
    });

    // Prepare Members
    const rawMembers = item.members || [];
    const processedMembers = rawMembers.map((m, idx) => ({
      ...m,
      tempId: `temp_${Date.now()}_${idx}`, // Temporary ID for selection
      name: m.fullName || m.name,
      surname: m.surname || '',
      phone: m.phone || '',
      whatsapp: m.whatsapp || '',
      dob: m.dob || m.date_of_birth
    }));
    setAvailableMembers(processedMembers);
    // Auto-select all by default
    setSelectedMemberIds(new Set(processedMembers.map(m => m.tempId)));
  };

  const closeWizard = () => {
    if (window.confirm('Are you sure you want to close? Any unsaved progress will be lost.')) {
      setIsWizardOpen(false);
      setProcessingItem(null);
    }
  };

  // Step 1: Save House
  const handleSaveHouse = async () => {
    if (!houseData.house_name || !houseData.family_name) {
      alert('House Name and Family Name are required.');
      return;
    }

    setSaving(true);
    try {
      // Pass 'item.id' as 'firebase_id' so we can link the django record to firestore document
      const payload = { ...houseData, firebase_id: processingItem.id };
      const response = await houseAPI.create(payload);
      // MemberSerializer expects 'home_id' for the house slug field, not the database 'id'
      setCreatedHouseId(response.data.home_id);
      setCurrentStep(2); // Move to members
    } catch (error) {
      alert('Failed to save house: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  // Step 2: Save Members
  const handleSaveMembers = async () => {
    const membersToSave = availableMembers.filter(m => selectedMemberIds.has(m.tempId));

    if (membersToSave.length === 0) {
      alert('Please select at least one member.');
      return;
    }

    setSaving(true);
    const successfullySaved = [];

    try {
      for (const member of membersToSave) {
        const memberPayload = {
          name: member.name,
          surname: member.surname,
          date_of_birth: member.dob || '1900-01-01', // Provide default if missing to prevent 400 error
          phone: member.phone,
          whatsapp: member.whatsapp,
          adhar: member.aadhaar || member.adhar || '', // Map Aadhaar number
          house: createdHouseId, // Link to the house just created
          // Default others
          status: 'live'
        };

        try {
          const response = await memberAPI.create(memberPayload);
          successfullySaved.push({
            ...response.data, // Real DB data
            tempId: member.tempId // Keep track of original ref
          });
        } catch (err) {
          console.error(`Failed to save member ${member.name}`, err);
          // Continue saving others even if one fails
        }
      }

      setSavedMembers(successfullySaved);
      if (successfullySaved.length > 0) {
        setCurrentStep(3); // Move to relationships
      } else {
        alert('Failed to save any members. Please try again.');
      }
    } catch (error) {
      alert('Critical error saving members.');
    } finally {
      setSaving(false);
    }
  };

  // Step 3: Update Relationships
  const handleUpdateRelationships = (memberId, field, value) => {
    setRelationships(prev => ({
      ...prev,
      [memberId]: {
        ...prev[memberId],
        [field]: value
      }
    }));
  };

  const handleFinishWizard = async () => {
    setSaving(true);
    try {
      // 1. Update relationships in DB
      for (const member of savedMembers) {
        const rels = relationships[member.member_id];
        if (rels) {
          const updatePayload = {};
          // Match field names to MemberSerializer (SlugRelatedField)
          if (rels.fatherId) updatePayload.father = rels.fatherId;
          if (rels.motherId) updatePayload.mother = rels.motherId;

          if (Object.keys(updatePayload).length > 0) {
            await memberAPI.partialUpdate(member.member_id, updatePayload);
          }
        }
      }

      // 2. Delete request from Firebase (Optional/User Choice)
      // Since we are linking data now, maybe we should keep it but mark as processed?
      // For now, let's just NOT delete if the user says NO, but default behavior is to ask.
      if (window.confirm('Process Complete! Do you want to remove this request from the Digital Requests list (Firebase)?')) {
        await deleteFirebaseItem(processingItem.id);
      } else {
        // If we don't delete, maybe we should update it?
        // For now, doing nothing is fine, the user can delete it later.
      }

      setIsWizardOpen(false);
      // Refresh Lists
      // You might want to trigger a global refresh here
    } catch (error) {
      console.error('Error finalizing:', error);
      alert('Finished with some errors. Please check the directory.');
    } finally {
      setSaving(false);
    }
  };

  const deleteFirebaseItem = async (docId) => {
    try {
      const { initializeApp } = await import('firebase/app');
      const { getFirestore, doc, deleteDoc } = await import('firebase/firestore');
      const app = initializeApp(firebaseConfig);
      const db = getFirestore(app);
      await deleteDoc(doc(db, 'families', docId));
      loadFirebaseData(); // Reload list
    } catch (e) {
      console.error('Delete failed', e);
    }
  };


  // --- Render Helpers ---

  const renderGrid = () => (
    <div className="requests-grid">
      {firebaseData
        .filter(item =>
          !searchTerm ||
          (item.familyName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.houseName?.toLowerCase().includes(searchTerm.toLowerCase()))
        )
        .map(item => (
          <div key={item.id} className="request-card">
            <div className="request-card-header">
              <div className="family-avatar">
                {item.familyName ? item.familyName.charAt(0).toUpperCase() : 'F'}
              </div>
              <div className="member-count-badge">
                <FaUserFriends /> {(item.members || []).length} Members
              </div>
            </div>

            <div className="request-details">
              <h3 style={{ margin: '0 0 4px 0', fontSize: '1.1rem' }}>{item.familyName} Family</h3>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>{item.houseName}</span>

              <div className="detail-item" style={{ marginTop: '12px' }}>
                <FaMapMarkerAlt className="detail-icon" />
                <span>{item.locationName || 'No Location'}</span>
              </div>
            </div>

            <div className="card-actions">
              <button className="process-btn" onClick={() => openProcessWizard(item)}>
                Process Request
              </button>
              <button className="delete-card-btn" onClick={() => {
                if (window.confirm('Delete this request?')) deleteFirebaseItem(item.id)
              }}>
                <FaTrash />
              </button>
            </div>
          </div>
        ))}
    </div>
  );

  const renderStep1House = () => (
    <div className="step-container">
      <div className="info-banner">
        <FaInfoCircle />
        <span>Review and save the House details first. This will create a permanent House record.</span>
      </div>
      <div className="form-grid">
        <div className="form-group">
          <label>House Name</label>
          <input
            value={houseData.house_name}
            onChange={e => setHouseData({ ...houseData, house_name: e.target.value })}
            placeholder="e.g. Baitul Hamd"
          />
        </div>
        <div className="form-group">
          <label>Family Name</label>
          <input
            value={houseData.family_name}
            onChange={e => setHouseData({ ...houseData, family_name: e.target.value })}
          />
        </div>
        <div className="form-group">
          <label>Area / Region</label>
          <select
            value={houseData.area}
            onChange={e => setHouseData({ ...houseData, area: e.target.value })}
          >
            <option value="">Select Area...</option>
            {areas.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label>Location Name</label>
          <input
            value={houseData.location_name}
            onChange={e => setHouseData({ ...houseData, location_name: e.target.value })}
          />
        </div>
        <div className="form-group full-width">
          <label>Address / Road</label>
          <input
            value={houseData.address}
            onChange={e => setHouseData({ ...houseData, address: e.target.value })}
          />
        </div>
      </div>
    </div>
  );

  const renderStep2Members = () => (
    <div className="step-container">
      <div className="info-banner">
        <FaCheck />
        <span>House Created! Now select members to add to this house.</span>
      </div>
      <div className="members-selection-list">
        {availableMembers.map(member => (
          <div
            key={member.tempId}
            className={`member-select-item ${selectedMemberIds.has(member.tempId) ? 'selected' : ''}`}
            onClick={() => {
              const newSet = new Set(selectedMemberIds);
              if (newSet.has(member.tempId)) newSet.delete(member.tempId);
              else newSet.add(member.tempId);
              setSelectedMemberIds(newSet);
            }}
          >
            <div className="checkbox-visual">
              {selectedMemberIds.has(member.tempId) && <FaCheck size={12} />}
            </div>
            <div style={{ flex: 1 }}>
              <div className="text-highlight">{member.name} {member.surname}</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                {member.phone ? `📞 ${member.phone}` : ''}
              </div>
            </div>
            <div className="stat-badge" style={{ padding: '4px 8px', fontSize: '0.8rem' }}>
              {member.dob || 'No DOB'}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderStep3Relationships = () => (
    <div className="step-container">
      <div className="info-banner">
        <FaUserFriends />
        <span>Members Saved! Now define family connections (Father, Mother) for the new members.</span>
      </div>

      <div className="relationship-editor">
        {savedMembers.map(member => (
          <div key={member.member_id} className="relationship-card">
            <div className="relationship-header">
              <div className="family-avatar" style={{ width: 32, height: 32, fontSize: '1rem' }}>
                {member.name[0]}
              </div>
              <span className="text-highlight">{member.name} {member.surname}</span>
            </div>

            <div className="relationship-inputs">
              <div className="form-group">
                <label><FaMale /> Father</label>
                <select
                  onChange={(e) => handleUpdateRelationships(member.member_id, 'fatherId', e.target.value)}
                >
                  <option value="">Select Father...</option>
                  {/* Filter to exclude self */}
                  {savedMembers.filter(m => m.member_id !== member.member_id).map(potentialFather => (
                    <option key={potentialFather.member_id} value={potentialFather.member_id}>
                      {potentialFather.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label><FaFemale /> Mother</label>
                <select
                  onChange={(e) => handleUpdateRelationships(member.member_id, 'motherId', e.target.value)}
                >
                  <option value="">Select Mother...</option>
                  {savedMembers.filter(m => m.member_id !== member.member_id).map(potentialMother => (
                    <option key={potentialMother.member_id} value={potentialMother.member_id}>
                      {potentialMother.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  if (loading && !isWizardOpen) return <div className="loading">Loading requests...</div>;
  if (!firebaseConfig) return <div className="error">Firebase not configured in Settings.</div>;

  return (
    <div className="firebase-data-section">
      {/* Header Dashboard */}
      <div className="dashboard-header">
        <h2><FaHome style={{ color: 'var(--primary)' }} /> Digital Requests</h2>
        <div className="header-stats">
          <div className="stat-badge">
            <span>{firebaseData.length}</span> Pending
          </div>
          <div className="stat-badge">
            <span>{firebaseData.reduce((acc, i) => acc + (i.members?.length || 0), 0)}</span> Members
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="controls-bar">
        <div className="search-wrapper">
          <FaSearch className="search-icon" />
          <input
            className="search-input"
            placeholder="Search requests..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
        <button className="reload-btn" onClick={loadFirebaseData}>
          <FaSync className={loading ? 'fa-spin' : ''} /> Refresh Data
        </button>
      </div>

      {/* Main Grid Content */}
      {renderGrid()}

      {firebaseData.length === 0 && !loading && (
        <div className="no-data" style={{ padding: '60px', textAlign: 'center' }}>
          <FaCheck size={48} style={{ color: '#10b981', marginBottom: 20, opacity: 0.5 }} />
          <h3>All Caught Up!</h3>
          <p>No pending digital requests found.</p>
        </div>
      )}

      {/* 3-Step Wizard Modal */}
      {isWizardOpen && (
        <div className="modal-overlay">
          <div className="process-modal">
            <div className="modal-header-stepper">
              <div className="modal-header-top">
                <h2>Process Request</h2>
                <button className="close-modal-btn" onClick={closeWizard}><FaTimes /></button>
              </div>

              {/* Stepper Visual */}
              <div className="stepper">
                <div className={`step ${currentStep >= 1 ? 'active' : ''} ${currentStep > 1 ? 'completed' : ''}`}>
                  <div className="step-circle">{currentStep > 1 ? <FaCheck /> : 1}</div>
                  <span className="step-label">Save House</span>
                </div>
                <div className={`step ${currentStep >= 2 ? 'active' : ''} ${currentStep > 2 ? 'completed' : ''}`}>
                  <div className="step-circle">{currentStep > 2 ? <FaCheck /> : 2}</div>
                  <span className="step-label">Add Members</span>
                </div>
                <div className={`step ${currentStep >= 3 ? 'active' : ''} ${currentStep > 3 ? 'completed' : ''}`}>
                  <div className="step-circle">{currentStep > 3 ? <FaCheck /> : 3}</div>
                  <span className="step-label">Relationships</span>
                </div>
              </div>
            </div>

            <div className="modal-content-body">
              {currentStep === 1 && renderStep1House()}
              {currentStep === 2 && renderStep2Members()}
              {currentStep === 3 && renderStep3Relationships()}
            </div>

            <div className="modal-footer-actions">
              <div className="status-indicator">
                {saving ? <span style={{ display: 'flex', gap: 8, alignItems: 'center' }}><div className="loading-spinner" style={{ width: 16, height: 16, border: '2px solid #ccc', borderTopColor: '#333' }}></div> Processing...</span> : <span>Step {currentStep} of 3</span>}
              </div>

              {currentStep === 1 && (
                <button className="next-step-btn" onClick={handleSaveHouse} disabled={saving}>
                  Create House & Next <FaArrowRight style={{ marginLeft: 8 }} />
                </button>
              )}
              {currentStep === 2 && (
                <button className="next-step-btn" onClick={handleSaveMembers} disabled={saving}>
                  Save Members & Next <FaArrowRight style={{ marginLeft: 8 }} />
                </button>
              )}
              {currentStep === 3 && (
                <button className="next-step-btn" onClick={handleFinishWizard} disabled={saving} style={{ backgroundColor: '#10b981' }}>
                  <FaCheck style={{ marginRight: 8 }} /> Finish Processing
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FirebaseDataImproved;
import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { houseAPI, memberAPI, areaAPI, obligationAPI, subcollectionAPI } from '../api';
import { FaHome, FaUser, FaArrowLeft, FaEdit, FaTrash, FaMapMarkerAlt, FaUsers } from 'react-icons/fa';
import DeleteConfirmModal from './DeleteConfirmModal';

import './HouseDetailsPage.css';

const HouseDetailsPage = ({ houses, members, areas, subcollections, setEditing, loadDataForTab, deleteItem }) => {
  const { houseId } = useParams();
  const navigate = useNavigate();
  const [house, setHouse] = useState(null);
  const [houseMembers, setHouseMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [area, setArea] = useState(null);
  const [obligations, setObligations] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [allSubcollections, setAllSubcollections] = useState([]);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // Use useMemo to ensure we have a stable reference to houseId
  const stableHouseId = useMemo(() => houseId, [houseId]);

  useEffect(() => {
    const loadHouseData = async () => {
      try {
        setLoading(true);
        // Always fetch from API to get the latest data
        const houseResponse = await houseAPI.get(stableHouseId);
        setHouse(houseResponse.data);

        // Fetch area data from API
        if (houseResponse.data.area) {
          try {
            const areaResponse = await areaAPI.get(houseResponse.data.area);
            setArea(areaResponse.data);
          } catch (areaError) {
            console.error('Failed to load area data:', areaError);
          }
        }

        // Fetch members for this house using a robust matching logic
        const membersResponse = await memberAPI.getAll();

        let membersArray = [];
        if (Array.isArray(membersResponse.data)) {
          membersArray = membersResponse.data;
        } else if (membersResponse.data && Array.isArray(membersResponse.data.results)) {
          membersArray = membersResponse.data.results;
        } else if (Array.isArray(membersResponse)) {
          membersArray = membersResponse;
        }

        const filteredMembers = membersArray.filter(member => {
          const memberHouse = member.house;
          const expectedHouseId = houseResponse.data.home_id;

          if (!memberHouse) return false;

          const expectedHouseIdStr = String(expectedHouseId);

          // Direct matching attempts
          if (String(memberHouse) === expectedHouseIdStr) return true;
          if (Number(memberHouse) === Number(expectedHouseId)) return true;

          // Object matching attempts
          if (typeof memberHouse === 'object') {
            if (memberHouse.home_id !== undefined && String(memberHouse.home_id) === expectedHouseIdStr) return true;
            if (memberHouse.id !== undefined && String(memberHouse.id) === expectedHouseIdStr) return true;
            if (memberHouse.pk !== undefined && String(memberHouse.pk) === expectedHouseIdStr) return true;
            if (memberHouse.home !== undefined && String(memberHouse.home) === expectedHouseIdStr) return true;
          }

          return false;
        });

        setHouseMembers(filteredMembers);

        // Fetch obligations for all members in this house
        const obligationsResponse = await obligationAPI.getAll();
        const houseMemberIds = filteredMembers.map(member => member.member_id);
        const houseObligations = obligationsResponse.data.filter(obligation =>
          houseMemberIds.includes(obligation.member) ||
          (typeof obligation.member === 'object' && houseMemberIds.includes(obligation.member.member_id))
        );
        setObligations(houseObligations);

        // Ensure subcollections are loaded
        if (subcollections && subcollections.length > 0) {
          setAllSubcollections(subcollections);
        } else {
          const subColRes = await subcollectionAPI.getAll();
          setAllSubcollections(subColRes.data);
        }

      } catch (error) {
        console.error('Failed to load house data:', error);
      } finally {
        setLoading(false);
      }
    };

    if (stableHouseId) {
      loadHouseData();
    }
  }, [stableHouseId, subcollections]);

  const handleBack = () => {
    navigate('/houses');
  };

  const handleEditHouse = () => {
    navigate(`/houses/edit/${house.home_id}`);
  };

  const handleDeleteHouse = () => {
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (house) {
      await deleteItem('houses', house.home_id);
      setIsDeleteModalOpen(false);
      navigate('/houses');
    }
  };

  const handleViewMember = (memberId) => {
    navigate(`/members/${memberId}`);
  };

  // Filter obligations
  const filteredObligations = obligations.filter(obs => {
    const sub = allSubcollections.find(sc => sc.id === (typeof obs.subcollection === 'object' ? obs.subcollection.id : obs.subcollection));
    const name = sub ? sub.name.toLowerCase() : '';
    return name.includes(searchTerm.toLowerCase());
  });

  if (loading) {
    return (
      <div className="data-section">
        <div className="tab-loading">
          <div className="spinner"></div>
          <p>Loading house details...</p>
        </div>
      </div>
    );
  }

  if (!house) {
    return (
      <div className="data-section">
        <div className="error-container">
          <h2>House not found</h2>
          <p>Could not find house with ID: {stableHouseId}</p>
          <button onClick={handleBack} className="back-btn">
            {/* <FaArrowLeft /> */}
            <span style={{ fontSize: '12px' }}>Back</span>
          </button>
        </div>
      </div>
    );
  }

  const getInitials = (name) => {
    return name ? name.charAt(0).toUpperCase() : '?';
  };

  return (
    <div className="house-details-wrapper animate-in">
      {/* Left Column: House Details */}
      <div className="left-column">
        <div className="detail-card house-profile-card">
          <div className="profile-header">
            <button onClick={handleBack} className="back-btn-corner" title="Back">
              {/* <FaArrowLeft size={14} /> */}
              <span style={{ fontSize: '12px' }}>Back</span>
            </button>

            <div className="house-avatar-large">
              <FaHome />
            </div>
            <h2 className="house-name">{house.house_name}</h2>
            <div className="house-id-badge">ID: {house.home_id}</div>

            <div style={{ marginTop: '16px', display: 'flex', gap: '8px' }}>
              <button onClick={handleEditHouse} className="btn-secondary" style={{ padding: '6px 12px', fontSize: '0.85rem' }}>
                <FaEdit /> Edit
              </button>
              <button onClick={handleDeleteHouse} className="delete-btn" style={{ padding: '6px 12px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <FaTrash />
              </button>
            </div>
          </div>

          <div className="house-info-list">
            <div className="info-item">
              <div className="info-label">Family Name</div>
              <div className="info-value" style={{ fontSize: '1.1rem', fontWeight: 600 }}>{house.family_name || 'N/A'}</div>
            </div>
            <div className="info-item">
              <div className="info-label">Location</div>
              <div className="info-value"><FaMapMarkerAlt size={12} style={{ marginRight: 4 }} /> {house.location_name || 'N/A'}</div>
            </div>
            <div className="info-item">
              <div className="info-label">Area</div>
              <div className="info-value">{area ? area.name : 'Unknown Area'}</div>
            </div>
            <div className="info-item">
              <div className="info-label">Address</div>
              <div className="info-value" style={{ lineHeight: '1.4' }}>
                {house.address || house.house_name}
                <br />
                {house.location_name}, {area?.name}
              </div>
            </div>

            <div className="info-item">
              <div className="info-label">Residents Count</div>
              <div className="info-value">{houseMembers.length} Members</div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Column */}
      <div className="right-column">

        {/* Top Section: Family Members */}
        <div className="detail-card family-section-card">
          <div className="section-title-header">
            <h3><FaUsers color="var(--primary-color)" /> Residents</h3>
            <span className="badge-count">{houseMembers.length} Members</span>
          </div>

          <div className="family-grid-list">
            {houseMembers.length > 0 ? (
              houseMembers.map(member => (
                <div
                  key={member.member_id}
                  className="resident-card"
                  onClick={() => handleViewMember(member.member_id)}
                >
                  <div className="resident-avatar">
                    {getInitials(member.name)}
                  </div>
                  <div className="resident-info">
                    <div className="resident-name">{member.name}</div>
                    <div className="resident-role">
                      <span>{member.isGuardian ? 'Guardian' : 'Member'}</span>
                      <span className={`status-dot ${member.status}`}></span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="empty-state">
                <p>No members found in this house.</p>
              </div>
            )}
          </div>
        </div>

        {/* Bottom Section: Obligations */}
        <div className="detail-card obligations-card">
          <div className="section-title-header">
            <h3>💰 Financial Dues</h3>
            <div className="filter-controls">
              <input
                type="text"
                placeholder="Search obligations..."
                className="search-input"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <div className="table-wrapper">
            {filteredObligations.length > 0 ? (
              <table className="obligations-table">
                <thead>
                  <tr>
                    <th>Ref ID</th>
                    <th>Member</th>
                    <th>Description</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredObligations.map(obs => {
                    const sub = allSubcollections.find(sc => sc.id === (typeof obs.subcollection === 'object' ? obs.subcollection.id : obs.subcollection));
                    const mem = houseMembers.find(m => m.member_id === (typeof obs.member === 'object' ? obs.member.member_id : obs.member));

                    return (
                      <tr key={obs.id}>
                        <td>#{obs.id}</td>
                        <td>{mem ? mem.name : 'Unknown'}</td>
                        <td>
                          <div style={{ fontWeight: 500 }}>{sub ? sub.name : 'Unknown Obligation'}</div>
                        </td>
                        <td style={{ fontWeight: 600 }}>₹{obs.amount}</td>
                        <td>
                          <span className={`status-pill ${obs.paid_status}`}>
                            {obs.paid_status}
                          </span>
                        </td>
                        <td>{new Date(obs.created_at || Date.now()).toLocaleDateString()}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <div className="empty-state" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)', minHeight: '150px' }}>
                <p>No obligations found for this house.</p>
              </div>
            )}
          </div>
        </div>

      </div>

      <DeleteConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={confirmDelete}
        item={house}
        itemType="houses"
      />
    </div>
  );
};

export default HouseDetailsPage;
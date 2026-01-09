import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { memberAPI, houseAPI, areaAPI, obligationAPI, subcollectionAPI } from '../api';
import { FaUser, FaHome, FaMapMarkerAlt, FaPhone, FaBirthdayCake, FaEdit, FaTrash, FaArrowLeft, FaUsers, FaArrowRight, FaWhatsapp } from 'react-icons/fa';

import DeleteConfirmModal from './DeleteConfirmModal';
import './MemberDetailsPage.css';

const MemberDetailsPage = ({ members: initialMembers, houses, areas, setEditing, deleteItem, loadDataForTab }) => {
  const { memberId } = useParams();
  const navigate = useNavigate();
  const [member, setMember] = useState(null);
  const [house, setHouse] = useState(null);
  const [area, setArea] = useState(null);
  const [familyMembers, setFamilyMembers] = useState([]);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [memberToDelete, setMemberToDelete] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('house'); // 'house' or 'family'
  const [searchTerm, setSearchTerm] = useState('');

  const [obligations, setObligations] = useState([]);
  const [subcollections, setSubcollections] = useState([]);

  // Use useMemo to ensure we have a stable reference to memberId
  const stableMemberId = useMemo(() => memberId, [memberId]);

  useEffect(() => {
    const loadMemberData = async () => {
      try {
        setLoading(true);
        // Always fetch from API to get the latest data
        const memberResponse = await memberAPI.get(stableMemberId);
        const currentMember = memberResponse.data;
        setMember(currentMember);

        // Fetch house and area data
        if (currentMember.house) {
          const houseResponse = await houseAPI.get(currentMember.house);
          setHouse(houseResponse.data);

          if (houseResponse.data.area) {
            const areaResponse = await areaAPI.get(houseResponse.data.area);
            setArea(areaResponse.data);
          }

          // Fetch family members (members in the same house)
          try {
            // We need to fetch all members then filter by house_id as there might not be a direct endpoint
            // Optimization: If initialMembers is passed and has data, use it. Otherwise fetch.
            let allMembers = [];
            if (initialMembers && initialMembers.length > 0) {
              allMembers = initialMembers;
            } else {
              const allMembersRes = await memberAPI.getAll();
              allMembers = allMembersRes.data;
            }

            const family = allMembers.filter(m =>
              m.house === currentMember.house ||
              (typeof m.house === 'object' && m.house.id === currentMember.house)
            );
            setFamilyMembers(family);
          } catch (famError) {
            console.error("Error fetching family members", famError);
          }
        }

        // Fetch obligations for this member
        const obligationsResponse = await obligationAPI.getAll();
        const memberObligations = obligationsResponse.data.filter(obligation =>
          obligation.member === currentMember.member_id ||
          (typeof obligation.member === 'object' && obligation.member.member_id === currentMember.member_id)
        );
        setObligations(memberObligations);

        // Fetch subcollections
        const subcollectionsResponse = await subcollectionAPI.getAll();
        setSubcollections(subcollectionsResponse.data);
      } catch (error) {
        console.error('Failed to load member data:', error);
      } finally {
        setLoading(false);
      }
    };

    if (stableMemberId) {
      loadMemberData();
    }
  }, [stableMemberId, initialMembers]);

  const handleEditMember = () => {
    navigate(`/members/edit/${member.member_id}`);
  };

  const handleDeleteMember = () => {
    if (member) {
      setMemberToDelete(member);
      setIsDeleteModalOpen(true);
    }
  };

  const confirmDelete = async () => {
    if (memberToDelete) {
      try {
        await deleteItem('members', memberToDelete.member_id);
        setIsDeleteModalOpen(false);
        setMemberToDelete(null);
        navigate('/members');
        if (loadDataForTab) {
          loadDataForTab('members', true);
        }
      } catch (error) {
        console.error('Failed to delete member:', error);
      }
    }
  };

  const handleDeleteModalClose = () => {
    setIsDeleteModalOpen(false);
    setMemberToDelete(null);
  };

  const handleViewHouse = () => {
    if (house) {
      navigate(`/houses/${house.home_id}`);
    }
  };

  const handleBack = () => {
    navigate('/members');
  };

  const filteredObligations = obligations.filter(obs => {
    const sub = subcollections.find(sc => sc.id === (typeof obs.subcollection === 'object' ? obs.subcollection.id : obs.subcollection));
    const name = sub ? sub.name.toLowerCase() : '';
    return name.includes(searchTerm.toLowerCase());
  });

  if (loading) {
    return (
      <div className="data-section">
        <div className="tab-loading">
          <div className="spinner"></div>
          <p>Loading member details...</p>
        </div>
      </div>
    );
  }

  if (!member) {
    return (
      <div className="data-section">
        <div className="error-container">
          <h2>Member not found</h2>
          <p>Could not find member with ID: {stableMemberId}</p>
          <button onClick={handleBack} className="back-btn">
            <FaArrowLeft /> Back to Members
          </button>
        </div>
      </div>
    );
  }

  // Helper to get initials
  const getInitials = (name) => {
    return name ? name.charAt(0).toUpperCase() : '?';
  };

  return (
    <div className="member-details-wrapper animate-in">
      {/* Left Column: Personal Details */}
      <div className="left-column">
        <div className="detail-card personal-details-card">
          <div className="profile-header">
            <div className="top-bar">
              <button onClick={handleBack} className="back-btn-corner" title="Back">
                {/* <FaArrowLeft size={14} /> */}
                <span style={{ fontSize: '12px' }}>Back</span>
              </button>

              <div className="live-badge">
                {member.status || 'Live'}
              </div>
            </div>
            <div className="avatar-large">
              {getInitials(member.name)}
            </div>
            <h2 className="member-name">{member.name}.{member.surname}</h2>
            <div className="member-id-badge">ID: {member.member_id}</div>

            <div style={{ marginTop: '16px', display: 'flex', gap: '8px' }}>
              <button onClick={handleEditMember} className="btn-secondary" style={{ padding: '6px 12px', fontSize: '0.85rem' }}>
                <FaEdit /> Edit
              </button>
              <button onClick={handleDeleteMember} className="delete-btn" style={{ padding: '6px 12px', fontSize: '0.85rem' }}>
                <FaTrash />
              </button>
            </div>
          </div>

          <div className="personal-info-list">
            <div className="info-item">
              <div className="info-label">General Body Member</div>
              <div className="info-value">{member.general_body_member ? 'Yes' : 'No'}</div>
            </div>
            <div className="info-item">
              <div className="info-label">Guardian</div>
              <div className="info-value">{member.isGuardian ? 'Yes' : 'No'}</div>
            </div>
            <div className="info-item">
              <div className="info-label">Phone Numbers</div>
              <div className="info-value"><FaPhone size={12} /> {member.phone || 'N/A'}</div>
              {member.whatsapp && (
                <div className="info-value" style={{ marginTop: '8px' }}>
                  <a
                    href={`https://wa.me/${member.whatsapp?.replace(/\D/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="whatsapp-btn"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      color: '#25D366',
                      textDecoration: 'none',
                      fontSize: '0.9rem',
                      fontWeight: 600,
                      padding: '4px 8px',
                      background: 'rgba(37, 211, 102, 0.1)',
                      borderRadius: '4px'
                    }}
                  >
                    <FaWhatsapp size={16} /> Message
                  </a>
                </div>
              )}
            </div>
            <div className="info-item">
              <div className="info-label">Date of Birth</div>
              <div className="info-value"><FaBirthdayCake size={12} /> {member.date_of_birth ? new Date(member.date_of_birth).toLocaleDateString() : 'N/A'}</div>
            </div>
            <div className="info-item">
              <div className="info-label">Gender</div>
              <div className="info-value">{member.gender || 'N/A'}</div>
            </div>

            <hr style={{ margin: '20px 0', border: '0', borderTop: '1px solid #eee' }} />

            <div className="info-item">
              <div className="info-label">Aadhar Number</div>
              <div className="info-value blurred">{member.adhar || 'Unavailable'}</div>
            </div>
            <div className="info-item">
              <div className="info-label">Father's Name</div>
              <div className="info-value">{member.father_name || '---'}</div>
            </div>
            <div className="info-item">
              <div className="info-label">Mother's Name</div>
              <div className="info-value">{member.mother_name || '---'}</div>
            </div>
            <div className="info-item">
              <div className="info-label">Spouse's Name</div>
              <div className="info-value">{member.married_to_name || '---'}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Column */}
      <div className="right-column">

        {/* Top Section: House & Family Tabs */}
        <div className="detail-card top-section-card">
          <div className="tabs-header">
            <button
              className={`tab-btn ${activeTab === 'house' ? 'active' : ''}`}
              onClick={() => setActiveTab('house')}
            >
              House Details
            </button>
            <button
              className={`tab-btn ${activeTab === 'family' ? 'active' : ''}`}
              onClick={() => setActiveTab('family')}
            >
              Family Members
            </button>
          </div>

          <div className="tab-content">
            {activeTab === 'house' && (
              <div className="house-details-view animate-in">
                {house ? (
                  <div className="house-details-grid">
                    <div className="house-info-box">
                      <h3>Address Details</h3>
                      <div className="info-item">
                        <div className="info-label">House Name</div>
                        <div className="info-value" style={{ fontSize: '1.2rem' }}>{house.house_name}</div>
                      </div>
                      <div className="info-item">
                        <div className="info-label">Family Name</div>
                        <div className="info-value">{house.family_name}</div>
                      </div>

                    </div>

                    <div className="house-info-box">
                      <h3>Location</h3>
                      <div className="info-item">
                        <div className="info-label">Location / Area</div>
                        <div className="info-value">
                          {house.location_name || 'N/A'}
                          {area ? `, ${area.name}` : ''}
                        </div>
                      </div>
                      <div className="info-item">
                        <div className="info-label">Total Members</div>
                        <div className="info-value">{familyMembers.length} Members</div>
                      </div>

                      <button onClick={handleViewHouse} className="btn-view-house">
                        View Full House Details <FaArrowRight size={12} />
                      </button>
                    </div>
                  </div>
                ) : (
                  <p>No house linked to this member.</p>
                )}
              </div>
            )}

            {activeTab === 'family' && (
              <div className="family-list-view animate-in">
                <div className="family-grid">
                  {familyMembers.map(fm => (
                    <div
                      key={fm.member_id}
                      className={`family-member-card ${fm.member_id === member.member_id ? 'current' : ''}`}
                      onClick={() => navigate(`/members/${fm.member_id}`)}
                    >
                      <div className="mini-avatar">
                        {getInitials(fm.name)}
                      </div>
                      <div className="family-info">
                        <h4>{fm.name}</h4>
                        <span>{fm.relation || (fm.member_id === member.member_id ? 'Self' : 'Member')}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Bottom Section: Payment History / Obligations */}
        <div className="detail-card obligations-card">
          <div className="card-header-actions">
            <h3 className="card-title">Payment History & Obligations</h3>
            <div className="filter-controls">
              <input
                type="text"
                placeholder="Search..."
                className="search-input"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <select className="search-input" style={{ width: 'auto' }}>
                <option value="all">All</option>
                <option value="paid">Paid</option>
                <option value="pending">Pending</option>
              </select>
            </div>
          </div>

          <div className="table-wrapper">
            {filteredObligations.length > 0 ? (
              <table className="obligations-table">
                <thead>
                  <tr>
                    <th>Ref ID</th>
                    <th>Obligation / Description</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredObligations.map(obs => {
                    const sub = subcollections.find(sc => sc.id === (typeof obs.subcollection === 'object' ? obs.subcollection.id : obs.subcollection));
                    return (
                      <tr key={obs.id}>
                        <td>#{obs.id}</td>
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
              <div className="empty-state" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '200px', color: 'var(--text-muted)' }}>
                <p>No obligations found.</p>
              </div>
            )}
          </div>
        </div>

      </div>

      <DeleteConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={handleDeleteModalClose}
        onConfirm={confirmDelete}
        item={memberToDelete}
        itemType="members"
      />
    </div>
  );
};

export default MemberDetailsPage;
import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { memberAPI, houseAPI, areaAPI, obligationAPI, subcollectionAPI } from '../api';
import { FaUser, FaHome, FaMapMarkerAlt, FaPhone, FaBirthdayCake, FaEdit, FaTrash, FaArrowLeft } from 'react-icons/fa';
import MemberModal from './MemberModal';
import DeleteConfirmModal from './DeleteConfirmModal';
import './App.css';

const MemberDetailsPage = ({ members, houses, areas, setEditing, deleteItem, loadDataForTab }) => {
  const { memberId } = useParams();
  const navigate = useNavigate();
  const [member, setMember] = useState(null);
  const [house, setHouse] = useState(null);
  const [area, setArea] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [memberToDelete, setMemberToDelete] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
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
        setMember(memberResponse.data);
        
        // Fetch house and area data
        if (memberResponse.data.house) {
          const houseResponse = await houseAPI.get(memberResponse.data.house);
          setHouse(houseResponse.data);
          
          if (houseResponse.data.area) {
            const areaResponse = await areaAPI.get(houseResponse.data.area);
            setArea(areaResponse.data);
          }
        }
        
        // Fetch obligations for this member
        const obligationsResponse = await obligationAPI.getAll();
        const memberObligations = obligationsResponse.data.filter(obligation => 
          obligation.member === memberResponse.data.member_id ||
          (typeof obligation.member === 'object' && obligation.member.member_id === memberResponse.data.member_id)
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
  }, [stableMemberId]); // Only depend on stableMemberId

  const handleEditMember = () => {
    setIsEditModalOpen(true);
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
        // Navigate back to members list
        navigate('/members');
        // Reload member data after deletion
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

  const handleEditModalClose = () => {
    setIsEditModalOpen(false);
  };

  const handleEditSuccess = async () => {
    // Reload the member data after successful edit
    if (stableMemberId) {
      await loadMemberData();
    }
  };

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

  // Find the area for this house
  const houseArea = area || (house?.area ? 
    (typeof house.area === 'object' ? house.area : null) : 
    null);

  // Prepare member data for table display (excluding fields already shown in ATM cards)
  const memberData = [
    { label: 'Member ID', value: `#${member?.member_id || 'N/A'}` },
    { label: 'Aadhar Number', value: member?.adhar || 'N/A' },
    { label: 'WhatsApp', value: member?.whatsapp || 'N/A' },
    { label: 'House ID', value: `#${house?.home_id || 'N/A'}` },
    { label: 'Father\'s Name', value: member?.father_name ? `${member.father_name} ${member.father_surname || ''}` : 'N/A' },
    { label: 'Mother\'s Name', value: member?.mother_name ? `${member.mother_name} ${member.mother_surname || ''}` : 'N/A' },
    { label: 'Guardian', value: member?.isGuardian ? 'Yes' : 'No' },
    { label: 'Date of Death', value: member?.date_of_death ? new Date(member.date_of_death).toLocaleDateString() : 'N/A' },
    { label: 'Address', value: house?.address || 'N/A' }
  ];

  return (
    <div className="data-section">
      <div className="section-header">
        <h2><FaUser /> Member Details</h2>
        <div className="header-actions">
          <button 
            onClick={handleEditMember}
            className="edit-btn"
          >
            <FaEdit /> Edit Member
          </button>
          <button 
            onClick={handleDeleteMember}
            className="delete-btn"
          >
            <FaTrash /> Delete Member
          </button>
          <button 
            onClick={handleBack}
            className="back-btn"
          >
            <FaArrowLeft /> Back to Members
          </button>
        </div>
      </div>
      
      <div className="member-details-container">
        {/* ATM Style Cards */}
        <div className="atm-cards-row">
          {/* Member ATM Card - Green Gradient */}
          <div className="atm-card member-atm-card">
            <div className="atm-card-header">
              <div className="atm-card-icon">
                <FaUser />
              </div>
              <div className="atm-card-title">Member Details</div>
              <div className="atm-card-id">#{member?.member_id || 'N/A'}</div>
            </div>
            
            <div className="atm-card-content">
              <div className="atm-card-field">
                <div className="atm-card-label">Full Name</div>
                <div className="atm-card-value">{member?.name || 'Unknown Member'}</div>
              </div>
              
              <div className="atm-card-field">
                <div className="atm-card-label">Phone</div>
                <div className="atm-card-value">
                  {member?.phone || member?.whatsapp || 'N/A'}
                </div>
              </div>
              
              <div className="atm-card-field">
                <div className="atm-card-label">House - Area</div>
                <div className="atm-card-value">
                  {house?.house_name || 'N/A'} - {houseArea?.name || 'N/A'}
                </div>
              </div>
              
              <div className="atm-card-field">
                <div className="atm-card-label">House ID</div>
                <div className="atm-card-value">#{house?.home_id || 'N/A'}</div>
              </div>
              
              <div className="atm-card-field">
                <div className="atm-card-label">Date of Birth</div>
                <div className="atm-card-value">
                  {member?.date_of_birth 
                    ? new Date(member.date_of_birth).toLocaleDateString() 
                    : 'N/A'}
                </div>
              </div>
              
              <div className="atm-card-field">
                <div className="atm-card-label">Father's Name</div>
                <div className="atm-card-value">
                  {member?.father_name 
                    ? `${member.father_name} ${member.father_surname || ''}` 
                    : 'N/A'}
                </div>
              </div>
              
              <div className="atm-card-field">
                <div className="atm-card-label">Status</div>
                <div className="atm-card-value">
                  <span className={`status-badge ${member?.status === 'live' ? 'active' : member?.status === 'dead' ? 'inactive' : 'terminated'}`}>
                    {member?.status?.charAt(0).toUpperCase() + (member?.status?.slice(1) || '')}
                  </span>
                </div>
              </div>
            </div>
          </div>
          
          {/* House ATM Card - Blue Gradient */}
          <div className="atm-card house-atm-card">
            <div className="atm-card-header">
              <div className="atm-card-icon">
                <FaHome />
              </div>
              <div className="atm-card-title">House Details</div>
              <div className="atm-card-id">#{house?.home_id || 'N/A'}</div>
            </div>
            
            <div className="atm-card-content">
              <div className="atm-card-field">
                <div className="atm-card-label">House Name</div>
                <div className="atm-card-value">{house?.house_name || 'N/A'}</div>
              </div>
              
              <div className="atm-card-field">
                <div className="atm-card-label">Family Name</div>
                <div className="atm-card-value">{house?.family_name || 'N/A'}</div>
              </div>
              
              <div className="atm-card-field">
                <div className="atm-card-label">Area</div>
                <div className="atm-card-value">{houseArea?.name || 'N/A'}</div>
              </div>
              
              <div className="atm-card-field">
                <div className="atm-card-label">Location</div>
                <div className="atm-card-value">
                  <FaMapMarkerAlt /> {house?.location_name || 'N/A'}
                </div>
              </div>
              
              <div className="atm-card-field">
                <button 
                  onClick={handleViewHouse}
                  className="view-house-btn"
                >
                  View House Details
                </button>
              </div>
            </div>
          </div>
        </div>
        
        {/* Member Full Details Section in Grid Format */}
        <div className="member-full-details">
          <div className="section-header">
            <h3>Member Information</h3>
            <button 
              onClick={handleEditMember}
              className="edit-btn"
            >
              <FaEdit /> Edit Member
            </button>
          </div>
          
          <div className="member-details-grid">
            {memberData.map((item, index) => (
              <div className="detail-item" key={index}>
                <div className="detail-label">{item.label}</div>
                <div className="detail-value">{item.value}</div>
              </div>
            ))}
          </div>
        </div>
        
        {/* Obligations Section */}
        <div className="dues-section">
          <h3>Obligations</h3>
          <div className="dues-content">
            {obligations.length > 0 ? (
              <div className="table-container-no-bg">
                <table>
                  <thead>
                    <tr>
                      <th>Subcollection</th>
                      <th>Amount</th>
                      <th>Status</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {obligations.map(obligation => {
                      // Find the subcollection details for this obligation
                      const subcollection = subcollections.find(sc => sc.id === obligation.subcollection || sc.id === obligation.subcollection?.id);
                      
                      return (
                        <tr key={obligation.id}>
                          <td>{subcollection?.name || 'N/A'}</td>
                          <td>₹{obligation.amount || 0}</td>
                          <td>
                            <span className={`status-badge ${obligation.paid_status === 'paid' ? 'active' : obligation.paid_status === 'pending' ? 'pending' : 'overdue'}`}>
                              {obligation.paid_status?.charAt(0).toUpperCase() + obligation.paid_status?.slice(1)}
                            </span>
                          </td>
                          <td>{obligation.created_at ? new Date(obligation.created_at).toLocaleDateString() : 'N/A'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <p>No obligations found for this member</p>
            )}
          </div>
        </div>
      </div>
      
      {/* Edit Member Modal */}
      <MemberModal
        isOpen={isEditModalOpen}
        onClose={handleEditModalClose}
        onSubmit={handleEditSuccess}
        initialData={member}
        loadDataForTab={loadDataForTab}
      />
      
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
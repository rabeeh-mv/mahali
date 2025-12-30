import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { houseAPI, memberAPI, areaAPI, obligationAPI } from '../api';
import { FaHome, FaUser, FaArrowLeft, FaCrown, FaEdit, FaMapMarkerAlt } from 'react-icons/fa';
import HouseModal from './HouseModal';
import './App.css';

const HouseDetailsPage = ({ houses, members, areas, subcollections, setEditing, loadDataForTab }) => {
  const { houseId } = useParams();
  const navigate = useNavigate();
  const [house, setHouse] = useState(null);
  const [houseMembers, setHouseMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [area, setArea] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [obligations, setObligations] = useState([]);

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
        
        // Fetch members for this house
        const membersResponse = await memberAPI.getAll();
        
        console.log('Full members response:', membersResponse);
        
        console.log('Full members data:', membersResponse.data);
        
        // Check if membersResponse.data is an array, if not, try to access the actual array
        let membersArray = [];
        if (Array.isArray(membersResponse.data)) {
          membersArray = membersResponse.data;
          console.log('Using membersResponse.data array, length:', membersArray.length);
        } else if (membersResponse.data && Array.isArray(membersResponse.data.results)) {
          // Handle paginated response
          membersArray = membersResponse.data.results;
          console.log('Using membersResponse.data.results array, length:', membersArray.length);
        } else if (Array.isArray(membersResponse)) {
          // If the response itself is an array
          membersArray = membersResponse;
          console.log('Using membersResponse as array, length:', membersArray.length);
        }
        
        console.log('Expected house ID:', houseResponse.data.home_id, 'Type:', typeof houseResponse.data.home_id);
        console.log('Members array to filter:', membersArray);
        
        const filteredMembers = membersArray.filter(member => {
          const memberHouse = member.house;
          const expectedHouseId = houseResponse.data.home_id;
          
          console.log('Checking member:', member.name || member.member_id, 'Member house field:', memberHouse, 'Type:', typeof memberHouse);
          
          // Handle different formats of house reference
          if (!memberHouse) {
            console.log('Member has no house field');
            return false;
          }
          
          // Convert both to strings for comparison to handle type differences
          const expectedHouseIdStr = String(expectedHouseId);
          
          console.log('Comparing member.house (raw):', memberHouse, 'with expected:', expectedHouseIdStr);
          
          // Check if member.house is a string representation of a number that equals expected ID
          if (String(memberHouse) === expectedHouseIdStr) {
            console.log('Direct string match found for member:', member.name || member.member_id);
            return true;
          }
          
          // Check if member.house is a number that equals expected ID
          if (Number(memberHouse) === Number(expectedHouseId)) {
            console.log('Number match found for member:', member.name || member.member_id);
            return true;
          }
          
          // Case 2: member.house is an object with a home_id property
          if (typeof memberHouse === 'object' && memberHouse.home_id != undefined) {
            if (String(memberHouse.home_id) === expectedHouseIdStr) {
              console.log('Object with home_id match found for member:', member.name || member.member_id);
              return true;
            }
          }
          
          // Case 3: member.house is an object with an id property
          if (typeof memberHouse === 'object' && memberHouse.id != undefined) {
            if (String(memberHouse.id) === expectedHouseIdStr) {
              console.log('Object with id match found for member:', member.name || member.member_id);
              return true;
            }
          }
          
          // Case 4: member.house is an object with a pk property (Django primary key)
          if (typeof memberHouse === 'object' && memberHouse.pk != undefined) {
            if (String(memberHouse.pk) === expectedHouseIdStr) {
              console.log('Object with pk match found for member:', member.name || member.member_id);
              return true;
            }
          }
          
          // Case 5: member.house is an object with a home property
          if (typeof memberHouse === 'object' && memberHouse.home != undefined) {
            if (String(memberHouse.home) === expectedHouseIdStr) {
              console.log('Object with home property match found for member:', member.name || member.member_id);
              return true;
            }
          }
          
          console.log('No match for member:', member.name || member.member_id, 'with house value:', memberHouse);
          return false;
        });
        
        console.log('Filtered members result:', filteredMembers);
        setHouseMembers(filteredMembers);
        
        // Fetch obligations for all members in this house
        const obligationsResponse = await obligationAPI.getAll();
        const houseMemberIds = filteredMembers.map(member => member.member_id);
        const houseObligations = obligationsResponse.data.filter(obligation => 
          houseMemberIds.includes(obligation.member) || 
          houseMemberIds.includes(obligation.member?.member_id)
        );
        setObligations(houseObligations);
      } catch (error) {
        console.error('Failed to load house data:', error);
      } finally {
        setLoading(false);
      }
    };

    if (stableHouseId) {
      loadHouseData();
    }
  }, [stableHouseId]); // Only depend on stableHouseId

  const getGuardian = () => {
    // Find the member marked as guardian
    return houseMembers.find(member => member.isGuardian) || 
           houseMembers.find(member => member.status === 'live');
  };

  const guardian = getGuardian();

  const handleBack = () => {
    navigate('/houses');
  };

  const handleViewMember = (memberId) => {
    navigate(`/members/${memberId}`);
  };

  const handleEditHouse = () => {
    setIsEditModalOpen(true);
  };

  const handleEditModalClose = () => {
    setIsEditModalOpen(false);
  };

  const handleEditSuccess = async () => {
    // Reload the house data after successful edit
    if (stableHouseId) {
      await loadHouseData();
    }
    // Close the modal
    setIsEditModalOpen(false);
    // Reload data for houses tab
    if (loadDataForTab) {
      loadDataForTab('houses', true);
    }
  };

  // Function to reload house data (for use in handleEditSuccess)
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
      
      // Fetch members for this house
      const membersResponse = await memberAPI.getAll();
      
      console.log('Full members response:', membersResponse);
      
      console.log('Full members data:', membersResponse.data);
      
      // Check if membersResponse.data is an array, if not, try to access the actual array
      let membersArray = [];
      if (Array.isArray(membersResponse.data)) {
        membersArray = membersResponse.data;
        console.log('Using membersResponse.data array, length:', membersArray.length);
      } else if (membersResponse.data && Array.isArray(membersResponse.data.results)) {
        // Handle paginated response
        membersArray = membersResponse.data.results;
        console.log('Using membersResponse.data.results array, length:', membersArray.length);
      } else if (Array.isArray(membersResponse)) {
        // If the response itself is an array
        membersArray = membersResponse;
        console.log('Using membersResponse as array, length:', membersArray.length);
      }
      
      console.log('Expected house ID:', houseResponse.data.home_id, 'Type:', typeof houseResponse.data.home_id);
      console.log('Members array to filter:', membersArray);
      
      const filteredMembers = membersArray.filter(member => {
        const memberHouse = member.house;
        const expectedHouseId = houseResponse.data.home_id;
        
        console.log('Checking member:', member.name || member.member_id, 'Member house field:', memberHouse, 'Type:', typeof memberHouse);
        
        // Handle different formats of house reference
        if (!memberHouse) {
          console.log('Member has no house field');
          return false;
        }
        
        // Convert both to strings for comparison to handle type differences
        const expectedHouseIdStr = String(expectedHouseId);
        
        console.log('Comparing member.house (raw):', memberHouse, 'with expected:', expectedHouseIdStr);
        
        // Check if member.house is a string representation of a number that equals expected ID
        if (String(memberHouse) === expectedHouseIdStr) {
          console.log('Direct string match found for member:', member.name || member.member_id);
          return true;
        }
        
        // Check if member.house is a number that equals expected ID
        if (Number(memberHouse) === Number(expectedHouseId)) {
          console.log('Number match found for member:', member.name || member.member_id);
          return true;
        }
        
        // Case 2: member.house is an object with a home_id property
        if (typeof memberHouse === 'object' && memberHouse.home_id != undefined) {
          if (String(memberHouse.home_id) === expectedHouseIdStr) {
            console.log('Object with home_id match found for member:', member.name || member.member_id);
            return true;
          }
        }
        
        // Case 3: member.house is an object with an id property
        if (typeof memberHouse === 'object' && memberHouse.id != undefined) {
          if (String(memberHouse.id) === expectedHouseIdStr) {
            console.log('Object with id match found for member:', member.name || member.member_id);
            return true;
          }
        }
        
        // Case 4: member.house is an object with a pk property (Django primary key)
        if (typeof memberHouse === 'object' && memberHouse.pk != undefined) {
          if (String(memberHouse.pk) === expectedHouseIdStr) {
            console.log('Object with pk match found for member:', member.name || member.member_id);
            return true;
          }
        }
        
        // Case 5: member.house is an object with a home property
        if (typeof memberHouse === 'object' && memberHouse.home != undefined) {
          if (String(memberHouse.home) === expectedHouseIdStr) {
            console.log('Object with home property match found for member:', member.name || member.member_id);
            return true;
          }
        }
        
        console.log('No match for member:', member.name || member.member_id, 'with house value:', memberHouse);
        return false;
      });
      
      console.log('Filtered members result:', filteredMembers);
      setHouseMembers(filteredMembers);
      
      // Fetch obligations for all members in this house
      const obligationsResponse = await obligationAPI.getAll();
      const houseMemberIds = filteredMembers.map(member => member.member_id);
      const houseObligations = obligationsResponse.data.filter(obligation => 
        houseMemberIds.includes(obligation.member) || 
        houseMemberIds.includes(obligation.member?.member_id)
      );
      setObligations(houseObligations);
    } catch (error) {
      console.error('Failed to load house data:', error);
    } finally {
      setLoading(false);
    }
  };

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
            <FaArrowLeft /> Back to Houses
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="data-section">
      <div className="section-header">
        <h2><FaHome /> House Details</h2>
        <div className="header-actions">
          <button onClick={handleEditHouse} className="edit-btn">
            <FaEdit /> Edit House
          </button>
          <button onClick={handleBack} className="back-btn">
            <FaArrowLeft /> Back to Houses
          </button>
        </div>
      </div>
      
      {/* ATM Style Cards */}
      <div className="atm-cards-row">
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
              <div className="atm-card-value">{area?.name || 'N/A'}</div>
            </div>
            
            <div className="atm-card-field">
              <div className="atm-card-label">Location</div>
              <div className="atm-card-value">
                <FaMapMarkerAlt /> {house?.location_name || 'N/A'}
              </div>
            </div>
            
            <div className="atm-card-field">
              <div className="atm-card-label">Address</div>
              <div className="atm-card-value">{house?.address || 'N/A'}</div>
            </div>
          </div>
        </div>
        
        {/* Guardian ATM Card - Orange Gradient */}
        {guardian && (
          <div className="atm-card" style={{ background: 'linear-gradient(135deg, #f39c12 0%, #e67e22 100%)' }}>
            <div className="atm-card-header">
              <div className="atm-card-icon">
                <FaCrown />
              </div>
              <div className="atm-card-title">Family Guardian</div>
              <div className="atm-card-id">#{guardian?.member_id || 'N/A'}</div>
            </div>
            
            <div className="atm-card-content">
              <div className="atm-card-field">
                <div className="atm-card-label">Name</div>
                <div className="atm-card-value">{guardian?.name || 'Unknown Member'}</div>
              </div>
              
              <div className="atm-card-field">
                <div className="atm-card-label">Status</div>
                <div className="atm-card-value">
                  <span className={`status-badge ${guardian?.status === 'live' ? 'active' : guardian?.status === 'dead' ? 'inactive' : 'terminated'}`}>
                    {guardian?.status?.charAt(0).toUpperCase() + (guardian?.status?.slice(1) || '')}
                  </span>
                </div>
              </div>
              
              <div className="atm-card-field">
                <div className="atm-card-label">Phone</div>
                <div className="atm-card-value">
                  {guardian?.phone || guardian?.whatsapp || 'N/A'}
                </div>
              </div>
              
              <div className="atm-card-field">
                <button 
                  onClick={() => handleViewMember(guardian.member_id)}
                  className="view-house-btn"
                >
                  View Member Details
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Family Members Section - Designed like Obligations section */}
      <div className="dues-section">
        <h3><FaUser /> Family Members</h3>
        <div className="dues-content">
          {houseMembers.length > 0 ? (
            <div className="table-container-no-bg">
              <table>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Name</th>
                    <th>Surname</th>
                    <th>Status</th>
                    <th>Date of Birth</th>
                    <th>Phone</th>
                    <th>Guardian</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {houseMembers.map(member => (
                    <tr key={member.member_id}>
                      <td>#{member.member_id}</td>
                      <td>{member.name || 'Unknown Member'}</td>
                      <td>{member.surname || 'N/A'}</td>
                      <td>
                        <span className={`status-badge ${member.status === 'live' ? 'active' : member.status === 'dead' ? 'inactive' : 'terminated'}`}>
                          {member.status?.charAt(0).toUpperCase() + member.status?.slice(1)}
                        </span>
                      </td>
                      <td>{member.date_of_birth ? new Date(member.date_of_birth).toLocaleDateString() : 'N/A'}</td>
                      <td>{member.phone || member.whatsapp || 'N/A'}</td>
                      <td>{member.isGuardian ? 'Yes' : 'No'}</td>
                      <td>
                        <button 
                          onClick={() => handleViewMember(member.member_id)}
                          className="view-btn"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p>No members found for this house</p>
          )}
        </div>
      </div>
      
      {/* Obligations Section with margin top */}
      <div className="dues-section" style={{ marginTop: '30px' }}>
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
                    <th>Member</th>
                  </tr>
                </thead>
                <tbody>
                  {obligations.map(obligation => {
                    // Find the member details for this obligation
                    const member = houseMembers.find(m => m.member_id === obligation.member || m.member_id === obligation.member?.member_id);
                    // Find the subcollection details for this obligation
                    const subcollection = subcollections?.find(sc => sc.id === obligation.subcollection);
                    
                    return (
                      <tr key={obligation.id}>
                        <td>{subcollection?.name || 'N/A'}</td>
                        <td>₹{obligation.amount || 0}</td>
                        <td>
                          <span className={`status-badge ${obligation.paid_status === 'paid' ? 'active' : obligation.paid_status === 'pending' ? 'pending' : 'overdue'}`}>
                            {obligation.paid_status?.charAt(0).toUpperCase() + obligation.paid_status?.slice(1)}
                          </span>
                        </td>
                        <td>{member?.name || 'N/A'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p>No obligations found for this house</p>
          )}
        </div>
      </div>
      
      {/* Edit House Modal */}
      <HouseModal
        isOpen={isEditModalOpen}
        onClose={handleEditModalClose}
        onSubmit={handleEditSuccess}
        initialData={house}
        loadDataForTab={loadDataForTab}
      />
    </div>
  );
};

export default HouseDetailsPage;
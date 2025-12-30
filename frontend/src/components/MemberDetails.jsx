import React from 'react';
import { FaUser, FaHome, FaMapMarkerAlt, FaPhone, FaBirthdayCake, FaEdit } from 'react-icons/fa';

const MemberDetails = ({ member, house, area, onViewHouse, onEditMember }) => {
  // Find the area for this house
  const houseArea = area || (house?.area ? 
    (typeof house.area === 'object' ? house.area : null) : 
    null);

  return (
    <div className="member-details-page">
      {/* Member Card */}
      <div className="member-card">
        <div className="card-header">
          <h2 className="card-title"><FaUser /> Member Details</h2>
          <div className="card-id">#{member?.member_id || 'N/A'}</div>
        </div>
        
        <div className="card-content">
          <div className="card-field">
            <div className="card-field-label">Full Name</div>
            <div className="card-field-value">{member?.name || 'Unknown Member'}</div>
          </div>
          
          <div className="card-field">
            <div className="card-field-label">Phone</div>
            <div className="card-field-value">
              {member?.phone || member?.whatsapp || 'N/A'}
            </div>
          </div>
          
          <div className="card-field">
            <div className="card-field-label">House - Area</div>
            <div className="card-field-value">
              {house?.house_name || 'N/A'} - {houseArea?.name || 'N/A'}
            </div>
          </div>
          
          <div className="card-field">
            <div className="card-field-label">House ID</div>
            <div className="card-field-value">#{house?.home_id || 'N/A'}</div>
          </div>
          
          <div className="card-field">
            <div className="card-field-label">Date of Birth</div>
            <div className="card-field-value">
              {member?.date_of_birth 
                ? new Date(member.date_of_birth).toLocaleDateString() 
                : 'N/A'}
            </div>
          </div>
          
          <div className="card-field">
            <div className="card-field-label">Father's Name</div>
            <div className="card-field-value">
              {member?.father_name 
                ? `${member.father_name} ${member.father_surname || ''}` 
                : 'N/A'}
            </div>
          </div>
          
          <div className="card-field">
            <div className="card-field-label">Status</div>
            <div className="card-field-value">
              <span className={`status-badge ${member?.status === 'live' ? 'active' : member?.status === 'dead' ? 'inactive' : 'terminated'}`}>
                {member?.status?.charAt(0).toUpperCase() + (member?.status?.slice(1) || '')}
              </span>
            </div>
          </div>
        </div>
      </div>
      
      {/* House Card */}
      <div className="house-card">
        <div className="card-header">
          <h2 className="card-title"><FaHome /> House Details</h2>
          <div className="card-id">#{house?.home_id || 'N/A'}</div>
        </div>
        
        <div className="card-content">
          <div className="card-field">
            <div className="card-field-label">House Name</div>
            <div className="card-field-value">{house?.house_name || 'N/A'}</div>
          </div>
          
          <div className="card-field">
            <div className="card-field-label">Family Name</div>
            <div className="card-field-value">{house?.family_name || 'N/A'}</div>
          </div>
          
          <div className="card-field">
            <div className="card-field-label">Area</div>
            <div className="card-field-value">{houseArea?.name || 'N/A'}</div>
          </div>
          
          <div className="card-field">
            <div className="card-field-label">Location</div>
            <div className="card-field-value">
              <FaMapMarkerAlt /> {house?.location_name || 'N/A'}
            </div>
          </div>
          
          <div className="card-field">
            <button 
              onClick={() => onViewHouse && onViewHouse(house)}
              className="view-house-btn"
            >
              View House Details
            </button>
          </div>
        </div>
      </div>
      
      {/* Member Full Details Section */}
      <div className="member-full-details">
        <div className="section-header">
          <h3>Member Information</h3>
          <button 
            onClick={() => onEditMember && onEditMember(member)}
            className="edit-btn"
          >
            <FaEdit /> Edit Member
          </button>
        </div>
        
        <div className="details-grid">
          <div className="detail-item">
            <div className="detail-label">Member ID</div>
            <div className="detail-value">#{member?.member_id || 'N/A'}</div>
          </div>
          
          <div className="detail-item">
            <div className="detail-label">Full Name</div>
            <div className="detail-value">{member?.name || 'Unknown Member'}</div>
          </div>
          
          <div className="detail-item">
            <div className="detail-label">Status</div>
            <div className="detail-value">
              <span className={`status-badge ${member?.status === 'live' ? 'active' : member?.status === 'dead' ? 'inactive' : 'terminated'}`}>
                {member?.status?.charAt(0).toUpperCase() + (member?.status?.slice(1) || '')}
              </span>
            </div>
          </div>
          
          <div className="detail-item">
            <div className="detail-label">Date of Birth</div>
            <div className="detail-value">
              {member?.date_of_birth 
                ? new Date(member.date_of_birth).toLocaleDateString() 
                : 'N/A'}
            </div>
          </div>
          
          {member?.date_of_death && (
            <div className="detail-item">
              <div className="detail-label">Date of Death</div>
              <div className="detail-value">
                {new Date(member.date_of_death).toLocaleDateString()}
              </div>
            </div>
          )}
          
          <div className="detail-item">
            <div className="detail-label">Aadhar Number</div>
            <div className="detail-value">{member?.adhar || 'N/A'}</div>
          </div>
          
          <div className="detail-item">
            <div className="detail-label">Phone</div>
            <div className="detail-value">{member?.phone || 'N/A'}</div>
          </div>
          
          <div className="detail-item">
            <div className="detail-label">WhatsApp</div>
            <div className="detail-value">{member?.whatsapp || 'N/A'}</div>
          </div>
          
          <div className="detail-item">
            <div className="detail-label">House ID</div>
            <div className="detail-value">#{house?.home_id || 'N/A'}</div>
          </div>
          
          <div className="detail-item">
            <div className="detail-label">House Name</div>
            <div className="detail-value">{house?.house_name || 'N/A'}</div>
          </div>
          
          <div className="detail-item">
            <div className="detail-label">Area</div>
            <div className="detail-value">{houseArea?.name || 'N/A'}</div>
          </div>
          
          <div className="detail-item">
            <div className="detail-label">Father's Name</div>
            <div className="detail-value">
              {member?.father_name 
                ? `${member.father_name} ${member.father_surname || ''}` 
                : 'N/A'}
            </div>
          </div>
          
          <div className="detail-item">
            <div className="detail-label">Mother's Name</div>
            <div className="detail-value">
              {member?.mother_name 
                ? `${member.mother_name} ${member.mother_surname || ''}` 
                : 'N/A'}
            </div>
          </div>
          
          <div className="detail-item">
            <div className="detail-label">Guardian</div>
            <div className="detail-value">{member?.isGuardian ? 'Yes' : 'No'}</div>
          </div>
        </div>
      </div>
      
      {/* Obligations Section */}
      <div className="dues-section">
        <h3>Obligations</h3>
        <div className="dues-content">
          <p>Not obligations found</p>
        </div>
      </div>
    </div>
  );
};

export default MemberDetails;
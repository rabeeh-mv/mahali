import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { FaUser, FaEdit, FaTrash, FaEye, FaRedo, FaFilter } from 'react-icons/fa'
import DeleteConfirmModal from './DeleteConfirmModal'
import { memberAPI, areaAPI } from '../api'
import './Members.css'

const Members = ({ members, setEditing, deleteItem, loadDataForTab }) => {
  const navigate = useNavigate();
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [memberToDelete, setMemberToDelete] = useState(null)
  const [areas, setAreas] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [filteredMembers, setFilteredMembers] = useState([])
  const [currentPage, setCurrentPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [loading, setLoading] = useState(false)
  const [initialLoad, setInitialLoad] = useState(true)
  const [isThrottling, setIsThrottling] = useState(false)

  // Filter states
  const [showFilterMenu, setShowFilterMenu] = useState(false)
  const [filterCriteria, setFilterCriteria] = useState({
    area: '',
    status: '',
    role: '' // 'guardian', 'non-guardian', or ''
  })

  // Load areas for filtering
  useEffect(() => {
    const loadAreas = async () => {
      try {
        const response = await areaAPI.getAll();
        setAreas(response.data);
      } catch (error) {
        console.error('Failed to load areas:', error);
      }
    };

    loadAreas();
  }, []);

  // Throttle function to prevent excessive API calls
  const throttle = (func, delay) => {
    let timeoutId;
    return (...args) => {
      if (isThrottling) return;
      setIsThrottling(true);
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        func(...args);
        setIsThrottling(false);
      }, delay);
    };
  };

  // Load members data with pagination
  const loadMembers = useCallback(async (page = 1, append = false) => {
    if (loading) return;

    setLoading(true);
    try {
      const params = {
        page: page,
        page_size: 15
      };

      // Add search and filter parameters
      if (searchTerm) {
        params.search = searchTerm;
      }

      if (filterCriteria.area) {
        params.area = filterCriteria.area;
      }

      if (filterCriteria.status) {
        params.status = filterCriteria.status;
      }

      if (filterCriteria.role === 'guardian') {
        params.is_guardian = true;
      } else if (filterCriteria.role === 'non-guardian') {
        params.is_guardian = false;
      }

      const response = await memberAPI.search(params);
      const newMembers = response.data.results || response.data;

      if (append) {
        setFilteredMembers(prev => [...prev, ...newMembers]);
      } else {
        setFilteredMembers(newMembers);
      }

      // Check if there are more pages
      if (response.data.next) {
        setHasMore(true);
      } else {
        setHasMore(false);
      }

      setInitialLoad(false);
    } catch (error) {
      console.error('Failed to load members:', error);
      if (!append) {
        setFilteredMembers([]);
      }
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  }, [searchTerm, filterCriteria, loading]);

  // Load members when filters change (throttled)
  const throttledLoadMembers = useCallback(throttle(() => {
    loadMembers(1, false);
    setCurrentPage(1);
  }, 500), [loadMembers]);

  // Load members when filters or page changes
  useEffect(() => {
    throttledLoadMembers();
  }, [searchTerm, filterCriteria, throttledLoadMembers]);

  // Handle scroll for infinite loading
  const handleScroll = useCallback((e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.target;
    if (!hasMore || loading || initialLoad) return;

    if (scrollTop + clientHeight >= scrollHeight - 50) {
      loadMembers(currentPage + 1, true);
      setCurrentPage(prev => prev + 1);
    }
  }, [hasMore, loading, initialLoad, currentPage, loadMembers]);

  const handleAddMember = () => navigate('/members/add');

  // const handleEditMember = (member) => navigate(`/members/edit/${member.member_id}`); // Removed actions column
  // const handleDeleteMember = (member) => { ... } // Removed actions column

  const handleViewMember = (member) => {
    navigate(`/members/${member.member_id}`);
  }

  const handleReloadData = () => {
    loadMembers(1, false);
  }

  const toggleFilterMenu = () => {
    setShowFilterMenu(!showFilterMenu)
  }

  const applyFilter = (key, value) => {
    setFilterCriteria(prev => ({
      ...prev,
      [key]: value
    }))
    setShowFilterMenu(false) // Optionally keep open
  }

  const removeFilter = (key) => {
    setFilterCriteria(prev => ({
      ...prev,
      [key]: ''
    }))
  }

  const clearAllFilters = () => {
    setFilterCriteria({
      area: '',
      status: '',
      role: ''
    })
    setSearchTerm('')
  }

  // Helper to get label for active filters
  const getFilterLabel = (key, value) => {
    if (!value) return null;
    switch (key) {
      case 'area':
        const area = areas.find(a => a.id.toString() === value.toString());
        return area ? `Area: ${area.name}` : `Area ID: ${value}`;
      case 'status':
        return `Status: ${value.charAt(0).toUpperCase() + value.slice(1)}`;
      case 'role':
        return `Role: ${value === 'guardian' ? 'Guardian' : 'Non-Guardian'}`;
      default:
        return `${key}: ${value}`;
    }
  }

  const hasActiveFilters = searchTerm || Object.values(filterCriteria).some(val => val !== '');

  return (
    <div className="members-page-container animate-in">

      {/* Top Section 1: Title & Main Actions */}
      <div className="members-top-section-1">
        <div className="page-title">
          <div className="header-icon-wrapper">
            <FaUser />
          </div>
          <h1>Members</h1>
        </div>
        <div className="top-actions">
          <button onClick={handleReloadData} className="reload-btn icon-only-btn" title="Reload Data">
            <FaRedo />
          </button>
          <button onClick={handleAddMember} className="btn-primary">
            + New Member
          </button>
        </div>
      </div>

      {/* Top Section 2: Search, Filters, Active Chips */}
      <div className="members-top-section-2">
        <div className="search-filter-wrapper">
          <div className="search-bar">
            <input
              type="text"
              placeholder="Search members..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="filter-container">
            <button
              className={`filter-btn ${showFilterMenu ? 'active' : ''}`}
              onClick={toggleFilterMenu}
            >
              <FaFilter /> Filter
            </button>

            {showFilterMenu && (
              <div className="filter-menu-dropdown">
                <div className="filter-section">
                  <h4>Vital Status</h4>
                  <div className="filter-options">
                    <button onClick={() => applyFilter('status', 'live')} className={filterCriteria.status === 'live' ? 'active' : ''}>Live</button>
                    <button onClick={() => applyFilter('status', 'dead')} className={filterCriteria.status === 'dead' ? 'active' : ''}>Deceased</button>
                    <button onClick={() => applyFilter('status', 'terminated')} className={filterCriteria.status === 'terminated' ? 'active' : ''}>Terminated</button>
                  </div>
                </div>
                <div className="filter-section">
                  <h4>Role</h4>
                  <div className="filter-options">
                    <button onClick={() => applyFilter('role', 'guardian')} className={filterCriteria.role === 'guardian' ? 'active' : ''}>Guardian</button>
                    <button onClick={() => applyFilter('role', 'non-guardian')} className={filterCriteria.role === 'non-guardian' ? 'active' : ''}>Non-Guardian</button>
                  </div>
                </div>
                <div className="filter-section">
                  <h4>Area</h4>
                  <div className="filter-options scrollable">
                    {areas.map(area => (
                      <button
                        key={area.id}
                        onClick={() => applyFilter('area', area.id)}
                        className={filterCriteria.area == area.id ? 'active' : ''}
                      >
                        {area.name}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Active Filters List */}
        {hasActiveFilters && (
          <div className="active-filters-list">
            {Object.entries(filterCriteria).map(([key, value]) => {
              if (!value) return null;
              return (
                <div key={key} className="filter-chip gradient-chip">
                  {getFilterLabel(key, value)}
                  <span onClick={() => removeFilter(key)}>&times;</span>
                </div>
              )
            })}
            {searchTerm && (
              <div className="filter-chip gradient-chip">
                Search: "{searchTerm}"
                <span onClick={() => setSearchTerm('')}>&times;</span>
              </div>
            )}
            <button onClick={clearAllFilters} className="clear-all-btn">Clear All</button>
          </div>
        )}
      </div>

      <div className="members-table-container" onScroll={handleScroll}>
        <table className="interactive-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Full Name</th>
              <th>Area / House</th>
              <th className="text-center">Status</th>
              <th className="text-center">Role</th>
              <th>Contact Info</th>
            </tr>
          </thead>
          <tbody>
            {filteredMembers.length > 0 ? (
              filteredMembers.map(member => (
                <tr
                  key={member.member_id}
                  onClick={() => handleViewMember(member)}
                  className="clickable-row"
                >
                  <td className="text-muted font-mono">#{member.member_id}</td>
                  <td>
                    <div className="font-semibold">{member.name} {member.surname}</div>
                  </td>
                  <td>
                    <div className="badge-outline" style={{ display: 'block', textAlign: 'center', marginBottom: '4px' }}>
                      {member.house?.area?.name || member.house?.area_name || 'N/A'}
                    </div>
                    <div className="text-muted" style={{ fontSize: '0.8rem' }}>
                      {member.house?.house_name || 'No House'}
                    </div>
                  </td>
                  <td className="text-center">
                    <span className={`status-badge ${member.status?.toLowerCase() === 'live' ? 'active' : member.status?.toLowerCase() === 'dead' ? 'inactive' : 'terminated'}`}>
                      {member.status?.charAt(0).toUpperCase() + member.status?.slice(1)}
                    </span>
                  </td>
                  <td className="text-center">
                    {member.isGuardian ? (
                      <span className="badge-primary" style={{ fontSize: '0.7rem' }}>Guardian</span>
                    ) : (
                      <span className="text-muted" style={{ fontSize: '1.2rem' }}>-</span>
                    )}
                  </td>
                  <td>
                    <div style={{ fontSize: '0.9rem' }}>{member.phone || 'No Phone'}</div>
                    <div className="text-muted" style={{ fontSize: '0.8rem' }}>{member.whatsapp || ''}</div>
                  </td>
                </tr>
              ))
            ) : !loading && (
              <tr>
                <td colSpan="6" className="text-center py-10">
                  <div className="empty-state">
                    <p>No members found matching your criteria.</p>
                  </div>
                </td>
              </tr>
            )}
            {loading && (
              <tr>
                <td colSpan="6" className="text-center">
                  <div className="loading-overlay-inline" style={{ padding: '20px' }}>
                    <div className="spinner-small"></div>
                    <p>Fetching members...</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Delete Modal is still here if we need it for other things, but actions are removed from table */}
      <DeleteConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={() => { }}
        item={memberToDelete}
        itemType="members"
      />
    </div>
  )
}

export default Members
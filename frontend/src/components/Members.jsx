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

  // Multi-select state
  const [selectedMembers, setSelectedMembers] = useState([])
  const [isBulkDeleting, setIsBulkDeleting] = useState(false)

  // Column Filters
  const [columnFilters, setColumnFilters] = useState({
    member_id: '',
    name: '',
    father_name: '',
    mother_name: '',
    phone: '',
    whatsapp: '',
    house_name: '',
    adhar: '',
    gender: '',
  })
  const [activeFilterColumn, setActiveFilterColumn] = useState(null) // Which dropdown is open

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
        page_size: 20, // Increased page size for dense view
        ...columnFilters // Add column filters to params
      };

      // Map Role filter to is_guardian parameter
      if (columnFilters.role === 'guardian') {
        params.is_guardian = 'true';
      } else if (columnFilters.role === 'non-guardian') {
        params.is_guardian = 'false';
      }

      // Add search and global filter parameters (legacy support or combined)
      if (searchTerm) {
        params.search = searchTerm;
      }

      if (filterCriteria.area) { // Support legacy prop if still used, or remove if fully migrated
        params.area = filterCriteria.area;
      }

      // Ensure column filters that match API specific params are mapped if needed,
      // generally generic keys in columnFilters are already spread into params above (...columnFilters).
      // But 'role' needed special handling as above.

      // Check for other explicit param mappings if backend expects different names
      // Status, Gender, Area match standard fields or are handled by backend filter mapping.

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
  }, [searchTerm, filterCriteria, columnFilters, loading]);

  // Debounced load for column filters
  useEffect(() => {
    const timer = setTimeout(() => {
      loadMembers(1, false);
      setCurrentPage(1);
    }, 400); // 400ms debounce
    return () => clearTimeout(timer);
  }, [columnFilters]); // Trigger when columnFilters change

  // Existing load triggers
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

  const handleViewMember = (member) => {
    navigate(`/members/${member.member_id}`);
  }

  const handleReloadData = () => {
    loadMembers(1, false);
    setSelectedMembers([]); // Clear selections on reload
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
    setFilterCriteria({ area: '', status: '', role: '' })
    setSearchTerm('')
    setColumnFilters({
      member_id: '', name: '', father_name: '', mother_name: '',
      phone: '', whatsapp: '', house_name: '', adhar: '', gender: ''
    })
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

  // Selection Logic
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      const allIds = filteredMembers.map(m => m.member_id);
      setSelectedMembers(allIds);
    } else {
      setSelectedMembers([]);
    }
  };

  const handleSelectMember = (e, memberId) => {
    e.stopPropagation(); // Prevent row click
    if (e.target.checked) {
      setSelectedMembers(prev => [...prev, memberId]);
    } else {
      setSelectedMembers(prev => prev.filter(id => id !== memberId));
    }
  };

  const isAllSelected = filteredMembers.length > 0 && selectedMembers.length === filteredMembers.length;

  // Bulk Delete Logic
  const handleBulkDeleteClick = () => {
    setIsDeleteModalOpen(true);
  };

  const confirmBulkDelete = async () => {
    setIsBulkDeleting(true);
    try {
      // Loop through selected IDs and delete them one by one
      // In a real production app, you'd want a bulk delete API endpoint.
      for (const id of selectedMembers) {
        await memberAPI.delete(id);
      }

      // Cleanup
      setSelectedMembers([]);
      setIsDeleteModalOpen(false);
      loadMembers(1, false); // Reload list

    } catch (error) {
      console.error("Error deleting members:", error);
      alert("Failed to delete some members. Please try again.");
    } finally {
      setIsBulkDeleting(false);
    }
  };

  // Helper Component for Column Filter Header
  const FilterHeader = ({ label, field, minWidth, type = 'text', options = [] }) => {
    const isActive = !!columnFilters[field];

    return (
      <th style={{ minWidth: minWidth }}>
        <div className={`th-content ${isActive ? 'filter-active' : ''}`}
          onClick={(e) => {
            e.stopPropagation();
            setActiveFilterColumn(activeFilterColumn === field ? null : field);
          }}>
          {label}
          <FaFilter className="filter-icon" />
        </div>
        {activeFilterColumn === field && (
          <div className="filter-dropdown" onClick={(e) => e.stopPropagation()}>
            {type === 'select' ? (
              <select
                value={columnFilters[field]}
                onChange={(e) => setColumnFilters(prev => ({ ...prev, [field]: e.target.value }))}
                autoFocus
                className="filter-select" // Consider adding CSS for this class
              >
                {options.map((opt, idx) => (
                  <option key={idx} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                placeholder={`Filter ${label}...`}
                value={columnFilters[field]}
                onChange={(e) => setColumnFilters(prev => ({ ...prev, [field]: e.target.value }))}
                autoFocus
              />
            )}
          </div>
        )}
      </th>
    );
  };

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setActiveFilterColumn(null);
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  return (
    <div className="members-page-container animate-in">

      {/* Top Section: Title & Actions */}
      <div className="members-top-section-1">
        <div className="page-title">
          <div className="header-icon-wrapper">
            <FaUser />
          </div>
          <h1>Members</h1>
        </div>
        <div className="top-actions">
          {selectedMembers.length > 0 && (
            <button onClick={handleBulkDeleteClick} className="delete-btn me-2" style={{ backgroundColor: '#fee2e2', color: '#dc2626', border: '1px solid #fecaca' }}>
              <FaTrash /> Delete ({selectedMembers.length})
            </button>
          )}
          <button onClick={handleReloadData} className="reload-btn icon-only-btn" title="Reload Data">
            <FaRedo />
          </button>
          <button onClick={clearAllFilters} className="reload-btn" title="Clear All Filters" style={{ fontSize: '0.8rem' }}>
            Clear Filters
          </button>
          <button onClick={handleAddMember} className="btn-primary">
            + New Member
          </button>
        </div>
      </div>

      <div className="members-table-container" onScroll={handleScroll}>
        <table className="dense-table">
          <thead>
            <tr>
              <th className="col-checkbox">
                <input
                  type="checkbox"
                  onChange={handleSelectAll}
                  checked={isAllSelected}
                />
              </th>

              <th className="col-id">
                <div className="th-content" onClick={(e) => { e.stopPropagation(); setActiveFilterColumn(activeFilterColumn === 'member_id' ? null : 'member_id'); }}>
                  ID <FaFilter className={`filter-icon ${columnFilters.member_id ? 'opacity-100 text-blue-500' : ''}`} />
                </div>
                {activeFilterColumn === 'member_id' && (
                  <div className="filter-dropdown" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="text"
                      placeholder="Filter ID..."
                      value={columnFilters.member_id}
                      onChange={(e) => setColumnFilters(prev => ({ ...prev, member_id: e.target.value }))}
                      autoFocus
                    />
                  </div>
                )}
              </th>

              {/* Manual sticky headers for ID and Name to ensure they match CSS logic */}
              {/* Note: In CSS we targeted specific classes. We'll reuse logic or just use manual Th here for simplicity of sticky */}

              <th className="col-name">
                <div className="th-content" onClick={(e) => { e.stopPropagation(); setActiveFilterColumn(activeFilterColumn === 'name' ? null : 'name'); }}>
                  Full Name <FaFilter className={`filter-icon ${columnFilters.name ? 'opacity-100 text-blue-500' : ''}`} />
                </div>
                {activeFilterColumn === 'name' && (
                  <div className="filter-dropdown" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="text"
                      placeholder="Filter Name..."
                      value={columnFilters.name}
                      onChange={(e) => setColumnFilters(prev => ({ ...prev, name: e.target.value }))}
                      autoFocus
                    />
                  </div>
                )}
              </th>

              <FilterHeader label="House Name" field="house_name" minWidth="150px" />
              <FilterHeader label="Father's Name" field="father_name" minWidth="150px" />
              <FilterHeader label="Whatsapp" field="whatsapp" minWidth="120px" />
              <FilterHeader label="Phone Number" field="phone" minWidth="120px" />

              <FilterHeader
                label="Area"
                field="area"
                minWidth="100px"
                type="select"
                options={[
                  { label: 'All', value: '' },
                  ...areas.map(a => ({ label: a.name, value: a.id }))
                ]}
              />

              <FilterHeader
                label="Role"
                field="role"
                minWidth="100px"
                type="select"
                options={[
                  { label: 'All', value: '' },
                  { label: 'Guardian', value: 'guardian' },
                  { label: 'Non-Guardian', value: 'non-guardian' }
                ]}
              />

              <FilterHeader
                label="Status"
                field="status"
                minWidth="100px"
                type="select"
                options={[
                  { label: 'All', value: '' },
                  { label: 'Live', value: 'live' },
                  { label: 'Deceased', value: 'dead' },
                  { label: 'Terminated', value: 'terminated' }
                ]}
              />

              <FilterHeader
                label="Gender"
                field="gender"
                minWidth="100px"
                type="select"
                options={[
                  { label: 'All', value: '' },
                  { label: 'Male', value: 'male' },
                  { label: 'Female', value: 'female' }
                ]}
              />

              <FilterHeader label="Aadhaar" field="adhar" minWidth="120px" />
              <FilterHeader label="DOB" field="dob" minWidth="100px" />
            </tr>
          </thead>
          <tbody>
            {filteredMembers.length > 0 ? (
              filteredMembers.map(member => (
                <tr
                  key={member.member_id}
                  onClick={() => handleViewMember(member)}
                  className={selectedMembers.includes(member.member_id) ? 'selected-row' : ''}
                >
                  <td className="col-checkbox" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selectedMembers.includes(member.member_id)}
                      onChange={(e) => handleSelectMember(e, member.member_id)}
                    />
                  </td>
                  <td className="col-id is-id-cell">{member.member_id}</td>
                  <td className="col-name font-semibold">{member.name} {member.surname}</td>

                  <td>
                    {member.house?.house_name /* Nested object from search */ ||
                      member.house_details?.house_name /* Nested field from list */ ||
                      (typeof member.house === 'string' ? member.house : null) /* String ID */ ||
                      'N/A'}
                  </td>
                  <td>{member.father_name || member.father?.name || '-'}</td>
                  <td>{member.whatsapp || '-'}</td>
                  <td>{member.phone || '-'}</td>
                  <td>
                    {member.house?.area_name /* Nested object from search */ ||
                      member.house_details?.area_name /* Nested field from list */ ||
                      '-'}
                  </td>

                  <td>{member.isGuardian ? <span className="guardian-badge">Guardian</span> : '-'}</td>

                  <td className="text-center">
                    <span className={`status-badge-${member.status?.toLowerCase()}`}>
                      {member.status}
                    </span>
                  </td>

                  <td>{member.gender}</td>
                  <td>{member.adhar || '-'}</td>
                  <td>{member.date_of_birth || '-'}</td>
                </tr>
              ))
            ) : !loading && (
              <tr>
                <td colSpan="13" className="text-center py-10">
                  <p className="text-gray-500">No members found.</p>
                </td>
              </tr>
            )}
            {loading && (
              <tr><td colSpan="13" className="text-center p-4">Loading...</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <DeleteConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={confirmBulkDelete}
        item={selectedMembers.length > 0 ? { name: `${selectedMembers.length} selected member(s)` } : null}
        itemType="members"
        isLoading={isBulkDeleting}
      />
    </div>
  )
}

export default Members
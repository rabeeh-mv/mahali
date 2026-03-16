import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { FaUser, FaEdit, FaTrash, FaEye, FaRedo, FaFilter, FaCog, FaFileExcel, FaColumns, FaGripVertical } from 'react-icons/fa'
import DeleteConfirmModal from './DeleteConfirmModal'
import { memberAPI, areaAPI } from '../api'
import * as XLSX from 'xlsx'
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
    surname: '',
    father_name: '',
    mother_name: '',
    phone: '',
    whatsapp: '',
    house_name: '',
    adhar: '',
    gender: '',
    area: '',
    role: '',
    status: '',
    dob: ''
  })

  // Column Management State
  const defaultColumns = [
    { id: 'member_id', label: 'ID', visible: true, width: '80px' },
    { id: 'name', label: 'Name', visible: true, width: '150px' },
    { id: 'surname', label: 'Surname', visible: true, width: '150px' },
    { id: 'house_name', label: 'House Name', visible: true, width: '150px' },
    { id: 'father_name', label: "Father's Name", visible: true, width: '150px' },
    { id: 'whatsapp', label: 'Whatsapp', visible: true, width: '120px' },
    { id: 'phone', label: 'Phone Number', visible: true, width: '120px' },
    { id: 'area', label: 'Area', visible: true, width: '100px' },
    { id: 'role', label: 'Role', visible: true, width: '100px' },
    { id: 'status', label: 'Status', visible: true, width: '100px' },
    { id: 'gender', label: 'Gender', visible: true, width: '100px' },
    { id: 'adhar', label: 'Aadhaar', visible: true, width: '120px' },
    { id: 'dob', label: 'DOB', visible: true, width: '100px' }
  ];

  const [columnsConfig, setColumnsConfig] = useState(() => {
    const saved = localStorage.getItem('membersColumnConfig')
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        return defaultColumns.map(def => {
          const found = parsed.find(p => p.id === def.id)
          return found ? { ...def, visible: found.visible } : def
        });
      } catch (e) {
        return defaultColumns
      }
    }
    return defaultColumns
  })

  const [showColumnManager, setShowColumnManager] = useState(false)
  const columnManagerRef = useRef(null)
  
  // Drag and Drop refs
  const dragItem = useRef(null)
  const dragOverItem = useRef(null)
  const [dragTick, setDragTick] = useState(0) // Used to safely trigger minimal re-renders for highlighting
  
  const handleDragStart = (e, index) => {
    dragItem.current = index;
    setDragTick(t => t + 1);
  };

  const handleDragEnter = (e, index) => {
    e.preventDefault();
    if (dragOverItem.current !== index) {
      dragOverItem.current = index;
      setDragTick(t => t + 1);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault(); // allow drop
  };

  const handleDrop = (e, index) => {
    e.preventDefault();
    if (dragItem.current !== null && index !== null && dragItem.current !== index) {
      setColumnsConfig(prev => {
        const newConfig = [...prev];
        const draggedItem = newConfig.splice(dragItem.current, 1)[0];
        newConfig.splice(index, 0, draggedItem);
        return newConfig;
      });
    }
    dragItem.current = null;
    dragOverItem.current = null;
    setDragTick(t => t + 1);
  };

  const handleDragEnd = () => {
    dragItem.current = null;
    dragOverItem.current = null;
    setDragTick(t => t + 1);
  };

  useEffect(() => {
    localStorage.setItem('membersColumnConfig', JSON.stringify(columnsConfig))
  }, [columnsConfig])

  useEffect(() => {
    function handleClickOutside(event) {
      if (columnManagerRef.current && !columnManagerRef.current.contains(event.target)) {
        setShowColumnManager(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const toggleColumnVisibility = (colId) => {
    setColumnsConfig(prev => prev.map(c => c.id === colId ? { ...c, visible: !c.visible } : c))
  }

  const moveColumn = (index, direction) => {
    if (index + direction < 0 || index + direction >= columnsConfig.length) return;
    setColumnsConfig(prev => {
      const newConfig = [...prev];
      const temp = newConfig[index];
      newConfig[index] = newConfig[index + direction];
      newConfig[index + direction] = temp;
      return newConfig;
    });
  };

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

      if (searchTerm) {
        params.search = searchTerm;
      }

      if (filterCriteria.area) { 
        params.area = filterCriteria.area;
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
      member_id: '', name: '', surname: '', father_name: '', mother_name: '',
      phone: '', whatsapp: '', house_name: '', adhar: '', gender: '',
      area: '', role: '', status: '', dob: ''
    })
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
      for (const id of selectedMembers) {
        await memberAPI.delete(id);
      }
      setSelectedMembers([]);
      setIsDeleteModalOpen(false);
      loadMembers(1, false); 
    } catch (error) {
      console.error("Error deleting members:", error);
      alert("Failed to delete some members. Please try again.");
    } finally {
      setIsBulkDeleting(false);
    }
  };

  const handleExportExcel = async () => {
    try {
      setLoading(true);
      const params = {
        page: 1,
        page_size: 10000, 
        ...columnFilters
      };

      if (columnFilters.role === 'guardian') params.is_guardian = 'true';
      else if (columnFilters.role === 'non-guardian') params.is_guardian = 'false';
      if (searchTerm) params.search = searchTerm;
      if (filterCriteria.area) params.area = filterCriteria.area;

      const response = await memberAPI.search(params);
      const allData = response.data.results || response.data;
      const activeCols = columnsConfig.filter(c => c.visible);

      const exportData = allData.map(member => {
        const row = {};
        activeCols.forEach(col => {
          let val = '';
          switch (col.id) {
            case 'member_id': val = member.member_id; break;
            case 'name': val = member.name; break;
            case 'surname': val = member.surname; break;
            case 'house_name': val = member.house?.house_name || member.house_details?.house_name || (typeof member.house === 'string' ? member.house : '') || ''; break;
            case 'father_name': val = member.father_name || member.father?.name || ''; break;
            case 'whatsapp': val = member.whatsapp; break;
            case 'phone': val = member.phone; break;
            case 'area': val = member.house?.area_name || member.house_details?.area_name || ''; break;
            case 'role': val = member.isGuardian ? 'Guardian' : ''; break;
            case 'status': val = member.status || ''; break;
            case 'gender': val = member.gender || ''; break;
            case 'adhar': val = member.adhar || ''; break;
            case 'dob': val = member.date_of_birth || ''; break;
            default: break;
          }
          row[col.label] = val;
        });
        return row;
      });

      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Members");

      XLSX.writeFile(workbook, "Members_Export.xlsx");
    } catch (error) {
      console.error("Export failed:", error);
      alert("Failed to export data.");
    } finally {
      setLoading(false);
    }
  };

  const renderFilterInput = (colId) => {
    switch(colId) {
      case 'member_id':
      case 'name':
      case 'surname':
      case 'house_name':
      case 'father_name':
      case 'whatsapp':
      case 'phone':
      case 'adhar':
      case 'dob':
        return (
          <input
            type="text"
            placeholder="Filter..."
            value={columnFilters[colId] || ''}
            onChange={(e) => setColumnFilters(prev => ({ ...prev, [colId]: e.target.value }))}
            className="table-filter-input"
          />
        );
      case 'area':
        return (
          <select
            value={columnFilters.area || ''}
            onChange={(e) => setColumnFilters(prev => ({ ...prev, area: e.target.value }))}
            className="table-filter-select"
          >
            <option value="">All</option>
            {areas.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        );
      case 'role':
        return (
          <select
            value={columnFilters.role || ''}
            onChange={(e) => setColumnFilters(prev => ({ ...prev, role: e.target.value }))}
            className="table-filter-select"
          >
            <option value="">All</option>
            <option value="guardian">Guardian</option>
            <option value="non-guardian">Non-Guardian</option>
          </select>
        );
      case 'status':
        return (
          <select
            value={columnFilters.status || ''}
            onChange={(e) => setColumnFilters(prev => ({ ...prev, status: e.target.value }))}
            className="table-filter-select"
          >
            <option value="">All</option>
            <option value="live">Live</option>
            <option value="dead">Deceased</option>
            <option value="terminated">Terminated</option>
          </select>
        );
      case 'gender':
        return (
          <select
            value={columnFilters.gender || ''}
            onChange={(e) => setColumnFilters(prev => ({ ...prev, gender: e.target.value }))}
            className="table-filter-select"
          >
            <option value="">All</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
          </select>
        );
      default:
        return null;
    }
  };

  const renderCellData = (colId, member) => {
    switch (colId) {
      case 'member_id': return <span className="is-id-cell">{member.member_id}</span>;
      case 'name': return <span className="font-semibold">{member.name}</span>;
      case 'surname': return <span className="font-semibold">{member.surname}</span>;
      case 'house_name': return member.house?.house_name || member.house_details?.house_name || (typeof member.house === 'string' ? member.house : null) || 'N/A';
      case 'father_name': return member.father_name || member.father?.name || '-';
      case 'whatsapp': return member.whatsapp || '-';
      case 'phone': return member.phone || '-';
      case 'area': return member.house?.area_name || member.house_details?.area_name || '-';
      case 'role': return member.isGuardian ? <span className="guardian-badge">Guardian</span> : '-';
      case 'status': return <span className={`status-badge-${member.status?.toLowerCase()}`}>{member.status}</span>;
      case 'gender': return member.gender || '-';
      case 'adhar': return member.adhar || '-';
      case 'dob': return member.date_of_birth || '-';
      default: return null;
    }
  };

  return (
    <div className="members-page-container animate-in">

      {/* Top Section: Title & Actions */}
      <div className="members-top-section-1">
        <div className="M-page-title" style={{ display: 'flex', alignItems: 'center' }}>
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

          <div style={{ position: 'relative' }} ref={columnManagerRef}>
            <button onClick={() => setShowColumnManager(!showColumnManager)} className="reload-btn" title="Manage Columns">
              <FaColumns /> Columns
            </button>
            {showColumnManager && (
              <div className="column-manager-dropdown animate-in" style={{
                position: 'absolute', top: '100%', right: 0, marginTop: '8px',
                background: 'white', border: '1px solid #ddd', borderRadius: '8px',
                padding: '12px', minWidth: '220px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                zIndex: 1000, display: 'flex', flexDirection: 'column', gap: '8px'
              }}>
                <h4 style={{ margin: '0 0 8px', fontSize: '14px', borderBottom: '1px solid #eee', paddingBottom: '8px' }}>Visible Columns</h4>
                <div style={{maxHeight:'250px', overflowY:'auto', display:'flex', flexDirection:'column', gap:'8px', paddingRight: '4px'}}>
                  {columnsConfig.map((col, index) => (
                    <div 
                      key={col.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, index)}
                      onDragEnter={(e) => handleDragEnter(e, index)}
                      onDragOver={handleDragOver}
                      onDrop={(e) => handleDrop(e, index)}
                      onDragEnd={handleDragEnd}
                      style={{ 
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', 
                        fontSize: '14px', whiteSpace: 'nowrap', padding: '6px', 
                        background: dragOverItem.current === index ? '#e0f2fe' : '#f8fafc',
                        border: dragOverItem.current === index ? '1px dashed #0284c7' : '1px solid #e2e8f0',
                        opacity: dragItem.current === index ? 0.3 : 1,
                        borderRadius: '4px', cursor: 'grab', userSelect: 'none',
                        transition: 'all 0.1s ease'
                      }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <FaGripVertical style={{ color: '#cbd5e1', cursor: 'grab' }} />
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', margin: 0 }}>
                          <input 
                            type="checkbox" 
                            checked={col.visible} 
                            onChange={() => toggleColumnVisibility(col.id)}
                          />
                          {col.label}
                        </label>
                      </div>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <button 
                          className="icon-only-btn" 
                          style={{ padding: '2px 6px', fontSize: '10px', minWidth: 'auto', background: index === 0 ? '#f9f9f9' : '#e2e8f0', color: index === 0 ? '#ccc' : '#333' }}
                          onClick={() => moveColumn(index, -1)}
                          disabled={index === 0}
                          title="Move Up"
                        >
                          ▲
                        </button>
                        <button 
                          className="icon-only-btn" 
                          style={{ padding: '2px 6px', fontSize: '10px', minWidth: 'auto', background: index === columnsConfig.length - 1 ? '#f9f9f9' : '#e2e8f0', color: index === columnsConfig.length - 1 ? '#ccc' : '#333' }}
                          onClick={() => moveColumn(index, 1)}
                          disabled={index === columnsConfig.length - 1}
                          title="Move Down"
                        >
                          ▼
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <button onClick={handleExportExcel} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '6px' }} title="Export via Excel">
             <FaFileExcel /> Export
          </button>

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
            {/* Row 1: Headers */}
            <tr>
              <th className="col-checkbox" rowSpan="2" style={{ verticalAlign: 'middle' }}>
                <input
                  type="checkbox"
                  onChange={handleSelectAll}
                  checked={isAllSelected}
                />
              </th>
              {columnsConfig.filter(c => c.visible).map(col => (
                <th key={col.id} style={{ minWidth: col.width }}>{col.label}</th>
              ))}
            </tr>

            {/* Row 2: Filters */}
            <tr className="filter-row">
              {columnsConfig.filter(c => c.visible).map(col => (
                <th key={`filter-${col.id}`}>
                  {renderFilterInput(col.id)}
                </th>
              ))}
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
                  {columnsConfig.filter(c => c.visible).map(col => (
                    <td key={`cell-${member.member_id}-${col.id}`}>
                      {renderCellData(col.id, member)}
                    </td>
                  ))}
                </tr>
              ))
            ) : !loading && (
              <tr>
                <td colSpan={columnsConfig.filter(c => c.visible).length + 1} className="text-center py-10">
                  <p className="text-gray-500">No members found.</p>
                </td>
              </tr>
            )}
            {loading && (
              <tr><td colSpan={columnsConfig.filter(c => c.visible).length + 1} className="text-center p-4">Loading...</td></tr>
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
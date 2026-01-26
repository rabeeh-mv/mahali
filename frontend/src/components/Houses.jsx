import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { FaHome, FaEdit, FaTrash, FaFilter, FaRedo } from 'react-icons/fa'
import DeleteConfirmModal from './DeleteConfirmModal'
import { houseAPI, areaAPI } from '../api'
import './Houses.css'

const Houses = ({ areas, setEditing, deleteItem, loadDataForTab }) => {
  const navigate = useNavigate();
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [houseToDelete, setHouseToDelete] = useState(null)

  // Data State
  const [houseList, setHouseList] = useState([])
  const [loading, setLoading] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [initialLoad, setInitialLoad] = useState(true)

  // Filter State
  const [columnFilters, setColumnFilters] = useState({
    home_id: '',
    house_name: '',
    family_name: '',
    area: '',
    location_name: ''
  })

  const [localAreas, setLocalAreas] = useState([])

  // Selection State (for possible future bulk actions, or just visual parity)
  const [selectedHouses, setSelectedHouses] = useState([])

  // Load areas for filtering
  useEffect(() => {
    const loadAreas = async () => {
      try {
        const response = await areaAPI.getAll();
        setLocalAreas(response.data);
      } catch (error) {
        console.error('Failed to load areas:', error);
      }
    };
    loadAreas();
  }, []);

  // Load houses function
  const loadHouses = useCallback(async (page = 1, append = false) => {
    if (loading) return;

    setLoading(true);
    try {
      const params = {
        page: page,
        page_size: 20,
        ...columnFilters // Spread column filters directly
      };

      // Handle search/legacy mapping if needed
      // Currently mapping specific fields. If backend only supports 'search',
      // we might need to aggregate these into 'search'. 
      // Assuming backend supports these or 'search' is enough for now.
      // If we need to support generic search input from a global bar, we'd add it here.
      // But we are moving to column filters.

      const response = await houseAPI.search(params);
      const newHouses = response.data.results || response.data;

      if (append) {
        setHouseList(prev => [...prev, ...newHouses]);
      } else {
        setHouseList(newHouses);
      }

      // Check validation for next page (simple check)
      if (response.data.next) {
        setHasMore(true);
      } else {
        setHasMore(false);
      }

      setInitialLoad(false);
    } catch (error) {
      console.error('Failed to load houses:', error);
      if (!append) setHouseList([]);
    } finally {
      setLoading(false);
    }
  }, [columnFilters, loading]);

  // Debounce filter changes
  useEffect(() => {
    const timer = setTimeout(() => {
      loadHouses(1, false);
      setCurrentPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [columnFilters]);

  // Handle Scroll (Infinite Loading)
  const handleScroll = useCallback((e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.target;
    if (!hasMore || loading || initialLoad) return;

    if (scrollTop + clientHeight >= scrollHeight - 50) {
      loadHouses(currentPage + 1, true);
      setCurrentPage(prev => prev + 1);
    }
  }, [hasMore, loading, initialLoad, currentPage, loadHouses]);

  // Actions
  const handleAddHouse = () => navigate('/houses/add');

  const handleViewHouse = (house) => {
    navigate(`/houses/${house.home_id}`);
  }

  const handleReloadData = () => {
    loadHouses(1, false);
    setSelectedHouses([]);
  };

  const clearAllFilters = () => {
    setColumnFilters({
      home_id: '',
      house_name: '',
      family_name: '',
      area: '',
      location_name: ''
    });
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedHouses(houseList.map(h => h.home_id));
    } else {
      setSelectedHouses([]);
    }
  };

  const handleSelectHouse = (e, id) => {
    e.stopPropagation();
    if (e.target.checked) {
      setSelectedHouses(prev => [...prev, id]);
    } else {
      setSelectedHouses(prev => prev.filter(x => x !== id));
    }
  };

  const isAllSelected = houseList.length > 0 && selectedHouses.length === houseList.length;

  // Filter Header Helper
  // Filter Header Helper - REMOVED (replaced by direct row)

  // Close dropdowns on click outside - REMOVED (no longer needed)

  return (
    <div className="houses-page-container animate-in">

      {/* Top Section */}
      <div className="houses-top-section-1">
        <div className="H-page-title" style={{ display: 'flex', alignItems: 'center' }}>
          <div className="header-icon-wrapper">
            <FaHome />
          </div>
          <h1>Houses</h1>
        </div>
        <div className="top-actions">
          <button onClick={handleReloadData} className="reload-btn icon-only-btn" title="Reload Data">
            <FaRedo />
          </button>
          <button onClick={clearAllFilters} className="reload-btn" title="Clear All Filters" style={{ fontSize: '0.8rem' }}>
            Clear Filters
          </button>
          <button onClick={handleAddHouse} className="btn-primary">
            + New House
          </button>
        </div>
      </div>

      {/* Table Container */}
      <div className="houses-table-container" onScroll={handleScroll}>
        <table className="Hdense-table">
          <thead>
            {/* Row 1: Column Headers */}
            <tr>
              <th className="col-checkbox" rowSpan="2" style={{ width: '48px', textAlign: 'center', verticalAlign: 'middle' }}>
                <input
                  type="checkbox"
                  onChange={handleSelectAll}
                  checked={isAllSelected}
                />
              </th>

              <th style={{ minWidth: '60px' }}>ID</th>
              <th style={{ minWidth: '140px' }}>House Name</th>
              <th style={{ minWidth: '120px' }}>Family Name</th>
              <th style={{ minWidth: '100px' }}>Area</th>
              <th style={{ minWidth: '100px' }}>Location</th>
              <th style={{ minWidth: '80px', textAlign: 'center' }}>Members</th>
            </tr>

            {/* Row 2: Filter Inputs */}
            <tr className="filter-row">
              <th>
                <input
                  type="text"
                  placeholder="Filter..."
                  value={columnFilters.home_id}
                  onChange={(e) => setColumnFilters(prev => ({ ...prev, home_id: e.target.value }))}
                  className="table-filter-input"
                />
              </th>
              <th>
                <input
                  type="text"
                  placeholder="Filter..."
                  value={columnFilters.house_name}
                  onChange={(e) => setColumnFilters(prev => ({ ...prev, house_name: e.target.value }))}
                  className="table-filter-input"
                />
              </th>
              <th>
                <input
                  type="text"
                  placeholder="Filter..."
                  value={columnFilters.family_name}
                  onChange={(e) => setColumnFilters(prev => ({ ...prev, family_name: e.target.value }))}
                  className="table-filter-input"
                />
              </th>
              <th>
                <select
                  value={columnFilters.area}
                  onChange={(e) => setColumnFilters(prev => ({ ...prev, area: e.target.value }))}
                  className="table-filter-select"
                >
                  <option value="">All</option>
                  {localAreas.map(a => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
              </th>
              <th>
                <input
                  type="text"
                  placeholder="Filter..."
                  value={columnFilters.location_name}
                  onChange={(e) => setColumnFilters(prev => ({ ...prev, location_name: e.target.value }))}
                  className="table-filter-input"
                />
              </th>
              {/* No filter for Count currently */}
              <th></th>
            </tr>
          </thead>
          <tbody>
            {houseList.length > 0 ? (
              houseList.map(house => (
                <tr
                  key={house.home_id}
                  onClick={() => handleViewHouse(house)}
                  className={selectedHouses.includes(house.home_id) ? 'selected-row' : ''}
                >
                  <td className="text-center" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selectedHouses.includes(house.home_id)}
                      onChange={(e) => handleSelectHouse(e, house.home_id)}
                    />
                  </td>
                  <td className="font-mono text-muted">#{house.home_id}</td>
                  <td className="font-semibold">{house.house_name}</td>
                  <td>{house.family_name || '-'}</td>
                  <td>
                    <span className="badge-outline">
                      {house.area_name || localAreas.find(a => a.id === house.area)?.name || '-'}
                    </span>
                  </td>
                  <td>{house.location_name || '-'}</td>
                  <td className="text-center">
                    <span className="badge-primary">{house.member_count || 0}</span>
                  </td>
                </tr>
              ))
            ) : !loading && (
              <tr>
                <td colSpan="7" className="text-center py-10">
                  <div className="empty-state">
                    <p>No houses found.</p>
                  </div>
                </td>
              </tr>
            )}
            {loading && (
              <tr><td colSpan="7" className="text-center p-4">Loading...</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <DeleteConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={() => { }} // Placeholder if needed
        item={houseToDelete}
        itemType="houses"
      />
    </div>
  )
}

export default Houses
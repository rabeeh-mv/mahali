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
  const [houseList, setHouseList] = useState([])
  const [currentPage, setCurrentPage] = useState(1)
  // const [totalPages, setTotalPages] = useState(1) // Not strictly needed for infinite scroll or simple list, but keeping if we want pagination

  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [localAreas, setLocalAreas] = useState([])
  const hasLoadedInitialData = useRef(false);
  const searchParamsRef = useRef({ searchTerm: '', selectedArea: '' });

  // Filter states
  const [showFilterMenu, setShowFilterMenu] = useState(false)
  const [filterCriteria, setFilterCriteria] = useState({
    area: ''
  })

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

  // Update ref when states change (for debounce)
  useEffect(() => {
    searchParamsRef.current = {
      searchTerm,
      selectedArea: filterCriteria.area
    };
  }, [searchTerm, filterCriteria]);

  // Load houses data with pagination
  const loadHouses = useCallback(async (page = 1) => {
    if (loading) return;

    setLoading(true);
    try {
      const params = {
        page: page,
        page_size: 20 // increased size slightly
      };

      // Add search and filter parameters
      if (searchParamsRef.current.searchTerm) {
        params.search = searchParamsRef.current.searchTerm;
      }

      if (searchParamsRef.current.selectedArea) {
        params.area = searchParamsRef.current.selectedArea;
      }

      const response = await houseAPI.search(params);
      const newHouses = response.data.results || response.data;

      setHouseList(newHouses);
      // setTotalPages(Math.ceil(response.data.count / 20));

    } catch (error) {
      console.error('Failed to load houses:', error);
      setHouseList([]);
    } finally {
      setLoading(false);
    }
  }, [loading]);

  // Initial Load
  useEffect(() => {
    if (!hasLoadedInitialData.current) {
      loadHouses(1);
      setCurrentPage(1);
      hasLoadedInitialData.current = true;
    }
  }, [loadHouses]);

  // Debounced Search/Filter
  useEffect(() => {
    if (!hasLoadedInitialData.current) return;

    const handler = setTimeout(() => {
      loadHouses(1);
      setCurrentPage(1);
    }, 800);

    return () => clearTimeout(handler);
  }, [searchTerm, filterCriteria]);


  const handleAddHouse = () => navigate('/houses/add');

  const handleViewHouse = (house) => {
    navigate(`/houses/${house.home_id}`);
  }

  const handleDeleteHouse = (house) => { // Still kept for modal logic if needed, though button removed
    setHouseToDelete(house)
    setIsDeleteModalOpen(true)
  }

  const confirmDelete = async () => {
    if (houseToDelete) {
      await deleteItem('houses', houseToDelete.home_id)
      setIsDeleteModalOpen(false)
      setHouseToDelete(null)
      loadHouses(currentPage);
    }
  }

  const handleReloadData = () => loadHouses(1);

  const toggleFilterMenu = () => setShowFilterMenu(!showFilterMenu);

  const applyFilter = (key, value) => {
    setFilterCriteria(prev => ({ ...prev, [key]: value }));
    setShowFilterMenu(false);
  }

  const removeFilter = (key) => {
    setFilterCriteria(prev => ({ ...prev, [key]: '' }));
  }

  const clearAllFilters = () => {
    setFilterCriteria({ area: '' });
    setSearchTerm('');
  }

  const getFilterLabel = (key, value) => {
    if (!value) return null;
    if (key === 'area') {
      const area = localAreas.find(a => a.id.toString() === value.toString());
      return area ? `Area: ${area.name}` : `Area ID: ${value}`;
    }
    return `${key}: ${value}`;
  }

  const hasActiveFilters = searchTerm || filterCriteria.area;

  return (
    <div className="houses-page-container animate-in">
      {/* Top Section 1 */}
      <div className="houses-top-section-1">
        <div className="page-title">
          <div className="header-icon-wrapper">
            <FaHome />
          </div>
          <h1>Houses</h1>
        </div>
        <div className="top-actions">
          <button onClick={handleReloadData} className="reload-btn icon-only-btn" title="Reload Data">
            <FaRedo />
          </button>
          <button onClick={handleAddHouse} className="btn-primary">
            + New House
          </button>
        </div>
      </div>

      {/* Top Section 2: Search & Filters */}
      <div className="houses-top-section-2">
        <div className="search-filter-wrapper">
          <div className="search-bar">
            <input
              type="text"
              placeholder="Search houses..."
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
                  <h4>Area</h4>
                  <div className="filter-options scrollable">
                    {localAreas.map(area => (
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

        {/* Active Filters */}
        {hasActiveFilters && (
          <div className="active-filters-list">
            {filterCriteria.area && (
              <div className="filter-chip gradient-chip">
                {getFilterLabel('area', filterCriteria.area)}
                <span onClick={() => removeFilter('area')}>&times;</span>
              </div>
            )}
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

      <div className="houses-table-container">
        <table className="interactive-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>House Name</th>
              <th>Family Name</th>
              <th>Area</th>
              <th>Location</th>
              <th className="text-center">Members</th>
            </tr>
          </thead>
          <tbody>
            {houseList.length > 0 ? (
              houseList.map(house => (
                <tr
                  key={house.home_id}
                  onClick={() => handleViewHouse(house)}
                  className="clickable-row"
                >
                  <td className="text-muted font-mono">#{house.home_id}</td>
                  <td className="font-semibold">{house.house_name}</td>
                  <td>{house.family_name}</td>
                  <td>
                    <span className="badge-outline">{house.area_name || 'N/A'}</span>
                  </td>
                  <td className="text-muted">{house.location_name}</td>
                  <td className="text-center">
                    <span className="badge-primary">{house.member_count || 0}</span>
                  </td>
                </tr>
              ))
            ) : !loading && (
              <tr>
                <td colSpan="6" className="text-center py-10">
                  <div className="empty-state">
                    <p>No houses found. Try adjusting your filters.</p>
                  </div>
                </td>
              </tr>
            )}
            {loading && (
              <tr>
                <td colSpan="6" className="text-center">
                  <div className="loading-overlay-inline" style={{ padding: '20px' }}>
                    <div className="spinner-small"></div>
                    <p>Loading houses...</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <DeleteConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={confirmDelete}
        item={houseToDelete}
        itemType="houses"
      />
    </div>
  )
}

export default Houses
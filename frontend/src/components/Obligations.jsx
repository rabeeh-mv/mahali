import React, { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { FaArrowLeft, FaPlus, FaRupeeSign, FaEdit, FaTrash, FaCheck, FaSearch, FaChevronLeft, FaChevronRight, FaRedo, FaUsers } from 'react-icons/fa'
import DeleteConfirmModal from './DeleteConfirmModal'
import ObligationAnalytics from './ObligationAnalytics'
import { areaAPI, obligationAPI, memberAPI } from '../api'

const Obligations = ({
  memberObligations,
  selectedSubcollection,
  members,
  setEditing,
  deleteItem,
  handleAddObligation,
  handleEditObligation,
  handlePayObligation,
  handleAddBulkObligation,
  setSelectedSubcollection,
  setSelectedCollection,
  loadDataForTab,
  setActiveTab
}) => {
  const navigate = useNavigate();
  const analyticsRef = useRef();
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedArea, setSelectedArea] = useState('')
  const [selectedStatus, setSelectedStatus] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(15)
  const [filteredObligations, setFilteredObligations] = useState([])
  const [selectAll, setSelectAll] = useState(false)
  const [selectedObligations, setSelectedObligations] = useState([])
  const [areas, setAreas] = useState([])
  const [loading, setLoading] = useState(false)
  const [localObligations, setLocalObligations] = useState([])
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // State for bulk add modal // Removed
  // const [showBulkAddModal, setShowBulkAddModal] = useState(false); // Removed

  // Get all areas for filtering
  useEffect(() => {
    const loadAllAreas = async () => {
      try {
        const response = await areaAPI.getAll()
        setAreas(response.data)
      } catch (error) {
        console.error('Failed to load areas:', error)
        // Fallback to areas from members if API fails
        const uniqueAreas = [...new Set(members
          .filter(member => member.house && member.house.area)
          .map(member => member.house.area)
          .filter(area => area !== null))]
        setAreas(uniqueAreas)
      }
    }

    loadAllAreas()
  }, [])

  // Load obligations from API after statistics (when subcollection changes)
  useEffect(() => {
    const loadObligations = async () => {
      if (!selectedSubcollection) return;

      try {
        // First call statistics API (handled by ObligationAnalytics component)
        // Then call search API to get obligations with member details and area info
        const params = {
          subcollection: selectedSubcollection.id
        };

        // Add area filter if selected
        if (selectedArea) {
          params.area = selectedArea;
        }

        // Add search term if provided
        if (searchTerm) {
          params.search = searchTerm;
        }

        // Add status filter if selected
        if (selectedStatus) {
          // For the combined "Pending / Overdue" status, we send "pending" to the backend
          // The backend will handle combining pending and overdue
          params.paid_status = selectedStatus;
        }

        const response = await obligationAPI.search(params);
        setLocalObligations(response.data);
      } catch (error) {
        console.error('Failed to load obligations:', error);
        // Fallback to existing data
        setLocalObligations(
          memberObligations.filter(ob => ob.subcollection === selectedSubcollection.id)
        );
      }
    };

    loadObligations();
  }, [selectedSubcollection, memberObligations, selectedArea, searchTerm, selectedStatus]);

  // Filter and paginate obligations
  useEffect(() => {
    // Since we're now filtering on the server side, we just need to paginate
    setFilteredObligations(localObligations)
    setCurrentPage(1) // Reset to first page when data changes
    setSelectedObligations([]) // Clear selection when data changes
    setSelectAll(false)
  }, [localObligations])

  // Bulk add modal functions
  const handleBulkAddOpen = () => {
    navigate('/obligations/bulk-add', { state: { selectedSubcollection } });
  };

  // const handleBulkAddSubmit = async (data) => { // Removed
  //   try {
  //     setLoading(true);

  //     // Use bulk create API to create all obligations at once
  //     await obligationAPI.bulkCreate(data);

  //     // Reload obligations data
  //     if (loadDataForTab) {
  //       await loadDataForTab('obligations', true);
  //     }

  //     // Close the modal
  //     setShowBulkAddModal(false);

  //   } catch (error) {
  //     console.error('Failed to create bulk obligations:', error);
  //     throw error; // Re-throw to let the modal handle the error
  //   } finally {
  //     setLoading(false);
  //   }
  // };

  // Pagination
  const indexOfLastItem = currentPage * itemsPerPage
  const indexOfFirstItem = indexOfLastItem - itemsPerPage
  const currentObligations = filteredObligations.slice(indexOfFirstItem, indexOfLastItem)
  const totalPages = Math.ceil(filteredObligations.length / itemsPerPage)


  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedObligations([])
    } else {
      setSelectedObligations(currentObligations.map(ob => ob.id))
    }
    setSelectAll(!selectAll)
  }

  const handleSelectObligation = (id) => {
    if (selectedObligations.includes(id)) {
      setSelectedObligations(selectedObligations.filter(obId => obId !== id))
    } else {
      setSelectedObligations([...selectedObligations, id])
    }
  }

  const handleBulkPay = async () => {
    if (selectedObligations.length === 0) {
      alert('Please select obligations to pay')
      return
    }

    if (window.confirm(`Are you sure you want to mark ${selectedObligations.length} obligations as paid?`)) {
      try {
        // Show loading state
        setLoading(true)

        // Use the bulkPay endpoint for better performance
        const response = await obligationAPI.bulkPay({ obligation_ids: selectedObligations })

        // Show success message with actual count
        const updatedCount = response.data.updated_count || selectedObligations.length
        alert(`Successfully marked ${updatedCount} obligations as paid`)

        // Clear selection
        setSelectedObligations([])
        setSelectAll(false)

        // Reload data to reflect changes
        if (loadDataForTab) {
          await loadDataForTab('obligations', true)
        }

        // Refresh analytics using ref
        if (analyticsRef.current && analyticsRef.current.refreshAnalytics) {
          analyticsRef.current.refreshAnalytics();
        }
      } catch (error) {
        console.error('Failed to mark obligations as paid:', error)
        // Check if it's a network error or API error
        if (error.response) {
          // API responded with error status
          alert(`Failed to mark obligations as paid: ${error.response.data.error || 'Unknown error'}`)
        } else if (error.request) {
          // Network error
          alert('Failed to mark obligations as paid: Network error. Please check your connection.')
        } else {
          // Other error
          alert('Failed to mark obligations as paid. Please try again.')
        }
      } finally {
        // Remove the artificial delay
        setTimeout(() => {
          if (loading) setLoading(false)
        }, 1000)
      }
    }
  }

  const handleBulkEdit = () => {
    if (selectedObligations.length === 0) {
      alert('Please select an obligation to edit')
      return
    }

    if (selectedObligations.length > 1) {
      alert('Please select only one obligation to edit')
      return
    }

    // Find the selected obligation from all filtered obligations
    const obligationId = selectedObligations[0]
    const obligation = filteredObligations.find(ob => ob.id === obligationId)

    if (!obligation) {
      alert('Obligation not found')
      return
    }

    // Ensure the obligation has subcollection data
    const obligationWithSubcollection = {
      ...obligation,
      subcollection: obligation.subcollection || selectedSubcollection?.id || selectedSubcollection
    };

    if (handleEditObligation) {
      handleEditObligation(obligationWithSubcollection)
    } else if (setEditing) {
      setEditing({ type: 'obligations', data: obligationWithSubcollection })
    }

    // Clear selection after opening edit modal
    setSelectedObligations([])
    setSelectAll(false)
  }

  const handleBulkDelete = () => {
    if (selectedObligations.length === 0) {
      alert('Please select obligations to delete')
      return
    }
    setIsDeleteModalOpen(true);
  }

  const confirmBulkDelete = async () => {
    try {
      setLoading(true)

      // Delete each obligation
      const deletePromises = selectedObligations.map(id => deleteItem('obligations', id))
      await Promise.all(deletePromises)

      // Clear selection
      setSelectedObligations([])
      setSelectAll(false)
      setIsDeleteModalOpen(false);

      // Reload data to reflect changes
      if (loadDataForTab) {
        await loadDataForTab('obligations', true)
      }

      // Refresh analytics using ref
      if (analyticsRef.current && analyticsRef.current.refreshAnalytics) {
        analyticsRef.current.refreshAnalytics();
      }
    } catch (error) {
      console.error('Failed to delete obligations:', error)
      throw error;
    } finally {
      setLoading(false)
    }
  }

  const handleBack = () => {
    // Clear the selected subcollection
    if (setSelectedSubcollection) {
      setSelectedSubcollection(null);
    }
    // Set the active tab to subcollections to match the route we are navigating to
    if (setActiveTab) {
      setActiveTab('subcollections');
    }
    // Navigate back to the subcollections page
    navigate('/subcollections');
  }

  const handleReload = async () => {
    setLoading(true)
    try {
      // Reload both obligations and analytics
      if (loadDataForTab) {
        await loadDataForTab('obligations', true) // Force reload obligations
      }

      // Refresh analytics using ref
      if (analyticsRef.current && analyticsRef.current.refreshAnalytics) {
        analyticsRef.current.refreshAnalytics();
      }
    } catch (error) {
      console.error('Failed to reload data:', error)
    } finally {
      // Remove the artificial delay
      setTimeout(() => {
        if (loading) setLoading(false)
      }, 1000)
    }
  }

  // Function to get area name from obligation data
  const getAreaName = (obligation) => {
    // Check different possible structures for area data
    if (obligation.member?.house?.area?.name) {
      return obligation.member.house.area.name;
    } else if (obligation.member?.house?.area_name) {
      return obligation.member.house.area_name;
    } else if (obligation.area?.name) {
      return obligation.area.name;
    } else if (obligation.area_name) {
      return obligation.area_name;
    }
    return 'N/A';
  }

  const getStatusClass = (status) => {
    switch (status) {
      case 'paid': return 'status-paid'
      case 'pending': return 'status-pending'
      case 'overdue': return 'status-overdue'
      case 'partial': return 'status-partial'
      default: return ''
    }
  }

  const getStatusText = (status) => {
    if (status === 'pending' || status === 'overdue') {
      return 'Pending / Overdue'
    }
    return status.charAt(0).toUpperCase() + status.slice(1)
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'paid': return '#2ecc71'
      case 'pending': return '#f39c12'
      case 'overdue': return '#e74c3c'
      case 'partial': return '#3498db'
      default: return '#95a5a6'
    }
  }

  // If no subcollection is selected, show a message
  if (!selectedSubcollection) {
    return (
      <div className="data-section">
        <div className="section-header">
          <div className="header-content">
            <button onClick={handleBack} className="back-btn">
              <FaArrowLeft />
            </button>
            <h2>Member Obligations</h2>
          </div>
        </div>

        <div className="empty-state">
          <p>Please select a subcollection to view obligations.</p>
          <p>Navigate to Collections and select a subcollection to view its obligations.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="data-section animate-in">
      <div className="section-header">
        <div className="header-content-wrapper">
          <button onClick={handleBack} className="back-btn" title="Back to Collections">
            <FaArrowLeft />
          </button>
          <h2>
            <div className="header-icon-wrapper" style={{ background: 'var(--accent-gradient)' }}>
              💰
            </div>
            Obligations: {selectedSubcollection?.name}
          </h2>
        </div>
        <div className="header-actions">
          <button onClick={handleReload} className="reload-btn" disabled={loading} title="Reload Data">
            <FaRedo />
          </button>
          <button onClick={handleBulkAddOpen} className="btn-primary" title="Add Bulk Obligations">
            <FaUsers /> Bulk Add
          </button>
        </div>
      </div>

      <ObligationAnalytics
        ref={analyticsRef}
        obligations={memberObligations}
        selectedSubcollection={selectedSubcollection}
      />

      {/* Search and Filters */}
      <div className="filter-section">
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="search">Search Obligees</label>
            <div className="input-wrapper">
              <input
                type="text"
                id="search"
                placeholder="Search by Member ID, Name or Surname..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input"
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="area-filter">Area</label>
            <div className="input-wrapper">
              <select
                id="area-filter"
                value={selectedArea}
                onChange={(e) => setSelectedArea(e.target.value)}
                className="filter-select form-input"
              // className=''
              >
                <option value="">All Regions</option>
                {areas.map(area => (
                  <option key={area.id} value={area.id}>{area.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="status-filter">Status</label>
            <div className="input-wrapper">
              <select
                id="status-filter"
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="filter-select"
              >
                <option value="">All Statuses</option>
                <option value="paid">Settled</option>
                <option value="pending">Outstanding / Late</option>
                <option value="partial">Partial Payment</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedObligations.length > 0 && (
        <div className="bulk-actions animate-in">
          <span className="badge-primary">{selectedObligations.length} Selected Items</span>
          <div className="bulk-action-buttons">
            <button onClick={handleBulkPay} className="btn-primary" style={{ background: '#10b981' }} disabled={loading}>
              {loading ? 'Processing...' : <><FaCheck /> Mark Settled</>}
            </button>
            <button onClick={handleBulkEdit} className="btn-secondary" disabled={loading || selectedObligations.length !== 1}>
              <FaEdit /> Edit
            </button>
            <button onClick={handleBulkDelete} className="delete-btn" disabled={loading}>
              <FaTrash /> Delete
            </button>
          </div>
        </div>
      )}

      {/* Obligations Table */}
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th style={{ width: '40px' }}>
                <input
                  type="checkbox"
                  checked={selectAll}
                  onChange={handleSelectAll}
                />
              </th>
              <th>Member ID</th>
              <th>Name</th>
              <th>Surname</th>
              <th>Father Name</th>
              <th>Area</th>
              <th className="text-center">GBM</th>
              <th className="text-center">Guardian</th>
              <th>Due Amount</th>
              <th className="text-center">Status</th>
            </tr>
          </thead>
          <tbody>
            {currentObligations.length > 0 ? (
              currentObligations.map(obligation => (
                <tr key={obligation.id} className={selectedObligations.includes(obligation.id) ? 'selected-row' : ''}>
                  <td>
                    <input
                      type="checkbox"
                      checked={selectedObligations.includes(obligation.id)}
                      onChange={() => handleSelectObligation(obligation.id)}
                    />
                  </td>
                  <td className="font-mono">{obligation.member?.member_id}</td>
                  <td className="font-semibold">{obligation.member?.name || 'Unknown'}</td>
                  <td>{obligation.member?.surname}</td>
                  <td>{obligation.member?.father_name}</td>
                  <td>
                    <span className="badge-outline">{getAreaName(obligation)}</span>
                  </td>
                  <td className="text-center">
                    {obligation.member?.general_body_member ?
                      <FaCheck className="text-success" /> :
                      <span className="text-muted">-</span>
                    }
                  </td>
                  <td className="text-center">
                    {obligation.member?.isGuardian ?
                      <FaCheck className="text-success" /> :
                      <span className="text-muted">-</span>
                    }
                  </td>
                  <td className="font-mono" style={{ color: 'var(--primary)', fontWeight: 700 }}>
                    <FaRupeeSign fontSize="0.8em" /> {obligation.amount}
                  </td>
                  <td className="text-center">
                    <span className={`status-badge ${getStatusClass(obligation.paid_status)}`}>
                      {getStatusText(obligation.paid_status)}
                    </span>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="10" className="text-center py-10">
                  <div className="empty-state">
                    <p>{searchTerm || selectedArea || selectedStatus ? 'No matching records found.' : 'No obligations for this period.'}</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {loading && (
          <div className="loading-overlay-inline">
            <div className="spinner-small"></div>
            <p>Processing batch...</p>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="pagination">
          <button
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
            className="btn-secondary"
          >
            <FaChevronLeft /> Prev
          </button>

          <span className="pagination-info">
            Batch <strong>{currentPage}</strong> of <strong>{totalPages}</strong>
          </span>

          <button
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages}
            className="btn-secondary"
          >
            Next <FaChevronRight />
          </button>
        </div>
      )}
      {/* Pagination component removed for clarity in this view */}

      <DeleteConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={confirmBulkDelete}
        item={{ name: `${selectedObligations.length} selected obligations` }}
        itemType="obligations"
      />
    </div>
  )
}

export default Obligations
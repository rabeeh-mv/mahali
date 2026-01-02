import React, { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { FaArrowLeft, FaPlus, FaRupeeSign, FaEdit, FaTrash, FaCheck, FaSearch, FaChevronLeft, FaChevronRight, FaRedo, FaUsers } from 'react-icons/fa'
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
  
  // State for mini bulk add functionality
  const [showMiniBulkAdd, setShowMiniBulkAdd] = useState(false);
  const [bulkAmount, setBulkAmount] = useState('');
  const [bulkMemberCount, setBulkMemberCount] = useState(0);

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

  // Mini bulk add functions
  const handleMiniBulkAddOpen = async () => {
    try {
      // Load all members to get count
      const response = await memberAPI.getAll();
      setBulkMemberCount(response.data.length);
      setShowMiniBulkAdd(true);
      setBulkAmount('');
    } catch (error) {
      console.error('Failed to load members for bulk add:', error);
    }
  };

  const handleMiniBulkAddSubmit = async (e) => {
    e.preventDefault();
    
    if (!bulkAmount || parseFloat(bulkAmount) <= 0) {
      alert('Amount is required and must be greater than 0');
      return;
    }
    
    if (!selectedSubcollection) {
      alert('No subcollection selected');
      return;
    }
    
    if (confirm(`Are you sure you want to create obligations for all ${bulkMemberCount} members with amount ₹${bulkAmount}?`)) {
      try {
        setLoading(true);
        
        // Get all members
        const membersResponse = await memberAPI.getAll();
        
        // Prepare bulk create data
        const obligationsData = membersResponse.data.map(member => ({
          member: member.id,
          subcollection: selectedSubcollection.id,
          amount: parseFloat(bulkAmount),
          paid_status: 'pending'
        }));
        
        // Use bulk create API to create all obligations at once
        await obligationAPI.bulkCreate({ obligations: obligationsData });
        
        alert(`Successfully created ${obligationsData.length} obligations!`);
        
        // Reload obligations data
        if (loadDataForTab) {
          await loadDataForTab('obligations', true);
        }
        
        // Close the mini form
        setShowMiniBulkAdd(false);
        setBulkAmount('');
        
      } catch (error) {
        console.error('Failed to create bulk obligations:', error);
        alert('Failed to create obligations: ' + (error.message || 'Unknown error'));
      } finally {
        setLoading(false);
      }
    }
  };

  // Pagination
  const indexOfLastItem = currentPage * itemsPerPage
  const indexOfFirstItem = indexOfLastItem - itemsPerPage
  const currentObligations = filteredObligations.slice(indexOfFirstItem, indexOfLastItem)
  const totalPages = Math.ceil(filteredObligations.length / itemsPerPage)

  const handleDeleteObligation = async (obligation) => {
    if (window.confirm(`Are you sure you want to delete the obligation for "${obligation.member?.name || 'Unknown Member'}"?`)) {
      try {
        await deleteItem('obligations', obligation.id)
      } catch (error) {
        console.error('Failed to delete obligation:', error)
        alert('Failed to delete obligation. Please try again.')
      }
    }
  }

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

  const handleBack = () => {
    console.log('handleBack called');
    console.log('selectedSubcollection:', selectedSubcollection);
    console.log('setSelectedSubcollection:', setSelectedSubcollection);
    console.log('setActiveTab:', setActiveTab);
    
    // We can navigate back without needing the subcollections and collections props
    // Just clear the selected subcollection and go back to collections tab
    if (setSelectedSubcollection) {
      setSelectedSubcollection(null);
    }
    // Set the active tab to collections to navigate back
    if (setActiveTab) {
      console.log('Setting active tab to collections');
      setActiveTab('collections');
    }
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
    <div className="data-section">
      <div className="section-header">
        <div className="header-content">
          <button onClick={handleBack} className="back-btn">
            <FaArrowLeft />
          </button>
          <h2>Member Obligations - {selectedSubcollection?.name}</h2>
        </div>
        <div className="header-actions">
          <button onClick={handleReload} className="reload-btn" disabled={loading}>
            <FaRedo />
          </button>
          <button onClick={handleMiniBulkAddOpen} className="add-btn">
            <FaPlus />
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
            <label htmlFor="search"><FaSearch /> Search Obligations</label>
            <input
              type="text"
              id="search"
              placeholder="Search by member name or ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="area-filter">Area</label>
            <select
              id="area-filter"
              value={selectedArea}
              onChange={(e) => setSelectedArea(e.target.value)}
              className="filter-select"
            >
              <option value="">All Areas</option>
              {areas.map(area => (
                <option key={area.id} value={area.id}>{area.name}</option>
              ))}
            </select>
          </div>
          
          <div className="form-group">
            <label htmlFor="status-filter">Status</label>
            <select
              id="status-filter"
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="filter-select"
            >
              <option value="">All Statuses</option>
              <option value="paid">Paid</option>
              <option value="pending">Pending / Overdue</option>
              <option value="partial">Partial</option>
            </select>
          </div>
        </div>
      </div>
      
      {/* Bulk Actions */}
      {selectedObligations.length > 0 && (
        <div className="bulk-actions">
          <span>{selectedObligations.length} obligations selected</span>
          <button onClick={handleBulkPay} className="pay-btn" disabled={loading}>
            {loading ? (
              <>
                <span className="inline-spinner"></span> Processing...
              </>
            ) : (
              <>
                <FaCheck /> Mark as Paid
              </>
            )}
          </button>
        </div>
      )}
      
      {/* Obligations Table */}
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>
                <input
                  type="checkbox"
                  checked={selectAll}
                  onChange={handleSelectAll}
                />
              </th>
              <th>Member</th>
              <th>Area</th>
              <th>Amount</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {currentObligations.length > 0 ? (
              currentObligations.map(obligation => (
                <tr key={obligation.id} style={{ borderLeft: `4px solid ${getStatusColor(obligation.paid_status)}` }}>
                  <td>
                    <input
                      type="checkbox"
                      checked={selectedObligations.includes(obligation.id)}
                      onChange={() => handleSelectObligation(obligation.id)}
                    />
                  </td>
                  <td>{obligation.member?.name || 'Unknown Member'}</td>
                  <td>{getAreaName(obligation)}</td>
                  <td><FaRupeeSign /> {obligation.amount}</td>
                  <td>
                    <span className={`status-badge ${getStatusClass(obligation.paid_status)}`}>
                      {getStatusText(obligation.paid_status)}
                    </span>
                  </td>
                  <td>
                    <div className="action-buttons">
                      {obligation.paid_status !== 'paid' && (
                        <button 
                          className="pay-btn"
                          onClick={(e) => {
                            e.stopPropagation()
                            if (handlePayObligation) {
                              handlePayObligation(obligation)
                            }
                          }}
                          disabled={loading}
                        >
                          {loading ? (
                            <span className="inline-spinner"></span>
                          ) : (
                            <FaCheck />
                          )}
                        </button>
                      )}
                      <button 
                        className="edit-btn"
                        onClick={(e) => {
                          e.stopPropagation()
                          if (handleEditObligation) {
                            handleEditObligation(obligation)
                          }
                        }}
                      >
                        <FaEdit />
                      </button>
                      <button 
                        className="delete-btn"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDeleteObligation(obligation)
                        }}
                      >
                        <FaTrash />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="6" className="empty-state">
                  {searchTerm || selectedArea || selectedStatus ? 'No obligations match your search' : 'No obligations found for this subcollection'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      
      {/* Pagination */}
      {totalPages > 1 && (
        <div className="pagination">
          <button 
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
            className="pagination-btn"
          >
            <FaChevronLeft /> Previous
          </button>
          
          <span className="pagination-info">
            Page {currentPage} of {totalPages}
          </span>
          
          <button 
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages}
            className="pagination-btn"
          >
            Next <FaChevronRight />
          </button>
        </div>
      )}
    </div>
  )
}

// Render mini bulk add modal using portal
const MiniBulkAddModal = ({ isOpen, onClose, onSubmit, amount, setAmount, memberCount, loading }) => {
  if (!isOpen) return null;
  
  return createPortal(
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h2><FaUsers /> Bulk Add Obligations</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        
        <form onSubmit={onSubmit}>
          <div className="form-group">
            <label>Amount (₹) *</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
              min="0"
              step="0.01"
              placeholder="Enter amount for each obligation"
              disabled={loading}
            />
          </div>
          
          <div className="form-info">
            <p>This will create obligations for all {memberCount} members</p>
          </div>
          
          <div className="form-actions">
            <button 
              type="button" 
              className="cancel-btn" 
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="save-btn"
              disabled={loading}
            >
              {loading ? (
                <span>
                  <span className="spinner"></span>
                  Creating...
                </span>
              ) : (
                `Create for ${memberCount} Members`
              )}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};

// Wrapper component to handle modal
const ObligationsWithModal = (props) => {
  const [showMiniBulkAdd, setShowMiniBulkAdd] = useState(false);
  const [bulkAmount, setBulkAmount] = useState('');
  const [bulkMemberCount, setBulkMemberCount] = useState(0);
  
  const handleMiniBulkAddOpen = async () => {
    try {
      const response = await memberAPI.getAll();
      setBulkMemberCount(response.data.length);
      setShowMiniBulkAdd(true);
      setBulkAmount('');
    } catch (error) {
      console.error('Failed to load members for bulk add:', error);
    }
  };

  const handleMiniBulkAddSubmit = async (e) => {
    e.preventDefault();
    
    if (!bulkAmount || parseFloat(bulkAmount) <= 0) {
      alert('Amount is required and must be greater than 0');
      return;
    }
    
    if (!props.selectedSubcollection) {
      alert('No subcollection selected');
      return;
    }
    
    if (confirm(`Are you sure you want to create obligations for all ${bulkMemberCount} members with amount ₹${bulkAmount}?`)) {
      try {
        // Get all members
        const membersResponse = await memberAPI.getAll();
        
        // Prepare bulk create data
        const obligationsData = membersResponse.data.map(member => ({
          member: member.id,
          subcollection: props.selectedSubcollection.id,
          amount: parseFloat(bulkAmount),
          paid_status: 'pending'
        }));
        
        // Use bulk create API to create all obligations at once
        await obligationAPI.bulkCreate({ obligations: obligationsData });
        
        alert(`Successfully created ${obligationsData.length} obligations!`);
        
        // Reload obligations data
        if (props.loadDataForTab) {
          await props.loadDataForTab('obligations', true);
        }
        
        // Close the mini form
        setShowMiniBulkAdd(false);
        setBulkAmount('');
        
      } catch (error) {
        console.error('Failed to create bulk obligations:', error);
        alert('Failed to create obligations: ' + (error.message || 'Unknown error'));
      }
    }
  };

  return (
    <>
      <Obligations 
        {...props}
        handleMiniBulkAddOpen={handleMiniBulkAddOpen}
        showMiniBulkAdd={showMiniBulkAdd}
        setShowMiniBulkAdd={setShowMiniBulkAdd}
        bulkAmount={bulkAmount}
        setBulkAmount={setBulkAmount}
        bulkMemberCount={bulkMemberCount}
        setBulkMemberCount={setBulkMemberCount}
      />
      <MiniBulkAddModal 
        isOpen={showMiniBulkAdd}
        onClose={() => setShowMiniBulkAdd(false)}
        onSubmit={handleMiniBulkAddSubmit}
        amount={bulkAmount}
        setAmount={setBulkAmount}
        memberCount={bulkMemberCount}
        loading={false} // You would need to pass actual loading state
      />
    </>
  );
};

export default ObligationsWithModal;
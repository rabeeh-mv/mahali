import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { FaArrowLeft, FaEdit, FaTrash, FaCheck, FaChevronLeft, FaChevronRight, FaRedo, FaUsers, FaTimes, FaHistory, FaRupeeSign } from 'react-icons/fa'
import DeleteConfirmModal from './DeleteConfirmModal'
import ObligationAnalytics from './ObligationAnalytics'
import { areaAPI, obligationAPI, receiptAPI } from '../api'
import ReceiptsList from './ReceiptsList'

const Obligations = ({
  memberObligations,
  selectedSubcollection,
  members,
  setEditing,
  deleteItem,
  handleEditObligation,
  setSelectedSubcollection,
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
  const [isPaymentSidebarOpen, setIsPaymentSidebarOpen] = useState(false);
  const [selectedObligationForPayment, setSelectedObligationForPayment] = useState(null);
  const [activeSubTab, setActiveSubTab] = useState('obligations'); 

  useEffect(() => {
    const loadAllAreas = async () => {
      try {
        const response = await areaAPI.getAll()
        setAreas(response.data)
      } catch (error) {
        console.error('Failed to load areas:', error)
        const uniqueAreas = [...new Set(members
          .filter(member => member.house && member.house.area)
          .map(member => member.house.area)
          .filter(area => area !== null))]
        setAreas(uniqueAreas)
      }
    }
    loadAllAreas()
  }, [])

  useEffect(() => {
    const loadObligations = async () => {
      if (!selectedSubcollection) return;
      try {
        const params = { subcollection: selectedSubcollection.id };
        if (selectedArea) params.area = selectedArea;
        if (searchTerm) params.search = searchTerm;
        if (selectedStatus) params.paid_status = selectedStatus;

        const response = await obligationAPI.search(params);
        setLocalObligations(response.data);
      } catch (error) {
        console.error('Failed to load obligations:', error);
        setLocalObligations(memberObligations.filter(ob => ob.subcollection === selectedSubcollection.id));
      }
    };
    loadObligations();
  }, [selectedSubcollection, memberObligations, selectedArea, searchTerm, selectedStatus]);

  useEffect(() => {
    setFilteredObligations(localObligations)
    setCurrentPage(1)
    setSelectedObligations([])
    setSelectAll(false)
  }, [localObligations])

  const handleBulkAddOpen = () => {
    navigate('/obligations/bulk-add', { state: { selectedSubcollection } });
  };

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

  const handleSinglePay = (obligation) => {
    setSelectedObligationForPayment(obligation);
    setIsPaymentSidebarOpen(true);
  }

  const handleConfirmSinglePayment = async (paymentData) => {
    try {
      setLoading(true);
      await receiptAPI.create(paymentData);
      if (loadDataForTab) await loadDataForTab('obligations', true);
      if (analyticsRef.current && analyticsRef.current.refreshAnalytics) {
        analyticsRef.current.refreshAnalytics();
      }
      setIsPaymentSidebarOpen(false);
    } catch (error) {
      console.error('Failed to record payment:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }

  const handleSingleEdit = (obligation) => {
    if (handleEditObligation) {
      handleEditObligation(obligation)
    } else if (setEditing) {
      setEditing({ type: 'obligations', data: obligation })
    }
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
      const deletePromises = selectedObligations.map(id => deleteItem('obligations', id))
      await Promise.all(deletePromises)
      setSelectedObligations([])
      setSelectAll(false)
      setIsDeleteModalOpen(false);
      if (loadDataForTab) await loadDataForTab('obligations', true)
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
    if (setSelectedSubcollection) setSelectedSubcollection(null);
    if (setActiveTab) setActiveTab('subcollections');
    navigate('/subcollections');
  }

  const handleReload = async () => {
    setLoading(true)
    try {
      if (loadDataForTab) await loadDataForTab('obligations', true)
      if (analyticsRef.current && analyticsRef.current.refreshAnalytics) {
        analyticsRef.current.refreshAnalytics();
      }
    } catch (error) {
      console.error('Failed to reload data:', error)
    } finally {
      setTimeout(() => { if (loading) setLoading(false) }, 1000)
    }
  }

  const getAreaName = (obligation) => {
    if (obligation.member?.house?.area?.name) return obligation.member.house.area.name;
    if (obligation.member?.house?.area_name) return obligation.member.house.area_name;
    if (obligation.area?.name) return obligation.area.name;
    if (obligation.area_name) return obligation.area_name;
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
    if (status === 'pending' || status === 'overdue') return 'Pending / Overdue'
    return status.charAt(0).toUpperCase() + status.slice(1)
  }

  if (!selectedSubcollection) {
    return (
      <div className="data-section">
        <div className="section-header">
          <div className="header-content">
            <button onClick={handleBack} className="back-btn"><FaArrowLeft /></button>
            <h2>Member Obligations</h2>
          </div>
        </div>
        <div className="empty-state">
          <p>Please select a subcollection to view obligations.</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`data-section animate-in obligations-page-wrapper ${isPaymentSidebarOpen ? 'with-sidebar' : ''}`}>
      <div className="data-section-main">
        <div className="section-header">
          <div className="header-content-wrapper">
            <button onClick={handleBack} className="back-btn" title="Back"><FaArrowLeft /></button>
            <h2>
              <div className="header-icon-wrapper" style={{ background: 'var(--accent-gradient)' }}>💰</div>
              Obligations: {selectedSubcollection?.name}
            </h2>
          </div>
          <div className="header-actions">
            <button onClick={handleReload} className="reload-btn" disabled={loading} title="Reload"><FaRedo /></button>
            <button onClick={handleBulkAddOpen} className="btn-primary" title="Bulk Add"><FaUsers /> Bulk Add</button>
          </div>
        </div>

        <ObligationAnalytics
          ref={analyticsRef}
          obligations={memberObligations}
          selectedSubcollection={selectedSubcollection}
        />

        <div className="tabs-navigation">
          <button className={`tab-btn ${activeSubTab === 'obligations' ? 'active' : ''}`} onClick={() => setActiveSubTab('obligations')}>
            <FaUsers /> Member List
          </button>
          <button className={`tab-btn ${activeSubTab === 'receipts' ? 'active' : ''}`} onClick={() => setActiveSubTab('receipts')}>
            <FaHistory /> Payment History
          </button>
        </div>

        {activeSubTab === 'obligations' ? (
          <>
            <div className="filter-section">
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="search">Search Obligees</label>
                  <div className="input-wrapper">
                    <input type="text" id="search" placeholder="Search..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="search-input" />
                  </div>
                </div>
                <div className="form-group">
                  <label htmlFor="area-filter">Area</label>
                  <div className="input-wrapper">
                    <select id="area-filter" value={selectedArea} onChange={(e) => setSelectedArea(e.target.value)} className="filter-select">
                      <option value="">All Regions</option>
                      {areas.map(area => <option key={area.id} value={area.id}>{area.name}</option>)}
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label htmlFor="status-filter">Status</label>
                  <div className="input-wrapper">
                    <select id="status-filter" value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)} className="filter-select">
                      <option value="">All Statuses</option>
                      <option value="paid">Settled</option>
                      <option value="pending">Outstanding</option>
                      <option value="partial">Partial</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {selectedObligations.length > 0 && (
              <div className="bulk-actions animate-in">
                <div className="bulk-action-buttons">
                  <button onClick={handleBulkDelete} className="delete-btn" disabled={loading}>
                    <FaTrash /> Delete {selectedObligations.length} Items
                  </button>
                </div>
              </div>
            )}

            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th style={{ width: '40px' }}>
                      <input type="checkbox" checked={selectAll} onChange={handleSelectAll} />
                    </th>
                    <th>Member ID</th>
                    <th>Name / Obligee</th>
                    <th>Area</th>
                    <th>Due Amount</th>
                    <th className="text-center">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {currentObligations.map(obligation => {
                    const memberData = typeof obligation.member === 'object' ? obligation.member : (members.find(m => m.member_id === obligation.member) || {});
                    return (
                      <tr key={obligation.id} className={selectedObligations.includes(obligation.id) ? 'selected-row' : ''}>
                        <td><input type="checkbox" checked={selectedObligations.includes(obligation.id)} onChange={() => handleSelectObligation(obligation.id)} /></td>
                        <td className="font-mono">{memberData.member_id || obligation.member}</td>
                        <td 
                          className="font-semibold" 
                          style={{ cursor: 'pointer', color: 'var(--primary)', textDecoration: 'underline' }}
                          onClick={() => handleSinglePay(obligation)}
                        >
                          {memberData.name ? `${memberData.name} ${memberData.surname || ''}` : 'Loading Name...'}
                        </td>
                        <td><span className="badge-outline">{getAreaName(obligation)}</span></td>
                        <td className="font-mono" style={{ color: 'var(--primary)', fontWeight: 700 }}><FaRupeeSign fontSize="0.8em" /> {obligation.amount}</td>
                        <td className="text-center"><span className={`status-badge ${getStatusClass(obligation.paid_status)}`}>{getStatusText(obligation.paid_status)}</span></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {loading && <div className="loading-overlay-inline"><div className="spinner-small"></div></div>}
            </div>

            {totalPages > 1 && (
              <div className="pagination">
                <button onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1} className="btn-secondary"><FaChevronLeft /> Prev</button>
                <span className="pagination-info">Batch <strong>{currentPage}</strong> of <strong>{totalPages}</strong></span>
                <button onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages} className="btn-secondary">Next <FaChevronRight /></button>
              </div>
            )}
          </>
        ) : (
          <ReceiptsList selectedSubcollection={selectedSubcollection} loading={loading} />
        )}
      </div>

      {isPaymentSidebarOpen && selectedObligationForPayment && (
        <div className="billing-sidebar payment-sidebar animate-in">
          <div className="billing-header">
            <h3>Record Receipt</h3>
            <button className="icon-btn" onClick={() => setIsPaymentSidebarOpen(false)}><FaTimes /></button>
          </div>
          <div className="billing-content">
            <div className="billing-member-info" style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '20px', padding: '12px', background: 'rgba(var(--primary-rgb), 0.05)', borderRadius: '12px' }}>
              <div className="mini-avatar" style={{ background: 'var(--primary)', color: 'white', width: '40px', height: '40px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                {selectedObligationForPayment.member?.name?.charAt(0)}
              </div>
              <div>
                <div style={{ fontWeight: 'bold' }}>{selectedObligationForPayment.member?.name} {selectedObligationForPayment.member?.surname}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>ID: {selectedObligationForPayment.member?.member_id}</div>
              </div>
            </div>
            <PaymentSidebarForm obligation={selectedObligationForPayment} onConfirm={handleConfirmSinglePayment} onCancel={() => setIsPaymentSidebarOpen(false)} loading={loading} />
          </div>
        </div>
      )}

      <DeleteConfirmModal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} onConfirm={confirmBulkDelete} item={{ name: `${selectedObligations.length} selected items` }} itemType="obligations" />
    </div>
  )
}

const PaymentSidebarForm = ({ obligation, onConfirm, onCancel, loading }) => {
  const [amount, setAmount] = useState(obligation.amount || '');
  const [method, setMethod] = useState('cash');
  const [remarks, setRemarks] = useState('');
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await onConfirm({ amount_paid: parseFloat(amount), payment_method: method, remarks, obligation: obligation.id });
    } catch (err) { setError(err.message || 'Payment failed'); }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="form-group"><label>Amount (₹)</label><input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} className="form-input" style={{ fontSize: '1.2rem', fontWeight: 700 }} required /></div>
      <div className="form-group">
        <label>Method</label>
        <div className="payment-methods-grid compact" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
          {['cash', 'upi', 'bank_transfer', 'cheque', 'other'].map(m => (
            <div key={m} className={`payment-method-card ${method === m ? 'active' : ''}`} onClick={() => setMethod(m)} style={{ padding: '8px', textAlign: 'center', cursor: 'pointer', border: '1px solid var(--border)', borderRadius: '8px' }}>
              <span style={{ textTransform: 'capitalize', fontSize: '0.8rem' }}>{m.replace('_', ' ')}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="form-group"><label>Remarks</label><textarea value={remarks} onChange={(e) => setRemarks(e.target.value)} className="form-input" rows="3" /></div>
      {error && <div className="error-message" style={{ color: 'red', marginTop: '10px' }}>{error}</div>}
      <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
        <button type="button" className="btn-secondary" onClick={onCancel} style={{ flex: 1 }}>Cancel</button>
        <button type="submit" className="btn-primary" style={{ flex: 2 }} disabled={loading}>{loading ? '...' : 'Complete'}</button>
      </div>
    </form>
  )
}

export default Obligations
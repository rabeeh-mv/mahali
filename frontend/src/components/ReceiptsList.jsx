import React, { useState, useEffect } from 'react';
import { FaSearch, FaRupeeSign, FaCalendarAlt, FaHistory, FaChevronLeft, FaChevronRight, FaFileInvoice, FaTrash } from 'react-icons/fa';
import { receiptAPI, areaAPI } from '../api';
import DeleteConfirmModal from './DeleteConfirmModal';

const ReceiptsList = ({ selectedSubcollection, loading: parentLoading }) => {
  const [receipts, setReceipts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(15);
  const [totalItems, setTotalItems] = useState(0);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [receiptToDelete, setReceiptToDelete] = useState(null);

  const loadReceipts = async () => {
    if (!selectedSubcollection) return;
    setLoading(true);
    try {
      const params = {
        subcollection: selectedSubcollection.id,
        search: searchTerm,
        page: currentPage,
        page_size: itemsPerPage
      };
      const response = await receiptAPI.search(params);
      setReceipts(response.data.results || response.data);
      setTotalItems(response.data.count || (response.data.results ? response.data.results.length : response.data.length));
    } catch (error) {
      console.error('Failed to load receipts:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReceipts();
  }, [selectedSubcollection, searchTerm, currentPage]);

  const handleDeleteReceipt = (receipt) => {
    setReceiptToDelete(receipt);
    setIsDeleteModalOpen(true);
  };

  const confirmDeleteReceipt = async () => {
    if (!receiptToDelete) return;
    try {
      setLoading(true);
      await receiptAPI.delete(receiptToDelete.id);
      setIsDeleteModalOpen(false);
      setReceiptToDelete(null);
      loadReceipts();
    } catch (error) {
      console.error('Failed to delete receipt:', error);
      alert('Failed to delete receipt');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getMethodBadge = (method) => {
    const badges = {
      cash: { class: 'badge-success', label: 'Cash' },
      upi: { class: 'badge-primary', label: 'UPI' },
      bank_transfer: { class: 'badge-info', label: 'Bank Transfer' },
      cheque: { class: 'badge-warning', label: 'Cheque' },
      other: { class: 'badge-secondary', label: 'Other' }
    };
    const badge = badges[method] || badges.other;
    return <span className={`badge-outline ${badge.class}`}>{badge.label}</span>;
  };

  const totalPages = Math.ceil(totalItems / itemsPerPage);

  return (
    <div className="receipts-list animate-in">
      <div className="filter-section">
        <div className="form-row">
          <div className="form-group" style={{ flex: 1 }}>
            <label htmlFor="receipt-search">Search Receipts</label>
            <div className="input-wrapper">
              <input
                type="text"
                id="receipt-search"
                placeholder="Search by Receipt #, Member Name or ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Receipt No.</th>
              <th>Member</th>
              <th>Date & Time</th>
              <th>Obligation Amount</th>
              <th>Amount Paid</th>
              <th>Method</th>
              <th>Remarks</th>
              <th className="text-center">Action</th>
            </tr>
          </thead>
          <tbody>
            {receipts.length > 0 ? (
              receipts.map(receipt => (
                <tr key={receipt.id}>
                  <td className="font-mono font-semibold">{receipt.receipt_number}</td>
                  <td>
                    <div className="member-info">
                      <div className="name">{receipt.member_name}</div>
                      <div className="id" style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>ID: {receipt.member_id}</div>
                    </div>
                  </td>
                  <td>
                    <div style={{ fontSize: '0.9rem' }}>
                      <FaCalendarAlt fontSize="0.8em" style={{ marginRight: '5px', opacity: 0.7 }} />
                      {formatDate(receipt.payment_date)}
                    </div>
                  </td>
                  <td className="font-mono text-muted">₹{receipt.obligation_amount}</td>
                  <td className="font-mono" style={{ color: '#10b981', fontWeight: 700 }}>
                    ₹{receipt.amount_paid}
                  </td>
                  <td>{getMethodBadge(receipt.payment_method)}</td>
                  <td style={{ maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {receipt.remarks || '-'}
                  </td>
                  <td className="text-center">
                    <button 
                      onClick={() => handleDeleteReceipt(receipt)}
                      className="btn-icon delete"
                      title="Delete Receipt"
                    >
                      <FaTrash />
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="8" className="text-center py-10">
                  <div className="empty-state">
                    <FaHistory fontSize="3rem" style={{ opacity: 0.2, marginBottom: '1rem' }} />
                    <p>{searchTerm ? 'No matching receipts found.' : 'No payments recorded yet for this period.'}</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
        {(loading || parentLoading) && (
          <div className="loading-overlay-inline">
            <div className="spinner-small"></div>
            <p>Loading payment history...</p>
          </div>
        )}
      </div>

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

      <DeleteConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={confirmDeleteReceipt}
        item={{ name: `Receipt ${receiptToDelete?.receipt_number}` }}
        itemType="receipt"
      />
    </div>
  );
};

export default ReceiptsList;

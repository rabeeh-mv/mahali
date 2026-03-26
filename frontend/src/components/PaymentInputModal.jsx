import React, { useState, useEffect } from 'react';
import { FaCheck, FaTimes, FaRupeeSign, FaMoneyBillWave, FaMobileAlt, FaUniversity, FaCreditCard, FaEllipsisH } from 'react-icons/fa';

const PaymentInputModal = ({ isOpen, onClose, onConfirm, obligation }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('cash');
  const [remarks, setRemarks] = useState('');

  useEffect(() => {
    if (obligation) {
      setAmount(obligation.amount || '');
    }
  }, [obligation, isOpen]);

  // Generate a preview receipt number
  const today = new Date();
  const dateStr = today.getFullYear().toString().slice(-2) + 
                  (today.getMonth() + 1).toString().padStart(2, '0') + 
                  today.getDate().toString().padStart(2, '0');
  const receiptPreview = `RCP-${dateStr}-XXXX`;

  const handleConfirm = async (e) => {
    e.preventDefault();
    if (!amount || isNaN(amount) || parseFloat(amount) <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      await onConfirm({
        amount_paid: parseFloat(amount),
        payment_method: method,
        remarks: remarks,
        obligation: obligation.id
      });
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to process payment');
      console.error('Error processing payment:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content animate-in" style={{ maxWidth: '550px' }}>
        <div className="modal-header">
          <div className="header-icon-wrapper" style={{ marginRight: '12px' }}>💰</div>
          <div style={{ flex: 1 }}>
            <h2 style={{ marginBottom: '2px' }}>Record Obligation Payment</h2>
            <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>Validate and complete the transaction</p>
          </div>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        
        <form onSubmit={handleConfirm}>
          <div className="modal-body" style={{ padding: '0 24px 24px' }}>
            {/* Top Summary Card */}
            <div className="payment-summary-box" style={{ padding: '24px', borderRadius: '16px', marginBottom: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                <div style={{ flex: 1 }}>
                  <div className="detail-label">Obligee Details</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-color)', marginBottom: '4px' }}>
                    {obligation?.member?.name} {obligation?.member?.surname}
                  </div>
                  <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>ID: <strong className="font-mono">{obligation?.member?.member_id}</strong></span>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Father: {obligation?.member?.father_name}</span>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div className="detail-label">Receipt #</div>
                  <div className="receipt-number-badge">{receiptPreview}</div>
                </div>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', borderTop: '1px solid rgba(99, 102, 241, 0.1)', paddingTop: '20px', marginTop: '5px' }}>
                <div>
                  <div className="detail-label">Collection Period</div>
                  <div style={{ fontWeight: 700 }}>{obligation?.subcollection?.name || 'N/A'}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>Date: {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div className="detail-label">Total Outstanding</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--primary)' }}>₹{obligation?.amount}</div>
                  <div style={{ fontSize: '0.75rem', marginTop: '4px' }}>
                    <span className={`status-badge ${obligation?.paid_status}`} style={{ fontSize: '0.65rem' }}>
                      {obligation?.paid_status?.toUpperCase()}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="form-row" style={{ alignItems: 'flex-start' }}>
              <div className="form-group" style={{ flex: '1' }}>
                <label style={{ fontSize: '0.8rem' }}>Amount to Collect (₹)</label>
                <div className="input-wrapper">
                  <input 
                    type="number" 
                    step="0.01"
                    value={amount} 
                    onChange={(e) => setAmount(e.target.value)}
                    style={{ fontSize: '1.25rem', fontWeight: 700, padding: '14px' }}
                    required
                  />
                </div>
                <small style={{ color: 'var(--text-muted)', display: 'block', marginTop: '6px' }}>
                   Auto-filled total. Edit for partial payments.
                </small>
              </div>
            </div>

            <div className="form-group" style={{ marginTop: '10px' }}>
              <label style={{ fontSize: '0.8rem' }}>Payment Method Selection</label>
              <div className="payment-methods-grid">
                {[
                  { id: 'cash', label: 'Cash', icon: <FaMoneyBillWave /> },
                  { id: 'upi', label: 'UPI / QR', icon: <FaMobileAlt /> },
                  { id: 'bank_transfer', label: 'Transfer', icon: <FaUniversity /> },
                  { id: 'cheque', label: 'Cheque', icon: <FaCreditCard /> },
                  { id: 'other', label: 'Other', icon: <FaEllipsisH /> }
                ].map(m => (
                  <div 
                    key={m.id}
                    className={`payment-method-card ${method === m.id ? 'active' : ''}`}
                    onClick={() => setMethod(m.id)}
                  >
                    {m.icon}
                    <span>{m.label}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: '0' }}>
              <label style={{ fontSize: '0.8rem' }}>Transaction Remarks (Optional)</label>
              <div className="input-wrapper">
                <textarea 
                  value={remarks} 
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="Reference number, check number, or other notes..."
                  rows="2"
                  style={{ borderRadius: '12px' }}
                />
              </div>
            </div>
            
            {error && (
              <div className="status-message error" style={{ marginTop: '16px', borderRadius: '10px' }}>
                {error}
              </div>
            )}
          </div>

          <div className="form-actions" style={{ background: 'var(--bg-color)', borderBottomLeftRadius: '24px', borderBottomRightRadius: '24px', padding: '20px 24px' }}>
            <button 
              type="button" 
              className="btn-secondary" 
              onClick={onClose}
              disabled={loading}
              style={{ padding: '12px 24px', borderRadius: '12px' }}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="btn-primary" 
              disabled={loading}
              style={{ background: '#10b981', padding: '12px 32px', borderRadius: '12px', fontWeight: 700 }}
            >
              {loading ? 'Processing...' : <><FaCheck style={{ marginRight: '8px' }} /> Complete Transaction</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PaymentInputModal;

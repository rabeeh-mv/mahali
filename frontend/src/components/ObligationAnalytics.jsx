import React, { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { FaUsers, FaCheckCircle, FaMoneyBill, FaClock } from 'react-icons/fa';
import { obligationAPI } from '../api';

const ObligationAnalytics = forwardRef(({ obligations, selectedSubcollection }, ref) => {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(false);

  // Expose method to parent component
  useImperativeHandle(ref, () => ({
    refreshAnalytics: () => {
      fetchAnalytics();
    }
  }));

  // Fetch analytics when selectedSubcollection changes
  useEffect(() => {
    if (selectedSubcollection) {
      fetchAnalytics();
    } else {
      setAnalytics(null);
    }
  }, [selectedSubcollection]);

  const fetchAnalytics = async () => {
    if (!selectedSubcollection) return;
    
    setLoading(true);
    try {
      const response = await obligationAPI.statistics(selectedSubcollection.id);
      setAnalytics(response.data);
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  // If no subcollection is selected, show a message
  if (!selectedSubcollection) {
    return null;
  }

  // If still loading, show loading state
  if (loading) {
    return (
      <div className="analytics-section">
        <div className="analytics-cards-container">
          <div className="analytics-card">
            <div className="analytics-card-content">
              <div className="analytics-card-title">Loading...</div>
              <div className="analytics-card-value">...</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // If no analytics data, don't show anything
  if (!analytics) {
    return null;
  }

  return (
    <div className="analytics-section">
      <div className="analytics-cards-container">
        <div className="analytics-card">
          <div className="analytics-card-icon">
            <FaUsers />
          </div>
          <div className="analytics-card-content">
            <div className="analytics-card-title">Total Members</div>
            <div className="analytics-card-value">{analytics.total_members}</div>
          </div>
        </div>
        
        <div className="analytics-card">
          <div className="analytics-card-icon paid">
            <FaCheckCircle />
          </div>
          <div className="analytics-card-content">
            <div className="analytics-card-title">Paid</div>
            <div className="analytics-card-value">{analytics.paid.count}</div>
            <div className="analytics-card-subvalue">₹{analytics.paid.amount.toLocaleString()}</div>
          </div>
        </div>
        
        <div className="analytics-card">
          <div className="analytics-card-icon pending">
            <FaClock />
          </div>
          <div className="analytics-card-content">
            <div className="analytics-card-title">Pending / Overdue</div>
            <div className="analytics-card-value">{analytics.pending_overdue.count}</div>
            <div className="analytics-card-subvalue">₹{analytics.pending_overdue.amount.toLocaleString()}</div>
          </div>
        </div>
        
        <div className="analytics-card collection-progress">
          <div className="analytics-card-content">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2px' }}>
              <div className="analytics-card-title" style={{ marginBottom: 0 }}>Progress</div>
              <div className="analytics-card-value" style={{ fontSize: '1.1rem' }}>{Math.round(analytics.collection_progress.percentage)}%</div>
            </div>
            
            <div className="progress-bar">
              <div 
                className="progress-fill" 
                style={{ width: `${analytics.collection_progress.percentage}%` }}
              ></div>
            </div>
            
            <div className="analytics-card-subvalue" style={{ marginTop: '4px', fontSize: '0.75rem', textAlign: 'right' }}>
              ₹{analytics.collection_progress.paid_amount.toLocaleString()} of ₹{analytics.collection_progress.total_amount.toLocaleString()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

export default ObligationAnalytics;
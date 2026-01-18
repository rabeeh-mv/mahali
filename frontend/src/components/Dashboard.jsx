import React, { useState, useEffect } from 'react';
import { dashboardAPI } from '../api';
import Todos from './Todos';
import {
  FaUsers,
  FaHome,
  FaMapMarkedAlt,
  FaTasks,
  FaCheckCircle,
  FaExclamationCircle,
  FaTimesCircle,
  FaMoneyBillWave,
  FaChartPie
} from 'react-icons/fa';
import './Dashboard.css';

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      setLoading(true);
      const response = await dashboardAPI.getStats();
      setStats(response.data);
    } catch (err) {
      setError('Failed to load dashboard data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="loading-container"><div className="spinner"></div><p>Loading overview...</p></div>;
  if (error) return <div className="error-container"><h3>Unable to load dashboard</h3><p>{error}</p></div>;
  if (!stats) return <div>No data available</div>;

  // Calculate percentages for bars
  const totalMembers = stats.members_count || 1;
  const livePercent = ((stats.members_by_status.live || 0) / totalMembers) * 100;

  const totalObligations = (stats.obligations_by_status.paid + stats.obligations_by_status.pending + stats.obligations_by_status.overdue) || 1;
  const paidPercent = (stats.obligations_by_status.paid / totalObligations) * 100;

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1>Dashboard Overview</h1>
        <p className="dashboard-subtitle">Welcome back, here is what is happening today.</p>
      </div>

      {/* Key Metrics Grid */}
      <div className="stats-grid">
        <div className="stat-card-new">
          <div className="stat-header">
            <span className="stat-label">Total Members</span>
            <div className="stat-icon" style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' }}>
              <FaUsers />
            </div>
          </div>
          <div className="stat-value">{stats.members_count}</div>
          <div className="metric-bar-container" style={{ margin: '8px 0 0 0', width: '100%', maxWidth: 'none', height: '4px' }}>
            <div className="metric-bar" style={{ width: '100%', background: '#3b82f6' }}></div>
          </div>
        </div>

        <div className="stat-card-new">
          <div className="stat-header">
            <span className="stat-label">Total Houses</span>
            <div className="stat-icon" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
              <FaHome />
            </div>
          </div>
          <div className="stat-value">{stats.houses_count}</div>
          <div className="metric-bar-container" style={{ margin: '8px 0 0 0', width: '100%', maxWidth: 'none', height: '4px' }}>
            <div className="metric-bar" style={{ width: '100%', background: '#10b981' }}></div>
          </div>
        </div>

        <div className="stat-card-new">
          <div className="stat-header">
            <span className="stat-label">Managed Areas</span>
            <div className="stat-icon" style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b' }}>
              <FaMapMarkedAlt />
            </div>
          </div>
          <div className="stat-value">{stats.areas_count}</div>
          <div className="metric-bar-container" style={{ margin: '8px 0 0 0', width: '100%', maxWidth: 'none', height: '4px' }}>
            <div className="metric-bar" style={{ width: '100%', background: '#f59e0b' }}></div>
          </div>
        </div>

        <div className="stat-card-new">
          <div className="stat-header">
            <span className="stat-label">Pending Tasks</span>
            <div className="stat-icon" style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}>
              <FaTasks />
            </div>
          </div>
          <div className="stat-value">{stats.pending_todos_count} <span style={{ fontSize: '16px', color: 'var(--text-muted)' }}>/ {stats.todos_count}</span></div>
          <div className="metric-bar-container" style={{ margin: '8px 0 0 0', width: '100%', maxWidth: 'none', height: '4px' }}>
            <div className="metric-bar" style={{ width: `${(stats.pending_todos_count / (stats.todos_count || 1)) * 100}%`, background: '#ef4444' }}></div>
          </div>
        </div>
      </div>

      <div className="dashboard-widgets">
        {/* Left Col - Charts/Status */}
        <div className="widget-card widget-half">
          <div className="widget-header">
            <div className="widget-title">
              <FaChartPie style={{ color: '#8b5cf6' }} /> Member Status
            </div>
          </div>
          <div className="widget-content">
            <div className="metric-item">
              <div className="status-pill success"><FaCheckCircle /> Live</div>
              <div className="metric-bar-container">
                <div className="metric-bar" style={{ width: `${livePercent}%`, background: '#10b981' }}></div>
              </div>
              <div className="metric-value">{stats.members_by_status.live}</div>
            </div>
            <div className="metric-item">
              <div className="status-pill danger"><FaTimesCircle /> Deceased</div>
              <div className="metric-bar-container">
                <div className="metric-bar" style={{ width: '10%', background: '#ef4444' }}></div>
              </div>
              <div className="metric-value">{stats.members_by_status.dead}</div>
            </div>
            <div className="metric-item">
              <div className="status-pill warning"><FaExclamationCircle /> Terminated</div>
              <div className="metric-bar-container">
                <div className="metric-bar" style={{ width: '5%', background: '#f59e0b' }}></div>
              </div>
              <div className="metric-value">{stats.members_by_status.terminated}</div>
            </div>
          </div>
        </div>

        <div className="widget-card widget-half">
          <div className="widget-header">
            <div className="widget-title">
              <FaMoneyBillWave style={{ color: '#10b981' }} /> Financial Pulse
            </div>
          </div>
          <div className="widget-content">
            <div className="metric-item">
              <div className="metric-info">
                <span className="metric-label">Paid Obligations</span>
              </div>
              <div className="metric-bar-container">
                <div className="metric-bar" style={{ width: `${paidPercent}%`, background: '#10b981' }}></div>
              </div>
              <div className="metric-value" style={{ color: '#10b981' }}>{stats.obligations_by_status.paid}</div>
            </div>
            <div className="metric-item">
              <div className="metric-info">
                <span className="metric-label">Pending Payments</span>
              </div>
              <div className="metric-bar-container">
                <div className="metric-bar" style={{ width: '30%', background: '#ef4444' }}></div>
              </div>
              <div className="metric-value" style={{ color: '#ef4444' }}>{stats.obligations_by_status.pending}</div>
            </div>
            <div className="metric-item">
              <div className="metric-info">
                <span className="metric-label">Overdue</span>
              </div>
              <div className="metric-bar-container">
                <div className="metric-bar" style={{ width: '15%', background: '#f59e0b' }}></div>
              </div>
              <div className="metric-value" style={{ color: '#f59e0b' }}>{stats.obligations_by_status.overdue}</div>
            </div>
          </div>
        </div>

        {/* Todos Section - Full Width */}
        <div className="widget-card widget-full">
          <Todos />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
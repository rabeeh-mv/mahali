import React from 'react'

const Dashboard = ({ membersCount, housesCount, areasCount, collectionsCount }) => {
  return (
    <div className="data-section">
      <h2>📊 Dashboard</h2>
      <div className="dashboard-stats">
        <div className="stat-card">
          <h3>{membersCount}</h3>
          <p>Members</p>
        </div>
        <div className="stat-card">
          <h3>{housesCount}</h3>
          <p>Houses</p>
        </div>
        <div className="stat-card">
          <h3>{areasCount}</h3>
          <p>Areas</p>
        </div>
        <div className="stat-card">
          <h3>{collectionsCount}</h3>
          <p>Collections</p>
        </div>
      </div>
    </div>
  )
}

export default Dashboard
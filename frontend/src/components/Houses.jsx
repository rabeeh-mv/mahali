import React from 'react'

const Houses = ({ houses, areas, setEditing, deleteItem }) => {
  return (
    <div className="data-section">
      <div className="section-header">
        <h2>🏘️ Houses</h2>
        <button onClick={() => setEditing({ type: 'houses', data: {} })} className="add-btn">+ Add New House</button>
      </div>
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>House Name</th>
              <th>Family Name</th>
              <th>Location</th>
              <th>Area</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {houses.map(house => (
              <tr key={house.home_id}>
                <td>#{house.home_id}</td>
                <td>{house.house_name}</td>
                <td>{house.family_name}</td>
                <td>{house.location_name}</td>
                <td>{house.area?.name || 'N/A'}</td>
                <td>
                  <button onClick={() => setEditing({ type: 'houses', data: house })} className="edit-btn">✏️ Edit</button>
                  <button onClick={() => deleteItem('houses', house.home_id)} className="delete-btn">🗑️ Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {houses.length === 0 && (
          <div className="empty-state">
            <p>No houses found. Add a new house to get started.</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default Houses
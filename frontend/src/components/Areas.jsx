import React from 'react'

const Areas = ({ areas, setEditing, deleteItem }) => {
  return (
    <div className="data-section">
      <div className="section-header">
        <h2>📍 Areas</h2>
        <button onClick={() => setEditing({ type: 'areas', data: {} })} className="add-btn">+ Add New Area</button>
      </div>
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Description</th>
              <th>Houses</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {areas.map(area => (
              <tr key={area.id}>
                <td>#{area.id}</td>
                <td>{area.name}</td>
                <td>{area.description || 'N/A'}</td>
                <td>{area.houses?.length || 0}</td>
                <td>
                  <button onClick={() => setEditing({ type: 'areas', data: area })} className="edit-btn">✏️ Edit</button>
                  <button onClick={() => deleteItem('areas', area.id)} className="delete-btn">🗑️ Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {areas.length === 0 && (
          <div className="empty-state">
            <p>No areas found. Add a new area to get started.</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default Areas
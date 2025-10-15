import React from 'react'

const Subcollections = ({ 
  subcollections, 
  selectedCollection, 
  setEditing, 
  deleteItem, 
  setSelectedSubcollection, 
  setActiveTab 
}) => {
  return (
    <div className="data-section">
      <div className="section-header">
        <h2>📋 Subcollections - {selectedCollection?.name}</h2>
        <button onClick={() => setEditing({ type: 'subcollections', data: {} })} className="add-btn">+ Add New Subcollection</button>
      </div>
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Year</th>
              <th>Amount</th>
              <th>Due Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {subcollections
              .filter(sc => sc.collection?.id === selectedCollection?.id)
              .map(subcollection => (
                <tr key={subcollection.id}>
                  <td>#{subcollection.id}</td>
                  <td>{subcollection.name}</td>
                  <td>{subcollection.year}</td>
                  <td>₹{subcollection.amount}</td>
                  <td>{subcollection.due_date ? new Date(subcollection.due_date).toLocaleDateString() : 'N/A'}</td>
                  <td>
                    <button onClick={() => {
                      setSelectedSubcollection(subcollection);
                      setActiveTab('obligations');
                    }} className="view-btn">👁️ View</button>
                    <button onClick={() => setEditing({ type: 'subcollections', data: subcollection })} className="edit-btn">✏️ Edit</button>
                    <button onClick={() => deleteItem('subcollections', subcollection.id)} className="delete-btn">🗑️ Delete</button>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
        {subcollections.filter(sc => sc.collection?.id === selectedCollection?.id).length === 0 && (
          <div className="empty-state">
            <p>No subcollections found for this collection.</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default Subcollections
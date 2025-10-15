import React from 'react'

const Collections = ({ collections, setEditing, deleteItem, setSelectedCollection, setActiveTab }) => {
  return (
    <div className="data-section">
      <div className="section-header">
        <h2>📂 Collections</h2>
        <button onClick={() => setEditing({ type: 'collections', data: {} })} className="add-btn">+ Add New Collection</button>
      </div>
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Description</th>
              <th>Subcollections</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {collections.map(collection => (
              <tr key={collection.id}>
                <td>#{collection.id}</td>
                <td>{collection.name}</td>
                <td>{collection.description || 'N/A'}</td>
                <td>{collection.subcollections?.length || 0}</td>
                <td>
                  <button onClick={() => {
                    setSelectedCollection(collection);
                    setActiveTab('subcollections');
                  }} className="view-btn">👁️ View</button>
                  <button onClick={() => setEditing({ type: 'collections', data: collection })} className="edit-btn">✏️ Edit</button>
                  <button onClick={() => deleteItem('collections', collection.id)} className="delete-btn">🗑️ Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {collections.length === 0 && (
          <div className="empty-state">
            <p>No collections found. Add a new collection to get started.</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default Collections
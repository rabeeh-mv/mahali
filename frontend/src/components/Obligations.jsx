import React from 'react'

const Obligations = ({ 
  memberObligations, 
  selectedSubcollection, 
  members, 
  setEditing, 
  deleteItem 
}) => {
  return (
    <div className="data-section">
      <div className="section-header">
        <h2>💰 Member Obligations - {selectedSubcollection?.name}</h2>
        <button onClick={() => setEditing({ type: 'obligations', data: {} })} className="add-btn">+ Add New Obligation</button>
      </div>
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Member</th>
              <th>Amount</th>
              <th>Status</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {memberObligations
              .filter(ob => ob.subcollection?.id === selectedSubcollection?.id)
              .map(obligation => (
                <tr key={obligation.id}>
                  <td>#{obligation.id}</td>
                  <td>{obligation.member?.name || 'N/A'}</td>
                  <td>₹{obligation.amount}</td>
                  <td>
                    <span className={`status-badge ${obligation.paid_status}`}>
                      {obligation.paid_status}
                    </span>
                  </td>
                  <td>{obligation.created_at ? new Date(obligation.created_at).toLocaleDateString() : 'N/A'}</td>
                  <td>
                    <button onClick={() => setEditing({ type: 'obligations', data: obligation })} className="edit-btn">✏️ Edit</button>
                    <button onClick={() => deleteItem('obligations', obligation.id)} className="delete-btn">🗑️ Delete</button>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
        {memberObligations.filter(ob => ob.subcollection?.id === selectedSubcollection?.id).length === 0 && (
          <div className="empty-state">
            <p>No obligations found for this subcollection.</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default Obligations
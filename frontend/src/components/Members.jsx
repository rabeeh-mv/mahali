import React from 'react'

const Members = ({ members, setEditing, deleteItem }) => {
  return (
    <div className="data-section">
      <div className="section-header">
        <h2>👥 Members</h2>
        <button onClick={() => setEditing({ type: 'members', data: {} })} className="add-btn">+ Add New Member</button>
      </div>
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Contact</th>
              <th>Email</th>
              <th>Joined Date</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {members.map(member => (
              <tr key={member.id}>
                <td>#{member.id}</td>
                <td>{member.name}</td>
                <td>{member.contact || 'N/A'}</td>
                <td>{member.email || 'N/A'}</td>
                <td>{member.joined_date ? new Date(member.joined_date).toLocaleDateString() : 'N/A'}</td>
                <td>
                  <span className={`status-badge ${member.is_active ? 'active' : 'inactive'}`}>
                    {member.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td>
                  <button onClick={() => setEditing({ type: 'members', data: member })} className="edit-btn">✏️ Edit</button>
                  <button onClick={() => deleteItem('members', member.id)} className="delete-btn">🗑️ Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {members.length === 0 && (
          <div className="empty-state">
            <p>No members found. Add a new member to get started.</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default Members
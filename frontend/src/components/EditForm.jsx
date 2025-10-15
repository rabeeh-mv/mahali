import React, { useEffect } from 'react'

const EditForm = ({ editing, setEditing, formData, setFormData, handleSubmit }) => {
  useEffect(() => {
    // Define default fields for each type
    let defaultFields = {}
    if (editing.type === 'members') {
      defaultFields = {
        name: '',
        contact: '',
        email: '',
        address: '',
        dob: '',
        is_active: true
      }
    } else if (editing.type === 'houses') {
      defaultFields = {
        home_id: '',
        house_name: '',
        family_name: '',
        location_name: '',
        area: '',
        address: ''
      }
    } else if (editing.type === 'areas') {
      defaultFields = {
        name: '',
        description: ''
      }
    } else if (editing.type === 'collections') {
      defaultFields = {
        name: '',
        description: ''
      }
    } else if (editing.type === 'subcollections') {
      defaultFields = {
        collection: '',
        year: '',
        name: '',
        amount: '',
        due_date: ''
      }
    } else if (editing.type === 'obligations') {
      defaultFields = {
        subcollection: '',
        member: '',
        amount: '',
        paid_status: 'pending'
      }
    }

    // If editing existing item, use its data
    const initialData = editing.data.id ? {...defaultFields, ...editing.data} : defaultFields
    setFormData(initialData)
  }, [editing, setFormData])

  // Get field labels for better UX
  const getFieldLabel = (key) => {
    const labels = {
      name: 'Full Name',
      contact: 'Phone Number',
      email: 'Email Address',
      address: 'Address',
      dob: 'Date of Birth',
      is_active: 'Active Status',
      home_id: 'Home ID',
      house_name: 'House Name',
      family_name: 'Family Name',
      location_name: 'Location Name',
      area: 'Area',
      collection: 'Collection',
      year: 'Year',
      amount: 'Amount',
      due_date: 'Due Date',
      paid_status: 'Payment Status',
      member: 'Member',
      subcollection: 'Subcollection'
    }
    return labels[key] || key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
  }

  // Get field type for better input rendering
  const getFieldType = (key) => {
    if (key.includes('date') || key.includes('Date')) return 'date'
    if (key.includes('email')) return 'email'
    if (key.includes('phone') || key.includes('contact')) return 'tel'
    if (key === 'is_active') return 'checkbox'
    if (key === 'amount') return 'number'
    return 'text'
  }

  return (
    <div className="edit-form">
      <div className="form-header">
        <h3>{editing.data.id ? '✏️ Edit ' : '➕ Add New '} {editing.type.slice(0, -1).replace(/^\w/, c => c.toUpperCase())}</h3>
        <button type="button" className="close-btn" onClick={() => { setEditing(null); setFormData({}) }}>✕</button>
      </div>
      <form onSubmit={(e) => { e.preventDefault(); handleSubmit(editing.type) }}>
        {Object.keys(formData).map(key => {
          if (['id', 'created_at', 'updated_at', 'image', 'members'].includes(key)) return null
          
          const fieldType = getFieldType(key)
          const fieldLabel = getFieldLabel(key)
          
          return (
            <div className="form-group" key={key}>
              <label htmlFor={key}>{fieldLabel}</label>
              {fieldType === 'checkbox' ? (
                <div className="checkbox-wrapper">
                  <input
                    id={key}
                    type="checkbox"
                    checked={formData[key]}
                    onChange={(e) => setFormData({...formData, [key]: e.target.checked})}
                  />
                  <span>Active Member</span>
                </div>
              ) : (
                <input
                  id={key}
                  type={fieldType}
                  placeholder={fieldLabel}
                  value={formData[key]}
                  onChange={(e) => setFormData({...formData, [key]: e.target.value})}
                />
              )}
            </div>
          )
        })}
        <div className="form-actions">
          <button type="submit" className="save-btn">💾 {editing.data.id ? 'Update' : 'Create'} {editing.type.slice(0, -1).replace(/^\w/, c => c.toUpperCase())}</button>
          <button type="button" className="cancel-btn" onClick={() => { setEditing(null); setFormData({}) }}>Cancel</button>
        </div>
      </form>
    </div>
  )
}

export default EditForm
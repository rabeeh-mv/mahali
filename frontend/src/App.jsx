import { useState, useEffect } from 'react'
import { memberAPI, houseAPI, areaAPI, collectionAPI, subcollectionAPI, obligationAPI, eventAPI } from './api'
import './App.css'

function App() {
  const [activeTab, setActiveTab] = useState('dashboard')
  const [members, setMembers] = useState([])
  const [houses, setHouses] = useState([])
  const [areas, setAreas] = useState([])
  const [collections, setCollections] = useState([])
  const [subcollections, setSubcollections] = useState([])
  const [memberObligations, setMemberObligations] = useState([])
  const [selectedCollection, setSelectedCollection] = useState(null)
  const [selectedSubcollection, setSelectedSubcollection] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [retryCount, setRetryCount] = useState(0)
  const [formData, setFormData] = useState({})
  const [editing, setEditing] = useState(null)
  const [theme, setTheme] = useState('light') // light, dim, dark

  useEffect(() => {
    // Wait a bit to ensure Django server is running
    const timeout = setTimeout(() => {
      loadData()
    }, 3000) // Wait 3 seconds

    return () => clearTimeout(timeout)
  }, [])

  const loadData = async () => {
    setLoading(true)
    setError(null)
    try {
      // Load all data from backend
      const [
        membersRes, 
        housesRes, 
        areasRes, 
        collectionsRes,
        subcollectionsRes,
        obligationsRes
      ] = await Promise.all([
        memberAPI.getAll(),
        houseAPI.getAll(),
        areaAPI.getAll(),
        collectionAPI.getAll(),
        subcollectionAPI.getAll(),
        obligationAPI.getAll()
      ])
      
      setMembers(membersRes.data)
      setHouses(housesRes.data)
      setAreas(areasRes.data)
      setCollections(collectionsRes.data)
      setSubcollections(subcollectionsRes.data)
      setMemberObligations(obligationsRes.data)
      setRetryCount(0) // Reset retry count on successful load
    } catch (error) {
      console.error('Failed to load data:', error)

      // Retry with exponential backoff if it's likely a server not ready issue
      if (retryCount < 3) {
        setTimeout(() => {
          setRetryCount(prev => prev + 1)
          loadData()
        }, 2000 * (retryCount + 1)) // 2s, 4s, 6s
      } else {
        setError('Unable to connect to server. Please restart the application.')
      }
    }
    setLoading(false)
  }

  const handleSubmit = async (type) => {
    try {
      if (editing) {
        await updateItem(type, editing.id, formData)
      } else {
        await createItem(type, formData)
      }
      setFormData({})
      setEditing(null)
      loadData()
    } catch (error) {
      console.error(`Failed to ${editing ? 'update' : 'create'} ${type}:`, error)
    }
  }

  const createItem = async (type, data) => {
    const apis = { 
      members: memberAPI, 
      houses: houseAPI, 
      areas: areaAPI, 
      collections: collectionAPI, 
      subcollections: subcollectionAPI, 
      obligations: obligationAPI, 
      events: eventAPI 
    }
    await apis[type].create(data)
  }

  const updateItem = async (type, id, data) => {
    const apis = { 
      members: memberAPI, 
      houses: houseAPI, 
      areas: areaAPI, 
      collections: collectionAPI, 
      subcollections: subcollectionAPI, 
      obligations: obligationAPI, 
      events: eventAPI 
    }
    await apis[type].update(id, data)
  }

  const deleteItem = async (type, id) => {
    const apis = { 
      members: memberAPI, 
      houses: houseAPI, 
      areas: areaAPI, 
      collections: collectionAPI, 
      subcollections: subcollectionAPI, 
      obligations: obligationAPI, 
      events: eventAPI 
    }
    await apis[type].delete(id)
    loadData()
  }

  const exportData = async () => {
    try {
      setExportProgress({ status: 'starting', message: 'Starting export...' })
      
      // Simulate progress for better UX
      setExportProgress({ status: 'processing', message: 'Collecting data...', progress: 25 })
      await new Promise(resolve => setTimeout(resolve, 500))
      
      setExportProgress({ status: 'processing', message: 'Packaging files...', progress: 50 })
      await new Promise(resolve => setTimeout(resolve, 500))
      
      setExportProgress({ status: 'processing', message: 'Compressing archive...', progress: 75 })
      await new Promise(resolve => setTimeout(resolve, 500))
      
      const response = await eventAPI.exportData()
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const a = document.createElement('a')
      a.href = url
      a.download = 'mahall_data.zip'
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      
      setExportProgress({ status: 'completed', message: 'Export completed!', progress: 100 })
      setTimeout(() => setExportProgress(null), 3000)
    } catch (error) {
      setExportProgress({ status: 'error', message: 'Export failed: ' + error.message })
      setTimeout(() => setExportProgress(null), 5000)
    }
  }

  const importData = async (event) => {
    const file = event.target.files[0]
    if (!file) return

    const formData = new FormData()
    formData.append('zip_file', file)

    try {
      setImportProgress({ status: 'starting', message: 'Starting import...' })
      
      // Simulate progress for better UX
      setImportProgress({ status: 'processing', message: 'Validating file...', progress: 25 })
      await new Promise(resolve => setTimeout(resolve, 500))
      
      setImportProgress({ status: 'processing', message: 'Extracting data...', progress: 50 })
      await new Promise(resolve => setTimeout(resolve, 500))
      
      setImportProgress({ status: 'processing', message: 'Importing records...', progress: 75 })
      await eventAPI.importData(formData)
      
      setImportProgress({ status: 'completed', message: 'Import completed!', progress: 100 })
      setTimeout(() => setImportProgress(null), 3000)
      loadData()
    } catch (error) {
      setImportProgress({ status: 'error', message: 'Import failed: ' + error.message })
      setTimeout(() => setImportProgress(null), 5000)
    }
  }

  const renderMembers = () => (
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

  const renderHouses = () => (
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

  const renderAreas = () => (
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

  const renderCollections = () => (
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

  const renderSubcollections = () => (
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

  const renderObligations = () => (
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

  const renderDataManagement = () => (
    <div className="data-section">
      <h2>💾 Data Management</h2>
      <div className="data-management-content">
        <div className="data-action-card">
          <h3>📤 Export Data</h3>
          <p>Export all data to a ZIP file for backup or transfer.</p>
          <button onClick={exportData} className="export-btn">Export Now</button>
          
          {/* Export Progress */}
          {exportProgress && (
            <div className={`progress-container ${exportProgress.status}`}>
              <div className="progress-header">
                <span>{exportProgress.message}</span>
                {exportProgress.progress && <span>{exportProgress.progress}%</span>}
              </div>
              {exportProgress.progress && (
                <div className="progress-bar">
                  <div 
                    className="progress-fill" 
                    style={{width: `${exportProgress.progress}%`}}
                  ></div>
                </div>
              )}
            </div>
          )}
        </div>
        
        <div className="data-action-card">
          <h3>📥 Import Data</h3>
          <p>Import data from a previously exported ZIP file.</p>
          <label className="import-btn">
            Select File
            <input type="file" accept=".zip" onChange={importData} />
          </label>
          
          {/* Import Progress */}
          {importProgress && (
            <div className={`progress-container ${importProgress.status}`}>
              <div className="progress-header">
                <span>{importProgress.message}</span>
                {importProgress.progress && <span>{importProgress.progress}%</span>}
              </div>
              {importProgress.progress && (
                <div className="progress-bar">
                  <div 
                    className="progress-fill" 
                    style={{width: `${importProgress.progress}%`}}
                  ></div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )

  return (
    <div className={`app theme-${theme}`}>
      <div className="app-layout">
        {/* Sidebar */}
        <aside className="sidebar">
          <div className="sidebar-header">
            <h2>🏛️ Mahall</h2>
          </div>
          
          <nav className="sidebar-nav">
            <button 
              className={activeTab === 'dashboard' ? 'active' : ''}
              onClick={() => setActiveTab('dashboard')}
            >
              📊 Dashboard
            </button>
            <button 
              className={activeTab === 'areas' ? 'active' : ''}
              onClick={() => setActiveTab('areas')}
            >
              📍 Areas ({areas.length})
            </button>
            <button 
              className={activeTab === 'houses' ? 'active' : ''}
              onClick={() => setActiveTab('houses')}
            >
              🏘️ Houses ({houses.length})
            </button>
            <button 
              className={activeTab === 'members' ? 'active' : ''}
              onClick={() => setActiveTab('members')}
            >
              👥 Members ({members.length})
            </button>
            <button 
              className={activeTab === 'collections' ? 'active' : ''}
              onClick={() => setActiveTab('collections')}
            >
              📂 Collections ({collections.length})
            </button>
            <button 
              className={activeTab === 'data' ? 'active' : ''}
              onClick={() => setActiveTab('data')}
            >
              💾 Data Management
            </button>
          </nav>
          
          <div className="sidebar-footer">
            <div className="theme-selector">
              <button 
                className={theme === 'light' ? 'active' : ''}
                onClick={() => setTheme('light')}
              >
                ☀️
              </button>
              <button 
                className={theme === 'dim' ? 'active' : ''}
                onClick={() => setTheme('dim')}
              >
                🌗
              </button>
              <button 
                className={theme === 'dark' ? 'active' : ''}
                onClick={() => setTheme('dark')}
              >
                🌙
              </button>
            </div>
          </div>
        </aside>
        
        {/* Main Content */}
        <div className="main-content">
          <header>
            <div className="header-content">
              <h1>🏛️ Mahall Society Management</h1>
            </div>
          </header>
          
          <main>
            {activeTab === 'dashboard' && (
              <div className="data-section">
                <h2>📊 Dashboard</h2>
                <div className="dashboard-stats">
                  <div className="stat-card">
                    <h3>{members.length}</h3>
                    <p>Members</p>
                  </div>
                  <div className="stat-card">
                    <h3>{houses.length}</h3>
                    <p>Houses</p>
                  </div>
                  <div className="stat-card">
                    <h3>{areas.length}</h3>
                    <p>Areas</p>
                  </div>
                  <div className="stat-card">
                    <h3>{collections.length}</h3>
                    <p>Collections</p>
                  </div>
                </div>
              </div>
            )}
            {activeTab === 'areas' && renderAreas()}
            {activeTab === 'houses' && renderHouses()}
            {activeTab === 'members' && renderMembers()}
            {activeTab === 'collections' && renderCollections()}
            {activeTab === 'subcollections' && renderSubcollections()}
            {activeTab === 'obligations' && renderObligations()}
            {activeTab === 'data' && renderDataManagement()}
            {renderForm()}
          </main>
        </div>
      </div>
    </div>
  )
}

export default App

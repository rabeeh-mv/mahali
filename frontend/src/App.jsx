import { useState, useEffect } from 'react'
import { memberAPI, houseAPI, areaAPI, collectionAPI, subcollectionAPI, obligationAPI, eventAPI } from './api'
import MemberDetails from './components/MemberDetails'
import Collections from './components/Collections'
import Subcollections from './components/Subcollections'
import Obligations from './components/Obligations'
import BulkObligationModal from './components/BulkObligationModal'
import CollectionModal from './components/CollectionModal'
import SubcollectionModal from './components/SubcollectionModal'
import ObligationModal from './components/ObligationModal'
import MemberModal from './components/MemberModal'
import AreaModal from './components/AreaModal'
import HouseModal from './components/HouseModal'
import { FaArrowLeft, FaPlus } from 'react-icons/fa'
import './App.css'
import PaymentConfirmModal from './components/PaymentConfirmModal'

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
  const [selectedMember, setSelectedMember] = useState(null)
  const [exportProgress, setExportProgress] = useState(null)
  const [importProgress, setImportProgress] = useState(null)
  // State for PaymentConfirmModal
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false)
  const [obligationToPay, setObligationToPay] = useState(null)
  const [isBulkObligationModalOpen, setIsBulkObligationModalOpen] = useState(false)
  
  // Member search and filter states
  const [memberSearchTerm, setMemberSearchTerm] = useState('')
  const [memberSelectedArea, setMemberSelectedArea] = useState('')
  const [memberSelectedStatus, setMemberSelectedStatus] = useState('')
  const [memberIsGuardianFilter, setMemberIsGuardianFilter] = useState('')
  const [filteredMembers, setFilteredMembers] = useState([])
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(10)
  
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
      
      console.log('Subcollections data:', subcollectionsRes.data);
      console.log('Collections data:', collectionsRes.data);
      
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

  const loadDataForTab = async (tab, force = false) => {
    if (tab === 'obligations' || force) {
      try {
        const obligationsRes = await obligationAPI.getAll()
        setMemberObligations(obligationsRes.data)
        // Also reload other data that might have changed
        const [membersRes, housesRes, areasRes, collectionsRes, subcollectionsRes] = await Promise.all([
          memberAPI.getAll(),
          houseAPI.getAll(),
          areaAPI.getAll(),
          collectionAPI.getAll(),
          subcollectionAPI.getAll()
        ])
        setMembers(membersRes.data)
        setHouses(housesRes.data)
        setAreas(areasRes.data)
        setCollections(collectionsRes.data)
        setSubcollections(subcollectionsRes.data)
      } catch (error) {
        console.error('Failed to load obligations:', error)
      }
    }
    // Add other tab loading logic as needed
  }

  const handlePayObligation = (obligation) => {
    setObligationToPay(obligation)
    setIsPaymentModalOpen(true)
  }

  const handlePaymentModalClose = () => {
    setIsPaymentModalOpen(false)
    setObligationToPay(null)
  }

  const handlePaymentConfirm = async () => {
    try {
      // Update obligation status to 'paid'
      // Only send the fields that need to be updated to avoid validation issues
      const updateData = {
        paid_status: 'paid'
      };
      
      await obligationAPI.partialUpdate(obligationToPay.id, updateData);
      
      // Reload obligations data
      loadDataForTab('obligations', true);
      
      // Close the modal
      handlePaymentModalClose();
      
      return Promise.resolve();
    } catch (error) {
      console.error('Failed to process payment:', error);
      throw error;
    }
  }

  const handleAddBulkObligation = () => {
    // This would open the bulk obligation modal
    setIsBulkObligationModalOpen(true)
  }

  const handleSubmit = async (type, data) => {
    try {
      // Check if we're editing an existing item by checking if the original data had an id
      if (editing && editing.data && editing.data.id) {
        // Update existing item
        await updateItem(type, editing.data.id, data);
      } else if (editing && editing.id) {
        // Update existing item (alternative format)
        await updateItem(type, editing.id, data);
      } else {
        // Create new item
        await createItem(type, data);
      }
      
      setFormData({});
      setEditing(null);
      loadData();
    } catch (error) {
      console.error(`Failed to ${editing ? 'update' : 'create'} ${type}:`, error);
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
    return await apis[type].create(data)
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
    return await apis[type].update(id, data)
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
    
    // Special handling for members and houses which use custom ID fields
    let result;
    if (type === 'members') {
      result = await apis[type].delete(id) // member_id is the lookup field
    } else if (type === 'houses') {
      result = await apis[type].delete(id) // home_id is the lookup field
    } else {
      result = await apis[type].delete(id)
    }
    
    loadData()
    return result;
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

  const renderMembers = () => {
    // Reset all filters
    const resetFilters = () => {
      setMemberSearchTerm('')
      setMemberSelectedArea('')
      setMemberSelectedStatus('')
      setMemberIsGuardianFilter('')
      setCurrentPage(1)
    }
    
    // Pagination logic
    const indexOfLastItem = currentPage * itemsPerPage
    const indexOfFirstItem = indexOfLastItem - itemsPerPage
    const currentMembers = filteredMembers.slice(indexOfFirstItem, indexOfLastItem)
    const totalPages = Math.ceil(filteredMembers.length / itemsPerPage)
    
    return (
      <div className="data-section">
        <div className="section-header">
          <h2>👥 Members</h2>
          <button onClick={() => setEditing({ type: 'members', data: {} })} className="add-btn">
            <FaPlus />
          </button>
        </div>
        
        {/* Search and Filters */}
        <div className="filter-section">
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="member-search">Search Members</label>
              <input
                type="text"
                id="member-search"
                placeholder="Search by name, surname, or house..."
                value={memberSearchTerm}
                onChange={(e) => setMemberSearchTerm(e.target.value)}
                className="search-input"
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="member-area">Area</label>
              <select
                id="member-area"
                value={memberSelectedArea}
                onChange={(e) => setMemberSelectedArea(e.target.value)}
                className="filter-select"
              >
                <option value="">All Areas</option>
                {areas.map(area => (
                  <option key={area.id} value={area.id}>{area.name}</option>
                ))}
              </select>
            </div>
            
            <div className="form-group">
              <label htmlFor="member-status">Status</label>
              <select
                id="member-status"
                value={memberSelectedStatus}
                onChange={(e) => setMemberSelectedStatus(e.target.value)}
                className="filter-select"
              >
                <option value="">All Statuses</option>
                <option value="live">Live</option>
                <option value="dead">Dead</option>
                <option value="terminated">Terminated</option>
              </select>
            </div>
            
            <div className="form-group">
              <label htmlFor="member-guardian">Guardian</label>
              <select
                id="member-guardian"
                value={memberIsGuardianFilter}
                onChange={(e) => setMemberIsGuardianFilter(e.target.value)}
                className="filter-select"
              >
                <option value="">All</option>
                <option value="true">Guardians Only</option>
                <option value="false">Non-Guardians Only</option>
              </select>
            </div>
            
            <div className="form-group">
              <label>&nbsp;</label>
              <button onClick={resetFilters} className="cancel-btn">
                Reset Filters
              </button>
            </div>
          </div>
        </div>
        
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Surname</th>
                <th>Area</th>
                <th>House Name</th>
                <th>Status</th>
                <th>Guardian</th>
                <th>Phone</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {currentMembers.map(member => (
                <tr key={member.member_id}>
                  <td>#{member.member_id}</td>
                  <td>{member.name || 'N/A'}</td>
                  <td>{member.surname || 'N/A'}</td>
                  <td>{member.house?.area?.name || 'N/A'}</td>
                  <td>{member.house?.house_name || 'N/A'}</td>
                  <td>
                    <span className={`status-badge ${member.status === 'live' ? 'active' : member.status === 'dead' ? 'inactive' : 'terminated'}`}>
                      {member.status?.charAt(0).toUpperCase() + member.status?.slice(1)}
                    </span>
                  </td>
                  <td>
                    <span className={member.isGuardian ? 'member-guardian-yes' : 'member-guardian-no'}>
                      {member.isGuardian ? 'Yes' : 'No'}
                    </span>
                  </td>
                  <td>{member.phone || member.whatsapp || 'N/A'}</td>
                  <td>
                    <button 
                      onClick={() => {
                        setSelectedMember(member);
                        setActiveTab('member-details');
                      }} 
                      className="view-btn"
                    >
                      👁️ View
                    </button>
                    <button onClick={() => setEditing({ type: 'members', data: member })} className="edit-btn">✏️ Edit</button>
                    <button onClick={() => deleteItem('members', member.member_id)} className="delete-btn">🗑️ Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredMembers.length === 0 && (
            <div className="empty-state">
              <p>No members found. Add a new member to get started.</p>
            </div>
          )}
        </div>
        
        {/* Pagination */}
        {totalPages > 1 && (
          <div className="pagination">
            <button 
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="pagination-btn"
            >
              Previous
            </button>
            
            <span className="pagination-info">
              Page {currentPage} of {totalPages}
            </span>
            
            <button 
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="pagination-btn"
            >
              Next
            </button>
          </div>
        )}
      </div>
    )
  }

  const renderHouses = () => (
    <div className="data-section">
      <div className="section-header">
        <h2>🏘️ Houses</h2>
        <button onClick={() => setEditing({ type: 'houses', data: {} })} className="add-btn">
          <FaPlus />
        </button>
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
        <button onClick={() => setEditing({ type: 'areas', data: {} })} className="add-btn">
          <FaPlus />
        </button>
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
    <Collections
      collections={collections}
      setEditing={setEditing}
      deleteItem={deleteItem}
      setSelectedCollection={setSelectedCollection}
      loadDataForTab={loadDataForTab}
      setActiveTab={setActiveTab}
    />
  )

  const renderSubcollections = () => (
    <Subcollections
      subcollections={subcollections}
      selectedCollection={selectedCollection}
      setEditing={setEditing}
      deleteItem={deleteItem}
      setSelectedSubcollection={setSelectedSubcollection}
      handleEditSubcollection={(subcollection) => setEditing({ type: 'subcollections', data: subcollection })}
      handleAddSubcollection={() => setEditing({ type: 'subcollections', data: {} })}
      loadDataForTab={loadDataForTab}
      setActiveTab={setActiveTab}
    />
  )

  const renderObligations = () => (
    <Obligations 
      memberObligations={memberObligations}
      selectedSubcollection={selectedSubcollection}
      members={members}
      setEditing={setEditing}
      deleteItem={deleteItem}
      handleAddObligation={() => setEditing({ type: 'obligations', data: {} })}
      handleEditObligation={(obligation) => setEditing({ type: 'obligations', data: obligation })}
      handlePayObligation={handlePayObligation}
      handleAddBulkObligation={handleAddBulkObligation}
      setSelectedSubcollection={setSelectedSubcollection}
      setSelectedCollection={setSelectedCollection}
      loadDataForTab={loadDataForTab}
      setActiveTab={setActiveTab}
    />
  )

  const renderMemberDetails = () => {
    if (!selectedMember) {
      return (
        <div className="data-section">
          <div className="section-header">
            <div className="header-content">
              <button onClick={() => setActiveTab('members')} className="back-btn">
                <FaArrowLeft />
              </button>
              <h2>Member Details</h2>
            </div>
          </div>
          <div className="empty-state">
            <p>No member selected.</p>
          </div>
        </div>
      );
    }

    // Find the house for this member
    const memberHouse = houses.find(house => house.home_id === selectedMember.house) || null;
    
    // Find the area for this house
    let houseArea = null;
    if (memberHouse && memberHouse.area) {
      if (typeof memberHouse.area === 'object') {
        houseArea = memberHouse.area;
      } else {
        houseArea = areas.find(area => area.id === memberHouse.area) || null;
      }
    }

    return (
      <div className="data-section">
        <div className="section-header">
          <div className="header-content">
            <button onClick={() => setActiveTab('members')} className="back-btn">
              <FaArrowLeft />
            </button>
            <h2>Member Details</h2>
          </div>
        </div>
        <MemberDetails member={selectedMember} house={memberHouse} area={houseArea} />
      </div>
    );
  }

  const renderDataManagement = () => (
    <div className="data-section">
      <div className="section-header">
        <h2>💾 Data Management</h2>
      </div>
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

  const renderForm = () => {
    if (!editing) return null;
    
    const { type, data } = editing;
    
    // Import the appropriate modal component based on the type
    switch (type) {
      case 'collections':
        return (
          <CollectionModal 
            isOpen={!!editing}
            onClose={() => setEditing(null)} 
            onSubmit={(formData, initialData) => handleSubmit('collections', formData)}
            initialData={data && data.id ? data : null}
          />
        );
      case 'subcollections':
        return (
          <SubcollectionModal 
            isOpen={!!editing}
            onClose={() => setEditing(null)} 
            onSubmit={async (formData, selectedMembers, initialData) => {
              try {
                let createdSubcollection;
                
                // Create or update the subcollection
                if (initialData && initialData.id) {
                  // Update existing subcollection
                  await updateItem('subcollections', initialData.id, {
                    ...formData,
                    collection: selectedCollection?.id
                  });
                } else {
                  // Create new subcollection
                  const result = await createItem('subcollections', {
                    ...formData,
                    collection: selectedCollection?.id
                  });
                  createdSubcollection = result.data;
                }
                
                // If there are selected members and this is a new subcollection, create obligations
                if (selectedMembers && selectedMembers.length > 0 && !initialData) {
                  const subcollectionId = createdSubcollection ? createdSubcollection.id : null;
                  
                  if (subcollectionId) {
                    // Create obligations for selected members
                    const obligationsData = selectedMembers.map(memberId => ({
                      member: memberId,
                      subcollection: subcollectionId,
                      amount: formData.amount,
                      paid_status: 'pending'
                    }));
                    
                    // Use bulk create API to create all obligations at once
                    await obligationAPI.bulkCreate({ obligations: obligationsData });
                  }
                }
                
                setFormData({});
                setEditing(null);
                loadData();
              } catch (error) {
                console.error('Failed to save subcollection:', error);
                throw error;
              }
            }}
            initialData={data}
            selectedCollection={selectedCollection}
            collections={collections}
          />
        );
      case 'obligations':
        // For obligations, we need to ensure we have a selected subcollection
        if (!selectedSubcollection) {
          return null;
        }
        return (
          <ObligationModal 
            isOpen={!!editing}
            onClose={() => setEditing(null)} 
            onSubmit={(formData) => handleSubmit('obligations', {
              ...formData,
              subcollection: selectedSubcollection.id
            })}
            initialData={data}
            members={members}
            subcollection={selectedSubcollection}
          />
        );
      case 'members':
        return (
          <MemberModal 
            isOpen={!!editing}
            onClose={() => setEditing(null)} 
            onSubmit={(formData) => handleSubmit('members', formData)}
            initialData={data}
            loadDataForTab={loadDataForTab}
          />
        );
      case 'areas':
        return (
          <AreaModal 
            isOpen={!!editing}
            onClose={() => setEditing(null)} 
            onSubmit={(formData) => handleSubmit('areas', formData)}
            initialData={data}
          />
        );
      case 'houses':
        return (
          <HouseModal 
            isOpen={!!editing}
            onClose={() => setEditing(null)} 
            onSubmit={(formData) => handleSubmit('houses', formData)}
            initialData={data}
            areas={areas}
          />
        );
      default:
        return null;
    }
  };

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
                <div className="section-header">
                  <h2>📊 Dashboard</h2>
                </div>
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
            {activeTab === 'member-details' && renderMemberDetails()}
            {activeTab === 'collections' && renderCollections()}
            {activeTab === 'subcollections' && renderSubcollections()}
            {activeTab === 'obligations' && renderObligations()}
            {activeTab === 'data' && renderDataManagement()}

            <PaymentConfirmModal
              isOpen={isPaymentModalOpen}
              onClose={handlePaymentModalClose}
              onConfirm={handlePaymentConfirm}
              obligation={obligationToPay}
            />
            <BulkObligationModal
              isOpen={isBulkObligationModalOpen}
              onClose={() => setIsBulkObligationModalOpen(false)}
              onSubmit={async (data) => {
                try {
                  await obligationAPI.bulkCreate(data);
                  loadDataForTab('obligations', true);
                  setIsBulkObligationModalOpen(false);
                } catch (error) {
                  console.error('Failed to create bulk obligations:', error);
                  throw error;
                }
              }}
              selectedSubcollection={selectedSubcollection}
              existingObligations={memberObligations.filter(ob => ob.subcollection === selectedSubcollection?.id)}
            />
          </main>
        </div>
      </div>
    </div>
  )
}

export default App

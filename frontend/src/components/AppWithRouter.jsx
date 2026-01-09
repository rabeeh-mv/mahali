import { useState, useEffect } from 'react'
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { memberAPI, houseAPI, areaAPI, collectionAPI, subcollectionAPI, obligationAPI, eventAPI, api } from '../api'
import Sidebar from './Sidebar'
import Dashboard from './Dashboard'
import LoadingScreen from './LoadingScreen'
import Areas from './Areas'
import Houses from './Houses'
import HouseDetailsPage from './HouseDetailsPage'
import Members from './Members'
import MemberDetails from './MemberDetails'
import MemberDetailsPage from './MemberDetailsPage'
import Collections from './Collections'
import Subcollections from './Subcollections'
import Obligations from './Obligations'

import EditForm from './EditForm'

import DeleteConfirmModal from './DeleteConfirmModal'
import FirebaseDataImproved from './FirebaseDataImproved'
import AreaForm from './AreaForm'
import HouseForm from './HouseForm'
import MemberForm from './MemberForm'
import BulkObligationPage from './BulkObligationPage'
import MyActions from './MyActions'
import Settings from './Settings'

import './App.css'

function AppWithRouter() {
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
  const [exportProgress, setExportProgress] = useState(null)
  const [importProgress, setImportProgress] = useState(null)
  const [isExporting, setIsExporting] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [memberToDelete, setMemberToDelete] = useState(null)

  // Track which tabs have been loaded
  const [loadedTabs, setLoadedTabs] = useState(new Set(['dashboard']))

  // Tab-specific loading states
  const [tabLoadingStates, setTabLoadingStates] = useState({
    dashboard: false,
    areas: false,
    houses: false,
    members: false,
    collections: false,
    subcollections: false,
    obligations: false,

  })

  const loadDataForTab = async (tab, force = false) => {
    // If tab is already loaded and not forced, don't load again
    if (!force && loadedTabs.has(tab)) return

    // Set loading state for this specific tab
    setTabLoadingStates(prev => ({ ...prev, [tab]: true }))

    try {
      switch (tab) {
        case 'areas':
          const areasData = await areaAPI.getAll()
          setAreas(areasData.data)
          break
        case 'houses':
          const housesData = await houseAPI.getAll()
          const areasDataForHouses = await areaAPI.getAll()
          setHouses(housesData.data)
          setAreas(areasDataForHouses.data)
          break
        case 'members':
          const membersData = await memberAPI.getAll()
          setMembers(membersData.data)
          break
        case 'collections':
          const collectionsData = await collectionAPI.getAll()
          setCollections(collectionsData.data)
          break
        case 'subcollections':
          const subcollectionsData = await subcollectionAPI.getAll()
          setSubcollections(subcollectionsData.data)
          break
        case 'obligations':
          const obligationsData = await obligationAPI.getAll()
          const membersDataForObligations = await memberAPI.getAll()
          setMemberObligations(obligationsData.data)
          setMembers(membersDataForObligations.data)
          break
        default:
          // Other tabs don't need specific data loading
          break
      }

      // Mark tab as loaded (only if not forced)
      if (!force) {
        setLoadedTabs(prev => new Set(prev).add(tab))
      }
    } catch (error) {
      console.error(`Failed to load data for ${tab}:`, error)
    } finally {
      setTabLoadingStates(prev => ({ ...prev, [tab]: false }))
    }
  }

  const loadData = async () => {
    setLoading(true)
    setError(null)
    try {
      // Check if the backend API is accessible by calling the root endpoint
      await api.get('/')
      // If successful, load minimal data for initial dashboard
      const areasRes = await areaAPI.getAll()
      setAreas(areasRes.data)
      setRetryCount(0) // Reset retry count on successful load
    } catch (error) {
      console.error('Failed to load initial data:', error)

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

  useEffect(() => {
    // Wait a bit to ensure Django server is running
    const timeout = setTimeout(() => {
      loadData()
    }, 3000) // Wait 3 seconds

    return () => clearTimeout(timeout)
  }, [])

  const handleTabChange = (tab) => {
    setActiveTab(tab)
    // Load data for the new tab if not already loaded
    if (tab !== 'dashboard') {
      loadDataForTab(tab)
    } else {
      // Mark dashboard as loaded since it does not need data
      setLoadedTabs(prev => new Set(prev).add(tab))
    }
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
      loadDataForTab(activeTab, true) // Force reload data for current tab
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

    // Reload data for the specific tab that corresponds to the deleted item type
    switch (type) {
      case 'areas':
        loadDataForTab('areas', true) // Force reload
        break
      case 'houses':
        loadDataForTab('houses', true) // Force reload
        break
      case 'members':
        loadDataForTab('members', true) // Force reload
        break
      case 'collections':
        loadDataForTab('collections', true) // Force reload
        break
      case 'subcollections':
        loadDataForTab('subcollections', true) // Force reload
        break
      case 'obligations':
        loadDataForTab('obligations', true) // Force reload
        break
      default:
        // For other types, reload data for current tab
        loadDataForTab(activeTab, true) // Force reload
    }
  }

  const exportData = async () => {
    // Disable user interactions during export
    setIsExporting(true);
    try {
      setExportProgress({ status: 'starting', message: 'Starting export...', progress: 0 });

      // Real progress - Collecting data
      setExportProgress({ status: 'processing', message: 'Collecting database...', progress: 20 });

      const response = await obligationAPI.exportData()

      // Progress - Packaging files
      setExportProgress({ status: 'processing', message: 'Packaging files...', progress: 60 });

      // Progress - Compressing archive
      setExportProgress({ status: 'processing', message: 'Compressing archive...', progress: 80 });

      // Create download link and trigger download
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const a = document.createElement('a')
      a.href = url
      a.download = `mahall_backup_${new Date().toISOString().slice(0, 10)}.zip`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      setExportProgress({ status: 'completed', message: 'Export completed!', progress: 100 })
      setTimeout(() => {
        setExportProgress(null)
        setIsExporting(false)
      }, 3000)
    } catch (error) {
      setExportProgress({ status: 'error', message: 'Export failed: ' + (error.response?.data?.error || error.message) })
      setTimeout(() => {
        setExportProgress(null)
        setIsExporting(false)
      }, 5000)
    }
  }

  const importData = async (event) => {
    const file = event.target.files[0]
    if (!file) return

    // Disable user interactions during import
    setIsImporting(true);
    const formData = new FormData()
    formData.append('zip_file', file)

    try {
      setImportProgress({ status: 'starting', message: 'Starting import...', progress: 0 });

      // Real progress - Validating file
      setImportProgress({ status: 'processing', message: 'Validating file...', progress: 10 });

      // Real progress - Extracting data
      setImportProgress({ status: 'processing', message: 'Extracting data...', progress: 30 });

      await obligationAPI.importData(formData);

      // Progress - Importing records
      setImportProgress({ status: 'processing', message: 'Importing records...', progress: 75 });

      setImportProgress({ status: 'completed', message: 'Import completed!', progress: 100 });
      setTimeout(() => {
        setImportProgress(null);
        setIsImporting(false);
        // Reload all data after import
        setLoadedTabs(new Set(['dashboard']));
        loadDataForTab(activeTab, true);
      }, 3000);
    } catch (error) {
      setImportProgress({ status: 'error', message: 'Import failed: ' + (error.response?.data?.error || error.message) });
      setTimeout(() => {
        setImportProgress(null);
        setIsImporting(false);
      }, 5000);
    }
  }

  const handleDeleteMember = (member) => {
    setMemberToDelete(member)
    setIsDeleteModalOpen(true)
  }

  const confirmDelete = async () => {
    if (memberToDelete) {
      await deleteItem('members', memberToDelete.member_id)
      setIsDeleteModalOpen(false)
      setMemberToDelete(null)
      // Reload member data after deletion
      loadDataForTab('members', true) // Force reload
    }
  }

  const handleDeleteModalClose = () => {
    setIsDeleteModalOpen(false)
    setMemberToDelete(null)
  }

  if (loading) return <LoadingScreen retryCount={retryCount} />

  if (error) return (
    <div className={`app theme-${theme}`}>
      <div className="error-container">
        <h2>⚠️ Error Loading Application</h2>
        <p>{error}</p>
        <button onClick={() => window.location.reload()}>Refresh</button>
      </div>
    </div>
  )

  // Show loading indicator for specific tabs
  const isTabLoading = tabLoadingStates[activeTab]

  // Disable interactions during export/import
  const isBusy = isExporting || isImporting || loading || isTabLoading

  return (
    <Router>
      <div className={`app theme-${theme}`}>
        <div className="app-layout">
          <Sidebar
            activeTab={activeTab}
            setActiveTab={handleTabChange}
            theme={theme}
            setTheme={setTheme}
            areasCount={areas.length}
            housesCount={houses.length}
            membersCount={members.length}
            collectionsCount={collections.length}
            disabled={isBusy}
          />

          <div className="main-content">
            <Routes>
              <Route path="/" element={<Navigate to="/dashboard" />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/areas/add" element={<AreaForm />} />
              <Route path="/areas/edit/:id" element={<AreaForm />} />
              <Route path="/houses/add" element={<HouseForm />} />
              <Route path="/houses/edit/:id" element={<HouseForm />} />
              <Route path="/members/add" element={<MemberForm />} />
              <Route path="/members/edit/:id" element={<MemberForm />} />
              <Route path="/obligations/bulk-add" element={<BulkObligationPage />} />
              <Route path="/areas" element={
                <Areas
                  areas={areas}
                  setEditing={setEditing}
                  deleteItem={deleteItem}
                  loadDataForTab={loadDataForTab}
                />
              } />
              <Route path="/houses" element={
                <Houses
                  houses={houses}
                  areas={areas}
                  setEditing={setEditing}
                  deleteItem={deleteItem}
                  loadDataForTab={loadDataForTab}
                />
              } />
              <Route path="/houses/:houseId" element={
                <HouseDetailsPage
                  houses={houses}
                  members={members}
                  areas={areas}
                  subcollections={subcollections}
                  setEditing={setEditing}
                  loadDataForTab={loadDataForTab}
                  deleteItem={deleteItem}
                />
              } />
              <Route path="/members" element={
                <Members
                  members={members}
                  setEditing={setEditing}
                  deleteItem={deleteItem}
                  loadDataForTab={loadDataForTab}
                />
              } />
              <Route path="/members/:memberId" element={
                <MemberDetailsPage
                  members={members}
                  houses={houses}
                  areas={areas}
                  setEditing={setEditing}
                  deleteItem={deleteItem}
                  loadDataForTab={loadDataForTab}
                />
              } />
              <Route path="/member-request" element={<FirebaseDataImproved />} /> {/* Member Request route */}
              <Route path="/my-actions" element={<MyActions />} />
              <Route path="/collections" element={
                <Collections
                  collections={collections}
                  setEditing={setEditing}
                  deleteItem={deleteItem}
                  setSelectedCollection={setSelectedCollection}
                  handleEditCollection={(collection) => setEditing({ type: 'collections', data: collection })}
                  handleAddCollection={() => setEditing({ type: 'collections', data: {} })}
                  loadDataForTab={loadDataForTab}
                  setActiveTab={setActiveTab}
                />
              } />
              <Route path="/subcollections" element={
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
              } />
              <Route path="/obligations" element={
                <Obligations
                  memberObligations={memberObligations}
                  selectedSubcollection={selectedSubcollection}
                  members={members}
                  setEditing={setEditing}
                  deleteItem={deleteItem}
                  handleAddObligation={() => setEditing({ type: 'obligations', data: {} })}
                  handleEditObligation={(obligation) => setEditing({ type: 'obligations', data: obligation })}
                  handlePayObligation={(obligation) => {
                    // Handle payment logic here
                    console.log('Pay obligation:', obligation)
                  }}
                  handleAddBulkObligation={() => {
                    // Handle bulk obligation creation here
                    console.log('Add bulk obligation')
                  }}
                  setSelectedSubcollection={setSelectedSubcollection}
                  setSelectedCollection={setSelectedCollection}
                  loadDataForTab={loadDataForTab}
                  setActiveTab={setActiveTab}
                />
              } />
              <Route path="/settings" element={
                <Settings
                  exportData={exportData}
                  importData={importData}
                  exportProgress={exportProgress}
                  importProgress={importProgress}
                  disabled={isBusy}
                />
              } /> {/* Settings route */}
            </Routes>

            {editing && (
              <EditForm
                editing={editing}
                setEditing={setEditing}
                formData={formData}
                setFormData={setFormData}
                handleSubmit={handleSubmit}
                disabled={isBusy}
              />
            )}



            <DeleteConfirmModal
              isOpen={isDeleteModalOpen}
              onClose={handleDeleteModalClose}
              onConfirm={confirmDelete}
              item={memberToDelete}
              itemType="members"
            />
          </div>
        </div>

        {/* Overlay to prevent interactions during export/import */}
        {isBusy && (
          <div className="busy-overlay">
            <div className="busy-spinner"></div>
            <p>{isExporting ? 'Exporting data...' : isImporting ? 'Importing data...' : 'Loading...'}</p>
          </div>
        )}
      </div>
    </Router>
  )
}

export default AppWithRouter
import { useState, useEffect } from 'react'
import { BrowserRouter, HashRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { memberAPI, houseAPI, areaAPI, collectionAPI, subcollectionAPI, obligationAPI, eventAPI, api } from '../api'
import { FaUser, FaEdit } from 'react-icons/fa'
import Sidebar from './Sidebar'
import Dashboard from './Dashboard'
import LoadingScreen from './LoadingScreen'
import Areas from './Areas'
import Houses from './Houses'
import HouseDetailsPage from './HouseDetailsPage'
import Members from './Members'
import MemberDetailsPage from './MemberDetailsPage'
import Collections from './Collections'
import Subcollections from './Subcollections'
import Obligations from './Obligations'
import DataManagement from './DataManagement'
import EditForm from './EditForm'

import DeleteConfirmModal from './DeleteConfirmModal'
import SubcollectionModal from './SubcollectionModal'
import CollectionModal from './CollectionModal'
import ObligationModal from './ObligationModal'
import PaymentConfirmModal from './PaymentConfirmModal'


import './App.css'

// Determine which router to use based on environment
const Router = window.location.protocol === 'file:' ? HashRouter : BrowserRouter;

// Create a wrapper component to force re-render on location change
const AppRoutes = ({
  houses, areas, members, collections, subcollections, memberObligations,
  setEditing, deleteItem, loadDataForTab, setSelectedCollection,
  setSelectedSubcollection, exportData, importData, exportProgress,
  importProgress, isBusy, setFormData, formData, handleSubmit,
  isDeleteModalOpen, setIsDeleteModalOpen,
  memberToDelete, setMemberToDelete,
  handleDeleteMember, handleDeleteModalClose, confirmDelete,
  selectedCollection, selectedSubcollection,
  // Subcollection modal props
  isSubcollectionModalOpen, setIsSubcollectionModalOpen,
  currentSubcollection, handleEditSubcollection,
  handleSubcollectionModalClose, handleSubcollectionSubmit,
  handleAddSubcollection,
  // Collection modal props
  isCollectionModalOpen, setIsCollectionModalOpen,
  currentCollection, handleEditCollection,
  handleCollectionModalClose, handleCollectionSubmit,
  handleAddCollection,
  // Obligation modal props
  isObligationModalOpen, setIsObligationModalOpen,
  currentObligation, handleEditObligation,
  handleObligationModalClose, handleObligationSubmit,
  handleAddObligation,
  // Payment confirmation props
  handlePayObligation,
  handlePayObligation
}) => {
  const location = useLocation();

  return (
    <Routes location={location} key={location.key}>
      <Route path="/" element={<Navigate to="/dashboard" />} />
      <Route path="/dashboard" element={<Dashboard key="dashboard" />} />
      <Route path="/areas" element={
        <Areas
          key="areas"
          areas={areas}
          setEditing={setEditing}
          deleteItem={deleteItem}
          loadDataForTab={loadDataForTab}
        />
      } />
      <Route path="/houses" element={
        <Houses
          key="houses"
          areas={areas}
          setEditing={setEditing}
          deleteItem={deleteItem}
          loadDataForTab={loadDataForTab}
        />
      } />
      <Route path="/houses/:houseId" element={
        <HouseDetailsPage
          key={`house-${location.pathname}`}
          houses={houses}
          members={members}
          areas={areas}
          setEditing={setEditing}
          deleteItem={deleteItem}
        />
      } />
      <Route path="/members" element={
        <Members
          key="members"
          members={members}
          setEditing={setEditing}
          deleteItem={deleteItem}
          loadDataForTab={loadDataForTab}
        />
      } />
      <Route path="/members/:memberId" element={
        <MemberDetailsPage
          key={`member-${location.pathname}`}
          members={members}
          houses={houses}
          areas={areas}
          setEditing={setEditing}
          deleteItem={deleteItem}
          loadDataForTab={loadDataForTab}
        />
      } />
      <Route path="/collections" element={
        <Collections
          key="collections"
          collections={collections}
          setEditing={setEditing}
          deleteItem={deleteItem}
          setSelectedCollection={setSelectedCollection}
          handleEditCollection={handleEditCollection}
          handleAddCollection={handleAddCollection}
          loadDataForTab={loadDataForTab}
        />
      } />
      <Route path="/subcollections" element={
        <Subcollections
          key="subcollections"
          subcollections={subcollections}
          selectedCollection={selectedCollection}
          setEditing={setEditing}
          deleteItem={deleteItem}
          setSelectedSubcollection={setSelectedSubcollection}
          handleEditSubcollection={handleEditSubcollection}
          handleAddSubcollection={handleAddSubcollection}
          loadDataForTab={loadDataForTab}
        />
      } />
      <Route path="/obligations" element={
        <Obligations
          key="obligations"
          memberObligations={memberObligations}
          selectedSubcollection={selectedSubcollection}
          members={members}
          setEditing={setEditing}
          deleteItem={deleteItem}
          handleAddObligation={handleAddObligation}
          handleEditObligation={handleEditObligation}
          handlePayObligation={handlePayObligation}

        />
      } />
      <Route path="/data" element={
        <DataManagement
          key="data"
          exportData={exportData}
          importData={importData}
          exportProgress={exportProgress}
          importProgress={importProgress}
          disabled={isBusy}
        />
      } />
    </Routes>
  );
};

function App() {
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

  // State for SubcollectionModal
  const [isSubcollectionModalOpen, setIsSubcollectionModalOpen] = useState(false)
  const [currentSubcollection, setCurrentSubcollection] = useState(null)

  // State for CollectionModal
  const [isCollectionModalOpen, setIsCollectionModalOpen] = useState(false)
  const [currentCollection, setCurrentCollection] = useState(null)

  // State for ObligationModal
  const [isObligationModalOpen, setIsObligationModalOpen] = useState(false)
  const [currentObligation, setCurrentObligation] = useState(null)

  // State for Bulk Obligation Modal


  // State for PaymentConfirmModal
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false)
  const [obligationToPay, setObligationToPay] = useState(null)

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
    data: false
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
          // For houses, we don't need to load all data at once since we're using pagination
          // Just load areas for the house form
          const areasDataForHouses = await areaAPI.getAll()
          setAreas(areasDataForHouses.data)
          break
        case 'members':
          // For members, we don't need to load all data at once since we're using pagination
          // The Members component will handle its own data loading
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
          // For obligations, we don't need to load all data at once since we're using pagination
          // The Obligations component will handle its own data loading
          const membersDataForObligations = await memberAPI.getAll()
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

  const handleSubmit = async (type) => {
    try {
      if (editing) {
        await updateItem(type, editing.id, formData)
      } else {
        await createItem(type, formData)
      }
      setFormData({})
      setEditing(null)
      // We don't need to reload data for current tab anymore since we're using routing
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
        // For other types, we don't need to reload data since we're using routing
        break
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
        loadDataForTab('dashboard', true);
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

  // Handler functions for collections
  const handleAddCollection = () => {
    setCurrentCollection(null)
    setIsCollectionModalOpen(true)
  }

  const handleEditCollection = (collection) => {
    setCurrentCollection(collection)
    setIsCollectionModalOpen(true)
  }

  const handleCollectionModalClose = () => {
    setIsCollectionModalOpen(false)
    setCurrentCollection(null)
  }

  const handleCollectionSubmit = async (collectionData, initialData) => {
    try {
      let result;
      if (initialData) {
        // Update existing collection
        result = await collectionAPI.update(initialData.id, collectionData)
      } else {
        // Create new collection
        result = await collectionAPI.create(collectionData)
      }

      // Reload collections data
      loadDataForTab('collections', true)

      return result
    } catch (error) {
      console.error('Failed to save collection:', error)
      throw error
    }
  }

  // Handler functions for subcollections
  const handleAddSubcollection = () => {
    setCurrentSubcollection(null)
    setIsSubcollectionModalOpen(true)
  }

  const handleEditSubcollection = (subcollection) => {
    setCurrentSubcollection(subcollection)
    setIsSubcollectionModalOpen(true)
  }

  const handleSubcollectionModalClose = () => {
    setIsSubcollectionModalOpen(false)
    setCurrentSubcollection(null)
  }

  const handleSubcollectionSubmit = async (subcollectionData, selectedMembers, initialData) => {
    try {
      let result;
      if (initialData) {
        // Update existing subcollection
        result = await subcollectionAPI.update(initialData.id, subcollectionData)
      } else {
        // Create new subcollection
        result = await subcollectionAPI.create(subcollectionData)
      }

      // If we have selected members, create obligations for them
      if (selectedMembers && selectedMembers.length > 0) {
        // Create obligations in bulk for better performance
        const obligationsData = selectedMembers.map(memberId => ({
          subcollection: result.data.id,
          member: memberId,
          amount: subcollectionData.amount
        }));

        await obligationAPI.bulkCreate({ obligations: obligationsData });
      }

      // Reload subcollections and obligations data
      loadDataForTab('subcollections', true)
      loadDataForTab('obligations', true)

      return result
    } catch (error) {
      console.error('Failed to save subcollection:', error)
      throw error
    }
  }

  // Handler functions for obligations
  const handleAddObligation = () => {
    setCurrentObligation(null)
    setIsObligationModalOpen(true)
  }

  const handleEditObligation = (obligation) => {
    setCurrentObligation(obligation)
    setIsObligationModalOpen(true)
  }

  const handleObligationModalClose = () => {
    setIsObligationModalOpen(false)
    setCurrentObligation(null)
  }

  const handleObligationSubmit = async (obligationData, initialData) => {
    try {
      let result;
      if (initialData) {
        // Update existing obligation
        result = await obligationAPI.update(initialData.id, obligationData)
      } else {
        // Create new obligation
        result = await obligationAPI.create(obligationData)
      }

      // Reload obligations data
      loadDataForTab('obligations', true)

      return result
    } catch (error) {
      console.error('Failed to save obligation:', error)
      throw error
    }
  }



  // Handler functions for payment confirmation
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

  const handleReload = () => {
    setLoading(true)
    loadDataForTab('obligations', true) // Force reload
    setTimeout(() => setLoading(false), 1000) // Simulate loading
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
  const isTabLoading = tabLoadingStates.dashboard // We only need to check dashboard loading now

  // Disable interactions during export/import
  const isBusy = isExporting || isImporting || loading || isTabLoading

  return (
    <Router>
      <div className={`app theme-${theme}`}>
        <div className="app-layout">
          <Sidebar
            theme={theme}
            setTheme={setTheme}
            areasCount={areas.length}
            housesCount={houses.length}
            membersCount={members.length}
            collectionsCount={collections.length}
            disabled={isBusy}
          />

          <div className="main-content">
            <AppRoutes
              houses={houses}
              areas={areas}
              members={members}
              collections={collections}
              subcollections={subcollections}
              memberObligations={memberObligations}
              setEditing={setEditing}
              deleteItem={deleteItem}
              loadDataForTab={loadDataForTab}
              setSelectedCollection={setSelectedCollection}
              setSelectedSubcollection={setSelectedSubcollection}
              exportData={exportData}
              importData={importData}
              exportProgress={exportProgress}
              importProgress={importProgress}
              isBusy={isBusy}
              setFormData={setFormData}
              formData={formData}
              handleSubmit={handleSubmit}
              isDeleteModalOpen={isDeleteModalOpen}
              setIsDeleteModalOpen={setIsDeleteModalOpen}
              memberToDelete={memberToDelete}
              setMemberToDelete={setMemberToDelete}
              handleDeleteMember={handleDeleteMember}
              handleDeleteModalClose={handleDeleteModalClose}
              confirmDelete={confirmDelete}
              selectedCollection={selectedCollection}
              selectedSubcollection={selectedSubcollection}
              // Subcollection modal props
              isSubcollectionModalOpen={isSubcollectionModalOpen}
              setIsSubcollectionModalOpen={setIsSubcollectionModalOpen}
              currentSubcollection={currentSubcollection}
              handleEditSubcollection={handleEditSubcollection}
              handleSubcollectionModalClose={handleSubcollectionModalClose}
              handleSubcollectionSubmit={handleSubcollectionSubmit}
              handleAddSubcollection={handleAddSubcollection}
              // Collection modal props
              isCollectionModalOpen={isCollectionModalOpen}
              setIsCollectionModalOpen={setIsCollectionModalOpen}
              currentCollection={currentCollection}
              handleEditCollection={handleEditCollection}
              handleCollectionModalClose={handleCollectionModalClose}
              handleCollectionSubmit={handleCollectionSubmit}
              handleAddCollection={handleAddCollection}
              // Obligation modal props
              isObligationModalOpen={isObligationModalOpen}
              setIsObligationModalOpen={setIsObligationModalOpen}
              currentObligation={currentObligation}
              handleEditObligation={handleEditObligation}
              handleObligationModalClose={handleObligationModalClose}
              handleObligationSubmit={handleObligationSubmit}
              handleAddObligation={handleAddObligation}
              // Payment confirmation props
              handlePayObligation={handlePayObligation}

            />

            {editing && editing.type !== 'collections' && editing.type !== 'subcollections' && editing.type !== 'obligations' && (
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

            <SubcollectionModal
              isOpen={isSubcollectionModalOpen}
              onClose={handleSubcollectionModalClose}
              onSubmit={handleSubcollectionSubmit}
              initialData={currentSubcollection}
              selectedCollection={selectedCollection}
              collections={collections}
            />

            <CollectionModal
              isOpen={isCollectionModalOpen}
              onClose={handleCollectionModalClose}
              onSubmit={handleCollectionSubmit}
              initialData={currentCollection}
            />

            <ObligationModal
              isOpen={isObligationModalOpen}
              onClose={handleObligationModalClose}
              onSubmit={handleObligationSubmit}
              initialData={currentObligation}
              selectedSubcollection={selectedSubcollection}
            />



            <PaymentConfirmModal
              isOpen={isPaymentModalOpen}
              onClose={handlePaymentModalClose}
              onConfirm={handlePaymentConfirm}
              obligation={obligationToPay}
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

export default App
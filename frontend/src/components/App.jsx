import { useState, useEffect } from 'react'
import { memberAPI, houseAPI, areaAPI, collectionAPI, subcollectionAPI, obligationAPI, eventAPI } from '../api'
import Sidebar from './Sidebar'
import Dashboard from './Dashboard'
import Areas from './Areas'
import Houses from './Houses'
import Members from './Members'
import Collections from './Collections'
import Subcollections from './Subcollections'
import Obligations from './Obligations'
import DataManagement from './DataManagement'
import EditForm from './EditForm'
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
  const [exportProgress, setExportProgress] = useState(null)
  const [importProgress, setImportProgress] = useState(null)

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

  if (loading) return (
    <div className={`app theme-${theme}`}>
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading data...{retryCount > 0 && ` (Retrying ${retryCount}/3)`}</p>
      </div>
    </div>
  )

  if (error) return (
    <div className={`app theme-${theme}`}>
      <div className="error-container">
        <h2>⚠️ Error Loading Application</h2>
        <p>{error}</p>
        <button onClick={() => window.location.reload()}>Refresh</button>
      </div>
    </div>
  )

  return (
    <div className={`app theme-${theme}`}>
      <div className="app-layout">
        <Sidebar 
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          theme={theme}
          setTheme={setTheme}
          areasCount={areas.length}
          housesCount={houses.length}
          membersCount={members.length}
          collectionsCount={collections.length}
        />
        
        <div className="main-content">
          <header>
            <div className="header-content">
              <h1>🏛️ Mahall Society Management</h1>
            </div>
          </header>
          
          <main>
            {activeTab === 'dashboard' && (
              <Dashboard 
                membersCount={members.length}
                housesCount={houses.length}
                areasCount={areas.length}
                collectionsCount={collections.length}
              />
            )}
            {activeTab === 'areas' && (
              <Areas 
                areas={areas}
                setEditing={setEditing}
                deleteItem={deleteItem}
              />
            )}
            {activeTab === 'houses' && (
              <Houses 
                houses={houses}
                areas={areas}
                setEditing={setEditing}
                deleteItem={deleteItem}
              />
            )}
            {activeTab === 'members' && (
              <Members 
                members={members}
                setEditing={setEditing}
                deleteItem={deleteItem}
              />
            )}
            {activeTab === 'collections' && (
              <Collections 
                collections={collections}
                setEditing={setEditing}
                deleteItem={deleteItem}
                setSelectedCollection={setSelectedCollection}
                setActiveTab={setActiveTab}
              />
            )}
            {activeTab === 'subcollections' && (
              <Subcollections 
                subcollections={subcollections}
                selectedCollection={selectedCollection}
                setEditing={setEditing}
                deleteItem={deleteItem}
                setSelectedSubcollection={setSelectedSubcollection}
                setActiveTab={setActiveTab}
              />
            )}
            {activeTab === 'obligations' && (
              <Obligations 
                memberObligations={memberObligations}
                selectedSubcollection={selectedSubcollection}
                members={members}
                setEditing={setEditing}
                deleteItem={deleteItem}
              />
            )}
            {activeTab === 'data' && (
              <DataManagement 
                exportData={exportData}
                importData={importData}
                exportProgress={exportProgress}
                importProgress={importProgress}
              />
            )}
            {editing && (
              <EditForm
                editing={editing}
                setEditing={setEditing}
                formData={formData}
                setFormData={setFormData}
                handleSubmit={handleSubmit}
              />
            )}
          </main>
        </div>
      </div>
    </div>
  )
}

export default App
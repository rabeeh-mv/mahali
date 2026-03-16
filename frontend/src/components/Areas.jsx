import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { areaAPI } from '../api'
import { FaMapMarkerAlt, FaRedo, FaPlus, FaEdit, FaTrash, FaCloudUploadAlt } from 'react-icons/fa'
import DeleteConfirmModal from './DeleteConfirmModal'

const Areas = ({ areas, setEditing, deleteItem, loadDataForTab }) => {
  const navigate = useNavigate()
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [areaToDelete, setAreaToDelete] = useState(null)
  const [isSyncing, setIsSyncing] = useState(false)
  const [syncStatus, setSyncStatus] = useState('')

  const handleCloudSync = async () => {
    if (!window.confirm("This will delete all existing Area data from the Cloud and upload current local data. Continue?")) return;

    setIsSyncing(true)
    setSyncStatus('Connecting...')
    
    try {
      // 1. Get Firebase Config from Settings
      const { settingsAPI } = await import('../api')
      const settingsRes = await settingsAPI.getAll()
      const settings = settingsRes.data[0]
      
      if (!settings || !settings.firebase_config) {
        throw new Error("Firebase not configured in Settings.")
      }
      
      const firebaseConfig = JSON.parse(settings.firebase_config)

      // 2. Dynamic Import Firebase SDK
      const { initializeApp, getApp, getApps } = await import('firebase/app')
      const { getFirestore, collection, getDocs, deleteDoc, doc, addDoc, serverTimestamp, writeBatch } = await import('firebase/firestore')

      // Initialize (re-use if exists)
      const app = !getApps().length ? initializeApp(firebaseConfig) : getApp()
      const db = getFirestore(app)
      const areasRef = collection(db, 'area_accounts')

      // 3. Wipe Cloud Data
      setSyncStatus('Wiping Cloud...')
      const querySnapshot = await getDocs(areasRef)
      const deletePromises = querySnapshot.docs.map(d => deleteDoc(doc(db, 'area_accounts', d.id)))
      await Promise.all(deletePromises)

      // 4. Upload Local Data
      setSyncStatus(`Uploading ${areas.length} areas...`)
      let uploaded = 0
      for (const area of areas) {
        const newAreaRef = await addDoc(areasRef, {
          name: area.name,
          description: area.description || '',
          headPerson: area.head_person || '',
          password: area.password || '',
          localId: area.id,
          updatedAt: serverTimestamp()
        })
        
        // Update local firebase_id using partial update (PATCH) to avoid 400 validation errors
        await areaAPI.partialUpdate(area.id, { 
          firebase_id: newAreaRef.id,
          sync_pending: false 
        })
        uploaded++
      }

      alert(`Success! Wiped cloud and uploaded ${uploaded} areas.`)
      if (loadDataForTab) loadDataForTab('areas', true)
    } catch (error) {
      console.error("Sync failed:", error)
      alert("Sync Failed: " + error.message)
    } finally {
      setIsSyncing(false)
      setSyncStatus('')
    }
  }

  const handleAddArea = () => {
    navigate('/areas/add')
  }

  const handleEditArea = (area) => {
    navigate(`/areas/edit/${area.id}`)
  }

  const handleDeleteArea = (area) => {
    setAreaToDelete(area)
    setIsDeleteModalOpen(true)
  }

  const confirmDelete = async () => {
    if (areaToDelete) {
      await deleteItem('areas', areaToDelete.id)
      setIsDeleteModalOpen(false)
      setAreaToDelete(null)
      // Reload area data after deletion
      if (loadDataForTab) {
        loadDataForTab('areas', true) // Force reload
      }
    }
  }

  const handleDeleteModalClose = () => {
    setIsDeleteModalOpen(false)
    setAreaToDelete(null)
  }

  const handleReloadData = () => {
    if (loadDataForTab) {
      loadDataForTab('areas', true) // Force reload
    }
  }

  return (
    <div className="data-section">
      <div className="section-header">
        <h2>
          <div className="header-icon-wrapper">
            <FaMapMarkerAlt />
          </div>
          Areas
        </h2>
        <div className="header-actions">
          <button onClick={handleReloadData} className="reload-btn" title="Reload Data" disabled={isSyncing}>
            <FaRedo />
          </button>
          <button 
            onClick={handleCloudSync} 
            className="btn-secondary" 
            title="Wipe & Sync to Cloud" 
            disabled={isSyncing}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: '140px' }}
          >
            <FaCloudUploadAlt /> {isSyncing ? syncStatus : 'Cloud Sync'}
          </button>
          <button onClick={handleAddArea} className="btn-primary" disabled={isSyncing}>
            <FaPlus /> Add New Area
          </button>
        </div>
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Area Name</th>
              <th>Head Person</th>
              <th>Description</th>
              <th className="text-center">Houses</th>
              <th className="text-center">Live Members</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {areas.length > 0 ? (
              areas.map(area => (
                <tr key={area.id}>
                  <td className="font-semibold">{area.name}</td>
                  <td>{area.head_person || 'N/A'}</td>
                  <td className="text-muted">{area.description || 'No description'}</td>
                  <td className="text-center">
                    <span className="badge-outline">{area.total_houses || area.houses?.length || 0}</span>
                  </td>
                  <td className="text-center">
                    <span className="badge-primary">{area.total_live_members || 0}</span>
                  </td>
                  <td className="text-right">
                    <div className="action-btn-group">
                      <button onClick={() => handleEditArea(area)} className="edit-btn" title="Edit Area">
                        <FaEdit /> <span>Edit</span>
                      </button>
                      <button onClick={() => handleDeleteArea(area)} className="delete-btn" title="Delete Area">
                        <FaTrash /> <span>Delete</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="6" className="text-center py-10">
                  <div className="empty-state">
                    <p>No areas found. Create your first area to get started.</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <DeleteConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={handleDeleteModalClose}
        onConfirm={confirmDelete}
        item={areaToDelete}
        itemType="areas"
      />
    </div>
  )
}

export default Areas
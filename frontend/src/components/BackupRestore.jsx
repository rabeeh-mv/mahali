import React, { useState } from 'react';
import React, { useState, useEffect } from 'react';
import { settingsAPI, googleDriveAPI, obligationAPI } from '../api';
import { FaGoogle, FaCheckCircle, FaExclamationTriangle } from 'react-icons/fa';

const BackupRestore = () => {
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [backupStatus, setBackupStatus] = useState('');
  const [restoreStatus, setRestoreStatus] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [googleDriveEnabled, setGoogleDriveEnabled] = useState(false);

  useEffect(() => {
    checkSettings();
  }, []);

  const checkSettings = async () => {
    try {
      const response = await settingsAPI.getAll();
      if (response.data.length > 0) {
        setGoogleDriveEnabled(response.data[0].google_drive_enabled);
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  };

  const handleBackup = async () => {
    setIsBackingUp(true);
    setBackupStatus('Initiating backup...');

    try {
      if (googleDriveEnabled) {
        setBackupStatus('Creating and uploading backup to Google Drive...');
        const response = await googleDriveAPI.uploadBackup();
        setBackupStatus(`Success! Backup uploaded to Google Drive. (File ID: ${response.data.file_id})`);
      } else {
        setBackupStatus('Creating local backup...');
        // For local backup, we trigger the download directly
        const response = await obligationAPI.exportData();

        // Create download link
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', 'mahall_backup.zip');
        document.body.appendChild(link);
        link.click();
        link.remove();

        setBackupStatus('Backup downloaded successfully.');
      }
    } catch (error) {
      console.error('Backup failed:', error);
      setBackupStatus('Backup failed: ' + (error.response?.data?.error || error.message));
    } finally {
      setIsBackingUp(false);
    }
  };

  const handleFileChange = (event) => {
    setSelectedFile(event.target.files[0]);
  };

  const handleRestore = async () => {
    if (!selectedFile) {
      setRestoreStatus('Please select a backup file first.');
      return;
    }

    if (!window.confirm('WARNING: This will overwrite your current database and media files. Are you sure?')) {
      return;
    }

    setIsRestoring(true);
    setRestoreStatus('Uploading and restoring...');

    try {
      const formData = new FormData();
      formData.append('zip_file', selectedFile);

      await obligationAPI.importData(formData);

      setRestoreStatus('Restore completed successfully! Please restart the application.');
    } catch (error) {
      console.error('Restore failed:', error);
      setRestoreStatus('Restore failed: ' + (error.response?.data?.error || error.message));
    } finally {
      setIsRestoring(false);
    }
  };

  return (
    <div className="backup-restore-container">
      <h2>Backup & Restore</h2>

      <div className="backup-section">
        <h3>Create Backup</h3>
        <p>Create a backup of your database and media files.</p>
        <button
          onClick={handleBackup}
          disabled={isBackingUp}
          className="backup-button"
        >
          {isBackingUp ? 'Creating Backup...' : 'Create Backup'}
        </button>
        {backupStatus && <p className="status">{backupStatus}</p>}
      </div>

      <div className="restore-section">
        <h3>Restore from Backup</h3>
        <p>Restore your data from a previously created backup file.</p>
        <input
          type="file"
          accept=".zip"
          onChange={handleFileChange}
          className="file-input"
        />
        <button
          onClick={handleRestore}
          disabled={isRestoring || !selectedFile}
          className="restore-button"
        >
          {isRestoring ? 'Restoring...' : 'Restore'}
        </button>
        {restoreStatus && <p className="status">{restoreStatus}</p>}
      </div>

      <style jsx>{`
        .backup-restore-container {
          padding: 20px;
          max-width: 600px;
          margin: 0 auto;
        }
        
        .backup-section, .restore-section {
          margin-bottom: 30px;
          padding: 20px;
          border: 1px solid #ddd;
          border-radius: 8px;
          background-color: #f9f9f9;
        }
        
        .backup-button, .restore-button {
          background-color: #007bff;
          color: white;
          border: none;
          padding: 10px 20px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 16px;
          margin-top: 10px;
        }
        
        .backup-button:hover, .restore-button:hover {
          background-color: #0056b3;
        }
        
        .backup-button:disabled, .restore-button:disabled {
          background-color: #ccc;
          cursor: not-allowed;
        }
        
        .file-input {
          margin: 10px 0;
          padding: 5px;
        }
        
        .status {
          margin-top: 10px;
          padding: 10px;
          border-radius: 4px;
          background-color: #e9ecef;
        }
      `}</style>
    </div>
  );
};

export default BackupRestore;
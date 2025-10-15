import React from 'react'

const DataManagement = ({ exportData, importData, exportProgress, importProgress }) => {
  return (
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
}

export default DataManagement
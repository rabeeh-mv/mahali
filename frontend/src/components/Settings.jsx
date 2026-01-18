import React, { useState, useEffect } from 'react';
import { settingsAPI, googleDriveAPI } from '../api';
import {
  FaCog,
  FaGoogle,
  FaCloud,
  FaPalette,
  FaDatabase,
  FaNetworkWired,
  FaCheckCircle,
  FaExclamationTriangle,
  FaFileExport,
  FaFileImport,
  FaKey,
  FaSave
} from 'react-icons/fa';
import './Settings.css';

const Settings = ({ exportData, importData, exportProgress, importProgress, disabled }) => {
  // Navigation State
  const [activeTab, setActiveTab] = useState('visual');

  // Core Settings State
  const [appSettings, setAppSettings] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  // Theme State
  const [theme, setTheme] = useState('light');

  // Network State
  const [firebaseConfig, setFirebaseConfig] = useState('');
  const [firebaseEnabled, setFirebaseEnabled] = useState(true);

  // Google Drive State
  const [googleDriveEnabled, setGoogleDriveEnabled] = useState(false);
  const [googleDriveClientId, setGoogleDriveClientId] = useState('');
  const [googleDriveClientSecret, setGoogleDriveClientSecret] = useState('');
  const [googleDriveLoading, setGoogleDriveLoading] = useState(false);
  const [cloudBackups, setCloudBackups] = useState([]);
  const [showBackupList, setShowBackupList] = useState(false);

  // Initialize
  useEffect(() => {
    loadAppSettings();
    checkUrlForAuthCode();
  }, []);

  const loadAppSettings = async () => {
    try {
      setLoading(true);
      const response = await settingsAPI.getAll();

      if (response.data.length > 0) {
        const settings = response.data[0];
        setAppSettings(settings);
        setTheme(settings.theme || 'light');
        setFirebaseEnabled(settings.firebase_enabled !== undefined ? settings.firebase_enabled : true);
        setFirebaseConfig(settings.firebase_config || '');
        setGoogleDriveEnabled(settings.google_drive_enabled || false);
        setGoogleDriveClientId(settings.google_drive_client_id || '');
        setGoogleDriveClientSecret(settings.google_drive_client_secret || '');
      } else {
        // Create defaults if none exist
        const response = await settingsAPI.create({ theme: 'light' });
        setAppSettings(response.data);
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
      showMessage('Failed to load settings.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const checkUrlForAuthCode = () => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    if (code) {
      handleGoogleDriveConnect(code);
    }
  };

  // --- Handlers ---

  const handleGoogleDriveConnect = async (code) => {
    setGoogleDriveLoading(true);
    setActiveTab('network'); // Switch to relevant tab

    try {
      // Clean URL
      window.history.replaceState({}, document.title, window.location.pathname);

      const redirectUri = window.location.origin + window.location.pathname;
      await googleDriveAPI.connect({ code, redirect_uri: redirectUri });

      showMessage('Successfully connected to Google Drive!', 'success');
      setGoogleDriveEnabled(true);
      loadAppSettings(); // Refresh to get updated state
    } catch (error) {
      console.error('Drive connection error:', error);
      showMessage('Failed to connect: ' + (error.response?.data?.error || error.message), 'error');
    } finally {
      setGoogleDriveLoading(false);
    }
  };

  const initGoogleAuth = async () => {
    try {
      if (!googleDriveClientId || !googleDriveClientSecret) {
        showMessage('Please enter Client ID and Client Secret first.', 'error');
        return;
      }

      setGoogleDriveLoading(true);

      // Auto-save settings first to ensure backend has credentials
      if (appSettings) {
        try {
          const payload = {
            ...appSettings,
            google_drive_client_id: googleDriveClientId,
            google_drive_client_secret: googleDriveClientSecret
          };
          await settingsAPI.update(appSettings.id, payload);
        } catch (saveError) {
          console.error('Failed to auto-save credentials:', saveError);
          throw new Error('Could not save credentials. Please try saving manually first.');
        }
      }

      const redirectUri = window.location.origin + window.location.pathname;
      const response = await googleDriveAPI.getAuthUrl(redirectUri);
      if (response.data.auth_url) {
        window.location.href = response.data.auth_url;
      }
    } catch (error) {
      console.error(error);
      showMessage('Failed to initialize auth: ' + (error.response?.data?.error || error.message), 'error');
      setGoogleDriveLoading(false);
    }
  };

  const disconnectDrive = async () => {
    if (!window.confirm('Disconnect Google Drive? Auto-backups will stop.')) return;

    try {
      setGoogleDriveLoading(true);
      await googleDriveAPI.disconnect();
      setGoogleDriveEnabled(false);
      showMessage('Disconnected from Google Drive.', 'success');
      loadAppSettings();
    } catch (error) {
      showMessage('Failed to disconnect: ' + error.message, 'error');
    } finally {
      setGoogleDriveLoading(false);
    }
  };

  const saveSettings = async () => {
    if (!appSettings) return;

    setLoading(true);
    try {
      if (firebaseConfig.trim()) JSON.parse(firebaseConfig); // Validate JSON

      const payload = {
        ...appSettings,
        theme,
        firebase_config: firebaseConfig,
        firebase_enabled: firebaseEnabled,
        google_drive_client_id: googleDriveClientId,
        google_drive_client_secret: googleDriveClientSecret
      };

      const response = await settingsAPI.update(appSettings.id, payload);
      setAppSettings(response.data);

      // Dispatch events for global updates
      window.dispatchEvent(new CustomEvent('settingsUpdated', { detail: response.data }));
      window.parent.dispatchEvent(new CustomEvent('settingsUpdated', { detail: response.data }));

      showMessage('Settings saved successfully!', 'success');
    } catch (error) {
      console.error('Save error:', error);
      if (error instanceof SyntaxError) {
        showMessage('Invalid JSON in Firebase Config', 'error');
      } else {
        showMessage('Failed to save: ' + error.message, 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  const saveTheme = async (newTheme) => {
    setTheme(newTheme);
    // Auto-save when theme is clicked
    if (!appSettings) return;

    try {
      const payload = { ...appSettings, theme: newTheme };
      const response = await settingsAPI.update(appSettings.id, payload);
      setAppSettings(response.data);
      window.dispatchEvent(new CustomEvent('settingsUpdated', { detail: response.data }));
      window.parent.dispatchEvent(new CustomEvent('settingsUpdated', { detail: response.data }));
    } catch (error) {
      console.error('Theme save error:', error);
    }
  };

  const showMessage = (msg, type = 'info') => {
    setMessage({ text: msg, type });
    setTimeout(() => setMessage(''), 5000); // clear after 5s
  };

  // --- Render Components ---

  const renderVisualSettings = () => (
    <div className="settings-card animate-in">
      <div className="settings-header">
        <h3>Theme Preferences</h3>
        <p>Customize the look and feel of your application.</p>
      </div>

      <div className="theme-grid">
        {[
          { id: 'light', name: 'Bright Daylight', icon: '☀️' },
          { id: 'dim', name: 'Midnight Dim', icon: '🌗' },
          { id: 'dark', name: 'Deep Abyss', icon: '🌙' }
        ].map(t => (
          <div
            key={t.id}
            className={`theme-card ${theme === t.id ? 'active' : ''}`}
            onClick={() => saveTheme(t.id)}
          >
            <span className="theme-icon">{t.icon}</span>
            <span className="theme-name">{t.name}</span>
          </div>
        ))}
      </div>
    </div>
  );

  const renderDataSettings = () => (
    <div className="settings-content animate-in">
      <div className="settings-card">
        <div className="settings-header">
          <h3>Backup & Restore</h3>
          <p>Manage your application data securely.</p>
        </div>

        <div className="data-actions-grid" style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px' }}>

          {/* Export */}
          <div className="action-row" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', background: 'var(--bg-secondary)', borderRadius: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><FaFileExport /></div>
              <div>
                <strong style={{ display: 'block' }}>Export System Data</strong>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Download a .zip archive of all database and media files.</span>
              </div>
            </div>
            <button
              onClick={exportData}
              disabled={disabled}
              className="btn-secondary"
            >
              {disabled ? 'Processing...' : 'Export Now'}
            </button>
          </div>

          {exportProgress && (
            <div className={`status-banner ${exportProgress.status === 'completed' ? 'success' : ''}`}>
              <p>{exportProgress.message} {exportProgress.progress}%</p>
              <div className="progress-bar-sm"><div className="progress-fill" style={{ width: `${exportProgress.progress}%` }}></div></div>
            </div>
          )}

          {/* Import */}
          <div className="action-row" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', background: 'var(--bg-secondary)', borderRadius: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><FaFileImport /></div>
              <div>
                <strong style={{ display: 'block' }}>Import System Data</strong>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Restore from a backup. Warning: Overwrites current data.</span>
              </div>
            </div>
            <label className="btn-secondary" style={{ cursor: disabled ? 'not-allowed' : 'pointer' }}>
              {disabled ? 'Restoring...' : 'Select File'}
              <input type="file" accept=".zip" onChange={importData} disabled={disabled} style={{ display: 'none' }} />
            </label>
          </div>

          {importProgress && (
            <div className={`status-banner ${importProgress.status === 'completed' ? 'success' : ''}`}>
              <p>{importProgress.message} {importProgress.progress}%</p>
              <div className="progress-bar-sm"><div className="progress-fill" style={{ width: `${importProgress.progress}%` }}></div></div>
            </div>
          )}

        </div>
      </div>
    </div>
  );

  const handleDriveBackup = async () => {
    if (!googleDriveEnabled) return;

    setGoogleDriveLoading(true);
    try {
      showMessage('Starting backup to Google Drive...', 'info');
      const response = await googleDriveAPI.uploadBackup();
      showMessage(`Backup successful! File ID: ${response.data.file_id}`, 'success');

      // Update last backup time locally
      setAppSettings(prev => ({
        ...prev,
        last_backup_at: new Date().toISOString()
      }));
    } catch (error) {
      console.error('Backup failed:', error);
      showMessage('Backup failed: ' + (error.response?.data?.error || error.message), 'error');
    } finally {
      setGoogleDriveLoading(false);
    }
  };

  const renderNetworkSettings = () => (
    <div className="settings-content animate-in">

      {/* Firebase Section */}
      <div className="settings-card">
        <div className="settings-header">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h3>Firebase Integration</h3>
              <p>Configure real-time cloud synchronization.</p>
            </div>
            <label className="switch">
              <input
                type="checkbox"
                checked={firebaseEnabled}
                onChange={(e) => setFirebaseEnabled(e.target.checked)}
              />
              <span className="slider"></span>
            </label>
          </div>
        </div>

        <div className="input-group">
          <label className="input-label">Configuration JSON</label>
          <textarea
            className="settings-textarea"
            value={firebaseConfig}
            onChange={(e) => setFirebaseConfig(e.target.value)}
            placeholder='{ "apiKey": "...", "projectId": "..." }'
            disabled={loading}
          />
        </div>
      </div>

      {/* Google Drive Section */}
      <div className="settings-card">
        <div className="settings-header">
          <h3>Google Drive Backup</h3>
          <p>Automated cloud backups for disaster recovery.</p>
        </div>

        {/* Status Card */}
        <div className="connection-status">
          <div className="status-icon-wrapper" style={{ background: googleDriveEnabled ? 'rgba(34, 197, 94, 0.1)' : 'rgba(107, 114, 128, 0.1)', color: googleDriveEnabled ? '#22c55e' : '#6b7280' }}>
            <FaCloud />
          </div>
          <div>
            <strong style={{ display: 'block', fontSize: '1.05rem' }}>
              {googleDriveEnabled ? 'Connected to Google Drive' : 'Not Connected'}
            </strong>
            <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
              {googleDriveEnabled
                ? `Last backup: ${appSettings?.last_backup_at ? new Date(appSettings.last_backup_at).toLocaleString() : 'Never'}`
                : 'Connect to enable automatic uploads.'}
            </span>
          </div>
          {googleDriveEnabled && <FaCheckCircle className="status-check" />}
        </div>

        {/* Credentials Form (Only if not connected or editing) */}
        {!googleDriveEnabled && (
          <div className="card-section">
            <div className="section-title"><FaKey /> API Credentials</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              <div className="input-group">
                <label className="input-label">Client ID</label>
                <input
                  type="text"
                  className="settings-input"
                  value={googleDriveClientId}
                  onChange={(e) => setGoogleDriveClientId(e.target.value)}
                  placeholder="apps.googleusercontent.com"
                />
              </div>
              <div className="input-group">
                <label className="input-label">Client Secret</label>
                <input
                  type="password"
                  className="settings-input"
                  value={googleDriveClientSecret}
                  onChange={(e) => setGoogleDriveClientSecret(e.target.value)}
                  placeholder="Secret key"
                />
              </div>
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '-10px', marginBottom: '16px' }}>
              Required to authorize the application. Get these from Google Cloud Console.
            </p>
          </div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
          {googleDriveEnabled ? (
            <>
              <button
                className="btn-save"
                onClick={handleDriveBackup}
                disabled={googleDriveLoading}
                style={{ background: '#22c55e' }} // Green
              >
                <FaCloud /> {googleDriveLoading ? 'Backing up...' : 'Backup Now'}
              </button>

              <button
                className="btn-secondary"
                onClick={disconnectDrive}
                disabled={googleDriveLoading}
                style={{ color: '#ef4444', borderColor: '#ef4444' }}
              >
                {googleDriveLoading ? '...' : 'Disconnect'}
              </button>

              <div style={{ width: '100%', marginTop: '16px', borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
                <h4 style={{ fontSize: '0.95rem', marginBottom: '12px' }}>Cloud Recovery</h4>
                <button
                  className="btn-secondary"
                  onClick={async () => {
                    setGoogleDriveLoading(true);
                    try {
                      const res = await googleDriveAPI.listBackups();
                      setCloudBackups(res.data);
                      setShowBackupList(true);
                    } catch (err) {
                      showMessage('Failed to list backups: ' + err.message, 'error');
                    } finally {
                      setGoogleDriveLoading(false);
                    }
                  }}
                  disabled={googleDriveLoading}
                >
                  <FaFileImport /> Restore from Cloud
                </button>
              </div>

              {/* Cloud Backup List Modal (Simple inline for now) */}
              {showBackupList && (
                <div style={{ marginTop: '16px', background: 'var(--bg-tertiary)', padding: '12px', borderRadius: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <strong>Available Backups</strong>
                    <button onClick={() => setShowBackupList(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>✖</button>
                  </div>
                  {cloudBackups.length === 0 ? (
                    <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>No backups found.</p>
                  ) : (
                    <ul style={{ listStyle: 'none', padding: 0, maxHeight: '200px', overflowY: 'auto' }}>
                      {cloudBackups.map(file => (
                        <li key={file.id} style={{ padding: '8px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <div style={{ fontSize: '0.9rem', fontWeight: '500' }}>{file.name}</div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{new Date(file.createdTime).toLocaleString()}</div>
                          </div>
                          <button
                            className="btn-save"
                            style={{ padding: '4px 12px', fontSize: '0.8rem' }}
                            onClick={async () => {
                              if (!window.confirm(`Restore from ${file.name}? Current data will be overwritten.`)) return;
                              setGoogleDriveLoading(true);
                              try {
                                showMessage('Restoring... This may take a minute.', 'info');
                                await googleDriveAPI.restore(file.id);
                                showMessage('Restore complete! Reloading...', 'success');
                                setTimeout(() => window.location.reload(), 2000);
                              } catch (err) {
                                showMessage('Restore failed: ' + err.message, 'error');
                                setGoogleDriveLoading(false);
                              }
                            }}
                          >
                            Restore
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

            </>
          ) : (
            <button
              className="btn-save"
              onClick={initGoogleAuth}
              disabled={googleDriveLoading || !googleDriveClientId || !googleDriveClientSecret}
              style={{ background: '#4285F4' }} // Google Blue
            >
              <FaGoogle /> {googleDriveLoading ? 'Connecting...' : 'Connect Drive'}
            </button>
          )}
        </div>
      </div>

      {/* Global Save Button for Network Tab */}
      <div style={{ textAlign: 'right', marginTop: '16px' }}>
        <button className="btn-save" onClick={saveSettings} disabled={loading}>
          <FaSave /> {loading ? 'Saving...' : 'Save Configuration'}
        </button>
      </div>

    </div>
  );

  return (
    <div className="settings-container">
      {/* Sidebar */}
      <div className="settings-sidebar">
        <h2><FaCog /> Settings</h2>
        <nav className="sidebar-nav">
          <button
            className={`nav-item ${activeTab === 'visual' ? 'active' : ''}`}
            onClick={() => setActiveTab('visual')}
          >
            <FaPalette /> Visual Appearance
          </button>
          <button
            className={`nav-item ${activeTab === 'data' ? 'active' : ''}`}
            onClick={() => setActiveTab('data')}
          >
            <FaDatabase /> Data Management
          </button>
          <button
            className={`nav-item ${activeTab === 'network' ? 'active' : ''}`}
            onClick={() => setActiveTab('network')}
          >
            <FaNetworkWired /> Network Integration
          </button>
        </nav>

        {/* Global Message Banner if active */}
        {message && (
          <div className={`message ${message.type || ''}`} style={{ marginTop: '24px', fontSize: '0.9rem', padding: '12px' }}>
            {message.type === 'success' ? <FaCheckCircle /> : <FaExclamationTriangle />}
            {message.text || message}
          </div>
        )}
      </div>

      {/* Main Content Area */}
      <main className="settings-content-area">
        {activeTab === 'visual' && renderVisualSettings()}
        {activeTab === 'data' && renderDataSettings()}
        {activeTab === 'network' && renderNetworkSettings()}
      </main>
    </div>
  );
};

export default Settings;
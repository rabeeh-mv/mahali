import React, { useState, useEffect } from 'react';
import { settingsAPI } from '../api';
import { FaCog } from 'react-icons/fa';
import './Settings.css';

const Settings = ({ exportData, importData, exportProgress, importProgress, disabled }) => {
  const [firebaseConfig, setFirebaseConfig] = useState('');
  const [appSettings, setAppSettings] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [theme, setTheme] = useState('light');
  const [activeTab, setActiveTab] = useState('visual'); // 'visual', 'data', 'network'

  // Load app settings
  const loadAppSettings = async () => {
    try {
      const response = await settingsAPI.getAll();
      if (response.data.length > 0) {
        const settings = response.data[0];
        setAppSettings(settings);
        setTheme(settings.theme || 'light');
        if (settings.firebase_config) {
          setFirebaseConfig(settings.firebase_config);
        }
      } else {
        // Create default settings
        const response = await settingsAPI.create({ theme: 'light', firebase_config: '' });
        setAppSettings(response.data);
      }
    } catch (error) {
      console.error('Failed to load app settings:', error);
    }
  };

  useEffect(() => {
    loadAppSettings();
  }, []);

  // Save Firebase configuration
  const saveFirebaseConfig = async () => {
    if (!appSettings) {
      setMessage('App settings not loaded');
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      // Validate JSON if not empty
      if (firebaseConfig.trim()) {
        JSON.parse(firebaseConfig);
      }

      console.log('Sending settings update:', {
        ...appSettings,
        firebase_config: firebaseConfig
      });

      const response = await settingsAPI.update(appSettings.id, {
        ...appSettings,
        firebase_config: firebaseConfig
      });

      console.log('Settings update response:', response);
      setAppSettings(response.data);
      setMessage('Settings saved successfully!');

      // Dispatch a custom event to notify other components about the settings update
      window.dispatchEvent(new CustomEvent('settingsUpdated', { detail: response.data }));

      // Also update the parent window's settings if needed
      window.parent.dispatchEvent(new CustomEvent('settingsUpdated', { detail: response.data }));
    } catch (error) {
      console.error('Failed to save Firebase config:', error);
      if (error instanceof SyntaxError) {
        setMessage('Invalid JSON format. Please check your Firebase configuration.');
      } else {
        setMessage('Failed to save settings: ' + error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  // Save theme setting
  const saveThemeSetting = async (newTheme) => {
    try {
      let updatedSettings;
      if (appSettings) {
        // Update existing settings
        const response = await settingsAPI.update(appSettings.id, {
          ...appSettings,
          theme: newTheme
        });
        updatedSettings = response.data;
      } else {
        // Create new settings
        const response = await settingsAPI.create({ theme: newTheme, firebase_config: firebaseConfig });
        updatedSettings = response.data;
      }
      setAppSettings(updatedSettings);
      setTheme(newTheme);
      setMessage('Theme updated successfully!');

      // Dispatch a custom event to notify other components about the settings update
      window.dispatchEvent(new CustomEvent('settingsUpdated', { detail: updatedSettings }));
      window.parent.dispatchEvent(new CustomEvent('settingsUpdated', { detail: updatedSettings }));
    } catch (error) {
      console.error('Failed to save theme setting:', error);
      setMessage('Failed to update theme: ' + error.message);
    }
  };

  return (
    <div className="data-section animate-in">
      <div className="section-header">
        <h2>
          <div className="header-icon-wrapper">
            <FaCog />
          </div>
          Settings
        </h2>
      </div>

      {/* Tab Navigation */}
      <div className="tab-navigation" style={{ marginBottom: '32px', display: 'flex', gap: '8px', padding: '4px', background: 'var(--header-bg)', borderRadius: '12px', width: 'fit-content' }}>
        <button
          className={`btn-secondary ${activeTab === 'visual' ? 'active' : ''}`}
          onClick={() => setActiveTab('visual')}
          style={{ border: 'none', background: activeTab === 'visual' ? 'var(--primary)' : 'transparent', color: activeTab === 'visual' ? 'white' : 'var(--text-muted)' }}
        >
          Visual Appearance
        </button>
        <button
          className={`btn-secondary ${activeTab === 'data' ? 'active' : ''}`}
          onClick={() => setActiveTab('data')}
          style={{ border: 'none', background: activeTab === 'data' ? 'var(--primary)' : 'transparent', color: activeTab === 'data' ? 'white' : 'var(--text-muted)' }}
        >
          Data Core
        </button>
        <button
          className={`btn-secondary ${activeTab === 'network' ? 'active' : ''}`}
          onClick={() => setActiveTab('network')}
          style={{ border: 'none', background: activeTab === 'network' ? 'var(--primary)' : 'transparent', color: activeTab === 'network' ? 'white' : 'var(--text-muted)' }}
        >
          Network Integration
        </button>
      </div>

      {/* Visual Settings Tab */}
      {activeTab === 'visual' && (
        <div className="data-action-card" style={{ padding: '32px' }}>
          <h3 className="font-semibold" style={{ fontSize: '1.2rem', marginBottom: '20px' }}>
            Theme Preferences
          </h3>
          <p className="text-muted" style={{ marginBottom: '24px' }}>Choose the theme that best fits your environment.</p>
          <div className="theme-options" style={{ display: 'flex', gap: '16px' }}>
            <button
              className={`btn-secondary ${theme === 'light' ? 'active-theme' : ''}`}
              onClick={() => saveThemeSetting('light')}
              style={{ flex: 1, padding: '16px', borderRadius: '16px', background: theme === 'light' ? 'var(--primary)' : '', color: theme === 'light' ? 'white' : '' }}
            >
              ☀️ Bright Daylight
            </button>
            <button
              className={`btn-secondary ${theme === 'dim' ? 'active-theme' : ''}`}
              onClick={() => saveThemeSetting('dim')}
              style={{ flex: 1, padding: '16px', borderRadius: '16px', background: theme === 'dim' ? 'var(--primary)' : '', color: theme === 'dim' ? 'white' : '' }}
            >
              🌗 Midnight Dim
            </button>
            <button
              className={`btn-secondary ${theme === 'dark' ? 'active-theme' : ''}`}
              onClick={() => saveThemeSetting('dark')}
              style={{ flex: 1, padding: '16px', borderRadius: '16px', background: theme === 'dark' ? 'var(--primary)' : '', color: theme === 'dark' ? 'white' : '' }}
            >
              🌙 Deep Abyss
            </button>
          </div>
        </div>
      )}

      {/* Data Core Tab (Import/Export) */}
      {activeTab === 'data' && (
        <div className="data-management-content" style={{ display: 'flex', gap: '20px', flexDirection: 'column' }}>
          {/* Export Section */}
          <div className="data-action-card" style={{ padding: '32px', textAlign: 'center' }}>
            <h3 className="font-semibold" style={{ fontSize: '1.2rem', marginBottom: '12px' }}>Backup System State</h3>
            <p className="text-muted" style={{ marginBottom: '24px', maxWidth: '400px', margin: '0 auto 24px' }}>Create a secure, compressed archive of all your regional data, financial vaults, and member directories.</p>
            <button
              onClick={exportData}
              className="btn-primary"
              style={{ padding: '12px 48px' }}
              disabled={disabled}
            >
              {disabled ? 'Processing...' : 'Generate Archive'}
            </button>

            {/* Export Progress */}
            {exportProgress && (
              <div className={`status-banner ${exportProgress.status === 'completed' ? 'success' : ''}`} style={{ marginTop: '32px', maxWidth: '500px', margin: '32px auto 0' }}>
                {exportProgress.status === 'completed' ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', justifyContent: 'center' }}>
                    <span>✅</span>
                    <span>System backup successfully exported.</span>
                  </div>
                ) : (
                  <div style={{ width: '100%' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span>{exportProgress.message}</span>
                      <span>{exportProgress.progress}%</span>
                    </div>
                    <div className="progress-bar" style={{ height: '8px', background: 'var(--header-bg)', borderRadius: '4px', overflow: 'hidden' }}>
                      <div
                        className="progress-fill"
                        style={{ width: `${exportProgress.progress}%`, height: '100%', background: 'var(--primary)', transition: 'width 0.3s ease' }}
                      ></div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Import Section */}
          <div className="data-action-card" style={{ padding: '32px', textAlign: 'center' }}>
            <h3 className="font-semibold" style={{ fontSize: '1.2rem', marginBottom: '12px' }}>Restore System State</h3>
            <p className="text-muted" style={{ marginBottom: '24px', maxWidth: '400px', margin: '0 auto 24px' }}>Upload a previously generated archive to restore the application state. <strong style={{ color: 'var(--error)' }}>Warning: This will overwrite current data.</strong></p>

            <label className={`btn-primary ${disabled ? 'disabled' : ''}`} style={{ display: 'inline-block', padding: '12px 48px', cursor: 'pointer' }}>
              {disabled ? 'Restoring...' : 'Select & Restore Archive'}
              <input
                type="file"
                accept=".zip"
                onChange={importData}
                disabled={disabled}
                style={{ display: 'none' }}
              />
            </label>

            {/* Import Progress */}
            {importProgress && (
              <div className={`status-banner ${importProgress.status === 'completed' ? 'success' : ''}`} style={{ marginTop: '32px', maxWidth: '500px', margin: '32px auto 0' }}>
                {importProgress.status === 'completed' ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', justifyContent: 'center' }}>
                    <span>✅</span>
                    <span>System state restored successfully.</span>
                  </div>
                ) : (
                  <div style={{ width: '100%' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span>{importProgress.message}</span>
                      <span>{importProgress.progress}%</span>
                    </div>
                    <div className="progress-bar" style={{ height: '8px', background: 'var(--header-bg)', borderRadius: '4px', overflow: 'hidden' }}>
                      <div
                        className="progress-fill"
                        style={{ width: `${importProgress.progress}%`, height: '100%', background: 'var(--primary)', transition: 'width 0.3s ease' }}
                      ></div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Network Integration Tab */}
      {activeTab === 'network' && (
        <div className="data-action-card" style={{ padding: '32px' }}>
          <h3 className="font-semibold" style={{ fontSize: '1.2rem', marginBottom: '20px' }}>
            Firebase Configuration
          </h3>
          <p className="text-muted" style={{ marginBottom: '24px' }}>Bridge the application with external cloud services via Firebase.</p>

          <div className="form-group">
            <label style={{ marginBottom: '12px', display: 'block' }}>Firebase Configuration Payload (JSON)</label>
            <div className="input-wrapper">
              <textarea
                value={firebaseConfig}
                onChange={(e) => setFirebaseConfig(e.target.value)}
                placeholder='{ "apiKey": "...", "projectId": "..." }'
                rows={8}
                className="search-input"
                style={{ fontFamily: 'monospace', fontSize: '13px' }}
                disabled={loading}
              />
            </div>

            <button
              onClick={saveFirebaseConfig}
              className="btn-primary"
              style={{ marginTop: '24px' }}
              disabled={loading}
            >
              {loading ? 'Securing...' : 'Verify & Synchronize'}
            </button>

            {message && (
              <div className={`status-banner ${message.includes('success') ? 'success' : 'error'}`} style={{ marginTop: '24px' }}>
                <div className="status-icon">{message.includes('success') ? '✅' : '⚠️'}</div>
                <p>{message}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;
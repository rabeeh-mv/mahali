import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  FaHome,
  FaMapMarkerAlt,
  FaHouseUser,
  FaUsers,
  FaFolder,
  FaHistory, // added icon
  FaFire, // Firebase icon
  FaCog, // Settings icon
  FaSun,
  FaMoon,
  FaAdjust,
  FaChevronLeft,
  FaChevronRight,
  FaArrowRight,
  FaArrowLeft
} from 'react-icons/fa';
import { settingsAPI } from '../api';

const Sidebar = ({
  theme,
  setTheme,
  areasCount,
  housesCount,
  membersCount,
  collectionsCount,
  disabled
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [appSettings, setAppSettings] = useState(null);
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    loadAppSettings();

    // Listen for settings updates from other components
    const handleSettingsUpdate = (event) => {
      console.log('Sidebar: Settings updated:', event.detail);
      setAppSettings(event.detail);
      setTheme(event.detail.theme);
    };

    window.addEventListener('settingsUpdated', handleSettingsUpdate);

    // Cleanup listener on component unmount
    return () => {
      window.removeEventListener('settingsUpdated', handleSettingsUpdate);
    };
  }, []);

  const loadAppSettings = async () => {
    try {
      const response = await settingsAPI.getAll();
      console.log('Sidebar: Loaded settings:', response.data);
      if (response.data.length > 0) {
        const settings = response.data[0];
        console.log('Sidebar: Setting app settings:', settings);
        setAppSettings(settings);
        setTheme(settings.theme); // This should update the parent component's state
      } else {
        // If no settings exist, create default settings
        const response = await settingsAPI.create({ theme: 'light' });
        setAppSettings(response.data);
        setTheme('light');
      }
    } catch (error) {
      console.error('Failed to load app settings:', error);
      // Set default theme if loading fails
      setTheme('light');
    }
  };

  const saveThemeSetting = async (newTheme) => {
    try {
      let updatedSettings;
      if (appSettings) {
        // Update existing settings
        const response = await settingsAPI.update(appSettings.id, { theme: newTheme });
        updatedSettings = response.data;
      } else {
        // Create new settings
        const response = await settingsAPI.create({ theme: newTheme });
        updatedSettings = response.data;
      }
      setAppSettings(updatedSettings);
      setTheme(newTheme); // Update parent component's state

      // Dispatch a custom event to notify other components about the settings update
      window.dispatchEvent(new CustomEvent('settingsUpdated', { detail: updatedSettings }));
    } catch (error) {
      console.error('Failed to save theme setting:', error);
    }
  };

  const handleThemeChange = (newTheme) => {
    saveThemeSetting(newTheme);
  };

  const getActiveTab = () => {
    if (location.pathname === '/' || location.pathname === '/dashboard') return 'dashboard';
    if (location.pathname.startsWith('/areas')) return 'areas';
    if (location.pathname.startsWith('/houses')) return 'houses';
    if (location.pathname.startsWith('/member-request')) return 'member-request';
    if (location.pathname.startsWith('/members')) return 'members';
    if (location.pathname.startsWith('/collections')) return 'collections';
    if (location.pathname.startsWith('/subcollections')) return 'subcollections';
    if (location.pathname.startsWith('/obligations')) return 'obligations';
    if (location.pathname.startsWith('/my-actions')) return 'my-actions';

    if (location.pathname.startsWith('/settings')) return 'settings';
    return 'dashboard';
  };

  const handleTabChange = (tab) => {
    switch (tab) {
      case 'dashboard':
        navigate('/dashboard');
        break;
      case 'areas':
        navigate('/areas');
        break;
      case 'houses':
        navigate('/houses');
        break;
      case 'member-request':
        navigate('/member-request');
        break;
      case 'members':
        navigate('/members');
        break;
      case 'collections':
        navigate('/collections');
        break;
      case 'subcollections':
        navigate('/subcollections');
        break;
      case 'obligations':
        navigate('/obligations');
        break;
      case 'my-actions':
        navigate('/my-actions');
        break;

      case 'settings':
        navigate('/settings');
        break;
      default:
        navigate('/dashboard');
    }
  };

  const activeTab = getActiveTab();

  // Check if Firebase is configured
  const isFirebaseConfigured = appSettings && appSettings.firebase_config && appSettings.firebase_config.trim() !== '';
  console.log('Sidebar: appSettings:', appSettings);
  console.log('Sidebar: isFirebaseConfigured:', isFirebaseConfigured);

  const toggleSidebar = () => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    console.log('Sidebar collapsed state:', newState);
  };

  return (
    <aside className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-header">
        <div className="logo-container">
          <div className="logo-icon-wrapper">
            <img src="/logo.png" alt="" className="logo-icon" />
          </div>
          {!isCollapsed && <h2>Mahal<span>i</span></h2>}
        </div>
        <button
          className="collapse-toggle"
          onClick={() => setIsCollapsed(!isCollapsed)}
          title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
        >
          {isCollapsed ? <FaChevronRight className='arrow-btn' /> : <FaChevronLeft className='arrow-btn' />}
        </button>
      </div>

      <nav className="sidebar-nav">
        <button
          className={activeTab === 'dashboard' ? 'active' : ''}
          onClick={() => handleTabChange('dashboard')}
          disabled={disabled}
        >
          <FaHome className="tab-icon" />
          {!isCollapsed && <span>Overview</span>}
        </button>
        <button
          className={activeTab === 'areas' ? 'active' : ''}
          onClick={() => handleTabChange('areas')}
          disabled={disabled}
        >
          <FaMapMarkerAlt className="tab-icon" />
          {!isCollapsed && <span>Regional Areas</span>}
        </button>
        <button
          className={activeTab === 'houses' ? 'active' : ''}
          onClick={() => handleTabChange('houses')}
          disabled={disabled}
        >
          <FaHouseUser className="tab-icon" />
          {!isCollapsed && <span>House Units</span>}
        </button>

        {isFirebaseConfigured && (
          <button
            className={activeTab === 'member-request' ? 'active' : ''}
            onClick={() => handleTabChange('member-request')}
            disabled={disabled}
          >
            <FaFire className="tab-icon pulse" style={{ color: '#ff4b2b' }} />
            {!isCollapsed && <span>Digital Requests</span>}
          </button>
        )}

        {isFirebaseConfigured && (
          <button
            className={activeTab === 'my-actions' ? 'active' : ''}
            onClick={() => handleTabChange('my-actions')}
            disabled={disabled}
          >
            <FaHistory className="tab-icon" style={{ color: '#2563eb' }} />
            {!isCollapsed && <span>My Actions</span>}
          </button>
        )}


        <button
          className={activeTab === 'members' ? 'active' : ''}
          onClick={() => handleTabChange('members')}
          disabled={disabled}
        >
          <FaUsers className="tab-icon" />
          {!isCollapsed && <span>Member Directory</span>}
        </button>

        <button
          className={activeTab === 'collections' ? 'active' : ''}
          onClick={() => handleTabChange('collections')}
          disabled={disabled}
        >
          <FaFolder className="tab-icon" />
          {!isCollapsed && <span>Financial Vaults</span>}
        </button>

        <div className="sidebar-divider"></div>



        <button
          className={activeTab === 'settings' ? 'active' : ''}
          onClick={() => handleTabChange('settings')}
          disabled={disabled}
        >
          <FaCog className="tab-icon" />
          {!isCollapsed && <span>Environment</span>}
        </button>
      </nav>

      {!isCollapsed && (
        <div className="sidebar-footer">
          <div className="theme-compact-selector">
            <button
              className={theme === 'light' ? 'active' : ''}
              onClick={() => handleThemeChange('light')}
              title="Sleek Light"
              disabled={disabled}
            >
              <FaSun />
            </button>
            <button
              className={theme === 'dim' ? 'active' : ''}
              onClick={() => handleThemeChange('dim')}
              title="Relaxing Dim"
              disabled={disabled}
            >
              <FaAdjust />
            </button>
            <button
              className={theme === 'dark' ? 'active' : ''}
              onClick={() => handleThemeChange('dark')}
              title="Premium Dark"
              disabled={disabled}
            >
              <FaMoon />
            </button>
          </div>
        </div>
      )}
    </aside>
  );
};

export default Sidebar;
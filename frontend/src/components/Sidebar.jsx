import React from 'react'

const Sidebar = ({ 
  activeTab, 
  setActiveTab, 
  theme, 
  setTheme, 
  areasCount, 
  housesCount, 
  membersCount, 
  collectionsCount 
}) => {
  return (
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
          📍 Areas ({areasCount})
        </button>
        <button 
          className={activeTab === 'houses' ? 'active' : ''}
          onClick={() => setActiveTab('houses')}
        >
          🏘️ Houses ({housesCount})
        </button>
        <button 
          className={activeTab === 'members' ? 'active' : ''}
          onClick={() => setActiveTab('members')}
        >
          👥 Members ({membersCount})
        </button>
        <button 
          className={activeTab === 'collections' ? 'active' : ''}
          onClick={() => setActiveTab('collections')}
        >
          📂 Collections ({collectionsCount})
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
  )
}

export default Sidebar
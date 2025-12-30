import React, { useState, useEffect } from 'react';
import { settingsAPI } from '../api';
import './FirebaseData.css';

const FirebaseData = () => {
  const [firebaseConfig, setFirebaseConfig] = useState(null);
  const [firebaseData, setFirebaseData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [appSettings, setAppSettings] = useState(null);

  useEffect(() => {
    loadAppSettings();
    
    // Listen for settings updates from other components
    const handleSettingsUpdate = (event) => {
      console.log('FirebaseData: Settings updated:', event.detail);
      setAppSettings(event.detail);
      if (event.detail.firebase_config && event.detail.firebase_config.trim() !== '') {
        try {
          setFirebaseConfig(JSON.parse(event.detail.firebase_config));
        } catch (e) {
          console.error('Failed to parse Firebase config:', e);
          setFirebaseConfig(null);
        }
      } else {
        setFirebaseConfig(null);
      }
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
      if (response.data.length > 0) {
        const settings = response.data[0];
        console.log('FirebaseData: Loaded settings:', settings);
        setAppSettings(settings);
        if (settings.firebase_config && settings.firebase_config.trim() !== '') {
          setFirebaseConfig(JSON.parse(settings.firebase_config));
        }
      }
    } catch (error) {
      console.error('Failed to load app settings:', error);
    }
  };

  const loadFirebaseData = async () => {
    if (!firebaseConfig) {
      setError('Firebase is not configured');
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      // Dynamically import Firebase SDKs only when needed
      const { initializeApp } = await import('firebase/app');
      const { getFirestore, collection, getDocs } = await import('firebase/firestore');
      
      // Initialize Firebase
      const app = initializeApp(firebaseConfig);
      const db = getFirestore(app);
      
      // Fetch data from 'families' collection
      const querySnapshot = await getDocs(collection(db, 'families'));
      const dataList = [];
      querySnapshot.forEach((doc) => {
        dataList.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      setFirebaseData(dataList);
    } catch (err) {
      console.error('Error fetching Firebase data:', err);
      setError('Failed to fetch data from Firebase: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (firebaseConfig) {
      loadFirebaseData();
    }
  }, [firebaseConfig]);

  const renderData = () => {
    if (loading) {
      return <div className="loading">Loading Firebase data...</div>;
    }

    if (error) {
      return <div className="error">Error: {error}</div>;
    }

    if (firebaseData.length === 0) {
      return <div className="no-data">No data found in Firebase collection</div>;
    }

    // Get all unique keys for table headers and normalize them to avoid visual duplication
    const allKeys = new Set();
    firebaseData.forEach(item => {
      Object.keys(item).forEach(key => allKeys.add(key));
    });
    
    // Convert Set to Array to maintain consistent order
    const keysArray = Array.from(allKeys);
    
    // Function to normalize key for display
    const normalizeKey = (key) => {
      return key
        .replace(/([A-Z])/g, ' $1') // Add space before capital letters
        .replace(/^./, str => str.toUpperCase()) // Capitalize first letter
        .trim();
    };

    return (
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              {keysArray.map(key => (
                <th key={key} title={`Original field name: ${key}`}>
                  {normalizeKey(key)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {firebaseData.map((item, index) => (
              <tr key={item.id || index}>
                {keysArray.map(key => (
                  <td key={`${key}-${index}`}>
                    {typeof item[key] === 'object' ? JSON.stringify(item[key]) : String(item[key] || '')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="firebase-data-section">
      <h2>🔥 Member Requests</h2>
      {firebaseConfig ? (
        <>
          <div className="firebase-header">
            <h3>Families Collection Data</h3>
            <button onClick={loadFirebaseData} disabled={loading} className="export-btn">
              {loading ? 'Refreshing...' : 'Refresh Data'}
            </button>
          </div>
          {renderData()}
        </>
      ) : (
        <div className="no-firebase-config">
          <p>Firebase is not configured. Please add Firebase configuration in Settings.</p>
        </div>
      )}
    </div>
  );
};

export default FirebaseData;
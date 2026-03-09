import React, { useState, useEffect } from 'react';
import { pendingSyncsAPI, settingsAPI, houseAPI, memberAPI, obligationAPI, subcollectionAPI, api } from '../api';
import './MyActions.css';
import { FaHistory, FaCloudUploadAlt, FaCheck, FaTrash, FaSearch, FaSync, FaExclamationTriangle, FaTimes } from 'react-icons/fa';

const MyActions = () => {
    const [actions, setActions] = useState([]);
    const [cloudData, setCloudData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [cloudLoading, setCloudLoading] = useState(false);
    const [error, setError] = useState(null);
    const [syncing, setSyncing] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [firebaseConfig, setFirebaseConfig] = useState(null);
    const [firebaseEnabled, setFirebaseEnabled] = useState(true);
    const [showSyncModal, setShowSyncModal] = useState(false);
    const [syncProgress, setSyncProgress] = useState(null);

    // Cloud Data Filtering & Selection
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCloudIds, setSelectedCloudIds] = useState(new Set());

    // Cache for subcollections to map names
    const [subcollectionMap, setSubcollectionMap] = useState({});

    const loadActions = async () => {
        setLoading(true);
        try {
            const response = await pendingSyncsAPI.getAll();
            setActions(response.data);
        } catch (err) {
            console.error("Failed to load actions", err);
            setError("Failed to load pending syncs.");
        } finally {
            setLoading(false);
        }
    };

    const loadCloudData = async () => {
        if (!firebaseConfig) return;
        if (!firebaseEnabled) {
            alert('Network Integration is disabled. Please enable it in Settings.');
            return;
        }
        setCloudLoading(true);
        try {
            const { getFirestore, collection, getDocs } = await import('firebase/firestore');

            const app = await getOrInitSyncApp(firebaseConfig);
            const db = getFirestore(app);

            const querySnapshot = await getDocs(collection(db, "units"));
            const data = [];
            querySnapshot.forEach((doc) => {
                data.push({ id: doc.id, ...doc.data() });
            });
            setCloudData(data);
            // Clear selection on reload
            setSelectedCloudIds(new Set());
        } catch (err) {
            console.error("Failed to load cloud data", err);
        } finally {
            setCloudLoading(false);
        }
    };

    const loadAppSettings = async () => {
        try {
            const response = await settingsAPI.getAll();
            if (response.data.length > 0) {
                const settings = response.data[0];
                if (settings.firebase_config) {
                    setFirebaseConfig(JSON.parse(settings.firebase_config));
                }
                if (settings.firebase_enabled !== undefined) {
                    setFirebaseEnabled(settings.firebase_enabled);
                }
            }
        } catch (e) {
            console.error("Failed to load settings for sync", e);
        }
    };

    const loadSubcollections = async () => {
        try {
            const res = await subcollectionAPI.getAll();
            const map = {};
            if (res.data) {
                res.data.forEach(s => map[s.id] = s.name);
            }
            setSubcollectionMap(map);
        } catch (error) {
            console.error("Failed to load subcollections", error);
        }
    };

    useEffect(() => {
        loadActions();
        loadAppSettings();
        loadSubcollections();
    }, []);

    // Load cloud data once config is available - REMOVED AUTO FETCH
    // Now user must manually click refresh to save costs
    useEffect(() => {
        // if (firebaseConfig && firebaseEnabled) {
        //    loadCloudData();
        // }
    }, [firebaseConfig, firebaseEnabled]);

    // Helper to safely get or initialize Firebase App
    const getOrInitSyncApp = async (config) => {
        const { initializeApp, getApps } = await import('firebase/app');
        const appName = "syncApp";
        const existingApps = getApps();
        const app = existingApps.find(a => a.name === appName);
        if (app) return app;
        return initializeApp(config, appName);
    };

    const formatDate = (isoString) => {
        return new Date(isoString).toLocaleString();
    };

    const handleRemoveFromSync = async (actionId) => {
        // Optimistic update to remove from list immediately
        setActions(prev => prev.filter(a => a.id !== actionId));
        try {
            await pendingSyncsAPI.update(actionId, { is_sync_pending: false });
        } catch (err) {
            console.error("Failed to remove sync pending status", err);
            // Revert by reloading to ensure consistency
            loadActions();
        }
    };

    const openSyncModal = () => {
        const pending = actions.filter(a => a.is_sync_pending);
        if (pending.length === 0) {
            alert("No pending actions to sync.");
            return;
        }
        setShowSyncModal(true);
    };

    const closeSyncModal = () => setShowSyncModal(false);

    const executeSync = async () => {
        if (!firebaseConfig) {
            alert("Firebase not configured in Settings.");
            return;
        }

        if (!firebaseEnabled) {
            alert("Network Integration is disabled in Settings.");
            return;
        }

        const pendingActions = actions.filter(a => a.is_sync_pending);
        if (pendingActions.length === 0) {
            alert("No pending actions to sync.");
            closeSyncModal();
            return;
        }

        setSyncing(true);
        try {
            const { getFirestore, doc, setDoc, deleteDoc, getDoc } = await import('firebase/firestore');
            const app = await getOrInitSyncApp(firebaseConfig);
            const db = getFirestore(app);

            let syncedCount = 0;

            // 1. Gather distinct House IDs to sync based on pending actions
            const houseIdsToSync = new Set();
            for (const action of pendingActions) {
                if (action.model_name === 'House') {
                    houseIdsToSync.add(action.object_id);
                } else if (action.model_name === 'Member') {
                    try {
                        const mRes = await memberAPI.get(action.object_id);
                        if (mRes.data && mRes.data.house) {
                            const hId = typeof mRes.data.house === 'object' ? mRes.data.house.home_id : mRes.data.house;
                            houseIdsToSync.add(hId);
                        }
                    } catch (e) {
                        console.warn("Could not find member, ignoring", action.object_id);
                    }
                }
            }

            // 2. completely rebuild and reupload each pending house
            for (const homeId of houseIdsToSync) {
                try {
                    let houseToSync = null;
                    try {
                        const res = await houseAPI.get(homeId);
                        houseToSync = res.data;
                    } catch (e) {
                        console.error("House fetch failed", e);
                        continue;
                    }

                    const targetDocId = houseToSync.firebase_id || houseToSync.home_id;
                    if (!targetDocId) continue;

                    const docRef = doc(db, 'units', String(targetDocId));

                    // --- CONSTRUCT FULL PAYLOAD (Updates entire House Unit) ---
                    let allHouseMembers = [];
                    try {
                        let membersSearch = await memberAPI.search({ house_name: houseToSync.house_name });
                        if (membersSearch.data && membersSearch.data.results) {
                            allHouseMembers = membersSearch.data.results;
                        } else if (membersSearch.data && Array.isArray(membersSearch.data)) {
                            allHouseMembers = membersSearch.data;
                        }
                        // Filter strictly by ID to ensure accuracy
                        allHouseMembers = allHouseMembers.filter(m => String(m.house) === String(houseToSync.home_id) || m.house === houseToSync.id);
                    } catch (e) { console.error("Members fetch failed", e); }

                    const guardian = allHouseMembers.find(m => m.isGuardian) || allHouseMembers[0] || {};

                    let pendingObligationsPayload = [];
                    if (guardian.member_id) {
                        try {
                            const obRes = await obligationAPI.search({ search: guardian.member_id, paid_status: 'pending' });
                            let pendingObs = obRes.data.results || obRes.data || [];
                            pendingObs = pendingObs.filter(o =>
                                String(o.member) === String(guardian.member_id) ||
                                (o.member && String(o.member.member_id) === String(guardian.member_id))
                            );

                            pendingObligationsPayload = pendingObs.map(o => {
                                const subId = (typeof o.subcollection === 'object') ? o.subcollection.id : o.subcollection;
                                return {
                                    subcollection: subcollectionMap[subId] || 'Unknown',
                                    amount: o.amount
                                };
                            });
                        } catch (e) { }
                    }

                    const memberList = allHouseMembers.map(m => ({
                        member_id: m.member_id,
                        name: `${m.name} ${m.surname}`.trim()
                    }));

                    const payload = {
                        houseId: houseToSync.home_id,
                        houseName: houseToSync.house_name,
                        guardianName: `${guardian.name || ''} ${guardian.surname || ''}`.trim(),
                        guardianDob: guardian.date_of_birth || '',
                        guardianAadhaarLast4: guardian.adhar ? guardian.adhar.slice(-4) : "",
                        members: memberList
                    };

                    if (pendingObligationsPayload.length > 0) {
                        payload.obligations = pendingObligationsPayload;
                    }

                    // Explicitly delete and re-set to ensure old members are flushed
                    try {
                        const docSnap = await getDoc(docRef);
                        if (docSnap.exists()) {
                            await deleteDoc(docRef);
                            console.log(`Deleted old Unit ${targetDocId} before update.`);
                        }
                    } catch (e) { }

                    await setDoc(docRef, payload, { merge: false });
                    console.log(`Re-uploaded Unit ${targetDocId} to Cloud.`);

                } catch (innerErr) {
                    console.error(`Failed to sync house ${homeId}`, innerErr);
                }
            }

            // 3. Clear pending sync flags locally
            for (const action of pendingActions) {
                try {
                    await pendingSyncsAPI.update(action.id, { is_sync_pending: false });
                    syncedCount++;
                } catch (e) { }
            }

            loadActions();
            loadCloudData();
            closeSyncModal();
            alert(`Sync process finished. ${syncedCount}/${pendingActions.length} actions processed.`);

        } catch (err) {
            console.error("Sync failed", err);
            alert("Sync process failed. See console.");
        } finally {
            setSyncing(false);
        }
    };

    const performFullSync = async () => {
        if (!firebaseConfig) {
            alert("Firebase not configured.");
            return;
        }
        if (!firebaseEnabled) {
            alert("Network Integration is disabled in Settings.");
            return;
        }
        if (!window.confirm("This will overwrite Cloud data with ALL local data. This process may take time. Continue?")) return;

        setSyncing(true);
        try {
            const { getFirestore, doc, writeBatch } = await import('firebase/firestore');
            const app = await getOrInitSyncApp(firebaseConfig);
            const db = getFirestore(app);

            // Fetch ALL Houses
            let allHouses = [];
            let houseRes = await houseAPI.getAll();
            if (houseRes.data.results) {
                allHouses = houseRes.data.results;
                let page = 2;
                while (true) {
                    try {
                        const res = await api.get('/houses/', { params: { page_size: 100, page } });
                        if (!res.data.results || res.data.results.length === 0) break;
                        allHouses = [...allHouses, ...res.data.results];
                        if (!res.data.next) break;
                        page++;
                    } catch (e) { break; }
                }
            } else {
                allHouses = houseRes.data;
            }

            // Fetch ALL Members
            let allMembers = [];
            let memberRes = await memberAPI.getAll();
            if (memberRes.data.results) {
                allMembers = memberRes.data.results;
                let page = 2;
                while (true) {
                    try {
                        const res = await api.get('/members/', { params: { page_size: 100, page } });
                        if (!res.data.results || res.data.results.length === 0) break;
                        allMembers = [...allMembers, ...res.data.results];
                        if (!res.data.next) break;
                        page++;
                    } catch (e) { break; }
                }
            } else {
                allMembers = memberRes.data;
            }


            // Fetch ALL Pending Obligations for Bulk/Full Sync optimization
            // Instead of fetching per guardian, we fetch all pending and map them.
            const guardianObligationsMap = {}; // guardian_id -> [{ subcollection: "Name", amount: 100 }]
            try {
                // Fetch all pending
                let allPendingObs = [];
                // Pagination loop for obligations
                let oPage = 1;
                while (true) {
                    const oRes = await obligationAPI.search({ paid_status: 'pending', page: oPage, page_size: 100 });
                    const results = oRes.data.results || oRes.data;
                    if (!results || results.length === 0) break;
                    allPendingObs = [...allPendingObs, ...results];
                    if (!oRes.data.next) break;
                    oPage++;
                }

                // Group by member (guardian)
                allPendingObs.forEach(o => {
                    // Extract Member ID
                    let mId = o.member;
                    if (typeof o.member === 'object' && o.member !== null) mId = o.member.member_id;

                    if (mId) {
                        if (!guardianObligationsMap[mId]) guardianObligationsMap[mId] = [];
                        const subId = (typeof o.subcollection === 'object') ? o.subcollection.id : o.subcollection;
                        guardianObligationsMap[mId].push({
                            subcollection: subcollectionMap[subId] || 'Unknown',
                            amount: o.amount
                        });
                    }
                });
            } catch (e) {
                console.error("Failed to fetch all obligations for full sync", e);
            }

            // Map Members to Houses
            const houseMembersMap = {};
            allMembers.forEach(m => {
                if (m.house) {
                    if (!houseMembersMap[m.house]) houseMembersMap[m.house] = [];
                    houseMembersMap[m.house].push(m);
                }
            });

            // Build Payloads and Batch Write
            const batchSize = 100; // Smaller batch size to prevent hitting burst limits
            let batch = writeBatch(db);
            let count = 0;
            let totalProcessed = 0;
            setSyncProgress({ current: 0, total: allHouses.length, status: "Preparing data..." });

            for (const house of allHouses) {
                const members = houseMembersMap[house.home_id] || [];
                const guardian = members.find(m => m.isGuardian) || members[0] || {};

                const docId = house.firebase_id || house.home_id;
                if (!docId) continue;

                const docRef = doc(db, 'units', String(docId));

                const memberList = members.map(m => ({
                    member_id: m.member_id,
                    name: `${m.name} ${m.surname}`.trim()
                }));

                const payload = {
                    houseId: house.home_id,
                    houseName: house.house_name,
                    guardianName: `${guardian.name || ''} ${guardian.surname || ''}`.trim(),
                    guardianDob: guardian.date_of_birth || '',
                    guardianAadhaarLast4: guardian.adhar ? guardian.adhar.slice(-4) : "",
                    members: memberList,
                };

                if (guardian.member_id && guardianObligationsMap[guardian.member_id]) {
                    payload.obligations = guardianObligationsMap[guardian.member_id];
                }

                batch.set(docRef, payload, { merge: true });
                count++;
                totalProcessed++;

                if (count >= batchSize) {
                    setSyncProgress({ current: totalProcessed, total: allHouses.length, status: `Pushing batch of ${batchSize}...` });
                    await batch.commit();
                    // Add a timer delay between batches to respect free limits and avoid rate-limiting
                    await new Promise(resolve => setTimeout(resolve, 2000));
                    batch = writeBatch(db);
                    count = 0;
                }
            }

            if (count > 0) {
                setSyncProgress({ current: totalProcessed, total: allHouses.length, status: `Pushing final batch of ${count}...` });
                await batch.commit();
                await new Promise(resolve => setTimeout(resolve, 1000));
            }

            setSyncProgress({ current: allHouses.length, total: allHouses.length, status: "Complete!" });
            alert(`Full Sync Complete! Synced ${allHouses.length} units to the cloud safely.`);
            loadCloudData();

        } catch (e) {
            console.error("Full sync failed", e);
            alert("Full sync failed: " + e.message);
        } finally {
            setSyncing(false);
            setTimeout(() => setSyncProgress(null), 3000);
        }
    };

    // --- Search & Filter Logic ---
    const filteredCloudData = cloudData.filter(item => {
        const search = searchTerm.toLowerCase();
        return (
            (item.houseName && item.houseName.toLowerCase().includes(search)) ||
            (item.houseId && item.houseId.toLowerCase().includes(search)) ||
            (item.id && item.id.toLowerCase().includes(search))
        );
    });

    // --- Delete Logic ---
    const toggleCloudSelection = (id) => {
        const newSet = new Set(selectedCloudIds);
        if (newSet.has(id)) {
            newSet.delete(id);
        } else {
            newSet.add(id);
        }
        setSelectedCloudIds(newSet);
    };

    const toggleSelectAll = () => {
        if (selectedCloudIds.size === filteredCloudData.length) {
            setSelectedCloudIds(new Set());
        } else {
            const newSet = new Set();
            filteredCloudData.forEach(item => newSet.add(item.id));
            setSelectedCloudIds(newSet);
        }
    };

    const handleDeleteSelected = async () => {
        if (selectedCloudIds.size === 0) return;
        if (!window.confirm(`Are you sure you want to delete ${selectedCloudIds.size} items from the Cloud? This action cannot be undone.`)) return;

        setDeleting(true);
        try {
            const { getFirestore, doc, deleteDoc } = await import('firebase/firestore');
            const app = await getOrInitSyncApp(firebaseConfig);
            const db = getFirestore(app);

            const idsToDelete = Array.from(selectedCloudIds);
            for (const id of idsToDelete) {
                await deleteDoc(doc(db, "units", id));
            }

            // Refresh cloud data
            await loadCloudData();
            setSelectedCloudIds(new Set());
            alert("Selected items deleted successfully.");

        } catch (e) {
            console.error("Delete failed", e);
            alert("Failed to delete some items: " + e.message);
        } finally {
            setDeleting(false);
        }
    };

    const pendingActions = actions.filter(a => a.is_sync_pending);

    return (
        <div className="my-actions-container split-layout">
            {/* Header */}
            <div className="main-header">
                <h2><FaHistory /> My Activity Manager</h2>
                <div className="global-stats">
                    <div className="stat-pill pending">
                        Pending: {pendingActions.length}
                    </div>
                    <div className="stat-pill cloud">
                        Cloud Docs: {cloudData.length}
                    </div>
                </div>
            </div>

            <div className="split-panels">
                {/* LEFT SIDE: SYNC TO CLOUD */}
                <div className="panel left-panel">
                    <div className="panel-header">
                        <h3><FaSync /> Sync to Cloud</h3>
                        <div className="panel-actions">
                            <button
                                className="action-btn primary"
                                onClick={openSyncModal}
                                disabled={syncing || pendingActions.length === 0}
                            >
                                <FaCloudUploadAlt /> {syncing ? "Syncing..." : "Sync Pending"}
                            </button>
                            <button onClick={loadActions} className="icon-btn" title="Refresh">
                                <FaSync className={loading ? 'spin' : ''} />
                            </button>
                        </div>
                    </div>

                    <div className="panel-content">
                        {loading ? (
                            <div className="loading-placeholder">Loading actions...</div>
                        ) : pendingActions.length === 0 ? (
                            <div className="empty-state-small">
                                <FaCheck className="success-icon" />
                                <p>All clean! No pending actions to sync.</p>
                            </div>
                        ) : (
                            <div className="compact-list">
                                {pendingActions.map(action => (
                                    <div key={action.id} className="compact-item">
                                        <div className="compact-header">
                                            <span className={`badge ${action.action_type ? action.action_type.toLowerCase() : 'unknown'}`}>{action.action_type}</span>
                                            <span className="compact-model">{action.model_name}</span>
                                            <span className="compact-time">{formatDate(action.timestamp)}</span>
                                        </div>
                                        <p className="compact-desc">{action.description}</p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* RIGHT SIDE: CLOUD DATA */}
                <div className="panel right-panel">
                    <div className="panel-header multiline-header">
                        <div className="header-top">
                            <h3><FaCloudUploadAlt /> Firebase Cloud Data</h3>
                            <button onClick={loadCloudData} className="icon-btn" title="Refresh Cloud">
                                <FaSync className={cloudLoading ? 'spin' : ''} />
                            </button>
                        </div>
                        <div className="header-controls-row">
                            <div className="search-box">
                                <FaSearch className="search-icon" />
                                <input
                                    type="text"
                                    placeholder="Search Name or ID..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                            <div className="button-group">
                                <button
                                    className="action-btn danger small"
                                    onClick={handleDeleteSelected}
                                    disabled={deleting || selectedCloudIds.size === 0 || syncing}
                                >
                                    <FaTrash /> Delete ({selectedCloudIds.size})
                                </button>
                                <button
                                    style={{ marginLeft: '10px' }}
                                    className="action-btn secondary small push-all-btn"
                                    onClick={performFullSync}
                                    disabled={syncing}
                                >
                                    {syncing && syncProgress ? (
                                        <><FaSync className="spin" /> Pushing...</>
                                    ) : (
                                        <><FaCloudUploadAlt /> Push All</>
                                    )}
                                </button>
                            </div>
                        </div>
                        {syncProgress && (
                            <div className="sync-progress-bar-container animate-in">
                                <div className="progress-text-row">
                                    <span className="progress-status">{syncProgress.status}</span>
                                    <span className="progress-ratio">{syncProgress.current} / {syncProgress.total}</span>
                                </div>
                                <div className="progress-track">
                                    <div
                                        className="progress-fill"
                                        style={{ width: `${syncProgress.total > 0 ? (syncProgress.current / syncProgress.total) * 100 : 0}%` }}
                                    ></div>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="panel-content">
                        {cloudLoading ? (
                            <div className="loading-placeholder">Loading cloud data...</div>
                        ) : !firebaseConfig ? (
                            <div className="error-placeholder">Firebase not configured.</div>
                        ) : !firebaseEnabled ? (
                            <div className="error-placeholder">Network Integration Disabled</div>
                        ) : filteredCloudData.length === 0 ? (
                            <div className="empty-state-small">
                                <p>No data loaded.</p>
                                <button onClick={loadCloudData} className="action-btn secondary small" style={{ marginTop: 10 }}>
                                    <FaCloudUploadAlt /> Load Cloud Data
                                </button>
                            </div>
                        ) : (
                            <div className="table-wrapper">
                                <table className="cloud-table">
                                    <thead>
                                        <tr>
                                            <th className="checkbox-col">
                                                <input
                                                    type="checkbox"
                                                    checked={filteredCloudData.length > 0 && selectedCloudIds.size === filteredCloudData.length}
                                                    onChange={toggleSelectAll}
                                                />
                                            </th>
                                            <th>House / ID</th>
                                            <th>Guardian</th>
                                            <th>Info</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredCloudData.map(doc => (
                                            <tr key={doc.id} className={selectedCloudIds.has(doc.id) ? 'selected' : ''}>
                                                <td className="checkbox-col">
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedCloudIds.has(doc.id)}
                                                        onChange={() => toggleCloudSelection(doc.id)}
                                                    />
                                                </td>
                                                <td>
                                                    <div className="cell-main">{doc.houseName || 'Unnamed'}</div>
                                                    <div className="cell-sub">{doc.houseId || doc.id}</div>
                                                </td>
                                                <td>
                                                    <div className="cell-main">{doc.guardianName || '-'}</div>
                                                    <div className="cell-sub">{doc.guardianAadhaarLast4 ? `...${doc.guardianAadhaarLast4}` : ''}</div>
                                                </td>
                                                <td>
                                                    <div className="tag">M: {doc.members?.length || 0}</div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            </div>
            {/* Modal for Sync Review */}
            {
                showSyncModal && (
                    <div className="modal-overlay">
                        <div className="modal-content sync-modal animate-in">
                            <div className="modal-header">
                                <h3>Review Data to Sync ({pendingActions.length})</h3>
                                <button className="icon-btn" onClick={closeSyncModal}><FaTimes /></button>
                            </div>
                            <div className="modal-body">
                                <p style={{ marginBottom: '10px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                                    The following items are pending synchronization. Review them below. You can remove items you do not wish to sync.
                                </p>
                                <div className="sync-review-list">
                                    {pendingActions.map(action => (
                                        <div key={action.id} className="sync-item-row">
                                            <div className="sync-item-info">
                                                <div className="sync-item-title">
                                                    {action.model_name} {action.action_type}
                                                    <span
                                                        style={{ marginLeft: '8px', fontSize: '10px' }}
                                                        className={`badge ${action.action_type.toLowerCase()}`}
                                                    >
                                                        {action.action_type}
                                                    </span>
                                                </div>
                                                <div className="sync-item-subtitle">
                                                    {action.description || 'No description'} • {formatDate(action.timestamp)}
                                                </div>
                                            </div>
                                            <button
                                                className="action-btn danger small"
                                                onClick={() => handleRemoveFromSync(action.id)}
                                                title="Don't Sync (Remove from pending)"
                                            >
                                                <FaTrash /> Remove
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button className="action-btn secondary" onClick={closeSyncModal}>Cancel</button>
                                <button className="action-btn primary" onClick={executeSync} disabled={syncing || pendingActions.length === 0}>
                                    <FaCloudUploadAlt /> {syncing ? "Syncing..." : "Confirm & Sync"}
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
};

export default MyActions;

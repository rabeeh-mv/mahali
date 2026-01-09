import React, { useState, useEffect } from 'react';
import { recentActionsAPI, settingsAPI, houseAPI, memberAPI, obligationAPI, subcollectionAPI, api } from '../api';
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
    const [showSyncModal, setShowSyncModal] = useState(false);

    // Cloud Data Filtering & Selection
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCloudIds, setSelectedCloudIds] = useState(new Set());

    // Cache for subcollections to map names
    const [subcollectionMap, setSubcollectionMap] = useState({});

    const loadActions = async () => {
        setLoading(true);
        try {
            const response = await recentActionsAPI.getAll();
            setActions(response.data);
        } catch (err) {
            console.error("Failed to load actions", err);
            setError("Failed to load recent actions.");
        } finally {
            setLoading(false);
        }
    };

    const loadCloudData = async () => {
        if (!firebaseConfig) return;
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
            if (response.data.length > 0 && response.data[0].firebase_config) {
                setFirebaseConfig(JSON.parse(response.data[0].firebase_config));
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

    // Load cloud data once config is available
    useEffect(() => {
        if (firebaseConfig) {
            loadCloudData();
        }
    }, [firebaseConfig]);

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

    const renderChanges = (changes) => {
        if (!changes || Object.keys(changes).length === 0) return null;
        return (
            <div className="action-changes">
                {Object.entries(changes).map(([field, delta]) => (
                    <div key={field} className="change-item">
                        <span className="change-field">{field}:</span>
                        <div className="change-values">
                            <span className="old-val">{delta.old || 'None'}</span>
                            <span className="arrow">→</span>
                            <span className="new-val">{delta.new || 'None'}</span>
                        </div>
                    </div>
                ))}
            </div>
        );
    };

    const handleRemoveFromSync = async (actionId) => {
        // Optimistic update to remove from list immediately
        setActions(prev => prev.map(a => a.id === actionId ? { ...a, is_sync_pending: false } : a));
        try {
            await recentActionsAPI.update(actionId, { is_sync_pending: false });
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

        const pendingActions = actions.filter(a => a.is_sync_pending);
        if (pendingActions.length === 0) {
            alert("No pending actions to sync.");
            closeSyncModal();
            return;
        }

        setSyncing(true);
        try {
            const { getFirestore, doc, setDoc } = await import('firebase/firestore');
            const app = await getOrInitSyncApp(firebaseConfig);
            const db = getFirestore(app);

            let syncedCount = 0;

            for (const action of pendingActions) {
                try {
                    let targetDocId = null;
                    let payload = null;

                    if (action.model_name === 'House') {
                        try {
                            const res = await houseAPI.get(action.object_id);
                            const house = res.data;

                            targetDocId = house.firebase_id || house.home_id;
                            if (!targetDocId) targetDocId = house.home_id; // fallback

                            if (targetDocId) {
                                // STRICT PAYLOAD: 1. houseId, 2. houseName
                                payload = {
                                    houseId: house.home_id,
                                    houseName: house.house_name,
                                };
                                await setDoc(doc(db, 'units', String(targetDocId)), payload, { merge: true });
                            }
                        } catch (err) {
                            console.error(`Could not fetch house ${action.object_id}`, err);
                            continue;
                        }
                    } else if (action.model_name === 'Member') {
                        try {
                            // Fetch the specific member who changed
                            const res = await memberAPI.get(action.object_id);
                            const member = res.data;

                            if (member.house) {
                                // 1. Fetch House for IDs
                                const houseRes = await houseAPI.get(member.house);
                                const house = houseRes.data;
                                targetDocId = house.firebase_id || house.home_id;

                                // 2. Fetch ALL members of this house to ensure list is accurate
                                let allHouseMembers = [];
                                const membersSearch = await memberAPI.search({ search: house.house_name });
                                if (membersSearch.data && membersSearch.data.results) {
                                    allHouseMembers = membersSearch.data.results.filter(m => String(m.house) === String(house.home_id) || m.house === house.id);
                                } else if (membersSearch.data && Array.isArray(membersSearch.data)) {
                                    allHouseMembers = membersSearch.data.filter(m => String(m.house) === String(house.home_id) || m.house === house.id);
                                }

                                if (targetDocId) {
                                    // Calculate Guardian
                                    const guardian = allHouseMembers.find(m => m.isGuardian) || allHouseMembers[0] || {};

                                    // Fetch Pending Obligations for Guardian
                                    let pendingObligationsPayload = [];
                                    if (guardian.member_id) {
                                        try {
                                            // Search obligations for this guardian with status=pending
                                            // The API search param 'search' usually matches member name/id, but precise ID match is better if possible.
                                            // Assuming search query works for Member ID.
                                            const obRes = await obligationAPI.search({
                                                search: guardian.member_id,
                                                paid_status: 'pending'
                                            });

                                            let pendingObs = [];
                                            if (obRes.data && obRes.data.results) {
                                                pendingObs = obRes.data.results; // paginated
                                            } else if (Array.isArray(obRes.data)) {
                                                pendingObs = obRes.data;
                                            }

                                            // Double check filtering by member_id just in case "search" is fuzzy
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

                                        } catch (e) {
                                            console.error("Error fetching obligations for sync", e);
                                        }
                                    }

                                    const memberList = allHouseMembers.map(m => ({
                                        member_id: m.member_id,
                                        name: `${m.name} ${m.surname}`.trim()
                                    }));

                                    // STRICT PAYLOAD
                                    payload = {
                                        houseId: house.home_id,
                                        houseName: house.house_name,
                                        guardianName: `${guardian.name || ''} ${guardian.surname || ''}`.trim(),
                                        guardianDob: guardian.date_of_birth || '',
                                        guardianAadhaarLast4: guardian.adhar ? guardian.adhar.slice(-4) : "",
                                        // obligations: 0, // REMOVED hardcoded
                                        members: memberList
                                    };

                                    // "if not pending oblications we donot need to update the oblication data"
                                    if (pendingObligationsPayload.length > 0) {
                                        payload.obligations = pendingObligationsPayload;
                                    }

                                    await setDoc(doc(db, 'units', String(targetDocId)), payload, { merge: true });
                                }
                            }
                        } catch (err) {
                            console.error(`Could not fetch member ${action.object_id}`, err);
                            continue;
                        }
                    }

                    // Mark as synced locally
                    await recentActionsAPI.update(action.id, { is_sync_pending: false });
                    syncedCount++;

                } catch (innerErr) {
                    console.error(`Failed to sync action ${action.id}`, innerErr);
                }
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
            const batchSize = 400;
            let batch = writeBatch(db);
            let count = 0;
            let batchCount = 0;

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

                // STRICT PAYLOAD as per user request
                const payload = {
                    // 1. house id
                    houseId: house.home_id,
                    // 2. house name
                    houseName: house.house_name,
                    // 3. gardient name + surname
                    guardianName: `${guardian.name || ''} ${guardian.surname || ''}`.trim(),
                    // 4. date of birth
                    guardianDob: guardian.date_of_birth || '',
                    // 5. adhar number(last 4 digit)
                    guardianAadhaarLast4: guardian.adhar ? guardian.adhar.slice(-4) : "",
                    // 5. adhar number(last 4 digit)
                    guardianAadhaarLast4: guardian.adhar ? guardian.adhar.slice(-4) : "",
                    // 6. oblications - populated if exists
                    members: memberList,
                };

                if (guardian.member_id && guardianObligationsMap[guardian.member_id]) {
                    payload.obligations = guardianObligationsMap[guardian.member_id];
                }

                batch.set(docRef, payload, { merge: true });
                count++;

                if (count >= batchSize) {
                    await batch.commit();
                    batch = writeBatch(db);
                    count = 0;
                }
            }

            if (count > 0) {
                await batch.commit();
            }

            alert(`Full Sync Complete! Synced ${allHouses.length} units.`);
            loadCloudData();

        } catch (e) {
            console.error("Full sync failed", e);
            alert("Full sync failed: " + e.message);
        } finally {
            setSyncing(false);
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
                                            <span className={`badge ${action.action_type.toLowerCase()}`}>{action.action_type}</span>
                                            <span className="compact-model">{action.model_name}</span>
                                            <span className="compact-time">{formatDate(action.timestamp)}</span>
                                        </div>
                                        <p className="compact-desc">{action.description}</p>
                                        {renderChanges(action.fields_changed)}
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
                                    disabled={deleting || selectedCloudIds.size === 0}
                                >
                                    <FaTrash /> Delete ({selectedCloudIds.size})
                                </button>
                                <button
                                    style={{ marginLeft: '10px' }}
                                    className="action-btn secondary small"
                                    onClick={performFullSync}
                                    disabled={syncing}
                                >
                                    Push All
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="panel-content">
                        {cloudLoading ? (
                            <div className="loading-placeholder">Loading cloud data...</div>
                        ) : !firebaseConfig ? (
                            <div className="error-placeholder">Firebase not configured.</div>
                        ) : filteredCloudData.length === 0 ? (
                            <div className="empty-state-small">No comparable data found.</div>
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
                                                {renderChanges(action.fields_changed)}
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

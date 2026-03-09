import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { digitalRequestAPI, settingsAPI } from '../../api';
import './DigitalRequests.css';
import { FaSync } from 'react-icons/fa';

const DigitalRequestsPage = () => {
    const navigate = useNavigate();
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        loadRequests();
    }, []);

    const loadRequests = async () => {
        try {
            setLoading(true);
            const response = await digitalRequestAPI.getAll();
            setRequests(response.data);
            setLoading(false);
        } catch (err) {
            console.error("Failed to load requests:", err);
            setError("Failed to load requests.");
            setLoading(false);
        }
    };

    const syncFirebase = async () => {
        setLoading(true);
        try {
            // 1. Get Settings for Config
            const settingsRes = await settingsAPI.getAll();
            const settings = settingsRes.data[0];
            if (!settings || !settings.firebase_config) {
                alert("Firebase not configured in Settings.");
                setLoading(false);
                return;
            }

            if (settings.firebase_enabled === false) {
                alert("Network Integration is disabled in Settings.");
                setLoading(false);
                return;
            }

            const firebaseConfig = JSON.parse(settings.firebase_config);

            // 2. Dynamic Import Firebase
            const { initializeApp } = await import('firebase/app');
            const { getFirestore, collection, getDocs, query, where } = await import('firebase/firestore');

            // 3. Fetch Data
            // Use a unique name for this app instance to avoid "already exists" errors if called multiple times
            const appName = 'syncApp' + Date.now();
            const app = initializeApp(firebaseConfig, appName);
            const db = getFirestore(app);

            const items = [];

            // 3a. Old Families
            try {
                const q = query(collection(db, 'families'), where("areaVerified", "==", true));
                const querySnapshot = await getDocs(q);
                querySnapshot.forEach((doc) => {
                    items.push({ id: doc.id, ...doc.data() });
                });
            } catch (err) {
                console.error("Error fetching families", err);
            }

            // 3b. Portal Requests (House Transfers and Member Splits)
            try {
                const qPortal = query(collection(db, 'portalRequests'), where("status", "==", "pending"));
                const querySnapshotP = await getDocs(qPortal);
                querySnapshotP.forEach((doc) => {
                    const data = doc.data();
                    items.push({
                        id: doc.id,
                        type: data.type,
                        requestStatus: data.status,
                        ...data.data
                    });
                });
            } catch (err) {
                console.error("Error fetching portal requests", err);
            }

            if (items.length === 0) {
                alert("No new verified requests found in Firebase.");
                setLoading(false);
                return;
            }

            // 4. Send to Backend
            const importRes = await digitalRequestAPI.importFromClient({ items });
            alert(importRes.data.message);

            // 5. Reload
            loadRequests();

        } catch (err) {
            console.error("Sync failed:", err);
            alert("Sync failed: " + err.message);
            setLoading(false);
        }
    };

    const handleDelete = async (request) => {
        if (!window.confirm("Are you sure you want to delete this request? This will try to remove it from Firebase as well.")) return;

        setLoading(true);
        try {
            // 1. Delete from Firebase
            if (request.firebase_id) {
                try {
                    const settingsRes = await settingsAPI.getAll();
                    const settings = settingsRes.data[0];
                    if (settings && settings.firebase_config) {
                        const firebaseConfig = JSON.parse(settings.firebase_config);

                        // Dynamic Import
                        const { initializeApp } = await import('firebase/app');
                        const { getFirestore, doc, deleteDoc } = await import('firebase/firestore');

                        const appName = 'deleteApp' + Date.now();
                        const app = initializeApp(firebaseConfig, appName);
                        const db = getFirestore(app);

                        try { await deleteDoc(doc(db, 'families', request.firebase_id)); } catch (e) { }
                        try { await deleteDoc(doc(db, 'portalRequests', request.firebase_id)); } catch (e) { }
                        console.log("Deleted from Firebase:", request.firebase_id);
                    }
                } catch (fbErr) {
                    console.error("Firebase delete error:", fbErr);
                    // Decide if we should stop or continue. 
                    // Usually better to ask user, or just warn.
                    if (!window.confirm(`Warning: Could not delete from Firebase (${fbErr.message}). Delete from local database anyway?`)) {
                        setLoading(false);
                        return;
                    }
                }
            }

            // 2. Delete from Backend
            await digitalRequestAPI.delete(request.request_id);
            setRequests(requests.filter(req => req.request_id !== request.request_id));
            setLoading(false);

        } catch (err) {
            console.error("Delete failed:", err);
            alert("Failed to delete request: " + err.message);
            setLoading(false);
        }
    };

    const handleProcess = (request) => {
        const type = request.data?.type;
        if (type === 'house_transfer') {
            navigate(`/digital-requests/process-transfer/${request.request_id}`);
        } else if (type === 'member_split') {
            navigate(`/digital-requests/process-split/${request.request_id}`);
        } else {
            navigate(`/digital-requests/process/${request.request_id}`);
        }
    };

    if (loading) return <div className="loading">Loading requests...</div>;
    if (error) return <div className="error">{error}</div>;

    return (
        <div className="digital-requests-container">
            <div className="header-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h2>Digital Requests</h2>
                <button onClick={syncFirebase} className="sync-btn" style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '8px 16px', cursor: 'pointer' }}>
                    <FaSync /> Sync from External Database
                </button>
            </div>
            <div className="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>Family Name</th>
                            <th>House Name</th>
                            <th>Guardian</th>
                            <th>Members</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {requests.map(req => {
                            const data = req.data || {};
                            // Adjust these fields based on actual Firebase data structure
                            const memberCount = Array.isArray(data.members) ? data.members.length : 0;
                            const typeStr = data.type === 'house_transfer' ? 'Transfer' : data.type === 'member_split' ? 'Split' : 'New';

                            return (
                                <tr key={req.request_id}>
                                    <td><strong style={{ color: '#059669' }}>{"[" + typeStr + "]"}</strong> {data.familyName || 'N/A'}</td>
                                    <td>{data.houseName || data.oldHouseName || 'N/A'}</td>
                                    <td>{data.guardianName || 'N/A'}</td>
                                    <td>{memberCount}</td>
                                    <td>
                                        <span className={`status-badge ${req.status}`}>
                                            {req.status}
                                        </span>
                                    </td>
                                    <td>
                                        <button className="view-btn" onClick={() => alert(JSON.stringify(data, null, 2))}>
                                            View
                                        </button>
                                        <button className="edit-btn" onClick={() => handleProcess(req)}>
                                            Process Request
                                        </button>
                                        <button className="delete-btn" onClick={() => handleDelete(req)}>
                                            Delete
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
                {requests.length === 0 && <p className="empty-state">No pending requests found.</p>}
            </div>
        </div>
    );
};

export default DigitalRequestsPage;

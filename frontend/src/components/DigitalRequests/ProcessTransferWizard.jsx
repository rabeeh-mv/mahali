import React, { useState, useEffect } from 'react';
import { digitalRequestAPI, houseAPI, memberAPI, areaAPI } from '../../api';
import './DigitalRequests.css';
import { FaHome, FaUsers, FaCheck, FaArrowLeft } from 'react-icons/fa';
import { useParams, useNavigate } from 'react-router-dom';

const ProcessTransferWizard = () => {
    const { id } = useParams();
    const navigate = useNavigate();

    const [request, setRequest] = useState(null);
    const [loading, setLoading] = useState(false);
    const [processing, setProcessing] = useState(false);
    const [error, setError] = useState(null);
    const [areas, setAreas] = useState([]);
    const [selectedAreaId, setSelectedAreaId] = useState('');

    useEffect(() => {
        if (id) {
            loadRequest();
        }
    }, [id]);

    const loadRequest = async () => {
        try {
            setLoading(true);
            const res = await digitalRequestAPI.get(id);
            const reqData = res.data;
            setRequest(reqData);

            // Load Areas for the dropdown
            const areaRes = await areaAPI.getAll();
            const areaList = areaRes.data;
            setAreas(areaList);

            // Try to auto-select Area if it matches Locality
            if (reqData.data?.areaLocality) {
                const match = areaList.find(a => a.name.toLowerCase() === reqData.data.areaLocality.toLowerCase());
                if (match) setSelectedAreaId(match.id);
            }

            setLoading(false);
        } catch (err) {
            console.error("Failed to load transfer request", err);
            setError("Failed to load request data.");
            setLoading(false);
        }
    };

    const handleApprove = async () => {
        if (!window.confirm("Approve this house transfer? Members will be moved to the new house.")) return;

        setProcessing(true);
        try {
            const data = request.data;
            let targetHouseId = data.movingHouseId;

            // 1. Create New House if movingHouseId is not provided
            if (!targetHouseId) {
                if (!selectedAreaId) {
                    alert("Please select a required Area for the new House.");
                    setProcessing(false);
                    return;
                }
                const newHouseData = {
                    house_name: data.houseName,
                    family_name: data.familyName,
                    location_name: data.location,
                    locality: data.areaLocality,
                    address: data.detailedAddress,
                    area: selectedAreaId
                };
                const houseRes = await houseAPI.create(newHouseData);
                targetHouseId = houseRes.data.home_id;
            }

            // 2. Move members to the target house
            const membersList = data.members || [];
            for (let member of membersList) {
                if (member.member_id) {
                    try {
                        // Attempt to update directly using ID from Firebase payload (which might be outdated)
                        await memberAPI.partialUpdate(member.member_id, { house: targetHouseId });
                    } catch (mErr) {
                        // If it fails (e.g. 404 Not Found due to stale member_id, or 400 bad request), use fallback lookup by Name
                        console.warn(`Id ${member.member_id} failed for ${member.name}. Attempting to lookup by name...`);
                        try {
                            // Search backend for this member's name
                            const searchRes = await memberAPI.getAll({ search: member.name });

                            // Extract results (Accounting for Django Pagination)
                            const resultsData = searchRes.data.results || searchRes.data;

                            // Make matching lenient. Either the DB name is inside the Firebase name, or vice versa
                            // e.g. "Abdul Azeez" in DB, but Firebase sent "Abdul Azeez MV"
                            const fbName = member.name.toLowerCase().trim();
                            const potentialMatches = resultsData.filter(m => {
                                const dbName = m.name.toLowerCase().trim();
                                return fbName.includes(dbName) || dbName.includes(fbName);
                            });

                            if (potentialMatches.length > 0) {
                                // Just pick the first closest match
                                const realId = potentialMatches[0].member_id;
                                console.log(`Found real ID for ${member.name}: ${realId}. Re-attempting transfer.`);
                                await memberAPI.partialUpdate(realId, { house: targetHouseId });
                            } else {
                                throw new Error("Member strictly not found by name.");
                            }
                        } catch (fallbackErr) {
                            console.error(`Failed to move member ${member.name}:`, fallbackErr);
                            alert(`Could not move ${member.name}. They may not exist in the local database. Skip and continue.`);
                        }
                    }
                }
            }

            // 3. Mark request as processed
            await digitalRequestAPI.update(id, { status: 'processed' });

            alert("House Transfer Processed Successfully!\n\nClick OK to automatically delete this request from the online pending list.");

            // 4. Delete from Firebase
            if (request.firebase_id) {
                try {
                    console.log("Attempting to auto-delete from Firebase:", request.firebase_id);
                    const { settingsAPI } = await import('../../api');
                    const settingsRes = await settingsAPI.getAll();
                    const settings = settingsRes.data[0];

                    if (settings && settings.firebase_config) {
                        const firebaseConfig = JSON.parse(settings.firebase_config);
                        const { initializeApp } = await import('firebase/app');
                        const { getFirestore, doc, deleteDoc } = await import('firebase/firestore');

                        const appName = 'autoDeleteAppTransfer' + Date.now();
                        const app = initializeApp(firebaseConfig, appName);
                        const db = getFirestore(app);

                        try { await deleteDoc(doc(db, 'families', request.firebase_id)); } catch (e) { }
                        try { await deleteDoc(doc(db, 'portalRequests', request.firebase_id)); } catch (e) { }
                        console.log("Successfully deleted from Firebase.");
                    }

                    // 5. Delete Local Record as well
                    await digitalRequestAPI.delete(id);

                } catch (fbErr) {
                    console.error("Auto-delete failed:", fbErr);
                    alert(`Request processed, but failed to delete from Firebase/Local: ${fbErr.message}`);
                }
            } else {
                await digitalRequestAPI.delete(id);
            }

            navigate('/digital-requests');

        } catch (err) {
            console.error("Processing failed", err);
            alert("Error processing transfer: " + (err.response?.data?.detail || err.message));
        } finally {
            setProcessing(false);
        }
    };

    if (loading) return <div>Loading Transfer Request...</div>;
    if (error) return <div className="error">{error}</div>;
    if (!request) return null;

    const data = request.data || {};
    const membersList = data.members || [];

    return (
        <div className="process-wizard-full">
            <div className="wizard-header">
                <button className="secondary" onClick={() => navigate('/digital-requests')} style={{ display: 'flex', alignItems: 'center', gap: '8px', border: 'none', background: 'transparent', padding: '8px 12px', color: '#6c757d', cursor: 'pointer' }}>
                    <FaArrowLeft /> Back
                </button>
                <h2>Process House Transfer: {data.oldHouseName || 'Unknown House'}</h2>
            </div>

            <div className="wizard-content" style={{ padding: '20px' }}>
                <div style={{ display: 'flex', gap: '20px', flexDirection: 'column' }}>
                    <div className="card" style={{ padding: '15px', border: '1px solid #ddd', borderRadius: '8px' }}>
                        <h3 style={{ borderBottom: '1px solid #eee', paddingBottom: '10px', marginTop: 0 }}><FaHome /> Transfer Details</h3>
                        <p><strong>Moving From:</strong> {data.oldHouseName} (ID: {data.oldHouseId})</p>

                        {data.movingHouseId ? (
                            <p><strong>Moving To Existing House:</strong> ID {data.movingHouseId}</p>
                        ) : (
                            <div>
                                <p><strong>Creating New House:</strong></p>
                                <ul>
                                    <li>House Name: {data.houseName}</li>
                                    <li>Family Name: {data.familyName}</li>
                                    <li>Location: {data.location}</li>
                                    <li>Area/Locality: {data.areaLocality}</li>
                                </ul>
                                <div style={{ marginTop: '10px' }}>
                                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Select Area (Required) <span style={{ color: 'red' }}>*</span></label>
                                    <select
                                        style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                                        value={selectedAreaId}
                                        onChange={(e) => setSelectedAreaId(e.target.value)}
                                        required
                                    >
                                        <option value="">-- Select Area --</option>
                                        {areas.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                                    </select>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="card" style={{ padding: '15px', border: '1px solid #ddd', borderRadius: '8px' }}>
                        <h3 style={{ borderBottom: '1px solid #eee', paddingBottom: '10px', marginTop: 0 }}><FaUsers /> Members Moving ({membersList.length})</h3>
                        <ul>
                            {membersList.map((m, idx) => (
                                <li key={idx}>{m.name} {m.relationship ? `(${m.relationship})` : ''}</li>
                            ))}
                        </ul>
                    </div>
                </div>
            </div>

            <div className="wizard-footer" style={{ display: 'flex', justifyContent: 'flex-end', padding: '20px', borderTop: '1px solid #eee' }}>
                <button className="success" onClick={handleApprove} disabled={processing} style={{ padding: '10px 20px', background: '#28a745', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {processing ? 'Processing...' : <><FaCheck /> Approve Transfer</>}
                </button>
            </div>
        </div>
    );
};

export default ProcessTransferWizard;

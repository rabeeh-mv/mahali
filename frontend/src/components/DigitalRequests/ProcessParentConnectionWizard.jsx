import React, { useState, useEffect } from 'react';
import { digitalRequestAPI, memberAPI } from '../../api';
import './DigitalRequests.css';
import { FaLink, FaUser, FaCheck, FaArrowLeft, FaSearch } from 'react-icons/fa';
import { useParams, useNavigate } from 'react-router-dom';

const ProcessParentConnectionWizard = () => {
    const { id } = useParams();
    const navigate = useNavigate();

    const [request, setRequest] = useState(null);
    const [loading, setLoading] = useState(false);
    const [processing, setProcessing] = useState(false);
    const [error, setError] = useState(null);
    
    // State to hold the found target member
    const [targetMember, setTargetMember] = useState(null);
    const [memberSearchError, setMemberSearchError] = useState('');

    const [fatherMember, setFatherMember] = useState(null);
    const [motherMember, setMotherMember] = useState(null);

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

            // Attempt to automatically find the member by name based on the request
            if (reqData.data?.requesterMemberName) {
                try {
                    const searchRes = await memberAPI.search({ search: reqData.data.requesterMemberName });
                    const resultsData = searchRes.data.results || searchRes.data;
                    
                    if (resultsData && resultsData.length > 0) {
                        // Assuming the first match is correct, admin can verify visually
                        // Also, let's filter to make sure it belongs to the same house.
                        const exactMatch = resultsData.find(m => 
                            String(m.house_details?.home_id) === String(reqData.data.houseId) || 
                            String(m.house) === String(reqData.data.houseId)
                        ) || resultsData[0];
                        setTargetMember(exactMatch);
                    } else {
                        setMemberSearchError("Could not automatically find this member in the local database.");
                    }
                } catch (searchErr) {
                    console.error("Failed to search member", searchErr);
                    setMemberSearchError("Error searching for member.");
                }
            }

            // Attempt to fetch requested Father details
            if (reqData.data?.fatherId) {
                try {
                    const fatherRes = await memberAPI.search({ search: reqData.data.fatherId });
                    const fatherResults = fatherRes.data.results || fatherRes.data;
                    const exactFather = fatherResults.find(m => String(m.member_id) === String(reqData.data.fatherId));
                    if (exactFather) setFatherMember(exactFather);
                } catch (err) { console.error("Failed to fetch father", err); }
            }

            // Attempt to fetch requested Mother details
            if (reqData.data?.motherId) {
                try {
                    const motherRes = await memberAPI.search({ search: reqData.data.motherId });
                    const motherResults = motherRes.data.results || motherRes.data;
                    const exactMother = motherResults.find(m => String(m.member_id) === String(reqData.data.motherId));
                    if (exactMother) setMotherMember(exactMother);
                } catch (err) { console.error("Failed to fetch mother", err); }
            }

            setLoading(false);
        } catch (err) {
            console.error("Failed to load parent connection request", err);
            setError("Failed to load request data.");
            setLoading(false);
        }
    };

    const handleApprove = async () => {
        if (!targetMember) {
            alert("No target member selected. Cannot approve.");
            return;
        }

        if (!window.confirm(`Approve parent connection for ${targetMember.name}? This will update their database record.`)) return;

        setProcessing(true);
        try {
            const data = request.data;
            
            const updates = {};
            if (data.fatherId) {
                // In a real scenario, we might also validate the fatherId against the database
                // For simplicity, we just save the exact typed ID
                updates.father = data.fatherId; 
            }
            if (data.motherId) {
                updates.mother = data.motherId;
            }

            if (Object.keys(updates).length > 0) {
                // To avoid 400 Bad Request if the target member is a Guardian with missing mandatory fields:
                if (targetMember.isGuardian) {
                    if (!targetMember.adhar) updates.adhar = '0000';
                    if (!targetMember.phone) updates.phone = '0000000000';
                    if (!targetMember.date_of_birth) updates.date_of_birth = '2000-01-01';
                }
                
                await memberAPI.partialUpdate(targetMember.member_id, updates);
            }

            // Mark request as processed
            await digitalRequestAPI.update(id, { status: 'processed' });

            alert("Parent Connection Processed Successfully!\n\nClick OK to automatically delete this request from the online pending list.");

            // Delete from Firebase
            if (request.firebase_id) {
                try {
                    const { settingsAPI } = await import('../../api');
                    const settingsRes = await settingsAPI.getAll();
                    const settings = settingsRes.data[0];

                    if (settings && settings.firebase_config) {
                        const firebaseConfig = JSON.parse(settings.firebase_config);
                        const { initializeApp } = await import('firebase/app');
                        const { getFirestore, doc, deleteDoc } = await import('firebase/firestore');

                        const appName = 'autoDeleteAppConn' + Date.now();
                        const app = initializeApp(firebaseConfig, appName);
                        const db = getFirestore(app);

                        try { await deleteDoc(doc(db, 'portalRequests', request.firebase_id)); } catch (e) { }
                    }
                } catch (fbErr) {
                    console.error("Auto-delete failed:", fbErr);
                }
            }
            
            await digitalRequestAPI.delete(id);
            navigate('/digital-requests');

        } catch (err) {
            console.error("Processing failed", err);
            
            let errMsg = err.message;
            if (err.response && err.response.data) {
                if (typeof err.response.data === 'object') {
                    // Extract all error messages from the object
                    const messages = [];
                    for (const [key, value] of Object.entries(err.response.data)) {
                        if (Array.isArray(value)) {
                            messages.push(`${key}: ${value.join(', ')}`);
                        } else {
                            messages.push(`${key}: ${JSON.stringify(value)}`);
                        }
                    }
                    errMsg = messages.join('\n');
                } else if (err.response.data.detail) {
                    errMsg = err.response.data.detail;
                }
            }
            
            alert("Error processing connection:\n" + errMsg);
        } finally {
            setProcessing(false);
        }
    };

    if (loading) return <div>Loading Connection Request...</div>;
    if (error) return <div className="error">{error}</div>;
    if (!request) return null;

    const data = request.data || {};

    return (
        <div className="process-wizard-full">
            <div className="wizard-header">
                <button className="secondary" onClick={() => navigate('/digital-requests')} style={{ display: 'flex', alignItems: 'center', gap: '8px', border: 'none', background: 'transparent', padding: '8px 12px', color: '#6c757d', cursor: 'pointer' }}>
                    <FaArrowLeft /> Back
                </button>
                <h2>Process Parent Connection</h2>
            </div>

            <div className="wizard-content" style={{ padding: '20px' }}>
                <div style={{ display: 'flex', gap: '20px', flexDirection: 'column' }}>
                    <div className="card" style={{ padding: '15px', border: '1px solid #ddd', borderRadius: '8px' }}>
                        <h3 style={{ borderBottom: '1px solid #eee', paddingBottom: '10px', marginTop: 0 }}><FaLink /> Request Details</h3>
                        <p><strong>Member Name:</strong> {data.requesterMemberName}</p>
                        <p><strong>House Name:</strong> {data.houseName} (ID: {data.houseId})</p>
                        <hr style={{ margin: '15px 0', border: '0', borderTop: '1px solid #eee' }} />
                        <p style={{ marginBottom: '5px' }}><strong>Requested Father ID:</strong> {data.fatherId || 'None Provided'}</p>
                        {fatherMember && (
                            <div style={{ marginLeft: '15px', color: '#155724', backgroundColor: '#d4edda', padding: '8px 12px', borderRadius: '4px', fontSize: '14px', marginBottom: '15px', border: '1px solid #c3e6cb' }}>
                                Found Match: <strong>{fatherMember.name} {fatherMember.surname}</strong> (House: {fatherMember.house?.house_name || fatherMember.house_details?.house_name || (typeof fatherMember.house === 'string' ? fatherMember.house : 'Unknown')})
                            </div>
                        )}
                        {!fatherMember && data.fatherId && (
                            <div style={{ marginLeft: '15px', color: '#856404', backgroundColor: '#fff3cd', padding: '8px 12px', borderRadius: '4px', fontSize: '14px', marginBottom: '15px', border: '1px solid #ffeeba' }}>
                                ⚠️ Could not find exact member with ID {data.fatherId}
                            </div>
                        )}

                        <p style={{ marginBottom: '5px' }}><strong>Requested Mother ID:</strong> {data.motherId || 'None Provided'}</p>
                        {motherMember && (
                            <div style={{ marginLeft: '15px', color: '#155724', backgroundColor: '#d4edda', padding: '8px 12px', borderRadius: '4px', fontSize: '14px', marginBottom: '10px', border: '1px solid #c3e6cb' }}>
                                Found Match: <strong>{motherMember.name} {motherMember.surname}</strong> (House: {motherMember.house?.house_name || motherMember.house_details?.house_name || (typeof motherMember.house === 'string' ? motherMember.house : 'Unknown')})
                            </div>
                        )}
                        {!motherMember && data.motherId && (
                            <div style={{ marginLeft: '15px', color: '#856404', backgroundColor: '#fff3cd', padding: '8px 12px', borderRadius: '4px', fontSize: '14px', marginBottom: '10px', border: '1px solid #ffeeba' }}>
                                ⚠️ Could not find exact member with ID {data.motherId}
                            </div>
                        )}
                    </div>

                    <div className="card" style={{ padding: '15px', border: '1px solid #ddd', borderRadius: '8px' }}>
                        <h3 style={{ borderBottom: '1px solid #eee', paddingBottom: '10px', marginTop: 0 }}><FaUser /> Target Member Verification</h3>
                        
                        {targetMember ? (
                            <div style={{ background: '#e8f5e9', padding: '15px', borderRadius: '6px', border: '1px solid #c8e6c9' }}>
                                <p style={{ color: '#2e7d32', margin: '0 0 10px 0', fontWeight: 'bold' }}>✓ Found potential match in database</p>
                                <strong>{targetMember.name} {targetMember.surname}</strong>
                                <p style={{ margin: '5px 0 0 0', fontSize: '14px' }}>System Member ID: {targetMember.member_id}</p>
                                <p style={{ margin: '5px 0 0 0', fontSize: '14px' }}>Phone: {targetMember.mobile_number || 'N/A'}</p>
                            </div>
                        ) : (
                            <div style={{ background: '#fff3cd', padding: '15px', borderRadius: '6px', border: '1px solid #ffeeba' }}>
                                <p style={{ color: '#856404', margin: 0 }}>⚠️ {memberSearchError}</p>
                            </div>
                        )}
                        
                        <p style={{ marginTop: '15px', fontSize: '14px', color: '#666' }}>
                            Ensure this is the correct member before approving the connection.
                        </p>
                    </div>
                </div>
            </div>

            <div className="wizard-footer" style={{ display: 'flex', justifyContent: 'flex-end', padding: '20px', borderTop: '1px solid #eee' }}>
                <button 
                    className="success" 
                    onClick={handleApprove} 
                    disabled={processing || !targetMember} 
                    style={{ padding: '10px 20px', background: targetMember ? '#28a745' : '#ccc', color: '#fff', border: 'none', borderRadius: '4px', cursor: targetMember ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                    {processing ? 'Processing...' : <><FaCheck /> Approve Connection</>}
                </button>
            </div>
        </div>
    );
};

export default ProcessParentConnectionWizard;

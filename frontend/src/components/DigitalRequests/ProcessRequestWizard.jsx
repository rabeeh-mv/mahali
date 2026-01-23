import React, { useState, useEffect } from 'react';
import { digitalRequestAPI, houseAPI, memberAPI, areaAPI, todoAPI } from '../../api';
import './DigitalRequests.css';
import { FaAddressCard, FaHome, FaUsers, FaArrowRight, FaArrowLeft, FaCheck, FaExclamationTriangle, FaMale, FaFemale, FaHeart, FaLink, FaSearch } from 'react-icons/fa';



import { useParams, useNavigate } from 'react-router-dom';

const ProcessRequestWizard = ({ request: initialRequest, onBack, onComplete }) => {
    const { id } = useParams();
    const navigate = useNavigate();

    // Use prop if provided (for modal usage), otherwise state
    const [request, setRequest] = useState(initialRequest || null);

    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);

    // Unlinked Members Modal State
    const [showUnlinkedModal, setShowUnlinkedModal] = useState(false);
    const [unlinkedDetails, setUnlinkedDetails] = useState([]); // [{index, name, missing: [], whatsapp}]
    const [areas, setAreas] = useState([]);

    // Exit Confirmation State
    const [showExitModal, setShowExitModal] = useState(false);

    const onExitRequest = () => {
        setShowExitModal(true);
    };

    const confirmExit = () => {
        // "Delete all added data" -> effectively just discard state and leave
        setShowExitModal(false);
        if (onBack) onBack();
        else navigate('/digital-requests');
    };

    // --- Data State ---
    const [houseData, setHouseData] = useState({});
    const [membersData, setMembersData] = useState([]);

    // Relationship Map: { memberIndex: { fatherId, fatherName, motherId, motherName, spouseId, spouseName } }
    const [relationshipMap, setRelationshipMap] = useState({});

    // --- Duplicate Check State ---
    const [duplicateHouses, setDuplicateHouses] = useState([]);
    const [selectedExistingHouse, setSelectedExistingHouse] = useState(null); // If user chooses to link to existing house
    const [updateExistingHouse, setUpdateExistingHouse] = useState(false); // If true, overwrite DB data with Request data

    const [memberDuplicateMap, setMemberDuplicateMap] = useState({}); // { memberIndex: [possibleMatches] }
    const [memberLinkMap, setMemberLinkMap] = useState({}); // { memberIndex: { id: db_id, shouldUpdate: boolean } }

    // --- Search State (Stage 3) ---
    const [searchContext, setSearchContext] = useState(null); // { index, type }
    const [searchResults, setSearchResults] = useState([]);
    const [searchFilters, setSearchFilters] = useState({ search: '', surname: '', father: '', grandfather: '', spouse: '' });
    const [selectedMemberIdx, setSelectedMemberIdx] = useState(null);
    const [expandedMatchId, setExpandedMatchId] = useState(null);
    const [searchMode, setSearchMode] = useState('database');


    useEffect(() => {
        if (id && !initialRequest) {
            loadRequest(id);
        } else if (initialRequest) {
            initializeData(initialRequest.data);
        }
        loadAreas();
    }, [id, initialRequest]);

    const loadRequest = async (reqId) => {
        try {
            setLoading(true);
            const res = await digitalRequestAPI.get(reqId);
            setRequest(res.data);
            initializeData(res.data.data);
            await resolveFirebaseIdRelationships(res.data.data);
            setLoading(false);
        } catch (err) {
            console.error("Failed to load request", err);
            setLoading(false);
        }
    };

    const initializeData = (data) => {
        setHouseData({
            house_name: data.houseName || '',
            family_name: data.familyName || '',
            location_name: data.location || '',
            locality: data.locality || '',
            area: '',
            address: data.address || '',
            ...data.houseDetails
        });

        let membersList = [];
        if (Array.isArray(data.members)) {
            membersList = data.members;
        } else if (data.members && typeof data.members === 'object') {
            // Handle case where members is a map/object
            membersList = Object.values(data.members);
        }

        setMembersData(membersList.map((m, i) => {
            const normRel = (m.relationToGuardian || m.relation || 'member').toLowerCase();
            const isGuardian = m.isGuardian || false;

            // Auto-infer gender logic
            let inferredGender = m.gender || '';
            if (!inferredGender) {
                if (isGuardian) inferredGender = 'male';
                else if (['wife', 'mother', 'daughter', 'sister', 'grandmother', 'aunt', 'niece'].includes(normRel)) inferredGender = 'female';
                else if (['husband', 'father', 'son', 'brother', 'grandfather', 'uncle', 'nephew'].includes(normRel)) inferredGender = 'male';
                else if (normRel === 'partner') inferredGender = 'female'; // Assuming 'wife/partner' context from request
                else if (normRel === 'child') inferredGender = 'male'; // Per user request: "if Guardian's child set that auto male"
                else if (normRel === 'spouse') inferredGender = 'female'; // Default spouse to female (wife) if ambiguous, or check head?
            }

            // Per specific user request "if Guardian's wife/patner set member female"
            // This is covered by 'wife'/'partner' check above.

            return {
                ...m,
                // Ensure essential fields exist
                name: m.name || m.memberName || m.fullName || m.full_name || `Unknown Member(Keys: ${Object.keys(m).join(', ')})`,
                relationToGuardian: m.relationToGuardian || m.relation || 'Member',
                gender: inferredGender,
                status: 'live',
                isGuardian: isGuardian
            };
        }));
    };

    const resolveFirebaseIdRelationships = async (data) => {
        let membersList = [];
        if (Array.isArray(data.members)) {
            membersList = data.members;
        } else if (data.members && typeof data.members === 'object') {
            membersList = Object.values(data.members);
        }

        const newMap = {};
        for (let i = 0; i < membersList.length; i++) {
            const m = membersList[i];
            const updates = {};

            // Helper to lookup and add to updates
            const checkAndResolve = async (field, type) => {
                const fbId = m[field];
                if (fbId) {
                    try {
                        const res = await memberAPI.getAll({ firebase_id: fbId });
                        if (res.data && res.data.length > 0) {
                            const found = res.data[0];
                            updates[`${type}Id`] = found.member_id; // Using member_id as ID
                            updates[`${type}Name`] = found.name;
                            console.log(`[Auto-Resolve] Found ${type} for ${m.name}: ${found.name} (ID: ${found.member_id})`);
                        }
                    } catch (e) {
                        console.error(`Failed to resolve ${type} with firebase_id ${fbId}`, e);
                    }
                }
            };

            await checkAndResolve('father_firebase_id', 'father');
            await checkAndResolve('mother_firebase_id', 'mother');
            await checkAndResolve('spouse_firebase_id', 'spouse');

            if (Object.keys(updates).length > 0) {
                newMap[i] = updates;
            }
        }

        if (Object.keys(newMap).length > 0) {
            setRelationshipMap(prev => {
                const merged = { ...prev };
                for (const [key, val] of Object.entries(newMap)) {
                    merged[key] = { ...merged[key], ...val };
                }
                return merged;
            });
            console.log("Updated Relationship Map with Resolved IDs:", newMap);
        }
    };

    const loadAreas = async () => {
        try {
            const res = await areaAPI.getAll();
            setAreas(res.data);
            if (request?.data?.locality) {
                const match = res.data.find(a => a.name.toLowerCase() === request.data.locality.toLowerCase());
                if (match) setHouseData(prev => ({ ...prev, area: match.id }));
            }
        } catch (err) { console.error(err); }
    };

    // --- STAGE 1: HOUSE LOGIC ---
    useEffect(() => {
        if (step === 1 && houseData.house_name) {
            checkHouseDuplicates();
        }
    }, [step, houseData.house_name, houseData.family_name]);

    const checkHouseDuplicates = async () => {
        const res = await houseAPI.checkDuplicates({
            house_name: houseData.house_name,
            family_name: houseData.family_name
        });
        setDuplicateHouses(res.data);
    };

    const handleUseExistingHouse = (house) => {
        setSelectedExistingHouse(house);
        // We might want to fill address/area from existing house?
        // for now just mark it.
    };

    const handleCreateNewHouse = () => {
        setSelectedExistingHouse(null);
    };


    // --- STAGE 2: MEMBER CHECK LOGIC ---
    useEffect(() => {
        if (step === 2) {
            checkMemberDuplicates();
        }
    }, [step]);

    const checkMemberDuplicates = async () => {
        const map = {};
        for (let i = 0; i < membersData.length; i++) {
            const m = membersData[i];
            const res = await digitalRequestAPI.searchParents({
                search: m.name,
                father: m.fatherName || ''
            });
            if (res.data.length > 0) {
                map[i] = res.data;
            }
        }
        setMemberDuplicateMap(map);
    };

    const updateMember = (index, field, value) => {
        const updated = [...membersData];
        updated[index] = { ...updated[index], [field]: value };
        // Normalize specific aliases for UI consistency
        if (field === 'dob') updated[index].date_of_birth = value;
        if (field === 'phone') updated[index].mobile_number = value;

        setMembersData(updated);
    };

    // --- STAGE 3: RELATIONSHIP LOGIC ---
    const handleSearch = async () => {
        const params = {
            search: searchFilters.search,
            surname: searchFilters.surname,
            father: searchFilters.father,
            grandfather: searchFilters.grandfather,
            spouse: searchFilters.spouse
        };
        // Basic check: at least one filter
        if (!Object.values(params).some(val => val)) return;

        const res = await digitalRequestAPI.searchParents(params);
        setSearchResults(res.data);
    };

    const handleOpenSearch = (index, type) => {
        const m = membersData[index];
        let filters = { search: '', surname: '', father: '', grandfather: '', spouse: '' };

        if (type === 'father') {
            filters.search = m.father_name || m.fatherName || '';
            filters.surname = m.father_surname || m.fatherSurname || '';
            filters.father = m.grandfather_name || m.grandFather || '';
        } else if (type === 'mother') {
            filters.search = m.mother_name || m.motherName || '';
            filters.surname = m.mother_surname || m.motherSurname || '';
            filters.spouse = m.father_name || m.fatherName || ''; // Mother's spouse is usually the Father
        } else if (type === 'spouse') {
            filters.search = m.spouse_name || m.spouseName || m.married_to_name || '';
            filters.surname = m.married_to_surname || m.spouse_surname || m.spouseSurname || '';
        }

        setSearchFilters(filters);
        setSearchContext({ index, type });
        setSearchResults([]);
    };

    const selectParent = (parent) => {
        const { index, type } = searchContext;
        setRelationshipMap(prev => ({
            ...prev,
            [index]: {
                ...prev[index],
                [`${type}Id`]: parent.id,
                [`${type}Name`]: parent.name
            }
        }));

        // --- AUTO-FILL MISSING DATA (Manual Link) ---
        const newData = [...membersData];
        const m = newData[index];
        let madeChanges = false;

        if (type === 'father') {
            if (!m.father_name && !m.fatherName) {
                m.father_name = parent.name;
                m.father_surname = parent.surname || ''; // If available from search result
                madeChanges = true;
            }
        } else if (type === 'mother') {
            if (!m.mother_name && !m.motherName) {
                m.mother_name = parent.name;
                m.mother_surname = parent.surname || '';
                madeChanges = true;
            }
        } else if (type === 'spouse') {
            if (!m.spouse_name && !m.spouseName && !m.married_to_name) {
                m.spouse_name = parent.name;
                m.spouseName = parent.name;
                m.married_to_name = parent.name;
                m.married_to_surname = parent.surname || '';
                madeChanges = true;
            }
        }

        if (madeChanges) setMembersData(newData);
        setSearchContext(null);
    };

    // --- FINAL SUBMIT WRAPPER ---
    const handleFinalSubmit = async () => {
        // 1. Identify Unlinked Members
        const unlinked = [];
        const norm = (str) => (str || '').toLowerCase().trim();

        membersData.forEach((m, i) => {
            const rels = relationshipMap[i] || {};
            const missing = [];

            // Check Father
            if ((m.father_name || m.fatherName) && !rels.fatherId) {
                missing.push('father');
            }
            // Check Mother
            if ((m.mother_name || m.motherName) && !rels.motherId) {
                missing.push('mother');
            }
            // Check Spouse (only if married/spouse listed)
            if ((m.spouse_name || m.spouseName || m.married_to_name) && !rels.spouseId) {
                missing.push('spouse');
            }

            if (missing.length > 0) {
                unlinked.push({
                    index: i,
                    name: m.name || m.memberName || 'Unknown',
                    missing: missing,
                    whatsapp: m.whatsapp || m.phone || 'N/A' // Use specific whatsapp field if avail
                });
            }
        });

        if (unlinked.length > 0) {
            setUnlinkedDetails(unlinked);
            setShowUnlinkedModal(true);
        } else {
            // No unlinked members, proceed directly
            performSave(false);
        }
    };

    // --- ACTUAL SAVE LOGIC ---
    const performSave = async (createTodos) => {
        setLoading(true);
        setShowUnlinkedModal(false); // Close modal if open

        try {
            let finalizedHouseId;

            // 1. House
            if (selectedExistingHouse) {
                finalizedHouseId = selectedExistingHouse.home_id;
                console.log("Using Existing House ID:", finalizedHouseId);

                // If update requested
                if (updateExistingHouse) {
                    try {
                        await houseAPI.update(finalizedHouseId, houseData);
                        console.log("Updated Existing House:", finalizedHouseId);
                    } catch (hErr) {
                        console.error("Failed to update house", hErr);
                        alert("Warning: Failed to update house data, but proceeding with linking.");
                    }
                }
            } else {
                const res = await houseAPI.create(houseData);
                console.log("House Create Response:", res.data);
                finalizedHouseId = res.data.home_id;
                console.log("New House ID:", finalizedHouseId);

                if (!finalizedHouseId) {
                    throw new Error(`Failed to retrieve House ID from response. Keys: ${Object.keys(res.data).join(', ')}`);
                }
            }

            // 2. Members
            const createdMembers = []; // store { index, id, name } for later use

            for (let i = 0; i < membersData.length; i++) {
                const m = membersData[i];
                // Rel map might have external IDs
                const rels = relationshipMap[i] || {};

                // Check if updating existing member - Check both number and string keys
                const linkInfo = memberLinkMap[i] || memberLinkMap[String(i)];
                const isUpdating = !!(linkInfo && linkInfo.shouldUpdate && linkInfo.id);

                // --- ROBUST MAPPING ---
                // Map Firebase keys to Django keys
                const mappedMember = {
                    name: m.name || m.memberName || m.fullName || m.full_name || 'Unknown',
                    surname: m.surname || m.lastName || '',
                    // Default to today if missing (CRITICAL: model requires this field)
                    date_of_birth: m.dob || m.dateOfBirth || m.date_of_birth || new Date().toISOString().split('T')[0],
                    gender: (m.gender || 'male').toLowerCase(), // Normalize
                    isGuardian: !!m.isGuardian,
                    mobile_number: m.phone || m.mobile || m.mobileNumber || m.mobile_number || '',
                    whatsapp: m.whatsapp || '',
                    adhar: m.adhar || m.aadhaar || '',

                    grandfather_name: m.grandfather_name || m.grandFather || '',
                    father_name: m.father_name || m.fatherName || '',
                    mother_name: m.mother_name || m.motherName || '',
                    married_to_name: m.spouse_name || m.spouseName || '',

                    // Link to House
                    house: finalizedHouseId,

                    // Link to Parents (External IDs only here)
                    father: rels.fatherId?.toString().startsWith('NEW') ? null : (rels.fatherId ? String(rels.fatherId) : null),
                    mother: rels.motherId?.toString().startsWith('NEW') ? null : (rels.motherId ? String(rels.motherId) : null),
                    married_to: rels.spouseId?.toString().startsWith('NEW') ? null : (rels.spouseId ? String(rels.spouseId) : null),
                };

                // DEBUG LOGGING
                console.log(`[Step] Processing Member ${i} (Update: ${!!isUpdating}):`, mappedMember);

                if (isUpdating) {
                    // UPDATE Existing
                    await memberAPI.update(linkInfo.id, mappedMember);
                    createdMembers.push({
                        index: i,
                        id: linkInfo.id,
                        name: mappedMember.name
                    });
                } else {
                    // CREATE New
                    const res = await memberAPI.create(mappedMember);
                    createdMembers.push({
                        index: i,
                        id: res.data.member_id,
                        name: res.data.name
                    });
                }
            }

            // 3. Link Internal Relations (The "NEW_" ones)
            // Apply Auto-Link logic (simplified for commit)
            for (let i = 0; i < membersData.length; i++) {
                const rels = relationshipMap[i];
                if (!rels) continue;

                const updates = {};
                // Helper to find ID from created list
                const findId = (newStr) => {
                    if (!newStr) return null;
                    const cleanStr = newStr.toString().trim();
                    const parts = cleanStr.split('_');
                    if (parts.length < 2) return null;
                    const idx = parseInt(parts[1]);
                    return createdMembers.find(cm => cm.index === idx)?.id;
                };

                if (rels.fatherId?.toString().startsWith('NEW_')) {
                    updates.father = findId(rels.fatherId);
                }
                if (rels.motherId?.toString().startsWith('NEW_')) {
                    updates.mother = findId(rels.motherId);
                }
                if (rels.spouseId?.toString().startsWith('NEW_')) {
                    updates.married_to = findId(rels.spouseId);
                }

                if (Object.keys(updates).length > 0) {
                    await memberAPI.partialUpdate(createdMembers[i].id, updates);
                }
            }

            // 4. Create Todos (If requested)
            if (createTodos && unlinkedDetails.length > 0) {
                const { todoAPI } = await import('../../api'); // Lazy import or ensure top-level import

                for (const item of unlinkedDetails) {
                    // Find the REAL ID of this member
                    const created = createdMembers.find(cm => cm.index === item.index);
                    if (created) {
                        const todoTitle = `Connect Relations for ${created.name}`;
                        // "(id, name) this member need to connect (father/mather/spouse) whatsapp no: (whatsapp number"
                        const todoDesc = `(${created.id}, ${created.name}) this member need to connect(${item.missing.join('/')}) \nwhatsapp no: ${item.whatsapp} `;

                        await todoAPI.create({
                            title: todoTitle,
                            description: todoDesc,
                            priority: 'medium',
                            completed: false,
                            due_date: new Date().toISOString().split('T')[0]
                        });
                    }
                }
                alert(`Saved & Created ${unlinkedDetails.length} Todo items!`);
            }

            // 5. Update Request
            await digitalRequestAPI.update(request.request_id, { status: 'processed' });

            // Show Success Alert FIRST
            alert("Request Processed & Saved Successfully!\n\nClick OK to automatically delete this request from the online pending list.");

            // 6. Delete from Firebase (Auto-Cleanup)
            if (request.firebase_id) {
                try {
                    console.log("Attempting to auto-delete from Firebase:", request.firebase_id);
                    // Fetch settings for config
                    const { settingsAPI } = await import('../../api');
                    const settingsRes = await settingsAPI.getAll();
                    const settings = settingsRes.data[0];

                    if (settings && settings.firebase_config) {
                        const firebaseConfig = JSON.parse(settings.firebase_config);

                        // Dynamic Import Firebase
                        const { initializeApp } = await import('firebase/app');
                        const { getFirestore, doc, deleteDoc } = await import('firebase/firestore');

                        const appName = 'autoDeleteApp' + Date.now();
                        const app = initializeApp(firebaseConfig, appName);
                        const db = getFirestore(app);

                        await deleteDoc(doc(db, 'families', request.firebase_id));
                        console.log("Successfully deleted from Firebase.");
                    }

                    // 7. Delete Local Record as well (Complete Cleanup)
                    console.log("Deleting local request record...");
                    await digitalRequestAPI.delete(request.request_id);

                } catch (fbErr) {
                    console.error("Auto-delete failed:", fbErr);
                    alert(`Request processed, but failed to delete from Firebase/Local: ${fbErr.message}`);
                }
            } else {
                // Even if no firebase_id, user might want to auto-clean?
                // For now, let's assume we only auto-clean if it was a firebase request.
                // But actually, seeing "Processed" in the list is annoying.
                // Let's delete it locally anyway if it was a success.
                await digitalRequestAPI.delete(request.request_id);
            }

            if (onComplete) onComplete();
            else navigate('/digital-requests');

        } catch (err) {
            console.error(err);
            // Enhanced Error Reporting
            if (err.response && err.response.data) {
                const errorData = err.response.data;
                let errorMsg = "Validation Failed:\n";
                // If it's a simple object of field errors
                if (typeof errorData === 'object') {
                    for (const [key, value] of Object.entries(errorData)) {
                        errorMsg += `${key}: ${value} \n`;
                    }
                } else {
                    errorMsg += JSON.stringify(errorData);
                }
                alert(errorMsg);
            } else {
                alert("Error processing request: " + err.message);
            }
        } finally {
            setLoading(false);
        }
    };

    // Navigation helpers
    const goBack = () => {
        if (onBack) onBack();
        else navigate('/digital-requests');
    };

    // --- RENDERERS ---

    const renderStage1 = () => (
        <div className="split-view">
            <div className="left-panel">
                <h3>🏠 Request House Data</h3>
                {!request ? <p>Loading data...</p> : (
                    <>
                        <div className="form-group">
                            <label>House Name</label>
                            <input value={houseData.house_name || ''} onChange={(e) => setHouseData({ ...houseData, house_name: e.target.value })} />
                        </div>
                        <div className="form-group">
                            <label>Family Name</label>
                            <input value={houseData.family_name || ''} onChange={(e) => setHouseData({ ...houseData, family_name: e.target.value })} />
                        </div>
                        <div className="form-group">
                            <label>Place / Location</label>
                            <input value={houseData.location_name || ''} onChange={(e) => setHouseData({ ...houseData, location_name: e.target.value })} />
                        </div>
                        <div className="form-group">
                            <label>Locality (Sub-Area)</label>
                            <input value={houseData.locality || ''} onChange={(e) => setHouseData({ ...houseData, locality: e.target.value })} />
                        </div>
                        <div className="form-group">
                            <label>Full Address</label>
                            <textarea rows="3" value={houseData.address || ''} onChange={(e) => setHouseData({ ...houseData, address: e.target.value })}></textarea>
                        </div>
                        <div className="form-group">
                            <label>Area</label>
                            <select value={houseData.area || ''} onChange={(e) => setHouseData({ ...houseData, area: e.target.value })}>
                                <option value="">Select Area</option>
                                {areas.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                            </select>
                        </div>
                    </>
                )}
            </div>

            <div className="right-panel">
                <h3>🔍 Database Matches</h3>
                <div className="duplicate-list">
                    {duplicateHouses.length === 0 && <p className="safe-text"><FaCheck /> No direct duplicates found.</p>}
                    {duplicateHouses.map(h => (
                        <div key={h.home_id}
                            className={`duplicate-card ${selectedExistingHouse?.home_id === h.home_id ? 'selected' : ''}`}
                            onClick={() => handleUseExistingHouse(h)}>
                            <div className="card-header">
                                <strong>{h.house_name}</strong>
                                <span>{h.family_name}</span>
                            </div>
                            <p className="subtext">ID: {h.home_id} • Area: {h.area_name}</p>

                            {selectedExistingHouse?.home_id === h.home_id && (
                                <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    <div className="selected-badge">Selected for Linking</div>

                                    <button
                                        className={`btn-small ${updateExistingHouse ? 'primary' : 'secondary'}`}
                                        style={{ fontSize: '0.8rem', padding: '4px 8px' }}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setUpdateExistingHouse(!updateExistingHouse);
                                        }}
                                    >
                                        {updateExistingHouse ? '✓ Will Update Database with Request Data' : 'Update Database with Request Data?'}
                                    </button>

                                    {updateExistingHouse && <span className="warning-text" style={{ fontSize: '0.75rem' }}>⚠️ Existing DB data will be overwritten!</span>}
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                <div className="panel-actions">
                    {selectedExistingHouse ? (
                        <button className="secondary" onClick={handleCreateNewHouse}>Actually, Create New House</button>
                    ) : (
                        <p className="info-text">Creating new house by default.</p>
                    )}
                </div>
            </div>
        </div>
    );


    const renderStage2 = () => {
        const selectedMember = selectedMemberIdx !== null ? membersData[selectedMemberIdx] : null;
        const duplicateMatches = selectedMemberIdx !== null ? memberDuplicateMap[selectedMemberIdx] : [];

        return (
            <div className="split-view">
                <div className="left-panel">
                    <h3>👥 Request Members</h3>
                    <p className="intro-text">Click on a member to verify details and check for duplicates.</p>

                    <div className="members-list-preview">
                        {membersData.map((m, i) => (
                            <div key={i}
                                className={`member - preview - item ${selectedMemberIdx === i ? 'selected' : ''} `}
                                onClick={() => setSelectedMemberIdx(i)}
                            >
                                <div className="m-header">
                                    <strong>{m.name}</strong>
                                    <span className="relation-tag">{m.relationToGuardian}</span>
                                    {memberLinkMap[i] && <span className="linked-badge-mini" style={{ marginLeft: 'auto', fontSize: '0.7rem', background: '#e8f5e9', color: '#2e7d32', padding: '2px 6px', borderRadius: '4px' }}>Linked</span>}
                                </div>
                                {selectedMemberIdx === i && (
                                    <div className="m-details-expanded">
                                        <div className="detail-row" style={{ gridColumn: '1 / -1' }}>
                                            <label>Name:</label>
                                            <input className="compact-input" value={m.name || ''} onChange={(e) => updateMember(i, 'name', e.target.value)} />
                                        </div>
                                        <div className="detail-row">
                                            <label>Surname:</label>
                                            <input className="compact-input" value={m.surname || ''} onChange={(e) => updateMember(i, 'surname', e.target.value)} />
                                        </div>
                                        <div className="detail-row">
                                            <label>DOB:</label>
                                            <input type="date" className="compact-input" value={m.dob || m.dateOfBirth || m.date_of_birth || ''} onChange={(e) => updateMember(i, 'dob', e.target.value)} style={{ color: !m.dob && !m.dateOfBirth && !m.date_of_birth ? 'red' : 'inherit' }} />
                                        </div>
                                        <div className="detail-row">
                                            <label>Gender:</label>
                                            <select className="compact-input" value={m.gender || ''} onChange={(e) => updateMember(i, 'gender', e.target.value)}>
                                                <option value="male">Male</option>
                                                <option value="female">Female</option>
                                                <option value="other">Other</option>
                                            </select>
                                        </div>
                                        <div className="detail-row">
                                            <label>Phone:</label>
                                            <input className="compact-input" value={m.phone || m.mobile || ''} onChange={(e) => updateMember(i, 'phone', e.target.value)} />
                                        </div>
                                        <div className="detail-row">
                                            <label>WhatsApp:</label>
                                            <input className="compact-input" value={m.whatsapp || ''} onChange={(e) => updateMember(i, 'whatsapp', e.target.value)} />
                                        </div>
                                        <div className="detail-row">
                                            <label>Aadhaar (Last 4):</label>
                                            <input className="compact-input" maxLength="4" value={m.adhar || m.aadhaar || ''} onChange={(e) => updateMember(i, 'adhar', e.target.value)} />
                                        </div>
                                    </div>
                                )}
                                {memberDuplicateMap[i]?.length > 0 && <span className="warning-badge"><FaExclamationTriangle /> Match Found</span>}
                            </div>
                        ))}
                    </div>
                </div>

                <div className="right-panel">
                    <h3>🔍 Member Verification</h3>

                    {!selectedMember ? (
                        <div className="empty-selection">
                            <p>Select a member from the left to see database matches.</p>
                            {Object.keys(memberDuplicateMap).length > 0 && <p className="warning-text">⚠️ {Object.keys(memberDuplicateMap).length} members have potential duplicates.</p>}
                        </div>
                    ) : (
                        <div className="verification-details">
                            <h4>Checking: {selectedMember.name}</h4>
                            <div className="search-status">
                                {duplicateMatches?.length > 0 ? (
                                    <span className="warning-text">Found {duplicateMatches.length} similar profiles in database.</span>
                                ) : (
                                    <span className="safe-text"><FaCheck /> No direct duplicates found.</span>
                                )}
                            </div>

                            <div className="results-list">
                                {duplicateMatches?.map(match => (
                                    <div key={match.id}
                                        className={`result-item ${expandedMatchId === match.id ? 'expanded' : ''}`}
                                        onClick={() => setExpandedMatchId(expandedMatchId === match.id ? null : match.id)}
                                    >
                                        <div className="r-head">
                                            <strong>{match.name} {match.surname}</strong>
                                            <small>#{match.id}</small>
                                            <span className="expand-hint">{expandedMatchId === match.id ? '▲' : '▼'}</span>
                                        </div>
                                        <div className="r-body">
                                            <span>House: {match.house}</span>
                                            <span>Father: {match.father_name}</span>
                                            <span>Phone: {match.phone}</span>
                                        </div>

                                        {expandedMatchId === match.id && (
                                            <div className="r-details-full">
                                                <div className="detail-grid">
                                                    <div><label>Mother:</label> {match.mother_name} {match.mother_surname}</div>
                                                    <div><label>Spouse:</label> {match.spouse_name}</div>
                                                    <div><label>Gender:</label> {match.gender}</div>
                                                    <div><label>DOB:</label> {match.age}</div>
                                                    <div><label>WhatsApp:</label> {match.whatsapp}</div>
                                                    <div><label>Aadhaar:</label> {match.adhar}</div>
                                                </div>

                                                <div style={{ marginTop: '15px' }}>
                                                    <button
                                                        className={`btn-small ${memberLinkMap[selectedMemberIdx]?.id === match.id ? 'primary' : 'secondary'}`}
                                                        style={{ width: '100%', fontSize: '0.9rem' }}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            const current = memberLinkMap[selectedMemberIdx];
                                                            if (current?.id === match.id) {
                                                                // Deselect
                                                                const newMap = { ...memberLinkMap };
                                                                delete newMap[selectedMemberIdx];
                                                                setMemberLinkMap(newMap);
                                                            } else {
                                                                // Select for Update
                                                                setMemberLinkMap({
                                                                    ...memberLinkMap,
                                                                    [selectedMemberIdx]: { id: match.id, shouldUpdate: true }
                                                                });
                                                            }
                                                        }}
                                                    >
                                                        {memberLinkMap[selectedMemberIdx]?.id === match.id
                                                            ? '✓ Linked for Update (Will Overwrite)'
                                                            : 'Update on This Member'}
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    const handleDisconnect = (index, type) => {
        setRelationshipMap(prev => {
            const newMap = { ...prev };
            if (!newMap[index]) return newMap;

            const updated = { ...newMap[index] };
            if (type === 'father') {
                delete updated.fatherId;
                delete updated.fatherName;
            } else if (type === 'mother') {
                delete updated.motherId;
                delete updated.motherName;
            } else if (type === 'spouse') {
                delete updated.spouseId;
                delete updated.spouseName;
            }

            newMap[index] = updated;
            return newMap;
        });
    };

    const renderStage3 = () => (
        <div className="split-view">
            <div className="left-panel">
                <h3>🔗 Relationships</h3>
                <button className="small-link-btn" onClick={() => {
                    const newMap = { ...relationshipMap };

                    // --- HELPER: Normalize String ---
                    const norm = (str) => (str || '').toLowerCase().trim();

                    // --- 1. Identify Key Figures (Father & Mother) ---
                    let fatherIdx = -1;
                    let motherIdx = -1;

                    // A. Check for Guardian/Head/Self
                    let headIdx = membersData.findIndex(m => m.isGuardian || norm(m.relationToGuardian) === 'self' || norm(m.relationToGuardian) === 'head');

                    if (headIdx !== -1) {
                        const head = membersData[headIdx];
                        // INFER GENDER: The registration form might not send gender. 
                        // It often uses 'wifeName' which implies Male guardian.
                        let headGender = norm(head.gender);
                        if (!headGender) {
                            if (head.wifeName) headGender = 'male';
                            else if (head.husbandName) headGender = 'female';
                            else headGender = 'male'; // Default to Male if unknown
                        }

                        console.log(`Auto - Connect: Head Found: ${head.name}, Inferred Gender: ${headGender} `);

                        if (headGender === 'male' || headGender === 'm') {
                            fatherIdx = headIdx;
                            // Search for Wife
                            const wifeIdx = membersData.findIndex(m =>
                                !m.isGuardian &&
                                (norm(m.relationToGuardian) === 'wife' || norm(m.relationToGuardian) === 'spouse' || norm(m.relationToGuardian) === 'partner')
                            );
                            if (wifeIdx !== -1) motherIdx = wifeIdx;

                        } else if (headGender === 'female' || headGender === 'f') {
                            motherIdx = headIdx;
                            // Search for Husband
                            const husbandIdx = membersData.findIndex(m =>
                                !m.isGuardian &&
                                (norm(m.relationToGuardian) === 'husband' || norm(m.relationToGuardian) === 'spouse' || norm(m.relationToGuardian) === 'partner')
                            );
                            if (husbandIdx !== -1) fatherIdx = husbandIdx;
                        }
                    }

                    // B. Fallback: If no generic "Head" found, finding "Father" or "Mother" relations directly? 
                    // (Rare in this context, usually everything is relative to Head).

                    console.log(`Auto - Connect: Detected FatherIdx = ${fatherIdx}, MotherIdx = ${motherIdx} `);

                    // --- 2. Apply Links ---
                    let linksCount = 0;

                    membersData.forEach((m, idx) => {
                        // Skip parents themselves for child-linking
                        if (idx === fatherIdx || idx === motherIdx) return;

                        const rel = norm(m.relationToGuardian);

                        // Link Children
                        if (['son', 'daughter', 'child'].includes(rel)) {
                            // Link Father
                            if (fatherIdx !== -1) {
                                newMap[idx] = {
                                    ...newMap[idx],
                                    fatherId: `NEW_${fatherIdx}`,
                                    fatherName: membersData[fatherIdx].name
                                };
                                linksCount++;
                            }
                            // Link Mother
                            if (motherIdx !== -1) {
                                newMap[idx] = {
                                    ...newMap[idx],
                                    motherId: `NEW_${motherIdx}`,
                                    motherName: membersData[motherIdx].name
                                };
                                linksCount++;
                            }
                        }

                        // Link Spouses (Reciprocal)
                        // If we identified a couple (Father & Mother), link them to each other
                        if (fatherIdx !== -1 && motherIdx !== -1) {
                            if (idx === motherIdx) {
                                newMap[idx] = {
                                    ...newMap[idx],
                                    spouseId: `NEW_${fatherIdx}`,
                                    spouseName: membersData[fatherIdx].name
                                };
                            }
                        }
                    });

                    // Explicitly link the Father to the Mother separately to ensure bidirectional
                    if (fatherIdx !== -1 && motherIdx !== -1) {
                        newMap[fatherIdx] = {
                            ...newMap[fatherIdx],
                            spouseId: `NEW_${motherIdx}`,
                            spouseName: membersData[motherIdx].name
                        };
                        newMap[motherIdx] = {
                            ...newMap[motherIdx],
                            spouseId: `NEW_${fatherIdx}`,
                            spouseName: membersData[fatherIdx].name
                        };

                        // --- AUTO-FILL MISSING DATA ---
                        // If Father's spouse data is empty, fill it with Mother's data
                        // We must update membersData directly for this to persist
                        const newData = [...membersData];
                        let madeChanges = false;

                        const f = newData[fatherIdx];
                        const m = newData[motherIdx];

                        // Fill Father's "Married To" fields if empty
                        if (!f.spouse_name && !f.spouseName && !f.married_to_name) {
                            f.spouse_name = m.name;
                            f.spouseName = m.name; // Keep consistent keys
                            f.married_to_name = m.name;
                            f.married_to_surname = m.surname;
                            madeChanges = true;
                        }
                        // Fill Mother's "Married To" fields if empty
                        if (!m.spouse_name && !m.spouseName && !m.married_to_name) {
                            m.spouse_name = f.name;
                            m.spouseName = f.name;
                            m.married_to_name = f.name;
                            m.married_to_surname = f.surname;
                            madeChanges = true;
                        }

                        if (madeChanges) setMembersData(newData);
                    }

                    setRelationshipMap(newMap);
                    alert(`Auto - connected family members!(Linked ~${linksCount} relations based on '${membersData[headIdx]?.name || 'Unknown'}' as Head)`);
                }}>🪄 Auto-Connect Internal Family (Pro)</button>

                <div className="members-relation-list">
                    {membersData.map((m, i) => (
                        <div key={i} className="relation-card">
                            <h4 className="r-card-title">{m.name} {m.surname}</h4>

                            {/* FATHER SECTION */}
                            <div className="rel-section">
                                <div className="rel-col request-col">
                                    <span className="rel-label"><FaMale /> Father (Request)</span>
                                    <div className="rel-val"><strong>Name:</strong> {m.father_name || m.fatherName || '-'}</div>
                                    <div className="rel-val"><strong>Surname:</strong> {m.father_surname || m.fatherSurname || '-'}</div>
                                    <div className="rel-val"><strong>Grandfather:</strong> {m.grandfather_name || m.grandFather || '-'}</div>
                                </div>

                                <div className="rel-col linked-col">
                                    <span className="rel-label"><FaLink /> Linked Record</span>
                                    {relationshipMap[i]?.fatherName ? (
                                        <div className="linked-details">
                                            <div className="rel-val"><strong>ID:</strong> {relationshipMap[i].fatherId || 'NEW'}</div>
                                            <div className="rel-val"><strong>Name:</strong> {relationshipMap[i].fatherName}</div>
                                            <span className="linked-badge-pill"><FaCheck /> Connected</span>
                                            <button className="disconnect-btn" onClick={() => handleDisconnect(i, 'father')}>×</button>
                                        </div>
                                    ) : (
                                        <div className="unlinked-details">
                                            <span className="unlinked-text">No database record linked</span>
                                            <button className="btn-outline-small" onClick={() => handleOpenSearch(i, 'father')}><FaSearch /> Find & Connect</button>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* MOTHER SECTION */}
                            <div className="rel-section">
                                <div className="rel-col request-col">
                                    <span className="rel-label"><FaFemale /> Mother (Request)</span>
                                    <div className="rel-val"><strong>Name:</strong> {m.mother_name || m.motherName || '-'}</div>
                                    <div className="rel-val"><strong>Surname:</strong> {m.mother_surname || m.motherSurname || '-'}</div>
                                </div>

                                <div className="rel-col linked-col">
                                    <span className="rel-label"><FaLink /> Linked Record</span>
                                    {relationshipMap[i]?.motherName ? (
                                        <div className="linked-details">
                                            <div className="rel-val"><strong>ID:</strong> {relationshipMap[i].motherId || 'NEW'}</div>
                                            <div className="rel-val"><strong>Name:</strong> {relationshipMap[i].motherName}</div>
                                            <span className="linked-badge-pill"><FaCheck /> Connected</span>
                                            <button className="disconnect-btn" onClick={() => handleDisconnect(i, 'mother')}>×</button>
                                        </div>
                                    ) : (
                                        <div className="unlinked-details">
                                            <span className="unlinked-text">No database record linked</span>
                                            <button className="btn-outline-small" onClick={() => handleOpenSearch(i, 'mother')}><FaSearch /> Find & Connect</button>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* SPOUSE SECTION */}
                            <div className="rel-section">
                                <div className="rel-col request-col">
                                    <span className="rel-label"><FaHeart /> Spouse (Request)</span>
                                    <div className="rel-val"><strong>Name:</strong> {m.spouse_name || m.spouseName || m.married_to_name || '-'}</div>
                                    <div className="rel-val"><strong>Surname:</strong> {m.married_to_surname || m.spouse_surname || m.spouseSurname || '-'}</div>
                                </div>

                                <div className="rel-col linked-col">
                                    <span className="rel-label"><FaLink /> Linked Record</span>
                                    {relationshipMap[i]?.spouseName ? (
                                        <div className="linked-details">
                                            <div className="rel-val"><strong>ID:</strong> {relationshipMap[i].spouseId || 'NEW'}</div>
                                            <div className="rel-val"><strong>Name:</strong> {relationshipMap[i].spouseName}</div>
                                            <span className="linked-badge-pill"><FaCheck /> Connected</span>
                                            <button className="disconnect-btn" onClick={() => handleDisconnect(i, 'spouse')}>×</button>
                                        </div>
                                    ) : (
                                        <div className="unlinked-details">
                                            <span className="unlinked-text">No database record linked</span>
                                            <button className="btn-outline-small" onClick={() => handleOpenSearch(i, 'spouse')}><FaSearch /> Find & Connect</button>
                                        </div>
                                    )}
                                </div>
                            </div>

                        </div>
                    ))}
                </div>
            </div>

            <div className="right-panel">
                <h3>🔎 Find Relative</h3>
                {!searchContext ? (
                    <p className="placeholder-text">Click "Connect" next to a relative to search.</p>
                ) : (
                    <div className="search-interface">
                        <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
                            <button
                                className={searchMode === 'database' ? 'primary' : 'secondary'}
                                onClick={() => setSearchMode('database')}
                                style={{ flex: 1 }}
                            >
                                Database Search Results
                            </button>
                            <button
                                className={searchMode === 'request' ? 'primary' : 'secondary'}
                                onClick={() => setSearchMode('request')}
                                style={{ flex: 1 }}
                            >
                                Select from this Request
                            </button>
                        </div>
                        <h4>Find {searchContext.type} for {membersData[searchContext.index].name}</h4>

                        {searchMode === 'database' ? (
                            <>
                                <div className="search-inputs">
                                    <input className="compact-input" placeholder="Name" value={searchFilters.search} onChange={e => setSearchFilters({ ...searchFilters, search: e.target.value })} />
                                    <input className="compact-input" placeholder="Surname" value={searchFilters.surname} onChange={e => setSearchFilters({ ...searchFilters, surname: e.target.value })} />

                                    {searchContext.type === 'father' && (
                                        <>
                                            <label style={{ marginTop: 5, display: 'block' }}>Father's Name (Grandfather):</label>
                                            <input className="compact-input" placeholder="Grandfather Name" value={searchFilters.father} onChange={e => setSearchFilters({ ...searchFilters, father: e.target.value })} />
                                        </>
                                    )}
                                    {searchContext.type === 'mother' && (
                                        <>
                                            <label style={{ marginTop: 5, display: 'block' }}>Mother's Spouse:</label>
                                            <input className="compact-input" placeholder="Spouse Name" value={searchFilters.spouse} onChange={e => setSearchFilters({ ...searchFilters, spouse: e.target.value })} />
                                        </>
                                    )}

                                    <button className="primary" style={{ marginTop: 10, width: '100%' }} onClick={handleSearch}>Search Database</button>
                                </div>

                                <div className="results-list">
                                    <h5 style={{ margin: '10px 0 5px 0', color: '#666' }}>Database Search Results:</h5>
                                    {searchResults.map(r => (
                                        <div key={r.id} className="result-item" onClick={() => selectParent(r)}>
                                            <div className="r-head">
                                                <strong>{r.name} {r.surname}</strong>
                                                <small>#{r.id}</small>
                                            </div>
                                            <div className="r-body">
                                                <span>House: {r.house}</span>
                                                <span>Father: {r.father_name}</span>
                                            </div>
                                        </div>
                                    ))}
                                    {searchResults.length === 0 && <p className="no-res">No database results.</p>}
                                </div>
                            </>
                        ) : (
                            <div className="results-list">
                                <div className="local-results-section" style={{ marginBottom: '15px', paddingBottom: '10px' }}>
                                    <h5 style={{ margin: '0 0 10px 0', color: '#0ebfa0' }}>Select from this Request:</h5>
                                    {membersData.map((m, idx) => {
                                        if (idx === searchContext.index) return null; // Skip self
                                        return (
                                            <div key={`local-${idx}`} className="result-item local-item"
                                                onClick={() => selectParent({ id: `NEW_${idx}`, name: m.name, surname: m.surname })}
                                                style={{ borderLeft: '3px solid #0ebfa0' }}>
                                                <div className="r-head">
                                                    <strong>{m.name} {m.surname || ''}</strong>
                                                    <small className="badge-new">NEW</small>
                                                </div>
                                                <div className="r-body">
                                                    <span>Relation: {m.relationToGuardian}</span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                    {membersData.length <= 1 && <p className="no-res" style={{ fontSize: '0.85em' }}>No other members in this request.</p>}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );

    return (
        <div className="process-wizard-full">
            <div className="wizard-header">
                <button className="secondary" onClick={goBack} style={{ display: 'flex', alignItems: 'center', gap: '8px', border: 'none', background: 'transparent', padding: '8px 12px', color: '#6c757d', cursor: 'pointer' }}>
                    <FaArrowLeft /> Exit
                </button>
                <h2>Processing: {houseData.house_name || '...'}</h2>
                <div className="steps-indicator">
                    <span className={step === 1 ? 'active' : ''} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><FaHome /> 1. House</span>
                    <span className="separator">&gt;</span>
                    <span className={step === 2 ? 'active' : ''} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><FaUsers /> 2. Members</span>
                    <span className="separator">&gt;</span>
                    <span className={step === 3 ? 'active' : ''} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><FaLink /> 3. Relations</span>
                </div>
            </div>

            <div className="wizard-content">
                {step === 1 && renderStage1()}
                {step === 2 && renderStage2()}
                {step === 3 && renderStage3()}
            </div>

            <div className="wizard-footer">
                <div>
                    {step === 1 && selectedExistingHouse && <span className="status-msg">Linking to existing house #{selectedExistingHouse.home_id}</span>}
                    {step === 1 && !selectedExistingHouse && <span className="status-msg">Creating new house</span>}
                </div>
                <div className="actions">
                    {step > 1 && <button className="secondary" onClick={() => setStep(step - 1)} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><FaArrowLeft /> Back</button>}
                    {step < 3 && <button className="primary" onClick={() => setStep(step + 1)} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>Next Step <FaArrowRight /></button>}
                    {step === 3 && <button className="success" onClick={handleFinalSubmit} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><FaCheck /> Complete & Save</button>}
                </div>
            </div>
            {/* Unlinked Members Modal */}
            {showUnlinkedModal && (
                <div className="modal-overlay">
                    <div className="modal-content" style={{ maxWidth: '500px' }}>
                        <h3>⚠️ Unlinked Relations Detected</h3>
                        <p>The following members have relations mentioned but are not linked to a record:</p>
                        <ul style={{ textAlign: 'left', margin: '10px 0', fontSize: '0.9rem' }}>
                            {unlinkedDetails.map((item, idx) => (
                                <li key={idx} style={{ marginBottom: '5px' }}>
                                    <strong>{item.name}</strong> needs to connect:
                                    <span style={{ color: '#e67e22' }}> {item.missing.join(', ')}</span>
                                </li>
                            ))}
                        </ul>
                        <p>What would you like to do?</p>
                        <div className="modal-actions" style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px' }}>
                            <button
                                className="btn-secondary"
                                onClick={() => performSave(false)}
                            >
                                Not need connect
                            </button>
                            <button
                                className="btn-primary"
                                style={{ background: '#e67e22' }}
                                onClick={() => performSave(true)}
                            >
                                📝 Make a To-Do & Continue
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Exit Confirmation Modal */}
            {showExitModal && (
                <div className="modal-overlay">
                    <div className="modal-content" style={{ maxWidth: '400px' }}>
                        <h3>Exit Processing?</h3>
                        <p>Are you sure you want to cancel? Any data added in this session will be <strong>deleted</strong> and not saved.</p>
                        <div className="modal-actions" style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px' }}>
                            <button
                                className="btn-secondary"
                                onClick={() => setShowExitModal(false)}
                            >
                                No, Stay
                            </button>
                            <button
                                className="btn-primary"
                                style={{ background: '#e74c3c' }}
                                onClick={confirmExit}
                            >
                                Yes, Delete & Exit
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProcessRequestWizard;

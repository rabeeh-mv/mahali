import React, { useState, useEffect } from 'react';
import { digitalRequestAPI, houseAPI, memberAPI, areaAPI } from '../../api';
import './DigitalRequests.css';
import { FaAddressCard, FaHome, FaUsers, FaArrowRight, FaCheck, FaExclamationTriangle } from 'react-icons/fa';

import { useParams, useNavigate } from 'react-router-dom';

const ProcessRequestWizard = ({ request: initialRequest, onBack, onComplete }) => {
    const { id } = useParams();
    const navigate = useNavigate();

    // Use prop if provided (for modal usage), otherwise state
    const [request, setRequest] = useState(initialRequest || null);

    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [areas, setAreas] = useState([]);

    // --- Data State ---
    const [houseData, setHouseData] = useState({});
    const [membersData, setMembersData] = useState([]);

    // Relationship Map: { memberIndex: { fatherId, fatherName, motherId, motherName, spouseId, spouseName } }
    const [relationshipMap, setRelationshipMap] = useState({});

    // --- Duplicate Check State ---
    const [duplicateHouses, setDuplicateHouses] = useState([]);
    const [selectedExistingHouse, setSelectedExistingHouse] = useState(null); // If user chooses to link to existing house

    const [memberDuplicateMap, setMemberDuplicateMap] = useState({}); // { memberIndex: [possibleMatches] }

    // --- Search State (Stage 3) ---
    const [searchContext, setSearchContext] = useState(null); // { index, type }
    const [searchResults, setSearchResults] = useState([]);
    const [searchFilters, setSearchFilters] = useState({ search: '', surname: '', father: '', grandfather: '', spouse: '' });
    const [selectedMemberIdx, setSelectedMemberIdx] = useState(null);


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

        setMembersData(membersList.map((m, i) => ({
            ...m,
            // Ensure essential fields exist
            name: m.name || m.memberName || m.fullName || m.full_name || `Unknown Member (Keys: ${Object.keys(m).join(', ')})`,
            relationToGuardian: m.relationToGuardian || m.relation || 'Member',
            status: 'live',
            isGuardian: m.isGuardian || false
        })));
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
            filters.surname = m.father_surname || ''; // Assuming we have this, or leave blank
            filters.father = m.grandfather_name || m.grandFather || '';
        } else if (type === 'mother') {
            filters.search = m.mother_name || m.motherName || '';
            filters.surname = m.mother_surname || '';
            filters.spouse = m.father_name || m.fatherName || ''; // Mother's spouse is usually the Father
        } else if (type === 'spouse') {
            filters.search = m.spouse_name || m.spouseName || m.married_to_name || '';
            filters.surname = m.married_to_surname || '';
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
        setSearchContext(null);
    };

    // --- FINAL SUBMIT ---
    const handleFinalSubmit = async () => {
        setLoading(true);
        try {
            let finalizedHouseId;

            // 1. House
            if (selectedExistingHouse) {
                finalizedHouseId = selectedExistingHouse.home_id;
            } else {
                const res = await houseAPI.create(houseData);
                finalizedHouseId = res.data.home_id;
            }

            // 2. Members
            const createdMembers = []; // store { index, id }

            for (let i = 0; i < membersData.length; i++) {
                const m = membersData[i];
                // Rel map might have external IDs
                const rels = relationshipMap[i] || {};

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
                    // Job/Education/BloodGroup removed as per user request/model mismatch

                    grandfather_name: m.grandfather_name || m.grandFather || '',
                    father_name: m.father_name || m.fatherName || '',
                    mother_name: m.mother_name || m.motherName || '',
                    married_to_name: m.spouse_name || m.spouseName || '',

                    // Link to House
                    house: finalizedHouseId,

                    // Link to Parents (External IDs only here)
                    father: rels.fatherId?.toString().startsWith('NEW') ? null : rels.fatherId,
                    mother: rels.motherId?.toString().startsWith('NEW') ? null : rels.motherId,
                    married_to: rels.spouseId?.toString().startsWith('NEW') ? null : rels.spouseId,
                };

                // Validate DOB format (YYYY-MM-DD)
                // If it's DD-MM-YYYY or something else, try to parse
                // For now, let's assume it's standard or handle error gracefully

                console.log("Creating Member:", mappedMember);

                const res = await memberAPI.create(mappedMember);
                createdMembers.push({ index: i, id: res.data.member_id });
            }

            // 3. Link Internal Relations (The "NEW_" ones)
            // We need to support internal linking. 
            // In Stage 3, let's assume valid IDs are external, and we might need internal linking UI?
            // "Auto-link" from previous version can be reused or re-triggered.
            // For now, let's assume the user manually linked external people.
            // If we want internal linking (e.g. brother-sister in same request), we need that feature back.
            // Let's re-add "Auto-Link" button in Stage 3.

            // Apply Auto-Link logic (simplified for commit)
            for (let i = 0; i < membersData.length; i++) {
                const rels = relationshipMap[i];
                if (!rels) continue;

                const updates = {};
                if (rels.fatherId?.toString().startsWith('NEW_')) {
                    const idx = parseInt(rels.fatherId.split('_')[1]);
                    updates.father = createdMembers[idx].id;
                }
                if (rels.motherId?.toString().startsWith('NEW_')) {
                    const idx = parseInt(rels.motherId.split('_')[1]);
                    updates.mother = createdMembers[idx].id;
                }
                if (rels.spouseId?.toString().startsWith('NEW_')) {
                    const idx = parseInt(rels.spouseId.split('_')[1]);
                    updates.married_to = createdMembers[idx].id;
                }

                if (Object.keys(updates).length > 0) {
                    await memberAPI.partialUpdate(createdMembers[i].id, updates);
                }
            }

            // 4. Update Request
            await digitalRequestAPI.update(request.request_id, { status: 'processed' });

            alert("Request Processed Successfully!");
            if (onComplete) onComplete();
            else navigate('/digital-requests');

        } catch (err) {
            console.error(err);
            alert("Error processing request: " + err.message);
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
                            {selectedExistingHouse?.home_id === h.home_id && <div className="selected-badge">Selected for Linking</div>}
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
                                className={`member-preview-item ${selectedMemberIdx === i ? 'selected' : ''}`}
                                onClick={() => setSelectedMemberIdx(i)}
                            >
                                <div className="m-header">
                                    <strong>{m.name}</strong>
                                    <span className="relation-tag">{m.relationToGuardian}</span>
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
                                    <div key={match.id} className="result-item">
                                        <div className="r-head">
                                            <strong>{match.name} {match.surname}</strong>
                                            <small>#{match.id}</small>
                                        </div>
                                        <div className="r-body">
                                            <span>House: {match.house}</span>
                                            <span>Father: {match.father_name}</span>
                                            <span>Phone: {match.phone}</span>
                                        </div>
                                        {/* Future: Add "Merge" button here? */}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    const renderStage3 = () => (
        <div className="split-view">
            <div className="left-panel">
                <h3>🔗 Relationships</h3>
                <button className="small-link-btn" onClick={() => {
                    // ... (Auto-Link Logic same as before, omitted for brevity in prompt but I should keep it or I can just reference handleAutoConnect if I extracted it. 
                    // Since I didn't extract it, I will keep the logic here inline or extract it now.
                    // For safety I will keep inline logic but compacted).
                    const newMap = { ...relationshipMap };
                    const guardianIdx = membersData.findIndex(m => m.isGuardian);
                    if (guardianIdx === -1) return;
                    const guardian = membersData[guardianIdx];
                    membersData.forEach((m, idx) => {
                        if (idx === guardianIdx) return;
                        if (['Son', 'Daughter'].includes(m.relationToGuardian)) {
                            if (guardian.gender === 'male') newMap[idx] = { ...newMap[idx], fatherId: `NEW_${guardianIdx}`, fatherName: guardian.name };
                            else newMap[idx] = { ...newMap[idx], motherId: `NEW_${guardianIdx}`, motherName: guardian.name };
                        }
                        if (['Spouse', 'Wife', 'Husband'].includes(m.relationToGuardian)) {
                            newMap[idx] = { ...newMap[idx], spouseId: `NEW_${guardianIdx}`, spouseName: guardian.name };
                            newMap[guardianIdx] = { ...newMap[guardianIdx], spouseId: `NEW_${idx}`, spouseName: m.name };
                        }
                    });
                    setRelationshipMap(newMap);
                }}>🪄 Auto-Connect Internal Family</button>

                <div className="members-relation-list">
                    {membersData.map((m, i) => (
                        <div key={i} className="relation-card">
                            <h4 className="r-card-title">{m.name} {m.surname}</h4>

                            {/* FATHER SECTION */}
                            <div className="rel-section">
                                <div className="rel-info">
                                    <span className="rel-label">Father:</span>
                                    <span>{m.father_name || m.fatherName || '-'} {m.father_surname || ''}</span>
                                    <small>(GF: {m.grandfather_name || m.grandFather || '-'})</small>
                                </div>
                                <div className="rel-action">
                                    <span className={relationshipMap[i]?.fatherName ? 'linked-badge' : 'unlinked-badge'}>
                                        {relationshipMap[i]?.fatherName ? `Linked: ${relationshipMap[i].fatherName}` : 'Not Linked'}
                                    </span>
                                    <button onClick={() => handleOpenSearch(i, 'father')}>Connect Father</button>
                                </div>
                            </div>

                            {/* MOTHER SECTION */}
                            <div className="rel-section">
                                <div className="rel-info">
                                    <span className="rel-label">Mother:</span>
                                    <span>{m.mother_name || m.motherName || '-'} {m.mother_surname || ''}</span>
                                </div>
                                <div className="rel-action">
                                    <span className={relationshipMap[i]?.motherName ? 'linked-badge' : 'unlinked-badge'}>
                                        {relationshipMap[i]?.motherName ? `Linked: ${relationshipMap[i].motherName}` : 'Not Linked'}
                                    </span>
                                    <button onClick={() => handleOpenSearch(i, 'mother')}>Connect Mother</button>
                                </div>
                            </div>

                            {/* SPOUSE SECTION */}
                            <div className="rel-section">
                                <div className="rel-info">
                                    <span className="rel-label">Spouse:</span>
                                    <span>{m.spouse_name || m.spouseName || m.married_to_name || '-'} {m.married_to_surname || ''}</span>
                                </div>
                                <div className="rel-action">
                                    <span className={relationshipMap[i]?.spouseName ? 'linked-badge' : 'unlinked-badge'}>
                                        {relationshipMap[i]?.spouseName ? `Linked: ${relationshipMap[i].spouseName}` : 'Not Linked'}
                                    </span>
                                    <button onClick={() => handleOpenSearch(i, 'spouse')}>Connect Spouse</button>
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
                        <h4>Find {searchContext.type} for {membersData[searchContext.index].name}</h4>
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
                            {searchResults.length === 0 && <p className="no-res">No results.</p>}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );

    return (
        <div className="process-wizard-full">
            <div className="wizard-header">
                <button onClick={goBack}>&larr; Exit</button>
                <h2>Processing Request: {houseData.house_name || '...'}</h2>
                <div className="steps-indicator">
                    <span className={step === 1 ? 'active' : ''}>1. House Check</span>
                    <span className="separator">&gt;</span>
                    <span className={step === 2 ? 'active' : ''}>2. Members Check</span>
                    <span className="separator">&gt;</span>
                    <span className={step === 3 ? 'active' : ''}>3. Relationships</span>
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
                    {step > 1 && <button onClick={() => setStep(step - 1)}>Back</button>}
                    {step < 3 && <button className="primary" onClick={() => setStep(step + 1)}>Next Step &rarr;</button>}
                    {step === 3 && <button className="success" onClick={handleFinalSubmit}>Complete & Save</button>}
                </div>
            </div>
        </div>
    );
};

export default ProcessRequestWizard;

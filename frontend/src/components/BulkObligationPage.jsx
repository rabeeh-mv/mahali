import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { memberAPI, obligationAPI, areaAPI, subcollectionAPI, houseAPI } from '../api';
import { FaSearch, FaTimes, FaUsers, FaArrowLeft, FaCheck, FaExclamationCircle, FaUserTag, FaIdCard } from 'react-icons/fa';
import './BulkObligationPage.css';

const BulkObligationPage = () => {
    const navigate = useNavigate();
    const location = useLocation();

    // Data State
    const [subcollections, setSubcollections] = useState([]);
    const [members, setMembers] = useState([]);
    const [areas, setAreas] = useState([]);
    const [houses, setHouses] = useState([]);

    // Selection state
    const initialSubcollection = location.state?.selectedSubcollection || null;
    const [selectedSubcollection, setSelectedSubcollection] = useState(initialSubcollection);
    const [amount, setAmount] = useState('');

    // Filtering State
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedArea, setSelectedArea] = useState('');
    const [guardianFilter, setGuardianFilter] = useState('');
    const [generalBodyFilter, setGeneralBodyFilter] = useState('');

    // Selection & Processing State
    const [selectedMembers, setSelectedMembers] = useState([]);
    const [existingMemberIds, setExistingMemberIds] = useState([]);
    const [loading, setLoading] = useState(false);
    const [pageError, setPageError] = useState(null);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);

    // Load initial data
    useEffect(() => {
        loadInitialData();
    }, []);

    // Update amount & existing obligations when subcollection changes
    useEffect(() => {
        if (selectedSubcollection) {
            setAmount(selectedSubcollection.amount || '');
            loadExistingObligations();
        } else {
            setExistingMemberIds([]);
        }
    }, [selectedSubcollection]);

    const loadInitialData = async () => {
        setLoading(true);
        try {
            const [membersRes, areasRes, subRes, housesRes] = await Promise.all([
                memberAPI.getAll(),
                areaAPI.getAll(),
                subcollectionAPI.getAll(),
                houseAPI.getAll()
            ]);

            // Normalize members data
            let membersArray = [];
            if (Array.isArray(membersRes.data)) {
                membersArray = membersRes.data;
            } else if (membersRes.data && Array.isArray(membersRes.data.results)) {
                membersArray = membersRes.data.results;
            } else if (membersRes.data && Array.isArray(membersRes.data.data)) {
                membersArray = membersRes.data.data;
            }
            setMembers(membersArray);
            setAreas(areasRes.data);
            setSubcollections(subRes.data);

            // Normalize houses data if needed
            const housesData = Array.isArray(housesRes.data) ? housesRes.data : housesRes.data.results || [];
            if (Array.isArray(housesData)) {
                setHouses(housesData);
            } else {
                console.warn("Unexpected houses data format", housesRes);
                setHouses([]);
            }

            if (initialSubcollection && typeof initialSubcollection === 'number') {
                const found = subRes.data.find(s => s.id === initialSubcollection);
                if (found) setSelectedSubcollection(found);
            }
            setPageError(null);
        } catch (err) {
            console.error(err);
            setPageError('Failed to load required data. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const loadExistingObligations = async () => {
        if (!selectedSubcollection) return;
        try {
            const res = await obligationAPI.search({ subcollection: selectedSubcollection.id });
            const existingIds = res.data.map(ob => {
                const m = ob.member;
                if (!m) return null;
                if (typeof m === 'object') return m.member_id || m.id;
                return m;
            }).filter(Boolean);
            setExistingMemberIds(existingIds);
        } catch (err) {
            console.error("Failed to load existing obligations", err);
        }
    };

    // Helper for robust boolean check
    const checkBoolean = (val) => {
        return val === true || val === 'true' || val === 1 || val === '1';
    };

    // Helper to extract Area ID robustly
    const getAreaId = (m) => {
        // PRIORITY: Look up house details from the full houses list
        let houseIdToFind = m.house_id;

        // precise extraction of house ID
        if (!houseIdToFind) {
            if (m.house) {
                if (typeof m.house === 'object') {
                    houseIdToFind = m.house.id || m.house.house_id;
                } else {
                    // assume m.house Is the ID if it's not an object
                    houseIdToFind = m.house;
                }
            }
        }

        if (houseIdToFind) {
            // loose comparison using String() to handle number vs string mismatches
            const targetId = String(houseIdToFind);
            const linkedHouse = houses.find(h =>
                String(h.id) === targetId || String(h.house_id) === targetId
            );

            if (linkedHouse) {
                if (linkedHouse.area?.id) return parseInt(linkedHouse.area.id);
                if (linkedHouse.area && typeof linkedHouse.area !== 'object') return parseInt(linkedHouse.area);
                if (linkedHouse.area_id) return parseInt(linkedHouse.area_id);
            }
        }

        // Fallback: Use data directly on member if lookup failed
        if (m.house?.area?.id) return parseInt(m.house.area.id);
        if (m.house?.area && typeof m.house.area !== 'object') return parseInt(m.house.area);
        if (m.area_id) return parseInt(m.area_id);

        return null;
    };

    // Derived filtered list using useMemo for performance
    const filteredMembers = useMemo(() => {
        if (!members.length) return [];

        return members.filter(member => {
            // Status check
            if (member.status && member.status !== 'live') return false;

            // Search filter
            if (searchTerm) {
                const term = searchTerm.toLowerCase();
                const matchesSearch =
                    (member.name && member.name.toLowerCase().includes(term)) ||
                    (member.surname && member.surname.toLowerCase().includes(term)) ||
                    (member.member_id && String(member.member_id).includes(term)) ||
                    (member.id && String(member.id).includes(term)) ||
                    (member.house?.house_name && member.house.house_name.toLowerCase().includes(term)); // Added house search
                if (!matchesSearch) return false;
            }

            // Area filter
            if (selectedArea) {
                const filterAreaId = parseInt(selectedArea);
                const memberAreaId = getAreaId(member);
                if (memberAreaId !== filterAreaId) return false;
            }

            // Guardian filter
            if (guardianFilter !== '') {
                const isGuardian = checkBoolean(member.isGuardian || member.isguardian || member.is_guardian);
                const filterValue = guardianFilter === 'true';
                if (isGuardian !== filterValue) return false;
            }

            // General Body Filter
            if (generalBodyFilter !== '') {
                const isGB = checkBoolean(member.general_body_member);
                const filterValue = generalBodyFilter === 'true';
                if (isGB !== filterValue) return false;
            }

            return true;
        });
    }, [members, searchTerm, selectedArea, guardianFilter, generalBodyFilter, houses]);

    // Handle interactions
    const handleMemberToggle = (memberId) => {
        if (existingMemberIds.includes(memberId)) return; // Prevent toggling existing

        setSelectedMembers(prev => {
            if (prev.includes(memberId)) {
                return prev.filter(id => id !== memberId);
            } else {
                return [...prev, memberId];
            }
        });
    };

    const handleSelectAllFiltered = () => {
        const eligibleMembers = filteredMembers
            .filter(m => !existingMemberIds.includes(m.member_id))
            .map(m => m.member_id);

        const allEligibleSelected = eligibleMembers.length > 0 && eligibleMembers.every(id => selectedMembers.includes(id));

        if (allEligibleSelected) {
            // Deselect all eligible visible members
            setSelectedMembers(prev => prev.filter(id => !eligibleMembers.includes(id)));
        } else {
            // Select all eligible visible members (union with existing selection)
            const newSelected = new Set([...selectedMembers, ...eligibleMembers]);
            setSelectedMembers(Array.from(newSelected));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setSuccess(null);

        try {
            if (selectedMembers.length === 0) throw new Error('Please select at least one member');
            if (!selectedSubcollection) throw new Error('No subcollection selected');
            if (!amount || parseFloat(amount) <= 0) throw new Error('Please enter a valid amount');

            const obligationsData = selectedMembers.map(memberId => ({
                member: memberId,
                subcollection: selectedSubcollection.id,
                amount: parseFloat(amount),
                paid_status: 'pending'
            }));

            await obligationAPI.bulkCreate({ obligations: obligationsData });
            setSuccess(`Successfully created ${selectedMembers.length} obligations!`);

            setTimeout(() => {
                navigate('/obligations', { state: { selectedSubcollection } });
            }, 1500);

        } catch (err) {
            setError(err.message || 'Failed to create obligations');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    // Calculate stats
    const eligibleCount = filteredMembers.filter(m => !existingMemberIds.includes(m.member_id)).length;
    const isAllSelected = eligibleCount > 0 &&
        filteredMembers
            .filter(m => !existingMemberIds.includes(m.member_id))
            .every(m => selectedMembers.includes(m.member_id));

    return (
        <div className="bulk-obligation-container animate-in">
            {/* Header */}
            <header className="bulk-header">
                <div className="bulk-title">
                    <button onClick={() => navigate('/obligations')} className="back-btn-custom">
                        <FaArrowLeft />
                    </button>
                    <div className="icon-wrapper">
                        <FaUsers />
                    </div>
                    <span>Bulk Add Obligations</span>
                </div>
            </header>

            {/* Error Banner */}
            {pageError && (
                <div className="status-banner error" style={{ margin: '0 0 20px 0', padding: '15px', background: '#ffebee', color: '#c62828', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <FaExclamationCircle /> {pageError}
                </div>
            )}

            {/* Controls Row */}
            <div className="top-controls">
                <div className="control-group">
                    <label>Subcollection / Event *</label>
                    <div className="input-with-icon">
                        <select
                            className="custom-select"
                            value={selectedSubcollection?.id || ''}
                            onChange={(e) => {
                                const found = subcollections.find(s => s.id === parseInt(e.target.value));
                                setSelectedSubcollection(found || null);
                            }}
                            disabled={loading || (initialSubcollection && location.state?.from === 'subcollections')}
                        >
                            <option value="">-- Select Subcollection --</option>
                            {subcollections.map(s => (
                                <option key={s.id} value={s.id}>{s.name} ({s.year})</option>
                            ))}
                        </select>
                    </div>
                </div>
                <div className="control-group">
                    <label>Amount (₹) *</label>
                    <input
                        type="number"
                        className="custom-input"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="0.00"
                        min="0"
                        step="0.01"
                        disabled={loading}
                    />
                </div>
            </div>

            {selectedSubcollection && (
                <div className="bulk-grid">
                    {/* Left Column: Selection */}
                    <div className="selection-panel">
                        <div className="filter-bar">
                            <div className="search-input-wrapper">
                                <FaSearch className="search-icon" />
                                <input
                                    type="text"
                                    className="custom-input search-input"
                                    placeholder="Search by text..."
                                    value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                />
                            </div>
                            <div className="filter-group">
                                <select
                                    className="custom-select"
                                    value={selectedArea}
                                    onChange={e => setSelectedArea(e.target.value)}
                                >
                                    <option value="">All Areas</option>
                                    {areas.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                                </select>
                            </div>
                            <div className="filter-group" style={{ maxWidth: '140px' }}>
                                <select
                                    className="custom-select"
                                    value={guardianFilter}
                                    onChange={e => setGuardianFilter(e.target.value)}
                                >
                                    <option value="">Any Role</option>
                                    <option value="true">Guardian</option>
                                    <option value="false">Non-Guardian</option>
                                </select>
                            </div>
                            <div className="filter-group" style={{ maxWidth: '150px' }}>
                                <select
                                    className="custom-select"
                                    value={generalBodyFilter}
                                    onChange={e => setGeneralBodyFilter(e.target.value)}
                                >
                                    <option value="">All Members</option>
                                    <option value="true">General Body</option>
                                    <option value="false">Regular</option>
                                </select>
                            </div>
                        </div>

                        <div className="selection-stats">
                            <span className="stats-text">
                                {eligibleCount} members available
                            </span>
                            <button
                                className="select-all-btn-text"
                                onClick={handleSelectAllFiltered}
                                disabled={eligibleCount === 0}
                            >
                                {isAllSelected ? 'Deselect All' : 'Select All'}
                            </button>
                        </div>

                        <div className="member-list">
                            {filteredMembers.map(member => {
                                const isAdded = existingMemberIds.includes(member.member_id);
                                const isSelected = selectedMembers.includes(member.member_id);
                                const isGuardian = checkBoolean(member.isGuardian || member.isguardian);
                                const isGB = checkBoolean(member.general_body_member);

                                return (
                                    <div
                                        key={member.member_id}
                                        className={`member-card ${isSelected ? 'selected' : ''} ${isAdded ? 'disabled' : ''}`}
                                        onClick={() => handleMemberToggle(member.member_id)}
                                    >
                                        <div className="member-info">
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <span className="member-id-badge">#{member.member_id}</span>
                                                <h4>{member.name} {member.surname || ''}</h4>
                                            </div>

                                            <div className="member-details">
                                                <span className="badge badge-area">
                                                    {(() => {
                                                        const resolvedAreaId = getAreaId(member);
                                                        if (!resolvedAreaId) return 'No Area';
                                                        const areaObj = areas.find(a => a.id === resolvedAreaId);
                                                        return areaObj ? areaObj.name : 'Unknown Area';
                                                    })()}
                                                </span>
                                            </div>

                                            <div className="member-tags">
                                                {isGuardian && (
                                                    <span className="tag tag-guardian" title="Guardian">
                                                        GD
                                                    </span>
                                                )}
                                                {isGB && (
                                                    <span className="tag tag-gb" title="General Body Member">
                                                        GBM
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="select-indicator">
                                            {isAdded ? <FaCheck size={10} /> : isSelected && <FaCheck size={12} />}
                                        </div>
                                    </div>
                                );
                            })}
                            {filteredMembers.length === 0 && (
                                <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', gridColumn: '1/-1' }}>
                                    No members found matching your filters.
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right Column: Summary */}
                    <div className="summary-panel">
                        <div className="summary-header">
                            <h3>Selection Summary</h3>
                        </div>

                        <div className="selected-list-container">
                            {selectedMembers.length === 0 ? (
                                <div style={{ textAlign: 'center', color: '#999', marginTop: '40px' }}>
                                    <FaUsers size={32} style={{ opacity: 0.2, marginBottom: '10px' }} />
                                    <p>Select members to add.</p>
                                </div>
                            ) : (
                                selectedMembers.map(id => {
                                    const m = members.find(x => x.member_id === id);
                                    if (!m) return null;
                                    return (
                                        <div key={id} className="selected-member-mini animate-in">
                                            <span>{m.name} {m.surname}</span>
                                            <button
                                                className="remove-btn"
                                                onClick={() => handleMemberToggle(id)}
                                            >
                                                <FaTimes />
                                            </button>
                                        </div>
                                    );
                                })
                            )}
                        </div>

                        <div className="summary-footer">
                            <div className="total-calculation">
                                <div className="calc-row">
                                    {selectedMembers.length} members × ₹{amount || 0}
                                </div>
                                <div className="total-amount">
                                    ₹{(selectedMembers.length * (parseFloat(amount) || 0)).toLocaleString()}
                                </div>
                            </div>

                            {(error || success) && (
                                <div className={`status-message ${error ? 'error' : 'success'}`}>
                                    {error || success}
                                </div>
                            )}

                            <button
                                className="submit-btn"
                                onClick={handleSubmit}
                                disabled={loading || selectedMembers.length === 0 || !amount}
                            >
                                {loading ? 'Processing...' : `Create ${selectedMembers.length} Obligations`}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BulkObligationPage;

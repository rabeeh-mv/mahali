import React, { useState, useEffect } from 'react';
import { FaTimes, FaSearch, FaUserPlus, FaChevronDown, FaChevronUp, FaBuilding, FaUser } from 'react-icons/fa';
import { memberAPI, houseAPI } from '../api';
import './MemberSearchPanel.css';

const MemberSearchPanel = ({ isOpen, onClose, onSelect, type = 'member', initialValues = {} }) => {
    const [searchParams, setSearchParams] = useState({
        name: '',
        surname: '',
        father_name: '',
        house_name: '',
        home_id: ''
    });
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [expandedId, setExpandedId] = useState(null);
    const [hasSearched, setHasSearched] = useState(false);

    // Initialize search params when opening
    useEffect(() => {
        if (isOpen && initialValues) {
            setSearchParams(prev => ({
                ...prev,
                name: initialValues.name || '',
                surname: initialValues.surname || '',
                father_name: initialValues.father_name || '',
                house_name: initialValues.house_name || '',
                home_id: initialValues.home_id || ''
            }));
            // If we have some initial values, trigger a search automatically
            if (initialValues.name || initialValues.house_name || initialValues.home_id) {
                // We put this in a timeout to ensure state is updated or just call search directly with the values
                // For simplicity, we'll let the user hit search or maybe auto-search.
                // Let's auto-search if there's enough info.
                const hasInfo = (type === 'member' && initialValues.name) ||
                    (type === 'house' && (initialValues.house_name || initialValues.home_id));

                if (hasInfo) {
                    handleSearch({
                        ...searchParams,
                        ...initialValues
                    });
                }
            }
        } else {
            // Reset on close/re-open empty
            if (!isOpen) {
                setResults([]);
                setHasSearched(false);
                setExpandedId(null);
            }
        }
    }, [isOpen, type, initialValues]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setSearchParams(prev => ({ ...prev, [name]: value }));
    };

    const handleSearch = async (params = searchParams) => {
        setLoading(true);
        setHasSearched(true);
        setExpandedId(null);
        try {
            let res;
            if (type === 'member') {
                // Construct search query
                const query = {
                    search: params.name // Most backends utilize a general search or specific fields
                };

                // If the backend supports granular filtering, we would add it here. 
                // Based on previous files, it seems `memberAPI.search` takes `search`. 
                // We might need to handle filtering client-side if the API is limited, 
                // but let's try to pass what we can. 
                // For now, we'll use the main search term as the primary filter.

                res = await memberAPI.search({ search: params.name || params.surname });
            } else {
                res = await houseAPI.search({ search: params.house_name || params.home_id });
            }

            let list = [];
            if (Array.isArray(res.data)) {
                list = res.data;
            } else if (res.data?.results) {
                list = res.data.results;
            } else if (res.data?.data) {
                list = res.data.data;
            }

            // Client-side refinement if needed (e.g. if API only does broad text search)
            if (type === 'member' && params.father_name && list.length > 0) {
                list = list.filter(item =>
                    (item.father_name || '').toLowerCase().includes(params.father_name.toLowerCase())
                );
            }

            setResults(list);
        } catch (err) {
            console.error("Search failed in panel", err);
            setResults([]);
        } finally {
            setLoading(false);
        }
    };

    const toggleExpand = (id) => {
        setExpandedId(expandedId === id ? null : id);
    };

    const handleSelect = (item) => {
        onSelect(item);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="member-search-panel-overlay" onClick={onClose}>
            <div className="member-search-panel" onClick={e => e.stopPropagation()}>
                <div className="msp-header">
                    <h3>
                        {type === 'member' && <FaUser style={{ marginRight: '8px' }} />}
                        {type === 'house' && <FaBuilding style={{ marginRight: '8px' }} />}
                        Connect {type === 'member' ? 'Relative' : 'House'}
                    </h3>
                    <button className="msp-close-btn" onClick={onClose}>
                        <FaTimes />
                    </button>
                </div>

                <div className="msp-content">
                    <form className="msp-search-form" onSubmit={(e) => { e.preventDefault(); handleSearch(); }}>
                        <div className="msp-search-grid">
                            {type === 'member' ? (
                                <>
                                    <div className="input-wrapper">
                                        <label>Name</label>
                                        <input
                                            type="text"
                                            name="name"
                                            className="form-input"
                                            value={searchParams.name}
                                            onChange={handleChange}
                                            placeholder="Member name"
                                            autoFocus
                                        />
                                    </div>
                                    <div className="input-wrapper">
                                        <label>Surname</label>
                                        <input
                                            type="text"
                                            name="surname"
                                            className="form-input"
                                            value={searchParams.surname}
                                            onChange={handleChange}
                                            placeholder="Surname"
                                        />
                                    </div>
                                    <div className="input-wrapper full-width">
                                        <label>Father's Name (Filter)</label>
                                        <input
                                            type="text"
                                            name="father_name"
                                            className="form-input"
                                            value={searchParams.father_name}
                                            onChange={handleChange}
                                            placeholder="Filter by father's name"
                                        />
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="input-wrapper">
                                        <label>House ID</label>
                                        <input
                                            type="text"
                                            name="home_id"
                                            className="form-input"
                                            value={searchParams.home_id}
                                            onChange={handleChange}
                                            placeholder="Ex: 101"
                                            autoFocus
                                        />
                                    </div>
                                    <div className="input-wrapper">
                                        <label>House Name</label>
                                        <input
                                            type="text"
                                            name="house_name"
                                            className="form-input"
                                            value={searchParams.house_name}
                                            onChange={handleChange}
                                            placeholder="House name"
                                        />
                                    </div>
                                </>
                            )}
                            <div className="full-width">
                                <button type="submit" className="btn-primary" style={{ width: '100%' }} disabled={loading}>
                                    {loading ? 'Searching...' : <><FaSearch /> Search</>}
                                </button>
                            </div>
                        </div>
                    </form>

                    <div className="msp-results-list">
                        {loading ? (
                            <div className="msp-loading">Loading...</div>
                        ) : results.length > 0 ? (
                            results.map(item => {
                                const id = type === 'member' ? item.member_id : item.home_id;
                                const isExpanded = expandedId === id;
                                return (
                                    <div key={id} className={`msp-result-card ${isExpanded ? 'active' : ''}`}>
                                        <div className="msp-card-header">
                                            <div className="msp-card-title">
                                                <h4>
                                                    {type === 'member'
                                                        ? `${item.name} ${item.surname || ''}`
                                                        : item.house_name
                                                    }
                                                </h4>
                                                <div className="msp-card-subtitle">
                                                    ID: {id}
                                                </div>
                                            </div>
                                            <div className="msp-card-actions">
                                                <button
                                                    className="btn-text"
                                                    onClick={() => toggleExpand(id)}
                                                    title="View Details"
                                                >
                                                    {isExpanded ? <FaChevronUp /> : <FaChevronDown />}
                                                </button>
                                                <button
                                                    className="btn-primary sm"
                                                    onClick={() => handleSelect(item)}
                                                >
                                                    Connect
                                                </button>
                                            </div>
                                        </div>

                                        {isExpanded && (
                                            <div className="msp-card-details animate-in">
                                                {type === 'member' ? (
                                                    <>
                                                        <div className="msp-detail-item">
                                                            <label>Father</label>
                                                            <span>{item.father_name}</span>
                                                        </div>
                                                        <div className="msp-detail-item">
                                                            <label>Mother</label>
                                                            <span>{item.mother_name}</span>
                                                        </div>
                                                        <div className="msp-detail-item">
                                                            <label>House</label>
                                                            <span>
                                                                {item.house_name ||
                                                                    (typeof item.house === 'object' ? item.house?.house_name : item.house)}
                                                            </span>
                                                        </div>
                                                        <div className="msp-detail-item">
                                                            <label>Status</label>
                                                            <span>{item.member_status || item.status}</span>
                                                        </div>
                                                    </>
                                                ) : (
                                                    <>
                                                        <div className="msp-detail-item">
                                                            <label>Area</label>
                                                            <span>
                                                                {item.area_name ||
                                                                    (typeof item.area === 'object' ? item.area?.area_name : item.area)}
                                                            </span>
                                                        </div>
                                                        <div className="msp-detail-item">
                                                            <label>Reference</label>
                                                            <span>{item.house_name_reference}</span>
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            })
                        ) : hasSearched ? (
                            <div className="msp-empty-state">
                                No records found matching your search.
                            </div>
                        ) : (
                            <div className="msp-empty-state">
                                Use the search form above to find {type === 'member' ? 'relatives' : 'houses'}.
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MemberSearchPanel;

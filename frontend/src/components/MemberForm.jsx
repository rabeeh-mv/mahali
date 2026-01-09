import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { FaUser, FaArrowLeft, FaSave, FaTimes, FaSearch, FaUpload } from 'react-icons/fa';
import { memberAPI, houseAPI } from '../api';

const MemberForm = () => {
    const [formData, setFormData] = useState({
        name: '',
        surname: '',
        house: '',
        status: 'live',
        date_of_birth: '',
        date_of_death: '',
        mother_name: '',
        mother_surname: '',
        mother: '',
        father_name: '',
        father_surname: '',
        father: '',
        gender: '',
        married_to_name: '',
        married_to_surname: '',
        married_to: '',
        general_body_member: false,
        adhar: '',
        phone: '',
        whatsapp: '',
        isGuardian: false,
        photo: null
    });

    const [houses, setHouses] = useState([]);
    const [allMembers, setAllMembers] = useState([]);
    const [filteredHouses, setFilteredHouses] = useState([]);
    const [filteredMembers, setFilteredMembers] = useState([]);

    const [showHouseSearch, setShowHouseSearch] = useState(false);
    const [showFatherSearch, setShowFatherSearch] = useState(false);
    const [showMotherSearch, setShowMotherSearch] = useState(false);
    const [showSpouseSearch, setShowSpouseSearch] = useState(false);

    // State for filtering
    const [houseSearchTerm, setHouseSearchTerm] = useState('');
    const [fatherSearchTerm, setFatherSearchTerm] = useState('');
    const [motherSearchTerm, setMotherSearchTerm] = useState('');
    const [spouseSearchTerm, setSpouseSearchTerm] = useState('');

    const [loading, setLoading] = useState(false);
    const [dataLoading, setDataLoading] = useState(false);
    const [error, setError] = useState(null);

    const navigate = useNavigate();
    const { id } = useParams();
    const isEditMode = !!id;

    // Main data loading effect
    useEffect(() => {
        const init = async () => {
            setDataLoading(true);
            setError(null);
            try {
                const [housesRes, membersRes] = await Promise.all([houseAPI.getAll(), memberAPI.getAll()]);

                // Normalize house data - handle both paginated and non-paginated responses
                let houseList = [];
                if (Array.isArray(housesRes.data)) {
                    houseList = housesRes.data;
                } else if (housesRes.data?.results && Array.isArray(housesRes.data.results)) {
                    houseList = housesRes.data.results;
                } else if (housesRes.data?.data && Array.isArray(housesRes.data.data)) {
                    houseList = housesRes.data.data;
                }

                // Normalize member data - handle both paginated and non-paginated responses
                let memberList = [];
                if (Array.isArray(membersRes.data)) {
                    memberList = membersRes.data;
                } else if (membersRes.data?.results && Array.isArray(membersRes.data.results)) {
                    memberList = membersRes.data.results;
                } else if (membersRes.data?.data && Array.isArray(membersRes.data.data)) {
                    memberList = membersRes.data.data;
                }

                setHouses(houseList);
                setFilteredHouses(houseList);
                setAllMembers(memberList);
                setFilteredMembers(memberList);

                if (isEditMode) {
                    try {
                        const memberRes = await memberAPI.get(id);
                        if (memberRes.data) {
                            mapMemberToForm(memberRes.data, houseList, memberList);
                        }
                    } catch (fetchErr) {
                        console.warn("Direct fetch failed, trying list...", fetchErr);
                        const member = memberList.find(m => m.member_id.toString() === id);
                        if (member) mapMemberToForm(member, houseList, memberList);
                        else setError("Failed to load member details.");
                    }
                }
            } catch (err) {
                console.error(err);
                setError("Failed to load initial data");
            } finally {
                setDataLoading(false);
            }
        };
        init();
    }, [id]);

    const mapMemberToForm = (data, houseList, memberList) => {
        const hId = data.house?.home_id || data.house?.id || data.house || '';
        const fId = data.father?.member_id || data.father?.id || data.father || '';
        const mId = data.mother?.member_id || data.mother?.id || data.mother || '';
        const sId = data.married_to?.member_id || data.married_to?.id || data.married_to || '';

        setFormData({
            name: data.name || '',
            surname: data.surname || data.sur_name || '',
            house: hId,
            status: data.status || data.member_status || 'live',
            date_of_birth: data.date_of_birth || '',
            date_of_death: data.date_of_death || '',
            mother_name: data.mother_name || '',
            mother_surname: data.mother_surname || '',
            mother: mId,
            father_name: data.father_name || '',
            father_surname: data.father_surname || '',
            father: fId,
            gender: data.gender || '',
            married_to_name: data.married_to_name || '',
            married_to_surname: data.married_to_surname || '',
            married_to: sId,
            general_body_member: data.general_body_member || false,
            adhar: data.adhar || '',
            phone: data.phone || '',
            whatsapp: data.whatsapp || '',
            isGuardian: data.isGuardian || data.isguardian || data.is_guardian || false,
            photo: null
        });

        // Set search terms (input text) for display
        if (hId) {
            const h = houseList.find(h => h.home_id === hId);
            if (h) setHouseSearchTerm(`${h.home_id} - ${h.house_name}`);
        }
        if (fId) {
            const f = memberList.find(m => m.member_id === fId);
            if (f) setFatherSearchTerm(`${f.member_id} - ${f.name} ${f.surname || ''}`);
        }
        if (mId) {
            const m = memberList.find(m => m.member_id === mId);
            if (m) setMotherSearchTerm(`${m.member_id} - ${m.name} ${m.surname || ''}`);
        }
        if (sId) {
            const s = memberList.find(m => m.member_id === sId);
            if (s) setSpouseSearchTerm(`${s.member_id} - ${s.name} ${s.surname || ''}`);
        }
    };

    const handleHouseSearch = (term) => {
        setHouseSearchTerm(term);
        if (!term.trim()) {
            setFilteredHouses(Array.isArray(houses) ? houses : []);
            setFormData(prev => ({ ...prev, house: '' }));
        } else {
            // Defensive check: ensure houses is an array before filtering
            if (Array.isArray(houses)) {
                const filtered = houses.filter(house =>
                    house.house_name?.toLowerCase().includes(term.toLowerCase()) ||
                    house.home_id?.toString().includes(term.toLowerCase())
                );
                setFilteredHouses(filtered);
            } else {
                setFilteredHouses([]);
            }
        }
        setShowHouseSearch(true);
    };

    const handleFatherSearch = (term) => {
        setFatherSearchTerm(term);
        if (!term.trim()) {
            setFilteredMembers(Array.isArray(allMembers) ? allMembers : []);
            setFormData(prev => ({ ...prev, father: '' }));
        } else {
            filterMembers(term, setFilteredMembers);
        }
        setShowFatherSearch(true);
    };

    const handleMotherSearch = (term) => {
        setMotherSearchTerm(term);
        if (!term.trim()) {
            setFilteredMembers(Array.isArray(allMembers) ? allMembers : []);
            setFormData(prev => ({ ...prev, mother: '' }));
        } else {
            filterMembers(term, setFilteredMembers);
        }
        setShowMotherSearch(true);
    };

    const handleSpouseSearch = (term) => {
        setSpouseSearchTerm(term);
        if (!term.trim()) {
            setFilteredMembers(Array.isArray(allMembers) ? allMembers : []);
            setFormData(prev => ({ ...prev, married_to: '' }));
        } else {
            filterMembers(term, setFilteredMembers);
        }
        setShowSpouseSearch(true);
    };

    const filterMembers = (term, setter) => {
        // Defensive check: ensure allMembers is an array before filtering
        if (!Array.isArray(allMembers)) {
            setter([]);
            return;
        }

        const filtered = allMembers.filter(member =>
            member.name?.toLowerCase().includes(term.toLowerCase()) ||
            member.surname?.toLowerCase().includes(term.toLowerCase()) ||
            member.member_id?.toString().includes(term.toLowerCase())
        );
        setter(filtered);
    };

    const selectHouse = (house) => {
        setFormData(prev => ({ ...prev, house: house.home_id }));
        setHouseSearchTerm(`${house.home_id} - ${house.house_name}`);
        setShowHouseSearch(false);
    };

    const selectFather = (member) => {
        setFormData(prev => ({
            ...prev,
            father: member.member_id,
            father_name: member.name || '',
            father_surname: member.surname || ''
        }));
        setFatherSearchTerm(`${member.member_id} - ${member.name} ${member.surname || ''}`);
        setShowFatherSearch(false);
    };

    const selectMother = (member) => {
        setFormData(prev => ({
            ...prev,
            mother: member.member_id,
            mother_name: member.name || '',
            mother_surname: member.surname || ''
        }));
        setMotherSearchTerm(`${member.member_id} - ${member.name} ${member.surname || ''}`);
        setShowMotherSearch(false);
    };

    const selectSpouse = (member) => {
        setFormData(prev => ({
            ...prev,
            married_to: member.member_id,
            married_to_name: member.name || '',
            married_to_surname: member.surname || ''
        }));
        setSpouseSearchTerm(`${member.member_id} - ${member.name} ${member.surname || ''}`);
        setShowSpouseSearch(false);
    };

    const handlePhotoChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            setFormData(prev => ({ ...prev, photo: e.target.files[0] }));
        }
    };

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const submitData = { ...formData };

            if (submitData.status !== 'dead') {
                delete submitData.date_of_death;
            }
            if (!submitData.photo) delete submitData.photo;
            if (!submitData.father) delete submitData.father;
            if (!submitData.mother) delete submitData.mother;
            if (!submitData.house) delete submitData.house;
            if (!submitData.married_to) delete submitData.married_to;

            // Log the data being sent for debugging
            console.log('Submitting member data:', submitData);

            if (isEditMode) {
                await memberAPI.update(id, submitData);
            } else {
                await memberAPI.create(submitData);
            }
            navigate('/members');
        } catch (err) {
            // Enhanced error logging
            console.error('Member save error:', err);
            console.error('Error response:', err.response?.data);

            // Try to extract meaningful error message
            let errorMessage = 'Failed to save member';
            if (err.response?.data) {
                if (typeof err.response.data === 'string') {
                    errorMessage = err.response.data;
                } else if (err.response.data.detail) {
                    errorMessage = err.response.data.detail;
                } else if (err.response.data.message) {
                    errorMessage = err.response.data.message;
                } else {
                    // Show field-specific errors
                    const errors = Object.entries(err.response.data)
                        .map(([field, msgs]) => `${field}: ${Array.isArray(msgs) ? msgs.join(', ') : msgs}`)
                        .join('; ');
                    if (errors) errorMessage = errors;
                }
            } else if (err.message) {
                errorMessage = err.message;
            }

            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    if (dataLoading) {
        return (
            <div className="data-section">
                <div className="loading-container">
                    <div className="spinner"></div>
                    <p>Loading member data...</p>
                </div>
            </div>
        );
    }

    // Dropdown results sub-component
    const DropdownResults = ({ results, onSelect, type, show }) => {
        if (!show) return null;
        return (
            <div className="inline-dropdown-results animate-in">
                {results.length > 0 ? results.map(item => (
                    <div key={item.home_id || item.member_id} className="dropdown-item" onClick={() => onSelect(item)}>
                        <div className="item-name">
                            {type === 'house'
                                ? `${item.home_id} - ${item.house_name}`
                                : `${item.member_id} - ${item.name} ${item.surname || ''}`
                            }
                        </div>
                    </div>
                )) : <div className="no-results-item">No records found</div>}
            </div>
        );
    };

    return (
        <div className="data-section animate-in member-form-container">
            <div className="section-header">
                <div className="header-content-wrapper">
                    <button onClick={() => navigate('/members')} className="back-btn">
                        <FaArrowLeft />
                    </button>
                    <h2>
                        <div className="header-icon-wrapper">
                            <FaUser />
                        </div>
                        {isEditMode ? 'Edit Member' : 'Add New Member'}
                    </h2>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="edit-form responsive-form" onClick={(e) => {
                // Closer dropdowns on click outside (simplified)
                if (!e.target.closest('.searchable-input-wrapper')) {
                    setShowHouseSearch(false);
                    setShowFatherSearch(false);
                    setShowMotherSearch(false);
                    setShowSpouseSearch(false);
                }
            }}>
                {/* 1. Personal Information */}
                <div className="form-section-card">
                    <h3 className="form-section-title">Personal Information</h3>
                    <div className="form-grid">
                        <div className="input-wrapper">
                            <label htmlFor="name">Full Name *</label>
                            <input type="text" id="name" name="name" value={formData.name} onChange={handleChange} required disabled={loading} className='form-input' placeholder="Enter full name" />
                        </div>
                        <div className="input-wrapper">
                            <label htmlFor="surname">Surname</label>
                            <input type="text" id="surname" name="surname" value={formData.surname} onChange={handleChange} disabled={loading} className='form-input' placeholder="Enter surname (optional)" />
                        </div>
                        <div className="input-wrapper">
                            <label htmlFor="gender">Gender *</label>
                            <select id="gender" name="gender" value={formData.gender} onChange={handleChange} required className='form-input' disabled={loading}>
                                <option value="">Select Gender</option>
                                <option value="male">Male</option>
                                <option value="female">Female</option>
                                <option value="other">Other</option>
                            </select>
                        </div>
                        <div className="input-wrapper">
                            <label htmlFor="date_of_birth">Date of Birth *</label>
                            <input type="date" id="date_of_birth" name="date_of_birth" value={formData.date_of_birth} onChange={handleChange} required className='form-input' disabled={loading} />
                        </div>
                        <div className="input-wrapper">
                            <label htmlFor="status">Status *</label>
                            <select id="status" name="status" value={formData.status} onChange={handleChange} required className='form-input' disabled={loading}>
                                <option value="live">Live</option>
                                <option value="dead">Dead</option>
                                <option value="terminated">Terminated</option>
                            </select>
                        </div>
                        {formData.status === 'dead' && (
                            <div className="input-wrapper">
                                <label htmlFor="date_of_death">Date of Death</label>
                                <input type="date" id="date_of_death" name="date_of_death" value={formData.date_of_death} onChange={handleChange} className='form-input' disabled={loading} />
                            </div>
                        )}
                        <div className="input-wrapper full-width">
                            <label htmlFor="photo">Photo (Optional)</label>
                            <div className="photo-upload-container">
                                <input type="file" id="photo" accept="image/*" onChange={handlePhotoChange} disabled={loading} className='form-input' style={{ display: 'none' }} />
                                <label htmlFor="photo" className="btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                                    <FaUpload /> {formData.photo ? 'Change Photo' : 'Choose Photo'}
                                </label>
                                {formData.photo && <span className="badge-primary" style={{ marginLeft: '12px' }}>{formData.photo.name}</span>}
                            </div>
                        </div>
                    </div>
                </div>

                {/* 2. Contact & Identity */}
                <div className="form-section-card">
                    <h3 className="form-section-title">Contact & Identity</h3>
                    <div className="form-grid">
                        <div className="input-wrapper">
                            <label htmlFor="adhar">Aadhar Number</label>
                            <input type="text" id="adhar" name="adhar" value={formData.adhar} onChange={handleChange} disabled={loading} className='form-input' placeholder="Last 4 digits of Aadhar" maxLength="4" />
                        </div>
                        <div className="input-wrapper">
                            <label htmlFor="phone">Phone Number</label>
                            <input type="tel" id="phone" name="phone" value={formData.phone} onChange={handleChange} disabled={loading} className='form-input' placeholder="Phone number" />
                        </div>
                        <div className="input-wrapper">
                            <label htmlFor="whatsapp">WhatsApp Number</label>
                            <input type="tel" id="whatsapp" name="whatsapp" value={formData.whatsapp} onChange={handleChange} disabled={loading} className='form-input' placeholder="WhatsApp number" />
                        </div>
                        <div className="input-wrapper searchable-input-wrapper">
                            <label>House</label>
                            <div className="search-input-container">
                                <input type="text" value={houseSearchTerm} onChange={(e) => handleHouseSearch(e.target.value)} onFocus={() => setShowHouseSearch(true)} placeholder="Search by name or ID..." className="form-input" />
                                <FaSearch className="search-field-icon" />
                                <DropdownResults results={filteredHouses} onSelect={selectHouse} type="house" show={showHouseSearch} />
                            </div>
                        </div>
                    </div>

                    <div className="checkbox-section">
                        <label className="checkbox-label">
                            <input type="checkbox" name="isGuardian" checked={formData.isGuardian} onChange={handleChange} disabled={loading} />
                            <span>Is Guardian of the Family</span>
                        </label>
                        <label className="checkbox-label">
                            <input type="checkbox" name="general_body_member" checked={formData.general_body_member} onChange={handleChange} disabled={loading} />
                            <span>General Body Member</span>
                        </label>
                    </div>
                </div>

                {/* 3. Family & Relations */}
                <div className="form-section-card">
                    <h3 className="form-section-title">Family & Relations</h3>
                    <div className="form-grid">
                        <div className="input-wrapper">
                            <label htmlFor="father_name">Father's Name</label>
                            <input type="text" id="father_name" name="father_name" value={formData.father_name} onChange={handleChange} className='form-input' disabled={loading} placeholder="Father's first name" />
                        </div>
                        <div className="input-wrapper">
                            <label htmlFor="father_surname">Father's Surname</label>
                            <input type="text" id="father_surname" name="father_surname" value={formData.father_surname} onChange={handleChange} disabled={loading} className='form-input' placeholder="Father's surname" />
                        </div>
                        <div className="input-wrapper full-width searchable-input-wrapper">
                            <label>Link to Father (Optional)</label>
                            <div className="search-input-container">
                                <input type="text" value={fatherSearchTerm} onChange={(e) => handleFatherSearch(e.target.value)} onFocus={() => setShowFatherSearch(true)} placeholder="Search father by name or ID..." className="form-input" />
                                <FaSearch className="search-field-icon" />
                                <DropdownResults results={filteredMembers} onSelect={selectFather} type="member" show={showFatherSearch} />
                            </div>
                        </div>

                        <div className="input-wrapper">
                            <label htmlFor="mother_name">Mother's Name</label>
                            <input type="text" id="mother_name" name="mother_name" value={formData.mother_name} onChange={handleChange} disabled={loading} className='form-input' placeholder="Mother's first name" />
                        </div>
                        <div className="input-wrapper">
                            <label htmlFor="mother_surname">Mother's Surname</label>
                            <input type="text" id="mother_surname" name="mother_surname" value={formData.mother_surname} onChange={handleChange} disabled={loading} className='form-input' placeholder="Mother's surname" />
                        </div>
                        <div className="input-wrapper full-width searchable-input-wrapper">
                            <label>Link to Mother (Optional)</label>
                            <div className="search-input-container">
                                <input type="text" value={motherSearchTerm} onChange={(e) => handleMotherSearch(e.target.value)} onFocus={() => setShowMotherSearch(true)} placeholder="Search mother by name or ID..." className="form-input" />
                                <FaSearch className="search-field-icon" />
                                <DropdownResults results={filteredMembers} onSelect={selectMother} type="member" show={showMotherSearch} />
                            </div>
                        </div>
                    </div>
                </div>

                {/* 4. Marriage Information */}
                <div className="form-section-card marriage-section-highlight">
                    <h3 className="form-section-title">Marriage Information</h3>
                    <div className="form-grid">
                        <div className="input-wrapper">
                            <label htmlFor="married_to_name">Spouse's Name</label>
                            <input type="text" id="married_to_name" name="married_to_name" value={formData.married_to_name} onChange={handleChange} disabled={loading} className='form-input' placeholder="Spouse's first name" />
                        </div>
                        <div className="input-wrapper">
                            <label htmlFor="married_to_surname">Spouse's Surname</label>
                            <input type="text" id="married_to_surname" name="married_to_surname" value={formData.married_to_surname} onChange={handleChange} disabled={loading} className='form-input' placeholder="Spouse's surname" />
                        </div>
                        <div className="input-wrapper full-width searchable-input-wrapper">
                            <label>Link to Spouse (Optional)</label>
                            <div className="search-input-container">
                                <input type="text" value={spouseSearchTerm} onChange={(e) => handleSpouseSearch(e.target.value)} onFocus={() => setShowSpouseSearch(true)} placeholder="Search spouse by name or ID..." className="form-input" />
                                <FaSearch className="search-field-icon" />
                                <DropdownResults results={filteredMembers} onSelect={selectSpouse} type="member" show={showSpouseSearch} />
                            </div>
                        </div>
                    </div>
                </div>

                {error && <div className="status-banner error">{error}</div>}

                <div className="form-actions">
                    <button type="button" className="btn-secondary" onClick={() => navigate('/members')} disabled={loading}>
                        <FaTimes /> Cancel
                    </button>
                    <button type="submit" className="btn-primary" disabled={loading}>
                        {loading ? <>Saving...</> : <><FaSave /> {isEditMode ? 'Update Member' : 'Create Member'}</>}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default MemberForm;

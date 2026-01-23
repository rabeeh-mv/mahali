import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { FaUser, FaArrowLeft, FaSave, FaTimes, FaSearch, FaUpload, FaTrash } from 'react-icons/fa';
import { memberAPI, houseAPI } from '../api';
import { compressImage } from '../utils/imageUtils';
import MemberSearchPanel from './MemberSearchPanel';
import './MemberForm.css';

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

    // Search Panel State
    const [searchPanel, setSearchPanel] = useState({
        isOpen: false,
        type: 'member', // 'member' or 'house'
        onSelect: () => { },
        initialValues: {}
    });

    // Display strings for connected entities
    const [houseDisplay, setHouseDisplay] = useState('');
    const [fatherDisplay, setFatherDisplay] = useState('');
    const [motherDisplay, setMotherDisplay] = useState('');
    const [spouseDisplay, setSpouseDisplay] = useState('');
    const [previewImage, setPreviewImage] = useState(null);

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
                // Only load houses initially, not all members
                const housesRes = await houseAPI.getAll();

                // Normalize house data - handle both paginated and non-paginated responses
                let houseList = [];
                if (Array.isArray(housesRes.data)) {
                    houseList = housesRes.data;
                } else if (housesRes.data?.results && Array.isArray(housesRes.data.results)) {
                    houseList = housesRes.data.results;
                } else if (housesRes.data?.data && Array.isArray(housesRes.data.data)) {
                    houseList = housesRes.data.data;
                }

                setHouses(houseList);

                if (isEditMode) {
                    try {
                        const memberRes = await memberAPI.get(id);
                        if (memberRes.data) {
                            mapMemberToForm(memberRes.data, houseList);
                        }
                    } catch (fetchErr) {
                        console.error("Failed to load member details.", fetchErr);
                        setError("Failed to load member details.");
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

    const mapMemberToForm = async (data, houseList) => {
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
            isGuardian: data.isGuardian || data.isguardian || data.is_guardian || false,
            photo: null // We keep photo null initially to represent NO NEW FILE
        });

        // If member has a photo, set it for preview
        if (data.photo) {
            setPreviewImage(data.photo);
        }

        // Set display strings
        if (hId) {
            const h = houseList.find(h => h.home_id === hId);
            if (h) setHouseDisplay(`${h.home_id} - ${h.house_name}`);
            else setHouseDisplay(hId);
        }

        // Fetch related members details if we only have IDs (or partial data)
        const fetchAndSetName = async (memId, setter) => {
            if (!memId) return;
            try {
                // It might already be an object or we might need to fetch
                if (typeof memId === 'object') {
                    setter(`${memId.member_id} - ${memId.name} ${memId.surname || ''}`);
                    return;
                }
                const res = await memberAPI.get(memId);
                const m = res.data;
                setter(`${m.member_id} - ${m.name} ${m.surname || ''}`);
            } catch (e) {
                console.log("Could not load relation name", e);
                setter(memId);
            }
        }

        fetchAndSetName(fId, setFatherDisplay);
        fetchAndSetName(mId, setMotherDisplay);
        fetchAndSetName(sId, setSpouseDisplay);
    };

    const handleOpenSearchInfo = (type) => {
        let initialValues = {};
        let onSelect = null;

        if (type === 'house') {
            initialValues = { house_name: '', home_id: '' }; // Could pre-fill if needed
            onSelect = (house) => {
                setFormData(prev => ({ ...prev, house: house.home_id }));
                setHouseDisplay(`${house.home_id} - ${house.house_name}`);
            };
        } else if (type === 'father') {
            initialValues = { name: formData.father_name, surname: formData.father_surname };
            onSelect = (member) => {
                setFormData(prev => ({
                    ...prev,
                    father: member.member_id,
                    father_name: member.name || '',
                    father_surname: member.surname || ''
                }));
                setFatherDisplay(`${member.member_id} - ${member.name} ${member.surname || ''}`);
            };
        } else if (type === 'mother') {
            initialValues = { name: formData.mother_name, surname: formData.mother_surname };
            onSelect = (member) => {
                setFormData(prev => ({
                    ...prev,
                    mother: member.member_id,
                    mother_name: member.name || '',
                    mother_surname: member.surname || ''
                }));
                setMotherDisplay(`${member.member_id} - ${member.name} ${member.surname || ''}`);
            };
        } else if (type === 'spouse') {
            initialValues = { name: formData.married_to_name, surname: formData.married_to_surname };
            onSelect = (member) => {
                setFormData(prev => ({
                    ...prev,
                    married_to: member.member_id,
                    married_to_name: member.name || '',
                    married_to_surname: member.surname || ''
                }));
                setSpouseDisplay(`${member.member_id} - ${member.name} ${member.surname || ''}`);
            };
        }


        setSearchPanel({
            isOpen: true,
            type: type === 'house' ? 'house' : 'member',
            onSelect,
            initialValues
        });
    };

    const handlePhotoChange = async (e) => {
        if (e.target.files && e.target.files[0]) {
            const originalFile = e.target.files[0];
            try {
                // Compress image if needed (max 1MB)
                const compressedFile = await compressImage(originalFile, 1);
                setFormData(prev => ({ ...prev, photo: compressedFile }));

                // Create preview URL
                const objectUrl = URL.createObjectURL(compressedFile);
                setPreviewImage(objectUrl);
            } catch (err) {
                console.error("Image compression failed", err);
                // Fallback to original
                setFormData(prev => ({ ...prev, photo: originalFile }));
                setPreviewImage(URL.createObjectURL(originalFile));
            }
        }
    };

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleRemovePhoto = () => {
        setFormData(prev => ({ ...prev, photo: null }));
        setPreviewImage(null);
        // If editing, we might need a flag to tell backend to remove specifically?
        // DRF typically clears if 'photo' is sent as null or empty string depending on configuration.
        // For now, setting to null. If problematic, we can use a separate flag.
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const submitData = new FormData();

            // Append all simple text fields
            Object.keys(formData).forEach(key => {
                if (key === 'photo') return; // Handle photo separately

                let value = formData[key];

                // Skip if value is null or undefined (except specific fields if needed)
                if (value === null || value === undefined) return;

                // Specific handling for dates / booleans / connections
                if (key === 'date_of_death' && formData.status !== 'dead') return;

                // Clear out connections if not set
                if ((key === 'father' || key === 'mother' || key === 'house' || key === 'married_to') && !value) {
                    // For FormData, sending empty string usually works for clearing in DRF if allow_null/blank is True
                    submitData.append(key, '');
                    return;
                }

                submitData.append(key, value);
            });

            // Handle Photo
            // Handle Photo
            // Logic:
            // 1. If formData.photo is a File -> User selected new photo -> Send it.
            // 2. If formData.photo is null AND previewImage is null -> User removed photo (or never had one) -> Send empty string to clear.
            // 3. If formData.photo is null BUT previewImage exists -> "No Change" (keep existing) -> Do NOT send 'photo' key.

            if (formData.photo instanceof File) {
                // New photo uploaded
                submitData.append('photo', formData.photo);
            } else if (!previewImage) {
                // Photo removed or cleared
                // We send an empty string. DRF should interpret this as clearing the field if configured correctly.
                // If this causes validation error (e.g., "The submitted data was not a file"), 
                // we might need to change backend to allow_null=True or allow_empty_file=True,
                // or handle 'null' string specifically. But often empty string works for optional ImageField in multipart.
                submitData.append('photo', '');
            } else {
                // Existing photo preserved (do nothing)
                console.log('Preserving existing photo');
            }

            // Log for debugging (FormData cannot be logged directly easily)
            console.log('Submitting member data (FormData)');

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
                        .map(([field, msgs]) => `${field}: ${Array.isArray(msgs) ? msgs.join(', ') : msgs} `)
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



    return (
        <div className="data-section animate-in member-form-container">
            <MemberSearchPanel
                isOpen={searchPanel.isOpen}
                onClose={() => setSearchPanel(prev => ({ ...prev, isOpen: false }))}
                onSelect={searchPanel.onSelect}
                type={searchPanel.type}
                initialValues={searchPanel.initialValues}
            />

            <form onSubmit={handleSubmit} className="edit-form responsive-form">
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
                                <input
                                    type="file"
                                    id="photo"
                                    accept="image/*"
                                    onChange={handlePhotoChange}
                                    disabled={loading}
                                    className='form-input'
                                    style={{ display: 'none' }}
                                />

                                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                    <label htmlFor="photo" className="btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                                        <FaUpload /> {formData.photo || previewImage ? 'Change Photo' : 'Choose Photo'}
                                    </label>

                                    {(previewImage || formData.photo) && (
                                        <div className="preview-container" style={{ position: 'relative', width: '50px', height: '50px' }}>
                                            <img
                                                src={previewImage || (typeof formData.photo === 'string' ? formData.photo : URL.createObjectURL(formData.photo))}
                                                alt="Preview"
                                                style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%', border: '2px solid var(--primary, #6366f1)' }}
                                            />
                                        </div>
                                    )}

                                    {(formData.photo || previewImage) && (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <span className="badge-primary">
                                                {formData.photo instanceof File ? formData.photo.name : 'Current Photo'}
                                            </span>
                                            <button
                                                type="button"
                                                onClick={handleRemovePhoto}
                                                className="delete-btn"
                                                title="Remove Photo"
                                                style={{ padding: '4px 8px', fontSize: '0.8rem' }}
                                            >
                                                <FaTrash />
                                            </button>
                                        </div>
                                    )}
                                </div>
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
                        <div className="input-wrapper full-width">
                            <label>House</label>
                            <div className="combined-input-group">
                                <input
                                    type="text"
                                    value={houseDisplay}
                                    readOnly
                                    placeholder="No house linked"
                                    className="form-input"
                                />
                                <button
                                    type="button"
                                    className="connect-btn"
                                    onClick={() => handleOpenSearchInfo('house')}
                                >
                                    <FaSearch /> Connect House
                                </button>
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
                        <div className="input-wrapper full-width">
                            <label>Link to Father</label>
                            <div className="combined-input-group">
                                <input
                                    type="text"
                                    value={fatherDisplay}
                                    readOnly
                                    placeholder="No father linked"
                                    className="form-input"
                                />
                                <button
                                    type="button"
                                    className="connect-btn"
                                    onClick={() => handleOpenSearchInfo('father')}
                                >
                                    <FaSearch /> Connect Father
                                </button>
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
                        <div className="input-wrapper full-width">
                            <label>Link to Mother</label>
                            <div className="combined-input-group">
                                <input
                                    type="text"
                                    value={motherDisplay}
                                    readOnly
                                    placeholder="No mother linked"
                                    className="form-input"
                                />
                                <button
                                    type="button"
                                    className="connect-btn"
                                    onClick={() => handleOpenSearchInfo('mother')}
                                >
                                    <FaSearch /> Connect Mother
                                </button>
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
                        <div className="input-wrapper full-width">
                            <label>Link to Spouse</label>
                            <div className="combined-input-group">
                                <input
                                    type="text"
                                    value={spouseDisplay}
                                    readOnly
                                    placeholder="No spouse linked"
                                    className="form-input"
                                />
                                <button
                                    type="button"
                                    className="connect-btn"
                                    onClick={() => handleOpenSearchInfo('spouse')}
                                >
                                    <FaSearch /> Connect Spouse
                                </button>
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

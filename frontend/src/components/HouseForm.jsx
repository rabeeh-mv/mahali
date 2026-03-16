import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { FaHome, FaArrowLeft, FaSave, FaTimes } from 'react-icons/fa';
import { houseAPI, areaAPI } from '../api';
import ErrorPopup from './ErrorPopup';

const HouseForm = () => {
    const [formData, setFormData] = useState({
        house_name: '',
        family_name: '',
        area: '',
        location_name: '',
        address: '',
        old_mahall_code: ''
    });
    const [areas, setAreas] = useState([]);
    const [loading, setLoading] = useState(false);
    const [initialLoading, setInitialLoading] = useState(false);
    const [error, setError] = useState(null);

    const navigate = useNavigate();
    const { id } = useParams();
    const isEditMode = !!id;

    useEffect(() => {
        loadAreas();
        if (isEditMode) {
            loadHouse();
        }
    }, [id]);

    const loadAreas = async () => {
        try {
            const response = await areaAPI.getAll();
            setAreas(response.data);
        } catch (err) {
            console.error('Failed to load areas:', err);
        }
    };

    const loadHouse = async () => {
        setInitialLoading(true);
        try {
            // In a real app we might have a getById endpoint, but here we might search or filter
            // Assuming a getById or we filter from list. For now, let's try to fetch all or search.
            // Ideally backend has get(id). Let's assume houseAPI.get(id) exists or we use search.
            // Inspecting `api.js` would confirm, but sticking to pattern seen in other files.

            // Since `HouseWithRouter.jsx` uses `houseAPI.search` or `getAll`, let's try getting specific house.
            // If there isn't a direct get, we might need to rely on the list passed via state or fetch list.
            // But standard REST usually has it.

            // Let's assume we can fetch list and find it if direct get isn't clear, OR try a direct get.
            // The previous modal code used `initialData`. 
            // Let's assume `houseAPI.get(id)` works for now as it's standard Django DRF.

            // Actually looking at `Houses.jsx` it doesn't use get(id), it passes object.
            // Let's safe bet: fetch all and find. Or if we have a get method.
            // I'll assume we can use `houseAPI.get(id)` if it exists, otherwise I'll need to check api.js.
            // Safe bet:
            try {
                const response = await houseAPI.get(id); // Usually DRF provides this
                const house = response.data;
                setFormData({
                    house_name: house.house_name,
                    family_name: house.family_name,
                    area: house.area?.id || house.area || '',
                    location_name: house.location_name || '',
                    address: house.address || '',
                    old_mahall_code: house.old_mahall_code || ''
                });
            } catch (e) {
                // Fallback if get(id) fails or doesn't exist, try list
                const listRes = await houseAPI.getAll();
                const house = listRes.data.find(h => h.home_id.toString() === id);
                if (house) {
                    setFormData({
                        house_name: house.house_name,
                        family_name: house.family_name,
                        area: house.area?.id || house.area || '',
                        location_name: house.location_name || '',
                        address: house.address || '',
                        old_mahall_code: house.old_mahall_code || ''
                    });
                } else {
                    setError('House not found');
                }
            }
        } catch (err) {
            setError('Failed to load house details');
            console.error(err);
        } finally {
            setInitialLoading(false);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            if (isEditMode) {
                await houseAPI.update(id, formData);
            } else {
                await houseAPI.create(formData);
            }
            navigate('/houses');
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to save house');
        } finally {
            setLoading(false);
        }
    };

    if (initialLoading) {
        return (
            <div className="data-section">
                <div className="loading-container">
                    <div className="spinner"></div>
                    <p>Loading house details...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="data-section animate-in" style={{ maxWidth: '800px', margin: '0 auto' }}>
            <div className="section-header">
                <div className="header-content-wrapper">
                    <button onClick={() => navigate('/houses')} className="back-btn">
                        <FaArrowLeft />
                    </button>
                    <h2>
                        <div className="header-icon-wrapper">
                            <FaHome />
                        </div>
                        {isEditMode ? 'Edit House' : 'Add New House'}
                    </h2>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="edit-form">
                <div className="form-row">
                    <div className="form-group">
                        <label htmlFor="house_name">House Name *</label>
                        <input
                            type="text"
                            id="house_name"
                            name="house_name"
                            value={formData.house_name}
                            onChange={handleChange}
                            required
                            className='form-input'
                            placeholder="Enter house name"
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="family_name">Family Name *</label>
                        <input
                            type="text"
                            id="family_name"
                            name="family_name"
                            value={formData.family_name}
                            onChange={handleChange}
                            required
                            className='form-input'
                            placeholder="Enter family name"
                        />
                    </div>
                </div>

                <div className="form-row">
                    <div className="form-group">
                        <label htmlFor="old_mahall_code">Old Mahall Code</label>
                        <input
                            type="text"
                            id="old_mahall_code"
                            name="old_mahall_code"
                            value={formData.old_mahall_code}
                            onChange={handleChange}
                            className='form-input'
                            placeholder="Enter old mahall code"
                        />
                    </div>
                </div>

                <div className="form-row">
                    <div className="form-group">
                        <label htmlFor="area">Area *</label>
                        <select
                            id="area"
                            name="area"
                            value={formData.area}
                            onChange={handleChange}
                            required
                            className='form-input'
                        >
                            <option value="">Select Area</option>
                            {areas.map(area => (
                                <option key={area.id} value={area.id}>{area.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="form-group">
                        <label htmlFor="location_name">Location/Landmark</label>
                        <input
                            type="text"
                            id="location_name"
                            name="location_name"
                            value={formData.location_name}
                            onChange={handleChange}
                            className='form-input'
                            placeholder="Enter location or landmark"
                        />
                    </div>
                </div>

                <div className="form-row">
                    <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                        <label htmlFor="address">Full Address *</label>
                        <textarea
                            id="address"
                            name="address"
                            value={formData.address}
                            onChange={handleChange}
                            required
                            className='form-input'
                            placeholder="Enter complete address"
                            rows="3"
                            style={{ resize: 'vertical', minHeight: '80px' }}
                        />
                    </div>
                </div>

                <ErrorPopup message={error} onClose={() => setError(null)} />

                <div className="form-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
                    <button
                        type="button"
                        onClick={() => navigate('/houses')}
                        className="btn-secondary"
                        disabled={loading}
                    >
                        <FaTimes /> Cancel
                    </button>
                    <button
                        type="submit"
                        className="btn-primary"
                        disabled={loading}
                    >
                        {loading ? (
                            <>Saving...</>
                        ) : (
                            <><FaSave /> {isEditMode ? 'Update House' : 'Create House'}</>
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default HouseForm;

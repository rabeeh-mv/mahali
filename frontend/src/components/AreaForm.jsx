import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { FaMapMarkerAlt, FaArrowLeft, FaSave, FaTimes } from 'react-icons/fa';
import { areaAPI } from '../api';

const AreaForm = () => {
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        head_person: '',
        password: ''
    });
    const [loading, setLoading] = useState(false);
    const [initialLoading, setInitialLoading] = useState(false);
    const [error, setError] = useState(null);

    const navigate = useNavigate();
    const { id } = useParams();
    const isEditMode = !!id;

    useEffect(() => {
        if (isEditMode) {
            loadArea();
        }
    }, [id]);

    const loadArea = async () => {
        setInitialLoading(true);
        try {
            const response = await areaAPI.getAll();
            const area = response.data.find(a => a.id.toString() === id);
            if (area) {
                setFormData({
                    name: area.name,
                    description: area.description || '',
                    head_person: area.head_person || '',
                    password: area.password || ''
                });
            } else {
                setError('Area not found');
            }
        } catch (err) {
            setError('Failed to load area details');
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
                await areaAPI.update(id, formData);
            } else {
                await areaAPI.create(formData);
            }
            navigate('/areas');
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to save area');
        } finally {
            setLoading(false);
        }
    };

    if (initialLoading) {
        return (
            <div className="data-section">
                <div className="loading-container">
                    <div className="spinner"></div>
                    <p>Loading area details...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="data-section animate-in" style={{ maxWidth: '800px', margin: '0 auto' }}>
            <div className="section-header">
                <div className="header-content-wrapper">
                    <button onClick={() => navigate('/areas')} className="back-btn">
                        <FaArrowLeft />
                    </button>
                    <h2>
                        <div className="header-icon-wrapper">
                            <FaMapMarkerAlt />
                        </div>
                        {isEditMode ? 'Edit Area' : 'Add New Area'}
                    </h2>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="edit-form">
                <div className="form-group">
                    <label htmlFor="name">Area Name *</label>
                    <input
                        type="text"
                        id="name"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        required
                        placeholder="Enter area name"
                        className="form-input"
                    />
                </div>

                <div className="form-group">
                    <label htmlFor="description">Description</label>
                    <textarea
                        id="description"
                        name="description"
                        value={formData.description}
                        onChange={handleChange}
                        placeholder="Enter area description (optional)"
                        rows="3"
                        className="form-input"
                    />
                </div>

                <div className="form-group">
                    <label htmlFor="head_person">Head Person</label>
                    <input
                        type="text"
                        id="head_person"
                        name="head_person"
                        value={formData.head_person}
                        onChange={handleChange}
                        placeholder="Enter head person name"
                        className="form-input"
                    />
                </div>

                <div className="form-group">
                    <label htmlFor="password">Password</label>
                    <input
                        type="password"
                        id="password"
                        name="password"
                        value={formData.password}
                        onChange={handleChange}
                        placeholder="Enter area password"
                        className="form-input"
                    />
                </div>

                {error && (
                    <div className="status-banner error">
                        {error}
                    </div>
                )}

                <div className="form-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
                    <button
                        type="button"
                        onClick={() => navigate('/areas')}
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
                            <><FaSave /> {isEditMode ? 'Update Area' : 'Create Area'}</>
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default AreaForm;

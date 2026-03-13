import React from 'react';
import { FaExclamationTriangle, FaTimes } from 'react-icons/fa';
import './ErrorPopup.css';

const ErrorPopup = ({ message, onClose }) => {
    if (!message) return null;

    return (
        <div className="error-popup-overlay">
            <div className="error-popup-dialog animate-in">
                <div className="error-popup-header">
                    <FaExclamationTriangle className="error-popup-icon" />
                    <h3>Rule Violation Notice</h3>
                    <button className="error-popup-close" onClick={onClose}>
                        <FaTimes />
                    </button>
                </div>
                <div className="error-popup-body">
                    <p>{message}</p>
                </div>
                <div className="error-popup-footer">
                    <button className="btn-primary" onClick={onClose}>
                        Understand
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ErrorPopup;

import React from 'react';
import './LoadingScreen.css';

const LoadingScreen = ({ message = "Loading Application", retryCount = 0 }) => {
    return (
        <div className="loading-screen-overlay">
            <div className="loading-content">
                <div className="simple-spinner"></div>

                <h2 className="loading-title">
                    {message}
                </h2>

                {retryCount > 0 && (
                    <div className="retry-message">
                        Retrying connection ({retryCount}/3)...
                    </div>
                )}
            </div>
        </div>
    );
};

export default LoadingScreen;

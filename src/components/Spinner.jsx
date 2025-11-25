import React from 'react';

const Spinner = () => (
    <div className="spinner-container d-flex justify-content-center align-items-center bg-dark" style={{ height: '100vh', width: '100vw' }}>
        <i className="fa-solid fa-spinner fa-spin fa-4x text-primary"></i>
    </div>
);

export default Spinner;
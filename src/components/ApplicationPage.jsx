import React, { useState, useEffect } from 'react';
import Paginate from './Paginate';
import { FaHome } from 'react-icons/fa';

const ApplicationPage = ({ sidebarVisible = false }) => {
    const [allApplications, setAllApplications] = useState([]);
    const [applications, setApplications] = useState([]);
    const [appName, setAppName] = useState('');
    const [searchAppName, setSearchAppName] = useState('');
    const [isEditing, setIsEditing] = useState(false);
    const [currentAppId, setCurrentAppId] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [alertMessage, setAlertMessage] = useState('');
    const [alertVariant, setAlertVariant] = useState('success');
    const [currentPage, setCurrentPage] = useState(1);
    const [loading, setLoading] = useState(false);
    const [actionMenuId, setActionMenuId] = useState(null);
    const [paginator, setPaginator] = useState({
        current_page: 1,
        total_pages: 1,
        previous_page_url: null,
        next_page_url: null,
        record_per_page: 10,
        current_page_items_count: 0,
        total_count: 0,
        pagination_last_page: 1
    });

    const API_BASE_URL = "http://127.0.0.1:8000";
    const ITEMS_PER_PAGE = 10;

    useEffect(() => {
        fetchApplications();
    }, []);

    useEffect(() => {
        paginateApplications(currentPage);
    }, [currentPage, allApplications]);

    // Close action menu when clicking outside
    useEffect(() => {
        const handleClickOutside = () => setActionMenuId(null);
        if (actionMenuId !== null) {
            document.addEventListener('click', handleClickOutside);
            return () => document.removeEventListener('click', handleClickOutside);
        }
    }, [actionMenuId]);

    const handleClear = () => {
        setSearchAppName('');
        setApplications(allApplications);
        setCurrentPage(1);
    };

    const handleFilter = () => {
        const filteredApps = allApplications.filter(app => {
            const matchesName = searchAppName === '' ||
                app.name.toLowerCase().includes(searchAppName.toLowerCase());
            return matchesName;
        });
        setApplications(filteredApps);
        setCurrentPage(1);
    };

    const paginateApplications = (page) => {
        const totalItems = allApplications.length;
        const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
        const startIndex = (page - 1) * ITEMS_PER_PAGE;
        const endIndex = startIndex + ITEMS_PER_PAGE;
        const paginatedApplications = allApplications.slice(startIndex, endIndex);

        setApplications(paginatedApplications);
        setPaginator({
            current_page: page,
            total_pages: totalPages,
            previous_page_url: page > 1 ? page - 1 : null,
            next_page_url: page < totalPages ? page + 1 : null,
            record_per_page: ITEMS_PER_PAGE,
            current_page_items_count: paginatedApplications.length,
            total_count: totalItems,
            pagination_last_page: totalPages
        });
    };

    const renderPagination = () => {
        return (
            <Paginate
                paginator={paginator}
                currentPage={currentPage}
                pagechanged={handlePageChange}
            />
        );
    };

    const fetchApplications = async () => {
        const token = localStorage.getItem("authToken");
        if (!token) {
            console.error("No authentication token found");
            return;
        }

        try {
            const response = await fetch(`${import.meta.env.VITE_APP_API_BASE_URL}/applications`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            if (response.status === 401) {
                localStorage.removeItem("authToken");
                alert("Session expired. Please log in again.");
                window.location.href = "/login";
                return;
            }

            const data = await response.json();
            setAllApplications(data || []);
            setCurrentPage(1);
        } catch (error) {
            console.error("Error fetching applications:", error);
            showAlert("Failed to fetch applications", "danger");
        }
    };

    const handlePageChange = (page) => {
        setCurrentPage(page);
    };

    const handleUpload = async (e) => {
        e.preventDefault();

        if (!appName.trim()) {
            showAlert("Please enter an application name", "warning");
            return;
        }

        const token = localStorage.getItem("authToken");
        setLoading(true);

        try {
            const method = isEditing ? 'PUT' : 'POST';
            const url = isEditing
                ? `${import.meta.env.VITE_APP_API_BASE_URL}/applications/${currentAppId}`
                : `${import.meta.env.VITE_APP_API_BASE_URL}/applications`;

            const response = await fetch(url, {
                method,
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ name: appName }),
            });

            if (response.status === 401) {
                localStorage.removeItem("authToken");
                alert("Session expired. Please log in again.");
                window.location.href = "/login";
                return;
            }

            if (!response.ok) throw new Error('Failed to save application');

            showAlert(
                isEditing ? "Application updated successfully" : "Application created successfully",
                "success"
            );

            fetchApplications();
            setShowModal(false);
            resetForm();
        } catch (error) {
            console.error('Error saving application:', error);
            showAlert("Failed to save application", "danger");
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (id) => {
        const selected = applications.find(a => a.id === id);
        setIsEditing(true);
        setCurrentAppId(id);
        setAppName(selected.name || '');
        setShowModal(true);
        setActionMenuId(null);
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to delete this application?")) return;

        const token = localStorage.getItem("authToken");
        setLoading(true);

        try {
            const response = await fetch(`${import.meta.env.VITE_APP_API_BASE_URL}/applications/${id}`, {
                method: 'DELETE',
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            if (response.status === 401) {
                localStorage.removeItem("authToken");
                alert("Session expired. Please log in again.");
                window.location.href = "/login";
                return;
            }

            if (!response.ok) throw new Error('Failed to delete application');

            showAlert("Application deleted successfully", "success");
            fetchApplications();
        } catch (error) {
            console.error('Error deleting application:', error);
            showAlert("Failed to delete application", "danger");
        } finally {
            setLoading(false);
            setActionMenuId(null);
        }
    };

    const handleAdd = () => {
        resetForm();
        setIsEditing(false);
        setCurrentAppId(null);
        setShowModal(true);
    };

    const resetForm = () => {
        setAppName('');
    };

    const showAlert = (message, variant) => {
        setAlertMessage(message);
        setAlertVariant(variant);
        setTimeout(() => setAlertMessage(''), 3000);
    };

    const containerStyle = sidebarVisible
        ? { padding: '16px', backgroundColor: '#F5F5F5', overflowX: 'hidden', minHeight: '100vh', marginLeft: '193px' }
        : { padding: '16px', backgroundColor: '#F5F5F5', overflowX: 'hidden', minHeight: '100vh' };

    return (
        <div style={containerStyle}>
            {/* Header with Breadcrumb on the right */}
            <div className='mt-5' style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '7px' }}>
                <h1 style={{ margin: 0, fontSize: '20px', fontWeight: '600' }}>Application</h1>
                <div style={{ fontSize: '13px', color: '#555', display: 'flex', alignItems: 'center' }}>
                    <span
                        style={{
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            transition: 'color 0.2s'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.color = 'blue'}
                        onMouseLeave={(e) => e.currentTarget.style.color = '#555'}
                    >
                        <FaHome style={{ fontSize: '14px' }} />
                        <span>Home</span>
                    </span>
                    <span style={{ margin: '0 8px' }}>/</span>
                    <span
                        style={{ cursor: 'pointer', transition: 'color 0.2s' }}
                        onClick={() => window.location.href = '/admin/home'}
                        onMouseEnter={(e) => e.target.style.color = 'blue'}
                        onMouseLeave={(e) => e.target.style.color = '#555'}
                    >
                        Application Details
                    </span>
                    <span style={{ margin: '0 8px' }}>/</span>
                    <span>Application</span>
                </div>
            </div>

            {/* Alert */}
            {alertMessage && (
                <div style={{
                    padding: '12px 20px',
                    marginBottom: '11px',
                    borderRadius: '4px',
                    backgroundColor: alertVariant === 'success' ? '#d4edda' : alertVariant === 'danger' ? '#f8d7da' : '#fff3cd',
                    color: alertVariant === 'success' ? '#155724' : alertVariant === 'danger' ? '#721c24' : '#856404',
                    border: `1px solid ${alertVariant === 'success' ? '#c3e6cb' : alertVariant === 'danger' ? '#f5c6cb' : '#ffeeba'}`,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                }}>
                    <span>{alertMessage}</span>
                    <button
                        onClick={() => setAlertMessage('')}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '20px' }}
                    >
                        ×
                    </button>
                </div>
            )}

            {/* Filter Section */}
            <div style={{
                backgroundColor: 'white',
                borderRadius: '8px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                padding: '10px'
            }}>
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'start', alignItems: 'flex-end', marginBottom: '10px', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <label style={{ marginBottom: '4px', fontSize: '13px', fontWeight: '500', color: '#333' }}>
                            Application Name
                        </label>
                        <input
                            type="text"
                            value={searchAppName}
                            onChange={(e) => setSearchAppName(e.target.value)}
                            placeholder="Search application name..."
                            style={{
                                padding: '8px 12px',
                                border: '1px solid #ccc',
                                borderRadius: '4px',
                                fontSize: '13px',
                                width: '200px',
                            }}
                        />
                    </div>

                    <button
                        onClick={handleFilter}
                        style={{
                            padding: '8px 16px',
                            borderRadius: '4px',
                            background: 'linear-gradient(45deg, #007bff, #0056b3)',
                            color: 'white',
                            border: 'none',
                            cursor: 'pointer',
                            fontSize: '12px',
                            boxShadow: '0 1px 2px rgba(0,0,0,0.15)',
                            display: 'inline-flex',
                            alignItems: 'center',
                            height: '34px'
                        }}
                    >
                        <i className="fa-solid fa-filter" style={{ marginRight: '6px', fontSize: '12px' }}></i> Filter
                    </button>

                    <button
                        onClick={handleClear}
                        style={{
                            padding: '8px 16px',
                            borderRadius: '2px',
                            background: 'transparent',
                            color: 'rgb(233, 30, 99)',
                            border: '1px dashed',
                            cursor: 'pointer',
                            fontSize: '12px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            height: '34px'
                        }}
                    >
                        <i className="fa-solid fa-times" style={{ marginRight: '6px', fontSize: '12px' }}></i> Clear
                    </button>
                </div>
            </div>

            {/* Card Container */}
            <div className='mt-3' style={{
                backgroundColor: 'white',
                borderRadius: '8px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                padding: '10px'
            }}>
                {/* Create Button Section */}
                <div style={{ display: 'flex', justifyContent: 'start', alignItems: 'center', marginBottom: '10px' }}>
                    <button
                        onClick={handleAdd}
                        style={{
                            padding: '8px 16px',
                            borderRadius: '4px',
                            background: 'linear-gradient(45deg, #007bff, #0056b3)',
                            color: 'white',
                            border: 'none',
                            cursor: 'pointer',
                            fontSize: '12px',
                            boxShadow: '0 1px 2px rgba(0,0,0,0.15)',
                            display: 'inline-flex',
                            alignItems: 'center'
                        }}
                    >
                        <i className="fa-solid fa-plus" style={{ marginRight: '6px', fontSize: '12px' }}></i> Create New Application
                    </button>
                </div>

                {/* Table */}
                <table className="table table-bordered table-hover table-sm align-middle" style={{ fontSize: '12px', lineHeight: '1.8' }}>
                    <thead className="table-light">
                        <tr>
                            <th className="py-2 px-3 fw-semibold text-center" style={{ width: "60px" }}>S/N</th>
                            <th className="py-2 px-3 fw-semibold text-start">Application Name</th>
                            <th className="py-2 px-3 fw-semibold text-center" style={{ width: "80px" }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {applications.length > 0 ? (
                            applications.map((app, i) => (
                                <tr key={app.id} className="align-middle">
                                    <td className="py-1 px-3 text-center">
                                        {paginator?.current_page > 1
                                            ? (paginator?.current_page - 1) * paginator?.record_per_page + i + 1
                                            : i + 1}
                                    </td>
                                    <td className="py-1 px-3">{app.name}</td>
                                    <td className="py-1 px-3 text-center position-relative">
                                        <button
                                            className="btn btn-link p-0"
                                            style={{ fontSize: '12px' }}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setActionMenuId(actionMenuId === app.id ? null : app.id);
                                            }}
                                        >
                                            <i className="fa-solid fa-ellipsis-v"></i>
                                        </button>

                                        {actionMenuId === app.id && (
                                            <div
                                                className="position-absolute bg-white border rounded shadow-sm py-1"
                                                style={{
                                                    top: '24px',
                                                    right: '10px',
                                                    zIndex: 10,
                                                    minWidth: '90px',
                                                    fontSize: '13px',
                                                    lineHeight: '1.1',
                                                }}
                                            >
                                                <button
                                                    onClick={() => handleEdit(app.id)}
                                                    className="dropdown-item py-0 px-2 d-flex align-items-center"
                                                    style={{ fontSize: '13px', height: '24px' }}
                                                >
                                                    <i className="fa-solid fa-pen me-2" style={{ fontSize: '12px' }}></i> Edit
                                                </button>

                                                <div
                                                    style={{
                                                        borderTop: '1px solid #ccc',
                                                        margin: '2px 0',
                                                    }}
                                                ></div>

                                                <button
                                                    onClick={() => handleDelete(app.id)}
                                                    className="dropdown-item py-0 px-2 d-flex align-items-center text-danger"
                                                    style={{ fontSize: '13px', height: '24px' }}
                                                    disabled={loading}
                                                >
                                                    <i className="fa-solid fa-trash me-2" style={{ fontSize: '12px' }}></i> Delete
                                                </button>
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="3" className="text-center text-muted py-3">
                                    No applications available
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>

                {/* Pagination Info */}
                <div style={{ marginTop: '5px', fontSize: '10px', color: '#666' }}>
                    Showing {paginator.current_page_items_count > 0 ? (paginator.current_page - 1) * ITEMS_PER_PAGE + 1 : 0} to {Math.min(paginator.current_page * ITEMS_PER_PAGE, paginator.total_count)} of {paginator.total_count} results
                </div>

                {/* Pagination Controls */}
                {paginator?.total_pages > 1 && (
                    <div style={{ marginTop: '-20px' }}>
                        {renderPagination()}
                    </div>
                )}
            </div>

            {/* Modal Component */}
            {showModal && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1050,
                }}>
                    <div style={{
                        backgroundColor: 'white',
                        borderRadius: '8px',
                        boxShadow: '0 5px 15px rgba(0,0,0,0.3)',
                        maxWidth: '500px',
                        width: '90%',
                    }}>
                        {/* Header Section */}
                        <div style={{
                            padding: '12px 16px',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                        }}>
                            <h5 style={{ margin: 0, fontSize: '16px', fontWeight: '600' }}>
                                {isEditing ? "Update Application" : "Create New Application"}
                            </h5>
                            <button
                                onClick={() => setShowModal(false)}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    fontSize: '24px',
                                    cursor: 'pointer',
                                    color: '#666',
                                    lineHeight: 1,
                                    padding: 0,
                                }}
                            >
                                ×
                            </button>
                        </div>

                        {/* Horizontal line after header */}
                        <div style={{
                            borderBottom: '1px solid #e5e7eb',
                            margin: '0'
                        }} />

                        {/* Body Section */}
                        <div style={{ padding: '14px' }}>
                            <div style={{ marginBottom: '0' }}>
                                <label style={{
                                    display: 'block',
                                    marginBottom: '8px',
                                    fontWeight: '500',
                                    fontSize: '14px',
                                    color: '#374151'
                                }}>
                                    Application Name
                                </label>
                                <input
                                    type="text"
                                    value={appName}
                                    onChange={(e) => setAppName(e.target.value)}
                                    placeholder="Enter application name"
                                    style={{
                                        width: '100%',
                                        padding: '8px 12px',
                                        border: '1px solid #d1d5db',
                                        borderRadius: '4px',
                                        fontSize: '14px',
                                        boxSizing: 'border-box',
                                        outline: 'none',
                                    }}
                                    onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                                    onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
                                />
                            </div>
                        </div>

                        {/* Horizontal line before footer */}
                        <div style={{
                            borderBottom: '1px solid #e5e7eb',
                            margin: '0'
                        }} />

                        {/* Footer Section */}
                        <div style={{
                            padding: '12px 16px',
                            display: 'flex',
                            justifyContent: 'flex-end',
                            gap: '10px'
                        }}>
                            <button
                                onClick={() => setShowModal(false)}
                                style={{
                                    padding: '6px 12px',
                                    border: '1px solid #d1d5db',
                                    borderRadius: '4px',
                                    backgroundColor: 'white',
                                    cursor: 'pointer',
                                    fontSize: '14px',
                                    fontWeight: '500',
                                    color: '#374151',
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleUpload}
                                disabled={loading}
                                style={{
                                    padding: '6px 12px',
                                    background: 'linear-gradient(45deg, #007bff, #0056b3)',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '4px',
                                    cursor: loading ? 'not-allowed' : 'pointer',
                                    fontSize: '13px',
                                    fontWeight: '500',
                                    opacity: loading ? 0.6 : 1,
                                }}
                            >
                                {loading ? 'Loading...' : (isEditing ? "Submit" : "Submit")}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ApplicationPage;
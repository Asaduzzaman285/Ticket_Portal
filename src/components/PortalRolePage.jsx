import React, { useState, useEffect } from 'react';
import Paginate from './Paginate';

const PortalRolePage = ({ sidebarVisible = false }) => {
    const [allRoles, setAllRoles] = useState([]);
    const [roles, setRoles] = useState([]);
    const [roleName, setRoleName] = useState('');
    const [isEditing, setIsEditing] = useState(false);
    const [currentRoleId, setCurrentRoleId] = useState(null);
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
        fetchRoles();
    }, []);

    useEffect(() => {
        paginateRoles(currentPage);
    }, [currentPage, allRoles]);

    // Close action menu when clicking outside
    useEffect(() => {
        const handleClickOutside = () => setActionMenuId(null);
        if (actionMenuId !== null) {
            document.addEventListener('click', handleClickOutside);
            return () => document.removeEventListener('click', handleClickOutside);
        }
    }, [actionMenuId]);

    const paginateRoles = (page) => {
        const totalItems = allRoles.length;
        const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
        const startIndex = (page - 1) * ITEMS_PER_PAGE;
        const endIndex = startIndex + ITEMS_PER_PAGE;
        const paginatedRoles = allRoles.slice(startIndex, endIndex);

        setRoles(paginatedRoles);
        setPaginator({
            current_page: page,
            total_pages: totalPages,
            previous_page_url: page > 1 ? page - 1 : null,
            next_page_url: page < totalPages ? page + 1 : null,
            record_per_page: ITEMS_PER_PAGE,
            current_page_items_count: paginatedRoles.length,
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

    const fetchRoles = async () => {
        const token = localStorage.getItem("authToken");
        if (!token) {
            console.error("No authentication token found");
            return;
        }

        try {
            const response = await fetch(`${import.meta.env.VITE_APP_API_BASE_URL}/roles`, {
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
            setAllRoles(data || []);
            setCurrentPage(1);
        } catch (error) {
            console.error("Error fetching roles:", error);
            showAlert("Failed to fetch roles", "danger");
        }
    };

    const handlePageChange = (page) => {
        setCurrentPage(page);
    };

    const handleUpload = async (e) => {
        e.preventDefault();

        if (!roleName.trim()) {
            showAlert("Please enter a role name", "warning");
            return;
        }

        const token = localStorage.getItem("authToken");
        setLoading(true);

        try {
            const method = isEditing ? 'PUT' : 'POST';
            const url = isEditing
                ? `${import.meta.env.VITE_APP_API_BASE_URL}/roles/${currentRoleId}`
                : `${import.meta.env.VITE_APP_API_BASE_URL}/roles`;

            const response = await fetch(url, {
                method,
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    role_name: roleName
                }),
            });

            if (response.status === 401) {
                localStorage.removeItem("authToken");
                alert("Session expired. Please log in again.");
                window.location.href = "/login";
                return;
            }

            if (!response.ok) throw new Error('Failed to save role');

            showAlert(
                isEditing ? "Role updated successfully" : "Role created successfully",
                "success"
            );

            fetchRoles();
            setShowModal(false);
            resetForm();
        } catch (error) {
            console.error('Error saving role:', error);
            showAlert("Failed to save role", "danger");
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (id) => {
        const selected = roles.find(r => r.id === id);
        setIsEditing(true);
        setCurrentRoleId(id);
        setRoleName(selected.role_name || '');
        setShowModal(true);
        setActionMenuId(null);
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to delete this role?")) return;

        const token = localStorage.getItem("authToken");
        setLoading(true);

        try {
            const response = await fetch(`${import.meta.env.VITE_APP_API_BASE_URL}/roles/${id}`, {
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

            if (!response.ok) throw new Error('Failed to delete role');

            showAlert("Role deleted successfully", "success");
            fetchRoles();
        } catch (error) {
            console.error('Error deleting role:', error);
            showAlert("Failed to delete role", "danger");
        } finally {
            setLoading(false);
            setActionMenuId(null);
        }
    };

    const handleAdd = () => {
        resetForm();
        setIsEditing(false);
        setCurrentRoleId(null);
        setShowModal(true);
    };

    const resetForm = () => {
        setRoleName('');
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
                <h1 style={{ margin: 0, fontSize: '20px', fontWeight: '600' }}>Portal Role</h1>
                <div style={{ fontSize: '13px', color: '#555' }}>
                    <span style={{ color: '#007bff', cursor: 'pointer' }} onClick={() => window.location.href = '/admin/home'}>
                        Invoice
                    </span>
                    <span style={{ margin: '0 8px' }}>/</span>
                    <span style={{ color: '#007bff', cursor: 'pointer' }} onClick={() => window.location.href = '/admin/home'}>
                        Role Details
                    </span>
                    <span style={{ margin: '0 8px' }}>/</span>
                    <span>Portal Role</span>
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

            {/* Card Container */}
            <div style={{
                backgroundColor: 'white',
                borderRadius: '8px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                padding: '10px'
            }}>
                {/* Filter/Search Section */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <input
                        type="text"
                        placeholder="Search role name..."
                        style={{
                            padding: '8px 12px',
                            border: '1px solid #ccc',
                            borderRadius: '4px',
                            fontSize: '13px',
                            width: '200px',
                        }}
                    />
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
                        <i className="fa-solid fa-plus" style={{ marginRight: '6px', fontSize: '12px' }}></i> Create New Role
                    </button>
                </div>

                <table className="table table-bordered table-hover table-sm align-middle" style={{ fontSize: '12px', lineHeight: '1.8' }}>
                    <thead className="table-light">
                        <tr>
                            <th className="py-2 px-3 fw-semibold text-start">Role Name</th>
                            <th className="py-2 px-3 fw-semibold text-center">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {roles.length > 0 ? (
                            roles.map((role) => (
                                <tr key={role.id} className="align-middle">
                                    <td className="py-1 px-3">{role.role_name}</td>
                                    <td className="py-1 px-3 text-center position-relative">
                                        <button
                                            className="btn btn-link p-0"
                                            style={{ fontSize: '12px' }}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setActionMenuId(actionMenuId === role.id ? null : role.id);
                                            }}
                                        >
                                            <i className="fa-solid fa-ellipsis-v"></i>
                                        </button>

                                        {actionMenuId === role.id && (
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
                                                    onClick={() => handleEdit(role.id)}
                                                    className="dropdown-item py-0 px-2 d-flex align-items-center"
                                                    style={{ fontSize: '13px', height: '24px' }}
                                                >
                                                    <i className="fa-solid fa-pen me-2" style={{ fontSize: '12px' }}></i> Edit
                                                </button>

                                                {/* Visible custom divider */}
                                                <div
                                                    style={{
                                                        borderTop: '1px solid #ccc',
                                                        margin: '2px 0',
                                                    }}
                                                ></div>

                                                <button
                                                    onClick={() => handleDelete(role.id)}
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
                                <td colSpan="2" className="text-center text-muted py-3">
                                    No roles available
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
                        <div style={{
                            padding: '20px',
                            borderBottom: '1px solid #dee2e6',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                        }}>
                            <h5 style={{ margin: 0, fontSize: '15px' }}>
                                {isEditing ? "Update Role" : "Create New Role"}
                            </h5>
                            <button
                                onClick={() => setShowModal(false)}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    fontSize: '17px',
                                    cursor: 'pointer',
                                }}
                            >
                                ×
                            </button>
                        </div>

                        <div style={{ padding: '20px' }}>
                            <div style={{ marginBottom: '20px' }}>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                                    Role Name
                                </label>
                                <input
                                    type="text"
                                    value={roleName}
                                    onChange={(e) => setRoleName(e.target.value)}
                                    placeholder="Enter role name"
                                    style={{
                                        width: '100%',
                                        padding: '10px',
                                        border: '1px solid #ccc',
                                        borderRadius: '4px',
                                        fontSize: '13px',
                                        boxSizing: 'border-box',
                                    }}
                                />
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                                <button
                                    onClick={() => setShowModal(false)}
                                    style={{
                                        padding: '10px 20px',
                                        border: '1px solid #ccc',
                                        borderRadius: '4px',
                                        backgroundColor: '#f8f9fa',
                                        cursor: 'pointer',
                                        fontSize: '13px',
                                    }}
                                >
                                    Close
                                </button>
                                <button
                                    onClick={handleUpload}
                                    disabled={loading}
                                    style={{
                                        padding: '10px 20px',
                                        backgroundColor: '#007bff',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '4px',
                                        cursor: loading ? 'not-allowed' : 'pointer',
                                        fontSize: '13px',
                                        opacity: loading ? 0.6 : 1,
                                    }}
                                >
                                    {loading ? 'Loading...' : (isEditing ? "Update Role" : "Create Role")}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PortalRolePage;
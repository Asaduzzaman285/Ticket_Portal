import React, { useState, useEffect } from 'react';
import { FaHome } from 'react-icons/fa';

const BankAccountPage = ({ sidebarVisible = false }) => {
    const [accounts, setAccounts] = useState([]);
    const [applications, setApplications] = useState([]);
    const [banks, setBanks] = useState([]);
    const [appId, setAppId] = useState('');
    const [bankId, setBankId] = useState('');
    const [branchName, setBranchName] = useState('');
    const [routingNumber, setRoutingNumber] = useState('');
    const [isDefault, setIsDefault] = useState(false);
    const [accountName, setAccountName] = useState('');
    const [accountNumber, setAccountNumber] = useState('');
    const [isEditing, setIsEditing] = useState(false);
    const [currentAccountId, setCurrentAccountId] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [alertMessage, setAlertMessage] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [alertVariant, setAlertVariant] = useState('success');
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
    // Search states
    const [searchApp, setSearchApp] = useState('');
    const [searchBank, setSearchBank] = useState('');
    const [searchBranch, setSearchBranch] = useState('');

    const API_BASE_URL = "http://127.0.0.1:8000";

    useEffect(() => {
        fetchApplications();
        fetchBanks();
        fetchAccounts();
    }, []);

    // Close action menu when clicking outside
    useEffect(() => {
        const handleClickOutside = () => setActionMenuId(null);
        if (actionMenuId !== null) {
            document.addEventListener('click', handleClickOutside);
            return () => document.removeEventListener('click', handleClickOutside);
        }
    }, [actionMenuId]);

    const fetchApplications = async () => {
        const token = localStorage.getItem("authToken");
        try {
            const response = await fetch(`${import.meta.env.VITE_APP_API_BASE_URL}/applications`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (response.ok) {
                const data = await response.json();
                setApplications(data || []);
            }
        } catch (error) {
            console.error("Error fetching applications:", error);
        }
    };

    const fetchBanks = async () => {
        const token = localStorage.getItem("authToken");
        try {
            const response = await fetch(`${import.meta.env.VITE_APP_API_BASE_URL}/banks`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (response.ok) {
                const data = await response.json();
                setBanks(data || []);
            }
        } catch (error) {
            console.error("Error fetching banks:", error);
        }
    };

    const fetchAccounts = async () => {
        const token = localStorage.getItem("authToken");
        if (!token) {
            console.error("No authentication token found");
            return;
        }

        try {
            const response = await fetch(`${import.meta.env.VITE_APP_API_BASE_URL}/bank-accounts`, {
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
            setAccounts(data || []);
        } catch (error) {
            console.error("Error fetching accounts:", error);
            showAlert("Failed to fetch bank accounts", "danger");
        }
    };

    const handleClear = () => {
        setSearchApp('');
        setSearchBank('');
        setSearchBranch('');
    };

    const handleFilter = () => {
        // Implement filter logic here
        console.log('Filtering...');
    };

    const handleUpload = async (e) => {
        e.preventDefault();

        if (!appId || !bankId || !branchName || !routingNumber || !accountName || !accountNumber) {
            showAlert("Please fill all required fields", "warning");
            return;
        }

        const token = localStorage.getItem("authToken");
        setLoading(true);

        try {
            const method = isEditing ? 'PUT' : 'POST';
            const url = isEditing
                ? `${import.meta.env.VITE_APP_API_BASE_URL}/bank-accounts/${currentAccountId}`
                : `${import.meta.env.VITE_APP_API_BASE_URL}/bank-accounts`;

            const response = await fetch(url, {
                method,
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    app_id: parseInt(appId),
                    bank_id: parseInt(bankId),
                    branch_name: branchName,
                    routing_number: routingNumber,
                    is_default: isDefault ? 1 : 0,
                    account_name: accountName,
                    account_number: accountNumber
                }),
            });

            if (response.status === 401) {
                localStorage.removeItem("authToken");
                alert("Session expired. Please log in again.");
                window.location.href = "/login";
                return;
            }

            if (!response.ok) throw new Error('Failed to save account');

            showAlert(
                isEditing ? "Bank account updated successfully" : "Bank account created successfully",
                "success"
            );

            fetchAccounts();
            setShowModal(false);
            resetForm();
        } catch (error) {
            console.error('Error saving account:', error);
            showAlert("Failed to save bank account", "danger");
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (id) => {
        const selected = accounts.find(a => a.id === id);
        setIsEditing(true);
        setCurrentAccountId(id);
        setAppId(selected.app_id.toString());
        setBankId(selected.bank_id.toString());
        setBranchName(selected.branch_name || '');
        setRoutingNumber(selected.routing_number || '');
        setIsDefault(selected.is_default === 1);
        setAccountName(selected.account_name || '');
        setAccountNumber(selected.account_number || '');
        setShowModal(true);
        setActionMenuId(null);
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to delete this bank account?")) return;

        const token = localStorage.getItem("authToken");
        setLoading(true);

        try {
            const response = await fetch(`${import.meta.env.VITE_APP_API_BASE_URL}/bank-accounts/${id}`, {
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

            if (!response.ok) throw new Error('Failed to delete account');

            showAlert("Bank account deleted successfully", "success");
            fetchAccounts();
        } catch (error) {
            console.error('Error deleting account:', error);
            showAlert("Failed to delete bank account", "danger");
        } finally {
            setLoading(false);
            setActionMenuId(null);
        }
    };

    const handleAdd = () => {
        resetForm();
        setIsEditing(false);
        setCurrentAccountId(null);
        setShowModal(true);
    };

    const resetForm = () => {
        setAppId('');
        setBankId('');
        setBranchName('');
        setRoutingNumber('');
        setIsDefault(false);
        setAccountName('');
        setAccountNumber('');
    };

    const showAlert = (message, variant) => {
        setAlertMessage(message);
        setAlertVariant(variant);
        setTimeout(() => setAlertMessage(''), 3000);
    };

    const getApplicationName = (id) => {
        const app = applications.find(a => a.id === id);
        return app ? app.name : '-';
    };

    const getBankName = (id) => {
        const bank = banks.find(b => b.id === id);
        return bank ? bank.bank_name : '-';
    };

    const containerStyle = sidebarVisible
        ? { padding: '16px', backgroundColor: '#F5F5F5', overflowX: 'hidden', minHeight: '100vh', marginLeft: '193px' }
        : { padding: '16px', backgroundColor: '#F5F5F5', overflowX: 'hidden', minHeight: '100vh' };

    return (
        <div style={containerStyle}>
            {/* Header with Breadcrumb */}
            <div className='mt-5' style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '7px' }}>
                <h1 style={{ margin: 0, fontSize: '20px', fontWeight: '600' }}>Bank Account</h1>
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
                        Bank Details
                    </span>
                    <span style={{ margin: '0 8px' }}>/</span>
                    <span>Bank Account</span>
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
                            Application
                        </label>
                        <input
                            type="text"
                            value={searchApp}
                            onChange={(e) => setSearchApp(e.target.value)}
                            placeholder="Search application..."
                            style={{
                                padding: '8px 12px',
                                border: '1px solid #ccc',
                                borderRadius: '4px',
                                fontSize: '13px',
                                width: '200px',
                            }}
                        />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <label style={{ marginBottom: '4px', fontSize: '13px', fontWeight: '500', color: '#333' }}>
                            Bank
                        </label>
                        <input
                            type="text"
                            value={searchBank}
                            onChange={(e) => setSearchBank(e.target.value)}
                            placeholder="Search bank..."
                            style={{
                                padding: '8px 12px',
                                border: '1px solid #ccc',
                                borderRadius: '4px',
                                fontSize: '13px',
                                width: '200px',
                            }}
                        />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <label style={{ marginBottom: '4px', fontSize: '13px', fontWeight: '500', color: '#333' }}>
                            Branch
                        </label>
                        <input
                            type="text"
                            value={searchBranch}
                            onChange={(e) => setSearchBranch(e.target.value)}
                            placeholder="Search branch..."
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
                        <i className="fa-solid fa-plus" style={{ marginRight: '6px', fontSize: '12px' }}></i> Create New Bank Account
                    </button>
                </div>

                {/* Table */}
                <table
                    className="table table-bordered table-hover table-sm align-middle"
                    style={{ fontSize: "12px", lineHeight: "1.8" }}
                >
                    <thead className="table-light">
                        <tr>
                            <th className="py-2 px-3 fw-semibold text-center" style={{ width: "60px" }}>S/N</th>
                            <th className="py-2 px-3 fw-semibold text-start">Application</th>
                            <th className="py-2 px-3 fw-semibold text-start">Bank</th>
                            <th className="py-2 px-3 fw-semibold text-start">Branch</th>
                            <th className="py-2 px-3 fw-semibold text-start">Account Name</th>
                            <th className="py-2 px-3 fw-semibold text-start">Account Number</th>
                            <th className="py-2 px-3 fw-semibold text-center" style={{ width: "80px" }}>Default</th>
                            <th className="py-2 px-3 fw-semibold text-center" style={{ width: "80px" }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {accounts.length > 0 ? (
                            accounts.map((account, i) => (
                                <tr key={account.id} className="align-middle">
                                    <td className="py-1 px-3 text-center">{i + 1}</td>
                                    <td className="py-1 px-3">{getApplicationName(account.app_id)}</td>
                                    <td className="py-1 px-3">{getBankName(account.bank_id)}</td>
                                    <td className="py-1 px-3">{account.branch_name || '-'}</td>
                                    <td className="py-1 px-3">{account.account_name || '-'}</td>
                                    <td className="py-1 px-3">{account.account_number ? '****' + account.account_number.slice(-4) : '-'}</td>
                                    <td className="py-1 px-3 text-center">
                                        {account.is_default === 1 ? (
                                            <span style={{ color: '#28a745', fontWeight: 'bold' }}>✓ Yes</span>
                                        ) : (
                                            <span style={{ color: '#999' }}>No</span>
                                        )}
                                    </td>

                                    {/* Actions column */}
                                    <td className="py-1 px-3 text-center position-relative">
                                        <button
                                            className="btn btn-link p-0"
                                            style={{ fontSize: "12px" }}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setActionMenuId(actionMenuId === account.id ? null : account.id);
                                            }}
                                        >
                                            <i className="fa-solid fa-ellipsis-v"></i>
                                        </button>

                                        {actionMenuId === account.id && (
                                            <div
                                                className="position-absolute bg-white border rounded shadow-sm py-1"
                                                style={{
                                                    top: "24px",
                                                    right: "10px",
                                                    zIndex: 10,
                                                    minWidth: "90px",
                                                    fontSize: "12px",
                                                    lineHeight: "1.1",
                                                }}
                                            >
                                                <button
                                                    onClick={() => handleEdit(account.id)}
                                                    className="dropdown-item py-0 px-2 d-flex align-items-center"
                                                    style={{ fontSize: "12px", height: "24px" }}
                                                >
                                                    <i className="fa-solid fa-pen me-2" style={{ fontSize: "12px" }}></i> Edit
                                                </button>

                                                <div
                                                    style={{
                                                        borderTop: "1px solid #ccc",
                                                        margin: "2px 0",
                                                    }}
                                                ></div>

                                                <button
                                                    onClick={() => handleDelete(account.id)}
                                                    className="dropdown-item py-0 px-2 d-flex align-items-center text-danger"
                                                    style={{ fontSize: "12px", height: "24px" }}
                                                    disabled={loading}
                                                >
                                                    <i className="fa-solid fa-trash me-2" style={{ fontSize: "12px" }}></i> Delete
                                                </button>
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="8" className="text-center text-muted py-3">
                                    No bank accounts available
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
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
                        maxHeight: '90vh',
                        display: 'flex',
                        flexDirection: 'column',
                    }}>
                        {/* Header Section */}
                        <div style={{
                            padding: '12px 16px',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                        }}>
                            <h5 style={{ margin: 0, fontSize: '16px', fontWeight: '600' }}>
                                {isEditing ? "Update Bank Account" : "Create New Bank Account"}
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

                        {/* Body Section - Scrollable */}
                        <div style={{
                            padding: '14px',
                            overflowY: 'auto',
                            flex: 1,
                        }}>
                            <div style={{ marginBottom: '12px' }}>
                                <label style={{
                                    display: 'block',
                                    marginBottom: '6px',
                                    fontWeight: '500',
                                    fontSize: '13px',
                                    color: '#374151'
                                }}>
                                    Application *
                                </label>
                                <select
                                    value={appId}
                                    onChange={(e) => setAppId(e.target.value)}
                                    style={{
                                        width: '100%',
                                        padding: '8px 12px',
                                        border: '1px solid #d1d5db',
                                        borderRadius: '4px',
                                        fontSize: '13px',
                                        boxSizing: 'border-box',
                                        outline: 'none',
                                    }}
                                    onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                                    onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
                                >
                                    <option value="">Select an application</option>
                                    {applications.map(app => (
                                        <option key={app.id} value={app.id}>{app.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div style={{ marginBottom: '12px' }}>
                                <label style={{
                                    display: 'block',
                                    marginBottom: '6px',
                                    fontWeight: '500',
                                    fontSize: '13px',
                                    color: '#374151'
                                }}>
                                    Bank *
                                </label>
                                <select
                                    value={bankId}
                                    onChange={(e) => setBankId(e.target.value)}
                                    style={{
                                        width: '100%',
                                        padding: '8px 12px',
                                        border: '1px solid #d1d5db',
                                        borderRadius: '4px',
                                        fontSize: '13px',
                                        boxSizing: 'border-box',
                                        outline: 'none',
                                    }}
                                    onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                                    onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
                                >
                                    <option value="">Select a bank</option>
                                    {banks.map(bank => (
                                        <option key={bank.id} value={bank.id}>{bank.bank_name}</option>
                                    ))}
                                </select>
                            </div>

                            <div style={{ marginBottom: '12px' }}>
                                <label style={{
                                    display: 'block',
                                    marginBottom: '6px',
                                    fontWeight: '500',
                                    fontSize: '13px',
                                    color: '#374151'
                                }}>
                                    Branch Name *
                                </label>
                                <input
                                    type="text"
                                    value={branchName}
                                    onChange={(e) => setBranchName(e.target.value)}
                                    placeholder="Enter branch name"
                                    style={{
                                        width: '100%',
                                        padding: '8px 12px',
                                        border: '1px solid #d1d5db',
                                        borderRadius: '4px',
                                        fontSize: '13px',
                                        boxSizing: 'border-box',
                                        outline: 'none',
                                    }}
                                    onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                                    onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
                                />
                            </div>

                            <div style={{ marginBottom: '12px' }}>
                                <label style={{
                                    display: 'block',
                                    marginBottom: '6px',
                                    fontWeight: '500',
                                    fontSize: '13px',
                                    color: '#374151'
                                }}>
                                    Routing Number *
                                </label>
                                <input
                                    type="text"
                                    value={routingNumber}
                                    onChange={(e) => setRoutingNumber(e.target.value)}
                                    placeholder="Enter routing number"
                                    style={{
                                        width: '100%',
                                        padding: '8px 12px',
                                        border: '1px solid #d1d5db',
                                        borderRadius: '4px',
                                        fontSize: '13px',
                                        boxSizing: 'border-box',
                                        outline: 'none',
                                    }}
                                    onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                                    onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
                                />
                            </div>

                            <div style={{ marginBottom: '12px' }}>
                                <label style={{
                                    display: 'block',
                                    marginBottom: '6px',
                                    fontWeight: '500',
                                    fontSize: '13px',
                                    color: '#374151'
                                }}>
                                    Account Name *
                                </label>
                                <input
                                    type="text"
                                    value={accountName}
                                    onChange={(e) => setAccountName(e.target.value)}
                                    placeholder="Enter account name"
                                    style={{
                                        width: '100%',
                                        padding: '8px 12px',
                                        border: '1px solid #d1d5db',
                                        borderRadius: '4px',
                                        fontSize: '13px',
                                        boxSizing: 'border-box',
                                        outline: 'none',
                                    }}
                                    onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                                    onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
                                />
                            </div>

                            <div style={{ marginBottom: '12px' }}>
                                <label style={{
                                    display: 'block',
                                    marginBottom: '6px',
                                    fontWeight: '500',
                                    fontSize: '13px',
                                    color: '#374151'
                                }}>
                                    Account Number *
                                </label>
                                <input
                                    type="text"
                                    value={accountNumber}
                                    onChange={(e) => setAccountNumber(e.target.value)}
                                    placeholder="Enter account number"
                                    style={{
                                        width: '100%',
                                        padding: '8px 12px',
                                        border: '1px solid #d1d5db',
                                        borderRadius: '4px',
                                        fontSize: '13px',
                                        boxSizing: 'border-box',
                                        outline: 'none',
                                    }}
                                    onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                                    onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
                                />
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', marginTop: '12px' }}>
                                <input
                                    type="checkbox"
                                    id="isDefault"
                                    checked={isDefault}
                                    onChange={(e) => setIsDefault(e.target.checked)}
                                    style={{ marginRight: '8px', cursor: 'pointer' }}
                                />
                                <label htmlFor="isDefault" style={{ cursor: 'pointer', marginBottom: 0, fontSize: '13px' }}>
                                    Set as default account
                                </label>
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

export default BankAccountPage;
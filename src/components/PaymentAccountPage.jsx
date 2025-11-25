import React, { useState, useEffect, useRef } from 'react';
import Paginate from './Paginate';
import { FaHome, FaTimes } from 'react-icons/fa';

const PaymentAccountPage = ({ sidebarVisible = false }) => {
    const [allAccounts, setAllAccounts] = useState([]);
    const [accounts, setAccounts] = useState([]);
    const [filteredAccounts, setFilteredAccounts] = useState([]);
    const [applications, setApplications] = useState([]);
    const [banks, setBanks] = useState([]);
    const [paymentMethodTypes, setPaymentMethodTypes] = useState([]);
    const [mfsTypes, setMfsTypes] = useState([]);
    
    // Form states
    const [appId, setAppId] = useState('');
    const [paymentMethodTypeId, setPaymentMethodTypeId] = useState('');
    const [mfsTypeId, setMfsTypeId] = useState('');
    const [receiverName, setReceiverName] = useState('');
    const [receiverAccountNumber, setReceiverAccountNumber] = useState('');
    const [pmntRcvBankId, setPmntRcvBankId] = useState('');
    const [pmntRcvBranch, setPmntRcvBranch] = useState('');
    const [pmntRcvRn, setPmntRcvRn] = useState('');
    const [merchantType, setMerchantType] = useState('');
    const [txnCharge, setTxnCharge] = useState('');
    const [txnChargeText, setTxnChargeText] = useState('');
    
    // Search states
    const [searchApp, setSearchApp] = useState('');
    const [searchPaymentType, setSearchPaymentType] = useState('');
    const [searchReceiverName, setSearchReceiverName] = useState('');
    
    // Filter dropdown states
    const [appDropdownOpen, setAppDropdownOpen] = useState(false);
    const [paymentTypeDropdownOpen, setPaymentTypeDropdownOpen] = useState(false);
    const [receiverNameDropdownOpen, setReceiverNameDropdownOpen] = useState(false);
    
    // Filter search states
    const [appFilterSearch, setAppFilterSearch] = useState('');
    const [paymentTypeFilterSearch, setPaymentTypeFilterSearch] = useState('');
    const [receiverNameFilterSearch, setReceiverNameFilterSearch] = useState('');
    
    const appFilterRef = useRef(null);
    const paymentTypeFilterRef = useRef(null);
    const receiverNameFilterRef = useRef(null);
    
    const [isEditing, setIsEditing] = useState(false);
    const [currentAccountId, setCurrentAccountId] = useState(null);
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

    const ITEMS_PER_PAGE = 10;

    useEffect(() => {
        fetchSupportData();
    }, []);

    useEffect(() => {
        paginateAccounts(currentPage);
    }, [currentPage, filteredAccounts]);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (appFilterRef.current && !appFilterRef.current.contains(e.target)) {
                setAppDropdownOpen(false);
            }
            if (paymentTypeFilterRef.current && !paymentTypeFilterRef.current.contains(e.target)) {
                setPaymentTypeDropdownOpen(false);
            }
            if (receiverNameFilterRef.current && !receiverNameFilterRef.current.contains(e.target)) {
                setReceiverNameDropdownOpen(false);
            }
            if (actionMenuId !== null) {
                setActionMenuId(null);
            }
        };
        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, [actionMenuId]);

    const fetchSupportData = async () => {
        const token = localStorage.getItem("authToken");
        if (!token) {
            console.error("No authentication token found");
            return;
        }

        try {
            const response = await fetch(`${import.meta.env.VITE_APP_API_BASE_URL}/wintext-invoice/get-support-data`, {
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

            const result = await response.json();
            
            if (result.status === 'success' && result.data) {
                const paymentAccounts = result.data.payment_accounts || [];
                setAllAccounts(paymentAccounts);
                setFilteredAccounts(paymentAccounts);
                setApplications(result.data.company_infos || []);
                setPaymentMethodTypes(result.data.payment_method_types || []);
                setMfsTypes(result.data.mfs_types || []);
                
                fetchBanks();
                setCurrentPage(1);
            }
        } catch (error) {
            console.error("Error fetching support data:", error);
            showAlert("Failed to fetch data", "danger");
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

    const paginateAccounts = (page) => {
        const totalItems = filteredAccounts.length;
        const totalPages = Math.max(1, Math.ceil(totalItems / ITEMS_PER_PAGE));
        const startIndex = (page - 1) * ITEMS_PER_PAGE;
        const endIndex = startIndex + ITEMS_PER_PAGE;
        const paginatedAccounts = filteredAccounts.slice(startIndex, endIndex);

        setAccounts(paginatedAccounts);
        setPaginator({
            current_page: page,
            total_pages: totalPages,
            previous_page_url: page > 1 ? page - 1 : null,
            next_page_url: page < totalPages ? page + 1 : null,
            record_per_page: ITEMS_PER_PAGE,
            current_page_items_count: paginatedAccounts.length,
            total_count: totalItems,
            pagination_last_page: totalPages
        });
    };

    const handlePageChange = (page) => {
        setCurrentPage(page);
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

    // Get unique options for filters
    const getUniqueApplications = () => {
        const apps = allAccounts
            .map(a => a.application?.name)
            .filter(Boolean);
        return [...new Set(apps)].sort();
    };

    const getUniquePaymentTypes = () => {
        const types = allAccounts
            .map(a => a.payment_method_type?.payment_method_type)
            .filter(Boolean);
        return [...new Set(types)].sort();
    };

    const getUniqueReceiverNames = () => {
        const names = allAccounts
            .map(a => a.receiver_name)
            .filter(Boolean);
        return [...new Set(names)].sort();
    };

    // Filter the dropdown options based on search
    const filteredAppOptions = getUniqueApplications().filter(app =>
        app.toLowerCase().includes(appFilterSearch.toLowerCase())
    );

    const filteredPaymentTypeOptions = getUniquePaymentTypes().filter(type =>
        type.toLowerCase().includes(paymentTypeFilterSearch.toLowerCase())
    );

    const filteredReceiverNameOptions = getUniqueReceiverNames().filter(name =>
        name.toLowerCase().includes(receiverNameFilterSearch.toLowerCase())
    );

    const handleFilter = () => {
        let filtered = [...allAccounts];
        
        if (searchApp) {
            filtered = filtered.filter(account =>
                account.application?.name?.toLowerCase().includes(searchApp.toLowerCase())
            );
        }
        
        if (searchPaymentType) {
            filtered = filtered.filter(account =>
                account.payment_method_type?.payment_method_type?.toLowerCase().includes(searchPaymentType.toLowerCase())
            );
        }
        
        if (searchReceiverName) {
            filtered = filtered.filter(account =>
                account.receiver_name?.toLowerCase().includes(searchReceiverName.toLowerCase())
            );
        }
        
        setFilteredAccounts(filtered);
        setCurrentPage(1);
    };

    const handleClear = () => {
        setSearchApp('');
        setSearchPaymentType('');
        setSearchReceiverName('');
        setAppFilterSearch('');
        setPaymentTypeFilterSearch('');
        setReceiverNameFilterSearch('');
        setFilteredAccounts(allAccounts);
        setCurrentPage(1);
    };

    const handleUpload = async (e) => {
        e.preventDefault();

        if (!appId || !paymentMethodTypeId || !receiverName || !receiverAccountNumber) {
            showAlert("Please fill all required fields", "warning");
            return;
        }

        if (paymentMethodTypeId === '1' && (!pmntRcvBankId || !pmntRcvBranch || !pmntRcvRn)) {
            showAlert("Please fill all bank-specific fields", "warning");
            return;
        }

        if (paymentMethodTypeId === '2' && !mfsTypeId) {
            showAlert("Please select MFS type", "warning");
            return;
        }

        const token = localStorage.getItem("authToken");
        setLoading(true);

        try {
            const method = isEditing ? 'PUT' : 'POST';
            const url = isEditing
                ? `${import.meta.env.VITE_APP_API_BASE_URL}/payment-accounts/${currentAccountId}`
                : `${import.meta.env.VITE_APP_API_BASE_URL}/payment-accounts`;

            const payload = {
                payment_method_type_id: parseInt(paymentMethodTypeId),
                app_id: parseInt(appId),
                receiver_name: receiverName,
                receiver_account_number: receiverAccountNumber,
            };

            if (paymentMethodTypeId === '1') {
                payload.pmnt_rcv_bank_id = parseInt(pmntRcvBankId);
                payload.pmnt_rcv_branch = pmntRcvBranch;
                payload.pmnt_rcv_rn = pmntRcvRn;
                payload.mfs_type_id = null;
            }

            if (paymentMethodTypeId === '2') {
                payload.mfs_type_id = parseInt(mfsTypeId);
                payload.pmnt_rcv_bank_id = null;
                payload.pmnt_rcv_branch = null;
                payload.pmnt_rcv_rn = null;
            }

            if (merchantType) payload.merchant_type = merchantType;
            if (txnCharge) payload.txn_charge = parseFloat(txnCharge);
            if (txnChargeText) payload.txn_charge_text = txnChargeText;

            const response = await fetch(url, {
                method,
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(payload),
            });

            if (response.status === 401) {
                localStorage.removeItem("authToken");
                alert("Session expired. Please log in again.");
                window.location.href = "/login";
                return;
            }

            if (!response.ok) throw new Error('Failed to save payment account');

            showAlert(
                isEditing ? "Payment account updated successfully" : "Payment account created successfully",
                "success"
            );

            fetchSupportData();
            setShowModal(false);
            resetForm();
        } catch (error) {
            console.error('Error saving payment account:', error);
            showAlert("Failed to save payment account", "danger");
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (id) => {
        const selected = allAccounts.find(a => a.id === id);
        setIsEditing(true);
        setCurrentAccountId(id);
        setAppId(selected.app_id.toString());
        setPaymentMethodTypeId(selected.payment_method_type_id.toString());
        setMfsTypeId(selected.mfs_type_id ? selected.mfs_type_id.toString() : '');
        setReceiverName(selected.receiver_name || '');
        setReceiverAccountNumber(selected.receiver_account_number || '');
        setPmntRcvBankId(selected.pmnt_rcv_bank_id ? selected.pmnt_rcv_bank_id.toString() : '');
        setPmntRcvBranch(selected.pmnt_rcv_branch || '');
        setPmntRcvRn(selected.pmnt_rcv_rn || '');
        setMerchantType(selected.merchant_type || '');
        setTxnCharge(selected.txn_charge ? selected.txn_charge.toString() : '');
        setTxnChargeText(selected.txn_charge_text || '');
        setShowModal(true);
        setActionMenuId(null);
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to delete this payment account?")) return;

        const token = localStorage.getItem("authToken");
        setLoading(true);

        try {
            const response = await fetch(`${import.meta.env.VITE_APP_API_BASE_URL}/payment-accounts/${id}`, {
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

            if (!response.ok) throw new Error('Failed to delete payment account');

            showAlert("Payment account deleted successfully", "success");
            fetchSupportData();
        } catch (error) {
            console.error('Error deleting payment account:', error);
            showAlert("Failed to delete payment account", "danger");
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
        setPaymentMethodTypeId('');
        setMfsTypeId('');
        setReceiverName('');
        setReceiverAccountNumber('');
        setPmntRcvBankId('');
        setPmntRcvBranch('');
        setPmntRcvRn('');
        setMerchantType('');
        setTxnCharge('');
        setTxnChargeText('');
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
            {/* Header with Breadcrumb */}
            <div className='mt-5' style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '7px' }}>
                <h1 style={{ margin: 0, fontSize: '20px', fontWeight: '600' }}>Payment Accounts</h1>
                <div style={{ fontSize: '13px', color: '#555', display: 'flex', alignItems: 'center' }}>
                    <span style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                        <FaHome style={{ fontSize: '14px' }} />
                        <span>Home</span>
                    </span>
                    <span style={{ margin: '0 8px' }}>/</span>
                    <span style={{ cursor: 'pointer' }} onClick={() => window.location.href = '/admin/home'}>
                        Payment Details
                    </span>
                    <span style={{ margin: '0 8px' }}>/</span>
                    <span>Payment Accounts</span>
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
                    <button onClick={() => setAlertMessage('')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '20px' }}>×</button>
                </div>
            )}

            {/* Filter Section */}
            <div style={{
                backgroundColor: 'white',
                borderRadius: '8px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                padding: '10px'
            }}>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                    {/* Application Filter */}
                    <div style={{ display: 'flex', flexDirection: 'column', position: 'relative' }} ref={appFilterRef}>
                        <label style={{ marginBottom: '4px', fontSize: '13px', fontWeight: '500' }}>Application</label>
                        <div style={{ position: 'relative', width: '200px' }}>
                            <input
                                value={searchApp}
                                readOnly
                                onClick={() => setAppDropdownOpen(!appDropdownOpen)}
                                placeholder="Select application..."
                                style={{
                                    padding: '8px 32px 8px 12px',
                                    border: '1px solid #ccc',
                                    borderRadius: '4px',
                                    width: '100%',
                                    cursor: 'pointer',
                                    fontSize: '13px'
                                }}
                            />
                            {searchApp && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setSearchApp('');
                                    }}
                                    style={{
                                        position: 'absolute',
                                        right: '8px',
                                        top: '50%',
                                        transform: 'translateY(-50%)',
                                        background: 'none',
                                        border: 'none',
                                        cursor: 'pointer',
                                        padding: '4px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        color: '#666'
                                    }}
                                >
                                    <FaTimes size={12} />
                                </button>
                            )}
                            {appDropdownOpen && (
                                <div style={{
                                    position: 'absolute',
                                    top: '100%',
                                    left: 0,
                                    right: 0,
                                    marginTop: '4px',
                                    backgroundColor: 'white',
                                    border: '1px solid #ccc',
                                    borderRadius: '4px',
                                    boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
                                    maxHeight: '200px',
                                    overflowY: 'auto',
                                    zIndex: 1000
                                }}>
                                    <input
                                        type="text"
                                        value={appFilterSearch}
                                        onChange={(e) => setAppFilterSearch(e.target.value)}
                                        placeholder="Search..."
                                        style={{
                                            width: '100%',
                                            padding: '8px',
                                            border: 'none',
                                            borderBottom: '1px solid #eee',
                                            fontSize: '13px'
                                        }}
                                        onClick={(e) => e.stopPropagation()}
                                    />
                                    {filteredAppOptions.length === 0 ? (
                                        <div style={{ padding: '8px', color: '#999', fontSize: '13px' }}>No options</div>
                                    ) : (
                                        filteredAppOptions.map((app, idx) => (
                                            <div
                                                key={idx}
                                                onClick={() => {
                                                    setSearchApp(app);
                                                    setAppDropdownOpen(false);
                                                    setAppFilterSearch('');
                                                }}
                                                style={{
                                                    padding: '8px 12px',
                                                    cursor: 'pointer',
                                                    fontSize: '13px',
                                                    backgroundColor: searchApp === app ? '#e8f1ff' : 'transparent'
                                                }}
                                                onMouseEnter={(e) => e.target.style.backgroundColor = '#f5f5f5'}
                                                onMouseLeave={(e) => e.target.style.backgroundColor = searchApp === app ? '#e8f1ff' : 'transparent'}
                                            >
                                                {app}
                                            </div>
                                        ))
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Payment Type Filter */}
                    <div style={{ display: 'flex', flexDirection: 'column', position: 'relative' }} ref={paymentTypeFilterRef}>
                        <label style={{ marginBottom: '4px', fontSize: '13px', fontWeight: '500' }}>Payment Type</label>
                        <div style={{ position: 'relative', width: '200px' }}>
                            <input
                                value={searchPaymentType}
                                readOnly
                                onClick={() => setPaymentTypeDropdownOpen(!paymentTypeDropdownOpen)}
                                placeholder="Select payment type..."
                                style={{
                                    padding: '8px 32px 8px 12px',
                                    border: '1px solid #ccc',
                                    borderRadius: '4px',
                                    width: '100%',
                                    cursor: 'pointer',
                                    fontSize: '13px'
                                }}
                            />
                            {searchPaymentType && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setSearchPaymentType('');
                                    }}
                                    style={{
                                        position: 'absolute',
                                        right: '8px',
                                        top: '50%',
                                        transform: 'translateY(-50%)',
                                        background: 'none',
                                        border: 'none',
                                        cursor: 'pointer',
                                        padding: '4px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        color: '#666'
                                    }}
                                >
                                    <FaTimes size={12} />
                                </button>
                            )}
                            {paymentTypeDropdownOpen && (
                                <div style={{
                                    position: 'absolute',
                                    top: '100%',
                                    left: 0,
                                    right: 0,
                                    marginTop: '4px',
                                    backgroundColor: 'white',
                                    border: '1px solid #ccc',
                                    borderRadius: '4px',
                                    boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
                                    maxHeight: '200px',
                                    overflowY: 'auto',
                                    zIndex: 1000
                                }}>
                                    <input
                                        type="text"
                                        value={paymentTypeFilterSearch}
                                        onChange={(e) => setPaymentTypeFilterSearch(e.target.value)}
                                        placeholder="Search..."
                                        style={{
                                            width: '100%',
                                            padding: '8px',
                                            border: 'none',
                                            borderBottom: '1px solid #eee',
                                            fontSize: '13px'
                                        }}
                                        onClick={(e) => e.stopPropagation()}
                                    />
                                    {filteredPaymentTypeOptions.length === 0 ? (
                                        <div style={{ padding: '8px', color: '#999', fontSize: '13px' }}>No options</div>
                                    ) : (
                                        filteredPaymentTypeOptions.map((type, idx) => (
                                            <div
                                                key={idx}
                                                onClick={() => {
                                                    setSearchPaymentType(type);
                                                    setPaymentTypeDropdownOpen(false);
                                                    setPaymentTypeFilterSearch('');
                                                }}
                                                style={{
                                                    padding: '8px 12px',
                                                    cursor: 'pointer',
                                                    fontSize: '13px',
                                                    backgroundColor: searchPaymentType === type ? '#e8f1ff' : 'transparent'
                                                }}
                                                onMouseEnter={(e) => e.target.style.backgroundColor = '#f5f5f5'}
                                                onMouseLeave={(e) => e.target.style.backgroundColor = searchPaymentType === type ? '#e8f1ff' : 'transparent'}
                                            >
                                                {type}
                                            </div>
                                        ))
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Receiver Name Filter */}
                    <div style={{ display: 'flex', flexDirection: 'column', position: 'relative' }} ref={receiverNameFilterRef}>
                        <label style={{ marginBottom: '4px', fontSize: '13px', fontWeight: '500' }}>Receiver Name</label>
                        <div style={{ position: 'relative', width: '200px' }}>
                            <input
                                value={searchReceiverName}
                                readOnly
                                onClick={() => setReceiverNameDropdownOpen(!receiverNameDropdownOpen)}
                                placeholder="Select receiver name..."
                                style={{
                                    padding: '8px 32px 8px 12px',
                                    border: '1px solid #ccc',
                                    borderRadius: '4px',
                                    width: '100%',
                                    cursor: 'pointer',
                                    fontSize: '13px'
                                }}
                            />
                            {searchReceiverName && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setSearchReceiverName('');
                                    }}
                                    style={{
                                        position: 'absolute',
                                        right: '8px',
                                        top: '50%',
                                        transform: 'translateY(-50%)',
                                        background: 'none',
                                        border: 'none',
                                        cursor: 'pointer',
                                        padding: '4px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        color: '#666'
                                    }}
                                >
                                    <FaTimes size={12} />
                                </button>
                            )}
                            {receiverNameDropdownOpen && (
                                <div style={{
                                    position: 'absolute',
                                    top: '100%',
                                    left: 0,
                                    right: 0,
                                    marginTop: '4px',
                                    backgroundColor: 'white',
                                    border: '1px solid #ccc',
                                    borderRadius: '4px',
                                    boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
                                    maxHeight: '200px',
                                    overflowY: 'auto',
                                    zIndex: 1000
                                }}>
                                    <input
                                        type="text"
                                        value={receiverNameFilterSearch}
                                        onChange={(e) => setReceiverNameFilterSearch(e.target.value)}
                                        placeholder="Search..."
                                        style={{
                                            width: '100%',
                                            padding: '8px',
                                            border: 'none',
                                            borderBottom: '1px solid #eee',
                                            fontSize: '13px'
                                        }}
                                        onClick={(e) => e.stopPropagation()}
                                    />
                                    {filteredReceiverNameOptions.length === 0 ? (
                                        <div style={{ padding: '8px', color: '#999', fontSize: '13px' }}>No options</div>
                                    ) : (
                                        filteredReceiverNameOptions.map((name, idx) => (
                                            <div
                                                key={idx}
                                                onClick={() => {
                                                    setSearchReceiverName(name);
                                                    setReceiverNameDropdownOpen(false);
                                                    setReceiverNameFilterSearch('');
                                                }}
                                                style={{
                                                    padding: '8px 12px',
                                                    cursor: 'pointer',
                                                    fontSize: '13px',
                                                    backgroundColor: searchReceiverName === name ? '#e8f1ff' : 'transparent'
                                                }}
                                                onMouseEnter={(e) => e.target.style.backgroundColor = '#f5f5f5'}
                                                onMouseLeave={(e) => e.target.style.backgroundColor = searchReceiverName === name ? '#e8f1ff' : 'transparent'}
                                            >
                                                {name}
                                            </div>
                                        ))
                                    )}
                                </div>
                            )}
                        </div>
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
                            fontWeight: '500'
                        }}
                    >
                        Filter
                    </button>
                    <button
                        onClick={handleClear}
                        style={{
                            padding: '8px 16px',
                            borderRadius: '4px',
                            background: 'transparent',
                            color: '#e92263',
                            border: '1px dashed #e92263',
                            cursor: 'pointer',
                            fontSize: '12px',
                            fontWeight: '500'
                        }}
                    >
                        Clear
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
                            alignItems: 'center',
                            gap: '6px'
                        }}
                    >
                        <i className="fa-solid fa-plus"></i> Create New Payment Account
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
                            <th className="py-2 px-3 fw-semibold text-start">Payment Type</th>
                            <th className="py-2 px-3 fw-semibold text-start">Bank/MFS</th>
                            <th className="py-2 px-3 fw-semibold text-start">Receiver Name</th>
                            <th className="py-2 px-3 fw-semibold text-start">Account Number</th>
                            <th className="py-2 px-3 fw-semibold text-start">Branch/Type</th>
                            {/* <th className="py-2 px-3 fw-semibold text-center" style={{ width: "80px" }}>Actions</th> */}
                        </tr>
                    </thead>
                    <tbody>
                        {accounts.length > 0 ? (
                            accounts.map((account, i) => (
                                <tr key={account.id} className="align-middle">
                                    <td className="py-1 px-3 text-center">
                                        {paginator?.current_page > 1
                                            ? (paginator?.current_page - 1) * paginator?.record_per_page + i + 1
                                            : i + 1}
                                    </td>
                                    <td className="py-1 px-3">
                                        <div style={{ fontWeight: '600', color: '#333' }}>
                                            {account.application?.name || '-'}
                                        </div>
                                    </td>
                                    <td className="py-1 px-3">
                                        <span style={{
                                            padding: '2px 8px',
                                            borderRadius: '3px',
                                            fontSize: '11px',
                                            fontWeight: '500',
                                            backgroundColor: account.payment_method_type_id === 1 ? '#e3f2fd' : '#f3e5f5',
                                            color: account.payment_method_type_id === 1 ? '#1976d2' : '#7b1fa2'
                                        }}>
                                            {account.payment_method_type?.payment_method_type || '-'}
                                        </span>
                                    </td>
                                    <td className="py-1 px-3">
                                        <div style={{ fontSize: '11px', color: '#666' }}>
                                            {account.payment_method_type_id === 1 
                                                ? account.pmnt_rcv_bank?.bank_name || '-'
                                                : account.mfs_type?.mfs_name || '-'}
                                        </div>
                                    </td>
                                    <td className="py-1 px-3">{account.receiver_name || '-'}</td>
                                    <td className="py-1 px-3">
                                        {account.receiver_account_number ? '****' + account.receiver_account_number.slice(-4) : '-'}
                                    </td>
                                    <td className="py-1 px-3">
                                        {account.payment_method_type_id === 1 
                                            ? account.pmnt_rcv_branch || '-'
                                            : account.merchant_type || '-'}
                                    </td>

                                    {/* Actions column */}
                                    {/* <td className="py-1 px-3 text-center position-relative">
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
                                    </td> */}
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="8" className="text-center text-muted py-3">
                                    No payment accounts available
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>

                {/* Pagination Info */}
                <div style={{ marginTop: '5px', fontSize: '12px', color: '#666' }}>
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
                        maxWidth: '600px',
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
                                {isEditing ? "Update Payment Account" : "Create New Payment Account"}
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

                        <div style={{ borderBottom: '1px solid #e5e7eb' }} />

                        {/* Body Section - Scrollable */}
                        <div style={{
                            padding: '14px',
                            overflowY: 'auto',
                            flex: 1,
                        }}>
                            {/* Application */}
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
                                        <option key={app.value} value={app.value}>{app.label}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Payment Method Type */}
                            <div style={{ marginBottom: '12px' }}>
                                <label style={{
                                    display: 'block',
                                    marginBottom: '6px',
                                    fontWeight: '500',
                                    fontSize: '13px',
                                    color: '#374151'
                                }}>
                                    Payment Method Type *
                                </label>
                                <select
                                    value={paymentMethodTypeId}
                                    onChange={(e) => {
                                        setPaymentMethodTypeId(e.target.value);
                                        setMfsTypeId('');
                                        setPmntRcvBankId('');
                                        setPmntRcvBranch('');
                                        setPmntRcvRn('');
                                    }}
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
                                    <option value="">Select payment method type</option>
                                    {paymentMethodTypes.map(type => (
                                        <option key={type.value} value={type.value}>{type.label}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Conditional Fields for Bank */}
                            {paymentMethodTypeId === '1' && (
                                <>
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
                                            value={pmntRcvBankId}
                                            onChange={(e) => setPmntRcvBankId(e.target.value)}
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
                                            value={pmntRcvBranch}
                                            onChange={(e) => setPmntRcvBranch(e.target.value)}
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
                                            value={pmntRcvRn}
                                            onChange={(e) => setPmntRcvRn(e.target.value)}
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
                                </>
                            )}

                            {/* Conditional Fields for MFS */}
                            {paymentMethodTypeId === '2' && (
                                <>
                                    <div style={{ marginBottom: '12px' }}>
                                        <label style={{
                                            display: 'block',
                                            marginBottom: '6px',
                                            fontWeight: '500',
                                            fontSize: '13px',
                                            color: '#374151'
                                        }}>
                                            MFS Type *
                                        </label>
                                        <select
                                            value={mfsTypeId}
                                            onChange={(e) => setMfsTypeId(e.target.value)}
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
                                            <option value="">Select MFS type</option>
                                            {mfsTypes.map(mfs => (
                                                <option key={mfs.value} value={mfs.value}>{mfs.label}</option>
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
                                            Merchant Type
                                        </label>
                                        <input
                                            type="text"
                                            value={merchantType}
                                            onChange={(e) => setMerchantType(e.target.value)}
                                            placeholder="Enter merchant type (e.g., Personal, Merchant)"
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
                                </>
                            )}

                            {/* Receiver Name */}
                            <div style={{ marginBottom: '12px' }}>
                                <label style={{
                                    display: 'block',
                                    marginBottom: '6px',
                                    fontWeight: '500',
                                    fontSize: '13px',
                                    color: '#374151'
                                }}>
                                    Receiver Name *
                                </label>
                                <input
                                    type="text"
                                    value={receiverName}
                                    onChange={(e) => setReceiverName(e.target.value)}
                                    placeholder="Enter receiver name"
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

                            {/* Receiver Account Number */}
                            <div style={{ marginBottom: '12px' }}>
                                <label style={{
                                    display: 'block',
                                    marginBottom: '6px',
                                    fontWeight: '500',
                                    fontSize: '13px',
                                    color: '#374151'
                                }}>
                                    Receiver Account Number *
                                </label>
                                <input
                                    type="text"
                                    value={receiverAccountNumber}
                                    onChange={(e) => setReceiverAccountNumber(e.target.value)}
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

                            {/* Transaction Charge */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                                <div>
                                    <label style={{
                                        display: 'block',
                                        marginBottom: '6px',
                                        fontWeight: '500',
                                        fontSize: '13px',
                                        color: '#374151'
                                    }}>
                                        Transaction Charge
                                    </label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={txnCharge}
                                        onChange={(e) => setTxnCharge(e.target.value)}
                                        placeholder="Enter charge amount"
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

                                <div>
                                    <label style={{
                                        display: 'block',
                                        marginBottom: '6px',
                                        fontWeight: '500',
                                        fontSize: '13px',
                                        color: '#374151'
                                    }}>
                                        Charge Description
                                    </label>
                                    <input
                                        type="text"
                                        value={txnChargeText}
                                        onChange={(e) => setTxnChargeText(e.target.value)}
                                        placeholder="e.g., Per transaction"
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
                            </div>
                        </div>

                        <div style={{ borderBottom: '1px solid #e5e7eb' }} />

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
                                    fontSize: '12px',
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
                                    fontSize: '12px',
                                    fontWeight: '500',
                                    opacity: loading ? 0.6 : 1,
                                }}
                            >
                                {loading ? 'Saving...' : 'Submit'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PaymentAccountPage;
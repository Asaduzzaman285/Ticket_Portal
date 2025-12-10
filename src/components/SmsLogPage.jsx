// SmsLogPage.jsx
import React, { useState, useEffect } from 'react';
import Paginate from './Paginate';
import { FaHome } from 'react-icons/fa';

const BASE_URL = `${import.meta.env.VITE_APP_API_BASE_URL}/api/v1/sms-log`;

const SmsLogPage = ({ sidebarVisible = false }) => {
    const [logs, setLogs] = useState([]);
    const [searchMsisdn, setSearchMsisdn] = useState('');
    const [searchTickets, setSearchTickets] = useState('');
    const [alertMessage, setAlertMessage] = useState('');
    const [alertVariant, setAlertVariant] = useState('success');
    const [currentPage, setCurrentPage] = useState(1);
    const [loading, setLoading] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [selectedTickets, setSelectedTickets] = useState([]);
    const [appliedFilters, setAppliedFilters] = useState({
        msisdn: '',
        tickets: ''
    });
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

    const formatBDT = (number) => {
        const num = Math.round(Number(number));
        if (Number.isNaN(num)) return '0';
        return num.toLocaleString('en-IN');
    };

    const formatDisplayDateTime = (dateTimeStr) => {
        if (!dateTimeStr) return '';
        const [date, time] = dateTimeStr.split(' ');
        const [year, month, day] = date.split('-');
        return `${day}-${month}-${year} ${time}`;
    };

    const getAuthHeaders = () => {
        let token = localStorage.getItem('authToken')
                 || localStorage.getItem('access_token')
                 || localStorage.getItem('token')
                 || localStorage.getItem('auth_token');
        
        const headers = {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
        };
        
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        
        return headers;
    };

    const handleUnauthorized = (response) => {
        if (response.status === 401) {
            showAlert('Session expired. Please login again.', 'danger');
            setTimeout(() => {
                // window.location.href = '/login';
            }, 2000);
            return true;
        }
        return false;
    };

    useEffect(() => {
        fetchLogs(1);
    }, []);

    const fetchLogs = async (page = 1, filters = null) => {
        try {
            setLoading(true);

            const queryParams = new URLSearchParams();
            queryParams.append('page', page);

            const activeFilters = filters || appliedFilters;

            if (activeFilters.msisdn) queryParams.append('msisdn', activeFilters.msisdn);
            if (activeFilters.tickets) queryParams.append('tickets', activeFilters.tickets);

            const queryString = queryParams.toString();
            const url = `${BASE_URL}/list-paginate?${queryString}`;

            const response = await fetch(url, {
                method: 'GET',
                headers: getAuthHeaders(),
                credentials: 'include',
            });

            if (handleUnauthorized(response)) return;

            if (!response.ok) {
                throw new Error(`Failed to fetch SMS logs: ${response.status} ${response.statusText}`);
            }

            const result = await response.json();

            if (result.status === 'success') {
                const logsData = result?.data?.data ?? [];
                setLogs(logsData);
                setCurrentPage(page);

                if (result.data?.paginator) {
                    setPaginator(result.data.paginator);
                } else {
                    setPaginator(prev => ({
                        ...prev,
                        current_page: page,
                        total_count: logsData.length,
                        current_page_items_count: logsData.length
                    }));
                }
            } else {
                throw new Error(result.message || 'Failed to fetch SMS logs');
            }
        } catch (error) {
            console.error('Error fetching SMS logs:', error);
            showAlert(error.message || "Failed to fetch SMS logs", "danger");
        } finally {
            setLoading(false);
        }
    };

    const handleClear = () => {
        setSearchMsisdn('');
        setSearchTickets('');

        const emptyFilters = {
            msisdn: '',
            tickets: ''
        };
        
        setAppliedFilters(emptyFilters);
        setCurrentPage(1);
        fetchLogs(1, emptyFilters);
    };

    const handleFilter = () => {
        const filters = {
            msisdn: searchMsisdn,
            tickets: searchTickets
        };

        setAppliedFilters(filters);
        setCurrentPage(1);
        fetchLogs(1, filters);
    };

    const handlePageChange = (page) => {
        setCurrentPage(page);
        fetchLogs(page);
    };

    const showAlert = (message, variant) => {
        setAlertMessage(message);
        setAlertVariant(variant);
        setTimeout(() => setAlertMessage(''), 3000);
    };

    const handleShowTickets = (ticketNumbers) => {
        setSelectedTickets(ticketNumbers.split(',').map(t => t.trim()));
        setShowModal(true);
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

    const SkeletonRow = () => (
        <tr>
            {[...Array(6)].map((_, i) => (
                <td key={i} className="py-1 px-3">
                    <div style={{
                        height: '16px',
                        background: 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)',
                        backgroundSize: '200% 100%',
                        animation: 'loading 1.5s infinite',
                        borderRadius: '4px'
                    }} />
                </td>
            ))}
        </tr>
    );

    const containerStyle = sidebarVisible
        ? { padding: '16px', backgroundColor: '#F5F5F5', overflowX: 'hidden', minHeight: '100vh', marginLeft: '193px' }
        : { padding: '16px', backgroundColor: '#F5F5F5', overflowX: 'hidden', minHeight: '100vh' };

    return (
        <div style={containerStyle}>
            {/* Header with Breadcrumb */}
            <div className='mt-5' style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '7px' }}>
                <h1 style={{ margin: 0, fontSize: '20px', fontWeight: '600' }}>SMS Log</h1>
                <div style={{ fontSize: '13px', color: '#555', display: 'flex', alignItems: 'center' }}>
                    <span
                        style={{
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            transition: 'color 0.2s'
                        }}
                        onClick={() => window.location.href = '/admin/home'}
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
                        Reports
                    </span>
                    <span style={{ margin: '0 8px' }}>/</span>
                    <span>SMS Log</span>
                </div>
            </div>

            {/* Alert */}
            {alertMessage && (
                <div style={{
                    padding: '12px 20px',
                    marginBottom: '11px',
                    borderRadius: '4px',
                    backgroundColor: alertVariant === 'success' ? '#d4edda' : alertVariant === 'danger' ? '#f8d7da' : alertVariant === 'info' ? '#d1ecf1' : '#fff3cd',
                    color: alertVariant === 'success' ? '#155724' : alertVariant === 'danger' ? '#721c24' : alertVariant === 'info' ? '#0c5460' : '#856404',
                    border: `1px solid ${alertVariant === 'success' ? '#c3e6cb' : alertVariant === 'danger' ? '#f5c6cb' : alertVariant === 'info' ? '#bee5eb' : '#ffeeba'}`,
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
                    {/* MSISDN/Phone Input */}
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <label style={{ marginBottom: '4px', fontSize: '13px', fontWeight: '500', color: '#333' }}>
                            MSISDN/Phone
                        </label>
                        <input
                            type="text"
                            value={searchMsisdn}
                            onChange={(e) => setSearchMsisdn(e.target.value)}
                            placeholder="Enter phone number"
                            style={{
                                padding: '8px 12px',
                                border: '1px solid #ccc',
                                borderRadius: '4px',
                                fontSize: '13px',
                                width: '150px',
                                backgroundColor: '#fff',
                            }}
                        />
                    </div>

                    {/* Tickets Input */}
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <label style={{ marginBottom: '4px', fontSize: '13px', fontWeight: '500', color: '#333' }}>
                            Tickets
                        </label>
                        <input
                            type="text"
                            value={searchTickets}
                            onChange={(e) => setSearchTickets(e.target.value)}
                            placeholder="Enter ticket numbers"
                            style={{
                                padding: '8px 12px',
                                border: '1px solid #ccc',
                                borderRadius: '4px',
                                fontSize: '13px',
                                width: '150px',
                                backgroundColor: '#fff',
                            }}
                        />
                    </div>

                    {/* Filter Button */}
                    <button
                        onClick={handleFilter}
                        disabled={loading}
                        style={{
                            padding: '8px 16px',
                            borderRadius: '4px',
                            background: 'linear-gradient(45deg, #007bff, #0056b3)',
                            color: 'white',
                            border: 'none',
                            cursor: loading ? 'not-allowed' : 'pointer',
                            fontSize: '12px',
                            boxShadow: '0 1px 2px rgba(0,0,0,0.15)',
                            display: 'inline-flex',
                            alignItems: 'center',
                            height: '34px',
                            opacity: loading ? 0.6 : 1
                        }}
                    >
                        {loading ? (
                            <>
                                <i className="fa-solid fa-spinner fa-spin" style={{ marginRight: '6px', fontSize: '12px' }}></i>
                                Filtering...
                            </>
                        ) : (
                            <>
                                <i className="fa-solid fa-filter" style={{ marginRight: '6px', fontSize: '12px' }}></i>
                                Filter
                            </>
                        )}
                    </button>

                    {/* Clear Button */}
                    <button
                        onClick={handleClear}
                        disabled={loading}
                        style={{
                            padding: '8px 16px',
                            borderRadius: '2px',
                            background: 'transparent',
                            color: 'rgb(233, 30, 99)',
                            border: '1px dashed',
                            cursor: loading ? 'not-allowed' : 'pointer',
                            fontSize: '12px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            height: '34px',
                            opacity: loading ? 0.6 : 1
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
                padding: '10px',
                overflowX: 'auto'
            }}>
                {/* Table */}
                <table
                    className="table table-bordered table-hover table-sm align-middle"
                    style={{ fontSize: "12px", lineHeight: "1.8" }}
                >
                    <thead className="table-light">
                        <tr>
                            <th className="py-2 px-3 fw-semibold text-center" style={{ width: "60px" }}>S/N</th>
                            <th className="py-2 px-3 fw-semibold text-start">MSISDN</th>
                            <th className="py-2 px-3 fw-semibold text-start">Tickets</th>
                            <th className="py-2 px-3 fw-semibold text-start">Message</th>
                            <th className="py-2 px-3 fw-semibold text-start">Log Time</th>
                            <th className="py-2 px-3 fw-semibold text-start">Send By</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <>
                                <SkeletonRow />
                                <SkeletonRow />
                                <SkeletonRow />
                                <SkeletonRow />
                                <SkeletonRow />
                            </>
                        ) : logs.length > 0 ? (
                            logs.map((log, i) => (
                                <tr key={log.id} className="align-middle">
                                    <td className="py-1 px-3 text-center">
                                        {paginator?.current_page > 1
                                            ? (paginator?.current_page - 1) * paginator?.record_per_page + i + 1
                                            : i + 1}
                                    </td>
                                    <td className="py-1 px-3">
                                        <div style={{ lineHeight: '1.3' }}>
                                            <div style={{ fontSize: '11px', fontWeight: '500' }}>
                                                {log.msisdn || 'N/A'}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="py-1 px-3">
                                        {log.tickets ? (
                                            log.tickets.includes(',') ? (
                                                <span 
                                                    style={{ cursor: 'pointer', color: '#007bff' }} 
                                                    onClick={() => handleShowTickets(log.tickets)}
                                                >
                                                    {log.tickets.split(',').length} tickets <i className="fa-solid fa-eye" style={{ fontSize: '12px' }}></i>
                                                </span>
                                            ) : (
                                                log.tickets
                                            )
                                        ) : 'N/A'}
                                    </td>
                                    <td className="py-1 px-3">
                                        <div style={{ 
                                            fontSize: '11px', 
                                            maxWidth: '300px',
                                            whiteSpace: 'pre-wrap',
                                            wordBreak: 'break-word'
                                        }}>
                                            {log.message || 'N/A'}
                                        </div>
                                    </td>
                                    <td className="py-1 px-3">
                                        <div style={{ fontSize: '11px' }}>
                                            {formatDisplayDateTime(log.logtime) || 'N/A'}
                                        </div>
                                    </td>
                                    <td className="py-1 px-3">
                                        <div style={{ fontSize: '11px' }}>
                                            {log.send_by || ''}
                                        </div>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="6" className="text-center text-muted py-3">
                                    {Object.keys(appliedFilters).some(key => appliedFilters[key])
                                        ? "No SMS logs found matching your filters"
                                        : "No SMS logs available"
                                    }
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>

                {/* Pagination Info */}
                {!loading && (
                    <div style={{ marginTop: '5px', fontSize: '12px', color: '#666' }}>
                        Showing{" "}
                        {paginator.current_page_items_count > 0
                            ? formatBDT((paginator.current_page - 1) * paginator.record_per_page + 1)
                            : 0}{" "}
                        to{" "}
                        {formatBDT(Math.min(
                            paginator.current_page * paginator.record_per_page,
                            paginator.total_count
                        ))}{" "}
                        of {formatBDT(paginator.total_count)} results
                    </div>
                )}

                {/* Pagination Controls */}
                {!loading && paginator?.total_pages > 1 && (
                    <div style={{ marginTop: '-20px' }}>
                        {renderPagination()}
                    </div>
                )}
            </div>

            {/* Ticket Numbers Modal */}
            {showModal && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    background: 'rgba(0,0,0,0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 9999
                }}>
                    <div style={{
                        background: 'white',
                        padding: '20px',
                        borderRadius: '8px',
                        maxWidth: '400px',
                        maxHeight: '80%',
                        overflowY: 'auto'
                    }}>
                        <h3 style={{ fontSize: '16px', marginBottom: '10px' }}>Ticket Numbers</h3>
                        <div style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '5px',
                            fontSize: '12px'
                        }}>
                            {selectedTickets.map((ticket, index) => (
                                <div key={index}>{ticket}</div>
                            ))}
                        </div>
                        <button 
                            onClick={() => setShowModal(false)}
                            style={{
                                marginTop: '15px',
                                padding: '8px 16px',
                                background: '#007bff',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer'
                            }}
                        >
                            Close
                        </button>
                    </div>
                </div>
            )}

            {/* Global Styles */}
            <style>{`
                @keyframes loading {
                    0% { background-position: 200% 0; }
                    100% { background-position: -200% 0; }
                }
                
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
};

export default SmsLogPage;
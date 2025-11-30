// MerchantWiseAllotmentPage.jsx
import React, { useState, useEffect } from 'react';
import { FaHome } from 'react-icons/fa';

// Mock components for demonstration
const Select = ({ value, onChange, options, placeholder, isClearable, isSearchable, styles }) => (
  <select 
    value={value?.value || ''} 
    onChange={(e) => {
      const selected = options.find(o => o.value.toString() === e.target.value);
      onChange(selected || null);
    }}
    style={{...styles?.control?.({}, {}), display: 'block'}}
  >
    <option value="">{placeholder}</option>
    {options.map(opt => (
      <option key={opt.value} value={opt.value}>{opt.label}</option>
    ))}
  </select>
);

const SkeletonLoader = ({ type, count, columns }) => {
  if (type === 'filter') {
    return Array(count).fill(0).map((_, i) => (
      <div key={i} style={{width: '150px', height: '34px', background: '#e0e0e0', borderRadius: '4px'}}></div>
    ));
  }
  if (type === 'table') {
    return Array(count).fill(0).map((_, i) => (
      <tr key={i}>
        {Array(columns).fill(0).map((_, j) => (
          <td key={j}><div style={{height: '20px', background: '#e0e0e0', borderRadius: '4px'}}></div></td>
        ))}
      </tr>
    ));
  }
  return null;
};

const Paginate = ({ currentPage, totalPages, onPageChange, paginator }) => {
  const startItem = (currentPage - 1) * paginator.record_per_page + 1;
  const endItem = Math.min(currentPage * paginator.record_per_page, paginator.total_count);
  
  return (
    <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', padding: '10px 0'}}>
      <div style={{fontSize: '13px', color: '#555'}}>
        Showing {startItem} to {endItem} of {paginator.total_count} results
      </div>
      <div style={{display: 'flex', gap: '8px'}}>
        <button 
          disabled={currentPage === 1} 
          onClick={() => onPageChange(currentPage - 1)}
          style={{
            padding: '6px 12px', 
            fontSize: '12px', 
            borderRadius: '4px', 
            border: '1px solid #ccc',
            cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
            opacity: currentPage === 1 ? 0.5 : 1,
            backgroundColor: '#fff'
          }}
        >
          Previous
        </button>
        <span style={{padding: '6px 12px', fontSize: '12px', display: 'flex', alignItems: 'center'}}>
          Page {currentPage} of {totalPages}
        </span>
        <button 
          disabled={currentPage === totalPages} 
          onClick={() => onPageChange(currentPage + 1)}
          style={{
            padding: '6px 12px', 
            fontSize: '12px', 
            borderRadius: '4px', 
            border: '1px solid #ccc',
            cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
            opacity: currentPage === totalPages ? 0.5 : 1,
            backgroundColor: '#fff'
          }}
        >
          Next
        </button>
      </div>
    </div>
  );
};

const BASE_URL = `https://lotteryapi.wineds.com/api/v1/merchant-wise-allotment`;

const MerchantWiseAllotmentPage = ({ sidebarVisible = false }) => {
    const [allotments, setAllotments] = useState([]);
    const [searchMerchant, setSearchMerchant] = useState('');
    const [searchDateFrom, setSearchDateFrom] = useState('');
    const [searchDateTo, setSearchDateTo] = useState('');
    const [alertMessage, setAlertMessage] = useState('');
    const [alertVariant, setAlertVariant] = useState('success');
    const [currentPage, setCurrentPage] = useState(1);
    const [loading, setLoading] = useState(false);
    const [actionMenuId, setActionMenuId] = useState(null);
    const [filterOptions, setFilterOptions] = useState({
        merchant_list: []
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

    const [filterOptionsLoading, setFilterOptionsLoading] = useState(true);

    // Get auth headers
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

    // Handle 401 errors
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

    // Fetch allotments and filter options on mount
    useEffect(() => {
        fetchFilterOptions();
        fetchAllotments();
    }, []);

    // Handle click outside for action menu
    useEffect(() => {
        const handleClickOutside = () => setActionMenuId(null);
        if (actionMenuId !== null) {
            document.addEventListener('click', handleClickOutside);
            return () => document.removeEventListener('click', handleClickOutside);
        }
    }, [actionMenuId]);

    const handleDateChange = (setter) => (e) => {
        setter(e.target.value);
    };

    const formatDisplayDate = (dateStr) => {
        if (!dateStr) return '';
        const [year, month, day] = dateStr.split('-');
        return `${day}-${month}-${year}`;
    };

    // Fetch filter options
    const fetchFilterOptions = async () => {
        try {
            setFilterOptionsLoading(true);
            const response = await fetch(`${BASE_URL}/filter-data`, {
                method: 'GET',
                headers: getAuthHeaders(),
                credentials: 'include',
            });

            if (handleUnauthorized(response)) return;

            if (!response.ok) {
                throw new Error(`${response.status} ${response.statusText}`);
            }

            const result = await response.json();

            if (result.status === 'success') {
                const data = result?.data ?? {};
                const merchantList = data.merchant_list?.map((m) => ({
                    value: m.value,
                    label: m.label
                })) ?? [];

                setFilterOptions({
                    merchant_list: merchantList
                });
            }
        } catch (error) {
            console.error('Error fetching filter options:', error);
            showAlert('Failed to load filter options', 'danger');
        } finally {
            setFilterOptionsLoading(false);
        }
    };

    // Fetch allotments
    const fetchAllotments = async (filters = {}) => {
        try {
            setLoading(true);

            const queryParams = new URLSearchParams();
            if (filters.merchant_id) queryParams.append('merchant_id', filters.merchant_id);
            if (filters.start_time) queryParams.append('start_time', filters.start_time);
            if (filters.end_time) queryParams.append('end_time', filters.end_time);

            const queryString = queryParams.toString();
            const url = queryString
                ? `${BASE_URL}/list-paginate?${queryString}`
                : `${BASE_URL}/list-paginate`;

            const response = await fetch(url, {
                method: 'GET',
                headers: getAuthHeaders(),
                credentials: 'include',
            });

            if (handleUnauthorized(response)) return;

            if (!response.ok) {
                throw new Error(`Failed to fetch allotments: ${response.status} ${response.statusText}`);
            }

            const result = await response.json();

            if (result.status === 'success') {
                const allotmentsData = result?.data?.data ?? [];
                const paginatorData = result?.data?.paginator ?? {};
                
                setAllotments(allotmentsData);
                setPaginator(paginatorData);
                setCurrentPage(paginatorData.current_page || 1);
            } else {
                throw new Error(result.message || 'Failed to fetch allotments');
            }
        } catch (error) {
            console.error('Error fetching allotments:', error);
            showAlert(error.message || "Failed to fetch allotments", "danger");
        } finally {
            setLoading(false);
        }
    };

    const handleClear = () => {
        setSearchMerchant('');
        setSearchDateFrom('');
        setSearchDateTo('');
        setCurrentPage(1);
        fetchAllotments();
    };

    const handleFilter = () => {
        const filters = {
            merchant_id: searchMerchant,
            start_time: searchDateFrom,
            end_time: searchDateTo
        };

        fetchAllotments(filters);
    };

    const handleViewDetails = (allotment) => {
        setActionMenuId(null);
        showAlert(`Viewing details for merchant: ${allotment.merchant_name}`, 'info');
    };

    const handleEditAllotment = (allotment) => {
        setActionMenuId(null);
        showAlert(`Editing allotment for merchant: ${allotment.merchant_name}`, 'info');
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
                <h1 style={{ margin: 0, fontSize: '20px', fontWeight: '600' }}>Merchant Wise Allotment</h1>
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
                    <span>Merchant Allotment</span>
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
                {filterOptionsLoading ? (
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'start', alignItems: 'flex-end', marginBottom: '10px', flexWrap: 'wrap' }}>
                        <SkeletonLoader type="filter" count={4} />
                    </div>
                ) : (
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'start', alignItems: 'flex-end', marginBottom: '10px', flexWrap: 'wrap' }}>
                        {/* Merchant Dropdown */}
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <label style={{ marginBottom: '4px', fontSize: '13px', fontWeight: '500', color: '#333' }}>
                                Merchant
                            </label>
                            <Select
                                value={searchMerchant ? filterOptions.merchant_list.find(m => m.value.toString() === searchMerchant.toString()) : null}
                                onChange={(selectedOption) => setSearchMerchant(selectedOption ? selectedOption.value : '')}
                                options={[
                                    { value: '', label: 'All Merchants' },
                                    ...filterOptions.merchant_list
                                ]}
                                isClearable={true}
                                styles={{
                                    control: (base, state) => ({
                                        ...base,
                                        padding: '2px 0px',
                                        border: '1px solid #ccc',
                                        borderRadius: '4px',
                                        fontSize: '13px',
                                        width: '200px',
                                        backgroundColor: '#fff',
                                        cursor: 'pointer',
                                        minHeight: '34px',
                                    }),
                                }}
                                isSearchable={true}
                                placeholder="All Merchants"
                            />
                        </div>

                        {/* Date From */}
                        <div style={{ display: 'flex', flexDirection: 'column', position: 'relative' }}>
                            <label style={{ marginBottom: '4px', fontSize: '13px', fontWeight: '500', color: '#333' }}>
                                Start Time
                            </label>
                            <input
                                type="text"
                                readOnly
                                value={formatDisplayDate(searchDateFrom)}
                                placeholder="dd-mm-yyyy"
                                onClick={() => document.getElementById('dateFromReal').showPicker()}
                                style={{
                                    padding: '8px 12px',
                                    border: '1px solid #ccc',
                                    borderRadius: '4px',
                                    fontSize: '13px',
                                    width: '150px',
                                    backgroundColor: '#fff',
                                    cursor: 'pointer',
                                }}
                            />
                            <input
                                id="dateFromReal"
                                type="date"
                                value={searchDateFrom}
                                onChange={handleDateChange(setSearchDateFrom)}
                                style={{
                                    position: 'absolute',
                                    opacity: 0,
                                    pointerEvents: 'none',
                                }}
                            />
                        </div>

                        {/* Date To */}
                        <div style={{ display: 'flex', flexDirection: 'column', position: 'relative' }}>
                            <label style={{ marginBottom: '4px', fontSize: '13px', fontWeight: '500', color: '#333' }}>
                                End Time
                            </label>
                            <input
                                type="text"
                                readOnly
                                value={formatDisplayDate(searchDateTo)}
                                placeholder="dd-mm-yyyy"
                                onClick={() => document.getElementById('dateToReal').showPicker()}
                                style={{
                                    padding: '8px 12px',
                                    border: '1px solid #ccc',
                                    borderRadius: '4px',
                                    fontSize: '13px',
                                    width: '150px',
                                    backgroundColor: '#fff',
                                    cursor: 'pointer',
                                }}
                            />
                            <input
                                id="dateToReal"
                                type="date"
                                value={searchDateTo}
                                onChange={handleDateChange(setSearchDateTo)}
                                style={{
                                    position: 'absolute',
                                    opacity: 0,
                                    pointerEvents: 'none',
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
                            {loading ? 'Filtering...' : 'Filter'}
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
                            Clear
                        </button>
                    </div>
                )}
            </div>

            {/* Card Container */}
            <div className='mt-3' style={{
                backgroundColor: 'white',
                borderRadius: '8px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                padding: '10px'
            }}>
                {/* Table */}
                <table
                    className="table table-bordered table-hover table-sm align-middle"
                    style={{ fontSize: "12px", lineHeight: "1.8", width: '100%' }}
                >
                    <thead className="table-light">
                        <tr>
                            <th className="py-2 px-3 fw-semibold text-center" style={{ width: "60px" }}>S/N</th>
                            <th className="py-2 px-3 fw-semibold text-start">Merchant</th>
                            <th className="py-2 px-3 fw-semibold text-center">Ticket Allotment</th>
                            <th className="py-2 px-3 fw-semibold text-center">Available</th>
                            <th className="py-2 px-3 fw-semibold text-center">Total Sales</th>
                            <th className="py-2 px-3 fw-semibold text-center">Sales Amount</th>
                            {/* <th className="py-2 px-3 fw-semibold text-center" style={{ width: "100px" }}>Actions</th> */}
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <SkeletonLoader type="table" count={5} columns={7} />
                        ) : allotments.length > 0 ? (
                            allotments.map((allotment, i) => (
                                <tr key={i} className="align-middle">
                                    <td className="py-1 px-3 text-center">{(currentPage - 1) * paginator.record_per_page + i + 1}</td>
                                    <td className="py-1 px-3">{allotment.merchant_name || 'N/A'}</td>
                                    <td className="py-1 px-3 text-center">{allotment.ticket_allotment || 0}</td>
                                    <td className="py-1 px-3 text-center">{allotment.ticket_available || 0}</td>
                                    <td className="py-1 px-3 text-center">{allotment.total_sales || 0}</td>
                                    <td className="py-1 px-3 text-center">{allotment.total_sales_amount || 0}</td>

                                    {/* Actions column */}
                                    {/* <td className="py-1 px-3 text-center position-relative">
                                        <button
                                            className="btn btn-link p-0"
                                            style={{ fontSize: "12px" }}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setActionMenuId(actionMenuId === i ? null : i);
                                            }}
                                        >
                                            ⋮
                                        </button>

                                        {actionMenuId === i && (
                                            <div
                                                className="position-absolute bg-white border rounded shadow-sm py-1"
                                                style={{
                                                    top: "24px",
                                                    right: "10px",
                                                    zIndex: 10,
                                                    minWidth: "120px",
                                                    fontSize: "12px",
                                                    lineHeight: "1.1",
                                                }}
                                            >
                                                <button
                                                    onClick={() => handleViewDetails(allotment)}
                                                    className="dropdown-item py-0 px-2 d-flex align-items-center text-primary"
                                                    style={{ fontSize: "12px", height: "24px" }}
                                                >
                                                    View
                                                </button>
                                                <button
                                                    onClick={() => handleEditAllotment(allotment)}
                                                    className="dropdown-item py-0 px-2 d-flex align-items-center text-warning"
                                                    style={{ fontSize: "12px", height: "24px" }}
                                                >
                                                    Edit
                                                </button>
                                            </div>
                                        )}
                                    </td> */}
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="7" className="text-center text-muted py-3">
                                    No allotments found
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>

                {/* Pagination Info */}
                {!loading && allotments.length > 0 && (
                    <div style={{ marginTop: '5px', fontSize: '12px', color: '#666' }}>
                        Showing {paginator.current_page_items_count > 0 ? (paginator.current_page - 1) * paginator.record_per_page + 1 : 0} to {Math.min(paginator.current_page * paginator.record_per_page, paginator.total_count)} of {paginator.total_count} results
                    </div>
                )}

                {/* Pagination Controls */}
                {!loading && paginator?.total_pages > 1 && (
                    <div style={{ marginTop: '-20px' }}>
                        <Paginate 
                            paginator={paginator}
                            currentPage={paginator.current_page}
                            pagechanged={(page) => {
                                setCurrentPage(page);
                                const filters = {
                                    merchant_id: searchMerchant,
                                    start_time: searchDateFrom,
                                    end_time: searchDateTo
                                };
                                fetchAllotments(filters);
                            }}
                        />
                    </div>
                )}
            </div>
        </div>
    );
};

export default MerchantWiseAllotmentPage;
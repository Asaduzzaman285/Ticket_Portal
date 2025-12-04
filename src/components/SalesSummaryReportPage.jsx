// SalesSummaryReportPage.jsx
import React, { useState, useEffect, useMemo } from 'react';
import Paginate from './Paginate';
import { FaHome } from 'react-icons/fa';
import Select from 'react-select';
import SkeletonLoader from './SkeletonLoader';

const BASE_URL = `${import.meta.env.VITE_APP_API_BASE_URL}/api/v1/summary-report`;

const SalesSummaryReportPage = ({ sidebarVisible = false }) => {
    const [allReports, setAllReports] = useState([]);
    const [reports, setReports] = useState([]);
    const [searchMerchant, setSearchMerchant] = useState('');
    const [searchTicketType, setSearchTicketType] = useState('');
    const [searchDateFrom, setSearchDateFrom] = useState('');
    const [searchDateTo, setSearchDateTo] = useState('');
    const [alertMessage, setAlertMessage] = useState('');
    const [alertVariant, setAlertVariant] = useState('success');
    const [currentPage, setCurrentPage] = useState(1);
    const [loading, setLoading] = useState(false);
    const [downloading, setDownloading] = useState(false);
    const [actionMenuId, setActionMenuId] = useState(null);
    const [filterOptions, setFilterOptions] = useState({
        merchant_list: []
    });
    const [appliedFilters, setAppliedFilters] = useState({
        merchant_id: '',
        ticket_type: '',
        start_time: '',
        end_time: ''
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

    const ITEMS_PER_PAGE = 10;

    const ticketTypeOptions = [
        { value: '', label: 'All Types' },
        { value: 'virtual', label: 'Virtual' },
        { value: 'physical', label: 'Physical' }
    ];

    const handleDateChange = (setter) => (e) => {
        setter(e.target.value);
    };

    const formatDisplayDate = (dateStr) => {
        if (!dateStr) return '';
        const [year, month, day] = dateStr.split('-');
        return `${day}-${month}-${year}`;
    };

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
    const formatBDT = (number) => {
  const num = Math.round(Number(number)); // round to nearest integer
  if (Number.isNaN(num)) return '0';
  return num.toLocaleString('en-IN'); // format with commas
};

    // Fetch reports and filter options on mount
    useEffect(() => {
        fetchFilterOptions();
        fetchReports();
    }, []);

    // Handle click outside for action menu
    useEffect(() => {
        const handleClickOutside = () => setActionMenuId(null);
        if (actionMenuId !== null) {
            document.addEventListener('click', handleClickOutside);
            return () => document.removeEventListener('click', handleClickOutside);
        }
    }, [actionMenuId]);

    // Memoized filtered reports
    const filteredReports = useMemo(() => {
        if (!appliedFilters.merchant_id && !appliedFilters.ticket_type && !appliedFilters.start_time && !appliedFilters.end_time) {
            return allReports;
        }

        return allReports.filter(report => {
            const matchesMerchant = appliedFilters.merchant_id === '' ||
                report.merchant_id?.toString() === appliedFilters.merchant_id.toString();
            const matchesTicketType = appliedFilters.ticket_type === '' ||
                report.ticket_type === appliedFilters.ticket_type;

            // For summary reports, we might not have purchase_time, so we'll rely on the API filtering
            return matchesMerchant && matchesTicketType;
        });
    }, [allReports, appliedFilters]);

    // Paginate whenever currentPage or filteredReports changes
    useEffect(() => {
        paginateReports(currentPage);
    }, [currentPage, filteredReports]);

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

    // Fetch reports
    const fetchReports = async (filters = {}) => {
        try {
            setLoading(true);

            const queryParams = new URLSearchParams();
            if (filters.merchant_id) queryParams.append('merchant_id', filters.merchant_id);
            if (filters.ticket_type) queryParams.append('ticket_type', filters.ticket_type);
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
                throw new Error(`Failed to fetch reports: ${response.status} ${response.statusText}`);
            }

            const result = await response.json();

            if (result.status === 'success') {
                const reportsData = result?.data?.data ?? result?.data ?? [];
                setAllReports(reportsData);
                setCurrentPage(1);
                
                // Set paginator from API response if available
                if (result.data?.paginator) {
                    setPaginator(result.data.paginator);
                }
            } else {
                throw new Error(result.message || 'Failed to fetch reports');
            }
        } catch (error) {
            console.error('Error fetching reports:', error);
            showAlert(error.message || "Failed to fetch reports", "danger");
        } finally {
            setLoading(false);
        }
    };

    const paginateReports = (page) => {
        const totalItems = filteredReports.length;
        const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE) || 1;
        const startIndex = (page - 1) * ITEMS_PER_PAGE;
        const endIndex = startIndex + ITEMS_PER_PAGE;
        const paginatedReports = filteredReports.slice(startIndex, endIndex);

        setReports(paginatedReports);
        setPaginator(prev => ({
            ...prev,
            current_page: page,
            total_pages: totalPages,
            previous_page_url: page > 1 ? page - 1 : null,
            next_page_url: page < totalPages ? page + 1 : null,
            record_per_page: ITEMS_PER_PAGE,
            current_page_items_count: paginatedReports.length,
            total_count: totalItems,
            pagination_last_page: totalPages
        }));
    };

    const handleClear = () => {
        setSearchMerchant('');
        setSearchTicketType('');
        setSearchDateFrom('');
        setSearchDateTo('');
        setAppliedFilters({
            merchant_id: '',
            ticket_type: '',
            start_time: '',
            end_time: ''
        });
        setCurrentPage(1);
        fetchReports();
    };

    const handleFilter = () => {
        const filters = {
            merchant_id: searchMerchant,
            ticket_type: searchTicketType,
            start_time: searchDateFrom ? `${searchDateFrom} 00:00:00` : '',
            end_time: searchDateTo ? `${searchDateTo} 23:59:59` : ''
        };

        setAppliedFilters(filters);

        const activeFilters = Object.fromEntries(
            Object.entries(filters).filter(([_, value]) => value !== '')
        );

        if (Object.keys(activeFilters).length === 0) {
            fetchReports();
            showAlert("Showing all reports", "info");
        } else {
            fetchReports(activeFilters);
        }
    };

    const handleDownloadAll = async () => {
        try {
            setDownloading(true);

            const queryParams = new URLSearchParams();
            if (appliedFilters.merchant_id) queryParams.append('merchant_id', appliedFilters.merchant_id);
            if (appliedFilters.ticket_type) queryParams.append('ticket_type', appliedFilters.ticket_type);
            if (appliedFilters.start_time) queryParams.append('start_time', appliedFilters.start_time);
            if (appliedFilters.end_time) queryParams.append('end_time', appliedFilters.end_time);

            const queryString = queryParams.toString();
            const url = queryString
                ? `${BASE_URL}/report-download?${queryString}`
                : `${BASE_URL}/report-download`;

            const response = await fetch(url, {
                method: 'POST',
                headers: getAuthHeaders(),
                credentials: 'include',
            });

            if (handleUnauthorized(response)) return;

            if (!response.ok) {
                throw new Error('Failed to download report');
            }

            // Get filename from Content-Disposition header or use default
            const contentDisposition = response.headers.get('Content-Disposition');
            let filename = 'summary-report.xlsx';
            if (contentDisposition) {
                const filenameMatch = contentDisposition.match(/filename="?(.+)"?/i);
                if (filenameMatch) {
                    filename = filenameMatch[1];
                }
            }

            // Download the file
            const blob = await response.blob();
            const downloadUrl = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = downloadUrl;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(downloadUrl);

            showAlert('Summary report downloaded successfully', 'success');
        } catch (error) {
            console.error('Error downloading summary report:', error);
            showAlert('Failed to download summary report', 'danger');
        } finally {
            setDownloading(false);
        }
    };

    const handleDownloadSingle = async (report) => {
        setActionMenuId(null);
        
        try {
            const queryParams = new URLSearchParams();
            if (report.merchant_name) {
                // Find merchant ID from filter options
                const merchant = filterOptions.merchant_list.find(m => m.label === report.merchant_name);
                if (merchant) {
                    queryParams.append('merchant_id', merchant.value);
                }
            }

            const url = `${BASE_URL}/report-download?${queryParams.toString()}`;

            const response = await fetch(url, {
                method: 'POST',
                headers: getAuthHeaders(),
                credentials: 'include',
            });

            if (handleUnauthorized(response)) return;

            if (!response.ok) {
                throw new Error('Failed to download merchant summary report');
            }

            // Get filename from Content-Disposition header or use default
            const contentDisposition = response.headers.get('Content-Disposition');
            let filename = `summary-${report.merchant_name || 'report'}.xlsx`;
            if (contentDisposition) {
                const filenameMatch = contentDisposition.match(/filename="?(.+)"?/i);
                if (filenameMatch) {
                    filename = filenameMatch[1];
                }
            }

            // Download the file
            const blob = await response.blob();
            const downloadUrl = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = downloadUrl;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(downloadUrl);

            showAlert(`Summary for ${report.merchant_name} downloaded successfully`, 'success');
        } catch (error) {
            console.error('Error downloading merchant summary report:', error);
            showAlert('Failed to download merchant summary report', 'danger');
        }
    };

    const handlePageChange = (page) => {
        setCurrentPage(page);
    };

    const showAlert = (message, variant) => {
        setAlertMessage(message);
        setAlertVariant(variant);
        setTimeout(() => setAlertMessage(''), 3000);
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

    const containerStyle = sidebarVisible
        ? { padding: '16px', backgroundColor: '#F5F5F5', overflowX: 'hidden', minHeight: '100vh', marginLeft: '193px' }
        : { padding: '16px', backgroundColor: '#F5F5F5', overflowX: 'hidden', minHeight: '100vh' };

    return (
        <div style={containerStyle}>
            {/* Header with Breadcrumb */}
            <div className='mt-5' style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '7px' }}>
                <h1 style={{ margin: 0, fontSize: '20px', fontWeight: '600' }}>Sales Summary Report</h1>
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
                    <span>Sales Summary Report</span>
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
                                        boxShadow: state.isFocused ? '0 0 0 1px #007bff' : 'none',
                                        borderColor: state.isFocused ? '#007bff' : '#ccc',
                                        '&:hover': {
                                            borderColor: state.isFocused ? '#007bff' : '#999'
                                        }
                                    }),
                                    menu: (base) => ({
                                        ...base,
                                        fontSize: '13px',
                                        zIndex: 9999
                                    }),
                                    option: (base, state) => ({
                                        ...base,
                                        backgroundColor: state.isSelected ? '#007bff' : state.isFocused ? '#f8f9fa' : 'white',
                                        color: state.isSelected ? 'white' : '#333',
                                        cursor: 'pointer',
                                        '&:active': {
                                            backgroundColor: '#007bff',
                                            color: 'white'
                                        }
                                    }),
                                    singleValue: (base) => ({
                                        ...base,
                                        color: '#333'
                                    }),
                                    placeholder: (base) => ({
                                        ...base,
                                        color: '#999'
                                    })
                                }}
                                isSearchable={true}
                                placeholder="All Merchants"
                            />
                        </div>

                        {/* Ticket Type Dropdown */}
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <label style={{ marginBottom: '4px', fontSize: '13px', fontWeight: '500', color: '#333' }}>
                                Ticket Type
                            </label>
                            <Select
                                value={searchTicketType ? ticketTypeOptions.find(t => t.value === searchTicketType) : null}
                                onChange={(selectedOption) => setSearchTicketType(selectedOption ? selectedOption.value : '')}
                                options={ticketTypeOptions}
                                isClearable={true}
                                styles={{
                                    control: (base, state) => ({
                                        ...base,
                                        padding: '2px 0px',
                                        border: '1px solid #ccc',
                                        borderRadius: '4px',
                                        fontSize: '13px',
                                        width: '150px',
                                        backgroundColor: '#fff',
                                        cursor: 'pointer',
                                        minHeight: '34px',
                                        boxShadow: state.isFocused ? '0 0 0 1px #007bff' : 'none',
                                        borderColor: state.isFocused ? '#007bff' : '#ccc',
                                        '&:hover': {
                                            borderColor: state.isFocused ? '#007bff' : '#999'
                                        }
                                    }),
                                    menu: (base) => ({
                                        ...base,
                                        fontSize: '13px',
                                        zIndex: 9999
                                    }),
                                    option: (base, state) => ({
                                        ...base,
                                        backgroundColor: state.isSelected ? '#007bff' : state.isFocused ? '#f8f9fa' : 'white',
                                        color: state.isSelected ? 'white' : '#333',
                                        cursor: 'pointer'
                                    }),
                                    singleValue: (base) => ({
                                        ...base,
                                        color: '#333'
                                    }),
                                    placeholder: (base) => ({
                                        ...base,
                                        color: '#999'
                                    })
                                }}
                                placeholder="All Types"
                            />
                        </div>
   
                        {/* Date From */}
                        <div style={{ display: 'flex', flexDirection: 'column', position: 'relative' }}>
                            <label style={{ marginBottom: '4px', fontSize: '13px', fontWeight: '500', color: '#333' }}>
                                Date From
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
                                Date To
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
                )}
            </div>

            {/* Card Container */}
            <div className='mt-3' style={{
                backgroundColor: 'white',
                borderRadius: '8px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                padding: '10px'
            }}>
                {/* Download Button Section */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <button
                        onClick={handleDownloadAll}
                        disabled={downloading}
                        style={{
                            padding: '8px 16px',
                            borderRadius: '4px',
                            background: 'linear-gradient(45deg, #28a745, #218838)',
                            color: 'white',
                            border: 'none',
                            cursor: downloading ? 'not-allowed' : 'pointer',
                            fontSize: '12px',
                            boxShadow: '0 1px 2px rgba(0,0,0,0.15)',
                            display: 'inline-flex',
                            alignItems: 'center',
                            opacity: downloading ? 0.6 : 1
                        }}
                    >
                        {downloading ? (
                            <>
                                <i className="fa-solid fa-spinner fa-spin" style={{ marginRight: '6px', fontSize: '12px' }}></i>
                                Downloading...
                            </>
                        ) : (
                            <>
                                <i className="fa-solid fa-download" style={{ marginRight: '6px', fontSize: '12px' }}></i>
                                Download Summary Report
                            </>
                        )}
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
                            <th className="py-2 px-3 fw-semibold text-start">Merchant Name</th>
                            <th className="py-2 px-3 fw-semibold text-center">Ticket Allotment</th>
                            <th className="py-2 px-3 fw-semibold text-center">Ticket Available</th>
                            <th className="py-2 px-3 fw-semibold text-center">Total Sales</th>
                            <th className="py-2 px-3 fw-semibold text-center">Total Sales Amount</th>
                            <th className="py-2 px-3 fw-semibold text-center" style={{ width: "80px" }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <SkeletonLoader type="table" count={5} columns={7} />
                        ) : reports.length > 0 ? (
                            reports.map((report, i) => (
                                <tr key={i} className="align-middle">
                                    <td className="py-1 px-3 text-center">
                                        {paginator?.current_page > 1
                                            ? (paginator?.current_page - 1) * paginator?.record_per_page + i + 1
                                            : i + 1}
                                    </td>
                                    <td className="py-1 px-3">{report.merchant_name || 'N/A'}</td>
                                    <td className="py-1 px-3 text-center">
                                        <span style={{
                                            padding: '4px 12px',
                                            borderRadius: '4px',
                                            fontSize: '11px',
                                            backgroundColor: '#e3f2fd',
                                            color: '#1976d2',
                                            fontWeight: '600'
                                        }}>
                                             {formatBDT(report.ticket_allotment)}
                                        </span>
                                    </td>
                                    <td className="py-1 px-3 text-center">
                                        <span style={{
                                            padding: '4px 12px',
                                            borderRadius: '4px',
                                            fontSize: '11px',
                                            backgroundColor: '#f3e5f5',
                                            color: '#7b1fa2',
                                            fontWeight: '600'
                                        }}>
                                             {formatBDT(report.ticket_available)}
                                    
                                        </span>
                                    </td>
                                    <td className="py-1 px-3 text-center">
                                        <span style={{
                                            padding: '4px 12px',
                                            borderRadius: '4px',
                                            fontSize: '11px',
                                            backgroundColor: '#fff3e0',
                                            color: '#e65100',
                                            fontWeight: '600'
                                        }}>
                                            {formatBDT(report.total_sales)}
                                          
                                        </span>
                                    </td>
                                    {/* <td className="py-1 px-3 text-center fw-bold" style={{ color: '#28a745' }}>
                                        ৳{parseFloat(report.total_sales_amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </td> */}
                                    <td className="py-1 px-3 text-center fw-bold" style={{ color: '#28a745' }}>
                                        ৳{formatBDT(report.total_sales_amount)}
                                    </td>

                                    {/* Actions column */}
                                    <td className="py-1 px-3 text-center position-relative">
                                        <button
                                            className="btn btn-link p-0"
                                            style={{ fontSize: "12px" }}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setActionMenuId(actionMenuId === i ? null : i);
                                            }}
                                        >
                                            <i className="fa-solid fa-ellipsis-v"></i>
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
                                                    onClick={() => handleDownloadSingle(report)}
                                                    className="dropdown-item py-0 px-2 d-flex align-items-center text-success"
                                                    style={{ fontSize: "12px", height: "24px" }}
                                                >
                                                    <i className="fa-solid fa-download me-2" style={{ fontSize: "12px" }}></i>
                                                    Download
                                                </button>
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="7" className="text-center text-muted py-3">
                                    {Object.keys(appliedFilters).some(key => appliedFilters[key])
                                        ? "No summary reports found matching your filters"
                                        : "No summary reports available"
                                    }
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>

                {/* Pagination Info */}
                {!loading && (
                    <div style={{ marginTop: '5px', fontSize: '12px', color: '#666' }}>
                        Showing {paginator.current_page_items_count > 0 ? (paginator.current_page - 1) * ITEMS_PER_PAGE + 1 : 0} to {Math.min(paginator.current_page * ITEMS_PER_PAGE, paginator.total_count)} of {paginator.total_count} results
                    </div>
                )}

                {/* Pagination Controls */}
                {!loading && paginator?.total_pages > 1 && (
                    <div style={{ marginTop: '-20px' }}>
                        {renderPagination()}
                    </div>
                )}
            </div>

            {/* Global Skeleton Animation */}
            <style>{`
                @keyframes pulse {
                    0% { opacity: 1; }
                    50% { opacity: 0.5; }
                    100% { opacity: 1; }
                }
                
                .inline-block {
                    display: inline-block;
                }
                
                .animate-spin {
                    animation: spin 1s linear infinite;
                }
                
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                
                .rounded-full {
                    border-radius: 9999px;
                }
                
                .h-8 {
                    height: 2rem;
                }
                
                .w-8 {
                    width: 2rem;
                }
                
                .border-b-2 {
                    border-bottom-width: 2px;
                }
                
                .border-teal-500 {
                    border-color: #14b8a6;
                }
                
                .mb-4 {
                    margin-bottom: 1rem;
                }
                
                .text-gray-600 {
                    color: #4b5563;
                }
            `}</style>
        </div>
    );
};

export default SalesSummaryReportPage;
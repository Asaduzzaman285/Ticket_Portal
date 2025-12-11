// PurchaseLogPage.jsx
import React, { useState, useEffect } from 'react';
import Paginate from './Paginate';
import { FaHome } from 'react-icons/fa';
import SkeletonLoader from './SkeletonLoader';
import Swal from "sweetalert2";

const BASE_URL = `${import.meta.env.VITE_APP_API_BASE_URL}/api/v1/purchase-log`;

const PurchaseLogPage = ({ sidebarVisible = false }) => {
    const [reports, setReports] = useState([]);
    const [searchTicketNumbers, setSearchTicketNumbers] = useState('');
    const [searchMerchant, setSearchMerchant] = useState('');
    const [searchDateFrom, setSearchDateFrom] = useState('');
    const [searchDateTo, setSearchDateTo] = useState('');
    const [searchCustomerMobile, setSearchCustomerMobile] = useState('');
    const [searchMerchantTransactionId, setSearchMerchantTransactionId] = useState('');
    const [searchStatus, setSearchStatus] = useState('');
    const [searchEpsTransactionId, setSearchEpsTransactionId] = useState('');
    const [alertMessage, setAlertMessage] = useState('');
    const [alertVariant, setAlertVariant] = useState('success');
    const [currentPage, setCurrentPage] = useState(1);
    const [loading, setLoading] = useState(false);
    const [downloading, setDownloading] = useState(false);
    const [actionMenuId, setActionMenuId] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [selectedTickets, setSelectedTickets] = useState([]);
    const [appliedFilters, setAppliedFilters] = useState({
        ticket_numbers: '',
        merchant: '',
        start_time: '',
        end_time: '',
        customer_mobile: '',
        status: '',              
        merchant_transaction_id: '',
        eps_transaction_id: ''
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

    const confirmAndSendSms = (report) => {
        if (!report.ticket_numbers) return; // safety check
      
        Swal.fire({
          title: 'Are you sure?',
          text: "Do you want to send SMS for this report?",
          icon: 'warning',
          showCancelButton: true,
          confirmButtonColor: '#3085d6',
          cancelButtonColor: '#d33',
          confirmButtonText: 'Yes, send it!',
          cancelButtonText: 'Cancel',
        }).then((result) => {
          if (result.isConfirmed) {
            handleSendSms(report);
            Swal.fire('Sent!', 'The SMS has been sent.', 'success');
          }
        });
      };

    const handleDateChange = (setter) => (e) => {
        setter(e.target.value);
    };

    const formatDisplayDate = (dateStr) => {
        if (!dateStr) return '';
        const [year, month, day] = dateStr.split('-');
        return `${day}-${month}-${year}`;
    };

    const formatBDT = (number) => {
        const num = Math.round(Number(number));
        if (Number.isNaN(num)) return '0';
        return num.toLocaleString('en-IN');
    };

    const statusOptions = {
        'success': { label: 'Success', color: '#28a745', bg: '#d4edda' },
        'requested': { label: 'Requested', color: '#ffc107', bg: '#fff3cd' }
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
        fetchReports(1);
    }, []);

    useEffect(() => {
        const handleClickOutside = () => setActionMenuId(null);
        if (actionMenuId !== null) {
            document.addEventListener('click', handleClickOutside);
            return () => document.removeEventListener('click', handleClickOutside);
        }
    }, [actionMenuId]);

    const formatDisplayDateTime = (dateTimeStr) => {
        if (!dateTimeStr) return '';
        const [date, time] = dateTimeStr.split(' ');
        const [year, month, day] = date.split('-');
        return `${day}-${month}-${year} ${time}`;
    };

    const fetchReports = async (page = 1, filters = null) => {
        try {
            setLoading(true);

            const queryParams = new URLSearchParams();
            queryParams.append('page', page);

            const activeFilters = filters || appliedFilters;

            if (activeFilters.ticket_numbers) queryParams.append('ticket_numbers', activeFilters.ticket_numbers);
            if (activeFilters.merchant) queryParams.append('merchant', activeFilters.merchant);
            if (activeFilters.customer_mobile) queryParams.append('customer_mobile', activeFilters.customer_mobile);
            if (activeFilters.merchant_transaction_id) queryParams.append('merchant_transaction_id', activeFilters.merchant_transaction_id);
            if (activeFilters.eps_transaction_id) queryParams.append('eps_transaction_id', activeFilters.eps_transaction_id);
            if (activeFilters.start_time) queryParams.append('start_time', activeFilters.start_time);
            if (activeFilters.status) 
                queryParams.append('status', activeFilters.status);
            
            if (activeFilters.end_time) queryParams.append('end_time', activeFilters.end_time);

            const queryString = queryParams.toString();
            const url = `${BASE_URL}/list-paginate?${queryString}`;

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
                const reportsData = result?.data?.data ?? [];
                setReports(reportsData);
                setCurrentPage(page);

                if (result.data?.paginator) {
                    setPaginator(result.data.paginator);
                } else {
                    setPaginator(prev => ({
                        ...prev,
                        current_page: page,
                        total_count: reportsData.length,
                        current_page_items_count: reportsData.length
                    }));
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

    const handleClear = () => {
        setSearchTicketNumbers('');
        setSearchMerchant('');
        setSearchDateFrom('');
        setSearchDateTo('');
        setSearchCustomerMobile('');
        setSearchMerchantTransactionId('');
        setSearchEpsTransactionId('');
        setSearchStatus('');

        const emptyFilters = {
            ticket_numbers: '',
            merchant: '',
            start_time: '',
            end_time: '',
            customer_mobile: '',
            merchant_transaction_id: '',
            eps_transaction_id: '',
            status: ''
        };
        
        setAppliedFilters(emptyFilters);
        setCurrentPage(1);
        fetchReports(1, emptyFilters);
    };

    const handleFilter = () => {
        const filters = {
            ticket_numbers: searchTicketNumbers,
            merchant: searchMerchant,
            start_time: searchDateFrom ? `${searchDateFrom} 00:00:00` : '',
            end_time: searchDateTo ? `${searchDateTo} 23:59:59` : '',
            customer_mobile: searchCustomerMobile,
            merchant_transaction_id: searchMerchantTransactionId,
            eps_transaction_id: searchEpsTransactionId,
            status: searchStatus             

        };

        setAppliedFilters(filters);
        setCurrentPage(1);
        fetchReports(1, filters);
    };

    const handlePageChange = (page) => {
        setCurrentPage(page);
        fetchReports(page);
    };

    const handleDownloadAll = async () => {
        try {
            setDownloading(true);

            const queryParams = new URLSearchParams();
            if (appliedFilters.ticket_numbers) queryParams.append('ticket_numbers', appliedFilters.ticket_numbers);
            if (appliedFilters.merchant) queryParams.append('merchant', appliedFilters.merchant);
            if (appliedFilters.start_time) queryParams.append('start_time', appliedFilters.start_time);
            if (appliedFilters.end_time) queryParams.append('end_time', appliedFilters.end_time);
            if (appliedFilters.customer_mobile) queryParams.append('customer_mobile', appliedFilters.customer_mobile);
            if (appliedFilters.merchant_transaction_id) queryParams.append('merchant_transaction_id', appliedFilters.merchant_transaction_id);
            if (appliedFilters.eps_transaction_id) queryParams.append('eps_transaction_id', appliedFilters.eps_transaction_id);

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

            const contentDisposition = response.headers.get('Content-Disposition');
            let filename = 'purchase-log.xlsx';
            if (contentDisposition) {
                const filenameMatch = contentDisposition.match(/filename="?(.+)"?/i);
                if (filenameMatch) filename = filenameMatch[1];
            }

            const blob = await response.blob();
            const downloadUrl = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = downloadUrl;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(downloadUrl);

            showAlert('Report downloaded successfully', 'success');
        } catch (error) {
            console.error('Error downloading report:', error);
            showAlert('Failed to download report', 'danger');
        } finally {
            setDownloading(false);
        }
    };

    const Toast = Swal.mixin({
        toast: true,
        position: "top-end",
        showConfirmButton: false,
        timer: 1500,             // Auto-hide after 1 second
        timerProgressBar: true,
        customClass: {
          popup: 'small-toast',
          icon: 'small-toast-icon'
        },
        didOpen: (toast) => {
          toast.onmouseenter = Swal.stopTimer;
          toast.onmouseleave = Swal.resumeTimer;
        }
      });

      const handleSendSms = async (report) => {
        setActionMenuId(null);
      
        try {
          const response = await fetch(`${BASE_URL}/send-ticket`, {
            method: 'POST',
            headers: getAuthHeaders(),
            credentials: 'include',
            body: JSON.stringify({ id: report.id })
          });
      
          if (handleUnauthorized(response)) return;
      
          if (!response.ok) {
            throw new Error('Failed to send SMS');
          }
      
          const result = await response.json();
      
          if (result.status === 'success') {
            Toast.fire({
              icon: 'success',
              title: 'SMS sent successfully'
            });
          } else {
            throw new Error(result.message || 'Failed to send SMS');
          }
      
        } catch (error) {
          console.error('Error sending SMS:', error);
          Toast.fire({
            icon: 'error',
            title: 'Failed to send SMS'
          });
        }
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

    const handleShowTickets = (ticketNumbers) => {
        setSelectedTickets(ticketNumbers.split(',').map(t => t.trim()));
        setShowModal(true);
    };

    const containerStyle = sidebarVisible
        ? { padding: '16px', backgroundColor: '#F5F5F5', overflowX: 'hidden', minHeight: '100vh', marginLeft: '193px' }
        : { padding: '16px', backgroundColor: '#F5F5F5', overflowX: 'hidden', minHeight: '100vh' };

    return (
        <div style={containerStyle}>
            {/* Header with Breadcrumb */}
            <div className='mt-5' style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '7px' }}>
                <h1 style={{ margin: 0, fontSize: '20px', fontWeight: '600' }}>Purchase Log</h1>
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
                    <span>Purchase Log</span>
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
                    {/* Merchant Input */}
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <label style={{ marginBottom: '4px', fontSize: '13px', fontWeight: '500', color: '#333' }}>
                            Merchant
                        </label>
                        <input
                            type="text"
                            value={searchMerchant}
                            onChange={(e) => setSearchMerchant(e.target.value)}
                            placeholder="Enter merchant"
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

                    {/* Ticket Numbers Input */}
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <label style={{ marginBottom: '4px', fontSize: '13px', fontWeight: '500', color: '#333' }}>
                            Ticket Numbers
                        </label>
                        <input
                            type="text"
                            value={searchTicketNumbers}
                            onChange={(e) => setSearchTicketNumbers(e.target.value)}
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

                    {/* Customer Mobile Input */}
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <label style={{ marginBottom: '4px', fontSize: '13px', fontWeight: '500', color: '#333' }}>
                            Customer Mobile
                        </label>
                        <input
                            type="text"
                            value={searchCustomerMobile}
                            onChange={(e) => setSearchCustomerMobile(e.target.value)}
                            placeholder="Enter mobile no"
                            style={{
                                padding: '8px 12px',
                                border: '1px solid #ccc',
                                borderRadius: '4px',
                                fontSize: '13px',
                                width: '120px',
                                backgroundColor: '#fff',
                            }}
                        />
                    </div>
                     
                    {/* Status Filter */}
<div style={{ display: 'flex', flexDirection: 'column' }}>
    <label style={{ marginBottom: '4px', fontSize: '13px', fontWeight: '500', color: '#333' }}>
        Status
    </label>
    <select
        value={searchStatus}
        onChange={(e) => setSearchStatus(e.target.value)}
        style={{
            padding: '8px 12px',
            border: '1px solid #ccc',
            borderRadius: '4px',
            fontSize: '13px',
            width: '150px',
            backgroundColor: '#fff',
            cursor: 'pointer',
        }}
    >
        <option value="">All</option>
        <option value="requested">Requested</option>
        <option value="success">Success</option>
        <option value="cancel">Cancel</option>
        <option value="fail">Fail</option>
    </select>
</div>


                    {/* Merchant Transaction ID Input */}
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <label style={{ marginBottom: '4px', fontSize: '13px', fontWeight: '500', color: '#333' }}>
                            Merchant Tx ID
                        </label>
                        <input
                            type="text"
                            value={searchMerchantTransactionId}
                            onChange={(e) => setSearchMerchantTransactionId(e.target.value)}
                            placeholder="Enter merchant tx id"
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

                    {/* EPS Transaction ID Input */}
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <label style={{ marginBottom: '4px', fontSize: '13px', fontWeight: '500', color: '#333' }}>
                            EPS Tx ID
                        </label>
                        <input
                            type="text"
                            value={searchEpsTransactionId}
                            onChange={(e) => setSearchEpsTransactionId(e.target.value)}
                            placeholder="Enter eps tx id"
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
                                width: '120px',
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
                                width: '120px',
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
                            <th className="py-2 px-3 fw-semibold text-start">Ticket Numbers</th>
                            <th className="py-2 px-3 fw-semibold text-start">Merchant</th>
                            <th className="py-2 px-3 fw-semibold text-start">Customer Info</th>
                            <th className="py-2 px-3 fw-semibold text-start">Purchase Details</th>
                            <th className="py-2 px-3 fw-semibold text-center">Status</th>
                            <th className="py-2 px-3 fw-semibold text-start">Transaction IDs</th>
                            <th className="py-2 px-3 fw-semibold text-center">Transaction Type</th>
                            <th className="py-2 px-3 fw-semibold text-center">Financial Entity</th>
                            <th className="py-2 px-3 fw-semibold text-start">Timing Details</th>
                            <th className="py-2 px-3 fw-semibold text-center" style={{ width: "80px" }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <SkeletonLoader type="table" count={5} columns={11} />
                        ) : reports.length > 0 ? (
                            reports.map((report, i) => (
                                <tr key={report.id} className="align-middle">
                                    <td className="py-1 px-3 text-center">
                                        {paginator?.current_page > 1
                                            ? (paginator?.current_page - 1) * paginator?.record_per_page + i + 1
                                            : i + 1}
                                    </td>
                                    <td className="py-1 px-3">
                                        {report.ticket_numbers ? (
                                            report.ticket_numbers.includes(',') ? (
                                                <span 
                                                    style={{ cursor: 'pointer', color: '#007bff' }} 
                                                    onClick={() => handleShowTickets(report.ticket_numbers)}
                                                >
                                                    {report.ticket_numbers.split(',').length} tickets <i className="fa-solid fa-eye" style={{ fontSize: '12px' }}></i>
                                                </span>
                                            ) : (
                                                report.ticket_numbers
                                            )
                                        ) : 'N/A'}
                                    </td>
                                    <td className="py-1 px-3">{report.merchant || 'N/A'}</td>
                                    <td className="py-1 px-3">
                                        <div style={{ lineHeight: '1.3' }}>
                                            <div style={{ fontSize: '11px', fontWeight: '500' }}>
                                                {report.customer_mobile || 'N/A'}
                                            </div>
                                            {report.customer_name && (
                                                <div style={{ fontSize: '10px', color: '#666' }}>
                                                    {report.customer_name}
                                                </div>
                                            )}
                                            {report.customer_district && (
                                                <div style={{ fontSize: '10px', color: '#888', textTransform: 'capitalize' }}>
                                                    {report.customer_district}
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                    <td className="py-1 px-3">
                                        <div style={{ lineHeight: '1.3' }}>
                                            <div style={{ fontSize: '11px' }}>Qty: {report.ticket_qty || 'N/A'}</div>
                                            <div style={{ fontSize: '11px' }}>Unit: ৳{parseFloat(report.unit_price || 0).toFixed(2)}</div>
                                            <div style={{ fontSize: '11px' }}>Total: ৳{parseFloat(report.total_amount || 0).toFixed(2)}</div>
                                        </div>
                                    </td>
                                    <td className="py-1 px-3 text-center">
                                        <span style={{
                                            padding: '2px 8px',
                                            borderRadius: '4px',
                                            fontSize: '11px',
                                            backgroundColor: statusOptions[report.status]?.bg || '#fff3cd',
                                            color: statusOptions[report.status]?.color || '#333',
                                            fontWeight: '500'
                                        }}>
                                            {statusOptions[report.status]?.label || report.status}
                                        </span>
                                    </td>
                                    <td className="py-1 px-3">
                                        <div style={{ lineHeight: '1.3' }}>
                                            <div style={{ fontSize: '11px' }}>
                                            M-TID: {report.merchant_transaction_id || 'N/A'}
                                            </div>
                                            <div style={{ fontSize: '11px' }}>
                                            EPS-TID: {report.eps_transaction_id || 'N/A'}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="py-1 px-3 text-center">{report.transaction_type || 'N/A'}</td>
                                    <td className="py-1 px-3 text-center">{report.financial_entity || 'N/A'}</td>
                                    <td className="py-1 px-3">
                                    <div style={{ lineHeight: '1.3' }}>
    <div
        style={{
            fontSize: '11px',
            background: '#E8F4FD',   // light blue

        }}
    >
        Req-Time: {formatDisplayDateTime(report.request_time) || 'N/A'}
    </div>

    <div
        style={{
            fontSize: '11px',
            background: '#FFF6E5',   // light orange

        }}
    >
        Txn-Time: {formatDisplayDateTime(report.transaction_time) || 'N/A'}
    </div>

    <div
        style={{
            fontSize: '11px',
            background: '#E9F7E9',   // light green
 
        }}
    >
        Vrf-Time: {formatDisplayDateTime(report.verification_time) || 'N/A'}
    </div>
</div>

                                    </td>
                                    {/* Actions column */}
                                    <td className="py-1 px-3 text-center position-relative">
                                        <button
                                            className="btn btn-link p-0"
                                            style={{ fontSize: "12px" }}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setActionMenuId(actionMenuId === report.id ? null : report.id);
                                            }}
                                        >
                                            <i className="fa-solid fa-ellipsis-v"></i>
                                        </button>

                                        {actionMenuId === report.id && (
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
  onClick={() => confirmAndSendSms(report)}
  className="dropdown-item py-0 px-2 d-flex align-items-center text-success"
  style={{
      fontSize: "12px",
      height: "24px",
      opacity: !report.ticket_numbers ? 0.4 : 1,
      pointerEvents: !report.ticket_numbers ? "none" : "auto",
      cursor: !report.ticket_numbers ? "not-allowed" : "pointer",
  }}
  disabled={!report.ticket_numbers}
>
  <i className="fa-solid fa-envelope me-2" style={{ fontSize: "12px" }}></i>
  Send SMS
</button>


                                            </div>
                                        )}
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="11" className="text-center text-muted py-3">
                                    {Object.keys(appliedFilters).some(key => appliedFilters[key])
                                        ? "No logs found matching your filters"
                                        : "No logs available"
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
                            /* Fix for browser autofill styles */
        .autofill-fix input:-webkit-autofill,
        .autofill-fix input:-webkit-autofill:hover,
        .autofill-fix input:-webkit-autofill:focus,
        .autofill-fix input:-webkit-autofill:active {
          -webkit-box-shadow: 0 0 0px 1000px white inset !important;
          -webkit-text-fill-color: #000 !important;
          transition: background-color 5000s ease-in-out 0s !important;
        }
        
        .autofill-fix input {
          color: #000 !important;
        }
            `}</style>
        </div>
    );
};

export default PurchaseLogPage;
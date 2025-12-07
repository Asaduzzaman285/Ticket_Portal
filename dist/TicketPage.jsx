import React, { useState, useEffect } from 'react';
import Paginate from './Paginate';
import { FaHome } from 'react-icons/fa';
import Select from 'react-select';
import SkeletonLoader from './SkeletonLoader';
import { hasPermission } from '../utils/permissions';

const BASE_URL = `${import.meta.env.VITE_APP_API_BASE_URL}/api/v1/ticket`;
const FILTER_DATA_URL = `${import.meta.env.VITE_APP_API_BASE_URL}/api/v1/details-report/filter-data`;

const TicketPage = ({ sidebarVisible = false }) => {
    const [tickets, setTickets] = useState([]);
    const [searchMerchant, setSearchMerchant] = useState('');
    const [searchTicketType, setSearchTicketType] = useState('');
    const [searchStatus, setSearchStatus] = useState('');
    const [searchDateFrom, setSearchDateFrom] = useState('');
    const [searchDateTo, setSearchDateTo] = useState('');
    const [alertMessage, setAlertMessage] = useState('');
    const [alertVariant, setAlertVariant] = useState('success');
    const [currentPage, setCurrentPage] = useState(1);
    const [loading, setLoading] = useState(false);
    const [generating, setGenerating] = useState(false);
    const [searchTicketNo, setSearchTicketNo] = useState('');
    const [updating, setUpdating] = useState(false);
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
    
    // Modal states
    const [showGenerateModal, setShowGenerateModal] = useState(false);
    const [showUpdateModal, setShowUpdateModal] = useState(false);
    
    // Generate form states
    const [generateForm, setGenerateForm] = useState({
        series: '',
        ticket_number_range_start: '',
        ticket_number_range_end: '',
        total_ticket: '',
        ticket_type: '',
        merchant_id: ''
    });
    
    // Update form states
    const [updateForm, setUpdateForm] = useState({
        series: '',
        ticket_number_range_start: '',
        ticket_number_range_end: '',
        total_ticket: '',
        ticket_type: '',
        merchant_id: ''
    });

    const [filterOptionsLoading, setFilterOptionsLoading] = useState(true);

    const ticketTypeOptions = [
        { value: '', label: 'All Types' },
        { value: 'virtual', label: 'Virtual' },
        { value: 'physical', label: 'Physical' }
    ];

    const statusOptions = [
        { value: '', label: 'All Status' },
        { value: 'closed', label: 'Closed' },
        { value: 'open', label: 'Open' },
        { value: 'on_hold', label: 'On Hold' }
    ];

    const handleDateChange = (setter) => (e) => {
        setter(e.target.value);
    };

    const formatDisplayDate = (dateStr) => {
        if (!dateStr) return '';
        const [year, month, day] = dateStr.split('-');
        return `${day}-${month}-${year}`;
    };

    const formatDateTime = (dateTimeStr) => {
        if (!dateTimeStr) return 'N/A';
        const [date, time] = dateTimeStr.split(' ');
        const [year, month, day] = date.split('-');
        return `${day}-${month}-${year} ${time}`;
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
                window.location.href = '/login';
            }, 2000);
            return true;
        }
        return false;
    };

    // Fetch tickets and filter options on mount
    useEffect(() => {
        fetchFilterOptions();
        fetchTickets();
    }, []);



    // Handle click outside for action menu
    useEffect(() => {
        const handleClickOutside = () => setActionMenuId(null);
        if (actionMenuId !== null) {
            document.addEventListener('click', handleClickOutside);
            return () => document.removeEventListener('click', handleClickOutside);
        }
    }, [actionMenuId]);

    // Fetch filter options
    const fetchFilterOptions = async () => {
        try {
            setFilterOptionsLoading(true);
            const response = await fetch(FILTER_DATA_URL, {
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

    // Fetch tickets with server-side pagination and filtering
    const fetchTickets = async (page = currentPage) => {
        try {
            setLoading(true);

            const queryParams = new URLSearchParams();
            queryParams.append('page', page);
            
            if (searchMerchant) queryParams.append('merchant_id', searchMerchant);
            if (searchTicketType) queryParams.append('ticket_type', searchTicketType);
            if (searchTicketNo) queryParams.append('ticket_no', searchTicketNo);
            if (searchStatus) queryParams.append('status', searchStatus);
            if (searchDateFrom) queryParams.append('start_time', `${searchDateFrom} 00:00:00`);
            if (searchDateTo) queryParams.append('end_time', `${searchDateTo} 23:59:59`);

            const queryString = queryParams.toString();
            const url = `${BASE_URL}/list-paginate?${queryString}`;

            const response = await fetch(url, {
                method: 'GET',
                headers: getAuthHeaders(),
                credentials: 'include',
            });

            if (handleUnauthorized(response)) return;

            if (!response.ok) {
                throw new Error(`Failed to fetch tickets: ${response.status} ${response.statusText}`);
            }

            const result = await response.json();

            if (result.status === 'success') {
                const ticketsData = result?.data?.data ?? [];
                setTickets(ticketsData);
                setCurrentPage(page);
                
                // Set paginator from API response
                if (result.data?.paginator) {
                    setPaginator(result.data.paginator);
                }
            } else {
                throw new Error(result.message || 'Failed to fetch tickets');
            }
        } catch (error) {
            console.error('Error fetching tickets:', error);
            showAlert(error.message || "Failed to fetch tickets", "danger");
        } finally {
            setLoading(false);
        }
    };

   const handleClear = () => {
    setSearchMerchant('');
    setSearchTicketType('');
    setSearchStatus('');
    setSearchDateFrom('');
    setSearchDateTo('');
    setSearchTicketNo('');
    setCurrentPage(1);

    // Wait for state to apply
    setTimeout(() => {
        fetchTickets(1);
    }, 0);
};


    const handleFilter = () => {
        setCurrentPage(1);
        fetchTickets(1);
    };

    const handleGenerateTickets = async () => {
        try {
            setGenerating(true);
            
            // Prepare the request body
            const requestBody = {};
            
            if (generateForm.series) requestBody.series = generateForm.series;
            if (generateForm.ticket_number_range_start) requestBody.ticket_number_range_start = generateForm.ticket_number_range_start;
            if (generateForm.ticket_number_range_end) requestBody.ticket_number_range_end = generateForm.ticket_number_range_end;
            if (generateForm.total_ticket) requestBody.total_ticket = generateForm.total_ticket;
            if (generateForm.ticket_type) requestBody.ticket_type = generateForm.ticket_type;
            if (generateForm.merchant_id) requestBody.merchant_id = generateForm.merchant_id;

            const response = await fetch(`${BASE_URL}/generate`, {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify(requestBody),
                credentials: 'include',
            });

            if (handleUnauthorized(response)) return;

            const result = await response.json();

            if (result.status === 'success') {
                showAlert(result.message?.[0] || 'Tickets generated successfully', 'success');
                setShowGenerateModal(false);
                resetGenerateForm();
                fetchTickets(currentPage); // Refresh the list
            } else {
                throw new Error(result.message?.[0] || 'Failed to generate tickets');
            }
        } catch (error) {
            console.error('Error generating tickets:', error);
            showAlert(error.message, 'danger');
        } finally {
            setGenerating(false);
        }
    };

    const handleBatchUpdate = async () => {
        try {
            setUpdating(true);
            
            // Prepare the request body
            const requestBody = {};
            
            if (updateForm.series) requestBody.series = updateForm.series;
            if (updateForm.ticket_number_range_start) requestBody.ticket_number_range_start = updateForm.ticket_number_range_start;
            if (updateForm.ticket_number_range_end) requestBody.ticket_number_range_end = updateForm.ticket_number_range_end;
            if (updateForm.total_ticket) requestBody.total_ticket = updateForm.total_ticket;
            if (updateForm.ticket_type) requestBody.ticket_type = updateForm.ticket_type;
            if (updateForm.merchant_id) requestBody.merchant_id = updateForm.merchant_id;

            const response = await fetch(`${BASE_URL}/batch-update`, {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify(requestBody),
                credentials: 'include',
            });

            if (handleUnauthorized(response)) return;

            const result = await response.json();

            if (result.status === 'success') {
                showAlert(result.message?.[0] || 'Tickets updated successfully', 'success');
                setShowUpdateModal(false);
                resetUpdateForm();
                fetchTickets(currentPage); // Refresh the list
            } else {
                throw new Error(result.message?.[0] || 'Failed to update tickets');
            }
        } catch (error) {
            console.error('Error updating tickets:', error);
            showAlert(error.message, 'danger');
        } finally {
            setUpdating(false);
        }
    };

    const resetGenerateForm = () => {
        setGenerateForm({
            series: '',
            ticket_number_range_start: '',
            ticket_number_range_end: '',
            total_ticket: '',
            ticket_type: '',
            merchant_id: ''
        });
    };

    const resetUpdateForm = () => {
        setUpdateForm({
            series: '',
            ticket_number_range_start: '',
            ticket_number_range_end: '',
            total_ticket: '',
            ticket_type: '',
            merchant_id: ''
        });
    };

    const handleGenerateFormChange = (e) => {
        const { name, value } = e.target;
        setGenerateForm(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleUpdateFormChange = (e) => {
        const { name, value } = e.target;
        setUpdateForm(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handlePageChange = (page) => {
        fetchTickets(page);
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

    // Calculate total tickets based on range
    useEffect(() => {
        if (generateForm.ticket_number_range_start && generateForm.ticket_number_range_end) {
            const start = parseInt(generateForm.ticket_number_range_start);
            const end = parseInt(generateForm.ticket_number_range_end);
            if (!isNaN(start) && !isNaN(end) && end >= start) {
                setGenerateForm(prev => ({
                    ...prev,
                    total_ticket: (end - start + 1).toString()
                }));
            }
        }
    }, [generateForm.ticket_number_range_start, generateForm.ticket_number_range_end]);

    useEffect(() => {
        if (updateForm.ticket_number_range_start && updateForm.ticket_number_range_end) {
            const start = parseInt(updateForm.ticket_number_range_start);
            const end = parseInt(updateForm.ticket_number_range_end);
            if (!isNaN(start) && !isNaN(end) && end >= start) {
                setUpdateForm(prev => ({
                    ...prev,
                    total_ticket: (end - start + 1).toString()
                }));
            }
        }
    }, [updateForm.ticket_number_range_start, updateForm.ticket_number_range_end]);

    return (
        <div style={containerStyle}>
            {/* Header with Breadcrumb */}
            <div className='mt-5' style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '7px' }}>
                <h1 style={{ margin: 0, fontSize: '20px', fontWeight: '600' }}>Ticket Management</h1>
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
                        Management
                    </span>
                    <span style={{ margin: '0 8px' }}>/</span>
                    <span>Ticket Management</span>
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
                        <SkeletonLoader type="filter" count={5} />
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
                        {/* Ticket No Input */}
<div style={{ display: 'flex', flexDirection: 'column' }}>
    <label style={{ marginBottom: '4px', fontSize: '13px', fontWeight: '500', color: '#333' }}>
        Ticket No
    </label>
   <input
    type="text"
    value={searchTicketNo}
    onChange={(e) => setSearchTicketNo(e.target.value)}
    placeholder="Enter ticket no"
    style={{
        padding: '8px 12px',
        border: '1px solid #ccc',
        borderRadius: '4px',
        fontSize: '13px',
        width: '150px',
        backgroundColor: '#fff',
        position: "relative",     // <-- IMPORTANT
        zIndex: 1000,             // <-- SOLVES PASTE ISSUE
    }}
/>

</div>


                        {/* Status Dropdown */}
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <label style={{ marginBottom: '4px', fontSize: '13px', fontWeight: '500', color: '#333' }}>
                                Status
                            </label>
                            <Select
                                value={searchStatus ? statusOptions.find(s => s.value === searchStatus) : null}
                                onChange={(selectedOption) => setSearchStatus(selectedOption ? selectedOption.value : '')}
                                options={statusOptions}
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
                                placeholder="All Status"
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
                {/* Action Buttons Section */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <div style={{ display: 'flex', gap: '10px' }}>
                     {hasPermission("ticket create") && (
    <button
        onClick={() => setShowGenerateModal(true)}
        style={{
            padding: '8px 16px',
            borderRadius: '4px',
            background: 'linear-gradient(45deg, #28a745, #218838)',
            color: 'white',
            border: 'none',
            cursor: 'pointer',
            fontSize: '12px',
            boxShadow: '0 1px 2px rgba(0,0,0,0.15)',
            display: 'inline-flex',
            alignItems: 'center'
        }}
    >
        <i className="fa-solid fa-plus" style={{ marginRight: '6px', fontSize: '12px' }}></i>
        Generate Tickets
    </button>
)}

                        {/* <button
                            onClick={() => setShowUpdateModal(true)}
                            style={{
                                padding: '8px 16px',
                                borderRadius: '4px',
                                background: 'linear-gradient(45deg, #17a2b8, #138496)',
                                color: 'white',
                                border: 'none',
                                cursor: 'pointer',
                                fontSize: '12px',
                                boxShadow: '0 1px 2px rgba(0,0,0,0.15)',
                                display: 'inline-flex',
                                alignItems: 'center'
                            }}
                        >
                            <i className="fa-solid fa-edit" style={{ marginRight: '6px', fontSize: '12px' }}></i>
                            Batch Update
                        </button> */}
                    </div>
                </div>

{hasPermission("ticket list") ? (
    <>
        {/* Table */}
        <table
            className="table table-bordered table-hover table-sm align-middle"
            style={{ fontSize: "12px", lineHeight: "1.8" }}
        >
            <thead className="table-light">
                <tr>
                    <th className="py-2 px-3 fw-semibold text-center" style={{ width: "60px" }}>S/N</th>
                    <th className="py-2 px-3 fw-semibold text-start">Ticket No</th>
                    <th className="py-2 px-3 fw-semibold text-center">Status</th>
                    <th className="py-2 px-3 fw-semibold text-start">Merchant Name</th>
                    <th className="py-2 px-3 fw-semibold text-center">Purchase Time</th>
                    <th className="py-2 px-3 fw-semibold text-center">Ticket Type</th>
                    <th className="py-2 px-3 fw-semibold text-center">Customer Mobile</th>
                    <th className="py-2 px-3 fw-semibold text-center">Customer Name</th>
                    <th className="py-2 px-3 fw-semibold text-center">Customer District</th>
                    <th className="py-2 px-3 fw-semibold text-end">Amount</th>
                </tr>
            </thead>

            <tbody>
                {loading ? (
                    <SkeletonLoader type="table" count={5} columns={11} />
                ) : tickets.length > 0 ? (
                    tickets.map((ticket, i) => (
                        <tr key={ticket.id} className="align-middle">
                            <td className="py-1 px-3 text-center">
                                {paginator?.current_page > 1
                                    ? (paginator?.current_page - 1) * paginator?.record_per_page + i + 1
                                    : i + 1}
                            </td>

                            <td className="py-1 px-3">{ticket.ticket_no || 'N/A'}</td>

                            <td className="py-1 px-3 text-center">
                                <span
                                    style={{
                                        padding: '4px 12px',
                                        borderRadius: '4px',
                                        fontSize: '11px',
                                        backgroundColor:
                                            ticket.status === 'closed'
                                                ? '#d4edda'
                                                : ticket.status === 'open'
                                                ? '#d1ecf1'
                                                : '#fff3cd',
                                        color:
                                            ticket.status === 'closed'
                                                ? '#155724'
                                                : ticket.status === 'open'
                                                ? '#0c5460'
                                                : '#856404',
                                        fontWeight: '600',
                                        textTransform: 'capitalize'
                                    }}
                                >
                                    {ticket.status || 'N/A'}
                                </span>
                            </td>

                            <td className="py-1 px-3">{ticket.merchant?.name || 'N/A'}</td>

                            <td className="py-1 px-3 text-center">
                                {formatDateTime(ticket.purchase_time)}
                            </td>

                            <td className="py-1 px-3 text-center">
                                <span
                                    style={{
                                        padding: '4px 12px',
                                        borderRadius: '4px',
                                        fontSize: '11px',
                                        backgroundColor:
                                            ticket.ticket_type === 'virtual'
                                                ? '#e3f2fd'
                                                : '#f3e5f5',
                                        color:
                                            ticket.ticket_type === 'virtual'
                                                ? '#1976d2'
                                                : '#7b1fa2',
                                        fontWeight: '600',
                                        textTransform: 'capitalize'
                                    }}
                                >
                                    {ticket.ticket_type || 'N/A'}
                                </span>
                            </td>

                            <td className="py-1 px-3 text-center">
                                {ticket.customer_mobile || 'N/A'}
                            </td>

                            <td className="py-1 px-3 text-center">
                                {ticket.customer_name || 'N/A'}
                            </td>

                            <td className="py-1 px-3 text-center">
                                {ticket.customer_district || 'N/A'}
                            </td>

                            <td className="py-1 px-3 text-end fw-bold" style={{ color: '#28a745' }}>
                                ৳{parseFloat(ticket.amount || 0).toFixed(2)}
                            </td>
                        </tr>
                    ))
                ) : (
                    <tr>
                        <td colSpan="11" className="text-center text-muted py-3">
                            {searchMerchant || searchTicketType || searchStatus || searchDateFrom || searchDateTo
                                ? "No tickets found matching your filters"
                                : "No tickets available"}
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
                    ? (paginator.current_page - 1) * paginator.record_per_page + 1
                    : 0}{" "}
                to{" "}
                {Math.min(
                    paginator.current_page * paginator.record_per_page,
                    paginator.total_count
                )}{" "}
                of {paginator.total_count} results
            </div>
        )}

        {/* Pagination Controls */}
        {!loading && paginator?.total_pages > 1 && (
            <div style={{ marginTop: '-25px' }}>
                {renderPagination()}
            </div>
        )}
    </>
) : (
    <div className="alert alert-warning text-center py-3 fw-bold mb-0">
        You do not have permission to view ticket list.
    </div>
)}

            </div>

            {/* Generate Tickets Modal */}
            {showGenerateModal && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0.5)',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    zIndex: 1000
                }}>
                    <div style={{
                        backgroundColor: 'white',
                        borderRadius: '8px',
                        padding: '20px',
                        width: '500px',
                        maxWidth: '90%',
                        maxHeight: '90%',
                        overflow: 'auto'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            
                            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600' }}>Generate Tickets</h3>
                            <button
                                onClick={() => {
                                    setShowGenerateModal(false);
                                    resetGenerateForm();
                                }}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer',
                                    fontSize: '20px',
                                    color: '#666'
                                }}
                            >
                                ×
                            </button>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <label style={{ marginBottom: '5px', fontSize: '13px', fontWeight: '500' }}>Series  <span style={{ color: 'red' }}>*</span></label>
                                <input
                                    type="text"
                                    name="series"
                                    value={generateForm.series}
                                    onChange={handleGenerateFormChange}
                                    placeholder="e.g., KHA"
                                    style={{
                                        padding: '8px 12px',
                                        border: '1px solid #ccc',
                                        borderRadius: '4px',
                                        fontSize: '13px'
                                    }}
                                />
                            </div>

                            <div style={{ display: 'flex', gap: '15px' }}>
                                <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                                    <label style={{ marginBottom: '5px', fontSize: '13px', fontWeight: '500' }}>Start Range <span style={{ color: 'red' }}>*</span></label>
                                    <input
                                        type="number"
                                        name="ticket_number_range_start"
                                        value={generateForm.ticket_number_range_start}
                                        onChange={handleGenerateFormChange}
                                        placeholder="e.g., 500001"
                                        style={{
                                            padding: '8px 12px',
                                            border: '1px solid #ccc',
                                            borderRadius: '4px',
                                            fontSize: '13px'
                                        }}
                                    />
                                </div>
                                <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                                    <label style={{ marginBottom: '5px', fontSize: '13px', fontWeight: '500' }}>End Range <span style={{ color: 'red' }}>*</span></label>
                                    <input
                                        type="number"
                                        name="ticket_number_range_end"
                                        value={generateForm.ticket_number_range_end}
                                        onChange={handleGenerateFormChange}
                                        placeholder="e.g., 550000"
                                        style={{
                                            padding: '8px 12px',
                                            border: '1px solid #ccc',
                                            borderRadius: '4px',
                                            fontSize: '13px'
                                        }}
                                    />
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '15px' }}>
                                <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                                    <label style={{ marginBottom: '5px', fontSize: '13px', fontWeight: '500' }}>Total Tickets</label>
                                    <input
                                        type="number"
                                        name="total_ticket"
                                        value={generateForm.total_ticket}
                                        onChange={handleGenerateFormChange}
                                        readOnly
                                        style={{
                                            padding: '8px 12px',
                                            border: '1px solid #ccc',
                                            borderRadius: '4px',
                                            fontSize: '13px',
                                            backgroundColor: '#f5f5f5'
                                        }}
                                    />
                                </div>
                                <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                                    <label style={{ marginBottom: '5px', fontSize: '13px', fontWeight: '500' }}>Ticket Type <span style={{ color: 'red' }}>*</span></label>
                                    <select
                                        name="ticket_type"
                                        value={generateForm.ticket_type}
                                        onChange={handleGenerateFormChange}
                                        style={{
                                            padding: '8px 12px',
                                            border: '1px solid #ccc',
                                            borderRadius: '4px',
                                            fontSize: '13px',
                                            backgroundColor: 'white'
                                        }}
                                    >
                                        <option value="">Select Type  <span style={{ color: 'red' }}>*</span></option>
                                        <option value="virtual">Virtual</option>
                                        <option value="physical">Physical</option>
                                    </select>
                                </div>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <label style={{ marginBottom: '5px', fontSize: '13px', fontWeight: '500' }}>Merchant <span style={{ color: 'red' }}>*</span></label>
                                <select
                                    name="merchant_id"
                                    value={generateForm.merchant_id}
                                    onChange={handleGenerateFormChange}
                                    style={{
                                        padding: '8px 12px',
                                        border: '1px solid #ccc',
                                        borderRadius: '4px',
                                        fontSize: '13px',
                                        backgroundColor: 'white'
                                    }}
                                >
                                    <option value="">Select Merchant </option>
                                    {filterOptions.merchant_list.map(merchant => (
                                        <option key={merchant.value} value={merchant.value}>
                                            {merchant.label}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
                                <button
                                    onClick={() => {
                                        setShowGenerateModal(false);
                                        resetGenerateForm();
                                    }}
                                    style={{
                                        padding: '8px 16px',
                                        borderRadius: '4px',
                                        background: 'transparent',
                                        color: '#666',
                                        border: '1px solid #ccc',
                                        cursor: 'pointer',
                                        fontSize: '12px'
                                    }}
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleGenerateTickets}
                                    disabled={generating || !generateForm.series || !generateForm.ticket_number_range_start || 
                                             !generateForm.ticket_number_range_end}
                                    style={{
                                        padding: '8px 16px',
                                        borderRadius: '4px',
                                        background: 'linear-gradient(45deg, #28a745, #218838)',
                                        color: 'white',
                                        border: 'none',
                                        cursor: generating ? 'not-allowed' : 'pointer',
                                        fontSize: '12px',
                                        opacity: (generating || !generateForm.series || !generateForm.ticket_number_range_start || 
                                                !generateForm.ticket_number_range_end) ? 0.6 : 1
                                    }}
                                >
                                    {generating ? (
                                        <>
                                            <i className="fa-solid fa-spinner fa-spin" style={{ marginRight: '6px' }}></i>
                                            Generating...
                                        </>
                                    ) : 'Generate Tickets'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Batch Update Modal */}
            {/* {showUpdateModal && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0.5)',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    zIndex: 1000
                }}>
                    <div style={{
                        backgroundColor: 'white',
                        borderRadius: '8px',
                        padding: '20px',
                        width: '500px',
                        maxWidth: '90%',
                        maxHeight: '90%',
                        overflow: 'auto'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600' }}>Batch Update Tickets</h3>
                            <button
                                onClick={() => {
                                    setShowUpdateModal(false);
                                    resetUpdateForm();
                                }}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer',
                                    fontSize: '20px',
                                    color: '#666'
                                }}
                            >
                                ×
                            </button>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <label style={{ marginBottom: '5px', fontSize: '13px', fontWeight: '500' }}>Series <span style="color: red;">*</span></label>
                                <input
                                    type="text"
                                    name="series"
                                    value={updateForm.series}
                                    onChange={handleUpdateFormChange}
                                    placeholder="e.g., KHA"
                                    style={{
                                        padding: '8px 12px',
                                        border: '1px solid #ccc',
                                        borderRadius: '4px',
                                        fontSize: '13px'
                                    }}
                                />
                            </div>

                            <div style={{ display: 'flex', gap: '15px' }}>
                                <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                                    <label style={{ marginBottom: '5px', fontSize: '13px', fontWeight: '500' }}>Start Range <span style="color: red;">*</span></label>
                                    <input
                                        type="number"
                                        name="ticket_number_range_start"
                                        value={updateForm.ticket_number_range_start}
                                        onChange={handleUpdateFormChange}
                                        placeholder="e.g., 550001"
                                        style={{
                                            padding: '8px 12px',
                                            border: '1px solid #ccc',
                                            borderRadius: '4px',
                                            fontSize: '13px'
                                        }}
                                    />
                                </div>
                                <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                                    <label style={{ marginBottom: '5px', fontSize: '13px', fontWeight: '500' }}>End Range <span style="color: red;">*</span></label>
                                    <input
                                        type="number"
                                        name="ticket_number_range_end"
                                        value={updateForm.ticket_number_range_end}
                                        onChange={handleUpdateFormChange}
                                        placeholder="e.g., 550080"
                                        style={{
                                            padding: '8px 12px',
                                            border: '1px solid #ccc',
                                            borderRadius: '4px',
                                            fontSize: '13px'
                                        }}
                                    />
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '15px' }}>
                                <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                                    <label style={{ marginBottom: '5px', fontSize: '13px', fontWeight: '500' }}>Total Tickets</label>
                                    <input
                                        type="number"
                                        name="total_ticket"
                                        value={updateForm.total_ticket}
                                        onChange={handleUpdateFormChange}
                                        readOnly
                                        style={{
                                            padding: '8px 12px',
                                            border: '1px solid #ccc',
                                            borderRadius: '4px',
                                            fontSize: '13px',
                                            backgroundColor: '#f5f5f5'
                                        }}
                                    />
                                </div>
                                <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                                    <label style={{ marginBottom: '5px', fontSize: '13px', fontWeight: '500' }}>Ticket Type (Optional)</label>
                                    <select
                                        name="ticket_type"
                                        value={updateForm.ticket_type}
                                        onChange={handleUpdateFormChange}
                                        style={{
                                            padding: '8px 12px',
                                            border: '1px solid #ccc',
                                            borderRadius: '4px',
                                            fontSize: '13px',
                                            backgroundColor: 'white'
                                        }}
                                    >
                                        <option value="">Select Type (Optional)</option>
                                        <option value="virtual">Virtual</option>
                                        <option value="physical">Physical</option>
                                    </select>
                                </div>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <label style={{ marginBottom: '5px', fontSize: '13px', fontWeight: '500' }}>Merchant <span style="color: red;">*</span></label>
                                <select
                                    name="merchant_id"
                                    value={updateForm.merchant_id}
                                    onChange={handleUpdateFormChange}
                                    style={{
                                        padding: '8px 12px',
                                        border: '1px solid #ccc',
                                        borderRadius: '4px',
                                        fontSize: '13px',
                                        backgroundColor: 'white'
                                    }}
                                >
                                    <option value="">Select Merchant (Optional)</option>
                                    {filterOptions.merchant_list.map(merchant => (
                                        <option key={merchant.value} value={merchant.value}>
                                            {merchant.label}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
                                <button
                                    onClick={() => {
                                        setShowUpdateModal(false);
                                        resetUpdateForm();
                                    }}
                                    style={{
                                        padding: '8px 16px',
                                        borderRadius: '4px',
                                        background: 'transparent',
                                        color: '#666',
                                        border: '1px solid #ccc',
                                        cursor: 'pointer',
                                        fontSize: '12px'
                                    }}
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleBatchUpdate}
                                    disabled={updating || !updateForm.series || !updateForm.ticket_number_range_start || 
                                             !updateForm.ticket_number_range_end}
                                    style={{
                                        padding: '8px 16px',
                                        borderRadius: '4px',
                                        background: 'linear-gradient(45deg, #17a2b8, #138496)',
                                        color: 'white',
                                        border: 'none',
                                        cursor: updating ? 'not-allowed' : 'pointer',
                                        fontSize: '12px',
                                        opacity: (updating || !updateForm.series || !updateForm.ticket_number_range_start || 
                                                !updateForm.ticket_number_range_end) ? 0.6 : 1
                                    }}
                                >
                                    {updating ? (
                                        <>
                                            <i className="fa-solid fa-spinner fa-spin" style={{ marginRight: '6px' }}></i>
                                            Updating...
                                        </>
                                    ) : 'Update Tickets'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )} */}

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

export default TicketPage;
// InvoiceListPage.jsx
import React, { useState, useEffect, useMemo } from 'react';
import Paginate from './Paginate';
import { FaHome } from 'react-icons/fa';
import Select from 'react-select';
import WintextPdf from './pdf/WintextPdf';
import SkeletonLoader from './SkeletonLoader'; // Import the skeleton loader

const BASE_URL = `${import.meta.env.VITE_APP_API_BASE_URL}/wintext-invoice`;

const InvoiceListPage = ({ sidebarVisible = false }) => {
    const [allInvoices, setAllInvoices] = useState([]);
    const [invoices, setInvoices] = useState([]);
    const [searchInvoiceNumber, setSearchInvoiceNumber] = useState('');
    const [searchClient, setSearchClient] = useState('');
    const [searchDateFrom, setSearchDateFrom] = useState('');
    const [searchDateTo, setSearchDateTo] = useState('');
    const [alertMessage, setAlertMessage] = useState('');
    const [alertVariant, setAlertVariant] = useState('success');
    const [currentPage, setCurrentPage] = useState(1);
    const [loading, setLoading] = useState(false);
    const [actionMenuId, setActionMenuId] = useState(null);
    const [filterOptions, setFilterOptions] = useState({
        invoice_numbers: [],
        client_names: []
    });
    const [appliedFilters, setAppliedFilters] = useState({
        invoice_number: '',
        client_name: '',
        date_from: '',
        date_to: ''
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

    // PDF generation state
    const [pdfGeneration, setPdfGeneration] = useState({
        isGenerating: false,
        invoice: null,
        details: null
    });

    // Loading states
    const [filterOptionsLoading, setFilterOptionsLoading] = useState(true);

    const ITEMS_PER_PAGE = 10;

    // 🔍 Debug: Log token info on mount
    useEffect(() => {
        console.log('=== TOKEN DEBUGGING ===');
        console.log('All localStorage keys:', Object.keys(localStorage));
        console.log('All localStorage values:');
        Object.keys(localStorage).forEach(key => {
            const value = localStorage.getItem(key);
            console.log(`  ${key}:`, value ? `${value.substring(0, 50)}...` : 'null');
        });
        console.log('======================');
    }, []);

    // ✅ Get fresh auth headers with token
    const getAuthHeaders = () => {
        console.log('=== SEARCHING FOR TOKEN ===');
        console.log('📦 All localStorage keys:', Object.keys(localStorage));
        
        // YOUR LOGIN SAVES TOKEN AS 'authToken', NOT 'access_token'!
        let token = localStorage.getItem('authToken')  // ✅ This is what your login uses
                 || localStorage.getItem('access_token')
                 || localStorage.getItem('token')
                 || localStorage.getItem('auth_token');
        
        let foundKey = null;
        
        if (token) {
            if (localStorage.getItem('authToken')) foundKey = 'authToken';
            else if (localStorage.getItem('access_token')) foundKey = 'access_token';
            else if (localStorage.getItem('token')) foundKey = 'token';
        }
        
        console.log('🔑 Token found:', token ? 'YES' : 'NO');
        if (token) {
            console.log('🔑 Token key:', foundKey);
            console.log('🔑 Token preview:', `${token.substring(0, 30)}...`);
            console.log('🔑 Token length:', token.length);
        } else {
            console.error('❌ NO TOKEN FOUND IN STORAGE!');
            console.error('❌ Available keys:', Object.keys(localStorage));
            console.error('❌ You may need to login first');
        }
        console.log('=========================');
        
        const headers = {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
        };
        
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        
        return headers;
    };

    // ✅ Handle 401 errors
    const handleUnauthorized = (response) => {
        if (response.status === 401) {
            showAlert('Session expired. Please login again.', 'danger');
            // Optionally redirect to login after a delay
            setTimeout(() => {
                // window.location.href = '/login';
            }, 2000);
            return true;
        }
        return false;
    };

    // Fetch invoices and filter options on mount
    useEffect(() => {
        fetchFilterOptions();
        fetchInvoices();
    }, []);

    // Handle click outside for action menu
    useEffect(() => {
        const handleClickOutside = () => setActionMenuId(null);
        if (actionMenuId !== null) {
            document.addEventListener('click', handleClickOutside);
            return () => document.removeEventListener('click', handleClickOutside);
        }
    }, [actionMenuId]);

    const formatDisplayDate = (dateStr) => {
        if (!dateStr) return '';
        const [year, month, day] = dateStr.split('-');
        return `${day}-${month}-${year}`;
    };

    const handleDateChange = (setter) => (e) => {
        setter(e.target.value);
    };

    // Memoized filtered invoices based on APPLIED search criteria
    const filteredInvoices = useMemo(() => {
        if (!appliedFilters.invoice_number && !appliedFilters.client_name && !appliedFilters.date_from && !appliedFilters.date_to) {
            return allInvoices;
        }

        return allInvoices.filter(invoice => {
            const matchesInvoiceNumber = appliedFilters.invoice_number === '' ||
                invoice.invoice_number.toLowerCase().includes(appliedFilters.invoice_number.toLowerCase());
            const matchesClient = appliedFilters.client_name === '' ||
                (invoice.client_name && invoice.client_name.toLowerCase().includes(appliedFilters.client_name.toLowerCase()));

            let matchesDate = true;
            if (appliedFilters.date_from && invoice.billing_date) {
                matchesDate = matchesDate && invoice.billing_date >= appliedFilters.date_from;
            }
            if (appliedFilters.date_to && invoice.billing_date) {
                matchesDate = matchesDate && invoice.billing_date <= appliedFilters.date_to;
            }

            return matchesInvoiceNumber && matchesClient && matchesDate;
        });
    }, [allInvoices, appliedFilters]);

    // Paginate whenever currentPage or filteredInvoices changes
    useEffect(() => {
        paginateInvoices(currentPage);
    }, [currentPage, filteredInvoices]);

    // ✅ Fetch filter options with auth
    const fetchFilterOptions = async () => {
        try {
            setFilterOptionsLoading(true);
            console.log('📊 Fetching filter options...');
            const response = await fetch(`${BASE_URL}/filter-data`, {
                method: 'GET',
                headers: getAuthHeaders(),
                credentials: 'include',
            });

            console.log('📊 Filter response status:', response.status);

            if (handleUnauthorized(response)) return;

            if (!response.ok) {
                const errorText = await response.text();
                console.error('❌ Filter fetch error:', errorText);
                throw new Error(`${response.status} ${response.statusText}`);
            }

            const result = await response.json();
            console.log('✅ Filter data received:', result);

            if (result.status === 'success') {
                const data = result?.data ?? {};
                const invoiceNumbers = data.invoice_numbers?.map((i) => i.value) ?? [];
                const clientNames = data.client_names?.map((i) => i.value).filter(name => name !== null) ?? [];

                setFilterOptions({
                    invoice_numbers: invoiceNumbers,
                    client_names: clientNames
                });
            }
        } catch (error) {
            console.error('❌ Error fetching filter options:', error);
            showAlert('Failed to load filter options', 'danger');
        } finally {
            setFilterOptionsLoading(false);
        }
    };

    // ✅ Fetch invoices with auth
    const fetchInvoices = async (filters = {}) => {
        try {
            setLoading(true);

            // Build query parameters
            const queryParams = new URLSearchParams();
            if (filters.invoice_number) queryParams.append('invoice_number', filters.invoice_number);
            if (filters.client_name) queryParams.append('client_name', filters.client_name);
            if (filters.date_from) queryParams.append('date_from', filters.date_from);
            if (filters.date_to) queryParams.append('date_to', filters.date_to);

            const queryString = queryParams.toString();
            const url = queryString
                ? `${BASE_URL}/list-paginate?${queryString}`
                : `${BASE_URL}/list-paginate`;

            console.log('📄 Fetching invoices from:', url);

            const response = await fetch(url, {
                method: 'GET',
                headers: getAuthHeaders(),
                credentials: 'include',
            });

            console.log('📄 Invoice response status:', response.status);

            if (handleUnauthorized(response)) return;

            if (!response.ok) {
                const errorBody = await response.text();
                console.error('❌ Fetch error response:', { status: response.status, body: errorBody });
                throw new Error(`Failed to fetch invoices: ${response.status} ${response.statusText}`);
            }

            const result = await response.json();
            console.log('✅ Invoice data received:', result);

            if (result.status === 'success') {
                const invoicesData = result?.data?.data ?? result?.data ?? [];
                setAllInvoices(invoicesData);
                setCurrentPage(1);
            } else {
                throw new Error(result.message || 'Failed to fetch invoices');
            }
        } catch (error) {
            console.error('❌ Error fetching invoices:', error);
            showAlert(error.message || "Failed to fetch invoices", "danger");
        } finally {
            setLoading(false);
        }
    };

    // ✅ Fetch invoice details with auth
    const fetchInvoiceDetails = async (invoiceId) => {
        try {
            console.log('📋 Fetching invoice details for ID:', invoiceId);
            const response = await fetch(`${BASE_URL}/single-data/${invoiceId}`, {
                method: 'GET',
                headers: getAuthHeaders(),
                credentials: 'include',
            });

            console.log('📋 Details response status:', response.status);

            if (handleUnauthorized(response)) return [];

            if (!response.ok) {
                const errorBody = await response.text();
                console.error('❌ Fetch details error:', { status: response.status, body: errorBody });
                throw new Error(`${response.status} ${response.statusText}`);
            }

            const result = await response.json();
            console.log('✅ Details received:', result);

            const invoiceObj = result?.data ?? result;
            const details = invoiceObj?.wintext_invoice_dtl ?? invoiceObj?.details ?? [];
            return details;
        } catch (error) {
            console.error('❌ Error fetching invoice details:', error);
            showAlert('Failed to fetch invoice details', 'danger');
            return [];
        }
    };

    const paginateInvoices = (page) => {
        const totalItems = filteredInvoices.length;
        const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE) || 1;
        const startIndex = (page - 1) * ITEMS_PER_PAGE;
        const endIndex = startIndex + ITEMS_PER_PAGE;
        const paginatedInvoices = filteredInvoices.slice(startIndex, endIndex);

        setInvoices(paginatedInvoices);
        setPaginator({
            current_page: page,
            total_pages: totalPages,
            previous_page_url: page > 1 ? page - 1 : null,
            next_page_url: page < totalPages ? page + 1 : null,
            record_per_page: ITEMS_PER_PAGE,
            current_page_items_count: paginatedInvoices.length,
            total_count: totalItems,
            pagination_last_page: totalPages
        });
    };
    function formatBDT(number) {
        return number.toLocaleString('en-IN'); // Indian numbering system
    }  

    const handleClear = () => {
        setSearchInvoiceNumber('');
        setSearchClient('');
        setSearchDateFrom('');
        setSearchDateTo('');
        setAppliedFilters({
            invoice_number: '',
            client_name: '',
            date_from: '',
            date_to: ''
        });
        setCurrentPage(1);
        fetchInvoices();
    };

    const handleFilter = () => {
        const filters = {
            invoice_number: searchInvoiceNumber,
            client_name: searchClient,
            date_from: searchDateFrom,
            date_to: searchDateTo
        };

        setAppliedFilters(filters);

        const activeFilters = Object.fromEntries(
            Object.entries(filters).filter(([_, value]) => value !== '')
        );

        if (Object.keys(activeFilters).length === 0) {
            fetchInvoices();
            showAlert("Showing all invoices", "info");
        } else {
            fetchInvoices(activeFilters);
        }
    };

    // Handle Enter key press in filter inputs
    const handleKeyPress = (e) => {
        if (e.key === 'Enter') {
            handleFilter();
        }
    };

    const handlePageChange = (page) => {
        setCurrentPage(page);
    };

    const handleEdit = (id) => {
        window.location.href = `/admin/invoices/edit/${id}`;
    };

  // Replace your handlePrint function in InvoiceListPage.jsx with this:

const handlePrint = async (invoice) => {
    setActionMenuId(null);
    
    try {
        setPdfGeneration(prev => ({ ...prev, isGenerating: true }));
        
        console.log('🖨️ Fetching invoice details for:', invoice.id);
        
        // Fetch full invoice data from single-data API
        const response = await fetch(`${BASE_URL}/single-data/${invoice.id}`, {
            method: 'GET',
            headers: getAuthHeaders(),
            credentials: 'include',
        });

        if (!response.ok) {
            throw new Error('Failed to fetch invoice details');
        }

        const result = await response.json();
        console.log('📄 Full invoice data received:', result);
        
        // Handle array response [data, status_code, status, message]
        let fullInvoiceData = result;
        if (Array.isArray(result)) {
            fullInvoiceData = result[0];
        } else if (result.data) {
            fullInvoiceData = result.data;
        }
        
        console.log('✅ Processed invoice data:', fullInvoiceData);
        console.log('📋 Invoice details:', fullInvoiceData?.wintext_invoice_dtl);
        console.log('💳 Payment instructions:', fullInvoiceData?.wintext_inv_pmnt_instr_dtl);
        
        // Pass the complete invoice data to PDF generator
        setPdfGeneration({
            isGenerating: true,
            invoice: fullInvoiceData,
            details: fullInvoiceData?.wintext_invoice_dtl || []
        });
        
    } catch (error) {
        console.error('❌ Error preparing invoice for printing:', error);
        showAlert("Failed to prepare invoice for PDF generation", "danger");
        setPdfGeneration(prev => ({ ...prev, isGenerating: false }));
    }
};

    // PDF generation callbacks
    const handlePdfGenerated = (message) => {
        showAlert(message, "success");
        setPdfGeneration({
            isGenerating: false,
            invoice: null,
            details: null
        });
    };

    const handlePdfError = (message) => {
        showAlert(message, "danger");
        setPdfGeneration({
            isGenerating: false,
            invoice: null,
            details: null
        });
    };

    const handleCreateInvoice = () => {
        window.location.href = '/admin/invoices/create';
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
                <h1 style={{ margin: 0, fontSize: '20px', fontWeight: '600' }}>Invoices</h1>
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
                        Invoice Management
                    </span>
                    <span style={{ margin: '0 8px' }}>/</span>
                    <span>Invoices</span>
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

            {/* Filter Section with Skeleton */}
            <div style={{
                backgroundColor: 'white',
                borderRadius: '8px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                padding: '10px'
            }}>
                {filterOptionsLoading ? (
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'start', alignItems: 'flex-end', marginBottom: '10px', flexWrap: 'wrap' }}>
                        {/* Skeleton for filter inputs */}
                        <SkeletonLoader type="filter" count={4} />
                    </div>
                ) : (
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'start', alignItems: 'flex-end', marginBottom: '10px', flexWrap: 'wrap' }}>
                        {/* Invoice Number Dropdown */}
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <label style={{ marginBottom: '4px', fontSize: '13px', fontWeight: '500', color: '#333' }}>
                                Invoice Number
                            </label>
                            <Select
                                value={searchInvoiceNumber ? { value: searchInvoiceNumber, label: searchInvoiceNumber } : null}
                                onChange={(selectedOption) => setSearchInvoiceNumber(selectedOption ? selectedOption.value : '')}
                                options={[
                                    { value: '', label: 'All Invoice Numbers' },
                                    ...filterOptions.invoice_numbers.map((number) => ({
                                        value: number,
                                        label: number
                                    }))
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
                                    }),
                                    clearIndicator: (base) => ({
                                        ...base,
                                        color: '#999',
                                        '&:hover': {
                                            color: '#ff0000'
                                        }
                                    })
                                }}
                                isSearchable={true}
                                placeholder="All Invoice Numbers"
                            />
                        </div>

                        {/* Client Name Dropdown */}
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <label style={{ marginBottom: '4px', fontSize: '13px', fontWeight: '500', color: '#333' }}>
                                Client Name
                            </label>
                            <Select
                                value={searchClient ? { value: searchClient, label: searchClient } : null}
                                onChange={(selectedOption) => setSearchClient(selectedOption ? selectedOption.value : '')}
                                options={[
                                    { value: '', label: 'All Clients' },
                                    ...filterOptions.client_names.map((name) => ({
                                        value: name,
                                        label: name
                                    }))
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
                                    }),
                                    clearIndicator: (base) => ({
                                        ...base,
                                        color: '#999',
                                        '&:hover': {
                                            color: '#ff0000'
                                        }
                                    })
                                }}
                                isSearchable={true}
                                placeholder="All Clients"
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
                {/* Create Button Section */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <button
                        onClick={handleCreateInvoice}
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
                        <i className="fa-solid fa-plus" style={{ marginRight: '6px', fontSize: '12px' }}></i> Create New Invoice
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
                            <th className="py-2 px-3 fw-semibold text-start">Invoice No</th>
                            <th className="py-2 px-3 fw-semibold text-start">Client Name</th>
                            {/* <th className="py-2 px-3 fw-semibold text-start">Bank</th> */}
                            <th className="py-2 px-3 fw-semibold text-center">Billing Date</th>
                            <th className="py-2 px-3 fw-semibold text-end">Total</th>
                            <th className="py-2 px-3 fw-semibold text-center" style={{ width: "80px" }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <SkeletonLoader type="table" count={5} columns={6} />
                        ) : invoices.length > 0 ? (
                            invoices.map((invoice, i) => (
                                <tr key={invoice.id} className="align-middle">
                                    <td className="py-1 px-3 text-center">
                                        {paginator?.current_page > 1
                                            ? (paginator?.current_page - 1) * paginator?.record_per_page + i + 1
                                            : i + 1}
                                    </td>
                                    <td className="py-1 px-3">{invoice.invoice_number}</td>
                                    <td className="py-1 px-3">{invoice.client_name}</td>
                                    {/* <td className="py-1 px-3">{invoice.pmnt_rcv_bank || 'N/A'}</td> */}
                                    <td className="py-1 px-3 text-center">{invoice.billing_date}</td>
                                    <td className="py-1 px-3 text-end">{parseFloat(invoice.total || 0).toFixed(2)}</td>

                                    {/* Actions column */}
                                    <td className="py-1 px-3 text-center position-relative">
                                        <button
                                            className="btn btn-link p-0"
                                            style={{ fontSize: "12px" }}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setActionMenuId(actionMenuId === invoice.id ? null : invoice.id);
                                            }}
                                        >
                                            <i className="fa-solid fa-ellipsis-v"></i>
                                        </button>

                                        {actionMenuId === invoice.id && (
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
                                                    onClick={() => handleEdit(invoice.id)}
                                                    className="dropdown-item py-0 px-2 d-flex align-items-center"
                                                    style={{ fontSize: "12px", height: "24px" }}
                                                >
                                                    <i className="fa-solid fa-pen me-2" style={{ fontSize: "12px" }}></i> Edit
                                                </button>

                                                <div style={{ borderTop: "1px solid #ccc", margin: "2px 0" }}></div>

                                                <button
                                                    onClick={() => handlePrint(invoice)}
                                                    className="dropdown-item py-0 px-2 d-flex align-items-center text-success"
                                                    style={{ fontSize: "12px", height: "24px" }}
                                                    disabled={pdfGeneration.isGenerating}
                                                >
                                                    {pdfGeneration.isGenerating ? (
                                                        <>
                                                            <i className="fa-solid fa-spinner fa-spin me-2" style={{ fontSize: "12px" }}></i>
                                                            Generating PDF...
                                                        </>
                                                    ) : (
                                                        <>
                                                            <i className="fa-solid fa-file-pdf me-2" style={{ fontSize: "12px" }}></i>
                                                            PDF
                                                        </>
                                                    )}
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
                                        ? "No invoices found matching your filters"
                                        : "No invoices available"
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

            {/* PDF Generation Component */}
            {pdfGeneration.isGenerating && pdfGeneration.invoice && pdfGeneration.details && (
                <WintextPdf 
                    invoice={pdfGeneration.invoice}
                    details={pdfGeneration.details}
                    onPdfGenerated={handlePdfGenerated}
                    onError={handlePdfError}
                />
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
            `}</style>
        </div>
    );
};

export default InvoiceListPage;
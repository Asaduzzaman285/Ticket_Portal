// ==================== UPDATED InvoiceCreatePage.jsx ====================
import React, { useState, useEffect,useRef } from 'react';
import { FaHome, FaSpinner, FaPlus, FaTrash, FaChevronDown, FaChevronUp, FaEdit } from 'react-icons/fa';

import Select, { components } from 'react-select';
import Swal from 'sweetalert2';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import moment from 'moment';

const InvoiceCreatePage = ({ sidebarVisible = false }) => {
    const fileInputRef = useRef(null);
    const [clients, setClients] = useState([]);
    const [banks, setBanks] = useState([]); // Now will hold payment_accounts for type 1 (Bank)
    const [mfsAccounts, setMfsAccounts] = useState([]);
    const [alertMessage, setAlertMessage] = useState('');
    const [alertVariant, setAlertVariant] = useState('success');
    const [loading, setLoading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [calculatingSms, setCalculatingSms] = useState(false);
    const [fetchingClients, setFetchingClients] = useState(true);
    const [fetchingBanks, setFetchingBanks] = useState(true);

    // New states for payment methods
    const [paymentMethodTypes, setPaymentMethodTypes] = useState([]);
    const [mfsTypes, setMfsTypes] = useState([]);
    const [paymentDetails, setPaymentDetails] = useState([]);
    const [currentPaymentMethod, setCurrentPaymentMethod] = useState({
        payment_method_type_id: '', // 1 for Bank, 2 for MFS
        // Bank fields (now from payment_accounts)
        bank_id: '', // payment_account.id
        receiver_name: '',
        pmnt_receive_acc: '',
        pmnt_rcv_branch: '',
        pmnt_rcv_rn: '',
        pmnt_rcv_bank: '',
        // MFS fields
        mfs_account_id: '', 
        mfs_type_id: '',
        receiver_name_mfs: '', // Separate for MFS
        receiver_account_name: '',
        note: '',
        // NEW MFS Transaction Charge fields
        txn_charge: null,
        txn_charge_text: 'Charges Applicable'
    });
    const [showPaymentForm, setShowPaymentForm] = useState(false);

    // New state for mushak file
    const [mushakFile, setMushakFile] = useState(null);
    const [uploadingMushak, setUploadingMushak] = useState(false);

    const [formData, setFormData] = useState({
        invoice_number: "",
        billing_date: new Date().toISOString().split('T')[0],
        prepared_by: "",
        received_by: "",
        note: "",
        // Client fields
        client_id: "",
        client_name: "",
        client_address: "",
        kam: "",
        company_id: "",
        client_email: "", // NEW
        bin: "", // NEW
        section: "", // NEW
        // Additional fields from your table structure
        billing_attention: "",
        billing_attention_phone: "",
        amount_in_words: "",
        payment_instructions: "",
        // New required fields
        billing_start_date: new Date().toISOString().split('T')[0],
        billing_end_date: new Date().toISOString().split('T')[0],
        contract_no: "",
        vat: 0,
        mushak_file_path: ""
    });
    useEffect(() => {
        const name = localStorage.getItem("userName");
        setFormData(prev => ({
            ...prev,
            prepared_by: name || ""
        }));
    }, []);

    const [invoiceItems, setInvoiceItems] = useState([]);
    const [currentItem, setCurrentItem] = useState({
        description: "",
        sms_qty: "",
        unit_price: "",
        start_time: "",
        end_time: "",
        start_time_init: null,
        end_time_init: null,
    });

    const API_BASE_URL = "http://127.0.0.1:8000";

    // Hardcoded description options
    const descriptionOptions = [
        "Bill for Wintext Software Service:NM",
        "Bill for Wintext Software Service:M"
    ];

    useEffect(() => {
        const fetchData = async () => {
            await Promise.all([
                fetchClients(), 
                fetchPaymentMethodTypes(),
                fetchMfsTypes()
            ]);
        };
        fetchData();
        generateInvoiceNumber();
    }, []);

    // Auto-calculate SMS quantity when time frame changes
    useEffect(() => {
        const calculateSmsOnTimeChange = async () => {
            if (currentItem.start_time && currentItem.end_time &&
                currentItem.description && formData.client_id) {
                await fetchSmsQuantity(currentItem.description, currentItem.unit_price);
            }
        };

        const timer = setTimeout(() => {
            calculateSmsOnTimeChange();
        }, 500);

        return () => clearTimeout(timer);
    }, [currentItem.start_time, currentItem.end_time]);


    const handleRemoveMushakFile = () => {
        setFormData(prev => ({ 
            ...prev, 
            mushak_file_path: "" 
        }));
        
        setMushakFile(null);
        
        // Clear the file input using the ref
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    
        showAlert("Mushak file removed. You can upload a new one.", "warning");
    };
    

    // UPDATED: Fetch clients and payment_accounts from support-data
    const fetchClients = async () => {
        const token = localStorage.getItem("authToken");
        try {
            const res = await fetch(`${import.meta.env.VITE_APP_API_BASE_URL}/wintext-invoice/get-support-data`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.status === "success") {
                setClients(data.data.wintext_support_data || []);
                const paymentAccounts = data.data.payment_accounts || [];
                
                // Filter banks (type 1)
                setBanks(paymentAccounts.filter(pa => pa.payment_method_type_id == 1) || []);
                
                // Filter MFS accounts (type 2)
                setMfsAccounts(paymentAccounts.filter(pa => pa.payment_method_type_id == 2) || []);
            }
           else {
                setClients([]);
                setBanks([]);
            }
        } catch (error) {
            console.error("Error fetching clients:", error);
            showAlert("Failed to load clients", "danger");
        } finally {
            setFetchingClients(false);
            setFetchingBanks(false);
        }
    };

    // Add this new function after handleBankSelect
    const handleMfsSelect = (paymentAccountId) => {
        const mfsAccount = mfsAccounts.find((pa) => pa.id == paymentAccountId);
        if (mfsAccount) {
            setCurrentPaymentMethod(prev => ({
                ...prev,
                mfs_account_id: mfsAccount.id,
                mfs_type_id: mfsAccount.mfs_type_id,
                receiver_name_mfs: mfsAccount.receiver_name || "",
                receiver_account_name: mfsAccount.receiver_account_number || ""
            }));
        }
    };

    // FIXED: Use correct endpoint with payment-method prefix
    const fetchPaymentMethodTypes = async () => {
        const token = localStorage.getItem("authToken");
        try {
            const res = await fetch(`${import.meta.env.VITE_APP_API_BASE_URL}/payment-method/payment-method-types`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.status === "success") {
                setPaymentMethodTypes(data.data || []);
            } else {
                setPaymentMethodTypes([]);
            }
        } catch (error) {
            console.error("Error fetching payment method types:", error);
        }
    };

    // FIXED: Use correct endpoint with mfs-types prefix
    const fetchMfsTypes = async () => {
        const token = localStorage.getItem("authToken");
       
        try {
            const res = await fetch(`${import.meta.env.VITE_APP_API_BASE_URL}/mfs-types/get-all`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.status === "success") {
                setMfsTypes(data.data || []);
            } else {
                setMfsTypes([]);
            }
        } catch (error) {
            console.error("Error fetching MFS types:", error);
        }
    };

    // NEW: Upload mushak file
    const uploadMushakFile = async (file) => {
        if (!file) return;

        setUploadingMushak(true);
        const token = localStorage.getItem("authToken");
        const formDataUpload = new FormData();
        formDataUpload.append('file', file);
        formDataUpload.append('file_path', 'uploads/modules/wintext_invoice/mushok/');
        formDataUpload.append('file_name', file.name);

        try {
            const response = await fetch(`${import.meta.env.VITE_APP_API_BASE_URL}/v1/general/file/file-upload`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`,
                    ContentType: 'application/json'
                },
                body: formDataUpload,
            });

            const data = await response.json();

            if (data.status === "success") {
                setFormData(prev => ({ ...prev, mushak_file_path: data.data.file_path }));
                showAlert("Mushak file uploaded successfully", "success");
            } else {
                showAlert(data.message || "Failed to upload mushak file", "danger");
            }
        } catch (error) {
            console.error("Error uploading mushak file:", error);
            showAlert("Error uploading mushak file", "danger");
        } finally {
            setUploadingMushak(false);
        }
    };

    // Handle payment method type change
    const handlePaymentMethodTypeChange = (paymentMethodTypeId) => {
        setCurrentPaymentMethod(prev => ({
            ...prev,
            payment_method_type_id: paymentMethodTypeId,
            // Reset all fields when type changes
            bank_id: '',
            receiver_name: '',
            pmnt_receive_acc: '',
            pmnt_rcv_branch: '',
            pmnt_rcv_rn: '',
            pmnt_rcv_bank: '',
            mfs_account_id: '',
            mfs_type_id: '',
            receiver_name_mfs: '',
            receiver_account_name: '',
            note: '',
            // FIX: Set proper defaults for MFS fields
            txn_charge: null,
            txn_charge_text: 'Charges Applicable'
        }));
    };

    // UPDATED: Handle bank selection from payment_accounts dropdown
    const handleBankSelect = (paymentAccountId) => {
        const paymentAccount = banks.find((pa) => pa.id == paymentAccountId);
        if (paymentAccount) {
            setCurrentPaymentMethod(prev => ({
                ...prev,
                bank_id: paymentAccount.id,
                receiver_name: paymentAccount.receiver_name || "",
                pmnt_receive_acc: paymentAccount.receiver_account_number || "",
                pmnt_rcv_branch: paymentAccount.pmnt_rcv_branch || "",
                pmnt_rcv_rn: paymentAccount.pmnt_rcv_rn || "",
                pmnt_rcv_bank: paymentAccount.pmnt_rcv_bank?.bank_name || ""
            }));
        }
    };

    // Add payment method to list
    const addPaymentMethod = () => {
        if (!currentPaymentMethod.payment_method_type_id) {
            showAlert("Please select payment method type", "warning");
            return;
        }

        // Validate based on payment method type
        if (currentPaymentMethod.payment_method_type_id == 1) { // Bank
            if (!currentPaymentMethod.bank_id) {
                showAlert("Please select a bank", "warning");
                return;
            }
        }
        if (currentPaymentMethod.payment_method_type_id == 2) { // MFS
            if (!currentPaymentMethod.mfs_account_id) {
                showAlert("Please select an MFS account", "warning");
                return;
            }
        }

        const newPaymentMethod = { ...currentPaymentMethod };
        setPaymentDetails(prev => [...prev, newPaymentMethod]);
        
        // Reset form
        setCurrentPaymentMethod({
            payment_method_type_id: '',
            bank_id: '',
            receiver_name: '',
            pmnt_receive_acc: '',
            pmnt_rcv_branch: '',
            pmnt_rcv_rn: '',
            pmnt_rcv_bank: '',
            mfs_account_id: '',
            mfs_type_id: '',
            receiver_name_mfs: '',
            receiver_account_name: '',
            note: '',
            // FIX: Set proper defaults
            txn_charge: null,
            txn_charge_text: 'Charges Applicable'
        });
        setShowPaymentForm(false);
    };

    // Remove payment method from list
    const removePaymentMethod = (index) => {
        setPaymentDetails(prev => prev.filter((_, i) => i !== index));
    }; 

    // Edit payment method
    const editPaymentMethod = (index) => {
        const paymentToEdit = paymentDetails[index];
        
        // Populate the form with the selected payment method data
        setCurrentPaymentMethod({
            payment_method_type_id: paymentToEdit.payment_method_type_id,
            // Bank fields
            bank_id: paymentToEdit.bank_id || '',
            receiver_name: paymentToEdit.receiver_name || '',
            pmnt_receive_acc: paymentToEdit.pmnt_receive_acc || '',
            pmnt_rcv_branch: paymentToEdit.pmnt_rcv_branch || '',
            pmnt_rcv_rn: paymentToEdit.pmnt_rcv_rn || '',
            pmnt_rcv_bank: paymentToEdit.pmnt_rcv_bank || '',
            // MFS fields
            mfs_account_id: paymentToEdit.mfs_account_id || '',
            mfs_type_id: paymentToEdit.mfs_type_id || '',
            receiver_name_mfs: paymentToEdit.receiver_name_mfs || '',
            receiver_account_name: paymentToEdit.receiver_account_name || '',
            note: paymentToEdit.note || '',
            txn_charge: paymentToEdit.txn_charge || 0,
            txn_charge_text: paymentToEdit.txn_charge_text || ''
        });
        
        // Remove the payment method from the list (will be re-added when user clicks "Add Payment Method")
        setPaymentDetails(prev => prev.filter((_, i) => i !== index));
        
        // Open the payment form
        setShowPaymentForm(true);
        
        // Scroll to the form (optional but helpful)
        setTimeout(() => {
            const formElement = document.querySelector('[style*="backgroundColor: white"]');
            if (formElement) {
                formElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
        }, 100);
        
        // Show a message to the user
        showAlert("Payment method loaded for editing. Make your changes and click 'Add Payment Method' to save.", "info");
    };
  
    const showSweetAlert = (message, type = "success") => {
        Swal.fire({
            title: type === "success" ? "Success!" : type === "error" ? "Error!" : "Warning!",
            text: message,
            icon: type,
            confirmButtonText: "OK",
            confirmButtonColor: type === "success" ? "#28a745" : type === "error" ? "#dc3545" : "#ffc107"
        });
    };

    const formatDateTimeForBackend = (datetimeLocal) => {
        if (!datetimeLocal) return '';
        return datetimeLocal.replace('T', ' ') + ':00';
    };

    const formatDisplayDate = (dateStr) => {
        if (!dateStr) return '';
        const [year, month, day] = dateStr.split('-');
        return `${day}-${month}-${year}`;
    };

    const formatDisplayDateTime = (datetimeStr) => {
        if (!datetimeStr) return '';

        let normalizedStr = datetimeStr;

        if (datetimeStr.includes(' ') && datetimeStr.split(':').length === 3) {
            normalizedStr = datetimeStr.substring(0, 16);
        }

        const [datePart, timePart] = normalizedStr.includes('T')
            ? normalizedStr.split('T')
            : normalizedStr.split(' ');

        const [year, month, day] = datePart.split('-');

        if (timePart) {
            const [hours, minutes] = timePart.split(':');
            return `${day}-${month}-${year} ${hours}:${minutes}`;
        }
        return `${day}-${month}-${year}`;
    };

    // ✅ FIXED: Correct POST method for /wintext-invoice/get-sms-quantity
    const fetchSmsQuantity = async (description, unitPrice) => {
        if (!formData.client_id || !currentItem.start_time || !currentItem.end_time) {
            showAlert("Missing client or time range", "warning");
            return;
        }

        try {
            setCalculatingSms(true);
            const token = localStorage.getItem("authToken");

            const client = clients.find((c) => c.client_id === formData.client_id);
            if (!client) {
                showAlert("Client not found", "danger");
                return;
            }

            const payload = {
                client_id: formData.client_id,
                start_time: currentItem.start_time,
                end_time: currentItem.end_time,
                description: description || "No description provided",
            };

            const response = await fetch(
                `${import.meta.env.VITE_APP_API_BASE_URL}/wintext-invoice/get-sms-quantity`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Accept: "application/json",
                        ...(token && { Authorization: `Bearer ${token}` }),
                    },
                    body: JSON.stringify(payload),
                    credentials: "include",
                }
            );

            const data = await response.json();

            if (response.ok && data.status === "success") {
                setCurrentItem((prev) => ({
                    ...prev,
                    sms_qty: data.sms_quantity?.toString() || "0",
                }));
                showAlert(`SMS quantity calculated: ${data.sms_quantity}`, "success");
            } else {
                const message = data.message || "Failed to calculate SMS quantity";
                showAlert(message, "danger");
                setCurrentItem((prev) => ({ ...prev, sms_qty: "0" }));
            }
        } catch (error) {
            console.error("Error calculating SMS quantity:", error);
            showAlert("Error calculating SMS quantity, using default value", "warning");
            setCurrentItem((prev) => ({ ...prev, sms_qty: "0" }));
        } finally {
            setCalculatingSms(false);
        }
    };

    const generateInvoiceNumber = () => {
        const now = new Date();
        const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
        const timeStr = now.toTimeString().slice(0, 8).replace(/:/g, '');
        const randomNum = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
        const invoiceNumber = `INV-${dateStr}-${timeStr}-${randomNum}`;

        setFormData(prev => ({
            ...prev,
            invoice_number: invoiceNumber
        }));
    };

    const handleClientSelect = (id) => {
        const client = clients.find((c) => c.client_id === id);
        if (client) {
            setFormData(prev => ({
                ...prev,
                client_id: client.client_id,
                client_name: client.client_name || "",
                client_address: client.client_address || "",
                kam: client.kam || "",
                company_id: client.company_id || "",
                client_email: client.client_email || "" // NEW: Auto-populate from API
            }));
        }
    };

    const handleInputChange = (field, value) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const handleDescriptionSelect = (description) => {
        if (!formData.client_id) {
            showAlert("Please select a client first", "warning");
            return;
        }

        const client = clients.find(c => c.client_id === formData.client_id);
        if (!client) {
            showAlert("Client not found", "warning");
            return;
        }

        let unitPrice = 0;
        if (description === "Bill for Wintext Software Service:NM") {
            unitPrice = parseFloat(client.nm_rate_view || 0);
        } else if (description === "Bill for Wintext Software Service:M") {
            unitPrice = parseFloat(client.m_rate_org || 0);
        }

        setCurrentItem(prev => ({
            ...prev,
            description: description,
            unit_price: unitPrice.toString(),
            sms_qty: prev.sms_qty
        }));

        if (currentItem.start_time && currentItem.end_time) {
            fetchSmsQuantity(description, unitPrice);
        }
    };

    const handleTimeChange = (field, value) => {
        setCurrentItem(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const handleItemEdit = (id, field, value) => {
        setInvoiceItems(prevItems =>
            prevItems.map(item =>
                item.id === id
                    ? { ...item, [field]: field === 'description' ? value : parseFloat(value) || 0 }
                    : item
            )
        );
    };

    const recalculateItemTotal = (id) => {
        setInvoiceItems(prevItems =>
            prevItems.map(item =>
                item.id === id
                    ? { ...item, total: item.sms_qty * item.unit_price }
                    : item
            )
        );
    };

    const addItemToList = () => {
        if (!currentItem.description || !currentItem.sms_qty || !currentItem.unit_price) {
            showAlert("Please fill all item fields", "warning");
            return;
        }

        const qty = parseFloat(currentItem.sms_qty);
        const price = parseFloat(currentItem.unit_price);
        const total = qty * price;

        const newItem = {
            id: Date.now(),
            description: currentItem.description,
            sms_qty: qty,
            unit_price: price,
            total: total,
            start_time: currentItem.start_time || "",
            end_time: currentItem.end_time || ""
        };

        setInvoiceItems([...invoiceItems, newItem]);
        setCurrentItem({
            description: "",
            sms_qty: "",
            unit_price: "",
            start_time: "",
            end_time: "",
            start_time_init: null,
            end_time_init: null,
        });
    };

    const removeItem = (id) => {
        setInvoiceItems(invoiceItems.filter((item) => item.id !== id));
    };
    
    // Calculate VAT amount (returns NUMBER, not formatted string)
    const calculateVatAmount = () => {
        const subtotal = calculateSubtotal();
        return (subtotal * formData.vat) / 100;
    };
    
    function formatBDT(number) {
        return number.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    
    // Calculate grand total (returns NUMBER, not formatted string)
    const calculateGrandTotal = () => {
        const subtotal = calculateSubtotal();
        const vatAmount = calculateVatAmount();
        return Math.round(subtotal + vatAmount);
    };

    // Calculate subtotal (returns NUMBER, not formatted string)
    const calculateSubtotal = () => {
        return invoiceItems.reduce((sum, item) => sum + item.total, 0);
    };

    // Helper function to convert number to words
    const numberToWords = (number) => {
        const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
        const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
        const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
        
        if (number === 0) return 'Zero Only';
        if (number < 10) return ones[number] + ' Only';
        if (number < 20) return teens[number - 10] + ' Only';
        if (number < 100) return tens[Math.floor(number / 10)] + (number % 10 !== 0 ? ' ' + ones[number % 10] : '') + ' Only';
        
        return 'Amount in words'; // Simplified for demo
    };

    // FIXED: Updated to match backend structure and correct endpoint
    const handleCreateInvoice = async (e) => {
        e.preventDefault();

        if (!formData.client_id) {
            showSweetAlert("Please select a client", "warning");
            return;
        }

        if (invoiceItems.length === 0) {
            showSweetAlert("Please add at least one invoice item", "warning");
            return;
        }

        if (paymentDetails.length === 0) {
            showSweetAlert("Please add at least one payment method", "warning");
            return;
        }
        // if (formData.vat > 0 && !formData.mushak_file_path) {
        //     showSweetAlert("Please upload Mushak file when VAT is applicable", "warning");
        //     return;
        // }

        setLoading(true);
        setIsSubmitting(true);

        const subtotal = calculateSubtotal();
        const vatAmount = calculateVatAmount();
        const total = calculateGrandTotal();

        // UPDATED: Prepare payment details according to backend structure
        const wintext_inv_pmnt_instr_dtl = paymentDetails.map(pm => {
            if (pm.payment_method_type_id == 1) { // Bank
                return {
                    payment_method_type_id: parseInt(pm.payment_method_type_id),
                    payment_account_id: parseInt(pm.bank_id),
                    receiver_name: pm.receiver_name,
                    pmnt_rcv_bank: pm.pmnt_rcv_bank,
                    pmnt_receive_acc: pm.pmnt_receive_acc,
                    pmnt_rcv_branch: pm.pmnt_rcv_branch,
                    pmnt_rcv_rn: pm.pmnt_rcv_rn,
                    mfs_type_id: null,
                    note: pm.note || '',
                    txn_charge: 0,
                    txn_charge_text: '',
                    merchant_type: 'Corporate'
                };
            } else if (pm.payment_method_type_id == 2) { // MFS
                return {
                    payment_method_type_id: parseInt(pm.payment_method_type_id),
                    payment_account_id: parseInt(pm.mfs_account_id),
                    receiver_name: pm.receiver_name_mfs,
                    pmnt_rcv_bank: null,
                    pmnt_receive_acc: pm.receiver_account_name,
                    pmnt_rcv_branch: null,
                    pmnt_rcv_rn: null,
                    mfs_type_id: parseInt(pm.mfs_type_id),
                    note: pm.note || '',
                    txn_charge: parseFloat(pm.txn_charge) || 0,
                    txn_charge_text: pm.txn_charge_text || '',
                    merchant_type: 'Personal'
                };
            }
            return null;
        }).filter(Boolean);

        const payload = {
            // Basic invoice fields
            client_id: formData.client_id,
            invoice_number: formData.invoice_number,
            billing_date: formData.billing_date,
            prepared_by: formData.prepared_by,
            received_by: formData.received_by,
            note: formData.note,
            
            // Client information
            kam: formData.kam || "",
            client_name: formData.client_name,
            client_address: formData.client_address,
            company_id: formData.company_id || 1,
            client_email: formData.client_email || "", // NEW
            bin: formData.bin || "", // NEW
            section: formData.section || "", // NEW
            
            // Additional fields
            billing_attention: formData.billing_attention || "",
            billing_attention_phone: formData.billing_attention_phone || "",
            amount_in_words: formData.amount_in_words || numberToWords(total),
            payment_instructions: formData.payment_instructions || "",
            
            // Financial fields
            subtotal: subtotal,
            vat: vatAmount,
            total: total,
            
            // New required fields with default values
            billing_start_date: formData.billing_start_date,
            billing_end_date: formData.billing_end_date,
            contract_no: formData.contract_no || `CNT-${formData.invoice_number}`,
            mushak_file_path: formData.mushak_file_path || "",
            
            // Invoice items
            wintext_invoice_dtl: invoiceItems.map(item => ({
                description: item.description,
                sms_qty: item.sms_qty,
                unit_price: item.unit_price,
                total: item.total,
                start_time: item.start_time,
                end_time: item.end_time
            })),
            
            // Payment details
            wintext_inv_pmnt_instr_dtl: wintext_inv_pmnt_instr_dtl
        };

        try {
            console.log('Sending payload:', payload);

            const response = await fetch(`${import.meta.env.VITE_APP_API_BASE_URL}/wintext-invoice/create`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${localStorage.getItem("authToken")}`,
                },
                body: JSON.stringify(payload),
            });

            const data = await response.json();
            console.log('Invoice creation response:', data);

            // FIXED: Handle array response from backend
            if (Array.isArray(data) && data[2] === "success") {
                showSweetAlert("Invoice created successfully!", "success");
                setTimeout(() => {
                    window.location.href = '/admin/wintext-invoice';
                }, 1000);
            } else if (data.status === "success") {
                showSweetAlert("Invoice created successfully!", "success");
                setTimeout(() => {
                    window.location.href = '/admin/wintext-invoice';
                }, 1000);
            } else {
                const errorMessage = data.message || data[3]?.[0] || "Failed to create invoice";
                showSweetAlert(errorMessage, "error");

                if (data.errors) {
                    console.error('Validation errors:', data.errors);
                }
            }
        } catch (error) {
            console.error("Error creating invoice:", error);
            showSweetAlert("Failed to create invoice. Please try again.", "error");
        } finally {
            setLoading(false);
            setIsSubmitting(false);
        }
    };

    const handleCancel = () => {
        window.location.href = '/admin/wintext-invoice';
    };

    const showAlert = (message, variant) => {
        setAlertMessage(message);
        setAlertVariant(variant);
        setTimeout(() => setAlertMessage(''), 3000);
    };

    // Helper to get payment method type name
    const getPaymentMethodTypeName = (typeId) => {
        const type = paymentMethodTypes.find(t => t.id == typeId);
        return type ? type.payment_method_type : 'Unknown';
    };

    // Helper to get MFS type name
    const getMfsTypeName = (mfsId) => {
        const mfs = mfsTypes.find(m => m.id == mfsId);
        return mfs ? mfs.mfs_name : 'Unknown';
    };

    // UPDATED: Helper to get bank (payment account) name
    const getBankName = (bankId) => {
        const bank = banks.find(b => b.id == bankId);
        return bank ? `${bank.pmnt_rcv_bank?.bank_name || 'Unknown Bank'} - ${bank.receiver_name}` : 'Unknown Bank';
    };

    const containerStyle = sidebarVisible
        ? { padding: '16px', backgroundColor: '#F5F5F5', overflowX: 'hidden', minHeight: '100vh', marginLeft: '193px' }
        : { padding: '16px', backgroundColor: '#F5F5F5', overflowX: 'hidden', minHeight: '100vh' };

    return (
        <div style={containerStyle}>
            {/* Header with Breadcrumb */}
            <div className='mt-5' style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '7px' }}>
                <h1 style={{ margin: 0, fontSize: '20px', fontWeight: '600' }}>Create New Invoice</h1>
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
                        onClick={() => window.location.href = '/admin/invoices'}
                        onMouseEnter={(e) => e.target.style.color = 'blue'}
                        onMouseLeave={(e) => e.target.style.color = '#555'}
                    >
                        Invoices
                    </span>
                    <span style={{ margin: '0 8px' }}>/</span>
                    <span>Create</span>
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

            {/* Main Form Card */}
            <div style={{
                backgroundColor: 'white',
                borderRadius: '8px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                padding: '16px',
                marginBottom: '16px'
            }}>
                <form onSubmit={handleCreateInvoice}>

                    {/* ROW 1: Invoice No + Billing Date + Start + End */}
                    <div style={{ 
                        display: 'grid', 
                        gridTemplateColumns: 'repeat(4, 1fr)', 
                        gap: '8px', 
                        marginBottom: '12px' 
                    }}>

                        {/* Invoice Number */}
                        <div>
                            <label style={{ marginBottom: '4px', fontSize: '13px', fontWeight: '500', color: '#333' }}>
                                Invoice Number <span style={{ color: 'red' }}>*</span>
                            </label>
                            <input
                                type="text"
                                value={formData.invoice_number}
                                onChange={(e) => handleInputChange('invoice_number', e.target.value)}
                                required
                                placeholder="Invoice number will be auto-generated"
                                style={{
                                    width: '100%',
                                    padding: '6px 10px',
                                    border: '1px solid #ccc',
                                    borderRadius: '4px',
                                    fontSize: '13px',
                                }}
                            />
                        </div>

                        {/* Billing Date */}
                        <div style={{ display: 'flex', flexDirection: 'column', position: 'relative' }}>
                            <label style={{ marginBottom: '4px', fontSize: '13px', fontWeight: '500', color: '#333' }}>
                                Billing Date
                            </label>
                            <input
                                type="text"
                                readOnly
                                value={formatDisplayDate(formData.billing_date)}
                                placeholder="dd-mm-yyyy"
                                onClick={() => document.getElementById('billingDateReal').showPicker()}
                                style={{
                                    padding: '6px 10px',
                                    border: '1px solid #ccc',
                                    borderRadius: '4px',
                                    fontSize: '13px',
                                    backgroundColor: '#fff',
                                    cursor: 'pointer',
                                }}
                            />
                            <input
                                id="billingDateReal"
                                type="date"
                                value={formData.billing_date}
                                onChange={(e) => handleInputChange('billing_date', e.target.value)}
                                style={{ position: 'absolute', opacity: 0, pointerEvents: 'none' }}
                            />
                        </div>

                        {/* Billing Start Date */}
                        <div style={{ display: 'flex', flexDirection: 'column', position: 'relative' }}>
                            <label style={{ marginBottom: '4px', fontSize: '13px', fontWeight: '500', color: '#333' }}>
                                Billing Start Date <span style={{ color: 'red' }}>*</span>
                            </label>
                            <input
                                type="text"
                                readOnly
                                value={formatDisplayDate(formData.billing_start_date)}
                                placeholder="dd-mm-yyyy"
                                onClick={() => document.getElementById('billingStartDateReal').showPicker()}
                                style={{
                                    padding: '6px 10px',
                                    border: '1px solid #ccc',
                                    borderRadius: '4px',
                                    fontSize: '13px',
                                    backgroundColor: '#fff',
                                    cursor: 'pointer',
                                }}
                            />
                            <input
                                id="billingStartDateReal"
                                type="date"
                                value={formData.billing_start_date}
                                onChange={(e) => handleInputChange('billing_start_date', e.target.value)}
                                style={{ position: 'absolute', opacity: 0, pointerEvents: 'none' }}
                            />
                        </div>

                        {/* Billing End Date */}
                        <div style={{ display: 'flex', flexDirection: 'column', position: 'relative' }}>
                            <label style={{ marginBottom: '4px', fontSize: '13px', fontWeight: '500', color: '#333' }}>
                                Billing End Date <span style={{ color: 'red' }}>*</span>
                            </label>
                            <input
                                type="text"
                                readOnly
                                value={formatDisplayDate(formData.billing_end_date)}
                                placeholder="dd-mm-yyyy"
                                onClick={() => document.getElementById('billingEndDateReal').showPicker()}
                                style={{
                                    padding: '6px 10px',
                                    border: '1px solid #ccc',
                                    borderRadius: '4px',
                                    fontSize: '13px',
                                    backgroundColor: '#fff',
                                    cursor: 'pointer',
                                }}
                            />
                            <input
                                id="billingEndDateReal"
                                type="date"
                                value={formData.billing_end_date}
                                onChange={(e) => handleInputChange('billing_end_date', e.target.value)}
                                style={{ position: 'absolute', opacity: 0, pointerEvents: 'none' }}
                            />
                        </div>
                    </div>

   {/* Client Details Section */}
<div
    style={{
        marginBottom: '16px',
        padding: '12px',
        backgroundColor: '#f8f9fa',
        borderRadius: '4px',
    }}
>
    <h6
        style={{
            marginBottom: '12px',
            fontSize: '14px',
            fontWeight: '600',
            color: '#495057',
        }}
    >
        Client Details
    </h6>

    {/* Row 1: Client Select + Client Name + Client Email */}
    <div
        style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 1fr',
            gap: '8px',
            marginBottom: '8px',
        }}
    >
        {/* Client Dropdown */}
        <div>
            <label
                style={{
                    display: 'block',
                    marginBottom: '4px',
                    fontSize: '13px',
                    fontWeight: '500',
                    color: '#333',
                }}
            >
                Client <span style={{ color: 'red' }}>*</span>
            </label>
            <Select
                value={
                    formData.client_id
                        ? {
                            value: formData.client_id,
                            label: clients.find((c) => c.client_id === formData.client_id)
                                ? `${clients.find((c) => c.client_id === formData.client_id).client_name} (${formData.client_id})`
                                : 'Select a Client',
                        }
                        : null
                }
                onChange={(selectedOption) => {
                    if (selectedOption) {
                        const selectedClient = clients.find(
                            (c) => c.client_id === selectedOption.value
                        );
                        if (selectedClient) {
                            setFormData(prev => ({
                                ...prev,
                                client_id: selectedClient.client_id,
                                client_name: selectedClient.client_name || "",
                                client_address: selectedClient.client_address || "",
                                kam: selectedClient.kam || "",
                                company_id: selectedClient.company_id || "",
                                client_email: selectedClient.client_email || "" // NEW: Auto-populate
                            }));
                        }
                    } else {
                        setFormData(prev => ({
                            ...prev,
                            client_id: "",
                            client_name: "",
                            client_address: "",
                            kam: "",
                            company_id: "",
                            client_email: "" // NEW: Reset on clear
                        }));
                    }
                }}
                options={clients.map((c) => ({
                    value: c.client_id,
                    label: `${c.client_name} (${c.client_id})`,
                }))}
                isDisabled={fetchingClients}
                isLoading={fetchingClients}
                isClearable
                placeholder={
                    fetchingClients ? 'Loading clients...' : 'Select a Client'
                }
                styles={{
                    control: (base, state) => ({
                        ...base,
                        padding: '0px',
                        border: '1px solid #ccc',
                        borderRadius: '4px',
                        fontSize: '13px',
                        backgroundColor: '#fff',
                        cursor: 'pointer',
                        minHeight: '32px',
                        boxShadow: state.isFocused ? '0 0 0 1px #007bff' : 'none',
                        borderColor: state.isFocused ? '#007bff' : '#ccc',
                        '&:hover': {
                            borderColor: state.isFocused ? '#007bff' : '#999',
                        },
                    }),
                    menu: (base) => ({
                        ...base,
                        fontSize: '13px',
                        zIndex: 9999,
                    }),
                }}
            />
        </div>

        {/* Client Name */}
        <div>
            <label
                style={{
                    display: 'block',
                    marginBottom: '4px',
                    fontSize: '13px',
                    fontWeight: '500',
                    color: '#333',
                }}
            >
                Client Name
            </label>
            <input
                type="text"
                value={formData.client_name}
                onChange={(e) => handleInputChange('client_name', e.target.value)}
                disabled={!formData.client_id}
                placeholder="Select client to auto-fill"
                style={{
                    width: '100%',
                    padding: '4px 8px',
                    border: '1px solid #ccc',
                    borderRadius: '4px',
                    fontSize: '13px',
                    backgroundColor: formData.client_id ? 'white' : '#f8f9fa',
                    color: formData.client_id ? '#333' : '#6c757d',
                }}
            />
        </div>

        {/* Client Email */}
        <div>
            <label
                style={{
                    display: 'block',
                    marginBottom: '4px',
                    fontSize: '13px',
                    fontWeight: '500',
                    color: '#333',
                }}
            >
                Client Email
            </label>
            <input
                type="email"
                value={formData.client_email}
                onChange={(e) => handleInputChange('client_email', e.target.value)}
                disabled={!formData.client_id}
                placeholder="Select client to auto-fill email"
                style={{
                    width: '100%',
                    padding: '4px 8px',
                    border: '1px solid #ccc',
                    borderRadius: '4px',
                    fontSize: '13px',
                    backgroundColor: formData.client_id ? 'white' : '#f8f9fa',
                    color: formData.client_id ? '#333' : '#6c757d',
                }}
            />
        </div>
    </div>

    {/* Row 2: Client Address + KAM + BIN */}
    <div
        style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 1fr',
            gap: '8px',
            marginBottom: '8px',
        }}
    >
        <div>
            <label
                style={{
                    display: 'block',
                    marginBottom: '4px',
                    fontSize: '13px',
                    fontWeight: '500',
                    color: '#333',
                }}
            >
                Client Address
            </label>
            <input
                type="text"
                value={formData.client_address}
                onChange={(e) =>
                    handleInputChange('client_address', e.target.value)
                }
                disabled={!formData.client_id}
                placeholder="Select client to auto-fill address"
                style={{
                    width: '100%',
                    padding: '4px 8px',
                    border: '1px solid #ccc',
                    borderRadius: '4px',
                    fontSize: '13px',
                    backgroundColor: formData.client_id ? 'white' : '#f8f9fa',
                    color: formData.client_id ? '#333' : '#6c757d',
                }}
            />
        </div>

        <div>
            <label
                style={{
                    display: 'block',
                    marginBottom: '4px',
                    fontSize: '13px',
                    fontWeight: '500',
                    color: '#333',
                }}
            >
                KAM (Key Account Manager)
            </label>
            <input
                type="text"
                value={formData.kam}
                onChange={(e) => handleInputChange('kam', e.target.value)}
                disabled={!formData.client_id}
                placeholder="Select client to auto-fill"
                style={{
                    width: '100%',
                    padding: '4px 8px',
                    border: '1px solid #ccc',
                    borderRadius: '4px',
                    fontSize: '13px',
                    backgroundColor: formData.client_id ? 'white' : '#f8f9fa',
                    color: formData.client_id ? '#333' : '#6c757d',
                }}
            />
        </div>

        <div>
            <label
                style={{
                    display: 'block',
                    marginBottom: '4px',
                    fontSize: '13px',
                    fontWeight: '500',
                    color: '#333',
                }}
            >
                BIN
            </label>
            <input
                type="text"
                value={formData.bin}
                onChange={(e) => handleInputChange('bin', e.target.value)}
                placeholder="Enter BIN"
                style={{
                    width: '100%',
                    padding: '4px 8px',
                    border: '1px solid #ccc',
                    borderRadius: '4px',
                    fontSize: '13px',
                }}
            />
        </div>
    </div>

    {/* Row 3: Section (Single Column) */}
    <div
        style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 1fr',
            gap: '8px',
        }}
    >
        <div>
            <label
                style={{
                    display: 'block',
                    marginBottom: '4px',
                    fontSize: '13px',
                    fontWeight: '500',
                    color: '#333',
                }}
            >
                Section/Dept
            </label>
            <input
                type="text"
                value={formData.section}
                onChange={(e) => handleInputChange('section', e.target.value)}
                placeholder="Enter Section"
                style={{
                    width: '100%',
                    padding: '4px 8px',
                    border: '1px solid #ccc',
                    borderRadius: '4px',
                    fontSize: '13px',
                }}
            />
        </div>
    </div>
</div>

                    {/* ROW 2: Prepared, Received, Note, Contract */}
                    <div style={{ 
                        display: 'grid', 
                        gridTemplateColumns: 'repeat(4, 1fr)', 
                        gap: '8px', 
                        marginBottom: '12px' 
                    }}>
                        <div>
                            <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px', fontWeight: '500' }}>
                                Prepared By
                            </label>
                            <input
                                type="text"
                                value={formData.prepared_by}
                                onChange={(e) => handleInputChange('prepared_by', e.target.value)}
                                placeholder="Enter name"
                                style={{
                                    width: '100%',
                                    padding: '6px 10px',
                                    border: '1px solid #ccc',
                                    borderRadius: '4px',
                                    fontSize: '13px',
                                }}
                            />
                        </div>

                        <div>
                            <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px', fontWeight: '500' }}>
                                Received By
                            </label>
                            <input
                                type="text"
                                value={formData.received_by}
                                onChange={(e) => handleInputChange('received_by', e.target.value)}
                                placeholder="Enter name"
                                style={{
                                    width: '100%',
                                    padding: '6px 10px',
                                    border: '1px solid #ccc',
                                    borderRadius: '4px',
                                    fontSize: '13px',
                                }}
                            />
                        </div>

                        <div>
                            <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px', fontWeight: '500' }}>
                                Note
                            </label>
                            <input
                                type="text"
                                value={formData.note}
                                onChange={(e) => handleInputChange('note', e.target.value)}
                                placeholder="Enter note"
                                style={{
                                    width: '100%',
                                    padding: '6px 10px',
                                    border: '1px solid #ccc',
                                    borderRadius: '4px',
                                    fontSize: '13px',
                                }}
                            />
                        </div>

                        <div>
                            <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px', fontWeight: '500' }}>
                                Contract Number
                            </label>
                            <input
                                type="text"
                                value={formData.contract_no}
                                onChange={(e) => handleInputChange('contract_no', e.target.value)}
                                placeholder="Enter contract number"
                                style={{
                                    width: '100%',
                                    padding: '6px 10px',
                                    border: '1px solid #ccc',
                                    borderRadius: '4px',
                                    fontSize: '13px',
                                }}
                            />
                        </div>
                    </div>

                    {/* ROW: Billing Attention + Phone + Payment Instructions + VAT */}
                    <div
                        style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(4, 1fr)',
                            gap: '8px',
                            marginBottom: '12px',
                        }}
                    >
                        {/* Billing Attention */}
                        <div>
                            <label
                                style={{
                                    display: 'block',
                                    marginBottom: '4px',
                                    fontSize: '13px',
                                    fontWeight: '500',
                                    color: '#333',
                                }}
                            >
                                Billing Attention
                            </label>
                            <input
                                type="text"
                                value={formData.billing_attention}
                                onChange={(e) => handleInputChange('billing_attention', e.target.value)}
                                placeholder="Enter billing attention"
                                style={{
                                    width: '100%',
                                    padding: '6px 10px',
                                    border: '1px solid #ccc',
                                    borderRadius: '4px',
                                    fontSize: '13px',
                                }}
                            />
                        </div>

             {/* Billing Attention Phone */}
<div className="billing-input-wrapper">
  <label
    style={{
      display: 'block',
      marginBottom: '4px',
      fontSize: '13px',
      fontWeight: '500',
      color: '#333',
    }}
  >
    Billing Attention Phone
  </label>
  <input
    type="text"
    value={formData.billing_attention_phone}
    onChange={(e) =>
      handleInputChange('billing_attention_phone', e.target.value)
    }
    placeholder="Enter phone number"
    style={{
      width: '100%',
      padding: '6px 10px',
      border: '1px solid #ccc',
      borderRadius: '4px',
      fontSize: '13px',
      color: 'black', // ensures normal text is black
      backgroundColor: 'white', // match the autofill box shadow
    }}
  />

  {/* Scoped autofill style */}
  <style>{`
    .billing-input-wrapper input:-webkit-autofill,
    .billing-input-wrapper input:-webkit-autofill:hover,
    .billing-input-wrapper input:-webkit-autofill:focus,
    .billing-input-wrapper input:-webkit-autofill:active {
      -webkit-box-shadow: 0 0 0px 1000px white inset;
      -webkit-text-fill-color: black !important;
      transition: background-color 5000s ease-in-out;
    }
  `}</style>
</div>


                        {/* Payment Instructions */}
                        <div>
                            <label
                                style={{
                                    display: 'block',
                                    marginBottom: '4px',
                                    fontSize: '13px',
                                    fontWeight: '500',
                                    color: '#333',
                                }}
                            >
                                Payment Instructions
                            </label>
                            <input
                                type="text"
                                value={formData.payment_instructions}
                                onChange={(e) =>
                                    handleInputChange('payment_instructions', e.target.value)
                                }
                                placeholder="Enter payment instructions"
                                style={{
                                    width: '100%',
                                    padding: '6px 10px',
                                    border: '1px solid #ccc',
                                    borderRadius: '4px',
                                    fontSize: '13px',
                                }}
                            />
                        </div>

                   {/* VAT */}
<div>
    <label
        style={{
            display: 'block',
            marginBottom: '4px',
            fontSize: '13px',
            fontWeight: '500',
            color: '#333',
        }}
    >
        VAT (%)
    </label>
    <input
        type="number"
        step="0.01"
        value={formData.vat === 0 ? '' : formData.vat}
        onChange={(e) => {
            const value = e.target.value;
            const vatValue = value === '' ? 0 : parseFloat(value);
            handleInputChange('vat', vatValue);
            
            // Auto-remove Mushak file if VAT becomes 0 or less
            if (vatValue <= 0 && formData.mushak_file_path) {
                handleRemoveMushakFile();
            }
        }}
        placeholder="Enter VAT (e.g., 5)"
        style={{
            width: '100%',
            padding: '6px 10px',
            border: '1px solid #ccc',
            borderRadius: '4px',
            fontSize: '13px',
        }}
    />
</div>
                    </div>

                    {/* Mushak Upload BELOW full width */}
                   
                    {formData.vat > 0 && (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr', marginBottom: '12px' }}>
        <div>
            <label
                style={{
                    display: 'block',
                    marginBottom: '4px',
                    fontSize: '13px',
                    fontWeight: '500',
                    color: '#333',
                }}
            >
                Mushak File (Optional)
            </label>

            <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.png,.jpg,.jpeg"
                onChange={(e) => {
                    const file = e.target.files[0];
                    if (file) {
                        setMushakFile(file);
                        uploadMushakFile(file);
                    }
                }}
                disabled={uploadingMushak}
                style={{
                    width: '100%',
                    padding: '6px 10px',
                    border: '1px solid #ccc',
                    borderRadius: '4px',
                    fontSize: '13px',
                }}
            />

            {uploadingMushak && (
                <small style={{ color: '#007bff' }}>Uploading...</small>
            )}

            {formData.mushak_file_path && (
                <>
                    <small style={{ color: '#28a745' }}>
                        ✓ Uploaded: Mushak File Uploaded Successfully
                    </small>

                    <button
                        type="button"
                        onClick={handleRemoveMushakFile}
                        style={{
                            marginTop: '6px',
                            padding: '4px 10px',
                            fontSize: '12px',
                            backgroundColor: '#dc3545',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer'
                        }}
                    >
                        Remove File
                    </button>
                </>
            )}
        </div>
    </div>
)}

                    

                </form>
            </div>

            {/* New Payment Methods Section */}
            <div style={{
                backgroundColor: 'white',
                borderRadius: '8px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                padding: '16px',
                marginBottom: '16px'
            }}>
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '12px'
                }}>
                    <h6 style={{ margin: 0, fontSize: '14px', fontWeight: '600' }}>
                        Payment Methods <span style={{ color: 'red' }}>*</span>
                    </h6>

                    <button
                        type="button"
                        onClick={() => setShowPaymentForm(!showPaymentForm)}
                        style={{
                            padding: '6px 12px',
                            background: 'linear-gradient(45deg, #28a745, #20c997)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '12px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                        }}
                    >
                        <FaPlus size={10} />
                        Add Payment Method
                        {showPaymentForm ? <FaChevronUp size={10} /> : <FaChevronDown size={10} />}
                    </button>
                </div>

                {/* Payment Method Form */}
                {showPaymentForm && (
                    <div style={{
                        padding: '12px',
                        border: '1px solid #e9ecef',
                        borderRadius: '4px',
                        backgroundColor: '#f8f9fa',
                        marginBottom: '16px'
                    }}>

                        {/* ROW-1 (BANK or MFS SELECT) */}
                        <div style={{ 
                            display: 'grid', 
                            gridTemplateColumns: currentPaymentMethod.payment_method_type_id == 1 ? '1fr 1fr 1fr' : '1fr 1fr', 
                            gap: '10px', 
                            marginBottom: '10px' 
                        }}>
                            
                            {/* Payment Method Type */}
                            <div>
                                <label style={{ fontSize: '12px', fontWeight: '500', marginBottom: '4px', display: 'block' }}>Payment Method Type *</label>
                                <select
                                    value={currentPaymentMethod.payment_method_type_id}
                                    onChange={(e) => handlePaymentMethodTypeChange(e.target.value)}
                                    style={{
                                        width: '100%',
                                        padding: '6px 8px',
                                        border: '1px solid #ccc',
                                        borderRadius: '4px',
                                        fontSize: '13px'
                                    }}
                                >
                                    <option value="">Select Type</option>
                                    {paymentMethodTypes.map(type => (
                                        <option key={type.id} value={type.id}>{type.payment_method_type}</option>
                                    ))}
                                </select>
                            </div>

                            {/* BANK SELECT */}
                            {currentPaymentMethod.payment_method_type_id == 1 && (
                                <div>
                                    <label style={{ fontSize: '12px', fontWeight: '500', marginBottom: '4px', display: 'block' }}>Select Bank Account *</label>
                                    <select
                                        value={currentPaymentMethod.bank_id}
                                        onChange={(e) => handleBankSelect(e.target.value)}
                                        style={{
                                            width: '100%',
                                            padding: '6px 8px',
                                            border: '1px solid #ccc',
                                            borderRadius: '4px',
                                            fontSize: '13px'
                                        }}
                                    >
                                        <option value="">Select Bank Account</option>
                                        {banks.map(pa => (
                                            <option key={pa.id} value={pa.id}>
                                                {pa.pmnt_rcv_bank?.bank_name} - {pa.receiver_name} ({pa.receiver_account_number})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            {/* MFS SELECT */}
                            {currentPaymentMethod.payment_method_type_id == 2 && (
                                <div>
                                    <label style={{ fontSize: '12px', fontWeight: '500', marginBottom: '4px', display: 'block' }}>Select MFS Account *</label>
                                    <select
                                        value={currentPaymentMethod.mfs_account_id}
                                        onChange={(e) => handleMfsSelect(e.target.value)}
                                        style={{
                                            width: '100%',
                                            padding: '6px 8px',
                                            border: '1px solid #ccc',
                                            borderRadius: '4px',
                                            fontSize: '13px'
                                        }}
                                    >
                                        <option value="">Select MFS Account</option>
                                        {mfsAccounts.map(pa => (
                                            <option key={pa.id} value={pa.id}>
                                                {pa.mfs_type?.mfs_name} - {pa.receiver_name} ({pa.receiver_account_number})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            {/* BANK NAME (BANK ONLY) */}
                            {currentPaymentMethod.payment_method_type_id == 1 && currentPaymentMethod.bank_id && (
                                <div>
                                    <label style={{ fontSize: '12px', fontWeight: '500', marginBottom: '4px', display: 'block' }}>Bank Name</label>
                                    <input
                                        type="text"
                                        value={currentPaymentMethod.pmnt_rcv_bank}
                                        onChange={(e) =>
                                            setCurrentPaymentMethod(prev => ({ ...prev, pmnt_rcv_bank: e.target.value }))
                                        }
                                        style={{
                                            width: '100%',
                                            padding: '6px 8px',
                                            border: '1px solid #ccc',
                                            borderRadius: '4px',
                                            fontSize: '13px'
                                        }}
                                    />
                                </div>
                            )}

                        </div>

                        {/* ---------------- BANK DETAILS ---------------- */}
                        {currentPaymentMethod.payment_method_type_id == 1 && currentPaymentMethod.bank_id && (
                            <>
                                {/* ROW-2 (3 columns) */}
                                <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: '1fr 1fr 1fr',
                                    gap: '10px',
                                    marginBottom: '10px'
                                }}>
                                    <div>
                                        <label style={{ fontSize: '11px', fontWeight: '500', marginBottom: '3px', display: 'block' }}>Receiver Name</label>
                                        <input
                                            type="text"
                                            value={currentPaymentMethod.receiver_name}
                                            onChange={(e) => setCurrentPaymentMethod(prev => ({ ...prev, receiver_name: e.target.value }))}
                                            style={{
                                                width: '100%',
                                                padding: '5px 7px',
                                                border: '1px solid #ccc',
                                                borderRadius: '3px',
                                                fontSize: '12px'
                                            }}
                                        />
                                    </div>

                                    <div>
                                        <label style={{ fontSize: '11px', fontWeight: '500', marginBottom: '3px', display: 'block' }}>Account Number</label>
                                        <input
                                            type="text"
                                            value={currentPaymentMethod.pmnt_receive_acc}
                                            onChange={(e) =>
                                                setCurrentPaymentMethod(prev => ({ ...prev, pmnt_receive_acc: e.target.value }))
                                            }
                                            style={{
                                                width: '100%',
                                                padding: '5px 7px',
                                                border: '1px solid #ccc',
                                                borderRadius: '3px',
                                                fontSize: '12px'
                                            }}
                                        />
                                    </div>

                                    <div>
                                        <label style={{ fontSize: '11px', fontWeight: '500', marginBottom: '3px', display: 'block' }}>Branch Name</label>
                                        <input
                                            type="text"
                                            value={currentPaymentMethod.pmnt_rcv_branch}
                                            onChange={(e) =>
                                                setCurrentPaymentMethod(prev => ({ ...prev, pmnt_rcv_branch: e.target.value }))
                                            }
                                            style={{
                                                width: '100%',
                                                padding: '5px 7px',
                                                border: '1px solid #ccc',
                                                borderRadius: '3px',
                                                fontSize: '12px'
                                            }}
                                        />
                                    </div>
                                </div>

                                {/* ROW-3 (2 columns) */}
                                <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: '1fr 2fr',
                                    gap: '10px',
                                    marginBottom: '10px'
                                }}>
                                    <div>
                                        <label style={{ fontSize: '11px', fontWeight: '500', marginBottom: '3px', display: 'block' }}>Routing Number</label>
                                        <input
                                            type="text"
                                            value={currentPaymentMethod.pmnt_rcv_rn}
                                            onChange={(e) =>
                                                setCurrentPaymentMethod(prev => ({ ...prev, pmnt_rcv_rn: e.target.value }))
                                            }
                                            style={{
                                                width: '100%',
                                                padding: '5px 7px',
                                                border: '1px solid #ccc',
                                                borderRadius: '3px',
                                                fontSize: '12px'
                                            }}
                                        />
                                    </div>

                                    <div>
                                        <label style={{ fontSize: '11px', fontWeight: '500', marginBottom: '3px', display: 'block' }}>Note (Optional)</label>
                                        <input
                                            type="text"
                                            value={currentPaymentMethod.note}
                                            onChange={(e) =>
                                                setCurrentPaymentMethod(prev => ({ ...prev, note: e.target.value }))
                                            }
                                            style={{
                                                width: '100%',
                                                padding: '5px 7px',
                                                border: '1px solid #ccc',
                                                borderRadius: '3px',
                                                fontSize: '12px'
                                            }}
                                        />
                                    </div>
                                </div>
                            </>
                        )}

                        {/* ---------------- MFS DETAILS ---------------- */}
                        {currentPaymentMethod.payment_method_type_id == 2 && currentPaymentMethod.mfs_account_id && (
                            <>
                                {/* ROW-2 (2 columns) */}
                                <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: '1fr 1fr',
                                    gap: '10px',
                                    marginBottom: '10px'
                                }}>
                                    <div>
                                        <label style={{ fontSize: '11px', fontWeight: '500', marginBottom: '3px', display: 'block' }}>MFS Type</label>
                                        <input
                                            type="text"
                                            value={mfsTypes.find(m => m.id == currentPaymentMethod.mfs_type_id)?.mfs_name || ''}
                                            readOnly
                                            style={{
                                                width: '100%',
                                                padding: '5px 7px',
                                                border: '1px solid #ccc',
                                                borderRadius: '3px',
                                                backgroundColor: '#f1f3f5',
                                                fontSize: '12px'
                                            }}
                                        />
                                    </div>

                                    <div>
                                        <label style={{ fontSize: '11px', fontWeight: '500', marginBottom: '3px', display: 'block' }}>Receiver Name</label>
                                        <input
                                            type="text"
                                            value={currentPaymentMethod.receiver_name_mfs}
                                            onChange={(e) =>
                                                setCurrentPaymentMethod(prev => ({ ...prev, receiver_name_mfs: e.target.value }))
                                            }
                                            style={{
                                                width: '100%',
                                                padding: '5px 7px',
                                                border: '1px solid #ccc',
                                                borderRadius: '3px',
                                                fontSize: '12px'
                                            }}
                                        />
                                    </div>
                                </div>

                                {/* ROW-3 (2 columns) */}
                                <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: '1fr 1fr',
                                    gap: '10px',
                                    marginBottom: '10px'
                                }}>
                                    <div>
                                        <label style={{ fontSize: '11px', fontWeight: '500', marginBottom: '3px', display: 'block' }}>Account Number</label>
                                        <input
                                            type="text"
                                            value={currentPaymentMethod.receiver_account_name}
                                            onChange={(e) =>
                                                setCurrentPaymentMethod(prev => ({ ...prev, receiver_account_name: e.target.value }))
                                            }
                                            style={{
                                                width: '100%',
                                                padding: '5px 7px',
                                                border: '1px solid #ccc',
                                                borderRadius: '3px',
                                                fontSize: '12px'
                                            }}
                                        />
                                    </div>

                                    <div>
                                        <label style={{ fontSize: '11px', fontWeight: '500', marginBottom: '3px', display: 'block' }}>Note (Optional)</label>
                                        <input
                                            type="text"
                                            value={currentPaymentMethod.note}
                                            onChange={(e) =>
                                                setCurrentPaymentMethod(prev => ({ ...prev, note: e.target.value }))
                                            }
                                            style={{
                                                width: '100%',
                                                padding: '5px 7px',
                                                border: '1px solid #ccc',
                                                borderRadius: '3px',
                                                fontSize: '12px'
                                            }}
                                        />
                                    </div>
                                </div>

                                <div style={{
    display: 'grid',
    gridTemplateColumns: '1fr 2fr',
    gap: '10px',
    marginBottom: '10px',
    padding: '10px',
    backgroundColor: '#fff3cd',
    borderRadius: '4px',
    border: '1px solid #ffc107'
}}>
    {/* Transaction Charge */}
    <div>
        <label style={{ fontSize: '11px', fontWeight: '500', marginBottom: '3px', display: 'block' }}>
            Transaction Charge (percentage)
        </label>
        <input
            type="number"
            step="0.01"
            min="0"
            value={currentPaymentMethod.txn_charge === null || currentPaymentMethod.txn_charge === '' ? '' : currentPaymentMethod.txn_charge}
            onChange={(e) => {
                const value = e.target.value;
                const chargeValue = value === '' ? null : parseFloat(value);
                
                setCurrentPaymentMethod(prev => ({
                    ...prev,
                    txn_charge: chargeValue,
                    // Auto-generate description when charge is entered
                    txn_charge_text: chargeValue ? `*** ${chargeValue}% charges applicable` : 'Charges Applicable'
                }));
            }}
            placeholder="0.00"
            style={{
                width: '100%',
                padding: '5px 7px',
                border: '1px solid #ccc',
                borderRadius: '3px',
                fontSize: '12px'
            }}
        />
    </div>

    {/* Charge Description */}
    <div>
        <label style={{ fontSize: '11px', fontWeight: '500', marginBottom: '3px', display: 'block' }}>
            Charge Description
        </label>
        <input
            type="text"
            value={currentPaymentMethod.txn_charge_text}
            onChange={(e) =>
                setCurrentPaymentMethod(prev => ({ 
                    ...prev, 
                    txn_charge_text: e.target.value 
                }))
            }
            onBlur={(e) => {
                // If user clears the field and there's a charge value, restore auto-generated text
                if (!e.target.value.trim() && currentPaymentMethod.txn_charge) {
                    setCurrentPaymentMethod(prev => ({
                        ...prev,
                        txn_charge_text: `*** ${prev.txn_charge}% charges applicable`
                    }));
                }
                // If user clears the field and no charge value, restore default text
                else if (!e.target.value.trim()) {
                    setCurrentPaymentMethod(prev => ({
                        ...prev,
                        txn_charge_text: 'Charges Applicable'
                    }));
                }
            }}
            style={{
                width: '100%',
                padding: '5px 7px',
                border: '1px solid #ccc',
                borderRadius: '3px',
                fontSize: '12px'
            }}
        />
    </div>
</div>


                            </>
                        )}

                        {/* ADD BUTTON */}
                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
                            <button
                                type="button"
                                onClick={addPaymentMethod}
                                disabled={
                                    !currentPaymentMethod.payment_method_type_id ||
                                    (currentPaymentMethod.payment_method_type_id == 1 && !currentPaymentMethod.bank_id) ||
                                    (currentPaymentMethod.payment_method_type_id == 2 && !currentPaymentMethod.mfs_account_id)
                                }
                                style={{
                                    padding: '6px 16px',
                                    background: 'linear-gradient(45deg, #007bff, #0056b3)',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                    fontSize: '12px',
                                    fontWeight: '500',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    opacity:
                                        !currentPaymentMethod.payment_method_type_id ||
                                            (currentPaymentMethod.payment_method_type_id == 1 && !currentPaymentMethod.bank_id) ||
                                            (currentPaymentMethod.payment_method_type_id == 2 && !currentPaymentMethod.mfs_account_id)
                                            ? 0.6
                                            : 1
                                }}
                            >
                                <FaPlus size={10} />
                                Add Payment Item
                            </button>
                        </div>

                    </div>
                )}

                {/* PAYMENT LIST (UPDATED LAYOUT) */}
                {paymentDetails.length > 0 && (
                    <div>
                        <h6 style={{ fontSize: '13px', fontWeight: '600', marginBottom: '10px', color: '#333' }}>
                            Added Payment Methods ({paymentDetails.length}):
                        </h6>

                        {/* 3 Cards Per Row */}
                        <div
                            style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(3, 1fr)',
                                gap: '10px'
                            }}
                        >
                            {paymentDetails.map((pm, index) => (
                                <div
                                    key={index}
                                    style={{
                                        padding: '12px',
                                        border: '1px solid #dee2e6',
                                        borderRadius: '6px',
                                        backgroundColor: '#ffffff',
                                        boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                                    }}
                                >
                                    <div
                                        style={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'flex-start'
                                        }}
                                    >
                                        {/* LEFT SIDE DETAILS */}
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontWeight: '600', fontSize: '13px', marginBottom: '4px' }}>
                                                {getPaymentMethodTypeName(pm.payment_method_type_id)}
                                            </div>

                                            {/* BANK */}
                                            {pm.payment_method_type_id == 1 && (
                                                <div style={{ fontSize: '12px', color: '#6c757d', lineHeight: '1.5' }}>
                                                    <div><strong>Bank:</strong> {pm.pmnt_rcv_bank || getBankName(pm.bank_id)}</div>
                                                    <div><strong>Account:</strong> {pm.receiver_name} - {pm.pmnt_receive_acc}</div>
                                                    {pm.pmnt_rcv_branch && <div><strong>Branch:</strong> {pm.pmnt_rcv_branch}</div>}
                                                    {pm.pmnt_rcv_rn && <div><strong>Routing:</strong> {pm.pmnt_rcv_rn}</div>}
                                                </div>
                                            )}

                                            {/* MFS */}
                                            {pm.payment_method_type_id == 2 && (
                                                <div style={{ fontSize: '12px', color: '#6c757d', lineHeight: '1.5' }}>
                                                    <div><strong>MFS:</strong> {getMfsTypeName(pm.mfs_type_id)}</div>
                                                    <div><strong>Account:</strong> {pm.receiver_name_mfs} - {pm.receiver_account_name}</div>
                                                    {pm.txn_charge > 0 && (
                                                        <div style={{ 
                                                            marginTop: '4px', 
                                                            padding: '4px 8px', 
                                                            backgroundColor: '#fff3cd', 
                                                            borderRadius: '3px',
                                                            fontSize: '11px'
                                                        }}>
                                                            <strong>Charge:</strong> ৳{pm.txn_charge.toFixed(2)}
                                                            {pm.txn_charge_text && ` - ${pm.txn_charge_text}`}
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {/* NOTE */}
                                            {pm.note && (
                                                <div
                                                    style={{
                                                        fontSize: '11px',
                                                        color: '#868e96',
                                                        marginTop: '6px',
                                                        fontStyle: 'italic',
                                                        padding: '4px 8px',
                                                        backgroundColor: '#f8f9fa',
                                                        borderRadius: '3px'
                                                    }}
                                                >
                                                    <strong>Note:</strong> {pm.note}
                                                </div>
                                            )}
                                        </div>

                                        {/* ACTION BUTTONS */}
                                        <div
                                            style={{
                                                display: 'flex',
                                                flexDirection: 'row',
                                                gap: '4px',
                                                alignItems: 'flex-start'
                                            }}
                                        >
                                            <button
                                                type="button"
                                                onClick={() => editPaymentMethod(index)}
                                                style={{
                                                    padding: '4px 6px',
                                                    background: '#17a2b8',
                                                    color: 'white',
                                                    border: 'none',
                                                    borderRadius: '3px',
                                                    cursor: 'pointer',
                                                    fontSize: '10px',
                                                    height: '26px',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center'
                                                }}
                                            >
                                                <FaEdit size={10} />
                                            </button>

                                            <button
                                                type="button"
                                                onClick={() => removePaymentMethod(index)}
                                                style={{
                                                    padding: '4px 6px',
                                                    background: '#dc3545',
                                                    color: 'white',
                                                    border: 'none',
                                                    borderRadius: '3px',
                                                    cursor: 'pointer',
                                                    fontSize: '10px',
                                                    height: '26px',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center'
                                                }}
                                            >
                                                <FaTrash size={10} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

            </div>

            {/* Invoice Items Section */}
            <div
                style={{
                    backgroundColor: 'white',
                    borderRadius: '8px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                    padding: '16px',
                    marginBottom: '16px',
                }}
            >
                <h6 style={{ marginBottom: '12px', fontSize: '14px', fontWeight: '600' }}>Invoice Items</h6>

                {/* Add Item Form */}
                <div
                    style={{ 
                        display: 'grid',
                        gridTemplateColumns: '2fr 1.2fr 1.2fr 1fr 1fr 1fr 1fr auto',
                        gap: '6px',
                        marginBottom: '12px',
                        alignItems: 'end',
                    }}
                >
                    <div>
                        <label style={{ fontSize: '13px', fontWeight: '500', color: '#333' }}>Description</label>
                        <select
                            value={currentItem.description}
                            onChange={(e) => handleDescriptionSelect(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '6px 8px',
                                border: '1px solid #ccc',
                                borderRadius: '4px',
                                fontSize: '13px',
                            }}
                        >
                            <option value="">Select Description</option>
                            {descriptionOptions.map((option) => (
                                <option key={option} value={option}>
                                    {option}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Start Time */}
                    <div>
                        <label style={{ fontSize: '13px', fontWeight: '500', color: '#333' }}>Start Time</label>
                        <DatePicker
                            selected={currentItem.start_time_init}
                            onChange={(date) => setCurrentItem((prev) => ({
                                ...prev,
                                start_time_init: date,
                                start_time: moment(date).format('YYYY-MM-DD HH:mm:ss')
                            }))}
                            dateFormat="dd-MM-yyyy HH:mm:ss"
                            showTimeSelect
                            timeFormat="HH:mm"
                            timeIntervals={15}
                            timeCaption="Time"
                            placeholderText="Start Time"
                            className="form-control"
                            style={{
                                width: '100%',
                                padding: '6px 8px',
                                border: '1px solid #ccc',
                                borderRadius: '4px',
                                fontSize: '13px',
                            }}
                        />
                    </div>

                    {/* End Time */}
                    <div>
                        <label style={{ fontSize: '13px', fontWeight: '500', color: '#333' }}>End Time</label>
                        <DatePicker
                            selected={currentItem.end_time_init}
                            onChange={(date) => setCurrentItem((prev) => ({
                                ...prev,
                                end_time_init: date,
                                end_time: moment(date).format('YYYY-MM-DD HH:mm:ss')
                            }))}
                            dateFormat="dd-MM-yyyy HH:mm:ss"
                            showTimeSelect
                            timeFormat="HH:mm"
                            timeIntervals={15}
                            timeCaption="Time"
                            placeholderText="End Time"
                            className="form-control"
                            style={{
                                width: '100%',
                                padding: '6px 8px',
                                border: '1px solid #ccc',
                                borderRadius: '4px',
                                fontSize: '13px',
                            }}
                        />
                    </div>

                    {/* SMS Qty */}
                    <div>
                        <label style={{ fontSize: '13px', fontWeight: '500', color: '#333' }}>SMS Qty</label>
                        <div style={{ position: 'relative' }}>
                            <input
                                type="number"
                                placeholder="Auto-calculated"
                                value={currentItem.sms_qty}
                                onChange={(e) => setCurrentItem({ ...currentItem, sms_qty: e.target.value })}
                                style={{
                                    width: '100%',
                                    padding: '6px 8px',
                                    border: '1px solid #ccc',
                                    borderRadius: '4px',
                                    fontSize: '13px',
                                    backgroundColor: calculatingSms ? '#f8f9fa' : 'white',
                                }}
                            />
                            {calculatingSms && (
                                <div
                                    style={{
                                        position: 'absolute',
                                        right: '8px',
                                        top: '50%',
                                        transform: 'translateY(-50%)',
                                        pointerEvents: 'none',
                                    }}
                                >
                                    <FaSpinner
                                        className="spinner"
                                        style={{
                                            fontSize: '12px',
                                            color: '#007bff',
                                            animation: 'spin 1s linear infinite',
                                        }}
                                    />
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Unit Price */}
                    <div>
                        <label style={{ fontSize: '13px', fontWeight: '500', color: '#333' }}>Unit Price</label>
                        <input
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            value={currentItem.unit_price}
                            onChange={(e) => setCurrentItem({ ...currentItem, unit_price: e.target.value })}
                            style={{
                                width: '100%',
                                padding: '6px 8px',
                                border: '1px solid #ccc',
                                borderRadius: '4px',
                                fontSize: '13px',
                            }}
                        />
                    </div>

                    {/* Total */}
                    <div>
                        <label style={{ fontSize: '13px', fontWeight: '500', color: '#333' }}>Total</label>
                        <input
                            type="text"
                            value={
                                currentItem.sms_qty && currentItem.unit_price
                                    ? (parseFloat(currentItem.sms_qty) * parseFloat(currentItem.unit_price)).toFixed(2)
                                    : '0.00'
                            }
                            disabled
                            style={{
                                width: '100%',
                                padding: '6px 8px',
                                border: '1px solid #ccc',
                                borderRadius: '4px',
                                fontSize: '13px',
                                backgroundColor: '#f8f9fa',
                            }}
                        />
                    </div>

                    {/* Add Button */}
                    <button
                        type="button"
                        onClick={addItemToList}
                        disabled={!currentItem.description || !currentItem.sms_qty || !currentItem.unit_price}
                        style={{
                            padding: '6px 12px',
                            borderRadius: '4px',
                            background:
                                !currentItem.description || !currentItem.sms_qty || !currentItem.unit_price
                                    ? '#6c757d'
                                    : 'linear-gradient(45deg, #007bff, #0056b3)',
                            color: 'white',
                            border: 'none',
                            cursor:
                                !currentItem.description || !currentItem.sms_qty || !currentItem.unit_price
                                    ? 'not-allowed'
                                    : 'pointer',
                            fontSize: '12px',
                            height: '32px',
                            opacity:
                                !currentItem.description || !currentItem.sms_qty || !currentItem.unit_price
                                    ? 0.6
                                    : 1,
                        }}
                    >
                        <FaPlus size={10} /> Add
                    </button>
                </div>

                {/* Editable Items Table */}
                {invoiceItems.length > 0 && (
                    <div style={{ overflowX: 'auto' }}>
                        <table
                            style={{
                                width: '100%',
                                borderCollapse: 'collapse',
                                fontSize: '13px',
                            }}
                        >
                            <thead>
                                <tr style={{ backgroundColor: '#f8f9fa' }}>
                                    <th style={{ padding: '6px 8px', border: '1px solid #dee2e6', textAlign: 'center' }}>#</th>
                                    <th style={{ padding: '6px 8px', border: '1px solid #dee2e6' }}>Description</th>
                                    <th style={{ padding: '6px 8px', border: '1px solid #dee2e6' }}>Start Time</th>
                                    <th style={{ padding: '6px 8px', border: '1px solid #dee2e6' }}>End Time</th>
                                    <th style={{ padding: '6px 8px', border: '1px solid #dee2e6', textAlign: 'right' }}>SMS Qty</th>
                                    <th style={{ padding: '6px 8px', border: '1px solid #dee2e6', textAlign: 'right' }}>Unit Price</th>
                                    <th style={{ padding: '6px 8px', border: '1px solid #dee2e6', textAlign: 'right' }}>Total</th>
                                    <th style={{ padding: '6px 8px', border: '1px solid #dee2e6', textAlign: 'center' }}>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {invoiceItems.map((item, index) => (
                                    <tr key={item.id}>
                                        <td style={{ padding: '6px 8px', border: '1px solid #dee2e6', textAlign: 'center' }}>{index + 1}</td>

                                        {/* Editable Description */}
                                        <td style={{ padding: '6px 8px', border: '1px solid #dee2e6' }}>
                                            <input
                                                type="text"
                                                value={item.description}
                                                onChange={(e) => handleItemEdit(item.id, 'description', e.target.value)}
                                                style={{
                                                    width: '100%',
                                                    padding: '4px 6px',
                                                    border: '1px solid #ddd',
                                                    borderRadius: '3px',
                                                    fontSize: '13px',
                                                    backgroundColor: '#fff'
                                                }}
                                            />
                                        </td>

                                        {/* Non-editable Start Time */}
                                        <td style={{ padding: '6px 8px', border: '1px solid #dee2e6', textAlign: 'center' }}>
                                            {formatDisplayDateTime(item.start_time)}
                                        </td>

                                        {/* Non-editable End Time */}
                                        <td style={{ padding: '6px 8px', border: '1px solid #dee2e6', textAlign: 'center' }}>
                                            {formatDisplayDateTime(item.end_time)}
                                        </td>

                                        {/* Editable SMS Qty */}
                                        <td style={{ padding: '6px 8px', border: '1px solid #dee2e6', textAlign: 'right' }}>
                                            <input
                                                type="number"
                                                value={item.sms_qty}
                                                onChange={(e) => handleItemEdit(item.id, 'sms_qty', e.target.value)}
                                                onBlur={() => recalculateItemTotal(item.id)}
                                                style={{
                                                    width: '100%',
                                                    padding: '4px 6px',
                                                    border: '1px solid #ddd',
                                                    borderRadius: '3px',
                                                    fontSize: '13px',
                                                    textAlign: 'right',
                                                    backgroundColor: '#fff'
                                                }}
                                            />
                                        </td>

                                        {/* Editable Unit Price */}
                                        <td style={{ padding: '6px 8px', border: '1px solid #dee2e6', textAlign: 'right' }}>
                                            <input
                                                type="number"
                                                step="0.01"
                                                value={item.unit_price}
                                                onChange={(e) => handleItemEdit(item.id, 'unit_price', e.target.value)}
                                                onBlur={() => recalculateItemTotal(item.id)}
                                                style={{
                                                    width: '100%',
                                                    padding: '4px 6px',
                                                    border: '1px solid #ddd',
                                                    borderRadius: '3px',
                                                    fontSize: '13px',
                                                    textAlign: 'right',
                                                    backgroundColor: '#fff'
                                                }}
                                            />
                                        </td>

                                        {/* Auto-calculated Total */}
                                        <td style={{ padding: '6px 8px', border: '1px solid #dee2e6', textAlign: 'right', fontWeight: 'bold' }}>
                                            {parseFloat(item.total).toFixed(2)}
                                        </td>

                                        <td style={{ padding: '6px 8px', border: '1px solid #dee2e6', textAlign: 'center' }}>
                                            <button
                                                type="button"
                                                onClick={() => removeItem(item.id)}
                                                style={{
                                                    padding: '2px 6px',
                                                    background: '#dc3545',
                                                    color: 'white',
                                                    border: 'none',
                                                    borderRadius: '3px',
                                                    cursor: 'pointer',
                                                    fontSize: '10px',
                                                }}
                                            >
                                                <FaTrash size={8} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot style={{ backgroundColor: '#f8f9fa' }}>
                                {/* Subtotal Row */}
                                <tr>
                                    <td
                                        colSpan="6"
                                        style={{
                                            padding: '6px 8px',
                                            border: '1px solid #dee2e6',
                                            textAlign: 'right',
                                            fontWeight: 'bold',
                                        }}
                                    >
                                        Subtotal:
                                    </td>
                                    <td
                                        style={{
                                            padding: '6px 8px',
                                            border: '1px solid #dee2e6',
                                            textAlign: 'right',
                                            fontWeight: 'bold',
                                        }}
                                    >
                                        {formatBDT(Number(calculateSubtotal().toFixed(2)))}
                                    </td>
                                    <td style={{ border: '1px solid #dee2e6' }}></td>
                                </tr>
                                
                                {/* VAT Row - Only show if VAT > 0 */}
                                {formData.vat > 0 && (
                                    <tr>
                                        <td colSpan="6" style={{ padding: '6px 8px', border: '1px solid #dee2e6', textAlign: 'right', fontWeight: 'bold' }}>
                                            VAT ({formData.vat}%):
                                        </td>
                                        <td
                                            style={{
                                                padding: '6px 8px',
                                                border: '1px solid #dee2e6',
                                                textAlign: 'right',
                                                fontWeight: 'bold',
                                                color: '#6c757d'
                                            }}
                                        >
                                            {formatBDT(Number(calculateVatAmount().toFixed(2)))}
                                        </td>
                                        <td style={{ border: '1px solid #dee2e6' }}></td>
                                    </tr>
                                )}
                                
                                {/* Grand Total Row */}
                                <tr>
                                    <td
                                        colSpan="6"
                                        style={{
                                            padding: '6px 8px',
                                            border: '1px solid #dee2e6',
                                            textAlign: 'right',
                                            fontWeight: 'bold',
                                            fontSize: '14px',
                                        }}
                                    >
                                        Total:
                                    </td>
                                    <td
                                        style={{
                                            padding: '6px 8px',
                                            border: '1px solid #dee2e6',
                                            textAlign: 'right',
                                            fontWeight: 'bold',
                                            fontSize: '14px',
                                            color: '#007bff',
                                        }}
                                    >
                                        {formatBDT(Number(calculateGrandTotal().toFixed(2)))}
                                    </td>
                                    <td style={{ border: '1px solid #dee2e6' }}></td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                )}
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button
                    onClick={handleCancel}
                    disabled={isSubmitting}
                    style={{
                        padding: '6px 12px',
                        border: '1px solid #d1d5db',
                        borderRadius: '4px',
                        backgroundColor: 'white',
                        cursor: isSubmitting ? 'not-allowed' : 'pointer',
                        fontSize: '13px',
                        fontWeight: '500',
                        color: '#374151',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        opacity: isSubmitting ? 0.6 : 1,
                    }}
                >
                    <FaChevronDown size={10} style={{ transform: 'rotate(90deg)' }} />
                    Cancel
                </button>

                <button
                    onClick={handleCreateInvoice}
                    disabled={isSubmitting || !formData.client_id || invoiceItems.length === 0 || paymentDetails.length === 0}
                    style={{
                        padding: '6px 12px',
                        background: 'linear-gradient(45deg, #007bff, #0056b3)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: (isSubmitting || !formData.client_id || invoiceItems.length === 0 || paymentDetails.length === 0) ? 'not-allowed' : 'pointer',
                        fontSize: '13px',
                        fontWeight: '500',
                        opacity: (isSubmitting || !formData.client_id || invoiceItems.length === 0 || paymentDetails.length === 0) ? 0.6 : 1,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                    }}
                >
                    {isSubmitting ? (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <FaSpinner className="spinner" style={{ animation: 'spin 1s linear infinite', fontSize: '12px' }} />
                            Creating...
                        </span>
                    ) : (
                        <>
                            <FaPlus size={10} />
                            Create Invoice
                        </>
                    )}
                </button>
            </div>

            <style>
                {`
                    @keyframes spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                    }
                `}
            </style>
        </div>
    );
};

export default InvoiceCreatePage;
import React, { useState, useEffect, useMemo } from 'react';
import { Eye, Download, RefreshCw } from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Cell,
} from 'recharts';

const Homepage = ({ sidebarVisible = false }) => {
  const [merchantSalesData, setMerchantSalesData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({
    totalTickets: 0,
    totalRevenue: 0,
    totalMerchants: 0,
    averageTicketValue: 0,
    totalAllotment: 0,
    totalAvailable: 0
  });

  const [chartView, setChartView] = useState('weekly');
  const [weeklyChartData, setWeeklyChartData] = useState([]);
  const [monthlyChartData, setMonthlyChartData] = useState([]);
  const [yearlyChartData, setYearlyChartData] = useState([]);
  const [selectedMerchant, setSelectedMerchant] = useState('all');
  const [allTransactions, setAllTransactions] = useState([]);
  
  const DASHBOARD_BASE_URL = `${import.meta.env.VITE_APP_API_BASE_URL}/api/v1/dashboard`;
  const DETAILS_BASE_URL = `${import.meta.env.VITE_APP_API_BASE_URL}/api/v1/details-report`;

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

  // Fetch dashboard data (merchant wise sales)
  const fetchDashboardData = async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch merchant sales summary
      const dashboardResponse = await fetch(`${DASHBOARD_BASE_URL}/dashboard-data`, {
        method: 'GET',
        headers: getAuthHeaders(),
        credentials: 'include',
      });

      if (handleUnauthorized(dashboardResponse)) return;

      const dashboardResult = await dashboardResponse.json();

      if (dashboardResult.status === 'success' && dashboardResult.data) {
        const merchantData = dashboardResult.data.merchant_wise_sale || [];
        setMerchantSalesData(merchantData);
        calculateStats(merchantData);
      }

      // Fetch detailed transaction data for charts
      const detailsResponse = await fetch(`${DETAILS_BASE_URL}/list-paginate`, {
        method: 'GET',
        headers: getAuthHeaders(),
        credentials: 'include',
      });

      if (handleUnauthorized(detailsResponse)) return;

      const detailsResult = await detailsResponse.json();

      if (detailsResult.status === 'success' && detailsResult.data) {
        const transactionData = detailsResult.data.data || [];
        setAllTransactions(transactionData);
        generateChartDataFromTransactions(transactionData, 'all');
      } else {
        setError('Failed to fetch transaction details');
      }
    } catch (err) {
      setError('Error connecting to server');
      console.error('Fetch dashboard data error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Calculate statistics from merchant data
  const calculateStats = (merchantData) => {
    const totalTickets = merchantData.reduce((sum, item) => sum + (item.total_sales || 0), 0);
    const totalRevenue = merchantData.reduce((sum, item) => sum + (item.total_sales_amount || 0), 0);
    const totalAllotment = merchantData.reduce((sum, item) => sum + (item.ticket_allotment || 0), 0);
    const totalAvailable = merchantData.reduce((sum, item) => sum + (item.ticket_available || 0), 0);
    const totalMerchants = merchantData.length;
    const averageTicketValue = totalTickets > 0 ? totalRevenue / totalTickets : 0;

    setStats({
      totalTickets,
      totalRevenue: totalRevenue.toFixed(2),
      totalMerchants,
      averageTicketValue: averageTicketValue.toFixed(2),
      totalAllotment,
      totalAvailable
    });
  };

  // Generate chart data from actual transactions
  const generateChartDataFromTransactions = (transactions, merchantFilter = 'all') => {
    if (!transactions || transactions.length === 0) {
      setWeeklyChartData([]);
      setMonthlyChartData([]);
      setYearlyChartData([]);
      return;
    }

    // Filter transactions by merchant if not "all"
    let filteredTransactions = transactions;
    if (merchantFilter !== 'all') {
      filteredTransactions = transactions.filter(t => t.merchant_id === parseInt(merchantFilter));
    }

    // WEEKLY: Group by last 7 days
    const weeklyMap = {};
    const today = new Date();
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    
    // Initialize last 7 days
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD
      const dayName = dayNames[date.getDay()];
      weeklyMap[dateStr] = {
        name: dayName,
        date: dateStr,
        revenue: 0,
        tickets: 0
      };
    }

    // Aggregate filtered transactions by date
    filteredTransactions.forEach(transaction => {
      if (transaction.purchase_time) {
        // Extract date from "2025-11-26 18:48:46"
        const purchaseDate = transaction.purchase_time.split(' ')[0]; // Get "2025-11-26"
        
        if (weeklyMap[purchaseDate]) {
          weeklyMap[purchaseDate].revenue += parseFloat(transaction.amount || 0);
          weeklyMap[purchaseDate].tickets += 1;
        }
      }
    });

    // Convert to array and format
    const weeklyData = Object.values(weeklyMap).map(day => ({
      name: day.name,
      revenue: Number(day.revenue.toFixed(2)),
      tickets: day.tickets
    }));

    setWeeklyChartData(weeklyData);

    // MONTHLY: Group by month (last 12 months)
    const monthlyMap = {};
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    // Initialize last 12 months
    for (let i = 11; i >= 0; i--) {
      const date = new Date(today);
      date.setMonth(date.getMonth() - i);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      monthlyMap[monthKey] = {
        name: monthNames[date.getMonth()],
        revenue: 0,
        tickets: 0
      };
    }

    // Aggregate filtered transactions by month
    filteredTransactions.forEach(transaction => {
      if (transaction.purchase_time) {
        const purchaseDate = transaction.purchase_time.split(' ')[0]; // "2025-11-26"
        const monthKey = purchaseDate.substring(0, 7); // "2025-11"
        
        if (monthlyMap[monthKey]) {
          monthlyMap[monthKey].revenue += parseFloat(transaction.amount || 0);
          monthlyMap[monthKey].tickets += 1;
        }
      }
    });

    // YEARLY: Group by year (last 3 years)
    const yearlyMap = {};
    const currentYear = today.getFullYear();
    
    // Initialize last 3 years
    for (let i = 2; i >= 0; i--) {
      const year = currentYear - i;
      yearlyMap[year] = {
        name: year.toString(),
        revenue: 0,
        tickets: 0
      };
    }

    // Aggregate filtered transactions by year
    filteredTransactions.forEach(transaction => {
      if (transaction.purchase_time) {
        const purchaseYear = parseInt(transaction.purchase_time.substring(0, 4));
        
        if (yearlyMap[purchaseYear]) {
          yearlyMap[purchaseYear].revenue += parseFloat(transaction.amount || 0);
          yearlyMap[purchaseYear].tickets += 1;
        }
      }
    });

    // Store monthly and yearly data
    const monthlyData = Object.values(monthlyMap).map(month => ({
      name: month.name,
      revenue: Number(month.revenue.toFixed(2)),
      tickets: month.tickets
    }));

    const yearlyData = Object.values(yearlyMap).map(year => ({
      name: year.name,
      revenue: Number(year.revenue.toFixed(2)),
      tickets: year.tickets
    }));

    // Store in state
    setMonthlyChartData(monthlyData);
    setYearlyChartData(yearlyData);
  };

  // Handle merchant filter change
  const handleMerchantFilterChange = (merchantId) => {
    setSelectedMerchant(merchantId);
    generateChartDataFromTransactions(allTransactions, merchantId);
  };

  // Format helpers
  const formatCurrency = (amount) => {
    const n = parseFloat(amount) || 0;
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(n) + ' ৳';
  };

  const formatNumber = (number) => {
    return new Intl.NumberFormat('en-US').format(number || 0);
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const containerStyle = sidebarVisible
    ? { padding: '16px', backgroundColor: '#F5F5F5', overflowX: 'hidden', minHeight: '100vh', marginLeft: '193px' }
    : { padding: '16px', backgroundColor: '#F5F5F5', overflowX: 'hidden', minHeight: '100vh' };

  // Decide dataset based on chartView
  const chartData = chartView === 'weekly' ? weeklyChartData : chartView === 'yearly' ? yearlyChartData : monthlyChartData;

  // Y axis max for nicer scale
  const yMax = useMemo(() => {
    if (!chartData || chartData.length === 0) return 80000;
    const max = Math.max(...chartData.map(d => d.revenue), 100);
    if (max <= 1000) return Math.ceil(max / 100) * 100;
    if (max <= 10000) return Math.ceil(max / 1000) * 1000;
    return Math.ceil(max / 10000) * 10000;
  }, [chartData]);

  // Bar colors
  const BAR_PRIMARY = '#3b82f6';
  const BAR_SECOND = '#1d4ed8';

  const showAlert = (message, variant) => {
    console.log(`${variant}: ${message}`);
  };

  return (
    <div style={containerStyle}>
      {/* Header with Breadcrumb */}
      <div className='mt-5' style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '7px' }}>
        <h1 style={{ margin: 0, fontSize: '20px', fontWeight: '600' }}>Lottery Dashboard</h1>
        <div style={{ fontSize: '13px', color: '#555' }}>
          <span style={{ color: '#007bff', cursor: 'pointer' }} onClick={() => window.location.href = '/admin/home'}>
            Home
          </span>
          <span style={{ margin: '0 8px' }}>/</span>
          <span>Lottery Dashboard</span>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div style={{
          padding: '12px 20px',
          marginBottom: '11px',
          borderRadius: '4px',
          backgroundColor: '#f8d7da',
          color: '#721c24',
          border: '1px solid #f5c6cb',
        }}>
          <p style={{ margin: 0, fontWeight: '500' }}>{error}</p>
        </div>
      )}

      {/* Statistics Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: '12px',
        marginBottom: '16px'
      }}>
        <div style={{
          backgroundColor: 'white',
          borderRadius: '8px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          padding: '16px'
        }}>
          <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>Total Tickets Sold</div>
          <div style={{ fontSize: '24px', fontWeight: '600', color: '#333' }}>{formatNumber(stats.totalTickets)}</div>
          <div style={{ fontSize: '11px', color: '#666', marginTop: '4px' }}>Out of {formatNumber(stats.totalAllotment)} allotted</div>
        </div>

        <div style={{
          backgroundColor: 'white',
          borderRadius: '8px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          padding: '16px'
        }}>
          <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>Total Revenue</div>
          <div style={{ fontSize: '24px', fontWeight: '600', color: '#333' }}>{formatCurrency(stats.totalRevenue)}</div>
          <div style={{ fontSize: '11px', color: '#666', marginTop: '4px' }}>From all ticket sales</div>
        </div>

        <div style={{
          backgroundColor: 'white',
          borderRadius: '8px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          padding: '16px'
        }}>
          <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>Active Merchants</div>
          <div style={{ fontSize: '24px', fontWeight: '600', color: '#333' }}>{stats.totalMerchants}</div>
          <div style={{ fontSize: '11px', color: '#666', marginTop: '4px' }}>Selling tickets</div>
        </div>

        <div style={{
          backgroundColor: 'white',
          borderRadius: '8px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          padding: '16px'
        }}>
          <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>Available Tickets</div>
          <div style={{ fontSize: '24px', fontWeight: '600', color: '#333' }}>{formatNumber(stats.totalAvailable)}</div>
          <div style={{ fontSize: '11px', color: '#666', marginTop: '4px' }}>Ready to sell</div>
        </div>
      </div>

      {/* Chart Card */}
      <div style={{
        backgroundColor: 'white',
        borderRadius: '8px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        padding: '20px',
        marginBottom: '16px'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px'
        }}>
          <h2 style={{ margin: 0, fontSize: '16px', fontWeight: '600' }}>Revenue Overview</h2>
          {/* <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
       
            <select
              value={selectedMerchant}
              onChange={(e) => handleMerchantFilterChange(e.target.value)}
              style={{
                padding: '6px 12px',
                borderRadius: '4px',
                border: '1px solid #ddd',
                fontSize: '11px',
                backgroundColor: 'white',
                color: '#666',
                cursor: 'pointer',
                minWidth: '120px'
              }}
            >
              <option value="all">All Merchants</option>
              {merchantSalesData.map(merchant => (
                <option key={merchant.merchant_id} value={merchant.merchant_id}>
                  {merchant.merchant_name}
                </option>
              ))}
            </select>


            <button
              onClick={() => setChartView('weekly')}
              style={{
                padding: '6px 12px',
                borderRadius: '4px',
                background: chartView === 'weekly' ? '#333' : 'white',
                color: chartView === 'weekly' ? 'white' : '#666',
                border: '1px solid #ddd',
                cursor: 'pointer',
                fontSize: '11px'
              }}
            >
              Weekly
            </button>
            <button
              onClick={() => setChartView('monthly')}
              style={{
                padding: '6px 12px',
                borderRadius: '4px',
                background: chartView === 'monthly' ? '#333' : 'white',
                color: chartView === 'monthly' ? 'white' : '#666',
                border: '1px solid #ddd',
                cursor: 'pointer',
                fontSize: '11px'
              }}
            >
              Monthly
            </button>
            <button
              onClick={() => setChartView('yearly')}
              style={{
                padding: '6px 12px',
                borderRadius: '4px',
                background: chartView === 'yearly' ? '#333' : 'white',
                color: chartView === 'yearly' ? 'white' : '#666',
                border: '1px solid #ddd',
                cursor: 'pointer',
                fontSize: '11px'
              }}
            >
              Yearly
            </button>
          </div> */}
        </div>

        {/* Recharts Area */}
        <div style={{ height: 320 }}>
          {(!chartData || chartData.length === 0) ? (
            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666' }}>
              {/* No data available for this view */}
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 20, right: 20, left: 0, bottom: 20 }}>
                <defs>
                  <linearGradient id="gradBlue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={BAR_PRIMARY} stopOpacity="1" />
                    <stop offset="100%" stopColor={BAR_SECOND} stopOpacity="1" />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fill: '#666', fontSize: 12 }} />
                <YAxis tickFormatter={(value) => {
                  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
                  if (value >= 1000) return `${(value / 1000).toFixed(0)}k`;
                  return value;
                }} tick={{ fill: '#666', fontSize: 12 }} domain={[0, yMax]} />
                <Tooltip formatter={(value) => [formatCurrency(value), 'Revenue']} cursor={{ fill: 'rgba(0,0,0,0.03)' }} />
                <Legend verticalAlign="top" wrapperStyle={{ top: -10, left: 0 }} />
                <Bar dataKey="revenue" name="Revenue" animationDuration={800} animationEasing="ease-out">
                  {chartData.map((entry, idx) => (
                    <Cell
                      key={`cell-${idx}`}
                      fill="url(#gradBlue)"
                      style={{ transition: 'opacity 0.2s ease' }}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Main Card Container (Merchant Summary) */}
      {/* <div style={{
        backgroundColor: 'white',
        borderRadius: '8px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        padding: '10px'
      }}> */}
        {/* Header Section */}
        {/* <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '10px',
          padding: '8px 0'
        }}> */}
          {/* <div>
            <h2 style={{ margin: 0, fontSize: '16px', fontWeight: '600' }}>Merchant Sales Summary</h2>
            <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#666' }}>
              Overview of ticket sales by merchant ({merchantSalesData.length} merchants)
            </p>
          </div> */}
          {/* <button
            onClick={fetchDashboardData}
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
            <RefreshCw size={14} />
            Refresh
          </button> */}
        {/* </div> */}

        {/* Table */}
        {/* <table className="table table-bordered table-hover table-sm align-middle" style={{ fontSize: '12px', lineHeight: '1.8' }}>
          <thead className="table-light">
            <tr>
              <th className="py-2 px-3 fw-semibold text-center" style={{ width: "60px" }}>S/N</th>
              <th className="py-2 px-3 fw-semibold text-start">Merchant Name</th>
              <th className="py-2 px-3 fw-semibold text-center">Allotment</th>
              <th className="py-2 px-3 fw-semibold text-center">Available</th>
              <th className="py-2 px-3 fw-semibold text-center">Tickets Sold</th>
              <th className="py-2 px-3 fw-semibold text-end">Total Revenue</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="6" className="text-center py-4">
                  <div style={{ display: 'inline-block' }}>
                    <div style={{
                      width: '32px',
                      height: '32px',
                      border: '3px solid #f3f3f3',
                      borderTop: '3px solid #007bff',
                      borderRadius: '50%',
                      animation: 'spin 1s linear infinite'
                    }}></div>
                  </div>
                  <p style={{ marginTop: '8px', color: '#666' }}>Loading sales data...</p>
                </td>
              </tr>
            ) : merchantSalesData.length === 0 ? (
              <tr>
                <td colSpan="6" className="text-center text-muted py-4">
                  No sales data available
                </td>
              </tr>
            ) : (
              merchantSalesData.map((merchant, index) => (
                <tr key={index} className="align-middle">
                  <td className="py-1 px-3 text-center">{index + 1}</td>
                  <td className="py-1 px-3">
                    <div style={{ fontWeight: '500', color: '#333' }}>
                      {merchant.merchant_name || 'N/A'}
                    </div>
                  </td>
                  <td className="py-1 px-3 text-center">
                    <span style={{
                      padding: '4px 12px',
                      borderRadius: '4px',
                      fontSize: '11px',
                      backgroundColor: '#f3f4f6',
                      color: '#374151',
                      fontWeight: '600'
                    }}>
                      {formatNumber(merchant.ticket_allotment || 0)}
                    </span>
                  </td>
                  <td className="py-1 px-3 text-center">
                    <span style={{
                      padding: '4px 12px',
                      borderRadius: '4px',
                      fontSize: '11px',
                      backgroundColor: '#fef3c7',
                      color: '#92400e',
                      fontWeight: '600'
                    }}>
                      {formatNumber(merchant.ticket_available || 0)}
                    </span>
                  </td>
                  <td className="py-1 px-3 text-center">
                    <span style={{
                      padding: '4px 12px',
                      borderRadius: '4px',
                      fontSize: '11px',
                      backgroundColor: '#e3f2fd',
                      color: '#1976d2',
                      fontWeight: '600'
                    }}>
                      {formatNumber(merchant.total_sales || 0)}
                    </span>
                  </td>
                  <td className="py-1 px-3 text-end" style={{ fontWeight: '600', color: '#28a745' }}>
                    {formatCurrency(merchant.total_sales_amount || 0)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table> */}

        {/* Table Info */}
        {/* {!loading && merchantSalesData.length > 0 && (
          <div style={{ marginTop: '5px', fontSize: '12px', color: '#666' }}>
            Showing {merchantSalesData.length} merchant summaries • Total: {formatNumber(stats.totalTickets)} tickets • Revenue: {formatCurrency(stats.totalRevenue)}
          </div>
        )} */}
      {/* </div> */}

      {/* Footer */}
      <div style={{ marginTop: '16px', textAlign: 'center' }}>
        <p style={{ fontSize: '12px', color: '#666', margin: 0 }}>
          Bangladesh Thalassaemia Samity & Hospital Lottery System
        </p>
      </div>

      {/* Keyframes for loading spinner */}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default Homepage;
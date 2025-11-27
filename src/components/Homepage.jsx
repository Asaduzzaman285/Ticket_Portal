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
  const [summaryData, setSummaryData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({
    totalTickets: 0,
    totalRevenue: 0,
    totalMerchants: 0,
    averageTicketValue: 0,
  });

  const [monthlyData, setMonthlyData] = useState([]);
  const [chartView, setChartView] = useState('monthly'); // 'monthly', 'weekly', 'yearly'
  const [filterOptions, setFilterOptions] = useState({
    merchant_list: []
  });
  
  const BASE_URL = `${import.meta.env.VITE_APP_API_BASE_URL}/api/v1/summary-report`;
  const AUTH_TOKEN = localStorage.getItem('authToken');

  // Get auth headers
  const getAuthHeaders = () => {
    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
    
    if (AUTH_TOKEN) {
      headers['Authorization'] = `Bearer ${AUTH_TOKEN}`;
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

  // Fetch filter options
  const fetchFilterOptions = async () => {
    try {
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
    }
  };

  // Fetch summary data
  const fetchSummaryData = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${BASE_URL}/list-paginate`, {
        method: 'GET',
        headers: getAuthHeaders(),
        credentials: 'include',
      });

      if (handleUnauthorized(response)) return;

      const result = await response.json();

      if (result.status === 'success' && result.data) {
        const summaryData = result.data.data || [];
        setSummaryData(summaryData);
        calculateStats(summaryData);
        calculateMonthlyData(summaryData);
      } else {
        setError('Failed to fetch summary data');
      }
    } catch (err) {
      setError('Error connecting to server');
      console.error('Fetch summary data error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Calculate statistics
  const calculateStats = (summaryData) => {
    const totalTickets = summaryData.reduce((sum, item) => sum + (item.ticket_qty || 0), 0);
    const totalRevenue = summaryData.reduce((sum, item) => sum + (item.total_amount || 0), 0);
    const totalMerchants = summaryData.length;
    const averageTicketValue = totalTickets > 0 ? totalRevenue / totalTickets : 0;

    setStats({
      totalTickets,
      totalRevenue: totalRevenue.toFixed(2),
      totalMerchants,
      averageTicketValue: averageTicketValue.toFixed(2),
    });
  };

  // Monthly aggregation (mock data for chart - you can replace with actual time-based data)
  const calculateMonthlyData = (summaryData) => {
    const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    
    // Create mock monthly data based on total revenue distribution
    const monthlyRevenue = monthNames.map((month, index) => {
      // Distribute revenue across months (you can replace this with actual time-based data from your API)
      const baseRevenue = stats.totalRevenue / 12;
      const variation = (Math.random() - 0.5) * baseRevenue * 0.3; // ±15% variation
      return {
        month,
        revenue: Math.max(0, (baseRevenue + variation)),
        tickets: Math.floor((stats.totalTickets / 12) * (0.8 + Math.random() * 0.4)),
      };
    });

    setMonthlyData(monthlyRevenue);
  };

  // Format helpers
  const formatCurrency = (amount) => {
    const n = parseFloat(amount) || 0;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'BDT',
      minimumFractionDigits: 2,
    })
      .format(n)
      .replace('BDT', '৳');
  };

  const formatNumber = (number) => {
    return new Intl.NumberFormat('en-US').format(number);
  };

  useEffect(() => {
    fetchFilterOptions();
    fetchSummaryData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const containerStyle = sidebarVisible
    ? { padding: '16px', backgroundColor: '#F5F5F5', overflowX: 'hidden', minHeight: '100vh', marginLeft: '193px' }
    : { padding: '16px', backgroundColor: '#F5F5F5', overflowX: 'hidden', minHeight: '100vh' };

  // -----------------------------
  // Prepare chart data for views
  // -----------------------------

  // Weekly data: mock data for last 7 days
  const weeklyData = useMemo(() => {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    return days.map(day => ({
      name: day,
      revenue: Math.random() * 20000 + 5000, // Random revenue between 5k-25k
      tickets: Math.floor(Math.random() * 50 + 10), // Random tickets between 10-60
    }));
  }, []);

  // Yearly data: mock data for last 3 years
  const yearlyData = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return [currentYear - 2, currentYear - 1, currentYear].map(year => ({
      name: year.toString(),
      revenue: (Math.random() * 100000 + 50000) * (year === currentYear ? 1.2 : 1), // Current year 20% higher
      tickets: Math.floor(Math.random() * 1000 + 500),
    }));
  }, []);

  // Monthly data prepared for the current year
  const monthlyChartPrepared = useMemo(() => {
    return monthlyData.map(m => ({ 
      name: m.month, 
      revenue: Number((m.revenue || 0).toFixed(2)),
      tickets: m.tickets 
    }));
  }, [monthlyData]);

  // Decide dataset based on chartView
  const chartData = chartView === 'weekly' ? weeklyData : chartView === 'yearly' ? yearlyData : monthlyChartPrepared;

  // Y axis max for nicer scale
  const yMax = useMemo(() => {
    if (!chartData || chartData.length === 0) return 80000;
    const max = Math.max(...chartData.map(d => d.revenue), 80000);
    if (max <= 1000) return Math.ceil(max / 100) * 100;
    if (max <= 10000) return Math.ceil(max / 1000) * 1000;
    return Math.ceil(max / 10000) * 10000;
  }, [chartData]);

  // Tooltip formatter
  const tooltipFormatter = (value) => {
    return formatCurrency(value);
  };

  // Bar colors
  const BAR_PRIMARY = '#3b82f6'; // blue
  const BAR_SECOND = '#1d4ed8'; // darker blue

  const showAlert = (message, variant) => {
    // You can implement toast notifications here
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
          <div style={{ fontSize: '11px', color: '#666', marginTop: '4px' }}>Across all merchants</div>
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
          <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>Avg. Ticket Value</div>
          <div style={{ fontSize: '24px', fontWeight: '600', color: '#333' }}>{formatCurrency(stats.averageTicketValue)}</div>
          <div style={{ fontSize: '11px', color: '#666', marginTop: '4px' }}>Per ticket average</div>
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
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
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
          </div>
        </div>

        {/* Recharts Area */}
        <div style={{ height: 320 }}>
          {(!chartData || chartData.length === 0) ? (
            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666' }}>
              No data available for this view
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
      <div style={{
        backgroundColor: 'white',
        borderRadius: '8px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        padding: '10px'
      }}>
        {/* Header Section */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '10px',
          padding: '8px 0'
        }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '16px', fontWeight: '600' }}>Merchant Sales Summary</h2>
            <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#666' }}>
              Overview of ticket sales by merchant ({summaryData.length} merchants)
            </p>
          </div>
          <button
            onClick={fetchSummaryData}
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
          </button>
        </div>

        {/* Table */}
        <table className="table table-bordered table-hover table-sm align-middle" style={{ fontSize: '12px', lineHeight: '1.8' }}>
          <thead className="table-light">
            <tr>
              <th className="py-2 px-3 fw-semibold text-center" style={{ width: "60px" }}>S/N</th>
              <th className="py-2 px-3 fw-semibold text-start">Merchant Name</th>
              <th className="py-2 px-3 fw-semibold text-center">Tickets Sold</th>
              <th className="py-2 px-3 fw-semibold text-end">Total Revenue</th>
              <th className="py-2 px-3 fw-semibold text-center" style={{ width: "100px" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="5" className="text-center py-4">
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
            ) : summaryData.length === 0 ? (
              <tr>
                <td colSpan="5" className="text-center text-muted py-4">
                  No sales data available
                </td>
              </tr>
            ) : (
              summaryData.map((merchant, index) => (
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
                      backgroundColor: '#e3f2fd',
                      color: '#1976d2',
                      fontWeight: '600'
                    }}>
                      {formatNumber(merchant.ticket_qty || 0)}
                    </span>
                  </td>
                  <td className="py-1 px-3 text-end" style={{ fontWeight: '600', color: '#28a745' }}>
                    {formatCurrency(merchant.total_amount || 0)}
                  </td>
                  <td className="py-1 px-3 text-center">
                    <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                      <button
                        style={{
                          padding: '4px 8px',
                          border: '1px solid #d1d5db',
                          borderRadius: '4px',
                          background: 'white',
                          color: '#333',
                          cursor: 'pointer',
                          fontSize: '11px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                        title="View Details"
                        onClick={() => {
                          // Navigate to detailed report for this merchant
                          window.location.href = `/admin/detailed-report?merchant=${merchant.merchant_name}`;
                        }}
                      >
                        <Eye size={12} />
                        View
                      </button>
                      <button
                        style={{
                          padding: '4px 8px',
                          border: '1px solid #d1d5db',
                          borderRadius: '4px',
                          background: 'white',
                          color: '#333',
                          cursor: 'pointer',
                          fontSize: '11px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                        title="Download Report"
                        onClick={async () => {
                          try {
                            const response = await fetch(`${BASE_URL}/report-download?merchant_name=${encodeURIComponent(merchant.merchant_name)}`, {
                              method: 'POST',
                              headers: getAuthHeaders(),
                              credentials: 'include',
                            });

                            if (response.ok) {
                              const blob = await response.blob();
                              const url = window.URL.createObjectURL(blob);
                              const a = document.createElement('a');
                              a.href = url;
                              a.download = `merchant-${merchant.merchant_name}-report.xlsx`;
                              a.click();
                              window.URL.revokeObjectURL(url);
                            }
                          } catch (error) {
                            console.error('Download error:', error);
                          }
                        }}
                      >
                        <Download size={12} />
                        Download
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Table Info */}
        {!loading && summaryData.length > 0 && (
          <div style={{ marginTop: '5px', fontSize: '12px', color: '#666' }}>
            Showing {summaryData.length} merchant summaries • Total: {formatNumber(stats.totalTickets)} tickets • Revenue: {formatCurrency(stats.totalRevenue)}
          </div>
        )}
      </div>

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
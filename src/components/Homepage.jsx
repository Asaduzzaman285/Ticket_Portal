import React, { useState, useEffect, useMemo } from 'react';
import { RefreshCw } from 'lucide-react';
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
  PieChart,
  Pie
} from 'recharts';

const Homepage = ({ sidebarVisible = false }) => {
  const [merchantSalesData, setMerchantSalesData] = useState([]);
  const [hourlySalesData, setHourlySalesData] = useState([]);
  const [statusWiseSales, setStatusWiseSales] = useState([]);
  const [ticketQtyWiseSales, setTicketQtyWiseSales] = useState([]);
  const [districtWiseSales, setDistrictWiseSales] = useState([]);
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

  const DASHBOARD_BASE_URL = `${import.meta.env.VITE_APP_API_BASE_URL}/api/v1/dashboard`;

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

  const handleUnauthorized = (response) => {
    if (response.status === 401) {
      alert('Session expired. Please login again.');
      setTimeout(() => {
        window.location.href = '/login';
      }, 2000);
      return true;
    }
    return false;
  };

  const fetchDashboardData = async () => {
    setLoading(true);
    setError(null);
    try {
      const dashboardResponse = await fetch(`${DASHBOARD_BASE_URL}/dashboard-data`, {
        method: 'GET',
        headers: getAuthHeaders(),
        credentials: 'include',
      });

      if (handleUnauthorized(dashboardResponse)) return;

      const dashboardResult = await dashboardResponse.json();

      if (dashboardResult.status === 'success' && dashboardResult.data) {
        const data = dashboardResult.data;
        
        if (data.merchant_wise_sale) {
          setMerchantSalesData(data.merchant_wise_sale);
          calculateStats(data.merchant_wise_sale);
        }
        
        if (data.today_hourly_sales) {
          setHourlySalesData(data.today_hourly_sales);
        }
        
        if (data.status_wise_sales) {
          setStatusWiseSales(data.status_wise_sales);
        }
        
        if (data.ticket_qty_wise_sales) {
          setTicketQtyWiseSales(data.ticket_qty_wise_sales);
        }
        
        if (data.district_wise_sales) {
          setDistrictWiseSales(data.district_wise_sales);
        }
      }
    } catch (err) {
      setError('Error connecting to server');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (merchantData) => {
    const totalTickets = merchantData.reduce((sum, item) => sum + (item.total_sales || 0), 0);
    const totalRevenue = merchantData.reduce((sum, item) => sum + (item.total_sales_amount || 0), 0);
    const totalAllotment = merchantData.reduce((sum, item) => sum + (item.ticket_allotment || 0), 0);
    const totalAvailable = merchantData.reduce((sum, item) => sum + (item.ticket_available || 0), 0);

    setStats({
      totalTickets,
      totalRevenue: totalRevenue.toFixed(2),
      totalMerchants: merchantData.length,
      averageTicketValue: totalTickets > 0 ? (totalRevenue / totalTickets).toFixed(2) : 0,
      totalAllotment,
      totalAvailable
    });
  };

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

  // Prepare chart data from merchant sales data
  const chartData = useMemo(() => {
    return merchantSalesData.map(merchant => ({
      name: merchant.merchant_name,
      revenue: merchant.total_sales_amount || 0
    }));
  }, [merchantSalesData]);

  const yMax = useMemo(() => {
    if (!chartData || chartData.length === 0) return 500;
    const max = Math.max(...chartData.map(d => d.revenue), 100);
    return Math.ceil(max / 100) * 110;
  }, [chartData]);

  // Prepare hourly sales data
  const hourlyChartData = useMemo(() => {
    return hourlySalesData.map(hour => ({
      time: hour.hour_range || `${hour.hour_24}:00`,
      tickets: hour.total_ticket_sold || 0
    }));
  }, [hourlySalesData]);

  const hourlyYMax = useMemo(() => {
    if (!hourlyChartData || hourlyChartData.length === 0) return 10;
    const max = Math.max(...hourlyChartData.map(d => d.tickets), 5);
    return Math.ceil(max * 1.2);
  }, [hourlyChartData]);

  // Prepare status wise sales data for pie chart
  const statusChartData = useMemo(() => {
    return statusWiseSales.map(item => ({
      name: item.status.charAt(0).toUpperCase() + item.status.slice(1),
      value: item.total_tickets || 0,
      amount: item.total_amount || 0
    }));
  }, [statusWiseSales]);

  // Prepare ticket quantity wise sales data
  const ticketQtyChartData = useMemo(() => {
    return ticketQtyWiseSales.filter(item => item.total_purchases > 0).map(item => ({
      qty: `${item.ticket_qty} Ticket${item.ticket_qty > 1 ? 's' : ''}`,
      purchases: item.total_purchases || 0
    }));
  }, [ticketQtyWiseSales]);

  // Prepare district wise sales data for pie chart (top 10)
  const districtChartData = useMemo(() => {
    return districtWiseSales.map(item => ({
      name: item.customer_district.charAt(0).toUpperCase() + item.customer_district.slice(1),
      value: item.total_tickets || 0,
      amount: item.total_amount || 0
    }));
  }, [districtWiseSales]);

  // Color gradient for hourly bars
  const getBarColor = (index) => {
    const colors = [
      '#1e40af', '#2563eb', '#3b82f6', '#60a5fa', '#93c5fd',
      '#0891b2', '#06b6d4', '#22d3ee', '#67e8f9', '#a5f3fc',
      '#059669', '#10b981', '#34d399', '#6ee7b7', '#a7f3d0',
      '#ca8a04', '#eab308', '#facc15', '#fde047', '#fef08a',
      '#dc2626', '#ef4444', '#f87171', '#fca5a5'
    ];
    return colors[index % colors.length];
  };

  // Status colors
  const STATUS_COLORS = {
    'Requested': '#fbbf24',
    'Success': '#10b981',
    'Fail': '#ef4444',
    'Cancel': '#6b7280'
  };

  // District colors - vibrant palette
  const DISTRICT_COLORS = [
    '#3b82f6', '#8b5cf6', '#ec4899', '#f43f5e', '#f97316',
    '#eab308', '#22c55e', '#14b8a6', '#06b6d4', '#6366f1'
  ];

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div style={{
          backgroundColor: 'white',
          padding: '8px 12px',
          border: '1px solid #e5e7eb',
          borderRadius: '6px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
        }}>
          <p style={{ margin: 0, fontWeight: '600', fontSize: '13px' }}>{payload[0].name}</p>
          <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#666' }}>
            Tickets: {payload[0].value}
          </p>
          {payload[0].payload.amount !== undefined && (
            <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#666' }}>
              Amount: {formatCurrency(payload[0].payload.amount)}
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
    if (percent < 0.05) return null;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * Math.PI / 180);
    const y = cy + radius * Math.sin(-midAngle * Math.PI / 180);

    return (
      <text 
        x={x} 
        y={y} 
        fill="white" 
        textAnchor={x > cx ? 'start' : 'end'} 
        dominantBaseline="central"
        fontSize="12px"
        fontWeight="600"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
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
        <div style={{ backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', padding: '16px' }}>
          <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>Total Tickets Sold</div>
          <div style={{ fontSize: '24px', fontWeight: '600', color: '#333' }}>{formatNumber(stats.totalTickets)}</div>
          <div style={{ fontSize: '11px', color: '#666', marginTop: '4px' }}>Out of {formatNumber(stats.totalAllotment)} allotted</div>
        </div>

        <div style={{ backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', padding: '16px' }}>
          <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>Total Sale</div>
          <div style={{ fontSize: '24px', fontWeight: '600', color: '#333' }}>{formatCurrency(stats.totalRevenue)}</div>
          <div style={{ fontSize: '11px', color: '#666', marginTop: '4px' }}>From all ticket sales</div>
        </div>

        <div style={{ backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', padding: '16px' }}>
          <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>Active Merchants</div>
          <div style={{ fontSize: '24px', fontWeight: '600', color: '#333' }}>{stats.totalMerchants}</div>
          <div style={{ fontSize: '11px', color: '#666', marginTop: '4px' }}>Selling tickets</div>
        </div>

        <div style={{ backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', padding: '16px' }}>
          <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>Available Tickets</div>
          <div style={{ fontSize: '24px', fontWeight: '600', color: '#333' }}>{formatNumber(stats.totalAvailable)}</div>
          <div style={{ fontSize: '11px', color: '#666', marginTop: '4px' }}>Ready to sell</div>
        </div>
      </div>

      {/* Row 1: Merchant Sales Bar Chart - Full Width */}
      <div style={{
        backgroundColor: 'white',
        borderRadius: '8px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        padding: '20px',
        marginBottom: '16px'
      }}>
        <h2 style={{ margin: '0 0 20px 0', fontSize: '16px', fontWeight: '600' }}>Merchant Sales Overview</h2>
        <div style={{ height: 320 }}>
          {loading ? (
            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666' }}>
              Loading...
            </div>
          ) : (!chartData || chartData.length === 0) ? (
            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666' }}>
              No data available
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 20, right: 20, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fill: '#666', fontSize: 12 }} />
                <YAxis 
                  tickFormatter={(value) => {
                    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
                    if (value >= 1000) return `${(value / 1000).toFixed(0)}k`;
                    return value;
                  }} 
                  tick={{ fill: '#666', fontSize: 12 }} 
                  domain={[0, yMax]} 
                />
                <Tooltip formatter={(value) => formatCurrency(value)} cursor={{ fill: 'rgba(0,0,0,0.03)' }} />
                <Legend verticalAlign="top" wrapperStyle={{ top: -10, left: 0 }} />
                <Bar dataKey="revenue" name="Total Sales Amount" fill="#3b82f6" radius={[6, 6, 0, 0]} animationDuration={800} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Row 2: Hourly Sales Bar Chart - Full Width */}
      <div style={{
        backgroundColor: 'white',
        borderRadius: '8px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        padding: '20px',
        marginBottom: '16px'
      }}>
        <h2 style={{ margin: '0 0 20px 0', fontSize: '16px', fontWeight: '600' }}>Today's Hourly Ticket Sales</h2>
        <div style={{ height: 320 }}>
          {loading ? (
            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666' }}>
              Loading...
            </div>
          ) : (!hourlyChartData || hourlyChartData.length === 0) ? (
            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666' }}>
              No hourly data available
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={hourlyChartData} margin={{ top: 20, right: 20, left: 0, bottom: 60 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis 
                  dataKey="time" 
                  tick={{ fill: '#666', fontSize: 10 }} 
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis 
                  tick={{ fill: '#666', fontSize: 12 }} 
                  domain={[0, hourlyYMax]}
                  allowDecimals={false}
                />
                <Tooltip 
                  formatter={(value) => [`${value} tickets`, 'Tickets Sold']}
                  cursor={{ fill: 'rgba(0,0,0,0.03)' }} 
                />
                <Bar dataKey="tickets" name="Tickets Sold" radius={[6, 6, 0, 0]} animationDuration={800}>
                  {hourlyChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={getBarColor(index)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Row 3: Two Pie Charts Side by Side */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))',
        gap: '16px',
        marginBottom: '16px'
      }}>
        {/* Status Wise Sales Pie Chart */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '8px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          padding: '20px'
        }}>
          <h2 style={{ margin: '0 0 20px 0', fontSize: '16px', fontWeight: '600' }}>Sales by Status</h2>
          <div style={{ height: 320 }}>
            {loading ? (
              <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666' }}>
                Loading...
              </div>
            ) : (!statusChartData || statusChartData.length === 0) ? (
              <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666' }}>
                No status data available
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusChartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={renderCustomizedLabel}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                    animationDuration={800}
                  >
                    {statusChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={STATUS_COLORS[entry.name] || '#94a3b8'} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend 
                    verticalAlign="bottom" 
                    height={36}
                    formatter={(value, entry) => `${value} (${entry.payload.value} tickets)`}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* District Wise Sales Pie Chart */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '8px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          padding: '20px'
        }}>
          <h2 style={{ margin: '0 0 20px 0', fontSize: '16px', fontWeight: '600' }}>Sales by District</h2>
          <div style={{ height: 320 }}>
            {loading ? (
              <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666' }}>
                Loading...
              </div>
            ) : (!districtChartData || districtChartData.length === 0) ? (
              <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666' }}>
                No district data available
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={districtChartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={renderCustomizedLabel}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                    animationDuration={800}
                  >
                    {districtChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={DISTRICT_COLORS[index % DISTRICT_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend 
                    verticalAlign="bottom" 
                    height={36}
                    formatter={(value, entry) => `${value} (${entry.payload.value})`}
                    wrapperStyle={{ fontSize: '11px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Row 4: Ticket Quantity Bar Chart - Full Width */}
      <div style={{
        backgroundColor: 'white',
        borderRadius: '8px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        padding: '20px',
        marginBottom: '16px'
      }}>
        <h2 style={{ margin: '0 0 20px 0', fontSize: '16px', fontWeight: '600' }}>Purchases by Ticket Quantity</h2>
        <div style={{ height: 320 }}>
          {loading ? (
            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666' }}>
              Loading...
            </div>
          ) : (!ticketQtyChartData || ticketQtyChartData.length === 0) ? (
            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666' }}>
              No quantity data available
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={ticketQtyChartData} margin={{ top: 20, right: 20, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis dataKey="qty" tick={{ fill: '#666', fontSize: 12 }} />
                <YAxis tick={{ fill: '#666', fontSize: 12 }} allowDecimals={false} />
                <Tooltip cursor={{ fill: 'rgba(0,0,0,0.03)' }} />
                <Legend verticalAlign="top" wrapperStyle={{ top: -10, left: 0 }} />
                <Bar dataKey="purchases" name="Total Purchases" fill="#8b5cf6" radius={[6, 6, 0, 0]} animationDuration={800} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Footer */}
      <div style={{ marginTop: '16px', textAlign: 'center' }}>
        <p style={{ fontSize: '12px', color: '#666', margin: 0 }}>
          Bangladesh Thalassaemia Samity & Hospital Lottery System
        </p>
      </div>

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
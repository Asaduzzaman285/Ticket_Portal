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

      if (dashboardResult.status === 'success' && dashboardResult.data?.merchant_wise_sale) {
        const merchantData = dashboardResult.data.merchant_wise_sale;
        setMerchantSalesData(merchantData);
        calculateStats(merchantData);
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

      {/* Merchant Sales Chart - Simplified */}
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
          <h2 style={{ margin: 0, fontSize: '16px', fontWeight: '600' }}>Merchant Sales Overview</h2>
        </div>

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
                <Bar dataKey="revenue" name="Total Sales Amount" fill="#3b82f6" animationDuration={800} />
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
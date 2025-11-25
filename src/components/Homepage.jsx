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
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({
    totalInvoices: 0,
    totalRevenue: 0,
    pendingInvoices: 0,
    activeClients: 0,
  });

  const [monthlyData, setMonthlyData] = useState([]);
  const [chartView, setChartView] = useState('monthly'); // 'monthly', 'weekly', 'yearly'
  const API_URL = import.meta.env.VITE_APP_API_BASE_URL || 'http://localhost:8001/api';
  const AUTH_TOKEN = localStorage.getItem('authToken');

  // Fetch invoices
  const fetchInvoices = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_URL}/wintext-invoice/list-paginate?page=1`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${AUTH_TOKEN}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
      });

      const result = await response.json();

      if (result.status === 'success' && result.data) {
        const invoiceData = result.data.data || [];
        setInvoices(invoiceData);
        calculateStats(invoiceData);
      } else {
        setError('Failed to fetch invoices');
      }
    } catch (err) {
      setError('Error connecting to server');
      console.error('Fetch invoices error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Calculate statistics
  const calculateStats = (invoiceData) => {
    const total = invoiceData.length;
    const revenue = invoiceData.reduce((sum, inv) => sum + parseFloat(inv.total || 0), 0);
    const uniqueClients = new Set(invoiceData.map((inv) => inv.client_id)).size;

    setStats({
      totalInvoices: total,
      totalRevenue: revenue.toFixed(2),
      pendingInvoices: Math.floor(total * 0.15),
      activeClients: uniqueClients,
    });

    calculateMonthlyData(invoiceData);
  };

  // Monthly aggregation (for current year)
  const calculateMonthlyData = (invoiceData) => {
    const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const currentYear = new Date().getFullYear();

    const monthlyRevenue = monthNames.map((month) => ({
      month,
      revenue: 0,
      count: 0,
    }));

    invoiceData.forEach((inv) => {
      const date = new Date(inv.billing_date || inv.created_at);
      if (!isNaN(date.getTime()) && date.getFullYear() === currentYear) {
        const monthIndex = date.getMonth();
        monthlyRevenue[monthIndex].revenue += parseFloat(inv.total || 0) || 0;
        monthlyRevenue[monthIndex].count += 1;
      }
    });

    setMonthlyData(monthlyRevenue);
  };

  // Format helpers
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const formatCurrency = (amount) => {
    // ensure number
    const n = parseFloat(amount) || 0;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'BDT',
      minimumFractionDigits: 2,
    })
      .format(n)
      .replace('BDT', '৳');
  };

  const getRecentInvoices = () => {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    return invoices.filter((inv) => {
      const invDate = new Date(inv.created_at || inv.billing_date);
      if (isNaN(invDate.getTime())) return false;
      return invDate >= sevenDaysAgo;
    });
  };

  useEffect(() => {
    fetchInvoices();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const recentInvoices = getRecentInvoices();

  const containerStyle = sidebarVisible
    ? { padding: '16px', backgroundColor: '#F5F5F5', overflowX: 'hidden', minHeight: '100vh', marginLeft: '193px' }
    : { padding: '16px', backgroundColor: '#F5F5F5', overflowX: 'hidden', minHeight: '100vh' };

  // -----------------------------
  // Prepare chart data for views
  // -----------------------------

  // Weekly data: last 7 days grouped by short day name (Mon, Tue, ...)
  const weeklyData = useMemo(() => {
    const days = [];
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(today.getDate() - i);
      days.push({
        key: d.toISOString().slice(0,10), // YYYY-MM-DD
        label: d.toLocaleDateString('en-US', { weekday: 'short' }), // Mon, Tue...
        dateObj: d,
        revenue: 0,
      });
    }

    invoices.forEach((inv) => {
      const invDate = new Date(inv.created_at || inv.billing_date);
      if (isNaN(invDate.getTime())) return;
      const key = invDate.toISOString().slice(0,10);
      const dayEntry = days.find(d => d.key === key);
      if (dayEntry) {
        dayEntry.revenue += parseFloat(inv.total || 0) || 0;
      }
    });

    // Map to recharts friendly format
    return days.map(d => ({ name: d.label, revenue: Number(d.revenue.toFixed(2)), dateKey: d.key }));
  }, [invoices]);

  // Yearly data: group by year (last 3 years or all found)
  const yearlyData = useMemo(() => {
    const byYear = {};
    invoices.forEach((inv) => {
      const invDate = new Date(inv.created_at || inv.billing_date);
      if (isNaN(invDate.getTime())) return;
      const y = invDate.getFullYear();
      byYear[y] = (byYear[y] || 0) + (parseFloat(inv.total || 0) || 0);
    });

    const years = Object.keys(byYear).map(y => parseInt(y, 10)).sort((a,b) => a-b);
    // keep up to last 5 years for visibility
    const selectedYears = years.slice(Math.max(0, years.length - 5));
    return selectedYears.map(y => ({ name: String(y), revenue: Number((byYear[y] || 0).toFixed(2)) }));
  }, [invoices]);

  // Monthly data already prepared for the current year as month/revenue. Map to recharts structure:
  const monthlyChartPrepared = useMemo(() => {
    return monthlyData.map(m => ({ name: m.month, revenue: Number((m.revenue || 0).toFixed(2)) }));
  }, [monthlyData]);

  // Decide dataset based on chartView
  const chartData = chartView === 'weekly' ? weeklyData : chartView === 'yearly' ? yearlyData : monthlyChartPrepared;

  // Y axis max for nicer scale
  const yMax = useMemo(() => {
    if (!chartData || chartData.length === 0) return 80000;
    const max = Math.max(...chartData.map(d => d.revenue), 80000);
    // Round up to nearest 1000/10000 depending on size
    if (max <= 1000) return Math.ceil(max / 100) * 100;
    if (max <= 10000) return Math.ceil(max / 1000) * 1000;
    return Math.ceil(max / 10000) * 10000;
  }, [chartData]);

  // Tooltip formatter
  const tooltipFormatter = (value) => {
    return formatCurrency(value);
  };

  // Bar colors / pattern - keep green gradient style (we'll set a single main color and an inner gradient)
  // Recharts supports defs inside ResponsiveContainer via <defs> on top-level svg created by ResponsiveContainer -> but to keep it simple
  // we'll assign a primary fill and slightly darker fill for hover via Cell rendering (animated opacity will be handled by Recharts).
  const BAR_PRIMARY = '#7dd3c0'; // light green
  const BAR_SECOND = '#5fb8a8'; // darker green

  return (
    <div style={containerStyle}>
      {/* Header with Breadcrumb */}
      <div className='mt-5' style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '7px' }}>
        <h1 style={{ margin: 0, fontSize: '20px', fontWeight: '600' }}>Invoice Dashboard</h1>
        <div style={{ fontSize: '13px', color: '#555' }}>
          <span style={{ color: '#007bff', cursor: 'pointer' }} onClick={() => window.location.href = '/admin/home'}>
            Home
          </span>
          <span style={{ margin: '0 8px' }}>/</span>
          <span>Invoice Dashboard</span>
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
          <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>Total Invoices</div>
          <div style={{ fontSize: '24px', fontWeight: '600', color: '#333' }}>{stats.totalInvoices}</div>
          <div style={{ fontSize: '11px', color: '#666', marginTop: '4px' }}>Last 7 days activity</div>
        </div>

        <div style={{
          backgroundColor: 'white',
          borderRadius: '8px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          padding: '16px'
        }}>
          <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>Total Revenue</div>
          <div style={{ fontSize: '24px', fontWeight: '600', color: '#333' }}>{formatCurrency(stats.totalRevenue)}</div>
          <div style={{ fontSize: '11px', color: '#666', marginTop: '4px' }}>From all invoices</div>
        </div>

        <div style={{
          backgroundColor: 'white',
          borderRadius: '8px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          padding: '16px'
        }}>
          <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>Pending Invoices</div>
          <div style={{ fontSize: '24px', fontWeight: '600', color: '#333' }}>{stats.pendingInvoices}</div>
          <div style={{ fontSize: '11px', color: '#666', marginTop: '4px' }}>Awaiting payment</div>
        </div>

        <div style={{
          backgroundColor: 'white',
          borderRadius: '8px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          padding: '16px'
        }}>
          <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>Active Clients</div>
          <div style={{ fontSize: '24px', fontWeight: '600', color: '#333' }}>{stats.activeClients}</div>
          <div style={{ fontSize: '11px', color: '#666', marginTop: '4px' }}>Unique clients</div>
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
          <h2 style={{ margin: 0, fontSize: '16px', fontWeight: '600' }}>Statistics Overview</h2>
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
                  <linearGradient id="gradGreen" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={BAR_PRIMARY} stopOpacity="1" />
                    <stop offset="100%" stopColor={BAR_SECOND} stopOpacity="1" />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fill: '#666', fontSize: 12 }} />
                <YAxis tickFormatter={(value) => {
                  // brief formatting e.g., 20k
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
                      fill="url(#gradGreen)"
                      style={{ transition: 'opacity 0.2s ease' }}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Main Card Container (Recent Invoices) */}
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
            <h2 style={{ margin: 0, fontSize: '16px', fontWeight: '600' }}>Recent Invoices</h2>
            <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#666' }}>
              Last 7 days invoice generation activity ({recentInvoices.length} invoices)
            </p>
          </div>
          <button
            onClick={fetchInvoices}
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
              <th className="py-2 px-3 fw-semibold text-start">Invoice Number</th>
              <th className="py-2 px-3 fw-semibold text-start">Client Name</th>
              <th className="py-2 px-3 fw-semibold text-start">Client ID</th>
              <th className="py-2 px-3 fw-semibold text-end">Amount</th>
              <th className="py-2 px-3 fw-semibold text-center">Billing Date</th>
              <th className="py-2 px-3 fw-semibold text-start">KAM</th>
              <th className="py-2 px-3 fw-semibold text-center" style={{ width: "100px" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="8" className="text-center py-4">
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
                  <p style={{ marginTop: '8px', color: '#666' }}>Loading invoices...</p>
                </td>
              </tr>
            ) : recentInvoices.length === 0 ? (
              <tr>
                <td colSpan="8" className="text-center text-muted py-4">
                  No invoices found in the last 7 days
                </td>
              </tr>
            ) : (
              recentInvoices.map((invoice, index) => (
                <tr key={invoice.id || index} className="align-middle">
                  <td className="py-1 px-3 text-center">{index + 1}</td>
                  <td className="py-1 px-3">
                    <span style={{ fontFamily: 'monospace', fontWeight: '500', color: '#007bff' }}>
                      {invoice.invoice_number}
                    </span>
                  </td>
                  <td className="py-1 px-3">
                    <div style={{ fontWeight: '500', color: '#333' }}>
                      {invoice.client_name || 'N/A'}
                    </div>
                  </td>
                  <td className="py-1 px-3">{invoice.client_id || 'N/A'}</td>
                  <td className="py-1 px-3 text-end" style={{ fontWeight: '600' }}>
                    {formatCurrency(invoice.total)}
                  </td>
                  <td className="py-1 px-3 text-center">{formatDate(invoice.billing_date)}</td>
                  <td className="py-1 px-3">{invoice.kam || 'N/A'}</td>
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
                        title="View Invoice"
                      >
                        <Eye size={12} />
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
                        title="Download Invoice"
                      >
                        <Download size={12} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Table Info */}
        {!loading && recentInvoices.length > 0 && (
          <div style={{ marginTop: '5px', fontSize: '12px', color: '#666' }}>
            Showing {recentInvoices.length} of {stats.totalInvoices} total invoices
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{ marginTop: '16px', textAlign: 'center' }}>
        <p style={{ fontSize: '12px', color: '#666', margin: 0 }}>
          Made with ❤️ by <span style={{ fontWeight: '600' }}>Wintel Limited</span>
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

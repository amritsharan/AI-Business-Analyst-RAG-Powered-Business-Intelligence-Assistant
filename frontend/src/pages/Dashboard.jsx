import React, { useEffect, useState } from 'react';
import { 
  TrendingUp, 
  Users, 
  UserMinus, 
  Percent, 
  FileText, 
  ArrowUpRight,
  ArrowDownRight,
  AlertTriangle,
  RefreshCw
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend
} from 'recharts';
import { fetchDashboard, fetchDocuments } from '../services/api';

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [dashRes, docsRes] = await Promise.all([
          fetchDashboard(),
          fetchDocuments()
        ]);
        setData(dashRes);
        setDocs(docsRes.documents || []);
        setError(null);
      } catch (err) {
        console.error(err);
        setError('Failed to retrieve dashboard insights. Make sure the FastAPI server is running.');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[400px]">
        <RefreshCw className="h-8 w-8 text-indigo-500 animate-spin mb-4" />
        <p className="text-slate-400 font-medium">Analyzing dashboard metrics...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-center p-6">
        <AlertTriangle className="h-12 w-12 text-rose-500 mb-4" />
        <h3 className="text-lg font-semibold text-slate-100 mb-2">Connection Failure</h3>
        <p className="text-slate-400 max-w-md mb-6">{error}</p>
        <button 
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition"
        >
          Retry Connection
        </button>
      </div>
    );
  }

  const { kpis, revenue_trend, regional_performance, churn_trend } = data;

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white">AI Business Analyst</h1>
        <p className="text-slate-400 mt-1">Real-time business intelligence and performance tracking insights.</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Revenue */}
        <div className="glass-panel rounded-xl p-6 glow-indigo transition duration-300 hover:scale-[1.01]">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-400">Total H1 Revenue</span>
            <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-lg">
              <TrendingUp className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-3xl font-bold text-white">{kpis.revenue}</h3>
            <span className="flex items-center text-xs font-semibold text-emerald-400 mt-2">
              <ArrowUpRight className="h-4 w-4 mr-0.5" />
              +18.2% Q2 Growth
            </span>
          </div>
        </div>

        {/* Customers */}
        <div className="glass-panel rounded-xl p-6 transition duration-300 hover:scale-[1.01]">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-400">Total H1 Transactions</span>
            <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-lg">
              <Users className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-3xl font-bold text-white">{kpis.customers}</h3>
            <span className="flex items-center text-xs font-semibold text-slate-400 mt-2">
              Across 4 geographic sectors
            </span>
          </div>
        </div>

        {/* Churn Rate */}
        <div className="glass-panel rounded-xl p-6 transition duration-300 hover:scale-[1.01]">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-400">Average Churn Rate</span>
            <div className="p-2 bg-rose-500/10 text-rose-400 rounded-lg">
              <UserMinus className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-3xl font-bold text-white">{kpis.churn_rate}</h3>
            <span className="flex items-center text-xs font-semibold text-rose-400 mt-2">
              <AlertTriangle className="h-4.5 w-4.5 mr-0.5" />
              South Region: 14.2% (High Risk)
            </span>
          </div>
        </div>

        {/* Retention Rate */}
        <div className="glass-panel rounded-xl p-6 transition duration-300 hover:scale-[1.01]">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-400">Retention Goal</span>
            <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg">
              <Percent className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-3xl font-bold text-white">{kpis.retention_rate}</h3>
            <span className="flex items-center text-xs font-semibold text-emerald-400 mt-2">
              Goal Target: 90.0%
            </span>
          </div>
        </div>
      </div>

      {/* Chart Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Revenue Line Chart */}
        <div className="glass-panel rounded-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-white">Revenue Performance (H1)</h2>
            <span className="text-xs text-indigo-400 font-semibold bg-indigo-500/10 px-2.5 py-1 rounded-full">Monthly</span>
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={revenue_trend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} />
                <YAxis 
                  stroke="#94a3b8" 
                  fontSize={12} 
                  tickFormatter={(val) => `$${(val / 1000).toFixed(0)}k`} 
                />
                <Tooltip 
                  formatter={(value) => [`$${value.toLocaleString()}`, 'Revenue']}
                  contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '8px' }}
                  labelStyle={{ color: '#f1f5f9' }}
                />
                <Line 
                  type="monotone" 
                  dataKey="revenue" 
                  stroke="#6366f1" 
                  strokeWidth={3} 
                  dot={{ r: 4, strokeWidth: 2 }} 
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Regional Revenue and CSAT Bar Chart */}
        <div className="glass-panel rounded-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-white">Regional Financials & Customer Satisfaction</h2>
            <span className="text-xs text-indigo-400 font-semibold bg-indigo-500/10 px-2.5 py-1 rounded-full">By Location</span>
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={regional_performance}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
                <XAxis dataKey="region" stroke="#94a3b8" fontSize={12} />
                <YAxis stroke="#94a3b8" fontSize={12} tickFormatter={(val) => `$${(val / 1000).toFixed(0)}k`} />
                <Tooltip 
                  formatter={(value, name) => [
                    name === 'revenue' ? `$${value.toLocaleString()}` : `${value}%`, 
                    name === 'revenue' ? 'H1 Revenue' : 'CSAT Score'
                  ]}
                  contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '8px' }}
                />
                <Legend verticalAlign="top" height={36} />
                <Bar name="revenue" dataKey="revenue" fill="#6366f1" radius={[4, 4, 0, 0]} />
                <Bar name="csat" dataKey="csat" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Churn Trend */}
        <div className="glass-panel rounded-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-white">Monthly Churn Volatility (H1)</h2>
            <span className="text-xs text-rose-400 bg-rose-500/10 px-2.5 py-1 rounded-full font-semibold">Risk Index</span>
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={churn_trend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} />
                <YAxis stroke="#94a3b8" fontSize={12} tickFormatter={(val) => `${val}%`} />
                <Tooltip 
                  formatter={(value) => [`${value}%`, 'Churn Rate']}
                  contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '8px' }}
                />
                <Line 
                  type="monotone" 
                  dataKey="churn" 
                  stroke="#f43f5e" 
                  strokeWidth={3} 
                  dot={{ r: 4, strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Indexed Documents */}
        <div className="glass-panel rounded-xl p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-white">Indexed Business Reports</h2>
              <span className="text-xs text-slate-400">{docs.length} Reports</span>
            </div>
            <div className="space-y-4 max-h-[250px] overflow-y-auto pr-1">
              {docs.slice(0, 4).map((doc) => (
                <div key={doc.id} className="flex items-center justify-between p-3.5 bg-slate-900/60 rounded-lg border border-slate-800">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded">
                      <FileText className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-slate-100">{doc.name}</h4>
                      <p className="text-xs text-slate-400 mt-0.5">{doc.pages} Pages • {doc.type}</p>
                    </div>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    doc.status === 'Indexed' 
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                      : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 animate-pulse'
                  }`}>
                    {doc.status}
                  </span>
                </div>
              ))}
              {docs.length === 0 && (
                <div className="text-center py-8 text-slate-500 text-sm">
                  No business reports uploaded yet.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

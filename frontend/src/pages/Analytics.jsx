import React, { useEffect, useState } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Legend,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line
} from 'recharts';
import { RefreshCw, BarChart2, Ticket, Award, Percent } from 'lucide-react';
import { fetchAnalytics, fetchDashboard } from '../services/api';

const COLORS = ['#6366f1', '#10b981', '#f43f5e', '#eab308'];

export default function Analytics() {
  const [data, setData] = useState(null);
  const [dashData, setDashData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [analRes, dashRes] = await Promise.all([
          fetchAnalytics(),
          fetchDashboard()
        ]);
        setData(analRes);
        setDashData(dashRes);
        setError(null);
      } catch (err) {
        console.error(err);
        setError('Failed to fetch analytics statistics.');
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
        <p className="text-slate-400 font-medium">Aggregating granular reports statistics...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12 text-rose-400 font-medium">
        {error}
      </div>
    );
  }

  const { product_sales, support_categories, support_performance } = data;
  const { regional_performance } = dashData;

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <BarChart2 className="h-6 w-6 text-indigo-400" />
          Business Performance Analytics
        </h1>
        <p className="text-xs text-slate-400 mt-0.5">Granular breakdowns of sales by category, regional churn metrics, and support desk service levels.</p>
      </div>

      {/* Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Sales by Product Category */}
        <div className="glass-panel rounded-xl p-6">
          <h3 className="text-sm font-bold text-slate-200 mb-6 flex items-center gap-2">
            <Award className="h-4 w-4 text-indigo-400" />
            H1 Sales Revenue by Product Category
          </h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={product_sales} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
                <XAxis type="number" stroke="#94a3b8" fontSize={11} tickFormatter={(val) => `$${(val / 1000).toFixed(0)}k`} />
                <YAxis dataKey="product" type="category" stroke="#94a3b8" fontSize={11} width={120} />
                <Tooltip 
                  formatter={(value) => [`$${value.toLocaleString()}`, 'Revenue']}
                  contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '8px' }}
                />
                <Bar dataKey="revenue" fill="#6366f1" radius={[0, 4, 4, 0]} barSize={24} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Customer Churn Rate by Region */}
        <div className="glass-panel rounded-xl p-6">
          <h3 className="text-sm font-bold text-slate-200 mb-6 flex items-center gap-2">
            <Percent className="h-4 w-4 text-rose-400" />
            Regional Churn Ratios (Percentage Churned in H1)
          </h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={regional_performance}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
                <XAxis dataKey="region" stroke="#94a3b8" fontSize={12} />
                <YAxis stroke="#94a3b8" fontSize={12} tickFormatter={(val) => `${val}%`} />
                <Tooltip 
                  formatter={(value) => [`${value}%`, 'Churn Rate']}
                  contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '8px' }}
                />
                <Bar dataKey="churn" fill="#f43f5e" radius={[4, 4, 0, 0]} barSize={35} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Customer Support Tickets Classification */}
        <div className="glass-panel rounded-xl p-6">
          <h3 className="text-sm font-bold text-slate-200 mb-6 flex items-center gap-2">
            <Ticket className="h-4 w-4 text-indigo-400" />
            Support Ticket Categorization (Total: 1,850)
          </h3>
          <div className="h-80 flex flex-col sm:flex-row items-center justify-around">
            <div className="w-full sm:w-1/2 h-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={support_categories}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={85}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {support_categories.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value) => [value, 'Tickets']}
                    contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '8px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            
            <div className="space-y-3 w-full sm:w-1/2 mt-4 sm:mt-0 px-4">
              {support_categories.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-2">
                    <div className="h-3 w-3 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                    <span className="text-slate-300 font-medium">{item.name}</span>
                  </div>
                  <span className="text-slate-100 font-semibold">{item.value} ({((item.value / 1850)*100).toFixed(1)}%)</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Customer Support Response vs. CSAT Score */}
        <div className="glass-panel rounded-xl p-6">
          <h3 className="text-sm font-bold text-slate-200 mb-6 flex items-center gap-2">
            <RefreshCw className="h-4 w-4 text-emerald-400" />
            Support Operations Quality: CSAT vs Response Time
          </h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={support_performance}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} />
                <YAxis yAxisId="left" stroke="#10b981" fontSize={11} tickFormatter={(val) => `${val}%`} />
                <YAxis yAxisId="right" orientation="right" stroke="#6366f1" fontSize={11} tickFormatter={(val) => `${val}h`} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '8px' }}
                />
                <Legend verticalAlign="top" height={36} />
                <Line yAxisId="left" type="monotone" name="CSAT score" dataKey="csat" stroke="#10b981" strokeWidth={3} dot={{ r: 5 }} />
                <Line yAxisId="right" type="monotone" name="Avg Response Time (hours)" dataKey="response_time" stroke="#6366f1" strokeWidth={3} dot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  MessageSquare, 
  Database, 
  BarChart3, 
  HelpCircle,
  Activity,
  Menu,
  X
} from 'lucide-react';
import Dashboard from './pages/Dashboard';
import Analyst from './pages/Analyst';
import Reports from './pages/Reports';
import Analytics from './pages/Analytics';
import { checkHealth } from './services/api';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [apiOnline, setApiOnline] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Check backend server status
  useEffect(() => {
    async function checkStatus() {
      try {
        await checkHealth();
        setApiOnline(true);
      } catch (err) {
        setApiOnline(false);
      }
    }
    checkStatus();
    const interval = setInterval(checkStatus, 10000); // Check every 10s
    return () => clearInterval(interval);
  }, []);

  const navigation = [
    { id: 'dashboard', name: 'Dashboard', icon: LayoutDashboard, component: Dashboard },
    { id: 'analyst', name: 'AI Analyst Chat', icon: MessageSquare, component: Analyst },
    { id: 'reports', name: 'Reports Library', icon: Database, component: Reports },
    { id: 'analytics', name: 'Detailed Analytics', icon: BarChart3, component: Analytics },
  ];

  const ActiveComponent = navigation.find(n => n.id === activeTab)?.component || Dashboard;

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 overflow-hidden">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex md:w-64 flex-col bg-slate-900 border-r border-slate-800 shrink-0">
        {/* Brand */}
        <div className="flex items-center gap-2 px-6 py-5 border-b border-slate-800">
          <div className="bg-indigo-600 p-2 rounded-lg text-white">
            <BarChart3 className="h-5 w-5" />
          </div>
          <div>
            <span className="font-bold text-sm tracking-tight text-white block">AI Analyst SaaS</span>
            <span className="text-[10px] text-slate-400 font-semibold block">Business Intelligence</span>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-4 py-6 space-y-1">
          {navigation.map((item) => {
            const Icon = item.icon;
            const active = item.id === activeTab;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl text-xs font-semibold tracking-wide transition ${
                  active 
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/10' 
                    : 'text-slate-400 hover:bg-slate-800/40 hover:text-white'
                }`}
              >
                <Icon className="h-4.5 w-4.5 shrink-0" />
                {item.name}
              </button>
            );
          })}
        </nav>

        {/* System Health Status Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/20">
          <div className="flex items-center justify-between p-3.5 bg-slate-900/60 rounded-xl border border-slate-800/80">
            <div className="flex items-center space-x-2.5">
              <Activity className={`h-4 w-4 ${apiOnline ? 'text-emerald-400 animate-pulse' : 'text-rose-500'}`} />
              <span className="text-[10px] text-slate-400 font-bold">API STATUS</span>
            </div>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
              apiOnline 
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
            }`}>
              {apiOnline ? 'ONLINE' : 'OFFLINE'}
            </span>
          </div>
        </div>
      </aside>

      {/* Main Content Pane */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        
        {/* Mobile Header */}
        <header className="md:hidden flex items-center justify-between bg-slate-900 px-6 py-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="bg-indigo-600 p-1.5 rounded-md text-white">
              <BarChart3 className="h-4.5 w-4.5" />
            </div>
            <span className="font-bold text-sm tracking-tight text-white">AI Analyst SaaS</span>
          </div>
          <button 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-1 text-slate-400 hover:text-white focus:outline-none"
          >
            {mobileMenuOpen ? <X className="h-5.5 w-5.5" /> : <Menu className="h-5.5 w-5.5" />}
          </button>
        </header>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden fixed inset-0 z-40 bg-slate-950/90 backdrop-blur-sm top-[57px]">
            <nav className="p-6 space-y-2">
              {navigation.map((item) => {
                const Icon = item.icon;
                const active = item.id === activeTab;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveTab(item.id);
                      setMobileMenuOpen(false);
                    }}
                    className={`flex items-center gap-3 w-full px-4 py-3.5 rounded-xl text-sm font-semibold transition ${
                      active 
                        ? 'bg-indigo-600 text-white' 
                        : 'text-slate-400 hover:bg-slate-900/60'
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    {item.name}
                  </button>
                );
              })}
            </nav>
          </div>
        )}

        {/* API Down Banner */}
        {!apiOnline && (
          <div className="bg-rose-950/80 border-b border-rose-800 text-rose-300 text-xs px-6 py-2 flex items-center justify-between shrink-0 font-medium animate-fadeIn">
            <span>FastAPI Server connection is offline. Start the backend with 'uvicorn app.main:app' or custom scripts.</span>
          </div>
        )}

        {/* Active Page Viewport */}
        <main className="flex-1 overflow-y-auto px-6 py-8 md:px-8 bg-slate-950 relative">
          {/* Subtle Background Glows */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-600/5 rounded-full filter blur-[100px] pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-emerald-600/3 rounded-full filter blur-[100px] pointer-events-none" />
          
          <div className="max-w-7xl mx-auto h-full relative z-10">
            <ActiveComponent />
          </div>
        </main>
      </div>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { adminAPI } from '../../services/api';
import { DashboardStats, User, UserSessionEntry, AuditLogEntry } from '../../types';
import { 
  Users, Activity, ShieldAlert, BarChart3, RefreshCw, Key, 
  Trash2, ShieldCheck, HelpCircle, Monitor, Globe, Clock, UserCheck
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line
} from 'recharts';

export const AdminDashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [sessions, setSessions] = useState<UserSessionEntry[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'users' | 'sessions' | 'audit' | 'analytics'>('analytics');
  const [updatingRole, setUpdatingRole] = useState<number | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [statsData, usersData, sessionsData, auditData] = await Promise.all([
        adminAPI.getStats(),
        adminAPI.getUsers(),
        adminAPI.getSessions(),
        adminAPI.getAuditLogs()
      ]);
      setStats(statsData);
      setUsers(usersData);
      setSessions(sessionsData);
      setAuditLogs(auditData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleChangeRole = async (userId: number, role: string) => {
    setUpdatingRole(userId);
    try {
      await adminAPI.changeRole(userId, role);
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to update user role.');
    } finally {
      setUpdatingRole(null);
    }
  };

  // Chart data helpers
  const pieData = stats ? Object.entries(stats.queries_by_status).map(([name, value]) => ({
    name: name.toUpperCase(),
    value
  })) : [];
  
  const COLORS = ['#10b981', '#ef4444', '#6366f1'];

  return (
    <div className="flex flex-col gap-6 h-[calc(100vh-88px)] overflow-hidden">
      
      {/* Header section */}
      <div className="glass rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 border border-slate-200/50 dark:border-slate-800/40">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-extrabold text-slate-800 dark:text-white text-base">Admin Portal</h2>
            <p className="text-xs text-slate-400">Manage security details, audit tracks, and user roles</p>
          </div>
        </div>

        <button
          onClick={loadData}
          disabled={loading}
          className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs py-2 px-4 rounded-xl transition-all active:scale-[0.98] shrink-0"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh Stats
        </button>
      </div>

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 shrink-0">
          <div className="glass p-4 rounded-2xl border border-slate-200/30 dark:border-slate-800/40 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-indigo-500/10 text-indigo-400"><Users className="w-5 h-5" /></div>
            <div>
              <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Users</span>
              <span className="text-lg font-bold text-slate-800 dark:text-slate-200">{stats.total_users}</span>
            </div>
          </div>
          <div className="glass p-4 rounded-2xl border border-slate-200/30 dark:border-slate-800/40 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-indigo-500/10 text-indigo-400"><Activity className="w-5 h-5" /></div>
            <div>
              <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Queries</span>
              <span className="text-lg font-bold text-slate-800 dark:text-slate-200">{stats.total_queries}</span>
            </div>
          </div>
          <div className="glass p-4 rounded-2xl border border-slate-200/30 dark:border-slate-800/40 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-indigo-500/10 text-indigo-400"><UserCheck className="w-5 h-5" /></div>
            <div>
              <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Active Sessions</span>
              <span className="text-lg font-bold text-slate-800 dark:text-slate-200">{stats.active_sessions}</span>
            </div>
          </div>
          <div className="glass p-4 rounded-2xl border border-slate-200/30 dark:border-slate-800/40 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-indigo-500/10 text-indigo-400"><ShieldAlert className="w-5 h-5" /></div>
            <div>
              <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Audit Events</span>
              <span className="text-lg font-bold text-slate-800 dark:text-slate-200">{stats.total_audit_logs}</span>
            </div>
          </div>
        </div>
      )}

      {/* Tabs navigation */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 shrink-0">
        <button
          onClick={() => setActiveTab('analytics')}
          className={`py-3 px-4 font-bold text-xs uppercase tracking-wider border-b-2 -mb-[2px] transition-all ${
            activeTab === 'analytics' 
              ? 'border-indigo-500 text-indigo-500 dark:text-indigo-400' 
              : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
          }`}
        >
          Analytics &amp; Usage
        </button>
        <button
          onClick={() => setActiveTab('users')}
          className={`py-3 px-4 font-bold text-xs uppercase tracking-wider border-b-2 -mb-[2px] transition-all ${
            activeTab === 'users' 
              ? 'border-indigo-500 text-indigo-500 dark:text-indigo-400' 
              : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
          }`}
        >
          User Accounts
        </button>
        <button
          onClick={() => setActiveTab('sessions')}
          className={`py-3 px-4 font-bold text-xs uppercase tracking-wider border-b-2 -mb-[2px] transition-all ${
            activeTab === 'sessions' 
              ? 'border-indigo-500 text-indigo-500 dark:text-indigo-400' 
              : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
          }`}
        >
          Active Sessions
        </button>
        <button
          onClick={() => setActiveTab('audit')}
          className={`py-3 px-4 font-bold text-xs uppercase tracking-wider border-b-2 -mb-[2px] transition-all ${
            activeTab === 'audit' 
              ? 'border-indigo-500 text-indigo-500 dark:text-indigo-400' 
              : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
          }`}
        >
          Audit Logging
        </button>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0 text-slate-800 dark:text-slate-200">
        
        {/* ANALYTICS TAB */}
        {activeTab === 'analytics' && stats && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pr-1 pb-4">
            
            {/* Daily volume chart */}
            <div className="glass rounded-3xl p-5 border border-slate-200/50 dark:border-slate-800/40 flex flex-col gap-4">
              <h3 className="font-bold text-xs uppercase tracking-wider text-slate-400">Query Frequency (Last 7 Days)</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={stats.queries_by_day}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" opacity={0.1} />
                    <XAxis dataKey="date" stroke="#94a3b8" fontSize={10} />
                    <YAxis stroke="#94a3b8" fontSize={10} />
                    <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px' }} />
                    <Line type="monotone" dataKey="count" stroke="#6366f1" strokeWidth={3} activeDot={{ r: 8 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Execution status donut */}
            <div className="glass rounded-3xl p-5 border border-slate-200/50 dark:border-slate-800/40 flex flex-col gap-4">
              <h3 className="font-bold text-xs uppercase tracking-wider text-slate-400">Execution Status Breakdown</h3>
              <div className="h-64 flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px' }} />
                  </PieChart>
                </ResponsiveContainer>
                
                <div className="space-y-2 shrink-0 pr-6">
                  {pieData.map((d, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs">
                      <span className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] || COLORS[0] }}></span>
                      <span className="font-semibold text-slate-600 dark:text-slate-300">{d.name}:</span>
                      <span className="font-bold text-slate-800 dark:text-white">{d.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Top users bar chart */}
            <div className="glass rounded-3xl p-5 border border-slate-200/50 dark:border-slate-800/40 flex flex-col gap-4 lg:col-span-2">
              <h3 className="font-bold text-xs uppercase tracking-wider text-slate-400">Top Workspace Developers</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.top_users}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" opacity={0.1} />
                    <XAxis dataKey="username" stroke="#94a3b8" fontSize={10} />
                    <YAxis stroke="#94a3b8" fontSize={10} />
                    <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px' }} />
                    <Bar dataKey="count" fill="#4f46e5" radius={[10, 10, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            
          </div>
        )}

        {/* USERS TAB */}
        {activeTab === 'users' && (
          <div className="glass rounded-3xl border border-slate-200/50 dark:border-slate-800/40 overflow-hidden pr-1">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-slate-100 dark:bg-slate-950/40 text-slate-500 border-b border-slate-200 dark:border-slate-800">
                  <th className="px-4 py-3 font-semibold uppercase tracking-wider">User</th>
                  <th className="px-4 py-3 font-semibold uppercase tracking-wider">Email</th>
                  <th className="px-4 py-3 font-semibold uppercase tracking-wider">Role</th>
                  <th className="px-4 py-3 font-semibold uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 font-semibold uppercase tracking-wider">Registered At</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-b border-slate-100 dark:border-slate-800/40 hover:bg-slate-50 dark:hover:bg-slate-800/20 transition-all">
                    <td className="px-4 py-3 font-semibold text-slate-800 dark:text-slate-200">{u.username}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{u.email}</td>
                    <td className="px-4 py-3">
                      <select
                        value={u.role}
                        disabled={updatingRole === u.id}
                        onChange={(e) => handleChangeRole(u.id, e.target.value)}
                        className="bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-1 text-xs text-slate-700 dark:text-slate-200 font-semibold focus:outline-none focus:border-indigo-500"
                      >
                        <option value="admin">Admin</option>
                        <option value="developer">Developer</option>
                        <option value="viewer">Viewer</option>
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded-lg ${
                        u.is_active ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                      }`}>
                        {u.is_active ? 'Active' : 'Disabled'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-500">{new Date(u.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ACTIVE SESSIONS TAB */}
        {activeTab === 'sessions' && (
          <div className="glass rounded-3xl border border-slate-200/50 dark:border-slate-800/40 overflow-hidden pr-1">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-slate-100 dark:bg-slate-950/40 text-slate-500 border-b border-slate-200 dark:border-slate-800">
                  <th className="px-4 py-3 font-semibold uppercase tracking-wider">User</th>
                  <th className="px-4 py-3 font-semibold uppercase tracking-wider">IP Address</th>
                  <th className="px-4 py-3 font-semibold uppercase tracking-wider">User Agent</th>
                  <th className="px-4 py-3 font-semibold uppercase tracking-wider">Last Active</th>
                  <th className="px-4 py-3 font-semibold uppercase tracking-wider">Expires At</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((s) => (
                  <tr key={s.id} className="border-b border-slate-100 dark:border-slate-800/40 hover:bg-slate-50 dark:hover:bg-slate-800/20 transition-all">
                    <td className="px-4 py-3 font-semibold text-slate-800 dark:text-slate-200">{s.username}</td>
                    <td className="px-4 py-3 font-mono text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                      <Globe className="w-3.5 h-3.5 text-slate-500" /> {s.ip_address || 'local'}
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400 max-w-xs truncate flex items-center gap-1.5" title={s.user_agent || ''}>
                      <Monitor className="w-3.5 h-3.5 text-slate-500" /> <span className="truncate">{s.user_agent || 'unknown'}</span>
                    </td>
                    <td className="px-4 py-3 text-slate-500 font-mono flex-row gap-1">
                      <Clock className="w-3.5 h-3.5 text-slate-500 inline-block mr-1" /> {new Date(s.last_activity).toLocaleTimeString()}
                    </td>
                    <td className="px-4 py-3 text-slate-500 font-mono">{new Date(s.expires_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* AUDIT LOGGING TAB */}
        {activeTab === 'audit' && (
          <div className="glass rounded-3xl border border-slate-200/50 dark:border-slate-800/40 overflow-hidden pr-1">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-slate-100 dark:bg-slate-950/40 text-slate-500 border-b border-slate-200 dark:border-slate-800">
                  <th className="px-4 py-3 font-semibold uppercase tracking-wider">Timestamp</th>
                  <th className="px-4 py-3 font-semibold uppercase tracking-wider">Actor</th>
                  <th className="px-4 py-3 font-semibold uppercase tracking-wider">Action</th>
                  <th className="px-4 py-3 font-semibold uppercase tracking-wider">IP Address</th>
                  <th className="px-4 py-3 font-semibold uppercase tracking-wider">Action Details</th>
                </tr>
              </thead>
              <tbody>
                {auditLogs.map((log) => (
                  <tr key={log.id} className="border-b border-slate-100 dark:border-slate-800/40 hover:bg-slate-50 dark:hover:bg-slate-800/20 transition-all">
                    <td className="px-4 py-3 text-slate-500 font-mono">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-800 dark:text-slate-200">{log.username || 'System'}</td>
                    <td className="px-4 py-3">
                      <span className={`text-[8px] font-extrabold uppercase px-2 py-0.5 rounded-lg border ${
                        log.action.includes('FAILED') || log.action.includes('LOCKOUT')
                          ? 'bg-red-500/10 text-red-400 border-red-500/15'
                          : log.action.includes('LOGIN')
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/15'
                          : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/15'
                      }`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-500">{log.ip_address || 'local'}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300 font-mono max-w-sm truncate" title={log.details || ''}>
                      {log.details}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

      </div>
    </div>
  );
};

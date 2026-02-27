'use client'
import { useState } from 'react'
import Link from 'next/link'
import {
  Shield, Activity, AlertTriangle, CheckCircle, Clock,
  Database, Cpu, Globe, Lock, Eye, Zap, TrendingUp,
  TrendingDown, Server, Users, Network, Bell, Settings,
  LogOut, ChevronRight, Menu, X, RefreshCw, Filter,
  BarChart2, GitBranch, Target, Brain
} from 'lucide-react'
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts'

// ── Mock Data ─────────────────────────────────────────────────────────────────
const threatData = [
  { time: '00:00', detected: 12, blocked: 11, fp: 2 },
  { time: '02:00', detected: 8, blocked: 8, fp: 1 },
  { time: '04:00', detected: 5, blocked: 5, fp: 0 },
  { time: '06:00', detected: 18, blocked: 17, fp: 3 },
  { time: '08:00', detected: 45, blocked: 43, fp: 4 },
  { time: '10:00', detected: 62, blocked: 60, fp: 5 },
  { time: '12:00', detected: 38, blocked: 37, fp: 2 },
  { time: '14:00', detected: 71, blocked: 69, fp: 6 },
  { time: '16:00', detected: 55, blocked: 53, fp: 4 },
  { time: '18:00', detected: 33, blocked: 32, fp: 2 },
  { time: '20:00', detected: 28, blocked: 27, fp: 3 },
  { time: '22:00', detected: 19, blocked: 19, fp: 1 },
]

const vectorScoreData = [
  { time: '6h ago', score: 0.82 }, { time: '5h ago', score: 0.85 },
  { time: '4h ago', score: 0.79 }, { time: '3h ago', score: 0.91 },
  { time: '2h ago', score: 0.88 }, { time: '1h ago', score: 0.93 },
  { time: 'Now', score: 0.96 },
]

const alerts = [
  { id: 'ALT-001', title: 'Lateral Movement Detected', severity: 'critical', source: '192.168.1.45', dest: '10.0.0.12', category: 'MITRE T1021', time: '2 min ago', status: 'open', confidence: 96 },
  { id: 'ALT-002', title: 'Privilege Escalation Attempt', severity: 'high', source: '10.0.0.88', dest: 'AD-Server-01', category: 'MITRE T1548', time: '8 min ago', status: 'investigating', confidence: 89 },
  { id: 'ALT-003', title: 'Anomalous Data Exfiltration', severity: 'high', source: '10.0.0.23', dest: '45.67.12.99', category: 'MITRE T1048', time: '15 min ago', status: 'open', confidence: 84 },
  { id: 'ALT-004', title: 'Brute Force Login — SSH', severity: 'medium', source: '203.0.113.5', dest: 'server-prod-02', category: 'MITRE T1110', time: '22 min ago', status: 'resolved', confidence: 99 },
  { id: 'ALT-005', title: 'Honeypot Token Accessed', severity: 'critical', source: '10.0.0.55', dest: 'honeytoken-db', category: 'Deception Tech', time: '31 min ago', status: 'resolved', confidence: 100 },
  { id: 'ALT-006', title: 'Unusual After-Hours Access', severity: 'medium', source: 'user: ravi.k', dest: 'Finance-DB', category: 'UEBA Anomaly', time: '45 min ago', status: 'resolved', confidence: 78 },
]

const assets = [
  { hostname: 'server-prod-01', ip: '10.0.0.1', type: 'Server', os: 'Ubuntu 22.04', risk: 92, status: 'critical' },
  { hostname: 'workstation-ajay', ip: '10.0.0.45', type: 'Endpoint', os: 'Windows 11', risk: 23, status: 'normal' },
  { hostname: 'AD-Server-01', ip: '10.0.0.5', type: 'Domain Controller', os: 'Windows Server 2022', risk: 67, status: 'warning' },
  { hostname: 'firewall-edge', ip: '10.0.0.254', type: 'Network', os: 'FortiOS 7.4', risk: 12, status: 'normal' },
  { hostname: 'db-mysql-01', ip: '10.0.0.20', type: 'Database', os: 'RHEL 9', risk: 45, status: 'warning' },
]

const complianceData = [
  { name: 'ISO 27001', score: 87, color: '#06b6d4' },
  { name: 'GDPR', score: 92, color: '#8b5cf6' },
  { name: 'DPDP', score: 78, color: '#f59e0b' },
  { name: 'PCI-DSS', score: 83, color: '#10b981' },
]

const attackVectorData = [
  { name: 'Phishing', value: 32, color: '#ef4444' },
  { name: 'Brute Force', value: 24, color: '#f97316' },
  { name: 'Lateral Mvmt', value: 18, color: '#eab308' },
  { name: 'Exfiltration', value: 14, color: '#8b5cf6' },
  { name: 'Insider', value: 12, color: '#06b6d4' },
]

// ── Components ─────────────────────────────────────────────────────────────────
function SeverityBadge({ s }: { s: string }) {
  const map: Record<string, string> = {
    critical: 'bg-red-500/20 text-red-300 border-red-500/30',
    high: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
    medium: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
    low: 'bg-green-500/20 text-green-300 border-green-500/30',
  }
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${map[s] || map.low}`}>
      {s}
    </span>
  )
}

function StatusBadge({ s }: { s: string }) {
  const map: Record<string, string> = {
    open: 'bg-red-500/20 text-red-300',
    investigating: 'bg-yellow-500/20 text-yellow-300',
    resolved: 'bg-green-500/20 text-green-300',
    false_positive: 'bg-slate-500/20 text-slate-400',
  }
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${map[s] || map.open}`}>
      {s.replace('_', ' ')}
    </span>
  )
}

// ── Dashboard ──────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')

  const navItems = [
    { id: 'overview', label: 'Overview', icon: BarChart2 },
    { id: 'alerts', label: 'Alerts', icon: AlertTriangle },
    { id: 'assets', label: 'Asset Inventory', icon: Server },
    { id: 'threats', label: 'Threat Intelligence', icon: Target },
    { id: 'compliance', label: 'Compliance', icon: CheckCircle },
    { id: 'playbooks', label: 'Playbooks', icon: Zap },
    { id: 'vectors', label: 'Vector Engine', icon: Brain },
  ]

  return (
    <div className="min-h-screen bg-[#020817] flex">
      {/* ── Sidebar ── */}
      <aside className={`${sidebarOpen ? 'w-60' : 'w-16'} transition-all duration-300 flex-shrink-0 glass border-r border-cyan-500/10 flex flex-col min-h-screen`}>
        {/* Logo */}
        <div className="p-4 border-b border-cyan-500/10 flex items-center gap-3">
          <div className="relative flex-shrink-0">
            <Shield className="w-8 h-8 text-cyan-400" />
            <Activity className="w-3 h-3 text-purple-400 absolute -top-1 -right-1" />
          </div>
          {sidebarOpen && (
            <div>
              <div className="font-bold text-sm gradient-text">NeuralNexus</div>
              <div className="text-xs text-slate-500">AC-COS v1.0</div>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-1">
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all ${
                activeTab === item.id
                  ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <item.icon className="w-4 h-4 flex-shrink-0" />
              {sidebarOpen && <span>{item.label}</span>}
            </button>
          ))}
        </nav>

        {/* Bottom */}
        <div className="p-3 border-t border-cyan-500/10 space-y-1">
          <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 transition-all">
            <Settings className="w-4 h-4 flex-shrink-0" />
            {sidebarOpen && <span>Settings</span>}
          </button>
          <Link href="/" className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-slate-400 hover:text-red-300 hover:bg-red-500/10 transition-all">
            <LogOut className="w-4 h-4 flex-shrink-0" />
            {sidebarOpen && <span>Sign Out</span>}
          </Link>
        </div>
      </aside>

      {/* ── Main ── */}
      <main className="flex-1 overflow-auto">
        {/* Top bar */}
        <header className="sticky top-0 z-20 glass border-b border-cyan-500/10 px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="text-slate-400 hover:text-white transition-colors">
              {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <div>
              <h1 className="text-white font-semibold text-sm">AC-COS Dashboard</h1>
              <p className="text-slate-500 text-xs">SRM IST Pilot · 100 Endpoints</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-500/10 border border-green-500/20 text-xs text-green-300">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 pulse-glow" />
              System Active
            </div>
            <button className="relative p-2 text-slate-400 hover:text-white transition-colors">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
            </button>
            <div className="w-8 h-8 rounded-full bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-300 text-xs font-bold">
              AJ
            </div>
          </div>
        </header>

        <div className="p-6 space-y-6">

          {/* ── KPI Cards ── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Threats Blocked Today', value: '394', change: '+12%', icon: Shield, color: 'text-green-400', bg: 'border-green-500/20' },
              { label: 'Active Alerts', value: '3', change: '2 critical', icon: AlertTriangle, color: 'text-red-400', bg: 'border-red-500/20' },
              { label: 'Avg MTTR', value: '4.2 min', change: '-68% vs baseline', icon: Clock, color: 'text-cyan-400', bg: 'border-cyan-500/20' },
              { label: 'False Positive Rate', value: '18.3%', change: '-67% vs baseline', icon: TrendingDown, color: 'text-purple-400', bg: 'border-purple-500/20' },
            ].map(kpi => (
              <div key={kpi.label} className={`glass rounded-2xl p-5 border ${kpi.bg}`}>
                <div className="flex items-center justify-between mb-3">
                  <kpi.icon className={`w-5 h-5 ${kpi.color}`} />
                  <span className="text-xs text-slate-500">{kpi.change}</span>
                </div>
                <div className={`text-3xl font-bold ${kpi.color} mb-1`}>{kpi.value}</div>
                <div className="text-xs text-slate-400">{kpi.label}</div>
              </div>
            ))}
          </div>

          {/* ── Charts Row ── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Threat Timeline */}
            <div className="lg:col-span-2 glass rounded-2xl p-5 border border-cyan-500/10">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-white font-semibold text-sm">Threat Detection Timeline (24h)</h2>
                  <p className="text-slate-500 text-xs">LSTM-predicted vs blocked vs false positives</p>
                </div>
                <button className="text-slate-500 hover:text-slate-300 transition-colors">
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={threatData}>
                  <defs>
                    <linearGradient id="cyanGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="greenGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="time" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} />
                  <YAxis tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} />
                  <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 8, fontSize: 12 }} />
                  <Area type="monotone" dataKey="detected" stroke="#06b6d4" fill="url(#cyanGrad)" strokeWidth={2} name="Detected" />
                  <Area type="monotone" dataKey="blocked" stroke="#10b981" fill="url(#greenGrad)" strokeWidth={2} name="Blocked" />
                  <Line type="monotone" dataKey="fp" stroke="#ef4444" strokeWidth={1.5} dot={false} name="False Positives" />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Attack Vectors */}
            <div className="glass rounded-2xl p-5 border border-purple-500/10">
              <h2 className="text-white font-semibold text-sm mb-1">Attack Vectors</h2>
              <p className="text-slate-500 text-xs mb-4">Distribution today</p>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={attackVectorData} cx="50%" cy="50%" innerRadius={40} outerRadius={70} dataKey="value" paddingAngle={3}>
                    {attackVectorData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 8, fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2 mt-2">
                {attackVectorData.map(v => (
                  <div key={v.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: v.color }} />
                      <span className="text-slate-400 text-xs">{v.name}</span>
                    </div>
                    <span className="text-white text-xs font-medium">{v.value}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── Alerts Table ── */}
          <div className="glass rounded-2xl border border-red-500/10 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h2 className="text-white font-semibold text-sm">Live Alert Feed</h2>
                <p className="text-slate-500 text-xs">Powered by BERT semantic matching + LSTM prediction</p>
              </div>
              <div className="flex items-center gap-2">
                <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-400 hover:text-white glass border border-slate-700 rounded-lg transition-colors">
                  <Filter className="w-3 h-3" />
                  Filter
                </button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-800 text-xs text-slate-500 uppercase tracking-wide">
                    <th className="text-left px-5 py-3">ID</th>
                    <th className="text-left px-5 py-3">Alert</th>
                    <th className="text-left px-5 py-3">Severity</th>
                    <th className="text-left px-5 py-3 hidden md:table-cell">Source</th>
                    <th className="text-left px-5 py-3 hidden lg:table-cell">Category</th>
                    <th className="text-left px-5 py-3 hidden md:table-cell">Confidence</th>
                    <th className="text-left px-5 py-3">Status</th>
                    <th className="text-left px-5 py-3 hidden sm:table-cell">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {alerts.map(a => (
                    <tr key={a.id} className="hover:bg-slate-800/20 transition-colors">
                      <td className="px-5 py-3 text-slate-500 text-xs font-mono">{a.id}</td>
                      <td className="px-5 py-3 text-white text-xs font-medium">{a.title}</td>
                      <td className="px-5 py-3"><SeverityBadge s={a.severity} /></td>
                      <td className="px-5 py-3 text-slate-400 text-xs hidden md:table-cell font-mono">{a.source}</td>
                      <td className="px-5 py-3 text-slate-500 text-xs hidden lg:table-cell">{a.category}</td>
                      <td className="px-5 py-3 hidden md:table-cell">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-slate-800 rounded-full h-1.5 w-16">
                            <div
                              className="h-full rounded-full bg-cyan-500"
                              style={{ width: `${a.confidence}%` }}
                            />
                          </div>
                          <span className="text-slate-400 text-xs">{a.confidence}%</span>
                        </div>
                      </td>
                      <td className="px-5 py-3"><StatusBadge s={a.status} /></td>
                      <td className="px-5 py-3 text-slate-500 text-xs hidden sm:table-cell">{a.time}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* ── Bottom Row ── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Asset Risk */}
            <div className="lg:col-span-2 glass rounded-2xl border border-slate-700/30 overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-800">
                <h2 className="text-white font-semibold text-sm">Asset Risk Inventory</h2>
                <p className="text-slate-500 text-xs">XGBoost risk scoring · Auto-discovered via AD/SNMP</p>
              </div>
              <div className="divide-y divide-slate-800/50">
                {assets.map(a => (
                  <div key={a.hostname} className="px-5 py-3 flex items-center gap-4 hover:bg-slate-800/20 transition-colors">
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                      a.status === 'critical' ? 'bg-red-400' :
                      a.status === 'warning' ? 'bg-yellow-400' : 'bg-green-400'
                    }`} />
                    <div className="flex-1 min-w-0">
                      <div className="text-white text-xs font-medium truncate">{a.hostname}</div>
                      <div className="text-slate-500 text-xs">{a.ip} · {a.type}</div>
                    </div>
                    <div className="hidden sm:block text-slate-500 text-xs">{a.os}</div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <div className="w-16 bg-slate-800 rounded-full h-1.5">
                        <div
                          className={`h-full rounded-full ${a.risk > 70 ? 'bg-red-500' : a.risk > 40 ? 'bg-yellow-500' : 'bg-green-500'}`}
                          style={{ width: `${a.risk}%` }}
                        />
                      </div>
                      <span className="text-xs text-slate-400 w-8">{a.risk}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Compliance */}
            <div className="glass rounded-2xl border border-green-500/10 p-5">
              <h2 className="text-white font-semibold text-sm mb-1">Compliance Status</h2>
              <p className="text-slate-500 text-xs mb-5">Cosine similarity vs regulatory frameworks</p>
              <div className="space-y-4">
                {complianceData.map(c => (
                  <div key={c.name}>
                    <div className="flex justify-between text-xs mb-1.5">
                      <span className="text-slate-300">{c.name}</span>
                      <span style={{ color: c.color }} className="font-semibold">{c.score}%</span>
                    </div>
                    <div className="h-2 bg-slate-800 rounded-full">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${c.score}%`, background: c.color }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 pt-4 border-t border-slate-800">
                <div className="flex items-center gap-2 text-xs text-green-300">
                  <CheckCircle className="w-4 h-4" />
                  <span>Overall: 85% compliant</span>
                </div>
              </div>
            </div>
          </div>

          {/* ── Vector Engine Status ── */}
          <div className="glass rounded-2xl border border-cyan-500/10 p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-white font-semibold text-sm">BERT Vector Engine — Context Similarity Score</h2>
                <p className="text-slate-500 text-xs">128-dim embeddings · 13 context dimensions · FAISS IVFPQ index</p>
              </div>
              <div className="flex items-center gap-4">
                {[
                  { label: 'Vectors Indexed', value: '2.4M' },
                  { label: 'Index Size', value: '14.2 GB' },
                  { label: 'Query Latency', value: '4ms' },
                ].map(s => (
                  <div key={s.label} className="text-center hidden sm:block">
                    <div className="text-cyan-400 font-bold text-sm">{s.value}</div>
                    <div className="text-slate-600 text-xs">{s.label}</div>
                  </div>
                ))}
              </div>
            </div>
            <ResponsiveContainer width="100%" height={100}>
              <LineChart data={vectorScoreData}>
                <XAxis dataKey="time" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} />
                <YAxis domain={[0.7, 1.0]} tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} />
                <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 8, fontSize: 11 }} />
                <Line type="monotone" dataKey="score" stroke="#06b6d4" strokeWidth={2} dot={{ fill: '#06b6d4', r: 3 }} name="Similarity Score" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* ── Active Playbooks ── */}
          <div className="glass rounded-2xl border border-yellow-500/10 p-5">
            <h2 className="text-white font-semibold text-sm mb-1">Active n8n Response Playbooks</h2>
            <p className="text-slate-500 text-xs mb-4">Automated orchestration · Agentic AI decisions</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {[
                { name: 'Ransomware Containment', status: 'armed', triggers: 12, lastRun: '2 days ago', color: 'border-red-500/20 text-red-300' },
                { name: 'Phishing Auto-Quarantine', status: 'active', triggers: 47, lastRun: '10 min ago', color: 'border-orange-500/20 text-orange-300' },
                { name: 'Privilege Revocation', status: 'active', triggers: 8, lastRun: '8 min ago', color: 'border-yellow-500/20 text-yellow-300' },
                { name: 'Lateral Movement Block', status: 'armed', triggers: 3, lastRun: '2 min ago', color: 'border-cyan-500/20 text-cyan-300' },
                { name: 'Exfiltration Prevention', status: 'active', triggers: 19, lastRun: '15 min ago', color: 'border-purple-500/20 text-purple-300' },
                { name: 'Honeypot Alert → Isolate', status: 'armed', triggers: 5, lastRun: '31 min ago', color: 'border-green-500/20 text-green-300' },
              ].map(p => (
                <div key={p.name} className={`glass rounded-xl p-4 border ${p.color.split(' ')[0]}`}>
                  <div className="flex items-center justify-between mb-2">
                    <Zap className={`w-4 h-4 ${p.color.split(' ')[1]}`} />
                    <span className={`text-xs px-2 py-0.5 rounded-full ${p.status === 'active' ? 'bg-green-500/20 text-green-300' : 'bg-yellow-500/20 text-yellow-300'}`}>
                      {p.status}
                    </span>
                  </div>
                  <div className="text-white text-xs font-medium mb-1">{p.name}</div>
                  <div className="text-slate-500 text-xs">{p.triggers} triggers · {p.lastRun}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Footer note */}
          <div className="text-center py-4">
            <p className="text-slate-600 text-xs">
              NeuralNexus AC-COS · SRM IST Kattankulathur · Patent Pending IDF 25230 · Ajaysurya S
            </p>
          </div>

        </div>
      </main>
    </div>
  )
}

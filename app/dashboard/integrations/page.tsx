'use client'
import { useEffect, useState } from 'react'
import {
  Users, Server, RefreshCw, CheckCircle, XCircle, AlertTriangle,
  Link2, Settings, ChevronRight, Shield, Eye, Database, Zap,
  Radio, FileSearch, GitBranch, Lock, Wifi
} from 'lucide-react'

// ── Types ─────────────────────────────────────────────────────────────────────
interface IntegrationCard {
  id: string
  name: string
  category: 'identity' | 'siem' | 'edr' | 'vuln' | 'cmdb'
  vendor: string
  description: string
  icon: React.ElementType
  color: string
  status: 'connected' | 'disconnected' | 'error' | 'syncing' | 'demo'
  last_sync: string | null
  assets_synced: number
  users_synced: number
  enriches: string[]  // which AC-COS dimensions it enriches
}

interface ADStatus {
  connected: boolean
  domain: string
  domain_controller: string
  last_sync: string
  users_synced: number
  computers_synced: number
  groups_synced: number
  ous: string[]
  privileged_accounts: number
  forest_level: string
}

interface ADUser {
  cn: string
  sAMAccountName: string
  mail: string | null
  department: string
  memberOf: string[]
  lastLogon: string
  enabled: boolean
  privileged: boolean
}

// ── Config ────────────────────────────────────────────────────────────────────
const INTEGRATIONS: IntegrationCard[] = [
  {
    id: 'ad', name: 'Active Directory', category: 'identity', vendor: 'Microsoft',
    description: 'Sync users, computers, groups and OUs from on-premise AD. Enriches identity and privilege context dimensions.',
    icon: Users, color: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
    status: 'demo', last_sync: new Date(Date.now() - 15 * 60000).toISOString(),
    assets_synced: 5, users_synced: 6,
    enriches: ['D2 Identity', 'D7 Criticality', 'D13 Privilege'],
  },
  {
    id: 'ldap', name: 'LDAP / OpenLDAP', category: 'identity', vendor: 'OpenLDAP',
    description: 'Connect to any LDAP-compliant directory for user and group synchronization.',
    icon: GitBranch, color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
    status: 'disconnected', last_sync: null,
    assets_synced: 0, users_synced: 0,
    enriches: ['D2 Identity', 'D13 Privilege'],
  },
  {
    id: 'siem_splunk', name: 'Splunk SIEM', category: 'siem', vendor: 'Splunk',
    description: 'Pull threat detections, alerts and behavioral events from Splunk. Enriches threat intelligence context.',
    icon: Radio, color: 'text-orange-400 bg-orange-500/10 border-orange-500/20',
    status: 'disconnected', last_sync: null,
    assets_synced: 0, users_synced: 0,
    enriches: ['D3 Behavior', 'D5 Threat Intel', 'D10 Traffic'],
  },
  {
    id: 'siem_sentinel', name: 'Microsoft Sentinel', category: 'siem', vendor: 'Microsoft',
    description: 'Cloud-native SIEM with AI-powered threat detection. Pulls incident data and MITRE mappings.',
    icon: Shield, color: 'text-blue-300 bg-blue-400/10 border-blue-400/20',
    status: 'disconnected', last_sync: null,
    assets_synced: 0, users_synced: 0,
    enriches: ['D3 Behavior', 'D5 Threat Intel', 'D8 Compliance'],
  },
  {
    id: 'siem_qradar', name: 'IBM QRadar', category: 'siem', vendor: 'IBM',
    description: 'Enterprise SIEM with network flow analysis. Provides traffic and behavioral context enrichment.',
    icon: Database, color: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
    status: 'disconnected', last_sync: null,
    assets_synced: 0, users_synced: 0,
    enriches: ['D3 Behavior', 'D10 Traffic', 'D5 Threat Intel'],
  },
  {
    id: 'edr_crowdstrike', name: 'CrowdStrike Falcon', category: 'edr', vendor: 'CrowdStrike',
    description: 'Next-gen EDR for endpoint telemetry, process analysis and threat hunting data.',
    icon: Zap, color: 'text-red-400 bg-red-500/10 border-red-500/20',
    status: 'disconnected', last_sync: null,
    assets_synced: 0, users_synced: 0,
    enriches: ['D3 Behavior', 'D5 Threat Intel', 'D11 Application'],
  },
  {
    id: 'edr_defender', name: 'Microsoft Defender', category: 'edr', vendor: 'Microsoft',
    description: 'Built-in Windows endpoint protection with vulnerability assessment and attack surface reduction.',
    icon: Shield, color: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
    status: 'disconnected', last_sync: null,
    assets_synced: 0, users_synced: 0,
    enriches: ['D3 Behavior', 'D6 Vulnerability', 'D12 Patch'],
  },
  {
    id: 'vuln_nessus', name: 'Tenable Nessus', category: 'vuln', vendor: 'Tenable',
    description: 'Industry-leading vulnerability scanner. Populates CVE data, patch status and exploit availability.',
    icon: FileSearch, color: 'text-green-400 bg-green-500/10 border-green-500/20',
    status: 'disconnected', last_sync: null,
    assets_synced: 0, users_synced: 0,
    enriches: ['D5 Threat Intel', 'D6 Vulnerability', 'D12 Patch'],
  },
  {
    id: 'vuln_openvas', name: 'OpenVAS / GVM', category: 'vuln', vendor: 'Greenbone',
    description: 'Open-source vulnerability assessment system. Free alternative to commercial scanners.',
    icon: FileSearch, color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    status: 'disconnected', last_sync: null,
    assets_synced: 0, users_synced: 0,
    enriches: ['D5 Threat Intel', 'D6 Vulnerability'],
  },
  {
    id: 'cmdb_servicenow', name: 'ServiceNow CMDB', category: 'cmdb', vendor: 'ServiceNow',
    description: 'Sync asset classification, business ownership, and criticality metadata from IT Service Management.',
    icon: Server, color: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
    status: 'disconnected', last_sync: null,
    assets_synced: 0, users_synced: 0,
    enriches: ['D7 Criticality', 'D8 Compliance'],
  },
]

const CATEGORY_LABELS: Record<string, string> = {
  identity: 'Identity & Directory', siem: 'SIEM / Log Management',
  edr: 'EDR / Endpoint', vuln: 'Vulnerability Management', cmdb: 'CMDB / ITSM',
}

const STATUS_CFG = {
  connected: { label: 'Connected', color: 'text-green-400', dot: 'bg-green-400', border: 'border-green-500/20' },
  demo:      { label: 'Demo Mode', color: 'text-cyan-400',  dot: 'bg-cyan-400',  border: 'border-cyan-500/20' },
  syncing:   { label: 'Syncing…',  color: 'text-yellow-400',dot: 'bg-yellow-400',border: 'border-yellow-500/20' },
  error:     { label: 'Error',     color: 'text-red-400',   dot: 'bg-red-400',   border: 'border-red-500/20' },
  disconnected:{ label: 'Not Connected', color: 'text-slate-500', dot: 'bg-slate-600', border: 'border-slate-700' },
}

function timeAgo(s: string) {
  const d = (Date.now() - new Date(s).getTime()) / 1000
  if (d < 60) return `${Math.floor(d)}s ago`
  if (d < 3600) return `${Math.floor(d / 60)}m ago`
  return `${Math.floor(d / 3600)}h ago`
}

// ── AD Panel ──────────────────────────────────────────────────────────────────
function ADPanel() {
  const [status, setStatus] = useState<ADStatus | null>(null)
  const [users, setUsers] = useState<ADUser[]>([])
  const [tab, setTab] = useState<'overview' | 'users' | 'groups' | 'connect'>('overview')
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ host: '', username: '', password: '', baseDN: '' })

  useEffect(() => {
    Promise.all([
      fetch('/api/integrations/ad?action=status').then(r => r.json()),
      fetch('/api/integrations/ad?action=users').then(r => r.json()),
    ]).then(([s, u]) => {
      setStatus(s)
      setUsers(u.users ?? [])
    }).finally(() => setLoading(false))
  }, [])

  const testConnect = async () => {
    const res = await fetch('/api/integrations/ad', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const data = await res.json()
    alert(data.message ?? data.error)
  }

  if (loading) return (
    <div className="space-y-2">
      {[1,2,3].map(i => <div key={i} className="h-12 bg-slate-800 rounded-xl animate-pulse" />)}
    </div>
  )

  return (
    <div className="space-y-4">
      {/* Tab bar */}
      <div className="flex gap-1 p-1 bg-slate-900 rounded-xl">
        {(['overview','users','groups','connect'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-1 py-1.5 text-xs rounded-lg capitalize transition-all ${tab === t ? 'bg-slate-700 text-white' : 'text-slate-500 hover:text-slate-300'}`}>
            {t}
          </button>
        ))}
      </div>

      {tab === 'overview' && status && (
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Users', value: status.users_synced, color: 'text-cyan-400' },
              { label: 'Computers', value: status.computers_synced, color: 'text-purple-400' },
              { label: 'Groups', value: status.groups_synced, color: 'text-green-400' },
            ].map(s => (
              <div key={s.label} className="glass rounded-xl p-3 border border-slate-700/30 text-center">
                <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
                <div className="text-slate-500 text-xs">{s.label}</div>
              </div>
            ))}
          </div>
          <div className="glass rounded-xl p-4 border border-slate-700/30 space-y-2">
            <dl className="grid grid-cols-2 gap-2 text-xs">
              {[
                ['Domain', status.domain],
                ['DC', status.domain_controller],
                ['Privileged Accts', status.privileged_accounts],
                ['Forest Level', status.forest_level.replace('Windows','Win ').replace('Forest','')],
                ['Last Sync', status.last_sync ? timeAgo(status.last_sync) : '—'],
                ['OUs', status.ous.length],
              ].map(([k, v]) => (
                <div key={String(k)} className="flex justify-between">
                  <span className="text-slate-500">{k}</span>
                  <span className="text-slate-300 font-mono text-right max-w-32 truncate">{String(v)}</span>
                </div>
              ))}
            </dl>
          </div>
          <div>
            <p className="text-slate-500 text-xs mb-2">Organisational Units</p>
            <div className="space-y-1">
              {status.ous.map(ou => (
                <div key={ou} className="flex items-center gap-2 text-xs text-slate-400 p-2 rounded-lg bg-slate-900/50">
                  <GitBranch className="w-3 h-3 text-blue-400 flex-shrink-0" />
                  <span className="font-mono text-xs truncate">{ou}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === 'users' && (
        <div className="space-y-2 max-h-80 overflow-y-auto">
          {users.map(u => (
            <div key={u.sAMAccountName} className="glass rounded-xl p-3 border border-slate-700/30">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-white text-xs font-medium">{u.cn}</span>
                    {u.privileged && (
                      <span className="px-1.5 py-0.5 bg-red-500/20 text-red-400 text-xs rounded-full border border-red-500/30">⚠ Admin</span>
                    )}
                  </div>
                  <div className="text-slate-500 text-xs font-mono">{u.sAMAccountName} {u.mail ? `· ${u.mail}` : ''}</div>
                  <div className="text-slate-600 text-xs mt-1">{u.department}</div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="text-slate-500 text-xs">{timeAgo(u.lastLogon)}</div>
                  <div className={`text-xs mt-1 ${u.enabled ? 'text-green-400' : 'text-red-400'}`}>
                    {u.enabled ? '● Active' : '● Disabled'}
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap gap-1 mt-2">
                {u.memberOf.slice(0, 3).map(g => (
                  <span key={g} className="px-1.5 py-0.5 bg-slate-800 text-slate-500 text-xs rounded">
                    {g}
                  </span>
                ))}
                {u.memberOf.length > 3 && <span className="text-slate-600 text-xs">+{u.memberOf.length - 3}</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'groups' && (
        <div className="space-y-2 max-h-80 overflow-y-auto">
          {[
            { cn: 'Domain Admins', members: ['badmin'], type: 'Security', privileged: true },
            { cn: 'Domain Users', members: ['jsmith','ajohnson','badmin','schen','dokafor'], type: 'Distribution', privileged: false },
            { cn: 'Security-Team', members: ['jsmith'], type: 'Security', privileged: false },
            { cn: 'Developers', members: ['ajohnson'], type: 'Security', privileged: false },
            { cn: 'Finance-Dept', members: ['schen'], type: 'Security', privileged: false },
            { cn: 'GDPR-PII-Handlers', members: ['dokafor','schen'], type: 'Security', privileged: false },
            { cn: 'Service-Accounts', members: ['svc_backup'], type: 'Security', privileged: true },
          ].map(g => (
            <div key={g.cn} className="flex items-center justify-between p-3 glass rounded-xl border border-slate-700/30">
              <div className="flex items-center gap-2">
                <Users className={`w-4 h-4 ${g.privileged ? 'text-red-400' : 'text-blue-400'}`} />
                <div>
                  <div className="text-white text-xs font-medium">{g.cn}</div>
                  <div className="text-slate-500 text-xs">{g.type} · {g.members.length} members</div>
                </div>
              </div>
              {g.privileged && (
                <span className="px-2 py-0.5 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-full">Privileged</span>
              )}
            </div>
          ))}
        </div>
      )}

      {tab === 'connect' && (
        <div className="space-y-3">
          <p className="text-slate-400 text-xs">Configure AD/LDAP connection. This will sync identity data into AC-COS vector dimensions D2 and D13.</p>
          <div className="space-y-2">
            {[
              { key: 'host', label: 'LDAP Host / IP', placeholder: 'ldap://dc01.corp.local:389' },
              { key: 'username', label: 'Bind DN', placeholder: 'CN=neuralnexus,OU=ServiceAccounts,DC=corp,DC=local' },
              { key: 'password', label: 'Password', placeholder: '••••••••', type: 'password' },
              { key: 'baseDN', label: 'Base DN', placeholder: 'DC=corp,DC=local' },
            ].map(f => (
              <div key={f.key}>
                <label className="text-slate-400 text-xs block mb-1">{f.label}</label>
                <input
                  type={f.type ?? 'text'}
                  placeholder={f.placeholder}
                  value={form[f.key as keyof typeof form]}
                  onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 focus:border-cyan-500 rounded-lg text-xs text-white placeholder-slate-600 focus:outline-none"
                />
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <button
              onClick={testConnect}
              className="flex-1 py-2 bg-cyan-500 hover:bg-cyan-400 text-black font-semibold text-xs rounded-lg transition-all"
            >
              Test & Connect
            </button>
            <button className="px-4 py-2 glass border border-slate-700 hover:border-slate-500 text-slate-300 text-xs rounded-lg transition-all">
              Cancel
            </button>
          </div>
          <p className="text-slate-600 text-xs">⚠ In production, use TLS (ldaps://) and a read-only service account</p>
        </div>
      )}
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function IntegrationsPage() {
  const [selected, setSelected] = useState<string | null>(null)
  const categories = Array.from(new Set(INTEGRATIONS.map(i => i.category)))

  const connected = INTEGRATIONS.filter(i => i.status === 'connected' || i.status === 'demo').length
  const total = INTEGRATIONS.length

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Integrations</h1>
        <p className="text-slate-400 text-sm mt-1">
          Connect identity providers, SIEMs, EDR tools and scanners to enrich the 13-dimensional AC-COS context vector
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Connected', value: connected, icon: CheckCircle, color: 'text-green-400', border: 'border-green-500/20' },
          { label: 'Available', value: total, icon: Link2, color: 'text-cyan-400', border: 'border-cyan-500/20' },
          { label: 'Dimensions Enriched', value: 13, icon: Shield, color: 'text-purple-400', border: 'border-purple-500/20' },
          { label: 'Data Sources', value: 4, icon: Database, color: 'text-yellow-400', border: 'border-yellow-500/20' },
        ].map(s => (
          <div key={s.label} className={`glass rounded-xl p-4 border ${s.border}`}>
            <s.icon className={`w-5 h-5 ${s.color} mb-2`} />
            <div className={`text-3xl font-bold ${s.color}`}>{s.value}</div>
            <div className="text-slate-500 text-xs mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* ── Active / Demo Integrations ─────────────────────────────── */}
      <div className="glass rounded-2xl border border-cyan-500/30 p-5 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h2 className="text-white font-semibold flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-cyan-400" />
            Active Integrations
            <span className="px-2 py-0.5 text-xs bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 rounded-full">1 demo</span>
          </h2>
          <span className="text-slate-500 text-xs">Live data flowing into AC-COS 13D vector</span>
        </div>

        {/* AD card — always visible, fully expanded */}
        <div className="glass rounded-xl border border-blue-500/30 bg-blue-500/5 p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center border border-blue-500/30 bg-blue-500/10">
              <Users className="w-5 h-5 text-blue-400" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-white font-semibold">Active Directory</span>
                <span className="flex items-center gap-1 text-xs text-cyan-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                  Demo Mode
                </span>
                <span className="px-2 py-0.5 bg-purple-500/10 border border-purple-500/20 text-purple-300 text-xs rounded-full">D2 Identity</span>
                <span className="px-2 py-0.5 bg-purple-500/10 border border-purple-500/20 text-purple-300 text-xs rounded-full">D7 Criticality</span>
                <span className="px-2 py-0.5 bg-purple-500/10 border border-purple-500/20 text-purple-300 text-xs rounded-full">D13 Privilege</span>
              </div>
              <p className="text-slate-400 text-xs mt-0.5">
                Sync users, computers, groups and OUs from on-premise AD. Enriches identity and privilege context dimensions.
              </p>
            </div>
          </div>
          <ADPanel />
        </div>
      </div>

      {/* Vector dimension coverage */}
      <div className="glass rounded-2xl border border-slate-700/30 p-5">
        <h3 className="text-white text-sm font-semibold mb-4 flex items-center gap-2">
          <Shield className="w-4 h-4 text-purple-400" />
          13D Vector — Integration Coverage
        </h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-2">
          {[
            { d: 'D1', label: 'Network', sources: ['Agent'], covered: true },
            { d: 'D2', label: 'Identity', sources: ['AD', 'LDAP'], covered: true },
            { d: 'D3', label: 'Behavioral', sources: ['SIEM', 'EDR'], covered: false },
            { d: 'D4', label: 'Temporal', sources: ['Agent'], covered: true },
            { d: 'D5', label: 'Threat Intel', sources: ['SIEM', 'Nessus'], covered: false },
            { d: 'D6', label: 'Vuln', sources: ['Agent', 'Nessus'], covered: true },
            { d: 'D7', label: 'Criticality', sources: ['AD', 'CMDB'], covered: true },
            { d: 'D8', label: 'Compliance', sources: ['Agent', 'Sentinel'], covered: true },
            { d: 'D9', label: 'Geo', sources: ['Agent (ipinfo)'], covered: true },
            { d: 'D10', label: 'Traffic', sources: ['Agent', 'QRadar'], covered: true },
            { d: 'D11', label: 'App', sources: ['Agent', 'CrowdStrike'], covered: true },
            { d: 'D12', label: 'Patch', sources: ['Agent', 'Defender'], covered: true },
            { d: 'D13', label: 'Privilege', sources: ['AD', 'Agent'], covered: true },
          ].map(dim => (
            <div key={dim.d}
              className={`rounded-xl p-3 border text-center ${dim.covered ? 'border-cyan-500/20 bg-cyan-500/5' : 'border-slate-700/30 bg-slate-800/20'}`}
            >
              <div className={`text-xs font-bold font-mono ${dim.covered ? 'text-cyan-400' : 'text-slate-500'}`}>{dim.d}</div>
              <div className="text-slate-400 text-xs mt-0.5">{dim.label}</div>
              <div className={`text-xs mt-1 ${dim.covered ? 'text-green-400' : 'text-slate-600'}`}>
                {dim.covered ? '● live' : '○ pending'}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Integrations grid */}
      <div className="space-y-4">
        <h2 className="text-white font-semibold flex items-center gap-2">
          <Link2 className="w-5 h-5 text-slate-400" />
          All Integrations
          <span className="text-slate-500 text-sm font-normal">— click to configure</span>
        </h2>
        {categories.map(cat => (
          <div key={cat}>
            <h3 className="text-slate-500 text-xs font-semibold uppercase tracking-widest mb-2">
              {CATEGORY_LABELS[cat]}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {INTEGRATIONS.filter(i => i.category === cat).map(intg => {
                const cfg = STATUS_CFG[intg.status]
                const Icon = intg.icon
                const isOpen = selected === intg.id
                return (
                  <div key={intg.id} className="space-y-0">
                    <button
                      onClick={() => setSelected(isOpen ? null : intg.id)}
                      className={`w-full glass rounded-xl p-4 border text-left transition-all ${
                        isOpen ? 'rounded-b-none border-b-0 border-cyan-500/40 bg-cyan-500/5' : 'border-slate-700/30 hover:border-slate-600'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 border ${intg.color}`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-white text-sm font-medium">{intg.name}</span>
                            <span className={`flex items-center gap-1 text-xs ${cfg.color}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                              {cfg.label}
                            </span>
                          </div>
                          <div className="text-slate-500 text-xs mt-0.5">{intg.vendor}</div>
                        </div>
                        <ChevronRight className={`w-4 h-4 flex-shrink-0 transition-transform ${isOpen ? 'text-cyan-400 rotate-90' : 'text-slate-600'}`} />
                      </div>
                      <div className="flex flex-wrap gap-1 mt-3">
                        {intg.enriches.map(d => (
                          <span key={d} className="px-1.5 py-0.5 bg-purple-500/10 border border-purple-500/20 text-purple-400 text-xs rounded-full">
                            {d}
                          </span>
                        ))}
                      </div>
                    </button>

                    {/* Inline expand for non-AD integrations */}
                    {isOpen && intg.id !== 'ad' && (
                      <div className="glass border border-t-0 border-cyan-500/40 bg-cyan-500/5 rounded-b-xl p-4 space-y-3">
                        <p className="text-slate-400 text-xs leading-relaxed">{intg.description}</p>
                        <button className="w-full py-2 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 hover:border-cyan-500/60 text-cyan-300 text-xs rounded-xl transition-all">
                          Configure Integration →
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

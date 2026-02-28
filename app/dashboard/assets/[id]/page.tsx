'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Asset, PortInfo, ServiceInfo, RiskFactors } from '@/lib/types/assets'
import { getRiskLevel } from '@/lib/risk-engine'
import {
  Server, Monitor, Wifi, Database, Cloud, Cpu,
  ArrowLeft, Shield, AlertTriangle, Clock, Globe,
  User, Tag, Activity, Terminal, ChevronRight
} from 'lucide-react'

// ── Helpers ────────────────────────────────────────────────────────────────────
const TYPE_ICONS: Record<string, React.ElementType> = {
  server: Server, endpoint: Monitor, network: Wifi,
  database: Database, cloud: Cloud, iot: Cpu, unknown: Server,
}
const TYPE_COLORS: Record<string, string> = {
  server: 'text-blue-400 bg-blue-500/10',
  endpoint: 'text-cyan-400 bg-cyan-500/10',
  network: 'text-purple-400 bg-purple-500/10',
  database: 'text-yellow-400 bg-yellow-500/10',
  cloud: 'text-green-400 bg-green-500/10',
  iot: 'text-orange-400 bg-orange-500/10',
  unknown: 'text-slate-400 bg-slate-500/10',
}
const STATUS_COLORS: Record<string, string> = {
  active: 'text-green-300 bg-green-500/10 border-green-500/20',
  warning: 'text-yellow-300 bg-yellow-500/10 border-yellow-500/20',
  critical: 'text-red-300 bg-red-500/10 border-red-500/20',
  inactive: 'text-slate-400 bg-slate-500/10 border-slate-500/20',
  unknown: 'text-slate-500 bg-slate-800 border-slate-700',
}

function timeAgo(dateStr: string): string {
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000
  if (diff < 60) return `${Math.floor(diff)}s ago`
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

function formatUptime(seconds: number | null): string {
  if (!seconds) return 'N/A'
  const d = Math.floor(seconds / 86400)
  const h = Math.floor((seconds % 86400) / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (d > 0) return `${d}d ${h}h ${m}m`
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

// ── Risk Factor Bar ────────────────────────────────────────────────────────────
function RiskFactorBar({ label, score, max }: { label: string; score: number; max: number }) {
  const pct = (score / max) * 100
  const color = pct >= 80 ? 'bg-red-500' : pct >= 60 ? 'bg-orange-500' : pct >= 40 ? 'bg-yellow-500' : 'bg-green-500'
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-slate-400">{label}</span>
        <span className="text-slate-300 font-mono">{score} / {max}</span>
      </div>
      <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-700 ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

// ── Main ───────────────────────────────────────────────────────────────────────
export default function AssetDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string
  const [asset, setAsset] = useState<Asset | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/assets/${id}`)
      .then(r => r.ok ? r.json() : null)
      .then(json => { if (json) setAsset(json.asset) })
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return (
    <div className="p-6 space-y-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="glass rounded-2xl p-6 border border-slate-700/30">
          <div className="h-4 bg-slate-800 rounded animate-pulse w-1/3 mb-4" />
          <div className="grid grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, j) => (
              <div key={j} className="h-3 bg-slate-800 rounded animate-pulse" />
            ))}
          </div>
        </div>
      ))}
    </div>
  )

  if (!asset) return (
    <div className="p-6 flex flex-col items-center justify-center min-h-96">
      <AlertTriangle className="w-16 h-16 text-slate-700 mb-4" />
      <h2 className="text-white text-xl font-bold">Asset Not Found</h2>
      <p className="text-slate-500 text-sm mt-2">This asset may have been removed from inventory</p>
      <Link href="/dashboard/assets" className="mt-6 flex items-center gap-2 text-cyan-400 hover:text-cyan-300 text-sm">
        <ArrowLeft className="w-4 h-4" /> Back to Inventory
      </Link>
    </div>
  )

  const TypeIcon = TYPE_ICONS[asset.asset_type] ?? Server
  const typeColor = TYPE_COLORS[asset.asset_type]
  const risk = getRiskLevel(asset.risk_score)
  const openPorts = (asset.open_ports as PortInfo[]).filter(p => p.state === 'open')
  const services = asset.services as ServiceInfo[]
  const riskFactors = asset.risk_factors as RiskFactors | null

  return (
    <div className="p-6 space-y-6">
      {/* ── Breadcrumb + Header ── */}
      <div>
        <nav className="flex items-center gap-2 text-xs text-slate-500 mb-4">
          <Link href="/dashboard" className="hover:text-slate-300">Dashboard</Link>
          <ChevronRight className="w-3 h-3" />
          <Link href="/dashboard/assets" className="hover:text-slate-300">Assets</Link>
          <ChevronRight className="w-3 h-3" />
          <span className="text-slate-300">{asset.hostname}</span>
        </nav>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${typeColor}`}>
              <TypeIcon className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">{asset.hostname}</h1>
              {asset.fqdn && <p className="text-slate-500 text-sm font-mono">{asset.fqdn}</p>}
              <div className="flex items-center gap-2 mt-2">
                <span className={`px-2.5 py-0.5 rounded-full text-xs border ${STATUS_COLORS[asset.status]}`}>
                  {asset.status}
                </span>
                <span className="text-slate-600 text-xs">|</span>
                <span className="text-slate-500 text-xs capitalize">{asset.asset_type}</span>
                {asset.is_managed && (
                  <span className="px-2 py-0.5 bg-green-500/10 text-green-400 text-xs rounded-full border border-green-500/20">
                    ● agent-managed
                  </span>
                )}
              </div>
            </div>
          </div>
          <Link
            href="/dashboard/assets"
            className="flex items-center gap-1.5 px-3 py-2 glass border border-slate-700 rounded-lg text-slate-400 hover:text-white text-sm transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Link>
        </div>
      </div>

      {/* ── Top Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Risk Score', value: asset.risk_score, suffix: '/ 100', icon: Shield, color: risk.color },
          { label: 'Open Ports', value: openPorts.length, suffix: 'ports', icon: Globe, color: 'text-cyan-400' },
          { label: 'Vulnerabilities', value: asset.vuln_count, suffix: 'CVEs', icon: AlertTriangle, color: asset.vuln_count > 0 ? 'text-red-400' : 'text-green-400' },
          { label: 'Uptime', value: formatUptime(asset.uptime_seconds), suffix: '', icon: Clock, color: 'text-purple-400' },
        ].map(c => (
          <div key={c.label} className="glass rounded-xl p-4 border border-slate-700/30">
            <div className="flex items-center gap-2 mb-2">
              <c.icon className={`w-4 h-4 ${c.color}`} />
              <span className="text-slate-500 text-xs">{c.label}</span>
            </div>
            <div className={`text-2xl font-bold ${c.color}`}>{c.value}</div>
            {c.suffix && <div className="text-slate-600 text-xs">{c.suffix}</div>}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Identity & Network ── */}
        <div className="space-y-4">
          <div className="glass rounded-2xl border border-slate-700/30 p-5">
            <h3 className="text-white text-sm font-semibold mb-4 flex items-center gap-2">
              <Globe className="w-4 h-4 text-cyan-400" />
              Network Identity
            </h3>
            <dl className="space-y-3">
              {[
                { label: 'IP Address', value: asset.ip_address ?? '—' },
                { label: 'MAC Address', value: asset.mac_address ?? '—', mono: true },
                { label: 'Subnet', value: asset.subnet ?? '—' },
                { label: 'FQDN', value: asset.fqdn ?? '—' },
                { label: 'First Seen', value: new Date(asset.first_seen).toLocaleString() },
                { label: 'Last Seen', value: `${timeAgo(asset.last_seen)}` },
              ].map(({ label, value, mono }) => (
                <div key={label} className="flex justify-between items-start gap-4">
                  <dt className="text-slate-500 text-xs flex-shrink-0">{label}</dt>
                  <dd className={`text-right text-xs ${mono ? 'font-mono text-slate-300' : 'text-slate-300'}`}>{value}</dd>
                </div>
              ))}
            </dl>
          </div>

          {/* Owner Info */}
          <div className="glass rounded-2xl border border-slate-700/30 p-5">
            <h3 className="text-white text-sm font-semibold mb-4 flex items-center gap-2">
              <User className="w-4 h-4 text-purple-400" />
              Ownership
            </h3>
            <dl className="space-y-3">
              {[
                { label: 'Owner', value: asset.owner_name ?? '—' },
                { label: 'Email', value: asset.owner_email ?? '—' },
                { label: 'Department', value: asset.department ?? '—' },
                { label: 'AD Group', value: asset.ad_group ?? '—' },
                { label: 'Location', value: asset.location ?? '—' },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between items-start gap-4">
                  <dt className="text-slate-500 text-xs flex-shrink-0">{label}</dt>
                  <dd className="text-right text-xs text-slate-300">{value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>

        {/* ── OS + Risk Analysis ── */}
        <div className="space-y-4">
          <div className="glass rounded-2xl border border-slate-700/30 p-5">
            <h3 className="text-white text-sm font-semibold mb-4 flex items-center gap-2">
              <Terminal className="w-4 h-4 text-green-400" />
              System Info
            </h3>
            <dl className="space-y-3">
              {[
                { label: 'OS Name', value: asset.os_name ?? '—' },
                { label: 'OS Version', value: asset.os_version ?? '—' },
                { label: 'Architecture', value: asset.os_arch ?? '—' },
                { label: 'Manufacturer', value: asset.manufacturer ?? '—' },
                { label: 'Model', value: asset.model ?? '—' },
                { label: 'Discovery', value: asset.discovery_method },
                { label: 'Agent Version', value: asset.agent_version ?? 'N/A' },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between items-start gap-4">
                  <dt className="text-slate-500 text-xs flex-shrink-0">{label}</dt>
                  <dd className="text-right text-xs text-slate-300 capitalize">{value}</dd>
                </div>
              ))}
            </dl>
          </div>

          {/* Risk Breakdown */}
          <div className="glass rounded-2xl border border-slate-700/30 p-5">
            <h3 className="text-white text-sm font-semibold mb-4 flex items-center gap-2">
              <Shield className="w-4 h-4 text-red-400" />
              Risk Breakdown
              <span className={`ml-auto text-xs font-bold ${risk.color}`}>{asset.risk_score} — {risk.label}</span>
            </h3>
            {riskFactors ? (
              <div className="space-y-3">
                <RiskFactorBar label="Open Ports" score={riskFactors.open_ports ?? 0} max={25} />
                <RiskFactorBar label="OS Age / EOL" score={riskFactors.os_age ?? 0} max={20} />
                <RiskFactorBar label="Privilege / Type" score={riskFactors.privilege ?? 0} max={20} />
                <RiskFactorBar label="Recency (last seen)" score={riskFactors.recency ?? 0} max={15} />
                <RiskFactorBar label="Vulnerabilities" score={riskFactors.vuln_count ?? 0} max={20} />
              </div>
            ) : (
              <p className="text-slate-600 text-xs">Risk factors not available. Run a scan to compute detailed breakdown.</p>
            )}
          </div>
        </div>

        {/* ── Ports + Services ── */}
        <div className="space-y-4">
          <div className="glass rounded-2xl border border-slate-700/30 p-5">
            <h3 className="text-white text-sm font-semibold mb-4 flex items-center gap-2">
              <Globe className="w-4 h-4 text-cyan-400" />
              Open Ports ({openPorts.length})
            </h3>
            {openPorts.length === 0 ? (
              <p className="text-slate-600 text-xs">No open ports detected</p>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {openPorts.map(p => (
                  <div key={p.port} className="flex items-center justify-between p-2 rounded-lg bg-slate-900/50">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-cyan-400 w-12">{p.port}</span>
                      <span className="text-slate-500 text-xs">{p.protocol}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-slate-300 text-xs">{p.service}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="glass rounded-2xl border border-slate-700/30 p-5">
            <h3 className="text-white text-sm font-semibold mb-4 flex items-center gap-2">
              <Activity className="w-4 h-4 text-purple-400" />
              Running Services ({services.length})
            </h3>
            {services.length === 0 ? (
              <p className="text-slate-600 text-xs">No service data available</p>
            ) : (
              <div className="space-y-2 max-h-52 overflow-y-auto">
                {services.map((s, i) => (
                  <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-slate-900/50">
                    <div>
                      <div className="text-slate-300 text-xs">{s.name}</div>
                      {s.version && <div className="text-slate-600 text-xs">{s.version}</div>}
                    </div>
                    <span className={`text-xs ${s.status === 'running' ? 'text-green-400' : 'text-red-400'}`}>
                      {s.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Tags */}
          {asset.tags && asset.tags.length > 0 && (
            <div className="glass rounded-2xl border border-slate-700/30 p-5">
              <h3 className="text-white text-sm font-semibold mb-3 flex items-center gap-2">
                <Tag className="w-4 h-4 text-yellow-400" />
                Tags
              </h3>
              <div className="flex flex-wrap gap-2">
                {asset.tags.map(tag => (
                  <span key={tag} className="px-2 py-1 bg-slate-800 text-slate-400 text-xs rounded-lg">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

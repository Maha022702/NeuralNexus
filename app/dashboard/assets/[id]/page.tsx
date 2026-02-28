'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Asset, VectorContext } from '@/lib/types/assets'
import { getRiskLevel, DIMENSION_META } from '@/lib/risk-engine'
import {
  Server, Monitor, Wifi, Database, Cloud, Cpu,
  ArrowLeft, Shield, AlertTriangle, ChevronRight, ChevronDown, Clock,
} from 'lucide-react'

const TYPE_ICONS: Record<string, React.ElementType> = {
  server: Server, endpoint: Monitor, network: Wifi,
  database: Database, cloud: Cloud, iot: Cpu, unknown: Server,
}
const TYPE_COLORS: Record<string, string> = {
  server:   'text-blue-400 bg-blue-500/10',
  endpoint: 'text-cyan-400 bg-cyan-500/10',
  network:  'text-purple-400 bg-purple-500/10',
  database: 'text-yellow-400 bg-yellow-500/10',
  cloud:    'text-green-400 bg-green-500/10',
  iot:      'text-orange-400 bg-orange-500/10',
  unknown:  'text-slate-400 bg-slate-500/10',
}
const STATUS_COLORS: Record<string, string> = {
  active:   'text-green-300 bg-green-500/10 border-green-500/20',
  warning:  'text-yellow-300 bg-yellow-500/10 border-yellow-500/20',
  critical: 'text-red-300 bg-red-500/10 border-red-500/20',
  inactive: 'text-slate-400 bg-slate-500/10 border-slate-500/20',
  unknown:  'text-slate-500 bg-slate-800 border-slate-700',
}

function timeAgo(dateStr: string): string {
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000
  if (diff < 60)    return `${Math.floor(diff)}s ago`
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

function formatVal(v: unknown): string {
  if (v === null || v === undefined || v === '') return '—'
  if (typeof v === 'boolean') return v ? 'yes' : 'no'
  if (Array.isArray(v)) return v.length > 0 ? v.join(', ') : 'none'
  return String(v)
}

function DimCard({
  dim, vc, expanded, onToggle,
}: {
  dim: typeof DIMENSION_META[number]
  vc: VectorContext
  expanded: boolean
  onToggle: () => void
}) {
  const dimData    = vc[dim.key as keyof VectorContext] as Record<string, unknown> | undefined
  const score      = (dimData?.score as number) ?? 0
  const pct        = Math.min((score / dim.max) * 100, 100)
  const barColor   = pct >= 80 ? 'bg-red-500' : pct >= 60 ? 'bg-orange-500' : pct >= 40 ? 'bg-yellow-500' : pct >= 20 ? 'bg-cyan-500' : 'bg-green-500'
  const scoreColor = pct >= 80 ? 'text-red-400' : pct >= 60 ? 'text-orange-400' : pct >= 40 ? 'text-yellow-400' : 'text-green-400'
  const borderColor = expanded
    ? 'border-purple-500/30'
    : pct >= 80 ? 'border-red-500/20' : pct >= 60 ? 'border-orange-500/20' : pct >= 40 ? 'border-yellow-500/20' : 'border-slate-700/30'

  const details: { k: string; v: string }[] = []
  if (dimData) {
    Object.entries(dimData).forEach(([k, v]) => {
      if (k === 'score') return
      details.push({ k: k.replace(/_/g, ' '), v: formatVal(v) })
    })
  }

  return (
    <div className={`glass rounded-xl border ${borderColor} transition-all duration-200 ${expanded ? 'ring-1 ring-purple-500/20' : ''}`}>
      <button className="w-full p-4 text-left" onClick={onToggle}>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-xl flex-shrink-0">{dim.icon}</span>
            <div className="min-w-0">
              <div className="text-white text-xs font-semibold truncate">{dim.label}</div>
              <div className="text-slate-600 text-xs font-mono">{dim.key.toUpperCase()}</div>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="text-right">
              <div className={`text-base font-bold ${scoreColor}`}>{score}</div>
              <div className="text-slate-600 text-xs">/ {dim.max}</div>
            </div>
            {expanded
              ? <ChevronDown  className="w-4 h-4 text-purple-400" />
              : <ChevronRight className="w-4 h-4 text-slate-600" />
            }
          </div>
        </div>
        <div className="mt-3 h-1.5 bg-slate-800 rounded-full overflow-hidden">
          <div className={`h-full rounded-full transition-all duration-700 ${barColor}`} style={{ width: `${pct}%` }} />
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 border-t border-slate-800 pt-3 space-y-2">
          {details.length === 0 ? (
            <p className="text-slate-600 text-xs italic">No data collected</p>
          ) : (
            details.map(d => (
              <div key={d.k} className="flex justify-between items-start gap-3">
                <span className="text-slate-500 text-xs capitalize flex-shrink-0 w-28">{d.k}</span>
                <span className="text-slate-300 text-xs text-right font-mono break-all">{d.v}</span>
              </div>
            ))
          )}
          <p className="text-slate-700 text-xs pt-2 italic border-t border-slate-800/50">{dim.desc}</p>
        </div>
      )}
    </div>
  )
}

export default function AssetDetailPage() {
  const params = useParams()
  const id = params.id as string
  const [asset, setAsset] = useState<Asset | null>(null)
  const [loading, setLoading] = useState(true)
  const [expandedDim, setExpandedDim] = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/assets/${id}`)
      .then(r => r.ok ? r.json() : null)
      .then(json => { if (json) setAsset(json.asset) })
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return (
    <div className="p-6 space-y-4">
      <div className="h-32 bg-slate-800 rounded-2xl animate-pulse" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {Array.from({ length: 13 }).map((_, i) => (
          <div key={i} className="h-24 bg-slate-800 rounded-xl animate-pulse" />
        ))}
      </div>
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

  const TypeIcon  = TYPE_ICONS[asset.asset_type] ?? Server
  const typeColor = TYPE_COLORS[asset.asset_type]
  const risk      = getRiskLevel(asset.risk_score)
  const vc        = asset.vector_context as VectorContext | null
  const hasVector = !!vc && typeof vc === 'object' && Object.keys(vc).length > 0
  const vcMeta    = vc as unknown as Record<string, unknown>
  const allExpanded = expandedDim === 'all'

  return (
    <div className="p-6 space-y-6">

      {/* ── Header card ── */}
      <div>
        <nav className="flex items-center gap-2 text-xs text-slate-500 mb-4">
          <Link href="/dashboard" className="hover:text-slate-300">Dashboard</Link>
          <ChevronRight className="w-3 h-3" />
          <Link href="/dashboard/assets" className="hover:text-slate-300">Assets</Link>
          <ChevronRight className="w-3 h-3" />
          <span className="text-slate-300">{asset.hostname}</span>
        </nav>

        <div className="glass rounded-2xl border border-slate-700/30 p-5">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-4">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 ${typeColor}`}>
                <TypeIcon className="w-7 h-7" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">{asset.hostname}</h1>
                {asset.fqdn && <p className="text-slate-500 text-sm font-mono">{asset.fqdn}</p>}
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  <span className={`px-2.5 py-0.5 rounded-full text-xs border ${STATUS_COLORS[asset.status] ?? STATUS_COLORS.unknown}`}>
                    {asset.status}
                  </span>
                  <span className="text-slate-600 text-xs capitalize">{asset.asset_type}</span>
                  {asset.is_managed && (
                    <span className="px-2 py-0.5 bg-green-500/10 text-green-400 text-xs rounded-full border border-green-500/20">
                      ● agent-managed
                    </span>
                  )}
                  {hasVector && (
                    <span className="px-2 py-0.5 bg-purple-500/10 text-purple-300 text-xs rounded-full border border-purple-500/20">
                      ◆ 13D enriched
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-center glass rounded-xl border border-slate-700/30 px-4 py-3">
                <div className={`text-2xl font-bold ${risk.color}`}>{asset.risk_score}</div>
                <div className="text-slate-500 text-xs">/ 100</div>
                <div className={`text-xs font-semibold ${risk.color}`}>{risk.label}</div>
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

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4 pt-4 border-t border-slate-800">
            {[
              { label: 'OS', value: `${asset.os_name ?? '—'} ${asset.os_version ?? ''}`.trim() },
              { label: 'IP Address', value: asset.ip_address ?? '—', mono: true },
              { label: 'Last Seen', value: timeAgo(asset.last_seen) },
              { label: 'Agent Version', value: asset.agent_version ?? 'N/A' },
            ].map(s => (
              <div key={s.label}>
                <div className="text-slate-600 text-xs">{s.label}</div>
                <div className={`text-slate-300 text-xs mt-0.5 truncate ${s.mono ? 'font-mono' : ''}`}>{s.value}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── 13D Vector Context Panel ── */}
      <div className="glass rounded-2xl border border-purple-500/20 p-5 space-y-5">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h2 className="text-white font-semibold flex items-center gap-2">
            <Shield className="w-5 h-5 text-purple-400" />
            13-Dimensional Context Vector
          </h2>
          <div className="flex items-center gap-3">
            {hasVector && Boolean(vcMeta.collected_at) && (
              <span className="text-slate-500 text-xs flex items-center gap-1.5">
                <Clock className="w-3 h-3" />
                {new Date(String(vcMeta.collected_at)).toLocaleString()}
              </span>
            )}
            <span className={`px-2.5 py-0.5 rounded-full text-xs border ${
              hasVector
                ? 'bg-purple-500/10 border-purple-500/30 text-purple-300'
                : 'bg-slate-800 border-slate-700 text-slate-500'
            }`}>
              {hasVector ? '13/13 dimensions' : 'awaiting agent'}
            </span>
            {hasVector && (
              <button
                onClick={() => setExpandedDim(allExpanded ? null : 'all')}
                className="text-xs text-slate-500 hover:text-slate-300 underline underline-offset-2 transition-colors"
              >
                {allExpanded ? 'Collapse all' : 'Expand all'}
              </button>
            )}
          </div>
        </div>

        {!hasVector ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-16 h-16 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center mb-4">
              <Shield className="w-8 h-8 text-purple-400 opacity-40" />
            </div>
            <p className="text-slate-400 font-medium">No vector context collected yet</p>
            <p className="text-slate-600 text-xs mt-2 max-w-md">
              Run the AC-COS agent v2.0+ on this machine to collect all 13 dimensions.
            </p>
            <div className="mt-4 space-y-2">
              <div className="px-4 py-2 bg-slate-900 rounded-xl border border-slate-700 font-mono text-xs text-cyan-400">
                NEURALNEXUS_USER_ID=... ./agent.sh
              </div>
              <div className="px-4 py-2 bg-slate-900 rounded-xl border border-slate-700 font-mono text-xs text-blue-400">
                $env:NEURALNEXUS_USER_ID=&quot;...&quot;; .\agent.ps1
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {DIMENSION_META.map(dim => (
                <DimCard
                  key={dim.key}
                  dim={dim}
                  vc={vc!}
                  expanded={allExpanded || expandedDim === dim.key}
                  onToggle={() => {
                    if (allExpanded) {
                      setExpandedDim(null)
                    } else {
                      setExpandedDim(prev => prev === dim.key ? null : dim.key)
                    }
                  }}
                />
              ))}
            </div>
            {vcMeta.collection_version && (
              <div className="text-slate-700 text-xs pt-2 border-t border-slate-800">
                Collected by agent v{String(vcMeta.collection_version)} · click any dimension card to expand
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

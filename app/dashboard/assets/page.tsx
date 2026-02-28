'use client'
import { useEffect, useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Asset, AssetScan, ScanLogEntry } from '@/lib/types/assets'
import { getRiskLevel } from '@/lib/risk-engine'
import {
  Server, Wifi, Database, Monitor, Cloud, Cpu,
  Search, Filter, RefreshCw, Download, Play, Square,
  ChevronRight, AlertTriangle, CheckCircle, Clock,
  Terminal, ExternalLink, Plus, Trash2, Eye, Copy, Check
} from 'lucide-react'

// ── Helpers ───────────────────────────────────────────────────────────────────
const ASSET_TYPE_ICONS: Record<string, React.ElementType> = {
  server: Server, endpoint: Monitor, network: Wifi,
  database: Database, cloud: Cloud, iot: Cpu, unknown: Server,
}

const ASSET_TYPE_COLORS: Record<string, string> = {
  server: 'text-blue-400 bg-blue-500/10',
  endpoint: 'text-cyan-400 bg-cyan-500/10',
  network: 'text-purple-400 bg-purple-500/10',
  database: 'text-yellow-400 bg-yellow-500/10',
  cloud: 'text-green-400 bg-green-500/10',
  iot: 'text-orange-400 bg-orange-500/10',
  unknown: 'text-slate-400 bg-slate-500/10',
}

const STATUS_CONFIG: Record<string, { color: string; dot: string; label: string }> = {
  active: { color: 'text-green-300 bg-green-500/10', dot: 'bg-green-400', label: 'Active' },
  warning: { color: 'text-yellow-300 bg-yellow-500/10', dot: 'bg-yellow-400', label: 'Warning' },
  critical: { color: 'text-red-300 bg-red-500/10', dot: 'bg-red-400', label: 'Critical' },
  inactive: { color: 'text-slate-400 bg-slate-500/10', dot: 'bg-slate-500', label: 'Inactive' },
  unknown: { color: 'text-slate-500 bg-slate-800', dot: 'bg-slate-600', label: 'Unknown' },
}

function formatUptime(seconds: number | null): string {
  if (!seconds) return 'N/A'
  const d = Math.floor(seconds / 86400)
  const h = Math.floor((seconds % 86400) / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (d > 0) return `${d}d ${h}h`
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

function timeAgo(dateStr: string): string {
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000
  if (diff < 60) return `${Math.floor(diff)}s ago`
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

function exportCSV(assets: Asset[]) {
  const headers = ['Hostname', 'IP', 'MAC', 'Type', 'OS', 'Risk Score', 'Status', 'Open Ports', 'Last Seen', 'Discovery Method']
  const rows = assets.map(a => [
    a.hostname, a.ip_address ?? '', a.mac_address ?? '',
    a.asset_type, `${a.os_name ?? ''} ${a.os_version ?? ''}`.trim(),
    a.risk_score, a.status,
    (a.open_ports as { port: number }[]).filter(p => (p as { state?: string }).state !== 'closed').length,
    a.last_seen, a.discovery_method,
  ])
  const csv = [headers, ...rows].map(r => r.join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = `ac-cos-assets-${Date.now()}.csv`; a.click()
  URL.revokeObjectURL(url)
}

// ── Copy Button ───────────────────────────────────────────────────────────────
function CopyButton({ text, className = '' }: { text: string; className?: string }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button
      onClick={copy}
      className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs transition-all ${
        copied
          ? 'bg-green-500/20 text-green-400 border border-green-500/30'
          : 'bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700'
      } ${className}`}
    >
      {copied ? <><Check className="w-3 h-3" />Copied!</> : <><Copy className="w-3 h-3" />Copy</>}
    </button>
  )
}

// ── Scan Panel ────────────────────────────────────────────────────────────────
function ScanPanel({
  scanning, scanProgress, scanLogs, lastScan,
  onStartScan, onStopScan, userId,
}: {
  scanning: boolean
  scanProgress: number
  scanLogs: ScanLogEntry[]
  lastScan: AssetScan | null
  onStartScan: (type: 'quick' | 'full') => void
  onStopScan: () => void
  userId: string
}) {
  const logRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight
  }, [scanLogs])

  const logColors = { info: 'text-slate-400', warn: 'text-yellow-400', error: 'text-red-400', success: 'text-green-400' }

  return (
    <div className="glass rounded-2xl border border-cyan-500/15 overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
        <div>
          <h2 className="text-white font-semibold text-sm flex items-center gap-2">
            <Wifi className="w-4 h-4 text-cyan-400" />
            Discovery Scan Control
          </h2>
          <p className="text-slate-500 text-xs mt-0.5">
            Push (agent heartbeat) + Pull (TCP/DNS/ping sweep)
          </p>
        </div>
        <div className="flex items-center gap-2">
          {!scanning ? (
            <>
              <button
                onClick={() => onStartScan('quick')}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-black font-semibold text-xs rounded-lg transition-all"
              >
                <Play className="w-3 h-3" />
                Quick Scan
              </button>
              <button
                onClick={() => onStartScan('full')}
                className="flex items-center gap-1.5 px-3 py-1.5 glass border border-cyan-500/30 hover:border-cyan-500/60 text-cyan-300 text-xs rounded-lg transition-all"
              >
                <Play className="w-3 h-3" />
                Full Scan
              </button>
            </>
          ) : (
            <button
              onClick={onStopScan}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/20 border border-red-500/30 hover:bg-red-500/30 text-red-300 text-xs rounded-lg transition-all"
            >
              <Square className="w-3 h-3" />
              Stop
            </button>
          )}
        </div>
      </div>

      <div className="p-5 grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Progress */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400">
              {scanning ? `Scanning... ${scanProgress}%` : lastScan ? `Last scan: ${timeAgo(lastScan.started_at)}` : 'No scans yet'}
            </span>
            {scanning && <span className="text-cyan-400 font-mono">{scanProgress}%</span>}
          </div>
          <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${scanning ? 'bg-gradient-to-r from-cyan-500 to-purple-500' : 'bg-green-500'}`}
              style={{ width: `${scanProgress}%` }}
            />
          </div>

          {lastScan && !scanning && (
            <div className="grid grid-cols-3 gap-2 mt-2">
              {[
                { label: 'Found', value: lastScan.assets_found, color: 'text-cyan-400' },
                { label: 'New', value: lastScan.assets_new, color: 'text-green-400' },
                { label: 'Updated', value: lastScan.assets_updated, color: 'text-yellow-400' },
              ].map(s => (
                <div key={s.label} className="glass rounded-xl p-3 text-center">
                  <div className={`text-xl font-bold ${s.color}`}>{s.value}</div>
                  <div className="text-slate-500 text-xs">{s.label}</div>
                </div>
              ))}
            </div>
          )}

          {/* Agent install section */}
          <div className="mt-3 p-3 rounded-xl bg-purple-500/5 border border-purple-500/20 space-y-3">
            <p className="text-purple-300 text-xs font-medium">📡 Push Agent — Install on endpoints</p>

            {/* User ID box */}
            <div className="rounded-lg bg-slate-950 border border-cyan-500/20 p-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-slate-500 text-xs">Your User ID</span>
                <CopyButton text={userId} />
              </div>
              <div className="font-mono text-xs text-cyan-300 break-all select-all">
                {userId || 'Loading...'}
              </div>
            </div>

            {/* Run commands */}
            {userId && (
              <div className="space-y-1.5">
                <p className="text-slate-500 text-xs">Run on your machine:</p>
                <div className="rounded-lg bg-slate-950 border border-slate-800 p-2 group relative">
                  <code className="text-green-400 text-xs break-all">
                    NEURALNEXUS_USER_ID=<span className="text-cyan-300">{userId}</span> bash agent.sh
                  </code>
                  <CopyButton text={`NEURALNEXUS_USER_ID=${userId} bash agent.sh`} className="absolute top-2 right-2 opacity-0 group-hover:opacity-100" />
                </div>
                <div className="rounded-lg bg-slate-950 border border-slate-800 p-2 group relative">
                  <code className="text-blue-400 text-xs break-all">
                    $env:NEURALNEXUS_USER_ID="<span className="text-cyan-300">{userId}</span>"; .\agent.ps1
                  </code>
                  <CopyButton text={`$env:NEURALNEXUS_USER_ID="${userId}"; .\agent.ps1`} className="absolute top-2 right-2 opacity-0 group-hover:opacity-100" />
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <a
                href="/agents/agent.sh"
                download
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors text-xs text-slate-300"
              >
                <Terminal className="w-3 h-3 text-green-400" />Linux/macOS
                <Download className="w-3 h-3 text-slate-500 ml-auto" />
              </a>
              <a
                href="/agents/agent.ps1"
                download
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors text-xs text-slate-300"
              >
                <Terminal className="w-3 h-3 text-blue-400" />Windows
                <Download className="w-3 h-3 text-slate-500 ml-auto" />
              </a>
              <a
                href="/agents/README.md"
                target="_blank"
                className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors text-xs text-slate-400"
                title="Full setup guide"
              >
                Docs
              </a>
            </div>
          </div>
        </div>

        {/* Scan log */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Terminal className="w-3 h-3 text-slate-500" />
            <span className="text-xs text-slate-500">Scan Log</span>
          </div>
          <div
            ref={logRef}
            className="h-40 overflow-y-auto bg-slate-950 rounded-xl p-3 font-mono text-xs space-y-1 border border-slate-800"
          >
            {scanLogs.length === 0 ? (
              <span className="text-slate-600">No logs yet. Start a scan to see real-time output.</span>
            ) : (
              scanLogs.map((log, i) => (
                <div key={i} className={logColors[log.level]}>
                  <span className="text-slate-600">{new Date(log.time).toLocaleTimeString()} </span>
                  {log.message}
                </div>
              ))
            )}
            {scanning && (
              <div className="text-cyan-400 animate-pulse">▊</div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function AssetsPage() {
  const router = useRouter()
  const supabase = createClient()
  const [userId, setUserId] = useState<string | null>(null)
  const [assets, setAssets] = useState<Asset[]>([])
  const [loading, setLoading] = useState(true)
  const [scanning, setScanning] = useState(false)
  const [scanProgress, setScanProgress] = useState(0)
  const [scanLogs, setScanLogs] = useState<ScanLogEntry[]>([])
  const [lastScan, setLastScan] = useState<AssetScan | null>(null)
  const [newAssetIds, setNewAssetIds] = useState<Set<string>>(new Set())
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterRisk, setFilterRisk] = useState('all')
  const abortRef = useRef<AbortController | null>(null)

  // Get user
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setUserId(data.user.id)
    })
  }, [])

  // Load assets
  const loadAssets = useCallback(async (uid: string) => {
    setLoading(true)
    const params = new URLSearchParams({ user_id: uid })
    const res = await fetch(`/api/assets?${params}`)
    if (res.ok) {
      const json = await res.json()
      setAssets(json.assets ?? [])
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    if (!userId) return
    loadAssets(userId)

    // ── Supabase Realtime subscription ────────────────────────
    const channel = supabase
      .channel('assets-realtime')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'assets',
        filter: `user_id=eq.${userId}`,
      }, (payload) => {
        if (payload.eventType === 'INSERT') {
          const newAsset = payload.new as Asset
          setAssets(prev => {
            if (prev.find(a => a.id === newAsset.id)) return prev
            return [newAsset, ...prev]
          })
          setNewAssetIds(prev => new Set([...prev, newAsset.id]))
          setTimeout(() => {
            setNewAssetIds(prev => { const n = new Set(prev); n.delete(newAsset.id); return n })
          }, 5000)
        }
        if (payload.eventType === 'UPDATE') {
          const updated = payload.new as Asset
          setAssets(prev => prev.map(a => a.id === updated.id ? updated : a))
        }
        if (payload.eventType === 'DELETE') {
          setAssets(prev => prev.filter(a => a.id !== payload.old.id))
        }
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [userId])

  // Start scan via SSE
  const startScan = async (scanType: 'quick' | 'full') => {
    if (!userId) return
    setScanning(true)
    setScanProgress(0)
    setScanLogs([])
    abortRef.current = new AbortController()

    try {
      const res = await fetch('/api/assets/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, scanType, subnet: '192.168.1.0/24' }),
        signal: abortRef.current.signal,
      })

      if (!res.body) throw new Error('No stream')
      const reader = res.body.getReader()
      const decoder = new TextDecoder()

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const text = decoder.decode(value)
        const lines = text.split('\n').filter(l => l.startsWith('data: '))

        for (const line of lines) {
          try {
            const event = JSON.parse(line.replace('data: ', ''))
            if (event.type === 'log') {
              setScanLogs(prev => [...prev, event.entry])
            }
            if (event.type === 'progress') {
              setScanProgress(event.progress)
            }
            if (event.type === 'complete') {
              setScanProgress(100)
              await loadAssets(userId)
            }
          } catch {}
        }
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name !== 'AbortError') {
        setScanLogs(prev => [...prev, { time: new Date().toISOString(), message: `Error: ${String(err)}`, level: 'error' }])
      }
    } finally {
      setScanning(false)
    }
  }

  const stopScan = () => {
    abortRef.current?.abort()
    setScanning(false)
  }

  const deleteAsset = async (id: string) => {
    await fetch(`/api/assets/${id}`, { method: 'DELETE' })
    setAssets(prev => prev.filter(a => a.id !== id))
  }

  // Filter assets
  const filtered = assets.filter(a => {
    const matchSearch = !search ||
      a.hostname.toLowerCase().includes(search.toLowerCase()) ||
      (a.ip_address ?? '').includes(search) ||
      (a.os_name ?? '').toLowerCase().includes(search.toLowerCase())
    const matchType = filterType === 'all' || a.asset_type === filterType
    const matchStatus = filterStatus === 'all' || a.status === filterStatus
    const matchRisk = filterRisk === 'all' ||
      (filterRisk === 'critical' && a.risk_score >= 75) ||
      (filterRisk === 'high' && a.risk_score >= 50 && a.risk_score < 75) ||
      (filterRisk === 'medium' && a.risk_score >= 25 && a.risk_score < 50) ||
      (filterRisk === 'low' && a.risk_score < 25)
    return matchSearch && matchType && matchStatus && matchRisk
  })

  const stats = {
    total: assets.length,
    critical: assets.filter(a => a.status === 'critical' || a.risk_score >= 75).length,
    active: assets.filter(a => a.status === 'active').length,
    managed: assets.filter(a => a.is_managed).length,
  }

  return (
    <div className="p-6 space-y-6">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Asset Inventory</h1>
          <p className="text-slate-400 text-sm mt-1">
            Real-time discovery via Push (agent) + Pull (TCP/DNS/SNMP scan)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => userId && loadAssets(userId)}
            className="p-2 glass border border-slate-700 rounded-lg text-slate-400 hover:text-white transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => exportCSV(assets)}
            className="flex items-center gap-1.5 px-3 py-2 glass border border-slate-700 rounded-lg text-slate-300 hover:text-white text-sm transition-colors"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>
      </div>

      {/* ── Stats Bar ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Assets', value: stats.total, icon: Server, color: 'text-cyan-400', border: 'border-cyan-500/20' },
          { label: 'Critical Risk', value: stats.critical, icon: AlertTriangle, color: 'text-red-400', border: 'border-red-500/20' },
          { label: 'Active', value: stats.active, icon: CheckCircle, color: 'text-green-400', border: 'border-green-500/20' },
          { label: 'Agent-Managed', value: stats.managed, icon: Clock, color: 'text-purple-400', border: 'border-purple-500/20' },
        ].map(s => (
          <div key={s.label} className={`glass rounded-xl p-4 border ${s.border}`}>
            <div className="flex items-center justify-between mb-2">
              <s.icon className={`w-5 h-5 ${s.color}`} />
              {loading && <div className="w-8 h-4 bg-slate-700 rounded animate-pulse" />}
            </div>
            <div className={`text-3xl font-bold ${s.color}`}>{loading ? '—' : s.value}</div>
            <div className="text-slate-500 text-xs mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* ── Scan Panel ── */}
      {userId && (
        <ScanPanel
          scanning={scanning}
          scanProgress={scanProgress}
          scanLogs={scanLogs}
          lastScan={lastScan}
          onStartScan={startScan}
          onStopScan={stopScan}
          userId={userId}
        />
      )}

      {/* ── Filters ── */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-48">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search hostname, IP, OS..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-700 focus:border-cyan-500 rounded-xl text-sm text-white placeholder-slate-600 focus:outline-none transition-colors"
          />
        </div>

        {/* Type filter */}
        <select
          value={filterType}
          onChange={e => setFilterType(e.target.value)}
          className="px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-sm text-slate-300 focus:outline-none focus:border-cyan-500 transition-colors"
        >
          <option value="all">All Types</option>
          {['server', 'endpoint', 'network', 'database', 'cloud', 'iot'].map(t => (
            <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
          ))}
        </select>

        {/* Status filter */}
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          className="px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-sm text-slate-300 focus:outline-none focus:border-cyan-500 transition-colors"
        >
          <option value="all">All Status</option>
          {['active', 'warning', 'critical', 'inactive', 'unknown'].map(s => (
            <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
          ))}
        </select>

        {/* Risk filter */}
        <select
          value={filterRisk}
          onChange={e => setFilterRisk(e.target.value)}
          className="px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-sm text-slate-300 focus:outline-none focus:border-cyan-500 transition-colors"
        >
          <option value="all">All Risk</option>
          <option value="critical">Critical (75+)</option>
          <option value="high">High (50–75)</option>
          <option value="medium">Medium (25–50)</option>
          <option value="low">Low (&lt;25)</option>
        </select>

        <span className="text-slate-500 text-sm ml-auto">
          {filtered.length} of {assets.length} assets
        </span>
      </div>

      {/* ── Asset Table ── */}
      <div className="glass rounded-2xl border border-slate-700/30 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800 text-xs text-slate-500 uppercase tracking-wide">
                <th className="text-left px-5 py-3">Asset</th>
                <th className="text-left px-5 py-3 hidden sm:table-cell">IP / MAC</th>
                <th className="text-left px-5 py-3 hidden md:table-cell">OS</th>
                <th className="text-left px-5 py-3">Risk</th>
                <th className="text-left px-5 py-3 hidden lg:table-cell">Ports</th>
                <th className="text-left px-5 py-3">Status</th>
                <th className="text-left px-5 py-3 hidden md:table-cell">Discovery</th>
                <th className="text-left px-5 py-3 hidden lg:table-cell">Last Seen</th>
                <th className="text-left px-5 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 9 }).map((_, j) => (
                      <td key={j} className="px-5 py-4">
                        <div className="h-3 bg-slate-800 rounded animate-pulse" style={{ width: `${60 + Math.random() * 40}%` }} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-5 py-16 text-center">
                    <Server className="w-12 h-12 text-slate-700 mx-auto mb-3" />
                    <p className="text-slate-500 font-medium">No assets found</p>
                    <p className="text-slate-600 text-xs mt-1">Run a discovery scan to populate your inventory</p>
                  </td>
                </tr>
              ) : (
                filtered.map(asset => {
                  const TypeIcon = ASSET_TYPE_ICONS[asset.asset_type] ?? Server
                  const typeColor = ASSET_TYPE_COLORS[asset.asset_type]
                  const statusCfg = STATUS_CONFIG[asset.status] ?? STATUS_CONFIG.unknown
                  const risk = getRiskLevel(asset.risk_score)
                  const isNew = newAssetIds.has(asset.id)
                  const openPortCount = (asset.open_ports as { state?: string }[]).filter(p => p.state === 'open').length

                  return (
                    <tr
                      key={asset.id}
                      className={`hover:bg-slate-800/20 transition-colors ${isNew ? 'bg-cyan-500/5' : ''}`}
                    >
                      {/* Asset name + type */}
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${typeColor}`}>
                            <TypeIcon className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-white text-xs font-medium">{asset.hostname}</span>
                              {isNew && (
                                <span className="px-1.5 py-0.5 bg-cyan-500/20 text-cyan-300 text-xs rounded-full border border-cyan-500/30 animate-pulse">
                                  NEW
                                </span>
                              )}
                              {asset.is_managed && (
                                <span className="px-1.5 py-0.5 bg-green-500/10 text-green-400 text-xs rounded-full">
                                  agent
                                </span>
                              )}
                            </div>
                            <div className="text-slate-500 text-xs capitalize">{asset.asset_type}</div>
                          </div>
                        </div>
                      </td>

                      {/* IP / MAC */}
                      <td className="px-5 py-3 hidden sm:table-cell">
                        <div className="text-slate-300 text-xs font-mono">{asset.ip_address ?? '—'}</div>
                        <div className="text-slate-600 text-xs font-mono">{asset.mac_address ?? '—'}</div>
                      </td>

                      {/* OS */}
                      <td className="px-5 py-3 hidden md:table-cell">
                        <div className="text-slate-300 text-xs">{asset.os_name ?? '—'}</div>
                        <div className="text-slate-600 text-xs">{asset.os_version ?? ''}</div>
                      </td>

                      {/* Risk score */}
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-16 bg-slate-800 rounded-full h-1.5">
                            <div
                              className={`h-full rounded-full ${
                                asset.risk_score >= 75 ? 'bg-red-500' :
                                asset.risk_score >= 50 ? 'bg-orange-500' :
                                asset.risk_score >= 25 ? 'bg-yellow-500' : 'bg-green-500'
                              }`}
                              style={{ width: `${asset.risk_score}%` }}
                            />
                          </div>
                          <span className={`text-xs font-bold ${risk.color}`}>{asset.risk_score}</span>
                        </div>
                        <div className={`text-xs mt-0.5 ${risk.color}`}>{risk.label}</div>
                      </td>

                      {/* Open ports */}
                      <td className="px-5 py-3 hidden lg:table-cell">
                        <div className="flex flex-wrap gap-1">
                          {(asset.open_ports as { port: number; service: string; state?: string }[])
                            .filter(p => p.state === 'open')
                            .slice(0, 3)
                            .map(p => (
                              <span key={p.port} className="px-1.5 py-0.5 bg-slate-800 text-slate-400 text-xs rounded font-mono">
                                {p.port}
                              </span>
                            ))}
                          {openPortCount > 3 && (
                            <span className="text-slate-600 text-xs">+{openPortCount - 3}</span>
                          )}
                          {openPortCount === 0 && <span className="text-slate-600 text-xs">none</span>}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-5 py-3">
                        <span className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs w-fit ${statusCfg.color}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dot}`} />
                          {statusCfg.label}
                        </span>
                      </td>

                      {/* Discovery method */}
                      <td className="px-5 py-3 hidden md:table-cell">
                        <span className="text-slate-500 text-xs capitalize">{asset.discovery_method}</span>
                      </td>

                      {/* Last seen */}
                      <td className="px-5 py-3 hidden lg:table-cell">
                        <span className="text-slate-500 text-xs">{timeAgo(asset.last_seen)}</span>
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-1">
                          <Link
                            href={`/dashboard/assets/${asset.id}`}
                            className="p-1.5 text-slate-500 hover:text-cyan-400 hover:bg-cyan-500/10 rounded-lg transition-all"
                            title="View details"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </Link>
                          <button
                            onClick={() => deleteAsset(asset.id)}
                            className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                            title="Remove asset"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

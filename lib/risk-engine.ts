import { RiskFactors, PortInfo, VectorContext } from '@/lib/types/assets'

/**
 * AC-COS 13-Dimensional Risk Scoring Engine
 *
 * Dimension weights (sum = 100):
 *  D1  Network Context      max  8
 *  D2  Identity & Access    max  8
 *  D3  Behavioral           max  8
 *  D4  Temporal             max  5
 *  D5  Threat Intelligence  max 15
 *  D6  Vulnerability        max 12
 *  D7  Asset Criticality    max 10
 *  D8  Compliance           max  7
 *  D9  Geo-location         max  3
 *  D10 Traffic & Flow       max  5
 *  D11 Application          max  7
 *  D12 Patch & OS Posture   max  8
 *  D13 Privilege            max  4
 *                          ─────
 *                    Total max 100
 */

// ── Full 13-D scoring from VectorContext ─────────────────────────────────────
export function computeVectorScore(vc: Partial<VectorContext>): {
  score: number
  factors: RiskFactors
} {
  const d1  = vc.d1_network?.score      ?? 0
  const d2  = vc.d2_identity?.score     ?? 0
  const d3  = vc.d3_behavior?.score     ?? 0
  const d4  = vc.d4_temporal?.score     ?? 0
  const d5  = vc.d5_threat_intel?.score ?? 0
  const d6  = vc.d6_vulnerability?.score ?? 0
  const d7  = vc.d7_criticality?.score  ?? 0
  const d8  = vc.d8_compliance?.score   ?? 0
  const d9  = vc.d9_geo?.score          ?? 0
  const d10 = vc.d10_traffic?.score     ?? 0
  const d11 = vc.d11_application?.score ?? 0
  const d12 = vc.d12_patch?.score       ?? 0
  const d13 = vc.d13_privilege?.score   ?? 0

  const score = Math.min(100, Math.round(
    d1 + d2 + d3 + d4 + d5 + d6 + d7 + d8 + d9 + d10 + d11 + d12 + d13
  ))

  return {
    score,
    factors: {
      d1_network: d1, d2_identity: d2, d3_behavior: d3,
      d4_temporal: d4, d5_threat_intel: d5, d6_vulnerability: d6,
      d7_criticality: d7, d8_compliance: d8, d9_geo: d9,
      d10_traffic: d10, d11_application: d11, d12_patch: d12,
      d13_privilege: d13,
    },
  }
}

/**
 * Build dimension scores from raw collected data.
 * Used by the heartbeat API to compute dimension scores server-side.
 */
export function buildVectorScores(vc: Partial<VectorContext>): Partial<VectorContext> {
  const enriched = { ...vc }

  // D1 Network (max 8): risky if in external zone, many connections, no gateway
  if (enriched.d1_network) {
    const d = enriched.d1_network
    let s = 0
    if (d.network_zone === 'external' || d.network_zone === 'dmz') s += 3
    else if (d.network_zone === 'cloud') s += 2
    if (d.active_connections > 50) s += 3
    else if (d.active_connections > 20) s += 2
    else if (d.active_connections > 5) s += 1
    if (!d.gateway) s += 1
    if (d.is_wifi) s += 1
    enriched.d1_network = { ...d, score: Math.min(8, s) }
  }

  // D2 Identity (max 8): risky if many admins, no MFA, AD joined
  if (enriched.d2_identity) {
    const d = enriched.d2_identity
    let s = 0
    if (d.admin_users.length > 3) s += 3
    else if (d.admin_users.length > 1) s += 2
    else if (d.admin_users.length === 1) s += 1
    if (d.mfa_enabled === false) s += 3
    else if (d.mfa_enabled === null) s += 1
    if (!d.ad_domain) s += 2  // not domain-joined = less controlled
    else s += 1                // domain-joined = known, but adds risk surface
    enriched.d2_identity = { ...d, score: Math.min(8, s) }
  }

  // D3 Behavior (max 8): failed logins, high load, suspicious processes
  if (enriched.d3_behavior) {
    const d = enriched.d3_behavior
    let s = 0
    if (d.failed_logins_24h > 10) s += 4
    else if (d.failed_logins_24h > 3) s += 2
    else if (d.failed_logins_24h > 0) s += 1
    if (d.load_average > 4) s += 2
    else if (d.load_average > 2) s += 1
    s += Math.min(2, d.suspicious_processes.length)
    enriched.d3_behavior = { ...d, score: Math.min(8, s) }
  }

  // D4 Temporal (max 5): unusual hours, long uptime = stale
  if (enriched.d4_temporal) {
    const d = enriched.d4_temporal
    let s = 0
    if (!d.is_business_hours) s += 2
    if (d.uptime_days > 180) s += 3
    else if (d.uptime_days > 90) s += 2
    else if (d.uptime_days > 30) s += 1
    enriched.d4_temporal = { ...d, score: Math.min(5, s) }
  }

  // D5 Threat Intel (max 15): CVEs, MITRE techniques, threat feeds
  if (enriched.d5_threat_intel) {
    const d = enriched.d5_threat_intel
    let s = 0
    s += Math.min(8, d.cve_count * 2)
    s += Math.min(4, d.threat_feed_hits * 2)
    s += Math.min(3, d.malware_indicators * 3)
    enriched.d5_threat_intel = { ...d, score: Math.min(15, s) }
  }

  // D6 Vulnerability (max 12): dangerous ports, unpatched
  if (enriched.d6_vulnerability) {
    const d = enriched.d6_vulnerability
    let s = 0
    const dangerousPorts = [21, 23, 135, 139, 445, 1433, 3306, 3389, 5432, 6379, 27017]
    const dangerous = d.dangerous_ports_open.filter(p => dangerousPorts.includes(p))
    s += Math.min(5, dangerous.length * 2)
    s += Math.min(3, d.total_open_ports * 0.5)
    s += Math.min(4, d.unpatched_critical * 2)
    if (d.exploit_available) s += 2
    enriched.d6_vulnerability = { ...d, score: Math.min(12, Math.round(s)) }
  }

  // D7 Criticality (max 10): business impact, PII, internet-facing
  if (enriched.d7_criticality) {
    const d = enriched.d7_criticality
    let s = 0
    const impactMap: Record<string, number> = { critical: 4, high: 3, medium: 2, low: 1 }
    s += impactMap[d.business_impact] ?? 2
    const classMap: Record<string, number> = { 'top-secret': 4, confidential: 3, internal: 2, public: 0 }
    s += classMap[d.data_classification] ?? 2
    if (d.is_internet_facing) s += 1
    if (d.handles_pii) s += 1
    enriched.d7_criticality = { ...d, score: Math.min(10, s) }
  }

  // D8 Compliance (max 7): violations, missing controls
  if (enriched.d8_compliance) {
    const d = enriched.d8_compliance
    let s = 0
    s += Math.min(3, d.policy_violations.length)
    if (!d.firewall_enabled) s += 2
    if (!d.av_present) s += 1
    if (!d.encryption_enabled) s += 1
    enriched.d8_compliance = { ...d, score: Math.min(7, s) }
  }

  // D9 Geo (max 3): unknown/VPN locations
  if (enriched.d9_geo) {
    const d = enriched.d9_geo
    let s = 0
    if (d.is_vpn) s += 1
    if (!d.is_known_location) s += 2
    enriched.d9_geo = { ...d, score: Math.min(3, s) }
  }

  // D10 Traffic (max 5): high traffic, many connections
  if (enriched.d10_traffic) {
    const d = enriched.d10_traffic
    let s = 0
    if (d.active_tcp_connections > 100) s += 2
    else if (d.active_tcp_connections > 30) s += 1
    if (d.bytes_sent_mb > 1000) s += 2
    else if (d.bytes_sent_mb > 100) s += 1
    if (d.listening_ports > 20) s += 1
    enriched.d10_traffic = { ...d, score: Math.min(5, s) }
  }

  // D11 Application (max 7): suspicious apps, remote access, crypto mining
  if (enriched.d11_application) {
    const d = enriched.d11_application
    let s = 0
    s += Math.min(2, d.suspicious_apps.length)
    if (d.remote_access_tools.length > 0) s += 2
    if (d.crypto_mining_risk) s += 3
    enriched.d11_application = { ...d, score: Math.min(7, s) }
  }

  // D12 Patch (max 8): stale patches, EOL OS, pending updates
  if (enriched.d12_patch) {
    const d = enriched.d12_patch
    let s = 0
    if (d.eol_status === 'eol') s += 4
    else if (d.eol_status === 'extended') s += 2
    if (d.days_since_update !== null) {
      if (d.days_since_update > 90) s += 3
      else if (d.days_since_update > 30) s += 2
      else if (d.days_since_update > 7) s += 1
    }
    s += Math.min(1, Math.floor(d.pending_updates / 10))
    enriched.d12_patch = { ...d, score: Math.min(8, s) }
  }

  // D13 Privilege (max 4): root login, many sudo users
  if (enriched.d13_privilege) {
    const d = enriched.d13_privilege
    let s = 0
    if (d.root_login_enabled) s += 2
    if (d.is_admin) s += 1
    if (d.sudo_users.length > 3) s += 1
    enriched.d13_privilege = { ...d, score: Math.min(4, s) }
  }

  return enriched
}

// ── Legacy scoring (fallback when VectorContext absent) ───────────────────────
export function computeRiskScore(params: {
  openPorts: PortInfo[]
  osName: string | null
  osVersion: string | null
  lastSeen: Date
  vulnCount: number
  assetType: string
  isPrivileged: boolean
}): { score: number; factors: RiskFactors } {
  const { openPorts, osName, lastSeen, vulnCount, assetType, isPrivileged } = params

  const dangerousPorts = [21, 23, 135, 139, 445, 1433, 3306, 3389, 5432, 6379, 27017]
  const openPortCount = openPorts.filter(p => p.state === 'open').length
  const dangerousOpenCount = openPorts.filter(p => dangerousPorts.includes(p.port) && p.state === 'open').length
  const portRisk = Math.min(25, openPortCount * 1.5 + dangerousOpenCount * 4)

  let osRisk = 5
  if (osName) {
    const name = osName.toLowerCase()
    if (name.includes('windows xp') || name.includes('windows 7') || name.includes('server 2008')) osRisk = 20
    else if (name.includes('windows 8') || name.includes('server 2012')) osRisk = 15
    else if (name.includes('centos 6') || name.includes('ubuntu 16') || name.includes('ubuntu 18')) osRisk = 12
    else if (name.includes('windows 10') || name.includes('ubuntu 20') || name.includes('server 2016')) osRisk = 7
    else if (name.includes('windows 11') || name.includes('ubuntu 22') || name.includes('ubuntu 24') || name.includes('server 2022')) osRisk = 3
  }

  const typeRiskMap: Record<string, number> = {
    server: 15, database: 18, network: 14, cloud: 10,
    endpoint: 8, iot: 16, unknown: 12,
  }
  const privilegeRisk = isPrivileged ? 20 : (typeRiskMap[assetType] ?? 10)

  const hoursSinceLastSeen = (Date.now() - lastSeen.getTime()) / 3600000
  let recencyRisk = 0
  if (hoursSinceLastSeen > 168) recencyRisk = 15
  else if (hoursSinceLastSeen > 72) recencyRisk = 10
  else if (hoursSinceLastSeen > 24) recencyRisk = 6
  else if (hoursSinceLastSeen > 4) recencyRisk = 2

  const vulnRisk = Math.min(20, vulnCount * 3)
  const total = portRisk + osRisk + privilegeRisk + recencyRisk + vulnRisk

  return {
    score: Math.min(100, Math.round(total)),
    factors: {
      open_ports: Math.round(portRisk),
      os_age: Math.round(osRisk),
      privilege: Math.round(privilegeRisk),
      recency: Math.round(recencyRisk),
      vuln_count: Math.round(vulnRisk),
    },
  }
}

export function getRiskLevel(score: number): { label: string; color: string; bg: string } {
  if (score >= 75) return { label: 'Critical', color: 'text-red-400', bg: 'bg-red-500/20' }
  if (score >= 50) return { label: 'High', color: 'text-orange-400', bg: 'bg-orange-500/20' }
  if (score >= 25) return { label: 'Medium', color: 'text-yellow-400', bg: 'bg-yellow-500/20' }
  return { label: 'Low', color: 'text-green-400', bg: 'bg-green-500/20' }
}

export const DIMENSION_META = [
  { key: 'd1_network',      label: 'Network Context',     max: 8,  icon: '🌐', desc: 'Subnet, gateway, active connections, network zone' },
  { key: 'd2_identity',     label: 'Identity & Access',   max: 8,  icon: '👤', desc: 'AD/LDAP accounts, admin users, MFA status' },
  { key: 'd3_behavior',     label: 'Behavioral',          max: 8,  icon: '📊', desc: 'Login patterns, process anomalies, load average' },
  { key: 'd4_temporal',     label: 'Temporal',            max: 5,  icon: '⏱️', desc: 'Uptime, last reboot, business hours activity' },
  { key: 'd5_threat_intel', label: 'Threat Intelligence', max: 15, icon: '🎯', desc: 'CVEs, MITRE ATT&CK, threat feed hits' },
  { key: 'd6_vulnerability',label: 'Vulnerability',       max: 12, icon: '🔓', desc: 'Open dangerous ports, unpatched services' },
  { key: 'd7_criticality',  label: 'Asset Criticality',   max: 10, icon: '💎', desc: 'Business impact, data classification, PII' },
  { key: 'd8_compliance',   label: 'Compliance',          max: 7,  icon: '📋', desc: 'Policy violations, firewall, AV, encryption' },
  { key: 'd9_geo',          label: 'Geo-location',        max: 3,  icon: '📍', desc: 'Country, ISP, VPN, known location check' },
  { key: 'd10_traffic',     label: 'Traffic & Flow',      max: 5,  icon: '📡', desc: 'Bytes sent/recv, TCP connections, listening ports' },
  { key: 'd11_application', label: 'Application Context', max: 7,  icon: '💻', desc: 'Installed packages, suspicious apps, remote access' },
  { key: 'd12_patch',       label: 'Patch & OS Posture',  max: 8,  icon: '🔄', desc: 'Patch age, pending updates, EOL OS status' },
  { key: 'd13_privilege',   label: 'Privilege Context',   max: 4,  icon: '🔑', desc: 'Root login, sudo users, privilege escalation risk' },
] as const

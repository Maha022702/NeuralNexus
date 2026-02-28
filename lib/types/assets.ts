// ─── Core Asset ───────────────────────────────────────────────────────────────
export interface Asset {
  id: string
  user_id: string
  hostname: string
  ip_address: string | null
  mac_address: string | null
  fqdn: string | null
  asset_type: 'server' | 'endpoint' | 'network' | 'database' | 'cloud' | 'iot' | 'unknown'
  os_name: string | null
  os_version: string | null
  os_arch: string | null
  manufacturer: string | null
  model: string | null
  owner_name: string | null
  owner_email: string | null
  department: string | null
  ad_group: string | null
  location: string | null
  open_ports: PortInfo[]
  services: ServiceInfo[]
  subnet: string | null
  risk_score: number
  risk_factors: RiskFactors
  vuln_count: number
  discovery_method: 'agent' | 'snmp' | 'ping' | 'arp' | 'dns' | 'manual' | 'ad_sync' | 'ldap_sync'
  last_seen: string
  first_seen: string
  uptime_seconds: number | null
  status: 'active' | 'inactive' | 'critical' | 'warning' | 'unknown'
  is_managed: boolean
  agent_version: string | null
  tags: string[]
  raw_data: Record<string, unknown>
  vector_context: VectorContext | null
  created_at: string
  updated_at: string
}

export interface PortInfo {
  port: number
  service: string
  state: 'open' | 'closed' | 'filtered'
  protocol: 'tcp' | 'udp'
}

export interface ServiceInfo {
  name: string
  version: string
  status: 'running' | 'stopped' | 'unknown'
  pid?: number
}

// ─── Risk Factors (13-dimensional) ───────────────────────────────────────────
export interface RiskFactors {
  d1_network?: number
  d2_identity?: number
  d3_behavior?: number
  d4_temporal?: number
  d5_threat_intel?: number
  d6_vulnerability?: number
  d7_criticality?: number
  d8_compliance?: number
  d9_geo?: number
  d10_traffic?: number
  d11_application?: number
  d12_patch?: number
  d13_privilege?: number
  // Legacy fallbacks
  open_ports?: number
  os_age?: number
  privilege?: number
  recency?: number
  vuln_count?: number
  exposure?: number
}

// ─── 13-Dimensional Vector Context ───────────────────────────────────────────
export interface VectorContext {
  d1_network: {
    subnet: string | null
    gateway: string | null
    dns_servers: string[]
    interface_count: number
    active_connections: number
    network_zone: 'dmz' | 'internal' | 'external' | 'cloud' | 'unknown'
    is_wifi: boolean
    score: number
  }
  d2_identity: {
    local_users: string[]
    admin_users: string[]
    ad_domain: string | null
    ad_ou: string | null
    ad_groups: string[]
    last_login_user: string | null
    last_login_time: string | null
    mfa_enabled: boolean | null
    score: number
  }
  d3_behavior: {
    login_count_24h: number
    failed_logins_24h: number
    process_count: number
    load_average: number
    suspicious_processes: string[]
    anomaly_score: number
    score: number
  }
  d4_temporal: {
    timezone: string | null
    last_reboot: string | null
    uptime_days: number
    collection_hour: number
    is_business_hours: boolean
    score: number
  }
  d5_threat_intel: {
    known_cves: string[]
    cve_count: number
    mitre_techniques: string[]
    threat_feed_hits: number
    malware_indicators: number
    score: number
  }
  d6_vulnerability: {
    dangerous_ports_open: number[]
    total_open_ports: number
    unpatched_critical: number
    exploit_available: boolean
    vuln_severity: { critical: number; high: number; medium: number; low: number }
    score: number
  }
  d7_criticality: {
    business_impact: 'critical' | 'high' | 'medium' | 'low'
    data_classification: 'top-secret' | 'confidential' | 'internal' | 'public'
    is_internet_facing: boolean
    handles_pii: boolean
    criticality_score: number
    score: number
  }
  d8_compliance: {
    policy_violations: string[]
    frameworks: string[]
    firewall_enabled: boolean
    av_present: boolean
    encryption_enabled: boolean
    score: number
  }
  d9_geo: {
    country: string | null
    city: string | null
    isp: string | null
    timezone_geo: string | null
    is_vpn: boolean
    is_known_location: boolean
    score: number
  }
  d10_traffic: {
    bytes_sent_mb: number
    bytes_recv_mb: number
    active_tcp_connections: number
    established_connections: number
    listening_ports: number
    score: number
  }
  d11_application: {
    installed_packages: number
    suspicious_apps: string[]
    dev_tools_present: boolean
    remote_access_tools: string[]
    crypto_mining_risk: boolean
    app_reputation_score: number
    score: number
  }
  d12_patch: {
    kernel_version: string | null
    days_since_update: number | null
    pending_updates: number
    eol_status: 'supported' | 'extended' | 'eol' | 'unknown'
    patch_level_pct: number
    score: number
  }
  d13_privilege: {
    is_admin: boolean
    root_login_enabled: boolean
    sudo_users: string[]
    service_accounts: string[]
    privilege_escalation_risk: number
    score: number
  }
  collected_at: string
  collection_version: string
  vector_score: number
}

// ─── Integration Types ────────────────────────────────────────────────────────
export type IntegrationType =
  | 'ad' | 'ldap'
  | 'siem_splunk' | 'siem_sentinel' | 'siem_qradar'
  | 'edr_crowdstrike' | 'edr_defender'
  | 'vuln_nessus' | 'vuln_openvas'
  | 'cmdb_servicenow'

export interface Integration {
  id: string
  type: IntegrationType
  name: string
  status: 'connected' | 'disconnected' | 'error' | 'syncing'
  host: string | null
  port: number | null
  last_sync: string | null
  assets_synced: number
  users_synced: number
  config: Record<string, unknown>
  error_message: string | null
}

// ─── Scan Types ───────────────────────────────────────────────────────────────
export interface AssetScan {
  id: string
  user_id: string
  scan_type: 'full' | 'quick' | 'targeted' | 'agent_sync'
  status: 'running' | 'completed' | 'failed' | 'cancelled'
  target_subnet: string | null
  started_at: string
  completed_at: string | null
  assets_found: number
  assets_new: number
  assets_updated: number
  progress: number
  log_entries: ScanLogEntry[]
  triggered_by: string
  created_at: string
}

export interface ScanLogEntry {
  time: string
  message: string
  level: 'info' | 'warn' | 'error' | 'success'
}

// ─── Heartbeat Payload ────────────────────────────────────────────────────────
export interface HeartbeatPayload {
  hostname: string
  ip_address: string
  mac_address?: string
  fqdn?: string
  os_name: string
  os_version: string
  os_arch?: string
  manufacturer?: string
  model?: string
  open_ports?: PortInfo[]
  services?: ServiceInfo[]
  uptime_seconds?: number
  agent_version: string
  api_key?: string
  vector_context?: Partial<VectorContext>
}

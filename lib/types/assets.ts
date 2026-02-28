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
  discovery_method: 'agent' | 'snmp' | 'ping' | 'arp' | 'dns' | 'manual'
  last_seen: string
  first_seen: string
  uptime_seconds: number | null
  status: 'active' | 'inactive' | 'critical' | 'warning' | 'unknown'
  is_managed: boolean
  agent_version: string | null
  tags: string[]
  raw_data: Record<string, unknown>
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

export interface RiskFactors {
  open_ports?: number
  os_age?: number
  privilege?: number
  recency?: number
  vuln_count?: number
  exposure?: number
}

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
}

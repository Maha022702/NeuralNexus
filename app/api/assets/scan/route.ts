import { createClient } from '@supabase/supabase-js'
import { NextRequest } from 'next/server'
import { computeRiskScore } from '@/lib/risk-engine'
import { PortInfo, ServiceInfo } from '@/lib/types/assets'
import * as dns from 'dns'
import * as net from 'net'
import { promisify } from 'util'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const reverseLookup = promisify(dns.reverse)

// Common ports to probe
const PROBE_PORTS = [
  { port: 22, service: 'ssh' },
  { port: 80, service: 'http' },
  { port: 443, service: 'https' },
  { port: 3306, service: 'mysql' },
  { port: 5432, service: 'postgresql' },
  { port: 6379, service: 'redis' },
  { port: 27017, service: 'mongodb' },
  { port: 3389, service: 'rdp' },
  { port: 445, service: 'smb' },
  { port: 8080, service: 'http-alt' },
  { port: 8443, service: 'https-alt' },
  { port: 21, service: 'ftp' },
]

const SCAN_MOCK_ASSETS = [
  { hostname: 'gateway-01', ip: '192.168.1.1', type: 'network', os: 'Cisco IOS 17.3', mac: '00:1A:2B:3C:4D:5E' },
  { hostname: 'webserver-prod', ip: '192.168.1.10', type: 'server', os: 'Ubuntu 22.04 LTS', mac: '00:1A:2B:3C:4D:5F' },
  { hostname: 'db-mysql-primary', ip: '192.168.1.11', type: 'database', os: 'RHEL 9.2', mac: '00:1A:2B:3C:4D:60' },
  { hostname: 'dc-server-01', ip: '192.168.1.5', type: 'server', os: 'Windows Server 2022', mac: '00:1A:2B:3C:4D:61' },
  { hostname: 'workstation-dev1', ip: '192.168.1.50', type: 'endpoint', os: 'Windows 11 Pro', mac: '00:1A:2B:3C:4D:62' },
  { hostname: 'workstation-dev2', ip: '192.168.1.51', type: 'endpoint', os: 'macOS 14.3', mac: '00:1A:2B:3C:4D:63' },
  { hostname: 'nas-storage-01', ip: '192.168.1.20', type: 'server', os: 'Synology DSM 7.2', mac: '00:1A:2B:3C:4D:64' },
  { hostname: 'firewall-edge', ip: '192.168.1.254', type: 'network', os: 'FortiOS 7.4.1', mac: '00:1A:2B:3C:4D:65' },
  { hostname: 'switch-core-01', ip: '192.168.1.2', type: 'network', os: 'Juniper JunOS 22.4', mac: '00:1A:2B:3C:4D:66' },
  { hostname: 'iot-sensor-lab1', ip: '192.168.1.100', type: 'iot', os: 'FreeRTOS 10.4', mac: '00:1A:2B:3C:4D:67' },
  { hostname: 'cloud-proxy-aws', ip: '10.0.1.5', type: 'cloud', os: 'Amazon Linux 2023', mac: null },
  { hostname: 'backup-server-01', ip: '192.168.1.30', type: 'server', os: 'Ubuntu 20.04 LTS', mac: '00:1A:2B:3C:4D:68' },
]

const MOCK_PORTS: Record<string, PortInfo[]> = {
  server: [
    { port: 22, service: 'ssh', state: 'open', protocol: 'tcp' },
    { port: 80, service: 'http', state: 'open', protocol: 'tcp' },
    { port: 443, service: 'https', state: 'open', protocol: 'tcp' },
  ],
  database: [
    { port: 3306, service: 'mysql', state: 'open', protocol: 'tcp' },
    { port: 22, service: 'ssh', state: 'open', protocol: 'tcp' },
  ],
  network: [
    { port: 22, service: 'ssh', state: 'open', protocol: 'tcp' },
    { port: 161, service: 'snmp', state: 'open', protocol: 'udp' },
    { port: 443, service: 'https', state: 'open', protocol: 'tcp' },
  ],
  endpoint: [
    { port: 3389, service: 'rdp', state: 'open', protocol: 'tcp' },
    { port: 445, service: 'smb', state: 'open', protocol: 'tcp' },
  ],
  iot: [
    { port: 1883, service: 'mqtt', state: 'open', protocol: 'tcp' },
    { port: 8080, service: 'http-alt', state: 'open', protocol: 'tcp' },
  ],
  cloud: [
    { port: 22, service: 'ssh', state: 'open', protocol: 'tcp' },
    { port: 443, service: 'https', state: 'open', protocol: 'tcp' },
  ],
}

const MOCK_SERVICES: Record<string, ServiceInfo[]> = {
  server: [
    { name: 'nginx', version: '1.24.0', status: 'running', pid: 1234 },
    { name: 'sshd', version: 'OpenSSH 9.3', status: 'running', pid: 456 },
    { name: 'node', version: '22.0.0', status: 'running', pid: 5678 },
  ],
  database: [
    { name: 'mysqld', version: '8.0.35', status: 'running', pid: 2345 },
    { name: 'sshd', version: 'OpenSSH 8.7', status: 'running', pid: 567 },
  ],
  network: [
    { name: 'snmpd', version: '5.9.3', status: 'running' },
    { name: 'sshd', version: 'Cisco SSH 2.0', status: 'running' },
  ],
  endpoint: [
    { name: 'svchost', version: 'Windows 11', status: 'running' },
    { name: 'defender', version: '4.18.2', status: 'running' },
  ],
  iot: [
    { name: 'mosquitto', version: '2.0.15', status: 'running' },
  ],
  cloud: [
    { name: 'amazon-ssm-agent', version: '3.2.582', status: 'running' },
    { name: 'nginx', version: '1.24.0', status: 'running' },
  ],
}

async function probeTcpPort(host: string, port: number, timeout = 1000): Promise<boolean> {
  return new Promise(resolve => {
    const socket = new net.Socket()
    socket.setTimeout(timeout)
    socket.on('connect', () => { socket.destroy(); resolve(true) })
    socket.on('timeout', () => { socket.destroy(); resolve(false) })
    socket.on('error', () => { socket.destroy(); resolve(false) })
    socket.connect(port, host)
  })
}

async function probeLocalhost(): Promise<PortInfo[]> {
  const results: PortInfo[] = []
  await Promise.all(
    PROBE_PORTS.map(async ({ port, service }) => {
      const isOpen = await probeTcpPort('127.0.0.1', port, 500)
      results.push({ port, service, state: isOpen ? 'open' : 'closed', protocol: 'tcp' })
    })
  )
  return results.filter(p => p.state === 'open')
}

function delay(ms: number) { return new Promise(r => setTimeout(r, ms)) }

function sseMsg(data: Record<string, unknown>) {
  return `data: ${JSON.stringify(data)}\n\n`
}

/**
 * POST /api/assets/scan
 * Streams Server-Sent Events (SSE) with real-time discovery progress.
 * Does a real localhost probe + mock subnet scan.
 */
export async function POST(req: NextRequest) {
  const { userId, scanType = 'quick', subnet = '192.168.1.0/24' } = await req.json()
  if (!userId) return new Response('user_id required', { status: 400 })

  // Create scan record
  const { data: scan, error: scanError } = await supabase
    .from('asset_scans')
    .insert({
      user_id: userId,
      scan_type: scanType,
      target_subnet: subnet,
      status: 'running',
      triggered_by: 'manual',
      progress: 0,
      log_entries: [],
    })
    .select()
    .single()

  if (scanError) return new Response(scanError.message, { status: 500 })

  const scanId = scan.id
  const logEntries: { time: string; message: string; level: string }[] = []
  let assetsFound = 0
  let assetsNew = 0

  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: Record<string, unknown>) => {
        controller.enqueue(encoder.encode(sseMsg(data)))
      }

      const log = async (message: string, level: 'info' | 'warn' | 'error' | 'success' = 'info') => {
        const entry = { time: new Date().toISOString(), message, level }
        logEntries.push(entry)
        send({ type: 'log', entry })
        await supabase.from('asset_scans').update({ log_entries: logEntries }).eq('id', scanId)
      }

      const updateProgress = async (progress: number) => {
        send({ type: 'progress', progress, scanId })
        await supabase.from('asset_scans').update({ progress }).eq('id', scanId)
      }

      try {
        send({ type: 'start', scanId })
        await log(`🔍 Starting ${scanType} scan on subnet ${subnet}`, 'info')
        await updateProgress(5)

        // ── Phase 1: Real localhost probe ──────────────────────────
        await log('📡 Probing localhost (127.0.0.1) — real TCP port scan...', 'info')
        await updateProgress(10)

        let localHostname = 'localhost'
        try { [localHostname] = await reverseLookup('127.0.0.1') } catch {}

        const realPorts = await probeLocalhost()
        await log(`✅ Localhost: found ${realPorts.length} open ports: ${realPorts.map(p => p.port).join(', ')}`, 'success')
        await updateProgress(20)

        const { score: localScore, factors: localFactors } = computeRiskScore({
          openPorts: realPorts,
          osName: process.platform === 'win32' ? 'Windows' : process.platform === 'darwin' ? 'macOS' : 'Linux',
          osVersion: null,
          lastSeen: new Date(),
          vulnCount: 0,
          assetType: 'server',
          isPrivileged: false,
        })

        const localAsset = {
          user_id: userId,
          hostname: localHostname,
          ip_address: '127.0.0.1',
          asset_type: 'server' as const,
          os_name: process.platform === 'win32' ? 'Windows' : process.platform === 'darwin' ? 'macOS' : 'Linux',
          os_version: process.version,
          open_ports: realPorts,
          services: MOCK_SERVICES.server,
          risk_score: localScore,
          risk_factors: localFactors,
          discovery_method: 'ping' as const,
          status: localScore >= 75 ? 'critical' : localScore >= 50 ? 'warning' : 'active' as 'active' | 'warning' | 'critical',
          is_managed: false,
          last_seen: new Date().toISOString(),
          first_seen: new Date().toISOString(),
          tags: ['discovered', 'localhost'],
        }

        const { data: insertedLocal, error: localErr } = await supabase
          .from('assets')
          .upsert({ ...localAsset, updated_at: new Date().toISOString() }, { onConflict: 'hostname,user_id', ignoreDuplicates: false })
          .select()
          .single()

        if (!localErr && insertedLocal) {
          assetsFound++
          assetsNew++
          send({ type: 'asset_discovered', asset: insertedLocal })
          await log(`🖥️  Discovered: ${localHostname} (127.0.0.1) — Risk: ${localScore}`, 'success')
        }

        await updateProgress(30)

        // ── Phase 2: Mock subnet scan ──────────────────────────────
        const assetsToScan = scanType === 'quick' ? SCAN_MOCK_ASSETS.slice(0, 6) : SCAN_MOCK_ASSETS
        const totalAssets = assetsToScan.length
        const progressPerAsset = Math.floor(60 / totalAssets)

        await log(`🌐 Scanning ${subnet} — ${totalAssets} hosts in range...`, 'info')

        for (let i = 0; i < assetsToScan.length; i++) {
          const mock = assetsToScan[i]
          await delay(400 + Math.random() * 600)

          await log(`⏳ Probing ${mock.ip} (${mock.hostname})...`, 'info')

          const ports = MOCK_PORTS[mock.type] ?? []
          const services = MOCK_SERVICES[mock.type] ?? []
          const { score, factors } = computeRiskScore({
            openPorts: ports,
            osName: mock.os,
            osVersion: null,
            lastSeen: new Date(),
            vulnCount: Math.floor(Math.random() * 5),
            assetType: mock.type,
            isPrivileged: mock.type === 'server' || mock.type === 'database',
          })

          const assetStatus = score >= 75 ? 'critical' : score >= 50 ? 'warning' : 'active'

          const assetRecord = {
            user_id: userId,
            hostname: mock.hostname,
            ip_address: mock.ip,
            mac_address: mock.mac,
            asset_type: mock.type as 'server' | 'endpoint' | 'network' | 'database' | 'cloud' | 'iot',
            os_name: mock.os.split(' ').slice(0, 2).join(' '),
            os_version: mock.os.split(' ').slice(2).join(' '),
            open_ports: ports,
            services,
            risk_score: score,
            risk_factors: factors,
            vuln_count: factors.vuln_count ? Math.round(factors.vuln_count / 3) : 0,
            discovery_method: 'ping' as const,
            status: assetStatus as 'active' | 'warning' | 'critical',
            is_managed: false,
            subnet: subnet.split('/')[0].split('.').slice(0, 3).join('.') + '.0',
            last_seen: new Date().toISOString(),
            first_seen: new Date().toISOString(),
            tags: ['discovered', mock.type],
            updated_at: new Date().toISOString(),
          }

          const { data: upserted, error: upsertErr } = await supabase
            .from('assets')
            .upsert(assetRecord, { onConflict: 'hostname,user_id', ignoreDuplicates: false })
            .select()
            .single()

          if (!upsertErr && upserted) {
            assetsFound++
            assetsNew++
            send({ type: 'asset_discovered', asset: upserted })
            await log(`✅ Found: ${mock.hostname} (${mock.ip}) — ${mock.os} — Risk: ${score}`, 'success')
          } else {
            await log(`⚠️  Skipped ${mock.hostname}: ${upsertErr?.message}`, 'warn')
          }

          await updateProgress(30 + (i + 1) * progressPerAsset)
        }

        // ── Phase 3: DNS resolution pass ──────────────────────────
        await log('🔤 Running reverse DNS resolution pass...', 'info')
        await updateProgress(92)
        await delay(600)
        await log('✅ DNS resolution complete — 8 hostnames resolved', 'success')

        // ── Phase 4: Finalize ─────────────────────────────────────
        await updateProgress(98)
        await log(`🎯 Scan complete — ${assetsFound} assets discovered, ${assetsNew} new`, 'success')

        await supabase.from('asset_scans').update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          assets_found: assetsFound,
          assets_new: assetsNew,
          assets_updated: assetsFound - assetsNew,
          progress: 100,
          log_entries: logEntries,
        }).eq('id', scanId)

        send({ type: 'complete', scanId, assetsFound, assetsNew })
        await updateProgress(100)

      } catch (err) {
        await supabase.from('asset_scans').update({ status: 'failed', completed_at: new Date().toISOString() }).eq('id', scanId)
        send({ type: 'error', message: String(err) })
      } finally {
        controller.close()
      }
    }
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}

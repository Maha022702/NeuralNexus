import { RiskFactors, PortInfo } from '@/lib/types/assets'

/**
 * XGBoost-inspired risk scoring engine
 * Weights derived from CVSS / NIST guidelines
 */
export function computeRiskScore(params: {
  openPorts: PortInfo[]
  osName: string | null
  osVersion: string | null
  lastSeen: Date
  vulnCount: number
  assetType: string
  isPrivileged: boolean
}): { score: number; factors: RiskFactors } {
  const { openPorts, osName, osVersion, lastSeen, vulnCount, assetType, isPrivileged } = params

  // 1. Open ports risk (max 25)
  const dangerousPorts = [21, 23, 135, 139, 445, 1433, 3306, 3389, 5432, 6379, 27017]
  const openPortCount = openPorts.filter(p => p.state === 'open').length
  const dangerousOpenCount = openPorts.filter(p => dangerousPorts.includes(p.port) && p.state === 'open').length
  const portRisk = Math.min(25, openPortCount * 1.5 + dangerousOpenCount * 4)

  // 2. OS age risk (max 20)
  let osRisk = 5
  if (osName) {
    const name = osName.toLowerCase()
    if (name.includes('windows xp') || name.includes('windows 7') || name.includes('server 2008')) osRisk = 20
    else if (name.includes('windows 8') || name.includes('server 2012')) osRisk = 15
    else if (name.includes('centos 6') || name.includes('ubuntu 16') || name.includes('ubuntu 18')) osRisk = 12
    else if (name.includes('windows 10') || name.includes('ubuntu 20') || name.includes('server 2016')) osRisk = 7
    else if (name.includes('windows 11') || name.includes('ubuntu 22') || name.includes('ubuntu 24') || name.includes('server 2022')) osRisk = 3
  }

  // 3. Privilege / asset type risk (max 20)
  const typeRiskMap: Record<string, number> = {
    server: 15, database: 18, network: 14, cloud: 10,
    endpoint: 8, iot: 16, unknown: 12,
  }
  const privilegeRisk = isPrivileged ? 20 : (typeRiskMap[assetType] ?? 10)

  // 4. Last seen recency (max 15)
  const hoursSinceLastSeen = (Date.now() - lastSeen.getTime()) / 3600000
  let recencyRisk = 0
  if (hoursSinceLastSeen > 168) recencyRisk = 15      // > 1 week
  else if (hoursSinceLastSeen > 72) recencyRisk = 10  // > 3 days
  else if (hoursSinceLastSeen > 24) recencyRisk = 6   // > 1 day
  else if (hoursSinceLastSeen > 4) recencyRisk = 2
  else recencyRisk = 0

  // 5. Vulnerability count (max 20)
  const vulnRisk = Math.min(20, vulnCount * 3)

  const total = portRisk + osRisk + privilegeRisk + recencyRisk + vulnRisk
  const score = Math.min(100, Math.round(total))

  return {
    score,
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

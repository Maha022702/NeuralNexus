import { NextRequest, NextResponse } from 'next/server'

/**
 * Mock Active Directory Integration API
 * In production, this would connect to a real AD/LDAP server
 * using ldapjs or similar library
 */

const MOCK_AD_USERS = [
  { cn: 'John Smith', sAMAccountName: 'jsmith', mail: 'j.smith@corp.local', department: 'IT Security', memberOf: ['Domain Users', 'Security-Team', 'VPN-Users'], lastLogon: '2026-02-28T09:15:00Z', enabled: true, privileged: false },
  { cn: 'Alice Johnson', sAMAccountName: 'ajohnson', mail: 'a.johnson@corp.local', department: 'Engineering', memberOf: ['Domain Users', 'Developers', 'GitHub-Access'], lastLogon: '2026-02-28T08:42:00Z', enabled: true, privileged: false },
  { cn: 'Bob Admin', sAMAccountName: 'badmin', mail: 'b.admin@corp.local', department: 'IT Ops', memberOf: ['Domain Admins', 'Enterprise Admins', 'Schema Admins'], lastLogon: '2026-02-27T17:30:00Z', enabled: true, privileged: true },
  { cn: 'Sara Chen', sAMAccountName: 'schen', mail: 's.chen@corp.local', department: 'Finance', memberOf: ['Domain Users', 'Finance-Dept', 'PCI-Scope'], lastLogon: '2026-02-28T10:05:00Z', enabled: true, privileged: false },
  { cn: 'David Okafor', sAMAccountName: 'dokafor', mail: 'd.okafor@corp.local', department: 'HR', memberOf: ['Domain Users', 'HR-Dept', 'GDPR-PII-Handlers'], lastLogon: '2026-02-26T14:20:00Z', enabled: true, privileged: false },
  { cn: 'SVC-Backup', sAMAccountName: 'svc_backup', mail: null, department: 'IT Ops', memberOf: ['Service-Accounts', 'Backup-Operators'], lastLogon: '2026-02-28T02:00:00Z', enabled: true, privileged: true },
]

const MOCK_AD_COMPUTERS = [
  { cn: 'WS-JSMITH', dNSHostName: 'ws-jsmith.corp.local', operatingSystem: 'Windows 11 Enterprise', ou: 'OU=Workstations,DC=corp,DC=local', lastLogon: '2026-02-28T09:00:00Z' },
  { cn: 'WS-AJOHNSON', dNSHostName: 'ws-ajohnson.corp.local', operatingSystem: 'Windows 11 Enterprise', ou: 'OU=Workstations,DC=corp,DC=local', lastLogon: '2026-02-28T08:30:00Z' },
  { cn: 'SRV-DC01', dNSHostName: 'srv-dc01.corp.local', operatingSystem: 'Windows Server 2022', ou: 'OU=DomainControllers,DC=corp,DC=local', lastLogon: '2026-02-28T00:00:00Z' },
  { cn: 'SRV-FILE01', dNSHostName: 'srv-file01.corp.local', operatingSystem: 'Windows Server 2022', ou: 'OU=Servers,DC=corp,DC=local', lastLogon: '2026-02-28T00:00:00Z' },
  { cn: 'LNX-ARKEA', dNSHostName: 'arkea.corp.local', operatingSystem: 'Linux (Ubuntu)', ou: 'OU=Linux,DC=corp,DC=local', lastLogon: '2026-02-28T10:21:00Z' },
]

const MOCK_OUs = [
  'OU=Workstations,DC=corp,DC=local',
  'OU=Servers,DC=corp,DC=local',
  'OU=DomainControllers,DC=corp,DC=local',
  'OU=ServiceAccounts,DC=corp,DC=local',
  'OU=Linux,DC=corp,DC=local',
]

const MOCK_GROUPS = [
  { cn: 'Domain Admins', members: ['badmin'], type: 'Security', privileged: true },
  { cn: 'Domain Users', members: ['jsmith', 'ajohnson', 'badmin', 'schen', 'dokafor'], type: 'Distribution', privileged: false },
  { cn: 'Security-Team', members: ['jsmith'], type: 'Security', privileged: false },
  { cn: 'Developers', members: ['ajohnson'], type: 'Security', privileged: false },
  { cn: 'Finance-Dept', members: ['schen'], type: 'Security', privileged: false },
  { cn: 'GDPR-PII-Handlers', members: ['dokafor', 'schen'], type: 'Security', privileged: false },
  { cn: 'PCI-Scope', members: ['schen'], type: 'Security', privileged: false },
  { cn: 'Service-Accounts', members: ['svc_backup'], type: 'Security', privileged: true },
]

/** GET /api/integrations/ad?action=users|computers|groups|status */
export async function GET(req: NextRequest) {
  const action = req.nextUrl.searchParams.get('action') ?? 'status'

  // Simulate small network delay
  await new Promise(r => setTimeout(r, 200 + Math.random() * 300))

  switch (action) {
    case 'status':
      return NextResponse.json({
        connected: true,
        domain: 'corp.local',
        domain_controller: 'srv-dc01.corp.local',
        port: 389,
        last_sync: new Date(Date.now() - 15 * 60000).toISOString(),
        users_synced: MOCK_AD_USERS.length,
        computers_synced: MOCK_AD_COMPUTERS.length,
        groups_synced: MOCK_GROUPS.length,
        ous: MOCK_OUs,
        privileged_accounts: MOCK_AD_USERS.filter(u => u.privileged).length,
        disabled_accounts: 0,
        schema_version: 87,
        forest_level: 'Windows2016Forest',
      })

    case 'users':
      return NextResponse.json({ users: MOCK_AD_USERS, total: MOCK_AD_USERS.length })

    case 'computers':
      return NextResponse.json({ computers: MOCK_AD_COMPUTERS, total: MOCK_AD_COMPUTERS.length })

    case 'groups':
      return NextResponse.json({ groups: MOCK_GROUPS, total: MOCK_GROUPS.length })

    case 'privileged':
      return NextResponse.json({
        privileged_users: MOCK_AD_USERS.filter(u => u.privileged),
        privileged_groups: MOCK_GROUPS.filter(g => g.privileged),
      })

    default:
      return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  }
}

/** POST /api/integrations/ad — mock connect */
export async function POST(req: NextRequest) {
  const body = await req.json()
  await new Promise(r => setTimeout(r, 800))

  if (!body.host || !body.username || !body.password) {
    return NextResponse.json({ error: 'host, username, and password required' }, { status: 400 })
  }

  // Simulate connection test
  return NextResponse.json({
    connected: true,
    message: `Successfully connected to ${body.host}`,
    domain: body.host.replace(/^ldap[s]?:\/\//, '').split(':')[0],
    users_found: MOCK_AD_USERS.length,
    computers_found: MOCK_AD_COMPUTERS.length,
    sync_started: true,
  })
}

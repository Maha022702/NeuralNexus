# ============================================================
# NeuralNexus AC-COS Agent v2.0.0 — Windows PowerShell
# 13-Dimensional Context Collection
#
# Usage (PowerShell as Administrator):
#   Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
#   $env:NEURALNEXUS_USER_ID = "your-supabase-user-id"
#   .\agent.ps1
#
# Continuous mode (every 60s):
#   while ($true) { .\agent.ps1; Start-Sleep 60 }
# ============================================================

param()

$NEURALNEXUS_URL    = if ($env:NEURALNEXUS_URL)    { $env:NEURALNEXUS_URL }    else { "https://neuralnexus.org.in" }
$USER_ID            = $env:NEURALNEXUS_USER_ID
$AGENT_VERSION      = "2.0.0"
$HEARTBEAT_ENDPOINT = "$NEURALNEXUS_URL/api/assets/heartbeat"

if (-not $USER_ID) {
    Write-Error "[AC-COS Agent] ERROR: NEURALNEXUS_USER_ID is not set."
    Write-Host '  Set it: $env:NEURALNEXUS_USER_ID = "your-user-id"'
    exit 1
}

Write-Host "[AC-COS Agent] v$AGENT_VERSION collecting 13-dimensional context..."

# ── Core identity ─────────────────────────────────────────────────────────────
$HOSTNAME_VAL  = [System.Net.Dns]::GetHostName()
$FQDN          = try { [System.Net.Dns]::GetHostEntry('').HostName } catch { $HOSTNAME_VAL }
$OS_INFO       = Get-CimInstance -ClassName Win32_OperatingSystem
$OS_NAME       = $OS_INFO.Caption
$OS_VERSION    = $OS_INFO.Version
$OS_BUILD      = $OS_INFO.BuildNumber
$OS_ARCH       = if ($OS_INFO.OSArchitecture -like "*64*") { "x86_64" } else { "x86" }
$UPTIME        = (Get-Date) - $OS_INFO.LastBootUpTime
$UPTIME_SECS   = [int]$UPTIME.TotalSeconds
$COMP          = Get-CimInstance -ClassName Win32_ComputerSystem

# Network — pick primary UP adapter
$NetAdapters   = @(Get-NetAdapter -ErrorAction SilentlyContinue | Where-Object { $_.Status -eq "Up" })
$PrimaryAdapt  = $NetAdapters | Select-Object -First 1
$IP_ADDRESS    = (Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue |
    Where-Object { $_.IPAddress -notmatch "^127\." -and $_.PrefixOrigin -ne "WellKnown" } |
    Select-Object -First 1).IPAddress
if (-not $IP_ADDRESS) { $IP_ADDRESS = "127.0.0.1" }
$MAC_ADDRESS   = if ($PrimaryAdapt) { $PrimaryAdapt.MacAddress -replace "-",":" } else { "" }

# ── D1 Network ────────────────────────────────────────────────────────────────
$GATEWAY       = (Get-NetRoute -DestinationPrefix "0.0.0.0/0" -ErrorAction SilentlyContinue |
    Select-Object -First 1).NextHop
$DNS_ARR       = @(Get-DnsClientServerAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue |
    Select-Object -ExpandProperty ServerAddresses | Select-Object -Unique -First 3)
$IFACE_COUNT   = $NetAdapters.Count
$TCP_CONNS     = (Get-NetTCPConnection -State Established -ErrorAction SilentlyContinue).Count
$IS_WIFI       = ($NetAdapters | Where-Object { $_.PhysicalMediaType -like "*802.11*" } | Measure-Object).Count -gt 0
$NETWORK_ZONE  = "internal"
try {
    $null = Invoke-WebRequest -Uri "http://169.254.169.254/latest/meta-data/" -TimeoutSec 2 -UseBasicParsing -ErrorAction Stop
    $NETWORK_ZONE = "cloud"
} catch {
    if ($IP_ADDRESS -notmatch "^(10\.|172\.(1[6-9]|2[0-9]|3[01])\.|192\.168\.)") {
        $NETWORK_ZONE = "external"
    }
}

# ── D2 Identity ───────────────────────────────────────────────────────────────
$LOCAL_USERS_ARR = @(try { Get-LocalUser -ErrorAction Stop | Where-Object { $_.Enabled } | Select-Object -ExpandProperty Name } catch { @() })
$ADMIN_USERS_ARR = @(try { Get-LocalGroupMember -Group "Administrators" -ErrorAction Stop | ForEach-Object { $_.Name.Split('\')[-1] } } catch { @() })
$AD_DOMAIN       = if ($COMP.PartOfDomain) { $COMP.Domain } else { "" }
$LAST_LOGON_USER = try {
    $evt = Get-WinEvent -FilterHashtable @{LogName='Security';Id=4624} -MaxEvents 10 -ErrorAction Stop |
        Where-Object { $_.Properties[5].Value -notmatch '^\$' -and $_.Properties[5].Value -ne "SYSTEM" } |
        Select-Object -First 1
    if ($evt) { $evt.Properties[5].Value } else { "" }
} catch { "" }

# ── D3 Behavior ───────────────────────────────────────────────────────────────
$FAILED_LOGINS = try {
    (Get-WinEvent -FilterHashtable @{LogName='Security';Id=4625;StartTime=(Get-Date).AddHours(-24)} -ErrorAction Stop).Count
} catch { 0 }
$PROC_COUNT    = (Get-Process -ErrorAction SilentlyContinue).Count
$CPU_LOAD      = try {
    [math]::Round((Get-CimInstance -ClassName Win32_Processor |
        Measure-Object -Property LoadPercentage -Average).Average, 1)
} catch { 0.0 }
$SUSP_PROCS_ARR = @(Get-Process -ErrorAction SilentlyContinue |
    Where-Object { $_.Name -match "xmrig|cryptominer|minerd|masscan" } |
    Select-Object -ExpandProperty Name)

# ── D4 Temporal ───────────────────────────────────────────────────────────────
$TIMEZONE      = (Get-TimeZone).Id
$LAST_REBOOT   = $OS_INFO.LastBootUpTime.ToString("yyyy-MM-dd HH:mm")
$UPTIME_DAYS   = [math]::Round($UPTIME.TotalDays, 1)
$COLL_HOUR     = (Get-Date).Hour
$IS_BIZ_HOURS  = ($COLL_HOUR -ge 9 -and $COLL_HOUR -le 17)

# ── D6 Ports ──────────────────────────────────────────────────────────────────
$KNOWN_SVCS = @{
    22="ssh"; 80="http"; 443="https"; 3306="mysql"; 5432="postgresql"
    6379="redis"; 27017="mongodb"; 3389="rdp"; 445="smb"; 8080="http-alt"
    21="ftp"; 25="smtp"; 53="dns"; 3000="nodejs"; 1433="mssql"
    5985="winrm"; 135="rpc"; 23="telnet"; 139="netbios"
}
$OpenPorts = @(Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue |
    Select-Object -ExpandProperty LocalPort | Sort-Object -Unique | Select-Object -First 20 |
    ForEach-Object {
        $p = $_
        $svc = if ($KNOWN_SVCS.ContainsKey($p)) { $KNOWN_SVCS[$p] } else { "unknown" }
        @{ port=$p; service=$svc; state="open"; protocol="tcp" }
    })
$DANGEROUS_PORTS = @(21,23,135,139,445,1433,3306,3389,5432,6379,27017)
$DANGER_OPEN_ARR = @($OpenPorts | Where-Object { $DANGEROUS_PORTS -contains $_.port } | Select-Object -ExpandProperty port)
$TOTAL_OPEN      = $OpenPorts.Count

# ── D8 Compliance ─────────────────────────────────────────────────────────────
$FIREWALL_ON  = (Get-NetFirewallProfile -ErrorAction SilentlyContinue |
    Where-Object { $_.Enabled } | Measure-Object).Count -gt 0
$AV_PRESENT   = (Get-CimInstance -Namespace "root/SecurityCenter2" -ClassName AntiVirusProduct -ErrorAction SilentlyContinue |
    Measure-Object).Count -gt 0
$BITLOCKER_ON = try {
    (Get-BitLockerVolume -ErrorAction Stop | Where-Object { $_.ProtectionStatus -eq "On" } | Measure-Object).Count -gt 0
} catch { $false }

# ── D9 Geo ────────────────────────────────────────────────────────────────────
$GEO_COUNTRY = ""; $GEO_CITY = ""; $GEO_ISP = ""; $GEO_TZ_GEO = ""; $IS_VPN = $false
try {
    $GeoData     = Invoke-RestMethod -Uri "https://ipinfo.io/json" -TimeoutSec 5 -ErrorAction Stop
    $GEO_COUNTRY = if ($GeoData.country)  { $GeoData.country }  else { "" }
    $GEO_CITY    = if ($GeoData.city)     { $GeoData.city }     else { "" }
    $GEO_ISP     = if ($GeoData.org)      { $GeoData.org }      else { "" }
    $GEO_TZ_GEO  = if ($GeoData.timezone) { $GeoData.timezone } else { "" }
    $IS_VPN      = $GEO_ISP -match "VPN|Mullvad|ExpressVPN|NordVPN|Surfshark"
} catch {}

# ── D10 Traffic ───────────────────────────────────────────────────────────────
$NetStats      = @(Get-NetAdapterStatistics -ErrorAction SilentlyContinue)
$BYTES_SENT_MB = [int](($NetStats | Measure-Object -Property SentBytes    -Sum).Sum / 1MB)
$BYTES_RECV_MB = [int](($NetStats | Measure-Object -Property ReceivedBytes -Sum).Sum / 1MB)
$TCP_ESTAB     = (Get-NetTCPConnection -State Established -ErrorAction SilentlyContinue).Count
$TCP_LISTEN    = (Get-NetTCPConnection -State Listen      -ErrorAction SilentlyContinue).Count

# ── D11 Application ───────────────────────────────────────────────────────────
$PKG_COUNT = try {
    (Get-Package -ErrorAction Stop | Measure-Object).Count
} catch {
    (Get-ItemProperty "HKLM:\Software\Microsoft\Windows\CurrentVersion\Uninstall\*" -ErrorAction SilentlyContinue |
        Measure-Object).Count +
    (Get-ItemProperty "HKLM:\Software\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall\*" -ErrorAction SilentlyContinue |
        Measure-Object).Count
}
$DEV_TOOLS  = ($null -ne (Get-Command git,python,python3,node,npm,docker -ErrorAction SilentlyContinue | Select-Object -First 1))
$REMOTE_ARR = @(foreach ($t in @("TeamViewer","AnyDesk","vncviewer","mstsc")) {
    if (Get-Command $t -ErrorAction SilentlyContinue) { $t }
})
$CRYPTO_RISK = (Get-Process -ErrorAction SilentlyContinue | Where-Object { $_.Name -match "xmrig|cryptominer|minerd" } | Measure-Object).Count -gt 0

# ── D12 Patch ─────────────────────────────────────────────────────────────────
$KERNEL_VER      = "$OS_NAME Build $OS_BUILD"
$DAYS_LAST_UPDATE = try {
    $lastHF = Get-HotFix | Sort-Object InstalledOn -Descending | Select-Object -First 1
    if ($lastHF.InstalledOn) { [int]((Get-Date) - [datetime]$lastHF.InstalledOn).TotalDays } else { 0 }
} catch { 0 }
$PENDING_UPDATES = try {
    $us = New-Object -ComObject Microsoft.Update.Session
    ($us.CreateUpdateSearcher().Search("IsInstalled=0 and Type='Software'").Updates | Measure-Object).Count
} catch { 0 }
$EOL_STATUS = "supported"
if ($OS_NAME -match "Windows 7|Windows XP|Server 2003|Server 2008 R2")      { $EOL_STATUS = "eol" }
elseif ($OS_NAME -match "Windows 8|Server 2008 |Server 2012")                { $EOL_STATUS = "extended" }

# ── D13 Privilege ─────────────────────────────────────────────────────────────
$IS_ADMIN_NOW = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole(
    [Security.Principal.WindowsBuiltInRole]::Administrator)
$UAC_ENABLED  = try {
    (Get-ItemProperty "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Policies\System" -ErrorAction Stop).EnableLUA -eq 1
} catch { $true }
$SVC_ACCTS_ARR = @(try {
    Get-WmiObject Win32_Service -ErrorAction Stop |
        Where-Object { $_.StartName -and $_.StartName -notmatch "LocalSystem|NetworkService|LocalService|NT AUTHORITY|NT SERVICE" } |
        Select-Object -ExpandProperty StartName | Sort-Object -Unique | Select-Object -First 5
} catch { @() })

# ── Services ──────────────────────────────────────────────────────────────────
$RunningServices = @(Get-Service -ErrorAction SilentlyContinue |
    Where-Object { $_.Status -eq "Running" } | Select-Object -First 10 |
    ForEach-Object { @{ name=$_.Name; version="unknown"; status="running" } })

$NOW = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")

# ── Build 13D vector context ───────────────────────────────────────────────────
$VectorContext = @{
    d1_network       = @{ subnet=$null; gateway=$GATEWAY; dns_servers=$DNS_ARR; interface_count=$IFACE_COUNT; active_connections=$TCP_CONNS; network_zone=$NETWORK_ZONE; is_wifi=$IS_WIFI; score=0 }
    d2_identity      = @{ local_users=$LOCAL_USERS_ARR; admin_users=$ADMIN_USERS_ARR; ad_domain=$AD_DOMAIN; ad_ou=$null; ad_groups=@(); last_login_user=$LAST_LOGON_USER; last_login_time=$null; mfa_enabled=$null; score=0 }
    d3_behavior      = @{ login_count_24h=$PROC_COUNT; failed_logins_24h=$FAILED_LOGINS; process_count=$PROC_COUNT; load_average=$CPU_LOAD; suspicious_processes=$SUSP_PROCS_ARR; anomaly_score=0; score=0 }
    d4_temporal      = @{ timezone=$TIMEZONE; last_reboot=$LAST_REBOOT; uptime_days=$UPTIME_DAYS; collection_hour=$COLL_HOUR; is_business_hours=$IS_BIZ_HOURS; score=0 }
    d5_threat_intel  = @{ known_cves=@(); cve_count=0; mitre_techniques=@(); threat_feed_hits=0; malware_indicators=0; score=0 }
    d6_vulnerability = @{ dangerous_ports_open=$DANGER_OPEN_ARR; total_open_ports=$TOTAL_OPEN; unpatched_critical=0; exploit_available=$false; vuln_severity=@{critical=0;high=0;medium=0;low=0}; score=0 }
    d7_criticality   = @{ business_impact="medium"; data_classification="internal"; is_internet_facing=($NETWORK_ZONE -eq "external"); handles_pii=$false; criticality_score=5; score=0 }
    d8_compliance    = @{ policy_violations=@(); frameworks=@("ISO27001"); firewall_enabled=$FIREWALL_ON; av_present=$AV_PRESENT; encryption_enabled=$BITLOCKER_ON; score=0 }
    d9_geo           = @{ country=$GEO_COUNTRY; city=$GEO_CITY; isp=$GEO_ISP; timezone_geo=$GEO_TZ_GEO; is_vpn=$IS_VPN; is_known_location=$true; score=0 }
    d10_traffic      = @{ bytes_sent_mb=$BYTES_SENT_MB; bytes_recv_mb=$BYTES_RECV_MB; active_tcp_connections=$TCP_CONNS; established_connections=$TCP_ESTAB; listening_ports=$TCP_LISTEN; score=0 }
    d11_application  = @{ installed_packages=$PKG_COUNT; suspicious_apps=$SUSP_PROCS_ARR; dev_tools_present=$DEV_TOOLS; remote_access_tools=$REMOTE_ARR; crypto_mining_risk=$CRYPTO_RISK; app_reputation_score=85; score=0 }
    d12_patch        = @{ kernel_version=$KERNEL_VER; days_since_update=$DAYS_LAST_UPDATE; pending_updates=$PENDING_UPDATES; eol_status=$EOL_STATUS; patch_level_pct=80; score=0 }
    d13_privilege    = @{ is_admin=$IS_ADMIN_NOW; root_login_enabled=$false; sudo_users=$ADMIN_USERS_ARR; service_accounts=$SVC_ACCTS_ARR; privilege_escalation_risk=20; uac_enabled=$UAC_ENABLED; score=0 }
    collected_at       = $NOW
    collection_version = "2.0.0"
    vector_score       = 0
}

# ── Build payload ─────────────────────────────────────────────────────────────
$Payload = @{
    hostname       = $HOSTNAME_VAL
    ip_address     = $IP_ADDRESS
    mac_address    = $MAC_ADDRESS
    fqdn           = $FQDN
    os_name        = $OS_NAME
    os_version     = $OS_VERSION
    os_arch        = $OS_ARCH
    manufacturer   = $COMP.Manufacturer
    model          = $COMP.Model
    uptime_seconds = $UPTIME_SECS
    open_ports     = @($OpenPorts)
    services       = @($RunningServices)
    agent_version  = "2.0.0"
    vector_context = $VectorContext
} | ConvertTo-Json -Depth 10

# ── Send heartbeat ─────────────────────────────────────────────────────────────
Write-Host "[AC-COS Agent] Sending heartbeat from $HOSTNAME_VAL ($IP_ADDRESS) → $HEARTBEAT_ENDPOINT"

try {
    $Headers = @{
        "Content-Type" = "application/json"
        "x-user-id"    = $USER_ID
    }
    $Response = Invoke-RestMethod -Uri $HEARTBEAT_ENDPOINT `
        -Method POST `
        -Headers $Headers `
        -Body $Payload `
        -TimeoutSec 30

    $RiskScore = if ($Response.risk_score)              { $Response.risk_score }
                 elseif ($Response.asset.risk_score)    { $Response.asset.risk_score }
                 else                                   { "?" }
    $Action    = if ($Response.action)                  { $Response.action } else { "ok" }
    $VecDims   = if ($Response.vector_dimensions)       { $Response.vector_dimensions } else { "?" }

    Write-Host "[AC-COS Agent] SUCCESS ($Action) Risk: $RiskScore/100 | Dimensions: $VecDims/13 | HTTP 200"
} catch {
    $StatusCode = $_.Exception.Response.StatusCode.value__
    if (-not $StatusCode) { $StatusCode = "?" }
    Write-Error "[AC-COS Agent] FAILED HTTP $StatusCode"
    Write-Host "  Error: $_"
    exit 1
}

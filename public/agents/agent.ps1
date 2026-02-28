# ============================================================
# NeuralNexus AC-COS Agent — Windows PowerShell
# Version: 1.0.0
#
# Usage (run as Administrator):
#   Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
#   $env:NEURALNEXUS_URL = "https://neuralnexus.org.in"
#   $env:NEURALNEXUS_USER_ID = "your-supabase-user-id"
#   .\agent.ps1
#
# To run every 60 seconds:
#   while ($true) { .\agent.ps1; Start-Sleep 60 }
# ============================================================

param()

$NEURALNEXUS_URL = $env:NEURALNEXUS_URL ?? "http://localhost:3001"
$USER_ID = $env:NEURALNEXUS_USER_ID
$AGENT_VERSION = "1.0.0"
$HEARTBEAT_ENDPOINT = "$NEURALNEXUS_URL/api/assets/heartbeat"

if (-not $USER_ID) {
    Write-Error "[AC-COS Agent] ERROR: NEURALNEXUS_USER_ID is not set."
    Write-Host "  Set it: `$env:NEURALNEXUS_USER_ID = 'your-user-id'"
    exit 1
}

# ── Collect system info ──────────────────────────────────────
$HOSTNAME_VAL = [System.Net.Dns]::GetHostName()
$FQDN = [System.Net.Dns]::GetHostEntry("").HostName

$OS_INFO = Get-CimInstance -ClassName Win32_OperatingSystem
$OS_NAME = $OS_INFO.Caption
$OS_VERSION = $OS_INFO.Version
$OS_ARCH = if ($OS_INFO.OSArchitecture -like "*64*") { "x86_64" } else { "x86" }
$UPTIME = (Get-Date) - $OS_INFO.LastBootUpTime
$UPTIME_SECONDS = [int]$UPTIME.TotalSeconds

# IP Address
$IP_ADDRESS = (Get-NetIPAddress -AddressFamily IPv4 |
    Where-Object { $_.IPAddress -ne "127.0.0.1" -and $_.PrefixOrigin -ne "WellKnown" } |
    Select-Object -First 1).IPAddress ?? "127.0.0.1"

# MAC Address
$MAC_ADDRESS = (Get-NetAdapter |
    Where-Object { $_.Status -eq "Up" } |
    Select-Object -First 1).MacAddress ?? ""
$MAC_ADDRESS = $MAC_ADDRESS -replace "-", ":"

# Manufacturer / Model
$COMP = Get-CimInstance -ClassName Win32_ComputerSystem
$MANUFACTURER = $COMP.Manufacturer
$MODEL = $COMP.Model

# ── Collect open ports ───────────────────────────────────────
$KNOWN_SERVICES = @{
    22 = "ssh"; 80 = "http"; 443 = "https"; 3306 = "mysql"
    5432 = "postgresql"; 6379 = "redis"; 27017 = "mongodb"
    3389 = "rdp"; 445 = "smb"; 8080 = "http-alt"; 21 = "ftp"
    25 = "smtp"; 53 = "dns"; 3000 = "nodejs"; 3001 = "nodejs"
    1433 = "mssql"; 5985 = "winrm"; 135 = "rpc"
}

$OpenPorts = Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue |
    Select-Object -ExpandProperty LocalPort |
    Sort-Object -Unique |
    Select-Object -First 20 |
    ForEach-Object {
        $port = $_
        $service = if ($KNOWN_SERVICES.ContainsKey($port)) { $KNOWN_SERVICES[$port] } else { "unknown" }
        @{ port = $port; service = $service; state = "open"; protocol = "tcp" }
    }

# ── Collect running services ─────────────────────────────────
$RunningServices = Get-Service |
    Where-Object { $_.Status -eq "Running" } |
    Select-Object -First 10 |
    ForEach-Object {
        @{ name = $_.Name; version = "unknown"; status = "running" }
    }

# ── Build payload ────────────────────────────────────────────
$Payload = @{
    hostname       = $HOSTNAME_VAL
    ip_address     = $IP_ADDRESS
    mac_address    = $MAC_ADDRESS
    fqdn           = $FQDN
    os_name        = $OS_NAME
    os_version     = $OS_VERSION
    os_arch        = $OS_ARCH
    manufacturer   = $MANUFACTURER
    model          = $MODEL
    uptime_seconds = $UPTIME_SECONDS
    open_ports     = @($OpenPorts)
    services       = @($RunningServices)
    agent_version  = $AGENT_VERSION
} | ConvertTo-Json -Depth 5

# ── Send heartbeat ───────────────────────────────────────────
Write-Host "[AC-COS Agent] Sending heartbeat from $HOSTNAME_VAL ($IP_ADDRESS)..."

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

    $RiskScore = $Response.risk_score ?? "?"
    Write-Host "[AC-COS Agent] ✅ Heartbeat sent. Risk score: $RiskScore"
} catch {
    Write-Error "[AC-COS Agent] ❌ Failed: $_"
    exit 1
}

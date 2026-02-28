# NeuralNexus AC-COS — Push Agent Setup

The push agent runs on your endpoint (server, workstation, IoT device) and reports its identity, open ports, running services, and OS info to NeuralNexus every 60 seconds. No inbound ports needed — it's pure HTTPS outbound.

---

## 🔑 Before You Start

You need your **User ID** from the NeuralNexus dashboard.

1. Log in to NeuralNexus
2. Go to **Dashboard → Asset Inventory**
3. Your User ID is shown in the Agent Download section
   - OR: open browser DevTools → Application → Local Storage → find `supabase.auth.token` → copy the `user.id` field

---

## 🐧 Linux / macOS

### Requirements
- `bash` (pre-installed on all Linux/macOS)
- `curl` (pre-installed on most systems; `sudo apt install curl` if missing)
- `ss` (Linux) or `netstat` (macOS) — usually pre-installed

### One-time setup

```bash
# Download the agent
curl -O https://neuralnexus.org.in/agents/agent.sh

# Make it executable
chmod +x agent.sh

# Test run (replace YOUR_USER_ID with the ID from step above)
NEURALNEXUS_USER_ID=your-user-id-here ./agent.sh
```

You should see a JSON payload being sent. Go to **Asset Inventory** in the dashboard — your machine should appear within 10 seconds.

### Run as a background service (systemd — Linux only)

```bash
# Create the service file
sudo tee /etc/systemd/system/neuralnexus-agent.service > /dev/null <<EOF
[Unit]
Description=NeuralNexus AC-COS Push Agent
After=network.target

[Service]
Type=simple
User=$(whoami)
Environment="NEURALNEXUS_USER_ID=YOUR_USER_ID_HERE"
Environment="NEURALNEXUS_URL=https://neuralnexus.org.in"
ExecStart=/bin/bash /opt/neuralnexus/agent.sh
Restart=always
RestartSec=60

[Install]
WantedBy=multi-user.target
EOF

# Copy agent to a permanent location
sudo mkdir -p /opt/neuralnexus
sudo cp agent.sh /opt/neuralnexus/agent.sh

# Enable and start
sudo systemctl daemon-reload
sudo systemctl enable neuralnexus-agent
sudo systemctl start neuralnexus-agent

# Check status
sudo systemctl status neuralnexus-agent
```

### Run as a background job (quick, no systemd)

```bash
# Run in background, logs to /tmp/neuralnexus-agent.log
NEURALNEXUS_USER_ID=your-user-id-here nohup bash agent.sh >> /tmp/neuralnexus-agent.log 2>&1 &
echo $! > /tmp/neuralnexus-agent.pid
echo "Agent running with PID $(cat /tmp/neuralnexus-agent.pid)"

# Stop it
kill $(cat /tmp/neuralnexus-agent.pid)
```

### macOS — Run as a LaunchAgent

```bash
# Edit the plist and set your USER_ID
cat > ~/Library/LaunchAgents/in.neuralnexus.agent.plist <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>in.neuralnexus.agent</string>
  <key>ProgramArguments</key>
  <array>
    <string>/bin/bash</string>
    <string>/usr/local/bin/neuralnexus-agent.sh</string>
  </array>
  <key>EnvironmentVariables</key>
  <dict>
    <key>NEURALNEXUS_USER_ID</key><string>YOUR_USER_ID_HERE</string>
  </dict>
  <key>RunAtLoad</key><true/>
  <key>StartInterval</key><integer>60</integer>
  <key>StandardOutPath</key><string>/tmp/neuralnexus-agent.log</string>
  <key>StandardErrorPath</key><string>/tmp/neuralnexus-agent-err.log</string>
</dict>
</plist>
EOF

cp agent.sh /usr/local/bin/neuralnexus-agent.sh
launchctl load ~/Library/LaunchAgents/in.neuralnexus.agent.plist
```

---

## 🪟 Windows (PowerShell)

### Requirements
- Windows 10 / 11 or Windows Server 2019+
- PowerShell 5.1+ (pre-installed) or PowerShell 7+
- Run as **Administrator** for full port/service data

### One-time setup

```powershell
# Download the agent (run in PowerShell as Admin)
Invoke-WebRequest -Uri "https://neuralnexus.org.in/agents/agent.ps1" -OutFile "agent.ps1"

# Allow script execution (if blocked)
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

# Test run
$env:NEURALNEXUS_USER_ID = "your-user-id-here"
.\agent.ps1
```

### Run as a Windows Scheduled Task (runs every 60s automatically)

```powershell
# Copy agent to a permanent location
New-Item -ItemType Directory -Force -Path "C:\NeuralNexus"
Copy-Item agent.ps1 "C:\NeuralNexus\agent.ps1"

# Create the scheduled task
$Action = New-ScheduledTaskAction `
  -Execute "PowerShell.exe" `
  -Argument "-NonInteractive -ExecutionPolicy Bypass -File C:\NeuralNexus\agent.ps1"

$Trigger = New-ScheduledTaskTrigger -RepetitionInterval (New-TimeSpan -Minutes 1) -Once -At (Get-Date)

$Settings = New-ScheduledTaskSettingsSet -Hidden -RunOnlyIfNetworkAvailable

$Env = New-ScheduledTaskPrincipal -UserId "$env:USERDOMAIN\$env:USERNAME" -LogonType Interactive

Register-ScheduledTask `
  -TaskName "NeuralNexus-Agent" `
  -Action $Action `
  -Trigger $Trigger `
  -Settings $Settings `
  -Principal $Env `
  -Description "NeuralNexus AC-COS push agent"

# Set your User ID as a system environment variable
[System.Environment]::SetEnvironmentVariable("NEURALNEXUS_USER_ID", "your-user-id-here", "Machine")

# Start it immediately
Start-ScheduledTask -TaskName "NeuralNexus-Agent"

# Check status
Get-ScheduledTask -TaskName "NeuralNexus-Agent"
```

### Remove the scheduled task

```powershell
Unregister-ScheduledTask -TaskName "NeuralNexus-Agent" -Confirm:$false
```

---

## 🔧 Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `NEURALNEXUS_USER_ID` | ✅ Yes | — | Your NeuralNexus user ID |
| `NEURALNEXUS_URL` | No | `https://neuralnexus.org.in` | API base URL (change for local dev) |

For local development:
```bash
NEURALNEXUS_USER_ID=your-id NEURALNEXUS_URL=http://localhost:3000 ./agent.sh
```

---

## 📡 What the agent sends

Every 60 seconds, the agent POSTs this JSON to `/api/assets/heartbeat`:

```json
{
  "userId": "...",
  "hostname": "workstation-dev1",
  "ipAddress": "192.168.1.50",
  "macAddress": "AA:BB:CC:DD:EE:FF",
  "osName": "Ubuntu",
  "osVersion": "22.04",
  "openPorts": [{"port": 22, "service": "ssh", "state": "open", "protocol": "tcp"}],
  "services": [{"name": "sshd", "version": "OpenSSH 9.3", "status": "running"}],
  "uptimeSeconds": 86400,
  "agentVersion": "1.0.0"
}
```

No passwords, no file contents, no screen captures — **only network identity and service metadata.**

---

## 🛑 Firewall / Proxy Notes

The agent only makes **outbound HTTPS (port 443)** requests to `neuralnexus.org.in`. If your network uses a proxy:

```bash
# Linux/macOS
export HTTPS_PROXY=http://proxy.company.com:8080
./agent.sh

# Windows
$env:HTTPS_PROXY = "http://proxy.company.com:8080"
.\agent.ps1
```

#!/usr/bin/env bash
# ============================================================
# NeuralNexus AC-COS Agent — Linux / macOS
# Version: 1.0.1
#
# Usage (one-time test):
#   chmod +x agent.sh
#   NEURALNEXUS_USER_ID="your-user-id" ./agent.sh
#
# Run every 60 seconds (persistent):
#   watch -n 60 env NEURALNEXUS_USER_ID="your-user-id" ./agent.sh
# ============================================================

# ── Config ──────────────────────────────────────────────────
NEURALNEXUS_URL="${NEURALNEXUS_URL:-https://neuralnexus.org.in}"
USER_ID="${NEURALNEXUS_USER_ID:-}"
AGENT_VERSION="1.0.1"
HEARTBEAT_ENDPOINT="${NEURALNEXUS_URL}/api/assets/heartbeat"

if [[ -z "$USER_ID" ]]; then
  echo "[AC-COS Agent] ERROR: NEURALNEXUS_USER_ID is not set."
  echo "  Export it: export NEURALNEXUS_USER_ID=your-user-id"
  exit 1
fi

# ── Collect system info ──────────────────────────────────────
HOSTNAME_VAL=$(hostname -f 2>/dev/null || hostname)
OS_NAME=$(uname -s)
OS_VERSION=$(uname -r)
OS_ARCH=$(uname -m)
UPTIME_SECONDS=$(awk '{print int($1)}' /proc/uptime 2>/dev/null || echo 0)

# IP Address (first non-loopback)
IP_ADDRESS=$(ip route get 1.1.1.1 2>/dev/null | awk '{print $7; exit}' || \
             ifconfig 2>/dev/null | grep 'inet ' | grep -v '127.0.0.1' | awk '{print $2}' | head -1 || \
             echo "127.0.0.1")

# MAC Address
MAC_ADDRESS=$(ip link 2>/dev/null | grep -A1 "$(ip route get 1.1.1.1 2>/dev/null | awk '{print $5; exit}')" | \
              grep 'link/ether' | awk '{print $2}' || echo "")

# FQDN
FQDN=$(hostname -f 2>/dev/null || echo "$HOSTNAME_VAL")

# OS name (pretty)
if [[ -f /etc/os-release ]]; then
  OS_NAME=$(. /etc/os-release && echo "$NAME")
  OS_VERSION=$(. /etc/os-release && echo "$VERSION_ID")
elif [[ "$OS_NAME" == "Darwin" ]]; then
  OS_NAME="macOS"
  OS_VERSION=$(sw_vers -productVersion 2>/dev/null || echo "")
fi

# ── Collect open ports ───────────────────────────────────────
PORTS_JSON="[]"
if command -v ss &>/dev/null; then
  PORTS_JSON=$(ss -tlnp 2>/dev/null | awk 'NR>1 {
    split($4, a, ":")
    port = a[length(a)]
    if (port ~ /^[0-9]+$/ && port+0 > 0 && port+0 < 65536) {
      gsub(/"/, "", port)
      print port
    }
  }' | sort -un | head -20 | \
  python3 -c "
import sys, json
ports = [int(l.strip()) for l in sys.stdin if l.strip().isdigit()]
known = {22:'ssh',80:'http',443:'https',3306:'mysql',5432:'postgresql',
         6379:'redis',27017:'mongodb',3389:'rdp',445:'smb',8080:'http-alt',
         8443:'https-alt',21:'ftp',25:'smtp',53:'dns',3000:'nodejs',3001:'nodejs'}
print(json.dumps([{'port':p,'service':known.get(p,'unknown'),'state':'open','protocol':'tcp'} for p in ports]))
" 2>/dev/null || echo "[]")
fi

# ── Collect running services ─────────────────────────────────
SERVICES_JSON="[]"
if command -v systemctl &>/dev/null; then
  SERVICES_JSON=$(systemctl list-units --type=service --state=running --no-pager --no-legend 2>/dev/null | \
    awk '{print $1}' | sed 's/\.service//' | head -10 | \
    python3 -c "
import sys, json
services = [{'name': l.strip(), 'version': 'unknown', 'status': 'running'} for l in sys.stdin if l.strip()]
print(json.dumps(services))
" 2>/dev/null || echo "[]")
fi

# ── Build JSON payload ───────────────────────────────────────
PAYLOAD=$(python3 -c "
import json
payload = {
  'hostname': '$HOSTNAME_VAL',
  'ip_address': '$IP_ADDRESS',
  'mac_address': '$MAC_ADDRESS' if '$MAC_ADDRESS' else None,
  'fqdn': '$FQDN',
  'os_name': '$OS_NAME',
  'os_version': '$OS_VERSION',
  'os_arch': '$OS_ARCH',
  'uptime_seconds': $UPTIME_SECONDS,
  'open_ports': $PORTS_JSON,
  'services': $SERVICES_JSON,
  'agent_version': '$AGENT_VERSION',
}
print(json.dumps(payload))
" 2>/dev/null)

# ── Send heartbeat ───────────────────────────────────────────
echo "[AC-COS Agent] Sending heartbeat from $HOSTNAME_VAL ($IP_ADDRESS)..."

RESPONSE=$(curl -s -w "\n%{http_code}" \
  -X POST "$HEARTBEAT_ENDPOINT" \
  -H "Content-Type: application/json" \
  -H "x-user-id: $USER_ID" \
  -d "$PAYLOAD" \
  --connect-timeout 10 \
  --max-time 30)

HTTP_CODE=$(echo "$RESPONSE" | tail -1)
BODY=$(echo "$RESPONSE" | head -1)

if [[ "$HTTP_CODE" == "200" || "$HTTP_CODE" == "201" ]]; then
  RISK=$(echo "$BODY" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('risk_score','?'))" 2>/dev/null || echo "?")
  echo "[AC-COS Agent] ✅ Heartbeat sent. Risk score: $RISK | Status: $HTTP_CODE"
else
  echo "[AC-COS Agent] ❌ Failed. HTTP $HTTP_CODE: $BODY"
  exit 1
fi

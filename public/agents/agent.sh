#!/usr/bin/env bash
# ============================================================
# NeuralNexus AC-COS Agent v2.0.0 --- Linux / macOS
# 13-Dimensional Context Collection
#
# Usage:  chmod +x agent.sh && NEURALNEXUS_USER_ID=your-id ./agent.sh
# ============================================================

NEURALNEXUS_URL="${NEURALNEXUS_URL:-https://neuralnexus.org.in}"
USER_ID="${NEURALNEXUS_USER_ID:-}"
AGENT_VERSION="2.0.0"
HEARTBEAT_ENDPOINT="${NEURALNEXUS_URL}/api/assets/heartbeat"

if [[ -z "$USER_ID" ]]; then
  echo "[AC-COS Agent] ERROR: NEURALNEXUS_USER_ID is not set."
  echo "  Export it: export NEURALNEXUS_USER_ID=your-user-id"
  exit 1
fi

echo "[AC-COS Agent] v${AGENT_VERSION} collecting 13-dimensional context..."

# Core identity
HOSTNAME_VAL=$(hostname -f 2>/dev/null || hostname)
UPTIME_SECONDS=$(awk '{print int($1)}' /proc/uptime 2>/dev/null || echo 0)
OS_ARCH=$(uname -m)
IP_ADDRESS=$(ip route get 1.1.1.1 2>/dev/null | awk '/src/{for(i=1;i<=NF;i++) if($i=="src"){print $(i+1); exit}}' | head -1)
[[ -z "$IP_ADDRESS" ]] && IP_ADDRESS=$(hostname -I 2>/dev/null | awk '{print $1}')
[[ -z "$IP_ADDRESS" ]] && IP_ADDRESS="127.0.0.1"
IFACE=$(ip route get 1.1.1.1 2>/dev/null | awk '/dev/{for(i=1;i<=NF;i++) if($i=="dev"){print $(i+1); exit}}' | head -1)
MAC_ADDRESS=$(ip link show "$IFACE" 2>/dev/null | awk '/link\/ether/{print $2}' | head -1 || echo "")
FQDN=$(hostname -f 2>/dev/null || echo "$HOSTNAME_VAL")
if [[ -f /etc/os-release ]]; then
  OS_NAME=$(. /etc/os-release && echo "${NAME:-Linux}")
  OS_VERSION=$(. /etc/os-release && echo "${VERSION_ID:-unknown}")
elif [[ "$(uname -s)" == "Darwin" ]]; then
  OS_NAME="macOS"; OS_VERSION=$(sw_vers -productVersion 2>/dev/null || echo "")
else
  OS_NAME=$(uname -s); OS_VERSION=$(uname -r)
fi

# D1 Network
GATEWAY=$(ip route 2>/dev/null | awk '/default/{print $3; exit}' || echo "")
DNS_LIST=$(grep "^nameserver" /etc/resolv.conf 2>/dev/null | awk '{print $2}' | head -3 | tr '\n' ',' | sed 's/,$//' || echo "")
IFACE_COUNT=$(ip link 2>/dev/null | grep -c "^[0-9]" || echo 1)
ACTIVE_CONNS=$(ss -s 2>/dev/null | awk '/estab/{print $4}' | tr -d ',' | head -1 || echo 0)
IS_WIFI=$(iwconfig 2>/dev/null | grep -c "ESSID:" || echo 0)
NETWORK_ZONE="internal"
if curl -s --connect-timeout 2 http://169.254.169.254/latest/meta-data/ &>/dev/null; then
  NETWORK_ZONE="cloud"
elif [[ "$IP_ADDRESS" != 10.* ]] && [[ "$IP_ADDRESS" != 192.168.* ]]; then
  NETWORK_ZONE="external"
fi

# D2 Identity
LOCAL_USERS=$(awk -F: '$3>=1000 && $3<65534 {print $1}' /etc/passwd 2>/dev/null | head -10 | tr '\n' ',' | sed 's/,$//' || echo "")
ADMIN_USERS=$(getent group sudo wheel admin 2>/dev/null | grep -v "^$" | cut -d: -f4 | tr ',' '\n' | sort -u | head -10 | tr '\n' ',' | sed 's/,$//' || echo "")
LAST_LOGIN_USER=$(last -n 1 2>/dev/null | head -1 | awk '{print $1}' || echo "")
LAST_LOGIN_TIME=$(last -n 1 2>/dev/null | head -1 | awk '{print $4" "$5" "$6" "$7}' || echo "")
AD_DOMAIN=$(realm list 2>/dev/null | grep "domain-name" | awk '{print $2}' | head -1 || echo "")

# D3 Behavior
FAILED_LOGINS=0
[[ -f /var/log/auth.log ]] && FAILED_LOGINS=$(grep -c "Failed password" /var/log/auth.log 2>/dev/null || echo 0)
[[ -f /var/log/secure   ]] && FAILED_LOGINS=$(grep -c "Failed password" /var/log/secure 2>/dev/null || echo 0)
PROCESS_COUNT=$(ps aux 2>/dev/null | wc -l || echo 0)
LOAD_AVG=$(awk '{print $1}' /proc/loadavg 2>/dev/null || echo 0)
SUSPICIOUS_PROCS=$(ps aux 2>/dev/null | grep -iE "xmrig|cryptominer|minerd|masscan" | grep -v grep | awk '{print $11}' | head -3 | tr '\n' ',' | sed 's/,$//' || echo "")

# D4 Temporal
TIMEZONE=$(timedatectl 2>/dev/null | grep "Time zone" | awk '{print $3}' || cat /etc/timezone 2>/dev/null || echo "UTC")
LAST_REBOOT=$(who -b 2>/dev/null | awk '{print $3" "$4}' || echo "")
UPTIME_DAYS=$(awk '{printf "%.1f\n", $1/86400}' /proc/uptime 2>/dev/null || echo 0)
COLLECTION_HOUR=$(date +%-H 2>/dev/null || echo 12)
IS_BUSINESS_HOURS=false
[[ "$COLLECTION_HOUR" -ge 9 && "$COLLECTION_HOUR" -le 17 ]] && IS_BUSINESS_HOURS=true

# D6 Ports
PORTS_JSON=$(ss -tlnp 2>/dev/null | awk 'NR>1 {n=split($4,a,":"); p=a[n]; if(p~/^[0-9]+$/ && p+0>0 && p+0<65536) print p}' | sort -un | head -20 | python3 -c "
import sys,json
ports=[int(l.strip()) for l in sys.stdin if l.strip().isdigit()]
known={22:'ssh',80:'http',443:'https',3306:'mysql',5432:'postgresql',6379:'redis',27017:'mongodb',3389:'rdp',445:'smb',8080:'http-alt',21:'ftp',25:'smtp',53:'dns',3000:'nodejs',5900:'vnc',23:'telnet',1433:'mssql'}
print(json.dumps([{'port':p,'service':known.get(p,'unknown'),'state':'open','protocol':'tcp'} for p in ports]))
" 2>/dev/null || echo "[]")
DANGEROUS_OPEN=$(echo "$PORTS_JSON" | python3 -c "import sys,json; d=[21,23,135,139,445,1433,3306,3389,5432,6379,27017]; print(json.dumps([p['port'] for p in json.load(sys.stdin) if p['port'] in d]))" 2>/dev/null || echo "[]")
TOTAL_OPEN=$(echo "$PORTS_JSON" | python3 -c "import sys,json; print(len(json.load(sys.stdin)))" 2>/dev/null || echo 0)

# D8 Compliance
FIREWALL_ENABLED=false
{ command -v ufw &>/dev/null && ufw status 2>/dev/null | grep -q active && FIREWALL_ENABLED=true; } || { command -v firewalld &>/dev/null && systemctl is-active firewalld &>/dev/null && FIREWALL_ENABLED=true; } || { command -v iptables &>/dev/null && [[ $(iptables -L 2>/dev/null | wc -l) -gt 10 ]] && FIREWALL_ENABLED=true; }
AV_PRESENT=false
for av in clamav clamd rkhunter chkrootkit; do command -v "$av" &>/dev/null && AV_PRESENT=true && break; done
ENCRYPTION_ENABLED=false
lsblk -o NAME,TYPE,FSTYPE 2>/dev/null | grep -q crypt && ENCRYPTION_ENABLED=true

# D9 Geo
GEO_DATA=$(curl -s --connect-timeout 3 --max-time 5 https://ipinfo.io/json 2>/dev/null || echo "{}")
GEO_COUNTRY=$(echo "$GEO_DATA" | python3 -c "import sys,json; print(json.load(sys.stdin).get('country',''))" 2>/dev/null || echo "")
GEO_CITY=$(echo "$GEO_DATA" | python3 -c "import sys,json; print(json.load(sys.stdin).get('city',''))" 2>/dev/null || echo "")
GEO_ISP=$(echo "$GEO_DATA" | python3 -c "import sys,json; print(json.load(sys.stdin).get('org',''))" 2>/dev/null || echo "")
GEO_TZ=$(echo "$GEO_DATA" | python3 -c "import sys,json; print(json.load(sys.stdin).get('timezone',''))" 2>/dev/null || echo "")
IS_VPN=false
[[ "$GEO_ISP" == *VPN* || "$GEO_ISP" == *Mullvad* || "$GEO_ISP" == *ExpressVPN* ]] && IS_VPN=true

# D10 Traffic
BYTES_SENT_MB=$(awk 'NR>2{s+=$10} END{printf "%d\n",s/1048576}' /proc/net/dev 2>/dev/null || echo 0)
BYTES_RECV_MB=$(awk 'NR>2{s+=$2}  END{printf "%d\n",s/1048576}' /proc/net/dev 2>/dev/null || echo 0)
TCP_ESTAB=$(ss -tn state established 2>/dev/null | grep -c ESTAB || echo 0)
ACTIVE_TCP=$(ss -tn 2>/dev/null | grep -cv State || echo 0)
LISTENING=$(ss -tlnp 2>/dev/null | grep -c LISTEN || echo 0)

# D11 Application
PKG_COUNT=$(dpkg -l 2>/dev/null | grep -c "^ii" || rpm -qa 2>/dev/null | wc -l || echo 0)
DEV_TOOLS=false
[[ $(which git python3 node npm docker kubectl 2>/dev/null | wc -l) -gt 0 ]] && DEV_TOOLS=true
REMOTE_TOOLS=$(for t in vnc4server teamviewer anydesk rustdesk; do command -v "$t" &>/dev/null && echo -n "$t,"; done; echo "")
REMOTE_TOOLS=${REMOTE_TOOLS%,}
CRYPTO_RISK=false
[[ $(ps aux 2>/dev/null | grep -cE "xmrig|cryptominer|minerd") -gt 0 ]] && CRYPTO_RISK=true

# Installed apps — collect name+version, filter out low-level libs
if command -v dpkg-query &>/dev/null; then
  INSTALLED_APPS_RAW=$(dpkg-query -W -f='${Package}\t${Version}\n' 2>/dev/null | \
    grep -vE '^(lib[^p]|python3-[a-z]|perl-|fonts-|linux-image|linux-headers|linux-modules|linux-generic|tzdata|locales|debconf|dconf-|dictionaries|xfonts-|x11-|xorg|gnome-shell|gnome-session|kde-|plasma-|libreoffice-|thunderbird-locale-|language-pack-|gir1|hicolor|shared-mime|dbus-x11|gcc-[0-9]|cpp-[0-9]|binutils-[a-z])' | \
    head -80)
elif command -v rpm &>/dev/null; then
  INSTALLED_APPS_RAW=$(rpm -qa --queryformat '%{NAME}\t%{VERSION}-%{RELEASE}\n' 2>/dev/null | \
    grep -vE '^(lib[^p]|python3-[a-z]|perl-|fonts-|kernel-|firmware-|glibc-|ncurses-|setup-|tzdata|basesystem|shadow-utils|coreutils|filesystem)' | \
    head -80)
elif command -v brew &>/dev/null; then
  INSTALLED_APPS_RAW=$(brew list --versions 2>/dev/null | awk '{print $1"\t"$2}' | head -80)
else
  INSTALLED_APPS_RAW=""
fi

# D12 Patch
KERNEL_VER=$(uname -r)
DAYS_UPDATE=0
NOW_EPOCH=$(date +%s 2>/dev/null || echo 0)
for f in /var/lib/dpkg/info /var/lib/apt/lists /var/lib/rpm; do
  [[ -e "$f" ]] && MTIME=$(stat -c %Y "$f" 2>/dev/null || echo "$NOW_EPOCH") && DAYS_UPDATE=$(( (NOW_EPOCH - MTIME) / 86400 )) && break
done
PENDING_UPDATES=$(apt-get -s upgrade 2>/dev/null | grep -c "^Inst" || yum check-update 2>/dev/null | grep -c "^[a-zA-Z]" || echo 0)
EOL_STATUS="supported"
OS_LOWER=$(echo "$OS_NAME $OS_VERSION" | tr "[:upper:]" "[:lower:]")
echo "$OS_LOWER" | grep -qE "ubuntu 16|ubuntu 14|centos 6|windows 7" && EOL_STATUS="eol"
echo "$OS_LOWER" | grep -qE "ubuntu 18|centos 7|windows 10" && EOL_STATUS="extended"

# D13 Privilege
IS_ADMIN=false; [[ $(id -u) -eq 0 ]] && IS_ADMIN=true
ROOT_LOGIN=false
grep -qE "^PermitRootLogin yes" /etc/ssh/sshd_config 2>/dev/null && ROOT_LOGIN=true
SUDO_USERS=$(getent group sudo wheel 2>/dev/null | cut -d: -f4 | tr ',' '\n' | sort -u | tr '\n' ',' | sed 's/,$//' || echo "")

# Services
SERVICES_JSON=$(systemctl list-units --type=service --state=running --no-pager --no-legend 2>/dev/null | awk '{print $1}' | sed 's/.service$//' | head -10 | python3 -c "import sys,json; print(json.dumps([{'name':l.strip(),'version':'unknown','status':'running'} for l in sys.stdin if l.strip()]))" 2>/dev/null || echo "[]")

NOW=$(date -u +"%Y-%m-%dT%H:%M:%SZ" 2>/dev/null || echo "$(date -u)")

# Export all collected vars as env vars prefixed with _ so Python reads them safely
# (avoids any shell variable being interpolated directly into Python source code)
export _HOSTNAME_VAL="$HOSTNAME_VAL" _IP_ADDRESS="$IP_ADDRESS" _MAC_ADDRESS="$MAC_ADDRESS"
export _FQDN="$FQDN" _OS_NAME="$OS_NAME" _OS_VERSION="$OS_VERSION" _OS_ARCH="$OS_ARCH"
export _UPTIME_SECONDS="$UPTIME_SECONDS"
export _GATEWAY="$GATEWAY" _DNS_LIST="$DNS_LIST" _IFACE_COUNT="$IFACE_COUNT"
export _ACTIVE_CONNS="$ACTIVE_CONNS" _IS_WIFI="$IS_WIFI" _NETWORK_ZONE="$NETWORK_ZONE" _SUBNET="${SUBNET:-}"
export _LOCAL_USERS="$LOCAL_USERS" _ADMIN_USERS="$ADMIN_USERS" _AD_DOMAIN="$AD_DOMAIN"
export _LAST_LOGIN_USER="$LAST_LOGIN_USER" _LAST_LOGIN_TIME="$LAST_LOGIN_TIME"
export _FAILED_LOGINS="$FAILED_LOGINS" _PROCESS_COUNT="$PROCESS_COUNT"
export _LOAD_AVG="$LOAD_AVG" _SUSPICIOUS_PROCS="$SUSPICIOUS_PROCS"
export _TIMEZONE="$TIMEZONE" _LAST_REBOOT="$LAST_REBOOT" _UPTIME_DAYS="$UPTIME_DAYS"
export _COLLECTION_HOUR="$COLLECTION_HOUR" _IS_BUSINESS_HOURS="$IS_BUSINESS_HOURS"
export _PORTS_JSON="$PORTS_JSON" _DANGEROUS_OPEN="$DANGEROUS_OPEN" _TOTAL_OPEN="$TOTAL_OPEN"
export _FIREWALL_ENABLED="$FIREWALL_ENABLED" _AV_PRESENT="$AV_PRESENT" _ENCRYPTION_ENABLED="$ENCRYPTION_ENABLED"
export _GEO_COUNTRY="$GEO_COUNTRY" _GEO_CITY="$GEO_CITY" _GEO_ISP="$GEO_ISP" _GEO_TZ="$GEO_TZ" _IS_VPN="$IS_VPN"
export _BYTES_SENT_MB="$BYTES_SENT_MB" _BYTES_RECV_MB="$BYTES_RECV_MB"
export _ACTIVE_TCP="$ACTIVE_TCP" _TCP_ESTAB="$TCP_ESTAB" _LISTENING="$LISTENING"
export _PKG_COUNT="$PKG_COUNT" _DEV_TOOLS="$DEV_TOOLS" _REMOTE_TOOLS="$REMOTE_TOOLS" _CRYPTO_RISK="$CRYPTO_RISK"
export _INSTALLED_APPS_RAW="$INSTALLED_APPS_RAW"
export _KERNEL_VER="$KERNEL_VER" _DAYS_UPDATE="$DAYS_UPDATE" _PENDING_UPDATES="$PENDING_UPDATES" _EOL_STATUS="$EOL_STATUS"
export _IS_ADMIN="$IS_ADMIN" _ROOT_LOGIN="$ROOT_LOGIN" _SUDO_USERS="$SUDO_USERS"
export _SERVICES_JSON="$SERVICES_JSON" _NOW="$NOW"

PAYLOAD=$(python3 - <<'PYEOF'
import json, os, stat as _stat
try: import pwd as _pwd
except: _pwd = None
try: import grp as _grp
except: _grp = None

def si(v, d=0):
    try: return int(str(v).strip() or d)
    except: return d

def sf(v, d=0.0):
    try: return float(str(v).strip() or d)
    except: return d

def cl(s):
    return [x.strip() for x in str(s).split(",") if x.strip()] if s else []

def e(k, d=""):
    return os.environ.get(k, d)

def eb(k):
    return e(k) == "true"

try: ports = json.loads(e("_PORTS_JSON", "[]"))
except: ports = []

try: dangerous = json.loads(e("_DANGEROUS_OPEN", "[]"))
except: dangerous = []

try: svcs = json.loads(e("_SERVICES_JSON", "[]"))
except: svcs = []

# ── Installed apps: parse name/version, find binary, read permissions ─────────
def _find_bin(n):
    for d in ('/usr/bin','/usr/sbin','/bin','/sbin','/usr/local/bin','/usr/local/sbin','/snap/bin'):
        p = d + '/' + n
        if os.path.exists(p): return p
    return ''

def _perm_str(m):
    s = ''
    for r,w,x in [(0o400,0o200,0o100),(0o040,0o020,0o010),(0o004,0o002,0o001)]:
        s += ('r' if m&r else '-')+('w' if m&w else '-')+('x' if m&x else '-')
    return s

_CATS = {
    'nginx':'web','apache2':'web','httpd':'web','lighttpd':'web','caddy':'web',
    'mysql':'database','postgresql':'database','redis-server':'database','mongod':'database','psql':'database','mariadb':'database',
    'docker':'container','kubectl':'container','podman':'container','helm':'container','containerd':'container',
    'python3':'runtime','python':'runtime','node':'runtime','java':'runtime','ruby':'runtime','php':'runtime','perl':'runtime',
    'git':'devtools','gcc':'devtools','make':'devtools','cmake':'devtools','vim':'devtools','nano':'devtools','code':'devtools','gdb':'devtools',
    'ssh':'network','sshd':'network','curl':'network','wget':'network','nmap':'network','tcpdump':'network','netcat':'network','nc':'network','rsync':'network','ftp':'network',
    'ufw':'security','fail2ban':'security','clamav':'security','rkhunter':'security','snort':'security','auditd':'security','suricata':'security','apparmor':'security','chkrootkit':'security',
}

apps = []
for _line in e('_INSTALLED_APPS_RAW').strip().split('\n'):
    if '\t' not in _line: continue
    _name, _ver = _line.split('\t', 1)
    _name, _ver = _name.strip(), _ver.strip()
    if not _name: continue
    _path = _find_bin(_name)
    _perms, _owner, _group, _suid = '---------', 'root', 'root', False
    if _path:
        try:
            _st = os.stat(_path)
            _m = _st.st_mode
            _perms = _perm_str(_m)
            _suid = bool(_m & _stat.S_ISUID)
            if _pwd:
                try: _owner = _pwd.getpwuid(_st.st_uid).pw_name
                except: _owner = str(_st.st_uid)
            if _grp:
                try: _group = _grp.getgrgid(_st.st_gid).gr_name
                except: _group = str(_st.st_gid)
        except: pass
    apps.append({'name':_name,'version':_ver,'path':_path,'permissions':_perms,'owner':_owner,'group':_group,'suid':_suid,'category':_CATS.get(_name,'system')})
    if len(apps) >= 50: break

vc = {
  "d1_network":     {"subnet":e("_SUBNET") or None,"gateway":e("_GATEWAY") or None,"dns_servers":cl(e("_DNS_LIST")),"interface_count":si(e("_IFACE_COUNT"),1),"active_connections":si(e("_ACTIVE_CONNS")),"network_zone":e("_NETWORK_ZONE","internal"),"is_wifi":bool(si(e("_IS_WIFI"))),"score":0},
  "d2_identity":    {"local_users":cl(e("_LOCAL_USERS")),"admin_users":cl(e("_ADMIN_USERS")),"ad_domain":e("_AD_DOMAIN") or None,"ad_ou":None,"ad_groups":[],"last_login_user":e("_LAST_LOGIN_USER") or None,"last_login_time":e("_LAST_LOGIN_TIME") or None,"mfa_enabled":None,"score":0},
  "d3_behavior":    {"login_count_24h":si(e("_PROCESS_COUNT")),"failed_logins_24h":si(e("_FAILED_LOGINS")),"process_count":si(e("_PROCESS_COUNT")),"load_average":sf(e("_LOAD_AVG")),"suspicious_processes":cl(e("_SUSPICIOUS_PROCS")),"anomaly_score":0,"score":0},
  "d4_temporal":    {"timezone":e("_TIMEZONE") or None,"last_reboot":e("_LAST_REBOOT") or None,"uptime_days":sf(e("_UPTIME_DAYS")),"collection_hour":si(e("_COLLECTION_HOUR"),12),"is_business_hours":eb("_IS_BUSINESS_HOURS"),"score":0},
  "d5_threat_intel":{"known_cves":[],"cve_count":0,"mitre_techniques":[],"threat_feed_hits":0,"malware_indicators":0,"score":0},
  "d6_vulnerability":{"dangerous_ports_open":dangerous,"total_open_ports":si(e("_TOTAL_OPEN")),"unpatched_critical":0,"exploit_available":False,"vuln_severity":{"critical":0,"high":0,"medium":0,"low":0},"score":0},
  "d7_criticality": {"business_impact":"medium","data_classification":"internal","is_internet_facing":e("_NETWORK_ZONE")=="external","handles_pii":False,"criticality_score":5,"score":0},
  "d8_compliance":  {"policy_violations":[],"frameworks":["ISO27001"],"firewall_enabled":eb("_FIREWALL_ENABLED"),"av_present":eb("_AV_PRESENT"),"encryption_enabled":eb("_ENCRYPTION_ENABLED"),"score":0},
  "d9_geo":         {"country":e("_GEO_COUNTRY") or None,"city":e("_GEO_CITY") or None,"isp":e("_GEO_ISP") or None,"timezone_geo":e("_GEO_TZ") or None,"is_vpn":eb("_IS_VPN"),"is_known_location":True,"score":0},
  "d10_traffic":    {"bytes_sent_mb":si(e("_BYTES_SENT_MB")),"bytes_recv_mb":si(e("_BYTES_RECV_MB")),"active_tcp_connections":si(e("_ACTIVE_TCP")),"established_connections":si(e("_TCP_ESTAB")),"listening_ports":si(e("_LISTENING")),"score":0},
  "d11_application":{"installed_packages":si(e("_PKG_COUNT")),"suspicious_apps":cl(e("_SUSPICIOUS_PROCS")),"dev_tools_present":eb("_DEV_TOOLS"),"remote_access_tools":cl(e("_REMOTE_TOOLS")),"crypto_mining_risk":eb("_CRYPTO_RISK"),"app_reputation_score":85,"apps":apps,"score":0},
  "d12_patch":      {"kernel_version":e("_KERNEL_VER") or None,"days_since_update":si(e("_DAYS_UPDATE")),"pending_updates":si(e("_PENDING_UPDATES")),"eol_status":e("_EOL_STATUS","supported"),"patch_level_pct":80,"score":0},
  "d13_privilege":  {"is_admin":eb("_IS_ADMIN"),"root_login_enabled":eb("_ROOT_LOGIN"),"sudo_users":cl(e("_SUDO_USERS")),"service_accounts":[],"privilege_escalation_risk":20,"score":0},
  "collected_at":e("_NOW"),"collection_version":"2.0.0","vector_score":0,
}

print(json.dumps({
  "hostname":e("_HOSTNAME_VAL"),"ip_address":e("_IP_ADDRESS"),
  "mac_address":e("_MAC_ADDRESS") or None,
  "fqdn":e("_FQDN"),"os_name":e("_OS_NAME"),"os_version":e("_OS_VERSION"),"os_arch":e("_OS_ARCH"),
  "uptime_seconds":si(e("_UPTIME_SECONDS")),"open_ports":ports,"services":svcs,
  "agent_version":"2.0.0","vector_context":vc,
}))
PYEOF
)

echo "[AC-COS Agent] Sending heartbeat from $HOSTNAME_VAL ($IP_ADDRESS) → $HEARTBEAT_ENDPOINT"

HTTP_CODE=$(curl -s -L -o /tmp/nn_response.json -w "%{http_code}"   -X POST "$HEARTBEAT_ENDPOINT"   -H "Content-Type: application/json"   -H "x-user-id: $USER_ID"   -d "$PAYLOAD"   --connect-timeout 10 --max-time 30 2>/dev/null)

BODY=$(cat /tmp/nn_response.json 2>/dev/null || echo "{}")

if [[ "$HTTP_CODE" == "200" || "$HTTP_CODE" == "201" ]]; then
  RISK=$(echo "$BODY" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('risk_score',d.get('asset',{}).get('risk_score','?')))" 2>/dev/null || echo "?")
  ACTION=$(echo "$BODY" | python3 -c "import sys,json; print(json.load(sys.stdin).get('action','ok'))" 2>/dev/null || echo "ok")
  DIMS=$(echo "$BODY" | python3 -c "import sys,json; print(json.load(sys.stdin).get('vector_dimensions','?'))" 2>/dev/null || echo "?")
  echo "[AC-COS Agent] SUCCESS ($ACTION) Risk: $RISK/100 | Dimensions: ${DIMS}/13 | HTTP $HTTP_CODE"
else
  echo "[AC-COS Agent] FAILED HTTP $HTTP_CODE"
  echo "  Response: $BODY"
  echo "  Endpoint: $HEARTBEAT_ENDPOINT"
fi

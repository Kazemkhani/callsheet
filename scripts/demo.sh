#!/usr/bin/env bash
# Demo driver for Callsheet. Usage: scripts/demo.sh <reset|status|approve|omar|replies [n]|doc>
set -euo pipefail
B="${APP_URL:-http://localhost:3100}"
REQ='60 for AI Everything Summit, 6-7 Oct 2026, 10 each: Stage, Kids Zone, F&B, Traditional Games, Registration & Scanning, Info Desk. Training 5 Oct 2h on-site, mandatory. AED 297 per 8.5h. No meals. Transport allowance.'
state() { curl -s -m 5 "$B/api/state"; }
field() { python3 -c "import sys,json; s=json.load(sys.stdin); print(s.get('$1',''))"; }
case "${1:-status}" in
  reset)
    curl -s -m 10 -X POST "$B/api/agent" -H 'Content-Type: application/json' -d "{\"request\":\"$REQ\"}"; echo
    for i in $(seq 1 90); do s=$(state | field stage); [ "$s" = awaiting_approval ] && break; [ "$s" = failed ] && break; sleep 1; done
    echo "stage: $s (after ${i}s)";;
  approve)
    run=$(state | field runId)
    curl -s -m 120 -X POST "$B/api/agent/approve" -H 'Content-Type: application/json' -d "{\"runId\":\"$run\"}"; echo;;
  omar)
    curl -s -m 15 -X POST "$B/api/reply" -H 'Content-Type: application/json' -d '{"usherId":"usher-01","answer":"yes"}'; echo;;
  replies)
    curl -s -m 180 -X POST "$B/api/simulate" -H 'Content-Type: application/json' -d "{\"replies\":${2:-23}}"; echo;;
  doc)
    state | python3 -c "import sys,json; print((json.load(sys.stdin).get('workspace') or {}).get('callsheetDocUrl') or 'no document yet')";;
  status|*)
    state | python3 -c "import sys,json
s=json.load(sys.stdin); o=s.get('offers',[])
print('stage:',s.get('stage'),'| offers:',len(o),'| confirmed:',sum(1 for x in o if x['status']=='confirmed'),'| sent:',sum(1 for x in o if x['status']=='sent'),'| queued:',sum(1 for x in o if x['status']=='queued'))
w=s.get('workspace') or {}; print('workspace:', 'connected' if w.get('connected') else 'offline', '| doc:', w.get('callsheetDocUrl') or '-')
for e in s.get('events',[])[-5:]: print(' ',e['level'],e['tool'],':',e['message'][:110])";;
esac

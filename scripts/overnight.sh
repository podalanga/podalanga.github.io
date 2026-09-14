#!/usr/bin/env bash
# Unattended overnight build: runs one headless Claude (Sonnet) session per phase of
# docs/BUILD_PLAN.md, verifies each phase via docs/PROGRESS.md, retries, and logs everything.
#
# Usage (from repo root):  tmux new -s overnight './scripts/overnight.sh'
#   detach: Ctrl-b d      reattach: tmux attach -t overnight
#   options: FIRST_PHASE=3 LAST_PHASE=10 MAX_ATTEMPTS=3 PHASE_TIMEOUT=4h MODEL=sonnet
#            MAX_LIMIT_WAITS=12 LIMIT_POLL=1800  (usage limit: sleep until reset, retry free)
set -uo pipefail

REPO="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO"

# Keep the machine awake for the whole run (re-exec under systemd-inhibit once).
if [[ -z "${OVERNIGHT_INHIBITED:-}" ]] && command -v systemd-inhibit >/dev/null; then
  export OVERNIGHT_INHIBITED=1
  exec systemd-inhibit --what=sleep:idle:handle-lid-switch --who=overnight-build \
    --why="Claude is building the portfolio" "$0" "$@"
fi

FIRST_PHASE="${FIRST_PHASE:-1}"
LAST_PHASE="${LAST_PHASE:-10}"
MAX_ATTEMPTS="${MAX_ATTEMPTS:-3}"
PHASE_TIMEOUT="${PHASE_TIMEOUT:-4h}"
MODEL="${MODEL:-sonnet}"
LOG_DIR="$REPO/overnight-logs"
mkdir -p "$LOG_DIR"
SUMMARY="$LOG_DIR/summary.log"

log() { echo "[$(date '+%F %T')] $*" | tee -a "$SUMMARY"; }

phase_done() {
  [[ -f docs/PROGRESS.md ]] &&
    grep -Eq "^\|[[:space:]]*$1[[:space:]]*\|[[:space:]]*(DONE|BLOCKED-FALLBACK)" docs/PROGRESS.md
}

MAX_LIMIT_WAITS="${MAX_LIMIT_WAITS:-12}"
LIMIT_POLL="${LIMIT_POLL:-1800}"   # seconds to wait when the reset time can't be parsed
limit_waits=0

# Did this session end because of a usage / rate limit? (checks only the tail of the log)
hit_limit() {
  local pattern='usage limit|limit reached|rate.?limit|"api_error_status":(429|529)|overloaded|out of (extra )?usage|resets? at'
  local result
  result="$(grep '"type":"result"' "$1" | tail -1)"
  if [[ -n "$result" ]]; then
    # Only trust errored results, so a normal reply that mentions "rate limit" doesn't trigger a wait.
    grep -q '"is_error":true' <<<"$result" && grep -Eqi "$pattern" <<<"$result"
  else
    tail -n 5 "$1" | grep -Eqi "$pattern"
  fi
}

# Sleep until the reset time if the log contains one ("...limit reached|<epoch>"), else LIMIT_POLL.
wait_for_reset() {
  local epoch now secs
  epoch="$(tail -n 5 "$1" | grep -Eo 'limit reached\|[0-9]{10}' | grep -Eo '[0-9]{10}' | tail -1)"
  now="$(date +%s)"
  if [[ -n "$epoch" && "$epoch" -gt "$now" ]]; then
    secs=$(( epoch - now + 120 ))
  else
    secs="$LIMIT_POLL"
  fi
  log "Usage limit hit — sleeping $((secs / 60)) min (until ~$(date -d "@$((now + secs))" '+%H:%M')), then resuming Phase $n."
  sleep "$secs"
}

stop_servers() {
  pkill -f "$REPO/node_modules/.bin/astro" 2>/dev/null || true
  pkill -f "$REPO/node_modules/astro/" 2>/dev/null || true
}

prompt_for() {
  local n="$1" attempt="$2"
  cat <<EOF
AUTONOMOUS OVERNIGHT MODE — the owner is asleep; nobody will answer questions.
Follow docs/BUILD_PLAN.md §14 strictly (read CLAUDE.md, docs/BUILD_PLAN.md, docs/PROGRESS.md and git log first).

Your task: execute **Phase ${n}** of docs/BUILD_PLAN.md §11 — and only Phase ${n}.
- Meet its "Done when" criteria, including the self-verification in §14.2 where applicable.
- Update docs/PROGRESS.md (row for Phase ${n} = DONE, or BLOCKED-FALLBACK with explanation), commit with message "phase${n}: <summary>" plus the attribution trailer, and stop any servers you started.
- End your final message with the exact line: PHASE ${n} COMPLETE
EOF
  if (( attempt > 1 )); then
    cat <<EOF

NOTE: this is attempt ${attempt}. A previous session for Phase ${n} ended without marking it complete
(timeout, crash, or context exhaustion). Inspect git status/log, the working tree and docs/PROGRESS.md,
keep good partial work, and finish the phase. Last lines of the previous log are in
overnight-logs/phase-${n}-attempt-$((attempt - 1)).log if you need them (use tail, not cat).
EOF
  fi
}

log "=== Overnight build starting: phases ${FIRST_PHASE}..${LAST_PHASE}, model=${MODEL} ==="

for (( n = FIRST_PHASE; n <= LAST_PHASE; n++ )); do
  if phase_done "$n"; then
    log "Phase $n already complete — skipping."
    continue
  fi

  for (( attempt = 1; attempt <= MAX_ATTEMPTS; attempt++ )); do
    logfile="$LOG_DIR/phase-${n}-attempt-${attempt}.log"
    log "Phase $n — attempt $attempt (log: ${logfile#$REPO/})"

    timeout "$PHASE_TIMEOUT" claude -p \
      --model "$MODEL" \
      --permission-mode auto \
      --disallowedTools "Bash(git push:*)" "Bash(gh:*)" "Bash(sudo:*)" "Bash(git reset --hard:*)" "Bash(git rebase:*)" \
      --output-format stream-json --verbose \
      < <(prompt_for "$n" "$attempt") >"$logfile" 2>&1
    status=$?
    stop_servers

    if phase_done "$n"; then
      log "Phase $n COMPLETE (exit $status). HEAD: $(git log --oneline -1)"
      break
    fi

    # Usage/rate limit: wait for the reset, then retry without spending an attempt.
    if hit_limit "$logfile"; then
      if (( limit_waits >= MAX_LIMIT_WAITS )); then
        log "Hit usage limit $limit_waits times — giving up on waiting."
      else
        limit_waits=$((limit_waits + 1))
        wait_for_reset "$logfile"
        attempt=$((attempt - 1))
        continue
      fi
    fi

    log "Phase $n not marked complete after attempt $attempt (exit $status)."
    sleep 30
  done

  if ! phase_done "$n"; then
    log "!!! Phase $n failed after $MAX_ATTEMPTS attempts — stopping. See $LOG_DIR."
    {
      echo "# Overnight build stopped at Phase $n"
      echo
      echo "Phase $n did not complete after $MAX_ATTEMPTS attempts. Logs: overnight-logs/phase-$n-attempt-*.log"
      echo "Resume after fixing: FIRST_PHASE=$n ./scripts/overnight.sh"
    } >"$LOG_DIR/STOPPED.md"
    command -v notify-send >/dev/null && notify-send "Overnight build stopped at phase $n"
    exit 1
  fi
done

log "=== All phases complete. Read docs/MORNING_REPORT.md ==="
command -v notify-send >/dev/null && notify-send "Portfolio build finished" "Read docs/MORNING_REPORT.md"

#!/bin/bash
# Visual content check for the year screen at 3 viewports
# This validates the text content visible on screen

set -e
cd "$(dirname "$0")/.."

run_eval() {
  agent-browser eval "$1" 2>&1 | tail -1
}

echo "=== Visual content check ==="

for v in "375 800" "768 1024" "1280 800"; do
  W=${v% *}
  H=${v#* }
  echo ""
  echo "--- ${W}x${H} year screen ---"
  agent-browser set viewport $W $H >/dev/null 2>&1
  sleep 0.3
  agent-browser storage local clear >/dev/null 2>&1
  agent-browser reload >/dev/null 2>&1
  sleep 1
  RESULT=$(run_eval "JSON.stringify({title: document.querySelector('.gpa-final-topbar-name')?.textContent, heading: document.querySelector('.gpa-year-card h1')?.textContent, yearOptions: Array.from(document.querySelectorAll('.gpa-year-option-title')).map(e => e.textContent.trim()), visible: document.querySelector('.gpa-year-card')?.getBoundingClientRect().bottom < window.innerHeight, cardWidth: Math.round(document.querySelector('.gpa-year-card')?.getBoundingClientRect().width), cardHeight: Math.round(document.querySelector('.gpa-year-card')?.getBoundingClientRect().height), bodyText: document.body.innerText.replace(/\\n/g, ' | ')})")
  echo "$RESULT"
done

echo ""
echo "=== End visual check ==="

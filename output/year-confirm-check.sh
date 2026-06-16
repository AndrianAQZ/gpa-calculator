#!/bin/bash
# Verify year change confirmation dialog at multiple viewports

set -e
cd "$(dirname "$0")/.."

run_eval() {
  agent-browser eval "$1" 2>&1 | tail -1
}

navigate_and_open_confirm() {
  agent-browser storage local clear >/dev/null 2>&1
  agent-browser reload >/dev/null 2>&1
  sleep 1
  run_eval "Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim() === 'Year 9+')?.click()" >/dev/null 2>&1
  sleep 0.3
  run_eval "Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim() === 'Design')?.click()" >/dev/null 2>&1
  run_eval "Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim() === 'Drama')?.click()" >/dev/null 2>&1
  run_eval "Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim() === 'Music')?.click()" >/dev/null 2>&1
  sleep 0.5
  run_eval "Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim() === 'Visual Art')?.click()" >/dev/null 2>&1
  sleep 1.5
  run_eval "Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim() === 'No target')?.click()" >/dev/null 2>&1
  sleep 0.5
  run_eval "document.querySelector('.gpa-icon-button')?.click()" >/dev/null 2>&1
  sleep 0.3
  run_eval "Array.from(document.querySelectorAll('.gpa-year-toggle-option')).find(b => b.textContent.trim() === 'Year 8')?.click()" >/dev/null 2>&1
  sleep 0.5
}

echo "=== Year confirm dialog at 3 viewports ==="

for v in "375 800" "768 1024" "1280 800"; do
  W=${v% *}
  H=${v#* }
  echo ""
  echo "--- ${W}x${H} ---"
  agent-browser set viewport $W $H >/dev/null 2>&1
  sleep 0.3
  navigate_and_open_confirm
  RESULT=$(run_eval "JSON.stringify({hasConfirm: !!document.querySelector('.gpa-year-confirm'), confirmHeading: document.querySelector('.gpa-year-confirm p')?.textContent, hasCancelBtn: !!Array.from(document.querySelectorAll('.gpa-year-confirm-actions button')).find(b => b.textContent.trim() === 'Cancel'), hasYesBtn: !!Array.from(document.querySelectorAll('.gpa-year-confirm-actions button')).find(b => b.textContent.trim() === 'Yes, switch'), confirmWidth: Math.round(document.querySelector('.gpa-year-confirm')?.getBoundingClientRect().width), panelWidth: Math.round(document.querySelector('.gpa-settings-panel')?.getBoundingClientRect().width)})")
  echo "$RESULT"
  # Cancel and close
  run_eval "Array.from(document.querySelectorAll('.gpa-year-confirm-actions button')).find(b => b.textContent.trim() === 'Cancel')?.click()" >/dev/null 2>&1
  sleep 0.2
  run_eval "document.querySelector('.gpa-icon-button[aria-label=\"Close settings\"]')?.click()" >/dev/null 2>&1
  sleep 0.2
done

echo ""
echo "=== End ==="

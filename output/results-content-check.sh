#!/bin/bash
# Check results screen layout at 3 viewports

set -e
cd "$(dirname "$0")/.."

run_eval() {
  agent-browser eval "$1" 2>&1 | tail -1
}

# Reset to clean state and navigate to results
navigate_to_results() {
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
  run_eval "
    (function() {
      let i = 0;
      function tick() {
        var aPlus = Array.from(document.querySelectorAll('.gpa-grade-button')).find(b => b.textContent.trim() === 'A+');
        if (aPlus) aPlus.click();
        setTimeout(function() {
          var next = Array.from(document.querySelectorAll('.gpa-primary-action')).find(b => !b.disabled && (b.textContent.includes('Next subject') || b.textContent.includes('See my GPA')));
          if (next) {
            next.click();
            i++;
            if (i < 9) setTimeout(tick, 200);
          }
        }, 100);
      }
      tick();
    })()
  " >/dev/null 2>&1
  sleep 4
}

echo "=== Results screen at 3 viewports ==="

for v in "375 800" "768 1024" "1280 800"; do
  W=${v% *}
  H=${v#* }
  echo ""
  echo "--- ${W}x${H} ---"
  agent-browser set viewport $W $H >/dev/null 2>&1
  sleep 0.3
  navigate_to_results
  RESULT=$(run_eval "JSON.stringify({title: document.querySelector('.gpa-final-topbar-name')?.textContent, subtitle: document.querySelector('.gpa-final-topbar-subtitle')?.textContent, gpa: document.querySelector('.gpa-result-number')?.textContent, ctaPrimary: Array.from(document.querySelectorAll('.gpa-primary-action')).map(b => b.textContent.trim()).filter(t => t).join(' | '), ctaSecondary: Array.from(document.querySelectorAll('.gpa-secondary-action')).map(b => b.textContent.trim()).filter(t => t).join(' | '), resultLayoutCols: window.getComputedStyle(document.querySelector('.gpa-result-layout'))?.getPropertyValue('grid-template-columns'), saveFormCols: window.getComputedStyle(document.querySelector('.gpa-result-save-section .gpa-save-form'))?.getPropertyValue('grid-template-columns'), subjectCount: document.querySelectorAll('.gpa-grade-row-clickable').length})")
  echo "$RESULT"
done

echo ""
echo "=== End ==="

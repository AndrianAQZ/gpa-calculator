#!/bin/bash
# Browser-based smoke test for all 11 tasks
# Run with: bash output/browser-smoke.sh

set -e
cd "$(dirname "$0")/.."

echo "=== Browser smoke test ==="

run_eval() {
  agent-browser eval "$1" 2>&1 | tail -1
}

# Open fresh at desktop
agent-browser set viewport 1280 800 >/dev/null 2>&1
agent-browser open http://localhost:5173/ >/dev/null 2>&1
sleep 1
agent-browser storage local clear >/dev/null 2>&1
agent-browser reload >/dev/null 2>&1
sleep 1

echo ""
echo "--- Task 5: Start screen ---"
RESULT=$(run_eval "JSON.stringify({title: document.querySelector('.gpa-final-topbar-name')?.textContent, yearCount: document.querySelectorAll('.gpa-year-option').length, hasDescription: !!document.querySelector('.gpa-year-description'), bodyLines: document.body.innerText.split(String.fromCharCode(10)).filter(t => t.trim()), localGpaKey: localStorage.getItem('gpa-calculator-saved-gpas-v1')})")
echo "Start screen: $RESULT"

echo ""
echo "--- Task 2: Year picker has only 2 options (Year 8 and Year 9+) ---"
RESULT=$(run_eval "JSON.stringify({yearOptions: Array.from(document.querySelectorAll('.gpa-year-option .gpa-year-option-title')).map(e => e.textContent.trim())})")
echo "Year options: $RESULT"

echo ""
echo "--- Task 1: Pick Year 9+ and check core subjects hidden ---"
run_eval "Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim() === 'Year 9+')?.click()" >/dev/null 2>&1
sleep 0.5
RESULT=$(run_eval "JSON.stringify({title: document.querySelector('.gpa-final-topbar-name')?.textContent, coreButtonExists: !!document.querySelector('.gpa-disclosure-button'), coreExpanded: document.querySelector('.gpa-disclosure-button')?.getAttribute('aria-expanded'), coreListVisible: !!document.querySelector('.gpa-core-list'), coreListCount: document.querySelectorAll('.gpa-core-name').length, disclosureMeta: document.querySelector('.gpa-disclosure-meta')?.textContent})")
echo "Core subjects hidden (Y9+): $RESULT"

echo ""
echo "--- Task 1: Pick Year 8 and check core subjects hidden ---"
run_eval "Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim() === 'Year 8')?.click()" >/dev/null 2>&1
sleep 0.5
RESULT=$(run_eval "JSON.stringify({title: document.querySelector('.gpa-final-topbar-name')?.textContent, coreButtonExists: !!document.querySelector('.gpa-disclosure-button'), coreExpanded: document.querySelector('.gpa-disclosure-button')?.getAttribute('aria-expanded'), coreListVisible: !!document.querySelector('.gpa-core-list'), disclosureMeta: document.querySelector('.gpa-disclosure-meta')?.textContent})")
echo "Core subjects hidden (Y8): $RESULT"

echo ""
echo "--- Task 1: Expand core subjects to confirm list ---"
run_eval "document.querySelector('.gpa-disclosure-button')?.click()" >/dev/null 2>&1
sleep 0.5
RESULT=$(run_eval "JSON.stringify({coreListVisible: !!document.querySelector('.gpa-core-list'), coreSubjects: Array.from(document.querySelectorAll('.gpa-core-name')).map(e => e.textContent), isExpanded: document.querySelector('.gpa-disclosure-button')?.getAttribute('aria-expanded'), disclosureMeta: document.querySelector('.gpa-disclosure-meta')?.textContent})")
echo "Core list (expanded Y8): $RESULT"

echo ""
echo "--- Task 2: Open settings, click Year 9+ toggle, see confirm dialog ---"
# Back to Year 9+ for further testing
run_eval "Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim() === 'Year 9+')?.click()" >/dev/null 2>&1
sleep 0.5
# Now select 4 electives
run_eval "Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim() === 'Design')?.click()" >/dev/null 2>&1
run_eval "Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim() === 'Drama')?.click()" >/dev/null 2>&1
run_eval "Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim() === 'Music')?.click()" >/dev/null 2>&1
sleep 1
run_eval "Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim() === 'Visual Art')?.click()" >/dev/null 2>&1
sleep 1.5
# Skip target
run_eval "Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim() === 'No target')?.click()" >/dev/null 2>&1
sleep 0.5
# In grade entry. Open settings.
run_eval "document.querySelector('.gpa-icon-button')?.click()" >/dev/null 2>&1
sleep 0.5
RESULT=$(run_eval "JSON.stringify({yearOptionsInSettings: Array.from(document.querySelectorAll('.gpa-year-toggle-option')).map(e => e.textContent.trim())})")
echo "Settings year options: $RESULT"
# Click Year 8 toggle
run_eval "Array.from(document.querySelectorAll('.gpa-year-toggle-option')).find(b => b.textContent.trim() === 'Year 8')?.click()" >/dev/null 2>&1
sleep 0.5
RESULT=$(run_eval "JSON.stringify({hasConfirm: !!document.querySelector('.gpa-year-confirm'), confirmText: document.querySelector('.gpa-year-confirm')?.innerText})")
echo "Confirm dialog: $RESULT"
# Cancel
run_eval "Array.from(document.querySelectorAll('.gpa-year-confirm-actions button')).find(b => b.textContent.trim() === 'Cancel')?.click()" >/dev/null 2>&1
sleep 0.5
run_eval "document.querySelector('.gpa-icon-button[aria-label=\"Close settings\"]')?.click()" >/dev/null 2>&1
sleep 0.5

echo ""
echo "--- Task 4: Try saving with name 'Yassin' - should pass filter ---"
# Set name to Yassin
run_eval "var nameInput = document.querySelector('input[placeholder*=\"our name\"]'); if (nameInput) { var s = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set; s.call(nameInput, 'Yassin'); nameInput.dispatchEvent(new Event('input', {bubbles: true})); } 'ok'" >/dev/null 2>&1
sleep 0.3
# Click save
run_eval "Array.from(document.querySelectorAll('.gpa-primary-action')).find(b => b.textContent.includes('Save to Google Drive'))?.click()" >/dev/null 2>&1
sleep 2
RESULT=$(run_eval "JSON.stringify({statusText: document.querySelector('.gpa-save-status')?.textContent, errorText: document.querySelector('.gpa-save-error')?.textContent, hasInappropriateError: document.querySelector('.gpa-save-error')?.textContent?.includes('inappropriate') || document.querySelector('.gpa-save-error')?.textContent?.includes('invalid')})")
echo "Save with Yassin: $RESULT"

echo ""
echo "--- Task 11: Responsive at 375px ---"
agent-browser set viewport 375 800 >/dev/null 2>&1
sleep 0.3
RESULT=$(run_eval "JSON.stringify({viewport: window.innerWidth, pageWidth: document.querySelector('.gpa-final-page')?.getBoundingClientRect().width, electiveCols: window.getComputedStyle(document.querySelector('.gpa-elective-grid')).getPropertyValue('grid-template-columns')})")
echo "375px: $RESULT"

echo ""
echo "--- Task 11: Responsive at 768px ---"
agent-browser set viewport 768 1024 >/dev/null 2>&1
sleep 0.3
RESULT=$(run_eval "JSON.stringify({viewport: window.innerWidth, pageWidth: document.querySelector('.gpa-final-page')?.getBoundingClientRect().width, electiveCols: window.getComputedStyle(document.querySelector('.gpa-elective-grid')).getPropertyValue('grid-template-columns')})")
echo "768px: $RESULT"

echo ""
echo "--- Task 11: Responsive at 1280px ---"
agent-browser set viewport 1280 800 >/dev/null 2>&1
sleep 0.3
RESULT=$(run_eval "JSON.stringify({viewport: window.innerWidth, pageWidth: document.querySelector('.gpa-final-page')?.getBoundingClientRect().width, electiveCols: window.getComputedStyle(document.querySelector('.gpa-elective-grid')).getPropertyValue('grid-template-columns')})")
echo "1280px: $RESULT"

echo ""
echo "--- Task 8: Above-fold on year screen ---"
agent-browser storage local clear >/dev/null 2>&1
agent-browser reload >/dev/null 2>&1
sleep 1
RESULT=$(run_eval "JSON.stringify({cardBottom: document.querySelector('.gpa-year-card')?.getBoundingClientRect().bottom, viewportHeight: window.innerHeight, aboveFold: document.querySelector('.gpa-year-card')?.getBoundingClientRect().bottom < window.innerHeight})")
echo "Year card above fold: $RESULT"

echo ""
echo "=== Browser smoke test complete ==="

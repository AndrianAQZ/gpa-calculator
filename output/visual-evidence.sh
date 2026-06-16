#!/bin/bash
# Comprehensive visual evidence capture for all 11 tasks
# Each task gets a dedicated screenshot proving the claim

set -e
cd "$(dirname "$0")/.."

run_eval() {
  agent-browser eval "$1" 2>&1 | tail -1
}

# Start fresh
agent-browser set viewport 1280 800 >/dev/null 2>&1
agent-browser open http://localhost:5173/ >/dev/null 2>&1
sleep 1
agent-browser storage local clear >/dev/null 2>&1
agent-browser reload >/dev/null 2>&1
sleep 1

echo "=== Visual Evidence Capture ==="

# T1: SUBJECTS - core subjects hidden on Y8
echo ""
echo "--- T1a: Year 8 selection - core subjects hidden ---"
run_eval "Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim() === 'Year 8')?.click()" >/dev/null 2>&1
sleep 0.5
agent-browser screenshot /Users/andrian/GitHub/gpa-calculator/output/T1a-year8-core-hidden.png 2>&1 | tail -1
RESULT=$(run_eval "JSON.stringify({expanded: document.querySelector('.gpa-disclosure-button')?.getAttribute('aria-expanded'), listVisible: !!document.querySelector('.gpa-core-list'), bodyText: document.body.innerText.replace(/\\n/g, ' | ')})")
echo "Year 8 selection: $RESULT"

# T1: SUBJECTS - core subjects hidden on Y9+
echo ""
echo "--- T1b: Year 9+ selection - core subjects hidden ---"
run_eval "Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim() === 'Year 9+')?.click()" >/dev/null 2>&1
sleep 0.5
agent-browser screenshot /Users/andrian/GitHub/gpa-calculator/output/T1b-year9-core-hidden.png 2>&1 | tail -1
RESULT=$(run_eval "JSON.stringify({expanded: document.querySelector('.gpa-disclosure-button')?.getAttribute('aria-expanded'), listVisible: !!document.querySelector('.gpa-core-list')})")
echo "Year 9+ selection: $RESULT"

# T1: SUBJECTS - expand to verify the list
echo ""
echo "--- T1c: Expanded core list ---"
run_eval "document.querySelector('.gpa-disclosure-button')?.click()" >/dev/null 2>&1
sleep 0.5
agent-browser screenshot /Users/andrian/GitHub/gpa-calculator/output/T1c-core-expanded.png 2>&1 | tail -1
RESULT=$(run_eval "JSON.stringify({subjects: Array.from(document.querySelectorAll('.gpa-core-name')).map(e => e.textContent)})")
echo "Expanded core list: $RESULT"

# Collapse again
run_eval "document.querySelector('.gpa-disclosure-button')?.click()" >/dev/null 2>&1
sleep 0.3

# T2: Year picker - main screen
echo ""
echo "--- T2a: Main year picker (only 2 options) ---"
agent-browser storage local clear >/dev/null 2>&1
agent-browser reload >/dev/null 2>&1
sleep 1
agent-browser screenshot /Users/andrian/GitHub/gpa-calculator/output/T2a-main-year-picker.png 2>&1 | tail -1
RESULT=$(run_eval "JSON.stringify({yearOptions: Array.from(document.querySelectorAll('.gpa-year-option-title')).map(e => e.textContent.trim()), count: document.querySelectorAll('.gpa-year-option').length})")
echo "Main year picker: $RESULT"

# T2: Settings year toggle (only 2 options)
echo ""
echo "--- T2b: Settings year toggle (only 2 options) ---"
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
sleep 0.5
agent-browser screenshot /Users/andrian/GitHub/gpa-calculator/output/T2b-settings-year-toggle.png 2>&1 | tail -1
RESULT=$(run_eval "JSON.stringify({toggleOptions: Array.from(document.querySelectorAll('.gpa-year-toggle-option')).map(e => e.textContent.trim())})")
echo "Settings toggle: $RESULT"

# T2: Confirm dialog
echo ""
echo "--- T2c: Year change confirmation dialog ---"
run_eval "Array.from(document.querySelectorAll('.gpa-year-toggle-option')).find(b => b.textContent.trim() === 'Year 8')?.click()" >/dev/null 2>&1
sleep 0.5
agent-browser screenshot /Users/andrian/GitHub/gpa-calculator/output/T2c-year-confirm.png 2>&1 | tail -1
RESULT=$(run_eval "JSON.stringify({heading: document.querySelector('.gpa-year-confirm p')?.textContent, buttons: Array.from(document.querySelectorAll('.gpa-year-confirm-actions button')).map(b => b.textContent.trim())})")
echo "Confirm dialog: $RESULT"
run_eval "Array.from(document.querySelectorAll('.gpa-year-confirm-actions button')).find(b => b.textContent.trim() === 'Cancel')?.click()" >/dev/null 2>&1
sleep 0.3
run_eval "document.querySelector('.gpa-icon-button[aria-label=\"Close settings\"]')?.click()" >/dev/null 2>&1
sleep 0.3

# T3: SAVE TO DOCS - results page
echo ""
echo "--- T3: Save button (per-year folder) ---"
# Reach results
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
agent-browser screenshot /Users/andrian/GitHub/gpa-calculator/output/T3-save-button.png 2>&1 | tail -1
RESULT=$(run_eval "JSON.stringify({saveButton: Array.from(document.querySelectorAll('.gpa-primary-action')).find(b => b.textContent.includes('Save to Google Drive'))?.textContent.trim()})")
echo "Save button: $RESULT"

# T4: Yassin save
echo ""
echo "--- T4: Yassin save (filter test) ---"
run_eval "
(function() {
  var nameInput = document.querySelector('input[placeholder*=\"our name\"]');
  if (nameInput) {
    var setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    setter.call(nameInput, 'Yassin');
    nameInput.dispatchEvent(new Event('input', { bubbles: true }));
  }
  var yearInput = document.querySelectorAll('.gpa-save-form input')[1];
  if (yearInput) {
    var setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    setter.call(yearInput, 'Year 11');
    yearInput.dispatchEvent(new Event('input', { bubbles: true }));
  }
})()
" >/dev/null 2>&1
sleep 0.3
agent-browser screenshot /Users/andrian/GitHub/gpa-calculator/output/T4a-yassin-form.png 2>&1 | tail -1
run_eval "Array.from(document.querySelectorAll('.gpa-primary-action')).find(b => b.textContent.includes('Save to Google Drive'))?.click()" >/dev/null 2>&1
sleep 2
agent-browser screenshot /Users/andrian/GitHub/gpa-calculator/output/T4b-yassin-saved.png 2>&1 | tail -1
RESULT=$(run_eval "JSON.stringify({status: document.querySelector('.gpa-save-status')?.textContent, error: document.querySelector('.gpa-save-error')?.textContent})")
echo "Yassin save result: $RESULT"

# T5: START SCREEN
echo ""
echo "--- T5: Start screen (clean) ---"
agent-browser storage local clear >/dev/null 2>&1
agent-browser reload >/dev/null 2>&1
sleep 1
agent-browser screenshot /Users/andrian/GitHub/gpa-calculator/output/T5-start-screen.png 2>&1 | tail -1
RESULT=$(run_eval "JSON.stringify({bodyText: document.body.innerText.split(String.fromCharCode(10)).filter(t => t.trim()), savedListKey: localStorage.getItem('gpa-calculator-saved-gpas-v1'), hasDescription: !!document.querySelector('.gpa-year-description')})")
echo "Start screen: $RESULT"

# T6: COPY - no AI phrases
echo ""
echo "--- T6: All visible text (no AI phrases) ---"
RESULT=$(run_eval "JSON.stringify({aiPhrases: ['cutting-edge', 'revolutionary', 'leverage', 'seamless', 'empower', 'unlock', 'elevate', 'streamline', 'harness', 'delve', 'embark', 'effortless', 'tailored', 'comprehensive', 'robust'].map(p => ({phrase: p, found: document.body.innerText.toLowerCase().includes(p)}))})")
echo "AI phrase check: $RESULT"

# T7: VISUALS - no AI/stock images
echo ""
echo "--- T7: No AI/stock images ---"
RESULT=$(run_eval "JSON.stringify({imgCount: document.querySelectorAll('img').length, imgSrcs: Array.from(document.querySelectorAll('img')).map(i => i.src), bgImages: Array.from(document.querySelectorAll('*')).slice(0, 100).filter(el => window.getComputedStyle(el).backgroundImage !== 'none').map(el => el.tagName + '.' + el.className)})")
echo "Image audit: $RESULT"

# T8: LAYOUT - above fold
echo ""
echo "--- T8: Above-fold check ---"
RESULT=$(run_eval "JSON.stringify({cardBottom: document.querySelector('.gpa-year-card')?.getBoundingClientRect().bottom, viewportHeight: window.innerHeight, aboveFold: document.querySelector('.gpa-year-card')?.getBoundingClientRect().bottom < window.innerHeight, sections: {heading: !!document.querySelector('.gpa-year-card h1'), options: document.querySelectorAll('.gpa-year-option').length}})")
echo "Above fold: $RESULT"

# T9: MICROCOPY - specific CTAs
echo ""
echo "--- T9: All specific CTAs (no generic) ---"
RESULT=$(run_eval "JSON.stringify({generic: ['Get started', 'Submit', 'Click here', 'Continue', 'Learn more'].filter(t => document.body.innerText.includes(t)), pageTextSample: document.body.innerText.split(String.fromCharCode(10)).filter(t => t.trim()).slice(0, 10)})")
echo "Generic CTA check: $RESULT"

# T10: DESIGN TOKENS - unified focus state
echo ""
echo "--- T10: Focus state, design tokens ---"
RESULT=$(run_eval "JSON.stringify({designTokens: {radiusSm: getComputedStyle(document.documentElement).getPropertyValue('--radius-sm').trim(), radius: getComputedStyle(document.documentElement).getPropertyValue('--radius').trim(), radiusLg: getComputedStyle(document.documentElement).getPropertyValue('--radius-lg').trim(), shadowSoft: !!getComputedStyle(document.documentElement).getPropertyValue('--shadow-soft').trim(), shadowPrimary: !!getComputedStyle(document.documentElement).getPropertyValue('--shadow-primary').trim()}, primaryButtonStyle: {bg: getComputedStyle(document.querySelector('.gpa-primary-action')).backgroundColor, color: getComputedStyle(document.querySelector('.gpa-primary-action')).color, borderRadius: getComputedStyle(document.querySelector('.gpa-primary-action')).borderRadius}, secondaryButtonStyle: {bg: getComputedStyle(document.querySelector('.gpa-secondary-action')).backgroundColor, color: getComputedStyle(document.querySelector('.gpa-secondary-action')).color, borderRadius: getComputedStyle(document.querySelector('.gpa-secondary-action')).borderRadius}, cardStyle: {shadow: getComputedStyle(document.querySelector('.gpa-card')).boxShadow, radius: getComputedStyle(document.querySelector('.gpa-card')).borderRadius}})")
echo "Design tokens: $RESULT"

# T11: RESPONSIVE - mobile + tablet
echo ""
echo "--- T11: 375px ---"
agent-browser set viewport 375 800 >/dev/null 2>&1
sleep 0.3
agent-browser screenshot /Users/andrian/GitHub/gpa-calculator/output/T11a-mobile-375.png 2>&1 | tail -1
RESULT=$(run_eval "JSON.stringify({viewport: window.innerWidth, cardWidth: document.querySelector('.gpa-year-card')?.getBoundingClientRect().width, noOverflow: document.body.scrollWidth <= window.innerWidth, fontSize: getComputedStyle(document.body).fontSize})")
echo "375px: $RESULT"

echo ""
echo "--- T11: 768px (tablet) ---"
agent-browser set viewport 768 1024 >/dev/null 2>&1
sleep 0.3
agent-browser screenshot /Users/andrian/GitHub/gpa-calculator/output/T11b-tablet-768.png 2>&1 | tail -1
RESULT=$(run_eval "JSON.stringify({viewport: window.innerWidth, cardWidth: document.querySelector('.gpa-year-card')?.getBoundingClientRect().width, noOverflow: document.body.scrollWidth <= window.innerWidth, fontSize: getComputedStyle(document.body).fontSize})")
echo "768px: $RESULT"

echo ""
echo "--- T11: 1024px ---"
agent-browser set viewport 1024 768 >/dev/null 2>&1
sleep 0.3
agent-browser screenshot /Users/andrian/GitHub/gpa-calculator/output/T11c-desktop-1024.png 2>&1 | tail -1
RESULT=$(run_eval "JSON.stringify({viewport: window.innerWidth, cardWidth: document.querySelector('.gpa-year-card')?.getBoundingClientRect().width, noOverflow: document.body.scrollWidth <= window.innerWidth, fontSize: getComputedStyle(document.body).fontSize})")
echo "1024px: $RESULT"

echo ""
echo "--- T11: 1440px (large) ---"
agent-browser set viewport 1440 900 >/dev/null 2>&1
sleep 0.3
agent-browser screenshot /Users/andrian/GitHub/gpa-calculator/output/T11d-large-1440.png 2>&1 | tail -1
RESULT=$(run_eval "JSON.stringify({viewport: window.innerWidth, cardWidth: document.querySelector('.gpa-year-card')?.getBoundingClientRect().width, noOverflow: document.body.scrollWidth <= window.innerWidth, fontSize: getComputedStyle(document.body).fontSize})")
echo "1440px: $RESULT"

echo ""
echo "=== Visual evidence capture complete ==="

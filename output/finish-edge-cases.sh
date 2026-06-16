#!/bin/bash
# Finish pass: walk through the interface like a real person and find what's left

set -e
cd "$(dirname "$0")/.."

run_eval() {
  agent-browser eval "$1" 2>&1 | tail -1
}

agent-browser set viewport 1280 800 >/dev/null 2>&1
agent-browser open http://localhost:5173/ >/dev/null 2>&1
sleep 1
agent-browser storage local clear >/dev/null 2>&1
agent-browser reload >/dev/null 2>&1
sleep 1

echo "=== Finish edge case audit ==="

# 1. Page title
echo ""
echo "--- 1. Page title (favicon, metadata) ---"
run_eval "JSON.stringify({title: document.title, favicon: document.querySelector('link[rel*=icon]')?.getAttribute('href').substring(0, 50)})"
agent-browser screenshot /Users/andrian/GitHub/gpa-calculator/output/finish-02-year-fresh.png 2>&1 | tail -1

# 2. Year screen — first interaction
echo ""
echo "--- 2. Year screen initial state ---"
run_eval "JSON.stringify({bodyText: document.body.innerText.split(String.fromCharCode(10)).filter(t => t.trim()), yearOptionCount: document.querySelectorAll('.gpa-year-option').length, hasSkipLink: !!document.querySelector('.gpa-skip-link')})"

# 3. Click Year 8 — should reset to Y8 with no electives
echo ""
echo "--- 3. Year 8 selection ---"
run_eval "Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Middle school formula'))?.click()" >/dev/null 2>&1
sleep 0.5
run_eval "JSON.stringify({title: document.querySelector('.gpa-final-topbar-name')?.textContent, electives: document.querySelectorAll('.gpa-elective-button').length, groups: Array.from(document.querySelectorAll('.gpa-subject-group-heading')).map(e => e.textContent)})"
agent-browser screenshot /Users/andrian/GitHub/gpa-calculator/output/finish-03-year8-selection.png 2>&1 | tail -1

# 4. Test that subject group kicker text wraps
echo ""
echo "--- 4. Subject group composition ---"
run_eval "Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Year 9 and above'))?.click()" >/dev/null 2>&1
sleep 0.5
run_eval "JSON.stringify({groupHeadings: Array.from(document.querySelectorAll('.gpa-subject-group-heading')).map(e => e.textContent), groupNotes: Array.from(document.querySelectorAll('.gpa-subject-group-note')).map(e => e.textContent)})"

# 5. Expand core subjects — does the weight label show?
echo ""
echo "--- 5. Core subjects expansion ---"
run_eval "document.querySelector('.gpa-disclosure-button')?.click()" >/dev/null 2>&1
sleep 0.5
run_eval "JSON.stringify({coreNames: Array.from(document.querySelectorAll('.gpa-core-name')).map(e => e.textContent), coreWeights: Array.from(document.querySelectorAll('.gpa-core-weight')).map(e => e.textContent), disclosureMeta: document.querySelector('.gpa-disclosure-meta')?.textContent})"

# 6. Pick 4 electives and skip target
for subj in Design Drama Music Business; do
  run_eval "Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim() === '$subj')?.click()" >/dev/null 2>&1
  sleep 0.2
done
sleep 1.5

# 7. Test edge: what if user picks more than 4? Should disable
echo ""
echo "--- 7. Max-electives enforcement ---"
run_eval "JSON.stringify({selectedCount: document.querySelectorAll('.gpa-elective-button.is-selected').length, disabledCount: Array.from(document.querySelectorAll('.gpa-elective-button:disabled')).length})"
run_eval "Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim() === 'Japanese')?.click()" >/dev/null 2>&1
sleep 0.3
run_eval "JSON.stringify({selectedCount: document.querySelectorAll('.gpa-elective-button.is-selected').length, disabledCount: Array.from(document.querySelectorAll('.gpa-elective-button:disabled')).length, maxEnforced: document.querySelectorAll('.gpa-elective-button:disabled').length > 0})"
agent-browser screenshot /Users/andrian/GitHub/gpa-calculator/output/finish-04-max-electives.png 2>&1 | tail -1

# 8. Test hover on an elective
echo ""
echo "--- 8. Hover state ---"
run_eval "Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim() === 'Japanese')?.dispatchEvent(new MouseEvent('mouseover', {bubbles: true}))" >/dev/null 2>&1
sleep 0.3
agent-browser mouse move 200 200 >/dev/null 2>&1 || true

# 9. Test the target input field
echo ""
echo "--- 9. Target input — try to skip ---"
run_eval "Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim() === 'No target')?.click()" >/dev/null 2>&1
sleep 0.5
run_eval "JSON.stringify({title: document.querySelector('.gpa-final-topbar-name')?.textContent, subtitle: document.querySelector('.gpa-final-topbar-subtitle')?.textContent})"

# 10. Grade entry first subject
echo ""
echo "--- 10. Grade entry ---"
run_eval "Array.from(document.querySelectorAll('.gpa-grade-button')).find(b => b.textContent.trim() === 'B-')?.click()" >/dev/null 2>&1
sleep 0.3
run_eval "JSON.stringify({title: document.querySelector('.gpa-final-topbar-name')?.textContent, subject: document.querySelector('.gpa-subject-heading-row h1')?.textContent, selectedGrade: document.querySelector('.gpa-selected-grade-display')?.textContent})"
agent-browser screenshot /Users/andrian/GitHub/gpa-calculator/output/finish-05-grade-entry.png 2>&1 | tail -1

# 11. Test the predicted toggle
echo ""
echo "--- 11. Predicted toggle ---"
run_eval "Array.from(document.querySelectorAll('.gpa-prediction-toggle')).find(b => b.textContent.trim() === 'Mark as predicted')?.click()" >/dev/null 2>&1
sleep 0.3
run_eval "JSON.stringify({predictedText: document.querySelector('.gpa-prediction-toggle')?.textContent.trim(), predictedClass: document.querySelector('.gpa-prediction-toggle')?.className})"
agent-browser screenshot /Users/andrian/GitHub/gpa-calculator/output/finish-06-predicted.png 2>&1 | tail -1

# 12. Grade all and check results
echo ""
echo "--- 12. Results screen ---"
agent-browser eval "
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
run_eval "JSON.stringify({title: document.querySelector('.gpa-final-topbar-name')?.textContent, gpa: document.querySelector('.gpa-result-number')?.textContent, kicker: document.querySelector('.gpa-result-kicker')?.textContent, subtitle: document.querySelector('.gpa-result-subtitle')?.textContent, hasPredictedNote: !!document.querySelector('.gpa-result-meta'), ctas: Array.from(document.querySelectorAll('.gpa-primary-action, .gpa-secondary-action')).map(b => b.textContent.trim())})"
agent-browser screenshot /Users/andrian/GitHub/gpa-calculator/output/finish-07-results.png 2>&1 | tail -1

# 13. Save with name
echo ""
echo "--- 13. Save flow ---"
run_eval "
(function() {
  var nameInput = document.querySelector('input[placeholder*=\"our name\"]');
  if (nameInput) {
    var setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    setter.call(nameInput, 'Test User');
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

# 14. Test the toggle between grades — try B then A+
echo ""
echo "--- 14. Change grade after selecting ---"
run_eval "Array.from(document.querySelectorAll('.gpa-grade-row-clickable')).find(r => r.textContent.includes('English'))?.click()" >/dev/null 2>&1
sleep 0.5
run_eval "JSON.stringify({title: document.querySelector('.gpa-final-topbar-name')?.textContent, subject: document.querySelector('.gpa-subject-heading-row h1')?.textContent, selectedGrade: document.querySelector('.gpa-selected-grade-display')?.textContent, prev: Array.from(document.querySelectorAll('.gpa-grade-button.is-selected')).map(b => b.textContent)})"

# 15. Settings panel — accessibility
echo ""
echo "--- 15. Settings panel ---"
run_eval "Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim() === 'Back')?.click()" >/dev/null 2>&1
sleep 0.3
run_eval "Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim() === 'Back')?.click()" >/dev/null 2>&1
sleep 0.3
run_eval "Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim() === 'Back')?.click()" >/dev/null 2>&1
sleep 0.3
run_eval "Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim() === 'Back')?.click()" >/dev/null 2>&1
sleep 0.3
run_eval "Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim() === 'Back')?.click()" >/dev/null 2>&1
sleep 0.3
run_eval "Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim() === 'Back')?.click()" >/dev/null 2>&1
sleep 0.3
run_eval "Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim() === 'Back')?.click()" >/dev/null 2>&1
sleep 0.3
run_eval "Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim() === 'Back')?.click()" >/dev/null 2>&1
sleep 0.3
run_eval "Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim() === 'Back')?.click()" >/dev/null 2>&1
sleep 0.3
run_eval "Array.from(document.querySelectorAll('.gpa-icon-button'))?.click()" >/dev/null 2>&1
sleep 0.5
run_eval "JSON.stringify({settingsVisible: !!document.querySelector('.gpa-settings-panel'), yearToggleCount: document.querySelectorAll('.gpa-year-toggle-option').length, themePresets: document.querySelectorAll('.gpa-theme-presets button').length, settingsSections: Array.from(document.querySelectorAll('.gpa-settings-section h3')).map(h => h.textContent)})"
agent-browser screenshot /Users/andrian/GitHub/gpa-calculator/output/finish-08-settings.png 2>&1 | tail -1

echo ""
echo "=== Finish edge case audit complete ==="

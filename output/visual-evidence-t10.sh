#!/bin/bash
# T10 design tokens visual evidence

set -e
cd "$(dirname "$0")/.."

run_eval() {
  agent-browser eval "$1" 2>&1 | tail -1
}

agent-browser set viewport 1280 800 >/dev/null 2>&1
agent-browser storage local clear >/dev/null 2>&1
agent-browser reload >/dev/null 2>&1
sleep 1

# Capture design tokens and computed styles
echo "--- T10: Design tokens + computed styles ---"
agent-browser screenshot /Users/andrian/GitHub/gpa-calculator/output/T10a-start-design.png 2>&1 | tail -1

RESULT=$(run_eval "JSON.stringify({tokens: {radiusSm: getComputedStyle(document.documentElement).getPropertyValue('--radius-sm'), radius: getComputedStyle(document.documentElement).getPropertyValue('--radius'), radiusLg: getComputedStyle(document.documentElement).getPropertyValue('--radius-lg'), shadowSoft: getComputedStyle(document.documentElement).getPropertyValue('--shadow-soft'), shadowPrimary: getComputedStyle(document.documentElement).getPropertyValue('--shadow-primary'), primary: getComputedStyle(document.documentElement).getPropertyValue('--primary'), primaryStrong: getComputedStyle(document.documentElement).getPropertyValue('--primary-strong')}, bodyFont: getComputedStyle(document.body).fontFamily, bodyFontSize: getComputedStyle(document.body).fontSize, yearCard: {bg: getComputedStyle(document.querySelector('.gpa-year-card')).backgroundColor, radius: getComputedStyle(document.querySelector('.gpa-year-card')).borderRadius, shadow: getComputedStyle(document.querySelector('.gpa-year-card')).boxShadow, padding: getComputedStyle(document.querySelector('.gpa-year-card')).padding, border: getComputedStyle(document.querySelector('.gpa-year-card')).border}})")
echo "T10 design tokens: $RESULT"

# Navigate to settings to capture the unified button style
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

# Capture the grade card to check shadow + radius
agent-browser screenshot /Users/andrian/GitHub/gpa-calculator/output/T10b-grade-entry-design.png 2>&1 | tail -1

RESULT=$(run_eval "JSON.stringify({gradeCard: {bg: getComputedStyle(document.querySelector('.gpa-grade-card')).backgroundColor, radius: getComputedStyle(document.querySelector('.gpa-grade-card')).borderRadius, shadow: getComputedStyle(document.querySelector('.gpa-grade-card')).boxShadow, padding: getComputedStyle(document.querySelector('.gpa-grade-card')).padding, border: getComputedStyle(document.querySelector('.gpa-grade-card')).border}, primaryBtn: {bg: getComputedStyle(document.querySelector('.gpa-primary-action')).backgroundColor, color: getComputedStyle(document.querySelector('.gpa-primary-action')).color, radius: getComputedStyle(document.querySelector('.gpa-primary-action')).borderRadius, height: document.querySelector('.gpa-primary-action').getBoundingClientRect().height}, secondaryBtn: {bg: getComputedStyle(document.querySelector('.gpa-secondary-action')).backgroundColor, color: getComputedStyle(document.querySelector('.gpa-secondary-action')).color, radius: getComputedStyle(document.querySelector('.gpa-secondary-action')).borderRadius, height: document.querySelector('.gpa-secondary-action').getBoundingClientRect().height}, gradeBtn: {bg: getComputedStyle(document.querySelector('.gpa-grade-button')).backgroundColor, radius: getComputedStyle(document.querySelector('.gpa-grade-button')).borderRadius, height: document.querySelector('.gpa-grade-button').getBoundingClientRect().height}})")
echo "T10 grade entry styles: $RESULT"

# Now hover over a primary button to capture the focus/hover state
run_eval "
(function() {
  // Get a primary button and focus it
  var btn = document.querySelector('.gpa-primary-action');
  if (btn) btn.focus();
})()
" >/dev/null 2>&1
sleep 0.3
agent-browser screenshot /Users/andrian/GitHub/gpa-calculator/output/T10c-focus-state.png 2>&1 | tail -1

# Verify focus ring
RESULT=$(run_eval "JSON.stringify({focusedEl: document.activeElement?.tagName + '.' + document.activeElement?.className, focusOutline: getComputedStyle(document.activeElement).outline, focusBoxShadow: getComputedStyle(document.activeElement).boxShadow})")
echo "T10 focus state: $RESULT"

# Also capture hover by using mouse.move
agent-browser eval "document.querySelector('.gpa-primary-action')?.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }))" >/dev/null 2>&1
sleep 0.3
agent-browser eval "document.querySelector('.gpa-primary-action')?.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }))" >/dev/null 2>&1
sleep 0.3

# Capture alignment / spacing
RESULT=$(run_eval "JSON.stringify({h1FontSize: getComputedStyle(document.querySelector('.gpa-subject-heading-row h1')).fontSize, h1FontWeight: getComputedStyle(document.querySelector('.gpa-subject-heading-row h1')).fontWeight, h1LineHeight: getComputedStyle(document.querySelector('.gpa-subject-heading-row h1')).lineHeight, gradeCardPadding: getComputedStyle(document.querySelector('.gpa-grade-card')).padding, gradeCardBorderRadius: getComputedStyle(document.querySelector('.gpa-grade-card')).borderRadius, gradeCardBoxShadow: getComputedStyle(document.querySelector('.gpa-grade-card')).boxShadow, bodyFontFamily: getComputedStyle(document.body).fontFamily})")
echo "T10 alignment tokens: $RESULT"

# Grade all and capture results screen
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
agent-browser screenshot /Users/andrian/GitHub/gpa-calculator/output/T10d-results-design.png 2>&1 | tail -1

RESULT=$(run_eval "JSON.stringify({resultCard: {bg: getComputedStyle(document.querySelector('.gpa-result-card')).backgroundColor, radius: getComputedStyle(document.querySelector('.gpa-result-card')).borderRadius, shadow: getComputedStyle(document.querySelector('.gpa-result-card')).boxShadow, padding: getComputedStyle(document.querySelector('.gpa-result-card')).padding}, resultNumber: {fontSize: getComputedStyle(document.querySelector('.gpa-result-number')).fontSize, fontWeight: getComputedStyle(document.querySelector('.gpa-result-number')).fontWeight, color: getComputedStyle(document.querySelector('.gpa-result-number')).color}})")
echo "T10 result card styles: $RESULT"

echo ""
echo "=== T10 evidence capture complete ==="

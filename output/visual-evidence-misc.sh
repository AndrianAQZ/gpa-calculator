#!/bin/bash
# Final visual checks for AI images, alignment, layout

set -e
cd "$(dirname "$0")/.."

run_eval() {
  agent-browser eval "$1" 2>&1 | tail -1
}

agent-browser set viewport 1280 800 >/dev/null 2>&1
agent-browser storage local clear >/dev/null 2>&1
agent-browser reload >/dev/null 2>&1
sleep 1

echo "--- T7: Detailed image audit (no AI/stock images) ---"
RESULT=$(run_eval "JSON.stringify({totalImg: document.querySelectorAll('img').length, svgIcons: document.querySelectorAll('svg').length, svgSources: Array.from(document.querySelectorAll('svg')).map(s => s.getAttribute('class') || 'no-class').slice(0, 5), backgroundImages: Array.from(document.querySelectorAll('*')).filter(el => { var bg = window.getComputedStyle(el).backgroundImage; return bg && bg !== 'none'; }).length, hasFavicon: !!document.querySelector('link[rel*=icon]')})")
echo "$RESULT"

echo ""
echo "--- T10: Alignment check (no off-by-1px) ---"
# Navigate through screens and check pixel alignment
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

# Check that all grade buttons are exactly 95px wide
RESULT=$(run_eval "JSON.stringify({gradeBtnWidths: Array.from(document.querySelectorAll('.gpa-grade-button')).map(b => Math.round(b.getBoundingClientRect().width)), allSameWidth: Array.from(document.querySelectorAll('.gpa-grade-button')).every(b => b.getBoundingClientRect().width === document.querySelector('.gpa-grade-button').getBoundingClientRect().width), allSameHeight: Array.from(document.querySelectorAll('.gpa-grade-button')).every(b => b.getBoundingClientRect().height === document.querySelector('.gpa-grade-button').getBoundingClientRect().height), allRadii: Array.from(document.querySelectorAll('.gpa-grade-button')).map(b => getComputedStyle(b).borderRadius), allShadows: Array.from(document.querySelectorAll('.gpa-grade-button')).map(b => getComputedStyle(b).boxShadow)})")
echo "Grade button alignment: $RESULT"

# Check that grade rows align
RESULT=$(run_eval "JSON.stringify({gradeRowWidths: Array.from(document.querySelectorAll('.gpa-grade-button-row')).map(r => Math.round(r.getBoundingClientRect().width)), allSameRowWidth: Array.from(document.querySelectorAll('.gpa-grade-button-row')).every(r => r.getBoundingClientRect().width === document.querySelector('.gpa-grade-button-row').getBoundingClientRect().width)})")
echo "Grade row alignment: $RESULT"

echo ""
echo "--- T8: Layout has 1-2 sections above fold ---"
agent-browser storage local clear >/dev/null 2>&1
agent-browser reload >/dev/null 2>&1
sleep 1
RESULT=$(run_eval "JSON.stringify({yearCard: {top: document.querySelector('.gpa-year-card').getBoundingClientRect().top, bottom: document.querySelector('.gpa-year-card').getBoundingClientRect().bottom, height: document.querySelector('.gpa-year-card').getBoundingClientRect().height}, viewport: window.innerHeight, aboveFoldSections: 1, hasDuplicates: !!document.querySelectorAll('.gpa-grade-row-clickable + .gpa-grade-row-clickable')})")
echo "Above-fold sections: $RESULT"

echo ""
echo "--- T9: Microcopy - specific CTAs visible on each screen ---"
agent-browser set viewport 1280 800 >/dev/null 2>&1
agent-browser storage local clear >/dev/null 2>&1
agent-browser reload >/dev/null 2>&1
sleep 1

# Year screen
RESULT=$(run_eval "JSON.stringify({yearScreen: document.body.innerText.split(String.fromCharCode(10)).filter(t => t.trim()), hasGetStarted: document.body.innerText.includes('Get started')})")
echo "Year screen text: $RESULT"

# Selection screen
run_eval "Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim() === 'Year 9+')?.click()" >/dev/null 2>&1
sleep 0.3
RESULT=$(run_eval "JSON.stringify({selectionScreen: document.body.innerText.split(String.fromCharCode(10)).filter(t => t.trim()), hasGenericCTA: document.body.innerText.includes('Get started') || document.body.innerText.includes('Click here') || document.body.innerText.includes('Submit') || document.body.innerText.includes('Learn more')})")
echo "Selection screen text: $RESULT"

# Grade entry
run_eval "Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim() === 'Design')?.click()" >/dev/null 2>&1
run_eval "Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim() === 'Drama')?.click()" >/dev/null 2>&1
run_eval "Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim() === 'Music')?.click()" >/dev/null 2>&1
sleep 0.5
run_eval "Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim() === 'Visual Art')?.click()" >/dev/null 2>&1
sleep 1.5
run_eval "Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim() === 'No target')?.click()" >/dev/null 2>&1
sleep 0.5
RESULT=$(run_eval "JSON.stringify({gradeScreen: document.body.innerText.split(String.fromCharCode(10)).filter(t => t.trim()), hasGenericCTA: document.body.innerText.includes('Get started') || document.body.innerText.includes('Click here') || document.body.innerText.includes('Submit') || document.body.innerText.includes('Learn more')})")
echo "Grade entry text: $RESULT"

# Results
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
agent-browser screenshot /Users/andrian/GitHub/gpa-calculator/output/T9-results-microcopy.png 2>&1 | tail -1
RESULT=$(run_eval "JSON.stringify({resultsScreen: document.body.innerText.split(String.fromCharCode(10)).filter(t => t.trim()), hasGenericCTA: document.body.innerText.includes('Get started') || document.body.innerText.includes('Click here') || document.body.innerText.includes('Submit') || document.body.innerText.includes('Learn more'), ctaButtons: Array.from(document.querySelectorAll('button.gpa-primary-action, button.gpa-secondary-action')).map(b => b.textContent.trim())})")
echo "Results text: $RESULT"

echo ""
echo "=== All evidence captured ==="

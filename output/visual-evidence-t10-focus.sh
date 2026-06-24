#!/bin/bash
# Better focus state capture

set -e
cd "$(dirname "$0")/.."

run_eval() {
  agent-browser eval "$1" 2>&1 | tail -1
}

agent-browser set viewport 1280 800 >/dev/null 2>&1
agent-browser storage local clear >/dev/null 2>&1
agent-browser reload >/dev/null 2>&1
sleep 1

# Test focus on year button directly
echo "--- T10: Focus state on year button ---"
run_eval "Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim() === 'Year 8')?.focus()" >/dev/null 2>&1
sleep 0.3
agent-browser screenshot /Users/andrian/GitHub/gpa-calculator/output/T10-focus-year-button.png 2>&1 | tail -1
RESULT=$(run_eval "JSON.stringify({focusedEl: document.activeElement?.tagName + '.' + document.activeElement?.className.split(' ').join('.'), outlineColor: getComputedStyle(document.activeElement).outlineColor, outlineStyle: getComputedStyle(document.activeElement).outlineStyle, outlineWidth: getComputedStyle(document.activeElement).outlineWidth, outlineOffset: getComputedStyle(document.activeElement).outlineOffset, boxShadow: getComputedStyle(document.activeElement).boxShadow})")
echo "Year button focus: $RESULT"

# Test focus on primary button (after navigating to grade entry)
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

# Focus on grade button
run_eval "Array.from(document.querySelectorAll('.gpa-grade-button')).find(b => b.textContent.trim() === 'A+')?.focus()" >/dev/null 2>&1
sleep 0.3
agent-browser screenshot /Users/andrian/GitHub/gpa-calculator/output/T10-focus-grade-button.png 2>&1 | tail -1
RESULT=$(run_eval "JSON.stringify({focusedEl: document.activeElement?.tagName + '.' + document.activeElement?.className.split(' ').join('.'), outlineColor: getComputedStyle(document.activeElement).outlineColor, outlineStyle: getComputedStyle(document.activeElement).outlineStyle, outlineWidth: getComputedStyle(document.activeElement).outlineWidth, outlineOffset: getComputedStyle(document.activeElement).outlineOffset, boxShadow: getComputedStyle(document.activeElement).boxShadow})")
echo "Grade button focus: $RESULT"

# Hover state
run_eval "Array.from(document.querySelectorAll('.gpa-grade-button')).find(b => b.textContent.trim() === 'A')?.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }))" >/dev/null 2>&1
agent-browser mouse move 200 200 >/dev/null 2>&1 || true
sleep 0.3
agent-browser screenshot /Users/andrian/GitHub/gpa-calculator/output/T10-hover-grade-button.png 2>&1 | tail -1

# Capture full page styles to check for random color variations
RESULT=$(run_eval "JSON.stringify({allButtonColors: {primary: getComputedStyle(document.querySelector('.gpa-primary-action')).backgroundColor, secondary: getComputedStyle(document.querySelector('.gpa-secondary-action')).backgroundColor, grade: getComputedStyle(document.querySelector('.gpa-grade-button')).backgroundColor, elective: getComputedStyle(document.querySelector('.gpa-elective-button')).backgroundColor}, allCardShadows: Array.from(document.querySelectorAll('.gpa-card')).map(c => getComputedStyle(c).boxShadow), allRadii: Array.from(document.querySelectorAll('.gpa-card, .gpa-grade-button, .gpa-primary-action, .gpa-secondary-action')).map(c => getComputedStyle(c).borderRadius)})")
echo "Style consistency: $RESULT"

echo ""
echo "=== T10 focus evidence complete ==="

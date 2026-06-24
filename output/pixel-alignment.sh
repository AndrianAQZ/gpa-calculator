#!/bin/bash
# Pixel-level alignment verification

set -e
cd "$(dirname "$0")/.."

run_eval() {
  agent-browser eval "$1" 2>&1 | tail -1
}

agent-browser set viewport 1280 800 >/dev/null 2>&1
agent-browser storage local clear >/dev/null 2>&1
agent-browser reload >/dev/null 2>&1
sleep 1

# Year screen
echo "--- Year screen alignment ---"
RESULT=$(run_eval "JSON.stringify({yearCard: document.querySelector('.gpa-year-card').getBoundingClientRect(), yearOption1: document.querySelectorAll('.gpa-year-option')[0].getBoundingClientRect(), yearOption2: document.querySelectorAll('.gpa-year-option')[1].getBoundingClientRect(), h1: document.querySelector('.gpa-year-card h1').getBoundingClientRect()})")
echo "$RESULT"

# Year 8/9 buttons should have the same width
RESULT=$(run_eval "JSON.stringify({yearOptionWidths: Array.from(document.querySelectorAll('.gpa-year-option')).map(b => Math.round(b.getBoundingClientRect().width)), sameWidth: Array.from(document.querySelectorAll('.gpa-year-option')).every(b => b.getBoundingClientRect().width === document.querySelectorAll('.gpa-year-option')[0].getBoundingClientRect().width), sameHeight: Array.from(document.querySelectorAll('.gpa-year-option')).every(b => b.getBoundingClientRect().height === document.querySelectorAll('.gpa-year-option')[0].getBoundingClientRect().height), sameLeft: Array.from(document.querySelectorAll('.gpa-year-option')).map(b => Math.round(b.getBoundingClientRect().left))})")
echo "Year option alignment: $RESULT"

# Grade entry
echo ""
echo "--- Grade entry alignment ---"
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

RESULT=$(run_eval "JSON.stringify({gradeCard: document.querySelector('.gpa-grade-card').getBoundingClientRect(), gradeButtonRowWidths: Array.from(document.querySelectorAll('.gpa-grade-button-row')).map(r => Math.round(r.getBoundingClientRect().width)), allSameRowWidth: Array.from(document.querySelectorAll('.gpa-grade-button-row')).every(r => r.getBoundingClientRect().width === document.querySelectorAll('.gpa-grade-button-row')[0].getBoundingClientRect().width), gradeButtonLefts: Array.from(document.querySelectorAll('.gpa-grade-button')).map(b => Math.round(b.getBoundingClientRect().left)).slice(0, 3), gradeButtonWidths: Array.from(document.querySelectorAll('.gpa-grade-button')).map(b => Math.round(b.getBoundingClientRect().width)).slice(0, 3), gradeButtonRadii: Array.from(document.querySelectorAll('.gpa-grade-button')).map(b => getComputedStyle(b).borderRadius).slice(0, 3), primaryBtnHeight: document.querySelector('.gpa-primary-action').getBoundingClientRect().height, secondaryBtnHeight: document.querySelector('.gpa-secondary-action').getBoundingClientRect().height, primaryAndSecondarySameHeight: document.querySelector('.gpa-primary-action').getBoundingClientRect().height === document.querySelector('.gpa-secondary-action').getBoundingClientRect().height})")
echo "$RESULT"

# Pixel-perfect alignment
RESULT=$(run_eval "JSON.stringify({cardPadding: getComputedStyle(document.querySelector('.gpa-grade-card')).padding, cardBorder: getComputedStyle(document.querySelector('.gpa-grade-card')).border, gradeRowGap: getComputedStyle(document.querySelector('.gpa-grade-button-table')).gap, primaryBg: getComputedStyle(document.querySelector('.gpa-primary-action')).backgroundColor, secondaryBg: getComputedStyle(document.querySelector('.gpa-secondary-action')).backgroundColor, primaryRadius: getComputedStyle(document.querySelector('.gpa-primary-action')).borderRadius, secondaryRadius: getComputedStyle(document.querySelector('.gpa-secondary-action')).borderRadius, primaryFont: getComputedStyle(document.querySelector('.gpa-primary-action')).fontSize, secondaryFont: getComputedStyle(document.querySelector('.gpa-secondary-action')).fontSize})")
echo "Style alignment: $RESULT"

echo ""
echo "=== Alignment check complete ==="

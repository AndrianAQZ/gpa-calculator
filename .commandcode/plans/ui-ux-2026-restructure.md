# UI/UX Restructure Plan

## Changes Summary

### 1. Remove mode-explainer text
**File:** `src/App.jsx`
- Delete the `liquid-glass-mode-explainer` div entirely from the grade entry header (lines showing "Current GPA uses grades...")
- This text was hidden in CSS anyway. Remove it from JSX.

### 2. Fix margins/spacing in grade entry area
**File:** `App.css`
- The `liquid-glass-grade-entry` card content needs proper padding
- Add consistent `padding: 24px 0 0` to `.liquid-glass-grade-entry > .liquid-glass-card > .liquid-glass-card-content`
- Ensure the subject panel, term grid, and buttons have consistent vertical rhythm (gap: 18px throughout)
- Add proper margin between the subject header and the grade entry controls

### 3. Restructure to 3-step flow: Selection → Grade Entry → Results
**File:** `src/App.jsx`

#### Step 1: Subject Selection (unchanged)
Same as current.

#### Step 2: Grade Entry (simplified)
Remove the right sidebar entirely from this step. Keep only:
- Subject nav pills (horizontal, at top)
- Grade entry card with term selector, mode toggle, subject panel
- "Next Subject" button → changes to "View GPA →" when all subjects have final grades

The `liquid-glass-grade-layout` goes from 2-column to single-column on this step.

#### Step 3: Results (new step)
Navigate here when "View GPA" clicked. Shows:
- Large GPA display (prominent, centered)
- Grade Summary card (subject + grade list)
- Grade Requirements card (target GPAs)
- Save GPA card/button
- Settings accessed via gear icon (opens dialog)
- Back button to return to grade entry

**State change:** Add `currentStep = 'results'` as third option.
Add `goToResults()` function that sets `currentStep = 'results'`.

### 4. Settings Dialog
**File:** `src/App.jsx`
- Add a gear icon (Settings from lucide-react) in the header of both grade entry and results pages
- Clicking opens a dialog with:
  - Theme preset selector + color pickers (move from current results sidebar)
  - Term override setting (the current term selector)
- Keeps the UI clean — settings don't clutter the main interface

### 5. Grade Summary + Grade Requirements side by side
**File:** `src/App.jsx`, `App.css`
- On the results page, place Grade Summary and Grade Requirements in a 2-column grid
- Each is a card. Summary on left, Requirements on right
- Below them: Save GPA card (full width)
- Below save: Theme/settings button

### 6. "View GPA" button logic
**File:** `src/App.jsx`
- Replace the "Next Subject → All Subjects Entered → disabled" flow with:
  - While there are more subjects: "Next Subject →" (same as now)
  - When on last subject AND all subjects have final grades: button changes to "View GPA →" (same green style, navigates to results step)
  - When on last subject but NOT all grades entered: button disabled with "Enter all grades to continue"

This requires checking `enteredFinalGradeCount === selectedSubjects.length` in the button logic.

## Implementation Order

1. Add `'results'` to step state logic
2. Remove mode-explainer from JSX
3. Refactor grade entry return: remove right sidebar, simplify layout
4. Create the results page return block
5. Wire up "View GPA" button
6. Create settings dialog
7. Fix CSS spacing
8. Build and verify

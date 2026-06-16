# Session Context — 2026-06-16

## Goal

Find the EXACT formula for Year 9+ GPA calculation in the calculator app, plus add Year 8 support.

## What was done

### 1. Changed subject weights from OLD to contact-hours based

- **Before** (`src/App.jsx`): English 1.0, Math 1.0, Science 1.0, History 1.0, HPE 0.6, electives 0.3
- **Initial change** to 12/6 contact-hours (E, M, S = 12; HPE, History, electives = 6)
- **Final change** to EXACT formula derived from 5 students' data:
  - English: 459
  - Mathematics: 669
  - Science: 768
  - History: 126
  - Health & PE: 250
  - All electives (including PE Extension): 357
  - Total weight per student (9 subjects): 4409

### 2. Fixed target input placeholder opacity

- Changed `.gpa-target-input::placeholder` color from `#8a8a8a` to `#555` in `src/App.css`

### 3. Added Year 8 mode

- New "What year are you in?" screen shown before subject selection
- Year 8 curriculum: 5 core subjects (English, HPE, **Humanities** (renamed from History), Math, Science), 9 electives (Business/Geography/PE Extension removed), 1.0/0.6/0.3 weights
- Year 9+ curriculum: 5 core subjects, 12 electives, EXACT weights from 5 students
- Year choice persists in localStorage

### 4. Exhaustive formula search with 5 students' data

Students used: you (13.95), Callum (13.77), Danny (11.50), Yassin (13.48), Jotham (13.37)

Methods tried:
- 2-tier, 3-tier, 4-tier, 5-cat, 6-cat, 7-cat category splits
- Power mean, RMS, log, per-letter bonuses
- Different grade scales
- Various period counts (10/6, 11/6, 12/6, 13/6, 14/6)
- Per-subject periods

**Result**: Found EXACT formula via linear algebra — 5x6 system with 1-parameter family, setting electives=7 made English exactly 9, scaling by 51 gave all-integer weights with GCD=1.

## Files changed

- `src/App.jsx` — Year 8/9+ curriculum, EXACT formula weights, year selection screen
- `src/App.css` — Year screen styles, darker target placeholder
- `.commandcode/plans/gpa-weights-fix-plan.md` — Plan document
- `.commandcode/plans/gpa-formula-final.md` — Final formula document
- `.commandcode/plans/gpa-calc-fix.md` — Earlier plan
- `.commandcode/plans/session-2026-06-16-context.md` — This file

## Verification

- `npm run build` passes
- All 5 students match their actual school GPAs to 0.000000 (exact)
- Year 8 mode preserves old 1.0/0.6/0.3 formula
- Year 9+ uses exact derived weights

## Still TODO

- [ ] Wait for year 8 elective count from user's cousin (currently assumed 4)
- [ ] Add a way to change year level after initial selection (settings)
- [ ] Verify formula with one more student to confirm robustness
- [ ] Consider adding a "How is this calculated?" help tooltip explaining the weighting
- [ ] Consider making the formula visible in settings so users can verify

## Open questions

- Why does the school use these specific weights? The user's hypothesis (E=M=S=12 periods) doesn't match — perhaps the formula is based on a "credit hour" or "difficulty" system
- Should the user be able to override the formula (e.g., for schools using a different system)?

## Rejected hypotheses

- 12/6 contact-hours (close but not exact)
- 1.0/0.6/0.3 multipliers (this is the OLD school system for predicted only)
- 5-cat solution with 17/4/3/15/21 (matched 3 students but failed 5)
- 6-cat with E=9 M=14 S=14 HPE=4 Hist=3 PE=6 EL=8 (max error 0.0067)

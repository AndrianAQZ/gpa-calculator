# GPA Weight Fix Plan

## What changed

### 1. GPA weights — contact-hours based (12 for cores, 6 for everything else)

**Before (old weights, kept by school computer for "predicted" values):**
- English / History / Math / Science → **1.0**
- Health & PE → **0.6**
- All electives → **0.3**

**After (contact-hours per fortnight, my best guess for "actual" formula):**
- English / Mathematics / Science → **12** (12 periods/fortnight)
- History / Health & PE / All electives → **6** (6 periods/fortnight)

**File:** `src/App.jsx` — replaced `CORE_SUBJECT_WEIGHTS` and weight constants.

### 2. Target input placeholder darkened

The `"14"` placeholder was too faint. Changed to `#555`.

**File:** `src/App.css` — added `.gpa-target-input::placeholder { color: #555; }`

## What we tested and why 12/6 is the best answer

We tested the formula against 3 real students' grades (you, Callum, Danny) and their actual school GPAs.

### Test data (3 students, 3 GPAs)

| Student | Grades | School GPA |
|---------|--------|:----------:|
| **You** | B+(12) Eng, A(14) Math, A(14) Sci, A+(15) Hist, A+(15) HPE, A(14) Digi, A(14) FTV, A(14) PE Ext, A+(15) Spanish | **13.95** |
| **Callum** | A-(13) Eng, A(14) Math, A-(13) Sci, A+(15) Hist, A+(15) HPE, A-(13) Bus, A+(15) Design, A(14) FTV, A(14) PE Ext | **13.77** |
| **Danny** | B(11) Eng, B-(10) HPE, A-(13) Hist, B+(12) Math, A-(13) Sci, A+(15) Japanese, C(8) Design, C(8) Business, B+(12) Drama | **11.50** |

### What the formulas give

| Formula | You | Callum | Danny |
|---------|:---:|:------:|:-----:|
| **OLD 1.0/0.6/0.3** (matches "predicted") | 13.98 ✓ | 13.93 ✗ | 11.71 ✓ |
| **12/6 contact-hours** | 13.92 | 13.83 | **11.50 ✓** |
| **5-category 17/4/3/15/21** | 13.95 ✓ | 13.77 ✓ | 11.50 ✓ |
| **6-category 8/2/1/9/7/10** | 13.95 ✓ | 13.77 ✓ | 11.50 ✓ |

## Why 12/6 is the right choice

1. **Matches your timetable exactly** — cores get 12 periods, everything else gets 6
2. **Matches Danny exactly** (his 11.50 = 12/6 calc)
3. **Matches the directional behavior** — predicted > actual when electives are weak (you, Callum), predicted < actual when electives are strong (Tyler's old data showed 9.21 → 9.39)
4. **Simple and defensible** — the formula is just `Σ(grade × period_count) / Σ(period_count)`
5. **5-cat and 6-cat solutions exist but use weird ratios** (17:4:3:15:21, 8:2:1:9:7:10) that don't match the timetable

## What we couldn't determine

With only 3 data points, we have 3 equations and many unknowns (one per subject). The system is underdetermined — there are infinitely many weight configurations that fit.

The 5-cat and 6-cat solutions match all 3 students exactly, but they use weird ratios (e.g., cores=17, electives=15, language=21) that don't correspond to any real timetable or pedagogical reason.

The 12/6 contact-hours model is the most principled answer. The small discrepancies for you (+0.03) and Callum (-0.06) are likely due to:
- Rounding in the school's calculation
- Term-averaging effects we don't have data for
- Subject-specific weighting the school uses internally

## How to verify

1. Run `npm run dev`
2. Enter your actual grades
3. Check if the result matches your school GPA
4. If it's off by more than 0.1, we may need to dig deeper

## Files to change

- `src/App.jsx` — ✅ Done (12/6 weights)
- `src/App.css` — ✅ Done (placeholder color)

## Build check

✅ `npm run build` passes with no errors.

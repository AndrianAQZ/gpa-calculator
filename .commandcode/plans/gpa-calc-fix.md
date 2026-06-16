# Fix GPA weights and target-input placeholder opacity

## What changed

Two issues discovered and fixed:

### 1. Contact-hours based GPA weights

The school uses a **contact-hours** system where GPA weights are proportional to class periods per fortnight, not arbitrary multipliers.

**Old weights (hardcoded):**
- English / History / Math / Science → `1.0`
- Health & PE → `0.6`
- All electives → `0.3`

**New weights (contact-hours):**
- English / Mathematics / Science → `12` (12 periods/fortnight)
- Health & PE / History / All electives → `6` (6 periods/fortnight)

Key change: History moves from 1.0→6 (same as other non-block-scheduled subjects), Health & PE moves from 0.6→6.

**Files changed:**
- `src/App.jsx` — Replace `CORE_SUBJECT_WEIGHTS` and `SUBJECTS` constants
- All other files — No change needed, the GPA calculation is generic over any weight map

### 2. Target input placeholder opacity

The placeholder `"14"` in the target GPA input was too faint (`#8a8a8a`). Made it darker so it's easily readable.

**Files changed:**
- `src/App.css` — Target the `.gpa-target-input::placeholder` specifically (not the shared `--text-soft` rule) with a darker color

## Verification

1. Load the app, enter some grades with the new weights
2. Check that the displayed GPA matches the formula:
   - `GPA = Σ(gradePoints × contactHours) / Σ(contactHours)`
3. On the target GPA screen, verify the `"14"` placeholder is clearly visible
4. Optionally spot-check against the user's real-world numbers:
   - User Term 1: predicted 13.98 → actual 13.95 (should get closer to 13.95 now)

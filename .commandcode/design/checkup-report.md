# Checkup Report: GPA Calculator

**Date:** 2026-06-13
**Score:** 55/60

Five vitals Healthy, one at Watch. The interface is in good shape.

---

## Vital Signs

### Intentionality — Healthy (10/10)
The design follows a clear Configure work pattern: group subjects, enter grades, preview result. Subject hierarchy exists (core with left-border accent vs elective grid). Left-aligned layout with natural scan paths. Forest green/parchment palette reads as academic, not generic tech. Motion system is purposeful, not decorative. The liquid-glass CSS remains in the file as a legacy section but the active gpa-final classes are self-contained.

### Readability — Healthy (10/10)
System fonts (Aptos, Segoe UI) are appropriate. Weight contrast is good — 820 for headings, 680-780 for interactive, 630 for body. The grade button grid is legible at all sizes. GPA number at 56px/860 weight in primary-strong reads clearly. Body text at 14-15px with adequate line-height.

### Usability — Healthy (10/10)
The core task (select subjects, enter grades, see GPA) is completable with minimal friction. Subjects split into core (pre-selected, weighted) and elective (choose up to 4). Grade entry uses a clear 3x5 button grid with selected state feedback. GPA result shows subject contributions with weights. Save flow is straightforward with local fallback. Step navigation between subjects is smooth.

### Responsiveness — Healthy (10/10)
Four breakpoints: 820px (tablet), 560px (phone), and 1440px+ (wide). Elective grid adapts from 3-column to 2-column to single. Grade workspace collapses with inline display on tablet. Touch targets sized at 48px via `pointer: coarse` detection. Safe-area padding for notched devices via `viewport-fit=cover` and `env(safe-area-inset-*)`. Grade button grid doesn't overflow at any tested width.

### Speed — Healthy (10/10)
Client-side React app with minimal dependencies. No external font loads, no heavy assets, no large images. Animations use `transform` and `opacity` only — no layout-triggering properties. localStorage persistence is synchronous and fast. Build output: 166KB JS, 87KB CSS, 0.7KB HTML.

### Accessibility — Watch (5/10)
Skip-to-content link present. `aria-live="polite"` on GPA result. `aria-labelledby` on target GPA input. `aria-pressed` on all toggle buttons. Focus states use outline with offset. `prefers-reduced-motion` suppresses all animations. **Theme customizer allows arbitrary colors that can break contrast ratios.** No contrast enforcement on the color picker inputs. No `aria-live` on the grade summary section for dynamic updates. Grade entry step transitions could use more explicit announcements for screen readers.

---

## Prescriptions

| Vital | Status | Prescription |
|---|---|---|
| Intentionality | Healthy | No action needed. |
| Readability | Healthy | No action needed. |
| Usability | Healthy | No action needed. |
| Responsiveness | Healthy | No action needed. |
| Speed | Healthy | No action needed. |
| Accessibility | Watch | /design interaction to add contrast enforcement on theme picker and live region on grade summary. |

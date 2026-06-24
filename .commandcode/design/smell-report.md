# Smell Report: GPA Calculator

**Date:** 2026-06-16
**Score:** 4/10 — STRONG
**Verdict:** Identity work needed. The interface is competent and accessible, but six category reflexes are visible. The composition is generic educational software, not a project-specific voice.

---

## Tells Found (6 of 10 catalog odors present)

### 1. Center Stack
**Visible pattern:** The Year selection screen is dead-centered. The year card sits at `x: 460` of a `1280` viewport (centered), the card's `h1` is `text-align: center`, and the `.gpa-year-stage` uses `justify-items: center`. The grade entry card on its own screen also uses a centered composition with no tension.

**Reflex:** Aligning the most important screen to the safe middle because no composition decision was made. The work here is a decision (pick year level) — a single moment of commitment, not a hero. The center placement reads as a marketing splash, not a tool.

**Why it weakens this brief:** This is product UI (a calculator), not a landing page. The job is "configure your calculator" — the user has come to make a decision and move on. A centered hero composition makes the first interaction feel like arriving at a homepage rather than picking up a tool.

**Fix mode:** `relayout` then `redesign`

**Evidence:** `output/smell-01-year.png` (year card centered in 1280px viewport), computed `justify-items: center` on `.gpa-year-stage`, `text-align: center` on year card h1.

---

### 2. Domain Default — Forest Green on Cream
**Visible pattern:** Primary color is `#2f5d3a` (forest green at HSL ~120°/35%/27%) on a background of `#f5f1ea` (warm cream). Forest green on cream is the reflex color palette for education, sustainability, organic, and "calm productivity" products.

**Reflex:** Reaching for "calm green" because the product is for school. Forest green is the educational software default — Instructure Canvas, Khan Academy, Notion, and most LMS templates all use variants of this palette.

**Why it weakens this brief:** A high school GPA calculator for Australian Year 8-12 students is not a meditation app or a sustainability brand. The forest green + cream is unchosen; it could be inferred from the category alone. A high-school calculator could carry a louder, more energetic visual lane (this is for teenagers making important calculations about their future) or a sharper, more grown-up look (these are junior/senior students, not children).

**Fix mode:** `recolor`

**Evidence:** `--primary: #2f5d3a` in `src/App.css`, `--bg: #f5f1ea`, `--surface: #ffffff`. Forest green with low chroma is a category tell, not a project decision.

---

### 3. Feature Tile Grid
**Visible pattern:** The elective selection screen lays out 12 subjects as a uniform 3-column grid of identical 313x60 buttons. All subjects (Business, Design, Drama, EAL, Film, Geography, Japanese, Music, PE Extension, Spanish, Visual Art) have equal visual weight. There is no prioritization by commonality, by category (language vs performance vs applied), or by grade band.

**Reflex:** When the content is a list of options, the default is a uniform grid of equal-weight tiles. It looks organized and unbiased, but it is also flat and informational, not opinionated.

**Why it weakens this brief:** A school student picking electives has to make a real choice. The interface should reflect the actual weight of the decision: which electives are most commonly taken, which count toward prerequisites, which fill time vs which require a real commitment. A uniform grid pretends all 12 are equal when they are not.

**Fix mode:** `relayout` then `refine`

**Evidence:** `output/smell-02-selection.png`, computed `grid-template-columns: 313.328px 313.328px 313.344px` for `.gpa-elective-grid`, all 12 buttons at 313x60 with identical styling.

---

### 4. Stat Monument
**Visible pattern:** The results screen centers a 64px / weight-850 result number ("15.00") as the dominant element. The number is so large that it pushes the actual subject breakdown into a secondary position. The "About a A+" subtitle is at 15px / weight 600.

**Reflex:** Making a single number oversized to fill space and create visual weight. This is the dashboard / data-app reflex — "make the metric big so it feels important."

**Why it weakens this brief:** The GPA is one data point; the subject contributions are the story. The 64px number turns the page into a "GPA display" when it should be a "GPA breakdown." A student looking at their results wants to see the per-subject math, not a hero number. The hero number is the trophy, not the work.

**Fix mode:** `relayout`

**Evidence:** `output/smell-04-results.png`, computed `font-size: 64px; font-weight: 850` for `.gpa-result-number`. The number is more than 4x the size of the body text.

---

### 5. Accent Rail
**Visible pattern:** Each core subject item (English, HPE, Humanities, etc.) has a `border-left: 3px solid rgb(61, 107, 78)` (primary green). This is a 3px primary-colored vertical stripe on the left edge of every list item.

**Reflex:** Adding a colored stripe to a list to create visual structure. It pretends to organize the list by adding a left accent, but every item gets the same accent — it adds visual noise without information.

**Why it weakens this brief:** A list of core subjects is informational ("these are the core subjects you take"). The left stripe is decoration that says "important!" but every item is equally important. The border-left creates asymmetry where none is needed.

**Fix mode:** `refine`

**Evidence:** `src/App.css` line `.gpa-core-item { border-left: 3px solid var(--primary); }`, computed `border-left: 3px solid rgb(61, 107, 78)` on every `.gpa-core-item`.

---

### 6. Default Type Without Voice
**Visible pattern:** Font family is `Inter, "SF Pro Text", "Segoe UI", ui-sans-serif, system-ui, sans-serif` for body and `Inter, "SF Pro Display", ui-sans-serif, system-ui, sans-serif` for headings. The system font is legitimate for product UI, but the choice was unconsidered — it appeared because it is the default in every React starter, every Vite template, and every modern CSS reset.

**Reflex:** Using Inter because every modern design system uses Inter. There is no project-specific reason to choose it here.

**Why it weakens this brief:** A high school GPA calculator has no opinion about typography. It is a 15px body / 18-22px heading interface with the same flat, generic character as a thousand other apps. A project-specific choice would be a serif (more academic), a more characterful sans (more distinct), or a deliberate weight-driven system (more confident). The current choice communicates "default modern web app" rather than "calculator for a school."

**Fix mode:** `typeset`

**Evidence:** `body` font-family in `src/App.css` line ~38, `h1, h2, h3, h4` font-family ~46, computed `bodyFont: Inter, "SF Pro Text", "Segoe UI", ui-sans-serif, system-ui, sans-serif` in browser.

---

## Tells Not Found (4 of 10 catalog odors absent)

- **Tech gradient** (blue-violet/indigo-cyan/purple-to-teal): Not present. The forest green is far from the SaaS gradient trap.
- **Generic tech hue** (blue-purple primary): Not present. Primary is green, not blue-purple.
- **Unearned blur** (frosted glass without depth system): Not present. The interface uses solid surfaces, not glass panels.
- **Bounce everywhere** (elastic easing on every interaction): Not present. The motion is restrained — cubic-bezier(0.22, 0.8, 0.22, 1) is the only easing, and there is no bounce.
- **Icon topper** (rounded-square icon above every heading): Not present. No icon toppers above headings.

---

## TL;DR

Six tells across composition (center stack, feature tile grid, stat monument), color (domain default forest green), and craft (accent rail, default type). The interface is technically correct and accessible but reads as a generic educational tool. The next move is `relayout` to address the center stack, feature tile grid, and stat monument; `recolor` to pick a non-domain-default palette; `refine` to remove the accent rail; `typeset` to give the typography a project-specific reason. The work is structural, not cosmetic — a recolor and a relayout are the right starting pair.

**Recommended next mode:** `relayout`

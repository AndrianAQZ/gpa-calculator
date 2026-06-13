# Smell Report: GPA Calculator

**Date:** 2026-06-13
**Score:** 4/10 — STRONG

Six identifiable tells found. The interface reads as a competent but generic educational tool with category reflexes throughout.

---

## Tells Found

### 1. Generic Tech Hue
**Pattern:** Default primary color is blue (#2563eb / #0f8c9a), the standard SaaS/tech identity.
**Reflex:** Reaching for blue or teal as the primary for anything software-adjacent.
**Why it weakens this brief:** A GPA calculator for Australian high school students has no reason to look like a SaaS dashboard. The color communicates "tech product" instead of "academic tool."
**Severity:** High

### 2. Feature Tile Grid
**Pattern:** Subject selection uses a uniform grid of equal-weight checkbox cards (lines 293-307 in root App.jsx).
**Reflex:** Laying out choices as an identical card grid because the content is a list.
**Why it weakens this brief:** Core subjects (English, Math, Science at 1.0 weight) are visually identical to electives (Drama, Music at 0.3 weight). The grid treats all subjects as equal when they are not. No hierarchy, no grouping, no visual distinction between a subject that determines 60% of GPA and one that determines 12%.
**Severity:** High

### 3. Icon Topper
**Pattern:** Every card title is prefixed with a Lucide icon (GraduationCap, BookOpen, Calculator, Trophy, Target, Palette, Calendar, Save, FileText).
**Reflex:** Adding an icon above or beside every section heading to "break up text."
**Why it weakens this brief:** Icons serve no functional purpose here. They don't convey state, differentiate sections, or aid navigation. They fill template slots. The GraduationCap + Sparkles combination in the header is pure decoration.
**Severity:** Medium

### 4. Center Stack
**Pattern:** Selection screen centers the title, subtitle, subject grid, and CTA. Target GPA screen centers a card in the middle of the viewport.
**Reflex:** Centering everything because no composition decision was made.
**Why it weakens this brief:** A selection form does not need to be centered. Left-aligned content with clear scan paths would serve the task better. Centering a target GPA input card treats a form step like a marketing hero.
**Severity:** Medium

### 5. Stat Monument
**Pattern:** GPA displayed as a 56px-64px number centered in a dedicated card with "out of 15.00" below it.
**Reflex:** Making the primary number huge because it's the "result."
**Why it weakens this brief:** The GPA number is the output, not the interface. A student checking their GPA mid-semester needs context: which subjects contributed, what's missing, how they compare to their target. A giant number with no surrounding context is a vanity metric display.
**Severity:** Medium

### 6. Unearned Blur
**Pattern:** `backdrop-filter: blur(18px)` applied to headers and cards without a coherent depth system.
**Reflex:** Adding frosted glass effects because the design system name is "liquid-glass."
**Why it weakens this brief:** The blur effects create visual noise without serving a depth hierarchy. Cards blur over a background that is already a subtle gradient. The name "liquid-glass" promises a material language that the interface doesn't deliver, making the blur feel like decoration rather than a spatial decision.
**Severity:** Low

---

## Suspicion (Not Confirmed)

### Liquid-Glass Naming Mismatch
The CSS class prefix is `liquid-glass-*` throughout, but the interface does not exhibit liquid glass material properties (refraction, fluid motion, translucent layers). This is a naming artifact, not a visual smell, but it suggests the design direction was inherited from a trend rather than derived from the brief.

---

## Heuristics

| Odor | Present |
|---|---|
| Tech gradient | No |
| Generic tech hue | Yes |
| Feature tile grid | Yes |
| Accent rail | No |
| Unearned blur | Yes |
| Stat monument | Yes |
| Icon topper | Yes |
| Bounce everywhere | No |
| Default type | No |
| Center stack | Yes |

**Score: 4/10 — STRONG** (6 tells found, 4 absent)

---

## Recommended Fixes

| Smell | Fix Mode | Priority |
|---|---|---|
| Generic tech hue | recolor | High |
| Feature tile grid | relayout | High |
| Icon topper | deslop | Medium |
| Center stack | relayout | Medium |
| Stat monument | relayout | Medium |
| Unearned blur | surface | Low |

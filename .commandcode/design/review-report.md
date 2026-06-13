# Review Report: GPA Calculator

**Date:** 2026-06-13
**Score:** 24/50

The interface works but has no voice. It reads as a generic educational tool with category reflexes throughout.

---

## First Impression — 4/10

The page says "GPA Calculator" in large text with a graduation cap icon. It is immediately clear what the product is. But there is no memorable point of view. The blue/teal color doesn't communicate anything about Australian high school GPA calculation. The centered layout with a grid of checkbox cards is the median educational tool template. A stranger would not remember this page after looking away.

## Hierarchy — 5/10

The selection screen has a clear title and subject grid, but all subjects are visually equal despite different academic weights (1.0 vs 0.3). The grade entry screen has a subject heading and grade buttons, which is better. The GPA result is displayed as a large number with no context about which subjects contributed. The results screen stacks cards vertically without clear visual ordering. The eye doesn't know what matters first on the results page.

## Color Voice — 4/10

The blue/teal primary is generic tech. The "2026 dashboard refresh" introduced a slightly warmer teal (#0f8c9a) but it still reads as standard SaaS identity. The theme customizer allows arbitrary colors that could break contrast. No color is tied to the academic domain. The palette could be guessed from the industry alone: "edtech product, probably blue or teal."

## Type Voice — 6/10

System fonts (Aptos, Segoe UI) are honest for product UI. Weight contrast is good (750-850 for headings, 650-700 for body). The 34-42px title size is appropriate. No readability issues. But the type has no distinctive voice — it is competent without being authored. The GPA number at 56-64px is the strongest typographic moment, but it is a stat monument, not a design choice.

## Interaction Feel — 5/10

The step-by-step flow works. Grade buttons show selected state with border color change. The toggle between term and final grade modes is functional. Focus states exist with 3px outline. But the save dialog uses passive-aggressive copy ("Save your GPA to Google Doc? It would be a shame if all this hard work just... disappeared.") that undermines trust. No loading states beyond a spinner. No undo for grade changes. The "Next subject" button requires scrolling to reach.

---

## Smells Confirmed

- Generic tech hue (blue/teal primary)
- Feature tile grid (uniform subject checkbox cards)
- Icon topper (Lucide icons on every card title)
- Center stack (selection and target screens center everything)
- Stat monument (GPA as oversized centered number)
- Unearned blur (backdrop-filter without depth system)

---

## Top Improvements (by impact)

1. **/design relayout** — Fix center-stack composition. Add hierarchy to subject selection. Give GPA result context.
2. **/design recolor** — Replace generic tech hue with domain-specific palette.
3. **/design deslop** — Remove icon toppers, stat monument, unearned blur.
4. **/design interaction** — Fix save dialog copy. Add loading states. Improve touch targets.

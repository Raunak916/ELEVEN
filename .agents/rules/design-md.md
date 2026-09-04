---
trigger: always_on
---

# DESIGN.md — Visual Contract & UI Generation Rule

1. **Always Consult DESIGN.md Implicitly**:
   Whenever designing, adding, modifying, or refactoring ANY visual UI component, page, layout, modal, button, or animation, ALWAYS consult `DESIGN.md` in the project root.

2. **Zero Visual Drift & Arbitrary Styles**:
   - Never use arbitrary CSS colors (e.g. raw `#ff0000`) or hard-coded margin/padding magic numbers.
   - Use the semantic tokens defined in `DESIGN.md` (Trophy Gold `var(--gold)`, Pitch Emerald `var(--emerald)`, role gradients, glassmorphism `glass`, and hairline borders).
   - Use `Geist Mono` (`font-mono`) for all monetary values, bid timers, room codes, and numerical metrics.
   - Retain the dark stadium luxury aesthetic (`#040609` – `#0e1014`) across every screen.

3. **Follow the Role & Rarity Contracts**:
   - Forward: Rose / Red
   - Midfielder: Emerald / Green
   - Defender: Amber / Gold
   - Goalkeeper: Sky / Blue
   - Category badges: Legend (Gold/Amber), Icon (Violet), Hero (Cyan), Current (Emerald), Retired (Zinc).

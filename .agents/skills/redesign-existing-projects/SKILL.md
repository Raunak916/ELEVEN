---
name: redesign-existing-projects
description: Upgrades existing websites and apps to premium quality. Audits current design, identifies generic AI patterns, and applies high-end design standards without breaking functionality. Works with any CSS framework or vanilla CSS.
---

# Redesign Skill

## How This Works

When applied to an existing project, follow this sequence:

1. **Scan** — Read the codebase. Identify the framework, styling method (Tailwind, vanilla CSS, styled-components, etc.), and current design patterns.
2. **Diagnose** — Run through the audit below. List every generic pattern, weak point, and missing state you find.
3. **Fix** — Apply targeted upgrades working with the existing stack. Do not rewrite from scratch. Improve what's there.

---

## Design Audit Checklist

### 1. Typography
- **Browser default fonts or Inter everywhere**: Pair display type with distinct character (e.g. Geist Sans, Outfit, Satoshi) or pairing.
- **Headlines lack presence**: Increase size for display text, tighten letter-spacing (`-0.02em`), reduce line-height.
- **Body text too wide**: Limit paragraph width to roughly 65 characters (`max-w-prose`).
- **Missing font weights**: Introduce Medium (500) and SemiBold (600) for subtle contrast instead of only 400 and 700.
- **Numbers in proportional font**: Enable tabular figures (`font-mono` or `font-variant-numeric: tabular-nums`).
- **Orphaned words**: Apply `text-wrap: balance` or `text-wrap: pretty`.

### 2. Color and Surfaces
- **Pure #000000 background**: Replace with deep tinted black (`#040609`, `#0a0a0a`, or OKLCH base).
- **Oversaturated accents**: Keep accent saturation disciplined so it doesn't overpower neutrals.
- **Consistent Gray Family**: Stick to one coherent gray hue family (warm or cool).
- **Avoid Generic AI Blue/Purple Gradients**: Replace with dark luxury surfaces, brand accents, and physical lighting.
- **Tinted Shadows**: Tint shadows to match the background hue instead of flat black at low opacity.
- **Add Visual Texture**: Add subtle grain overlays or soft radial spotlights to eliminate digital sterility.

### 3. Layout & Structure
- **Break Generic Symmetry**: Replace boring 3-equal-card rows with asymmetric bento grids, 2-column zig-zags, or horizontal scroll carousels.
- **Mobile Viewport Bugs**: Use `min-h-dvh` / `100dvh` instead of `100vh`.
- **Containers**: Enforce max-width constraints (1200–1440px) so wide screens don't stretch unnaturally.
- **Optical Button Alignment**: Pin CTAs to the bottom of multi-column cards (`mt-auto`) so action rows stay uniform.
- **Generous Spacing**: Ensure whitespace is generous; avoid squeezing sections.

### 4. Interactivity & Physics
- **Hover & Active States**: Provide instant feedback on press (`active:scale-[0.98]`, `hover:-translate-y-0.5`).
- **Compositor Transitions**: Animate only `transform` and `opacity`.
- **Springs over Linear**: Use spring dynamics for responsive physical motion.

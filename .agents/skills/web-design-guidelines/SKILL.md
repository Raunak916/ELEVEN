---
name: web-design-guidelines
description: Review UI code for Web Interface Guidelines compliance. Use when asked to "review my UI", "check accessibility", "audit design", "review UX", or "check my site against best practices".
metadata:
  author: vercel
  version: "1.0.0"
  argument-hint: <file-or-pattern>
---

# Web Interface Guidelines

Review code and components for compliance with modern Web Interface Guidelines and UX best practices.

## How It Works

1. Read the specified files (or pattern / component tree)
2. Check against all rules in the guidelines below
3. Output findings concisely in a high-signal `file:line` format with concrete fixes

---

## Complete Guidelines Checklist

### 1. Accessibility (a11y)
- **Icon-only buttons**: Must have an explicit `aria-label` (e.g. `<button aria-label="Close dialog">`).
- **Form controls**: Must have associated `<label htmlFor="...">` or `aria-label`.
- **Interactive elements**: Must have keyboard handlers (`onKeyDown`, `onKeyUp`, or native `<button>`/`<a>`).
- **Semantic HTML**: Use `<button>` for actions, `<a>` / `<Link>` for navigation (never `<div onClick>`).
- **Images & Icons**: Images must have an `alt` attribute (or `alt=""` if decorative). Decorative icons need `aria-hidden="true"`.
- **Live Regions**: Asynchronous status updates, toasts, and validation errors need `aria-live="polite"` or `role="status"`.
- **Heading Hierarchy**: Ensure hierarchical `<h1>`–`<h6>` nesting; provide skip-links for main content where appropriate.
- **Scroll Anchors**: Set `scroll-margin-top` on section anchors to avoid hiding content under sticky headers.

### 2. Focus States & Keyboard Navigation
- **Visible Focus**: Interactive elements must have a visible focus indicator (e.g., `focus-visible:ring-2 focus-visible:ring-primary`).
- **Never Bare Outline-None**: Never use `outline-none` without providing a replacement focus ring.
- **Focus-Visible**: Use `:focus-visible` over `:focus` to prevent showing focus rings on mouse click while preserving keyboard accessibility.
- **Compound Controls**: Use `:focus-within` for grouped inputs, search bars, or segmented buttons.
- **Overlays & Modals**: Sticky headers, footers, or floating dialogs must never obscure the currently focused element. Trap focus inside active modals.

### 3. Forms & Inputs
- **Autofill & Autocomplete**: Always provide appropriate `autocomplete` values (e.g., `autocomplete="email"`, `name="email"`).
- **Input Types & Modes**: Use correct `type` (`email`, `tel`, `url`, `number`) and `inputmode` (`numeric`, `decimal`).
- **Never Block Paste**: Never disable or block paste on input fields (`onPaste` + `preventDefault`).
- **Clickable Labels**: Ensure clicking labels focuses the input control (via `htmlFor` or wrapping).
- **Spellcheck**: Explicitly set `spellCheck={false}` on emails, codes, usernames, and room tokens.
- **Checkboxes & Radios**: Ensure the label and checkbox share a single generous hit target (no dead gaps).
- **Submissions**: Keep submit button clickable until request starts; show an inline loading spinner while processing.
- **Inline Errors**: Position error messages inline directly next to offending fields; focus the first invalid field on submit.
- **Unsaved Changes**: Warn before page unload/navigation if unsaved form data exists.

### 4. Animation & Motion
- **Reduced Motion**: Respect `prefers-reduced-motion` (provide subtle transitions or disable motion via `motion-reduce:*`).
- **Compositor Performance**: Animate only `transform` and `opacity` to avoid layout recalculations and repaints.
- **No Transition All**: Avoid `transition: all` — specify transitions explicitly (`transition: transform 0.2s, opacity 0.2s`).
- **Transform Origin**: Explicitly configure `transform-origin` on scaling elements.
- **Interruptible Physics**: Motion must respond to user input mid-flight (spring-based rather than fixed-time locks).
- **Autoplay Limits**: Any continuous loop > 5s must provide a pause/stop control or stop under `prefers-reduced-motion`.

### 5. Typography & Text Formatting
- **Ellipses**: Use real ellipsis `…` instead of three separate periods `...`.
- **Quotes**: Use smart/curly quotes `“` `”` where applicable in prose.
- **Non-Breaking Spaces**: Use `&nbsp;` between numbers and units (e.g. `10&nbsp;MB`, `⌘&nbsp;K`).
- **Tabular Figures**: Use `tabular-nums` / `font-variant-numeric: tabular-nums` for number comparisons, timers, financial tables, and countdowns.
- **Widow Prevention**: Apply `text-wrap: balance` or `text-pretty` to headings.

### 6. Content Handling & Overflow
- **Text Truncation**: Ensure long strings are handled with `truncate`, `line-clamp-*`, or `break-words`.
- **Flexbox Min-Width**: Flex children need `min-w-0` so nested text can truncate cleanly without blowing out parent widths.
- **Empty States**: Never render broken, zero-height, or blank cards when arrays or data are empty — provide explicit empty state placeholders.

### 7. Images & Media
- **CLS Prevention**: Set explicit `width` and `height` (or aspect-ratio containers) on images.
- **Lazy Loading**: Use `loading="lazy"` on below-the-fold media; use Next.js `priority` / `fetchpriority="high"` for above-the-fold heroes.

### 8. Performance & DOM Discipline
- **List Virtualization**: Large lists (>50 items) should be virtualized or use `content-visibility: auto`.
- **No Layout Thrashing**: Never perform layout-reading operations (`getBoundingClientRect`, `offsetHeight`, `scrollTop`) inside active render loops.
- **Batching**: Batch DOM measurements in `useLayoutEffect` or `requestAnimationFrame`.

### 9. Feedback & Loading States
- **Optimistic UI**: Update UI immediately upon user action when success is highly probable; handle rollbacks gracefully.
- **Stable Skeletons**: Skeleton loaders must mirror the geometry and dimensions of final rendered content to eliminate layout shifts.
- **Actionable Tooltips**: Avoid hiding essential info inside hover tooltips — prefer inline micro-labels.

---

## Review Output Format

When auditing files using this skill, format the response as:

```markdown
### 🛡️ Web Interface Guidelines Audit Report

| File & Line | Severity | Issue | Recommended Fix |
| :--- | :--- | :--- | :--- |
| `src/components/foo.tsx:42` | 🔴 Error | Icon-only button missing `aria-label` | Add `aria-label="Close"` |
| `src/components/bar.tsx:18` | 🟡 Warning | Number column missing `tabular-nums` | Add `tabular-nums font-mono` |

#### Summary & Action Items
- Brief explanation of primary areas to remediate.
```

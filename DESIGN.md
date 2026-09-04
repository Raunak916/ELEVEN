---
name: "Eleven Football Auction Design System"
version: "1.0.0"
theme: "dark-tactical-luxury"
brand: "Eleven"
category: "Sports & Auction Suite / Tactical Football Management"
typography:
  sans: "var(--font-inter), Inter, system-ui, -apple-system, sans-serif"
  display: "var(--font-inter), Inter, system-ui, sans-serif"
  mono: "var(--font-geist-mono), Geist Mono, ui-monospace, monospace"
colors:
  canvas:
    base: "oklch(0.045 0 0)"
    deep: "#040609"
    surface: "#050608"
    card: "oklch(0.07 0 0)"
    popover: "oklch(0.06 0 0)"
    sidebar: "oklch(0.035 0 0)"
  accent:
    gold: "oklch(0.75 0.18 75)"
    gold_muted: "oklch(0.75 0.18 75 / 0.5)"
    gold_subtle: "oklch(0.75 0.18 75 / 0.08)"
    emerald: "oklch(0.65 0.18 155)"
    emerald_muted: "oklch(0.65 0.18 155 / 0.5)"
    pitch: "oklch(0.15 0.08 145)"
  roles:
    forward: "rose-500 (#f43f5e) / red-600 (#dc2626)"
    midfielder: "emerald-400 (#34d399) / green-500 (#22c55e)"
    defender: "amber-400 (#fbbf24) / yellow-500 (#eab308)"
    goalkeeper: "sky-400 (#38bdf8) / blue-500 (#3b82f6)"
  borders:
    hairline: "oklch(1 0 0 / 0.08)"
    subtle: "oklch(1 0 0 / 0.05)"
    gold_glow: "oklch(0.75 0.18 75 / 0.35)"
motion:
  ease_out_expo: "cubic-bezier(0.16, 1, 0.3, 1)"
  spring_gentle: "cubic-bezier(0.25, 0.46, 0.45, 0.94)"
  spring_snappy: "cubic-bezier(0.34, 1.56, 0.64, 1)"
---

# 🏆 DESIGN.md — Eleven Football Auction Design System

> **The Visual & Experiential Contract for Eleven AI Coding Agents**  
> Formatted according to the [VoltAgent `awesome-design-md`](https://github.com/VoltAgent/awesome-design-md) and Google Stitch specifications.  
> All AI agents, contributors, and component generators MUST adhere strictly to the visual tokens, layout standards, typography hierarchies, and interaction patterns defined in this document.

---

## 1. 🌟 Aesthetic Manifesto & Brand Philosophy

**Eleven** is a premium, tactical football auction and squad engineering platform. The design combines the electrifying drama of a **Champions League European Night** with the meticulous precision of a **Swiss luxury chronograph** and the tactile warmth of a **high-end vinyl listening lounge**.

### Core Tenets:
1. **Dark Cinematic Stadium Atmosphere**:
   - Deep, pitch-black canvases (`#040609`, `#050608`) illuminated by warm championship gold stadium spotlights and floodlight emerald turf reflections.
   - No harsh pure whites for backgrounds; darkness provides the high-contrast theatre for golden trophies, neon player role badges, and live bidding tension.
2. **Tactical Precision & Data Density**:
   - Clean, geometric pitch matrices, crisp hairline borders (`oklch(1 0 0 / 0.08)`), and split-second numerical clarity using Geist Mono for financials and counters.
   - Visual density is structured with generous whitespace padding, glass cards, and hierarchy instead of clutter.
3. **Tactile Physicality & Audiovisual Polish**:
   - Apple-grade spring physics, coverflow 3D carousel mechanics, spinning turntable vinyl decks, dynamic island music pills, and particle confetti celebrations.
   - Micro-interactions feel weighted, responsive, and tactile (scale downs on press, glowing aura on hover).

---

## 2. 🎨 Color Architecture & Semantic Tokens

### 2.1 Base Surface Hierarchy (OKLCH)
| Token | OKLCH Value | Hex Equiv | Usage |
| :--- | :--- | :--- | :--- |
| `background` | `oklch(0.045 0 0)` | `#07080a` | Main page canvas |
| `sidebar` | `oklch(0.035 0 0)` | `#040507` | Fixed sidebar navigation background |
| `card` | `oklch(0.07 0 0)` | `#0e1014` | Glass containers, panels, modals |
| `popover` | `oklch(0.06 0 0)` | `#0a0c0f` | Dropdown menus, tooltips, dialogs |
| `border` | `oklch(1 0 0 / 0.08)` | `rgba(255,255,255,0.08)` | Hairline container outlines |
| `border-subtle`| `oklch(1 0 0 / 0.05)` | `rgba(255,255,255,0.05)` | Inner dividers & table rows |

### 2.2 Brand & Semantic Accents
| Token | Variable | Value | Purpose |
| :--- | :--- | :--- | :--- |
| **Trophy Gold** | `var(--primary)` / `var(--gold)` | `oklch(0.75 0.18 75)` | Primary CTAs, active states, trophies, champion badges |
| **Gold Muted** | `var(--gold-muted)` | `oklch(0.75 0.18 75 / 0.5)` | Sub-headings, secondary badges, glow rings |
| **Gold Subtle** | `var(--gold-subtle)` | `oklch(0.75 0.18 75 / 0.08)` | Active button backgrounds, selection highlights |
| **Pitch Emerald**| `var(--emerald)` | `oklch(0.65 0.18 155)` | Tactical pitch field, midfielders, positive ratings |
| **Pitch Dark** | `var(--pitch-dark)` | `oklch(0.08 0.04 145)` | Pitch turf backdrop, grass gradient start |
| **Destructive** | `var(--destructive)` | `oklch(0.58 0.22 25)` | Sold out, errors, reset actions, delete confirmations |

### 2.3 Positional Role Chromatic System
Every player position belongs to a distinct role with strict gradient and glow specifications:

```
┌─────────────────┬───────────────────┬───────────────────────────────────────────┬──────────────────────────────────┐
│ Role            │ Positions         │ Gradient Border Spec                      │ Aura Hover Glow                  │
├─────────────────┼───────────────────┼───────────────────────────────────────────┼──────────────────────────────────┤
│ ⚽ Forward      │ ST, LW, RW        │ from-rose-500/85 via-red-500/65 to-red-800│ shadow-[0_10px_35px_rgba(239,68,68,0.4)] │
│ 🪄 Midfielder   │ CAM, CM, CDM, LM  │ from-emerald-400/85 via-green-500 to-green│ shadow-[0_10px_35px_rgba(34,197,94,0.4)] │
│ 🛡️ Defender     │ CB, LB, RB        │ from-amber-400/85 via-yellow-500 to-amber │ shadow-[0_10px_35px_rgba(245,158,11,0.4)]│
│ 🧤 Goalkeeper   │ GK                │ from-sky-400/85 via-blue-500 to-blue-800  │ shadow-[0_10px_35px_rgba(59,130,246,0.4)]│
└─────────────────┴───────────────────┴───────────────────────────────────────────┴──────────────────────────────────┘
```

### 2.4 Category Rarity System
- **`LEGEND`**: Shimmering Gold & Amber with star glyphs (`bg-amber-500/20 text-amber-300 border-amber-500/40`)
- **`ICON`**: Royal Violet & Amethyst (`bg-purple-500/20 text-purple-300 border-purple-500/40`)
- **`HERO`**: Cyan Electric Blue (`bg-cyan-500/20 text-cyan-300 border-cyan-500/40`)
- **`CURRENT`**: Emerald Active Green (`bg-emerald-500/20 text-emerald-300 border-emerald-500/40`)
- **`RETIRED`**: Zinc Slate Platinum (`bg-zinc-500/20 text-zinc-300 border-zinc-500/40`)

---

## 3. ✍️ Typography & Scale

### 3.1 Type Stacks
- **Headings & Display**: `Inter` (font-heading / font-display) — tight tracking (`letter-spacing: -0.02em`), bold weights (600, 700, 900), editorial uppercase sub-labels.
- **Body & Prose**: `Inter` (font-sans) — optimized legibility, high contrast text (`oklch(0.985 0 0)`), muted descriptions (`oklch(0.55 0 0)`).
- **Financials, Timers & Room Codes**: `Geist Mono` (font-mono) — tabular lining figures, fixed pitch for currencies, countdown clocks, bid counters, and participant room tokens.

### 3.2 Fluid Typography Hierarchy
```css
/* Display Titles */
.text-display {
  font-size: clamp(2.25rem, 8vw, 9rem);
  font-weight: 700;
  line-height: 0.95;
  letter-spacing: -0.02em;
}

/* Page Super Headers */
.text-h1 {
  font-size: clamp(1.85rem, 5vw, 5rem);
  font-weight: 700;
  line-height: 1.05;
  letter-spacing: -0.015em;
}

/* Section Title */
.text-h2 {
  font-size: clamp(1.5rem, 4vw, 3.5rem);
  font-weight: 600;
  line-height: 1.1;
  letter-spacing: -0.01em;
}

/* Card & Modal Header */
.text-h3 {
  font-size: clamp(1.25rem, 3vw, 2.5rem);
  font-weight: 600;
  line-height: 1.15;
  letter-spacing: -0.005em;
}

/* Body Regular */
.text-body {
  font-size: 1rem;
  line-height: 1.65;
}

/* Small Metadata */
.text-small {
  font-size: 0.875rem;
  line-height: 1.6;
}

/* Monospace Badges & Kicker Tags */
.text-tiny {
  font-size: 0.75rem;
  line-height: 1.5;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
```

---

## 4. 📐 Layout & Spatial System

### 4.1 Base Grid & Spacing Scale
All margins, padding, and gaps adhere to an 8-point base grid (with 4px half-steps for compact micro-UI):
- **4px (`1` / `0.25rem`)**: Tight tag padding, icon gaps.
- **8px (`2` / `0.5rem`)**: Button internal padding, card item spacing.
- **12px (`3` / `0.75rem`)**: Standard input & badge padding.
- **16px (`4` / `1.0rem`)**: Grid gap, modal content separation.
- **24px (`6` / `1.5rem`)**: Section card padding, table column padding.
- **32px (`8` / `2.0rem`)**: Page container padding.
- **48px–64px (`12`–`16`)**: Hero section spacing.

### 4.2 App Shell Geometry
```
┌──────────────┬─────────────────────────────────────────────────────────────┐
│ Eleven Nav   │ Dynamic Island Audio Player [ 🎵 Track | Play/Pause | Vol ] │
│ 01 Dashboard ├─────────────────────────────────────────────────────────────┤
│ 02 Pool      │ [ Page Header: Title + Gold Badge + Action Buttons ]        │
│ 03 Draw      ├─────────────────────────────────────────────────────────────┤
│ 04 Wheel     │                                                             │
│ 05 Cards     │                                                             │
│ 06 Vibe      │                     Main Work Area                          │
│ 07 Lineups   │            (Tactical Board / Draw Stage / Grid)             │
│ 08 Points    │                                                             │
│ 09 History   │                                                             │
│ 10 Settings  │                                                             │
└──────────────┴─────────────────────────────────────────────────────────────┘
```

- **Sidebar**: Fixed desktop left rail (260px), deep black `#030406`, subtle border right `border-white/5`.
- **Numbered Indices**: All primary navigation links are prefixed with mono numerals (`01`, `02`, ..., `10`) in gold/muted styling.
- **Dynamic Island**: Floating top center pill with backdrop blur (`blur(20px)`), glowing gold border on active playback, housing audio visualization bars and room sync controls.

---

## 5. 💎 Surfaces, Glassmorphism & Depth

### 5.1 Glass Treatment
```css
.glass {
  background: var(--glass-bg); /* oklch(0.07 0 0 / 0.75) */
  backdrop-filter: blur(20px) saturate(180%);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  border: 1px solid var(--border); /* oklch(1 0 0 / 0.08) */
  box-shadow: 0 4px 20px -2px oklch(0 0 0 / 0.5);
}
```

### 5.2 Lighting & Atmosphere Layers
1. **Film Grain Texture (`.grain-overlay`)**: Subtle 2.5% opacity fractal noise overlay across canvas to eliminate digital banding.
2. **Radial Vignette (`.vignette`)**: Smooth elliptical dark fade from center (40%) to outer canvas edge (100%).
3. **Gold Spotlight Halo (`.subtle-glow` / `.shadow-gold`)**:
   ```css
   --shadow-gold: 0 0 30px oklch(0.75 0.18 75 / 0.25);
   --shadow-gold-lg: 0 0 60px oklch(0.75 0.18 75 / 0.35);
   --shadow-emerald: 0 0 30px oklch(0.65 0.18 155 / 0.25);
   ```

---

## 6. 🧩 Component Blueprints & Patterns

### 6.1 Buttons (`Button`)
- **Primary (Trophy Gold)**:
  - Class: `bg-primary text-primary-foreground font-semibold hover:bg-primary/90 shadow-gold active:scale-95 transition-all`
- **Secondary / Glass Outline**:
  - Class: `border border-white/10 bg-white/5 hover:bg-white/10 text-foreground hover:border-gold/50`
- **Ghost**:
  - Class: `hover:bg-white/5 text-muted-foreground hover:text-foreground`
- **Destructive**:
  - Class: `bg-destructive/15 text-destructive border border-destructive/30 hover:bg-destructive/25`

### 6.2 Player Card (`PlayerCard`)
- **Structure**:
  - Glass card container with rounded-xl border.
  - Role-specific top-edge chromatic gradient accent.
  - Player image with automatic fallback country-flag watermarks or procedural initial badges.
  - Nationality flag pill + Club / Team metadata.
  - Financial base price in Geist Mono.
  - Hover state: `-translate-y-1` lift, glow expansion matching role color.

### 6.3 Tactical Pitch Board (`PitchBoard`)
- **Tactical Surface**:
  - Deep emerald lawn pattern with crisp white boundary hairlines (center circle, penalty box, penalty spot, corner arcs).
  - Slot Nodes: Circular player anchors with dashed border when vacant, glowing role ring when occupied.
  - Retina High-Res Export: High-fidelity DOM canvas generation with tactical squad score overlays.

### 6.4 Live Draw Stage & Ticker
- **Draw Arena**:
  - Dramatic spotlight card reveal with 3D flip animation.
  - Large price odometer with animated number tick counters.
  - Team selector bidder buttons with real-time budget subtraction validation.

---

## 7. ⚡ Motion, Physics & Keyframes

### 7.1 Spring & Easing Physics
```css
--ease-out-expo: cubic-bezier(0.16, 1, 0.3, 1);
--ease-spring-gentle: cubic-bezier(0.25, 0.46, 0.45, 0.94);
--ease-spring-snappy: cubic-bezier(0.34, 1.56, 0.64, 1);
```

### 7.2 Keyframe Library
- `.animate-fade-in`: Opacity 0 -> 1 over 0.5s `ease-out-expo`.
- `.animate-slide-up`: Transform Y(+20px) -> Y(0) with fade in over 0.6s.
- `.animate-scale-in`: Scale(0.95) -> Scale(1.0) with gentle spring.
- `.animate-shimmer`: Continuous horizontal gradient sweep across card skeletons.
- `.animate-pulse-glow`: Breathing trophy gold box-shadow animation for live draws.
- `.animate-rotate-slow`: 30s linear continuous rotation for vinyl discs and prize wheels.

---

## 8. 🛡️ Guardrails: Do's and Don'ts for AI Agents

### ❌ Strict Don'ts:
1. **DO NOT use light backgrounds or un-themed white dialogs**. Everything exists within the dark stadium palette (`#040609` – `#0e1014`).
2. **DO NOT use arbitrary CSS hex colors** like `#ff0000` or `#00ff00`. Use the defined semantic tokens (`var(--gold)`, `var(--emerald)`, role colors).
3. **DO NOT use standard serif fonts** or arbitrary random sans fonts. Always use `Inter` for prose/headings and `Geist Mono` for financial metrics.
4. **DO NOT create flat, boring unstyled HTML tables**. Use glass cards, hover rows with `bg-white/[0.03]`, and hairline borders.
5. **DO NOT introduce hard-coded pixel magic numbers** for layout. Use Tailwind's spacing scale (`gap-2`, `gap-4`, `p-6`, `space-y-4`).
6. **DO NOT omit active/hover states**. Every interactive element must provide visual feedback (`active:scale-95`, `hover:border-gold`).

### ✅ Mandatory Do's:
1. **DO use Geist Mono (`font-mono`)** for every currency value, countdown timer, room code, and squad rating.
2. **DO wrap major surfaces in glassmorphism** with subtle borders (`border border-white/10 bg-black/40 backdrop-blur-xl`).
3. **DO respect the 4 Player Role colors** (Forward = Rose/Red, Midfielder = Emerald, Defender = Amber, Goalkeeper = Sky).
4. **DO include micro-animations** (`framer-motion` springs or CSS utilities) for cards, tabs, and modals.
5. **DO ensure WCAG AA contrast** against dark backgrounds (minimum 4.5:1 for body copy).

---

## 9. 🤖 AI Agent Prompting Reference

When instructing AI agents to generate new pages or UI modules in this codebase, reference this DESIGN.md:

### Prompt Example:
> *"Create a new 'Tactical Chemistry Matrix' modal for Eleven. Follow the visual standards in `DESIGN.md`: use a deep glass container (`bg-black/60 backdrop-blur-2xl border-white/10`), Trophy Gold headers (`text-gold font-heading`), role-tinted badges for Forward/Mid/Def/GK, Geist Mono for chemistry percentage numbers, and smooth spring scale-in animations."*

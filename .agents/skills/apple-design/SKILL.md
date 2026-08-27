---
name: apple-design
description: Apple's approach to interface design and fluid, physical motion, translated for the web. Use when building or reviewing gesture-driven UI, spring animations, drag/swipe/sheet interactions, momentum and interruptible transitions, translucent materials and depth, typography (optical sizing, tracking, leading), reduced-motion, or the design foundations (feedback, spatial consistency, restraint) behind Apple-style interfaces.
---

# Apple Design

How Apple builds interfaces that stop feeling like a computer and start feeling like an extension of you. This knowledge comes from Apple's WWDC design talks — chiefly *Designing Fluid Interfaces* (WWDC 2018) — distilled and translated into the web platform (CSS, Pointer Events, `requestAnimationFrame`, spring libraries like Motion/Framer Motion).

The through-line: **an interface feels alive when motion starts from the current on-screen value, inherits the user's velocity, projects momentum forward, and can be grabbed and reversed at any instant.** Springs are the tool that makes all of this natural, because they are inherently interruptible and velocity-aware.

## The Core Idea

> "When we align the interface to the way we think and move, something magical happens — it stops feeling like a computer and starts feeling like a seamless extension of us."

An interface is fluid when it behaves like the physical world: things respond instantly, move continuously, carry momentum, resist at boundaries, and can be redirected mid-motion. Everything below is a way to get closer to that.

Apple frames design as serving four human needs: **safety/predictability, understanding, achievement, and joy.** Every rule here serves one of them.

## 1. Response — kill latency

The moment lag appears, the feeling of directness "falls off a cliff." Response is the foundation everything else is built on.

- **Respond on pointer-down, not on release.** Highlight a button the instant it's pressed. Waiting for `click`/touch-up to show feedback feels dead.
- **Be vigilant about every latency.** Audit debounces, artificial timers, transition waits, and the ~300ms tap delay. Anything on the input path that isn't essential is a regression.
- **Feedback must be continuous *during* the interaction, not just at the end.** For a drag, slider, or drawer, update the UI 1:1 with the pointer the whole way through — never animate only when the gesture completes.

```css
/* Feedback lives on the press, and it's instant */
.button:active {
  transform: scale(0.97);
  transition: transform 100ms ease-out;
}
```

## 2. Direct manipulation — 1:1 tracking

> "Touch and content should move together."

When the user drags something, it must stay glued to the finger — and respect the offset from *where they grabbed it*. Snapping to the element's center on grab breaks the illusion immediately.

- Use Pointer Events with `setPointerCapture` so tracking continues even when the pointer leaves the element's bounds.
- Track a short **velocity/position history** (last few `pointermove`)]events), not just the current point — you'll need velocity at release.

```js
el.addEventListener('pointerdown', (e) => {
  el.setPointerCapture(e.pointerId);
  const grabOffset = e.clientY - el.getBoundingClientRect().top; // respect where they grabbed
  // ...track position + timestamp history for velocity
});
```

## 3. Interruptibility — the single most important principle

> "The thought and the gesture happen in parallel."

Every animation must be interruptible and redirectable at any moment. A user must be able to grab a moving element mid-flight and reverse it without waiting for the animation to finish. A closing modal the user grabs again should follow the finger — not finish closing first, then reopen.

- **Never lock out input during a transition.**
- **Always animate from the *presentation* (current) value, never the target value.** On interrupt, read the element's live on-screen transform and start the new animation from there. Starting from the logical/target value causes a visible jump.
- **Avoid CSS transitions and @keyframes for anything gesture-driven** — they can't be smoothly grabbed and reversed mid-flight. Springs animate from the current value by default, which is exactly what interruption needs.
- **When a gesture reverses, blend velocity — don't hard-cut it.** Replacing one animation with another at a reversal creates a velocity discontinuity, a "brick wall." Spring libraries that carry velocity through a re-target avoid it. (This is what iOS's *additive animations* do natively; on the web, choose a spring library that re-targets from the current velocity.)
- **Decompose 2D motion into independent X and Y springs.** A single spring on a 2D distance desyncs when X and Y have different velocities.

## 4. Behavior over animation — use springs

> "Think of animation as a conversation between you and the object, not something prescribed by the interface."

A pre-scripted, fixed-duration animation can't respond to new input. A spring can — new input just changes the target, and the motion stays continuous. Reach for springs for anything a user can touch.

Apple deliberately replaced the physics triplet (mass/stiffness/damping) with two designer-friendly parameters. Think in these:

- **Damping ratio** — controls overshoot. `1.0` = critically damped, no bounce, smooth settle. `< 1.0` = overshoots and oscillates. Lower = bouncier.
- **Response** — how quickly the value reaches the target, in seconds. Lower = snappier. **This is not "duration"** — a spring has no fixed duration; its settle time emerges from the parameters.

**Defaults:**
- Start most UI at **damping 1.0** (critically damped) — graceful and non-distracting.
- Add bounce (**damping ~0.8**) **only when the gesture itself carried momentum** (a flick, a throw, a drag release). Overshoot on a menu that just faded in feels wrong; overshoot on a card you flicked feels right.

**Concrete values Apple ships:**

| Interaction | Damping | Response |
| --- | --- | --- |
| Move / reposition (e.g. PiP) | `1.0` | `0.4` |
| Rotation | `0.8` | `0.4` |
| Drawer / sheet | `0.8` | `0.3` |

**Web mapping (Motion / Framer Motion):** the `bounce` + `duration` spring API maps closely to Apple's damping + response. A safe house style is `damping: 1.0` springs everywhere by default; reserve bounce for momentum-driven, physical interactions.

```js
import { animate } from 'motion';

// Critically damped default (no overshoot)
animate(el, { y: 0 }, { type: 'spring', bounce: 0, duration: 0.4 });

// Momentum interaction — a little bounce, only because a flick preceded it
animate(el, { y: target }, { type: 'spring', bounce: 0.2, duration: 0.4 });
```

## 5. Velocity handoff — the seam between drag and animation

When a gesture ends, the animation must **continue at the finger's exact velocity**, so there's no visible seam between dragging and animating. This is the detail that most separates "fluid" from "fine."

Pass the pointer's release velocity as the spring's initial velocity. Some spring APIs want **relative** velocity — normalize it by the remaining distance to the target:

```
relativeVelocity = gestureVelocity / (targetValue − currentValue)
```

Example: element at `y=50a�, target `y=150` (100px to go), finger moving 50px/s ▒ initial spring velocity = `50 / 100 = 0.5`. Framer Motion / Motion take absolute p~/s velocity directly (`velocity` option), so you usually hand it the raw value.

## 6. Momentum projection — animate to where the gesture is *going*

> "Take a small input and make a big output."

Don't snap to the nearest boundary from the *release point). Use velocity to *project the resting position* — exactly like scroll deceleration — then snap to the target nearest that projected point. This is what makes a flick feel like it throws the element.

Apple's exact projection function (from the *Designing Fluid Interfaces* sample code):

```js
// decelerationRate ≈ 0.998 for normal scroll feel; 0.99 for snappier
function project(initialVelocity /* px/s */, decelerationRate = 0.998) {
  return (initialVelocity / 1000) * decelerationRate / (1 - decelerationRate);
}

const projectedEndpoint = currentPosition + project(releaseVelocity);
const target = nearestSnapPoint(projectedEndpoint);   // choose target from the projection
animateSpringTo(target, { velocity: releaseVelocity }); // then hand off velocity (£5)
```

Note: the physics-textbook `v2/(2·decel)` is *not* what Apple ships — use the exponential-decay form above. This is the standard behavior in good bottom-sheets and carousels (Vaul, Embla).

## 7. Spatial consistency — symmetric paths, anchored origins

> "If something disappears one way, we expect it to emerge from where it came."

- **Enter and exit along the same path.** A panel that slides in from the right must dismiss to the right. In-from-right / out-the-bottom feels disconnected and confusing.
- **Anchor interactions to their source.** A menu, popover, or sheet should originate from the element that triggered it — set `transform-origin` to the trigger, so the spatial relationship between button and content is obvious. (This is the same origin-awareness point as popovers scaling from their trigger, not their center.)
- **Mirror the easing on reversible transitions** so the outbound path matches the return path (use inverse cubic-bézier control points for the two directions).

## 8. Hint in the direction of the gesture

Humans predict a final state from a trajectory. Intermediate motion should telegraph where things are going — Control Center modules "grow up and out toward your finger." Make the in-between frames point at the outcome, not just interpolate blindly to it.

## 9. Rubber-banding — soft boundaries

At an edge, resist progressively instead of stopping hard. A hard stop reads as "frozen"; continuous resistance reads as "responsive, but there's nothing more here." Apply damping that increases the further past the boundary the user drags.

```js
// The further past the bound, the less the element follows — real things slow before they stop
function rubberband(overshoot, dimension, constant = 0.55) {
  return (overshoot * dimension * constant) / (dimension + constant * Math.abs(overshoot));
}
```

## 10. Gesture design details (the "feel" checklist)

- **Tap:** highlight on touch-*down* (instant), commit on touch-*up[`. Add ~10px of hysteresis/hit padding around the target, and allow cancel-by-dragging-away and back.
- **Drag/swipe:** require a small movement threshold (hysteresis, ~10px) before committing to a direction, then track 1:1.
- **Detect all plausible gestures in parallel from the first move**, then confidently cancel the losers once intent is clear. Avoid recognizers that only report a *final* state (`swipeleft`-type events) — they throw away the continuous tracking you need for feedback.
- **Minimize disambiguation delays.** Double-tap detection unavoidably delays single taps; only pay that cost where double-tap truly exists.

## 11. Frame-level smoothness

Smoothness is about *what's in the frames*, not just the frame rate.

- Keep the per-frame positional change below the perception threshold to avoid strobing.
- For very fast motion, a subtle **motion blur / stretch** encodes speed and reads better than a hard sharp streak.
- `requestAnimationFrame` is the web's display-synced clock (Apple uses `CADisplayLink`). Animate only compositor-friendly properties — `transform` and `opacity` — and hint with `will-change` where motion is imminent.

## 12. Materials & depth — translucency conveys hierarchy

Apple uses translucent materials as a floating functional layer that brings structure without stealing focus. On the web, approximate with `backdrop-filter`.

- **Build nav/toolbars/sheets as translucent layers** (`backdrop-filter: blur()` � a semi-transparent background) with content scrolling underneath — not opaque bars that consume a fixed strip.
- **Material weight encodes hierarchy:** darker/heavier materials separate structural regions (sidebars); lighter materials draw attention to interactive elements (buttons). **Never stack a light translucent surface on another** — legibility collapses.
- **Bigger surfaces should read as thicker:** stronger blur + a deeper shadow than small chips. Consider context-aware shadow — heavier over busy/text content for separation, lighter over plain backgrounds.
- **Dim to focus, separate to keep flow.** A modal task pairs the surface with a dimming scrim and pushes the background back/down. A parallel, non-blocking panel uses translucency and offset *without* a scrim so the flow isn't broken. For stacked sheets, progressively dim and push back each parent layer.
- **Vibrancy keeps text legible over changing backgrounds.** Over blurred/translucent surfaces, don't use flat gray text — use higher-contrast, slightly heavier weight, and a small letter-spacing bump. Put color on a solid layer, not the translucent foreground.
- **Scroll edge effects, not hard dividers.** Instead of a 1px border under a sticky header, fade a small blur/gradient mask where content meets floating chrome — only where floating UI actually overlaps content.
- **Materialize, don't just fade.** For glass/blur surfaces, animate blur radius and scale together on enter/exit, so the surface reads as a real material arriving rather than a plain opacity fade.

```css
+��˝���\��X��ܛ�[���ؘJ�MK�MK�MK��N�X����Y�[\���\��
H�]\�]JN	JN�ܙ\�]��\��Y�ؘJ�MK�MK�MK�
N�ʈ��Y��Y�HHY��]�[��HX]\�X[
�B�����Lˈ][[[�[�YY�X��8�%[�[ۈ
���[�
�\X���YH�[\��܈��X�[�[���[��\�
���H
�\�Yۚ[��]Y[�R\X�^\�Y[��\ʊN���K�
���]\�[]J��8�%]]\��H؝�[�\��]�]\�YH�YY�X�ˈ�Y��\�]ۈHX�X[�]\�[]�[�
H���H�\[��H][Hۘ\[���YJK[�X]�]��\�X�\��HX�[ۉ��\�X�[]K����
��\�[۞J��8�%H�\�X[H��[�[�H\X�]\��\�HۈH
���[YH��[YJ���][��H�]�Y[�[H\���\�H[\�[ۋ�ۉ�]H����[��][ۈY�H]Y[��\X�
�X��][ۈTJK��ˈ
��][]J��8�%Y�YY�X��ۛH�\�H]X\���]�X�K��\�\��H\X�����[��܈YX[�[�ٝ[[�Y[��
�X��\��\��܋��[Z]ۘ\
K�ݙ\�Y�YY�X���Z[��\�\���YۛܙH[و]�����M��YX�Y[�[ۈ	�X��\��X�[]B���YX�Y[�[ۈ�\ۉ�YX[�
��ʈ�YY�X��8�%]YX[��H�[�\��ۋ]�\�X�[\�\]Z]�[[���\�ۙ��YH[�\[�[��Yۘ[�[��Z�H[H[��[�\���\ۙ[�΂��H
���Y�\��\�YX�Y[[�[ێ��YX�J��8�%�\X�H�Y\����[����\�[^�]�ܝ�X�]H
��ܛ���Y�Y\�܈�]X��[��][ۜʊ����[\�X��ݙ\������Y\�X�]K���܈�[��\�]ZY��\�Z[��[ۋ��H
���Y�\��\�YX�Y]�[��\�[��N��YX�J��8�%XZ�H�[��X�[��\��X�\�����Y\����Y��Z\�H�X��ܛ�[��X�]K��H�\���H
���Y�\��X�۝�\��[ܙJ��8�%�X\�\��Y�X��ܛ�[���]HY�[�Y�۝�\�[���ܙ\����[�Έ]��Y�[]�Y]�ܝ[ݚ[���X��ܛ�[�������[�����[][ۜ�
�X\�����ۙH�X�H\�\�K[�X��\��Y��\���[\�
X\�H\����[Y�[YH�[��\�K�XZ�H\��H[ݚ[��ؚ�X���[ZK]�[��\�[��[H^H�]�[[��YH�Y��\��X�\��]\�[��H\��H�\��][ۈ[��X��[�ۘ�H�]Y�������YYXH
�Y�\��\�YX�Y[[�[ێ��YX�JH��Y]��[��][ێ��X�]H�\�X\�N��[�ٛܛN��ۙHZ[\ܝ[��B�B�YYXH
�Y�\��\�YX�Y]�[��\�[��N��YX�JH����\���X��ܛ�[���]N��X����Y�[\���ۙN�B�B�����MK�\�ܘ\H8�%�X�[�^�[���X��[��XY[��\H\�Yۜ�\H��[��H�\H�]�^�N�H�[YH\��\[�H\Y\�ۈH�X��
���H
�H]Z[�وRH\�ܘ\J�������B��H
���X��[��
]\�\�X�[��H\��^�K\�X�Y�X�8�%�]�\�ۙH�[YH�܈[�^�\ˊ��\��H\�^H^�[��
��Y�]]�J��X��[��
]\���XY���\�\\�\�^Hܛ��N��X[^�[���Y�H
���]]�J��X��[���܈Y�X�[]K�H�^Y]\�\�X�[��\�ܛۙ���Y]�\�K�Y�[�XY[���X]�H��H�X\���H
��XY[��
[�KZZY�
H�X����^�H[��\��[K���Y�ۈ\��HXY[������\�ۈ��H��K�[�ܙX\�H]�܈�ܚ\��][\��[�\���\��[�\���Y�[�]�܈[��K[��ܛX][ۋZX]�HRK��H
���Z[Y\�\��H���H�ZY�
��^�H
�XY[��\�H�]
�����^�H[ۙK�[\\�^�H�]�ZY�8�%]Y��\�[��H�]�]Z�[��[ܙH�X�K��H
���\�X�H\�\���^\�^�H�][�ʊ�
[�[ZX�\JK���[H^[�]
��]
�H^8�%�X�[��[��[X�[X���^Y8�%��H\��\��۝�\ۉ���XZ�H^[�]��H
��Y�][�H]�ܛI���\�[H�۝
���Y�ܙHH�\��H�X�N�][�XYH�\��X�[�^�[���X��[��X�\�[�Y�X�[]H[�[�ˈݙ\��YHۛH�]H�X\�ۋ�����������۝�L	K�K�H�\�[K]ZK�[��\�\�Y��Hʈ��N��\�[H�۝��Y�ܝX�HXY[��
���\�^H�۝\�^�N��[\
��[K]���[JN[�KZZY��K�N�ʈY�XY[���܈\��H^
�]\�\�X�[�ΈL��[N�ʈ�Y�]]�H�X��[��\�]ܛ���
��۝[�X�[\�^�[�Έ]]�B�����M��\�Yۈ��[�][ۜ�8�%HZY��[��\\�H[�[ۈ[�ܘY�X�ݙH�\��H\I��ZY�\�Yۈ�[��\\�

��[��\\�وܙX]\�Yۊ�������K�\�H\�H\�H�[Y\�[�H�X\�ۈ�]��K�
��\���K���XZ�H�][�[�[ێ�X�YH�]
���
���Z[�]�\�H�X]\�H\����܈H\�\���[YK][�[ۋ[��\�8�%�[�]�Y�]ۛH�\�H]^\�ٙ�����
��Y�[��K����Y\[�H[��۝���ٙ�\���X�\�ۉ��ܘ�HH�[��H]��X��]�]�ܙ�]�[�\��8�%X\�H[���܈�\�H�ۙ�\�X][ۈX[��ۛH�܈�[�Z[�[H\��X�]�K\��]�\��X�HX�[ۜ�
\�H�\�[��N�ݙ\�\�[��]�Z[��[�H��X����Y�
K��ˈ
���\�ۜ�X�[]K���X�[�H\�\���[�\�\���]�X�N�\��]H�Y�[�Y[�ۛH�܈�]	���YYY�[��\�[�K��Y�]N�[�X�\]HZ\�\�H[�\�H8�%\�X�X[H�]RH
[�[\��KX]�\�H�X�\H\]\����Y��\�H\�Y�[[�ܙYY[�
K�Y�]�Y]���ۙ�\�X][ۜ�\��Z[Y\����]H�X]\�H���H�\���]�ZY��]��[YK���
���[Z[X\�]K����Z[ۈ�][�H[�XYHۛ�ˈ\�HY]\ܜ�]\�H�Z]\���]\�[�܈��X���X�
H�\��[�YX[��[]JK[�ۛ܈Z\�\�X�ˈ�H�ۜ�\�[��[���]���H�[YH]\��Z]�HH�[YH[�]�H[�H�[YHX�H
���H\�[�^\��[Y�ۈXX���H��[�H�[��YX��]\[���^�ۛH��XZ�H�[Z[X\�]\��Y�[�H�[��ݙH]	���]\�8�%[�\�]ۉ�\��[YK��K�
���^X�[]K���\�Yۈ�܈Y��\�[��۝^�]�X�\�[�H�[�[��HوX�[]Y\ˈY\�H]�ܛH
TۙHH]ZX���X��\���HY\�ܚٛ����]�X�\�H�[�\��۝��
H[��H�]X][ۋ�\�Yۈ[��\�]�[H
Y�K[��XY�K^\�\�KX��\��X�[]JK��[����[��H^[�]�]�]�\�[ۙK][�H\��ۘ[^�H8�%�X\��[��H�۝���YH�]^Hۉ�\�K����
���[\X�]H8�%��Z[�[X[\�K�����\H[��X�\��\�H��H�ܙH\���H�[�\���\�Z[��]�\�][��[�ۙHX�H����Z[�[X[�]\ۉ��[\K��H�ۘ�\�H
Z[�[��XY�K���\��ۋ�]�\��\�H[��X\�
\�HY\�\��H8�%ܙ\��X�[���۝�\�8�%��H[��[\ܝ[�[��\�H[��؝�[�\�K�]�\�H[[Y[�X\���]�X�N���Y][Y\�
�Y[�ʈ�۝^�[\Y�Y\�
H�Y[��ܝX��\�]����[YH�[XZ[�[��K����H��[[ۈ]�\��Y�[��Y�[ۜ�ۙH]�[Y\\���ˈ
��ܘY����[��\��Z\�[��][�[ۈ�]Z[�Z[��\���X]]Y�[\�ܘ\K��ܜ�]Y\�Y��\���X\�X�ۛ�ܘ\K[��\�ۜ�]�H[�[X][ۜ�]�]�H[[YYX]K�]\�[�YY�X�ˈ��[��\��[��H8�%]�\�H�X�[��[Z[��[�[YۛY[��[YH\�H[X�\�]H��X�H[�H�[�Y�[���]\�H�ܛ�Z\�[YۙYX�ۜ�[�^[�]�]��XZ�ۈ��][ۈ�XY\��\�[\�ۙ\�ˈܘY��YY�]\�][ۈ[�ۙ�]�]H8�%�Y\]���[��H\�Yۈ\��X]\�\�[�\��\�H�[��K���
��[Y����H�\�[و�][��H�\��]�[��Y����ۙ�]HX��Yۈ��X�YHH[[�[ۈ[�H�[�[�H��Y[
�[K�ۙ�Y[�^�]Y
H[��Z[��ܘ�H][�]�\�HX�\�[ۋ���X�X�[�[\�]�\��H\�N��H
���YY�X����Y\�[���\��[�Ί���]\���\][ۋ�\��[��\��܋��ۙ�\�HYX[�[�ٝ[X�[ۜ�^��Hۙ��[���]\��\���Y�ܙH�؛[\��[Y]H[�[�H
��ۈ�X�Z]
K��H
���^Y�[�[�ˊ��]�\�H�ܙY[���[[���\���\�H[HO��\�H�[�H����]	��\�O����H�]�]��]�\��\H\�\���H
��ܛ�\[��	�X\[�ˊ����[Z]H[\Y\��[][ۜ�\�X�HH�۝���X\��]]Y��X��[�\��[��H�۝����Z\��܈�]^H�[��K�Y�[�H�YYHX�[�^Z[�H�۝��HX\[��\��XZ˂�H
��\�X��X�Y�X�X�[��X]�Y�H�[�\�X�ۙ\ˊ���[YH�]�][\��܈Z\��۝[��
���ܙ\�ȋ�X��\�H�K���Y�YH[X��[\�
��YH�K��X�Y�X�]HܙX]\��YX�X�[]K�����Mˈ���\��H
�����\H[�\�X�]�[H8�%[�[�\�X�]�H[[�\��ܝ�HZ[[ۈ�]X�\�Yۜˈ���[�H\��ݙ\�H[�\��X�H�H�Z[[��[�^Z[���]]�H�ܚ�[�����\H[���]�H�ۘܙ]H�\�]�]�[��HYY[�ܙH�[�[[\[Y[�][ۋ��H
��\�Yۈ[�\�X�[ۈ[��\�X[���]\�����[�H��[���HX�H�[�\�HۙH[��[�H�\��Y�[�ˈ�[�[ۈ\���H^Y\�YYY�\�H^[˂�H
��\��]�X[[�H[��X[�۝^
��[��]�Y]�[�[ۈ�]��\�^Y\�8�%^H][����[�[ۈ���[YKX�KY��[YH��]��]	��[��\�X�H]�[�YY�����]ZX���Y�\�[��B���YYX��\]YH�ۘܙ]H�[YH�KKHKKHKKH�Y�][RH��[��ܚ]X�[H[\Y��ݙ\����[\[��K��\�ۜ�H���$���[�Y[�[H��X����[��[�\�Y[\Y�Y���[��H[\[�����\�ۜ�H���$����\�\�H8�����[���[��]H[�ٙ��[X\�H�[��]H�\�\�U�[��]H�
\��]8�$��\��[�
XY��ܛX[^�Y��X��[�[���[��ڙX�[�Y[�[H�\��[�
�
��L
p���x�$�JX8�h��NN�[�\��\�X[�H�\����H�\�[�][ۈ
]�JH�[YH�XYHۋ\�ܙY[��[�ٛܛH�]��Y�]�\��[���X���[��\��H�[��]H��Y��K]\��]��[��]�[���[��]H��]�\��X�H�[��][ۈZ\��܈HX\�[���\��H[��\��H�X�X�X��^�Y\��X�YH�]�\��H�ˈ��[Z]\�H�[��]H
���Yۊ������][ۈ]�[X\�H�Ύ�H�Y��[�\�]�[��
��\\�H�\�X�HܘX�ٙ��]��YY�X��ۈ�[�\�Y�ۋ�۝[�[�\��]�\�ۛH]H[����[�\�H�X��\�X�[�ۉ�\�\����ܙ\��]�H�\�\�[��H��[��X�[����YH�X����Y�[\�^Y\��۝[��ܛ��[�\��\H�X��[���^�K\�X�Y�X��]�\��^YY�[�\��H^
L��[X
K��H�X\���YX�Y[�[ۈܛ���Y�YK���YK���[��YYXH
�Y�\��\�YX�Y[[�[ۊH
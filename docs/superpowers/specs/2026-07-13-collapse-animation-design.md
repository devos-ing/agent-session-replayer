# Completed Event Collapse Animation

## Goal

Animate each completed non-final event from its expanded transcript card into its compact summary row before the next event begins. The transition should explain the state change, preserve the transcript's chronology, and avoid adding a runtime dependency.

## Playback State

Extend the package playback phase to:

```ts
type PlaybackPhase = "typing" | "collapsing" | "between-events" | "case-complete";
```

When a non-final event finishes typing, the reducer enters `collapsing` instead of `between-events`. A matching `FINISH_COLLAPSE` action moves it to `between-events`. The existing `eventDelayMs` timer begins only after that transition, so the sequence is:

```text
typing completes -> collapse for 220ms -> existing eventDelayMs pause -> next event types
```

The final event enters `case-complete` directly and remains expanded. `FINISH_COLLAPSE` is ignored unless the current phase is `collapsing` and its event index matches, preserving the existing stale-action protection.

## Rendering and Motion

During `collapsing`, keep the completed expanded event mounted inside a measured collapse shell and render a visual copy of its summary row in the same shell. The summary copy is hidden from assistive technology to avoid duplicate content.

Use the browser Web Animations API from an effect to animate:

- Shell height: measured expanded height to the existing 46px summary height.
- Expanded content: opacity `1` to `0` and translateY `0` to `-6px`.
- Summary copy: opacity `0` to `1` and translateY `6px` to `0`.
- Duration: `220ms`.
- Easing: `cubic-bezier(0.23, 1, 0.32, 1)`.

The shell clips overflow while shrinking. When animation finishes, dispatch `FINISH_COLLAPSE` and render the completed event as the normal standalone summary row during the existing pause. When the next event starts, that same event remains in the historical summary list while the new expanded event mounts below it.

Keep the duration internal rather than adding a public prop. This is product motion, not workflow data or consumer timing configuration.

## Interruption and Accessibility

Cancel all three animations when the effect cleans up. Case navigation, restart, controlled case changes, and unmount therefore stop the old visual work without dispatching a completion action.

Handle the animation's `finished` promise rejection after cancellation so navigation never produces an unhandled rejection. The reducer still rejects a late completion action by event index and phase.

When `prefers-reduced-motion: reduce` is active, dispatch `FINISH_COLLAPSE` immediately. The completed event becomes a summary without motion, then observes the same `eventDelayMs` pause. Screen readers receive the existing event-level lifecycle announcements, never animation-frame updates.

If `Element.animate` is unavailable, use the same immediate completion path. Server rendering remains deterministic because measurement and animation occur only in effects.

## Component Boundaries

- `playback.ts` owns the new phase and valid state transitions.
- `AgentSessionReplayer.tsx` owns measurement, animation lifecycle, interruption cleanup, and choosing expanded, collapsing, or summary markup.
- `styles.css` owns shell clipping and stable summary/expanded layers; JavaScript supplies only measured height and animation keyframes.
- The public props and event data model remain unchanged.

Extract a shared summary-row component so historical rows, the collapsing visual copy, and the between-events row cannot drift in markup or styling.

## Verification

Reducer tests must prove:

- A completed non-final event enters `collapsing`.
- `ADVANCE_EVENT` cannot skip an unfinished collapse.
- A matching `FINISH_COLLAPSE` enters `between-events`.
- Stale or repeated collapse completions are ignored.
- The final event still enters `case-complete` directly.

Component tests must prove:

- The expanded event remains mounted during collapse.
- The visual summary copy appears during collapse and is `aria-hidden`.
- The next event does not begin until collapse completion plus `eventDelayMs`.
- Navigation and restart cancel the active animation without stale text.
- Reduced motion and missing Web Animations API complete immediately.

CSS tests must prove the collapse shell clips overflow and avoid `transition: all`. Browser verification should cover a tall code event, reviewer alignment, mobile width, interruption mid-collapse, reduced motion, and console cleanliness.

## Non-Goals

- No animation for the final event.
- No spring physics, bounce, blur, or decorative overshoot.
- No Motion dependency.
- No public collapse-duration prop.
- No changes to typing cadence, case navigation, callbacks, workflow JSON, or persisted state.

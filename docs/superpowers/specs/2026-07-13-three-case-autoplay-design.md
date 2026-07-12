# Three-Case Chat Autoplay

## Goal

Make a case—not an individual chat event—the viewer-controlled story unit. Each bundled case automatically plays its fixed JSON conversation. Viewers use controls only to move between cases or replay a case.

## Data Model

Migrate the bundled data to schema version 3:

```ts
type Demo = {
  version: 3;
  title: string;
  agents: {
    implementer: Agent;
    reviewer: Agent;
  };
  cases: [DemoCase, DemoCase, DemoCase];
};

type DemoCase = {
  id: string;
  title: string;
  summary: string;
  repository: string;
  branch: string;
  events: [WorkflowEvent, ...WorkflowEvent[]];
};
```

Exactly three cases are required. Each case may contain a different positive number of chat events. Events retain their existing actor, summary, and ordered structured blocks. JSON describes meaning and content only; it cannot configure timing, layout, CSS, or executable behavior.

## Playback Model

The player owns:

- `caseIndex`: active case, from 0 through 2.
- `eventIndex`: active event within that case.
- `revealOffset`: revealed grapheme count in the active event.
- `phase`: `typing`, `between-events`, or `case-complete`.

On initial load, case 1 begins typing automatically. While `typing`, one cancellable timer advances the reveal offset. When an event completes, it enters `between-events`; after a short fixed pause, the next event begins. The final event transitions to `case-complete` and remains visible.

Completed events collapse into their explicit one-line JSON summaries. Only the current event remains expanded. Future events are absent. Content blocks within the current event retain progressive row visibility: a block is not mounted until its first character begins revealing.

## Case Controls

- `Previous case` is disabled on case 1. Activating it cancels pending timers, selects the previous case, clears its transcript, and autoplays from its first event.
- `Restart case` cancels pending timers and autoplays the current case from its first event.
- `Next case` is disabled on case 3. It remains enabled while a case is typing. Activating it cancels the unfinished case and immediately starts the next case from its first event.
- There is no Play/Pause control and no manual per-message Next control.

One activation performs exactly one case transition. Cursor-tagged timer actions from an abandoned case or event must be ignored even if effect cleanup races.

## Presentation

The header shows `Case N of 3`, the case title, repository, and branch. Internal progress shows `Message M of K` while autoplay is active and `Case complete` after the final message.

Implementer messages remain left aligned, reviewer messages right aligned, and structured evidence centered. Collapsed summaries preserve chronological context. When a viewer changes cases, the previous transcript disappears before the new case starts.

## Timing and Accessibility

Use one fixed global typing cadence and a short fixed pause between events. Long code and tool output may reveal in deterministic batches so a case does not stall.

With reduced motion, each event's content appears immediately. The short between-event pause remains so event boundaries are understandable. Screen readers receive event-level start/completion announcements, never per-character announcements. Case controls retain focus after activation, and autoplay scrolling occurs only when the event index changes.

The interface remains labeled as scripted JSON playback with no live model or code execution.

## Error Handling

Bundled JSON is validated at startup. Reject any input that does not contain exactly three cases, contains an empty events array, duplicates case IDs, contains empty summaries or blocks, or uses unsupported block kinds. Because there is no external import, invalid bundled data renders a safe unavailable state rather than a partially playable demo.

## Verification

Automated tests must prove:

- Initial load autoplays case 1 without a user click.
- A completed event collapses and the next event begins automatically.
- Different event counts per case are supported.
- Next case interrupts typing and starts the next case without stale text.
- Previous case and Restart case replay from the first event.
- Stale case/event timer actions are ignored.
- Controls disable only at the first/last case boundaries.
- The final event leaves the case in `case-complete`.
- Reduced motion reveals each event immediately while preserving event order.
- Only the active event is expanded and unreached block rows remain absent.

Browser verification covers all three cases, desktop and mobile overflow, case progress labels, interruption during code reveal, focus retention, reduced motion, and console cleanliness.

## Non-Goals

- No user-authored cases or JSON import.
- No live AI, code, or tool execution.
- No Play/Pause, timeline, or per-message manual navigation.
- No branching choices.
- No persistence after refresh.
- No configurable per-case or per-event timing.

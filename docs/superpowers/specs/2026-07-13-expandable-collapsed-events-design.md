# Expandable Collapsed Events

## Goal

Let viewers inspect any completed transcript event without stopping the scripted autoplay. Completed events remain compact by default, but their summary rows can reveal the full original event inline.

## Interaction

- Each completed event summary is an independent toggle.
- Clicking a summary expands that event in its existing transcript position.
- Clicking the expanded event header collapses it again.
- Multiple completed events may remain expanded simultaneously.
- Enter and Space provide the same toggle behavior as a pointer click.
- The toggle exposes its state with `aria-expanded` and identifies the controlled content with `aria-controls`.

## Playback and State

Expansion state is presentation-only and does not pause, restart, or otherwise change autoplay.

Newly completed events collapse by default. Expanded event identifiers are stored locally by the player. Restarting a case or changing cases clears all expanded identifiers so playback starts from a predictable compact state.

The active event is unchanged: it continues rendering in full while it types and is not toggleable until completion.

## Rendering

Collapsed events keep the current compact numbered summary row. The row gains a subtle disclosure indicator and interactive hover, focus, and pressed states while preserving the existing visual design.

An expanded completed event reuses the existing full event renderer so agent messages, code, tool output, findings, patches, and status cards retain their normal presentation. Its header remains the collapse control.

## Accessibility

Use a native button for the summary/header toggle. The control keeps the existing row layout, has a visible focus state, and provides an accessible label that includes the event title and current action, such as `Expand Patch prepared` or `Collapse Patch prepared`.

## Testing

- A completed event starts collapsed.
- Clicking its summary expands the original full event.
- Clicking the expanded header collapses it again.
- Multiple completed events can stay expanded.
- Enter and Space toggle the event through native button behavior.
- `aria-expanded` and `aria-controls` remain synchronized.
- Expansion does not alter the active event or autoplay progression.
- Restart and case navigation clear expansion state.
- Package tests, type checking, production build, and browser checks pass.

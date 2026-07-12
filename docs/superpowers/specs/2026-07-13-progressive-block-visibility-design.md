# Progressive Block Visibility

## Problem

When an event begins typing, every structured block is currently mounted. Blocks that the reveal animation has not reached appear as empty message boxes, exposing the next row too early.

The browser reproduction for event 1 shows two `.chat-block` elements immediately after `Next`: the active `message` block and an empty future `status` block.

## Behavior

- A block row does not exist in the DOM until the reveal offset reaches that block's first title or content grapheme.
- The active block appears with its first visible character.
- Completed blocks in the current event remain visible while the next block types.
- Unreached blocks remain absent, not merely empty or visually hidden.
- Finishing an event reveals every block immediately.
- Previous, Restart, reduced-motion, collapsed summaries, and event navigation retain their existing behavior.

## Design

Keep visibility in the reveal projection rather than the React renderer. `revealEvent()` will return only the reached prefix of an event's ordered blocks. It will never return a later block with an empty title and empty content.

`ExpandedEvent` continues rendering every block supplied by the projection. This preserves a single source of truth: projection decides what has been reached; rendering only presents it.

The reveal sequence still counts titles, title/content separators, content, and block separators exactly as it does today. The change affects only whether an unreached block is included in the projected event.

## Verification

Add a focused React regression test using event 1, which contains a `message` followed by a `status` block:

1. Press `Next` to begin event 1.
2. Assert that exactly one `.chat-block` exists and it is the message block.
3. Advance fake timers until the reveal crosses into the status block.
4. Assert that the status block now exists.
5. Confirm `Finish current event` reveals both blocks without advancing the event.

Run the focused test, full test suite, typecheck, production build, and the original browser reproduction. The browser reproduction passes when the initial block count changes from two to one and no empty future box is mounted.

## Non-goals

- No change to typing speed or batching.
- No change to JSON schema or event content.
- No CSS-only hiding.
- No new animation or component abstraction.
- No change to navigation, summaries, or responsive layout.

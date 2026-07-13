# Compact Replayer Typography

## Goal

Keep the fixed-height Agent Session Replayer dense enough to show more transcript content while making the case title and repository subtitle read as one intentional metadata group. No rendered replayer text may exceed 16px.

The target user is a viewer scanning a scripted implementer/reviewer session. They should identify the active case quickly without losing transcript space to an oversized heading treatment.

## Typography Contract

- Cap every font size scoped beneath `[data-agent-session-replayer]` at 16px.
- Keep the active case title at 14px with the existing semibold monospaced treatment.
- Keep the repository, branch, and playback-status subtitle at 10px.
- Reduce the agent-avatar glyph from 18px to 16px.
- Replace the unused oversized `.asr-hero h1` rule with a 16px maximum so the public stylesheet contains no replayer typography above the cap.
- Preserve the existing system font stack and intentional monospaced operational labels.

## Title and Subtitle Spacing

Treat case progress, case title, and repository subtitle as one explicit vertical stack:

- Use a 3px gap between each line.
- Remove the case title's independent vertical margin.
- Set desktop case-navigation padding to `9px 48px 10px`, preserving its existing 48px horizontal alignment.
- At widths below 760px, use `9px 16px 10px` and preserve the same 3px relationship between lines.

The frame header, transcript, event cards, and footer retain their current hierarchy and spacing.

## States, Responsive Behavior, and Accessibility

The spacing remains stable during typing, collapse, between-event pauses, case completion, restart, and case navigation. Long repository or branch metadata may wrap naturally without overlapping playback controls.

At widths below 760px and 420px, the existing responsive control layout remains intact. Playback and disclosure controls retain their 44px minimum targets, visible focus states, semantic labels, and current DOM order.

This change adds no motion. Existing reduced-motion behavior and collapse fallbacks remain unchanged.

## Implementation Boundaries

- Update `packages/agent-session-replayer/src/styles.css`, which is the stylesheet consumed by the demo and package users.
- Update `design.md` because the typography cap and compact metadata stack become part of the current UI contract.
- Extend `tests/package-css.test.ts` to verify the compiled stylesheet contains the compact title stack and no remaining 18px or oversized hero typography.
- Do not change component props, replay data, copy, playback state, animation timing, or demo fixtures.

## Verification

- Run the focused compiled-CSS contract test.
- Run fresh `rtk bun run typecheck` and `rtk bun run test`.
- Run `rtk bun run build` because the package stylesheet and demo integration change.
- Run `rtk bun run pack:package` because the published stylesheet changes.
- Inspect the built demo at desktop and mobile widths to confirm the 16px cap, 3px title stack, wrapping behavior, and unchanged 44px controls.

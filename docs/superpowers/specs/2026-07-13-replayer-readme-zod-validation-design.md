# Replayer README and Zod Validation Design

## Goal

Make the `agent-session-replayer` package README the complete consumer guide for rendering deterministic agent-session replays, and replace its handwritten prop checks with internal, strict Zod validation.

The target user is a React developer embedding a scripted implementer/reviewer workflow. They should be able to install the package, construct valid data, understand every prop and callback, and diagnose invalid input without reading package source.

## Scope

This slice will:

- document installation, stylesheet import, basic rendering, controlled and uncontrolled navigation, theming, lifecycle callbacks, SSR behavior, reduced motion, accessibility, attribution, and runtime validation;
- provide a complete reference for every public prop, nested data field, enum, constraint, default, and callback signature;
- include one complete, valid replay-data example;
- replace handwritten runtime validation with internal Zod schemas invoked when `AgentSessionReplayer` receives props;
- validate the complete prop contract, including cross-field index bounds and nested ID uniqueness; and
- add focused validation tests while preserving existing rendering and playback coverage.

This slice will not export Zod schemas or parsing helpers, redesign the player, alter playback timing or callback ordering, add an in-component error view, or refactor unrelated code.

## Architecture

Create a focused internal validation module within `packages/agent-session-replayer/src`. It will own strict Zod schemas for:

- agent actors and identities;
- event types and block kinds;
- replay blocks, events, and sessions;
- color overrides;
- lifecycle and navigation callbacks; and
- the complete `AgentSessionReplayerProps` object.

The module will expose only an internal parsing function to `AgentSessionReplayer.tsx`. It will not be re-exported from the package entry point. Keeping validation behind one internal boundary separates the runtime contract from rendering and playback behavior, and makes validation independently testable.

The component will apply its documented defaults for `typingSpeed`, `eventDelayMs`, `height`, and `initialCaseIndex`, then parse the resolved props before playback state or rendering logic uses them. Successful parsing preserves the public data shape and existing TypeScript interfaces.

## Validation Contract

All schema objects are strict and reject unknown keys. All required strings must contain at least one character.

### Agents

`agents` must contain exactly `implementer` and `reviewer`. Each identity requires:

- `id`: non-empty string;
- `name`: non-empty string;
- `role`: non-empty string; and
- `context`: non-empty string.

### Sessions

`cases` must be a non-empty array. Each session requires:

- `id`, `title`, `summary`, `repository`, and `branch` as non-empty strings; and
- `events` as a non-empty array.

Case IDs must be unique across `cases`.

### Events

Each event requires:

- `id`: non-empty and unique within its session;
- `type`: one of `task_received`, `plan`, `patch`, `review_request`, `review_start`, `blocking_finding`, `revision`, `verification`, or `approval`;
- `actor`: `implementer` or `reviewer`;
- `title` and `summary`: non-empty strings; and
- `blocks`: a non-empty array.

### Blocks

Each block requires:

- `id`: non-empty and unique within its event;
- `kind`: one of `message`, `code`, `tool_call`, `tool_output`, `finding`, `patch`, `git_diff`, `status`, or `result`;
- `content`: non-empty string;
- `title`: optional non-empty string; and
- `language`: optional non-empty string.

### Component options

- `typingSpeed` must be finite and greater than zero; default `110` graphemes per second.
- `eventDelayMs` must be finite and non-negative; default `500` milliseconds.
- `height` must be finite and greater than zero; default `720` pixels.
- `caseIndex`, when supplied, must be an integer within the current `cases` bounds.
- `initialCaseIndex` must be an integer within the current `cases` bounds; default `0`. Unlike the previous clamping behavior, an invalid value throws.
- `className`, when supplied, must be a string.
- Every supplied color override must be a string, and unknown color names are rejected.
- Every supplied lifecycle or navigation callback must be a function.

## Error Handling

Invalid props fail immediately during rendering, matching the package's existing fail-fast contract. The internal parser will convert Zod issues into one descriptive error prefixed with `AgentSessionReplayer received invalid props:`. The error will retain actionable paths such as `cases[0].events[1].blocks` and report all issues found by the parse.

The component will not catch validation errors or render fallback UI. Consumers can use their normal React error-boundary strategy if they need recovery.

## README Structure

The package README will be the canonical consumer document and contain:

1. package purpose and behavioral guarantees;
2. installation, peer requirements, and stylesheet import;
3. a minimal complete render example with valid agents and sessions;
4. a props table containing type, requirement or default, constraints, and behavior for every prop;
5. controlled and uncontrolled navigation examples;
6. nested schema tables for identities, sessions, events, blocks, event types, block kinds, and colors;
7. lifecycle callback signatures and ordering;
8. runtime validation behavior and representative failure examples;
9. theming guidance;
10. SSR, reduced-motion, accessibility, and attribution notes.

The example and tables must describe exactly the same contract enforced by the internal Zod parser.

## Testing and Verification

Focused tests will establish that:

- a complete valid prop set renders;
- malformed values at each nested schema boundary throw with useful paths;
- unknown fields and unsupported enum values are rejected;
- empty required strings and arrays are rejected;
- duplicate case, event, and block IDs are rejected at the correct scope;
- invalid numeric values and indexes are rejected;
- invalid optional colors, class names, and callbacks are rejected; and
- valid controlled and uncontrolled usages retain their existing behavior.

Completion requires fresh evidence from:

- the focused validation tests;
- the package build;
- the repository typecheck; and
- the full test suite.

Existing unrelated worktree changes must remain untouched. Only files required for the validator, dependency declaration, README, and focused tests may change.

## Approved Decisions

- Zod is internal-only and is not part of the public exports.
- Validation is strict at every documented object boundary.
- Invalid props throw rather than render an error state.
- Out-of-range `initialCaseIndex` throws instead of being clamped.
- Playback behavior, visuals, and callback ordering remain unchanged.

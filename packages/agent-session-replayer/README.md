# Agent Session Replayer

`agent-session-replayer` is an SSR-safe React component for replaying a fixed, scripted implementer/reviewer session. It does not run a model, invoke tools, or execute code: the whole story comes from the data you provide.

## Install

```bash
bun add agent-session-replayer
```

React 18 and 19 are peer dependencies. Import the precompiled stylesheet once; consumers do not need Tailwind CSS.

```tsx
import { AgentSessionReplayer, type AgentSession, type AgentSessionReplayerProps } from "agent-session-replayer";
import "agent-session-replayer/styles.css";
```

## Development

This repository uses Bun and commits `bun.lock` as its lockfile.

```bash
bun install
bun run dev
bun run test
bun run typecheck
bun run build:package
bun run build
```

## Minimal complete replay

```tsx
import { AgentSessionReplayer, type AgentSession, type AgentSessionReplayerProps } from "agent-session-replayer";
import "agent-session-replayer/styles.css";

const agents: AgentSessionReplayerProps["agents"] = {
  implementer: {
    id: "claude-code",
    name: "Claude",
    role: "Implementer",
    context: "the repository and approved task",
  },
  reviewer: {
    id: "reviewer",
    name: "Review agent",
    role: "Adversarial reviewer",
    context: "the diff and acceptance criteria",
  },
};

const cases: AgentSession[] = [{
  id: "checkout-fix",
  title: "Fix checkout total",
  summary: "A deterministic implementation and review replay.",
  repository: "acme/storefront",
  branch: "fix/checkout-total",
  events: [{
    id: "task",
    type: "task_received",
    actor: "implementer",
    title: "Read the task",
    summary: "Confirm the requested checkout behavior.",
    blocks: [{
      id: "request",
      kind: "message",
      content: "Correct the checkout total and add a regression test.",
    }],
  }],
}];

export function Demo() {
  return <AgentSessionReplayer agents={agents} cases={cases} />;
}
```

## Props

All objects are strict at runtime: unknown keys are rejected. Required strings must be non-empty. Invalid props throw during render with an error beginning `AgentSessionReplayer received invalid props:`.

| Prop | Type | Required / default | Rules and behavior |
| --- | --- | --- | --- |
| `agents` | `Record<"implementer" \| "reviewer", AgentIdentity>` | Required | Must contain exactly `implementer` and `reviewer` identities. |
| `cases` | `AgentSession[]` | Required | Non-empty sessions. Case IDs are unique across the array. |
| `typingSpeed` | `number` | `110` | Finite, greater than zero; graphemes revealed per second. |
| `eventDelayMs` | `number` | `500` | Finite, zero or greater; delay between completed events. |
| `height` | `number` | `720` | Finite, greater than zero; rendered as pixels. |
| `colors` | `AgentSessionColors` | Optional | Scoped CSS-variable overrides listed below. |
| `caseIndex` | `number` | Optional | Controlled case index. It must be an integer in the `cases` bounds. |
| `initialCaseIndex` | `number` | `0` | Uncontrolled starting index. It must be an integer in the `cases` bounds. |
| `className` | `string` | Optional | Added to the player root element. |
| `onCaseChange` | `(index, item) => void` | Optional | Called only for user navigation requests; controlled parents must update `caseIndex`. |
| `onEventStart` | `(event, item) => void` | Optional | Called once before an event reveals its first grapheme. |
| `onEventComplete` | `(event, item) => void` | Optional | Called once after the event finishes revealing. Interrupted events do not complete. |
| `onCaseComplete` | `(item) => void` | Optional | Called after the final event completion for a case. |

## Controlled and uncontrolled navigation

Omit `caseIndex` to let the component own navigation. Use `initialCaseIndex` to start at another case.

```tsx
<AgentSessionReplayer agents={agents} cases={cases} initialCaseIndex={1} />
```

Supply `caseIndex` to control navigation. The callback reports a request; the parent updates the value.

```tsx
import { useState } from "react";

const [caseIndex, setCaseIndex] = useState(0);

<AgentSessionReplayer
  agents={agents}
  cases={cases}
  caseIndex={caseIndex}
  onCaseChange={(nextIndex) => setCaseIndex(nextIndex)}
/>
```

## Replay data schema

### `AgentIdentity`

| Field | Type | Rules |
| --- | --- | --- |
| `id` | `string` | Non-empty identity ID. |
| `name` | `string` | Non-empty visible name. |
| `role` | `string` | Non-empty visible role. |
| `context` | `string` | Non-empty description of the agent's working context. |

### `AgentSession`

| Field | Type | Rules |
| --- | --- | --- |
| `id` | `string` | Non-empty and unique across `cases`. |
| `title` | `string` | Non-empty case title. |
| `summary` | `string` | Non-empty case summary. |
| `repository` | `string` | Non-empty repository label. |
| `branch` | `string` | Non-empty branch label. |
| `events` | `AgentSessionEvent[]` | Non-empty. Event IDs are unique within the case. |

### `AgentSessionEvent`

| Field | Type | Rules |
| --- | --- | --- |
| `id` | `string` | Non-empty and unique within its case. |
| `type` | `AgentEventType` | One of the event literals below. |
| `actor` | `"implementer" \| "reviewer"` | Agent that produced the event. |
| `title` | `string` | Non-empty event title. |
| `summary` | `string` | Non-empty collapsed-event summary. |
| `blocks` | `AgentSessionBlock[]` | Non-empty. Block IDs are unique within the event. |

`AgentEventType` is one of:

```ts
"task_received" | "plan" | "patch" | "review_request" | "review_start"
| "blocking_finding" | "revision" | "verification" | "approval"
```

### `AgentSessionBlock`

| Field | Type | Rules |
| --- | --- | --- |
| `id` | `string` | Non-empty and unique within its event. |
| `kind` | `AgentBlockKind` | One of the block literals below. |
| `title` | `string` | Optional; when supplied it must be non-empty. |
| `content` | `string` | Non-empty visible block content. |
| `language` | `string` | Optional; when supplied it must be non-empty. |

`AgentBlockKind` is one of:

```ts
"message" | "code" | "tool_call" | "tool_output" | "finding" | "patch" | "git_diff" | "status" | "result"
```

## Interactive JSON Schema guide

The repository landing page includes the full `parseAgentSessionContent` workflow, a copyable replay document, field-by-field reference, error paths, and runtime-only ID uniqueness rules. Run `bun run dev` from the repository root and open the **JSON Schema** section.

## Lifecycle ordering

For each replayed event, `onEventStart(event, case)` fires once before text starts revealing, then `onEventComplete(event, case)` fires after its final grapheme. On the final event, `onEventComplete` fires before `onCaseComplete(case)`. Restarting or navigating to a case begins a new run and may fire the callbacks again for that run.

## Validation failures

The component validates the resolved props, including defaults, immediately before playback starts. It reports all detected issues in one error with nested paths.

```ts
// Throws: AgentSessionReplayer received invalid props:
// cases[0].events[0].blocks[0].content: Too small: expected string to have >=1 characters
<AgentSessionReplayer agents={agents} cases={[{
  ...cases[0],
  events: [{ ...cases[0].events[0], blocks: [{ ...cases[0].events[0].blocks[0], content: "" }] }],
}]} />
```

## Theme overrides

`colors` supplies scoped values for these CSS variables. Values can be any CSS color value accepted by the browser.

| Key | CSS variable |
| --- | --- |
| `background` | `--asr-background` |
| `surface` | `--asr-surface` |
| `border` | `--asr-border` |
| `text` | `--asr-text` |
| `muted` | `--asr-muted` |
| `implementer` | `--asr-implementer` |
| `reviewer` | `--asr-reviewer` |
| `success` | `--asr-success` |
| `danger` | `--asr-danger` |
| `focus` | `--asr-focus` |

```tsx
<AgentSessionReplayer
  agents={agents}
  cases={cases}
  colors={{ background: "#080b12", reviewer: "#ff8a65", focus: "#8ab4f8" }}
/>
```

## Rendering, motion, and accessibility

The package is safe to import and server-render: browser APIs and timers are accessed only in effects, so server markup and the initial client markup are deterministic. When `prefers-reduced-motion: reduce` is active, events complete without the typing and collapse animations.

Navigation uses labeled buttons and each expanded event is exposed as an article with its event title. Keep the supplied titles and summaries meaningful so the replay remains understandable to assistive technology.

The player always includes a quiet `devos` attribution link in its in-frame footer.

## Bun development

This workspace uses Bun 1.3.8 and `bun.lock`.

```bash
bun install
bun run dev
bun run test
bun run typecheck
bun run build
bun run build:package
```

The root commands run the demo workspace. `bun run build:package` builds the embeddable package into `packages/agent-session-replayer/dist`.

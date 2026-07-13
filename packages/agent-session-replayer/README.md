# Agent Session Replayer

An SSR-safe React component that deterministically replays scripted agent sessions. It presents workflow stories without running a live model or executing code.

## Install and render

React 18 and 19 are supported as peer dependencies. Import the precompiled stylesheet; consumers do not need Tailwind CSS.

```tsx
import { AgentSessionReplayer } from "agent-session-replayer";
import "agent-session-replayer/styles.css";

<AgentSessionReplayer
  agents={agents}
  cases={cases}
  height={720}
  typingSpeed={110}
  eventDelayMs={500}
/>
```

`agents` supplies the implementer and reviewer identities. `cases` is any non-empty array of cases with stable, unique case, event, and block IDs. `height` is pixels and defaults to `720`. `typingSpeed` is graphemes per second and defaults to `110`. `eventDelayMs` is milliseconds between completed events and defaults to `500`.

## Controlled and uncontrolled cases

Without `caseIndex`, the player owns navigation and may start from `initialCaseIndex`:

```tsx
<AgentSessionReplayer agents={agents} cases={cases} initialCaseIndex={1} />
```

With `caseIndex`, navigation requests changes through `onCaseChange`; the parent must update the prop:

```tsx
const [caseIndex, setCaseIndex] = useState(0);

<AgentSessionReplayer
  agents={agents}
  cases={cases}
  caseIndex={caseIndex}
  onCaseChange={(nextIndex) => setCaseIndex(nextIndex)}
/>
```

## Theme and lifecycle

`colors` accepts scoped overrides for `background`, `surface`, `border`, `text`, `muted`, `implementer`, `reviewer`, `success`, `danger`, and `focus`.

Lifecycle callbacks are `onEventStart(event, case)`, `onEventComplete(event, case)`, and `onCaseComplete(case)`. Event start fires once before the first grapheme; event completion fires after the final grapheme; final event completion precedes case completion. Interrupted events do not complete. `onCaseChange(index, case)` reports user navigation only; parent-driven controlled updates do not echo it.

The package is safe to import and server-render because browser APIs and playback timers are only accessed from effects. Server and initial client markup are deterministic.

The player always includes a quiet `devos` attribution link in its in-frame footer.

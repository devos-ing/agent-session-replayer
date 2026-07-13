# Interactive Agent Session Replayer Landing

## Goal

Turn the current replayer-only demo into a complete landing page that helps a React developer understand the product boundary, validate their own replay content, and integrate the package.

The desired behavior change is: “I can see a demo” becomes “I understand what this component does, proved my JSON works, and know how to install it.”

## Product Truth

Agent Session Replayer renders fixed implementer/reviewer sessions from supplied data. It does not run a model, invoke tools, execute code, inspect a repository, upload editor content, or persist user data.

Use “interactive demo” and “scripted preview.” Do not use “run an agent,” “live agent,” “execute this session,” “connect your repository,” or other language that implies live execution.

## Page Hierarchy

1. Header: product name and links to Demo, JSON Schema, React usage, and GitHub.
2. Hero: value proposition, complete product-truth disclosure, “Try your JSON” primary action, and “View on GitHub” secondary action.
3. Interactive demo: session JSON editor, Apply JSON action, validation feedback, and scripted preview.
4. JSON Schema: copyable canonical structural contract plus a runtime-uniqueness disclosure.
5. React usage: Bun install command, component/type imports, stylesheet import, and minimal render example.
6. Footer: GitHub link, scripted-playback disclosure, and the exact phrase “Powered by the DevOS team.”

Recommended hero copy:

- Eyebrow: “Embeddable React component”
- Heading: “Replay agent sessions from JSON.”
- Body: “Agent Session Replayer renders fixed implementer/reviewer sessions from data you provide. It does not run a model, invoke tools, execute code, or inspect a repository.”
- Qualifier: “Scripted playback · No live model is running”

The GitHub destination is `https://github.com/devos-ing/agent-session-replayer`.

## Domain Language

- **Replay content document:** package-ready `{ agents, cases }` content with every required agent, case, event, and block ID.
- **Draft:** the untrusted textarea string.
- **Candidate:** the value returned by `JSON.parse(draft)`.
- **Applied content:** the last candidate accepted by the package parser and currently rendered by the preview.
- **Apply revision:** a number incremented only after successful validation; it keys the replayer so a valid replacement restarts playback from case zero.
- **Canonical schema:** Draft 2020-12 JSON Schema generated from the same private Zod schema graph as runtime validation. Runtime parsing additionally enforces scoped ID uniqueness.

## Package Architecture

Add an additive public subpath, `agent-session-replayer/schema`, exporting:

- `AgentSessionContent`
- `parseAgentSessionContent(value: unknown): AgentSessionContent`
- `agentSessionContentJsonSchema`

The root component API remains unchanged.

Refactor package validation so full component-props validation and replay-content validation share one private Zod schema graph. The package owns strict object boundaries, required non-empty strings, enums, minimum array sizes, duplicate-ID refinements, path formatting, the public content parser, and JSON Schema generation.

The package must not import demo components, demo fixtures, or landing styles. The demo must not import private package paths or validate by intentionally rendering invalid component props.

Do not route the editor through the legacy `src/workflow.ts` schema. That schema describes the bundled fixture format, requires a versioned workflow, and omits public IDs.

## Demo Architecture

The demo owns:

- adapting the bundled fixture into a package-ready replay content document;
- serializing that adapted document as the initial editor draft;
- draft, applied-content, apply-revision, error, and success-feedback state;
- the landing hierarchy and copy;
- copy controls, code examples, GitHub links, and DevOS attribution;
- page-level responsive and accessibility styles.

Landing CSS must not target package `asr-` classes. Package styling remains scoped beneath `[data-agent-session-replayer]`.

The landing preserves the current dark technical workbench language: near-black surfaces, restrained borders, monospaced operational labels, and the existing warm reviewer and green success accents. Landing typography may establish a page-level hierarchy, but it must not alter the replayer's scoped 16px font cap.

## Apply Flow

1. Initialize applied content from the adapted bundled example.
2. Initialize the draft with `JSON.stringify(appliedContent, null, 2)`.
3. Editing the draft changes no preview state.
4. Applying parses the draft with `JSON.parse`, then validates the candidate with `parseAgentSessionContent`.
5. Malformed JSON updates only the syntax-error state.
6. Structurally invalid content updates only the validation-error state.
7. On failure, applied content and apply revision remain unchanged, so the last valid preview stays mounted.
8. On success, atomically replace applied content, clear the error, communicate success, and increment the revision.
9. Render the replayer with `key={applyRevision}` so successful content starts deterministically at case zero.

Errors must identify useful paths, for example:

```text
Replay content is invalid: cases[0].events[1].blocks[0].content: expected a non-empty string
```

Do not move focus unexpectedly after Apply.

## JSON Schema Contract

The displayed copyable schema covers exactly the editor document: required `agents` and `cases` and no playback configuration.

It must include:

- Draft 2020-12 metadata;
- `additionalProperties: false` at strict object boundaries;
- public actor, event-type, and block-kind enums;
- required IDs and content fields;
- `minLength` for required strings;
- `minItems` for cases, events, and blocks;
- descriptions explaining case-ID uniqueness, event-ID uniqueness within a case, and block-ID uniqueness within an event.

Standard JSON Schema does not express uniqueness by a nested `id` property. The schema section must state that `parseAgentSessionContent` is authoritative for scoped ID uniqueness.

## React Usage

Show these integration steps together:

```bash
bun add agent-session-replayer
```

```tsx
import {
  AgentSessionReplayer,
  type AgentSession,
  type AgentSessionReplayerProps,
} from "agent-session-replayer";
import "agent-session-replayer/styles.css";

export function ReplayExample({
  agents,
  cases,
}: Pick<AgentSessionReplayerProps, "agents"> & { cases: AgentSession[] }) {
  return <AgentSessionReplayer agents={agents} cases={cases} />;
}
```

State that the stylesheet is precompiled and consumers do not need Tailwind CSS.

## Responsive and Accessibility Contract

- At 980px and above, editor and preview appear side by side.
- Below 980px, editor, Apply action, feedback, and preview stack in that order.
- The textarea has a persistent visible label and is associated with instructions and feedback.
- Invalid content sets `aria-invalid="true"` and announces the error with an alert or equivalent assertive status.
- Successful apply and copy feedback are perceivable without relying only on color.
- Apply and copy controls retain at least 44px targets and visible focus treatment.
- The page creates no horizontal overflow at narrow widths.
- The embedded replayer retains its existing semantic articles, live region, labeled controls, reduced-motion behavior, and scoped stylesheet.
- No new motion is introduced in this slice.

## Non-Goals

- Timing, height, color, callback, or controlled-case editing.
- Syntax highlighting or a third-party code editor.
- Resizable panes, package-manager tabs, presets, uploads, persistence, sharing, or remote submission.
- Line-level diagnostic markers.
- A live model, tool runner, command runner, or repository connection.
- Changing existing root `AgentSessionReplayer` props.

## Acceptance Criteria

### Landing and content

- Exactly one page-level heading communicates replay from JSON.
- Hero and preview disclosures explicitly state the scripted, data-only product boundary.
- The primary action reaches the editor and GitHub actions use the approved repository URL.
- Installation, stylesheet import, minimal React usage, JSON Schema, GitHub, and DevOS attribution are visible.

### Editor and preview

- The editor starts with the adapted package-ready example, not raw fixture JSON.
- Applying valid `{ agents, cases }` content replaces the preview and restarts it at case zero.
- Editing without Apply does not change the preview.
- Malformed JSON and structurally invalid content preserve the last valid preview.
- Structural errors include at least the first useful property path.
- Unknown keys, empty required strings, unsupported enums, empty arrays, and duplicate IDs are rejected consistently with package validation.
- A successful Apply clears prior errors and communicates that the preview was updated.
- Editor content remains in browser memory and is never submitted or persisted.

### Package and schema

- The new schema subpath works in ESM, CommonJS, and declarations and appears in the packed artifact.
- Existing root imports and props remain unchanged.
- The parser and component props validation use the same private Zod schema graph.
- Schema-contract tests fail if accepted keys, enums, required fields, minimums, strictness, or uniqueness descriptions drift.
- The public package has no dependency on demo files.

### Verification

- Landing behavior is tested at the app seam.
- Parser and schema behavior are tested at the public package seam.
- Existing SSR, playback, validation, compiled-CSS, and demo integration tests remain green.
- Fresh typecheck, full tests, production build, package build, and package pack pass.
- Packed files and export maps are inspected.
- Desktop and mobile keyboard/browser-console QA pass.

## Delivery Slices

1. **Evaluate with my data:** hero action, preloaded draft, explicit Apply, validation, last-valid preservation, successful restart, and product-truth disclosure.
2. **Adopt the component:** public parser/schema subpath, copyable schema, React usage, GitHub, and DevOS attribution. The schema definition, display, and contract tests land together.
3. **Launch verification:** responsive layout, accessibility feedback, copy failure behavior, packed exports, and full regression evidence.

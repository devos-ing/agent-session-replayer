# JSON Schema Landing Documentation Design

**Date:** 2026-07-13

**Status:** Approved design

**Audience:** React developers evaluating or integrating `agent-session-replayer`

## Problem

The landing page exposes the canonical JSON Schema and lets visitors copy it, but it does not explain how to produce, validate, troubleshoot, and evolve a replay content document. The package README contains a basic field reference, yet it does not teach the public `agent-session-replayer/schema` entry, distinguish JSON Schema constraints from runtime-only validation, or provide a complete task-oriented integration guide.

Developers should be able to understand the contract without reading package source or reverse-engineering the generated schema.

## Goals

- Add detailed JSON Schema documentation directly to the existing landing page.
- Keep the landing scannable through progressive disclosure.
- Teach the shortest safe flow from unknown JSON to a rendered replay.
- Document every replay-content field, enum, minimum, strictness rule, and ID uniqueness scope.
- Keep the generated Draft 2020-12 schema and the runtime parser clearly separated but consistent.
- Protect documentation examples and claims with tests against the public package seam.

## Non-goals

- Add a separate documentation route or documentation application.
- Document playback configuration props, lifecycle callbacks, colors, or component theming in this schema guide.
- Replace the generated schema with a hand-maintained JSON Schema file.
- Add a syntax editor, schema playground, remote validation service, persistence, uploads, or code generation.
- Add a new animation library or custom disclosure animation.
- Imply that validation or replay runs a model, invokes tools, executes code, or inspects a repository.

## Information architecture

The existing JSON Schema landing section becomes an inline documentation hub. The raw schema viewer and its existing copy action remain the first surface. A compact **In this guide** anchor list follows it and links to six task-first subsections:

1. **Quick start** — import `parseAgentSessionContent`, validate an `unknown` value, and pass the typed result to `AgentSessionReplayer`.
2. **Complete replay document** — show one valid, package-ready `{ agents, cases }` example with IDs at every required scope.
3. **Field reference** — explain `agents`, `cases`, `events`, and `blocks` with types, required status, rules, and their visible purpose.
4. **Validation and errors** — document strict objects, non-empty values, enums, non-empty arrays, path formatting, and recovery from invalid data.
5. **ID uniqueness** — explain the case, event, and block uniqueness scopes and why the runtime parser is authoritative for these semantic rules.
6. **Compatibility** — identify JSON Schema Draft 2020-12, the public schema subpath, and safe handling of future contract changes.

This task-first structure is the primary navigation. The field reference remains object-oriented inside its disclosures so it also works as a lookup reference.

## Interaction model

- The raw schema remains visible in its current internally scrollable code surface.
- The guide uses semantic anchor targets so every subsection can be linked directly.
- **Quick start** is expanded by default.
- The remaining reference sections use native `<details>` and `<summary>` elements.
- Multiple disclosures may remain open for comparison.
- The complete replay document has an explicit **Copy replay JSON** button.
- Copy success uses a polite status; copy failure uses an assertive alert with a manual-copy fallback.
- Copying occurs only after a user action. The page never reads the clipboard.
- Code examples are inert text and are never evaluated.
- No custom disclosure animation is added. Native behavior preserves reduced-motion expectations without a new dependency.

## Content contract

### Quick start

The quick start demonstrates the public consumer path:

```tsx
import { AgentSessionReplayer } from "agent-session-replayer";
import {
  parseAgentSessionContent,
  type AgentSessionContent,
} from "agent-session-replayer/schema";
import "agent-session-replayer/styles.css";

const input: unknown = JSON.parse(source);
const content: AgentSessionContent = parseAgentSessionContent(input);

<AgentSessionReplayer agents={content.agents} cases={content.cases} />;
```

Supporting copy states that parsing is synchronous, throws on invalid input, returns typed replay content on success, and performs no network request.

### Complete replay document

The example contains exactly the editor contract:

- Top-level `agents` and `cases` only.
- Exactly `implementer` and `reviewer` identities.
- At least one case, event, and block.
- Non-empty IDs, labels, titles, summaries, repository, branch, and content.
- Valid actor, event-type, and block-kind literals.
- Unique case IDs across `cases`.
- Unique event IDs within each case.
- Unique block IDs within each event.

The example must be parsed by `parseAgentSessionContent` in a test. Documentation must not duplicate the long bundled demo; it should use one compact, realistic case that is easy to inspect and copy.

### Field reference

Every field row or mobile card includes:

- Field name.
- Type.
- Required or optional status.
- Validation rules.
- Purpose in the rendered replay.

The guide documents these objects:

- `AgentSessionContent`
- `AgentIdentity`
- `AgentSession`
- `AgentSessionEvent`
- `AgentSessionBlock`

It lists every supported enum literal from the public contract:

- Actors: `implementer`, `reviewer`.
- Event types: `task_received`, `plan`, `patch`, `review_request`, `review_start`, `blocking_finding`, `revision`, `verification`, `approval`.
- Block kinds: `message`, `code`, `tool_call`, `tool_output`, `finding`, `patch`, `git_diff`, `status`, `result`.

Optional `title` and `language` block fields remain optional, but must be non-empty when supplied.

### Validation and errors

The guide states that:

- Every object is strict and rejects unknown keys.
- Every required string must contain at least one character.
- `cases`, `events`, and `blocks` must each contain at least one item.
- Invalid enums are rejected.
- The parser reports all detected issues in one error beginning `Replay content is invalid:`.
- Nested paths use forms such as `cases[0].events[0].blocks[0].content`.
- Document-level issues use `$` as the root path.
- A failed parse must not be passed to the component; callers should catch the error, display it, and preserve any previously accepted content until another candidate parses successfully.

### ID uniqueness and JSON Schema limits

The generated JSON Schema describes object shapes, required fields, enums, string minimums, array minimums, and strict object boundaries. Draft 2020-12 cannot express uniqueness by an object's `id` property within the three documented scopes. The schema descriptions disclose those rules, while `parseAgentSessionContent` enforces them at runtime.

The guide must not claim that a generic JSON Schema validator alone is equivalent to the package parser.

### Compatibility

The compatibility section states:

- `agentSessionContentJsonSchema` targets JSON Schema Draft 2020-12.
- `agent-session-replayer/schema` is the public import path for the type, parser, and schema.
- Consumers should import the schema at runtime rather than copy a generated snapshot into application code when they need the current installed-package contract.
- Persisted replay documents should be validated when read.
- A future breaking data-contract change requires a package version change and updated migration guidance; the current replay document has no user-supplied version field.

## Landing integration

The guide extends the current `#schema` section rather than adding a seventh top-level marketing section. The primary header link **JSON Schema** continues to target `#schema`. The guide's internal anchors provide deeper navigation without crowding the global header.

The React usage section remains after the expanded schema guide. It stays focused on installation and rendering, while the schema guide owns data construction and validation detail.

The package README receives a concise pointer to the landing guide. It keeps its existing field tables and public API overview; the landing becomes the richer tutorial and troubleshooting surface.

## Responsive behavior

- Desktop field references use compact tables consistent with the existing technical workbench.
- On narrow screens, each table row becomes a stacked field card with visible field, type, required status, rules, and purpose labels.
- Anchor navigation wraps rather than overflowing.
- Code and raw-schema surfaces own horizontal scrolling.
- The page itself never gains horizontal overflow.
- Copy controls retain at least a 44px target.

## Accessibility

- Native disclosure semantics expose expanded and collapsed state without custom ARIA recreation.
- Each disclosure summary has a specific accessible name, not a generic **Details** label.
- Anchor targets use unique headings and preserve logical heading order.
- Copy feedback is associated with its action and remains perceivable without color.
- Code surfaces that scroll horizontally are keyboard focusable and labeled.
- Tables retain real table semantics on desktop; the responsive presentation must not destroy readable label/value relationships.
- Existing replayer semantics, focus styles, reduced-motion behavior, and 16px typography cap remain untouched.

## Product truth and privacy

The guide repeats that replay content is display data. Parsing and previewing happen locally in browser memory. The component does not run models, invoke tools, execute the displayed commands or patches, inspect repositories, upload content, or persist editor data.

## Testing strategy

### Public contract tests

- Parse the documented complete example with `parseAgentSessionContent`.
- Assert every actor, event-type, and block-kind literal shown by the guide exists in the exported JSON Schema.
- Assert the guide's documented strictness, minimums, and uniqueness claims align with parser/schema behavior.
- Assert the root error path remains `$` and nested error paths remain stable.

### Landing tests

- Assert the guide headings, anchor targets, and disclosure labels exist.
- Assert Quick start is open by default and other sections are progressively disclosed.
- Assert parser imports, stylesheet import, and render example are shown as inert text.
- Assert **Copy replay JSON** writes the exact documented example and reports success or failure accessibly.
- Assert the complete example remains valid at the app seam.
- Assert product-truth, privacy, Draft 2020-12, runtime-only uniqueness, and public-subpath wording remain visible.

### Visual and responsive checks

- Verify disclosure keyboard behavior and focus visibility.
- Verify the field reference at desktop, below the landing breakpoint, and at 390px.
- Verify no page-level horizontal overflow with long code and schema lines.
- Verify code surfaces remain scrollable and copy controls retain 44px targets.
- Verify the application console remains free of app-origin warnings and errors.

### Release checks

- Run `rtk bun run typecheck`.
- Run `rtk bun run test`.
- Run `rtk bun run build` because landing integration changes.
- Run `rtk bun run pack:package` only if the package README or published package files change.
- Inspect the scoped diff and preserve unrelated worktree changes.

## Acceptance criteria

- A developer can find the detailed guide directly beneath the existing JSON Schema surface.
- The guide teaches validation before render using the public schema subpath.
- One complete replay document can be copied and passes the runtime parser unchanged.
- Every public replay-content field and enum is documented.
- JSON Schema constraints and runtime-only ID uniqueness are accurately distinguished.
- Error examples include both `$` and a nested content path.
- The guide is compact when collapsed, linkable by subsection, keyboard accessible, and usable at 390px without page overflow.
- Existing landing, package, replayer typography, accessibility, and scripted-playback truth remain intact.

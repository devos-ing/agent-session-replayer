# Interactive Agent Session Replayer Landing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a complete landing page where React developers can apply package-ready `{ agents, cases }` JSON to a preserved scripted preview, inspect the canonical schema, and copy the real integration contract.

**Architecture:** Add a public `agent-session-replayer/schema` entry backed by the package's existing Zod validation graph. Keep draft/apply state, fixture adaptation, landing content, and copy feedback in the Vite demo; invalid candidates never reach the replayer, while successful candidates remount it with a revision key.

**Tech Stack:** React 19, TypeScript, Zod 4, JSON Schema Draft 2020-12, Bun workspaces, tsup, Vitest, Testing Library, Vite, scoped CSS

---

## File Map

- `packages/agent-session-replayer/src/types.ts`: public `AgentSessionContent` type.
- `packages/agent-session-replayer/src/validation.ts`: shared private schema graph and both public parsing paths.
- `packages/agent-session-replayer/src/schema.ts`: public schema-subpath exports and generated JSON Schema.
- `packages/agent-session-replayer/tsup.config.ts`: root and schema build entries.
- `packages/agent-session-replayer/package.json`: `./schema` export map.
- `tests/package-schema.test.ts`: public parser, schema, strictness, uniqueness, and subpath contract.
- `src/demo-content.ts`: fixture-to-public-content adapter and serialized initial draft.
- `src/App.tsx`: landing hierarchy, editor apply flow, copy feedback, preview, usage, and attribution.
- `src/styles.css`: landing-only responsive and accessible presentation; never targets `asr-` classes.
- `tests/app.test.tsx`: highest app seam for editor, content, accessibility, and recovery behavior.
- `tests/bun-project.test.ts`: package export and packed-surface assertions.
- `design.md`: current landing hierarchy and editor/schema contract.

The worktree contains unrelated user changes. Do not stage, commit, rewrite, or discard any file unless the user explicitly requests it.

### Task 1: Publish one replay-content parser and schema seam

**Files:**
- Create: `tests/package-schema.test.ts`
- Create: `packages/agent-session-replayer/src/schema.ts`
- Modify: `packages/agent-session-replayer/src/types.ts`
- Modify: `packages/agent-session-replayer/src/validation.ts`
- Modify: `packages/agent-session-replayer/tsup.config.ts`
- Modify: `packages/agent-session-replayer/package.json`

- [ ] **Step 1: Write the failing public-subpath test**

Create `tests/package-schema.test.ts` with a minimal valid document and assertions at the consumer seam:

```ts
import { describe, expect, it } from "vitest";
import {
  agentSessionContentJsonSchema,
  parseAgentSessionContent,
  type AgentSessionContent,
} from "agent-session-replayer/schema";

const validContent: AgentSessionContent = {
  agents: {
    implementer: { id: "implementer", name: "Claude", role: "implementer", context: "issue and repository" },
    reviewer: { id: "reviewer", name: "Claude", role: "reviewer", context: "diff only" },
  },
  cases: [{
    id: "case-1",
    title: "Session refresh",
    summary: "Review a refresh race",
    repository: "acme/web",
    branch: "fix/refresh",
    events: [{
      id: "event-1",
      type: "task_received",
      actor: "implementer",
      title: "Task received",
      summary: "Fix the race",
      blocks: [{ id: "block-1", kind: "message", content: "I will inspect the refresh path." }],
    }],
  }],
};

describe("replay content schema entry", () => {
  it("parses a package-ready replay content document", () => {
    expect(parseAgentSessionContent(validContent)).toEqual(validContent);
  });

  it("exports a strict Draft 2020-12 structural schema", () => {
    expect(agentSessionContentJsonSchema.$schema).toBe("https://json-schema.org/draft/2020-12/schema");
    expect(agentSessionContentJsonSchema.required).toEqual(["agents", "cases"]);
    expect(agentSessionContentJsonSchema.additionalProperties).toBe(false);
  });
});
```

- [ ] **Step 2: Run the test and confirm the subpath is red**

Run:

```bash
rtk bunx vitest run tests/package-schema.test.ts
```

Expected: FAIL because `agent-session-replayer/schema` is not exported.

- [ ] **Step 3: Add the public content type**

Add to `types.ts` after `AgentSession`:

```ts
export interface AgentSessionContent {
  agents: Record<AgentActor, AgentIdentity>;
  cases: AgentSession[];
}
```

Make `AgentSessionReplayerProps` extend that interface so the root props and schema subpath share the same type-level contract:

```ts
export interface AgentSessionReplayerProps extends AgentSessionContent {
  typingSpeed?: number;
  // existing optional props remain unchanged
}
```

- [ ] **Step 4: Refactor validation around a shared replay-content shape**

In `validation.ts`, keep the existing leaf schemas and introduce one shared shape plus one uniqueness refiner:

```ts
const replayContentShape = {
  agents: z.object({ implementer: agentSchema, reviewer: agentSchema }).strict(),
  cases: z.array(sessionSchema).min(1).describe("Case IDs must be unique across this array."),
};

function addReplayContentIssues(
  value: { cases: Array<{ id: string }> },
  context: z.RefinementCtx,
) {
  if (new Set(value.cases.map(({ id }) => id)).size !== value.cases.length) {
    context.addIssue({ code: "custom", path: ["cases"], message: "Case IDs must be unique" });
  }
}

export const replayContentSchema = z.object(replayContentShape)
  .strict()
  .superRefine(addReplayContentIssues);
```

Build `propsSchema` from `replayContentShape`, call `addReplayContentIssues` inside its existing refinement, and preserve controlled-index validation. Do not duplicate the leaf schemas.

- [ ] **Step 5: Add the public parser with package-formatted paths**

Export this parser from `validation.ts`, reusing `formatPath`:

```ts
export function parseAgentSessionContent(value: unknown): AgentSessionContent {
  const result = replayContentSchema.safeParse(value);
  if (result.success) return result.data as AgentSessionContent;

  const details = result.error.issues
    .map((issue) => `${formatPath(issue.path)}: ${issue.message}`)
    .join("; ");
  throw new Error(`Replay content is invalid: ${details}`);
}
```

- [ ] **Step 6: Generate and export the canonical JSON Schema**

Create `src/schema.ts`:

```ts
import { z } from "zod";
import type { AgentSessionContent } from "./types";
import { parseAgentSessionContent, replayContentSchema } from "./validation";

export type { AgentSessionContent };
export { parseAgentSessionContent };
export const agentSessionContentJsonSchema = z.toJSONSchema(replayContentSchema, {
  target: "draft-2020-12",
  reused: "ref",
});
```

Add `.describe(...)` metadata to event and block arrays so the generated schema explains event-ID and block-ID uniqueness without claiming JSON Schema enforces it.

- [ ] **Step 7: Build and export the schema entry**

Change `tsup.config.ts` to:

```ts
entry: ["src/index.ts", "src/schema.ts"],
```

Add this package export:

```json
"./schema": {
  "types": "./dist/schema.d.ts",
  "import": "./dist/schema.js",
  "require": "./dist/schema.cjs"
}
```

- [ ] **Step 8: Build the package entrypoints**

Run:

```bash
rtk bun run build:package
```

Expected: root and schema ESM/CJS/declaration files are emitted.

- [ ] **Step 9: Run the focused public-schema suite**

Run:

```bash
rtk bunx vitest run tests/package-schema.test.ts tests/package-validation.test.tsx
```

Expected: both files pass and existing component validation messages remain unchanged.

- [ ] **Step 10: Extend strictness and drift coverage vertically**

Add focused cases to `package-schema.test.ts` for unknown keys, empty strings, invalid enums, empty arrays, duplicate case/event/block IDs, exact path fragments, `minLength`, `minItems`, enum members, strict objects, and all three uniqueness descriptions. Rebuild and rerun the same focused command after each parser/schema assertion.

### Task 2: Let visitors apply replay content without losing the last valid preview

**Files:**
- Create: `src/demo-content.ts`
- Modify: `src/App.tsx`
- Modify: `tests/app.test.tsx`
- Modify: `src/styles.css`

- [ ] **Step 1: Add one failing app-seam test for last-valid behavior**

Append a new `describe("interactive replay landing", ...)` block that renders `App`, reads the labeled `Session JSON` textarea, applies malformed JSON, and verifies both the alert and the original `Case 1 of 3` preview remain visible:

```ts
it("preserves the last valid replay when applying malformed JSON", () => {
  render(<App />);
  const editor = screen.getByLabelText("Session JSON");
  fireEvent.change(editor, { target: { value: "{" } });
  fireEvent.click(screen.getByRole("button", { name: "Apply JSON" }));
  expect(screen.getByRole("alert")).toHaveTextContent(/valid json/i);
  expect(screen.getByText(/case 1 of 3/i)).toBeInTheDocument();
  expect(editor).toHaveAttribute("aria-invalid", "true");
});
```

- [ ] **Step 2: Run the app test and confirm the editor seam is red**

Run:

```bash
rtk bunx vitest run tests/app.test.tsx
```

Expected: FAIL because no `Session JSON` editor exists.

- [ ] **Step 3: Extract the package-ready initial replay content**

Move the existing fixture adapter from `App.tsx` into `src/demo-content.ts` and export:

```ts
export const initialReplayContent: AgentSessionContent = { agents, cases };
export const initialReplayContentJson = JSON.stringify(initialReplayContent, null, 2);
```

Every agent, event, and block keeps the deterministic IDs already generated by the demo adapter.

- [ ] **Step 4: Implement the draft/apply state machine in App**

Use these independent states:

```ts
const [draft, setDraft] = useState(initialReplayContentJson);
const [appliedContent, setAppliedContent] = useState(initialReplayContent);
const [applyRevision, setApplyRevision] = useState(0);
const [editorError, setEditorError] = useState<string | null>(null);
const [editorStatus, setEditorStatus] = useState("Example content is loaded.");
```

The Apply handler must parse and validate before changing applied state:

```ts
function applyDraft() {
  try {
    const candidate: unknown = JSON.parse(draft);
    const next = parseAgentSessionContent(candidate);
    setAppliedContent(next);
    setEditorError(null);
    setEditorStatus("Preview updated from your JSON.");
    setApplyRevision((value) => value + 1);
  } catch (error) {
    setEditorError(error instanceof SyntaxError
      ? `Enter valid JSON: ${error.message}`
      : error instanceof Error ? error.message : "Replay content is invalid.");
  }
}
```

Render the replayer with `key={applyRevision}`, `agents={appliedContent.agents}`, and `cases={appliedContent.cases}`.

- [ ] **Step 5: Render the hero and interactive-demo shell**

Add the approved hero copy, `Try your JSON` anchor, GitHub action, persistent scripted qualifier, labeled textarea, instructions, Apply button, assertive error, polite success status, and scripted-preview disclosure. Use semantic `header`, `main`, `section`, and heading levels.

- [ ] **Step 6: Run the focused app suite green**

Run:

```bash
rtk bunx vitest run tests/app.test.tsx
```

Expected: existing autoplay tests and the new malformed-JSON test pass.

- [ ] **Step 7: Add vertical valid/invalid recovery cases**

Add tests proving that editing alone does not change the preview, a valid title change applies and restarts case zero, a path-specific structural error preserves the preview, and correcting the draft clears the error. Run the focused suite after each new test and minimal implementation adjustment.

### Task 3: Add the schema, React usage, GitHub, and DevOS adoption surfaces

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/styles.css`
- Modify: `tests/app.test.tsx`
- Modify: `tests/bun-project.test.ts`

- [ ] **Step 1: Write a failing landing-content contract**

Add one app test that expects the schema and usage headings, install command, stylesheet import, GitHub links, runtime-uniqueness disclosure, and exact “Powered by the DevOS team” phrase.

- [ ] **Step 2: Render the schema section**

Serialize `agentSessionContentJsonSchema` with two-space indentation in a labeled, horizontally scrollable code block. Add “Copy JSON Schema” and the disclosure: “The runtime parser also enforces unique case IDs, event IDs within each case, and block IDs within each event.”

- [ ] **Step 3: Render the React usage section**

Show `bun add agent-session-replayer`, the precompiled stylesheet import, the approved minimal React example, and the Tailwind-not-required note. Keep snippets as literal text so they cannot execute.

- [ ] **Step 4: Add explicit copy feedback**

Use one user-triggered clipboard helper that reports `Copied JSON Schema.` on success and `Copy failed. Select the schema and copy it manually.` on rejection. Never read the clipboard or copy automatically.

- [ ] **Step 5: Add header/footer links and attribution**

Add in-page Demo, JSON Schema, and React usage links plus external GitHub links with `target="_blank" rel="noreferrer noopener"`. Add the exact DevOS attribution and repeat the scripted-playback disclosure in the footer.

- [ ] **Step 6: Test success and failure copy states**

Stub `navigator.clipboard.writeText` at the app seam, verify the exact serialized schema is passed, then reject the promise and verify the accessible failure message. Restore the clipboard stub after each test.

- [ ] **Step 7: Add the package export source contract**

Extend `tests/bun-project.test.ts` to assert the package manifest exposes `./schema` with types/import/require paths and the package files allowlist still includes `dist` and `README.md`.

- [ ] **Step 8: Run the focused adoption tests**

Run:

```bash
rtk bunx vitest run tests/app.test.tsx tests/bun-project.test.ts tests/package-schema.test.ts
```

Expected: all landing, export, parser, and schema assertions pass.

### Task 4: Finish responsive, accessible landing presentation and update the design contract

**Files:**
- Modify: `src/styles.css`
- Modify: `tests/app.test.tsx`
- Modify: `design.md`

- [ ] **Step 1: Implement landing-only styles**

Preserve the current dark workbench tokens and add landing selectors for navigation, hero, CTA row, editor/preview grid, textarea, feedback, schema/usage code blocks, and footer. Do not add any `.asr-*` selector.

At 980px and above, use a two-column editor/preview grid. Below 980px, stack editor, action/feedback, then preview. Keep page width responsive, code blocks internally scrollable, textarea resize vertical, and all buttons at least 44px tall.

- [ ] **Step 2: Add accessibility contract assertions**

At the app seam, assert one page-level heading, persistent editor label, `aria-describedby`, `aria-invalid`, alert/status semantics, section landmarks, descriptive link names, and accessible copy/apply buttons.

- [ ] **Step 3: Preserve package accessibility and reduced motion**

Run existing package API/playback tests and confirm the landing introduces no animation. Do not change package motion timing, focus rings, live region, or semantic event articles.

- [ ] **Step 4: Update `design.md`**

Document the six-section landing hierarchy, product-truth copy, replay-content domain language, public schema subpath, last-valid Apply flow, 980px layout boundary, accessibility feedback, DevOS attribution, and the rule that landing CSS never targets package `asr-` classes.

- [ ] **Step 5: Check the intended source and documentation paths**

Run:

```bash
rtk git diff --check -- packages/agent-session-replayer/src packages/agent-session-replayer/package.json packages/agent-session-replayer/tsup.config.ts src tests design.md docs/superpowers/specs/2026-07-13-interactive-replayer-landing-design.md docs/superpowers/plans/2026-07-13-interactive-replayer-landing.md
```

Expected: no whitespace errors.

### Task 5: Verify the distributable package and landing

**Files:**
- Verify: `packages/agent-session-replayer/dist/`
- Verify: `packages/agent-session-replayer/artifacts/agent-session-replayer-0.1.0.tgz`
- Verify: root `dist/`

- [ ] **Step 1: Run the fresh type gate**

Run `rtk bun run typecheck`.

Expected: exit 0 with no diagnostics.

- [ ] **Step 2: Run the full test gate**

Run `rtk bun run test`.

Expected: all test files pass, including schema and landing suites.

- [ ] **Step 3: Build the package and production landing**

Run `rtk bun run build`.

Expected: root and schema package entries plus the Vite landing build successfully.

- [ ] **Step 4: Pack and inspect the public artifact**

Run `rtk bun run pack:package`, then list the tarball contents.

Expected: the artifact includes root and schema ESM/CJS/declaration files and `dist/styles.css`.

- [ ] **Step 5: Perform desktop and mobile browser QA**

At 1280px, below 980px, and at 390px verify: correct section hierarchy; valid Apply restart; malformed and structural error preservation; keyboard focus; 44px controls; no page overflow; scrollable editor/schema blocks; copy success/failure; exact GitHub/DevOS content; scripted disclosures; and no console warnings or errors.

- [ ] **Step 6: Review the final scoped diff**

Run `rtk git status --short` and a scoped diff over the planned files. Confirm unrelated user changes remain untouched. Leave all files unstaged and uncommitted.

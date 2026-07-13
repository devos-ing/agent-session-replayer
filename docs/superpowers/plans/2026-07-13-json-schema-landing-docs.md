# JSON Schema Landing Documentation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expand the landing page's JSON Schema section into a progressive, task-first developer guide with a validated replay example, complete field reference, parser/error guidance, accessible copy actions, and responsive presentation.

**Architecture:** Keep the package's exported parser and Draft 2020-12 schema authoritative. Put immutable guide data and code strings in `src/schema-guide-content.ts`, render the documentation and its local clipboard state in a focused `SchemaGuide` component, and leave `App` responsible only for page composition and the interactive replayer editor.

**Tech Stack:** React 19, TypeScript, native `<details>/<summary>`, Zod-backed public parser, JSON Schema Draft 2020-12, Vitest, Testing Library, Bun workspaces, Vite, scoped landing CSS

---

## File map

- `src/schema-guide-content.ts`: valid copyable replay document, quick-start source, field-reference metadata, and enum literals.
- `src/SchemaGuide.tsx`: raw schema, progressive guide disclosures, semantic tables, and schema/example clipboard feedback.
- `src/App.tsx`: replaces the inline schema markup with the focused guide component.
- `src/styles.css`: guide navigation, disclosure, table, feedback, code, and mobile-card presentation.
- `tests/schema-guide-content.test.ts`: public parser/schema drift protection for the documented example and literals.
- `tests/app.test.tsx`: landing integration, disclosure, copy, accessibility, product-truth, and content assertions.
- `tests/bun-project.test.ts`: package README pointer and published-file contract.
- `packages/agent-session-replayer/README.md`: concise pointer to the interactive landing guide.
- `design.md`: current UI contract for the expanded schema section.

## Execution guardrails

- Read `AGENTS.md`, the approved spec, and the current worktree status before editing.
- Use CodeGraph for structural questions and `rg` only for literal strings or known-file follow-up.
- Run all repository commands through `rtk`.
- Use Ponytrail pre/post snapshots before every file mutation or generated-output rewrite.
- Use `apply_patch` for hand-written edits.
- Preserve unrelated worktree changes.
- Do not stage, commit, push, publish, or create a PR unless the user explicitly requests it.
- Do not change the public package parser, schema, component props, replayer CSS, playback, or typography.

### Task 1: Create one validated source of documentation content

**Files:**
- Create: `tests/schema-guide-content.test.ts`
- Create: `src/schema-guide-content.ts`

- [ ] **Step 1: Write the failing content-contract test**

Create `tests/schema-guide-content.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  agentSessionContentJsonSchema,
  parseAgentSessionContent,
} from "agent-session-replayer/schema";
import {
  actorLiterals,
  blockKindLiterals,
  eventTypeLiterals,
  schemaGuideFieldGroups,
  schemaGuideReplayContent,
  schemaGuideReplayContentJson,
} from "../src/schema-guide-content";

describe("schema guide content", () => {
  it("ships a copyable replay document accepted by the public parser", () => {
    expect(parseAgentSessionContent(JSON.parse(schemaGuideReplayContentJson)))
      .toEqual(schemaGuideReplayContent);
  });

  it("documents every public actor, event type, and block kind", () => {
    const schemaText = JSON.stringify(agentSessionContentJsonSchema);
    for (const literal of [
      ...actorLiterals,
      ...eventTypeLiterals,
      ...blockKindLiterals,
    ]) {
      expect(schemaText).toContain(JSON.stringify(literal));
    }
  });

  it("contains a field group for every replay-content object", () => {
    expect(schemaGuideFieldGroups.map(({ name }) => name)).toEqual([
      "AgentSessionContent",
      "AgentIdentity",
      "AgentSession",
      "AgentSessionEvent",
      "AgentSessionBlock",
    ]);
    expect(schemaGuideFieldGroups.flatMap(({ fields }) => fields))
      .toEqual(expect.arrayContaining([
        expect.objectContaining({ field: "agents", required: "Required" }),
        expect.objectContaining({ field: "events", required: "Required" }),
        expect.objectContaining({ field: "language", required: "Optional" }),
      ]));
  });
});
```

- [ ] **Step 2: Run the content test and confirm it is red**

Run:

```bash
rtk bunx vitest run tests/schema-guide-content.test.ts
```

Expected: FAIL because `src/schema-guide-content.ts` does not exist.

- [ ] **Step 3: Add the typed literals, example, and quick-start source**

Create `src/schema-guide-content.ts` with these exports:

```ts
import type { AgentSessionContent } from "agent-session-replayer/schema";

export const actorLiterals = ["implementer", "reviewer"] as const;

export const eventTypeLiterals = [
  "task_received",
  "plan",
  "patch",
  "review_request",
  "review_start",
  "blocking_finding",
  "revision",
  "verification",
  "approval",
] as const;

export const blockKindLiterals = [
  "message",
  "code",
  "tool_call",
  "tool_output",
  "finding",
  "patch",
  "git_diff",
  "status",
  "result",
] as const;

export const schemaGuideReplayContent: AgentSessionContent = {
  agents: {
    implementer: {
      id: "implementer",
      name: "Claude",
      role: "Implementer",
      context: "the approved task and repository",
    },
    reviewer: {
      id: "reviewer",
      name: "Review agent",
      role: "Reviewer",
      context: "the supplied diff and acceptance criteria",
    },
  },
  cases: [{
    id: "session-refresh",
    title: "Fix session refresh",
    summary: "A deterministic implementation and review replay.",
    repository: "acme/web",
    branch: "fix/session-refresh",
    events: [{
      id: "task",
      type: "task_received",
      actor: "implementer",
      title: "Read the task",
      summary: "Confirm the requested refresh behavior.",
      blocks: [{
        id: "request",
        kind: "message",
        content: "Prevent duplicate refresh requests and add a regression test.",
      }],
    }, {
      id: "approval",
      type: "approval",
      actor: "reviewer",
      title: "Approve the change",
      summary: "The fix and regression coverage satisfy the task.",
      blocks: [{
        id: "result",
        kind: "result",
        title: "Review result",
        content: "Approved. The scripted replay is ready to present.",
      }],
    }],
  }],
};

export const schemaGuideReplayContentJson = JSON.stringify(
  schemaGuideReplayContent,
  null,
  2,
);

export const schemaGuideQuickStart = `import { AgentSessionReplayer } from "agent-session-replayer";
import {
  parseAgentSessionContent,
  type AgentSessionContent,
} from "agent-session-replayer/schema";
import "agent-session-replayer/styles.css";

const input: unknown = JSON.parse(source);
const content: AgentSessionContent = parseAgentSessionContent(input);

export function Replay() {
  return <AgentSessionReplayer agents={content.agents} cases={content.cases} />;
}`;
```

- [ ] **Step 4: Add the complete field-reference data**

Append this type and all five field groups to `src/schema-guide-content.ts`:

```ts
export interface SchemaGuideField {
  field: string;
  type: string;
  required: "Required" | "Optional";
  rules: string;
  purpose: string;
}

export interface SchemaGuideFieldGroup {
  name: string;
  description: string;
  fields: SchemaGuideField[];
}

export const schemaGuideFieldGroups: SchemaGuideFieldGroup[] = [{
  name: "AgentSessionContent",
  description: "The complete replay document accepted by the schema entry.",
  fields: [{
    field: "agents",
    type: 'Record<"implementer" | "reviewer", AgentIdentity>',
    required: "Required",
    rules: "Contains exactly the implementer and reviewer keys.",
    purpose: "Defines the two identities shown in the replay.",
  }, {
    field: "cases",
    type: "AgentSession[]",
    required: "Required",
    rules: "At least one case; case IDs are unique across the array.",
    purpose: "Provides the ordered sessions a visitor can replay.",
  }],
}, {
  name: "AgentIdentity",
  description: "One visible participant in the authored session.",
  fields: [{
    field: "id",
    type: "string",
    required: "Required",
    rules: "Non-empty.",
    purpose: "Stable identity key for the supplied agent.",
  }, {
    field: "name",
    type: "string",
    required: "Required",
    rules: "Non-empty.",
    purpose: "Visible display name.",
  }, {
    field: "role",
    type: "string",
    required: "Required",
    rules: "Non-empty.",
    purpose: "Visible responsibility label.",
  }, {
    field: "context",
    type: "string",
    required: "Required",
    rules: "Non-empty.",
    purpose: "Explains the authored working context shown in the frame.",
  }],
}, {
  name: "AgentSession",
  description: "One selectable replay case.",
  fields: [{
    field: "id",
    type: "string",
    required: "Required",
    rules: "Non-empty and unique across cases.",
    purpose: "Stable case identity.",
  }, {
    field: "title",
    type: "string",
    required: "Required",
    rules: "Non-empty.",
    purpose: "Primary visible case title.",
  }, {
    field: "summary",
    type: "string",
    required: "Required",
    rules: "Non-empty.",
    purpose: "Short explanation of the replayed case.",
  }, {
    field: "repository",
    type: "string",
    required: "Required",
    rules: "Non-empty.",
    purpose: "Display-only repository label; nothing is inspected.",
  }, {
    field: "branch",
    type: "string",
    required: "Required",
    rules: "Non-empty.",
    purpose: "Display-only branch label.",
  }, {
    field: "events",
    type: "AgentSessionEvent[]",
    required: "Required",
    rules: "At least one event; event IDs are unique within the case.",
    purpose: "Defines the deterministic event sequence.",
  }],
}, {
  name: "AgentSessionEvent",
  description: "One authored step in a case.",
  fields: [{
    field: "id",
    type: "string",
    required: "Required",
    rules: "Non-empty and unique within its case.",
    purpose: "Stable event identity.",
  }, {
    field: "type",
    type: "AgentEventType",
    required: "Required",
    rules: "Must be one documented event-type literal.",
    purpose: "Classifies the authored workflow step.",
  }, {
    field: "actor",
    type: '"implementer" | "reviewer"',
    required: "Required",
    rules: "Must match one of the two agent keys.",
    purpose: "Chooses the participant alignment and identity.",
  }, {
    field: "title",
    type: "string",
    required: "Required",
    rules: "Non-empty.",
    purpose: "Labels the expanded event and its disclosure control.",
  }, {
    field: "summary",
    type: "string",
    required: "Required",
    rules: "Non-empty.",
    purpose: "Explains the result when the event collapses.",
  }, {
    field: "blocks",
    type: "AgentSessionBlock[]",
    required: "Required",
    rules: "At least one block; block IDs are unique within the event.",
    purpose: "Contains the visible authored content.",
  }],
}, {
  name: "AgentSessionBlock",
  description: "One visible content block inside an event.",
  fields: [{
    field: "id",
    type: "string",
    required: "Required",
    rules: "Non-empty and unique within its event.",
    purpose: "Stable block identity.",
  }, {
    field: "kind",
    type: "AgentBlockKind",
    required: "Required",
    rules: "Must be one documented block-kind literal.",
    purpose: "Selects the semantic visual treatment.",
  }, {
    field: "title",
    type: "string",
    required: "Optional",
    rules: "Must be non-empty when supplied.",
    purpose: "Adds a compact visible block heading.",
  }, {
    field: "content",
    type: "string",
    required: "Required",
    rules: "Non-empty.",
    purpose: "Provides the text rendered by the block.",
  }, {
    field: "language",
    type: "string",
    required: "Optional",
    rules: "Must be non-empty when supplied.",
    purpose: "Labels the supplied code or diff language.",
  }],
}];
```

- [ ] **Step 5: Run the focused content test green**

Run:

```bash
rtk bun run build:package
rtk bunx vitest run tests/schema-guide-content.test.ts tests/package-schema.test.ts
```

Expected: both files pass; the documented example parses unchanged and every literal exists in the generated schema.

### Task 2: Render the progressive schema guide at the landing seam

**Files:**
- Create: `src/SchemaGuide.tsx`
- Modify: `src/App.tsx`
- Modify: `tests/app.test.tsx`

- [ ] **Step 1: Write the failing guide-structure test**

Add to `describe("interactive replay landing", ...)` in `tests/app.test.tsx`:

```tsx
it("renders the task-first schema guide with progressive disclosures", () => {
  render(<App />);

  expect(screen.getByRole("navigation", { name: "JSON Schema guide" })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Quick start" })).toHaveAttribute(
    "href",
    "#schema-quick-start",
  );
  expect(screen.getByRole("link", { name: "Field reference" })).toHaveAttribute(
    "href",
    "#schema-field-reference",
  );

  const quickStart = screen.getByText("Quick start", { selector: "summary" }).closest("details");
  const completeExample = screen
    .getByText("Complete replay document", { selector: "summary" })
    .closest("details");
  expect(quickStart).toHaveAttribute("open");
  expect(completeExample).not.toHaveAttribute("open");

  expect(screen.getByText(/parseAgentSessionContent\(input\)/)).toBeInTheDocument();
  fireEvent.click(screen.getByText("Field reference", { selector: "summary" }));
  expect(screen.getByText("AgentSessionContent", { selector: "h4" })).toBeInTheDocument();
  expect(screen.getAllByText(/Draft 2020-12/).length).toBeGreaterThan(0);
  expect(screen.getByText(/document-level issues use/i)).toHaveTextContent("$");
});
```

- [ ] **Step 2: Run the app suite and confirm the guide is red**

Run:

```bash
rtk bunx vitest run tests/app.test.tsx
```

Expected: FAIL because the guide navigation and disclosures do not exist.

- [ ] **Step 3: Create the focused `SchemaGuide` component**

Create `src/SchemaGuide.tsx`. Use this component shape and keep the exact subsection IDs:

```tsx
import { useState } from "react";
import { agentSessionContentJsonSchema } from "agent-session-replayer/schema";
import {
  actorLiterals,
  blockKindLiterals,
  eventTypeLiterals,
  schemaGuideFieldGroups,
  schemaGuideQuickStart,
  schemaGuideReplayContentJson,
} from "./schema-guide-content";

const schemaJson = JSON.stringify(agentSessionContentJsonSchema, null, 2);

type CopyTarget = "schema" | "example";
type CopyFeedback = {
  target: CopyTarget;
  kind: "success" | "error";
  message: string;
} | null;

const guideLinks = [
  ["Quick start", "#schema-quick-start"],
  ["Complete replay document", "#schema-complete-example"],
  ["Field reference", "#schema-field-reference"],
  ["Validation and errors", "#schema-validation-errors"],
  ["ID uniqueness", "#schema-id-uniqueness"],
  ["Compatibility", "#schema-compatibility"],
] as const;

export function SchemaGuide() {
  const [copyFeedback, setCopyFeedback] = useState<CopyFeedback>(null);

  async function copyText(target: CopyTarget, value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopyFeedback({
        target,
        kind: "success",
        message: target === "schema" ? "Copied JSON Schema." : "Copied replay JSON.",
      });
    } catch {
      setCopyFeedback({
        target,
        kind: "error",
        message: target === "schema"
          ? "Copy failed. Select the schema and copy it manually."
          : "Copy failed. Select the replay JSON and copy it manually.",
      });
    }
  }

  function feedbackFor(target: CopyTarget) {
    if (copyFeedback?.target !== target) return null;
    return <p
      role={copyFeedback.kind === "success" ? "status" : "alert"}
      aria-live={copyFeedback.kind === "success" ? "polite" : "assertive"}
    >
      {copyFeedback.message}
    </p>;
  }

  return <section
    className="landing-section schema-section"
    id="schema"
    aria-labelledby="schema-title"
  >
    <div className="section-heading section-heading--split">
      <div>
        <p className="eyebrow">Validate before rendering</p>
        <h2 id="schema-title">JSON Schema</h2>
        <p>
          The runtime parser also enforces unique case IDs, event IDs within each case,
          and block IDs within each event.
        </p>
      </div>
      <div className="copy-action">
        <button type="button" onClick={() => copyText("schema", schemaJson)}>
          Copy JSON Schema
        </button>
        {feedbackFor("schema")}
      </div>
    </div>

    <pre className="code-surface" aria-label="Agent session content JSON Schema" tabIndex={0}>
      <code>{schemaJson}</code>
    </pre>

    <div className="schema-guide" aria-labelledby="schema-guide-title">
      <div className="schema-guide-intro">
        <p className="eyebrow">Detailed reference</p>
        <h3 id="schema-guide-title">Build and validate replay content</h3>
        <p>
          Parse unknown data before rendering. Parsing is synchronous, makes no network
          request, and returns typed content only after every runtime rule passes.
        </p>
      </div>

      <nav className="schema-guide-nav" aria-label="JSON Schema guide">
        <span>In this guide</span>
        {guideLinks.map(([label, href]) => <a key={href} href={href}>{label}</a>)}
      </nav>

      <div className="schema-guide-disclosures">
        <details id="schema-quick-start" className="schema-guide-disclosure" open>
          <summary>Quick start</summary>
          <div className="schema-guide-body">
            <p>
              Validate an <code>unknown</code> value with the public schema entry, then render
              the typed result. Invalid input throws before it reaches the replayer.
            </p>
            <pre className="code-surface" aria-label="Replay content parser example" tabIndex={0}>
              <code>{schemaGuideQuickStart}</code>
            </pre>
          </div>
        </details>

        <details id="schema-complete-example" className="schema-guide-disclosure">
          <summary>Complete replay document</summary>
          <div className="schema-guide-body">
            <p>
              This compact document is package-ready and includes IDs at every required scope.
            </p>
            <div className="schema-guide-copy-row">
              <button
                type="button"
                onClick={() => copyText("example", schemaGuideReplayContentJson)}
              >
                Copy replay JSON
              </button>
              {feedbackFor("example")}
            </div>
            <pre className="code-surface" aria-label="Complete replay JSON" tabIndex={0}>
              <code>{schemaGuideReplayContentJson}</code>
            </pre>
          </div>
        </details>

        <details id="schema-field-reference" className="schema-guide-disclosure">
          <summary>Field reference</summary>
          <div className="schema-guide-body schema-field-groups">
            {schemaGuideFieldGroups.map((group) => <section key={group.name}>
              <h4>{group.name}</h4>
              <p>{group.description}</p>
              <div className="schema-field-table-wrap">
                <table className="schema-field-table">
                  <thead><tr>
                    <th scope="col">Field</th>
                    <th scope="col">Type</th>
                    <th scope="col">Status</th>
                    <th scope="col">Rules</th>
                    <th scope="col">Purpose</th>
                  </tr></thead>
                  <tbody>{group.fields.map((field) => <tr key={field.field}>
                    <th scope="row" data-label="Field"><code>{field.field}</code></th>
                    <td data-label="Type"><code>{field.type}</code></td>
                    <td data-label="Status">{field.required}</td>
                    <td data-label="Rules">{field.rules}</td>
                    <td data-label="Purpose">{field.purpose}</td>
                  </tr>)}</tbody>
                </table>
              </div>
            </section>)}
            <section className="schema-enums" aria-labelledby="schema-enums-title">
              <h4 id="schema-enums-title">Enum literals</h4>
              <dl>
                <div><dt>Actors</dt><dd>{actorLiterals.join(" · ")}</dd></div>
                <div><dt>Event types</dt><dd>{eventTypeLiterals.join(" · ")}</dd></div>
                <div><dt>Block kinds</dt><dd>{blockKindLiterals.join(" · ")}</dd></div>
              </dl>
            </section>
          </div>
        </details>

        <details id="schema-validation-errors" className="schema-guide-disclosure">
          <summary>Validation and errors</summary>
          <div className="schema-guide-body">
            <ul>
              <li>Every object is strict; unknown keys are rejected.</li>
              <li>Required strings and supplied optional strings must be non-empty.</li>
              <li>Cases, events, and blocks must each contain at least one item.</li>
              <li>Invalid actor, event-type, and block-kind literals are rejected.</li>
              <li>Document-level issues use <code>$</code>; nested issues use paths such as <code>cases[0].events[0].blocks[0].content</code>.</li>
            </ul>
            <p>
              Catch <code>Replay content is invalid:</code> errors, show the useful path, and
              keep previously accepted content until another candidate parses successfully.
            </p>
          </div>
        </details>

        <details id="schema-id-uniqueness" className="schema-guide-disclosure">
          <summary>ID uniqueness</summary>
          <div className="schema-guide-body">
            <ul>
              <li>Case IDs are unique across <code>cases</code>.</li>
              <li>Event IDs are unique within each case.</li>
              <li>Block IDs are unique within each event.</li>
            </ul>
            <p>
              Draft 2020-12 describes these rules, but a generic JSON Schema validator cannot
              enforce uniqueness by an object's <code>id</code> property. The runtime parser is
              authoritative for all three scopes.
            </p>
          </div>
        </details>

        <details id="schema-compatibility" className="schema-guide-disclosure">
          <summary>Compatibility</summary>
          <div className="schema-guide-body">
            <p>
              <code>agentSessionContentJsonSchema</code> targets JSON Schema Draft 2020-12.
              Import the type, parser, and schema from <code>agent-session-replayer/schema</code>
              so validation stays aligned with the installed package.
            </p>
            <p>
              Validate persisted documents when reading them. The current document has no
              user-supplied version field; a future breaking contract requires a package version
              change and explicit migration guidance.
            </p>
          </div>
        </details>
      </div>

      <p className="schema-guide-truth">
        Replay content is display data. Parsing and previewing happen locally in browser memory;
        no model, tool, command, repository inspection, upload, or persistence is involved.
      </p>
    </div>
  </section>;
}
```

- [ ] **Step 4: Compose the guide from `App` and remove duplicate state**

In `src/App.tsx`:

1. Change the schema import to only `parseAgentSessionContent`.
2. Import `SchemaGuide` from `./SchemaGuide`.
3. Delete `schemaJson`, `CopyFeedback`, `copyFeedback`, and `copySchema`.
4. Replace the existing `<section id="schema">...</section>` with:

```tsx
<SchemaGuide />
```

Do not change the editor state machine, hero, replayer props, React usage, header, or footer.

- [ ] **Step 5: Run the app suite green**

Run:

```bash
rtk bunx vitest run tests/app.test.tsx
```

Expected: the new guide-structure test and all existing landing/replayer tests pass.

### Task 3: Protect copy, accessibility, truth, and README adoption surfaces

**Files:**
- Modify: `tests/app.test.tsx`
- Modify: `tests/bun-project.test.ts`
- Modify: `packages/agent-session-replayer/README.md`

- [ ] **Step 1: Add failing replay-copy tests at the app seam**

Add to `tests/app.test.tsx`:

```tsx
import { schemaGuideReplayContentJson } from "../src/schema-guide-content";

it("copies the exact complete replay document with accessible feedback", async () => {
  const writeText = vi.fn().mockResolvedValue(undefined);
  setClipboard(writeText);
  render(<App />);

  fireEvent.click(screen.getByText("Complete replay document", { selector: "summary" }));
  fireEvent.click(screen.getByRole("button", { name: "Copy replay JSON" }));

  await waitFor(() => expect(writeText).toHaveBeenCalledWith(schemaGuideReplayContentJson));
  expect(screen.getByRole("status")).toHaveTextContent("Copied replay JSON.");
});

it("offers a manual fallback when replay JSON copying fails", async () => {
  setClipboard(vi.fn().mockRejectedValue(new Error("denied")));
  render(<App />);

  fireEvent.click(screen.getByText("Complete replay document", { selector: "summary" }));
  fireEvent.click(screen.getByRole("button", { name: "Copy replay JSON" }));

  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Copy failed. Select the replay JSON and copy it manually.",
  );
});
```

Expected before the Task 2 implementation is complete: FAIL because the button does not exist. Expected afterward: PASS.

- [ ] **Step 2: Add the complete guide truth and accessibility contract**

Add one test that asserts all durable claims and semantics:

```tsx
it("documents parser truth, privacy, compatibility, and semantic references", () => {
  render(<App />);

  expect(screen.getByText(/parsing is synchronous, makes no network request/i)).toBeInTheDocument();
  expect(screen.getByText(/runtime parser is authoritative for all three scopes/i)).toBeInTheDocument();
  expect(screen.getByText(/no model, tool, command, repository inspection, upload, or persistence/i))
    .toBeInTheDocument();
  expect(screen.getAllByText(/agent-session-replayer\/schema/).length).toBeGreaterThan(0);
  expect(screen.getAllByText(/Draft 2020-12/).length).toBeGreaterThan(0);

  expect(screen.getByLabelText("Replay content parser example")).toHaveAttribute("tabindex", "0");
  fireEvent.click(screen.getByText("Complete replay document", { selector: "summary" }));
  expect(screen.getByLabelText("Complete replay JSON")).toHaveAttribute("tabindex", "0");
  fireEvent.click(screen.getByText("Field reference", { selector: "summary" }));
  expect(screen.getAllByRole("table")).toHaveLength(5);
  expect(screen.getByText("Quick start", { selector: "summary" })).toBeInTheDocument();
  expect(screen.getByText("Compatibility", { selector: "summary" })).toBeInTheDocument();
});
```

- [ ] **Step 3: Add the package README pointer test**

Extend `tests/bun-project.test.ts`:

```ts
it("points package readers to the detailed landing schema guide", () => {
  expect(readme).toContain("Interactive JSON Schema guide");
  expect(readme).toContain("parseAgentSessionContent");
  expect(readme).toContain("bun run dev");
});
```

Run:

```bash
rtk bunx vitest run tests/bun-project.test.ts
```

Expected: FAIL until the README pointer is added.

- [ ] **Step 4: Add the concise README pointer**

Insert after the current **Replay data schema** field reference in `packages/agent-session-replayer/README.md`:

```md
## Interactive JSON Schema guide

The repository landing page includes the full `parseAgentSessionContent` workflow, a copyable replay document, field-by-field reference, error paths, and runtime-only ID uniqueness rules. Run `bun run dev` from the repository root and open the **JSON Schema** section.
```

Do not duplicate the full landing guide in the package README.

- [ ] **Step 5: Run the focused adoption suites**

Run:

```bash
rtk bun run build:package
rtk bunx vitest run tests/schema-guide-content.test.ts tests/app.test.tsx tests/bun-project.test.ts tests/package-schema.test.ts
```

Expected: all guide content, app behavior, README, and public schema tests pass.

### Task 4: Add responsive guide presentation and update the design contract

**Files:**
- Modify: `src/styles.css`
- Modify: `design.md`
- Modify: `tests/app.test.tsx`

- [ ] **Step 1: Add guide selectors without touching package styles**

Append landing-only selectors to `src/styles.css`:

```css
.schema-guide {
  margin-top: 24px;
  padding: clamp(20px, 4vw, 40px);
  border: 1px solid var(--line);
  border-radius: 14px;
  background: rgb(13 16 20 / 92%);
  box-shadow: 0 24px 70px rgb(0 0 0 / 24%);
}

.schema-guide-intro {
  max-width: 780px;
}

.schema-guide-intro h3 {
  margin: 0;
  color: var(--text);
  font-size: clamp(22px, 3vw, 34px);
  font-weight: 580;
  letter-spacing: -0.035em;
}

.schema-guide-intro > p:last-child,
.schema-guide-body,
.schema-guide-truth {
  color: var(--muted);
  font-size: 14px;
  line-height: 1.7;
}

.schema-guide-nav {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: 28px 0;
}

.schema-guide-nav span,
.schema-guide-nav a {
  display: inline-flex;
  min-height: 44px;
  align-items: center;
  padding: 0 12px;
  border: 1px solid var(--line);
  border-radius: 8px;
  font: 700 11px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
}

.schema-guide-nav span {
  color: var(--quiet);
  border-color: transparent;
  padding-left: 0;
  text-transform: uppercase;
}

.schema-guide-nav a {
  color: #b7bbc3;
  text-decoration: none;
}

.schema-guide-disclosures {
  display: grid;
  gap: 10px;
}

.schema-guide-disclosure {
  scroll-margin-top: 24px;
  border: 1px solid var(--line);
  border-radius: 10px;
  background: #0a0d10;
}

.schema-guide-disclosure > summary {
  display: flex;
  min-height: 52px;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
  color: #d6d3ce;
  font: 700 12px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  cursor: pointer;
}

.schema-guide-disclosure > summary::after {
  content: "+";
  color: var(--quiet);
  font-size: 18px;
}

.schema-guide-disclosure[open] > summary::after {
  content: "−";
}

.schema-guide-body {
  padding: 0 16px 20px;
  border-top: 1px solid var(--line);
}

.schema-guide-body > .code-surface,
.schema-guide-body > p:first-child {
  margin-top: 16px;
}

.schema-guide-copy-row {
  display: flex;
  min-height: 44px;
  align-items: center;
  gap: 12px;
  margin: 16px 0 12px;
}

.schema-guide-copy-row button {
  min-height: 44px;
  border: 1px solid #e7e1d7;
  border-radius: 8px;
  padding: 0 16px;
  color: #101318;
  background: #e7e1d7;
  font-size: 12px;
  font-weight: 750;
  cursor: pointer;
}

.schema-guide-copy-row p {
  margin: 0;
  font-size: 12px;
}

.schema-guide-copy-row [role="status"] { color: #7fe6a5; }
.schema-guide-copy-row [role="alert"] { color: #ff9c97; }

.schema-field-groups {
  display: grid;
  gap: 28px;
}

.schema-field-groups section {
  min-width: 0;
}

.schema-field-groups h4 {
  margin: 0;
  color: #ddd9d2;
  font: 700 13px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
}

.schema-field-table-wrap {
  max-width: 100%;
  overflow-x: auto;
  margin-top: 12px;
}

.schema-field-table {
  width: 100%;
  min-width: 920px;
  border-collapse: collapse;
  color: #aeb3bc;
  font-size: 12px;
  line-height: 1.55;
}

.schema-field-table th,
.schema-field-table td {
  padding: 12px;
  border: 1px solid var(--line);
  text-align: left;
  vertical-align: top;
}

.schema-field-table thead th {
  color: #747b86;
  font: 700 10px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.schema-field-table tbody th {
  color: #d4d7dd;
  font-weight: 600;
}

.schema-enums dl {
  display: grid;
  gap: 8px;
  margin: 12px 0 0;
}

.schema-enums dl > div {
  display: grid;
  grid-template-columns: 120px minmax(0, 1fr);
  gap: 12px;
}

.schema-enums dt {
  color: #d0d3d9;
  font-weight: 650;
}

.schema-enums dd {
  min-width: 0;
  margin: 0;
  overflow-wrap: anywhere;
}

.schema-guide-truth {
  margin: 20px 0 0;
  padding-top: 20px;
  border-top: 1px solid var(--line);
}
```

Extend the global focus selector with `.schema-guide-disclosure > summary:focus-visible` so native summaries receive the existing 2px focus ring.

- [ ] **Step 2: Add the approved mobile field-card treatment**

Inside the existing `@media (max-width: 760px)` block, add:

```css
.schema-guide {
  padding: 18px 12px;
}

.schema-guide-nav {
  display: grid;
  grid-template-columns: 1fr;
}

.schema-guide-nav span,
.schema-guide-nav a,
.schema-guide-copy-row button {
  width: 100%;
}

.schema-guide-copy-row {
  display: grid;
}

.schema-field-table-wrap {
  overflow: visible;
}

.schema-field-table {
  min-width: 0;
}

.schema-field-table thead {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
}

.schema-field-table,
.schema-field-table tbody,
.schema-field-table tr {
  display: block;
}

.schema-field-table tr {
  margin-top: 12px;
  border: 1px solid var(--line);
  border-radius: 8px;
  overflow: hidden;
}

.schema-field-table th,
.schema-field-table td {
  display: grid;
  grid-template-columns: minmax(74px, 0.35fr) minmax(0, 1fr);
  gap: 10px;
  border: 0;
  border-bottom: 1px solid var(--line);
}

.schema-field-table tr > :last-child {
  border-bottom: 0;
}

.schema-field-table th::before,
.schema-field-table td::before {
  content: attr(data-label);
  color: #747b86;
  font: 700 9px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.schema-enums dl > div {
  grid-template-columns: 1fr;
  gap: 4px;
}
```

Do not add any `.asr-*` selector or edit `packages/agent-session-replayer/src/styles.css`.

- [ ] **Step 3: Verify the landing CSS boundary with a literal search**

Run:

```bash
rtk rg -n "\\.asr-|data-agent-session-replayer" src/styles.css
```

Expected: exit 1 with no matches. Do not add a package-selector exception; the landing stylesheet must remain independent of the replayer's `asr-` namespace.

- [ ] **Step 4: Update `design.md`**

In the **Landing page contract** section, extend item 4 and the following paragraphs to record:

```md
The JSON Schema section is also the detailed data-contract guide. It keeps the raw schema first, then provides an in-page task-first reference: Quick start, complete replay document, field reference, validation and errors, ID uniqueness, and compatibility. Quick start is open by default; the remaining sections use native disclosures with stable anchors. The complete example is copyable and must pass the public runtime parser unchanged.

The guide owns schema construction, validation, error paths, and runtime-only uniqueness documentation. React usage remains focused on installation and rendering. At narrow widths, field tables become labeled stacked cards without losing their field/type/status/rules/purpose relationships. Landing guide CSS remains separate from all package `asr-` selectors.
```

Keep the existing six-part top-level landing hierarchy; this is an expansion of item 4, not a new marketing section.

- [ ] **Step 5: Run the intended source and documentation checks**

Run:

```bash
rtk bunx vitest run tests/schema-guide-content.test.ts tests/app.test.tsx tests/bun-project.test.ts
rtk git diff --check -- src tests packages/agent-session-replayer/README.md design.md docs/superpowers/specs/2026-07-13-json-schema-landing-docs-design.md docs/superpowers/plans/2026-07-13-json-schema-landing-docs.md
rtk rg -n "\\.asr-|data-agent-session-replayer" src/styles.css
```

Expected: focused tests pass; diff-check is clean; the landing CSS boundary search returns no matches.

### Task 5: Verify the complete landing and published artifact

**Files:**
- Verify: root `dist/`
- Verify: `packages/agent-session-replayer/dist/`
- Verify: `packages/agent-session-replayer/artifacts/agent-session-replayer-0.1.0.tgz`

- [ ] **Step 1: Run the fresh type gate**

Run:

```bash
rtk bun run typecheck
```

Expected: exit 0 with no diagnostics.

- [ ] **Step 2: Run the full regression suite**

Run:

```bash
rtk bun run test
```

Expected: every package, schema, app, workflow, CSS, SSR, playback, and new documentation test passes.

- [ ] **Step 3: Build the package and production landing**

Run:

```bash
rtk bun run build
```

Expected: package ESM/CJS/declarations/styles and the Vite landing build successfully.

- [ ] **Step 4: Pack and inspect the README-bearing artifact**

Run:

```bash
rtk bun run pack:package
rtk tar -tzf packages/agent-session-replayer/artifacts/agent-session-replayer-0.1.0.tgz
```

Expected: the artifact contains the updated `README.md`, root/schema ESM, CJS, declarations, and `dist/styles.css`.

- [ ] **Step 5: Perform browser QA at desktop and mobile widths**

At 1280px, 900px, and 390px verify:

- The raw schema remains first and copyable.
- Quick start is open by default; all other disclosures start collapsed and can remain open together.
- Every in-guide anchor reaches the correct subsection.
- The parser example, complete replay JSON, all five field groups, all enum literals, error guidance, uniqueness limits, compatibility, and product truth are readable.
- Schema and replay JSON copy success/failure feedback is announced correctly.
- Desktop tables are readable; mobile tables become labeled cards.
- Code blocks scroll internally and the page has no horizontal overflow.
- Disclosure summaries, anchors, and copy buttons have visible keyboard focus and at least 44px targets.
- The embedded replayer still caps rendered text at 16px and retains its existing semantics.
- No app-origin console warning or error appears.

- [ ] **Step 6: Review the final scoped diff and worktree**

Run:

```bash
rtk git diff --check -- src tests packages/agent-session-replayer/README.md design.md docs/superpowers/specs/2026-07-13-json-schema-landing-docs-design.md docs/superpowers/plans/2026-07-13-json-schema-landing-docs.md
rtk git status --short
```

Confirm only the approved schema-guide files changed, unrelated worktree state is intact, and nothing is staged or committed.

# Three-Case Chat Autoplay Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace manual per-message navigation with automatic chat playback inside exactly three viewer-controlled cases.

**Architecture:** Schema version 3 owns three cases with variable event counts. A pure autoplay reducer owns case/event/reveal state and rejects stale tagged actions; React owns one cancellable timer effect and renders the reducer projection.

**Tech Stack:** TypeScript, React, Zod, Motion, Vitest, Testing Library, Bun, Vite

---

### Task 1: Migrate Bundled Data to Three Cases

**Files:**
- Modify: `src/workflow.ts`
- Modify: `src/data/demo.json`
- Modify: `tests/workflow.test.ts`

- [ ] **Step 1: Replace fixed-event validation tests with case validation tests**

Update `tests/workflow.test.ts` to assert:

```ts
expect(workflow.version).toBe(3);
expect(workflow.cases).toHaveLength(3);
expect(workflow.cases.map((item) => item.id)).toEqual([
  "async-close",
  "negative-timestamp",
  "eager-default",
]);
expect(workflow.cases.map((item) => item.events.length)).toEqual([9, 4, 5]);
```

Add failure cases by cloning the parsed source:

```ts
it("rejects duplicate case ids", () => {
  const source = JSON.parse(JSON.stringify(demoSource));
  source.cases[1].id = source.cases[0].id;
  expect(() => parseWorkflow(JSON.stringify(source))).toThrow(/case ids/i);
});

it("rejects an empty case", () => {
  const source = JSON.parse(JSON.stringify(demoSource));
  source.cases[2].events = [];
  expect(() => parseWorkflow(JSON.stringify(source))).toThrow(/events/i);
});
```

- [ ] **Step 2: Run the workflow tests and confirm schema-v2 failures**

Run:

```bash
rtk bun run test -- tests/workflow.test.ts
```

Expected: FAIL because version 3 and `cases` are not accepted.

- [ ] **Step 3: Implement schema version 3**

In `src/workflow.ts`, keep `blockSchema`, `agentSchema`, and `eventSchema`, remove fixed event count/order refinements, and define:

```ts
const caseSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  summary: z.string().min(1),
  repository: z.string().min(1),
  branch: z.string().min(1),
  events: z.array(eventSchema).min(1),
}).strict();

const workflowSchema = z.object({
  version: z.literal(3),
  title: z.string().min(1),
  agents: z.object({
    implementer: agentSchema,
    reviewer: agentSchema,
  }).strict(),
  cases: z.array(caseSchema).length(3),
}).strict().superRefine((workflow, context) => {
  const ids = workflow.cases.map((item) => item.id);
  if (new Set(ids).size !== ids.length) {
    context.addIssue({
      code: "custom",
      path: ["cases"],
      message: "Case ids must be unique",
    });
  }
});

export type Workflow = z.infer<typeof workflowSchema>;
export type DemoCase = Workflow["cases"][number];
export type WorkflowEvent = DemoCase["events"][number];
export type WorkflowBlock = WorkflowEvent["blocks"][number];
```

- [ ] **Step 4: Reshape `demo.json` and add two compact stories**

Change the root `version` to `3` and root `title` to `Three bugs caught by adversarial review`. Keep the existing complete `agents` object unchanged. Remove root `repository`, `branch`, and `events`, then place their existing values unchanged in the first `cases` entry together with these exact fields:

```json
{
  "id": "async-close",
  "title": "The async close",
  "summary": "Reviewer catches a use-after-free in asynchronous cleanup."
}
```

The resulting first case uses the existing `acme/dashboard` repository, `fix/session-refresh-race` branch, and all nine existing event objects in their current order.

Append case 2 with four events:

```json
{
  "id": "negative-timestamp",
  "title": "The negative timestamp",
  "summary": "Reviewer catches a signed timestamp converted into an enormous unsigned value.",
  "repository": "acme/runtime",
  "branch": "fix/cache-expiry",
  "events": [
    { "type": "task_received", "actor": "implementer", "title": "Normalize cache expiry", "summary": "Claude receives the cache-expiry task.", "blocks": [{ "kind": "message", "content": "I’ll normalize the persisted timestamp before comparing it with the current clock." }] },
    { "type": "patch", "actor": "implementer", "title": "Initial conversion", "summary": "Claude converts the stored timestamp.", "blocks": [{ "kind": "patch", "title": "src/cache/expiry.ts", "language": "typescript", "content": "const expiresAt = BigInt(record.expiresAt) as unknown as bigint;\nreturn Number(expiresAt) <= Date.now();" }] },
    { "type": "blocking_finding", "actor": "reviewer", "title": "Signedness is unchecked", "summary": "Reviewer finds that negative values bypass expiry.", "blocks": [{ "kind": "finding", "title": "Blocking", "content": "A negative persisted timestamp is converted without validation and can become an invalid far-future expiry." }] },
    { "type": "approval", "actor": "reviewer", "title": "Range guard verified", "summary": "Reviewer approves explicit timestamp range validation.", "blocks": [{ "kind": "result", "title": "Approved", "content": "The parser rejects negative and out-of-range timestamps before cache comparison." }] }
  ]
}
```

Append case 3 with five events:

```json
{
  "id": "eager-default",
  "title": "The eager default",
  "summary": "Reviewer catches fallback work executing even when the primary value exists.",
  "repository": "acme/config",
  "branch": "fix/lazy-default",
  "events": [
    { "type": "task_received", "actor": "implementer", "title": "Add configuration fallback", "summary": "Claude receives the fallback task.", "blocks": [{ "kind": "message", "content": "I’ll use the discovered value when present and compute a fallback otherwise." }] },
    { "type": "plan", "actor": "implementer", "title": "Preserve the primary path", "summary": "Claude plans a compact optional fallback.", "blocks": [{ "kind": "status", "title": "Plan", "content": "Keep lookup first, then provide the default expression." }] },
    { "type": "patch", "actor": "implementer", "title": "Initial fallback", "summary": "Claude adds an eager fallback expression.", "blocks": [{ "kind": "code", "title": "src/config/load.ts", "language": "typescript", "content": "const config = discovered ?? buildDefaultConfig();" }] },
    { "type": "blocking_finding", "actor": "reviewer", "title": "Default performs side effects", "summary": "Reviewer finds the default is built too early in the target runtime.", "blocks": [{ "kind": "finding", "title": "Blocking", "content": "The target helper evaluates both arguments, so buildDefaultConfig writes files even when discovered is present." }] },
    { "type": "approval", "actor": "reviewer", "title": "Lazy fallback verified", "summary": "Reviewer approves the explicit lazy branch.", "blocks": [{ "kind": "result", "title": "Approved", "content": "The default builder now runs only when no discovered configuration exists." }] }
  ]
}
```

- [ ] **Step 5: Run schema tests and commit**

```bash
rtk bun run test -- tests/workflow.test.ts
rtk git add src/workflow.ts src/data/demo.json tests/workflow.test.ts
rtk git commit -m "feat: model three review cases"
```

Expected: workflow tests pass with case event counts `[9, 4, 5]`.

### Task 2: Add the Pure Case Autoplay Reducer

**Files:**
- Create: `src/autoplay.ts`
- Create: `tests/autoplay.test.ts`
- Modify: `src/workflow.ts`

- [ ] **Step 1: Export event reveal length**

Add to `src/workflow.ts`:

```ts
export const getEventLength = (event: WorkflowEvent): number =>
  segmentGraphemes(getEventText(event)).length;
```

- [ ] **Step 2: Write reducer tests**

Create `tests/autoplay.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import demoSource from "../src/data/demo.json";
import { autoplayReducer, createAutoplayState } from "../src/autoplay";
import { getEventLength, parseWorkflow } from "../src/workflow";

const workflow = parseWorkflow(JSON.stringify(demoSource));

describe("case autoplay", () => {
  it("starts case one at its first event", () => {
    expect(createAutoplayState()).toEqual({
      caseIndex: 0,
      eventIndex: 0,
      revealOffset: 0,
      phase: "typing",
    });
  });

  it("completes an event and advances after the pause", () => {
    const initial = createAutoplayState();
    const completed = autoplayReducer(initial, {
      type: "COMPLETE_EVENT",
      workflow,
      caseIndex: 0,
      eventIndex: 0,
    });
    expect(completed).toEqual({
      caseIndex: 0,
      eventIndex: 0,
      revealOffset: getEventLength(workflow.cases[0]!.events[0]!),
      phase: "between-events",
    });

    expect(autoplayReducer(completed, {
      type: "ADVANCE_EVENT",
      workflow,
      caseIndex: 0,
      eventIndex: 0,
    })).toEqual({
      caseIndex: 0,
      eventIndex: 1,
      revealOffset: 0,
      phase: "typing",
    });
  });

  it("interrupts a case and ignores its stale tick", () => {
    const interrupted = autoplayReducer(createAutoplayState(), {
      type: "NEXT_CASE",
      workflow,
    });
    expect(interrupted).toEqual({
      caseIndex: 1,
      eventIndex: 0,
      revealOffset: 0,
      phase: "typing",
    });

    expect(autoplayReducer(interrupted, {
      type: "TICK",
      workflow,
      caseIndex: 0,
      eventIndex: 0,
      amount: 2,
    })).toEqual(interrupted);
  });

  it("restarts and moves to the previous case from event zero", () => {
    const caseTwo = autoplayReducer(createAutoplayState(), {
      type: "NEXT_CASE",
      workflow,
    });
    const progressed = { ...caseTwo, eventIndex: 2, revealOffset: 7 };

    expect(autoplayReducer(progressed, {
      type: "RESTART_CASE",
      workflow,
    })).toEqual(caseTwo);

    expect(autoplayReducer(progressed, {
      type: "PREVIOUS_CASE",
      workflow,
    })).toEqual(createAutoplayState());
  });

  it("clamps case navigation and completes the final event", () => {
    const first = createAutoplayState();
    expect(autoplayReducer(first, {
      type: "PREVIOUS_CASE",
      workflow,
    })).toEqual(first);

    const finalCase = {
      caseIndex: 2,
      eventIndex: workflow.cases[2]!.events.length - 1,
      revealOffset: 0,
      phase: "typing" as const,
    };
    const completed = autoplayReducer(finalCase, {
      type: "COMPLETE_EVENT",
      workflow,
      caseIndex: 2,
      eventIndex: finalCase.eventIndex,
    });
    expect(completed.phase).toBe("case-complete");
    expect(autoplayReducer(completed, {
      type: "NEXT_CASE",
      workflow,
    })).toEqual(completed);
  });
});
```

- [ ] **Step 3: Run tests and confirm missing-module failure**

```bash
rtk bun run test -- tests/autoplay.test.ts
```

Expected: FAIL because `src/autoplay.ts` does not exist.

- [ ] **Step 4: Implement `src/autoplay.ts`**

Define:

```ts
export type AutoplayState = {
  caseIndex: number;
  eventIndex: number;
  revealOffset: number;
  phase: "typing" | "between-events" | "case-complete";
};

export type AutoplayAction =
  | { type: "TICK"; workflow: Workflow; caseIndex: number; eventIndex: number; amount: number }
  | { type: "COMPLETE_EVENT"; workflow: Workflow; caseIndex: number; eventIndex: number }
  | { type: "ADVANCE_EVENT"; workflow: Workflow; caseIndex: number; eventIndex: number }
  | { type: "NEXT_CASE"; workflow: Workflow }
  | { type: "PREVIOUS_CASE"; workflow: Workflow }
  | { type: "RESTART_CASE"; workflow: Workflow };

export const createAutoplayState = (): AutoplayState => ({
  caseIndex: 0,
  eventIndex: 0,
  revealOffset: 0,
  phase: "typing",
});
```

Implement the reducer with tagged-action rejection:

```ts
const isStale = (
  state: AutoplayState,
  action: { caseIndex: number; eventIndex: number },
) => action.caseIndex !== state.caseIndex || action.eventIndex !== state.eventIndex;

const startCase = (caseIndex: number): AutoplayState => ({
  caseIndex,
  eventIndex: 0,
  revealOffset: 0,
  phase: "typing",
});

const currentEvent = (workflow: Workflow, state: AutoplayState) =>
  workflow.cases[state.caseIndex]!.events[state.eventIndex]!;

const completeCurrentEvent = (
  workflow: Workflow,
  state: AutoplayState,
): AutoplayState => {
  const activeCase = workflow.cases[state.caseIndex]!;
  return {
    ...state,
    revealOffset: getEventLength(currentEvent(workflow, state)),
    phase: state.eventIndex === activeCase.events.length - 1
      ? "case-complete"
      : "between-events",
  };
};

export function autoplayReducer(
  state: AutoplayState,
  action: AutoplayAction,
): AutoplayState {
  if (action.type === "NEXT_CASE") {
    return state.caseIndex >= action.workflow.cases.length - 1
      ? state
      : startCase(state.caseIndex + 1);
  }
  if (action.type === "PREVIOUS_CASE") {
    return state.caseIndex <= 0 ? state : startCase(state.caseIndex - 1);
  }
  if (action.type === "RESTART_CASE") return startCase(state.caseIndex);
  if (isStale(state, action)) return state;

  if (action.type === "ADVANCE_EVENT") {
    if (state.phase !== "between-events") return state;
    return {
      ...state,
      eventIndex: state.eventIndex + 1,
      revealOffset: 0,
      phase: "typing",
    };
  }

  if (state.phase !== "typing") return state;
  if (action.type === "COMPLETE_EVENT") {
    return completeCurrentEvent(action.workflow, state);
  }

  const length = getEventLength(currentEvent(action.workflow, state));
  const revealOffset = Math.min(length, state.revealOffset + action.amount);
  return revealOffset >= length
    ? completeCurrentEvent(action.workflow, { ...state, revealOffset })
    : { ...state, revealOffset };
}
```

- [ ] **Step 5: Run reducer tests and commit**

```bash
rtk bun run test -- tests/autoplay.test.ts
rtk git add src/autoplay.ts src/workflow.ts tests/autoplay.test.ts
rtk git commit -m "feat: add deterministic case autoplay"
```

Expected: reducer tests pass, including stale action rejection.

### Task 3: Replace Manual Message Controls with Autoplay

**Files:**
- Modify: `src/App.tsx`
- Modify: `tests/app.test.tsx`

- [ ] **Step 1: Replace manual-navigation tests**

Use fake timers and assert observable behavior:

```tsx
vi.useFakeTimers();
render(<App />);
expect(screen.getByText(/case 1 of 3/i)).toBeInTheDocument();
expect(screen.getByRole("article")).toHaveAccessibleName(/task received/i);

fireEvent.click(screen.getByRole("button", { name: /next case/i }));
expect(screen.getByText(/case 2 of 3/i)).toBeInTheDocument();
expect(screen.getByRole("article")).toHaveAccessibleName(/normalize cache expiry/i);

act(() => vi.runOnlyPendingTimers());
expect(screen.queryByText(/task received/i, { selector: ".event-summary-row *" })).not.toBeInTheDocument();
```

Add these additional tests:

```tsx
it("autoplays every event in a case", () => {
  vi.useFakeTimers();
  const { container } = render(<App />);

  act(() => vi.runAllTimers());

  expect(container.querySelectorAll(".event-summary-row")).toHaveLength(8);
  expect(screen.getByRole("article")).toHaveAccessibleName(/approved/i);
  expect(screen.getByText(/case complete/i)).toBeInTheDocument();
});

it("restarts and moves between case boundaries", () => {
  render(<App />);
  const nextCase = screen.getByRole("button", { name: /next case/i });

  fireEvent.click(nextCase);
  expect(screen.getByText(/case 2 of 3/i)).toBeInTheDocument();
  expect(screen.getByRole("article")).toHaveAccessibleName(/normalize cache expiry/i);

  fireEvent.click(screen.getByRole("button", { name: /restart case/i }));
  expect(screen.getByRole("article")).toHaveAccessibleName(/normalize cache expiry/i);

  fireEvent.click(screen.getByRole("button", { name: /previous case/i }));
  expect(screen.getByText(/case 1 of 3/i)).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /previous case/i })).toBeDisabled();

  fireEvent.click(nextCase);
  fireEvent.click(nextCase);
  expect(screen.getByText(/case 3 of 3/i)).toBeInTheDocument();
  expect(nextCase).toBeDisabled();
});

it("removes manual message navigation", () => {
  render(<App />);
  expect(screen.queryByRole("button", { name: /^next$/i })).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: /finish current event/i })).not.toBeInTheDocument();
});
```

- [ ] **Step 2: Run app tests and confirm old UI failures**

```bash
rtk bun run test -- tests/app.test.tsx
```

Expected: FAIL because the app still exposes manual message controls and schema-v2 fields.

- [ ] **Step 3: Wire the autoplay reducer and one timer effect**

In `src/App.tsx`:

```ts
const TICK_MS = 18;
const BETWEEN_EVENT_MS = 500;
const [state, dispatch] = useReducer(
  autoplayReducer,
  undefined,
  createAutoplayState,
);
const activeCase = workflow.cases[state.caseIndex];
const event = activeCase.events[state.eventIndex];
```

Replace the existing timer effect with:

```ts
useEffect(() => {
  const caseIndex = state.caseIndex;
  const eventIndex = state.eventIndex;

  if (state.phase === "typing") {
    if (reduceMotion) {
      dispatch({ type: "COMPLETE_EVENT", workflow, caseIndex, eventIndex });
      return;
    }
    const timer = window.setTimeout(() => {
      dispatch({ type: "TICK", workflow, caseIndex, eventIndex, amount: 2 });
    }, TICK_MS);
    return () => window.clearTimeout(timer);
  }

  if (state.phase === "between-events") {
    const timer = window.setTimeout(() => {
      dispatch({ type: "ADVANCE_EVENT", workflow, caseIndex, eventIndex });
    }, BETWEEN_EVENT_MS);
    return () => window.clearTimeout(timer);
  }
}, [state.caseIndex, state.eventIndex, state.phase, state.revealOffset, reduceMotion]);
```

- [ ] **Step 4: Replace transcript and controls**

Render summaries from:

```ts
activeCase.events.slice(0, state.eventIndex)
```

Render the header labels:

```tsx
<span>Case {state.caseIndex + 1} of {workflow.cases.length}</span>
<span>
  {state.phase === "case-complete"
    ? "Case complete"
    : `Message ${state.eventIndex + 1} of ${activeCase.events.length}`}
</span>
```

Replace playback buttons with:

```tsx
<button
  onClick={() => dispatch({ type: "PREVIOUS_CASE", workflow })}
  disabled={state.caseIndex === 0}
>
  Previous case
</button>
<button onClick={() => dispatch({ type: "RESTART_CASE", workflow })}>
  Restart case
</button>
<button
  onClick={() => dispatch({ type: "NEXT_CASE", workflow })}
  disabled={state.caseIndex === workflow.cases.length - 1}
>
  Next case
</button>
```

Use `activeCase.repository`, `activeCase.branch`, and `activeCase.title`. Keep the existing progressive `revealEvent` projection so future block rows remain absent.

- [ ] **Step 5: Run app and full tests, then commit**

```bash
rtk bun run test -- tests/app.test.tsx
rtk bun run test
rtk git add src/App.tsx tests/app.test.tsx
rtk git commit -m "feat: autoplay chat within each case"
```

Expected: all tests pass and no manual per-message button remains.

### Task 4: Polish Case Progress and Responsive Controls

**Files:**
- Modify: `src/styles.css`
- Modify: `src/App.tsx`

- [ ] **Step 1: Add semantic case-progress hooks**

Add `case-progress`, `message-progress`, and `case-title` classes to their corresponding labels in `App.tsx`.

- [ ] **Step 2: Update controls for longer labels**

In `src/styles.css`, keep `min-height: 44px` and allow three case controls to wrap at narrow widths:

```css
.controls {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.controls button {
  min-height: 44px;
  white-space: normal;
}

@media (max-width: 420px) {
  .controls {
    grid-template-columns: 1fr;
  }
}
```

- [ ] **Step 3: Verify styles and commit**

```bash
rtk bun run typecheck
rtk bun run build
rtk git add src/App.tsx src/styles.css
rtk git commit -m "style: clarify case autoplay progress"
```

Expected: production build succeeds and controls remain at least 44px tall.

### Task 5: Full Browser and Release Verification

**Files:**
- Verify: `src/data/demo.json`
- Verify: `src/autoplay.ts`
- Verify: `src/App.tsx`
- Verify: `src/styles.css`

- [ ] **Step 1: Run fresh automated gates**

```bash
rtk bun run test
rtk bun run typecheck
rtk bun run build
```

Expected: all commands exit zero.

- [ ] **Step 2: Start the production preview**

```bash
rtk bunx vite preview --host 127.0.0.1
```

- [ ] **Step 3: Verify case interruption and boundaries**

In the browser:

1. Confirm case 1 begins typing without a click.
2. Press Next case during typing; confirm case 2 starts at its first event with no case-1 text.
3. Press Previous case; confirm case 1 restarts from event 1.
4. Press Restart case mid-message; confirm the same case restarts cleanly.
5. Navigate to case 3; confirm Next case is disabled.

Expected: case transitions are immediate and no stale event text appears.

- [ ] **Step 4: Verify autoplay and variable event counts**

Let each case finish. Confirm its collapsed-summary count is 8, 3, and 4 respectively, with one final expanded event. Confirm the header reports message totals 9, 4, and 5.

- [ ] **Step 5: Verify responsive and accessible behavior**

Check 1440×900, 768×1024, 390×844, and 320×568. Confirm no document-level horizontal overflow, case controls are at least 44px tall, focus remains on the activated control, reduced motion reveals each event immediately, and the console has no warnings or errors.

- [ ] **Step 6: Record the release checkpoint**

```bash
rtk git status --short
rtk git log -4 --oneline
```

Expected: only pre-existing unrelated/untracked workspace files remain; the case-autoplay commits are present.

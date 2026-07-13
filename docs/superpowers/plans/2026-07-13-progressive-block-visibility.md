# Progressive Block Visibility Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep future content-block boxes out of the DOM until the character reveal reaches their row.

**Architecture:** Preserve the current reducer and renderer. Change only the reveal projection so it returns the reached prefix of an event's blocks; React continues rendering every projected block without adding a second visibility rule.

**Tech Stack:** TypeScript, React, Vitest, Testing Library, Bun, Vite

---

### Task 1: Lock Down the Premature-Block Regression

**Files:**
- Modify: `tests/app.test.tsx`
- Test: `tests/app.test.tsx`

- [ ] **Step 1: Add the failing DOM regression test**

Add this test inside `describe("chat playback experience", ...)`:

```tsx
it("does not mount a later block before the reveal reaches its row", () => {
  const { container } = render(<App />);

  fireEvent.click(screen.getByRole("button", { name: /^next$/i }));

  expect(container.querySelectorAll(".chat-block")).toHaveLength(1);
  expect(container.querySelector(".chat-block--message")).toBeInTheDocument();
  expect(container.querySelector(".chat-block--status")).not.toBeInTheDocument();

  fireEvent.click(
    screen.getByRole("button", { name: /finish current event/i }),
  );

  expect(container.querySelectorAll(".chat-block")).toHaveLength(2);
  expect(container.querySelector(".chat-block--status")).toBeInTheDocument();
  expect(
    screen.getByRole("article", { name: /task received/i }),
  ).toBeInTheDocument();
  expect(
    screen.queryByRole("article", { name: /plan the fix/i }),
  ).not.toBeInTheDocument();
});
```

- [ ] **Step 2: Run the focused test and verify the exact failure**

Run:

```bash
rtk bun run test -- tests/app.test.tsx -t "does not mount a later block"
```

Expected: FAIL because `.chat-block` has length `2` immediately after the first `Next`; the empty `.chat-block--status` is mounted too early.

- [ ] **Step 3: Confirm the failure is deterministic**

Run the same focused command a second time.

Expected: the same length-2 failure, proving the regression loop is stable and red-capable.

### Task 2: Project Only Reached Blocks

**Files:**
- Modify: `src/workflow.ts`
- Test: `tests/app.test.tsx`

- [ ] **Step 1: Replace `revealEvent` with a reached-prefix projection**

In `src/workflow.ts`, replace the existing `revealEvent` function with:

```ts
export function revealEvent(
  event: WorkflowEvent,
  offset: number,
): WorkflowEvent {
  let remaining = offset;
  const blocks: WorkflowBlock[] = [];

  for (const block of event.blocks) {
    if (remaining <= 0) break;

    const title = block.title ?? "";
    const titleParts = segmentGraphemes(title);
    const shownTitle = titleParts.slice(0, remaining).join("");
    remaining = Math.max(
      0,
      remaining - titleParts.length - (title ? 1 : 0),
    );

    const contentParts = segmentGraphemes(block.content);
    const content = contentParts.slice(0, remaining).join("");
    remaining = Math.max(0, remaining - contentParts.length - 1);

    blocks.push({
      ...block,
      title: block.title ? shownTitle : undefined,
      content,
    });
  }

  return { ...event, blocks };
}
```

This preserves the existing grapheme accounting and stops before an unreached block is projected.

- [ ] **Step 2: Run the focused regression test**

Run:

```bash
rtk bun run test -- tests/app.test.tsx -t "does not mount a later block"
```

Expected: PASS. One message block exists when event 1 starts; finishing the event reveals the status block without advancing.

- [ ] **Step 3: Run the full application test file**

Run:

```bash
rtk bun run test -- tests/app.test.tsx
```

Expected: all chat playback tests pass, including Next, Previous, Restart, and stale-timer behavior.

- [ ] **Step 4: Commit the regression fix**

```bash
rtk git add src/workflow.ts tests/app.test.tsx
rtk git commit -m "fix: reveal chat blocks only when reached"
```

### Task 3: Verify the Original Browser Symptom and Release Gates

**Files:**
- Verify: `src/workflow.ts`
- Verify: `tests/app.test.tsx`

- [ ] **Step 1: Run the complete automated verification gate**

Run:

```bash
rtk bun run test
rtk bun run typecheck
rtk bun run build
```

Expected: all tests pass, TypeScript exits `0`, and Vite produces the production bundle without errors.

- [ ] **Step 2: Start the production preview**

Run:

```bash
rtk bunx vite preview --host 127.0.0.1
```

Open the printed local URL in the browser.

- [ ] **Step 3: Re-run the original DOM reproduction**

On the untouched introduction, press `Next` once and inspect the active event.

Expected:

```text
.chat-block count: 1
present: .chat-block--message
absent:  .chat-block--status
```

Press `Finish current event`.

Expected:

```text
.chat-block count: 2
present: .chat-block--message
present: .chat-block--status
active event: Task received
next event: absent
```

- [ ] **Step 4: Check later multi-block events**

Advance to one event containing code/tool/finding/patch content. At the start of that event, verify only its first reached block is mounted. Finish it and verify all of that event's blocks appear in JSON order.

Expected: no empty future box appears at any point; completed blocks remain visible while the current block reveals.

- [ ] **Step 5: Confirm no adjacent behavior changed**

Verify Previous restores the prior event fully, Restart returns to the untouched introduction, and reduced-motion mode reveals the entire current event immediately.

Expected: navigation and accessibility behavior match the approved design with no console errors.

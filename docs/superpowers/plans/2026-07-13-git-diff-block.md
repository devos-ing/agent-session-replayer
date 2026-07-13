# Git Diff Chat Block Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a public `git_diff` chat block that renders raw unified Git diffs with semantic, accessible line treatment while preserving playback behavior.

**Architecture:** Keep raw diff text in the existing block model. A focused `GitDiffBlock` module will classify visible lines deterministically and render escaped React text; the replayer only routes the new kind, while namespaced CSS handles scan-friendly colors and horizontal overflow. The demo schema and fixture will exercise the public feature without changing existing `patch` semantics.

**Tech Stack:** React 19, TypeScript 5.9, CSS, Vitest, Testing Library, tsup, Vite, Bun

---

## File Structure

- Create `packages/agent-session-replayer/src/GitDiffBlock.tsx`: unified-diff line classifier and focused renderer.
- Create `tests/git-diff-block.test.tsx`: classifier and escaped-text rendering tests.
- Modify `packages/agent-session-replayer/src/types.ts`: add the public `git_diff` block-kind literal.
- Modify `packages/agent-session-replayer/src/AgentSessionReplayer.tsx`: route `git_diff` blocks to the focused renderer.
- Modify `packages/agent-session-replayer/src/styles.css`: add namespaced diff block and semantic line styles.
- Modify `tests/package-api.test.tsx`: prove public replayer integration and type compatibility.
- Modify `tests/package-css.test.ts`: prove no-wrap overflow and semantic visual rules in compiled CSS.
- Modify `src/workflow.ts`: allow `git_diff` in the demo's validated workflow schema.
- Modify `src/data/demo.json`: showcase a representative unified diff in the chat.
- Modify `tests/app.test.tsx`: prove the demo workflow accepts and reaches the new block.

### Task 1: Build the deterministic Git diff renderer

**Files:**
- Create: `tests/git-diff-block.test.tsx`
- Create: `packages/agent-session-replayer/src/GitDiffBlock.tsx`

- [ ] **Step 1: Record the pre-change Pony Trail snapshot**

Run:

```bash
rtk sh /Users/roy/.agents/skills/pony-trail/scripts/snapshot_change.sh --session-id agent-session-replayer-git-diff pre --files tests/git-diff-block.test.tsx packages/agent-session-replayer/src/GitDiffBlock.tsx --action "add Git diff classifier and renderer" --purpose "Render raw unified diffs as semantic escaped lines" --reason "The new block kind needs an isolated deterministic rendering boundary" --expected "All unified-diff line categories render with stable classes and exact text" --verify "Run the focused GitDiffBlock test file" --rollback "Restore both files from the pre snapshot or delete the new files"
```

Step 6 resolves the latest pre-change snapshot for this session from the JSONL log.

- [ ] **Step 2: Write the failing classifier and rendering tests**

Create `tests/git-diff-block.test.tsx`:

```tsx
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  GitDiffBlock,
  classifyGitDiffLine,
} from "../packages/agent-session-replayer/src/GitDiffBlock";

describe("GitDiffBlock", () => {
  it.each([
    ["diff --git a/src/app.ts b/src/app.ts", "metadata"],
    ["index 1111111..2222222 100644", "metadata"],
    ["--- a/src/app.ts", "metadata"],
    ["+++ b/src/app.ts", "metadata"],
    ["@@ -1,2 +1,2 @@", "hunk"],
    ["+const enabled = true;", "addition"],
    ["-const enabled = false;", "removal"],
    ["\\ No newline at end of file", "metadata"],
    [" const stable = true;", "context"],
    ["", "context"],
  ] as const)("classifies %j as %s", (line, expected) => {
    expect(classifyGitDiffLine(line)).toBe(expected);
  });

  it("preserves exact text, whitespace, and trailing newline", () => {
    const content = "@@ -1 +1 @@\n-  old <script>\n+  new & safe\n";
    const { container } = render(<GitDiffBlock content={content} />);

    expect(container.querySelector("code")?.textContent).toBe(content);
    expect(container.querySelector("script")).not.toBeInTheDocument();
    expect(container.querySelectorAll(".asr-git-diff-line--hunk")).toHaveLength(1);
    expect(container.querySelectorAll(".asr-git-diff-line--removal")).toHaveLength(1);
    expect(container.querySelectorAll(".asr-git-diff-line--addition")).toHaveLength(1);
  });
});
```

- [ ] **Step 3: Run the focused test to verify it fails**

Run:

```bash
rtk bunx vitest run tests/git-diff-block.test.tsx
```

Expected: FAIL because `GitDiffBlock.tsx` does not exist.

- [ ] **Step 4: Implement the minimal classifier and renderer**

Create `packages/agent-session-replayer/src/GitDiffBlock.tsx`:

```tsx
import { Fragment } from "react";

export type GitDiffLineKind =
  | "metadata"
  | "hunk"
  | "addition"
  | "removal"
  | "context";

const METADATA_PREFIXES = [
  "diff --git ",
  "index ",
  "new file mode ",
  "deleted file mode ",
  "similarity index ",
  "rename from ",
  "rename to ",
  "--- ",
  "+++ ",
  "\\ No newline at end of file",
] as const;

export function classifyGitDiffLine(line: string): GitDiffLineKind {
  if (METADATA_PREFIXES.some((prefix) => line.startsWith(prefix))) return "metadata";
  if (line.startsWith("@@")) return "hunk";
  if (line.startsWith("+")) return "addition";
  if (line.startsWith("-")) return "removal";
  return "context";
}

export function GitDiffBlock({ content }: { content: string }) {
  const lines = content.split("\n");

  return <pre className="asr-git-diff"><code>{lines.map((line, index) => {
      const kind = classifyGitDiffLine(line);
      return <Fragment key={index}>
        <span className={`asr-git-diff-line asr-git-diff-line--${kind}`}>{line}</span>
        {index < lines.length - 1 ? "\n" : null}
      </Fragment>;
    })}</code></pre>;
}
```

- [ ] **Step 5: Run the focused test to verify it passes**

Run:

```bash
rtk bunx vitest run tests/git-diff-block.test.tsx
```

Expected: 11 tests pass: ten classifier cases plus the exact-text rendering test.

- [ ] **Step 6: Record the post-change Pony Trail snapshot and commit**

Run the post snapshot with the ID from Step 1:

```bash
rtk sh /Users/roy/.agents/skills/pony-trail/scripts/snapshot_change.sh --session-id agent-session-replayer-git-diff post --snapshot-id "$(rtk jq -r 'select(.session_id == "agent-session-replayer-git-diff" and .phase == "pre") | .snapshot_id' .getsuperpower/snapshots.jsonl | rtk tail -n 1)" --files tests/git-diff-block.test.tsx packages/agent-session-replayer/src/GitDiffBlock.tsx --summary "Added deterministic unified-diff classification and escaped line rendering" --checks "rtk bunx vitest run tests/git-diff-block.test.tsx" --result pass
rtk git add tests/git-diff-block.test.tsx packages/agent-session-replayer/src/GitDiffBlock.tsx
rtk git commit -m "feat: render semantic git diff lines"
```

### Task 2: Integrate the public `git_diff` block kind

**Files:**
- Modify: `packages/agent-session-replayer/src/types.ts:3`
- Modify: `packages/agent-session-replayer/src/AgentSessionReplayer.tsx:9-15,76-83`
- Modify: `tests/package-api.test.tsx:4-9`

- [ ] **Step 1: Record the pre-change Pony Trail snapshot**

Run:

```bash
rtk sh /Users/roy/.agents/skills/pony-trail/scripts/snapshot_change.sh --session-id agent-session-replayer-git-diff pre --files packages/agent-session-replayer/src/types.ts packages/agent-session-replayer/src/AgentSessionReplayer.tsx tests/package-api.test.tsx --action "integrate public git_diff block kind" --purpose "Expose and route Git diff blocks through the replayer API" --reason "The renderer must be reachable from consumer session data without changing patch blocks" --expected "AgentSessionBlock accepts git_diff and the replayer renders GitDiffBlock" --verify "Run package API tests and typecheck" --rollback "Restore the three files from the pre snapshot"
```

- [ ] **Step 2: Write the failing public integration test**

Add `AgentSessionBlock` to the type imports in `tests/package-api.test.tsx`, then add this test inside `describe("published component API", ...)`:

```tsx
it("accepts and renders a git_diff block through the public API", () => {
  vi.useFakeTimers();
  const block: AgentSessionBlock = {
    id: "diff-block",
    kind: "git_diff",
    title: "src/app.ts",
    content: "--- a/src/app.ts\n+++ b/src/app.ts\n@@ -1 +1 @@\n-old\n+new",
  };
  const diffCases: AgentSession[] = [{
    ...cases[0]!,
    events: [{ ...cases[0]!.events[0]!, blocks: [block] }],
  }];

  const { container } = render(
    <AgentSessionReplayer agents={agents} cases={diffCases} typingSpeed={1000} />,
  );
  act(() => vi.advanceTimersByTime(250));

  expect(container.querySelector(".asr-chat-block--git_diff")).toBeInTheDocument();
  expect(container.querySelectorAll(".asr-git-diff-line--metadata")).toHaveLength(2);
  expect(container.querySelector(".asr-git-diff-line--hunk")).toHaveTextContent("@@ -1 +1 @@");
  expect(container.querySelector(".asr-git-diff-line--addition")).toHaveTextContent("+new");
  expect(container.querySelector(".asr-git-diff-line--removal")).toHaveTextContent("-old");
});

it.each([
  ["message", "p"],
  ["code", "pre"],
  ["patch", "pre"],
  ["tool_output", "pre"],
] as const)("keeps %s blocks on their existing renderer", (kind, expectedTag) => {
  vi.useFakeTimers();
  const block: AgentSessionBlock = { id: `${kind}-block`, kind, content: `${kind} content` };
  const blockCases: AgentSession[] = [{
    ...cases[0]!,
    events: [{ ...cases[0]!.events[0]!, blocks: [block] }],
  }];

  const { container } = render(
    <AgentSessionReplayer agents={agents} cases={blockCases} typingSpeed={1000} />,
  );
  act(() => vi.advanceTimersByTime(250));

  expect(container.querySelector(`.asr-chat-block--${kind} > ${expectedTag}`)).toHaveTextContent(`${kind} content`);
});
```

- [ ] **Step 3: Run the focused integration test to verify it fails**

Run:

```bash
rtk bunx vitest run tests/package-api.test.tsx -t "accepts and renders a git_diff block"
```

Expected: FAIL because `"git_diff"` is not assignable to `AgentBlockKind` and the generic block renderer does not emit semantic diff lines.

- [ ] **Step 4: Add the public literal and route it to the renderer**

In `packages/agent-session-replayer/src/types.ts`, change the union to:

```ts
export type AgentBlockKind = "message" | "code" | "tool_call" | "tool_output" | "finding" | "patch" | "git_diff" | "status" | "result";
```

In `packages/agent-session-replayer/src/AgentSessionReplayer.tsx`, import the renderer:

```tsx
import { GitDiffBlock } from "./GitDiffBlock";
```

Then replace `Block` with:

```tsx
function Block({ block }: { block: AgentSessionBlock }) {
  const codeLike = block.kind === "code" || block.kind === "patch" || block.kind === "tool_output";
  return <section className={`asr-chat-block asr-chat-block--${block.kind}`}>
    {block.title && <header><span>{block.kind.replace("_", " ")}</span>{block.title}</header>}
    {block.kind === "git_diff"
      ? <GitDiffBlock content={block.content} />
      : codeLike
        ? <pre><code>{block.content}</code></pre>
        : <p>{block.content}</p>}
  </section>;
}
```

- [ ] **Step 5: Run focused tests and typecheck**

Run:

```bash
rtk bunx vitest run tests/git-diff-block.test.tsx tests/package-api.test.tsx
rtk bun run typecheck
```

Expected: focused tests pass and typecheck exits 0. Existing message, code, patch, and tool-output tests remain unchanged.

- [ ] **Step 6: Record the post snapshot and commit**

```bash
rtk sh /Users/roy/.agents/skills/pony-trail/scripts/snapshot_change.sh --session-id agent-session-replayer-git-diff post --snapshot-id "$(rtk jq -r 'select(.session_id == "agent-session-replayer-git-diff" and .phase == "pre") | .snapshot_id' .getsuperpower/snapshots.jsonl | rtk tail -n 1)" --files packages/agent-session-replayer/src/types.ts packages/agent-session-replayer/src/AgentSessionReplayer.tsx tests/package-api.test.tsx --summary "Added the public git_diff literal and routed it through GitDiffBlock" --checks "Focused Vitest files and typecheck" --result pass
rtk git add packages/agent-session-replayer/src/types.ts packages/agent-session-replayer/src/AgentSessionReplayer.tsx tests/package-api.test.tsx
rtk git commit -m "feat: support git diff chat blocks"
```

### Task 3: Add scan-friendly, responsive diff styling

**Files:**
- Modify: `tests/package-css.test.ts`
- Modify: `packages/agent-session-replayer/src/styles.css:78-89`

- [ ] **Step 1: Record the pre-change Pony Trail snapshot**

```bash
rtk sh /Users/roy/.agents/skills/pony-trail/scripts/snapshot_change.sh --session-id agent-session-replayer-git-diff pre --files tests/package-css.test.ts packages/agent-session-replayer/src/styles.css --action "style semantic Git diff lines" --purpose "Make additions, removals, hunks, metadata, and context easy to scan" --reason "Unified diffs need non-wrapping overflow and more than color alone" --expected "Compiled package CSS provides semantic colors, tints, and horizontal scrolling" --verify "Build the package and run package CSS tests" --rollback "Restore the CSS and CSS test from the pre snapshot"
```

- [ ] **Step 2: Write the failing compiled-CSS test**

Add this test to `tests/package-css.test.ts`:

```ts
it("styles Git diff lines semantically without wrapping", () => {
  const diffRule = css.match(/\.asr-git-diff\{([^}]*)\}/)?.[1];
  expect(diffRule).toContain("overflow-x:auto");
  expect(diffRule).toContain("white-space:pre");
  expect(diffRule).toContain("overflow-wrap:normal");
  expect(css).toMatch(/\.asr-git-diff-line\{[^}]*display:block[^}]*width:max-content[^}]*min-width:100%/);
  expect(css).toMatch(/\.asr-git-diff-line--addition\{[^}]*color:[^;}]+[^}]*background:/);
  expect(css).toMatch(/\.asr-git-diff-line--removal\{[^}]*color:[^;}]+[^}]*background:/);
  expect(css).toMatch(/\.asr-git-diff-line--hunk\{[^}]*color:[^;}]+[^}]*background:/);
  expect(css).toMatch(/\.asr-git-diff-line--metadata\{[^}]*color:/);
});
```

- [ ] **Step 3: Build and run the test to verify it fails**

Run:

```bash
rtk bun run build:package
rtk bunx vitest run tests/package-css.test.ts -t "styles Git diff lines"
```

Expected: FAIL because `.asr-git-diff` and semantic line rules are absent.

- [ ] **Step 4: Add namespaced Git diff styles**

After the existing chat block rules in `packages/agent-session-replayer/src/styles.css`, add:

```css
  [data-agent-session-replayer] .asr-chat-block--git_diff { background:#0b1015;border-color:#263746 }
  [data-agent-session-replayer] .asr-git-diff { overflow-x:auto;overflow-y:hidden;white-space:pre;overflow-wrap:normal }
  [data-agent-session-replayer] .asr-git-diff-line { display:block;width:max-content;min-width:100%;padding:0 4px }
  [data-agent-session-replayer] .asr-git-diff-line--metadata { color:#8b93a1 }
  [data-agent-session-replayer] .asr-git-diff-line--hunk { color:#9ac8ff;background:#132235 }
  [data-agent-session-replayer] .asr-git-diff-line--addition { color:#86d9a5;background:#12301e }
  [data-agent-session-replayer] .asr-git-diff-line--removal { color:#ff9b97;background:#381719 }
```

The visible `+`, `-`, `@@`, `---`, and `+++` prefixes remain in text, so the meaning does not rely on color alone.

- [ ] **Step 5: Rebuild and verify the focused CSS test passes**

Run:

```bash
rtk bun run build:package
rtk bunx vitest run tests/package-css.test.ts
```

Expected: all compiled package CSS tests pass.

- [ ] **Step 6: Record the post snapshot and commit**

```bash
rtk sh /Users/roy/.agents/skills/pony-trail/scripts/snapshot_change.sh --session-id agent-session-replayer-git-diff post --snapshot-id "$(rtk jq -r 'select(.session_id == "agent-session-replayer-git-diff" and .phase == "pre") | .snapshot_id' .getsuperpower/snapshots.jsonl | rtk tail -n 1)" --files tests/package-css.test.ts packages/agent-session-replayer/src/styles.css --summary "Added non-wrapping overflow and semantic Git diff line treatment" --checks "Package build and package CSS tests" --result pass
rtk git add tests/package-css.test.ts packages/agent-session-replayer/src/styles.css
rtk git commit -m "style: distinguish git diff lines"
```

### Task 4: Exercise the feature in the demo and complete verification

**Files:**
- Modify: `src/workflow.ts:4`
- Modify: `src/data/demo.json:44-47`
- Modify: `tests/app.test.tsx`

- [ ] **Step 1: Record the pre-change Pony Trail snapshot**

```bash
rtk sh /Users/roy/.agents/skills/pony-trail/scripts/snapshot_change.sh --session-id agent-session-replayer-git-diff pre --files src/workflow.ts src/data/demo.json tests/app.test.tsx --action "showcase Git diff block in demo" --purpose "Exercise git_diff through validated application data and browser rendering" --reason "The shipped demo needs a representative standard unified diff for live verification" --expected "Demo schema accepts git_diff and one revision event displays a multi-line diff" --verify "Run app tests, full suite, typecheck, build, and browser smoke checks" --rollback "Restore the schema, demo fixture, and app test from the pre snapshot"
```

- [ ] **Step 2: Add a failing demo assertion**

Add this focused test inside `describe("case autoplay experience", ...)` in `tests/app.test.tsx`:

```tsx
it("renders the demo Git diff with semantic lines", () => {
  vi.useFakeTimers();
  const { container } = render(<App />);

  for (let index = 0; index < 5000 && !container.querySelector(".asr-chat-block--git_diff"); index += 1) {
    act(() => vi.runOnlyPendingTimers());
  }

  expect(container.querySelector(".asr-chat-block--git_diff")).toBeInTheDocument();
  expect(container.querySelector(".asr-git-diff-line--addition")).toHaveTextContent("+  refreshes.delete(id);");
  expect(container.querySelector(".asr-git-diff-line--removal")).toHaveTextContent("-refreshes.delete(id);");
});
```

- [ ] **Step 3: Run the app test to verify it fails**

Run:

```bash
rtk bunx vitest run tests/app.test.tsx
```

Expected: FAIL because the demo has no `git_diff` block.

- [ ] **Step 4: Extend the demo schema and replace one demo patch fixture**

In `src/workflow.ts`, add `"git_diff"` to `blockKinds`:

```ts
const blockKinds = ["message", "code", "tool_call", "tool_output", "finding", "patch", "git_diff", "status", "result"] as const;
```

In the `Revision applied` event in `src/data/demo.json`, replace the existing patch block with this standard unified diff string:

```json
{
  "kind": "git_diff",
  "title": "src/auth/session.ts",
  "content": "diff --git a/src/auth/session.ts b/src/auth/session.ts\nindex 4c52a11..9fd8210 100644\n--- a/src/auth/session.ts\n+++ b/src/auth/session.ts\n@@ -1,3 +1,5 @@\n-const session = await refresh;\n-refreshes.delete(id);\n-return session;\n+try {\n+  return await refresh;\n+} finally {\n+  refreshes.delete(id);\n+}"
}
```

- [ ] **Step 5: Run the app test and all automated verification**

Run:

```bash
rtk bunx vitest run tests/app.test.tsx
rtk bun run typecheck
rtk bunx vitest run --passWithNoTests
rtk bun run build
rtk git diff --check
```

Expected: app test passes, all tests pass, typecheck and build exit 0, and `git diff --check` reports no whitespace errors.

- [ ] **Step 6: Verify the representative diff in a browser**

Run:

```bash
rtk bun run dev -- --host 127.0.0.1
```

Use the in-app browser to inspect the `Revision applied` event at desktop and approximately 390px mobile width. Confirm:

- metadata, hunk, addition, and removal lines have distinct treatment;
- `---` and `+++` use metadata treatment;
- long lines scroll horizontally without wrapping or widening the replayer;
- typing, completed-event collapse, and navigation remain functional;
- no browser console errors or warnings appear.

- [ ] **Step 7: Record the post snapshot and commit**

```bash
rtk sh /Users/roy/.agents/skills/pony-trail/scripts/snapshot_change.sh --session-id agent-session-replayer-git-diff post --snapshot-id "$(rtk jq -r 'select(.session_id == "agent-session-replayer-git-diff" and .phase == "pre") | .snapshot_id' .getsuperpower/snapshots.jsonl | rtk tail -n 1)" --files src/workflow.ts src/data/demo.json tests/app.test.tsx --summary "Added git_diff to validated demo data and showcased a representative unified diff" --checks "App test, typecheck, full Vitest suite, production build, diff check, and browser smoke verification" --result pass
rtk git add src/workflow.ts src/data/demo.json tests/app.test.tsx
rtk git commit -m "demo: showcase git diff chat block"
```

## Final Acceptance Checklist

- [ ] `AgentBlockKind` publicly accepts `"git_diff"`.
- [ ] Existing `"patch"` behavior remains unchanged.
- [ ] File markers are metadata, not additions or removals.
- [ ] Metadata, hunks, additions, removals, and context receive stable semantic classes.
- [ ] React escapes content and preserves exact whitespace and trailing newlines.
- [ ] Diff lines never wrap and the block scrolls horizontally within mobile bounds.
- [ ] No syntax-highlighting or diff-parsing dependency is added.
- [ ] Typing, collapse, reduced-motion, navigation, and existing block regressions pass.
- [ ] Typecheck, full tests, production build, and browser console checks pass.

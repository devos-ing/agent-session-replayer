# Bun-Native Project Setup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Bun the explicit package manager and documented development runtime without changing application behavior.

**Architecture:** Add package-manager metadata to the existing root manifest and document the already-supported Bun workspace commands in the package README. A small repository-contract test will guard the metadata, lockfile, and command documentation; no runtime source or dependency graph changes are needed.

**Tech Stack:** Bun 1.3.8, Bun workspaces, JSON, Markdown, Vitest

---

## File Structure

- Create `tests/bun-project.test.ts`: assert the Bun package-manager contract and documented commands.
- Modify `package.json`: declare Bun 1.3.8 as the package manager.
- Modify `packages/agent-session-replayer/README.md`: document Bun installation and development commands.
- Preserve `bun.lock`; do not create npm, Yarn, or pnpm lockfiles.

### Task 1: Add the Bun project contract

**Files:**
- Create: `tests/bun-project.test.ts`
- Modify: `package.json`
- Modify: `packages/agent-session-replayer/README.md`

- [ ] **Step 1: Record the pre-change Pony Trail snapshot**

```bash
rtk sh /Users/roy/.agents/skills/pony-trail/scripts/snapshot_change.sh --session-id bun-migration pre --files tests/bun-project.test.ts package.json packages/agent-session-replayer/README.md --action "add Bun project contract" --purpose "Declare Bun as the canonical package manager and document the supported workflow" --reason "The repository already uses bun.lock and Bun scripts but does not state that contract in metadata or README" --expected "Metadata, docs, and tests agree on Bun 1.3.8" --verify "Run the focused Bun contract test" --rollback "Restore the three files from this pre snapshot"
```

- [ ] **Step 2: Write the failing repository-contract test**

Create `tests/bun-project.test.ts`:

```ts
import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const packageJson = JSON.parse(readFileSync(`${root}/package.json`, "utf8")) as {
  packageManager?: string;
};
const readme = readFileSync(`${root}/packages/agent-session-replayer/README.md`, "utf8");

describe("Bun project contract", () => {
  it("declares Bun and keeps bun.lock as the lockfile", () => {
    expect(packageJson.packageManager).toBe("bun@1.3.8");
    expect(existsSync(`${root}/bun.lock`)).toBe(true);
    expect(existsSync(`${root}/package-lock.json`)).toBe(false);
    expect(existsSync(`${root}/yarn.lock`)).toBe(false);
    expect(existsSync(`${root}/pnpm-lock.yaml`)).toBe(false);
  });

  it("documents the Bun workflow", () => {
    expect(readme).toContain("bun install");
    expect(readme).toContain("bun run dev");
    expect(readme).toContain("bun run test");
    expect(readme).toContain("bun run typecheck");
    expect(readme).toContain("bun run build");
    expect(readme).toContain("bun run build:package");
  });
});
```

- [ ] **Step 3: Run the focused test to verify it fails**

Run:

```bash
rtk bunx vitest run tests/bun-project.test.ts
```

Expected: FAIL because `package.json` lacks `packageManager` and the README lacks the Bun workflow section.

- [ ] **Step 4: Add Bun metadata and documentation**

In the root `package.json`, add the top-level field after `"type": "module"`:

```json
"packageManager": "bun@1.3.8",
```

At the end of `packages/agent-session-replayer/README.md`, add:

```md
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
```

Do not add alternate npm, Yarn, or pnpm commands, and do not change dependencies or runtime source.

- [ ] **Step 5: Run the focused test to verify it passes**

Run:

```bash
rtk bunx vitest run tests/bun-project.test.ts
```

Expected: 2 tests pass.

- [ ] **Step 6: Record the post-change snapshot**

```bash
rtk sh /Users/roy/.agents/skills/pony-trail/scripts/snapshot_change.sh --session-id bun-migration post --snapshot-id "$(rtk jq -r 'select(.session_id == "bun-migration" and .phase == "pre") | .snapshot_id' .getsuperpower/snapshots.jsonl | rtk tail -n 1)" --files tests/bun-project.test.ts package.json packages/agent-session-replayer/README.md --summary "Declared Bun 1.3.8 and documented the Bun workspace workflow" --checks "Focused Bun contract test: 2 passed" --result pass
```

### Task 2: Verify the lockfile and complete the migration gate

**Files:**
- Verify only: `bun.lock`, `package.json`, `packages/agent-session-replayer/README.md`

- [ ] **Step 1: Verify the frozen Bun install**

Run:

```bash
rtk bun install --frozen-lockfile
```

Expected: Bun accepts the existing lockfile without dependency or lockfile drift.

- [ ] **Step 2: Run the complete verification suite**

Run:

```bash
rtk bun run test
rtk bun run typecheck
rtk bun run build
rtk git diff --check
```

Expected: all tests pass, typecheck exits 0, the package and Vite production builds exit 0, and `git diff --check` reports no whitespace errors.

- [ ] **Step 3: Confirm no alternate package-manager artifacts**

Run:

```bash
rtk rg --files -g 'package-lock.json' -g 'yarn.lock' -g 'pnpm-lock.yaml'
```

Expected: no files are returned.

## Acceptance Checklist

- [ ] Root `package.json` declares `packageManager: "bun@1.3.8"`.
- [ ] `bun.lock` remains the only lockfile.
- [ ] README documents install, dev, test, typecheck, app build, and package build commands using Bun.
- [ ] No dependencies or runtime source changed.
- [ ] Frozen install, tests, typecheck, build, and diff check pass.

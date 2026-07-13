# Package Release Workflow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publish `agent-session-replayer` to npm with provenance when a `v*` tag is pushed.

**Architecture:** A single GitHub Actions workflow owns the tag-to-npm release boundary. A Vitest contract test protects the workflow's trigger, least-privilege permissions, locked validation ladder, package target, and OIDC provenance publish command from accidental regression.

**Tech Stack:** GitHub Actions, Bun 1.3.8, Node 22/npm trusted publishing, Vitest.

---

## File structure

- Create `.github/workflows/release.yml`: checks out an immutable tag, runs the existing Bun checks, and publishes the package with npm OIDC provenance.
- Create `tests/release-workflow.test.ts`: asserts the release workflow maintains its approved security and execution contract.

### Task 1: Release workflow contract test

**Files:**
- Create: `tests/release-workflow.test.ts`

- [ ] **Step 1: Add the initially failing workflow contract test**

```ts
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const workflow = readFileSync(`${process.cwd()}/.github/workflows/release.yml`, "utf8");

describe("package release workflow", () => {
  it("releases version tags through npm OIDC after the repository checks", () => {
    expect(workflow).toMatch(/on:\s*\n\s+push:\s*\n\s+tags:\s*\n\s+- ['\"]v\*['\"]/);
    expect(workflow).toMatch(/permissions:\s*\n\s+contents: read\s*\n\s+id-token: write/);
    expect(workflow).toContain("bun install --frozen-lockfile");
    expect(workflow).toContain("bun run typecheck");
    expect(workflow).toContain("bun run test");
    expect(workflow).toContain("bun run build");
    expect(workflow).toContain("bun run pack:package");
    expect(workflow).toContain("npm publish ./packages/agent-session-replayer --access public --provenance");
    expect(workflow).not.toContain("NPM_TOKEN");
  });
});
```

- [ ] **Step 2: Run the focused test and confirm it fails because the workflow is absent**

Run: `rtk bunx vitest run tests/release-workflow.test.ts`

Expected: failure from reading the missing `.github/workflows/release.yml` file.

### Task 2: Tag-triggered OIDC release action

**Files:**
- Create: `.github/workflows/release.yml`

- [ ] **Step 1: Create the workflow with the approved release contract**

```yaml
name: Release package

on:
  push:
    tags:
      - "v*"

permissions:
  contents: read
  id-token: write

concurrency:
  group: release-${{ github.ref }}
  cancel-in-progress: false

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: oven-sh/setup-bun@v2
        with:
          bun-version: "1.3.8"

      - uses: actions/setup-node@v4
        with:
          node-version: "22"
          registry-url: "https://registry.npmjs.org"

      - run: bun install --frozen-lockfile
      - run: bun run typecheck
      - run: bun run test
      - run: bun run build
      - run: bun run pack:package
      - run: npm publish ./packages/agent-session-replayer --access public --provenance
```

- [ ] **Step 2: Run the focused contract test**

Run: `rtk bunx vitest run tests/release-workflow.test.ts`

Expected: one passing test that confirms the release trigger, OIDC permissions, validation ladder, publish command, and absence of `NPM_TOKEN`.

### Task 3: Regression and artifact verification

**Files:**
- Modify: `.github/workflows/release.yml`
- Modify: `tests/release-workflow.test.ts`

- [ ] **Step 1: Run the complete repository validation ladder**

Run: `rtk bun run typecheck`

Expected: exit code 0.

Run: `rtk bun run test`

Expected: all test files pass, including `tests/release-workflow.test.ts`.

Run: `rtk bun run build`

Expected: package build, `tsc -b`, and Vite production build complete successfully.

Run: `rtk bun run pack:package`

Expected: `packages/agent-session-replayer/artifacts/agent-session-replayer-0.1.0.tgz` is created.

- [ ] **Step 2: Inspect release safety and changed files**

Run: `rtk git diff --check -- .github/workflows/release.yml tests/release-workflow.test.ts`

Expected: no whitespace errors.

Run: `rtk git status --short`

Expected: only the workflow, its contract test, and the already-approved release design/plan documents are changed; generated package artifacts remain ignored.

- [ ] **Step 3: Commit the release workflow change when explicitly authorized**

```bash
git add .github/workflows/release.yml tests/release-workflow.test.ts docs/superpowers/specs/2026-07-13-package-release-design.md docs/superpowers/plans/2026-07-13-package-release.md
git commit -m "ci: add OIDC package release workflow"
```

Expected: a single focused commit. Do not create a tag or publish from the local machine; npm trusted publishing occurs only after the committed version tag is pushed and npm has been configured to trust this workflow.

# Agent Session Replayer Rename Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Hard-rename the project and its public React package from Claude Code Simulator / Agent Demo Player to Agent Session Replayer.

**Architecture:** Preserve runtime behavior while changing the workspace package name, package directory, public component and type identifiers, source filename, DOM styling namespace, documentation examples, and consumer tests as one atomic API rename. Do not retain deprecated aliases because the package is unpublished at version 0.1.0 and its README explicitly marks the current name as temporary.

**Tech Stack:** React 19, TypeScript, Bun workspaces, tsup, Tailwind CSS, Vite, Vitest

---

### Task 1: Rename the public package and API

**Files:**
- Move: `packages/agent-demo-player/` to `packages/agent-session-replayer/`
- Move: `packages/agent-session-replayer/src/AgentDemoPlayer.tsx` to `packages/agent-session-replayer/src/AgentSessionReplayer.tsx`
- Modify: `package.json`
- Modify: `packages/agent-session-replayer/package.json`
- Modify: `packages/agent-session-replayer/src/index.ts`
- Modify: `packages/agent-session-replayer/src/types.ts`
- Modify: `packages/agent-session-replayer/src/playback.ts`
- Modify: `packages/agent-session-replayer/src/AgentSessionReplayer.tsx`
- Modify: `packages/agent-session-replayer/src/styles.css`

- [ ] **Step 1: Rename the package directory and component source file**

Move the package to `packages/agent-session-replayer` and the component source to `AgentSessionReplayer.tsx`.

- [ ] **Step 2: Rename the public identifiers**

Use `agent-session-replayer`, `AgentSessionReplayer`, `AgentSession`, `AgentSessionReplayerProps`, `data-agent-session-replayer`, the `asr-` class prefix, and `--asr-` custom properties consistently. Update validation messages to name `AgentSessionReplayer`.

- [ ] **Step 3: Update workspace metadata**

Set the root package name and dependency to `agent-session-replayer`, update the package build scripts to the renamed directory, and describe the package as an embeddable scripted agent session replayer for React.

### Task 2: Update consumers, documentation, and API tests

**Files:**
- Modify: `src/App.tsx`
- Modify: `packages/agent-session-replayer/README.md`
- Modify: `tests/package-api.test.tsx`
- Modify: `tests/package-css.test.ts`
- Modify: `tests/app.test.tsx`
- Modify: `index.html`
- Generate: `bun.lock`

- [ ] **Step 1: Update the demo consumer**

Import `AgentSessionReplayer`, `AgentSession`, and `AgentSessionReplayerProps` from `agent-session-replayer`, including its stylesheet export.

- [ ] **Step 2: Update public documentation and browser metadata**

Use “Agent Session Replayer” as the project title and `agent-session-replayer` in installation/import examples. Explain that it deterministically replays scripted agent sessions without live model execution.

- [ ] **Step 3: Update API and CSS assertions**

Assert the new export names, package paths, data attribute, `asr-` selectors, and `--asr-` variables. Remove assertions for the old names.

- [ ] **Step 4: Refresh the workspace lockfile**

Run `rtk bun install --lockfile-only` and expect `bun.lock` to resolve `agent-session-replayer` as the workspace dependency.

### Task 3: Verify the hard rename

**Files:**
- Verify: all project files outside `.git/`, `.getsuperpower/`, build output, and historical plans/specifications

- [ ] **Step 1: Check for stale active identifiers**

Run a literal search excluding audit history and historical design documents. Expect no active matches for `claude-code-simulator`, `agent-demo-player`, `AgentDemoPlayer`, `AgentDemoCase`, `AgentDemoPlayerProps`, `data-agent-demo-player`, `adp-`, or `--adp-`.

- [ ] **Step 2: Run static verification**

Run `rtk bun run typecheck`. Expected: exit code 0.

- [ ] **Step 3: Run tests**

Run `rtk bun test`. Expected: all tests pass.

- [ ] **Step 4: Build and pack the renamed project**

Run `rtk bun run build` and `rtk bun run pack:package`. Expected: both exit with code 0 and the package artifact is named from `agent-session-replayer`.

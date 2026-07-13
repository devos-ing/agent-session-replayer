@/Users/roy/.codex/RTK.md

# Project guidance

## Product truth

Agent Session Replayer is an embeddable, SSR-safe React component that replays fixed implementer/reviewer sessions. It renders supplied data; it does not run a model, invoke tools, execute code, or inspect a repository. Keep that distinction explicit in UI copy, examples, and documentation.

## Repository boundaries

- `packages/agent-session-replayer/` is the public package. Its React API, runtime validation, playback reducer, scoped `asr-` CSS, and precompiled stylesheet must remain usable independently of the demo.
- `src/` is the local Vite demo and fixture adapter. It may consume the workspace package, but package code must not depend on demo files or demo data.
- `tests/` covers the public package contract, playback, validation, compiled CSS, SSR/rendering behavior, and demo integration.
- `docs/superpowers/` contains historical design specs and implementation plans. Read the relevant document before changing an established behavior.
- `design.md` is the current product/UI design contract. UI changes should update it when they intentionally change that contract.

## Commands

This is a Bun workspace. Run repository commands through RTK:

```bash
rtk bun install
rtk bun run dev
rtk bun run typecheck
rtk bun run test
rtk bun run build:package
rtk bun run build
rtk bun run pack:package
```

The root scripts exercise the demo workspace. `build:package` builds the distributable package under `packages/agent-session-replayer/dist`; consumers import its precompiled `styles.css` and do not need Tailwind CSS.

## Implementation constraints

- Preserve the deterministic scripted-replay model. Do not add hidden live execution or copy that implies the replay is a live agent run.
- Treat exported types, component props, package exports, the `data-agent-session-replayer` root, `asr-` classes, CSS variables, lifecycle callbacks, and the stylesheet export as public contracts.
- Keep runtime validation fail-fast and strict: reject unknown keys, empty required strings, invalid numeric bounds, unavailable case indexes, and duplicate IDs at their documented scopes.
- Keep initial render and server render deterministic. Access `window`, media queries, timers, scrolling, and Web Animations only in effects or guarded browser-only paths.
- Preserve labeled controls, semantic event articles, the polite live region, visible focus treatment, minimum 44px control targets, and meaningful titles and summaries.
- Honor `prefers-reduced-motion`: complete typing and collapse without animation and avoid smooth scrolling. Preserve the CSS fallbacks for reduced motion, reduced transparency, and increased contrast.
- Keep package styles scoped beneath `[data-agent-session-replayer]`. Theme changes should flow through the documented `--asr-*` variables or `colors` prop.
- Maintain the attribution link and the in-frame disclosure that playback is scripted and no live model is running.

## Structural exploration

Use CodeGraph before filesystem search for symbol definitions, callers, callees, impact, and focused architecture context. Start architecture or behavior tracing with `codegraph_context`, then use a single `codegraph_explore` call when broader source context is needed. Use `rg` for literal strings, comments, CSS values, and known-file follow-up only. If `.codegraph/` is absent, ask before running `codegraph init -i`.

## Working agreement

- Inspect `rtk git status --short` before editing. The worktree may contain user changes; never discard, rewrite, stage, or commit unrelated files.
- Make the smallest change that satisfies the approved scope. Do not stage, commit, push, or create a PR unless explicitly requested.
- Use `apply_patch` for hand-written file edits. Snapshot every mutation with Ponytrail when that workflow is active.
- For documentation-only changes, inspect the rendered source, check links and commands, run `rtk git diff --check -- <paths>`, and verify the changed-file list.
- For implementation changes, run focused tests while iterating, then fresh `rtk bun run typecheck` and `rtk bun run test`. Run `rtk bun run build` when package output, CSS, exports, or demo integration changes; run `rtk bun run pack:package` when the published artifact changes.


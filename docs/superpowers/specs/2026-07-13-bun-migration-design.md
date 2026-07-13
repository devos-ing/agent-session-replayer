# Bun-Native Project Setup

## Goal

Make Bun the explicit package manager and documented development runtime for Agent Session Replayer without changing application or package behavior.

## Changes

- Add `"packageManager": "bun@1.3.8"` to the root `package.json`, matching the verified local Bun runtime.
- Keep the existing `bun.lock` as the sole lockfile and preserve the current workspace scripts.
- Add README instructions for Bun installation, dependency installation, development, testing, typechecking, production build, and package build.
- Do not add npm, Yarn, or pnpm lockfiles, shims, or alternate scripts.

## Verification

Run `bun install --frozen-lockfile`, `bun run test`, `bun run typecheck`, and `bun run build`. `bun run test` preserves the repository's Vitest + jsdom test harness while executing it through Bun. Confirm the package manager metadata, lockfile, and documentation agree.

## Non-Goals

- No dependency upgrades.
- No runtime code changes.
- No changes to the public React API or generated package output beyond what the existing build produces.

# Package Release Workflow Design

## Goal

Publish the public `agent-session-replayer` npm package from an immutable version tag without storing an npm access token in GitHub.

## Trigger and scope

- The workflow runs when a tag matching `v*` is pushed.
- It publishes the package in `packages/agent-session-replayer/` only.
- The tag must be created after the package version is updated; the workflow does not change version files, create tags, commits, or GitHub Releases.

## Workflow contract

1. Check out the tag's exact commit.
2. Install Bun 1.3.8 and dependencies with `bun install --frozen-lockfile`.
3. Run the repository validation ladder: typecheck, test, root production build, and package tarball build.
4. Publish `packages/agent-session-replayer/` to npm as a public package with provenance enabled.

The workflow uses a concurrency group tied to the tag ref so a tag cannot publish concurrently with itself.

## Authentication and permissions

The job grants only `contents: read` and `id-token: write`. npm trusted publishing exchanges the GitHub Actions OIDC identity for a short-lived publish credential. No `NPM_TOKEN` is stored or read.

Before the first release, npm must be configured to trust this repository and the workflow file path for `agent-session-replayer`. A failed trust-policy check must fail the publish rather than fall back to a token.

## Failure handling and non-goals

- Any validation or publishing failure stops the job before a release is created.
- Existing npm versions are not overwritten; npm's immutable-version failure is surfaced directly.
- The workflow does not automatically create a GitHub Release, publish the demo, alter package metadata, or run on ordinary branch pushes.

## Verification

The workflow file will be checked for valid YAML and the intended trigger, minimal permissions, locked installation, validation commands, package working directory, and `npm publish --provenance --access public` command. The existing local typecheck, test, build, and package commands remain the behavioral checks.

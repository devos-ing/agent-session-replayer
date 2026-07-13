# Git Diff Chat Blocks

## Goal

Allow Agent Session Replayer consumers to include standard unified Git diffs in chat events. The component should preserve the source text exactly while making file metadata, hunk headers, additions, removals, and context lines easy to scan.

## Public Data Contract

Add `"git_diff"` to `AgentBlockKind`. A Git diff block uses the existing block shape:

```ts
{
  id: string;
  kind: "git_diff";
  title?: string;
  content: string;
}
```

`content` contains raw unified diff text. Callers do not pre-parse it or provide line metadata. The existing `title` remains optional and uses the standard chat-block header when present.

This is a new block kind rather than a reinterpretation of `"patch"`. Existing patch rendering and consumer data therefore remain compatible.

## Rendering

Route `git_diff` blocks to a focused `GitDiffBlock` renderer. Split `content` on line boundaries and render every line inside a semantic `<pre><code>` region. Preserve indentation, empty lines, and the original line order. React text rendering provides escaping, so diff content is never interpreted as HTML.

Classify each line in this order:

1. `diff --git`, `index`, `new file mode`, `deleted file mode`, `similarity index`, `rename from`, and `rename to` are file metadata.
2. `--- ` and `+++ ` are old/new file markers, not deletion or addition lines.
3. `@@` lines are hunk headers.
4. A line beginning with `+` is an addition.
5. A line beginning with `-` is a removal.
6. `\\ No newline at end of file` is metadata.
7. Everything else is context.

Give every rendered line a stable semantic class and include its leading diff marker in the selectable text. Do not add line numbers, copy controls, or file folding in this feature.

## Visual Treatment

Use the package's existing code typography and dark chat-block surface. Additions use green text with a restrained green tint; removals use red text with a restrained red tint; hunk headers use blue or cyan text with a subtle cool tint; metadata is muted. Context lines retain the normal code color.

The `<pre>` region scrolls horizontally when a line is wider than the chat column. Lines must not wrap, because wrapping would make a unified diff harder to read and could visually separate a marker from its content. The block remains bounded by the existing chat layout at mobile widths.

Color is not the only signal: the original `+`, `-`, `@@`, and metadata prefixes remain visible in the text. No syntax-highlighting dependency is added.

## Playback Behavior

Typing and reveal behavior remain unchanged. The full raw `content` string participates in the existing grapheme-count and reveal pipeline. During partial reveal, `GitDiffBlock` classifies the currently visible lines; a partially revealed line may change from context to its final classification as soon as its prefix becomes available.

Completed-event collapse and summary behavior remain unchanged. A Git diff block is ordinary event content and does not introduce a new playback phase or timer.

## Component Boundaries

- `types.ts` owns the new public block-kind literal.
- A focused Git diff renderer owns line splitting, classification, and accessible markup.
- `AgentSessionReplayer.tsx` routes the new kind without changing other block renderers.
- `styles.css` owns semantic line colors, backgrounds, whitespace preservation, and horizontal overflow.

The classifier should be a small deterministic function so classification can be tested independently from React rendering.

## Verification

Tests must prove:

- `git_diff` is accepted by the public TypeScript API.
- File headers `--- ` and `+++ ` are classified as metadata rather than removals or additions.
- Standard metadata, hunk, addition, removal, no-newline, and context lines receive the correct semantic classes.
- Diff content is rendered as text and preserves significant whitespace.
- Long lines use horizontal overflow without wrapping.
- Existing `message`, `code`, `patch`, and `tool_output` rendering remains unchanged.
- Typing, event completion, collapse, reduced-motion fallback, and navigation tests continue to pass.

Run the focused component and CSS tests, the full test suite, typecheck, and production build. Browser verification should inspect representative multi-file diff content at desktop and mobile widths and confirm a clean console.

## Non-Goals

- Parsing Git diffs into files or hunks for interaction.
- Line numbers, selection gutters, copy buttons, or per-file collapse controls.
- Inline word-level diff highlighting.
- Applying patches or validating whether a diff can be applied.
- Syntax highlighting the source language inside changed lines.
- Changing existing `patch` blocks.

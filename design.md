# Agent Session Replayer design system

This document records the product/UI system currently implemented by the embeddable package. It is a reference for preserving the existing experience, not a proposal for a redesign. The component at `packages/agent-session-replayer/src/AgentSessionReplayer.tsx` and the package stylesheet at `packages/agent-session-replayer/src/styles.css` are the executable sources of truth.

## Product principles

1. **A replay, not a simulation engine.** The interface presents a fixed, authored implementer/reviewer exchange. It must never imply that a model, tool, command, or repository operation is running live.
2. **A focused technical workbench.** Dark surfaces, restrained borders, compact monospace metadata, and stacked transcript blocks make the replay feel like a review workspace rather than a chat app.
3. **Readable state over decoration.** Actor, event phase, block kind, case progress, findings, patches, and diffs receive clear visual roles. Motion explains progression; it is not ornamental.
4. **Embeddable and scoped.** The player owns its frame and tokens below `[data-agent-session-replayer]`, accepts intentional color overrides, and does not depend on the demo application's global CSS.
5. **Accessible by default.** Semantic labels, keyboard focus, readable contrast, assistive status updates, reduced motion, and compact responsive layouts are part of the product contract.

## Landing page contract

The Vite demo is a React-developer landing page around the embeddable component. It explains and demonstrates the public package without becoming a dependency of package code. Its six-part hierarchy is stable:

1. The header names Agent Session Replayer and links to Demo, JSON Schema, React usage, and the approved GitHub repository.
2. The hero uses the single page-level heading “Replay agent sessions from JSON.” and states that the component renders supplied data without running a model, invoking tools, executing code, or inspecting a repository.
3. The interactive demo combines a package-ready JSON editor with a scripted preview. The editor accepts only replay content shaped as `{ agents, cases }`; timing, dimensions, themes, callbacks, and case controls remain demo-owned settings rather than editable data.
4. The JSON Schema section renders and copies the canonical Draft 2020-12 schema exported from `agent-session-replayer/schema`. Its disclosure explains that the runtime parser additionally enforces unique case IDs, event IDs within a case, and block IDs within an event.
5. React usage shows the Bun install command, root component import, precompiled stylesheet import, and minimal render contract. Consumers do not need Tailwind CSS.
6. The footer includes the exact attribution “Powered by the DevOS team,” a GitHub link, and another scripted-playback disclosure.

The JSON Schema section is also the detailed data-contract guide. It keeps the raw schema first, then provides an in-page task-first reference: Quick start, complete replay document, field reference, validation and errors, ID uniqueness, and compatibility. Quick start is open by default; the remaining sections use native disclosures with stable anchors. The complete example is copyable and must pass the public runtime parser unchanged.

The guide owns schema construction, validation, error paths, and runtime-only uniqueness documentation. React usage remains focused on installation and rendering. At narrow widths, field tables become labeled stacked cards without losing their field/type/status/rules/purpose relationships. Landing guide CSS remains separate from all package `asr-` selectors.

The public schema subpath exports `AgentSessionContent`, `parseAgentSessionContent(value)`, and `agentSessionContentJsonSchema`. The parser and root component props validation share the same private strict Zod graph. JSON Schema describes structural constraints and runtime-only uniqueness behavior; the runtime parser remains the authoritative validator for supplied JavaScript values.

Draft and applied content are separate state. Editing never changes the preview. Apply first runs `JSON.parse`, then the public package parser. A failed parse announces a useful error and preserves the last valid preview. A successful apply clears the error, announces the update, and remounts the replayer at case zero. Editor content remains in browser memory and is never uploaded, submitted, or persisted.

At 980px and wider, the editor and preview appear side by side. Below 980px they stack in editor, action and feedback, then preview order. Textarea labels and instructions remain visible, errors set `aria-invalid` and use assertive feedback, success and copy states are perceivable without color alone, and Apply and copy controls retain 44px minimum targets. Code surfaces own their horizontal overflow so the page itself does not scroll sideways.

Landing styles live in `src/styles.css` and use landing-specific classes. They must never target package `.asr-*` selectors. The replayer’s scoped typography, accessibility, responsive behavior, CSS variables, and reduced-motion contract remain controlled by the package stylesheet.

## Color system

The core theme is exposed as scoped custom properties and through the `colors` prop.

| Role | Token | Current value | Use |
| --- | --- | --- | --- |
| Canvas | `--asr-background` | `#090b0d` | Outer frame and darkest base |
| Raised surface | `--asr-surface` | `#0b0e11` | Transcript stage |
| Divider | `--asr-border` | `#292d35` | Frame boundaries and structural separators |
| Primary text | `--asr-text` | `#e8e5e0` | Headings and high-emphasis content |
| Muted text | `--asr-muted` | `#777c88` | Metadata and secondary copy |
| Implementer | `--asr-implementer` | `#f5eedf` | Implementer avatar and warm neutral identity |
| Reviewer | `--asr-reviewer` | `#df754f` | Reviewer identity and warm accent |
| Success | `--asr-success` | `#42d17b` | Positive status and completion emphasis |
| Danger | `--asr-danger` | `#ed736e` | Reviewer/finding emphasis |
| Focus | `--asr-focus` | `#91beff` | Keyboard focus rings and primary control border |

Supporting surfaces remain near-black: ordinary blocks use `#0a0c0f` or `#101216`; findings use deep red (`#21100f` with `#732821`); patch/result blocks use deep green (`#0b1712` with `#174e32`); git diffs use blue-black (`#0b1015` with `#263746`). Diff additions, removals, hunks, and metadata must remain distinguishable by both foreground and background, not by hue alone.

Do not introduce arbitrary accent colors when an existing semantic role applies. User-supplied theme values override only the documented `--asr-*` roles; supporting colors should continue to preserve the same hierarchy and meaning.

## Typography

General UI text uses the native system stack:

```css
system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Open Sans", "Helvetica Neue", sans-serif
```

Use `ui-monospace, monospace` for brands, labels, repository/branch metadata, progress, event headings, block headers, controls, code, and diffs. The contrast between system text and monospaced operational text is intentional.

- No rendered replayer text exceeds 16px. Metadata is generally 9–12px, content 12–13px, the case title is 14px, and the agent-avatar glyph is 16px.
- Body content uses generous line height (`1.65`–`1.7`) despite the dense shell.
- Uppercase labels use letter spacing to establish hierarchy; avoid uppercase for long prose.
- Preserve native font rendering with `font-synthesis: none`; do not add a bundled web font without an explicit design change.

## Frame and hierarchy

The root is a bounded vertical frame with a default height of 720px, a 1px border, 22px radius, near-black canvas, and deep shadow. Its internal order is stable:

1. Frame header: workflow identity, review mode, and a short success-oriented summary.
2. Case navigation: case count, title, repository, branch, playback progress, and controls.
3. Agent row: implementer and reviewer identities, roles, contexts, and active-speaker state.
4. Transcript: the only flexible, scrollable region; completed events compact into interactive disclosure rows that can be reopened, while the actively typing and case-complete current event remains expanded.
5. Footer: persistent scripted-playback disclosure and quiet attribution.

Case progress, the 14px case title, and repository/branch/playback metadata form a compact vertical stack with a 3px gap. Case navigation uses `9px 48px 10px` padding on desktop and `9px 16px 10px` below 760px, preserving transcript space while keeping the three lines distinct.

Desktop spacing is generous at the frame edges (typically 34–48px) while event blocks use 9–18px internal padding and 8–10px radii. Expanded events occupy at most 900px or 78% of the transcript width. Implementer content aligns left; reviewer content aligns right. Completed reviewer and implementer rows use opposing 18% margins to retain actor direction.

## Components and states

### Agents

Both agents use a 40px circular avatar. Inactive agents are reduced to 46% opacity; the active speaker is fully opaque. Reviewer layout reverses avatar and text alignment and carries the orange/red semantic accent. The dimming transition is 180ms.

### Events

Playback follows `typing → collapsing → between-events → next event`, ending in `case-complete`.

- The actively typing event is a semantic `article` labeled by its title; its content is not a disclosure control while autoplay is revealing it.
- Blocks appear progressively as their graphemes are revealed.
- A completed non-final event collapses from its expanded height to a 46px summary button. During the `between-events` pause, that just-completed current event already uses the same interactive completed-event treatment; autoplay still advances after the configured delay.
- Collapsed summary buttons show sequence number, title, a single-line ellipsized summary, and a downward disclosure indicator. They expose `aria-expanded="false"`, `aria-controls`, and an “Expand” accessible name.
- Activating a summary re-expands the full event without replaying it or changing autoplay state. The expanded event replaces its static heading with a collapse button, an upward disclosure indicator, `aria-expanded="true"`, the same `aria-controls` relationship, and a “Collapse” accessible name.
- Hover gives collapsed summaries a lighter border and surface; keyboard focus gives both summary and expanded toggles the standard focus ring. Re-expansion state is per event and resets on case navigation or Restart.
- The final current event remains expanded and non-toggleable when the case completes. Earlier completed events retain their independent disclosure state.

### Blocks

Blocks share a bordered, rounded container and may include a compact header with kind and title.

- `message`: neutral surface; reviewer messages use a warmer dark-red surface.
- `finding`: danger surface and border.
- `patch` and `result`: success surface and border.
- `git_diff`: horizontally scrollable, whitespace-preserving diff with separate metadata, hunk, addition, removal, and context treatments.
- `tool_call`: blue header accent.
- `code`, `patch`, and `tool_output`: preformatted code treatment.
- `status`: content-width compact treatment for low-emphasis progress.

### Controls and feedback

Previous, Restart, and Next controls use a 44px minimum target. Disabled controls reduce opacity and remove the active cursor; pressed controls scale to 98%. The Next control carries the strongest emphasis.

Completed-event summary and expanded-heading toggles are controls, not decorative transcript rows. The accessibility contract requires all playback and disclosure controls to retain at least a 44px target, an explicit Expand/Collapse accessible name, accurate `aria-expanded` state, a matching `aria-controls` target, and a visible 2px focus ring with 3px offset. Disclosure glyphs are visual reinforcement and remain hidden from assistive technology.

A visually hidden polite live region announces the currently autoplaying event or case completion. Do not replace this with rapid per-character announcements.

## Motion

The default tempo is deliberate and deterministic:

- Typing reveals 110 graphemes per second.
- Completed events pause 500ms before the next event.
- Collapse lasts 220ms with `cubic-bezier(0.23, 1, 0.32, 1)`.
- Collapse measures the expanded height, contracts to 46px, shifts expanded content up 6px while fading it out, and shifts the summary up 6px while fading it in.
- The collapse shell uses `contain: layout paint` so the measured height animation does not disturb the surrounding page.
- Transcript autoscroll is smooth only when motion is allowed.

When `prefers-reduced-motion: reduce` is active, the component completes typing immediately, skips the collapse animation, uses automatic scrolling, and reduces CSS animation/transition durations to effectively zero. Environments without Web Animations also take the immediate collapse fallback. Never make understanding or completion depend on animation.

## Responsive behavior

At widths up to 760px:

- Frame radius reduces from 22px to 13px and horizontal padding contracts to 14–16px.
- Header content may wrap; repository, branch, and playback metadata remain visible.
- Agents stack into one column; context descriptions are hidden and inactive opacity becomes 35%.
- Actor-offset summary margins are removed, expanded events use the full width, and collapsed rows hide their descriptive summary text while retaining sequence number, title, and disclosure indicator.
- Transcript and block text reduce slightly while retaining readable line height.
- Controls shrink horizontally but keep 44px minimum height.

At widths up to 420px, case navigation becomes vertical and the controls fill the available width. Do not solve narrow layouts with horizontal page scrolling; only code and diff content may scroll within their own blocks.

## Accessibility and user preferences

- Keep the root section's conversation label, the playback-controls group label, event article labels, hidden decorative glyphs, and polite status region.
- Preserve completed-event disclosure semantics: summary and expanded-heading buttons must report accurate `aria-expanded`, reference the controlled content with `aria-controls`, and use action-specific Expand/Collapse accessible names.
- Titles and summaries are functional accessibility content. They must identify the event and explain the collapsed result, not act as filler.
- Preserve the 44px minimum target contract and `:focus-visible` treatment for playback buttons, disclosure buttons, and the attribution link.
- Maintain text wrapping for prose and isolated overflow for code/diffs.
- Preserve the increased-contrast border and text adjustments under `prefers-contrast: more`.
- Preserve the opaque fallback under `prefers-reduced-transparency: reduce`.
- Test keyboard navigation, reduced motion, narrow widths, long titles/summaries, long unbroken content, and server rendering when changing layout or playback.

## Content truthfulness

The UI may dramatize an authored review, but it must label that experience honestly. Keep the in-frame footer statement that playback is scripted, that reviewer context is limited to the supplied story, and that no live model is running. Demo copy outside the frame should use “replay,” “scripted,” or “example” rather than “running,” “executing,” or “connected” unless live capabilities are actually introduced and approved.

Repository names, branches, findings, patches, tool calls, and results are display data. Never suggest they were observed or executed by the component. The replay should remain convincing because the content is specific and internally coherent, not because the product obscures its deterministic nature.

## Implementation guidance

- Scope package selectors beneath `[data-agent-session-replayer]` and keep the `asr-` namespace.
- Prefer existing CSS variables and semantic block variants before adding new tokens.
- Keep public theme roles aligned across `AgentSessionColors`, runtime validation, the component's variable mapping, package documentation, and this document.
- Keep completed-event disclosure behavior aligned across `CompletedEvent`, `EventSummaryRow`, `expandedEventIds`, `.asr-event-summary-row`, and `.asr-expanded-toggle`. Preserve the controlled-content IDs, `aria-expanded`/`aria-controls` pairing, focus/hover states, actor alignment, and reset behavior on case change or Restart.
- Treat toggling a completed event as local inspection state: it must not replay lifecycle callbacks, change the active event, or pause/cancel deterministic autoplay.
- Keep package and demo concerns separate. The demo may provide fixture parsing and page chrome; the package owns the reusable frame, playback, validation, accessibility, and styles.
- Verify visual changes against the authored component and package CSS, compiled `dist/styles.css`, disclosure DOM/keyboard tests, reduced-motion behavior, autoplay while toggling, and both responsive breakpoints.

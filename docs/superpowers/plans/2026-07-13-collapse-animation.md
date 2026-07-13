# Completed Event Collapse Animation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Animate each completed non-final agent event into its summary row before the existing inter-event pause and next event playback.

**Architecture:** Add an explicit `collapsing` phase to the package playback reducer, then let the React component complete that phase through three coordinated native Web Animations: measured shell height, expanded-content exit, and summary-row entrance. Preserve SSR, cancellation, reduced-motion, and missing-API fallbacks without adding dependencies or public props.

**Tech Stack:** React 19, TypeScript, Web Animations API, CSS, Bun, Vitest, Testing Library

---

### Task 1: Add the collapse phase to the playback state machine

**Files:**
- Create: `tests/package-playback.test.ts`
- Modify: `packages/agent-session-replayer/src/playback.ts:3-47`

- [ ] **Step 1: Write the reducer tests**

Create `tests/package-playback.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  initialPlaybackState,
  playbackReducer,
} from "../packages/agent-session-replayer/src/playback";
import type { AgentSession } from "agent-session-replayer";

const item: AgentSession = {
  id: "collapse-case",
  title: "Collapse case",
  summary: "Exercises collapse state",
  repository: "acme/demo",
  branch: "feat/collapse",
  events: ["first", "final"].map((id) => ({
    id,
    type: "task_received",
    actor: "implementer",
    title: id,
    summary: `${id} summary`,
    blocks: [{ id: `${id}-block`, kind: "message", content: id }],
  })),
};

describe("package playback collapse phase", () => {
  it("requires a matching collapse completion before the inter-event pause", () => {
    const initial = initialPlaybackState();
    const collapsing = playbackReducer(initial, {
      type: "COMPLETE_EVENT",
      item,
      eventIndex: 0,
    });

    expect(collapsing).toMatchObject({ eventIndex: 0, phase: "collapsing" });
    expect(playbackReducer(collapsing, {
      type: "ADVANCE_EVENT",
      eventIndex: 0,
    })).toEqual(collapsing);
    expect(playbackReducer(collapsing, {
      type: "FINISH_COLLAPSE",
      eventIndex: 1,
    })).toEqual(collapsing);

    const betweenEvents = playbackReducer(collapsing, {
      type: "FINISH_COLLAPSE",
      eventIndex: 0,
    });
    expect(betweenEvents).toMatchObject({ eventIndex: 0, phase: "between-events" });
    expect(playbackReducer(betweenEvents, {
      type: "FINISH_COLLAPSE",
      eventIndex: 0,
    })).toEqual(betweenEvents);
    expect(playbackReducer(betweenEvents, {
      type: "ADVANCE_EVENT",
      eventIndex: 0,
    })).toMatchObject({ eventIndex: 1, revealOffset: 0, phase: "typing" });
  });

  it("keeps the final event expanded at case completion", () => {
    const finalState = {
      eventIndex: 1,
      revealOffset: 0,
      phase: "typing" as const,
    };

    expect(playbackReducer(finalState, {
      type: "COMPLETE_EVENT",
      item,
      eventIndex: 1,
    })).toMatchObject({ eventIndex: 1, phase: "case-complete" });
  });
});
```

- [ ] **Step 2: Run the reducer tests and confirm the red state**

Run:

```bash
rtk bunx vitest run tests/package-playback.test.ts
```

Expected: TypeScript or runtime failure because `FINISH_COLLAPSE` and the `collapsing` phase do not exist.

- [ ] **Step 3: Implement the reducer transition**

In `packages/agent-session-replayer/src/playback.ts`, replace the phase and action definitions with:

```ts
export type PlaybackPhase = "typing" | "collapsing" | "between-events" | "case-complete";
export type PlaybackState = { eventIndex: number; revealOffset: number; phase: PlaybackPhase };
export const initialPlaybackState = (): PlaybackState => ({ eventIndex: 0, revealOffset: 0, phase: "typing" });

export type PlaybackAction =
  | { type: "TICK"; item: AgentSession; eventIndex: number; amount: number }
  | { type: "COMPLETE_EVENT"; item: AgentSession; eventIndex: number }
  | { type: "FINISH_COLLAPSE"; eventIndex: number }
  | { type: "ADVANCE_EVENT"; eventIndex: number }
  | { type: "RESTART" };
```

Replace `playbackReducer` with:

```ts
export function playbackReducer(state: PlaybackState, action: PlaybackAction): PlaybackState {
  if (action.type === "RESTART") return initialPlaybackState();
  if (action.eventIndex !== state.eventIndex) return state;
  if (action.type === "FINISH_COLLAPSE") {
    return state.phase === "collapsing" ? { ...state, phase: "between-events" } : state;
  }
  if (action.type === "ADVANCE_EVENT") {
    return state.phase === "between-events"
      ? { eventIndex: state.eventIndex + 1, revealOffset: 0, phase: "typing" }
      : state;
  }
  if (state.phase !== "typing") return state;
  const event = action.item.events[state.eventIndex]!;
  const length = getEventLength(event);
  const revealOffset = action.type === "COMPLETE_EVENT"
    ? length
    : Math.min(length, state.revealOffset + action.amount);
  if (revealOffset < length) return { ...state, revealOffset };
  return {
    ...state,
    revealOffset,
    phase: state.eventIndex === action.item.events.length - 1
      ? "case-complete"
      : "collapsing",
  };
}
```

- [ ] **Step 4: Run the reducer tests and confirm green**

Run:

```bash
rtk bunx vitest run tests/package-playback.test.ts
```

Expected: 2 tests pass.

- [ ] **Step 5: Commit the state-machine slice**

```bash
rtk git add tests/package-playback.test.ts packages/agent-session-replayer/src/playback.ts
rtk git commit -m "feat: add event collapse playback phase"
```

### Task 2: Render and animate the collapse transaction

**Files:**
- Modify: `tests/package-api.test.tsx`
- Modify: `packages/agent-session-replayer/src/AgentSessionReplayer.tsx:1-229`

- [ ] **Step 1: Add a controllable Web Animations mock and sequencing test**

In `tests/package-api.test.tsx`, add `afterEach` to the Vitest imports and add these helpers after `cases`:

```ts
const originalAnimate = HTMLElement.prototype.animate;
const originalMatchMedia = window.matchMedia;

function installAnimationMock() {
  const resolvers: Array<() => void> = [];
  const cancel = vi.fn();
  const animate = vi.fn(() => {
    let resolve!: () => void;
    const finished = new Promise<void>((done) => { resolve = done; });
    resolvers.push(resolve);
    return { cancel, finished } as unknown as Animation;
  });
  Object.defineProperty(HTMLElement.prototype, "animate", {
    configurable: true,
    value: animate,
  });
  return {
    animate,
    cancel,
    finish: async () => {
      resolvers.splice(0).forEach((resolve) => resolve());
      await Promise.resolve();
    },
  };
}

afterEach(() => {
  Object.defineProperty(HTMLElement.prototype, "animate", {
    configurable: true,
    value: originalAnimate,
  });
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: originalMatchMedia,
  });
  vi.useRealTimers();
});

const collapsingCases: AgentSession[] = [{
  ...cases[0]!,
  events: ["first", "second"].map((id) => ({
    ...cases[0]!.events[0]!,
    id,
    title: id,
    summary: `${id} summary`,
    blocks: [{ id: `${id}-block`, kind: "message", content: "a" }],
  })),
}, cases[1]!];
```

Add this test inside `describe("published component API", ...)`:

```tsx
it("finishes collapse before waiting and starting the next event", async () => {
  vi.useFakeTimers();
  const animation = installAnimationMock();
  const { container } = render(
    <AgentSessionReplayer
      agents={agents}
      cases={collapsingCases}
      typingSpeed={1000}
      eventDelayMs={50}
    />,
  );

  act(() => vi.advanceTimersByTime(1));
  expect(container.querySelector(".asr-collapse-shell")).toBeInTheDocument();
  expect(container.querySelector('.asr-collapse-summary[aria-hidden="true"]')).toBeInTheDocument();
  expect(screen.getByRole("article", { name: "first" })).toBeInTheDocument();
  expect(animation.animate).toHaveBeenCalledTimes(3);

  act(() => vi.advanceTimersByTime(500));
  expect(screen.queryByRole("article", { name: "second" })).not.toBeInTheDocument();

  await act(async () => animation.finish());
  expect(container.querySelector(".asr-collapse-shell")).not.toBeInTheDocument();
  expect(screen.queryByRole("article", { name: "second" })).not.toBeInTheDocument();

  act(() => vi.advanceTimersByTime(49));
  expect(screen.queryByRole("article", { name: "second" })).not.toBeInTheDocument();
  act(() => vi.advanceTimersByTime(1));
  expect(screen.getByRole("article", { name: "second" })).toBeInTheDocument();
});
```

- [ ] **Step 2: Add the interruption test**

Add this test beside the sequencing test:

```tsx
it("cancels collapse animations when case navigation interrupts playback", () => {
  vi.useFakeTimers();
  const animation = installAnimationMock();
  render(
    <AgentSessionReplayer
      agents={agents}
      cases={collapsingCases}
      typingSpeed={1000}
    />,
  );

  act(() => vi.advanceTimersByTime(1));
  fireEvent.click(screen.getByRole("button", { name: /next case/i }));

  expect(animation.cancel).toHaveBeenCalledTimes(3);
  expect(screen.getByText(/case 2 of 2/i)).toBeInTheDocument();
  expect(screen.queryByText("first summary")).not.toBeInTheDocument();
});
```

- [ ] **Step 3: Add reduced-motion and missing-API fallback tests**

Add these tests beside the interruption test:

```tsx
it("skips collapse animation when reduced motion is requested", () => {
  vi.useFakeTimers();
  const animation = installAnimationMock();
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: vi.fn(() => ({
      matches: true,
      media: "(prefers-reduced-motion: reduce)",
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });

  render(
    <AgentSessionReplayer
      agents={agents}
      cases={collapsingCases}
      typingSpeed={1000}
      eventDelayMs={50}
    />,
  );
  act(() => vi.advanceTimersByTime(1));

  expect(animation.animate).not.toHaveBeenCalled();
  act(() => vi.advanceTimersByTime(50));
  expect(screen.getByRole("article", { name: "second" })).toBeInTheDocument();
});

it("skips collapse animation when the Web Animations API is unavailable", () => {
  vi.useFakeTimers();
  Object.defineProperty(HTMLElement.prototype, "animate", {
    configurable: true,
    value: undefined,
  });

  render(
    <AgentSessionReplayer
      agents={agents}
      cases={collapsingCases}
      typingSpeed={1000}
      eventDelayMs={50}
    />,
  );
  act(() => vi.advanceTimersByTime(1));
  expect(screen.queryByRole("article", { name: "second" })).not.toBeInTheDocument();
  act(() => vi.advanceTimersByTime(50));
  expect(screen.getByRole("article", { name: "second" })).toBeInTheDocument();
});
```

- [ ] **Step 4: Run the component tests and confirm the red state**

Run:

```bash
rtk bunx vitest run tests/package-api.test.tsx
```

Expected: the new tests fail because the collapse shell and native animations are absent.

- [ ] **Step 5: Add shared summary and collapse components**

Add `useCallback` to the React imports in `AgentSessionReplayer.tsx`, then add these constants below the existing defaults:

```ts
const COLLAPSE_DURATION_MS = 220;
const COLLAPSE_EASING = "cubic-bezier(0.23, 1, 0.32, 1)";
```

Add these components after `ExpandedEvent`:

```tsx
function EventSummaryRow({
  event,
  index,
  className = "",
}: {
  event: AgentSessionEvent;
  index: number;
  className?: string;
}) {
  return <div
    className={`asr-event-summary-row asr-event-summary-row--${event.actor}${className ? ` ${className}` : ""}`}
  >
    <span>{String(index + 1).padStart(2, "0")}</span>
    <strong>{event.title}</strong>
    <p>{event.summary}</p>
  </div>;
}

function CollapsingEvent({
  event,
  index,
  reduceMotion,
  onComplete,
}: {
  event: AgentSessionEvent;
  index: number;
  reduceMotion: boolean;
  onComplete: () => void;
}) {
  const shellRef = useRef<HTMLDivElement>(null);
  const expandedRef = useRef<HTMLDivElement>(null);
  const summaryRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const shell = shellRef.current;
    const expanded = expandedRef.current;
    const summary = summaryRef.current;
    if (!shell || !expanded || !summary) return;
    if (reduceMotion || typeof shell.animate !== "function") {
      onComplete();
      return;
    }

    let cancelled = false;
    const options: KeyframeAnimationOptions = {
      duration: COLLAPSE_DURATION_MS,
      easing: COLLAPSE_EASING,
      fill: "forwards",
    };
    const shellAnimation = shell.animate([
      { height: `${shell.scrollHeight}px` },
      { height: "46px" },
    ], options);
    const expandedAnimation = expanded.animate([
      { opacity: 1, transform: "translateY(0)" },
      { opacity: 0, transform: "translateY(-6px)" },
    ], options);
    const summaryAnimation = summary.animate([
      { opacity: 0, transform: "translateY(6px)" },
      { opacity: 1, transform: "translateY(0)" },
    ], options);

    void shellAnimation.finished
      .then(() => { if (!cancelled) onComplete(); })
      .catch(() => undefined);

    return () => {
      cancelled = true;
      shellAnimation.cancel();
      expandedAnimation.cancel();
      summaryAnimation.cancel();
    };
  }, [event.id, onComplete, reduceMotion]);

  return <div className="asr-collapse-shell" ref={shellRef}>
    <div className="asr-collapse-expanded" ref={expandedRef}>
      <ExpandedEvent event={event} visibleEvent={event} typing={false} />
    </div>
    <div className="asr-collapse-summary" ref={summaryRef} aria-hidden="true">
      <EventSummaryRow event={event} index={index} />
    </div>
  </div>;
}
```

- [ ] **Step 6: Wire phase rendering and completion dispatch**

Inside `AgentSessionReplayer`, add:

```ts
const finishCollapse = useCallback(() => {
  dispatch({ type: "FINISH_COLLAPSE", eventIndex });
}, [eventIndex]);
```

Replace the transcript children with:

```tsx
<div className="asr-transcript" ref={transcriptRef}>
  {activeCase.events.slice(0, eventIndex).map((past, index) => (
    <EventSummaryRow event={past} index={index} key={past.id} />
  ))}
  {phase === "collapsing" ? (
    <CollapsingEvent
      event={event}
      index={eventIndex}
      reduceMotion={reduceMotion}
      onComplete={finishCollapse}
    />
  ) : phase === "between-events" ? (
    <EventSummaryRow event={event} index={eventIndex} key={event.id} />
  ) : (
    <div><ExpandedEvent event={event} visibleEvent={visibleEvent} typing={phase === "typing"} /></div>
  )}
</div>
```

- [ ] **Step 7: Run the component tests and confirm green**

Run:

```bash
rtk bun run build:package
rtk bunx vitest run tests/package-api.test.tsx
```

Expected: all package API tests pass, including sequencing and interruption.

### Task 3: Style and verify the collapse layers

**Files:**
- Modify: `packages/agent-session-replayer/src/styles.css:62-75`
- Modify: `tests/package-css.test.ts`

- [ ] **Step 1: Write the compiled CSS contract**

Add this test to `tests/package-css.test.ts`:

```ts
it("clips the measured collapse shell without broad transitions", () => {
  expect(css).toMatch(/\.asr-collapse-shell\{[^}]*position:relative[^}]*overflow:hidden/);
  expect(css).toMatch(/\.asr-collapse-summary\{[^}]*position:absolute[^}]*opacity:0/);
  expect(css).not.toContain("transition:all");
});
```

- [ ] **Step 2: Run the CSS test and confirm the red state**

Run:

```bash
rtk bun run build:package
rtk bunx vitest run tests/package-css.test.ts
```

Expected: the new collapse-shell assertion fails.

- [ ] **Step 3: Add the stable collapse layers**

Add these rules after `.asr-transcript` in `packages/agent-session-replayer/src/styles.css`:

```css
[data-agent-session-replayer] .asr-collapse-shell {
  position: relative;
  min-height: 46px;
  overflow: hidden;
}
[data-agent-session-replayer] .asr-collapse-expanded { position: relative; }
[data-agent-session-replayer] .asr-collapse-summary {
  position: absolute;
  inset: 0;
  opacity: 0;
  pointer-events: none;
}
```

- [ ] **Step 4: Build and run focused package tests**

Run:

```bash
rtk bun run build:package
rtk bunx vitest run tests/package-playback.test.ts tests/package-api.test.tsx tests/package-css.test.ts
```

Expected: all focused tests pass.

- [ ] **Step 5: Commit the animated component slice**

```bash
rtk git add packages/agent-session-replayer/src/AgentSessionReplayer.tsx packages/agent-session-replayer/src/styles.css tests/package-api.test.tsx tests/package-css.test.ts
rtk git commit -m "feat: animate completed event collapse"
```

### Task 4: Full verification and browser check

**Files:**
- Verify: `packages/agent-session-replayer/src/playback.ts`
- Verify: `packages/agent-session-replayer/src/AgentSessionReplayer.tsx`
- Verify: `packages/agent-session-replayer/src/styles.css`
- Verify: `tests/package-playback.test.ts`
- Verify: `tests/package-api.test.tsx`
- Verify: `tests/package-css.test.ts`

- [ ] **Step 1: Run static verification and the complete suite**

Run:

```bash
rtk bun run typecheck
rtk bunx vitest run --passWithNoTests
rtk bun run build
```

Expected: typecheck exits 0, every test passes, and the production build exits 0.

- [ ] **Step 2: Inspect compiled output for the dependency and motion contract**

Run:

```bash
rtk rg -n 'framer-motion|motion/react|transition:all' packages/agent-session-replayer/dist packages/agent-session-replayer/package.json
```

Expected: no matches.

- [ ] **Step 3: Verify in a browser**

Run:

```bash
rtk bun run dev -- --host 127.0.0.1
```

Verify:

1. A tall code event shrinks smoothly into its aligned 46px summary row.
2. The next event waits until the collapse finishes and the configured pause elapses.
3. Reviewer summaries retain right-side alignment on desktop.
4. Mobile collapse does not overflow horizontally.
5. Next case and Restart cancel a mid-collapse animation immediately.
6. Reduced motion replaces the event instantly, while preserving the pause.
7. The console has no unhandled animation cancellation rejection.

- [ ] **Step 4: Review the final diff**

Run:

```bash
rtk git diff --check
rtk git status --short
```

Expected: no whitespace errors and only the intended collapse-animation files plus pre-existing unrelated worktree changes.

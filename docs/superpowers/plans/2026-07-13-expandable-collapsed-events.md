# Expandable Collapsed Events Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let viewers independently expand and re-collapse completed event summaries without affecting autoplay.

**Architecture:** Keep expansion as presentation state inside `AgentSessionReplayer`, keyed by stable event IDs. A reusable completed-event component renders either the existing summary button or the existing full event renderer; case changes and restart clear the set. The playback reducer remains unchanged.

**Tech Stack:** React 19, TypeScript, Tailwind-generated scoped CSS, Vitest, Testing Library, Bun

---

### Task 1: Add test coverage for completed-event toggles

**Files:**
- Modify: `tests/app.test.tsx`

- [ ] **Step 1: Write the failing independent-toggle test**

Add a helper that advances the scripted case to completion, then assert that two summary buttons can be expanded independently and one can be collapsed without affecting the other:

```tsx
function finishCurrentCase() {
  for (let index = 0; index < 5000 && !screen.queryByText(/case complete/i); index += 1) {
    act(() => vi.runOnlyPendingTimers());
  }
}

it("expands and collapses completed events independently", () => {
  vi.useFakeTimers();
  render(<App />);
  finishCurrentCase();

  const first = screen.getByRole("button", { name: /expand task received/i });
  const second = screen.getByRole("button", { name: /expand plan the fix/i });
  fireEvent.click(first);
  fireEvent.click(second);

  expect(screen.getByRole("button", { name: /collapse task received/i })).toHaveAttribute("aria-expanded", "true");
  expect(screen.getByRole("button", { name: /collapse plan the fix/i })).toHaveAttribute("aria-expanded", "true");

  fireEvent.click(screen.getByRole("button", { name: /collapse task received/i }));
  expect(screen.getByRole("button", { name: /expand task received/i })).toHaveAttribute("aria-expanded", "false");
  expect(screen.getByRole("button", { name: /collapse plan the fix/i })).toHaveAttribute("aria-expanded", "true");
});
```

- [ ] **Step 2: Write the failing reset-state test**

```tsx
it("clears expanded completed events when restarting or changing cases", () => {
  vi.useFakeTimers();
  render(<App />);
  finishCurrentCase();
  fireEvent.click(screen.getByRole("button", { name: /expand task received/i }));

  fireEvent.click(screen.getByRole("button", { name: /restart case/i }));
  finishCurrentCase();
  expect(screen.getByRole("button", { name: /expand task received/i })).toHaveAttribute("aria-expanded", "false");

  fireEvent.click(screen.getByRole("button", { name: /next case/i }));
  expect(screen.queryByRole("button", { name: /collapse task received/i })).not.toBeInTheDocument();
});
```

- [ ] **Step 3: Run the focused tests and verify red**

Run: `rtk bunx vitest run tests/app.test.tsx`

Expected: FAIL because completed event rows are not buttons and expose no expansion controls.

- [ ] **Step 4: Commit the failing tests**

```bash
rtk git add tests/app.test.tsx
rtk git commit -m "test: cover expandable completed events"
```

### Task 2: Implement accessible inline expansion

**Files:**
- Modify: `packages/agent-session-replayer/src/AgentSessionReplayer.tsx`
- Modify: `packages/agent-session-replayer/src/styles.css`
- Test: `tests/app.test.tsx`

- [ ] **Step 1: Turn the summary row into a native toggle**

Extract the row's visual children so the collapse animation can keep a non-interactive preview, then render completed summaries as native buttons:

```tsx
function EventSummaryContent({ event, index }: { event: AgentSessionEvent; index: number }) {
  return <>
    <span>{String(index + 1).padStart(2, "0")}</span>
    <strong>{event.title}</strong>
    <p>{event.summary}</p>
    <span className="asr-disclosure" aria-hidden="true">⌄</span>
  </>;
}

function EventSummaryRow({ event, index, contentId, onToggle, className = "" }: {
  event: AgentSessionEvent;
  index: number;
  contentId: string;
  onToggle: () => void;
  className?: string;
}) {
  return <button
    type="button"
    className={`asr-event-summary-row asr-event-summary-row--${event.actor}${className ? ` ${className}` : ""}`}
    aria-expanded="false"
    aria-controls={contentId}
    aria-label={`Expand ${event.title}`}
    onClick={onToggle}
  >
    <EventSummaryContent event={event} index={index} />
  </button>;
}
```

- [ ] **Step 2: Add a completed-event renderer that reuses full event blocks**

```tsx
function CompletedEvent({ event, index, expanded, onToggle }: {
  event: AgentSessionEvent;
  index: number;
  expanded: boolean;
  onToggle: () => void;
}) {
  const contentId = `asr-event-${event.id}`;
  if (!expanded) return <div className="asr-completed-event">
    <EventSummaryRow event={event} index={index} contentId={contentId} onToggle={onToggle} />
    <div id={contentId} hidden />
  </div>;
  return <div className={`asr-expanded-event asr-expanded-event--${event.actor}`}>
    <button type="button" className="asr-expanded-toggle" aria-expanded="true" aria-controls={contentId} aria-label={`Collapse ${event.title}`} onClick={onToggle}>
      <span>{event.actor === "implementer" ? "✣ claude" : "adversarial reviewer ✣"}</span>
      <strong>{event.title}</strong>
      <span className="asr-disclosure" aria-hidden="true">⌃</span>
    </button>
    <div className="asr-blocks" id={contentId}>{event.blocks.map((block) => <Block block={block} key={block.id} />)}</div>
  </div>;
}
```

Keep the collapse-animation summary non-interactive with `aria-hidden="true"` by rendering its existing `.asr-event-summary-row` div around `<EventSummaryContent event={event} index={index} />`; it is replaced by `CompletedEvent` only after the animation finishes.

- [ ] **Step 3: Store independent expansion state and clear it at playback boundaries**

Inside `AgentSessionReplayer` add:

```tsx
const [expandedEventIds, setExpandedEventIds] = useState<Set<string>>(() => new Set());
const toggleEvent = (eventId: string) => {
  setExpandedEventIds((current) => {
    const next = new Set(current);
    if (next.has(eventId)) next.delete(eventId);
    else next.add(eventId);
    return next;
  });
};
const clearExpandedEvents = () => setExpandedEventIds(new Set());
```

Call `clearExpandedEvents()` when `resolvedCaseIndex` changes, inside `restart`, and before an uncontrolled `requestCase` dispatch. Render past and just-completed events with:

```tsx
<CompletedEvent
  event={past}
  index={index}
  expanded={expandedEventIds.has(past.id)}
  onToggle={() => toggleEvent(past.id)}
/>
```

The active typing/collapsing event remains unchanged and therefore cannot interrupt playback.

- [ ] **Step 4: Preserve the existing visual design while adding interaction states**

Update the scoped CSS so `.asr-event-summary-row` resets native button typography, fills its available width, uses a four-column grid with a disclosure cell, and gains hover/focus states:

```css
[data-agent-session-replayer] .asr-event-summary-row {
  width:100%;font:inherit;text-align:left;cursor:pointer;
  grid-template-columns:34px 180px minmax(0,1fr) 18px;
}
[data-agent-session-replayer] .asr-event-summary-row:hover { border-color:#3a404a;background:#101419 }
[data-agent-session-replayer] .asr-event-summary-row:focus-visible { outline:2px solid var(--asr-focus);outline-offset:3px }
[data-agent-session-replayer] .asr-disclosure { transition:transform .18s ease }
[data-agent-session-replayer] .asr-expanded-toggle { display:flex;align-items:center;justify-content:space-between;width:100%;margin:0 0 10px;padding:0;border:0;background:transparent;color:inherit;text-align:inherit;cursor:pointer;font:11px ui-monospace,monospace }
[data-agent-session-replayer] .asr-expanded-toggle:focus-visible { outline:2px solid var(--asr-focus);outline-offset:3px }
```

At the mobile breakpoint, change the summary grid to `24px minmax(0,1fr) 18px`, keep the summary hidden, and place the disclosure in the last column.

- [ ] **Step 5: Rebuild the package and run focused tests**

Run: `rtk bun run build:package`

Expected: package ESM, CJS, declarations, and CSS build successfully.

Run: `rtk bunx vitest run tests/app.test.tsx`

Expected: all app tests pass, including independent expansion and reset behavior.

- [ ] **Step 6: Run full verification**

Run: `rtk bun run test`

Expected: all tests pass with zero failures.

Run: `rtk bun run typecheck`

Expected: TypeScript exits successfully with no diagnostics.

Run: `rtk bun run build`

Expected: package and demo production builds succeed.

Run: `rtk bun run pack:package`

Expected: the package tarball is regenerated with component, styles, types, and metadata.

- [ ] **Step 7: Verify interaction in the browser**

Open the production preview at 1440px and 320px. Complete a case, expand two summaries, collapse one, confirm the other remains expanded, restart, and confirm both reset. Verify no horizontal overflow and confirm autoplay continues while completed rows are opened.

- [ ] **Step 8: Commit the implementation**

```bash
rtk git add packages/agent-session-replayer/src/AgentSessionReplayer.tsx packages/agent-session-replayer/src/styles.css tests/app.test.tsx
rtk git commit -m "feat: expand completed replay events"
```

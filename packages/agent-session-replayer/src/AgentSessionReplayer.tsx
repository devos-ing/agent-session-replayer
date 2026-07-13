import {
  type CSSProperties,
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";
import { initialPlaybackState, playbackReducer, revealEvent } from "./playback";
import { parseReplayerProps } from "./validation";
import { GitDiffBlock } from "./GitDiffBlock";
import type {
  AgentActor,
  AgentSessionBlock,
  AgentSession,
  AgentSessionColors,
  AgentSessionEvent,
  AgentSessionReplayerProps,
} from "./types";

const DEFAULT_TYPING_SPEED = 110;
const DEFAULT_EVENT_DELAY = 500;
const COLLAPSE_DURATION_MS = 220;
const COLLAPSE_EASING = "cubic-bezier(0.23, 1, 0.32, 1)";

const colorVariables: Record<keyof AgentSessionColors, string> = {
  background: "--asr-background",
  surface: "--asr-surface",
  border: "--asr-border",
  text: "--asr-text",
  muted: "--asr-muted",
  implementer: "--asr-implementer",
  reviewer: "--asr-reviewer",
  success: "--asr-success",
  danger: "--asr-danger",
  focus: "--asr-focus",
};

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(query.matches);
    update();
    query.addEventListener?.("change", update);
    return () => query.removeEventListener?.("change", update);
  }, []);
  return reduced;
}

function Agent({ actor, active, agent }: { actor: AgentActor; active: boolean; agent: AgentSessionReplayerProps["agents"][AgentActor] }) {
  return <div className={`asr-agent asr-agent--${actor} ${active ? "asr-is-active" : ""}`}>
    <span className="asr-agent-avatar" aria-hidden="true">✣</span>
    <div><strong>{agent.name}</strong> <span>{agent.role}</span><p>its context: {agent.context}</p></div>
  </div>;
}

function Block({ block }: { block: AgentSessionBlock }) {
  const codeLike = block.kind === "code" || block.kind === "patch" || block.kind === "tool_output";
  return <section className={`asr-chat-block asr-chat-block--${block.kind}`}>
    {block.title && <header><span>{block.kind.replace("_", " ")}</span>{block.title}</header>}
    {block.kind === "git_diff"
      ? <GitDiffBlock content={block.content} />
      : codeLike
        ? <pre><code>{block.content}</code></pre>
        : <p>{block.content}</p>}
  </section>;
}

function ExpandedEvent({ event, visibleEvent, typing }: { event: AgentSessionEvent; visibleEvent: AgentSessionEvent; typing: boolean }) {
  return <article className={`asr-expanded-event asr-expanded-event--${event.actor}`} aria-label={event.title}>
    <div className="asr-event-heading"><span>{event.actor === "implementer" ? "✣ claude" : "adversarial reviewer ✣"}</span><strong>{event.title}</strong></div>
    <div className="asr-blocks">{visibleEvent.blocks.map((block) => <Block block={block} key={block.id} />)}</div>
    {typing && <span className="asr-typing-caret" aria-hidden="true" />}
  </article>;
}

function EventSummaryRow({ event, index, className = "" }: { event: AgentSessionEvent; index: number; className?: string }) {
  return <div className={`asr-event-summary-row asr-event-summary-row--${event.actor}${className ? ` ${className}` : ""}`}>
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

export function AgentSessionReplayer(props: AgentSessionReplayerProps) {
  const {
    agents,
    cases,
    typingSpeed,
    eventDelayMs,
    height,
    colors,
    caseIndex,
    initialCaseIndex,
    className,
    onCaseChange,
    onEventStart,
    onEventComplete,
    onCaseComplete,
  } = parseReplayerProps({
    ...props,
    typingSpeed: props.typingSpeed === undefined ? DEFAULT_TYPING_SPEED : props.typingSpeed,
    eventDelayMs: props.eventDelayMs === undefined ? DEFAULT_EVENT_DELAY : props.eventDelayMs,
    height: props.height === undefined ? 720 : props.height,
    initialCaseIndex: props.initialCaseIndex === undefined ? 0 : props.initialCaseIndex,
  });
  const controlled = caseIndex !== undefined;
  const [internalCaseIndex, setInternalCaseIndex] = useState(initialCaseIndex);
  const resolvedCaseIndex = controlled ? caseIndex : internalCaseIndex;
  const [state, dispatch] = useReducer(playbackReducer, undefined, initialPlaybackState);
  const [generation, bumpGeneration] = useReducer((value: number) => value + 1, 0);
  const reduceMotion = usePrefersReducedMotion();
  const transcriptRef = useRef<HTMLDivElement>(null);
  const started = useRef(new Set<string>());
  const completed = useRef(new Set<string>());
  const completedCases = useRef(new Set<string>());
  const previousCase = useRef(resolvedCaseIndex);
  const activeCase = cases[resolvedCaseIndex]!;
  const caseChanged = previousCase.current !== resolvedCaseIndex;
  const eventIndex = caseChanged ? 0 : state.eventIndex;
  const revealOffset = caseChanged ? 0 : state.revealOffset;
  const phase = caseChanged ? "typing" : state.phase;
  const event = activeCase.events[eventIndex]!;
  const visibleEvent = useMemo(() => revealEvent(event, revealOffset), [event, revealOffset]);
  const finishCollapse = useCallback(() => {
    dispatch({ type: "FINISH_COLLAPSE", eventIndex });
  }, [eventIndex]);

  useEffect(() => {
    if (previousCase.current === resolvedCaseIndex) return;
    previousCase.current = resolvedCaseIndex;
    bumpGeneration();
    dispatch({ type: "RESTART" });
  }, [resolvedCaseIndex]);

  useEffect(() => {
    if (caseChanged) return;
    const key = `${generation}:${activeCase.id}:${event.id}`;
    if (!started.current.has(key)) {
      started.current.add(key);
      onEventStart?.(event, activeCase);
    }
  }, [activeCase, caseChanged, event, generation, onEventStart]);

  useEffect(() => {
    if (caseChanged) return;
    if (phase === "typing") {
      if (reduceMotion) {
        dispatch({ type: "COMPLETE_EVENT", item: activeCase, eventIndex });
        return;
      }
      const timer = window.setTimeout(() => dispatch({ type: "TICK", item: activeCase, eventIndex, amount: 1 }), 1000 / typingSpeed);
      return () => window.clearTimeout(timer);
    }
    if (phase === "between-events") {
      const timer = window.setTimeout(() => dispatch({ type: "ADVANCE_EVENT", eventIndex }), eventDelayMs);
      return () => window.clearTimeout(timer);
    }
  }, [activeCase, caseChanged, eventDelayMs, eventIndex, phase, reduceMotion, revealOffset, typingSpeed]);

  useEffect(() => {
    if (phase === "typing") return;
    const key = `${generation}:${activeCase.id}:${event.id}`;
    if (!completed.current.has(key)) {
      completed.current.add(key);
      onEventComplete?.(event, activeCase);
    }
    if (phase === "case-complete") {
      const caseKey = `${generation}:${activeCase.id}`;
      if (!completedCases.current.has(caseKey)) {
        completedCases.current.add(caseKey);
        onCaseComplete?.(activeCase);
      }
    }
  }, [activeCase, event, generation, onCaseComplete, onEventComplete, phase]);

  useEffect(() => {
    const transcript = transcriptRef.current;
    if (!transcript || transcript.scrollHeight <= transcript.clientHeight) return;
    transcript.scrollTo({ top: transcript.scrollHeight, behavior: reduceMotion ? "auto" : "smooth" });
    const bottomGap = transcript.scrollHeight - transcript.clientHeight - transcript.scrollTop;
    if (bottomGap > 1) transcript.scrollTop = transcript.scrollHeight;
  }, [eventIndex, reduceMotion, resolvedCaseIndex, revealOffset, visibleEvent.blocks.length]);

  const requestCase = (nextIndex: number) => {
    if (nextIndex === resolvedCaseIndex || nextIndex < 0 || nextIndex >= cases.length) return;
    if (!controlled) {
      setInternalCaseIndex(nextIndex);
      dispatch({ type: "RESTART" });
    }
    onCaseChange?.(nextIndex, cases[nextIndex]!);
  };

  const restart = () => {
    bumpGeneration();
    dispatch({ type: "RESTART" });
  };

  const style = {
    ...Object.fromEntries(Object.entries(colors ?? {}).map(([key, value]) => [colorVariables[key as keyof AgentSessionColors], value])),
    "--asr-height": `${height}px`,
    height: `${height}px`,
  } as CSSProperties;

  return <section data-agent-session-replayer className={`asr-root${className ? ` ${className}` : ""}`} style={style} aria-label="Two-agent review conversation">
    <div className="asr-chat-stage">
      <header className="asr-frame-header">
        <div className="asr-workflow-line"><span className="asr-brand"><span>✣</span> Claude Code · Dynamic workflow</span><span className="asr-review-label">Adversarial review</span></div>
        <p className="asr-case-summary">{cases.length} bugs caught by adversarial review before merge</p>
      </header>
      <div className="asr-case-nav">
        <div><span className="asr-case-progress">Case {resolvedCaseIndex + 1} of {cases.length}</span><h2 className="asr-case-title">{activeCase.title}</h2><span className="asr-repository">{activeCase.repository} · {activeCase.branch} · {phase === "case-complete" ? "Case complete" : `Message ${eventIndex + 1} of ${activeCase.events.length}`}</span></div>
        <div className="asr-controls" aria-label="Playback controls">
          <button type="button" onClick={() => requestCase(resolvedCaseIndex - 1)} disabled={resolvedCaseIndex === 0} aria-label="Previous case">←</button>
          <button type="button" onClick={restart} aria-label="Restart case">Restart</button>
          <button type="button" className="asr-next-button" onClick={() => requestCase(resolvedCaseIndex + 1)} disabled={resolvedCaseIndex === cases.length - 1}>Next case →</button>
        </div>
      </div>
      <div className="asr-agent-row"><Agent actor="implementer" active={event.actor === "implementer"} agent={agents.implementer} /><Agent actor="reviewer" active={event.actor === "reviewer"} agent={agents.reviewer} /></div>
      <div className="asr-transcript" ref={transcriptRef}>
        {activeCase.events.slice(0, eventIndex).map((past, index) => <EventSummaryRow event={past} index={index} key={past.id} />)}
        {phase === "collapsing" ? (
          <CollapsingEvent event={event} index={eventIndex} reduceMotion={reduceMotion} onComplete={finishCollapse} />
        ) : phase === "between-events" ? (
          <EventSummaryRow event={event} index={eventIndex} key={event.id} />
        ) : (
          <div><ExpandedEvent event={event} visibleEvent={visibleEvent} typing={phase === "typing"} /></div>
        )}
      </div>
      <p className="asr-live-status" aria-live="polite">{phase === "case-complete" ? `${activeCase.title} complete.` : `Autoplaying ${event.title}.`}</p>
      <footer className="asr-footer"><span>Scripted playback: each reviewer receives only the diff and is told to find how it is wrong. No live model is running.</span><a className="asr-watermark" href="https://devos.ing" target="_blank" rel="noopener noreferrer">devos</a></footer>
    </div>
  </section>;
}

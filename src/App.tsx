import { useReducedMotion } from "motion/react";
import { useEffect, useMemo, useReducer, useRef } from "react";
import { autoplayReducer, createAutoplayState } from "./autoplay";
import demoSource from "./data/demo.json";
import { parseWorkflow, revealEvent, type WorkflowBlock, type WorkflowEvent } from "./workflow";
import "./styles.css";

const workflow = parseWorkflow(JSON.stringify(demoSource));
const TICK_MS = 18;
const BETWEEN_EVENT_MS = 500;

function Agent({ actor, active }: { actor: "implementer" | "reviewer"; active: boolean }) {
  const agent = workflow.agents[actor];
  return <div className={`agent agent--${actor} ${active ? "is-active" : ""}`}>
    <span className="agent-avatar" aria-hidden="true">✣</span>
    <div><strong>{agent.name}</strong> <span>{agent.role}</span><p>its context: {agent.context}</p></div>
  </div>;
}

function Block({ block }: { block: WorkflowBlock }) {
  const codeLike = block.kind === "code" || block.kind === "patch" || block.kind === "tool_output";
  return <section className={`chat-block chat-block--${block.kind}`}>
    {block.title && <header><span>{block.kind.replace("_", " ")}</span>{block.title}</header>}
    {codeLike ? <pre><code>{block.content}</code></pre> : <p>{block.content}</p>}
  </section>;
}

function ExpandedEvent({ event, visibleEvent, typing }: { event: WorkflowEvent; visibleEvent: WorkflowEvent; typing: boolean }) {
  return <article className={`expanded-event expanded-event--${event.actor}`} aria-label={event.title}>
    <div className="event-heading"><span>{event.actor === "implementer" ? "✣ claude" : "adversarial reviewer ✣"}</span><strong>{event.title}</strong></div>
    <div className="blocks">{visibleEvent.blocks.map((block, index) => <Block block={block} key={`${block.kind}-${index}`} />)}</div>
    {typing && <span className="typing-caret" aria-hidden="true" />}
  </article>;
}

export default function App() {
  const [state, dispatch] = useReducer(autoplayReducer, undefined, createAutoplayState);
  const reduceMotion = useReducedMotion();
  const activeRef = useRef<HTMLDivElement>(null);
  const previousEvent = useRef(`${state.caseIndex}:${state.eventIndex}`);
  const activeCase = workflow.cases[state.caseIndex]!;
  const event = activeCase.events[state.eventIndex]!;
  const visibleEvent = useMemo(() => revealEvent(event, state.revealOffset), [event, state.revealOffset]);

  useEffect(() => {
    const caseIndex = state.caseIndex;
    const eventIndex = state.eventIndex;
    if (state.phase === "typing") {
      if (reduceMotion) { dispatch({ type: "COMPLETE_EVENT", workflow, caseIndex, eventIndex }); return; }
      const timer = window.setTimeout(() => dispatch({ type: "TICK", workflow, caseIndex, eventIndex, amount: 2 }), TICK_MS);
      return () => window.clearTimeout(timer);
    }
    if (state.phase === "between-events") {
      const timer = window.setTimeout(() => dispatch({ type: "ADVANCE_EVENT", workflow, caseIndex, eventIndex }), BETWEEN_EVENT_MS);
      return () => window.clearTimeout(timer);
    }
  }, [state.caseIndex, state.eventIndex, state.phase, state.revealOffset, reduceMotion]);

  useEffect(() => {
    const key = `${state.caseIndex}:${state.eventIndex}`;
    if (previousEvent.current !== key) {
      previousEvent.current = key;
      if (typeof activeRef.current?.scrollIntoView === "function") {
        activeRef.current.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "nearest" });
      }
    }
  }, [state.caseIndex, state.eventIndex, reduceMotion]);

  return <main className="app-shell">
    <header className="topbar">
      <a className="brand" href="#top"><span>✣</span> Claude Code · Dynamic workflow</a>
      <span className="truth-chip">Scripted JSON demo · no live model</span>
    </header>

    <section className="hero" id="top">
      <p className="kicker">Adversarial review</p>
      <h1>Watch two agents challenge the work.</h1>
      <p>Every message is fixed in JSON. The interaction demonstrates the workflow—it does not run an AI model.</p>
    </section>

    <section className="chat-stage" aria-label="Two-agent review conversation">
      <div className="stage-header">
        <div><strong>{activeCase.repository}</strong><span>{activeCase.branch}</span></div>
        <div><span className="case-progress">Case {state.caseIndex + 1} of {workflow.cases.length}</span><span className="message-progress">{state.phase === "case-complete" ? "Case complete" : `Message ${state.eventIndex + 1} of ${activeCase.events.length}`}</span></div>
      </div>
      <h2 className="case-title">{activeCase.title}</h2>
      <div className="agent-row"><Agent actor="implementer" active={event?.actor === "implementer"} /><Agent actor="reviewer" active={event?.actor === "reviewer"} /></div>
      <div className="transcript">
        {activeCase.events.slice(0, state.eventIndex).map((past, index) => <div className={`event-summary-row event-summary-row--${past.actor}`} key={`${past.type}-${index}`}>
          <span>0{index + 1}</span><strong>{past.title}</strong><p>{past.summary}</p>
        </div>)}
        <div ref={activeRef}><ExpandedEvent event={event} visibleEvent={visibleEvent} typing={state.phase === "typing"} /></div>
      </div>
      <div className="controls" aria-label="Playback controls">
        <button onClick={() => dispatch({ type: "PREVIOUS_CASE", workflow })} disabled={state.caseIndex === 0}>← Previous case</button>
        <button onClick={() => dispatch({ type: "RESTART_CASE", workflow })}>Restart case</button>
        <button className="next-button" onClick={() => dispatch({ type: "NEXT_CASE", workflow })} disabled={state.caseIndex === workflow.cases.length - 1}>Next case →</button>
      </div>
      <p className="live-status" aria-live="polite">{state.phase === "case-complete" ? `${activeCase.title} complete.` : `Autoplaying ${event.title}.`}</p>
    </section>
    <footer><p>Scripted playback for explaining agent review.</p><span>JSON schema v3 · Local only</span></footer>
  </main>;
}

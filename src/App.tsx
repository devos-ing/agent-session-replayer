import { useState } from "react";
import { AgentSessionReplayer } from "agent-session-replayer";
import { parseAgentSessionContent } from "agent-session-replayer/schema";
import "agent-session-replayer/styles.css";
import "./styles.css";
import { initialReplayContent, initialReplayContentJson } from "./demo-content";
import { SchemaGuide } from "./SchemaGuide";

const GITHUB_URL = "https://github.com/devos-ing/agent-session-replayer";
const usageExample = `import {
  AgentSessionReplayer,
  type AgentSession,
  type AgentSessionReplayerProps,
} from "agent-session-replayer";
import "agent-session-replayer/styles.css";

export function ReplayExample({
  agents,
  cases,
}: Pick<AgentSessionReplayerProps, "agents"> & { cases: AgentSession[] }) {
  return <AgentSessionReplayer agents={agents} cases={cases} />;
}`;

export default function App() {
  const [draft, setDraft] = useState(initialReplayContentJson);
  const [appliedContent, setAppliedContent] = useState(initialReplayContent);
  const [applyRevision, setApplyRevision] = useState(0);
  const [editorError, setEditorError] = useState<string | null>(null);
  const [editorStatus, setEditorStatus] = useState("Example content is loaded.");

  function applyDraft() {
    try {
      const candidate: unknown = JSON.parse(draft);
      const next = parseAgentSessionContent(candidate);
      setAppliedContent(next);
      setEditorError(null);
      setEditorStatus("Preview updated from your JSON.");
      setApplyRevision((value) => value + 1);
    } catch (error) {
      setEditorError(error instanceof SyntaxError
        ? `Enter valid JSON: ${error.message}`
        : error instanceof Error ? error.message : "Replay content is invalid.");
    }
  }

  return <div className="app-shell">
    <header className="site-header">
      <a className="site-brand" href="#top">Agent Session Replayer</a>
      <nav aria-label="Primary navigation">
        <a href="#demo">Demo</a>
        <a href="#schema">JSON Schema</a>
        <a href="#usage">React usage</a>
        <a href={GITHUB_URL} target="_blank" rel="noreferrer noopener">GitHub</a>
      </nav>
    </header>

    <main id="top">
      <section className="hero" aria-labelledby="page-title">
        <p className="eyebrow">Embeddable React component</p>
        <h1 id="page-title">Replay agent sessions from JSON.</h1>
        <p className="hero-copy">
          Render fixed implementer/reviewer sessions from supplied data. The component does not run a model,
          invoke tools, execute code, or inspect a repository.
        </p>
        <div className="hero-actions">
          <a className="primary-link" href="#demo">Try your JSON</a>
          <a className="secondary-link" href={GITHUB_URL} target="_blank" rel="noreferrer noopener">
            View on GitHub
          </a>
        </div>
        <p className="truth-chip">Scripted playback · No live model is running</p>
      </section>

      <section className="landing-section" id="demo" aria-labelledby="demo-title">
        <div className="section-heading">
          <p className="eyebrow">Evaluate with your data</p>
          <h2 id="demo-title">Interactive demo</h2>
          <p>Drafts stay in this browser tab. Nothing is uploaded, submitted, or persisted.</p>
        </div>

        <div className="demo-grid">
          <div className="editor-panel">
            <label htmlFor="session-json">Session JSON</label>
            <p id="session-json-instructions">
              Edit package-ready <code>{`{ agents, cases }`}</code> content, then apply it explicitly.
            </p>
            <textarea
              id="session-json"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              aria-describedby="session-json-instructions editor-feedback"
              aria-invalid={editorError ? "true" : "false"}
              spellCheck="false"
            />
            <div className="editor-actions">
              <button type="button" onClick={applyDraft}>Apply JSON</button>
              {editorError
                ? <p id="editor-feedback" role="alert">{editorError}</p>
                : <p
                    id="editor-feedback"
                    role={editorStatus === "Preview updated from your JSON." ? "status" : undefined}
                    aria-live="polite"
                  >
                    {editorStatus}
                  </p>}
            </div>
          </div>

          <div className="preview-panel">
            <p className="preview-disclosure">
              Scripted preview · supplied data only · no live model or tool execution
            </p>
            <AgentSessionReplayer
              key={applyRevision}
              agents={appliedContent.agents}
              cases={appliedContent.cases}
              typingSpeed={110}
              eventDelayMs={500}
            />
          </div>
        </div>
      </section>

      <SchemaGuide />

      <section className="landing-section usage-section" id="usage" aria-labelledby="usage-title">
        <div className="section-heading">
          <p className="eyebrow">Adopt the component</p>
          <h2 id="usage-title">React usage</h2>
          <p>The stylesheet is precompiled. Consumers do not need Tailwind CSS.</p>
        </div>
        <div className="usage-grid">
          <div>
            <h3>Install</h3>
            <pre className="code-surface code-surface--compact"><code>bun add agent-session-replayer</code></pre>
          </div>
          <div>
            <h3>Render supplied sessions</h3>
            <pre className="code-surface" tabIndex={0}><code>{usageExample}</code></pre>
          </div>
        </div>
      </section>
    </main>

    <footer className="site-footer">
      <p>Powered by the DevOS team</p>
      <p>Scripted playback from supplied data. No live model is running.</p>
      <a href={GITHUB_URL} target="_blank" rel="noreferrer noopener">GitHub repository</a>
    </footer>
  </div>;
}

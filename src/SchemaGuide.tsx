import { useState } from "react";
import { agentSessionContentJsonSchema } from "agent-session-replayer/schema";
import {
  actorLiterals,
  blockKindLiterals,
  eventTypeLiterals,
  schemaGuideFieldGroups,
  schemaGuideQuickStart,
  schemaGuideReplayContentJson,
} from "./schema-guide-content";

const schemaJson = JSON.stringify(agentSessionContentJsonSchema, null, 2);

type CopyTarget = "schema" | "example";
type CopyFeedback = {
  target: CopyTarget;
  kind: "success" | "error";
  message: string;
} | null;

const guideLinks = [
  ["Quick start", "#schema-quick-start"],
  ["Complete replay document", "#schema-complete-example"],
  ["Field reference", "#schema-field-reference"],
  ["Validation and errors", "#schema-validation-errors"],
  ["ID uniqueness", "#schema-id-uniqueness"],
  ["Compatibility", "#schema-compatibility"],
] as const;

export function SchemaGuide() {
  const [copyFeedback, setCopyFeedback] = useState<CopyFeedback>(null);

  async function copyText(target: CopyTarget, value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopyFeedback({
        target,
        kind: "success",
        message: target === "schema" ? "Copied JSON Schema." : "Copied replay JSON.",
      });
    } catch {
      setCopyFeedback({
        target,
        kind: "error",
        message: target === "schema"
          ? "Copy failed. Select the schema and copy it manually."
          : "Copy failed. Select the replay JSON and copy it manually.",
      });
    }
  }

  function feedbackFor(target: CopyTarget) {
    if (copyFeedback?.target !== target) return null;
    return <p
      role={copyFeedback.kind === "success" ? "status" : "alert"}
      aria-live={copyFeedback.kind === "success" ? "polite" : "assertive"}
    >
      {copyFeedback.message}
    </p>;
  }

  return <section
    className="landing-section schema-section"
    id="schema"
    aria-labelledby="schema-title"
  >
    <div className="section-heading section-heading--split">
      <div>
        <p className="eyebrow">Validate before rendering</p>
        <h2 id="schema-title">JSON Schema</h2>
        <p>
          The runtime parser also enforces unique case IDs, event IDs within each case,
          and block IDs within each event.
        </p>
      </div>
      <div className="copy-action">
        <button type="button" onClick={() => copyText("schema", schemaJson)}>
          Copy JSON Schema
        </button>
        {feedbackFor("schema")}
      </div>
    </div>

    <pre className="code-surface" aria-label="Agent session content JSON Schema" tabIndex={0}>
      <code>{schemaJson}</code>
    </pre>

    <div className="schema-guide" aria-labelledby="schema-guide-title">
      <div className="schema-guide-intro">
        <p className="eyebrow">Detailed reference</p>
        <h3 id="schema-guide-title">Build and validate replay content</h3>
        <p>
          Parse unknown data before rendering. Parsing is synchronous, makes no network
          request, and returns typed content only after every runtime rule passes.
        </p>
      </div>

      <nav className="schema-guide-nav" aria-label="JSON Schema guide">
        <span>In this guide</span>
        {guideLinks.map(([label, href]) => <a key={href} href={href}>{label}</a>)}
      </nav>

      <div className="schema-guide-disclosures">
        <details id="schema-quick-start" className="schema-guide-disclosure" open>
          <summary>Quick start</summary>
          <div className="schema-guide-body">
            <p>
              Validate an <code>unknown</code> value with the public schema entry, then render
              the typed result. Invalid input throws before it reaches the replayer.
            </p>
            <pre className="code-surface" aria-label="Replay content parser example" tabIndex={0}>
              <code>{schemaGuideQuickStart}</code>
            </pre>
          </div>
        </details>

        <details id="schema-complete-example" className="schema-guide-disclosure">
          <summary>Complete replay document</summary>
          <div className="schema-guide-body">
            <p>
              This compact document is package-ready and includes IDs at every required scope.
            </p>
            <div className="schema-guide-copy-row">
              <button
                type="button"
                onClick={() => copyText("example", schemaGuideReplayContentJson)}
              >
                Copy replay JSON
              </button>
              {feedbackFor("example")}
            </div>
            <pre className="code-surface" aria-label="Complete replay JSON" tabIndex={0}>
              <code>{schemaGuideReplayContentJson}</code>
            </pre>
          </div>
        </details>

        <details id="schema-field-reference" className="schema-guide-disclosure">
          <summary>Field reference</summary>
          <div className="schema-guide-body schema-field-groups">
            {schemaGuideFieldGroups.map((group) => {
              const headingId = `schema-fields-${group.name.toLowerCase()}`;
              return <section key={group.name}>
                <h4 id={headingId}>{group.name}</h4>
                <p>{group.description}</p>
                <div className="schema-field-table-wrap">
                  <table className="schema-field-table" aria-labelledby={headingId}>
                    <thead><tr>
                      <th scope="col">Field</th>
                      <th scope="col">Type</th>
                      <th scope="col">Status</th>
                      <th scope="col">Rules</th>
                      <th scope="col">Purpose</th>
                    </tr></thead>
                    <tbody>{group.fields.map((field) => <tr key={field.field}>
                      <th scope="row" data-label="Field"><code>{field.field}</code></th>
                      <td data-label="Type"><code>{field.type}</code></td>
                      <td data-label="Status">{field.required}</td>
                      <td data-label="Rules">{field.rules}</td>
                      <td data-label="Purpose">{field.purpose}</td>
                    </tr>)}</tbody>
                  </table>
                </div>
              </section>;
            })}
            <section className="schema-enums" aria-labelledby="schema-enums-title">
              <h4 id="schema-enums-title">Enum literals</h4>
              <dl>
                <div><dt>Actors</dt><dd>{actorLiterals.join(" · ")}</dd></div>
                <div><dt>Event types</dt><dd>{eventTypeLiterals.join(" · ")}</dd></div>
                <div><dt>Block kinds</dt><dd>{blockKindLiterals.join(" · ")}</dd></div>
              </dl>
            </section>
          </div>
        </details>

        <details id="schema-validation-errors" className="schema-guide-disclosure">
          <summary>Validation and errors</summary>
          <div className="schema-guide-body">
            <ul>
              <li>Every object is strict; unknown keys are rejected.</li>
              <li>Required strings and supplied optional strings must be non-empty.</li>
              <li>Cases, events, and blocks must each contain at least one item.</li>
              <li>Invalid actor, event-type, and block-kind literals are rejected.</li>
              <li>
                Document-level issues use <code>$</code>; nested issues use paths such as{" "}
                <code>cases[0].events[0].blocks[0].content</code>.
              </li>
            </ul>
            <p>
              Catch <code>Replay content is invalid:</code> errors, show the useful path, and
              keep previously accepted content until another candidate parses successfully.
            </p>
          </div>
        </details>

        <details id="schema-id-uniqueness" className="schema-guide-disclosure">
          <summary>ID uniqueness</summary>
          <div className="schema-guide-body">
            <ul>
              <li>Case IDs are unique across <code>cases</code>.</li>
              <li>Event IDs are unique within each case.</li>
              <li>Block IDs are unique within each event.</li>
            </ul>
            <p>
              Draft 2020-12 describes these rules, but a generic JSON Schema validator cannot
              enforce uniqueness by an object's <code>id</code> property. The runtime parser is
              authoritative for all three scopes.
            </p>
          </div>
        </details>

        <details id="schema-compatibility" className="schema-guide-disclosure">
          <summary>Compatibility</summary>
          <div className="schema-guide-body">
            <p>
              <code>agentSessionContentJsonSchema</code> targets JSON Schema Draft 2020-12.
              Import the type, parser, and schema from <code>agent-session-replayer/schema</code>
              so validation stays aligned with the installed package.
            </p>
            <p>
              Validate persisted documents when reading them. The current document has no
              user-supplied version field; a future breaking contract requires a package version
              change and explicit migration guidance.
            </p>
          </div>
        </details>
      </div>

      <p className="schema-guide-truth">
        Replay content is display data. Parsing and previewing happen locally in browser memory;
        no model, tool, command, repository inspection, upload, or persistence is involved.
      </p>
    </div>
  </section>;
}

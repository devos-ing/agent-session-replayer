import type { AgentSessionContent } from "agent-session-replayer/schema";

export const actorLiterals = ["implementer", "reviewer"] as const;

export const eventTypeLiterals = [
  "task_received",
  "plan",
  "patch",
  "review_request",
  "review_start",
  "blocking_finding",
  "revision",
  "verification",
  "approval",
] as const;

export const blockKindLiterals = [
  "message",
  "code",
  "tool_call",
  "tool_output",
  "finding",
  "patch",
  "git_diff",
  "status",
  "result",
] as const;

export const schemaGuideReplayContent: AgentSessionContent = {
  agents: {
    implementer: {
      id: "implementer",
      name: "Claude",
      role: "Implementer",
      context: "the approved task and repository",
    },
    reviewer: {
      id: "reviewer",
      name: "Review agent",
      role: "Reviewer",
      context: "the supplied diff and acceptance criteria",
    },
  },
  cases: [{
    id: "session-refresh",
    title: "Fix session refresh",
    summary: "A deterministic implementation and review replay.",
    repository: "acme/web",
    branch: "fix/session-refresh",
    events: [{
      id: "task",
      type: "task_received",
      actor: "implementer",
      title: "Read the task",
      summary: "Confirm the requested refresh behavior.",
      blocks: [{
        id: "request",
        kind: "message",
        content: "Prevent duplicate refresh requests and add a regression test.",
      }],
    }, {
      id: "approval",
      type: "approval",
      actor: "reviewer",
      title: "Approve the change",
      summary: "The fix and regression coverage satisfy the task.",
      blocks: [{
        id: "result",
        kind: "result",
        title: "Review result",
        content: "Approved. The scripted replay is ready to present.",
      }],
    }],
  }],
};

export const schemaGuideReplayContentJson = JSON.stringify(
  schemaGuideReplayContent,
  null,
  2,
);

export const schemaGuideQuickStart = `import { AgentSessionReplayer } from "agent-session-replayer";
import {
  parseAgentSessionContent,
  type AgentSessionContent,
} from "agent-session-replayer/schema";
import "agent-session-replayer/styles.css";

const input: unknown = JSON.parse(source);
const content: AgentSessionContent = parseAgentSessionContent(input);

export function Replay() {
  return <AgentSessionReplayer agents={content.agents} cases={content.cases} />;
}`;

export interface SchemaGuideField {
  field: string;
  type: string;
  required: "Required" | "Optional";
  rules: string;
  purpose: string;
}

export interface SchemaGuideFieldGroup {
  name: string;
  description: string;
  fields: SchemaGuideField[];
}

export const schemaGuideFieldGroups: SchemaGuideFieldGroup[] = [{
  name: "AgentSessionContent",
  description: "The complete replay document accepted by the schema entry.",
  fields: [{
    field: "agents",
    type: 'Record<"implementer" | "reviewer", AgentIdentity>',
    required: "Required",
    rules: "Contains exactly the implementer and reviewer keys.",
    purpose: "Defines the two identities shown in the replay.",
  }, {
    field: "cases",
    type: "AgentSession[]",
    required: "Required",
    rules: "At least one case; case IDs are unique across the array.",
    purpose: "Provides the ordered sessions a visitor can replay.",
  }],
}, {
  name: "AgentIdentity",
  description: "One visible participant in the authored session.",
  fields: [{
    field: "id",
    type: "string",
    required: "Required",
    rules: "Non-empty.",
    purpose: "Stable identity key for the supplied agent.",
  }, {
    field: "name",
    type: "string",
    required: "Required",
    rules: "Non-empty.",
    purpose: "Visible display name.",
  }, {
    field: "role",
    type: "string",
    required: "Required",
    rules: "Non-empty.",
    purpose: "Visible responsibility label.",
  }, {
    field: "context",
    type: "string",
    required: "Required",
    rules: "Non-empty.",
    purpose: "Explains the authored working context shown in the frame.",
  }],
}, {
  name: "AgentSession",
  description: "One selectable replay case.",
  fields: [{
    field: "id",
    type: "string",
    required: "Required",
    rules: "Non-empty and unique across cases.",
    purpose: "Stable case identity.",
  }, {
    field: "title",
    type: "string",
    required: "Required",
    rules: "Non-empty.",
    purpose: "Primary visible case title.",
  }, {
    field: "summary",
    type: "string",
    required: "Required",
    rules: "Non-empty.",
    purpose: "Short explanation of the replayed case.",
  }, {
    field: "repository",
    type: "string",
    required: "Required",
    rules: "Non-empty.",
    purpose: "Display-only repository label; nothing is inspected.",
  }, {
    field: "branch",
    type: "string",
    required: "Required",
    rules: "Non-empty.",
    purpose: "Display-only branch label.",
  }, {
    field: "events",
    type: "AgentSessionEvent[]",
    required: "Required",
    rules: "At least one event; event IDs are unique within the case.",
    purpose: "Defines the deterministic event sequence.",
  }],
}, {
  name: "AgentSessionEvent",
  description: "One authored step in a case.",
  fields: [{
    field: "id",
    type: "string",
    required: "Required",
    rules: "Non-empty and unique within its case.",
    purpose: "Stable event identity.",
  }, {
    field: "type",
    type: "AgentEventType",
    required: "Required",
    rules: "Must be one documented event-type literal.",
    purpose: "Classifies the authored workflow step.",
  }, {
    field: "actor",
    type: '"implementer" | "reviewer"',
    required: "Required",
    rules: "Must match one of the two agent keys.",
    purpose: "Chooses the participant alignment and identity.",
  }, {
    field: "title",
    type: "string",
    required: "Required",
    rules: "Non-empty.",
    purpose: "Labels the expanded event and its disclosure control.",
  }, {
    field: "summary",
    type: "string",
    required: "Required",
    rules: "Non-empty.",
    purpose: "Explains the result when the event collapses.",
  }, {
    field: "blocks",
    type: "AgentSessionBlock[]",
    required: "Required",
    rules: "At least one block; block IDs are unique within the event.",
    purpose: "Contains the visible authored content.",
  }],
}, {
  name: "AgentSessionBlock",
  description: "One visible content block inside an event.",
  fields: [{
    field: "id",
    type: "string",
    required: "Required",
    rules: "Non-empty and unique within its event.",
    purpose: "Stable block identity.",
  }, {
    field: "kind",
    type: "AgentBlockKind",
    required: "Required",
    rules: "Must be one documented block-kind literal.",
    purpose: "Selects the semantic visual treatment.",
  }, {
    field: "title",
    type: "string",
    required: "Optional",
    rules: "Must be non-empty when supplied.",
    purpose: "Adds a compact visible block heading.",
  }, {
    field: "content",
    type: "string",
    required: "Required",
    rules: "Non-empty.",
    purpose: "Provides the text rendered by the block.",
  }, {
    field: "language",
    type: "string",
    required: "Optional",
    rules: "Must be non-empty when supplied.",
    purpose: "Labels the supplied code or diff language.",
  }],
}];

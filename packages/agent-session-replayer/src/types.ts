export type AgentActor = "implementer" | "reviewer";
export type AgentEventType = "task_received" | "plan" | "patch" | "review_request" | "review_start" | "blocking_finding" | "revision" | "verification" | "approval";
export type AgentBlockKind = "message" | "code" | "tool_call" | "tool_output" | "finding" | "patch" | "git_diff" | "status" | "result";

export interface AgentIdentity {
  id: string;
  name: string;
  role: string;
  context: string;
}

export interface AgentSessionBlock {
  id: string;
  kind: AgentBlockKind;
  title?: string;
  content: string;
  language?: string;
}

export interface AgentSessionEvent {
  id: string;
  type: AgentEventType;
  actor: AgentActor;
  title: string;
  summary: string;
  blocks: AgentSessionBlock[];
}

export interface AgentSession {
  id: string;
  title: string;
  summary: string;
  repository: string;
  branch: string;
  events: AgentSessionEvent[];
}

export interface AgentSessionColors {
  background?: string;
  surface?: string;
  border?: string;
  text?: string;
  muted?: string;
  implementer?: string;
  reviewer?: string;
  success?: string;
  danger?: string;
  focus?: string;
}

export interface AgentSessionReplayerProps {
  agents: Record<AgentActor, AgentIdentity>;
  cases: AgentSession[];
  typingSpeed?: number;
  eventDelayMs?: number;
  height?: number;
  colors?: AgentSessionColors;
  caseIndex?: number;
  initialCaseIndex?: number;
  className?: string;
  onCaseChange?: (caseIndex: number, item: AgentSession) => void;
  onEventStart?: (event: AgentSessionEvent, item: AgentSession) => void;
  onEventComplete?: (event: AgentSessionEvent, item: AgentSession) => void;
  onCaseComplete?: (item: AgentSession) => void;
}

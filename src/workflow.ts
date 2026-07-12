import { z } from "zod";

const eventTypes = ["task_received", "plan", "patch", "review_request", "review_start", "blocking_finding", "revision", "verification", "approval"] as const;
const eventActors = ["implementer", "implementer", "implementer", "implementer", "reviewer", "reviewer", "implementer", "reviewer", "reviewer"] as const;
const blockKinds = ["message", "code", "tool_call", "tool_output", "finding", "patch", "status", "result"] as const;

const blockSchema = z.object({
  kind: z.enum(blockKinds),
  title: z.string().min(1).optional(),
  content: z.string().min(1),
  language: z.string().min(1).optional(),
}).strict();
const agentSchema = z.object({ name: z.string().min(1), role: z.string().min(1), context: z.string().min(1) }).strict();
const eventSchema = z.object({
  type: z.enum(eventTypes), actor: z.enum(["implementer", "reviewer"]), title: z.string().min(1),
  summary: z.string().min(1), blocks: z.array(blockSchema).min(1),
}).strict();
const workflowSchema = z.object({
  version: z.literal(2), title: z.string().min(1), repository: z.string().min(1), branch: z.string().min(1),
  agents: z.object({ implementer: agentSchema, reviewer: agentSchema }).strict(),
  events: z.array(eventSchema).length(9),
}).strict().superRefine((workflow, context) => workflow.events.forEach((event, index) => {
  if (event.type !== eventTypes[index]) context.addIssue({ code: "custom", path: ["events", index, "type"], message: `Event ${index + 1} must be ${eventTypes[index]}` });
  if (event.actor !== eventActors[index]) context.addIssue({ code: "custom", path: ["events", index, "actor"], message: `Event ${index + 1} must use actor ${eventActors[index]}` });
}));

export type Workflow = z.infer<typeof workflowSchema>;
export type WorkflowEvent = Workflow["events"][number];
export type WorkflowBlock = WorkflowEvent["blocks"][number];
export type PlaybackState = { cursor: number; revealOffset: number; phase: "idle" | "typing" | "complete" };
export type PlaybackAction =
  | { type: "NEXT"; workflow: Workflow }
  | { type: "PREVIOUS"; workflow: Workflow }
  | { type: "RESTART"; workflow: Workflow }
  | { type: "TICK"; workflow: Workflow; cursor: number; amount: number };

export function parseWorkflow(source: string): Workflow {
  let value: unknown;
  try { value = JSON.parse(source); } catch { throw new Error("The bundled workflow is not valid JSON."); }
  const parsed = workflowSchema.safeParse(value);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    throw new Error(`${issue.message}${issue.path.length ? ` at ${issue.path.join(".")}` : ""}.`);
  }
  return parsed.data;
}

export function segmentGraphemes(value: string): string[] {
  if (typeof Intl.Segmenter === "function") return [...new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(value)].map(({ segment }) => segment);
  return Array.from(value);
}

export function getEventText(event: WorkflowEvent): string {
  return event.blocks.map((block) => `${block.title ? `${block.title}\n` : ""}${block.content}`).join("\n");
}
const eventLength = (workflow: Workflow, cursor: number) => segmentGraphemes(getEventText(workflow.events[cursor])).length;
export const createPlaybackState = (): PlaybackState => ({ cursor: -1, revealOffset: 0, phase: "idle" });

export function playbackReducer(state: PlaybackState, action: PlaybackAction): PlaybackState {
  if (action.type === "RESTART") return createPlaybackState();
  if (action.type === "PREVIOUS") {
    if (state.cursor <= 0) return createPlaybackState();
    const cursor = state.cursor - 1;
    return { cursor, revealOffset: eventLength(action.workflow, cursor), phase: "complete" };
  }
  if (action.type === "NEXT") {
    if (state.phase === "typing") return { ...state, revealOffset: eventLength(action.workflow, state.cursor), phase: "complete" };
    if (state.cursor >= action.workflow.events.length - 1) return state;
    return { cursor: state.cursor + 1, revealOffset: 0, phase: "typing" };
  }
  if (action.cursor !== state.cursor || state.phase !== "typing") return state;
  const length = eventLength(action.workflow, state.cursor);
  const revealOffset = Math.min(length, state.revealOffset + action.amount);
  return { ...state, revealOffset, phase: revealOffset >= length ? "complete" : "typing" };
}

export function revealEvent(event: WorkflowEvent, offset: number): WorkflowEvent {
  let remaining = offset;
  const blocks: WorkflowBlock[] = [];

  for (const block of event.blocks) {
    if (remaining <= 0) break;

    const title = block.title ?? "";
    const titleParts = segmentGraphemes(title);
    const shownTitle = titleParts.slice(0, remaining).join("");
    remaining = Math.max(0, remaining - titleParts.length - (title ? 1 : 0));
    const contentParts = segmentGraphemes(block.content);
    const content = contentParts.slice(0, remaining).join("");
    remaining = Math.max(0, remaining - contentParts.length - 1);
    blocks.push({ ...block, title: block.title ? shownTitle : undefined, content });
  }

  return { ...event, blocks };
}

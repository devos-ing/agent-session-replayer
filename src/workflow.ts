import { z } from "zod";

const eventTypes = ["task_received", "plan", "patch", "review_request", "review_start", "blocking_finding", "revision", "verification", "approval"] as const;
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
const caseSchema = z.object({
  id: z.string().min(1), title: z.string().min(1), summary: z.string().min(1),
  repository: z.string().min(1), branch: z.string().min(1), events: z.array(eventSchema).min(1),
}).strict();
const workflowSchema = z.object({
  version: z.literal(3), title: z.string().min(1),
  agents: z.object({ implementer: agentSchema, reviewer: agentSchema }).strict(),
  cases: z.array(caseSchema).length(3),
}).strict().superRefine((workflow, context) => {
  const ids = workflow.cases.map((item) => item.id);
  if (new Set(ids).size !== ids.length) context.addIssue({ code: "custom", path: ["cases"], message: "Case ids must be unique" });
});

export type Workflow = z.infer<typeof workflowSchema>;
export type DemoCase = Workflow["cases"][number];
export type WorkflowEvent = DemoCase["events"][number];
export type WorkflowBlock = WorkflowEvent["blocks"][number];

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
export const getEventLength = (event: WorkflowEvent): number => segmentGraphemes(getEventText(event)).length;

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

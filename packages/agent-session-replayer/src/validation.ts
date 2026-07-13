import { z } from "zod";
import type { AgentSessionContent, AgentSessionReplayerProps } from "./types";

const nonEmpty = z.string().min(1);
const actorSchema = z.enum(["implementer", "reviewer"]);
const eventTypeSchema = z.enum([
  "task_received", "plan", "patch", "review_request", "review_start",
  "blocking_finding", "revision", "verification", "approval",
]);
const blockKindSchema = z.enum([
  "message", "code", "tool_call", "tool_output", "finding", "patch",
  "git_diff", "status", "result",
]);

const agentSchema = z.object({
  id: nonEmpty,
  name: nonEmpty,
  role: nonEmpty,
  context: nonEmpty,
}).strict();

const blockSchema = z.object({
  id: nonEmpty,
  kind: blockKindSchema,
  title: nonEmpty.optional(),
  content: nonEmpty,
  language: nonEmpty.optional(),
}).strict();

const eventSchema = z.object({
  id: nonEmpty,
  type: eventTypeSchema,
  actor: actorSchema,
  title: nonEmpty,
  summary: nonEmpty,
  blocks: z.array(blockSchema).min(1)
    .describe("Block IDs must be unique within each event. The runtime parser enforces this constraint."),
}).strict().superRefine((event, context) => {
  if (new Set(event.blocks.map(({ id }) => id)).size !== event.blocks.length) {
    context.addIssue({
      code: "custom",
      path: ["blocks"],
      message: "Block IDs must be unique within an event",
    });
  }
});

const sessionSchema = z.object({
  id: nonEmpty,
  title: nonEmpty,
  summary: nonEmpty,
  repository: nonEmpty,
  branch: nonEmpty,
  events: z.array(eventSchema).min(1)
    .describe("Event IDs must be unique within each case. The runtime parser enforces this constraint."),
}).strict().superRefine((session, context) => {
  if (new Set(session.events.map(({ id }) => id)).size !== session.events.length) {
    context.addIssue({
      code: "custom",
      path: ["events"],
      message: "Event IDs must be unique within a case",
    });
  }
});

const colorsSchema = z.object({
  background: z.string().optional(),
  surface: z.string().optional(),
  border: z.string().optional(),
  text: z.string().optional(),
  muted: z.string().optional(),
  implementer: z.string().optional(),
  reviewer: z.string().optional(),
  success: z.string().optional(),
  danger: z.string().optional(),
  focus: z.string().optional(),
}).strict();

const replayContentShape = {
  agents: z.object({ implementer: agentSchema, reviewer: agentSchema }).strict(),
  cases: z.array(sessionSchema).min(1)
    .describe("Case IDs must be unique across this array. The runtime parser enforces this constraint."),
};

function addReplayContentIssues(
  value: { cases: Array<{ id: string }> },
  context: z.RefinementCtx,
) {
  if (new Set(value.cases.map(({ id }) => id)).size !== value.cases.length) {
    context.addIssue({ code: "custom", path: ["cases"], message: "Case IDs must be unique" });
  }
}

export const replayContentSchema = z.object(replayContentShape)
  .strict()
  .superRefine(addReplayContentIssues);

const propsSchema = z.object({
  ...replayContentShape,
  typingSpeed: z.number().finite().positive(),
  eventDelayMs: z.number().finite().nonnegative(),
  height: z.number({ error: "height must be greater than zero." })
    .refine((value) => Number.isFinite(value) && value > 0, "height must be greater than zero."),
  colors: colorsSchema.optional(),
  caseIndex: z.number().int().nonnegative().optional(),
  initialCaseIndex: z.number().int().nonnegative(),
  className: z.string().optional(),
  onCaseChange: z.function().optional(),
  onEventStart: z.function().optional(),
  onEventComplete: z.function().optional(),
  onCaseComplete: z.function().optional(),
}).strict().superRefine((props, context) => {
  addReplayContentIssues(props, context);

  for (const key of ["caseIndex", "initialCaseIndex"] as const) {
    const value = props[key];
    if (value !== undefined && value >= props.cases.length) {
      context.addIssue({
        code: "custom",
        path: [key],
        message: `${key} must reference an available case`,
      });
    }
  }
});

type ParsedProps = AgentSessionReplayerProps & Required<Pick<AgentSessionReplayerProps,
  "typingSpeed" | "eventDelayMs" | "height" | "initialCaseIndex"
>>;

function formatPath(path: PropertyKey[]): string {
  const formatted = path.reduce<string>((result, part) => (
    typeof part === "number"
      ? `${result}[${part}]`
      : result ? `${result}.${String(part)}` : String(part)
  ), "");

  return formatted || "$";
}

export function parseReplayerProps(value: unknown): ParsedProps {
  const result = propsSchema.safeParse(value);
  if (result.success) return result.data as ParsedProps;

  const details = result.error.issues
    .map((issue) => `${formatPath(issue.path)}: ${issue.message}`)
    .join("; ");
  throw new Error(`AgentSessionReplayer received invalid props: ${details}`);
}

export function parseAgentSessionContent(value: unknown): AgentSessionContent {
  const result = replayContentSchema.safeParse(value);
  if (result.success) return result.data as AgentSessionContent;

  const details = result.error.issues
    .map((issue) => `${formatPath(issue.path)}: ${issue.message}`)
    .join("; ");
  throw new Error(`Replay content is invalid: ${details}`);
}

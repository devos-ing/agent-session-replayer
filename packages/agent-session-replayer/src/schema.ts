import { z } from "zod";
import type { AgentSessionContent } from "./types";
import { parseAgentSessionContent, replayContentSchema } from "./validation";

export type { AgentSessionContent };
export { parseAgentSessionContent };

export const agentSessionContentJsonSchema = z.toJSONSchema(replayContentSchema, {
  target: "draft-2020-12",
  reused: "ref",
});

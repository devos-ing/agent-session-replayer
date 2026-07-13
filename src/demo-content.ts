import type { AgentSessionContent } from "agent-session-replayer/schema";
import type { AgentSession } from "agent-session-replayer";
import demo from "./data/demo.json";

const agents: AgentSessionContent["agents"] = {
  implementer: { id: "implementer", ...demo.agents.implementer },
  reviewer: { id: "reviewer", ...demo.agents.reviewer },
};

const cases: AgentSession[] = demo.cases.map((item) => ({
  ...item,
  events: item.events.map((event, eventIndex) => ({
    ...event,
    id: `${item.id}-event-${eventIndex + 1}`,
    blocks: event.blocks.map((block, blockIndex) => ({
      ...block,
      id: `${item.id}-event-${eventIndex + 1}-block-${blockIndex + 1}`,
    })),
  })) as AgentSession["events"],
}));

export const initialReplayContent: AgentSessionContent = { agents, cases };
export const initialReplayContentJson = JSON.stringify(initialReplayContent, null, 2);

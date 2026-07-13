import {
  AgentSessionReplayer,
  type AgentSession,
  type AgentSessionReplayerProps,
} from "agent-session-replayer";
import "agent-session-replayer/styles.css";
import demo from "./data/demo.json";

const agents: AgentSessionReplayerProps["agents"] = {
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

export default function App() {
  return <AgentSessionReplayer
    agents={agents}
    cases={cases}
    typingSpeed={110}
    eventDelayMs={500}
  />;
}

import { describe, expect, it } from "vitest";
import {
  initialPlaybackState,
  playbackReducer,
} from "../packages/agent-session-replayer/src/playback";
import type { AgentSession } from "agent-session-replayer";

const item: AgentSession = {
  id: "collapse-case",
  title: "Collapse case",
  summary: "Exercises collapse state",
  repository: "acme/demo",
  branch: "feat/collapse",
  events: ["first", "final"].map((id) => ({
    id,
    type: "task_received",
    actor: "implementer",
    title: id,
    summary: `${id} summary`,
    blocks: [{ id: `${id}-block`, kind: "message", content: id }],
  })),
};

describe("package playback collapse phase", () => {
  it("requires a matching collapse completion before the inter-event pause", () => {
    const initial = initialPlaybackState();
    const collapsing = playbackReducer(initial, {
      type: "COMPLETE_EVENT",
      item,
      eventIndex: 0,
    });

    expect(collapsing).toMatchObject({ eventIndex: 0, phase: "collapsing" });
    expect(playbackReducer(collapsing, {
      type: "ADVANCE_EVENT",
      eventIndex: 0,
    })).toEqual(collapsing);
    expect(playbackReducer(collapsing, {
      type: "FINISH_COLLAPSE",
      eventIndex: 1,
    })).toEqual(collapsing);

    const betweenEvents = playbackReducer(collapsing, {
      type: "FINISH_COLLAPSE",
      eventIndex: 0,
    });
    expect(betweenEvents).toMatchObject({ eventIndex: 0, phase: "between-events" });
    expect(playbackReducer(betweenEvents, {
      type: "FINISH_COLLAPSE",
      eventIndex: 0,
    })).toEqual(betweenEvents);
    expect(playbackReducer(betweenEvents, {
      type: "ADVANCE_EVENT",
      eventIndex: 0,
    })).toMatchObject({ eventIndex: 1, revealOffset: 0, phase: "typing" });
  });

  it("keeps the final event expanded at case completion", () => {
    const finalState = {
      eventIndex: 1,
      revealOffset: 0,
      phase: "typing" as const,
    };

    expect(playbackReducer(finalState, {
      type: "COMPLETE_EVENT",
      item,
      eventIndex: 1,
    })).toMatchObject({ eventIndex: 1, phase: "case-complete" });
  });
});

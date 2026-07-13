import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  AgentSessionReplayer,
  type AgentSession,
  type AgentSessionReplayerProps,
} from "agent-session-replayer";

const agents: AgentSessionReplayerProps["agents"] = {
  implementer: { id: "impl", name: "Claude", role: "implementer", context: "the repository" },
  reviewer: { id: "review", name: "Claude", role: "reviewer", context: "the diff" },
};

const cases: AgentSession[] = [{
  id: "case-1",
  title: "Fix checkout",
  summary: "Implement and review the fix",
  repository: "acme/shop",
  branch: "fix/checkout",
  events: [{
    id: "event-1",
    type: "task_received",
    actor: "implementer",
    title: "Task received",
    summary: "Read the request",
    blocks: [{ id: "block-1", kind: "message", content: "Inspect checkout." }],
  }],
}];

const renderReplayer = (overrides: Partial<AgentSessionReplayerProps> = {}) =>
  render(<AgentSessionReplayer agents={agents} cases={cases} {...overrides} />);

describe("published component validation", () => {
  it.each([
    ["agent name", { agents: { ...agents, implementer: { ...agents.implementer, name: "" } } }, /agents\.implementer\.name/i],
    ["case events", { cases: [{ ...cases[0]!, events: [] }] }, /cases\[0\]\.events/i],
    ["event type", { cases: [{ ...cases[0]!, events: [{ ...cases[0]!.events[0]!, type: "unknown" }] }] }, /cases\[0\]\.events\[0\]\.type/i],
    ["block kind", { cases: [{ ...cases[0]!, events: [{ ...cases[0]!.events[0]!, blocks: [{ ...cases[0]!.events[0]!.blocks[0]!, kind: "unknown" }] }] }] }, /blocks\[0\]\.kind/i],
    ["block content", { cases: [{ ...cases[0]!, events: [{ ...cases[0]!.events[0]!, blocks: [{ ...cases[0]!.events[0]!.blocks[0]!, content: "" }] }] }] }, /blocks\[0\]\.content/i],
  ])("rejects invalid %s", (_label, overrides, path) => {
    expect(() => renderReplayer(overrides as Partial<AgentSessionReplayerProps>))
      .toThrow(new RegExp(`AgentSessionReplayer received invalid props:.*${path.source}`, "i"));
  });

  it("rejects duplicate IDs at each nesting scope", () => {
    expect(() => renderReplayer({ cases: [cases[0]!, { ...cases[0]! }] })).toThrow(/case ids.*unique/i);

    const duplicateEvents = { ...cases[0]!, events: [
      cases[0]!.events[0]!,
      { ...cases[0]!.events[0]!, id: "event-1", blocks: [{ ...cases[0]!.events[0]!.blocks[0]!, id: "other" }] },
    ] };
    expect(() => renderReplayer({ cases: [duplicateEvents] })).toThrow(/event ids.*unique/i);

    const event = cases[0]!.events[0]!;
    const duplicateBlocks = { ...cases[0]!, events: [{
      ...event,
      blocks: [event.blocks[0]!, { ...event.blocks[0]! }],
    }] };
    expect(() => renderReplayer({ cases: [duplicateBlocks] })).toThrow(/block ids.*unique/i);
  });

  it.each([
    ["top-level props", { unexpected: true }, /unrecognized/i],
    ["agents", { agents: { ...agents, unexpected: true } }, /agents.*unrecognized/i],
    ["cases", { cases: [{ ...cases[0]!, unexpected: true }] }, /cases\[0\].*unrecognized/i],
    ["events", { cases: [{ ...cases[0]!, events: [{ ...cases[0]!.events[0]!, unexpected: true }] }] }, /events\[0\].*unrecognized/i],
    ["blocks", { cases: [{ ...cases[0]!, events: [{ ...cases[0]!.events[0]!, blocks: [{ ...cases[0]!.events[0]!.blocks[0]!, unexpected: true }] }] }] }, /blocks\[0\].*unrecognized/i],
    ["colors", { colors: { unexpected: "#000" } }, /colors.*unrecognized/i],
  ])("rejects unknown %s fields", (_label, overrides, path) => {
    expect(() => renderReplayer(overrides as Partial<AgentSessionReplayerProps>)).toThrow(path);
  });

  it.each([
    ["typingSpeed", 0],
    ["typingSpeed", Number.POSITIVE_INFINITY],
    ["eventDelayMs", -1],
    ["height", Number.NaN],
    ["caseIndex", 1.5],
    ["initialCaseIndex", 1],
  ])("rejects invalid %s", (name, value) => {
    expect(() => renderReplayer({ [name]: value })).toThrow(new RegExp(name, "i"));
  });

  it("rejects invalid colors received from JavaScript", () => {
    expect(() => renderReplayer({ colors: { reviewer: 42 } } as unknown as Partial<AgentSessionReplayerProps>)).toThrow(/colors\.reviewer/i);
  });

  it.each(["onCaseChange", "onEventStart", "onEventComplete", "onCaseComplete"] as const)("rejects a non-function %s callback", (name) => {
    expect(() => renderReplayer({ [name]: "later" } as unknown as Partial<AgentSessionReplayerProps>)).toThrow(new RegExp(name, "i"));
  });

  it("accepts the complete valid optional prop surface", () => {
    expect(() => renderReplayer({
      typingSpeed: 120,
      eventDelayMs: 0,
      height: 640,
      colors: { background: "#000", focus: "#fff" },
      initialCaseIndex: 0,
      className: "demo",
      onCaseChange: vi.fn(),
      onEventStart: vi.fn(),
      onEventComplete: vi.fn(),
      onCaseComplete: vi.fn(),
    })).not.toThrow();
  });

  it("applies documented defaults when optional numeric props are explicitly undefined", () => {
    expect(() => renderReplayer({
      typingSpeed: undefined,
      eventDelayMs: undefined,
      height: undefined,
      initialCaseIndex: undefined,
    })).not.toThrow();
  });
});

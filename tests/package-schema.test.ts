import { describe, expect, it } from "vitest";
import {
  agentSessionContentJsonSchema,
  parseAgentSessionContent,
  type AgentSessionContent,
} from "agent-session-replayer/schema";

const validContent: AgentSessionContent = {
  agents: {
    implementer: {
      id: "implementer",
      name: "Claude",
      role: "implementer",
      context: "issue and repository",
    },
    reviewer: {
      id: "reviewer",
      name: "Claude",
      role: "reviewer",
      context: "diff only",
    },
  },
  cases: [{
    id: "case-1",
    title: "Session refresh",
    summary: "Review a refresh race",
    repository: "acme/web",
    branch: "fix/refresh",
    events: [{
      id: "event-1",
      type: "task_received",
      actor: "implementer",
      title: "Task received",
      summary: "Fix the race",
      blocks: [{
        id: "block-1",
        kind: "message",
        content: "I will inspect the refresh path.",
      }],
    }],
  }],
};

describe("replay content schema entry", () => {
  it("parses a package-ready replay content document", () => {
    expect(parseAgentSessionContent(validContent)).toEqual(validContent);
  });

  it("exports a strict Draft 2020-12 structural schema", () => {
    expect(agentSessionContentJsonSchema.$schema).toBe("https://json-schema.org/draft/2020-12/schema");
    expect(agentSessionContentJsonSchema.required).toEqual(["agents", "cases"]);
    expect(agentSessionContentJsonSchema.additionalProperties).toBe(false);
  });

  it.each([
    ["unknown top-level keys", { ...validContent, unexpected: true }, /\$: unrecognized key: "unexpected"/i],
    ["empty required strings", {
      ...validContent,
      cases: [{ ...validContent.cases[0]!, title: "" }],
    }, /cases\[0\]\.title/i],
    ["unsupported event enums", {
      ...validContent,
      cases: [{
        ...validContent.cases[0]!,
        events: [{ ...validContent.cases[0]!.events[0]!, type: "unknown" }],
      }],
    }, /cases\[0\]\.events\[0\]\.type/i],
    ["empty case arrays", { ...validContent, cases: [] }, /cases/i],
    ["empty event arrays", {
      ...validContent,
      cases: [{ ...validContent.cases[0]!, events: [] }],
    }, /cases\[0\]\.events/i],
    ["empty block arrays", {
      ...validContent,
      cases: [{
        ...validContent.cases[0]!,
        events: [{ ...validContent.cases[0]!.events[0]!, blocks: [] }],
      }],
    }, /cases\[0\]\.events\[0\]\.blocks/i],
  ])("rejects %s with a useful path", (_label, candidate, path) => {
    expect(() => parseAgentSessionContent(candidate)).toThrow(path);
  });

  it("rejects duplicate IDs at every documented scope", () => {
    expect(() => parseAgentSessionContent({
      ...validContent,
      cases: [validContent.cases[0]!, { ...validContent.cases[0]! }],
    })).toThrow(/cases: case ids must be unique/i);

    const event = validContent.cases[0]!.events[0]!;
    expect(() => parseAgentSessionContent({
      ...validContent,
      cases: [{
        ...validContent.cases[0]!,
        events: [event, { ...event, blocks: [{ ...event.blocks[0]!, id: "block-2" }] }],
      }],
    })).toThrow(/cases\[0\]\.events: event ids must be unique/i);

    expect(() => parseAgentSessionContent({
      ...validContent,
      cases: [{
        ...validContent.cases[0]!,
        events: [{ ...event, blocks: [event.blocks[0]!, { ...event.blocks[0]! }] }],
      }],
    })).toThrow(/cases\[0\]\.events\[0\]\.blocks: block ids must be unique/i);
  });

  it("describes strict objects, minimums, enums, and runtime-only uniqueness", () => {
    const schemaText = JSON.stringify(agentSessionContentJsonSchema);
    const strictObjectCount = schemaText.match(/"additionalProperties":false/g)?.length ?? 0;

    expect(schemaText).toContain('"minLength":1');
    expect(schemaText).toContain('"minItems":1');
    expect(schemaText).toContain('"task_received"');
    expect(schemaText).toContain('"approval"');
    expect(schemaText).toContain('"tool_output"');
    expect(schemaText).toContain('"implementer"');
    expect(strictObjectCount).toBeGreaterThanOrEqual(6);
    expect(schemaText).toContain("Case IDs must be unique across this array");
    expect(schemaText).toContain("Event IDs must be unique within each case");
    expect(schemaText).toContain("Block IDs must be unique within each event");
    expect(schemaText.match(/The runtime parser enforces this constraint/g)).toHaveLength(3);
  });
});

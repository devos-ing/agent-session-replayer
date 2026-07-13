import { describe, expect, it } from "vitest";
import {
  agentSessionContentJsonSchema,
  parseAgentSessionContent,
} from "agent-session-replayer/schema";
import {
  actorLiterals,
  blockKindLiterals,
  eventTypeLiterals,
  schemaGuideFieldGroups,
  schemaGuideReplayContent,
  schemaGuideReplayContentJson,
} from "../src/schema-guide-content";

describe("schema guide content", () => {
  it("ships a copyable replay document accepted by the public parser", () => {
    expect(parseAgentSessionContent(JSON.parse(schemaGuideReplayContentJson)))
      .toEqual(schemaGuideReplayContent);
  });

  it("documents every public actor, event type, and block kind", () => {
    const enumSets: string[][] = [];

    function collectEnumSets(value: unknown) {
      if (Array.isArray(value)) {
        value.forEach(collectEnumSets);
        return;
      }
      if (!value || typeof value !== "object") return;

      const record = value as Record<string, unknown>;
      if (Array.isArray(record.enum)) {
        enumSets.push(record.enum.map(String));
      }
      Object.values(record).forEach(collectEnumSets);
    }

    collectEnumSets(agentSessionContentJsonSchema);
    expect(enumSets).toEqual([
      [...eventTypeLiterals],
      [...actorLiterals],
      [...blockKindLiterals],
    ]);
  });

  it("contains a field group for every replay-content object", () => {
    expect(schemaGuideFieldGroups.map(({ name }) => name)).toEqual([
      "AgentSessionContent",
      "AgentIdentity",
      "AgentSession",
      "AgentSessionEvent",
      "AgentSessionBlock",
    ]);
    expect(schemaGuideFieldGroups.flatMap(({ fields }) => fields))
      .toEqual(expect.arrayContaining([
        expect.objectContaining({ field: "agents", required: "Required" }),
        expect.objectContaining({ field: "events", required: "Required" }),
        expect.objectContaining({ field: "language", required: "Optional" }),
      ]));
  });
});

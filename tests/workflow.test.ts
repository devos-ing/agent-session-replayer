import { describe, expect, it } from "vitest";
import demo from "../src/data/demo.json";
import { parseWorkflow, segmentGraphemes } from "../src/workflow";

describe("chat workflow boundary", () => {
  it("accepts exactly three variable-length cases", () => {
    const workflow = parseWorkflow(JSON.stringify(demo));
    expect(workflow.version).toBe(3);
    expect(workflow.cases.map((item) => item.id)).toEqual(["async-close", "negative-timestamp", "eager-default"]);
    expect(workflow.cases.map((item) => item.events.length)).toEqual([9, 4, 5]);
  });

  it("rejects duplicate case ids", () => {
    const source = structuredClone(demo);
    source.cases[1].id = source.cases[0].id;
    expect(() => parseWorkflow(JSON.stringify(source))).toThrow(/case ids/i);
  });

  it("rejects an empty case", () => {
    const source = structuredClone(demo) as unknown as { cases: Array<{ events: unknown[] }> };
    source.cases[2].events = [];
    expect(() => parseWorkflow(JSON.stringify(source))).toThrow(/events/i);
  });

  it("segments user-visible text by grapheme cluster", () => {
    expect(segmentGraphemes("Review 👩🏽‍💻 é")).toEqual(["R", "e", "v", "i", "e", "w", " ", "👩🏽‍💻", " ", "é"]);
  });
});

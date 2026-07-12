import { describe, expect, it } from "vitest";
import demo from "../src/data/demo.json";
import { autoplayReducer, createAutoplayState } from "../src/autoplay";
import { parseWorkflow } from "../src/workflow";

const workflow = parseWorkflow(JSON.stringify(demo));

describe("case autoplay", () => {
  it("starts case one automatically", () => expect(createAutoplayState()).toMatchObject({ caseIndex: 0, eventIndex: 0, phase: "typing" }));
  it("completes and advances an event", () => {
    const initial = createAutoplayState();
    const completed = autoplayReducer(initial, { type: "COMPLETE_EVENT", workflow, caseIndex: 0, eventIndex: 0 });
    expect(completed.phase).toBe("between-events");
    expect(autoplayReducer(completed, { type: "ADVANCE_EVENT", workflow, caseIndex: 0, eventIndex: 0 })).toMatchObject({ eventIndex: 1, phase: "typing", revealOffset: 0 });
  });
  it("interrupts a case and ignores stale work", () => {
    const next = autoplayReducer(createAutoplayState(), { type: "NEXT_CASE", workflow });
    expect(next).toMatchObject({ caseIndex: 1, eventIndex: 0 });
    expect(autoplayReducer(next, { type: "TICK", workflow, caseIndex: 0, eventIndex: 0, amount: 2 })).toEqual(next);
  });
  it("restarts, goes previous, and clamps boundaries", () => {
    const next = autoplayReducer(createAutoplayState(), { type: "NEXT_CASE", workflow });
    const progressed = { ...next, eventIndex: 2, revealOffset: 7 };
    expect(autoplayReducer(progressed, { type: "RESTART_CASE", workflow })).toEqual(next);
    expect(autoplayReducer(progressed, { type: "PREVIOUS_CASE", workflow })).toEqual(createAutoplayState());
    expect(autoplayReducer(createAutoplayState(), { type: "PREVIOUS_CASE", workflow })).toEqual(createAutoplayState());
  });
  it("completes and clamps the final case", () => {
    const state = { caseIndex: 2, eventIndex: 4, revealOffset: 0, phase: "typing" as const };
    const completed = autoplayReducer(state, { type: "COMPLETE_EVENT", workflow, caseIndex: 2, eventIndex: 4 });
    expect(completed.phase).toBe("case-complete");
    expect(autoplayReducer(completed, { type: "NEXT_CASE", workflow })).toEqual(completed);
  });
});

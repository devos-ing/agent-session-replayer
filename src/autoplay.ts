import { getEventLength, type Workflow } from "./workflow";

export type AutoplayState = { caseIndex: number; eventIndex: number; revealOffset: number; phase: "typing" | "between-events" | "case-complete" };
export type AutoplayAction =
  | { type: "TICK"; workflow: Workflow; caseIndex: number; eventIndex: number; amount: number }
  | { type: "COMPLETE_EVENT"; workflow: Workflow; caseIndex: number; eventIndex: number }
  | { type: "ADVANCE_EVENT"; workflow: Workflow; caseIndex: number; eventIndex: number }
  | { type: "NEXT_CASE" | "PREVIOUS_CASE" | "RESTART_CASE"; workflow: Workflow };

export const createAutoplayState = (): AutoplayState => ({ caseIndex: 0, eventIndex: 0, revealOffset: 0, phase: "typing" });
const startCase = (caseIndex: number): AutoplayState => ({ caseIndex, eventIndex: 0, revealOffset: 0, phase: "typing" });
const isStale = (state: AutoplayState, action: { caseIndex: number; eventIndex: number }) => action.caseIndex !== state.caseIndex || action.eventIndex !== state.eventIndex;
const activeEvent = (workflow: Workflow, state: AutoplayState) => workflow.cases[state.caseIndex]!.events[state.eventIndex]!;
const complete = (workflow: Workflow, state: AutoplayState): AutoplayState => ({
  ...state,
  revealOffset: getEventLength(activeEvent(workflow, state)),
  phase: state.eventIndex === workflow.cases[state.caseIndex]!.events.length - 1 ? "case-complete" : "between-events",
});

export function autoplayReducer(state: AutoplayState, action: AutoplayAction): AutoplayState {
  if (action.type === "NEXT_CASE") return state.caseIndex >= action.workflow.cases.length - 1 ? state : startCase(state.caseIndex + 1);
  if (action.type === "PREVIOUS_CASE") return state.caseIndex <= 0 ? state : startCase(state.caseIndex - 1);
  if (action.type === "RESTART_CASE") return startCase(state.caseIndex);
  if (!("caseIndex" in action)) return state;
  if (isStale(state, action)) return state;
  if (action.type === "ADVANCE_EVENT") {
    if (state.phase !== "between-events") return state;
    return { ...state, eventIndex: state.eventIndex + 1, revealOffset: 0, phase: "typing" };
  }
  if (state.phase !== "typing") return state;
  if (action.type === "COMPLETE_EVENT") return complete(action.workflow, state);
  const length = getEventLength(activeEvent(action.workflow, state));
  const revealOffset = Math.min(length, state.revealOffset + action.amount);
  return revealOffset >= length ? complete(action.workflow, { ...state, revealOffset }) : { ...state, revealOffset };
}

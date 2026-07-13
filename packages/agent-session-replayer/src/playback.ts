import type { AgentSession, AgentSessionEvent } from "./types";

export type PlaybackPhase = "typing" | "collapsing" | "between-events" | "case-complete";
export type PlaybackState = { eventIndex: number; revealOffset: number; phase: PlaybackPhase };
export const initialPlaybackState = (): PlaybackState => ({ eventIndex: 0, revealOffset: 0, phase: "typing" });

export const segmentGraphemes = (value: string): string[] => {
  if (typeof Intl.Segmenter === "function") return [...new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(value)].map(({ segment }) => segment);
  return Array.from(value);
};

export const getEventText = (event: AgentSessionEvent): string => event.blocks.map((block) => `${block.title ? `${block.title}\n` : ""}${block.content}`).join("\n");
export const getEventLength = (event: AgentSessionEvent): number => segmentGraphemes(getEventText(event)).length;

export const revealEvent = (event: AgentSessionEvent, offset: number): AgentSessionEvent => {
  let remaining = offset;
  const blocks = [];
  for (const block of event.blocks) {
    if (remaining <= 0) break;
    const titleParts = segmentGraphemes(block.title ?? "");
    const title = titleParts.slice(0, remaining).join("");
    remaining = Math.max(0, remaining - titleParts.length - (block.title ? 1 : 0));
    const contentParts = segmentGraphemes(block.content);
    const content = contentParts.slice(0, remaining).join("");
    remaining = Math.max(0, remaining - contentParts.length - 1);
    blocks.push({ ...block, title: block.title ? title : undefined, content });
  }
  return { ...event, blocks };
};

export type PlaybackAction =
  | { type: "TICK"; item: AgentSession; eventIndex: number; amount: number }
  | { type: "COMPLETE_EVENT"; item: AgentSession; eventIndex: number }
  | { type: "FINISH_COLLAPSE"; eventIndex: number }
  | { type: "ADVANCE_EVENT"; eventIndex: number }
  | { type: "RESTART" };

export function playbackReducer(state: PlaybackState, action: PlaybackAction): PlaybackState {
  if (action.type === "RESTART") return initialPlaybackState();
  if (action.eventIndex !== state.eventIndex) return state;
  if (action.type === "FINISH_COLLAPSE") return state.phase === "collapsing" ? { ...state, phase: "between-events" } : state;
  if (action.type === "ADVANCE_EVENT") return state.phase === "between-events" ? { eventIndex: state.eventIndex + 1, revealOffset: 0, phase: "typing" } : state;
  if (state.phase !== "typing") return state;
  const event = action.item.events[state.eventIndex]!;
  const length = getEventLength(event);
  const revealOffset = action.type === "COMPLETE_EVENT" ? length : Math.min(length, state.revealOffset + action.amount);
  if (revealOffset < length) return { ...state, revealOffset };
  return { ...state, revealOffset, phase: state.eventIndex === action.item.events.length - 1 ? "case-complete" : "collapsing" };
}

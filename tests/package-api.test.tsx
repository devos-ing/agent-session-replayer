import { StrictMode } from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  AgentSessionReplayer,
  type AgentSession,
  type AgentSessionBlock,
  type AgentSessionReplayerProps,
} from "agent-session-replayer";

const agents: AgentSessionReplayerProps["agents"] = {
  implementer: { id: "impl", name: "Claude", role: "implementer", context: "the repository" },
  reviewer: { id: "review", name: "Claude", role: "reviewer", context: "the diff only" },
};

const cases: AgentSession[] = ["one", "two"].map((id) => ({
  id,
  title: `Case ${id}`,
  summary: `Summary ${id}`,
  repository: "acme/demo",
  branch: `fix/${id}`,
  events: [{
    id: `${id}-event`,
    type: "task_received",
    actor: "implementer",
    title: `Event ${id}`,
    summary: `Event summary ${id}`,
    blocks: [{ id: `${id}-block`, kind: "message", content: `Message ${id}` }],
  }],
}));

const originalAnimate = HTMLElement.prototype.animate;
const originalMatchMedia = window.matchMedia;

function installAnimationMock() {
  const resolvers: Array<() => void> = [];
  const cancel = vi.fn();
  const animate = vi.fn(() => {
    let resolve!: () => void;
    const finished = new Promise<void>((done) => { resolve = done; });
    resolvers.push(resolve);
    return { cancel, finished } as unknown as Animation;
  });
  Object.defineProperty(HTMLElement.prototype, "animate", {
    configurable: true,
    value: animate,
  });
  return {
    animate,
    cancel,
    finish: async () => {
      resolvers.splice(0).forEach((resolve) => resolve());
      await Promise.resolve();
    },
  };
}

afterEach(() => {
  Object.defineProperty(HTMLElement.prototype, "animate", {
    configurable: true,
    value: originalAnimate,
  });
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: originalMatchMedia,
  });
  vi.useRealTimers();
});

const collapsingCases: AgentSession[] = [{
  ...cases[0]!,
  events: ["first", "second"].map((id) => ({
    ...cases[0]!.events[0]!,
    id,
    title: id,
    summary: `${id} summary`,
    blocks: [{ id: `${id}-block`, kind: "message", content: "a" }],
  })),
}, cases[1]!];

describe("published component API", () => {
  it("accepts and renders a git_diff block through the public API", () => {
    vi.useFakeTimers();
    const block: AgentSessionBlock = {
      id: "diff-block",
      kind: "git_diff",
      title: "src/app.ts",
      content: "--- a/src/app.ts\n+++ b/src/app.ts\n@@ -1 +1 @@\n-old\n+new",
    };
    const diffCases: AgentSession[] = [{
      ...cases[0]!,
      events: [{ ...cases[0]!.events[0]!, blocks: [block] }],
    }];

    const { container } = render(
      <AgentSessionReplayer agents={agents} cases={diffCases} typingSpeed={1000} />,
    );
    for (let index = 0; index < 250 && container.querySelector(".asr-git-diff code")?.textContent !== block.content; index += 1) {
      act(() => vi.runOnlyPendingTimers());
    }

    expect(container.querySelector(".asr-chat-block--git_diff")).toBeInTheDocument();
    expect(container.querySelectorAll(".asr-git-diff-line--metadata")).toHaveLength(2);
    expect(container.querySelector(".asr-git-diff-line--hunk")).toHaveTextContent("@@ -1 +1 @@");
    expect(container.querySelector(".asr-git-diff-line--addition")).toHaveTextContent("+new");
    expect(container.querySelector(".asr-git-diff-line--removal")).toHaveTextContent("-old");
  });

  it.each([
    ["message", "p"],
    ["code", "pre"],
    ["patch", "pre"],
    ["tool_output", "pre"],
  ] as const)("keeps %s blocks on their existing renderer", (kind, expectedTag) => {
    vi.useFakeTimers();
    const block: AgentSessionBlock = { id: `${kind}-block`, kind, content: `${kind} content` };
    const blockCases: AgentSession[] = [{
      ...cases[0]!,
      events: [{ ...cases[0]!.events[0]!, blocks: [block] }],
    }];

    const { container } = render(
      <AgentSessionReplayer agents={agents} cases={blockCases} typingSpeed={1000} />,
    );
    for (let index = 0; index < 250 && container.querySelector(`.asr-chat-block--${kind} > ${expectedTag}`)?.textContent !== `${kind} content`; index += 1) {
      act(() => vi.runOnlyPendingTimers());
    }

    expect(container.querySelector(`.asr-chat-block--${kind} > ${expectedTag}`)).toHaveTextContent(`${kind} content`);
  });

  it("finishes collapse before waiting and starting the next event", async () => {
    vi.useFakeTimers();
    const animation = installAnimationMock();
    const { container } = render(
      <AgentSessionReplayer
        agents={agents}
        cases={collapsingCases}
        typingSpeed={1000}
        eventDelayMs={50}
      />,
    );

    act(() => vi.advanceTimersByTime(1));
    expect(container.querySelector(".asr-collapse-shell")).toBeInTheDocument();
    expect(container.querySelector('.asr-collapse-summary[aria-hidden="true"]')).toBeInTheDocument();
    expect(screen.getByRole("article", { name: "first" })).toBeInTheDocument();
    expect(animation.animate).toHaveBeenCalledTimes(3);

    act(() => vi.advanceTimersByTime(500));
    expect(screen.queryByRole("article", { name: "second" })).not.toBeInTheDocument();

    await act(async () => animation.finish());
    expect(container.querySelector(".asr-collapse-shell")).not.toBeInTheDocument();
    expect(screen.queryByRole("article", { name: "second" })).not.toBeInTheDocument();

    act(() => vi.advanceTimersByTime(49));
    expect(screen.queryByRole("article", { name: "second" })).not.toBeInTheDocument();
    act(() => vi.advanceTimersByTime(1));
    expect(screen.getByRole("article", { name: "second" })).toBeInTheDocument();
  });

  it("cancels collapse animations when case navigation interrupts playback", () => {
    vi.useFakeTimers();
    const animation = installAnimationMock();
    render(
      <AgentSessionReplayer
        agents={agents}
        cases={collapsingCases}
        typingSpeed={1000}
      />,
    );

    act(() => vi.advanceTimersByTime(1));
    fireEvent.click(screen.getByRole("button", { name: /next case/i }));

    expect(animation.cancel).toHaveBeenCalledTimes(3);
    expect(screen.getByText(/case 2 of 2/i)).toBeInTheDocument();
    expect(screen.queryByText("first summary")).not.toBeInTheDocument();
  });

  it("skips collapse animation when reduced motion is requested", () => {
    vi.useFakeTimers();
    const animation = installAnimationMock();
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      value: vi.fn(() => ({
        matches: true,
        media: "(prefers-reduced-motion: reduce)",
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });

    render(
      <AgentSessionReplayer
        agents={agents}
        cases={collapsingCases}
        typingSpeed={1000}
        eventDelayMs={50}
      />,
    );
    act(() => vi.advanceTimersByTime(1));

    expect(animation.animate).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(50));
    expect(screen.getByRole("article", { name: "second" })).toBeInTheDocument();
  });

  it("skips collapse animation when the Web Animations API is unavailable", () => {
    vi.useFakeTimers();
    Object.defineProperty(HTMLElement.prototype, "animate", {
      configurable: true,
      value: undefined,
    });

    render(
      <AgentSessionReplayer
        agents={agents}
        cases={collapsingCases}
        typingSpeed={1000}
        eventDelayMs={50}
      />,
    );
    act(() => vi.advanceTimersByTime(1));
    expect(screen.queryByRole("article", { name: "second" })).not.toBeInTheDocument();
    act(() => vi.advanceTimersByTime(50));
    expect(screen.getByRole("article", { name: "second" })).toBeInTheDocument();
  });

  it("renders the reference workflow frame without the old marketing shell", () => {
    render(<AgentSessionReplayer agents={agents} cases={cases} />);
    expect(screen.queryByText(/watch two agents challenge the work/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/every message is fixed in data/i)).not.toBeInTheDocument();
    expect(screen.getByText(/claude code · dynamic workflow/i)).toBeInTheDocument();
    expect(screen.getByText(/^adversarial review$/i)).toBeInTheDocument();
    expect(screen.getByText(/2 bugs caught by adversarial review before merge/i)).toBeInTheDocument();
    expect(screen.getByText(/case 1 of 2/i)).toBeInTheDocument();
    const watermark = screen.getByRole("link", { name: /devos/i });
    expect(watermark).toHaveAttribute("href", "https://devos.ing");
    expect(watermark).toHaveAttribute("target", "_blank");
    expect(watermark).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("scrolls only an overflowing transcript to its newest reveal", () => {
    vi.useFakeTimers();
    const { container } = render(<AgentSessionReplayer agents={agents} cases={cases} typingSpeed={1000} />);
    const transcript = container.querySelector(".asr-transcript") as HTMLDivElement;
    Object.defineProperty(transcript, "clientHeight", { configurable: true, value: 100 });
    Object.defineProperty(transcript, "scrollHeight", { configurable: true, value: 300 });
    const scrollTo = vi.fn();
    transcript.scrollTo = scrollTo;
    act(() => vi.advanceTimersByTime(17));
    expect(scrollTo).toHaveBeenLastCalledWith({ top: 300, behavior: "smooth" });
    expect(transcript.scrollTop).toBe(300);
    transcript.scrollTop = 0;
    act(() => vi.advanceTimersByTime(17));
    expect(scrollTo).toHaveBeenCalledTimes(2);
    expect(transcript.scrollTop).toBe(300);
    vi.useRealTimers();
  });

  it("does not scroll a transcript that is not overflowing", () => {
    vi.useFakeTimers();
    const { container } = render(<AgentSessionReplayer agents={agents} cases={cases} typingSpeed={1000} />);
    const transcript = container.querySelector(".asr-transcript") as HTMLDivElement;
    Object.defineProperty(transcript, "clientHeight", { configurable: true, value: 300 });
    Object.defineProperty(transcript, "scrollHeight", { configurable: true, value: 300 });
    const scrollTo = vi.fn();
    transcript.scrollTo = scrollTo;
    act(() => vi.advanceTimersByTime(1));
    expect(scrollTo).not.toHaveBeenCalled();
    vi.useRealTimers();
  });

  it("server-renders without browser globals", () => {
    expect(() => renderToString(<AgentSessionReplayer agents={agents} cases={cases} />)).not.toThrow();
  });

  it("supports uncontrolled navigation and lifecycle callbacks", () => {
    vi.useFakeTimers();
    const onCaseChange = vi.fn();
    const onEventStart = vi.fn();
    const onEventComplete = vi.fn();
    const onCaseComplete = vi.fn();
    render(<AgentSessionReplayer agents={agents} cases={cases} typingSpeed={1000} eventDelayMs={1}
      onCaseChange={onCaseChange} onEventStart={onEventStart}
      onEventComplete={onEventComplete} onCaseComplete={onCaseComplete} />);
    for (let index = 0; index < 100 && onCaseComplete.mock.calls.length === 0; index += 1) {
      act(() => vi.runOnlyPendingTimers());
    }
    expect(onEventStart).toHaveBeenCalledTimes(1);
    expect(onEventComplete).toHaveBeenCalledTimes(1);
    expect(onCaseComplete).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole("button", { name: /next case/i }));
    expect(onCaseChange).toHaveBeenLastCalledWith(1, cases[1]);
    vi.useRealTimers();
  });

  it("requests controlled navigation without changing until the parent updates", () => {
    const onCaseChange = vi.fn();
    const { rerender } = render(<AgentSessionReplayer agents={agents} cases={cases} caseIndex={0} onCaseChange={onCaseChange} />);
    fireEvent.click(screen.getByRole("button", { name: /next case/i }));
    expect(onCaseChange).toHaveBeenCalledWith(1, cases[1]);
    expect(screen.getByText(/case 1 of 2/i)).toBeInTheDocument();
    rerender(<AgentSessionReplayer agents={agents} cases={cases} caseIndex={1} onCaseChange={onCaseChange} />);
    expect(screen.getByText(/case 2 of 2/i)).toBeInTheDocument();
    expect(onCaseChange).toHaveBeenCalledTimes(1);
  });

  it("maps color props to namespaced CSS variables", () => {
    const { container } = render(<AgentSessionReplayer agents={agents} cases={cases} colors={{ reviewer: "#123456" }} />);
    expect(container.firstElementChild).toHaveStyle({ "--asr-reviewer": "#123456" });
  });

  it("uses a 720px default player height", () => {
    const { container } = render(<AgentSessionReplayer agents={agents} cases={cases} />);
    expect(container.firstElementChild).toHaveStyle({ "--asr-height": "720px", height: "720px" });
  });

  it("maps a custom numeric player height to pixels", () => {
    const { container } = render(<AgentSessionReplayer agents={agents} cases={cases} height={560} />);
    expect(container.firstElementChild).toHaveStyle({ "--asr-height": "560px", height: "560px" });
  });

  it.each([0, -1, Number.POSITIVE_INFINITY, Number.NaN])("rejects invalid player height %s", (height) => {
    expect(() => render(<AgentSessionReplayer agents={agents} cases={cases} height={height} />)).toThrow(/height must be greater than zero/i);
  });

  it("does not duplicate lifecycle callbacks in Strict Mode and replays after restart", () => {
    vi.useFakeTimers();
    const onEventStart = vi.fn();
    const onEventComplete = vi.fn();
    render(<StrictMode><AgentSessionReplayer agents={agents} cases={[cases[0]!]} typingSpeed={1000}
      onEventStart={onEventStart} onEventComplete={onEventComplete} /></StrictMode>);
    for (let index = 0; index < 100 && onEventComplete.mock.calls.length === 0; index += 1) {
      act(() => vi.runOnlyPendingTimers());
    }
    expect(onEventStart).toHaveBeenCalledTimes(1);
    expect(onEventComplete).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole("button", { name: /restart case/i }));
    for (let index = 0; index < 100 && onEventComplete.mock.calls.length < 2; index += 1) {
      act(() => vi.runOnlyPendingTimers());
    }
    expect(onEventStart).toHaveBeenCalledTimes(2);
    expect(onEventComplete).toHaveBeenCalledTimes(2);
    vi.useRealTimers();
  });

  it("resets safely when a controlled parent selects a shorter case", () => {
    vi.useFakeTimers();
    const longCase = { ...cases[0]!, events: Array.from({ length: 3 }, (_, index) => ({
      ...cases[0]!.events[0]!, id: `long-${index}`, blocks: [{ ...cases[0]!.events[0]!.blocks[0]!, id: `long-block-${index}` }],
    })) };
    const { rerender } = render(<AgentSessionReplayer agents={agents} cases={[longCase, cases[1]!]} caseIndex={0} typingSpeed={1000} eventDelayMs={1} />);
    for (let index = 0; index < 500 && !screen.queryByText(/message 3 of 3/i); index += 1) {
      act(() => vi.runOnlyPendingTimers());
    }
    expect(screen.getByText(/message 3 of 3/i)).toBeInTheDocument();
    expect(() => rerender(<AgentSessionReplayer agents={agents} cases={[longCase, cases[1]!]} caseIndex={1} typingSpeed={1000} />)).not.toThrow();
    expect(screen.getByText(/message 1 of 1/i)).toBeInTheDocument();
    vi.useRealTimers();
  });

  it("fires event start once per run across uncontrolled next and previous navigation in Strict Mode", () => {
    const onEventStart = vi.fn();
    render(<StrictMode><AgentSessionReplayer agents={agents} cases={cases} onEventStart={onEventStart} /></StrictMode>);
    expect(onEventStart).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole("button", { name: /next case/i }));
    expect(onEventStart).toHaveBeenCalledTimes(2);
    fireEvent.click(screen.getByRole("button", { name: /previous case/i }));
    expect(onEventStart).toHaveBeenCalledTimes(3);
  });

  it("fires event start once per run across controlled next and previous navigation in Strict Mode", () => {
    const onEventStart = vi.fn();
    const { rerender } = render(<StrictMode><AgentSessionReplayer agents={agents} cases={cases} caseIndex={0} onEventStart={onEventStart} /></StrictMode>);
    expect(onEventStart).toHaveBeenCalledTimes(1);
    rerender(<StrictMode><AgentSessionReplayer agents={agents} cases={cases} caseIndex={1} onEventStart={onEventStart} /></StrictMode>);
    expect(onEventStart).toHaveBeenCalledTimes(2);
    rerender(<StrictMode><AgentSessionReplayer agents={agents} cases={cases} caseIndex={0} onEventStart={onEventStart} /></StrictMode>);
    expect(onEventStart).toHaveBeenCalledTimes(3);
  });

  it("honors low and high typing speeds in graphemes per second", () => {
    vi.useFakeTimers();
    const timingCase = { ...cases[0]!, events: [{ ...cases[0]!.events[0]!, blocks: [{ ...cases[0]!.events[0]!.blocks[0]!, content: "abcdefghij" }] }] };
    const { container, rerender } = render(<AgentSessionReplayer agents={agents} cases={[timingCase]} typingSpeed={2} />);
    act(() => vi.advanceTimersByTime(499));
    expect(container.querySelector(".asr-chat-block")).not.toBeInTheDocument();
    act(() => vi.advanceTimersByTime(1));
    expect(container.querySelector(".asr-chat-block")?.textContent).toBe("a");
    rerender(<AgentSessionReplayer key="fast" agents={agents} cases={[timingCase]} typingSpeed={100} />);
    for (let index = 0; index < 5; index += 1) act(() => vi.advanceTimersByTime(10));
    expect(container.querySelector(".asr-chat-block")?.textContent).toBe("abcde");
    vi.useRealTimers();
  });
});

import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { agentSessionContentJsonSchema } from "agent-session-replayer/schema";
import App from "../src/App";

const initialClipboardDescriptor = Object.getOwnPropertyDescriptor(navigator, "clipboard");

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  if (initialClipboardDescriptor) {
    Object.defineProperty(navigator, "clipboard", initialClipboardDescriptor);
  } else {
    Reflect.deleteProperty(navigator, "clipboard");
  }
});

function setClipboard(writeText: (value: string) => Promise<void>) {
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: { writeText },
  });
}

function finishCurrentCase() {
  for (let index = 0; index < 5000 && !screen.queryByText(/case complete/i); index += 1) {
    act(() => vi.runOnlyPendingTimers());
  }
}

describe("case autoplay experience", () => {
  it("starts case one without a user click", () => {
    render(<App />);
    expect(screen.getByText(/case 1 of 3/i)).toBeInTheDocument();
    expect(screen.getByRole("article", { name: /task received/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^next$/i })).not.toBeInTheDocument();
  });

  it("autoplays every event and collapses completed messages", () => {
    vi.useFakeTimers();
    const { container } = render(<App />);
    for (let index = 0; index < 5000 && !screen.queryByText(/case complete/i); index += 1) {
      act(() => vi.runOnlyPendingTimers());
    }
    expect(container.querySelectorAll(".asr-event-summary-row")).toHaveLength(8);
    expect(screen.getByRole("article", { name: /approved/i })).toBeInTheDocument();
    expect(screen.getAllByText(/case complete/i).length).toBeGreaterThan(0);
  });

  it("expands and collapses completed events independently", () => {
    vi.useFakeTimers();
    render(<App />);
    finishCurrentCase();

    fireEvent.click(screen.getByRole("button", { name: /expand task received/i }));
    fireEvent.click(screen.getByRole("button", { name: /expand plan the fix/i }));

    expect(screen.getByRole("button", { name: /collapse task received/i })).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("button", { name: /collapse plan the fix/i })).toHaveAttribute("aria-expanded", "true");

    fireEvent.click(screen.getByRole("button", { name: /collapse task received/i }));
    expect(screen.getByRole("button", { name: /expand task received/i })).toHaveAttribute("aria-expanded", "false");
    expect(screen.getByRole("button", { name: /collapse plan the fix/i })).toHaveAttribute("aria-expanded", "true");
  });

  it("clears expanded completed events when restarting or changing cases", () => {
    vi.useFakeTimers();
    render(<App />);
    finishCurrentCase();
    fireEvent.click(screen.getByRole("button", { name: /expand task received/i }));

    fireEvent.click(screen.getByRole("button", { name: /restart case/i }));
    finishCurrentCase();
    expect(screen.getByRole("button", { name: /expand task received/i })).toHaveAttribute("aria-expanded", "false");

    fireEvent.click(screen.getByRole("button", { name: /next case/i }));
    expect(screen.queryByRole("button", { name: /collapse task received/i })).not.toBeInTheDocument();
  });

  it("renders the demo Git diff with semantic lines", () => {
    vi.useFakeTimers();
    const { container } = render(<App />);

    for (let index = 0; index < 5000 && !container.querySelector(".asr-git-diff code")?.textContent?.includes("+  refreshes.delete(id);"); index += 1) {
      act(() => vi.runOnlyPendingTimers());
    }

    const addition = Array.from(container.querySelectorAll(".asr-git-diff-line--addition"))
      .find((line) => line.textContent === "+  refreshes.delete(id);");
    const removal = Array.from(container.querySelectorAll(".asr-git-diff-line--removal"))
      .find((line) => line.textContent === "-refreshes.delete(id);");
    expect(container.querySelector(".asr-chat-block--git_diff")).toBeInTheDocument();
    expect(addition).toBeInTheDocument();
    expect(removal).toBeInTheDocument();
  });

  it("changes cases immediately and restarts from event one", () => {
    render(<App />);
    const next = screen.getByRole("button", { name: /next case/i });
    fireEvent.click(next);
    expect(screen.getByText(/case 2 of 3/i)).toBeInTheDocument();
    expect(screen.getByRole("article", { name: /normalize cache expiry/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /restart case/i }));
    expect(screen.getByRole("article", { name: /normalize cache expiry/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /previous case/i }));
    expect(screen.getByText(/case 1 of 3/i)).toBeInTheDocument();
  });

  it("clamps controls at the first and final cases", () => {
    render(<App />);
    expect(screen.getByRole("button", { name: /previous case/i })).toBeDisabled();
    const next = screen.getByRole("button", { name: /next case/i });
    fireEvent.click(next);
    fireEvent.click(next);
    expect(screen.getByText(/case 3 of 3/i)).toBeInTheDocument();
    expect(next).toBeDisabled();
  });

  it("does not mount future block rows", () => {
    vi.useFakeTimers();
    const { container } = render(<App />);
    expect(container.querySelectorAll(".asr-chat-block")).toHaveLength(0);
    act(() => vi.advanceTimersByTime(18));
    expect(container.querySelectorAll(".asr-chat-block")).toHaveLength(1);
    expect(container.querySelector(".asr-chat-block--status")).not.toBeInTheDocument();
  });
});

describe("interactive replay landing", () => {
  it("preserves the last valid replay when applying malformed JSON", () => {
    render(<App />);
    const editor = screen.getByLabelText("Session JSON");

    fireEvent.change(editor, { target: { value: "{" } });
    fireEvent.click(screen.getByRole("button", { name: "Apply JSON" }));

    expect(screen.getByRole("alert")).toHaveTextContent(/valid json/i);
    expect(screen.getByText(/case 1 of 3/i)).toBeInTheDocument();
    expect(editor).toHaveAttribute("aria-invalid", "true");
  });

  it("keeps draft edits isolated until Apply and remounts a valid preview at case zero", () => {
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: /next case/i }));
    expect(screen.getByText(/case 2 of 3/i)).toBeInTheDocument();

    const editor = screen.getByLabelText("Session JSON") as HTMLTextAreaElement;
    const candidate = JSON.parse(editor.value);
    candidate.cases[0].title = "A visitor supplied replay";
    fireEvent.change(editor, { target: { value: JSON.stringify(candidate, null, 2) } });

    expect(screen.queryByText("A visitor supplied replay")).not.toBeInTheDocument();
    expect(screen.getByText(/case 2 of 3/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Apply JSON" }));
    expect(screen.getByText("A visitor supplied replay")).toBeInTheDocument();
    expect(screen.getByText(/case 1 of 3/i)).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Preview updated from your JSON.");
  });

  it("reports a structural path, preserves the preview, and recovers after correction", () => {
    render(<App />);
    const editor = screen.getByLabelText("Session JSON") as HTMLTextAreaElement;
    const original = editor.value;
    const invalid = JSON.parse(original);
    invalid.cases[0].events[0].summary = "";

    fireEvent.change(editor, { target: { value: JSON.stringify(invalid, null, 2) } });
    fireEvent.click(screen.getByRole("button", { name: "Apply JSON" }));

    expect(screen.getByRole("alert")).toHaveTextContent(/cases\[0\]\.events\[0\]\.summary/i);
    expect(screen.getByText("The async close")).toBeInTheDocument();

    fireEvent.change(editor, { target: { value: original } });
    fireEvent.click(screen.getByRole("button", { name: "Apply JSON" }));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(editor).toHaveAttribute("aria-invalid", "false");
  });

  it("reports the document root for an unknown top-level key", () => {
    render(<App />);
    const editor = screen.getByLabelText("Session JSON") as HTMLTextAreaElement;
    const candidate = JSON.parse(editor.value);
    candidate.unexpected = true;

    fireEvent.change(editor, { target: { value: JSON.stringify(candidate, null, 2) } });
    fireEvent.click(screen.getByRole("button", { name: "Apply JSON" }));

    expect(screen.getByRole("alert")).toHaveTextContent(
      'Replay content is invalid: $: Unrecognized key: "unexpected"',
    );
    expect(screen.getByText(/case 1 of 3/i)).toBeInTheDocument();
  });

  it("presents the schema, React usage, GitHub destination, and DevOS attribution", () => {
    render(<App />);

    expect(screen.getByRole("heading", { name: "JSON Schema" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "React usage" })).toBeInTheDocument();
    expect(screen.getByText("bun add agent-session-replayer")).toBeInTheDocument();
    expect(screen.getByText(/import "agent-session-replayer\/styles\.css"/)).toBeInTheDocument();
    expect(screen.getByText(/runtime parser also enforces unique case ids/i)).toBeInTheDocument();
    expect(screen.getByText("Powered by the DevOS team")).toBeInTheDocument();

    const githubLinks = screen.getAllByRole("link", { name: /github/i });
    expect(githubLinks.length).toBeGreaterThanOrEqual(2);
    for (const link of githubLinks) {
      expect(link).toHaveAttribute("href", "https://github.com/devos-ing/agent-session-replayer");
      expect(link).toHaveAttribute("target", "_blank");
      expect(link).toHaveAttribute("rel", expect.stringContaining("noopener"));
    }
  });

  it("copies the exact canonical schema with perceivable success feedback", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    setClipboard(writeText);
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "Copy JSON Schema" }));

    await waitFor(() => expect(writeText).toHaveBeenCalledWith(
      JSON.stringify(agentSessionContentJsonSchema, null, 2),
    ));
    expect(screen.getByRole("status")).toHaveTextContent("Copied JSON Schema.");
  });

  it("offers a manual fallback when clipboard writing fails", async () => {
    setClipboard(vi.fn().mockRejectedValue(new Error("denied")));
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "Copy JSON Schema" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Copy failed. Select the schema and copy it manually.",
    );
  });

  it("keeps the page and editor semantics explicit", () => {
    render(<App />);
    const editor = screen.getByLabelText("Session JSON");

    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(editor).toHaveAttribute("aria-describedby", "session-json-instructions editor-feedback");
    expect(editor).toHaveAttribute("aria-invalid", "false");
    expect(screen.getByRole("region", { name: /interactive demo/i })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "JSON Schema" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "React usage" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Apply JSON" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Copy JSON Schema" })).toBeInTheDocument();
  });
});

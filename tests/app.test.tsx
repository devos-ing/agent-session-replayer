import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import App from "../src/App";

afterEach(() => vi.useRealTimers());

describe("chat playback experience", () => {
  it("begins with an untouched intro and reveals an event only after Next", () => {
    render(<App />);
    expect(screen.getByText(/press next to start/i)).toBeInTheDocument();
    expect(screen.queryByRole("article")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /^next$/i }));
    expect(screen.getByRole("article", { name: /task received/i })).toBeInTheDocument();
  });

  it("finishes typing without advancing, then advances on a separate press", () => {
    render(<App />);
    const next = screen.getByRole("button", { name: /^next$/i });
    fireEvent.click(next);
    expect(next).toHaveTextContent(/finish/i);
    fireEvent.click(next);
    expect(screen.getByRole("article", { name: /task received/i })).toBeInTheDocument();
    expect(screen.queryByRole("article", { name: /plan the fix/i })).not.toBeInTheDocument();
    fireEvent.click(next);
    expect(screen.getByRole("article", { name: /plan the fix/i })).toBeInTheDocument();
    expect(screen.getByText(/task received/i, { selector: ".event-summary-row *" })).toBeInTheDocument();
  });

  it("does not mount a later block before the reveal reaches its row", () => {
    vi.useFakeTimers();
    const { container } = render(<App />);

    fireEvent.click(screen.getByRole("button", { name: /^next$/i }));

    expect(container.querySelectorAll(".chat-block")).toHaveLength(0);

    act(() => vi.advanceTimersByTime(18));

    expect(container.querySelectorAll(".chat-block")).toHaveLength(1);
    expect(container.querySelector(".chat-block--message")).toBeInTheDocument();
    expect(container.querySelector(".chat-block--status")).not.toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: /finish current event/i }),
    );

    expect(container.querySelectorAll(".chat-block")).toHaveLength(2);
    expect(container.querySelector(".chat-block--status")).toBeInTheDocument();
    expect(
      screen.getByRole("article", { name: /task received/i }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("article", { name: /plan the fix/i }),
    ).not.toBeInTheDocument();
  });

  it("previous and restart reconstruct deterministic transcript state", () => {
    render(<App />);
    const next = screen.getByRole("button", { name: /^next$/i });
    fireEvent.click(next); fireEvent.click(next); fireEvent.click(next); fireEvent.click(next);
    fireEvent.click(screen.getByRole("button", { name: /previous/i }));
    expect(screen.getByRole("article", { name: /task received/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /restart/i }));
    expect(screen.getByText(/press next to start/i)).toBeInTheDocument();
  });

  it("ignores a stale scheduled tick after restart", () => {
    vi.useFakeTimers();
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: /^next$/i }));
    fireEvent.click(screen.getByRole("button", { name: /restart/i }));
    act(() => vi.runAllTimers());
    expect(screen.getByText(/press next to start/i)).toBeInTheDocument();
  });

  it("does not expose JSON import controls", () => {
    render(<App />);
    expect(screen.queryByRole("button", { name: /import json/i })).not.toBeInTheDocument();
    expect(screen.getByText(/scripted json demo/i)).toBeInTheDocument();
  });
});

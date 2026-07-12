import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import App from "../src/App";

afterEach(() => vi.useRealTimers());

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
    expect(container.querySelectorAll(".event-summary-row")).toHaveLength(8);
    expect(screen.getByRole("article", { name: /approved/i })).toBeInTheDocument();
    expect(screen.getAllByText(/case complete/i).length).toBeGreaterThan(0);
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
    expect(container.querySelectorAll(".chat-block")).toHaveLength(0);
    act(() => vi.advanceTimersByTime(18));
    expect(container.querySelectorAll(".chat-block")).toHaveLength(1);
    expect(container.querySelector(".chat-block--status")).not.toBeInTheDocument();
  });
});

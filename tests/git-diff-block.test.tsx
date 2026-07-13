import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  GitDiffBlock,
  classifyGitDiffLine,
} from "../packages/agent-session-replayer/src/GitDiffBlock";

describe("GitDiffBlock", () => {
  it.each([
    ["diff --git a/src/app.ts b/src/app.ts", "metadata"],
    ["index 1111111..2222222 100644", "metadata"],
    ["new file mode 100644", "metadata"],
    ["deleted file mode 100644", "metadata"],
    ["similarity index 96%", "metadata"],
    ["rename from src/old.ts", "metadata"],
    ["rename to src/new.ts", "metadata"],
    ["--- a/src/app.ts", "metadata"],
    ["+++ b/src/app.ts", "metadata"],
    ["@@ -1,2 +1,2 @@", "hunk"],
    ["+const enabled = true;", "addition"],
    ["-const enabled = false;", "removal"],
    ["\\ No newline at end of file", "metadata"],
    [" const stable = true;", "context"],
    ["", "context"],
  ] as const)("classifies %j as %s", (line, expected) => {
    expect(classifyGitDiffLine(line)).toBe(expected);
  });

  it("preserves exact text, whitespace, and trailing newline", () => {
    const content = "@@ -1 +1 @@\n-  old <script>\n+  new & safe\n";
    const { container } = render(<GitDiffBlock content={content} />);

    expect(container.querySelector("code")?.textContent).toBe(content);
    expect(container.querySelector("script")).not.toBeInTheDocument();
    expect(container.querySelectorAll(".asr-git-diff-line--hunk")).toHaveLength(1);
    expect(container.querySelectorAll(".asr-git-diff-line--removal")).toHaveLength(1);
    expect(container.querySelectorAll(".asr-git-diff-line--addition")).toHaveLength(1);
  });
});

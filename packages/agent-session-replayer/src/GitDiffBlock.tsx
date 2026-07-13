import { Fragment } from "react";

export type GitDiffLineKind =
  | "metadata"
  | "hunk"
  | "addition"
  | "removal"
  | "context";

const METADATA_PREFIXES = [
  "diff --git ",
  "index ",
  "new file mode ",
  "deleted file mode ",
  "similarity index ",
  "rename from ",
  "rename to ",
  "--- ",
  "+++ ",
  "\\ No newline at end of file",
] as const;

export function classifyGitDiffLine(line: string): GitDiffLineKind {
  if (METADATA_PREFIXES.some((prefix) => line.startsWith(prefix))) return "metadata";
  if (line.startsWith("@@")) return "hunk";
  if (line.startsWith("+")) return "addition";
  if (line.startsWith("-")) return "removal";
  return "context";
}

export function GitDiffBlock({ content }: { content: string }) {
  const lines = content.split("\n");

  return <pre className="asr-git-diff"><code>{lines.map((line, index) => {
    const kind = classifyGitDiffLine(line);
    return <Fragment key={index}>
      <span className={`asr-git-diff-line asr-git-diff-line--${kind}`}>{line}</span>
      {index < lines.length - 1 ? "\n" : null}
    </Fragment>;
  })}</code></pre>;
}

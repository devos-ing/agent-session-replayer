import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const workflow = readFileSync(`${process.cwd()}/.github/workflows/release.yml`, "utf8");

describe("package release workflow", () => {
  it("releases version tags through npm OIDC after the repository checks", () => {
    expect(workflow).toMatch(/on:\s*\n\s+push:\s*\n\s+tags:\s*\n\s+- ['\"]v\*['\"]/);
    expect(workflow).toMatch(/permissions:\s*\n\s+contents: read\s*\n\s+id-token: write/);
    expect(workflow).toContain("bun install --frozen-lockfile");
    expect(workflow).toContain("bun run typecheck");
    expect(workflow).toContain("bun run test");
    expect(workflow).toContain("bun run build");
    expect(workflow).toContain("bun run pack:package");
    expect(workflow).toContain("npm publish ./packages/agent-session-replayer --access public --provenance");
    expect(workflow).not.toContain("NPM_TOKEN");
  });
});

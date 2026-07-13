import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const packageJson = JSON.parse(readFileSync(`${root}/package.json`, "utf8")) as {
  packageManager?: string;
};
const replayerPackageJson = JSON.parse(
  readFileSync(`${root}/packages/agent-session-replayer/package.json`, "utf8"),
) as {
  files?: string[];
  exports?: Record<string, unknown>;
};
const readme = readFileSync(`${root}/packages/agent-session-replayer/README.md`, "utf8");

describe("Bun project contract", () => {
  it("declares Bun and keeps bun.lock as the lockfile", () => {
    expect(packageJson.packageManager).toBe("bun@1.3.8");
    expect(existsSync(`${root}/bun.lock`)).toBe(true);
    expect(existsSync(`${root}/package-lock.json`)).toBe(false);
    expect(existsSync(`${root}/yarn.lock`)).toBe(false);
    expect(existsSync(`${root}/pnpm-lock.yaml`)).toBe(false);
  });

  it("documents the Bun workflow", () => {
    expect(readme).toContain("bun install");
    expect(readme).toContain("bun run dev");
    expect(readme).toContain("bun run test");
    expect(readme).toContain("bun run typecheck");
    expect(readme).toContain("bun run build");
    expect(readme).toContain("bun run build:package");
  });

  it("publishes the replay content schema entry in every JavaScript module format", () => {
    expect(replayerPackageJson.exports?.["./schema"]).toEqual({
      types: "./dist/schema.d.ts",
      import: "./dist/schema.js",
      require: "./dist/schema.cjs",
    });
    expect(replayerPackageJson.files).toEqual(expect.arrayContaining(["dist", "README.md"]));
  });
});

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css = readFileSync(`${process.cwd()}/packages/agent-session-replayer/dist/styles.css`, "utf8");

describe("compiled package CSS isolation", () => {
  it("styles Git diff lines semantically without wrapping", () => {
    expect(css).toContain(".asr-chat-block .asr-git-diff{");
    const diffRule = css.match(/\.asr-git-diff\{([^}]*)\}/)?.[1];
    expect(diffRule).toMatch(/overflow-x:auto|overflow:auto hidden/);
    expect(diffRule).toContain("white-space:pre");
    expect(diffRule).toContain("overflow-wrap:normal");
    const lineRule = css.match(/\.asr-git-diff-line\{([^}]*)\}/)?.[1];
    expect(lineRule).toContain("display:block");
    expect(lineRule).toContain("width:max-content");
    expect(lineRule).toContain("min-width:100%");
    expect(css).toMatch(/\.asr-git-diff-line--addition\{[^}]*color:[^;}]+[^}]*background:/);
    expect(css).toMatch(/\.asr-git-diff-line--removal\{[^}]*color:[^;}]+[^}]*background:/);
    expect(css).toMatch(/\.asr-git-diff-line--hunk\{[^}]*color:[^;}]+[^}]*background:/);
    expect(css).toMatch(/\.asr-git-diff-line--metadata\{[^}]*color:/);
  });

  it("clips the measured collapse shell without broad transitions", () => {
    expect(css).toMatch(/\.asr-collapse-shell\{[^}]*position:relative[^}]*overflow:hidden/);
    const shellRule = css.match(/\.asr-collapse-shell\{([^}]*)\}/)?.[1];
    expect(shellRule).toContain("contain:layout paint");
    const summaryRule = css.match(/\.asr-collapse-summary\{([^}]*)\}/)?.[1];
    expect(summaryRule).toContain("position:absolute");
    expect(summaryRule).toContain("opacity:0");
    expect(css).not.toContain("transition:all");
  });

  it("uses the native system font stack without bundling Inter", () => {
    expect(css).toContain("font-family:system-ui,-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Oxygen,Ubuntu,Cantarell,Open Sans,Helvetica Neue,sans-serif");
    expect(css).not.toMatch(/Inter Variable|font-family:Inter/);
  });

  it("caps typography and compacts the case title stack", () => {
    const heroTitleRule = css.match(/\.asr-hero h1\{([^}]*)\}/)?.[1];
    expect(heroTitleRule).toContain("font-size:16px");
    expect(heroTitleRule).not.toContain("clamp(");

    const avatarRule = css.match(/\.asr-agent-avatar\{([^}]*)\}/)?.[1];
    expect(avatarRule).toContain("font-size:16px");

    const titleStackRule = css.match(/\.asr-case-nav>div:first-child\{([^}]*)\}/)?.[1];
    expect(titleStackRule).toContain("display:grid");
    expect(titleStackRule).toContain("gap:3px");

    const titleRule = css.match(/\.asr-case-title\{([^}]*)\}/)?.[1];
    expect(titleRule).toContain("margin:0");
    expect(titleRule).toContain("font:600 14px/1.3 ui-monospace,monospace");

    const navRules = [...css.matchAll(/\.asr-case-nav\{([^}]*)\}/g)].map((match) => match[1]);
    expect(navRules).toContainEqual(expect.stringContaining("padding:9px 48px 10px"));
    expect(navRules).toContainEqual(expect.stringContaining("padding:9px 16px 10px"));

    expect(css).not.toContain("font-size:18px");
    expect(css).not.toContain("font-size:clamp(");
  });

  it("does not emit Tailwind utilities, resets, or universal selectors", () => {
    expect(css).not.toMatch(/(^|[},])\s*\.(fixed|block|border)(?=[\s.{,:])/);
    expect(css).not.toMatch(/(^|[},])\s*\*(?=[\s,{.:#[])/);
    expect(css).not.toMatch(/(^|[},])\s*:(before|after)\b/);
    expect(css).not.toContain("--tw-");
  });

  it("roots the player layout and keeps the transcript as the scroll region", () => {
    expect(css).toContain("[data-agent-session-replayer]");
    expect(css).toMatch(/\[data-agent-session-replayer\]\{[^}]*height:var\(--asr-height\)/);
    expect(css).toMatch(/\.asr-chat-stage\{[^}]*height:100%/);
    expect(css).toMatch(/\.asr-transcript\{[^}]*min-height:0[^}]*overflow-y:auto/);
    expect(css).not.toContain("min-height:440px");
    expect(css).toMatch(/\[data-agent-session-replayer\]\{[^}]*min-width:0[^}]*max-width:100%/);
    expect(css).not.toContain("min-width:320px");
    expect(css).toMatch(/\[data-agent-session-replayer\]\{[^}]*border:1px solid var\(--asr-border\)[^}]*border-radius:22px/);
    expect(css).not.toMatch(/\.asr-chat-stage\{[^}]*border:/);
  });
});

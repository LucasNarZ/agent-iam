import { describe, expect, it } from "vitest";
import { normalizeGit } from "../../src/normalizers/git.js";
import { normalizeGh } from "../../src/normalizers/gh.js";

describe("command normalizers", () => {
  it("normalizes git commands", () => {
    expect(normalizeGit(["commit", "-m", "fix"]).canonical).toBe("git.commit");
    expect(normalizeGit(["remote", "-v"]).canonical).toBe("git.remote");
    expect(normalizeGit(["config", "--get", "remote.origin.url"]).canonical).toBe("git.config");
    expect(normalizeGit(["symbolic-ref", "--short", "HEAD"]).canonical).toBe("git.symbolic-ref");
    expect(normalizeGit(["-C", "/repo", "push", "origin", "main"]).canonical).toBe("git.push");
    expect(normalizeGit(["--git-dir=/repo/.git", "status"]).canonical).toBe("git.status");
    expect(normalizeGit(["-C"]).canonical).toBe("git.unknown");
  });

  it("normalizes gh commands", () => {
    expect(normalizeGh(["pr", "create", "--fill"]).canonical).toBe("github.pr.create");
    expect(normalizeGh(["--repo", "owner/repo", "pr", "merge", "42"]).canonical).toBe("github.pr.merge");
    expect(normalizeGh(["auth"]).canonical).toBe("github.auth");
    expect(normalizeGh([]).canonical).toBe("github.unknown");
  });
});

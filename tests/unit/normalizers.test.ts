import { describe, expect, it } from "vitest";
import { GitCliAdapter } from "../../src/adapters/git.js";
import { GithubCliAdapter } from "../../src/adapters/gh.js";

describe("command adapters", () => {
    it("normalizes git commands", () => {
        const gitAdapter = new GitCliAdapter();
        expect(gitAdapter.normalize(["commit", "-m", "fix"]).canonical).toBe(
            "git.commit",
        );
        expect(gitAdapter.normalize(["remote", "-v"]).canonical).toBe(
            "git.remote",
        );
        expect(
            gitAdapter.normalize(["config", "--get", "remote.origin.url"])
                .canonical,
        ).toBe("git.config");
        expect(
            gitAdapter.normalize(["symbolic-ref", "--short", "HEAD"]).canonical,
        ).toBe("git.symbolic-ref");
        expect(
            gitAdapter.normalize(["-C", "/repo", "push", "origin", "main"])
                .canonical,
        ).toBe("git.push");
        expect(
            gitAdapter.normalize(["--git-dir=/repo/.git", "status"]).canonical,
        ).toBe("git.status");
        expect(gitAdapter.normalize(["-C"]).canonical).toBe("git.unknown");
    });

    it("normalizes gh commands", () => {
        const ghAdapter = new GithubCliAdapter();
        expect(ghAdapter.normalize(["pr", "create", "--fill"]).canonical).toBe(
            "github.pr.create",
        );
        expect(
            ghAdapter.normalize(["--repo", "owner/repo", "pr", "merge", "42"])
                .canonical,
        ).toBe("github.pr.merge");
        expect(ghAdapter.normalize(["auth"]).canonical).toBe("github.auth");
        expect(ghAdapter.normalize([]).canonical).toBe("github.unknown");
    });
});

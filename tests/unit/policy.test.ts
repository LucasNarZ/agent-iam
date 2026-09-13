import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { normalizeGit } from "../../src/normalizers/git.js";
import { normalizeGh } from "../../src/normalizers/gh.js";
import { parsePolicy } from "../../src/policy/schema.js";
import { compilePolicy, escapePrologAtom } from "../../src/policy/compiler.js";
import { buildDecisionGoal, evaluatePolicy } from "../../src/policy/engine.js";

describe("policy schema", () => {
    it("parses exact allow and deny lists", () => {
        expect(parsePolicy("allow:\n  - git.commit\n")).toEqual({
            allow: ["git.commit"],
            deny: [],
        });
        expect(parsePolicy("deny:\n  - github.pr.merge\n")).toEqual({
            allow: [],
            deny: ["github.pr.merge"],
        });
    });

    it("rejects invalid policy shapes", () => {
        expect(() => parsePolicy("allow: git.commit\n")).toThrow(
            "Policy 'allow' must be an array",
        );
        expect(() => parsePolicy("allow:\n  - INVALID VALUE\n")).toThrow(
            "Invalid capability",
        );
    });
});

describe("policy compiler", () => {
    it("compiles rules and escapes atoms", () => {
        const program = compilePolicy({
            allow: ["git.commit"],
            deny: ["github.pr.merge"],
        });
        expect(program).toContain("allowed('git.commit').");
        expect(program).toContain("denied('github.pr.merge').");
        expect(program).toContain(
            "decision(Capability, deny) :- denied(Capability), !.",
        );
        expect(escapePrologAtom("a'b\\c")).toBe("a\\'b\\\\c");
    });
});

describe("policy engine", () => {
    it("delegates the final allow decision to decision/2", () => {
        expect(buildDecisionGoal("git.commit")).toBe(
            "decision('git.commit', Decision).",
        );
    });

    it("applies allow, deny precedence, and default deny", async () => {
        await expect(
            evaluatePolicy({ allow: ["git.commit"], deny: [] }, "git.commit"),
        ).resolves.toEqual({ decision: "ALLOW", reason: "matched allow rule" });
        await expect(
            evaluatePolicy({ allow: [], deny: ["git.push"] }, "git.push"),
        ).resolves.toEqual({ decision: "DENY", reason: "matched deny rule" });
        await expect(
            evaluatePolicy(
                { allow: ["git.push"], deny: ["git.push"] },
                "git.push",
            ),
        ).resolves.toEqual({ decision: "DENY", reason: "matched deny rule" });
        await expect(
            evaluatePolicy({ allow: [], deny: [] }, "git.status"),
        ).resolves.toEqual({
            decision: "DENY",
            reason: "no matching allow rule",
        });
    });

    it("allows gh pr view in the example policy", async () => {
        const source = await readFile(
            new URL("../../examples/policy.yaml", import.meta.url),
            "utf8",
        );
        const policy = parsePolicy(source);
        const command = normalizeGh(["pr", "view", "42"]);

        await expect(
            evaluatePolicy(policy, command.canonical),
        ).resolves.toEqual({ decision: "ALLOW", reason: "matched allow rule" });
    });

    it("allows configured git commands in the example policy", async () => {
        const source = await readFile(
            new URL("../../examples/policy.yaml", import.meta.url),
            "utf8",
        );
        const policy = parsePolicy(source);
        const commands = [
            normalizeGit(["remote", "-v"]),
            normalizeGit(["config", "--get", "remote.origin.url"]),
            normalizeGit(["symbolic-ref", "--short", "HEAD"]),
        ];

        for (const command of commands) {
            await expect(
                evaluatePolicy(policy, command.canonical),
            ).resolves.toEqual({
                decision: "ALLOW",
                reason: "matched allow rule",
            });
        }
    });
});

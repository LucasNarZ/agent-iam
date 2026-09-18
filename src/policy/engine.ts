import pl from "tau-prolog";
import type { CanonicalCapability } from "../capability.js";
import type { Policy } from "./schema.js";
import { compilePolicy, escapePrologAtom } from "./compiler.js";

export interface PolicyDecision {
    decision: "ALLOW" | "DENY";
    reason: string;
}

export class PolicyEngineError extends Error {}

type Session = ReturnType<typeof pl.create>;

function resourceTerms(capability: CanonicalCapability): string {
    const resources =
        capability.service === "github"
            ? capability.resources?.repository
                ? [
                      `resource(repos, '${escapePrologAtom(capability.resources.repository)}')`,
                  ]
                : []
            : [
                  ...(capability.resources?.paths ?? []).map(
                      (path) => `resource(paths, '${escapePrologAtom(path)}')`,
                  ),
                  ...(capability.resources?.branches ?? []).map(
                      (branch) =>
                          `resource(branches, '${escapePrologAtom(branch)}')`,
                  ),
              ];
    return `[${resources.join(", ")}]`;
}

export function buildDecisionGoal(capability: CanonicalCapability): string {
    return `decision('${escapePrologAtom(capability.canonical)}', ${resourceTerms(capability)}, Decision, Reason).`;
}

function consult(session: Session, program: string): Promise<void> {
    return new Promise((resolve, reject) => {
        session.consult(program, {
            success: () => resolve(),
            error: (error) => reject(new PolicyEngineError(String(error))),
        });
    });
}

function query(session: Session, goal: string): Promise<PolicyDecision> {
    return new Promise((resolve, reject) => {
        session.query(goal, {
            success: () =>
                session.answer({
                    success: (answer) => {
                        const formatted = session.format_answer(answer);
                        const match = formatted.match(
                            /Decision = (allow|deny), Reason = (.+)$/,
                        );
                        if (!match) {
                            reject(
                                new PolicyEngineError(
                                    `Unexpected Prolog answer: ${formatted}`,
                                ),
                            );
                            return;
                        }
                        resolve({
                            decision: match[1] === "allow" ? "ALLOW" : "DENY",
                            reason: match[2]!.trim(),
                        });
                    },
                    fail: () =>
                        reject(
                            new PolicyEngineError(
                                "Prolog returned no decision",
                            ),
                        ),
                    error: (error) =>
                        reject(new PolicyEngineError(String(error))),
                    limit: () =>
                        reject(
                            new PolicyEngineError(
                                "Prolog inference limit exceeded",
                            ),
                        ),
                }),
            error: (error) => reject(new PolicyEngineError(String(error))),
        });
    });
}

export class PolicyEngine {
    private readonly session = pl.create(1000);
    private readonly ready: Promise<void>;

    constructor(compiledFacts: string) {
        this.ready = consult(this.session, compiledFacts);
    }

    async evaluate(capability: CanonicalCapability): Promise<PolicyDecision> {
        await this.ready;
        return query(this.session, buildDecisionGoal(capability));
    }
}

export function evaluatePolicy(
    policy: Policy,
    capability: CanonicalCapability | string,
): Promise<PolicyDecision> {
    const normalized =
        typeof capability === "string"
            ? {
                  service: "git" as const,
                  action: "unknown",
                  canonical: capability,
              }
            : capability;
    return new PolicyEngine(compilePolicy(policy)).evaluate(normalized);
}

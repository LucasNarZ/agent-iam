import pl from "tau-prolog";
import type { Policy } from "./schema.js";
import { compilePolicy, escapePrologAtom } from "./compiler.js";

export interface PolicyDecision {
  decision: "ALLOW" | "DENY";
  reason: string;
}

export class PolicyEngineError extends Error {}

export function buildDecisionGoal(canonical: string): string {
  return `decision('${escapePrologAtom(canonical)}', Decision).`;
}

function runSession(program: string, goal: string): Promise<"ALLOW" | "DENY"> {
  return new Promise((resolve, reject) => {
    const session = pl.create(1000);
    session.consult(program, {
      success: () => session.query(goal, {
        success: () => session.answer({
          success: (answer) => {
            const formatted = session.format_answer(answer);
            const match = formatted.match(/Decision = (allow|deny)/);
            if (!match) {
              reject(new PolicyEngineError(`Unexpected Prolog answer: ${formatted}`));
              return;
            }
            resolve(match[1] === "allow" ? "ALLOW" : "DENY");
          },
          fail: () => reject(new PolicyEngineError("Prolog returned no decision")),
          error: (error) => reject(new PolicyEngineError(String(error))),
          limit: () => reject(new PolicyEngineError("Prolog inference limit exceeded")),
        }),
        error: (error) => reject(new PolicyEngineError(String(error))),
      }),
      error: (error) => reject(new PolicyEngineError(String(error))),
    });
  });
}

export async function evaluatePolicy(policy: Policy, canonical: string): Promise<PolicyDecision> {
  const program = compilePolicy(policy);
  const decision = await runSession(program, buildDecisionGoal(canonical));
  if (decision === "ALLOW") return { decision, reason: "matched allow rule" };
  if (policy.deny.includes(canonical)) return { decision: "DENY", reason: "matched deny rule" };
  return { decision: "DENY", reason: "no matching allow rule" };
}

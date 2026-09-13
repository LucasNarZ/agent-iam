import type { Policy } from "./schema.js";

export function escapePrologAtom(value: string): string {
    return value.replaceAll("\\", "\\\\").replaceAll("'", "\\'");
}

export function compilePolicy(policy: Policy): string {
    const allowed = policy.allow.map(
        (value) => `allowed('${escapePrologAtom(value)}').`,
    );
    const denied = policy.deny.map(
        (value) => `denied('${escapePrologAtom(value)}').`,
    );
    if (allowed.length === 0) allowed.push("allowed('__agentiam_never__').");
    if (denied.length === 0) denied.push("denied('__agentiam_never__').");
    return [
        ...allowed,
        ...denied,
        "decision(Capability, deny) :- denied(Capability), !.",
        "decision(Capability, allow) :- allowed(Capability), !.",
        "decision(_, deny).",
    ].join("\n");
}

import type { Policy } from "./schema.js";

export function escapePrologAtom(value: string): string {
    return value.replaceAll("\\", "\\\\").replaceAll("'", "\\'");
}

export function compilePolicy(policy: Policy): string {
    const allowed = Object.keys(policy.allow).map(
        (value) => `allowed('${escapePrologAtom(value)}').`,
    );
    const denied = Object.keys(policy.deny).map(
        (value) => `denied('${escapePrologAtom(value)}').`,
    );
    const constraints = (["allow", "deny"] as const).flatMap((kind) =>
        Object.entries(policy[kind]).flatMap(([capability, rule]) => {
            if (rule === true) return [];
            return Object.entries(rule).flatMap(([name, values]) =>
                values.map(
                    (value) =>
                        `rule_constraint(${kind}, '${escapePrologAtom(capability)}', ${name}, '${escapePrologAtom(value)}').`,
                ),
            );
        }),
    );
    if (allowed.length === 0) allowed.push("allowed('__agentiam_never__').");
    if (denied.length === 0) denied.push("denied('__agentiam_never__').");
    if (constraints.length === 0) {
        constraints.push(
            "rule_constraint(none, '__agentiam_never__', none, none).",
        );
    }
    return [
        ...allowed,
        ...denied,
        ...constraints,
        "rule_matches(Kind, Capability, _) :- \\+ rule_constraint(Kind, Capability, _, _), !.",
        "resource_member(Value, [Value|_]).",
        "resource_member(Value, [_|Tail]) :- resource_member(Value, Tail).",
        "constraint_matches(Kind, Capability, Constraint, Resources) :- resource_member(resource(Constraint, _), Resources), \\+ (resource_member(resource(Constraint, Value), Resources), \\+ rule_constraint(Kind, Capability, Constraint, Value)).",
        "rule_matches(Kind, Capability, Resources) :- \\+ (rule_constraint(Kind, Capability, Constraint, _), \\+ constraint_matches(Kind, Capability, Constraint, Resources)).",
        "decision(Capability, Resources, deny, 'matched deny rule') :- denied(Capability), rule_matches(deny, Capability, Resources), !.",
        "decision(Capability, Resources, allow, 'matched allow rule') :- allowed(Capability), rule_matches(allow, Capability, Resources), !.",
        "decision(_, _, deny, 'no matching allow rule').",
    ].join("\n");
}

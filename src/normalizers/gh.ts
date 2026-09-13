import { capability, type CanonicalCapability } from "../capability.js";

const valueOptions = new Set(["--repo", "-R", "--hostname"]);

export function normalizeGh(args: string[]): CanonicalCapability {
    const positional: string[] = [];
    let index = 0;
    while (index < args.length) {
        const token = args[index];
        if (!token) break;
        if (valueOptions.has(token)) {
            if (!args[index + 1]) return capability("github", "unknown");
            index += 2;
            continue;
        }
        if (token.startsWith("-")) {
            index += 1;
            continue;
        }
        positional.push(token);
        index += 1;
    }
    if (positional.length >= 2)
        return capability("github", positional[1]!, positional[0]);
    return capability("github", positional[0] ?? "unknown");
}

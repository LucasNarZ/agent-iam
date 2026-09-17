import { capability, type CanonicalCapability } from "../capability.js";
import { Adapter } from "./interfaces.js";

const valueOptions = new Set([
    "-C",
    "-c",
    "--git-dir",
    "--work-tree",
    "--namespace",
]);

export class GitCliAdapter implements Adapter {
    constructor() {}

    normalize(args: string[]): CanonicalCapability {
        let index = 0;
        while (index < args.length) {
            const token = args[index];
            if (!token) break;
            if (valueOptions.has(token)) {
                if (!args[index + 1]) return capability("git", "unknown");
                index += 2;
                continue;
            }
            if (
                [...valueOptions].some((option) =>
                    token.startsWith(`${option}=`),
                )
            ) {
                index += 1;
                continue;
            }
            if (token.startsWith("-")) {
                index += 1;
                continue;
            }
            return capability("git", token);
        }
        return capability("git", "unknown");
    }
}

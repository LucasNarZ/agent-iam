import { GithubCliAdapter } from "./gh";
import { GitCliAdapter } from "./git";
import type { CapabilityService } from "../capability.js";
import type { Adapter } from "./interfaces";

export const adapters: Record<string, Adapter<CapabilityService>> = {
    ghcli: new GithubCliAdapter(),
    gitcli: new GitCliAdapter(),
};

import { GithubCliAdapter } from "./gh";
import { GitCliAdapter } from "./git";
import { Adapter } from "./interfaces";

export const adapters: Record<string, Adapter> = {
    ghcli: new GithubCliAdapter(),
    gitcli: new GitCliAdapter(),
};

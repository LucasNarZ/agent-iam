import { homedir } from "node:os";
import { readFile } from "node:fs/promises";
import { parse } from "yaml";

export interface Policy {
  allow: string[];
  deny: string[];
}

export class PolicyError extends Error {}

const capabilityPattern = /^[a-z][a-z0-9_-]*(\.[a-z][a-z0-9_-]*)+$/;

export function resolvePolicyPath(env: NodeJS.ProcessEnv = process.env): string {
  return `${env.HOME ?? homedir()}/.agentiam/policy.yaml`;
}

export function parsePolicy(source: string): Policy {
  let value: unknown;
  try {
    value = parse(source) as unknown;
  } catch (error) {
    throw new PolicyError(`Invalid YAML: ${error instanceof Error ? error.message : String(error)}`);
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new PolicyError("Policy root must be an object");
  const root = value as Record<string, unknown>;
  for (const key of Object.keys(root)) {
    if (key !== "allow" && key !== "deny") throw new PolicyError(`Unknown policy key '${key}'`);
  }
  const readList = (key: "allow" | "deny"): string[] => {
    const entry = root[key];
    if (entry === undefined) return [];
    if (!Array.isArray(entry)) throw new PolicyError(`Policy '${key}' must be an array`);
    const result: string[] = [];
    for (const item of entry) {
      if (typeof item !== "string" || !capabilityPattern.test(item)) throw new PolicyError(`Invalid capability in '${key}'`);
      if (result.includes(item)) throw new PolicyError(`Duplicate capability '${item}' in '${key}'`);
      result.push(item);
    }
    return result;
  };
  return { allow: readList("allow"), deny: readList("deny") };
}

export async function loadPolicy(env: NodeJS.ProcessEnv = process.env): Promise<{ policy: Policy; path: string }> {
  const path = resolvePolicyPath(env);
  try {
    return { policy: parsePolicy(await readFile(path, "utf8")), path };
  } catch (error) {
    if (error instanceof PolicyError) throw new PolicyError(`${path}: ${error.message}`);
    throw new PolicyError(`${path}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

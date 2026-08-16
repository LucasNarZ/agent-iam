import { normalizeGit } from "./normalizers/git.js";
import { normalizeGh } from "./normalizers/gh.js";
import { resolvePolicyPath, loadPolicy } from "./policy/schema.js";
import { evaluatePolicy } from "./policy/engine.js";
import { appendAuditRecord, renderCommand } from "./audit.js";
import { resolveExecutable, spawnInherited } from "./process.js";

export interface ShimOptions {
  tool: "git" | "gh";
  args: string[];
  env: NodeJS.ProcessEnv;
  stdout?: NodeJS.WritableStream;
  stderr?: NodeJS.WritableStream;
}

function write(stream: NodeJS.WritableStream | undefined, message: string): void {
  (stream ?? process.stderr).write(`${message}\n`);
}

export async function runShim(options: ShimOptions): Promise<number> {
  const capability = options.tool === "git" ? normalizeGit(options.args) : normalizeGh(options.args);
  const policyPath = resolvePolicyPath(options.env);
  let decision: "ALLOW" | "DENY" = "DENY";
  let reason = "policy evaluation failed";
  try {
    const loaded = await loadPolicy(options.env);
    const result = await evaluatePolicy(loaded.policy, capability.canonical);
    decision = result.decision;
    reason = result.reason;
  } catch (error) {
    reason = error instanceof Error ? error.message : String(error);
  }
  const record = {
    timestamp: new Date().toISOString(),
    capability,
    decision,
    tool: options.tool,
    arguments: options.args,
    command: renderCommand(options.tool, options.args),
    policyPath,
    reason,
  } as const;
  try {
    await appendAuditRecord(record, options.env);
  } catch {
    write(options.stderr, `[agentiam] DENY ${capability.canonical} (audit log unavailable)`);
    return 126;
  }
  write(options.stderr, `[agentiam] ${decision} ${capability.canonical}`);
  if (decision === "DENY") return 126;
  try {
    const executable = await resolveExecutable(options.tool, options.env.AGENTIAM_ORIGINAL_PATH ?? options.env.PATH ?? "");
    const result = await spawnInherited(executable, options.args, options.env);
    return result.code ?? 128;
  } catch (error) {
    write(options.stderr, `[agentiam] ERROR ${error instanceof Error ? error.message : String(error)}`);
    return 127;
  }
}

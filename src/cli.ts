import { loadPolicy, resolvePolicyPath } from "./policy/schema.js";
import { runShim } from "./shim.js";
import { runWithShims } from "./runner.js";

interface Output {
  stdout: NodeJS.WritableStream;
  stderr: NodeJS.WritableStream;
}

export interface CliDependencies {
  env?: NodeJS.ProcessEnv;
  output?: Output;
  run?: typeof runWithShims;
  shim?: typeof runShim;
  resignal?: (signal: NodeJS.Signals) => void;
}

function usage(): string {
  return "Usage: agentiam run -- <command> [args...]\n       agentiam inspect";
}

export async function main(args: string[], dependencies: CliDependencies = {}): Promise<number> {
  const env = dependencies.env ?? process.env;
  const output = dependencies.output ?? { stdout: process.stdout, stderr: process.stderr };
  const run = dependencies.run ?? runWithShims;
  const shim = dependencies.shim ?? runShim;
  const resignal = dependencies.resignal ?? ((signal: NodeJS.Signals) => process.kill(process.pid, signal));
  const command = args[0];
  if (!command) {
    output.stderr.write(`${usage()}\n`);
    return 1;
  }
  if (command === "inspect") {
    if (args.length !== 1) {
      output.stderr.write("agentiam inspect does not accept arguments\n");
      return 1;
    }
    try {
      const { policy } = await loadPolicy(env);
      output.stdout.write(`Policy: ${resolvePolicyPath(env)}\nDefault: DENY\n\nALLOW\n${policy.allow.slice().sort().map((item) => `  ${item}`).join("\n")}\n\nDENY\n${policy.deny.slice().sort().map((item) => `  ${item}`).join("\n")}\n`);
      return 0;
    } catch (error) {
      output.stderr.write(`[agentiam] ERROR ${error instanceof Error ? error.message : String(error)}\n`);
      return 1;
    }
  }
  if (command === "run") {
    const separator = args.indexOf("--");
    if (separator < 0 || separator === args.length - 1) {
      output.stderr.write("agentiam run requires -- <command>\n");
      return 1;
    }
    const result = await run(args[separator + 1]!, args.slice(separator + 2), { env });
    if (result.signal) {
      resignal(result.signal);
      return 128;
    }
    return result.code ?? 1;
  }
  if (command === "__shim") {
    const tool = args[1];
    const separator = args.indexOf("--");
    if ((tool !== "git" && tool !== "gh") || separator < 0 || separator < 2) {
      output.stderr.write("Invalid internal shim invocation\n");
      return 1;
    }
    return shim({ tool, args: args.slice(separator + 1), env, stderr: output.stderr });
  }
  output.stderr.write(`${usage()}\n`);
  return 1;
}

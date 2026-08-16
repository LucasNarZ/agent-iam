import { chmod, mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { runShim } from "../../src/shim.js";

async function fakeTool(directory: string, tool: string): Promise<string> {
  const path = join(directory, tool);
  await writeFile(path, "#!/bin/sh\nprintf '%s\\n' \"$@\" > \"$AGENTIAM_TEST_OUTPUT\"\nexit 7\n");
  await chmod(path, 0o755);
  return path;
}

describe("command shim", () => {
  it("allows and executes the real binary with unchanged arguments", async () => {
    const home = await mkdtemp(join(tmpdir(), "agentiam-shim-home-"));
    const bin = await mkdtemp(join(tmpdir(), "agentiam-shim-bin-"));
    const output = join(home, "args.txt");
    await fakeTool(bin, "git");
    await mkdir(join(home, ".agentiam"));
    await writeFile(join(home, ".agentiam", "policy.yaml"), "allow:\n  - git.commit\n");
    const code = await runShim({
      tool: "git",
      args: ["commit", "-m", "message with spaces"],
      env: { HOME: home, PATH: bin, AGENTIAM_ORIGINAL_PATH: bin, AGENTIAM_TEST_OUTPUT: output },
    });
    expect(code).toBe(7);
    expect(await readFile(output, "utf8")).toBe("commit\n-m\nmessage with spaces\n");
  });

  it("denies without executing the real binary", async () => {
    const home = await mkdtemp(join(tmpdir(), "agentiam-shim-home-"));
    const bin = await mkdtemp(join(tmpdir(), "agentiam-shim-bin-"));
    const output = join(home, "args.txt");
    await fakeTool(bin, "gh");
    await mkdir(join(home, ".agentiam"));
    await writeFile(join(home, ".agentiam", "policy.yaml"), "deny:\n  - github.pr.merge\n");
    const code = await runShim({
      tool: "gh",
      args: ["pr", "merge", "42"],
      env: { HOME: home, PATH: bin, AGENTIAM_ORIGINAL_PATH: bin, AGENTIAM_TEST_OUTPUT: output },
    });
    expect(code).toBe(126);
    await expect(readFile(output, "utf8")).rejects.toThrow();
  });
});

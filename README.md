# Agentiam

Agentiam is a small, fail-closed authorization layer for AI-agent command execution.

The central idea is simple: interfaces change, capabilities do not. Whether an agent eventually uses a CLI, MCP, or HTTP adapter, an external action can be normalized into a canonical capability, evaluated by one policy engine, and written to one audit log.

## Why This Repository Exists

Agents increasingly execute actions outside their own process. A command such as `git commit` or `gh pr merge` can change source history, publish work, or affect a remote repository. Agentiam provides a transparent interception point that makes those actions explicit and policy-controlled without requiring a separate Prolog installation or a syscall sandbox.

## MVP Architecture

```text
Agent process
    |
    v
PATH shims for git and gh
    |
    v
Canonical capability normalizer
    |
    v
YAML policy -> embedded Tau Prolog
    |
    +--> ALLOW / DENY
    |        |
    |        +--> JSONL audit log
    |
    +--> real binary, only after ALLOW
```

The MVP supports POSIX systems such as Linux and macOS. It uses temporary executable wrappers and does not trace syscalls or provide physical sandboxing.

## Supported Capabilities

The first release intercepts `git` and `gh`:

| Command | Capability |
| --- | --- |
| `git commit` | `git.commit` |
| `git push` | `git.push` |
| `gh pr create` | `github.pr.create` |
| `gh pr merge` | `github.pr.merge` |

Unknown command structures are normalized deterministically and denied unless explicitly allowed.

## Requirements

- Node.js 20 or newer
- A POSIX shell
- `git` and/or `gh` installed when those tools are used

Tau Prolog runs embedded inside the Node.js process. No system Prolog installation is required.

## Installation

After publication, install globally or run directly with npx:

```bash
npm install --global agentiam
npx agentiam inspect
```

For local development:

```bash
npm install
npm run build
node dist/index.js inspect
```

## Policy

Agentiam reads only `~/.agentiam/policy.yaml` in the MVP. Create it with exact canonical capabilities:

```yaml
allow:
  - git.commit
  - github.pr.create
deny:
  - git.push
  - github.pr.merge
```

An explicit deny always wins over an allow. An unmatched capability is denied. Missing or invalid policy files are also denied.

The example policy is available at `examples/policy.yaml`.

## Commands

Run an agent inside the temporary shim environment:

```bash
agentiam run -- opencode
agentiam run -- sh -c 'git commit -m "fix"'
```

Inspect the current exact-match policy:

```bash
agentiam inspect
```

Example output from an intercepted session:

```text
[agentiam] ALLOW git.commit
[agentiam] DENY github.pr.merge
```

## Audit Log

Every authorization attempt is appended to `~/.agentiam/audit.jsonl`. If the audit entry cannot be written, the command is denied and the real binary is not executed.

Each line is a JSON object containing the timestamp, structured capability, decision, tool, original argument array, display command, policy path, and decision reason:

```json
{"timestamp":"2026-08-15T12:00:00.000Z","capability":{"service":"git","action":"commit","canonical":"git.commit"},"decision":"ALLOW","tool":"git","arguments":["commit","-m","fix"],"command":"git commit -m fix","policyPath":"/home/user/.agentiam/policy.yaml","reason":"matched allow rule"}
```

## Security Properties and Boundaries

- Unknown capabilities are denied by default.
- Explicit deny rules have precedence over allow rules.
- Invalid policy and policy-engine failures deny execution.
- Audit failures deny execution.
- Real binaries are resolved only from the original `PATH`, preventing wrapper recursion.
- Arguments are passed as an array and are not reconstructed through a shell.

Agentiam is an authorization shim, not a complete sandbox. An agent can still perform actions not covered by `git` or `gh`, and a process can bypass the shim by deliberately changing its environment or invoking another tool. MCP and HTTP adapters, approval prompts, quotas, skill scopes, policy editing, a central control plane, physical sandboxing, and native Windows support are outside this MVP.

## Development

```bash
npm install
npm run typecheck
npm test
npm run build
```

The source is organized around normalization, policy compilation/evaluation, auditing, interception, and process launching. Tests use temporary homes and fake binaries so they do not modify a developer's real Agentiam configuration.

## License

MIT. See [LICENSE](LICENSE).

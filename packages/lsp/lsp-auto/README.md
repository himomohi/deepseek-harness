# @deepseek-ai/dsh-lsp-auto

English | [中文](README.zh.md)

An **auto-detecting language-server front** for `ctx.lsp`. One plugin instance scans the shipped language catalog at load, resolves one launchable command per installed language (TypeScript/JavaScript, Python, Go, Rust, C/C++, Lua), and registers every detection through a composed `dsh-lsp-stdio` child. Deployments get LSP with zero configuration on machines that already have servers; explicit `dsh-lsp-stdio` rows remain the way to pin exact commands and versions.

Namespace plugin (`name` / `inject` / `Config` / `apply`, no default export).

## What it does

- Detects each catalog language's canonical server by candidate order (for example `pyright-langserver`, then `basedpyright-langserver`, then `pylsp`); the first candidate that resolves as an executable on the configured PATH wins, and later candidates are never consulted.
- Falls back, when `deferred` is enabled, to an npm-cache probe for languages whose server is not installed: `command -v <bin>`/`where <bin>` run inside `npx -y -p <packages…>` **from a neutral cwd**. The neutral cwd matters — inside a project directory npm exec prefers the local `node_modules` chain and skips its cache bin-dir PATH injection, so the same probe run from a workspace root can miss a package the cache holds. Only a printed path that still resolves as an executable is adopted.
- Composes `dsh-lsp-stdio` with the detected table: the seam reserves extensions exclusively per language, the child owns pooling, protocol translation, teardown, and every per-server default. Detection contributes configuration, not a second host.
- Applies as a no-op on a machine where nothing resolves: no provider registers, deployment load still succeeds, and queries fail with the seam's `LSP_UNAVAILABLE` at first use.
- Detection and probes honor fiber disposal during setup; the mounted child plugin's own effect-scoped lifecycle unregisters providers and tears down servers on stop.

## Configuration

| Key | Default | Meaning |
|---|---|---|
| `env` | `{}` | Extra env merged over the credential-scrubbed ambient env; used for PATH resolution during detection, for fallback probes, and for every spawned server. |
| `deferred` | `true` | Whether languages without an installed server may run npm-cache fallback probes. Offline deployments set `false` to keep load local. |
| `probeTimeoutMs` | `30000` | Bound for one fallback probe in ms, covering a cold package download. |

`probeTimeoutMs` must be a positive integer no greater than Node's `2_147_483_647` ms timer limit; a bad value fails at load.

## Model Experience

Indirectly, through `dsh-tool-lsp`, which surfaces the registered providers' normalized results; this front contributes no prompt or schema, so mounting it changes no request prefix.

#### KV Cache effect

None; detection output is load-time configuration and never reaches a model request.

## Known Limitations and Deferred Work

- **Detection is PATH-trust, not version pinning** — the first installed candidate wins with no version test, so a broken server on PATH shadows a working later candidate; a deployment needing determinism pins `dsh-lsp-stdio` rows instead.
- **The catalog is fixed** — languages beyond the shipped six need explicit `dsh-lsp-stdio` rows; adding a language to the catalog is a source change with its own candidate evidence.
- **npm fallback probes run at load** — a cold cache pays the download inside the `probeTimeoutMs` budget once per package, on the machine's network; `deferred: false` removes this entirely.
- **A workspace without its own toolchain may starve servers that expect one** — `typescript-language-server` resolves `tsserver` from the LSP workspace root's `node_modules`, so TypeScript queries against a project without a local `typescript` dependency can fail server-side at initialize; the same server works in a project that has one.

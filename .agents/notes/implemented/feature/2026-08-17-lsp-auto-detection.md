# Agent Note: Auto-detecting language servers — a catalog front over the generic stdio host

Status: implemented

English | [中文](2026-08-17-lsp-auto-detection.zh.md)

## Problem

The LSP capability seam shipped with `dsh-lsp-stdio`, a generic host that requires every deployment to enumerate server commands and extension mappings in `cordis.yml`. A machine that already has `gopls`, `clangd`, or `pyright` installed therefore still got no LSP until someone wrote the table. Meanwhile the catalog question — which binary per language, in which preference order, with which fallback — is the same answer for every deployment, so per-deployment repetition buys no control for the common case.

## Decision

**A catalog is source, not configuration.** `dsh-lsp-auto` owns one shipped language table (TypeScript/JavaScript, Python, Go, Rust, C/C++, Lua) with candidate lists following each language's canonical distribution order. Candidate evidence is editor-default prior art; adding a language is a source change that must bring its own evidence, not a config key that silently grows an untested list. Deployments needing determinism pin explicit `dsh-lsp-stdio` rows, which the auto front never overrides — both can mount; the seam's exclusive extension reservation makes an overlap fail loud at load.

**The front composes the existing host instead of hosting servers.** Detection output is translated into a generated `lsp-stdio` server table and mounted as a child plugin. Pooling, protocol translation, teardown, and per-server defaults stay in exactly one package; the front owns only the catalog and detection. This also fixes the lifecycle question for free: the child's effect-scoped disposal is the whole teardown story.

**No detection is a valid deployment.** A machine where nothing resolves applies as a no-op — load succeeds, and the first query fails with the seam's `LSP_UNAVAILABLE`. Fail-loud belongs at first use, not at boot, because the catalog's languages are optional per machine, unlike a misconfigured explicit table (which still fails at load as before).

**The npm fallback probe runs from a neutral cwd, and adopts only an executable path.** Languages whose server is absent may resolve through `npx -y -p <packages…>`. The probe cannot run from the session workspace: npm exec inside a project directory prefers the local `node_modules` chain and skips its cache bin-dir PATH injection — observed concretely as `typescript-language-server: command not found` from a pnpm workspace whose virtual store happened to contain the package, while the identical command succeeded from `/tmp`. The probe therefore spawns with `cwd: tmpdir()`, locates the bin (`command -v`/`where`), and re-validates the printed path through `resolveExecutable` before adoption, so npm progress noise never becomes a server command. `deferred: false` removes the network from load entirely.

## Consequences

The base bundle now mounts `lsp` + `lsp-auto` + `tool-lsp` by default, so every shipped profile gains LSP opportunistically with no configuration. The composed header is unchanged by the front (it contributes providers, not tools or prompt sections), which the snapshot scenario exploits: `lsp-auto-detection` joins the existing `lsp` header class rather than pinning a new one, and exercises the real path — a fake `gopls` prepended to `PATH` is detected at load, registers the Go routes on the seam, and the model tool resolves a definition through the actually-spawned server process.

Detection is PATH-trust, not version pinning: the first installed candidate wins with no version test, so a broken early candidate shadows a working later one. That is the documented trade for zero configuration; the escape hatch is the explicit table. One server-side caveat is documented rather than worked around: `typescript-language-server` resolves `tsserver` from the LSP workspace root's own `node_modules`, so TypeScript queries against a project without a local `typescript` dependency can fail at initialize — the same server works in a project that has one.

## Verification

Package specs cover detection through the real seam: a PATH-provided fake server routes a query end to end through the composed `lsp-stdio` child; first-candidate preference; the isolated-PATH no-op; the neutral-cwd probe adoption including its `-p` arguments; probe skip under `deferred: false`; budget-exceeded and non-executable-path rejections; and provider removal on fiber disposal. The `lsp-auto-detection` ACP snapshot scenario (authored, keyless) pins the assembled-app transcript: Loader composition, load-time detection, tool execution, and result rendering.

## Alternatives considered

- **Expand `dsh-lsp-stdio` with an `auto: true` mode** — couples the generic host to a catalog and makes one plugin own both "configure anything" and "detect the shipped six"; the front/child split keeps each package answerable to one question.
- **Register providers directly from detection, bypassing `lsp-stdio`** — duplicates pooling, protocol translation, and teardown in a second host for no behavioral gain.
- **Fail load when no language is detected** — turns an optional capability into a boot requirement on machines that never asked for LSP.
- **Run npx as the server command directly** — re-enters the project-cwd resolution bug at every spawn and pays npm exec startup per server; probing once to an absolute path spawns the server directly thereafter.

# Agent Note: Protect Cordis runtime identifiers from package rescope

Status: implemented

English | [中文](2026-08-15-protect-cordis-runtime-identifiers-from-rescope.zh.md)

## Problem

The vendor rescope gate rewrites quoted `cordis` package names to `@deepseek-ai/cordis`, including quoted subpaths. The dynamic-extension subsystem also owns `cordis/*` event names plus a bare `cordis` locale namespace and slash-trigger id. These values are runtime identifiers, not npm imports, but their syntax matched the generic package rule.

The fork contained 26 such residues. Applying the documented rescope command renamed the complete event route and UI locale identifiers. The Host and Client event names stayed mutually consistent, so that part could appear valid, but the generated Client types rejected the nonexistent `@deepseek-ai/cordis` locale namespace. Treating the transformed output as a hygiene repair would therefore have introduced a build failure.

## Decision

List every current source, generated document, generated catalog, and test that owns these runtime identifiers in `GENERIC_SKIPS` for the bare `cordis` name. The package rescope still processes every other mapped package name in those files. Existing `@deepseek-ai/cordis` imports remain unchanged.

The explicit list follows the rescope script’s existing treatment of agent-preset ids, locale keys, directory group names, and upstream runtime identifiers. A new file containing a protected Cordis identifier must be classified when the rescope gate reports it; the command must not silently guess whether the token is an import or product data.

## Alternatives considered

**Rename the event namespace and locale namespace.** Rejected because package publication does not require a product protocol rename. It would change remote event names, locale keys, generated slot props, tests, and user-facing trigger behavior without a product reason.

**Ignore every `cordis/*` token globally.** Rejected because a real `cordis/subpath` import uses the same spelling. A global exception would let unscoped package imports pass the gate.

**Disable the rescope check for the fork.** Rejected because the gate still protects published package names, imports, Loader configuration, and generated documentation. The defect was an incomplete classification list, not an invalid gate.

## Verification

`pnpm run rescope-vendor:check` reports no residue and confirms that a second application is a no-op. The focused dynamic-extension and settings suites pass 230 tests. A clean repository build accepts the original `cordis/*` events and `cordis` locale namespace, and the complete hygiene chain validates package publication, 221 compiled invariants, 230 NodeNext declaration APIs, and the 109-package runtime dependency graph.

## Consequences

The rescope command no longer mutates Cordis product identifiers into package names. Its file-level exception list is deliberately explicit, so an upstream file move or new owner remains visible as a gate failure and requires classification.

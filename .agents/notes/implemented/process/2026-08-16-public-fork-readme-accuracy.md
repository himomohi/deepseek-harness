# Agent Note: Keep the public fork README current and verifiable

Status: implemented

English | [中文](2026-08-16-public-fork-readme-accuracy.zh.md)

## Problem

The public README had lost the visual hierarchy introduced by an earlier documentation update while later feature commits continued to replace or extend its content. Restoring that earlier revision wholesale would also restore claims that the repository cannot verify, including fixed catalog counts and provider performance improvements. The remaining installation section did not make the operational difference between the official npm package and this source fork prominent enough for a new user.

## Decision

The root README presents the repository as the maintained `himomohi/deepseek-harness` fork while preserving DeepSeek AI as the upstream project owner. Its first installation table distinguishes the official `npx @deepseek-ai/dsh web` package from a cloned fork checkout before describing fork-only features.

The feature overview names only behavior represented by the current source and maintained changelog: the Korean locale plugin, live OpenCodex model discovery, default Web launch and browser handoff, maintained stop paths, phone-width layouts, cursor-backed streaming queues, interactive upstream updates, loopback-only sensitive RPC surfaces, provider-aware output limits, header-list job cancellation, and opt-in browser notifications. Stable project facts may appear as badges; model counts, release numbers, performance percentages, and other drift-prone values do not.

The changelog owns release chronology. The README owns the current capability summary, startup path, daily commands, safety limits, and links to detailed documentation. English, Chinese, and Korean pages use the same section structure and claims.

The public tree keeps product source, tests, changelog entries, and required Agent Notes because they explain or verify maintained behavior. Local session-continuity files such as `WORK_RESUME.md` are not project documentation and remain ignored, while test fixtures use neutral workspace paths instead of a maintainer's home directory.

## Alternatives considered

**Restore the earlier visual README without changes.** This would recover its presentation quickly, but it would also republish unverified cache-hit, first-token, cost, and catalog-count claims.

**Keep the minimal upstream-style README.** This avoids presentation maintenance, but it hides the fork entry point and leaves current fork capabilities difficult to discover.

**Display live release and model counts in badges.** Those values change independently across the package manifest, changelog, and discovered provider catalog, so static badges would create another stale public claim.

## Consequences

New users can determine before installation whether they want the official package or the maintained fork. Public feature claims remain traceable to current repository behavior instead of historical marketing text. The repository no longer exposes a local session handoff document or a maintainer-specific absolute path in the current tree. Future maintainers must update all three README languages when a listed capability changes, while release-by-release detail remains in the changelog.

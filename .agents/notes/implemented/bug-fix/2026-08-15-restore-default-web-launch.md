# Agent Note: Restore the default Web launch

Status: implemented

English | [中文](2026-08-15-restore-default-web-launch.zh.md)

## Problem

The fork's one-command Web entry was removed while correcting unrelated provider and security defects. A bare `dsh` then failed before the Web profile could expose the Korean UI, OpenCodex, mobile layout, update, stop, and streaming improvements. The stop command also did not recognize a Web server whose process command ended at the bare source or built CLI entry.

Unconditional browser spawning was also unsafe for pipes and headless automation. A missing desktop command could emit an unhandled child-process error, while a detached process group gave the Harness no useful ownership.

## Decision

The root launcher selects the `web` profile when `--profile` is absent. Launcher flags and a leading app flag continue to the Web provider, while an unknown first positional token fails as an unknown command and an empty `--profile` remains invalid.

The Web startup provider enables browser opening only when stdout is an interactive terminal and `--no-open` is absent. After the Loader tree settles and the canonical URL is ready, the Web runtime prints that URL, emits a localized progress line, and hands it to the operating system's default-browser command. The short-lived handoff is not placed in a detached process group; synchronous and asynchronous launch errors print a manual URL without stopping the server.

`dsh stop` recognizes bare source, built, and installed CLI entries in addition to explicit `web` and `--profile web` forms. `dsh update` verifies markers for every maintained fork feature rather than only the Korean and OpenCodex packages.

## Alternatives considered

**Require `dsh web` permanently.** Rejected because one-command startup is an intentional fork feature. Rejecting an unknown leading positional separately prevents command typos without removing the default.

**Open a browser for every Web process.** Rejected because piped and automated runs do not own a desktop interaction. Interactive stdout plus `--no-open` makes the default observable and controllable.

**Revert the complete remediation commit.** Rejected because its loopback-only administration, bounded provider behavior, shared streaming runtime, shallow-history repair, and repository quality fixes remain required.

## Consequences

An interactive `dsh` reaches the Web UI and opens its URL by default. Piped runs start the same server without a browser, and `--no-open` gives terminals an explicit opt-out. A mistyped positional command still fails before boot.

The removed unbounded `max-tokens` continuation and unconnected Vision Fallback are not restored by this decision. Their reintroduction still requires explicit budgets, durable model-visible state, real provider transport, and runnable evidence.

# Agent Note: Expand shallow history before update

Status: implemented

English | [中文](2026-08-15-expand-shallow-history-before-update.zh.md)

## Problem

`dsh update` fetched the official remote and immediately ran a normal merge. A checkout cloned with limited depth hid the real parent of the fork’s first visible commit in `.git/shallow`. Git therefore reported `refusing to merge unrelated histories` even though the commit object still named an official ancestor.

The preview recorded that the repository was shallow but did not use that fact. Adding `--allow-unrelated-histories` would not restore the missing merge base and would turn most paths into add/add conflicts. Rewriting the branch or grafting a guessed parent would also change or fake history when the real parent was already available from the source remote.

## Decision

Before fetching and previewing the official branch, the updater checks `git rev-parse --is-shallow-repository`. A shallow checkout runs `git fetch <source> --unshallow --tags --prune`, preferring `origin`, and verifies that Git now reports a complete repository. Failure stops in the fetch stage with the existing copyable repair prompt.

The expansion changes only the local object database and shallow boundary. It does not rewrite `HEAD`, branches, commits, or remotes. The updater then performs its ordinary official fetch, preview, confirmation, merge, install, build, and fork-marker verification.

## Alternatives considered

**Merge with `--allow-unrelated-histories`.** Rejected because the histories are related; Git only hides the parent locally. Treating every file as unrelated loses the correct base and creates broad conflicts.

**Create a replacement parent with `git replace --graft`.** Rejected because the real parent is present in the commit object and can be fetched. A synthetic graft would require a pinned SHA, cleanup, and a stronger trust decision than history expansion.

**Force-push a rewritten fork branch with restored ancestry.** Rejected because no branch rewrite is needed. It would disrupt existing clones and exceed the updater’s local responsibility.

## Verification

The CLI integration test creates a two-commit repository, pushes it to a local bare origin, clones it at depth one, and confirms the updater expands it to two visible commits while preserving the exact checked-out `HEAD`.

The active fork checkout was expanded from the same shallow boundary. Its merge base with `upstream/master` resolves to the live official baseline, proving that the earlier unrelated-history diagnosis was a local clone artifact rather than a disconnected fork.

## Consequences

Shallow source clones incur one complete-history fetch before their first update. Subsequent updates skip the step. Storage and transfer grow to the repository’s full history, but merges regain the real base and need no force, graft, or unrelated-history mode.

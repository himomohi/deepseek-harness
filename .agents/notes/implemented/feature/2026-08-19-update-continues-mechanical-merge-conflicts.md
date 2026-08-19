# Agent Note: Official update continues through mechanical merge conflicts

Status: implemented

English | [中文](2026-08-19-update-continues-mechanical-merge-conflicts.zh.md)

## Problem

`dsh update` stopped the official merge at the first content conflict and printed that it would not resolve anything. A typical official version bump left hundreds of `package.json` files conflicted only on `"version"`, plus fork-owned behavior in files the official branch also touched. Install, build, and marker verification never ran. Inserting a verification substring without the working body would let the updater continue while the feature itself was gone.

## Decision

After `git merge` leaves `MERGE_HEAD`, `dsh update` continues inside the same `[1/4] 머지` step. Version-only hunks keep the official `"version"`. An unmerged `pnpm-lock.yaml` takes the official stage. Shared files take official text, then receive the complete fork-feature patch for that path: default Web launch (including the bare-`dsh` profile handler), `update`/`stop` registrations, Korean locale and browser-notification rows, browser auto-open helpers, the real phone-width CSS blocks, cursor-backed streaming queues, and the Chinese hero title `DeepSeek`. Fork-only packages such as `locale-ko` keep the fork side when official deleted them.

When the complete patch cannot land on official text, the updater keeps the fork side of that file if it still carries the feature (header job cancel is this case). A hunk with no fork-feature apply and no version-only rule stays unmerged and prints the existing copy-paste prompt.

Install, build, and fork-feature verification run as they do after a clean merge. After a clean merge the same apply runs so official overwrites that did not conflict still get the working fork body.

## Alternatives considered

**A separate recover command or flag.** Rejected because the user-visible job is one update. A second verb would still stop the pipeline on the same conflicts and ask the operator to start another mode.

**Always take ours, or always take theirs.** Rejected because version hunks must follow the official release, while fork features must keep their working body. One side-for-all rule drops one of those.

**Reinsert only verification needles such as `private readIndex = 0`.** Rejected because the substring can appear without the queue body. The updater applies the complete cursor queue onto official `shift()` code instead.

**`--allow-unrelated-histories` or a custom merge driver for every `package.json`.** Rejected because the histories are related, and a merge driver would hide real `package.json` field conflicts.

## Consequences

An official version bump no longer requires a hand merge of hundreds of `package.json` files before install and build. Official edits in a patched file survive when the apply hook still matches. Header job cancel keeps the fork file when official text has no apply hook, so later official JobListAction edits in the same conflict can wait. Mixed content with no fork apply still needs a person or agent.

## Testing

CLI unit tests cover version-only hunks, official-to-cursor queue rewrite, official required-profile replacement, real phone-width CSS, Chinese hero title, lockfile checkout, and a refusal to invent a queue field without the official `shift()` hook. A temporary Git repository finishes a version-only merge and leaves a real content conflict unmerged.

## Related

[Expand shallow history before update](../bug-fix/2026-08-15-expand-shallow-history-before-update.md) still owns the unshallow fetch that makes the merge base real.

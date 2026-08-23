# Agent Note: Fork keeps GitHub automation disabled

Status: implemented

English | [中文](2026-08-23-fork-keeps-github-automation-disabled.zh.md)

## Problem

The personal fork inherited upstream GitHub workflows and scheduled Dependabot updates that require credentials, hosted or self-hosted runners, platform-specific tooling, and release permissions. Those triggers caused repeated failures and queued jobs even though the fork does not intend to operate the upstream automation.

## Decision

Every workflow currently under `.github/workflows/` is a manual-only no-op stub marked `dsh-fork-automation: disabled`, and `.github/dependabot.yml` contains no update targets. The original automation text is retained under `.github/disabled-workflows/` for a deliberate reconnect. `dsh update` applies the same policy after every official merge, archives newly introduced workflow or Dependabot files, and verifies that no active automation file has been restored. The `himomohi/deepseek-harness` repository Actions setting is disabled separately from the source policy.

## Alternatives considered

**Delete the workflow files.** Rejected because the filenames and original sources help a later reconnect while the active stubs make the disabled state explicit.

**Keep upstream triggers and remove only the failing secret-dependent jobs.** Rejected because it would still permit unexpected API calls, runner allocation, scheduled dependency updates, release publication, and issue automation.

**Rely only on the GitHub repository setting.** Rejected because a future repository setting change or a local clone would still contain active upstream triggers.

## Consequences

No automatic Actions or Dependabot updates run from this fork, and no protected automation can silently return through an upstream update. Manual dispatch remains documented in the stub but is currently blocked by the repository-level Actions setting. Reconnection requires selecting an archived file, restoring its triggers or update targets, configuring its secrets and permissions, and changing the updater policy first.

## Testing

The CLI policy unit tests cover stub trigger contents, archive creation, idempotence, verification, and workflow-conflict planning. A repository trigger scan reports only `workflow_dispatch` in active workflow files.

## Related

See [the fork automation policy](../../../../.github/fork-automation-policy.md) and [the archived workflows](../../../../.github/disabled-workflows/README.md). The upstream runner failover note remains authoritative for the upstream repository, not for this fork.

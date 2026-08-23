# Agent Note: Fork keeps GitHub automation disabled

Status: implemented

[English](2026-08-23-fork-keeps-github-automation-disabled.md) | 中文

## Problem

个人分支继承了需要凭据、托管或 self-hosted runner、平台专用工具和发布权限的上游 GitHub workflow 以及定时 Dependabot 更新。这些 trigger 在分支不打算运行上游自动化时仍然造成重复失败和排队任务。

## Decision

`.github/workflows/` 下当前所有 workflow 都是带有 `dsh-fork-automation: disabled` 标记的仅手动 no-op stub，`.github/dependabot.yml` 没有任何更新目标。原始自动化文本保留在 `.github/disabled-workflows/`，供之后有意重新连接。`dsh update` 在每次官方合并后应用相同策略，保管新加入的 workflow 或 Dependabot 文件，并检查所有活动自动化文件没有恢复。`himomohi/deepseek-harness` 的仓库 Actions 设置另行关闭，与源代码策略分开管理。

## Alternatives considered

**删除 workflow 文件。** 拒绝，因为文件名和原始来源有助于以后重新连接，而活动 stub 能明确表达禁用状态。

**保留上游 trigger，只删除依赖失败 secret 的任务。** 拒绝，因为这样仍可能意外发起 API 调用、分配 runner、运行定时依赖更新、发布版本和运行 issue 自动化。

**只依赖 GitHub 仓库设置。** 拒绝，因为未来修改仓库设置或使用本地克隆时，仍会存在活动的上游 trigger。

## Consequences

此分支不会自动运行 Actions 或 Dependabot，受保护的自动化文件也不会通过上游更新悄悄恢复。stub 仍记录了手动 dispatch 的位置，但当前仓库级 Actions 设置关闭，因此手动 dispatch 也不能运行。重新连接前必须选择保管的文件、恢复 trigger 或更新目标、配置 secret 和权限，并先修改更新器策略。

## Testing

CLI 策略单元测试覆盖 stub 的 trigger 内容、原文件保管、幂等性、检查和 workflow 冲突规划。活动 workflow 的仓库扫描只报告 `workflow_dispatch`。

## Related

参见[分支自动化策略](../../../../.github/fork-automation-policy.md)和[保管的 workflow](../../../../.github/disabled-workflows/README.zh.md)。上游 runner 故障转移说明仍对上游仓库有效，不适用于此分支。

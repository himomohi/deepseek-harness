# Agent Note: 更新前展开浅历史

Status: implemented

[English](2026-08-15-expand-shallow-history-before-update.md) | 中文

## Problem

`dsh update` 拉取官方远端后立即执行普通 merge。有限深度克隆会在 `.git/shallow` 中隐藏该分叉首个可见提交的真实父提交。因此 Git 报告 `refusing to merge unrelated histories`，尽管提交对象仍然指向官方祖先。

预览会记录仓库处于 shallow 状态，却没有使用该事实。加入 `--allow-unrelated-histories` 不会恢复缺失的 merge base，反而会让多数路径变成 add/add 冲突。重写分支或把猜测父提交 graft 上去，也会在真实父提交可从源远端获取时改写或伪造历史。

## Decision

在拉取并预览官方分支前，更新器检查 `git rev-parse --is-shallow-repository`。浅 checkout 会运行 `git fetch <source> --unshallow --tags --prune`，优先选择 `origin`，并确认 Git 随后报告完整仓库。失败会在 fetch 阶段停止，并输出既有可复制修复提示。

展开只改变本地对象数据库和 shallow 边界，不会重写 `HEAD`、分支、提交或远端。随后更新器继续普通的官方拉取、预览、确认、merge、安装、构建和分叉标记检查。

## Alternatives considered

**使用 `--allow-unrelated-histories` 合并。** 拒绝，因为历史本来相关，只是 Git 在本地隐藏了父提交。把所有文件视为无关会丢失正确基准并产生大量冲突。

**使用 `git replace --graft` 创建替代父提交。** 拒绝，因为真实父提交存在于提交对象中并可获取。合成 graft 需要固定 SHA、清理和比历史展开更强的信任决策。

**通过强制推送重写的分叉分支恢复祖先。** 拒绝，因为无需重写任何分支。这样做会干扰现有克隆，并超出更新器的本地职责。

## Verification

CLI 集成测试创建一个两提交仓库，推送到本地 bare origin，再以深度一克隆。测试确认更新器展开后可见两个提交，同时保持 checkout 的确切 `HEAD` 不变。

当前分叉 checkout 也从同一个 shallow 边界完成展开。它与 `upstream/master` 的 merge base 解析为实时官方基准，证明之前的无关历史诊断来自本地浅克隆，而不是分叉断开。

## Consequences

浅源克隆在第一次更新前会完整获取一次历史；后续更新跳过该步骤。存储和传输会增长到完整仓库历史，但 merge 会重新获得真实基准，不需要 force、graft 或 unrelated-history 模式。

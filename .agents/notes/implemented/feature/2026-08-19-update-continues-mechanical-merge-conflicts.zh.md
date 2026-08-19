# Agent Note: Official update continues through mechanical merge conflicts

Status: implemented

[English](2026-08-19-update-continues-mechanical-merge-conflicts.md) | 中文

## Problem

`dsh update` 会在第一个内容冲突处停止官方合并，并打印它不会解决任何冲突。一次典型的官方版本提升会让数百个 `package.json` 只在 `"version"` 上冲突，再加上官方分支也改过的文件里的分支自有行为。安装、构建和标记检查因此不会运行。只插入检查用的子串而不写入可运行的实现，会让更新继续，但功能本身已经消失。

## Decision

在 `git merge` 留下 `MERGE_HEAD` 之后，`dsh update` 在同一个 `[1/4] 머지` 步骤内继续。仅版本冲突的块保留官方 `"version"`。未合并的 `pnpm-lock.yaml` 取官方暂存区。共享文件先取官方文本，再对该路径套上完整的分支功能补丁：默认 Web 启动（含裸 `dsh` 配置处理）、`update`/`stop` 注册、韩语 locale 与浏览器通知行、自动打开浏览器的辅助函数、真实的手机宽度 CSS 块、基于游标的流式队列，以及中文主标题 `DeepSeek`。像 `locale-ko` 这样的仅分支包在官方删除时保留分支一侧。

当完整补丁无法落到官方文本上时，若该文件的分支一侧仍带有该功能，则保留分支一侧（会话标题栏的任务取消属于这种情况）。没有分支功能套用、也不是仅版本规则的冲突块保持未合并，并打印既有的可复制提示。

安装、构建和分支功能检查与干净合并之后相同。干净合并之后也会运行同一次套用，因此未产生冲突的官方覆盖仍会得到可运行的分支实现。

## Alternatives considered

**单独的恢复命令或标志。** 拒绝，因为用户可见的工作是一次更新。第二个动词仍会在同样的冲突处停住流水线，并要求操作者再开一种模式。

**始终取 ours，或始终取 theirs。** 拒绝，因为版本块必须跟随官方发布，而分支功能必须保留可运行的实现。单一的“整侧取胜”会丢掉其中之一。

**只重新插入 `private readIndex = 0` 这类检查针。** 拒绝，因为该子串可以在没有队列实现的情况下出现。更新器改为把完整的游标队列套到官方的 `shift()` 代码上。

**对每个 `package.json` 使用 `--allow-unrelated-histories` 或自定义 merge driver。** 拒绝，因为历史本身相关，而且 merge driver 会把真正的 `package.json` 字段冲突藏起来。

## Consequences

官方版本提升不再要求在安装和构建前手工合并数百个 `package.json`。当套用挂钩仍然匹配时，补丁文件中的官方编辑会保留。会话标题栏任务取消在官方文本没有套用挂钩时保留分支文件，因此同一次冲突里更晚的官方 JobListAction 编辑可以等待。没有分支套用的混合内容仍需要人或智能体。

## Testing

CLI 单元测试覆盖仅版本冲突块、官方移位队列到游标队列的改写、官方必填 profile 的替换、真实手机宽度 CSS、中文主标题、lockfile 检出，以及在没有官方 `shift()` 挂钩时拒绝编造队列字段。临时 Git 仓库会完成仅版本冲突的合并，并让真正的内容冲突保持未合并。

## Related

[更新前展开浅历史](../bug-fix/2026-08-15-expand-shallow-history-before-update.md) 仍然负责让合并基重新变为真实祖先的 unshallow 获取。

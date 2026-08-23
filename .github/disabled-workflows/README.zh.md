# 保管的上游 workflow 和自动化配置

[한국어](README.md)

此目录保存了此分支禁用的上游 GitHub Actions 和 Dependabot 配置原文。文件保留用于恢复；GitHub 只把 `.github/workflows/` 识别为 workflow 目录，因此这里的文件不会自动执行。

活动路径中的同名文件是说明用的 `workflow_dispatch` stub。重新连接原文前，请先阅读[分支自动化策略](../fork-automation-policy.md)，只复制确实需要的文件，并同时调整 `apps/cli/src/fork-automation-policy.ts` 的保护策略。

# @deepseek-ai/dsh-client-ui-jobs

[English](README.md) | 中文

Web 后台任务特性的归属方：向 `conversation.session.header.actions` 贡献一个条目，列出当前会话可见的 `ctx.jobs` 记录。数据来自 [`dsh-client-runtime`](../runtime/README.md) 从 `session/jobs` 帧折叠出的 `jobsBySession` 列表镜像。运行中行通过宿主的 `job.cancel` RPC 暴露停止动作；组件以会话绑定回调接收该变更，除此之外只持有弹层、待处理动作与失败状态。

只有当会话至少有一个任务时才渲染触发器，普通对话不会因为一项未被使用的能力而长出控件。角标计数为 `running` 加 `stopping`，为零时省略，这样只剩已完成任务的会话保留一个安静的历史入口，而不是宣告一个「零」。弹层是一个扁平列表：活跃行在前按 `startedAt` 升序，随后终态行按 `finishedAt` 降序；毫秒相同的并列按启动顺序打破，宿主的 map 迭代顺序永远不参与决定。一行显示生产者 kind、label、状态标记、生产者一旦给出 `detail` 就取代通用状态词的那段文字，以及已耗时。该耗时在活跃时每秒推进，并在 `finishedAt` 冻结；只有当打开的列表里确实有会动的东西时时钟才运行。缺少 `finishedAt` 的终态行读作零而不是负数，超过一小时的耗时停留在小时单位，不会长出任何生产者目前都到不了的「天」词汇。

终态行保持可见并弱化，直到注册表在 owner 销毁时把它们丢掉。它们本就在快照里，失败任务的 `detail` 是其失败唯一可读之处。因此一个运行中的一次性后台 subagent 会同时出现在这里和 [subagent 目录](../ui-subagent/README.md)里：目录负责进入子会话的 transcript，而这个列表负责取消它的后台任务。

只有 `running` 与 `stopping` 行带有动作。点击一次后按钮立即禁用且弹层保持打开；随后 `session/jobs` 推送把该行推进到 `stopping` 及其终态。传输或宿主拒绝会重新启用按钮，并在对应行渲染返回的失败信息。宿主同时接收 `sessionId` 与 `jobId` 并再次检查注册表所有权，因此猜中的外部 id 不会成为取消能力。

Escape 关闭列表并把焦点交还触发器，在其外部按下指针同理。最后一个任务消失时先关闭列表再卸载控件，焦点因此不会从一个被移除的节点上凭空消失。样式只用 token；文案走本包自己的 `job` locale 命名空间。行为由 [Web 后台任务展示 Agent Note](../../../.agents/notes/implemented/feature/2026-08-08-web-background-job-display.md) 规定。

## 模型体验

无，因为本包为人类渲染宿主计算出的注册表状态，不触及 prompt、消息、schema、流或工具结果。模型对同一批任务的视角仍属于 [`dsh-tool-jobs`](../../jobs/tool-jobs/README.md)。

#### KV Cache effect

无；本包从不组装或发送 provider 请求。

## 已知限制与暂缓事项

- **输出保持只读** —— Web 路径不会调用 `ctx.jobs.read()`，因为那会消费模型唯一的输出游标。人类取消会调用 `kill()`，它把任务标为已上报，因此抑制自动完成通知；模型仍可通过 `job_list` 或显式 `job_output` 观察终态。
- **列表不等于注册表自己的集合** —— 它展示的是「一个会话通过线路视图能看到什么」，所以别的会话拥有的任务在这里永远不出现；而进程重启会清空列表，transcript 里启动这些任务的 `run_in_background` 卡片却还在。无主任务（在没有活体 `Agent` 时启动的）是反过来的情形：它会进入每一个会话的列表，与 `list(caller)` 对每个调用方的报告一致。

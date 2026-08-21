<p align="center">
  <img src="website/public/wordmark.svg" width="220" alt="DeepSeek Harness">
</p>

# DeepSeek Harness

<p align="center"><strong>可组合的智能体基础设施，由实用的韩语优先分支持续维护。</strong></p>

<p align="center">
  <img alt="开发者预览" src="https://img.shields.io/badge/status-developer_preview-f59e0b">
  <img alt="维护分支" src="https://img.shields.io/badge/fork-himomohi-0ea5e9">
  <img alt="Node.js" src="https://img.shields.io/badge/node-%5E22.19%20%7C%7C%20%3E%3D24-339933">
  <img alt="插件架构" src="https://img.shields.io/badge/architecture-everything_is_a_plugin-7c3aed">
  <img alt="MIT 许可证" src="https://img.shields.io/badge/license-MIT-111827">
</p>

<p align="center">
  <a href="README.md">English</a> · <a href="README.zh.md">中文</a> · <a href="README.ko.md">한국어</a>
</p>

[English](README.md) | 中文

DeepSeek Harness（`dsh`）是由 [DeepSeek AI](https://deepseek.com) 开发的开源智能体框架。它基于 [Cordis](https://github.com/cordiverse/cordis)，并遵循一条架构原则：**一切皆插件**。

此仓库是 [`himomohi/deepseek-harness`](https://github.com/himomohi/deepseek-harness) 分支。它保留官方插件架构，同时维护韩语 Web UI、手机宽度布局、更安全的更新和停止命令、有序的大流量串流、提供方感知的输出限制、后台任务取消，以及可选的浏览器通知。

> **开发者预览：** 在首个带标签的版本发布前，可能会出现破坏兼容性的变更。

## 选择需要的构建

| 目标 | 入口 | 实际运行内容 |
| --- | --- | --- |
| 体验官方上游软件包 | `npx @deepseek-ai/dsh web` | DeepSeek AI 发布的软件包 |
| 运行此维护分支 | 克隆此仓库后运行 `pnpm dsh` | 下文说明的分支功能 |

npm 命令不会安装此分支。需要韩语 UI、更新器、移动端修复或传输层变更时，请克隆 `himomohi/deepseek-harness`。

## 为什么使用此分支

| 能力 | 当前行为 |
| --- | --- |
| 韩语 Web UI | `@deepseek-ai/dsh-client-locale-ko` 客户端插件加载韩语词典。 |
| 单命令 Web 生命周期 | 不带参数的 `dsh` 选择 Web 配置，输出规范 URL，并在未指定 `--no-open` 时打开浏览器；`dsh stop` 可识别受维护的启动路径。 |
| 手机宽度布局 | 导航、初始设置、设置和聊天在移动视口宽度下保持可用。 |
| 有序串流 | Host API、浏览器 WebSocket 和 TypeScript SDK 队列使用基于游标的 FIFO 排空方式，而不是反复移动数组。 |
| 提供方感知的输出限制 | 显式调用设置优先，其次是精确匹配的已发现模型限制，再次是显式配置的路由限制；否则省略 `max_tokens`。 |
| 更安全的上游更新 | `dsh update` 预览官方提交，必要时补全浅克隆历史，在合并前确认，越过仅版本的 `package.json` 冲突并重新套上完整的分支功能，重新构建，并验证这些功能。 |
| 后台任务停止 | 会话标题栏的任务列表可通过 Host 的 `job.cancel` 命令取消正在运行的任务。 |
| 浏览器通知 | 通用设置中的可选开关会在页面未聚焦时，对提问和已完成的回复发出通知。 |

OpenCodex 通过官方模型页作为 `llm-pi-ai` 提供方连接。此分支不附带专用 OpenCodex 适配器。

<a id="run"></a>

## 运行

<a id="run-from-source"></a>

### 从源代码运行

前置条件：Git、`Node.js ^22.19.0 || >=24.0.0`，以及 Corepack 或 pnpm。

```sh
git clone https://github.com/himomohi/deepseek-harness.git
cd deepseek-harness
corepack enable
pnpm install
pnpm run build
pnpm dsh
```

默认 Web UI 监听 `http://127.0.0.1:3080`。交互式终端会使用默认浏览器打开该地址。

## 常用命令

| 命令 | 用途 |
| --- | --- |
| `pnpm dsh` | 启动默认 Web 配置。 |
| `pnpm dsh web --no-open` | 启动 Web UI，但不打开浏览器。 |
| `pnpm dsh stop` | 停止受维护的 Web 启动实例。 |
| `pnpm dsh update --dry-run` | 预览上游提交和更新工作。 |
| `pnpm dsh update` | 交互式合并官方默认分支、越过机械冲突、重新构建并验证分支标记。 |

剩余内容冲突、构建失败或实现标记缺失时，更新器会停止并提供修复指引。它不会在更新不完整时报告成功。

## 架构概览

```text
Preset
  |
  +-- Service Definition
  +-- Service Provider
  +-- Consumer
  |
  +--> Cordis plugin graph --> session log --> model/tool loop
```

各项能力通过插件组装，而不是直接加入智能体循环。所有模型可见输入都必须能从持久会话日志重建。详情请参阅[架构文档](docs/architecture.zh.md)和 [Cordis 论文](https://github.com/cordiverse/paper)。

## 安全性与当前限制

- `trustedHosts` 用于防御 DNS 重绑定，并非身份验证。设置、凭据、原生对话框和 Host 侧模型发现因此仅允许环回访问。
- 本 README 不会在缺少提供方测量的情况下宣称缓存命中率、首令牌时间、延迟或成本有所改善。
- 此分支跟随持续变化的上游开发者预览，因此在合并官方变更前请运行 `dsh update --dry-run`。

## 项目导航

- [变更日志](CHANGELOG.md) — 维护分支的版本历史。
- [Web UI 指南](docs/user/guide/index.zh.md) — 启动和浏览器使用方法。
- [架构](docs/architecture.zh.md) — 插件组合和运行时所有权。
- [开发指南](docs/development.zh.md) — 工作区、构建和验证流程。
- [贡献指南](CONTRIBUTING.zh.md) — 贡献要求。
- [智能体说明](AGENTS.md) — 编码智能体的仓库规则。

## 社区

- 通过 [GitHub Discussions](https://github.com/deepseek-ai/deepseek-harness/discussions) 提交上游反馈。
- 为插件仓库添加 [`dsh-plugin`](https://github.com/topics/dsh-plugin) 主题。
- 加入 [DeepSeek Harness Discord 社区](https://discord.gg/Ycq5dCaS4)。

## 许可证

[MIT](LICENSE)。第三方依赖及其许可证列于 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。

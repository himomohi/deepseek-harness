<div align="center">

# ⚡ DeepSeek Harness (`dsh`)

**高性能插件化 AI Agent 框架与 OpenCodex 多模型平台**

[![Release](https://img.shields.io/badge/release-v0.1.0--rc.6-blue?style=for-the-badge&logo=github)](CHANGELOG.md)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg?style=for-the-badge)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-^22.19%20||%20>=24-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
[![OpenCodex Ready](https://img.shields.io/badge/OpenCodex-29%20Models-8A2BE2?style=for-the-badge)](packages/llm/llm-opencodex)
[![Cache Hit](https://img.shields.io/badge/KV%20Cache%20Hit-90%25+-FF6B6B?style=for-the-badge)](#-性能与缓存优化-benchmark)

<p align="center">
  <a href="README.md">English</a> •
  <a href="README.ko.md">한국어</a> •
  <a href="README.zh.md"><b>中文</b></a> •
  <a href="CHANGELOG.md"><b>更新日志 (Changelog)</b></a> •
  <a href="WORK_RESUME.md">工作继续指南</a>
</p>

</div>

---

## 🌟 概述 (Overview)

**DeepSeek Harness (`dsh`)** 是源自 [DeepSeek AI](https://deepseek.com) 的开源 AI Agent 框架。

采用 **Everything is a Plugin** 的纯插件化架构，运行于 [Cordis](https://github.com/cordiverse/cordis) 微内核之上。本 Fork 分支集成了 **全量韩语与多语言本地化**、**OpenCodex(`ocx`) 29 款顶级模型一键代理**、**输出长度自动续写** 以及 **超高效 Prefix KV Cache 缓存优化**。

---

## ✨ 核心特性 (Key Features)

| 特性 | 说明 |
| :--- | :--- |
| ⚡ **超高 KV Cache 缓存命中率** | 多轮对话中完整保留思考标记（`reasoning_content`），达成 **90%+ 缓存命中率**，首字延迟（TTFT）**降低 70~80%** |
| 🔄 **输出 Token 上限自动续写** | 触发输出长度上限（`max-tokens`）时由 Agent Loop 自动无缝续写，彻底解决长代码生成截断问题 |
| 🌐 **OpenCodex (`ocx`) 无缝接入** | 自动发现本地 `ocx` 代理，免配置 API Key 即刻就绪，内置 GPT-5.6、Claude 3.7、DeepSeek V4、Grok 4.6 等 **29 款模型** |
| 🚀 **零配置启动与自动打开浏览器** | 运行 `dsh` 自动识别系统语言并在后台拉起默认浏览器（`http://127.0.0.1:3080`） |
| 🔄 **`dsh update` 一键更新** | 自动合并官方 upstream 仓库最新更新，同时 100% 完整保留自定义插件与汉化配置 |
| 🌍 **全量多语言支持** | 完整支持中文（`zh`）、韩语（`ko`）与英语（`en`）界面与设置 |
| 🧩 **Cordis 微内核架构** | 沙箱、文件系统、终端、工具与 LLM 适配器全部支持热插拔与动态重载 |

---

## 📊 性能与缓存优化 (Benchmark)

融合 `earendil-works/pi` 的前缀保留机制，从根本上杜绝了多轮对话中的 **前缀缓存失效 (Prefix Invalidation)**：

```mermaid
graph LR
    A[用户提问轮次] --> B[固定 System 与 Tools 前缀]
    B --> C[保留 Assistant 思考 Token]
    C --> D[服务端 KV Cache 100% 前缀匹配]
    D --> E[⚡ 90%+ 缓存命中 / 0.3s TTFT]
```

* **首字生成延迟 (TTFT)**: 3~8 秒 ➔ **0.3~0.8 秒**（大幅缩短 ~75%）
* **输入 Token 成本**: 享受 Cache Hit 优惠，**综合节省 80~90%**
* **输出完整度**: 彻底杜绝复杂重构和长文件输出中断

---

## 💻 快速开始 (Quick Start)

### 1. 使用全局 CLI 启动

```sh
# 启动 Web GUI（自动打开浏览器）
dsh

# 或指定 Web 模式
dsh web
```

> Web UI 默认运行在 `http://127.0.0.1:3080`。

### 2. 源码构建与运行

```sh
# 1. 克隆仓库
git clone https://github.com/himomohi/deepseek-harness.git
cd deepseek-harness

# 2. 安装依赖并构建
pnpm install
pnpm run build

# 3. 运行
pnpm dsh web
```

### 3. 一键同步官方最新版本

```sh
dsh update
```

---

## 🌐 OpenCodex (`ocx`) 本地代理接入

1. 在终端启动 `ocx` 代理（`http://127.0.0.1:10100/v1`）。
2. 运行 `dsh`，在浏览器 **设置 ➔ 插件** 中确认 **OpenCodex Proxy** 显示绿色正常就绪状态。
3. 在模型下拉菜单中选择所需模型（如 `gpt-5.6-codex`、`claude-3-7-sonnet`、`deepseek-v4`、`grok-4.6` 等 29 种）即可开始使用。

---

## 🧩 模块架构 (Package Layout)

```
packages/
  ├── core/            # Agent Loop、会话、系统提示词、工具核心
  ├── llm/
  │    ├── llm-opencodex/   # 🌟 OpenCodex 代理适配器与 29 款模型发现
  │    ├── llm-deepseek/    # DeepSeek 官方 API 适配器（KV Cache 优化）
  │    ├── llm-pi-ai/       # pi-ai 多供应商适配器（Cache Retention）
  ├── client/
  │    ├── locale-ko/       # 🇰🇷 Web 客户端韩语语言包
  │    ├── ui-*/            # Web UI 界面组件插件
  ├── bundle/          # installable dsh --profile 配置层
  └── shell/fs/lsp/    # 沙箱、终端、文件系统、语言服务器插件
```

---

## 📚 文档与链接

* **📝 [更新日志与发布说明 (CHANGELOG.md)](CHANGELOG.md)**
* **📋 [会话与工作继续指南 (WORK_RESUME.md)](WORK_RESUME.md)**
* **📖 [开发指南 (docs/development.md)](docs/development.md)**
* **🏛️ [架构文档 (docs/architecture.md)](docs/architecture.md)**
* **🤖 [Agent 开发规范 (AGENTS.md)](AGENTS.md)**

---

## 📄 开源协议 (License)

本项目基于 [MIT 协议](LICENSE) 开源。
第三方依赖及其许可证说明详见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。

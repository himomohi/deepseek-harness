# DeepSeek Harness

[English](README.md) | 中文 | [한국어](README.ko.md)

DeepSeek Harness（`dsh`）是由 [DeepSeek AI](https://deepseek.com) 开发的开源 agent harness（智能体框架）。

它采用**一切皆插件**的架构，并由 [Cordis](https://github.com/cordiverse/cordis) 驱动，其设计参见论文 [_A Programming Paradigm for Spatiotemporal Composability_](https://github.com/cordiverse/paper)。

## 开发者预览

DeepSeek Harness 目前处于 _开发者预览_ 阶段，正在快速迭代。**未来将出现破坏兼容性的变更。**

## 运行

### 通过 `npm` 运行

安装 `Node.js`，然后运行：

```sh
npx @deepseek-ai/dsh web
```

该命令会启动 Web UI，默认地址为 `http://127.0.0.1:3080`。详见 [Web UI 指南](docs/user/guide/index.md)。

### 从源码运行

如需从仓库源码运行：

```sh
git clone https://github.com/deepseek-ai/deepseek-harness.git
cd deepseek-harness
pnpm install
pnpm run build
pnpm dsh web
```

## 社区与支持

- 欢迎通过 [GitHub Discussions](https://github.com/deepseek-ai/deepseek-harness/discussions) 提交反馈或 bug 报告。
- 为你的插件仓库添加 [`dsh-plugin`](https://github.com/topics/dsh-plugin) 话题，便于被发现。
- 欢迎加入 DeepSeek Harness 企微群：扫码添加企微小助手并填写入群问卷，完成后小助手会邀请你入群。

<table>
  <thead>
    <tr>
      <th align="center">企微小助手</th>
      <th align="center">入群问卷</th>
      <th align="center">微信公众号</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td align="center"><img src="assets/community-wecom-assistant.png" alt="DeepSeek Harness 企微小助手二维码" width="180" height="180"></td>
      <td align="center"><a href="https://trtgsjkv6r.feishu.cn/share/base/form/shrcnIt5twSVdLGD52KJBckGCgg"><img src="assets/community-wecom-survey.png" alt="DeepSeek Harness 入群问卷二维码" width="180" height="180"></a></td>
      <td align="center"><img src="assets/community-wechat-official-account.png" alt="DeepSeek Harness 团队微信公众号二维码" width="180" height="180"></td>
    </tr>
  </tbody>
</table>

## 参与贡献

参见 [CONTRIBUTING.md](CONTRIBUTING.md)。

## 开发

请先阅读[开发指南](docs/development.md)与[架构文档](docs/architecture.md)。

面向 agent：请遵循 [AGENTS.md](AGENTS.md)。

## 更新日志 (Changelog)

### [2026-08-14] - 同步官方 0.1.0-rc.6、OpenCodex 与体验优化
- **`dsh update` 一键更新指令**:
  - 自动检测并同步官方 upstream 仓库与 npm 最新发布版本（`0.1.0-rc.6`），保留自定义插件与汉化/韩化配置的同时完成更新与重构。
- **启动自动唤起浏览器与终端多语言提示**:
  - 运行 `dsh` 或 `dsh web` 时自动在后台打开默认浏览器访问 Web 页面。
  - 支持 Windows、macOS 与 Linux 环境的多语言 Locale（`ko`, `zh`, `en`）智能识别与友好的终端启动提示。
- **完整 OpenCodex (`ocx`) 代理无缝接入**:
  - 完美连接本地 `ocx` 代理（`http://127.0.0.1:10100/v1`），免配置 API Key 即可显示就绪（绿灯）状态。
  - 支持动态模型发现（Model Discovery），支持实时拉取 `ocx` 代理提供的所有在线模型。
  - 默认内置 `ocx` 代理的 **全部 29 个模型**（包含 GPT-5.6、DeepSeek V4、Grok 4.5/4.6、MiniMax M3、GLM 5.2、CommandCode 全系列等）。
- **输出 Token 限制自动续写 (Auto-Continue)**:
  - 当模型输出达到最大 Token 上限（`max-tokens`）而被截断时，Agent Loop 自动续写生成，实现长文本无缝完整输出。
- **Prompt 缓存与 KV Cache 前缀匹配深度优化**:
  - 融合 `earendil-works/pi` 缓存优化机制，在多轮对话中始终完整保留 Assistant 的思考过程（`reasoning_content`），避免 DeepSeek / OpenCodex 前缀缓存失效，极大提升 Cache Hit Rate。
  - 在 `llm-pi-ai` 适配器中默认启用 Prompt Cache 保持策略（`cacheRetention: 'short'`），全面提升 Anthropic 及兼容供应商的缓存命中率。
- **全平台跨系统兼容**:
  - 完整兼容 Windows、macOS（`darwin`）、Linux 的浏览器拉起与环境变量检测。
- **匿名临时配置支持**:
  - 无需强制选择或输入 Profile，自动生成临时 Profile 即刻开始会话。
- **全套 Web UI 韩国语（ko）本地化**:
  - 覆盖侧边栏、对话流、设置、模型管理、插件列表等全界面。

## 许可证

[MIT](LICENSE)

第三方依赖及其许可证见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。

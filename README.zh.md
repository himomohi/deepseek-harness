# DeepSeek Harness

[English](README.md) | 中文 | [한국어](README.ko.md)

DeepSeek Harness（`dsh`）是由 [DeepSeek AI](https://deepseek.com) 开发的开源 agent harness（智能体框架）。

它采用**一切皆插件**的架构，并由 [Cordis](https://github.com/cordiverse/cordis) 驱动，其设计参见论文 [_A Programming Paradigm for Spatiotemporal Composability_](https://github.com/cordiverse/paper)。

本分叉增加了韩语 Web UI 语言包、OpenCodex 代理提供方、窄屏布局修复、交互式上游更新器，以及面向大型流式积压的游标 FIFO 队列。未经过提供方侧测量时，本分叉不会宣称缓存命中率或首 Token 延迟有所提升。

## 开发者预览

DeepSeek Harness 目前处于 _开发者预览_ 阶段，正在快速迭代。**未来将出现破坏兼容性的变更。**

## 运行

### 通过 `npm` 运行

安装 `Node.js`，然后运行：

```sh
npx @deepseek-ai/dsh web
```

该命令会启动 Web UI，默认地址为 `http://127.0.0.1:3080`。交互式终端会在默认浏览器中打开该地址；传入 `--no-open` 可只保留终端中的服务器。详见 [Web UI 指南](docs/user/guide/index.md)。

### 从源码运行

如需从本分叉的仓库源码运行：

```sh
git clone https://github.com/himomohi/deepseek-harness.git
cd deepseek-harness
pnpm install
pnpm run build
pnpm dsh
```

运行 `pnpm dsh` 而不显式指定 profile 时，会选择 Web profile；`pnpm dsh web` 是对应的显式写法。

## 分叉功能

- **韩语语言包**：`@deepseek-ai/dsh-client-locale-ko` 以普通客户端插件提供 Web UI 韩语词典。
- **OpenCodex 提供方**：`@deepseek-ai/dsh-llm-opencodex` 连接 OpenAI 兼容的 OpenCodex 代理，并可通过 `GET /models` 替换建议模型目录。
- **单命令 Web 启动**：直接运行 `dsh` 会选择 Web profile、打印规范 URL，并在交互式终端中打开浏览器；传入 `--no-open` 时不会打开。
- **线性流式队列**：Host API Proxy、浏览器 WebSocket 客户端和 TypeScript SDK 使用游标 FIFO 队列排空积压帧，同时保持顺序。
- **上游更新**：`dsh update` 预览官方提交、在合并前确认、必要时展开浅克隆、重新构建，并检查所有仍在维护的分叉标记。
- **远程安全**：`trustedHosts` 用于防御 DNS 重绑定，而不是身份认证。因此设置、凭据、原生对话框和 Host 侧模型发现仍仅限回环地址。

OpenCodex 当前复用仅文本的 chat-completions 线缆适配器。图片输入继续由能力检查拒绝，而不会在图片像素未到达视觉模型时被静默转换或接受。

## 更新本分叉

```sh
dsh update --dry-run
dsh update
dsh update --yes
```

更新器会拉取官方仓库，在当前 checkout 为浅克隆时恢复隐藏的 Git 父提交，合并官方默认分支，安装依赖、构建，并检查分叉自有包标记。合并冲突或标记检查失败会输出可复制的修复提示并停止；部分更新绝不会被报告为成功。

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

## 许可证

[MIT](LICENSE)

第三方依赖及其许可证见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。

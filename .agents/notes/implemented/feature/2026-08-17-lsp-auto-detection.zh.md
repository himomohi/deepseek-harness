# Agent Note: 自动检测语言服务器——通用 stdio 主机之上的目录前端

Status: implemented

[English](2026-08-17-lsp-auto-detection.md) | 中文

## Problem

LSP 能力 seam 随 `dsh-lsp-stdio` 一起发布——一个要求每个部署在 `cordis.yml` 中枚举服务器命令与扩展名映射的通用主机。因此，一台已经安装了 `gopls`、`clangd` 或 `pyright` 的机器，在有人写出这张表之前仍然得不到 LSP。与此同时，目录问题——每种语言用哪个二进制、按什么偏好顺序、带什么回退——对每个部署都是同一个答案，因此逐部署重复在常见场景下买不到任何控制力。

## Decision

**目录是源码，不是配置。** `dsh-lsp-auto` 拥有一张内置语言表（TypeScript/JavaScript、Python、Go、Rust、C/C++、Lua），候选列表按每种语言的规范分发顺序排列。候选证据来自编辑器默认值的先行实践；添加一种语言是必须自带证据的源码变更，而不是悄悄增长未经测试列表的配置键。需要确定性的部署固定显式的 `dsh-lsp-stdio` 行，自动前端永不覆盖它们——两者可以同时挂载；seam 的扩展名独占保留让重叠在加载时大声失败。

**前端组合现有主机，而不是自己承载服务器。** 检测结果被翻译成生成的 `lsp-stdio` 服务器表，并作为子插件挂载。池化、协议转换、teardown（拆卸）与每服务器默认值都留在唯一的包里；前端只拥有目录与检测。这也顺带解决了生命周期问题：子插件 effect 作用域的 dispose 就是完整的拆卸路径。

**没有检测结果是有效部署。** 一台什么都没解析到的机器作为 no-op 应用——加载成功，第一次查询以 seam 的 `LSP_UNAVAILABLE` 失败。大声失败属于首次使用而不是启动，因为目录语言对每台机器都是可选的；这与配置错误的显式表不同（后者仍如以往在加载时失败）。

**npm 回退探测从中性 cwd 运行，且只采用可执行路径。** 未安装服务器的语言可以通过 `npx -y -p <packages…>` 解析。探测不能从会话工作区运行：项目目录内部的 npm exec 优先使用本地 `node_modules` 链并跳过其缓存 bin 目录的 PATH 注入——实际观察到的具体表现是，从一个虚拟商店恰好包含该包的 pnpm 工作区运行时得到 `typescript-language-server: command not found`，而同一命令从 `/tmp` 运行成功。因此探测以 `cwd: tmpdir()` 启动，定位 bin（`command -v`／`where`），并在采用前通过 `resolveExecutable` 重新校验打印路径，npm 进度噪音永远不会变成服务器命令。`deferred: false` 可以把网络完全从加载中移除。

## Consequences

base bundle 现在默认挂载 `lsp` + `lsp-auto` + `tool-lsp`，每个出厂 profile 都无需配置即可机会性地获得 LSP。前端不改变组合 header（它贡献提供方，而不是工具或提示词区块），快照场景正是利用了这一点：`lsp-auto-detection` 加入既有的 `lsp` header 类而不是固定新类，并演练真实路径——前置到 `PATH` 的假 `gopls` 在加载时被检测到，在 seam 上注册 Go 路由，模型工具通过实际启动的服务器进程解析定义。

检测是 PATH 信任，不是版本固定：第一个已安装候选胜出且不做版本测试，因此损坏的早期候选会遮蔽可用的后续候选。这是零配置换来的已记录权衡；逃生舱是显式表。一个服务器端的注意事项被记录而非绕过：`typescript-language-server` 从 LSP 工作区根自己的 `node_modules` 解析 `tsserver`，因此对没有本地 `typescript` 依赖的项目的 TypeScript 查询可能在 initialize 时失败——同一服务器在拥有该依赖的项目中正常工作。

## Verification

包规格通过真实 seam 覆盖检测：PATH 提供的假服务器端到端路由一次查询并穿过组合的 `lsp-stdio` 子插件；第一候选偏好；隔离 PATH 的 no-op；中性 cwd 探测采用（包括其 `-p` 参数）；`deferred: false` 下的探测跳过；预算超时与非可执行路径的拒绝；以及 fiber dispose 时的提供方移除。`lsp-auto-detection` ACP 快照场景（authored、无密钥）固定组装应用的 transcript：Loader 组合、加载期检测、工具执行与结果渲染。

## Alternatives considered

- **给 `dsh-lsp-stdio` 扩展 `auto: true` 模式**——把通用主机与目录耦合，让一个插件同时拥有"配置任何东西"和"检测内置六种"；前端/子插件拆分让每个包只回答一个问题。
- **检测后绕过 `lsp-stdio` 直接注册提供方**——为了让第二个主机重复池化、协议转换与拆卸，却没有任何行为收益。
- **什么语言都没检测到时让加载失败**——把可选能力变成从未要求 LSP 的机器上的启动要求。
- **直接把 npx 当作服务器命令运行**——每次启动都重新踩进项目 cwd 解析 bug，并为每个服务器支付 npm exec 启动开销；探测一次得到绝对路径后即可直接启动服务器。

# @deepseek-ai/dsh-lsp-auto

[English](README.md) | 中文

`ctx.lsp` 的**自动检测语言服务器前端**。一个插件实例在加载时扫描内置语言目录，为每个已安装语言解析出一个可启动命令（TypeScript/JavaScript、Python、Go、Rust、C/C++、Lua），并通过组合的 `dsh-lsp-stdio` 子插件注册每次检测结果。在已装有服务器的机器上，部署无需任何配置即可获得 LSP；需要固定命令与版本时，显式的 `dsh-lsp-stdio` 行仍然适用。

Namespace 插件（`name`／`inject`／`Config`／`apply`，无默认导出）。

## 功能

- 按候选顺序检测目录中每种语言的规范服务器（例如 `pyright-langserver`，然后 `basedpyright-langserver`，再 `pylsp`）；在配置的 PATH 上第一个解析为可执行文件的候选胜出，后续候选不再被咨询。
- 在启用 `deferred` 时，为未安装服务器的语言回退到 npm 缓存探测：在 `npx -y -p <packages…>` 内部从**中性 cwd** 运行 `command -v <bin>`／`where <bin>`。中性 cwd 至关重要——在项目目录内部，npm exec 优先使用本地 `node_modules` 链并跳过其缓存 bin 目录的 PATH 注入，因此从工作区根运行同一探测可能错过缓存中已有的包。只有仍能解析为可执行文件的打印路径才会被采用。
- 用检测表组合 `dsh-lsp-stdio`：seam 按语言独占保留扩展名，子插件拥有池化、协议转换、teardown（拆卸）以及每服务器默认值。检测贡献的是配置，而不是第二套主机。
- 在没有任何解析结果的机器上作为 no-op 应用：不注册提供方，部署加载仍然成功，查询在首次使用时以 seam 的 `LSP_UNAVAILABLE` 失败。
- 检测与探测遵循 setup 期间的 fiber dispose；挂载的子插件自身 effect 作用域生命周期在停止时注销提供方并拆卸服务器。

## 配置

| 键 | 默认值 | 含义 |
|---|---|---|
| `env` | `{}` | 合并到凭据清洗后环境变量之上的额外 env；用于检测期间的 PATH 解析、回退探测，以及每个被启动的服务器。 |
| `deferred` | `true` | 未安装服务器的语言是否可以运行 npm 缓存回退探测。离线部署设为 `false` 以保持加载本地化。 |
| `probeTimeoutMs` | `30000` | 单次回退探测的毫秒级预算，覆盖冷缓存包下载。 |

`probeTimeoutMs` 必须是不大于 Node `2_147_483_647` 毫秒计时器上限的正整数；非法值在加载时失败。

## Model Experience

间接：通过 `dsh-tool-lsp` 呈现已注册提供方的规范化结果；本前端不贡献提示词或 schema，因此挂载它不会改变任何请求前缀。

#### KV Cache effect

无；检测输出是加载期配置，永不进入模型请求。

## Known Limitations and Deferred Work

- **检测是 PATH 信任，不是版本固定**——第一个已安装候选胜出且不做版本测试，PATH 上损坏的服务器会遮蔽后续可用候选；需要确定性的部署应改为固定 `dsh-lsp-stdio` 行。
- **目录是固定的**——内置六种语言之外的语言需要显式 `dsh-lsp-stdio` 行；向目录添加语言是带有自身候选证据的源码变更。
- **npm 回退探测在加载时运行**——冷缓存在机器网络上于 `probeTimeoutMs` 预算内为每个包支付一次下载；`deferred: false` 可完全移除该行为。
- **缺少自身工具链的工作区可能饿死期待工具链的服务器**——`typescript-language-server` 从 LSP 工作区根的 `node_modules` 解析 `tsserver`，因此对没有本地 `typescript` 依赖的项目的 TypeScript 查询可能在服务器端 initialize 时失败；同一服务器在拥有该依赖的项目中正常工作。

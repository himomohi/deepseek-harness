# Agent Note: 防止包重设作用域改写 Cordis 运行时标识符

Status: implemented

[English](2026-08-15-protect-cordis-runtime-identifiers-from-rescope.md) | 中文

## Problem

vendor 重设作用域门禁会把带引号的 `cordis` 包名改为 `@deepseek-ai/cordis`，也会处理带引号的子路径。动态扩展子系统同时拥有 `cordis/*` 事件名、裸 `cordis` locale 命名空间和斜杠触发器 id。这些值是运行时标识符，不是 npm import，但其语法会命中通用包名规则。

分叉中存在 26 处此类残留。执行文档规定的重设作用域命令后，完整事件路由和 UI locale 标识符都被重命名。Host 和 Client 事件名仍互相一致，因此事件部分可能看似有效；但生成的 Client 类型拒绝不存在的 `@deepseek-ai/cordis` locale 命名空间。因此，把转换结果当作 hygiene 修复会引入构建失败。

## Decision

对于裸 `cordis` 名称，把目前拥有这些运行时标识符的全部源码、生成文档、生成 catalog 和测试列入 `GENERIC_SKIPS`。包重设作用域仍会处理这些文件中的其他映射包名；现有 `@deepseek-ai/cordis` import 保持不变。

该显式列表沿用重设作用域脚本对 agent preset id、locale key、目录分组名和上游运行时标识符的既有处理。新文件包含受保护的 Cordis 标识符时，重设作用域门禁会报告它，届时必须进行分类；命令不得静默猜测该 token 是 import 还是产品数据。

## Alternatives considered

**重命名事件命名空间和 locale 命名空间。** 拒绝，因为发布包不要求重命名产品协议。这样做会在没有产品理由的情况下改变远程事件名、locale key、生成的 slot props、测试和面向用户的触发行为。

**全局忽略所有 `cordis/*` token。** 拒绝，因为真实的 `cordis/subpath` import 使用相同拼写。全局例外会让未重设作用域的包 import 通过门禁。

**在分叉中禁用重设作用域检查。** 拒绝，因为该门禁仍保护发布包名、import、Loader 配置和生成文档。缺陷来自分类列表不完整，而不是门禁本身无效。

## Verification

`pnpm run rescope-vendor:check` 报告无残留，并确认第二次应用不会产生变化。动态扩展和设置相关的聚焦测试共 230 项通过。干净构建接受原有 `cordis/*` 事件和 `cordis` locale 命名空间；完整 hygiene 链验证包发布、221 个已编译 invariant、230 个 NodeNext 声明 API，以及由 109 个包组成的运行时依赖图。

## Consequences

重设作用域命令不再把 Cordis 产品标识符改写为包名。文件级例外列表刻意保持显式，因此上游文件移动或新增所有者仍会以门禁失败的形式显现，并要求进行分类。

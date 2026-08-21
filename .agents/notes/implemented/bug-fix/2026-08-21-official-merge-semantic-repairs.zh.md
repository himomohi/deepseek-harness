# Agent Note: 官方合并的语义修复

Status: implemented

[English](2026-08-21-official-merge-semantic-repairs.md) | 中文

## 问题

并入 `0.1.1-rc.1` 的 172 个官方提交机械收敛后，四处按行自动合并掩盖了合并本身无法判断的缺陷：官方吸收了分支的 `openBrowser` 行，使 `packages/bundle/web-app/cordis.patch.yml` 出现重复键，所有 profile 组合都在 YAML 解析时失败；分支重构过的 direct provider 丢掉了官方新增的 `resolveAttachments` 接线，所有 DeepSeek 图片请求都以 `UNSUPPORTED_CONTENT` 失败；`FALLBACK_LOCALE` 已变为 `en` 之后，locale 规格仍在期待分支历史上的 `zh` 产品默认值；官方的 source-launch 冒烟测试仍期待无参数的 `dsh` 报 `--profile` 错误，而分支会启动默认 Web profile。

## 决定

每一类缺陷都按显式修复处理，而不是按侧取舍。官方吸收分支功能造成重复键时，保留官方位置上的一份。官方加到分支已重构的构造处的接线，重新加到分支自己的构造点：`direct-provider.ts` 拥有适配器构造，因此 `resolveAttachments: () => ctx.get('attachments')` 与 `llm-pi-ai` 的等价接线并列放在那里。规格期望跟随已发布语义——`en` 回退和浏览器推导解析——而不是语义变更前分支持有的值。source-launch 冒烟测试断言分支的可观察行为：`dsh --dump-config` 组合默认 Web profile 后退出，仍然无密钥地覆盖 profile 与 overlay 加载。内容落定后重新生成文档并重录翻译配对（`gen-doc-graphs`、`gen-config-catalog`、正确中文 locale 的链接、规范的双语文本切换行），因为配对与目录门禁判断的是合并后的树，不是任何一侧父提交。

## 考虑过的替代方案

**冲突文件整体取官方侧。** 否决：一次性丢掉默认 Web 启动、可扩展 locale 的语言包语义，以及分支适配过的冒烟期望。

**保留分支的历史取值。** 否决：已发布源码中 `FALLBACK_LOCALE` 就是 `en`，其自身规格也如此断言；保留 `zh` 期望与分支现在发布的产品自相矛盾。

**把修复当作一次性修改而不记录。** 否决：这里的每一类都会在下一次官方合并复现——被吸收的功能重复键、重构文件丢失新接线、配对期望跨语义变更漂移。

## 后果

对这种规模的合并，`dsh update --yes` 跑完不是完成信号；单元套件加上 `doc-sync` 才是。韩语优先的产品默认值现在来自组合时 `locale-ko` 语言包的注册，而不是基础插件的回退。官方下次把分支功能吸收进被改过的文件时，下一次合并必须检查重复键，而不是相信干净的按行合并。

## 测试

DeepSeek dynamic-config 图片规格覆盖 attachment 接线，locale 与 locale-ko 规格覆盖回退期望，source-launch 冒烟覆盖默认 Web dump，windows-shell 组合覆盖去重后的 patch 层。修复后的树上，完整 vitest 套件与全部 28 个 `doc-sync` 门禁通过。

## 相关

[官方更新穿越机械合并冲突](../feature/2026-08-19-update-continues-mechanical-merge-conflicts.zh.md)拥有机械收敛本身。

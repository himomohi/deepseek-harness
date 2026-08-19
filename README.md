<p align="center">
  <img src="website/public/wordmark.svg" width="220" alt="DeepSeek Harness">
</p>

<p align="center"><strong>Composable agent infrastructure, maintained as a practical Korean-first fork.</strong></p>

<p align="center">
  <img alt="Developer Preview" src="https://img.shields.io/badge/status-developer_preview-f59e0b">
  <img alt="Maintained Fork" src="https://img.shields.io/badge/fork-himomohi-0ea5e9">
  <img alt="Node.js" src="https://img.shields.io/badge/node-%5E22.19%20%7C%7C%20%3E%3D24-339933">
  <img alt="Plugin Architecture" src="https://img.shields.io/badge/architecture-everything_is_a_plugin-7c3aed">
  <img alt="MIT License" src="https://img.shields.io/badge/license-MIT-111827">
</p>

<p align="center">
  <a href="README.md">English</a> · <a href="README.zh.md">中文</a> · <a href="README.ko.md">한국어</a>
</p>

English | [中文](README.zh.md) | [한국어](README.ko.md)

DeepSeek Harness (`dsh`) is the open-source agent harness developed by [DeepSeek AI](https://deepseek.com). It is powered by [Cordis](https://github.com/cordiverse/cordis) and follows one architectural rule: **everything is a plugin**.

This repository is the [`himomohi/deepseek-harness`](https://github.com/himomohi/deepseek-harness) fork. It keeps the official plugin architecture while maintaining a Korean Web UI, phone-width layouts, safer update and stop commands, ordered high-volume streaming, provider-aware output limits, background-job cancellation, and opt-in browser notifications.

> **Developer preview:** Compatibility-breaking changes are expected before the first tagged release.

## Choose the build you want

| Goal | Entry point | What runs |
| --- | --- | --- |
| Try the official upstream package | `npx @deepseek-ai/dsh web` | The package published by DeepSeek AI |
| Run this maintained fork | Clone this repository and run `pnpm dsh` | The fork features documented below |

The npm command does not install this fork. Clone `himomohi/deepseek-harness` when you need its Korean UI, updater, mobile fixes, or transport changes.

## Why this fork

| Capability | Current behavior |
| --- | --- |
| Korean Web UI | Korean dictionaries load through the `@deepseek-ai/dsh-client-locale-ko` client plugin. |
| One-command Web lifecycle | Bare `dsh` selects the Web profile, prints the canonical URL, and opens a browser unless `--no-open` is present; `dsh stop` finds maintained launch paths. |
| Phone-width layouts | Navigation, setup, settings, and chat remain usable at mobile viewport widths. |
| Ordered streaming | Host API, browser WebSocket, and TypeScript SDK queues use cursor-backed FIFO draining instead of repeated array shifting. |
| Provider-aware output limits | Explicit call settings win, then an exact discovered model limit, then an explicitly configured route limit; otherwise `max_tokens` is omitted. |
| Safer upstream updates | `dsh update` previews official commits, restores shallow history when needed, asks before merging, continues through version-only `package.json` hunks, reapplies complete fork features, rebuilds, and verifies those features. |
| Background job stop | The session-header job list can cancel a running job through the Host `job.cancel` command. |
| Browser notifications | An opt-in General settings row notifies on questions and completed turns when the page is not focused. |

OpenCodex connects through the official Models page as an `llm-pi-ai` provider. This fork does not ship a dedicated OpenCodex adapter.

## Run

### Run from source

Prerequisites: Git, `Node.js ^22.19.0 || >=24.0.0`, and Corepack or pnpm.

```sh
git clone https://github.com/himomohi/deepseek-harness.git
cd deepseek-harness
corepack enable
pnpm install
pnpm run build
pnpm dsh
```

The default Web UI listens on `http://127.0.0.1:3080`. An interactive terminal opens it in the default browser.

## Daily commands

| Command | Purpose |
| --- | --- |
| `pnpm dsh` | Start the default Web profile. |
| `pnpm dsh web --no-open` | Start the Web UI without browser handoff. |
| `pnpm dsh stop` | Stop a maintained Web launch. |
| `pnpm dsh update --dry-run` | Preview upstream commits and update work. |
| `pnpm dsh update` | Interactively merge the official default branch, continue through mechanical conflicts, rebuild, and verify fork markers. |

Remaining content conflicts, a build failure, or a missing implementation marker stop the updater with repair guidance. It does not report success after a partial update.

## Architecture at a glance

```text
Preset
  |
  +-- Service Definition
  +-- Service Provider
  +-- Consumer
  |
  +--> Cordis plugin graph --> session log --> model/tool loop
```

Capabilities are assembled as plugins rather than added directly to the agent loop. Model-visible inputs must be reconstructable from the durable session log. See the [architecture documentation](docs/architecture.md) and [Cordis paper](https://github.com/cordiverse/paper).

## Safety and current limits

- `trustedHosts` is a DNS-rebinding defense, not authentication. Settings, credentials, native dialogs, and Host-side model discovery remain loopback-only.
- This README does not claim provider cache-hit, first-token, latency, or cost improvements without provider-side measurements.
- The fork is maintained against a moving upstream developer preview, so run `dsh update --dry-run` before merging official changes.

## Project map

- [Changelog](CHANGELOG.md) — maintained fork release history.
- [Web UI guide](docs/user/guide/index.md) — startup and browser usage.
- [Architecture](docs/architecture.md) — plugin composition and runtime ownership.
- [Development guide](docs/development.md) — workspace, build, and verification workflow.
- [Contributing](CONTRIBUTING.md) — contribution requirements.
- [Agent instructions](AGENTS.md) — repository rules for coding agents.

## Community

- Submit upstream feedback through [GitHub Discussions](https://github.com/deepseek-ai/deepseek-harness/discussions).
- Add the [`dsh-plugin`](https://github.com/topics/dsh-plugin) topic to plugin repositories.
- Join the [DeepSeek Harness Discord community](https://discord.gg/Ycq5dCaS4).

## License

[MIT](LICENSE). Third-party dependencies and licenses are listed in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

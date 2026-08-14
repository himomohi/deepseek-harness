# DeepSeek Harness

English | [中文](README.zh.md) | [한국어](README.ko.md)

DeepSeek Harness (`dsh`) is an open-source agent harness developed by [DeepSeek AI](https://deepseek.com).

It uses an architecture where **everything is a plugin**, and is powered by [Cordis](https://github.com/cordiverse/cordis), whose design is described in [_A Programming Paradigm for Spatiotemporal Composability_](https://github.com/cordiverse/paper).

## Developer preview

DeepSeek Harness is currently in _developer preview_ and is iterating rapidly. **THERE WILL BE COMPATIBILITY-BREAKING CHANGES.**

## Run

### Run from `npm`

Install `Node.js`, then run:

```sh
npx @deepseek-ai/dsh web
```

The command starts the Web UI, served at `http://127.0.0.1:3080` by default. See [Web UI guide](docs/user/guide/index.md).

### Run from source

To run from a repository checkout:

```sh
git clone https://github.com/deepseek-ai/deepseek-harness.git
cd deepseek-harness
pnpm install
pnpm run build
pnpm dsh web
```

## Community and support

- Feel free to submit feedback or bug reports through [GitHub Discussions](https://github.com/deepseek-ai/deepseek-harness/discussions).
- Add the [`dsh-plugin`](https://github.com/topics/dsh-plugin) topic to your plugin repository for discoverability.
- Join <a href="https://discord.gg/Ycq5dCaS4">DeepSeek Harness Discord community</a>.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## Development

Start with the [development guide](docs/development.md) and [architecture documentation](docs/architecture.md).

For agents, follow [AGENTS.md](AGENTS.md).

## Changelog

### [2026-08-14] - 0.1.0-rc.6 Sync, OpenCodex & UX Enhancements
- **`dsh update` One-Touch Update Command**:
  - Automatically checks official upstream repository and npm releases (`0.1.0-rc.6`), merges upstream updates, and rebuilds while keeping custom plugins and Korean localization intact.
- **Auto Browser Launch on Startup with Localized Terminal Output**:
  - Automatically launches the default browser when running `dsh` or `dsh web`.
  - Added user locale detection (`ko`, `zh`, `en`) across Windows, macOS, and Linux for clear terminal launch messages.
- **Full OpenCodex (`ocx`) Proxy Integration**:
  - Seamless connection to local `ocx` proxy (`http://127.0.0.1:10100/v1`) with instant active status (green indicator) without requiring API key configuration.
  - Implemented dynamic model discovery via `GET /models` endpoint.
  - Included all 29 models served by `ocx` (GPT-5.6 series, DeepSeek V4, Grok 4.5/4.6, MiniMax M3, GLM 5.2, CommandCode series, etc.) in the default catalog.
- **Cross-Platform Compatibility**:
  - Fully compatible with Windows, macOS (`darwin`), and Linux (`xdg-open`, `open`, `start`).
- **Anonymous Ephemeral Profile Fallback**:
  - Automatically initializes an anonymous profile when none is provided, allowing instant usage without prompt blockers.
- **Full Korean Localization (ko)**:
  - Comprehensive Korean translation across all Web UI components, settings, and menus.

## License

[MIT](LICENSE)

Third-party dependencies and their licenses are disclosed in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

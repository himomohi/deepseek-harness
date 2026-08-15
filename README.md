# DeepSeek Harness

English | [中文](README.zh.md) | [한국어](README.ko.md)

DeepSeek Harness (`dsh`) is an open-source agent harness developed by [DeepSeek AI](https://deepseek.com).

It uses an architecture where **everything is a plugin**, and is powered by [Cordis](https://github.com/cordiverse/cordis), whose design is described in [_A Programming Paradigm for Spatiotemporal Composability_](https://github.com/cordiverse/paper).

This fork adds a Korean Web UI language pack, an OpenCodex proxy provider, mobile-width layout fixes, an interactive upstream updater, and cursor-backed transport queues for large streaming backlogs. It does not claim provider cache-hit or first-token gains without provider-side measurements.

## Developer preview

DeepSeek Harness is currently in _developer preview_ and is iterating rapidly. **THERE WILL BE COMPATIBILITY-BREAKING CHANGES.**

## Run

### Run from `npm`

Install `Node.js`, then run:

```sh
npx @deepseek-ai/dsh web
```

The command starts the Web UI at `http://127.0.0.1:3080` by default. An interactive terminal opens that URL in the default browser; pass `--no-open` to keep the server terminal-only. See the [Web UI guide](docs/user/guide/index.md).

### Run from source

To run this fork from a repository checkout:

```sh
git clone https://github.com/himomohi/deepseek-harness.git
cd deepseek-harness
pnpm install
pnpm run build
pnpm dsh
```

Running `pnpm dsh` without an explicit profile selects the Web profile; `pnpm dsh web` is the explicit equivalent.

## Fork features

- **Korean language pack**: `@deepseek-ai/dsh-client-locale-ko` supplies the Web UI’s Korean dictionaries as a normal client plugin.
- **OpenCodex provider**: `@deepseek-ai/dsh-llm-opencodex` connects to an OpenAI-compatible OpenCodex proxy and can replace its advisory model catalog from `GET /models`.
- **One-command Web startup**: bare `dsh` selects the Web profile, prints its canonical URL, and opens it from an interactive terminal unless `--no-open` is present.
- **Linear streaming queues**: the Host API Proxy, browser WebSocket client, and TypeScript SDK drain accumulated frames through cursor-backed FIFO queues while preserving order.
- **Upstream updates**: `dsh update` previews official commits, asks before merging, expands a shallow clone when necessary, rebuilds, and verifies every maintained fork marker.
- **Remote safety**: `trustedHosts` protects against DNS rebinding; it is not authentication. Settings, credentials, native dialogs, and Host-side model discovery therefore remain loopback-only.

OpenCodex currently uses the shared text-only chat-completions wire adapter. Image input stays capability-gated instead of being silently converted or accepted without pixels reaching a vision model.

## Update this fork

```sh
dsh update --dry-run
dsh update
dsh update --yes
```

The updater fetches the official repository, restores hidden Git parents when the checkout is shallow, merges the official default branch, installs dependencies, builds, and checks fork-owned package markers. A merge conflict or failed marker check stops with a copyable repair prompt; it never reports success after a partial update.

## Community and support

- Feel free to submit feedback or bug reports through [GitHub Discussions](https://github.com/deepseek-ai/deepseek-harness/discussions).
- Add the [`dsh-plugin`](https://github.com/topics/dsh-plugin) topic to your plugin repository for discoverability.
- Join the <a href="https://discord.gg/Ycq5dCaS4">DeepSeek Harness Discord community</a>.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## Development

Start with the [development guide](docs/development.md) and [architecture documentation](docs/architecture.md).

For agents, follow [AGENTS.md](AGENTS.md).

## License

[MIT](LICENSE)

Third-party dependencies and their licenses are disclosed in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

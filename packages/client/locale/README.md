# @deepseek-ai/dsh-client-locale

English | [中文](README.zh.md)

Locale plugin: LocaleRuntime — the selected locale id is stored as `locale.preference` in `$DSH_HOME/settings.yaml`; when that explicit Host value is absent, a fresh browser starts provisionally in the first registered language requested by `navigator` (primary-subtag matching, with `zh` as the fallback). Language-pack plugins add selectable locales through `registerLocale` and occupy their namespace dictionaries through the single-locale `register` overload. A stored or browser preference waiting for a language pack becomes active when that locale registers. The Host read runs after plugin activation so an unavailable settings service cannot block the page. Remote browsers retain only a process-local selection because the settings API is loopback-only. `locale/change` fires on switches. The service also owns the ns×locale dictionary registry (`register(ns, {zh, en})` for base dictionaries, `bind(ns)`→`TranslateNS<ns>`; lookup chain ns → common → zh → key), implements the slot system's `LocaleFace`, and installs itself through `ctx.slots.installLocale`, backing the framework-injected `t` standard seat. The [Host-backed preferences decision](../../../.agents/notes/implemented/bug-fix/2026-08-06-host-backed-web-preferences.md) owns the persistence boundary.

## Model Experience

None, as the locale registry serves browser UI copy; nothing here reaches a model request.

#### KV Cache effect

None; this package neither assembles nor sends a provider request.

## Known Limitations and Deferred Work

- **Some surfaces keep inline copy** — Settings rows, the sidebar, question composer, and model select use locale seats; other packages still own static text directly.
- **Registry-held text reads its translation once** — copy captured at registration time outside the slot render path (e.g. the `/model` command description in the command registry) keeps the language it was registered under until re-registration; slot-rendered copy follows switches live.

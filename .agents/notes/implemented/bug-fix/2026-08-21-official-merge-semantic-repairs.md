# Agent Note: Official-merge semantic repairs

Status: implemented

English | [中文](2026-08-21-official-merge-semantic-repairs.zh.md)

## Problem

The 172-commit official merge to `0.1.1-rc.1` converged mechanically, but four textual auto-merges hid defects the merge itself could not judge: official had absorbed the fork's `openBrowser` row, leaving a duplicated mapping key in `packages/bundle/web-app/cordis.patch.yml` that failed every profile composition at YAML parse; the fork-restructured direct provider lost official's new `resolveAttachments` wiring, so every DeepSeek image request failed with `UNSUPPORTED_CONTENT`; locale specs still expected the fork's historical `zh` product default after `FALLBACK_LOCALE` had become `en`; and the official source-launch smoke still expected bare `dsh` to demand `--profile` while the fork boots the default Web profile.

## Decision

Each class gets an explicit repair instead of a side preference. A duplicated key where official absorbed a fork feature keeps one copy in official's position. Wiring official adds to a constructor the fork restructured is re-added at the fork's construction site: `direct-provider.ts` owns adapter construction, so `resolveAttachments: () => ctx.get('attachments')` lives there beside `llm-pi-ai`'s equivalent. Spec expectations follow the shipped semantics — the `en` fallback and browser-derived resolution — rather than the value the fork held before the semantic changed. The source-launch smoke asserts the fork's observable behavior: `dsh --dump-config` composes the default Web profile and exits, which still exercises profile and overlay loading keylessly. Generated documents and translation pairing are re-recorded after the content settles (`gen-doc-graphs`, `gen-config-catalog`, locale-correct Chinese links, the canonical two-language text switcher), because the pairing and catalog gates judge the merged tree, not either parent.

## Alternatives considered

**Take the official side wholesale in conflicted files.** Rejected: it drops the default Web launch, the extensible-locale language-pack semantics, and the fork's adapted smoke expectations in the same stroke.

**Keep the fork's historical values.** Rejected: `FALLBACK_LOCALE` is `en` in the shipped source and its own spec asserts that; keeping `zh` expectations contradicts the product the fork now ships.

**Treat the repairs as one-off fixes with no record.** Rejected: every class here recurs on the next official merge — absorbed features duplicate keys, restructured files lose new wiring, and paired expectations drift across a semantic change.

## Consequences

`dsh update --yes` finishing is not the completion signal for a merge of this size; the unit suites plus `doc-sync` are. The Korean-first product default now comes from the `locale-ko` pack registration at composition time, not from the base plugin's fallback. When official absorbs a fork feature into a patched file, the next merge must check for the duplicated key rather than trusting a clean textual merge.

## Testing

The DeepSeek dynamic-config image spec owns the attachment wiring, the locale and locale-ko specs own the fallback expectations, the source-launch smoke owns the default Web dump, and the windows-shell composition owns the deduplicated patch layer. The full vitest suite and all 28 `doc-sync` gates pass on the repaired tree.

## Related

[Official update continues through mechanical merge conflicts](../feature/2026-08-19-update-continues-mechanical-merge-conflicts.md) owns the mechanical continuation itself.
